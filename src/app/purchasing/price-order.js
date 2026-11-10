/* ================= PRICE AND ORDER: merchants' price lists, a drawing's quantities priced, an order per merchant, the job's materials budget ================= */
import { $, esc, gbp, iso, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { BRGB } from "../photos/photos.js";
import { supMaster } from "./suppliers.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { jcJob, jcSave } from "../sales/job-costs.js";
import { lhLogoId, lhPics, lhPutBot, lhPutTop } from "../sales/letterhead-setup.js";
import { sdR2 } from "../sales/sales-calc.js";
import { sdShareMail } from "../sales/sales-email.js";
import { sdImgData, sdLongDate } from "../sales/sales-pdf.js";
import { loadXlsx } from "../timesheets/day-work-xlsx.js";
export { plSupName, plView, poAll, poOrdersSheet, poPdf, poPriceSheet, poSave };
/* Owner-private (prices are never sent to trades, unlike the merchant records):
   - todos/pl-<merchant id> (kind "pricelist"): { sup, items: [{ n (item), u (unit), p (£ before VAT) }], updated }
   - todos/po-<id> (kind "purchaseorder"): { number (PO1…), site, sup, supName, lines: [{ d, q, u, p }], net, status
     "draft" | "sent", sentAt, created } – one order per merchant.
   A drawing's 🧮 Quantities gives lines like ["Blocks for … (+5%)", "1,234 blocks"]; each is matched to the price
   lists by its words (the cheapest good match picked first, any other can be chosen), so the drawing becomes a priced
   materials list, an order for each merchant, and – if wanted – the job's materials budget (jobcost.matBudget). */
const PL_STOP = new Set(
  "the and for with per each approx approximately inc incl including one two both sides side lengths length leaf leaves roughly check every row centres plus top bottom instead outer end".split(
    " ",
  ),
);
/* words, made singular ("blocks" → "block", "ties" → "tie") so the drawing's wording meets the price list's */
const plStem = (w) =>
  w.length > 4 && /ies$/.test(w)
    ? w.slice(0, -3) + "y"
    : w.length > 3 && /s$/.test(w) && !/ss$/.test(w)
      ? w.slice(0, -1)
      : w;
const plWords = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !PL_STOP.has(w) && !/^\d+$/.test(w))
    .map(plStem);
/* the materials themselves: a price-list item must be the same material as the line */
const PL_MATS = new Set(
  "block brick mortar concrete insulation tie plasterboard board stud timber batten noggin nogging plate adhesive steel beam padstone sand cement ballast aggregate membrane dpc dpm lintel plywood ply osb screw nail plaster render skim joist rafter felt tile slate gravel hardcore sub base fixing bead tape".split(
    " ",
  ),
);
const plLists = () => S.priceLists || [];
const plOf = (supId) => plLists().find((l) => l.sup === supId) || { sup: supId, items: [] };
const plSupName = (supId) => {
  const s = supMaster().find((x) => x.id === supId);
  return s ? s.name + (s.loc ? " " + s.loc : "") : "Merchant";
};
async function plSave(supId, items) {
  const rec = { kind: "pricelist", sup: supId, items, updated: Date.now() };
  await S.db.doc("todos/pl-" + supId).set(rec);
}
/* ---------- Merchants › Price lists ---------- */
function plView(seg) {
  const sups = supMaster();
  $("main").innerHTML = `${seg}
    <div class="notice">Your prices from each merchant, before VAT. Only you see them – they're never sent to the trades. A drawing's 🧮 Quantities uses them to price the job and make an order for each merchant.</div>
    ${
      sups.length
        ? `<div class="pl-list">${sups
            .map((s) => {
              const n = plOf(s.id).items.length;
              return `<div class="pl-row"><span><b>${esc(s.name)}</b>${s.loc ? ` <span class="who">${esc(s.loc)}</span>` : ""}<br><span class="who">${n ? `${n} price${n === 1 ? "" : "s"}` : "No prices yet"}</span></span><span class="pl-btns"><button type="button" class="btn pl-edit" data-s="${esc(s.id)}">✎ Prices</button><span class="btn pl-filebtn">⬆ Bring in a price list<input type="file" class="pl-file" data-s="${esc(s.id)}" accept=".csv,.xlsx,.xls,text/csv" aria-label="Bring in ${esc(s.name)}'s price list"></span></span></div>`;
            })
            .join("")}</div>`
        : `<div class="empty"><strong>No merchants yet</strong>Add your merchants on the Merchants tab first.</div>`
    }`;
  document
    .querySelectorAll("#main .pl-edit")
    .forEach((b) => (b.onclick = () => plEdit(b.dataset.s)));
  document.querySelectorAll("#main .pl-file").forEach(
    (fi) =>
      (fi.onchange = async () => {
        const f = fi.files[0];
        fi.value = "";
        if (f) await plImport(fi.dataset.s, f);
      }),
  );
}
function plEdit(supId) {
  let items = plOf(supId).items.map((x) => Object.assign({}, x));
  if (!items.length) items.push({ n: "", u: "", p: "" });
  const rows = () =>
    items
      .map(
        (it, i) =>
          `<div class="pl-item" data-i="${i}"><input class="pl-n" maxlength="120" value="${esc(it.n || "")}" placeholder="Item, e.g. Dense block 440×215×100" aria-label="Item ${i + 1}"><input class="pl-u" maxlength="20" value="${esc(it.u || "")}" placeholder="each" aria-label="Unit ${i + 1}"><input class="pl-p" type="number" inputmode="decimal" step="0.01" value="${esc(it.p === "" || it.p == null ? "" : it.p)}" placeholder="£" aria-label="Price ${i + 1}"><button type="button" class="iconbtn pl-x" aria-label="Remove ${i + 1}">✕</button></div>`,
      )
      .join("");
  openSheet(
    `<h3 id="sheettitle">💷 ${esc(plSupName(supId))}: prices</h3>
    <div class="who">Price before VAT for each item, and what it's sold by (each, m², m³, bag, sheet, m…).</div>
    <input id="pl-q" type="search" placeholder="Find an item" aria-label="Find an item">
    <div id="pl-items"></div>
    <div class="po-acts"><button type="button" class="btn" id="pl-add">+ Another item</button></div>
    ${formFoot(false, "Save prices")}`,
    async () => {
      read();
      const keep = items
        .map((x) => ({ n: String(x.n || "").trim(), u: String(x.u || "").trim(), p: sdR2(x.p) }))
        .filter((x) => x.n && x.p > 0);
      try {
        await plSave(supId, keep);
        closeForm();
        toast(`${keep.length} price${keep.length === 1 ? "" : "s"} saved`);
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
  );
  const read = () =>
    document.querySelectorAll("#pl-items .pl-item").forEach((r) => {
      const it = items[+r.dataset.i];
      it.n = r.querySelector(".pl-n").value;
      it.u = r.querySelector(".pl-u").value;
      it.p = r.querySelector(".pl-p").value;
    });
  const draw = () => {
    $("pl-items").innerHTML = rows();
    document.querySelectorAll("#pl-items .pl-x").forEach(
      (b) =>
        (b.onclick = () => {
          read();
          items.splice(+b.closest(".pl-item").dataset.i, 1);
          draw();
        }),
    );
    filt();
  };
  const filt = () => {
    const q = $("pl-q").value.trim().toLowerCase();
    document
      .querySelectorAll("#pl-items .pl-item")
      .forEach(
        (r) => (r.hidden = !!q && !r.querySelector(".pl-n").value.toLowerCase().includes(q)),
      );
  };
  $("pl-q").oninput = filt;
  $("pl-add").onclick = () => {
    read();
    items.push({ n: "", u: "", p: "" });
    draw();
    const last = document.querySelector("#pl-items .pl-item:last-child .pl-n");
    if (last) last.focus();
  };
  draw();
}
/* a merchant's price list from a spreadsheet or CSV: the columns are found by their headings */
async function plImport(supId, file) {
  let rows;
  try {
    if (/\.xlsx?$/i.test(file.name)) {
      await loadXlsx();
      const wb = window.XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
      rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
        header: 1,
        raw: false,
      });
    } else rows = plCsv(await file.text());
  } catch (e) {
    return toast("Couldn't read that file. Use a spreadsheet or CSV.");
  }
  rows = (rows || []).map((r) => (r || []).map((c) => String(c == null ? "" : c).trim()));
  const hi = rows.findIndex(
    (r) =>
      r.some((c) => /price|cost|£|rate/i.test(c)) &&
      r.some((c) => /desc|item|product|name/i.test(c)),
  );
  if (hi < 0)
    return toast(
      "Couldn't find the item and price columns. They need headings like Description and Price.",
    );
  const h = rows[hi].map((c) => c.toLowerCase());
  const col = (re) => h.findIndex((c) => re.test(c));
  /* the item's words: a Description column first, never a code or number column */
  const notCode = (re) => h.findIndex((c) => re.test(c) && !/code|sku|ref|number|\bno\b|#/.test(c));
  const cN = [notCode(/desc/), notCode(/item|name/), notCode(/product/)].find((x) => x >= 0),
    cU = col(/unit|uom|per|sold by/),
    cP = col(/price|cost|£|rate/);
  const got = [];
  rows.slice(hi + 1).forEach((r) => {
    const n = r[cN] || "";
    const p = sdR2(String(r[cP] || "").replace(/[£,\s]/g, ""));
    if (n && p > 0)
      got.push({ n: n.slice(0, 120), u: cU >= 0 ? (r[cU] || "").slice(0, 20) : "", p });
  });
  if (!got.length) return toast("No prices found in that file");
  /* new prices replace old ones for the same item; others are kept */
  const old = plOf(supId).items.filter(
    (x) => !got.some((g) => g.n.toLowerCase() === x.n.toLowerCase()),
  );
  try {
    await plSave(supId, old.concat(got));
    toast(`${got.length} price${got.length === 1 ? "" : "s"} brought in for ${plSupName(supId)}`);
    render();
  } catch (e) {
    toast("Couldn't save. Check your connection.");
  }
}
function plCsv(text) {
  return String(text || "")
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => {
      const out = [];
      let cell = "",
        q = false;
      for (let i = 0; i < l.length; i++) {
        const ch = l[i];
        if (q) {
          if (ch === '"' && l[i + 1] === '"') {
            cell += '"';
            i++;
          } else if (ch === '"') q = false;
          else cell += ch;
        } else if (ch === '"') q = true;
        else if (ch === "," || ch === ";" || ch === "\t") {
          out.push(cell);
          cell = "";
        } else cell += ch;
      }
      out.push(cell);
      return out;
    });
}
/* ---------- pricing a list of quantities ---------- */
/* "1,234 blocks" → { q: 1234, u: "blocks" } */
const poQty = (s) => {
  const m = String(s || "")
    .replace(/,/g, "")
    .match(/(-?\d+(?:\.\d+)?)\s*(.*)$/);
  return m ? { q: +m[1], u: m[2].trim() } : { q: 0, u: String(s || "") };
};
/* every price-list item that matches a line's words, best and cheapest first */
function poMatches(label) {
  const want = plWords(label);
  const mats = want.filter((w) => PL_MATS.has(w));
  if (!want.length) return [];
  const out = [];
  plLists().forEach((l) =>
    (l.items || []).forEach((it, i) => {
      const have = plWords(it.n);
      if (!have.length) return;
      const same = (w) =>
        have.some((h) => h === w || (w.length > 4 && h.startsWith(w.slice(0, 5))));
      /* the same material is a must when the line names one; then the more words in common the better */
      if (mats.length && !mats.some(same)) return;
      /* and the item's own main material (its last one: "dense concrete BLOCK") must be in the line, so concrete
         blocks don't stand in for concrete */
      const head = have.filter((h) => PL_MATS.has(h)).pop();
      if (
        head &&
        mats.length &&
        !want.some((w) => w === head || (w.length > 4 && head.startsWith(w.slice(0, 5))))
      )
        return;
      const hit = want.filter(same).length;
      if (!hit || (!mats.length && hit / Math.max(2, Math.min(want.length, have.length)) < 0.5))
        return;
      out.push({ sup: l.sup, i, n: it.n, u: it.u, p: +it.p, score: hit });
    }),
  );
  return out.sort((a, b) => b.score - a.score || a.p - b.p);
}
/* the priced list: lines [{ label, qty }] from a drawing (or anywhere) */
function poPriceSheet(lines, site0) {
  const sites = (S.sites || []).filter((s) => !s.archived && s.name).map((s) => s.name);
  const rows = lines.map((l) => {
    const q = poQty(l.qty);
    const ms = poMatches(l.label);
    /* among the best-scoring matches, the cheapest */
    const top = ms.length
      ? ms.filter((m) => m.score === ms[0].score).sort((a, b) => a.p - b.p)[0]
      : null;
    return { label: l.label, q: q.q, u: q.u, ms, pick: top ? top.sup + "|" + top.i : "" };
  });
  const pickOf = (r) => r.ms.find((m) => m.sup + "|" + m.i === r.pick) || null;
  const lineTot = (r) => {
    const m = pickOf(r);
    return m ? sdR2((+r.q || 0) * m.p) : 0;
  };
  const total = () => sdR2(rows.reduce((a, r) => a + lineTot(r), 0));
  const noLists = !plLists().some((l) => (l.items || []).length);
  openSheet(
    `<h3 id="sheettitle">💷 Price it and order</h3>
    <div class="who">Each material matched to your merchants' prices (before VAT), the cheapest good match first. Change the quantity or the merchant as needed.</div>
    ${noLists ? `<div class="notice warn">You haven't put in any merchants' prices yet: Merchants › 💷 Price lists. Until then nothing can be priced.</div>` : ""}
    <label for="po-site">Job<select id="po-site"><option value="">Pick the job…</option>${sites.map((s) => `<option value="${esc(s)}"${s === site0 ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
    <div class="po-lines" id="po-lines"></div>
    <div class="po-tot" id="po-tot"></div>
    <div class="po-acts"><button type="button" class="btn" id="po-budget">💷 Make it the job's materials budget</button></div>
    ${formFoot(false, "📦 Make the orders")}`,
    async () => {
      read();
      const site = $("po-site").value;
      if (!site) return showErr("Pick the job.");
      const by = {};
      rows.forEach((r) => {
        const m = pickOf(r);
        if (!m || !(+r.q > 0)) return;
        (by[m.sup] = by[m.sup] || []).push({
          d: m.n,
          q: +r.q,
          u: m.u || r.u,
          p: m.p,
          for: r.label,
        });
      });
      if (!Object.keys(by).length) return showErr("Nothing priced to order yet.");
      try {
        $("f-save").disabled = true;
        const made = [];
        for (const [sup, ls] of Object.entries(by))
          made.push(
            await poSave({ site, sup, supName: plSupName(sup), lines: ls, status: "draft" }),
          );
        closeForm();
        poOrdersSheet(made);
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
  );
  const read = () =>
    document.querySelectorAll("#po-lines .po-line").forEach((el) => {
      const r = rows[+el.dataset.i];
      r.q = +el.querySelector(".po-q").value || 0;
      const s = el.querySelector(".po-pick");
      r.pick = s ? s.value : "";
    });
  const draw = () => {
    $("po-lines").innerHTML = rows
      .map(
        (r, i) =>
          `<div class="po-line${pickOf(r) ? "" : " po-none"}" data-i="${i}"><div class="po-what">${esc(r.label)}</div><div class="po-row"><input class="po-q" type="number" inputmode="decimal" step="any" value="${esc(r.q)}" aria-label="Quantity for ${esc(r.label)}"><span class="po-u">${esc(r.u)}</span>${
            r.ms.length
              ? `<select class="po-pick" aria-label="Merchant and item for ${esc(r.label)}"><option value="">Not ordering</option>${r.ms.map((m) => `<option value="${esc(m.sup + "|" + m.i)}"${m.sup + "|" + m.i === r.pick ? " selected" : ""}>${esc(plSupName(m.sup))} – ${esc(m.n)} – ${gbp(m.p)}${m.u ? "/" + esc(m.u) : ""}</option>`).join("")}</select>`
              : `<span class="who">No price found – add it to a merchant's price list</span>`
          }<b class="po-lt">${pickOf(r) ? gbp(lineTot(r)) : "–"}</b></div></div>`,
      )
      .join("");
    document.querySelectorAll("#po-lines input, #po-lines select").forEach(
      (el) =>
        (el.oninput = el.onchange =
          () => {
            read();
            const line = el.closest(".po-line");
            const r = rows[+line.dataset.i];
            line.querySelector(".po-lt").textContent = pickOf(r) ? gbp(lineTot(r)) : "–";
            line.classList.toggle("po-none", !pickOf(r));
            tot();
          }),
    );
    tot();
  };
  const tot = () => {
    const priced = rows.filter((r) => pickOf(r)).length;
    $("po-tot").innerHTML =
      `<div class="drow"><span>${priced} of ${rows.length} priced</span><b>${gbp(total())} + VAT</b></div>`;
  };
  $("po-budget").onclick = async () => {
    read();
    const site = $("po-site").value;
    if (!site) return showErr("Pick the job.");
    try {
      await jcSave(Object.assign({}, jcJob(site), { matBudget: total() }));
      toast(`${site}: materials budget set to ${gbp(total())}`);
    } catch (e) {
      showErr("Couldn't save. Check your connection.");
    }
  };
  draw();
}
/* ---------- orders ---------- */
const poAll = () =>
  (S.purchaseOrders || []).slice().sort((a, b) => (b.created || 0) - (a.created || 0));
async function poSave(o) {
  const rec = Object.assign({}, o, { kind: "purchaseorder", updated: Date.now() });
  const id = rec.id || "po-" + newId();
  delete rec.id;
  if (!rec.created) rec.created = Date.now();
  if (!rec.number)
    rec.number =
      "PO" +
      (Math.max(0, ...poAll().map((x) => +String(x.number || "").replace(/\D/g, "") || 0)) + 1);
  rec.net = sdR2((rec.lines || []).reduce((a, l) => a + l.q * l.p, 0));
  await S.db.doc("todos/" + id).set(rec);
  const out = Object.assign({ id }, rec);
  /* keep the list up to date before the database answers, so numbers don't repeat */
  S.purchaseOrders = (S.purchaseOrders || []).filter((x) => x.id !== id).concat([out]);
  return out;
}
function poOrdersSheet(orders) {
  openSheet(
    `<h3 id="sheettitle">📦 ${orders.length} order${orders.length === 1 ? "" : "s"} ready</h3>
    <div class="who">One for each merchant. Email each one, or save the PDF to send another way.</div>
    ${orders
      .map(
        (o, i) =>
          `<div class="po-ord"><div><b>${esc(o.number)} · ${esc(o.supName)}</b><div class="who">${esc(o.site)} · ${o.lines.length} item${o.lines.length === 1 ? "" : "s"} · ${gbp(o.net)} + VAT</div></div><div class="po-acts"><button type="button" class="btn primary po-mail" data-i="${i}">📧 Email it</button><button type="button" class="btn po-pdf" data-i="${i}">📄 PDF</button></div></div>`,
      )
      .join("")}
    ${formFoot(false, "Done")}`,
    async () => {
      closeForm();
      render();
    },
  );
  document.querySelectorAll(".po-pdf").forEach(
    (b) =>
      (b.onclick = async () => {
        const o = orders[+b.dataset.i];
        try {
          await S.dl.save({ filename: `Order ${o.number} ${o.supName}.pdf`, data: await poPdf(o) });
        } catch (e) {
          toast("Couldn't make the PDF. Check your connection.");
        }
      }),
  );
  document.querySelectorAll(".po-mail").forEach(
    (b) =>
      (b.onclick = async () => {
        const o = orders[+b.dataset.i];
        const sup = supMaster().find((x) => x.id === o.sup) || {};
        const co = coData();
        try {
          const how = await sdShareMail({
            to: sup.email || "",
            subject: `Order ${o.number} – ${co.name} – ${o.site}`,
            body: `Hello,\n\nPlease find our order ${o.number} attached, for delivery to ${o.site}${sup.accountNo ? ` (account ${sup.accountNo})` : ""}.\n\nPlease confirm prices and the delivery date.\n\nKind regards\n${co.owner || ""}\n${co.name || ""}`,
            blob: await poPdf(o),
            filename: `Order ${o.number} ${o.supName}.pdf`,
          });
          if (!how) return;
          orders[+b.dataset.i] = await poSave(
            Object.assign({}, o, { status: "sent", sentAt: Date.now() }),
          );
          b.textContent = "✓ Sent";
        } catch (e) {
          toast("Couldn't send it. Check your connection.");
        }
      }),
  );
}
async function poPdf(o) {
  await loadJsPdf();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const brand = BRGB(),
    co = coData();
  const sup = supMaster().find((x) => x.id === o.sup) || {};
  const pics = await lhPics();
  let y = pics ? lhPutTop(doc, pics, 0) + 12 : 20;
  if (!pics) {
    const logo = await sdImgData(lhLogoId());
    if (logo) {
      const k = Math.min(55 / logo.w, 25 / logo.h);
      doc.addImage(logo.u, logo.f, 16, 8, logo.w * k, logo.h * k, "pologo", "FAST");
    }
    doc.setDrawColor(...brand);
    doc.setLineWidth(0.7);
    doc.line(3, 38, 207, 38);
    y = 50;
  }
  const M = 20,
    R = 190,
    bot = pics && pics.bot ? pics.bot.y - 10 : 275;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...brand);
  doc.text("Purchase order " + o.number, M, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  const kv = (k, v) => {
    if (!v) return;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110, 110, 110);
    doc.text(k, M, y);
    doc.setTextColor(20, 20, 20);
    doc.text(doc.splitTextToSize(String(v), R - M - 40), M + 40, y);
    y += 5.5;
  };
  kv("To", o.supName);
  kv("Account", sup.accountNo || "");
  kv("From", co.name);
  kv("Deliver to", o.site);
  kv("Date", sdLongDate(iso(new Date(o.created || Date.now()))));
  y += 4;
  const head = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setFillColor(240, 240, 240);
    doc.rect(M, y - 4.5, R - M, 7, "F");
    doc.text("Item", M + 2, y);
    doc.text("Qty", 128, y, { align: "right" });
    doc.text("Unit", 132, y);
    doc.text("Price", 166, y, { align: "right" });
    doc.text("Total", R - 2, y, { align: "right" });
    y += 7;
  };
  head();
  doc.setFont("helvetica", "normal");
  o.lines.forEach((l) => {
    const t = doc.splitTextToSize(l.d, 100);
    if (y + t.length * 4.6 > bot) {
      doc.addPage();
      y = pics ? lhPutTop(doc, pics, 0) + 10 : 20;
      head();
      doc.setFont("helvetica", "normal");
    }
    doc.text(t, M + 2, y);
    doc.text(String(l.q), 128, y, { align: "right" });
    doc.text(String(l.u || ""), 132, y);
    doc.text(gbp(l.p), 166, y, { align: "right" });
    doc.text(gbp(l.q * l.p), R - 2, y, { align: "right" });
    y += t.length * 4.6 + 1.6;
  });
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(120, y - 3, R, y - 3);
  const tot = (k, v, b) => {
    doc.setFont("helvetica", b ? "bold" : "normal");
    doc.text(k, 166, y, { align: "right" });
    doc.text(gbp(v), R - 2, y, { align: "right" });
    y += 5.5;
  };
  tot("Total before VAT", o.net, true);
  tot("VAT at 20%", sdR2(o.net * 0.2));
  tot("Total", sdR2(o.net * 1.2), true);
  y += 4;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text("Prices from our last price list – please confirm before delivery.", M, y);
  if (pics && pics.bot) {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      lhPutBot(doc, pics);
    }
  }
  return doc.output("blob");
}
