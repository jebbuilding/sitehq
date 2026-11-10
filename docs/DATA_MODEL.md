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
| `webenq`, `webstats` | owner | owner | owner-private; written by the public website through `/api/public/*` (server): an enquiry, and a day's counts (views, visits, enquiries, pages, refs, dev, entry pages, places, and time on each page: secs, secsN, visitSecs) |
| `portal/{self}` | interact | interact | a client's own portal area |
| `data/users/{uid}/…` | private to that user | | platform-enforced per-user area (owner PIN hash, planning leads) |

On our own backend the same file is enforced by `server/core/rules.mjs`, with owner / trade / client taken from the sign-in. `server/test/rules.test.mjs` checks this table row by row (and fails if the file and the table drift apart). Two things are stricter there than on claude.ai – a client can reach only `portal/{self}`, and a path no rule covers is owner-only – see `server/README.md` › Rules for those and the other assumptions.

## People: `sheets/{uid}`
Profile: `name`, `joined`, `role` (`employed`/`sub`/…), `details` {fullName, address, postcode, dob, mobile, email, ni, utr, empType (`employed`/`cis`/`selfemp`), trade, company, driving, medical, cscs, nok*}, `photo` (asset id), `reads` (chat read markers), `day` (today's plan), flags (`foreman`, `signOnly`, `left`…).

Subcollections (`TR_COLLS`): 
- `entries` – timesheet/day-work entries (an hours entry from checking in keeps `actualIn` / `actualOut`; overtime asked for is `ot`: { early, late (minutes), why, status asked | ok | no } – approving moves `start` / `finish` to the actual times)
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
| `wagecalc` | a wage calculation for a person or role (salary, van, pensions, holiday, hours, charge-out rate, optional tax-rate overrides) |
| `bizcosts` | the one business costings record (`todos/bizcosts`): overheads, people from the wage calculator, James's pay and hours, profit %, materials markup |
| `sale` | an estimate or invoice to a client (`todos/sd-*`): type, number, date, client and address, Re:, wording, lines (description, amount, or qty × unit × rate; VAT code S20/R5/Z0/RC20/RC5/EX/NV; labour, materials or other), prices typed with or without VAT, retention %, works included/excluded, CIS rate and reverse charge on invoices, status, payments, the estimate an invoice came from (`fromId`), emails sent (`emails`: when, to whom, files attached); estimates: version (`ver`) and earlier versions (`versions`: number, date, total, the wording and lines as they were); invoices: type (`ik`: oneoff, proforma, deposit, stage, extra, final), extra work held for the final invoice (`af`, `inFinal`), a pro forma's purpose (`pfFor`) and the invoice it became (`convId` / `fromPf`); sections (lines with `h`) can carry a work list (`w`) and a price; estimate project duration (`dur`); a client sign-off request (`signReq`) and who accepted it (`acceptedBy`, `acceptedAt`); payments note when a receipt was sent (`receiptAt`) |
| `salesset` | the one estimates & invoices settings record (`todos/salesset`): next numbers, payment and validity days, letterhead (lines, logo, foot line), signature, VAT registered, number and usual code, bank details, standard wording (opening, cost note, closing, sign-off, list headings), terms and conditions (with # / ## / - marks), email wording for each kind (`mailT`) |
| `cissubs` | the one CIS record (`todos/cissubs`): every CIS subcontractor (`subs`, keyed by app id or `sub-*` for those added by hand: name, trading name, business type, UTR, NI or company number, rate, verification number and date, contact, VAT, insurance), James's employer and Accounts Office references and UTR, yearly statements sent (`yearSent`) |
| `cismonth` | a CIS tax month (`todos/cis-YYYY-MM`, named by the month it ends on the 5th): VAT and materials per paid invoice, payments added by hand as bills (`extra`: who, date, due, reference, site, lines with account and tax rate, status draft/approved/paid, date paid, and the labour/materials/VAT totals), when the return was filed (and nil), tax paid to HMRC (`hmrcPaid`), when each person was sent their statement (`stmtSent`); statements go to `sheets/{uid}/signoffs/pd-cis*` as a personal document (kind `cis`) |
| `acct` | the one Accounts record (`todos/acct`): bank accounts (name, bank, last 4 digits, opening balance – no passwords or full numbers), statement balances that agreed (`checks`) and sorting rules (words → category, VAT %) |
| `acctx` | a month of one bank account's payments (`todos/atx-{account}-{YYYY-MM}`): date, description, amount (+ in, − out), balance, category, VAT, note, the invoice it was matched to, the job it was for (`site`, counted in Job costs), ticked off against the statement (`ok`), split into parts (`split`: category, amount, VAT each), sorted by what was done before (`learned`), a transfer linked to its other half (`link.t` "xfer"); the month can be `locked` once it agreed with the statement |
| `acrcpt` | a receipt (`todos/rc-*`): photo (asset id), shop, date, total, VAT, seller's VAT number, category, paid by card/cash/own money, what for, read by Claude then checked (`status`), and the bank payment it matched (`tx`) |
| `jobfile` | a job file (`todos/jf-*`) for a client enquiry (`clientId`) and its estimates and invoices (or an estimate with no client, `estId`): client, job, site, and files in folders (plans, supplier quotes, subbie quotes, photos, building control, letters, other) with who from, a note and a price |
| `npsym` | drawing symbols James saved from his own drawings (`name`, `objs` around their middle, `scale` drawn at) |
| `qrcfg`, `qrsite` | QR sign-in config (web-app URL + key) and per-site state |
| `audit` | tamper-evident deletion record (hash-chained) |
| `bin` | deleted items (30-day bin) |
| `seen` | "what's new" markers |
| `sitedoc` | owner-private site documents |
| `jcset` | job costs settings (`todos/jcset`): what each person costs an hour (`cost`: { id: £/h }, `defCost`) |
| `jobcost` | one job's costing (`todos/jc-*`): `site`, `mode` (fixed / costplus), `labMode` (rates / markup), `labPct`, `matPct`, `subPct`, the profit aimed for `target` (%, else `jcset.target`, else 20) and how far through `done` (%), a materials budget from a drawing's priced list `matBudget` (£), and `invoiced` { cost key: sale id } – the costs already on a client invoice |
| `variation` | extra work agreed on site (`todos/var-*`): `site`, `clientId`, `client`, `title`, `details`, `photos` (asset ids), `amt` (before VAT), `vc` (VAT code), `status` (open / signed / cancelled), `sign` { `name`, `at`, `sigId`, `pdfId` }, `invId` (the invoice it went onto), `number` (V1, V2…). Signed ones are locked |
| `pricelist` | a merchant's prices, owner-only and never copied to trades (`todos/pl-{merchant id}`): `sup`, `items` [{ `n` item, `u` unit, `p` £ before VAT }] |
| `purchaseorder` | an order to one merchant (`todos/po-*`): `number` (PO1…), `site`, `sup`, `supName`, `lines` [{ `d`, `q`, `u`, `p`, `for` }], `net`, `status` (draft / sent), `sentAt` |
| `sitediary` | James's note for one day on one site (`todos/sdi-{site slug}-{date}`): `site`, `date`, `note`, `weather` (saved with the note), `byName`, `updated`. The rest of the day (sign-ins, work, ticks, photos) is read from the existing records, not copied |
| `programme` | a job's programme (`todos/prog-{site slug}`): `site`, `start`, `toClient`, `stages` [{ `id`, `name`, `days` (working days), `after` (an earlier stage id), `link` (end / with), `lag` (delay days), `fix`, `done`, `actFrom`, `actTo`, `base` { first planned `from`, `to` } }]. Each stage is a `plan/prg-{slug}-{stage}` entry (`progId`, `stageId`); the client's copy is `portal/{uid}.programme` |
| `vatreturn` | a VAT quarter marked filed (`todos/vat-{to}`): `from`, `to`, `boxes` {1–9} as sent, `scheme`, `filedOn`, `ref`. The quarter months and scheme are `vatEnds` ("1"/"2"/"3": the month of the first quarter end) and `vatScheme` (standard / cash) on the `acct` record |
| `training` | owner training records |

## Shared collections
- `sites/{id}` – name (address), client, project type, `frontPhoto`, archived/storage flags, job summary.
- `docs/{id}` – site documents (`site`, `cat`, `title`, `assetId`, `who` visibility, folder).
- `inductions/{id}` – per-site induction (`site`, `details{}`, `items[]`, `version`, `redo`).
- `equipment` (also `booked` { key: { `date`, `time`, `where`, `note`, `planId` } } and `every` { key: months } for 🚐 Vehicles & plant; a booking is a `plan/eqb-{id}-{key}` entry of type `vehicle`), `talks` (toolbox talks), `jobs` / `jobdone` (job sheets & completion; a job's `tasks` [{ `id`, `text`, `det`, `refPhoto` (asset id), `pin` { `dwg` (`doc:{docId}` or `sk:{photoId}`), `title`, `x`, `y` (0–1 across and down the drawing) } ] – a 📸 Snag adds to the trade's open snag list for the site), `plan` (planner items) / `planprivate`, `chats` / `msgs`, `sphotos` (site photos), `wfiles`.
- `settings/app` – company details, people list, `portalAccess` { `tabs` { part: false }, `clients` { uid: { part: true|false } } } (Setup › Client portal: the parts of the portal clients see), waste carrier, waste sites, brand; `settings/matcalc`; `settings/weather` (written hourly by the "JEB weather update" routine from AccuWeather: `at`, `places` [{ name, site, key, lat, lon, icon, phrase, temp, wind }]); `settings/forecast` (the weather-wise planner's 10-day forecast, written at 6:10, 12:10 and 17:10 by the "JEB weather forecast" routine: `at`, `places` [{ name, site, key, `days` [{ d, rain %, mm, max, min °C, gust km/h, phrase }] }]).
- `portal/{clientUid}` (+ `docs`, `signs`, uploads, `picks` – 🎨 choices for the client: `title`, `room`, `allowance` (£, what they pay), `due`, `note`, `options` [{ `id`, `name`, `price`, `photo`, `note`, `sampleId` }], `status` (open / chosen / locked), `choice` { `opt`, `name`, `price`, `at` } written by the client, `varAt` when the owner made the over-allowance a variation) – client portal. Its `money` field is the client's own job figures for the 📖 Job story (price agreed, invoiced, paid, left, their invoices and payments), copied there by the owner's app; nothing is read back from it, so a client changing their copy changes only what they see.
- `visitinds` – visitor inductions done on the owner's device; `offapp` – people not on the app.

## Assets
Uploaded via `assets.upload(blob)` → `{id,url}`; referenced by id in documents; served at `/_blob/<id>`. Includes photos, PDFs, signatures (some signatures are data-URLs inline in documents), the company logo, brochures.

## Published files
Besides `index.html`, the artifact publishes `template.json` (a Word letter template for planning-lead letters; **contains a real addressee – not in this repo**; export with the data).
