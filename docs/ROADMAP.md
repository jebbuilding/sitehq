# Roadmap: productionising SiteHQ

Goal: run the **existing code base** on our own hosting with our own database and logins, with minimal UI change, then harden and modernise incrementally. Agreed principles (Jasper + James, Nov 2026):
1. Repo is the source of truth (this repo).
2. Keep the app working as-is; swap the platform underneath it via an **adapter**.
3. No real data in git; data moves via encrypted export/import.
4. Freeze the claude.ai artifact at cutover (read-only) to avoid split-brain.

## Phase 0 – repo & backup
- [x] Code, tests, platform rules, Apps Script, docs in this repo.
- [x] Private GitHub repo; CI running `npm test` on every push.
- [ ] **Data export** (owner-run, from a Claude session with access to the artifact): every collection (incl. per-user subcollections under `sheets/*` and `portal/*`, owner's `data/users/<id>/…`) to JSON + every asset (`/_blob/<id>`) to files + `template.json`. Store as an encrypted archive held by James (e.g. 7z/age with a passphrase), not in GitHub. **Still the only copy of the live data – do this first, whatever else happens.**
- [ ] Decide with James whether new features on the claude.ai artifact stop now, so the artifact and this repo do not drift before cutover.

## Phase 1 – own hosting behind an adapter

### Decision (Jasper, 5 Nov 2026): AWS, DynamoDB, London
What the app asks of a backend, measured from `src/app/`: ~660 documents and ~140 files (176 MB); documents addressed by path; 36 live subscriptions; ~390 write call sites; **one `where`, two `orderBy`, two `limit`, no transactions**; 23 path rules. It needs a path-keyed document store with a change feed, not a query engine, and it should stay schemaless – James adds new record kinds with each feature, and a relational schema would need a migration every time.

Everything in **eu-west-2 (London)**, in the AWS organisation Jasper already runs.

| App expects (`window.claude.use`) | AWS implementation |
|---|---|
| `db.doc(p).get/set/update/delete/onSnapshot`, `db.collection(p).get/add/onSnapshot`, `.where(f,"==",v)`, `.orderBy`, `.limit` | **DynamoDB**, one table: partition key = collection path, sort key = document id. A collection read is one query; the few filters and sorts run in the API (collections are small) |
| path rules (`platform/capabilities.json`) | **One Lambda API** (HTTP) that checks every read and write against the same rules file, deployed with the code. `{self}` = the signed-in user's id; levels map to roles owner / trade / client |
| live updates (`onSnapshot`) | **API Gateway WebSocket**: clients subscribe to a path; the API pushes each accepted write to the subscribers allowed to read it. (Fallback if this proves fiddly: poll for changes every few seconds – acceptable at this size) |
| `assets.upload/list/delete`, `/_blob/<id>` URLs | **S3**, served through CloudFront on the same `/_blob/<id>` path so `blobUrl(id)` does not change; uploads via the API (pre-signed) |
| `user.id/isOwner/profiles` | **Cognito**, emailed one-time code (no passwords); role and id in the token; profiles from `sheets/{uid}` |
| `downloads.save({filename,data})` | plain `<a download>` / Web Share API (as `scripts/dev.mjs` already does) |
| `sample(input,opts)` (Ask Claude, sketch reading) | off at launch, or a Lambda calling Claude through Amazon Bedrock in a UK/EU region if the model is offered there, so AWS stays the only processor (GDPR decision 3) |
| the page | **S3 + CloudFront**, one distribution per environment |
| owner-device fan-out (supplier/maker copies, site-job copies, prompts) | keep on the owner's device at first; move to the API later |
| Claude scheduled task (planning leads) | to decide (GDPR decision 4); EventBridge schedule + Lambda if kept |
| Google Apps Script QR sign-in | later: a public endpoint on the same API writing to `signins`, which removes Google as a processor |

Why not the alternatives: **Firebase** would be less code (rules, live updates and sign-in are built in – it was the earlier recommendation here) but puts the data in a second cloud; **Postgres/Supabase** is better for reporting later, but the app does almost no querying today and a schema fights the way features get added; **AppSync** was the poor fit noted before – a thin Lambda in front of DynamoDB avoids it.

### Steps
Status marks: ✅ done, ◐ partly done (what is left is said), no mark = not started.

1. ✅ Backend code in `server/`: the API with the rules interpreter, WebSocket handlers, file upload. Rules tests that mirror the matrix in `docs/DATA_MODEL.md`. *(Nov 2026. Runs and is tested entirely locally – `npm run local`, `npm run test:backend`; reference and assumptions in `server/README.md`. The DynamoDB store is tested against an in-process emulator (dynalite); **not yet run against DynamoDB Local or real AWS** – one command once Docker is available, `server/README.md` › Tests.)*
2. ✅ *Written and tested without AWS (Nov 2026); not yet deployed.* Infrastructure in `infra/` as an **AWS CDK** app (see *Infrastructure* below): table, API, WebSocket, buckets, CloudFront, Cognito, DNS.
3. ✅ `src/platform/aws-adapter.js` exposing `window.claude = { use(name) }` with the same shapes as `platform/types/*.d.ts` (only the members the app uses). The build produces a second page with the adapter in front of the app. *(Nov 2026: `dist/web/index.html`; `dist/index.html` is byte-for-byte unchanged. `sample` – Ask Claude – resolves null.)*
4. Sign-in screen (emailed code); invite flow for trades; the client portal's join-code flow.
5. ◐ Point the existing Playwright suite at the adapter + local backend, alongside the fake – the UI tests should pass unchanged. *(Nov 2026: the crawl of every tab and button passes as owner, trade and client with `ERRORS (0)`, and a two-browser test shows an owner's change appearing live in a trade's page – both in `npm test`. Left: `tests/flows.js` (35 flows) and the per-feature scripts still run only on the fake; they build their pages in the test and would need the same "address instead of fake" switch the crawl got.)*
6. Server-side enforcement of what is client-side today: PIN-protected deletes, locks on signed sign-offs and waste transfer notes, the audit chain. *(One part exists already: on our backend a client is confined to their own portal area by the server, not by page code. That takes the client conversation and the "About us" company details away from clients until they are moved or a rule is added – a decision to make before clients are invited, `server/README.md` › Rules, assumption 2.)*
7. Import script: the Phase 0 export → DynamoDB + S3, with platform user ids remapped to Cognito ids everywhere they appear (`sheets/{oldId}`, `who`, `people[]`, `portalUid`, chat members, `by`, `owner`…). Rehearse on a copy.
8. Trial on real devices (iPad Safari, Android Chrome) in the dev environment with **synthetic data**.
9. Cutover: freeze the artifact (read-only banner), final export, import, verify, invite people by email, "Add to home screen". Then delete the data from claude.ai, and the build chats that contain it.

### Infrastructure: AWS CDK (`infra/`)
Status, Nov 2026: **built, not deployed.** The CDK app, its tests and the release workflows are in the repo and pass `npm run test:infra` (`cdk synth` for both environments, assertion tests, workflow lint) with placeholder account ids and domain. `infra/README.md` is the guide: what to fill in, bootstrap, first deploy, promote and roll back, cost. The points below are the design; a ✅ means the repo now does it.
- ✅ **One CDK app, one stack definition, instantiated once per environment** (`dev`, `prod`) from a small config file: environment name, AWS account and region, domain. Nothing about an environment is hard-coded in the stack.
- ✅ **Every resource is told apart by environment** three ways: its **name** carries it (`sitehq-dev-…`, `sitehq-prod-…`), it is **tagged** (`project=sitehq`, `env=dev|prod`, applied to the whole stack), and each environment has its own **subdomain** (for example `dev.<domain>` and `app.<domain>`, with certificates and DNS records created by the stack).
- ✅ Because names, tags and subdomains carry the environment, both can live in one AWS account or in two. Two accounts is the stronger separation for production personal data (a mistake with dev credentials cannot reach it); the config decides, the stack does not change.
- ✅ Production-only settings are switches in the config, not a different stack: deletion protection and point-in-time recovery on the table, bucket versioning, retained resources on stack deletion, tighter CORS and sign-in settings.
- ✅ `cdk synth` for both environments runs in CI on every pull request; `cdk deploy` runs only from the release workflows below.
- As built, where it differs from the table above: `/_blob/<id>` goes through CloudFront to the **API**, not straight to the bucket – the server checks the sign-in before sending a file, and the files bucket is reachable by nothing else. Live updates are at `wss://ws.<subdomain>.<domain>`. Sign-in emails go through **SES**, which emailed-code sign-in requires. A small hand-deployed **bootstrap stack** per environment holds what must exist first: the GitHub deploy role and the email identity.
- Open: Cognito does not allow a second factor together with emailed-code sign-in, so GDPR decision 9 ("a second factor for the owner") needs a different sign-in method for the owner. The connections table is not yet used by `server/` (`infra/README.md` › Known limits).
- Still to supply: the domain name and hosted zone, and the AWS account id(s) – as GitHub variables (`infra/README.md` › What you need to fill in).

### Release flow
Status, Nov 2026: the workflows (`.github/workflows/ci.yml`, `promote.yml`), the shared deploy steps and `CODEOWNERS` are written and lint clean; none has run against AWS, and the GitHub side (variables, the `production` environment and its reviewer, branch rules) is still to set up – `infra/README.md` › GitHub settings.
- **Two environments**, `dev` (synthetic data only, ever) and `prod`, both deployed by CDK from GitHub Actions.
- ✅ **`main` → dev**: every merge runs the tests and deploys to dev. James builds features through Claude on a branch, opens a pull request, and tries the result on his iPad at the dev address.
- ✅ **`production` branch → prod**: a manually run "promote" GitHub Action fast-forwards `production` to a chosen, tested `main` commit and deploys it (page, API and any infrastructure change together). It needs Jasper's approval each time (GitHub Environment protection). Nobody pushes to `production` directly.
- ✅ **Review gates** (CODEOWNERS; Jasper's GitHub username still to fill in): changes to `platform/capabilities.json`, `infra/`, `server/`, sign-in, `scripts/` and `.github/` need Jasper's review before merge. Feature code under `src/app/` and `src/styles/` needs green CI only.
- ✅ **Credentials**: GitHub deploys through short-lived AWS roles (OIDC); no long-lived keys in GitHub. The dev role can be taken only by workflows on `main`, the prod role only by a job in the `production` GitHub Environment.
- ✅ **Rollback**: promote the previous commit. Because `production` is only ever fast-forwarded, a rollback deploys the earlier commit and leaves the branch where it is: the branch records the newest commit approved for production, `/version.json` on the site records what is live. Data: DynamoDB point-in-time recovery, S3 versioning (old file versions are kept 30 days).

### GDPR decisions (James is the controller; items 1–4 are his to sign off – this is not legal advice)
1. **Paperwork**: data protection impact assessment (health information, staff time and location), ICO registration, written terms with anyone who can reach production data (including Jasper), record of what is held and why.
2. **Retention**: how long each kind of record is kept, set with his accountant; then deletion for leavers and old jobs, and a per-person export.
3. **AI features**: off at launch, or through Bedrock in region (above).
4. **Planning leads**: using applicants' names from public registers for letters is direct marketing and needs its own decision.
5. **Location**: all data and backups in London only.
6. **Sensitive fields** – NI number, medical notes, next of kin, key-safe and alarm codes – move to a restricted area readable only by the owner and the person themselves, encrypted with their own key, never written to logs.
7. **Enforcement on the server** (step 6 above).
8. **No real data outside production**: dev and tests use synthetic data; production data is never copied down; James's feature-building sessions never see production. (The 5 Nov 2026 incident was exactly this – `docs/PLATFORM.md`.)
9. **Access and audit**: named accounts, a second factor for the owner, a server-side log of deletes and exports.
10. **Backups** with a tested restore; a written plan for a data breach (who tells whom, within 72 hours).

## Phase 2 – harden (after go-live)
- Move the owner-device fan-out and the QR sign-in onto the API.
- Monitoring and alerts (errors, uptime), dependency updates.
- Replace the catch-all `todos` with separate collections (`clients`, `suppliers`, `surveys`, `wtns`, …) via migration.
- Reporting, if James needs it: export to a query store rather than changing the main database.

## Phase 3 – modernise (only where it pays)
- [x] Cut `app.js` into files along the existing banners (`src/app/`, Nov 2026) – same script once joined, no behaviour change.
- [x] Make them real ES modules (Nov 2026): generated imports/exports, one entry point (`core/boot.js`), no work at load outside it, order derived from imports, checked against esbuild on every test run.
- After the artifact is frozen: replace `scripts/bundle.mjs` with esbuild/Vite (small change – the modules are already valid) and minify, then consider strict mode.
- Lazy-loading the drawing tools and survey (about a third of the code): measured Nov 2026, the whole script takes ~0.1 s to parse and run on a desktop, ~0.45 s with the CPU slowed 4× and ~0.7 s slowed 6× (headless Chromium, not a real phone). A third of that is the most lazy-loading could save, and a single-file artifact cannot load code separately anyway. Not worth doing before own hosting; measure on a real trade phone first.
- Decoupling features from each other is separate, larger work with no mechanical route (`docs/ARCHITECTURE.md` › What is still coupled); do it per feature when there is a reason. Add JSDoc types / `// @ts-check` before any framework.
- Component framework screen-by-screen if desired (Svelte/React) behind the same `S`/`render()` contract; don't big-bang rewrite – the tests encode the behaviour.
- Native wrapper (Capacitor) for App Store/Play only if push notifications / camera integration justify it. Most updates still ship as web content.
- Multi-tenant (company id on every document) only if SiteHQ is to be sold to other firms.
