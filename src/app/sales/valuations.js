/* ================= APPLICATIONS FOR PAYMENT: valuations on bigger jobs, with the payment notice deadlines ================= */
import { $, addDays, esc, gbp, iso, parse, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { BRGB } from "../photos/photos.js";
import { daysTo } from "../safety/expiry-dates.js";
import { ukDate } from "../safety/rams-maker.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { lhPics, lhPutBot, lhPutTop } from "./letterhead-setup.js";
import { sdAmt, sdLines, sdNo, sdR2, sdSales, sdSaveRec, sdSet } from "./sales-calc.js";
import { same } from "../sites/project-pages.js";
export { appAll, appCalc, appView };
/* Accounts › 🏗 Applications. For a job paid in stages against a priced list (often for a main contractor or a
   bigger client): start from the accepted estimate's lines (or type them), put how far through each one is (%), and
   it values the work to date, takes off the retention and what's been applied for before, and gives the amount due
   this time. It works out the Construction Act dates from the contract's terms: the due date, the final date for
   payment, and the last day they can send a pay less notice (7 days before the final date unless the contract says
   otherwise). The application is a PDF on the letterhead, and one tap makes the invoice for it. Each application
   remembers its figures, so the next one carries on from it. Stored in todos/val-{id} (kind "valuation"): site,
   client, clientId, estId, no, date, items [{ d, sum, pct }], ret (%), dueDays, finalDays, plDays, invId. */
const appAll = () =>
  (S.valuations || [])
    .slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.no || 0) - (a.no || 0));
const appPrev = (v) =>
  appAll().filter((x) => x.id !== v.id && same(x.site, v.site) && (x.no || 0) < (v.no || 0));
function appCalc(v) {
  const gross = sdR2(
    (v.items || []).reduce(
      (a, it) => a + ((+it.sum || 0) * Math.min(100, Math.max(0, +it.pct || 0))) / 100,
      0,
    ),
  );
  const ret = sdR2((gross * (+v.ret || 0)) / 100);
  const net = sdR2(gross - ret);
  const prev = appPrev(v).reduce((a, x) => Math.max(a, appCalc(x).net), 0);
  const due = sdR2(net - prev);
  const d = v.date || iso(new Date());
  const dueDate = iso(addDays(parse(d), +v.dueDays || 7));
  const finalDate = iso(addDays(parse(dueDate), +v.finalDays || 17));
  const plDate = iso(addDays(parse(finalDate), -(+v.plDays || 7)));
  const total = sdR2((v.items || []).reduce((a, it) => a + (+it.sum || 0), 0));
  return { gross, ret, net, prev, due, dueDate, finalDate, plDate, total };
}
async function appSave(v) {
  const rec = Object.assign({}, v, { kind: "valuation", updated: Date.now() });
  const id = rec.id || "val-" + newId();
  delete rec.id;
  if (!rec.created) rec.created = Date.now();
  await S.db.doc("todos/" + id).set(rec);
  const out = Object.assign({ id }, rec);
  S.valuations = (S.valuations || []).filter((x) => x.id !== id).concat([out]);
  return out;
}
function appView(tabs) {
  const L = appAll();
  const today = iso(new Date());
  $("main").innerHTML = `<div class="ac-page">${tabs}
    <div class="sd-acts"><button type="button" class="btn primary" id="app-new">+ New application for payment</button></div>
    <div class="who">For jobs paid in stages against a priced list: put how far through each item is, and it works out what's due, less retention and what's been applied for before, with the payment notice dates.</div>
    ${
      L.map((v) => {
        const c = appCalc(v);
        const warn = !v.paidAt && c.plDate >= today && daysTo(c.plDate) <= 3;
        return `<div class="card app-row"><div class="app-h"><b>${esc(v.site || "Job")} · application ${esc(v.no)}</b><span class="tag ${v.paidAt ? "ok" : c.finalDate < today ? "bad" : "day"}">${v.paidAt ? "Paid" : c.finalDate < today ? "Past the final date" : "Due " + esc(shortDay(c.dueDate))}</span></div>
        <div class="who">${esc(ukDate(v.date))} · ${esc(v.client || "")} · valued ${gbp(c.gross)} · <b>${gbp(c.due)} due this time</b></div>
        <div class="who">Pay less notice by ${esc(shortDay(c.plDate))} · final date for payment ${esc(shortDay(c.finalDate))}${warn ? ' · <span class="app-warn">pay less notice deadline soon</span>' : ""}</div>
        <div class="actions"><button type="button" class="btn app-open" data-id="${esc(v.id)}">✎ Open</button><button type="button" class="btn app-pdf" data-id="${esc(v.id)}">📄 PDF</button>${v.invId ? `<span class="who">Invoiced</span>` : `<button type="button" class="btn app-inv" data-id="${esc(v.id)}">🧾 Make the invoice</button>`}<button type="button" class="btn app-next" data-id="${esc(v.id)}">+ Next application</button></div></div>`;
      }).join("") || `<div class="nothing">No applications yet.</div>`
    }</div>`;
  const find = (b) => L.find((x) => x.id === b.dataset.id);
  $("app-new").onclick = () => appEdit(null);
  document.querySelectorAll(".app-open").forEach((b) => (b.onclick = () => appEdit(find(b))));
  document.querySelectorAll(".app-pdf").forEach((b) => (b.onclick = () => appPdfSave(find(b))));
  document.querySelectorAll(".app-inv").forEach((b) => (b.onclick = () => appInvoice(find(b))));
  document.querySelectorAll(".app-next").forEach(
    (b) =>
      (b.onclick = () => {
        const v = find(b);
        appEdit(
          Object.assign({}, v, {
            id: "",
            no: (+v.no || 1) + 1,
            date: iso(new Date()),
            invId: "",
            paidAt: 0,
            items: (v.items || []).map((x) => Object.assign({}, x)),
          }),
        );
      }),
  );
}
function appEdit(v0) {
  const ests = sdSales().filter(
    (d) => d.type === "estimate" && /accepted|invoiced/.test(d.status || ""),
  );
  const v = Object.assign(
    { no: 1, date: iso(new Date()), items: [], ret: 3, dueDays: 7, finalDays: 17, plDays: 7 },
    v0 || {},
  );
  let items = (v.items || []).map((x) => Object.assign({}, x));
  const sites = siteNames();
  openSheet(
    `<h3 id="sheettitle">🏗 Application for payment ${esc(v.no)}</h3>
    <div class="grid2"><label for="app-site">Job<select id="app-site"><option value="">Pick the job…</option>${sites.map((s) => `<option${same(s, v.site) ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></label><label for="app-client">Who to (client or main contractor)<input id="app-client" maxlength="80" value="${esc(v.client || "")}"></label></div>
    <div class="grid2"><label for="app-no">Application number<input id="app-no" type="number" min="1" value="${esc(v.no)}"></label><label for="app-date">Date<input id="app-date" type="date" value="${esc(v.date)}"></label></div>
    ${!v0 || !items.length ? `<label for="app-est">Start from an accepted estimate<select id="app-est"><option value="">– type the items instead –</option>${ests.map((d) => `<option value="${esc(d.id)}">${esc(sdNo(d))} · ${esc(d.client || "")} · ${esc(d.site || "")}</option>`).join("")}</select></label>` : ""}
    <div class="flabel">Items: the price of each and how far through it is</div><div id="app-items"></div>
    <div class="actions"><button type="button" class="btn" id="app-add">+ Add an item</button></div>
    <div class="grid2"><label for="app-ret">Retention %<input id="app-ret" type="number" inputmode="decimal" min="0" max="10" step="0.5" value="${esc(v.ret)}"></label><label for="app-dd">Payment due (days after the application)<input id="app-dd" type="number" min="0" value="${esc(v.dueDays)}"></label></div>
    <div class="grid2"><label for="app-fd">Final date for payment (days after due)<input id="app-fd" type="number" min="0" value="${esc(v.finalDays)}"></label><label for="app-pl">Pay less notice (days before the final date)<input id="app-pl" type="number" min="0" value="${esc(v.plDays)}"></label></div>
    <div class="who" id="app-sum"></div>
    ${formFoot(false, "Save")}`,
    async () => {
      const o = read();
      if (!o.site) return showErr("Which job?");
      if (!o.items.length) return showErr("Add the items");
      try {
        await appSave(o);
        closeForm();
        render();
      } catch (e) {
        showErr("Couldn't save");
      }
    },
    "app-site",
  );
  const read = () =>
    Object.assign({}, v, {
      site: $("app-site").value,
      client: $("app-client").value.trim(),
      no: Math.max(1, +$("app-no").value || 1),
      date: $("app-date").value || iso(new Date()),
      items: items
        .filter((x) => String(x.d).trim() && +x.sum > 0)
        .map((x) => ({
          d: String(x.d).trim(),
          sum: sdR2(+x.sum),
          pct: Math.min(100, Math.max(0, +x.pct || 0)),
        })),
      ret: +$("app-ret").value || 0,
      dueDays: +$("app-dd").value || 0,
      finalDays: +$("app-fd").value || 0,
      plDays: +$("app-pl").value || 0,
    });
  const sum = () => {
    const c = appCalc(read());
    $("app-sum").innerHTML =
      `Valued to date <b>${gbp(c.gross)}</b> of ${gbp(c.total)} · less retention ${gbp(c.ret)} · less applied for before ${gbp(c.prev)} · <b>due this time ${gbp(c.due)}</b> + VAT<br>Due ${esc(shortDay(c.dueDate))} · pay less notice by ${esc(shortDay(c.plDate))} · final date for payment ${esc(shortDay(c.finalDate))}`;
  };
  const draw = () => {
    $("app-items").innerHTML = items
      .map(
        (x, i) =>
          `<div class="app-it" data-i="${i}"><input class="app-d" maxlength="120" value="${esc(x.d)}" placeholder="e.g. Groundworks" aria-label="Item ${i + 1}"><input class="app-s" type="number" inputmode="decimal" min="0" step="0.01" value="${esc(x.sum || "")}" placeholder="£" aria-label="Price of item ${i + 1}"><input class="app-p" type="number" inputmode="decimal" min="0" max="100" value="${esc(x.pct || 0)}" aria-label="Percent done of item ${i + 1}"><span>%</span><button type="button" class="linkdanger app-x" aria-label="Remove item ${i + 1}">✕</button></div>`,
      )
      .join("");
    $("app-items")
      .querySelectorAll(".app-it")
      .forEach((r) => {
        const x = items[+r.dataset.i];
        r.querySelector(".app-d").oninput = (e) => (x.d = e.target.value);
        r.querySelector(".app-s").oninput = (e) => {
          x.sum = e.target.value;
          sum();
        };
        r.querySelector(".app-p").oninput = (e) => {
          x.pct = e.target.value;
          sum();
        };
        r.querySelector(".app-x").onclick = () => {
          items.splice(+r.dataset.i, 1);
          draw();
        };
      });
    sum();
  };
  draw();
  $("app-add").onclick = () => {
    items.push({ d: "", sum: "", pct: 0 });
    draw();
  };
  ["app-ret", "app-dd", "app-fd", "app-pl", "app-date", "app-no", "app-site"].forEach(
    (id) => ($(id).oninput = sum),
  );
  if ($("app-est"))
    $("app-est").onchange = (e) => {
      const d = ests.find((x) => x.id === e.target.value);
      if (!d) return;
      items = sdLines(d)
        .filter((l) => !l.h || sdAmt(l))
        .map((l) => ({ d: l.d || l.h || "Item", sum: sdAmt(l), pct: 0 }))
        .filter((x) => x.sum > 0);
      if (!$("app-client").value) $("app-client").value = d.client || "";
      if (d.site && !$("app-site").value) $("app-site").value = d.site;
      v.estId = d.id;
      v.clientId = d.clientId || "";
      draw();
    };
}
async function appPdf(v) {
  await loadJsPdf();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const co = coData(),
    brand = BRGB();
  const M = 20,
    R = 190;
  const pics = await lhPics();
  const bottom = pics && pics.bot ? pics.bot.y - 8 : 282;
  let y = 48;
  const head = () => {
    y = 48;
    if (pics) {
      y = Math.max(lhPutTop(doc, pics, 44), 30) + 10;
      lhPutBot(doc, pics);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...brand);
      doc.text(co.name, M, 20);
    }
  };
  head();
  const c = appCalc(v);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(30, 30, 30);
  doc.text(`Application for payment no. ${v.no}`, M, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`To: ${v.client || ""}   Job: ${v.site || ""}   Date: ${ukDate(v.date)}`, M, y);
  y += 9;
  const row = (a, b, cc, d, bold) => {
    if (y > bottom) {
      doc.addPage();
      head();
    }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(doc.splitTextToSize(String(a), 95)[0], M, y);
    doc.text(String(b), R - 60, y, { align: "right" });
    doc.text(String(cc), R - 35, y, { align: "right" });
    doc.text(String(d), R, y, { align: "right" });
    y += 6;
  };
  row("Item", "Price", "Done", "Value", true);
  doc.setDrawColor(200, 200, 200);
  doc.line(M, y - 4, R, y - 4);
  (v.items || []).forEach((it) =>
    row(it.d, gbp(it.sum), (+it.pct || 0) + "%", gbp(((+it.sum || 0) * (+it.pct || 0)) / 100)),
  );
  y += 3;
  const sumRow = (l, val, bold) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(l, R - 40, y, { align: "right" });
    doc.text(val, R, y, { align: "right" });
    y += 6;
  };
  sumRow("Gross value to date", gbp(c.gross));
  sumRow(`Less retention ${+v.ret || 0}%`, "-" + gbp(c.ret));
  sumRow("Less previously applied for", "-" + gbp(c.prev));
  sumRow("Due this application (before VAT)", gbp(c.due), true);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(
    `Payment due ${ukDate(c.dueDate)}. Final date for payment ${ukDate(c.finalDate)}. Any pay less notice must be given by ${ukDate(c.plDate)}.`,
    M,
    y,
    { maxWidth: R - M },
  );
  return doc.output("blob");
}
async function appPdfSave(v) {
  if (!v) return;
  try {
    await S.dl.save({
      filename: `Application ${v.no} – ${v.site || ""}.pdf`.replace(/[\\/:*?"<>|]+/g, " "),
      data: await appPdf(v),
    });
  } catch (e) {
    toast("Couldn't make the PDF");
  }
}
/* the invoice for an application: one line for the amount due, with the retention already taken off */
async function appInvoice(v) {
  if (!v) return;
  const c = appCalc(v);
  if (!(c.due > 0)) {
    toast("Nothing due on this application");
    return;
  }
  try {
    const d = await sdSaveRec({
      type: "invoice",
      date: iso(new Date()),
      dueDate: c.dueDate,
      client: v.client || "",
      clientId: v.clientId || "",
      site: v.site || "",
      title: `Application for payment no. ${v.no}`,
      status: "draft",
      lines: [
        {
          d: `Application for payment no. ${v.no}: work to ${ukDate(v.date)} (valued ${gbp(c.gross)}, less retention and previous applications)`,
          a: c.due,
          vc: sdSet().vatReg === false ? "NV" : sdSet().vc || "S20",
          k: "lab",
        },
      ],
      payments: [],
    });
    await appSave(Object.assign({}, v, { invId: d.id }));
    toast(`Invoice ${sdNo(d)} made as a draft – check it and send it from Estimates & invoices`);
    render();
  } catch (e) {
    toast("Couldn't make the invoice");
  }
}
