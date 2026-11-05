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
- Styling: half the CSS (66 KB) is still one `shared.css`, because about 400 feature rules have to keep their place ahead of later shared rules; ~890 inline `style="…"` attributes remain in the HTML templates, 46 of them with a hard-coded colour (`white`, `#fff`, `#000`…) rather than a variable – possible dark-mode bugs, not yet checked (`docs/ARCHITECTURE.md` › Styling).
- `todos` is a schemaless catch-all keyed by `kind`; `signoffs` subcollection likewise by `type`.
- Some older features predate the IIFE module pattern and share globals.
- Tests run against a fake backend that doesn't enforce rules; ~50 feature scripts are kept (older ones dropped), they print results rather than assert in a framework, and they are not part of `npm test`.
- The feature scripts reach into the app by replacing exact source text in the built page (nine anchors such as `function render() {`). A replace that stops matching does nothing, so a script can silently stop testing what it claims to (`CLAUDE.md` › Gotchas).
- Four feature scripts exit with an error on the original v323 build and still do: `h38`, `h385`, `h39`, `h40`. `h384` has a race after a tab click (its output depends on timing, not on the app). `h383` logs a page error (`Cannot read properties of null (reading 'contains')`) about half the time since the code was formatted: it loads a second page into the same tab, and a timer from the first page calls `render()` before the new page's markup exists. The formatted script parses a little slower, which widens that gap. It cannot happen outside a test that reuses a tab.
- The published page grew when the code was formatted: 2.25 MB → 2.90 MB, or 674 KB → 758 KB gzipped (+12%), and the script takes 10–18% longer to parse and run (about +0.07 s with the CPU slowed 4×, +0.1 s slowed 6×). Minifying at build time would undo both, but the build must keep the source text until the artifact is frozen (`docs/ARCHITECTURE.md` › Build).

## Product open items (from James)
- Permit numbers for EMS and Stuart Partners waste transfer sites (Setup › Waste transfer sites).
- Microsoft 365 connector was being connected.
- QR site sign-in: needs James's Google Sheet + script deployed (instructions in-app, Setup › 📱 QR site sign-in; files in `apps-script/`). Tested only against a mock spreadsheet.
- Trades' tab is still "Jobs & to-dos" (owner's was renamed "Forms") – undecided.
- Some supplier details unconfirmed online (Royale/MB Frames contact, Ryterna phone, Cortizo from a directory).

## Data quality
- Some contact details in the live data have typos; check emails before inviting people to the new system.
