# Architecture

## In one paragraph
A single-page app written in **vanilla JavaScript** with **no framework and no bundler**: `src/shell.html` (CSS + static skeleton) and `src/app/` (all logic: 126 files, ~13k lines / 2.1 MB, joined end to end into one script by `scripts/build.mjs`). The files are slices of one program that share one scope, not modules – see *Source layout* below. It renders by writing template-literal HTML into `#main` and wiring event handlers afterwards. All persistence, files and identity come from the host platform through `window.claude.use(...)` (today: claude.ai Artifacts). Third-party libraries are loaded lazily from cdnjs at pinned versions only when a feature needs them.

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
Until November 2026 all the logic was one file, `src/app.js`. It is now cut into one file per section under `src/app/`, grouped into folders by area. **Nothing about how the code runs changed**: the build joins the files back together in a fixed order and the result is the same script as before (see *Build* for how that was proved).

| Folder | Files | Size | What is in it |
|---|---|---|---|
| `core/` | 16 | 73 KB | Helpers (`$`, `esc`, dates, `store`), state `S`, form fields, tabs + `render()`, pop-up sheet (`openSheet`), full-page viewer (`openViewer`), `wrapDb` and the live feed, date/weather bar, Ask Claude, report an issue, spell check, dictation, **boot**, back button |
| `files/` | 8 | 91 KB | Upload/download (`uploadFile`, `blobUrl`, `getFileBlob`), offline outbox (`submitJob`), in-app file viewer + scale ruler, printing (`printBlob`), cut-outs, Send to…, attachment picker |
| `timesheets/` | 6 | 69 KB | Trade timesheets, paper-style monthly sheet, day work (+ xlsx), weekly pay summary, person/site filters |
| `safety/` | 11 | 245 KB | Check lists and daily checks, site inductions, training & toolbox talks, accidents, expiry dates, policies & insurance, RAMS and the RAMS maker, CDM 2015 documents, waste transfer notes |
| `sites/` | 13 | 151 KB | Plans & specs, the trades' site pages, job sheets, owner site project pages, job details, site tiles and storage, who can see a document, sign-in book, QR sign-in, roll call, maps & pins |
| `clients/` | 13 | 216 KB | Clients and enquiries, address book and job history, client record PDF, GDPR consent, client documents, sketches, the client portal (uploads, shared calendar, sign-offs), stages ↔ planner |
| `owner/` | 13 | 163 KB | Owner tabs and setup, reports, to-do lists, alerts and what's-new, company details, PIN, deletion record, deleted items, delete a client or site, backup, planning leads |
| `people/` | 7 | 73 KB | Personal details, profile photos, personal documents, reminders, leavers, foreman access, subcontractor agreement |
| `purchasing/` | 7 | 97 KB | Invoices, materials & receipts, merchants, suppliers and makers, brochures, samples |
| `planner/` | 4 | 80 KB | Time off, the planner board, list/day views and import, diary board |
| `chat/` | 3 | 40 KB | Chat, calls, contacts |
| `photos/` | 4 | 51 KB | Photos, mark-up, multi-select + zip, photo test |
| `drawing/` | 15 | 492 KB | Notebook page, walls, symbols, building components, timber layouts, construction details, paving, DXF export, trades' drawings, drawings tab, drawing sign-off and sign-off sheets |
| `survey/` | 1 | 162 KB | Door & window survey (`DWS`) |
| `calculators/` | 5 | 59 KB | Sums and areas, materials, roofing, falls, stairs/plasterboard/timber/aggregates |

How to find things:
- **Every file starts with a banner** – `/* ================= NAME: what it does ================= */` – written when the feature was built. The banner is the file's description; `src/app/manifest.txt` lists every file in load order.
- **`docs/MODULES.md` is the generated map**: for every file, the names it declares that other files use, the files it depends on, and what it runs at load. It also lists the most widely used names and every variable assigned from another file.
- **Folders and file names are a filing system, not boundaries.** A file can use anything declared in any other file – 117 of the 126 files sit in one dependency loop. Shared helpers still sit in whichever section first needed them: for example `loadJsPdf` is in `safety/site-inductions.js`, and `BRGB` and `pdfLogo` are in `photos/photos.js`. Search `src/app/` for a name rather than guessing from the folder.
- **Feature modules**: eleven newer features are self-contained IIFEs that expose a few functions – `DWS`, `LEADS`, `WTN`, `SENDTO`, `SIGNIN`, `SIGNSHEET`, `CUT`, `SUBAG`, `SAMPLES`, `CJOBS`, `QRSITE`. Everything else is top-level functions in the shared scope.
- `docs/FEATURES.md` maps tabs to the function or module that draws them.

## Build
`scripts/bundle.mjs` is the one place that knows how the app is assembled; `build.mjs`, `dev.mjs` and `split.mjs` all use it.

```
src/app/manifest.txt ─► read each listed file, in order
                        └─ each must parse on its own (an error names the file)
                     ─► "(function(){" + file 1 + file 2 + … + "})();"
                        └─ the whole must parse (catches a name declared in two files)
src/shell.html       ─► shell + <script> + that + </script>  =  dist/index.html
```

- The build refuses to run if the manifest lists a file that is missing, lists one twice, or if a `.js` file under `src/app/` is not in the manifest (so code cannot be left out by accident).
- `dist/index.html` is the single file that gets published; the platform wraps it in its own `<html>` skeleton. `npm run dev` serves the same assembly with the tests' fake backend.
- **How the split was verified**: cutting `app.js` at its existing banners gave a build byte-for-byte identical to the one before (same SHA-256). Three banner comments were then added so that helpers, boot, planning leads and deleted items each have their own file; with banner lines ignored the build is still identical to the original.
- `scripts/split.mjs <page or script>` is the reverse: it cuts an assembled app back into these files by matching banners. It is how a version published to the artifact from somewhere else is merged (`docs/PLATFORM.md` › Publishing).

## Structure checks
`scripts/modules.mjs` parses every file (acorn + eslint-scope, dev dependencies) and fails `npm test` if:
- a name is declared at the top level of two files (for functions the later one would silently win);
- a name is used that is declared nowhere in `src/app/` and is not a browser or CDN-library global;
- a file uses another file's `const`/`let` while the page loads, and that file comes later in the manifest;
- `docs/MODULES.md` is not what the script would generate now.

`npm run build` and `npm run dev` do not need these dependencies.

## Load order
The files share **one function scope**, exactly as when they were one file. That has three consequences, and they are the only rules about order:
1. **Functions declared with `function` can be called from any file**, earlier or later – the declaration is hoisted to the top of the shared scope.
2. **`const` and `let` only exist once their file has run.** Code inside a function that runs later (a tap, a render) can use anything. Code that runs *while the page loads* can only use `const`/`let` from files earlier in the manifest. About 40 statements run at load, in 14 files: event wiring on the static shell (`core/tabs-week.js`, `core/sheet.js`, `core/viewer.js`, `chat/chat.js`, `files/in-app-files.js`…), document-level click handlers, timers, and every `const NAME=(()=>{…})()` module body.
3. **`core/boot.js` and `core/back-button.js` stay last.** Boot starts the app; by then everything must be declared.

One more thing depends on order: `core/tabs-week.js` wraps `render` once at load (`const _render0=render;render=function(){…}`) to enhance photo grids after each draw. There is one `render`; this is its only wrapper.

So: **a new file goes immediately before `core/boot.js` in the manifest** unless there is a reason to put it elsewhere, and existing lines are not reordered.

## What the split did not change
The coupling is exactly what it was: about 1,500 names in one scope, one state object `S` with ~96 properties, and `render()` called from ~390 places. Splitting made the code findable and reviewable; it did not create boundaries. Real modules (explicit imports, a tab registry instead of load-time wiring, a bundler) are planned for after the claude.ai artifact is frozen – `docs/ROADMAP.md` Phase 3 – because until then a version published from the artifact has to be mergeable back as plain text.

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
