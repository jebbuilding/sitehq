# SiteHQ infrastructure (AWS CDK)

Everything SiteHQ runs on in AWS, and how code gets there. Written for Jasper; you should not
need to read the code to deploy. The decisions behind it are in `docs/ROADMAP.md` › Phase 1.

**Status (5 Nov 2026): nothing has been deployed.** `cdk synth`, 32 tests on the synthesised
templates and workflow files, and a workflow lint all pass without AWS access. Whether AWS and
GitHub accept it all is unproven until the first deploy – see [Not yet verified](#not-yet-verified).

## What it creates

One stack definition (`lib/sitehq-stack.ts`), built once per environment from `config.ts`:

```
                        https://dev.<domain>   (prod: https://app.<domain>)
                                   │
                         CloudFront distribution ── certificate in us-east-1
              ┌────────────────────┼─────────────────────────┐
        everything else         /api/*                    /_blob/*
              │                    └──────────┬──────────────┘
      S3 "page" bucket              HTTP API (API Gateway) → Lambda "http" (Node 22)
      index.html, config.json                 │   checks the sign-in on every request
                                              ├── DynamoDB "data"  (pk = collection path, sk = document id)
   wss://ws.dev.<domain>                      ├── S3 "files" bucket (private; reached only by this function
              │                               │     and by short-lived signed links it hands out)
   WebSocket API → Lambda "ws" ───────────────├── KMS key for the sensitive fields
              └── DynamoDB "connections"      └── pushes "this changed" to connected browsers
   Cognito user pool: invite only, sign in with an emailed one-time code (sent through SES)
   CloudWatch log groups with a fixed retention · one IAM role per function
```

Three stacks per environment:

| Stack | Region | What | Who deploys it |
|---|---|---|---|
| `sitehq-<env>-bootstrap` | eu-west-2 | GitHub's sign-in provider, the deploy role GitHub takes, the SES identity that sign-in emails come from (with its DNS records) | You, once, by hand |
| `sitehq-<env>-edge` | us-east-1 | The CloudFront certificate – CloudFront only accepts one from us-east-1. No data. | The workflows |
| `sitehq-<env>` | eu-west-2 | Everything in the picture | The workflows |

Every resource can be told apart by environment three ways: its **name** starts `sitehq-dev-` or
`sitehq-prod-` (buckets also carry the account id), it is **tagged** `project=sitehq` and
`env=dev|prod`, and its **address** is under `dev.<domain>` or `app.<domain>`.

What differs between dev and prod is only the `switches` block in `config.ts`:

| Switch | dev | prod |
|---|---|---|
| Point-in-time recovery on the data table | off | on (35 days) |
| Deletion protection (tables, user pool) | off | on |
| Versioning of uploaded files | off | on; old versions deleted after 30 days |
| If the stack is deleted, the data (tables, files, users, key, logs) is … | deleted | kept |
| Other origins allowed to call the API / upload | `http://localhost:4321` | none |
| Log retention | 14 days | 90 days |
| Deploy with the placeholder Lambda (no `server/` yet) | allowed | refused |

## 1. What you need to fill in

| What | Placeholder today | Where it goes |
|---|---|---|
| Domain | `example.com` | GitHub variable `SITEHQ_DOMAIN` |
| AWS account id, dev | `111111111111` | GitHub variable `SITEHQ_DEV_ACCOUNT` |
| AWS account id, prod | `222222222222` | GitHub variable `SITEHQ_PROD_ACCOUNT` |
| Route 53 hosted zone id, per environment | `Z0000000PLACEHOLDER` | GitHub variables `SITEHQ_DEV_HOSTED_ZONE_ID`, `SITEHQ_PROD_HOSTED_ZONE_ID` |
| Hosted zone name, only if it is not the domain itself | (the domain) | GitHub variables `SITEHQ_DEV_HOSTED_ZONE_NAME`, `SITEHQ_PROD_HOSTED_ZONE_NAME` |
| Deploy role ARNs | (none) | GitHub variables `AWS_ROLE_ARN_DEV`, `AWS_ROLE_ARN_PROD` – printed by the bootstrap stacks |
| Your GitHub username | `@JASPER-GITHUB-HANDLE` | `.github/CODEOWNERS` (five lines) |
| GitHub repository | `jebbuilding/sitehq` (from the git remote – check it) | `GITHUB_REPO` in `config.ts` |
| Subdomains | `dev`, `app` | `config.ts`, if you want different ones |

The placeholders live in one place, `PLACEHOLDERS` at the top of `config.ts`. Each `SITEHQ_*`
value is read from the environment first, so the real values need not be committed: the workflows
get them from GitHub variables, and you `export` them in your shell for the manual steps below.
(You can instead replace the placeholders in `config.ts` and commit; a variable still wins.)
A deploy refuses to start while a placeholder remains for its environment.

### One AWS account or two?

Both work; only the two account variables change. **Two accounts is the recommendation.** Names,
tags and subdomains keep the *resources* apart in one account, but not the *credentials*: `cdk
deploy` works through the CDK bootstrap roles, which are per account and can change any stack in
it, so in a shared account the dev deploy role (usable by any workflow on `main`) could modify
production. With two accounts that is impossible. If you do share one account, GitHub's provider
is created by the dev bootstrap stack and reused by prod's (`config.ts` works that out).

If an account **already has** GitHub's OIDC provider from another project, set that environment's
`githubOidcProvider` to `"existing"` in `config.ts` – an account can hold only one.

### Hosted zone

Each environment's records (`dev.<domain>`, `ws.dev.<domain>`, certificate validation, email
DKIM) go into a Route 53 hosted zone **in that environment's own account**:

- **One account:** the zone for `<domain>`; both environments use it. Only the zone id is needed.
- **Two accounts:** a zone can live in one account only. Create a zone named `dev.<domain>` in
  the dev account and one named `app.<domain>` in the prod account, and in the parent zone (or
  wherever the domain's DNS is hosted – it need not be AWS) add an `NS` record for each, pointing
  at that zone's four name servers. Then set both the zone id and the zone name variables
  (`SITEHQ_DEV_HOSTED_ZONE_NAME=dev.<domain>` and so on).

## 2. Bootstrap (once per environment, by hand, with administrator access)

```bash
cd infra && npm ci
```

```bash
export SITEHQ_DOMAIN=<domain> SITEHQ_DEV_ACCOUNT=<id> SITEHQ_DEV_HOSTED_ZONE_ID=<zone id>
```

Prepare the account for CDK in both regions (London, and us-east-1 for the certificate):

```bash
npx cdk bootstrap aws://$SITEHQ_DEV_ACCOUNT/eu-west-2 aws://$SITEHQ_DEV_ACCOUNT/us-east-1 --profile <dev admin profile>
```

Create the GitHub deploy role and the email identity:

```bash
npx cdk deploy sitehq-dev-bootstrap -c deployEnv=dev --profile <dev admin profile>
```

It prints `DeployRoleArn` – that is `AWS_ROLE_ARN_DEV`. Repeat all three for prod with the `PROD`
variables, `-c deployEnv=prod` and `sitehq-prod-bootstrap`.

Then, in the SES console (eu-west-2) of each account:

1. Wait until the identity `dev.<domain>` / `app.<domain>` shows **Verified** (usually minutes).
   The first real deploy fails at the user pool if it is not.
2. A new SES account is in the **sandbox**: it only sends to addresses you have verified
   individually. For dev, verify your own and James's addresses there. For prod, **request
   production access** before inviting anyone (a short form; AWS usually answers within a day).

## 3. GitHub settings

**Variables** (Settings › Secrets and variables › Actions › Variables, repository level): the nine
in the table above. None is a secret. Until `AWS_ROLE_ARN_DEV` is set, the dev deploy job is
skipped and CI stays green.

**Environment `production`** (Settings › Environments › New environment):

- Required reviewers: you. Untick "Allow administrators to bypass".
- Deployment branches: *Selected branches* → `main` only. (The promote workflow runs from `main`
  and deploys the chosen commit; a workflow on any other branch cannot use the environment.)
- Recommended: an environment secret `PRODUCTION_PUSH_KEY` holding a write deploy key, used only
  to move the `production` branch:

  ```bash
  ssh-keygen -t ed25519 -N "" -C "sitehq promote" -f sitehq-promote-key
  ```

  Add `sitehq-promote-key.pub` under Settings › Deploy keys with *Allow write access*, paste the
  private file's contents into the secret, delete both files. Why: GitHub refuses a push from a
  workflow's built-in token when it changes files under `.github/workflows/`, so without the key
  a promotion that includes a workflow change is likely to fail at the push (nothing is deployed
  when that happens). It is the only stored credential, it cannot reach AWS, and being an
  environment secret it is readable only after you approve.

**Branch rules** (Settings › Rules › Rulesets):

- `main`: require a pull request; require the status checks `test` and `infra`; require review
  from Code Owners; required approvals 0 (so feature code under `src/app/` and `src/styles/`
  merges on green CI alone, and the paths in `CODEOWNERS` wait for you); block force pushes.
- `production`: restrict creations, updates and deletions; block force pushes; bypass list:
  *Deploy keys* (if you added the key above – otherwise leave updates unrestricted and keep
  "block force pushes" and "restrict deletions"). Nobody pushes to it by hand.

**CODEOWNERS**: put your username in `.github/CODEOWNERS`. Consider adding `/src/platform/` (the
browser adapter and, later, the sign-in screen) – it was not in the agreed list.

## 4. First deploy

1. Merge to `main` with the variables set. `ci` runs the tests, then **deploy to dev**: CDK
   deploys `sitehq-dev-edge` then `sitehq-dev`, the built page (`dist/web/index.html`) is uploaded
   as `index.html` with `config.json` and `version.json`, and CloudFront is refreshed. The first
   run takes 10–20 minutes (certificates, CloudFront).
2. Open `https://dev.<domain>/version.json` – it shows the commit that is live.
3. **First people.** Nobody can sign up; accounts are created by an administrator until the
   server has an invite flow. For each person (role is `owner`, `trade` or `client` – exactly one):

   ```bash
   aws cognito-idp admin-create-user --user-pool-id <UserPoolId output> --username <email> --user-attributes Name=email,Value=<email> Name=email_verified,Value=true --message-action SUPPRESS
   ```

   ```bash
   aws cognito-idp admin-add-user-to-group --user-pool-id <UserPoolId output> --username <email> --group-name owner
   ```

Until `server/` and the web build (`dist/web/index.html`) are merged, a dev deploy stops at "Build
the page"; with `server/` missing but the page present, dev would get a clearly marked placeholder
API that answers 501. Prod refuses to deploy a placeholder.

## 5. Promote and roll back

**Promote:** Actions › `promote` › Run workflow (on `main`). Leave the commit empty for the tip of
`main`, or paste a SHA. The run:

1. checks the commit is on `main` and has a successful `ci` run there (so: tests passed, and it
   deployed to dev if dev is set up). Its summary lists the commits that would go live;
2. waits for your approval in the `production` environment;
3. fast-forwards the `production` branch to the commit, then deploys that commit – its
   infrastructure, API and page together, using that commit's own deploy steps.

**Roll back:** run `promote` again with the earlier commit's SHA. `production` is only ever
fast-forwarded – never forced, never moved backwards – so for an earlier commit the branch is
**left where it is** and the earlier commit is deployed. That gives the branch one meaning: *the
newest commit ever approved for production*. What is **live** is recorded by
`https://app.<domain>/version.json` and by the list of `promote` runs (their titles name the
commit). After a rollback the two differ until you promote forward again; promoting the tip of
`production` again, or anything newer, brings them back together.

Know before rolling back:

- A rollback also rolls back **infrastructure**. Data cannot be lost that way in prod (tables,
  files, user pool and key are retained and deletion-protected), but if the newer version added a
  resource, CloudFormation removes or orphans it. Read the run's summary first.
- It does not roll back **data**. For that: DynamoDB point-in-time recovery restores the table
  into a *new* table (to any second in the last 35 days), and the files bucket keeps old versions
  for 30 days. Neither has been rehearsed yet (ROADMAP › GDPR decision 10).
- Only commits that were the head of a push to `main` have a `ci` run, so only those can be
  promoted.
- A run waiting for approval blocks the next one; reject it if you do not want it.

## 6. Checks (no AWS access needed)

```bash
npm run test:infra
```

at the repository root (or `npm run check` in `infra/`): TypeScript check, `cdk synth` of all six
stacks, the tests in `infra/test/`, and `actionlint` on the workflows (skipped with a note if
`actionlint` is not installed locally – `brew install actionlint`; CI always runs it). The tests
prove, on the synthesised templates: per-environment names, tags and subdomains; no physical name
shared between dev and prod, with two accounts and with one; the production switches; private,
encrypted buckets with no public access; each function's permissions; the deploy roles' trust
(dev: `main` only; prod: the `production` environment only); and that the workflows hold no AWS
keys and never force-push.

To look at a template: `npx cdk synth sitehq-prod` in `infra/`. To see what a deploy would change
(needs credentials): `npx cdk diff sitehq-dev -c deployEnv=dev`.

## 7. What it will cost (estimate)

**Roughly $5–10 a month for both environments together**, almost all of it production. This is an
estimate, not a quote. How it was derived: AWS list prices for London **as remembered, not looked
up today** – check them in the AWS Pricing Calculator – multiplied by the size in `docs/ROADMAP.md`
(~660 documents, 176 MB of files, 36 live subscriptions per page) and an assumed 15 people using
it on working days.

| Item | Assumption | $/month |
|---|---|---|
| KMS keys | 2 keys × $1 | 2.00 |
| Route 53 | $0.50 per hosted zone (1 shared, or 2 delegated + the parent) | 0.50–1.50 |
| DynamoDB on demand | ~50k writes and ~4M read units a month (every change makes each subscribed page re-read a small collection); storage and point-in-time recovery on well under 1 GB | 1–3 |
| API Gateway | ~1M HTTP requests; ~0.5M WebSocket messages and ~160k connection-minutes | 1–2 |
| Lambda | ~1M short invocations at 512 MB – inside the monthly free allowance unless your other projects use it up | 0–1 |
| CloudFront | far inside the free 1 TB / 10M requests a month | 0 |
| S3 | 176 MB plus 30 days of old versions | < 0.10 |
| Cognito | free below 10,000 monthly active users | 0 |
| SES | a few hundred sign-in emails | < 0.10 |
| CloudWatch Logs | well under 1 GB a month | 0–0.60 |
| Certificates, IAM, CloudFormation | no charge | 0 |

The least certain line is DynamoDB reads, which depend on how chatty live updates are in real
use. Even at ten times the guess the total stays under about $40. A second AWS account costs
nothing in itself. Set an AWS Budgets alert (say $20) on each account.

## Not yet verified

Nothing here has met AWS or GitHub. Specifically untested:

- **CloudFormation accepting the templates** – in particular the user pool (emailed-code sign-in
  together with SES sending), the WebSocket custom domain, and the cross-region reference from
  the London stack to the us-east-1 certificate.
- **Cognito behaviour**: that a person created with `admin-create-user` and no password can sign
  in by emailed code, and that the pool is refused if the SES identity is not yet verified (the
  reason the identity is in the bootstrap stack).
- **IAM being sufficient, not just minimal**: the deploy role (CDK's role names, and invalidating
  CloudFront by tag); the WebSocket function's restriction to `$…` records in the data table.
- **CloudFront → API**: sign-in header and cookie arriving intact; files over 4 MB redirecting to
  S3 and loading from the page (bucket CORS).
- **GitHub**: the two trust conditions matching what GitHub really sends; the environment gate;
  the fast-forward push with and without the deploy key.

Expect a couple of fix-and-retry rounds on the first dev deploy.

## Known limits and open points

- **MFA is off, and has to be** while people sign in with emailed codes: Cognito does not allow
  both. ROADMAP › GDPR decision 9 asks for a second factor for the owner – that needs a different
  sign-in method for the owner (for example a passkey), which is a decision, not a switch.
- **The connections table is not used by `server/` as it stands** – it keeps live-update records
  in the data table. Either the server moves them (two lines; then the WebSocket function needs no
  access to the data table) or the table should be removed from the stack.
- **The HTTP function cannot create or manage users** yet. The invite flow will need
  `cognito-idp:AdminCreateUser` and friends added in `lib/sitehq-stack.ts`.
- **Anyone can open a WebSocket connection** (the server authenticates on the first message). It
  can do nothing until then, and the API is throttled, but it is an unauthenticated endpoint.
- In dev only, CDK adds a helper function that empties the buckets when the stack is deleted.
- Actions are referenced by major version (`@v4`), as the existing workflow did, not pinned to a
  commit.

## Layout

```
infra/
  config.ts              the one place environments are described; placeholders at the top
  bin/sitehq.ts          entry point (cdk.json runs it with tsx)
  lib/app.ts             builds the three stacks per environment; config and deploy-time checks
  lib/sitehq-stack.ts    the environment
  lib/edge-stack.ts      the us-east-1 certificate
  lib/bootstrap-stack.ts GitHub provider, deploy role, email identity
  lib/naming.ts          every name, address and tag, derived from project + environment
  lib/bundle.ts          bundles server/handlers/*.mjs for Lambda with esbuild
  placeholder/handler.mjs  stand-in API used only while server/ is missing
  test/                  assertion tests (node --test)
  scripts/lint-workflows.sh
.github/
  workflows/ci.yml       tests + infra checks; deploys main to dev
  workflows/promote.yml  manual: fast-forward `production`, deploy prod after approval
  actions/deploy/        the deploy steps shared by both
  CODEOWNERS
```
