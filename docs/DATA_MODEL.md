# Data model

Document store with Firestore-shaped paths (odd segments = collection, even = document). Live counts (Nov 2026): ~660 documents, ~140 asset files (~176 MB). Limits on the current platform: 25,000 documents, 1 GB assets.

## Access rules (`platform/capabilities.json`)
Levels: `view` < `interact` < `admin` < `owner`. `{self}` = the signed-in user's id.

| Path | Read | Write | Notes |
|---|---|---|---|
| `sheets` | owner | owner | all people's profiles (owner sees everyone) |
| `sheets/{self}` | interact | interact | a person's own profile + subcollections |
| `sites`, `equipment`, `docs`, `inductions`, `settings`, `wfiles` | view | owner | shared reference data |
| `wfiles/{self}` | view | interact | |
| `jobs`, `talks`, `plan`, `sphotos` | interact | owner | |
| `sphotos/{self}` | interact | interact | site photos by a trade |
| `jobdone`, `chats`, `msgs` | interact | interact | |
| `planprivate`, `visitinds`, `offapp`, `todos`, `portal` | owner | owner | owner-private |
| `portal/{self}` | interact | interact | a client's own portal area |
| `data/users/{uid}/…` | private to that user | | platform-enforced per-user area (owner PIN hash, planning leads) |

## People: `sheets/{uid}`
Profile: `name`, `joined`, `role` (`employed`/`sub`/…), `details` {fullName, address, postcode, dob, mobile, email, ni, utr, empType (`employed`/`cis`/`selfemp`), trade, company, driving, medical, cscs, nok*}, `photo` (asset id), `reads` (chat read markers), `day` (today's plan), flags (`foreman`, `signOnly`, `left`…).

Subcollections (`TR_COLLS`): 
- `entries` – timesheet/day-work entries
- `checks` – reports (vehicle checks, accidents, near misses, inspections…)
- `photos` – photos, drawings/sketches (`kind:"sketch"`, `signSheet` for go-ahead sheets)
- `invoices` – invoices, receipts, materials (by `kind`)
- `signoffs` – mixed bag keyed by `type`: `prompt` (reminders/"James sent you"), `persdoc` (personal documents incl. contracts & subcontractor agreements), `supplier` copies, `makercopy` (shared suppliers+brochures), `sitejob`, leave/holiday, policy reads, inductions done…
- `signins` – site sign-in book (owner's own collection also holds visitor/guest and QR-imported sign-ins with a `guest` object)

## Owner-private: `todos/{id}` (discriminated by `kind`)
| kind | What |
|---|---|
| *(none, has `text`)* | owner to-do items |
| `client` | client record: contact, address, property, stage (`enquiry`…`done`/`lost`/`contact`=address book only), current enquiry fields (work, desc, budget, quote, timescale, planning, source, site), `notes[]`, `media[]`, `docs[]`, `pastJobs[]`, portal link (`portalUid`, `ptDocs`/`ptSigns` before linking), keys/alarm codes |
| `supplier` | merchant (account no., branches, opening hours, `vis`/`people` who can see it) |
| `maker` | manufacturer/supplier details (key matches built-in list or `mk-…`), `vis`/`people` |
| `brochure` | brochure file for a maker (`maker`, `assetId`) |
| `winsurvey` | door & window survey (`job`, `items[]` openings, `clientId`, `site`, `lastPdf`) |
| `wsdesign` | a design read from a hand drawing |
| `wtn` | waste transfer note (sections A–D, signatures, lock) |
| `clip` | cut-out image (`assetId`, `from`, `page`, optional `client`) |
| `gosheet` | sign-off / go-ahead sheet not attached to a drawing |
| `sample` | sample library item with `out` (current loan) and `log[]` |
| `sitejob` | job details for trades on a site |
| `dwrates`, `dwline` | day-work rates and lines |
| `cdm` | CDM 2015 documents |
| `nptpl` | notebook page templates |
| `qrcfg`, `qrsite` | QR sign-in config (web-app URL + key) and per-site state |
| `audit` | tamper-evident deletion record (hash-chained) |
| `bin` | deleted items (30-day bin) |
| `seen` | "what's new" markers |
| `sitedoc` | owner-private site documents |
| `training` | owner training records |

## Shared collections
- `sites/{id}` – name (address), client, project type, `frontPhoto`, archived/storage flags, job summary.
- `docs/{id}` – site documents (`site`, `cat`, `title`, `assetId`, `who` visibility, folder).
- `inductions/{id}` – per-site induction (`site`, `details{}`, `items[]`, `version`, `redo`).
- `equipment`, `talks` (toolbox talks), `jobs` / `jobdone` (job sheets & completion), `plan` (planner items) / `planprivate`, `chats` / `msgs`, `sphotos` (site photos), `wfiles`.
- `settings/app` – company details, people list, waste carrier, waste sites, brand; `settings/matcalc`; `settings/weather`.
- `portal/{clientUid}` (+ `docs`, `signs`, uploads) – client portal.
- `visitinds` – visitor inductions done on the owner's device; `offapp` – people not on the app.

## Assets
Uploaded via `assets.upload(blob)` → `{id,url}`; referenced by id in documents; served at `/_blob/<id>`. Includes photos, PDFs, signatures (some signatures are data-URLs inline in documents), the company logo, brochures.

## Published files
Besides `index.html`, the artifact publishes `template.json` (a Word letter template for planning-lead letters; **contains a real addressee – not in this repo**; export with the data).
