# Architecture

## In one paragraph
A single-page app written in **vanilla JavaScript** with **no framework**: `src/shell.html` (static skeleton), `src/styles/` (CSS) and `src/app/` (all logic: ~130 ES modules, 2.1 MB, joined into one inline script by `scripts/build.mjs`) – see *Source layout* and *Build* below. It renders by writing template-literal HTML into `#main` and wiring event handlers afterwards. All persistence, files and identity come from the host platform through `window.claude.use(...)` (today: claude.ai Artifacts). Third-party libraries are loaded lazily from cdnjs at pinned versions only when a feature needs them.

## How it was built (philosophy)
- Built conversationally with Claude, one request at a time, by the owner on site. Features were added in small increments and shipped immediately (~320 versions).
- Optimised for **one non-technical owner on an iPad** and trades on phones: big buttons, plain English, offline-tolerant writes, everything printable/shareable as PDF.
- **No dependencies at runtime except CDN libraries** loaded on demand – keeps the page a single publishable file.
- Every change verified by headless browser tests against a fake backend (see `docs/../tests`), plus visual checks of generated PDFs.
- Safety rails built in rather than bolted on: PIN-protected destructive actions, deleted-items bin, tamper-evident audit chain, locked signed documents.

## Runtime
```
┌──────────────── claude.ai (host) ────────────────┐
│ sandboxed iframe                                  │
│  index.html  ── window.claude.use("db")      ──► document DB (Firestore-like, path rules)
│              ── window.claude.use("assets")  ──► blob store (/_blob/<id>)
│              ── window.claude.use("user")    ──► identity (id, isOwner, profiles)
│              ── window.claude.use("downloads")─► "save file" with user consent
│              ── window.claude.use("sample")  ──► calls Claude (AI helper, sketch reading)
│  cdnjs: jsPDF 2.5.1, pdf.js 3.11.174, SheetJS 0.18.5, mammoth 1.8.0, JSZip 3.10.1, qrcode-generator 1.4.4
└───────────────────────────────────────────────────┘
```
The **only place the platform is acquired is the boot IIFE in `src/app/core/boot.js`** (`const use=n=>window.claude.use(n)...; const [db,user,assets,dl]=await Promise.all(...)`), plus `AI.sample` in the "Ask Claude" helper. That boot block is the seam for the production adapter – see *Own hosting* below.

Boot sequence (`src/app/core/boot.js`):
1. Acquire `db`, `user`, `assets`, `downloads`. If no db/user → "Sign in to use the app".
2. Wrap them (`wrapDb` – routes owner deletes to the bin; `wrapAssets`; `S.dl` adds a Print bar after any PDF save).
3. Open IndexedDB: `jeb-files` (in-app file cache) and `jeb-outbox` (offline write queue), flush the outbox.
4. `S.owner = await user.isOwner()`.
5. Subscribe (`onSnapshot`) to shared collections (`sites`, `equipment`, `docs`, `chats`, `settings/*`, `plan`, …) and, for the owner, private ones (`todos` → clients, suppliers, surveys, WTNs, samples, …; `offapp`; `visitinds`; every trade's `sheets/{id}/…` via the TR loader).
6. Each snapshot updates `S.*` and calls `render()`.

## Own hosting: the adapter and the server
The same app runs without claude.ai by putting a different `window.claude` underneath it. Nothing in `src/app/` changes or knows.

```
┌──────────── browser: dist/web/index.html ────────────┐          ┌──────────────── server/ ────────────────┐
│ src/platform/aws-adapter.js   defines window.claude  │          │ handlers/http.mjs → core/api.mjs        │
│   use("db")        ── POST /api/db/get|list|set|… ───┼─────────►│   sign-in ─► rules ─► store ─► publish  │
│   onSnapshot       ── WebSocket: sub ◄── "changed" ──┼─────────►│ handlers/ws.mjs   → core/live.mjs       │
│   use("assets")    ── /api/assets, then /_blob/<id> ─┼─────────►│   files                                 │
│   use("user")      ── GET /api/me, POST /api/profiles│          │                                         │
│   use("downloads") ── <a download> (no server)       │          │ store:  DynamoDB    | in memory         │
│   use("sample")    ── null (Ask Claude is off)       │          │ files:  S3          | local disk        │
│ the app, unchanged (same script as dist/index.html)  │          │ sign-in: Cognito JWT | dev tokens       │
└──────────────────────────────────────────────────────┘          │ push:   API Gateway | local WebSocket   │
                                                                  └─────────────────────────────────────────┘
```

- **`src/platform/aws-adapter.js`** is one plain script, not part of `src/app/` (so not bundled by imports, not checked by `npm run modules`, not formatted by Prettier). It provides exactly what the app uses: `db` (`doc`/`collection`, `get`/`set`/`update`/`delete`/`add`/`onSnapshot`, `where`/`orderBy`/`limit`, snapshots `{id, exists, data()}` and `{docs}`), `user` (`id`, `isOwner`, `name`, `profiles`), `assets` (`upload`, `delete`, `list`), `downloads` (`save`). Its header comment says how it is configured and signed in.
- **`server/`** is the backend: Lambda-style handlers with the database, file store, sign-in and push each behind an interface with two implementations – the AWS one and a local one. `server/README.md` is the reference: layout, HTTP API, WebSocket messages, what the CDK stack needs, and every assumption made about the rules.
- **Rules**: the server enforces `platform/capabilities.json` – the same file, read by `server/core/rules.mjs`. Owner, trade and client come from the sign-in token. Two things are stricter than on claude.ai: a client is confined to `portal/<their id>`, and a path no rule covers is owner-only (`server/README.md` › Rules).
- **Live updates** carry no data. `onSnapshot` reads once over HTTP and subscribes; after any accepted write the server tells the subscribers who may read that document "this path changed", and each reads it again. State only ever comes from a read, so late or out-of-order messages cannot leave a page stale. After a page's own write the adapter re-reads straight away rather than waiting to be told.
- **Files** keep the address `/_blob/<id>`, on the page's own origin – the app draws them onto canvases, which a cross-origin image would lock.
- **Run it**: `npm run local` → `localhost:4322/owner|trade|client`: page, API, WebSocket and files in one process on the in-memory store with the tests' seed. Data survives reloads and is shared between tabs until the server stops. No AWS account involved. (`npm run dev` remains the quick one: the fake platform inside the page, no rules, reset on reload.)
- **Tests**: `npm run test:backend`, also the last step of `npm test` – see `server/README.md` › Tests. The crawl was pointed at the backend by giving `tests/crawl.js` an address (`SITEHQ_URL`); owner matches the fake tab for tab, and so do trade and client apart from two things that come from being served from a real address rather than `setContent` (below).
- **Not there yet**: the sign-in screen (the adapter takes a token from `window.SITEHQ_AUTH.token()` when one exists), a deployment (the CDK stack in `infra/` is separate work), the data import. Nothing here has run on AWS. `docs/ROADMAP.md` Phase 1.

Differences seen when the same crawl runs on the backend instead of the fake, both explained:
- A page served from `http://127.0.0.1` has working `localStorage`; a page loaded with `setContent` does not. So the trade's "Save JEB to your computer" card goes away when dismissed, which shifts which buttons the crawl reaches (it checks in, so the Sign in tab then shows "Signed in").
- A client's "About us" shows a different owner/contact name: the client can no longer read `settings/app` (confinement), so the app falls back to the signed-in user's own name. Cosmetic here, but it is the visible edge of a real change for clients – `server/README.md` › Rules, assumption 2.

## Source layout (`src/`)
Until November 2026 all the logic was one file, `src/app.js`. It is now ES modules under `src/app/`, one per section, grouped into folders by area. `docs/MODULES.md` (generated) lists every file with what it exports, what it imports and who uses it.

| Folder | What is in it |
|---|---|
| `core/` | Helpers (`$`, `esc`, dates, `store`) – the one file that imports nothing; state `S`; form fields; tabs + `render()`; pop-up sheet (`openSheet`); full-page viewer (`openViewer`); `wrapDb` and the live feed; date/weather bar; Ask Claude; report an issue; spell check; dictation; back button; **`boot.js`, the entry point** |
| `files/` | Upload/download (`uploadFile`, `blobUrl`, `getFileBlob`), offline outbox (`submitJob`), in-app file viewer + scale ruler, printing (`printBlob`), cut-outs, Send to…, attachment picker |
| `timesheets/` | Trade timesheets, working day, paper-style monthly sheet, day work (+ xlsx), weekly pay summary, person/site filters |
| `safety/` | Check lists and daily checks, site inductions, training & toolbox talks, accidents, expiry dates, policies & insurance, RAMS and the RAMS maker, CDM 2015 documents, waste transfer notes |
| `sites/` | Plans & specs, the trades' site pages, job sheets, owner site project pages, job details, site tiles and storage, who can see a document, sign-in book, QR sign-in, roll call, maps & pins |
| `clients/` | Clients and enquiries, address book and job history, client record PDF, GDPR consent, client documents, sketches, the client portal (uploads, shared calendar, sign-offs), stages ↔ planner |
| `owner/` | Owner tabs and setup, reports, to-do lists, alerts and what's-new, company details, PIN, deletion record, deleted items, delete a client or site, backup, planning leads |
| `people/` | Personal details, employment types, profile photos, personal documents, reminders, leavers, foreman access, subcontractor agreement |
| `purchasing/` | Invoices, materials & receipts, merchants, suppliers and makers, brochures, samples |
| `planner/` | Time off, the planner board, list/day views and import, diary board |
| `chat/` | Chat, calls, contacts |
| `photos/` | Photos, mark-up, multi-select + zip, photo test |
| `drawing/` | Notebook page, walls, symbols, building components, timber layouts, construction details, paving, DXF export, trades' drawings, drawings tab, drawing sign-off and sign-off sheets |
| `survey/` | Door & window survey (`DWS`) |
| `calculators/` | Sums and areas, materials, roofing, falls, stairs/plasterboard/timber/aggregates |

## Anatomy of a file
Every file under `src/app/` has the same three parts, in this order:

```js
/* ================= CALLS FROM CHAT ================= */     ← 1. banner: what the file is
import { CH } from "./chat.js";                                 ← 2. import/export block – GENERATED
import { esc } from "../core/helpers.js";
export { intlNum, isApple, openCallSheet, phoneOf };
const intlNum = (n) => {…};                                     ← 3. the code
function phoneOf(id) {…}
```

1. **Banner** – one comment line, written when the feature was built. It is the file's description, and `scripts/split.mjs` matches sections to files by it, so don't reword one casually.
2. **Import/export block** – written by `npm run modules`, never by hand. Every top-level name in the app is unique (checked), so "which file declares this name" has exactly one answer: use a name from another file, run `npm run modules`, and the import and the matching export appear. A name nothing else uses is not exported.
3. **Code** – top-level declarations only (functions, `const`, `let`), formatted with Prettier (`npm run format`; settings in `.prettierrc.json`). HTML is still built in template literals, which Prettier leaves as they are, so those lines stay long. **A file does nothing when it is loaded.** If it needs to wire up part of the page at start-up, it declares an `initSomething()` function and `core/boot.js` calls it.

Three conventions follow from being real modules:
- **A variable can only be assigned in the file that declares it.** Other files go through a setter (`setEditing`, `setFormType`, `setKindVal`, `setProxyFor`, `setNpScx`, `setPinFails`, `setPinLockUntil`). Reading an imported variable always gives its current value.
- **Feature modules**: eleven newer features are self-contained IIFEs that expose a few functions – `DWS`, `LEADS`, `WTN`, `SENDTO`, `SIGNIN`, `SIGNSHEET`, `CUT`, `SUBAG`, `SAMPLES`, `CJOBS`, `QRSITE`. Everything else is top-level functions.
- **Folders and file names are a filing system, not layers.** Shared helpers still sit in whichever section first needed them (`loadJsPdf` in `safety/site-inductions.js`, `BRGB` and `pdfLogo` in `photos/photos.js`, `nameOf` in `owner/owner.js`). The imports tell you where a name really lives.

## Styling (`src/styles/`)
The stylesheet used to be one 127 KB `<style>` block inside `src/shell.html`, plus two blocks that the door & window survey and the waste transfer note injected from script. It is now plain CSS files, and `src/shell.html` is just the static markup with a placeholder comment where the build puts the stylesheet.

| File | What is in it |
|---|---|
| `index.css` | Nothing but the list of files, as `@import` lines. **This is the order they are joined in.** |
| `base.css` (3 KB) | Colour variables for light and dark, page defaults, keyframes – rules with no class in them |
| `shared.css` (66 KB) | The app frame (header, tabs, sheet, viewers), classes used by more than one feature, and feature rules that have to stay ahead of a later shared rule (see below) |
| `calculators.css` … `timesheets.css` (67 KB in 14 files) | One file per folder of `src/app/`: rules that can only apply inside that feature |

**What goes in a feature file.** A rule belongs in `<folder>.css` when every one of its selectors needs a class (or id) that only that folder's code uses – `.wsov .btn` is the survey's, because `.wsov` exists nowhere else, even though `.btn` is everywhere. Anything else goes in `shared.css`. `npm run check` enforces this, and that every file starts with its banner (`/* ===== styles: name – … ===== */`).

**Order matters, and that is why `shared.css` is big.** When two rules of equal weight set the same property on the same element, the later one wins. The original stylesheet was written in the order features were built, not grouped, so moving a feature's rules to a later file could flip a result. The regroup kept the original relative order of every pair of rules that *could* clash (same specificity, an overlapping property, and classes that can sit on one element). About 400 feature rules stay in `shared.css` for that reason, at their original position. So:
- inside any file, **do not reorder existing rules**;
- new feature rules go at the end of that feature's file; new shared rules go in `shared.css` just before the last line (the `@media (prefers-reduced-motion:no-preference)` block);
- give a new feature's classes a prefix of their own, so its rules qualify for its own file.

**Build.** `scripts/bundle.mjs` joins the files in `index.css` order, text unchanged, and inlines them as the page's one `<style>`. It refuses to build if a `.css` file is not imported or an import is missing. `scripts/split.mjs` reverses it (it cuts a published page's stylesheet at the banners).

**What is still not in CSS files** (deliberately):
- ~890 inline `style="…"` attributes in the HTML templates, mostly spacing (`margin-top:8px`); 46 of them hard-code a colour instead of a variable and are worth checking in dark mode;
- sizes and positions set from script (`el.style.…`);
- the tiny stylesheet of the print iframe in `files/print.js` (a separate document);
- PDF and canvas drawing colours, which are code, not CSS.

**How the regroup was verified.** Moving the block out of `shell.html` left `dist/index.html` byte-for-byte identical. For the regroup, the old and new pages were driven side by side through the same clicks and the computed style of every element and its `::before`/`::after` compared after each step. Every tab and up to 45 buttons per tab were pressed as owner, trade and client at phone width in light mode and as owner at 1100 px in dark mode; every tab was also compared at 390, 600 and 1100 px in light, dark and forced-dark; and the survey editor and the waste transfer note were opened directly. About 1,200 states and 420,000 element checks, with no difference.

One assumption to know about: the survey and waste-note CSS used to be added to `<head>` the first time those screens opened, which put it *before* the page's own stylesheet in the test wrapper (where the page sits in `<body>`). It is now placed first to match. If claude.ai puts the page's `<style>` in `<head>` instead, 66 of those 87 rules could in principle change precedence against a shared rule; none did in any state compared.

## Start-up: `core/boot.js`
`core/boot.js` is the entry point and the only file with statements that run at load. In order, it:
1. calls the 20 `init…()` functions (event wiring on the static shell, document-level handlers, timers, and the drawing tools' symbol tables), in a fixed order written out in the file;
2. starts the asynchronous boot (*Boot sequence*, above);
3. calls `initBackButton()`.

The order of the init calls is the order those statements ran in when the app was a single file; keep it. One of them, `initTabsWeek()`, wraps `render` once (`render=function(){_render0.apply(…)…}`) to enhance photo grids after each draw. There is one `render`; this is its only wrapper.

## Build
`scripts/bundle.mjs` is the one place that knows how the app is assembled; `build.mjs`, `dev.mjs` and `split.mjs` all use it.

```
src/app/core/boot.js ─► follow the imports: each file is placed after the files it imports
                        (the order ES modules are evaluated in; nothing is listed by hand)
                     ─► drop each file's import/export block; each file must parse on its own
                     ─► "(function(){" + file + file + … + "})();"   one scope, source text unchanged
src/styles/index.css ─► the files it imports, joined in that order, text unchanged
src/shell.html       ─► shell with that stylesheet inlined + <script> + the app + </script>  =  dist/index.html
src/platform/aws-adapter.js ─► <!doctype html>…<body> + <script> + adapter + </script> + dist/index.html + </body></html>  =  dist/web/index.html
```

- **Why not esbuild or Vite?** They would work – `npm run check` bundles the modules with esbuild on every run and fails unless it accepts them and evaluates them in exactly the order above. But a real bundler re-prints the code, and until the claude.ai artifact is frozen the published script has to stay the source text, so that a version published from somewhere else can be cut back into files (`scripts/split.mjs`, `docs/PLATFORM.md` › Publishing). After cutover, replacing `bundle.mjs` with esbuild is a small change.
- The build refuses to run if a file under `src/app/` is not reachable from `core/boot.js` through imports (it would be left out), if an import points at a missing file, or if a file does not parse on its own.
- `dist/index.html` is the single file that gets published; the platform wraps it in its own `<html>` skeleton. `npm run dev` serves the same assembly with the tests' fake backend.
- `dist/web/index.html` is the page for our own hosting: a complete document with the adapter in a script of its own ahead of the very same fragment (`webPage` in `bundle.mjs`). Adding it left `dist/index.html` byte-for-byte unchanged (same SHA-256 before and after). `npm run local` serves this assembly from the local backend.

## Structure checks
`npm run check` (also run by `npm test` and CI) parses every file with acorn + eslint-scope and fails if:
- a name is declared at the top level of two files;
- a name is used that is declared nowhere in `src/app/` and is not a browser or CDN-library global;
- any file other than `core/boot.js` has a statement that runs at load;
- a file uses another file's `const`/`let` *while it is being loaded* (for example in an initialiser) and that other file imports it back, directly or through other files – in a loop like that the value may not be ready;
- an import/export block, or `docs/MODULES.md`, is not what `npm run modules` would write;
- a rule in a feature's CSS file could apply outside that feature, or a CSS file lacks its banner (*Styling*, above);
- a file is not formatted the way Prettier would format it (`npm run format` fixes it);
- esbuild rejects the modules (for example an assignment to an import), or would evaluate them in a different order from `bundle.mjs`.

`npm run build` and `npm run dev` need no `npm install`; the checks, `npm run local` and the backend tests do.

## How the restructuring was verified
Each step either left the built page provably unchanged or was compared against the original:
1. **Cut into files**: `dist/index.html` byte-for-byte identical to the build from the single `app.js` (same SHA-256); then three banner comments added (identical with banner lines ignored).
2. **Import/export blocks added**: build byte-for-byte identical again (the blocks are dropped when joining).
3. **Setters** for the 39 assignments made from another file, **`init` functions** for the 93 statements that ran at load, two small files split out so the low-level helpers import nothing (`timesheets/working-day.js`, `people/employment-types.js`), and **order derived from imports**: here the text does change, so the original and new pages were both loaded with the fake backend and the value of every top-level name compared straight after load. All 1,244 names present in both were identical (data tables, state, the wrapped `render`), apart from the 17 functions containing the setter edits and one timestamp.
4. **Formatting with Prettier**: for all 128 files the syntax tree and the comments are identical before and after (parsed with acorn; the only normalisation is that `a||(b||c)` and `(a||b)||c` count as the same, which Prettier regroups). After load, every non-function value is identical too.
5. The full suite (35 flows, owner/trade/client crawls) at each step, and the 49 per-feature scripts in `tests/features/` compared against their output on the original build.

## What is still coupled
Being modules makes the coupling explicit; it does not remove it. `docs/MODULES.md` has the numbers: about 1,430 file-to-file imports, and 116 of the 128 files import each other in one loop.

Two obvious restructurings were measured before deciding not to do them:
- **A tab registry** (features register their tabs so `core/` stops importing features): even with *every* import from `core/` to other folders removed, the loop only shrinks from 116 files to 95.
- **Moving widely shared helpers into `core/`** (`nameOf`, `teamIds`, `blobUrl`, `coData`…): the loop stays at 116 files; only the number of imports drops (by about 15%).

The loop is feature-to-feature: 646 imports between files in different feature folders. Undoing that means redesigning how features call each other, one feature at a time, when there is a reason to touch it – not a mechanical step. The state object `S` (~96 properties, imported by 104 files) and `render()` (78 files) are the centre of it.

## Roles & permissions
- **Owner**: `user.isOwner()` (the artifact's owner). Sees everything; owner-only collections.
- **Trade**: any other signed-in user with access; identified by `user.id()`. Their profile is `sheets/{uid}`; their data in `sheets/{uid}/…`. A "Foreman" flag grants extra access; "Sign-in only" hides timesheets/day work for agency/other-company people.
- **Client**: a user linked to a client record through `portal/{uid}` (join code flow). Sees only the portal.
- Enforcement = platform path rules (`platform/capabilities.json`) **plus** client-side logic. Owner-private data is only in owner-read collections; anything trades need is **copied** into their own subcollection by the owner's client ("fan-out", e.g. `makercopy`, supplier copies, site-job copies, prompts). See `docs/KNOWN_ISSUES.md` for the implications.

## Offline & files
- Writes from trades go through an IndexedDB outbox and retry when signal returns.
- Files are uploaded to the asset store; large client uploads are chunked into the portal area.
- `jeb-files` caches app-generated files so they open without re-downloading.

## PDFs & printing
jsPDF builds every document client-side (timesheets, reports, survey order request / full survey, waste transfer note, sign-off sheets, subcontractor agreement, QR posters, client record, samples list, etc.). `printBlob` prints: on touch devices via the share sheet; on computers by rendering pages with pdf.js into a hidden iframe and calling `print()` (works in every browser).

## External pieces outside this page
- **Planning leads**: a Claude scheduled task scrapes council planning portals weekly into `data/users/me/leads/*` (owner-private per-user area).
- **QR site sign-in**: a Google Apps Script web app in James's Google account (`apps-script/`), because visitors can't open a claude.ai artifact. Records are imported into the sign-in book by copy/paste export.
