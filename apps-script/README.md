# QR site sign-in (Google Apps Script)

Public page for visitors/other firms: scan the site's QR poster → first-time induction → sign in with name, company, mobile → scan again to sign out. Records live in a Google Sheet owned by James. SiteHQ sends each site's induction here (`?setup=<base64url json>&key=…`) and imports records (`?export=1&key=…&since=…`, copy/paste into Sign-in book › Import QR sign-ins).

Setup (James's Google account): new Sheet → Extensions › Apps Script → paste `Code.gs`, add HTML file `Page` with `Page.html` → run `setup` (creates sheets, hourly auto-sign-out trigger, prints the admin key) → Deploy › Web app (execute as Me, access Anyone) → paste URL + key into SiteHQ › Setup › 📱 QR site sign-in.

Test without Google: `node mock_test.js` (mocks SpreadsheetApp etc.).

In production (ROADMAP Phase 1) this should become a public route on our own backend writing straight into `signins`.
