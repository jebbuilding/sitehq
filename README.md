# SiteHQ

Job-management app for **JEB Building Services** (a small building firm in Exmouth, Devon). One app, three kinds of user:

- **Owner (James)** – clients & enquiries, sites, planner, timesheets & day work, site sign-in book, health & safety (inductions, RAMS, CDM docs), merchants & suppliers, door & window survey, waste transfer notes, sign-off sheets, samples, subcontractor agreements, PDFs for nearly everything.
- **Trades** (employees / subcontractors) – timesheets, day work, jobs & to-dos, site documents, photos, receipts, invoices, training, chat, sign-in.
- **Clients** – a portal: their documents, sign-offs, photos, messages, shared job calendar.

> **Status (Nov 2026):** live as a **claude.ai Artifact** (published ~320 times, built conversationally with Claude). This repo is the first time the code has lived outside that platform. The next step is to run it on our own hosting – see [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Quick start

```bash
npm install                 # playwright (tests only – the app itself has no dependencies)
npx playwright install chromium   # if you don't already have a Chromium for Playwright
npm run vendor              # fetch the exact CDN library versions the app uses, for offline tests
npm test                    # build + flows suite + crawl every tab as owner / trade / client
```

Expected output: `flows: 35 passed, 0 failed` and `ERRORS (0)` for each of the three crawls.

Use it in a browser: `npm run dev` → `http://localhost:4321/owner`, `/trade` or `/client` (`/trade?onboarding` shows the "fill in your details" gate). This serves `src/` wrapped in the tests' fake backend and seed data, re-read on every request – edit, then reload. The data lives in the page: a reload resets it, tabs don't share it, and no access rules are enforced, so it is for UI work, not for checking permissions. Uploads are held in the server's memory, downloads save for real, and the company logo is a grey block (the real one exists only on the live artifact). Needs no `npm install`, but does need a connection for the CDN libraries (PDFs, spreadsheets) and fonts. `HOST=0.0.0.0 npm run dev` lets an iPad on the same network open it.

Build only: `npm run build` → `dist/index.html` (this is exactly the file that gets published).

Run one feature test: `cd tests && node features/h412.js`.

## Layout

```
src/shell.html        static HTML (header, tab bar, sheets, viewers) – everything before the <script>
src/styles/           the stylesheet: base.css, shared.css and one file per folder of src/app/; index.css lists them in order and the build inlines them into the page
src/app/              the whole application (~13k lines, vanilla JS, no framework): ES modules, one per section, in folders by area
src/app/core/boot.js  the entry point: the only file that runs anything at load
scripts/bundle.mjs    joins the modules into the one app script, in the order their imports imply (used by build, dev and split)
scripts/build.mjs     shell + app → dist/index.html (+ syntax check); copies to tests/timesheets.html
scripts/analyze.mjs   parses src/app/ (acorn + eslint-scope): what each file declares and uses
scripts/modules.mjs   writes each file's import/export block and docs/MODULES.md, runs the structure checks (`npm run modules`; `npm run check` only verifies)
.prettierrc.json      formatting for src/app/ only (`npm run format` = Prettier + modules)
scripts/split.mjs     the reverse: cuts a built or published page back into src/app/ (for merging artifact-side versions)
scripts/dev.mjs       local dev server: src/ + the tests' fake backend, at localhost:4321/owner|trade|client
scripts/vendor.sh     npm-packs jsPDF, pdf.js, SheetJS, mammoth, qrcode-generator into tests/ for offline tests
scripts/test.sh       build + core suite
tests/harness8src.js  fake platform: in-memory db (Firestore-like), assets, user, downloads
tests/crawl.js        seeds data, opens the app as owner|trade|client, clicks every tab/button, counts JS errors
tests/flows.js        cross-role end-to-end flows (owner sends → trade sees, etc.)
tests/features/*.js   per-feature Playwright scripts written while building each feature (h37x–h414)
tests/fixtures/       synthetic images/PDFs used by tests (no real data)
apps-script/          Google Apps Script for the public QR site sign-in page (+ a mock test)
platform/capabilities.json   the database access rules + capabilities declared on the claude.ai artifact
platform/types/       the claude.ai artifact runtime type definitions (contract 0.2.90) the app is written against
infra/                AWS CDK app for our own hosting (dev and prod from one config) + its tests: `npm run test:infra`; guide in infra/README.md – not deployed yet
.github/              CI (tests + infra checks, deploys main to dev), the manual "promote" to production, CODEOWNERS
docs/                 architecture, data model, platform notes, roadmap, known issues, privacy
CLAUDE.md             working instructions for Claude Code in this repo
```

## Documentation

| Doc | What's in it |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | How to work on this code (conventions, workflow, rules that must not be broken) |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the app is built and how it runs |
| [`docs/MODULES.md`](docs/MODULES.md) | Generated: what every file declares, what uses it, what it depends on |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Collections, document kinds, access rules |
| [`docs/PLATFORM.md`](docs/PLATFORM.md) | The claude.ai Artifact runtime: capabilities, publishing, sharing, limits, the Nov 2026 "Forbidden" incident |
| [`docs/FEATURES.md`](docs/FEATURES.md) | Feature inventory by role and where it lives in the code |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Productionisation plan (own hosting, adapter, data migration) |
| [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) | Debt, risks and open items |
| [`docs/SECURITY_PRIVACY.md`](docs/SECURITY_PRIVACY.md) | Personal data held, protections, GDPR gaps |

## Data

**No real data is in this repo, and none must ever be committed.** The live database holds employees' NI numbers, medical notes, next-of-kin, client names/addresses and more. Exports go to an encrypted archive held by James (see `docs/ROADMAP.md` › Data export).
