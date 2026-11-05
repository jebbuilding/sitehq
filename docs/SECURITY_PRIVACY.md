# Security & privacy

## Personal data held (live system)
- **Employees/subcontractors**: full name, address, DOB, mobile, email, **National Insurance number**, UTR, **medical information**, next of kin (name, phone, address), driving status, CSCS, photos, timesheets, pay-related data, personal documents (licences, contracts, subcontractor agreements), signatures.
- **Clients**: names, addresses, phone/email, property details, **key-safe and alarm codes**, photos of their homes, documents, sign-offs and signatures, GDPR consent records.
- **Visitors** (sign-in book / QR): name, company, mobile, times on site, induction acknowledgements.
- **Planning leads**: applicant names/addresses from public planning registers; a letter template naming an addressee.

This is special-category data in places (health) – treat the whole dataset as sensitive.

## Rules for developers
- Never commit data, exports, screenshots of the live app, or `template.json` to git.
- Use synthetic data in tests (see `tests/harness8src.js`, `tests/crawl.js` seeds).
- Never share a Claude chat/session that has been used with live data – it contains that data. (This happened once: see `docs/PLATFORM.md`.)
- Secrets (API keys, Apps Script admin key, AWS credentials) go in environment/secret managers, never in the repo. GitHub deploys to AWS through short-lived roles, not stored keys.

## In-app protections (today)
- Path-level access rules (`platform/capabilities.json`); owner-only collections for everything private.
- Owner PIN (hashed) for destructive/unlocking actions; tamper-evident hash-chained deletion record; 30-day deleted-items bin.
- Signed sign-offs and waste transfer notes locked.
- Trades see only their own records plus what the owner explicitly shares; clients see only their own portal.
- GDPR consent flow for clients; privacy notice for staff.

## Gaps to close before go-live (see ROADMAP Phase 1 › GDPR decisions)
DPIA; retention schedule and automated deletion; subject-access export; encryption or isolation of NI/medical/key codes; server-side enforcement of owner-only operations; access logging; backups with tested restore; processor agreements.
