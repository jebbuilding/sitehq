/* ================= COMPANIES & SUBCONTRACTORS: every company that comes in to work and every self-employed trade, with their details, insurance and whether they're working for us now ================= */
import { $, addDays, esc, iso, shortDay, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { uploadFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { openDetails } from "./personal-details.js";
import { daysTo } from "../safety/expiry-dates.js";
import { ukDate } from "../safety/rams-maker.js";
import { shrinkImage } from "../safety/training.js";
import { empTypeOf } from "../sites/job-details.js";
export { cmpDueItems, cmpView };
/* 🏢 on the team page. Companies James adds (todos/firm-*, owner-only): name, trades, contact, phone, email, address,
   website, company, VAT and UTR numbers, CIS (gross, 20% or 30%), public and employer's liability insurance with the
   date it runs out, qualifications and schemes, day rate, notes, the insurance certificate and other documents, and
   whether they're working for us now. Self-employed trades and companies on the app fill in their own "Your business"
   details (trading name, numbers, insurance, qualifications) in their app, and James can fill them in or check them
   too; people not on the app are added the same way. The list shows everyone together, working-now first, with
   insurance that has run out or runs out within 30 days flagged, and each company's people under it. App trades
   count as working for us now if they've logged time in the last 30 days. */
const CMP_CIS = {
  "": "Not CIS / not known",
  gross: "Gross (no deduction)",
  net20: "Net – 20% deducted",
  net30: "Net – 30% deducted",
};
const CMP_DOCS = {
  pl: "Public liability certificate",
  el: "Employer's liability certificate",
  accred: "Qualification / scheme certificate",
  other: "Other document",
};
const cmpFirms = () =>
  (S.firms || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
const cmpNorm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\b(ltd|limited|plc|the|& sons|and sons)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
/* how soon insurance runs out: a tag, or nothing */
function cmpExpTag(d) {
  if (!d) return "";
  const n = daysTo(d);
  if (n < 0) return `<span class="tag bad">Insurance ran out ${esc(shortDay(d))}</span>`;
  if (n <= 30) return `<span class="tag day">Insurance runs out ${esc(shortDay(d))}</span>`;
  return "";
}
/* the self-employed and company people: on the app, and not on the app */
function cmpPeople() {
  const since = iso(addDays(new Date(), -30));
  const app = teamIds()
    .filter((id) => ["selfemp", "company", "agency"].includes(empTypeOf(id)))
    .map((id) => {
      const d = (S.team[id] && S.team[id].details) || {};
      const last =
        ((S.data.entries || {})[id] || [])
          .map((e) => e.date)
          .filter(Boolean)
          .sort()
          .pop() || "";
      return { key: "app:" + id, id, name: nameOf(id), d, onApp: true, now: last >= since, last };
    });
  const off = (S.offapp || [])
    .filter((o) => (o.role || "sub") !== "employee")
    .map((o) => ({
      key: "off:" + o.id,
      rec: o,
      name: (o.details || {}).fullName || "Trade",
      d: Object.assign({ company: o.roleCompany || "" }, o.details || {}),
      onApp: false,
      now: !!o.working,
    }));
  return app.concat(off);
}
function cmpView() {
  const f = S.f.cmpf || "all";
  const q = cmpNorm(S.f.cmpq || "");
  const firms = cmpFirms();
  const people = cmpPeople();
  const firmOf = (p) =>
    firms.find(
      (fm) =>
        cmpNorm(fm.name) &&
        (cmpNorm(p.d.company) === cmpNorm(fm.name) ||
          cmpNorm(p.d.tradingName) === cmpNorm(fm.name)),
    );
  const rowsF = firms.map((fm) => {
    const ppl = people.filter((p) => firmOf(p) === fm);
    return {
      t: "firm",
      fm,
      ppl,
      now: fm.status === "now" || ppl.some((p) => p.now),
      name: fm.name,
      trade: fm.trades || "",
      exp: fm.plExpiry,
    };
  });
  const rowsP = people
    .filter((p) => !firmOf(p))
    .map((p) => ({
      t: "person",
      p,
      now: p.now,
      name: p.d.tradingName || p.name,
      trade: p.d.trade || "",
      exp: p.d.plExpiry,
    }));
  let rows = rowsF.concat(rowsP);
  if (f === "now") rows = rows.filter((r) => r.now);
  if (f === "not") rows = rows.filter((r) => !r.now);
  if (q)
    rows = rows.filter((r) =>
      cmpNorm(
        r.name +
          " " +
          r.trade +
          " " +
          (r.t === "person" ? r.p.name : r.ppl.map((p) => p.name).join(" ")),
      ).includes(q),
    );
  rows.sort((a, b) => (b.now ? 1 : 0) - (a.now ? 1 : 0) || a.name.localeCompare(b.name));
  const nNow = rowsF.concat(rowsP).filter((r) => r.now).length;
  const warn = rowsF.concat(rowsP).filter((r) => r.exp && daysTo(r.exp) <= 30).length;
  openViewer(`<div class="cmp"><div class="vhead"><b>🏢 Companies &amp; subcontractors</b></div>
    <div class="who">Every company that comes in to work and every self-employed trade. Self-employed trades on the app keep their own details up to date in My details; you can fill them in or check them too.</div>
    ${warn ? `<div class="notice warn">⚠ ${warn} with insurance that has run out or runs out within 30 days – ask them for the new certificate.</div>` : ""}
    <div class="actions"><button type="button" class="btn primary" id="cmp-add">+ Add a company</button><button type="button" class="btn" id="cmp-addp">+ Add a self-employed trade not on the app</button></div>
    <div class="cmp-top"><div class="seg" id="cmp-f">${[
      ["all", "Everyone"],
      ["now", `Working for us now (${nNow})`],
      ["not", "Not at the moment"],
    ]
      .map(
        ([k, l]) =>
          `<button type="button" data-v="${k}" aria-pressed="${f === k}">${esc(l)}</button>`,
      )
      .join(
        "",
      )}</div><input id="cmp-q" type="search" placeholder="Search a name or trade" value="${esc(S.f.cmpq || "")}" aria-label="Search"></div>
    ${
      rows
        .map((r) =>
          r.t === "firm"
            ? `<div class="cmp-row"><button type="button" class="cmp-open" data-firm="${esc(r.fm.id)}"><span><b>${esc(r.fm.name)}</b> <span class="who">${esc(r.trade)}</span><br><span class="tag ${r.now ? "ok" : ""}">${r.now ? "Working for us now" : "Not at the moment"}</span> ${cmpExpTag(r.exp)}${r.fm.cis ? ` <span class="who">CIS: ${esc(CMP_CIS[r.fm.cis] || "")}</span>` : ""}</span><span aria-hidden="true">›</span></button>${r.ppl.length ? `<div class="cmp-ppl">${r.ppl.map((p) => `<button type="button" class="linkbtn cmp-person" data-k="${esc(p.key)}">👷 ${esc(p.name)}${p.onApp ? "" : " (not on the app)"}</button>`).join("")}</div>` : ""}</div>`
            : `<div class="cmp-row"><button type="button" class="cmp-person" data-k="${esc(r.p.key)}"><span><b>${esc(r.name)}</b>${r.p.d.tradingName && r.p.d.tradingName !== r.p.name ? ` <span class="who">(${esc(r.p.name)})</span>` : ""} <span class="who">${esc(r.trade)} · ${r.p.onApp ? "on the app" : "not on the app"}</span><br><span class="tag ${r.now ? "ok" : ""}">${r.now ? "Working for us now" : "Not at the moment"}</span>${r.p.last ? ` <span class="who">last on site ${esc(shortDay(r.p.last))}</span>` : ""} ${cmpExpTag(r.exp)}${r.p.d.plInsurer || r.p.d.plExpiry ? "" : ' <span class="who">no insurance details yet</span>'}</span><span aria-hidden="true">›</span></button></div>`,
        )
        .join("") ||
      `<div class="nothing">${q || f !== "all" ? "Nobody matches." : "Nobody yet. Add the companies that come in to work, and self-employed trades fill in their own details on the app."}</div>`
    }</div>`);
  $("cmp-add").onclick = () => cmpEdit(null);
  $("cmp-addp").onclick = () => openDetails({ off: true });
  $("cmp-f")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.cmpf = b.dataset.v;
          cmpView();
        }),
    );
  $("cmp-q").oninput = (e) => {
    S.f.cmpq = e.target.value;
    clearTimeout(cmpTimer);
    cmpTimer = setTimeout(() => {
      cmpView();
      const el = $("cmp-q");
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }, 300);
  };
  document
    .querySelectorAll(".cmp-open")
    .forEach((b) => (b.onclick = () => cmpEdit(firms.find((x) => x.id === b.dataset.firm))));
  document.querySelectorAll(".cmp-person").forEach(
    (b) =>
      (b.onclick = () => {
        const p = people.find((x) => x.key === b.dataset.k);
        if (p) cmpPerson(p);
      }),
  );
}
let cmpTimer = null;
/* one self-employed person: their business details, and whether they're working for us now */
function cmpPerson(p) {
  const d = p.d;
  const row = (l, v) =>
    v ? `<div class="drow"><span>${esc(l)}</span><span>${esc(v)}</span></div>` : "";
  const d2 = document.createElement("div");
  d2.className = "dimask";
  d2.innerHTML = `<div class="dimbox cmp-box" role="dialog" aria-label="${esc(p.name)}"><b>${esc(d.tradingName || p.name)}</b><div class="who">${esc(p.name)}${d.trade ? " · " + esc(d.trade) : ""} · ${p.onApp ? "on the app – they keep these up to date themselves" : "not on the app"}</div>
    <div class="details">${row("Mobile", d.mobile)}${row("Email", d.email)}${row("Company it's under", d.company)}${row("Company number", d.companyNo)}${row("VAT number", d.vatNo)}${row("UTR", d.utr)}${row("Public liability", [d.plInsurer, d.plCover].filter(Boolean).join(", "))}${row("Insurance runs out", d.plExpiry ? ukDate(d.plExpiry) : "")}${row("Qualifications and schemes", d.accred)}${row("Day rate", d.dayRate ? "£" + d.dayRate : "")}${row("CSCS", d.cscs)}</div>
    ${cmpExpTag(d.plExpiry)}
    ${p.onApp ? `<div class="who">${p.now ? `Working for us now – last on site ${esc(shortDay(p.last))}.` : `Not working for us at the moment${p.last ? " – last on site " + esc(shortDay(p.last)) : ""}.`}</div>` : `<label class="inl"><input type="checkbox" id="cmp-now"${p.now ? " checked" : ""}> Working for us now</label>`}
    <div class="dimbtns"><button type="button" class="btn primary cmp-ed">✎ Fill in or change the details</button><button type="button" class="btn cmp-x">Close</button></div></div>`;
  document.body.appendChild(d2);
  d2.querySelector(".cmp-x").onclick = async () => {
    if ($("cmp-now") && !!$("cmp-now").checked !== p.now)
      try {
        await S.db.doc("offapp/" + p.rec.id).update({ working: !!$("cmp-now").checked });
        p.rec.working = !!$("cmp-now").checked;
      } catch (e) {}
    d2.remove();
    cmpView();
  };
  d2.querySelector(".cmp-ed").onclick = () => {
    d2.remove();
    openDetails(p.onApp ? { id: p.id } : { off: true, rec: p.rec });
  };
}
async function cmpSave(fm) {
  const rec = Object.assign({}, fm, { kind: "firm", updated: Date.now() });
  const id = rec.id || "firm-" + newId();
  delete rec.id;
  if (!rec.created) rec.created = Date.now();
  await S.db.doc("todos/" + id).set(rec);
  const out = Object.assign({ id }, rec);
  S.firms = (S.firms || []).filter((x) => x.id !== id).concat([out]);
  return out;
}
function cmpEdit(fm0) {
  const fm = Object.assign({ status: "now", docs: [] }, fm0 || {});
  let docs = (fm.docs || []).slice();
  const F = (k, l, ph, type) =>
    `<label for="cmp-${k}">${esc(l)}<input id="cmp-${k}" ${type ? `type="${type}"` : ""} maxlength="120" placeholder="${esc(ph || "")}" value="${esc(fm[k] || "")}"></label>`;
  const docRows = () =>
    docs
      .map(
        (x, i) =>
          `<div class="attrow"><button type="button" class="linkbtn cmp-dopen" data-i="${i}">📄 ${esc(CMP_DOCS[x.kind] || "Document")}${x.expires ? " · runs out " + esc(ukDate(x.expires)) : ""}</button><button type="button" class="linkdanger cmp-ddel" data-i="${i}">Remove</button></div>`,
      )
      .join("") || `<div class="who">No documents yet.</div>`;
  openSheet(
    `<h3 id="sheettitle">🏢 ${fm0 ? esc(fm.name) : "Add a company"}</h3>
    ${F("name", "Company name", "e.g. Test Scaffolding Ltd")}
    ${F("trades", "What they do", "e.g. Scaffolding, roofing")}
    <div class="seg" id="cmp-st"><button type="button" data-v="now" aria-pressed="${fm.status !== "past"}">Working for us now</button><button type="button" data-v="past" aria-pressed="${fm.status === "past"}">Not at the moment</button></div>
    <div class="flabel">Contact</div>
    <div class="grid2">${F("contact", "Contact name")}${F("phone", "Phone", "", "tel")}</div>
    <div class="grid2">${F("email", "Email", "", "email")}${F("website", "Website")}</div>
    <label for="cmp-address">Address<textarea id="cmp-address" maxlength="300" rows="2">${esc(fm.address || "")}</textarea></label>
    <div class="flabel">Numbers and tax</div>
    <div class="grid2">${F("companyNo", "Company number")}${F("vatNo", "VAT number")}</div>
    <div class="grid2">${F("utr", "UTR (for CIS)")}<label for="cmp-cis">CIS<select id="cmp-cis">${Object.entries(
      CMP_CIS,
    )
      .map(
        ([k, l]) =>
          `<option value="${k}"${(fm.cis || "") === k ? " selected" : ""}>${esc(l)}</option>`,
      )
      .join("")}</select></label></div>
    <div class="flabel">Insurance</div>
    <div class="grid2">${F("plInsurer", "Public liability insurer")}${F("plCover", "Cover", "e.g. £10,000,000")}</div>
    <div class="grid2">${F("plExpiry", "Public liability runs out", "", "date")}${F("elExpiry", "Employer's liability runs out", "", "date")}</div>
    <label for="cmp-accred">Qualifications and schemes<textarea id="cmp-accred" maxlength="500" rows="2" placeholder="e.g. NASC member, CISRS card holders, Gas Safe 123456">${esc(fm.accred || "")}</textarea></label>
    <div class="grid2">${F("rate", "Day rate or prices", "e.g. £280 a day")}<span></span></div>
    <label for="cmp-notes">Notes<textarea id="cmp-notes" maxlength="1000" rows="3" placeholder="e.g. Reliable, book two weeks ahead">${esc(fm.notes || "")}</textarea></label>
    <div class="flabel">📎 Certificates and documents</div><div id="cmp-docs">${docRows()}</div>
    <div class="grid2" style="align-items:end"><label for="cmp-dk">Type<select id="cmp-dk">${Object.entries(
      CMP_DOCS,
    )
      .map(([k, l]) => `<option value="${k}">${esc(l)}</option>`)
      .join(
        "",
      )}</select></label><label for="cmp-dx">Runs out (optional)<input id="cmp-dx" type="date"></label></div>
    <span class="btn cmp-filebtn">📎 Add a certificate (PDF or photo)<input type="file" id="cmp-file" accept="application/pdf,image/*" aria-label="Add a certificate"></span><div class="who" id="cmp-prog"></div>
    ${formFoot(!!fm0, fm0 ? "Save" : "Add the company")}`,
    async () => {
      const name = $("cmp-name").value.trim();
      if (!name) return showErr("Put the company's name");
      const o = Object.assign({}, fm, {
        name,
        status: $("cmp-st").querySelector('[aria-pressed="true"]').dataset.v,
        cis: $("cmp-cis").value,
        address: $("cmp-address").value.trim(),
        accred: $("cmp-accred").value.trim(),
        notes: $("cmp-notes").value.trim(),
        docs,
      });
      [
        "trades",
        "contact",
        "phone",
        "email",
        "website",
        "companyNo",
        "vatNo",
        "utr",
        "plInsurer",
        "plCover",
        "plExpiry",
        "elExpiry",
        "rate",
      ].forEach((k) => (o[k] = $("cmp-" + k).value.trim()));
      /* the insurance runs-out date from a certificate, if it wasn't typed */
      if (!o.plExpiry) {
        const pl = docs
          .filter((x) => x.kind === "pl" && x.expires)
          .sort((a, b) => b.expires.localeCompare(a.expires))[0];
        if (pl) o.plExpiry = pl.expires;
      }
      try {
        await cmpSave(o);
        closeForm();
        toast(fm0 ? "Saved" : name + " added");
        cmpView();
      } catch (e) {
        showErr("Couldn't save – check your connection");
      }
    },
    "cmp-name",
  );
  $("cmp-st")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () =>
          $("cmp-st")
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)))),
    );
  const wireDocs = () => {
    $("cmp-docs").innerHTML = docRows();
    document
      .querySelectorAll(".cmp-dopen")
      .forEach(
        (b) =>
          (b.onclick = () =>
            openFile(
              docs[+b.dataset.i].assetId,
              docs[+b.dataset.i].name || "document",
              docs[+b.dataset.i].type,
            )),
      );
    document.querySelectorAll(".cmp-ddel").forEach(
      (b) =>
        (b.onclick = () => {
          docs.splice(+b.dataset.i, 1);
          wireDocs();
        }),
    );
  };
  wireDocs();
  $("cmp-file").onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    $("cmp-prog").textContent = "Uploading…";
    try {
      const img = /^image\//.test(f.type);
      const up = await uploadFile(img ? await shrinkImage(f, 1800) : f, f.name || "certificate");
      docs.push({
        assetId: up.id,
        name: f.name || "certificate",
        type: img ? "image/jpeg" : f.type || "application/pdf",
        kind: $("cmp-dk").value,
        expires: $("cmp-dx").value || "",
        at: Date.now(),
      });
      if ($("cmp-dk").value === "pl" && $("cmp-dx").value && !$("cmp-plExpiry").value)
        $("cmp-plExpiry").value = $("cmp-dx").value;
      $("cmp-prog").textContent = "Added – save to keep it.";
      wireDocs();
    } catch (er) {
      $("cmp-prog").textContent = "Couldn't upload – check your connection.";
    }
    e.target.value = "";
  };
  if ($("f-del"))
    armDelete(async () => {
      await S.db.doc("todos/" + fm0.id).delete();
      S.firms = (S.firms || []).filter((x) => x.id !== fm0.id);
      cmpView();
    });
}
/* insurance running out, for Today's "coming up" list */
function cmpDueItems() {
  const out = [];
  cmpFirms()
    .filter((fm) => fm.status !== "past" && fm.plExpiry && daysTo(fm.plExpiry) <= 30)
    .forEach((fm) =>
      out.push({
        what: `Insurance runs out: ${fm.name}`,
        date: fm.plExpiry,
        n: daysTo(fm.plExpiry),
        go: () => cmpEdit(fm),
      }),
    );
  cmpPeople()
    .filter((p) => p.now && p.d.plExpiry && daysTo(p.d.plExpiry) <= 30)
    .forEach((p) =>
      out.push({
        what: `Insurance runs out: ${p.d.tradingName || p.name}`,
        date: p.d.plExpiry,
        n: daysTo(p.d.plExpiry),
        go: () => cmpPerson(p),
      }),
    );
  return out;
}
