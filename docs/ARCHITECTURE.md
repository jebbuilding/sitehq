# Architecture

## In one paragraph
A single-page app written in **vanilla JavaScript** with **no framework**: `src/shell.html` (CSS + static skeleton) and `src/app/` (all logic: ~130 ES modules, 2.1 MB, joined into one inline script by `scripts/build.mjs`) – see *Source layout* and *Build* below. It renders by writing template-literal HTML into `#main` and wiring event handlers afterwards. All persistence, files and identity come from the host platform through `window.claude.use(...)` (today: claude.ai Artifacts). Third-party libraries are loaded lazily from cdnjs at pinned versions only when a feature needs them.

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
The **only place the platform is acquired is the boot IIFE in `src/app/core/boot.js`** (`const use=n=>window.claude.use(n)...; const [db,user,assets,dl]=await Promise.all(...)`), plus `AI.sample` in the "Ask Claude" helper. That boot block is the seam for the production adapter (`docs/ROADMAP.md`).

Boot sequence (`src/app/core/boot.js`):
1. Acquire `db`, `user`, `assets`, `downloads`. If no db/user → "Sign in to use the app".
2. Wrap them (`wrapDb` – routes owner deletes to the bin; `wrapAssets`; `S.dl` adds a Print bar after any PDF save).
3. Open IndexedDB: `jeb-files` (in-app file cache) and `jeb-outbox` (offline write queue), flush the outbox.
4. `S.owner = await user.isOwner()`.
5. Subscribe (`onSnapshot`) to shared collections (`sites`, `equipment`, `docs`, `chats`, `settings/*`, `plan`, …) and, for the owner, private ones (`todos` → clients, suppliers, surveys, WTNs, samples, …; `offapp`; `visitinds`; every trade's `sheets/{id}/…` via the TR loader).
6. Each snapshot updates `S.*` and calls `render()`.

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
const intlNum=n=>{…};                                           ← 3. the code
function phoneOf(id){…}
```

1. **Banner** – one comment line, written when the feature was built. It is the file's description, and `scripts/split.mjs` matches sections to files by it, so don't reword one casually.
2. **Import/export block** – written by `npm run modules`, never by hand. Every top-level name in the app is unique (checked), so "which file declares this name" has exactly one answer: use a name from another file, run `npm run modules`, and the import and the matching export appear. A name nothing else uses is not exported.
3. **Code** – top-level declarations only (functions, `const`, `let`). **A file does nothing when it is loaded.** If it needs to wire up part of the page at start-up, it declares an `initSomething()` function and `core/boot.js` calls it.

Three conventions follow from being real modules:
- **A variable can only be assigned in the file that declares it.** Other files go through a setter (`setEditing`, `setFormType`, `setKindVal`, `setProxyFor`, `setNpScx`, `setPinFails`, `setPinLockUntil`). Reading an imported variable always gives its current value.
- **Feature modules**: eleven newer features are self-contained IIFEs that expose a few functions – `DWS`, `LEADS`, `WTN`, `SENDTO`, `SIGNIN`, `SIGNSHEET`, `CUT`, `SUBAG`, `SAMPLES`, `CJOBS`, `QRSITE`. Everything else is top-level functions.
- **Folders and file names are a filing system, not layers.** Shared helpers still sit in whichever section first needed them (`loadJsPdf` in `safety/site-inductions.js`, `BRGB` and `pdfLogo` in `photos/photos.js`, `nameOf` in `owner/owner.js`). The imports tell you where a name really lives.

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
src/shell.html       ─► shell + <script> + that + </script>  =  dist/index.html
```

- **Why not esbuild or Vite?** They would work – `npm run check` bundles the modules with esbuild on every run and fails unless it accepts them and evaluates them in exactly the order above. But a real bundler re-prints the code, and until the claude.ai artifact is frozen the published script has to stay the source text, so that a version published from somewhere else can be cut back into files (`scripts/split.mjs`, `docs/PLATFORM.md` › Publishing). After cutover, replacing `bundle.mjs` with esbuild is a small change.
- The build refuses to run if a file under `src/app/` is not reachable from `core/boot.js` through imports (it would be left out), if an import points at a missing file, or if a file does not parse on its own.
- `dist/index.html` is the single file that gets published; the platform wraps it in its own `<html>` skeleton. `npm run dev` serves the same assembly with the tests' fake backend.

## Structure checks
`npm run check` (also run by `npm test` and CI) parses every file with acorn + eslint-scope and fails if:
- a name is declared at the top level of two files;
- a name is used that is declared nowhere in `src/app/` and is not a browser or CDN-library global;
- any file other than `core/boot.js` has a statement that runs at load;
- a file uses another file's `const`/`let` *while it is being loaded* (for example in an initialiser) and that other file imports it back, directly or through other files – in a loop like that the value may not be ready;
- an import/export block, or `docs/MODULES.md`, is not what `npm run modules` would write;
- esbuild rejects the modules (for example an assignment to an import), or would evaluate them in a different order from `bundle.mjs`.

`npm run build` and `npm run dev` need no `npm install`; the checks do.

## How the restructuring was verified
Each step either left the built page provably unchanged or was compared against the original:
1. **Cut into files**: `dist/index.html` byte-for-byte identical to the build from the single `app.js` (same SHA-256); then three banner comments added (identical with banner lines ignored).
2. **Import/export blocks added**: build byte-for-byte identical again (the blocks are dropped when joining).
3. **Setters** for the 39 assignments made from another file, **`init` functions** for the 93 statements that ran at load, two small files split out so the low-level helpers import nothing (`timesheets/working-day.js`, `people/employment-types.js`), and **order derived from imports**: here the text does change, so the original and new pages were both loaded with the fake backend and the value of every top-level name compared straight after load. All 1,244 names present in both were identical (data tables, state, the wrapped `render`), apart from the 17 functions containing the setter edits and one timestamp.
4. The full suite (35 flows, owner/trade/client crawls) at each step.

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
