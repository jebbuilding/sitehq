# Known issues, debt & open items

## Platform / access
- **Trades getting "Forbidden" (5 Nov 2026)** – see `docs/PLATFORM.md` › Incident. Resolution: invite each trade to the artifact itself (Can edit) and use the artifact URL; never the chat link. Unconfirmed whether the 07:29 upload or the embedded script contributed.
- Everyone needs a claude.ai account; the app's identity is the platform's. Fixed by Phase 1.
- No server-side code: owner-device fan-out means shared copies (merchants, suppliers, site jobs) only update when James has the app open.

## Security model
- Rules are path-level. Much owner-only behaviour (who sees which merchant, locking signed docs, PIN) is enforced in client code; a determined trade with dev tools could write odd data into their **own** area but cannot read owner-private collections.
- Owner PIN hash lives in the owner's private `data/users/<id>/pin`; verification is client-side.
- Key-safe and alarm codes are stored in client records (owner-only, but plaintext).

## Code
- The app is 2.1 MB of JavaScript, now ~130 ES modules under `src/app/` with explicit imports, but still tightly coupled: 116 files import each other in one loop, around one state object `S` (`docs/ARCHITECTURE.md` › What is still coupled). No types; HTML built with string templates (`esc()` must be used on all user data – audit when touching code).
- The published script is joined in sloppy mode, as it always was; the modules have not been run in strict mode (which a real bundler's ES-module output or native modules would use). esbuild accepts them, but strict-only runtime differences are untested.
- `BROCH` in `survey/door-window-survey.js` (the brochure list) has the key `other` twice; the later entry ("Other makers", with links) wins and the first ("Other makers / my own", empty) is dead. esbuild flags it; behaviour unchanged since before the split.
- Shared helpers live in whichever section first needed them (e.g. `loadJsPdf` in `safety/site-inductions.js`, `BRGB`/`pdfLogo` in `photos/photos.js`). File names follow the banners, which were not checked against every line of content.
- `todos` is a schemaless catch-all keyed by `kind`; `signoffs` subcollection likewise by `type`.
- Some older features predate the IIFE module pattern and share globals.
- Tests run against a fake backend that doesn't enforce rules; ~50 feature scripts are kept (older ones dropped), they print results rather than assert in a framework.

## Product open items (from James)
- Permit numbers for EMS and Stuart Partners waste transfer sites (Setup › Waste transfer sites).
- Microsoft 365 connector was being connected.
- QR site sign-in: needs James's Google Sheet + script deployed (instructions in-app, Setup › 📱 QR site sign-in; files in `apps-script/`). Tested only against a mock spreadsheet.
- Trades' tab is still "Jobs & to-dos" (owner's was renamed "Forms") – undecided.
- Some supplier details unconfirmed online (Royale/MB Frames contact, Ryterna phone, Cortizo from a directory).

## Data quality
- Some contact details in the live data have typos; check emails before inviting people to the new system.
