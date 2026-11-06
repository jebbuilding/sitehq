# server/ – SiteHQ's own backend

What the app gets from the claude.ai platform today – a document database with access rules and live updates, a
file store, and "who is signed in" – as code we run ourselves. Node ES modules, no web framework. It is written as
Lambda handlers with every outside service behind a small interface, so the same code runs on AWS and, with the
other implementation of each interface, in one local process with no AWS account.

The browser half is `src/platform/aws-adapter.js`: it gives the app the same `window.claude.use(...)` it has always
used, backed by this API. The app itself (`src/app/`) is unchanged and does not know which one it is talking to.
Ahead of it in the page is `src/platform/sign-in.js`, the sign-in screen – see [Sign-in](#sign-in).

```
handlers/http.mjs      Lambda entry point: the HTTP API            → export handler
handlers/ws.mjs        Lambda entry point: live updates            → export handler
handlers/env.mjs       builds the production pieces from environment variables
local.mjs              the same API + WebSocket + files in one local process (startLocal)

core/api.mjs           every HTTP route: request in, response out
core/rules.mjs         the rules interpreter (platform/capabilities.json)
core/roles.mjs         owner / trade / client → levels, and the client's confinement
core/live.mjs          subscriptions and "this changed" messages
core/query.mjs         where ==, orderBy, limit
core/paths.mjs         the path grammar

store/memory.mjs       the store interface + in-memory implementation     store/dynamodb.mjs     on one DynamoDB table
blobs/disk.mjs         the file-store interface + local-disk implementation   blobs/s3.mjs       on S3, pre-signed URLs
auth/dev.mjs           the sign-in interface + dev tokens (local only)    auth/cognito.mjs       Cognito JWT verification
auth/local-cognito.mjs a stand-in for Cognito's own endpoint (local only): emailed-code sign-in without AWS
transport/local-ws.mjs a WebSocket server (the `ws` package)              transport/apigw-ws.mjs API Gateway post-to-connection
test/                  node:test suites (see Tests)
```

## Run it locally

```bash
npm install
npm run local        # http://localhost:4322/owner | /trade | /client   (PORT, HOST override)
```

One process serves the page for our own hosting (the app behind the adapter), the API, the WebSocket and the files,
on the in-memory store, seeded with the tests' made-up data (`scripts/seed.mjs` reads it out of
`tests/harness8src.js` and `tests/crawl.js`). The address picks who you are: `/owner` signs in as the made-up owner,
`/trade` as "Sam Test" (`emp1`), `/client` as "Sue Jones" (`u9`). Unlike `npm run dev`, the data is held by the
server: it survives a reload, every tab shares it, a change in one tab shows up in the others as it happens, and
the access rules are enforced. It is forgotten when the server stops. Synthetic data only – the dev sign-in has no
password, so never put real data behind it.

`http://localhost:4322/app` is the page exactly as it is deployed (`dist/web/index.html`, reading `/config.json`),
so it starts at the sign-in screen. A stand-in for Cognito in the same process answers it
(`auth/local-cognito.mjs`). Sign in as `owner@sitehq.test`, `trade@sitehq.test` or `client@sitehq.test` – they are
the same three made-up people as above; no email is sent, the code is printed in the terminal.
(`norole@sitehq.test` has an account and no role, to see that message.) To sign out, open
`http://localhost:4322/app#signout`.

## Tests

```bash
npm run test:backend     # everything below; `npm test` runs it too, last
node scripts/test-backend.mjs unit | crawl [owner|trade|client] | live | signin     # one part;  VERBOSE=1 for detail
```

1. `server/test/*.test.mjs` (`node --test`):
   `rules` – the access matrix of `docs/DATA_MODEL.md`, row by row, for owner, trades, clients and nobody;
   `store` – one contract run against the in-memory store and the DynamoDB store;
   `api` – every route, the refusals, the limits, and the Lambda event wrapper;
   `live` – who is told about a write, over a recording transport, a real WebSocket and the API Gateway wrapper;
   `auth-blobs` – dev tokens, Cognito JWTs (signed with a key made in the test), disk files, S3 pre-signed links;
   `env` – the production wiring from environment variables: which table documents and live-update records go in;
   `adapter` – a contract run against both the tests' fake platform and the adapter on the local backend, then what
   only a real backend has (rules, other people's writes arriving, files, sign-in);
   `local-cognito` – the Cognito stand-in: its tokens pass the ordinary Cognito verifier, wrong and run-out codes,
   renewal, revoking, and the local server accepting both its tokens and the dev ones;
   `seed-dev` – `npm run seed:dev` against the DynamoDB emulator and a stand-in S3: refuses anything but dev,
   refuses a table with documents in it unless told to replace them, and what it writes is what the API reads.
2. The existing crawl, `tests/crawl.js`, as owner, trade and client with `SITEHQ_URL` pointing at a local backend:
   `ERRORS (0)` each, and a list of anything the rules refused while the app was being clicked through.
3. `tests/backend-live.mjs` – two browsers: an owner's chat message and a new site appear in a trade's open page,
   and back; a refused write; an uploaded image served from `/_blob/<id>`; data still there after a reload and in
   a second tab.
4. `tests/backend-signin.mjs` – the sign-in screen in a browser, on `/app`: email → code → signed in as owner,
   trade and client; a wrong code, three wrong codes, a code that has run out, a new code; an address with no
   account (word for word the same screen); an account with no role; no signal at each step; the token renewed
   before it runs out and the server refusing the old one; renewal refused → signed out; signing out, in this tab
   and from another; the 8-hour limit; 44px targets; dark mode. `SHOTS=1 node backend-signin.mjs` (from `tests/`)
   also writes screenshots to look at.

DynamoDB in the `store` test is [dynalite](https://github.com/architect/dynalite), an emulator that runs inside the
test process, because neither Docker nor Java is assumed. To run the same contract against the real DynamoDB Local:

```bash
docker run -p 8000:8000 amazon/dynamodb-local
DYNAMODB_ENDPOINT=http://127.0.0.1:8000 node --test server/test/store.test.mjs
```

## Sign-in

Built November 2026 and tested end to end on this machine. **It has never met the real Cognito** – what that leaves
unproven is listed at the end of this section.

**The screen** is `src/platform/sign-in.js` with `sign-in.css`, put in the page by the web build ahead of the
adapter. A person types their email address, Cognito emails them a one-time code, they type it in, they are signed
in. No password exists. The screen calls Cognito's public endpoint straight from the browser with `fetch` – no SDK
– using the `region` and `userPoolClientId` from `/config.json`:

| Step | Call | |
|---|---|---|
| email entered | `InitiateAuth`, `AuthFlow: USER_AUTH`, `USERNAME`, `PREFERRED_CHALLENGE: EMAIL_OTP` | Cognito sends the code and returns a `Session` |
| code entered | `RespondToAuthChallenge`, `ChallengeName: EMAIL_OTP`, `EMAIL_OTP_CODE`, the `Session` | returns access, ID and refresh tokens |
| token nearly over | `InitiateAuth`, `AuthFlow: REFRESH_TOKEN_AUTH` | a new access token |
| signing out | `RevokeToken` with the refresh token | the refresh token stops working |

It gives the page `window.SITEHQ_AUTH`:

- `token()` – the token the adapter sends. With nobody signed in it shows the screen and **does not resolve until
  somebody is**, so the app waits behind the screen and never reaches its own "Sign in to use the app" message.
  A token with under five minutes left (or a quarter of its life, if shorter) is renewed first; several requests at
  once share one renewal. The adapter also asks every 30 seconds while the page is visible, so the token and the
  `/_blob` cookie are renewed even when the app is only listening.
- `signOut()` – revokes the refresh token, forgets everything, reloads the page, which then shows the screen.
  **The app has no sign-out button yet** (that is a change under `src/app/`: a button that calls
  `window.SITEHQ_AUTH.signOut()` when `window.SITEHQ_AUTH` exists). Until then: open the site's address with
  `#signout` on the end.
- `failed(kind)` – for the adapter: if the server will not accept the token the person is signed out with a message;
  if the server cannot be reached the screen says "Can't reach SiteHQ" with a "Try again" button.

When renewal is refused (30 days are up, the person was removed, the token was revoked) the sign-in is forgotten
and the page reloads to the screen with "You've been signed out". No signal at renewal time signs nobody out.

**Decisions**

1. **Which token: the access token.** It is what `auth/cognito.mjs` verifies by default (`TOKEN_USE` unset), it
   carries the user id (`sub`) and the role (`cognito:groups`) and **no email address or name** – it goes in a
   header on every request and in the `/_blob` cookie. The ID token (which does carry the email address) is thrown
   away as soon as it arrives. Consequence: `/api/me` has no `name` for a real person. The app only asks for the
   owner's, and says "James" when there is none.
2. **Where the tokens are kept: `sessionStorage` unless the person asks otherwise.** The app holds personal data
   and runs on shared site tablets. By default the sign-in belongs to the tab: it ends when the tab or the
   home-screen app is closed, and after **8 hours without a tap or key press** (a tab left open overnight). Ticking
   "Keep me signed in on this device" – labelled as for your own phone or tablet only – keeps it in `localStorage`
   until sign-out or until the refresh token runs out, 30 days after signing in. Kept: the access token and the
   refresh token, nothing else. What this does not protect against: either store can be read by any script running
   in the page, so it relies on the page running only our own code (the app loads fonts and PDF libraries from
   CDNs, and the stack sets no Content-Security-Policy). The stronger design – the refresh token in an HttpOnly
   cookie set by our own server – needs a sign-in route on the server and was not built.
3. **An address with no account is told exactly what everyone is told**: "If *address* is set up for SiteHQ, we've
   just emailed it a code", with "if it still doesn't come, ask James to add you" underneath for everybody. The
   screen never says whether an address has an account; the user pool is set the same way
   (`preventUserExistenceErrors`). The cost: a mistyped address looks like a slow email. An account that exists but
   is in no role group *is* told so, but only after its code was right.
4. **Signing out forgets the sign-in, not everything on the device.** The app's own offline queue and file cache
   (IndexedDB `jeb-outbox`, `jeb-files`) and its `localStorage` settings stay. Queued work is tagged with its
   author and is only ever sent by them, so nothing is sent as the wrong person; but it is still on the tablet.
   Wiping it at sign-out would throw away unsent work – a decision for the app, not made here.

**Messages**: a wrong code; a code that ran out or was tried three times ("send a new one"); too many tries; no
signal; Cognito not answering; an account with no role; signed out (by choice, by time, by the server).
`console.warn` gets Cognito's error *name* when something unexpected is refused – never who was signing in.

**`/config.json`** keys the page reads: `api`, `ws` (adapter), `region`, `userPoolClientId` (sign-in). A page whose
settings have no `userPoolClientId` has no sign-in: the local dev pages (`/owner` …) put their settings, with a dev
token, in the page itself, and there `sign-in.js` does nothing. `cognitoEndpoint` exists for the local stand-in only.

**Locally** `auth/local-cognito.mjs` answers those calls, and its tokens – real RS256 JWTs signed with a key made
at start-up – are checked by `auth/cognito.mjs` exactly as production's are, given that key instead of fetching the
pool's. `server/local.mjs` accepts them beside the dev tokens.

**Not built**: the invite flow (people are created with the AWS CLI – `infra/README.md` › First deploy); the
client join-code flow (how a signed-in person becomes a client); a sign-out button in the app; a second factor
for the owner; wording of the email Cognito sends (its default text).

**Assumed about Cognito, and not tried** – each is how the documentation reads (November 2026); the stand-in
copies the same reading, so the tests cannot catch a mistake here:

1. The request and reply shapes in the table above, with the headers `Content-Type: application/x-amz-json-1.1`
   and `X-Amz-Target: AWSCognitoIdentityProviderService.<operation>`, unsigned, and that the endpoint answers a
   browser on another origin (CORS) – as the AWS browser libraries do.
2. A person made with `admin-create-user` (no password, `email_verified=true`) can sign in by emailed code
   straight away, and is offered `EMAIL_OTP` when the screen asks for it.
3. Error names: `CodeMismatchException` for a wrong code; `ExpiredCodeException` or `NotAuthorizedException` for a
   code that ran out or a finished session; `TooManyRequestsException` / `LimitExceededException` when throttled.
   Whether a wrong code can be tried again in the same session, and how many times, is not documented – the
   screen copes with either (it shows "send a new code" when the session is refused).
4. For an address with no account Cognito returns *some* challenge, picked from what the pool allows (possibly a
   password one). Anything but an emailed-code challenge is shown as the same code screen, and its code is then
   "not right" without Cognito being asked. Whether Cognito's timing or replies still tell the two apart at the
   API is Cognito's business, not something this screen can hide.
5. The code's length: the documentation shows 6 and 8 digits in different places. The screen does not say a
   length and takes up to 12 digits; the stand-in sends 8.
6. The code can be used for as long as the app client's sign-in session lasts (`authSessionValidity`, set to
   15 minutes in `infra/`).
7. `REFRESH_TOKEN_AUTH` works for this public client (refresh-token rotation is off) and returns `ExpiresIn`;
   a refused refresh token is `NotAuthorizedException`.
8. `RevokeToken` works for a client with no secret (`enableTokenRevocation` is on). The access token already
   issued stays valid at our API until its hour is up – the API checks signatures, it does not ask Cognito.
9. The access token carries `cognito:groups`; the user's `sub` is the id everything else uses.
10. Real iPad Safari and Android Chrome: the tests run in headless Chromium only. In particular whether a
    home-screen web app on iOS keeps `sessionStorage` while it is in the background has not been observed.

## For the CDK stack

### Entry points

| Function | File | Export | Triggered by |
|---|---|---|---|
| HTTP API | `server/handlers/http.mjs` | `handler` | API Gateway **HTTP API**, Lambda proxy integration, **payload format 2.0**. Routes `ANY /api/{proxy+}` and `ANY /_blob/{proxy+}` on the `$default` stage, so the function sees the path the browser asked for. No authoriser: the function checks the token itself. |
| Live updates | `server/handlers/ws.mjs` | `handler` | API Gateway **WebSocket API**: the `$connect`, `$disconnect` and `$default` routes. `$connect` has no authoriser (the first message signs the connection in). |

Both are ES modules for Node 22 and import `platform/capabilities.json` (outside `server/`), so bundle from the repo
root – `NodejsFunction`/esbuild with `format: ESM` picks it up. Dependencies are in the root `package.json`
(`@aws-sdk/*`, `aws-jwt-verify`); `ws` and `dynalite` are dev-only and not imported by the handlers.

### Environment variables

| Variable | Used by | Value |
|---|---|---|
| `TABLE_NAME` | http (ws only if the next one is unset) | the DynamoDB table for the documents and file records |
| `CONNECTIONS_TABLE_NAME` | both, optional | a second table, same keys and TTL attribute, for the live-update records (`$conn`, `$sub:<path>`, `$cs:<connection>`). Unset: they go in `TABLE_NAME` |
| `USER_POOL_ID` | both | Cognito user pool id |
| `USER_POOL_CLIENT_ID` | both | app client id (comma-separated if several) |
| `TOKEN_USE` | both | `access` (default) or `id` – which Cognito token the page sends |
| `ASSETS_BUCKET` | http | S3 bucket for uploaded files |
| `ASSETS_PREFIX` | http | key prefix, default `assets/` |
| `WS_ENDPOINT` | http (required for live updates), ws (only with a custom domain) | the WebSocket API's management endpoint, `https://<api id>.execute-api.<region>.amazonaws.com/<stage>` |

There is no setting that selects the dev sign-in or the in-memory store; only `local.mjs` and the tests build those.

### Resources and permissions

- **Tables**: both have partition key `pk` (String), sort key `sk` (String), on-demand, **TTL on attribute `ttl`**,
  no indexes. In the data table `pk` is the collection path, `sk` the document id, `d` the document as JSON text;
  the file records share it under `pk` = `$assets`, which no client path can spell. The connections table holds
  only the live-update records (`$conn`, `$sub:<path>`, `$cs:<connection>`), all short-lived, so it needs no
  backups or point-in-time recovery.
- **HTTP function**: `dynamodb:GetItem, PutItem, DeleteItem, Query` on both tables; `s3:GetObject, PutObject,
  DeleteObject` on `arn:…:<bucket>/<prefix>*` and `s3:ListBucket` on the bucket (without it S3 answers 403, not
  404, for an object that is not there, and finishing an upload that never arrived becomes a 500);
  `execute-api:ManageConnections` on the WebSocket API.
- **WebSocket function**: the same DynamoDB actions on the **connections table only** – it never reads a
  document; `execute-api:ManageConnections`.
- **Bucket**: private. CORS allowing `PUT` and `GET` from the app's origin with the `content-type` header – the
  browser uploads straight to a pre-signed URL, and is redirected to one for PDFs, videos and large images.
- **Cognito**: three groups named exactly `owner`, `trade`, `client`. A user must be in exactly one; the function
  reads `cognito:groups` and uses `sub` as the user id. Anyone in none, or in two, is refused everything.
- **CloudFront**, so the page and the API are one origin: `/api/*` and `/_blob/*` → the HTTP API (no caching;
  forward `Authorization`, `Cookie`, `Range`, `Content-Type`, `x-sitehq-client`); everything else → the bucket
  holding `dist/web/index.html`.
- **`/config.json`** next to the page, written per environment:
  `{ "env", "region", "api": "/api", "ws": "wss://ws.<site>", "userPoolId", "userPoolClientId" }` (the stack's
  `PageConfig` output). A WebSocket may go to another origin, so a custom domain for the WebSocket API is the
  simple choice; putting it behind CloudFront as `/ws` is possible but has not been tried. The page is the same
  file in every environment; this file is the only thing that differs. Without it the page says "Can't reach
  SiteHQ" (the sign-in screen needs it to know which Cognito to talk to).

### Things the stack design has to respect

- **`/_blob/<id>` must be same-origin with the page.** The app draws these images onto canvases (photo mark-up,
  PDFs, cut-outs); a cross-origin image locks the canvas and those features fail. So the API serves images up to
  4 MiB itself (base64 through Lambda) and only redirects other files to S3. If image traffic through Lambda
  becomes a cost, the alternative is a CloudFront behaviour straight to S3 with signed cookies – not built.
- `<img>` cannot send a header, so `/_blob/` also accepts the token in a `sitehq_token` cookie that the adapter
  sets for path `/_blob` only. Every other route needs the `Authorization: Bearer` header (so a cookie alone can
  never write anything).
- API Gateway closes an idle WebSocket after 10 minutes and any WebSocket after 2 hours. The adapter pings every
  30 seconds while the page is visible and reconnects by itself, re-reading everything it listens to.
- Uploads that are started and never finished leave a `$assets` record with `ready: false` and possibly an object.
  Nothing cleans those up yet.

## HTTP API

Every request carries `Authorization: Bearer <token>`. Bodies and replies are JSON. Errors are
`{ "error": { "code", "message" } }` with these statuses: 400 `invalid_argument`, 401 `unauthenticated`,
403 `forbidden` (or `not_uploader`), 404 `not_found`, 413 `too_large`, 415 `unsupported_type`, 5xx `unavailable`.
Document paths go in the body, never the URL, so they stay out of access logs.

| Request | Body | Reply |
|---|---|---|
| `GET /api/me` | | `{ id, role, isOwner, name, canUpload }` |
| `POST /api/profiles` | `{ ids: [...] }` | `{ profiles: { <id>: { id, name, isMe } } }` – names from `sheets/<id>.name`; a client gets `""` for everyone |
| `POST /api/db/get` | `{ path }` | `{ exists, data? }` |
| `POST /api/db/list` | `{ path, where?: [[field, "==", value]], orderBy?: [field, "asc"\|"desc"], limit? }` | `{ docs: [{ id, data }] }` – by id unless `orderBy`; documents without the `orderBy` field come last |
| `POST /api/db/set` | `{ path, data }` | `{}` – replaces the document |
| `POST /api/db/update` | `{ path, data }` | `{}` – shallow merge; creates the document if missing |
| `POST /api/db/delete` | `{ path }` | `{}` – documents nested below are not touched |
| `POST /api/db/add` | `{ path, data }` (a collection path) | `{ id }` |
| `POST /api/assets` | `{ contentType, size }` | `{ id, upload: { url, method, headers } }` – send the bytes there |
| `PUT /api/assets/<id>/content` | the bytes | `{}` – only when `upload.url` pointed here (local) |
| `POST /api/assets/<id>/complete` | | `{ id, url: "/_blob/<id>", sizeBytes, contentType }` |
| `GET /api/assets` | | `{ assets: [...], usage: { bytes, count } }` |
| `DELETE /api/assets/<id>` | | `{}` |
| `GET /_blob/<id>` | | the file (supports `Range`), or a 302 to a short-lived link |

A read the rules refuse answers exactly as if nothing were there (`exists: false`, an empty list) – the behaviour
of the platform the app was written on, and it means nothing can be learned by probing. A refused write is 403.
Limits: a document is a JSON object of at most 256 KiB and 32 levels; a path has at most 16 segments of letters,
digits and `_ - . ~ : @ +`; a file is at most 20 MiB and one of JPEG, PNG, WebP, GIF, HEIC, MP4, MOV, WebM, 3GP,
PDF (no HTML, SVG or scripts – files are served from the app's own origin). An optional `x-sitehq-client` header
names the page that made a write, and is echoed in the change message so that page can skip it.

## Live updates

One WebSocket per page. Messages are JSON (`core/live.mjs` has the full list): the page sends
`{ t: "auth", token }`, then `{ t: "sub", id, path }` for each document or collection it listens to. After every
accepted write the server sends `{ t: "change", id, path }` to each subscriber of that document, or of the
collection it is in, **who is allowed to read that document** – the path only, never the data. The page then reads
the new state over HTTP. Because state only ever comes from a read, messages arriving late, twice or out of order
(separate Lambda invocations give no ordering) cannot leave a page showing something stale.

Connections and subscriptions are records in a store (in production the connections table), so any invocation can
find who to tell. A connection whose
sign-in has expired is sent `{ t: "expired" }` and dropped; one that has gone is dropped the first time a message to
it fails.

## Rules

`core/rules.mjs` interprets `platform/capabilities.json` – the same file claude.ai enforces today – the way
`platform/types/db.d.ts` describes it. The matrix test (`test/rules.test.mjs`) is the executable version of the
table in `docs/DATA_MODEL.md`.

- Levels: `view < interact < admin < owner`. A caller may act when their level is at least what the rule asks.
- A rule covers its path and everything below it. The deepest rule covering a path wins; `read` and `write` are
  resolved separately, each from the nearest rule that sets it.
- `X/{self}` is the caller's own subtree, `X/<their id>` and below. For anyone else's subtree the rule at `X`
  applies if one is declared (all four here have one); if none is, the subtree is private from everybody, the owner
  included.
- Listing a collection returns the documents the caller could read one by one: a trade listing `sheets` gets their
  own profile, a client listing `portal` gets their own.
- No caller – no token, a bad token, an unknown role – may do nothing at all, on any route.

**Assumptions made, where the sources did not decide it:**

1. **Roles to levels**: `owner` → `owner`; `trade` → `interact`; `client` → `interact`. Nothing in SiteHQ's rules
   uses `admin`, and nobody is given `view`.
2. **A client is confined to `portal/<their id>`** – on top of the levels, in `core/roles.mjs`. The level rules alone
   would let a client read `sites`, `docs`, `jobs`, `plan`, `chats`, `msgs` and `settings`, as they can on claude.ai
   today, where only page code keeps them in the portal. This is stricter than the live system **and it takes two
   things away from clients that they have today**: the client conversation (it lives in `chats/…` and `msgs/…`)
   and the company details on "About us" (from `settings/app`). Neither produces an error – the screens are just
   empty or fall back. Restoring them needs a decision: copy what a client needs into their portal area (the
   fan-out the app already does for other things; an app change), or add a server rule for "chats I am a member
   of" (a document-level check the path rules cannot express) plus read access to a client-safe part of settings.
3. **Paths no rule covers are owner-only.** The platform's default would let any signed-in user read them and any
   trade write them. Every collection the app uses is declared, so the only effect is that a new collection needs
   a rule (reviewed) before anyone but the owner can use it.
4. **`data/users/<id>` exists without being declared**, private to that user as on the platform. With (3) its levels
   are owner-only, so in practice only the owner has one – and only the owner's screens (PIN, planning leads) use it.
5. **A trade may read and write `portal/<their own id>`.** That follows from the rules as written and is how
   someone enters a join code before they are a client. How a signed-in person *becomes* a client (their Cognito
   group changing) belongs to the sign-in work and is not built.
6. **`update` is a shallow merge that creates a missing document**, as the tests' fake does. The claude.ai
   platform documents a *deep* merge that *rejects* when the document is missing. The app always passes whole
   values for nested fields (`reads`, `day`, `items`…), so the two agree except when a nested object is sent with
   fewer keys than is stored: shallow drops the others, deep would keep them. Not checked against live behaviour.
7. **Files**: any signed-in user, clients included, can fetch a file whose id they know. Ids are 128 random bits
   and only appear inside documents the rules already let that user read; the platform's rules file says nothing
   about files (`"assets": {}`). The owner and trades can upload; a client cannot (`use("assets")` is `null`
   for them – client uploads already travel as documents under `portal/<id>/uploads`). The owner can delete any
   file; a trade only their own uploads.
8. **`profiles()`** resolves names from `sheets/<id>.name`, for the owner and trades. Trades can already see
   colleagues' names in `settings/app`. A client is told nobody's name.
9. **Rules are read once, when the function starts**, from the file deployed with it. Changing who can do what is a
   deploy, not a setting.

## Not built yet

Invitations and the client join-code flow, and a sign-out button in the app (the sign-in screen and token renewal
exist – [Sign-in](#sign-in)); server-side enforcement of PIN-protected deletes and locks on signed documents; "Ask Claude" (`use("sample")` is `null`); the data import; rate limits; clean-up of
abandoned uploads; a size cap on the whole database or file store.
