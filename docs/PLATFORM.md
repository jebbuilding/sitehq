# Current platform: claude.ai Artifact

- Live version 340 (9 Nov 2026, from commit db9262e). Live URL: `https://claude.ai/artifact/FjLkyzz3jsxrGeowjY2fmh` (also reachable as `claude.ai/code/artifact/77495b28-024d-4d88-a9dc-16dc78e93450`). Owner: James's claude.ai account.
- Runtime contract **0.2.90** (pinned; newer exist). Type definitions in `platform/types/`.
- Capabilities: `assets`, `db` (25 rules – `platform/capabilities.json`), `downloads`, `sample`, `user` (`scopes:["profile"]`).

## Publishing (until cutover)
Publishing is done from a Claude session with the Artifact tool:
1. `npm run build`
2. Publish `dist/index.html` to the artifact URL above **without** a `capabilities` argument (the stored declaration carries forward). Passing a non-empty `capabilities` object replaces the whole declaration – if rules must change, pass the full contents of `platform/capabilities.json` (edited) and commit the change here.
3. If the publish is refused because a newer version is live (another session published), merge that version's changes into `src/` first, then publish: save the live page to a file, run `node scripts/split.mjs <that file>` (it cuts the page's script back into `src/app/`, and its stylesheet back into `src/styles/`, by their banners), then `npm run modules` (brings the import/export blocks up to date) and review `git diff`; the markup in `src/shell.html` is merged by hand. This only works on versions that descend from a build of this repo made after the November 2026 split – v323 and earlier have code before the first banner and no banner on boot, and `split.mjs` stops with an error on them.

## Sharing & access (important)
- Trades and clients need a **claude.ai account** and must be **invited to the artifact** (artifact's own Share menu, not a chat's "Share session"), with an access level that can write (**Can edit**; asset uploads are editor-only on this platform). Access is per email; signing in with a different email gives "Forbidden" or a blank new profile.
- Data is keyed by the platform user id, so re-inviting the same account restores the person's profile.
- Claude blocks invitees (owner still works) when an **uploaded file is still being checked / failed the check**, or when the artifact **connects to other websites**. The Share menu says when this applies.
- Sharing settings can only be changed on claude.ai web or desktop, not the mobile apps.

### Incident, 5 Nov 2026 – trades got "Forbidden"
- Trades had been reaching the app **through a shared chat session** (which also exposed the whole build conversation, including personal data). Making the session private cut that route.
- Same morning: a site front photo was uploaded at 07:29 and an embedded Google Apps Script source was added to the page; both were removed as precautions (v320). Root cause not confirmed at time of writing; resolution path = invite each trade to the artifact itself.
- Lesson: never share the build chat; production needs our own auth.

## Platform limits & behaviours to remember
- 25k documents, 1 GB assets, 5,000 asset files; uploads ≤ 20 MiB.
- `db` returns `null` when signed out; reads that rules refuse come back empty, writes reject.
- `onSnapshot` is live across devices; no server-side code at all (no triggers, no cron) – owner-device fan-out and Claude scheduled tasks fill that gap.
- `sample` (calling Claude) works only for the owner's org; outside invitees can't use Claude features.
- External links open in a new tab. Assume the page cannot `fetch` other websites (sandbox/CSP) – it only loads scripts from cdnjs. Making it "connect to other websites" also blocks invitees (above).
