# Feature inventory

Where to look: search `src/app/` for the function or module named; each file's first line is its banner (`/* ================= NAME`). Folders are described in `docs/ARCHITECTURE.md` › Source layout.

## Owner tabs (`OWN_TABS`, dispatcher in `render()`)
| Tab | Function / module | Highlights |
|---|---|---|
| 📝 My forms | owner preview of trade forms | fill any trade form as the owner |
| 🗓️ Planner | `plannerView` (+ PLANNER v2 board) | people × days board, job timeline, time-off approvals, imports |
| ✅ My to-do | `todoView` | |
| ⏱️ Timesheets | `ownerTime` | weekly/monthly, pay summary, PDF/xlsx, person/site filters |
| 📍 Sign-in book | `SIGNIN.view` | auto from timesheet check-ins; sign in trades or **anyone not on the list** (visitors); roll call; register PDF; **import QR sign-ins** |
| 🧱 Day work | `dayworkView` | chargeable hours, rates, xlsx |
| 💬 Chat | `chatView` | groups, DMs, calls, photos |
| 📋 Forms | `jobsView` (+ `DWS`, `WTN`, `SIGNSHEET`) | **Forms / ✍️ Sign-offs** switch; door & window survey; waste transfer notes; job sheets & snags; sign-off sheets |
| 🏗️ Sites | `ownerProjects` | site tiles → site page (overview, documents, RAMS, induction, **QR sign-in card**, job summary, photos, storage) |
| 👥 Clients | `clientsView` | **Enquiries & jobs** pipeline / **📒 Address book** with per-job history pages (`CJOBS`); client details vs **new enquiry** forms; quick enquiry; GDPR consent; client PDF |
| 🎨 Samples | `SAMPLES.view` | library with photos; tick to book out/in to a client; overdue; out-list PDF |
| 📬 Leads | `LEADS.view` | planning applications (East Devon, Exeter, Teignbridge) by work type; letters |
| 🏡 Client portal | `portalTab` | per-client docs, sign-offs, uploads, shared calendar |
| ✍️ Sign-offs | `signoffsTab` (reached from Forms) | all client sign-offs, go-ahead sheets (incl. typed-in clients), print-to-sign |
| 🦺 Health & safety | `hsView` | accidents/near misses, RAMS maker, CDM 2015 documents, inductions |
| 📋 Reports, 📷 Photos, 🧰 Materials & tools, 🧾 Receipts, Invoices, 🎓 Training, 🛡️ Policies & insurance | `ownerChecks`, `ownerPhotos`, `materialsView`, `receiptsView`, `ownerInvoices`, `trainingView`, `policiesView` | |
| 🏪 Merchants | `suppliersView` | **Merchants** (accounts, branches, hours, who can see) / **🏭 Suppliers & brochures** (`makersView`); **👥 Choose who sees what** (`whoSeesDlg`); shared copies to trades (`syncMakers`, supplier sync) |
| 👷 Employees | `peopleView` | person pages, photo change/remove, documents (contract / **subcontractor agreement** `SUBAG`), sign-in-only switch, leavers |
| Calculator | `calcView` | sums, m², m³, materials, roofing, falls, stairs, plasterboard, timber, aggregates, heating BTU |
| ✏️ Drawings | `drawView` + notebook page | OneNote-style page, walls/symbols/timber/details, DXF export, scale ruler |
| ⚙️ Setup | `ownerSetup` | company details & logo, PIN, deletion record, deleted items, **📱 QR site sign-in**, **📖 Brochures**, **🎨 Samples**, waste transfer sites, backup |

## Door & window survey (`DWS`)
Openings (window/door/bay/garage/roof) drawn as SVG from presets or custom frames; per-opening sizes, glass, cill, frame, hardware, photos; uPVC/aluminium/composite/**timber** options (species, style, mouldings, finish, glazing, bars, ironmongery, conservation); **door leaf designs** (composite & wooden, `DOORD`); garage doors; house numbers; **client & site drop-downs**; 📖 brochures per maker (open, ✂️ cut a design onto an opening); PDFs: **Order request** and **Full survey**, both printable; saved on the client's record.

## Trade tabs (`EMP_TABS` / `empTabs()`)
Timesheets (incl. paper-style monthly), Day work, Chat, Planner, Forms (jobs, to-dos and forms), Sites (plans, RAMS, specs, induction), Reports, Photos, Materials & tools, Merchants (only shared ones + shared suppliers/brochures), Receipts, Invoices, Training, Policies & insurance, Calculator, Drawings, My details. Sign-in-only people get Sign in instead of timesheets/day work.

## Client portal
Home, documents by folder, sign-offs (sign on phone), uploads to James, job calendar, messages.

## Cross-cutting
Send to… (any file → trades/clients + notification + keep on job) · prompts/reminders · what's-new badges · report an issue · spell check · dictation · maps & pins · cut-outs · printing everywhere · offline outbox · back-button handling · tamper-evident audit · deleted-items bin · backup.

## Outside the page
- `apps-script/` – public QR sign-in page (Google Apps Script + Sheet).
- Planning leads – weekly Claude scheduled task writing to `data/users/<owner>/leads/*`.
