# Roadmap: productionising SiteHQ

Goal: run the **existing code base** on our own hosting with our own database and logins, with minimal UI change, then harden and modernise incrementally. Agreed principles (Jasper + James, Nov 2026):
1. Repo is the source of truth (this repo).
2. Keep the app working as-is; swap the platform underneath it via an **adapter**.
3. No real data in git; data moves via encrypted export/import.
4. Freeze the claude.ai artifact at cutover (read-only) to avoid split-brain.

## Phase 0 – repo & backup (now)
- [x] Code, tests, platform rules, Apps Script, docs in this repo.
- [ ] James creates the GitHub repo (private); push; Jasper clones locally in Claude Code.
- [ ] CI: GitHub Actions running `npm run vendor && npm test` (Playwright Chromium) on every push.
- [ ] **Data export** (owner-run, from a Claude session with access to the artifact): every collection (incl. per-user subcollections under `sheets/*` and `portal/*`, owner's `data/users/<id>/…`) to JSON + every asset (`/_blob/<id>`) to files + `template.json`. Store as an encrypted archive held by James (e.g. 7z/age with a passphrase), not in GitHub.

## Phase 1 – lift & shift behind an adapter
**Recommended backend: Firebase** (Hosting + Firestore + Auth + Cloud Storage + Cloud Functions), because the app already speaks Firestore's API shape:

| App expects (`window.claude.use`) | Firebase implementation |
|---|---|
| `db.doc(p).get/set/update/delete/onSnapshot`, `db.collection(p).where/orderBy/limit/get/onSnapshot/add` | Firestore web SDK – near 1:1 (map `update` merge semantics, `{__delete__:true}` → `deleteField()`) |
| path rules (`platform/capabilities.json`) | Firestore security rules with custom claims `role: owner|trade|client` (`{self}` → `request.auth.uid`) |
| `assets.upload/list/delete`, `/_blob/<id>` URLs, `blobUrl(id)` | Cloud Storage `assets/<id>`; `blobUrl` → signed/download URL (keep ids stable) |
| `user.id/isOwner/canEdit/profiles/me` | Firebase Auth (email link / password) + claims; profiles from `sheets/{uid}` |
| `downloads.save({filename,data})` | plain `<a download>` / Web Share API |
| `sample(input,opts)` (Ask Claude, sketch reading) | Cloud Function proxy to the Anthropic API (key server-side, per-user rate limit) |
| owner-device fan-out (supplier/maker copies, site-job copies, prompts) | Firestore-triggered Cloud Functions (or keep client fan-out initially) |
| Claude scheduled task (planning leads) | Cloud Scheduler + Function |
| Google Apps Script QR sign-in | public route + Function writing straight to `signins` (no copy/paste import) |

Steps:
1. `src/platform/firebase-adapter.js` exposing `window.claude = { use(name) }` with the same shapes as `platform/types/*.d.ts` (only the members the app uses). Build twice: `dist/claude/` (as today) and `dist/web/` (adapter injected).
2. Auth UI: sign-in screen (email link). Map existing platform user ids → new Firebase uids at import (`sheets/{oldId}` → `sheets/{newUid}`, and every reference: `who`, `people[]`, `portalUid`, chat members, `by`, `owner` fields…). Write and test an id-remap script against the export.
3. Port rules; write rules tests (Firebase emulator) mirroring the matrix in `docs/DATA_MODEL.md`.
4. Point the existing Playwright suite at the adapter + Firebase emulator (replace `harness8src.js` fake with the emulator) – the UI tests should pass unchanged.
5. Staging project with anonymised data → James + one trade test on real devices (iPad Safari, Android Chrome).
6. Cutover: freeze artifact (publish a read-only banner), final export, import, invite trades/clients by email, PWA "Add to home screen".

Alternatives considered: **AWS** (S3+CloudFront hosting is fine, but DynamoDB/AppSync is a poor fit for path rules + live snapshots → much more adapter code); **Supabase** (Postgres + realtime + auth + storage; better for reporting/invoicing later, but document→jsonb mapping and rules→RLS is more up-front work). S3 alone only hosts the static page – it doesn't answer where the database, auth and files live.

## Phase 2 – harden
- Sensitive fields (NI, medical, next of kin, key-safe/alarm codes) → restricted subcollection or field-level encryption; minimise who/what reads them.
- GDPR: DPIA, privacy notice (exists in-app), retention & erasure jobs, subject-access export, processor terms (Firebase/Google, Anthropic).
- Backups (scheduled Firestore export + Storage versioning), monitoring (Sentry), uptime alerts, audit log server-side.
- Move business rules that matter for security server-side (locking signed docs, PIN-protected deletes, owner-only operations).
- Replace the catch-all `todos` with proper collections (`clients`, `suppliers`, `surveys`, `wtns`, …) via migration.

## Phase 3 – modernise (only where it pays)
- [x] Cut `app.js` into files along the existing banners (`src/app/`, Nov 2026) – same script once joined, no behaviour change.
- [x] Make them real ES modules (Nov 2026): generated imports/exports, one entry point (`core/boot.js`), no work at load outside it, order derived from imports, checked against esbuild on every test run.
- After the artifact is frozen: replace `scripts/bundle.mjs` with esbuild/Vite (small change – the modules are already valid), then consider strict mode and lazy-loading the drawing tools.
- Decoupling features from each other is separate, larger work with no mechanical route (`docs/ARCHITECTURE.md` › What is still coupled); do it per feature when there is a reason. Add JSDoc types / `// @ts-check` before any framework.
- Component framework screen-by-screen if desired (Svelte/React) behind the same `S`/`render()` contract; don't big-bang rewrite – the tests encode the behaviour.
- Native wrapper (Capacitor) for App Store/Play only if push notifications / camera integration justify it. Most updates still ship as web content.
- Multi-tenant (company id on every document) only if SiteHQ is to be sold to other firms.
