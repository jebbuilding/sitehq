# server/ – SiteHQ's own backend

What the app gets from the claude.ai platform today – a document database with access rules and live updates, a
file store, and "who is signed in" – as code we run ourselves. Node ES modules, no web framework. It is written as
Lambda handlers with every outside service behind a small interface, so the same code runs on AWS and, with the
other implementation of each interface, in one local process with no AWS account.

The browser half is `src/platform/aws-adapter.js`: it gives the app the same `window.claude.use(...)` it has always
used, backed by this API. The app itself (`src/app/`) is unchanged and does not know which one it is talking to.

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

## Tests

```bash
npm run test:backend     # everything below; `npm test` runs it too, last
node scripts/test-backend.mjs unit | crawl [owner|trade|client] | live     # one part;  VERBOSE=1 for detail
```

1. `server/test/*.test.mjs` (`node --test`):
   `rules` – the access matrix of `docs/DATA_MODEL.md`, row by row, for owner, trades, clients and nobody;
   `store` – one contract run against the in-memory store and the DynamoDB store;
   `api` – every route, the refusals, the limits, and the Lambda event wrapper;
   `live` – who is told about a write, over a recording transport, a real WebSocket and the API Gateway wrapper;
   `auth-blobs` – dev tokens, Cognito JWTs (signed with a key made in the test), disk files, S3 pre-signed links;
   `adapter` – a contract run against both the tests' fake platform and the adapter on the local backend, then what
   only a real backend has (rules, other people's writes arriving, files, sign-in).
2. The existing crawl, `tests/crawl.js`, as owner, trade and client with `SITEHQ_URL` pointing at a local backend:
   `ERRORS (0)` each, and a list of anything the rules refused while the app was being clicked through.
3. `tests/backend-live.mjs` – two browsers: an owner's chat message and a new site appear in a trade's open page,
   and back; a refused write; an uploaded image served from `/_blob/<id>`; data still there after a reload and in
   a second tab.

DynamoDB in the `store` test is [dynalite](https://github.com/architect/dynalite), an emulator that runs inside the
test process, because neither Docker nor Java is assumed. To run the same contract against the real DynamoDB Local:

```bash
docker run -p 8000:8000 amazon/dynamodb-local
DYNAMODB_ENDPOINT=http://127.0.0.1:8000 node --test server/test/store.test.mjs
```

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
| `TABLE_NAME` | both | the DynamoDB table |
| `USER_POOL_ID` | both | Cognito user pool id |
| `USER_POOL_CLIENT_ID` | both | app client id (comma-separated if several) |
| `TOKEN_USE` | both | `access` (default) or `id` – which Cognito token the page sends |
| `ASSETS_BUCKET` | http | S3 bucket for uploaded files |
| `ASSETS_PREFIX` | http | key prefix, default `assets/` |
| `WS_ENDPOINT` | http (required for live updates), ws (only with a custom domain) | the WebSocket API's management endpoint, `https://<api id>.execute-api.<region>.amazonaws.com/<stage>` |

There is no setting that selects the dev sign-in or the in-memory store; only `local.mjs` and the tests build those.

### Resources and permissions

- **Table**: partition key `pk` (String), sort key `sk` (String), on-demand, **TTL on attribute `ttl`**. No indexes.
  `pk` is the collection path, `sk` the document id, `d` the document as JSON text. The server's own records share
  the table under `pk` values starting `$` (`$conn`, `$sub:<path>`, `$cs:<connection>`, `$assets`), which no client
  path can spell.
- **HTTP function**: `dynamodb:GetItem, PutItem, DeleteItem, Query` on the table; `s3:GetObject, PutObject,
  DeleteObject` on `arn:…:<bucket>/<prefix>*` and `s3:ListBucket` on the bucket (without it S3 answers 403, not
  404, for an object that is not there, and finishing an upload that never arrived becomes a 500);
  `execute-api:ManageConnections` on the WebSocket API.
- **WebSocket function**: the same DynamoDB actions; `execute-api:ManageConnections`.
- **Bucket**: private. CORS allowing `PUT` and `GET` from the app's origin with the `content-type` header – the
  browser uploads straight to a pre-signed URL, and is redirected to one for PDFs, videos and large images.
- **Cognito**: three groups named exactly `owner`, `trade`, `client`. A user must be in exactly one; the function
  reads `cognito:groups` and uses `sub` as the user id. Anyone in none, or in two, is refused everything.
- **CloudFront**, so the page and the API are one origin: `/api/*` and `/_blob/*` → the HTTP API (no caching;
  forward `Authorization`, `Cookie`, `Range`, `Content-Type`, `x-sitehq-client`); everything else → the bucket
  holding `dist/web/index.html`.
- **`/config.json`** next to the page, written per environment:
  `{ "api": "/api", "ws": "wss://<api id>.execute-api.<region>.amazonaws.com/<stage>" }`. A WebSocket may go to
  another origin, so the WebSocket API's own address (or a custom domain for it) is the simple choice; putting it
  behind CloudFront as `/ws` is possible but has not been tried. The page is the same file in every environment;
  this file is the only thing that differs. Without it the adapter assumes `/api` and `/ws` on its own host.

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

Connections and subscriptions are records in the store, so any invocation can find who to tell. A connection whose
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

Sign-in screen and token refresh (the adapter takes its token from `window.SITEHQ_AUTH.token()` when the sign-in
work provides it); invitations and the client join-code flow; server-side enforcement of PIN-protected deletes and
locks on signed documents; "Ask Claude" (`use("sample")` is `null`); the data import; rate limits; clean-up of
abandoned uploads; a size cap on the whole database or file store.
