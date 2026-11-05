# Architecture

## In one paragraph
A single-page app written in **vanilla JavaScript** with **no framework and no build step**: `src/shell.html` (CSS + static skeleton) and `src/app.js` (all logic, ~13k lines / 2.1 MB). It renders by writing template-literal HTML into `#main` and wiring event handlers afterwards. All persistence, files and identity come from the host platform through `window.claude.use(...)` (today: claude.ai Artifacts). Third-party libraries are loaded lazily from cdnjs at pinned versions only when a feature needs them.

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
The **only place the platform is acquired is the boot IIFE at the end of `app.js`** (`const use=n=>window.claude.use(n)...; const [db,user,assets,dl]=await Promise.all(...)`), plus `AI.sample` in the "Ask Claude" helper. That boot block is the seam for the production adapter (`docs/ROADMAP.md`).

Boot sequence (end of `app.js`):
1. Acquire `db`, `user`, `assets`, `downloads`. If no db/user → "Sign in to use the app".
2. Wrap them (`wrapDb` – routes owner deletes to the bin; `wrapAssets`; `S.dl` adds a Print bar after any PDF save).
3. Open IndexedDB: `jeb-files` (in-app file cache) and `jeb-outbox` (offline write queue), flush the outbox.
4. `S.owner = await user.isOwner()`.
5. Subscribe (`onSnapshot`) to shared collections (`sites`, `equipment`, `docs`, `chats`, `settings/*`, `plan`, …) and, for the owner, private ones (`todos` → clients, suppliers, surveys, WTNs, samples, …; `offapp`; `visitinds`; every trade's `sheets/{id}/…` via the TR loader).
6. Each snapshot updates `S.*` and calls `render()`.

## Code structure (`src/app.js`)
Roughly in file order, delimited by `/* ================= NAME ... */` banners:
- **Core**: helpers (`$`, `esc`, `iso`, dates), `store` (localStorage wrapper), `S` (state), generic form fields, tabs & week bar, `openSheet`/`openViewer`, file upload/view (`uploadFile`, `blobUrl`, `openFile` + pdf.js viewer), offline outbox (`submitJob`).
- **Trade features**: timesheets (+ paper-style monthly sheet), checks/reports, photos, invoices, receipts & materials, personal details & documents, training & toolbox talks, chat (groups, DMs, calls), planner & time off, sites (plans, RAMS, specs, induction), drawings.
- **Owner features**: owner tabs, site project pages, reports, people/employees, clients (stages, quick enquiry, address book & job history, GDPR consent), client portal (docs, signs, uploads, calendar), planner board, day work (xlsx export), H&S (accidents, RAMS maker, CDM 2015 docs), policies & insurance, company details, PIN, audit chain, deleted items, backup, leavers.
- **Drawing tools**: notebook page (OneNote-style), walls/symbols/timber/construction details, DXF export, scale ruler, photo mark-up.
- **Calculators**: area/volume/materials/roofing/falls/stairs/plasterboard/timber/aggregates/heating BTU.
- **Feature modules (IIFEs, newer code, before `const BIN_DAYS=30;`)**:
  `DWS` door & window survey · `LEADS` planning leads · `WTN` waste transfer notes · `SENDTO` send any file · `SIGNIN` site sign-in book · `SIGNSHEET` sign-off / go-ahead sheets · `CUT` cut-outs from PDFs/photos · `SUBAG` subcontractor agreement · `SAMPLES` samples library & book-out · `CJOBS` address-book job history · `QRSITE` QR site sign-in · plus top-level helpers for suppliers/makers (`makersAll`, `makerCard`, `whoSeesDlg`, `syncMakers`).
- **Boot** (last ~60 lines).

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
