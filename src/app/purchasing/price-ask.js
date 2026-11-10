/* ================= PRICE REQUESTS: one materials list sent to several merchants, their prices side by side, order from the cheapest ================= */
import { $, esc, gbp, iso, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, siteNames } from "../core/state.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { newId } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { BRGB } from "../photos/photos.js";
import { plSupName, poAll, poOrdersSheet, poSave } from "./price-order.js";
import { supMaster } from "./suppliers.js";
import { ukDate } from "../safety/rams-maker.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { lhPics, lhPutBot, lhPutTop } from "../sales/letterhead-setup.js";
import { sdR2 } from "../sales/sales-calc.js";
import { sdShareMail } from "../sales/sales-email.js";
export { rfqListHtml, rfqWireList };
/* Merchants › 📦 Orders › 💬 Ask for prices: James lists the materials for a job once (or copies them from an order),
   ticks the merchants, and each gets the list as an email with a PDF to price. As prices come back he types them in
   (prices already in a merchant's price list fill themselves in). The table shows every merchant's price for every
   line side by side, the cheapest picked out, and each merchant's total; one tap makes the orders – each line from
   whoever is cheapest, or everything from one merchant. Stored in todos/rfq-{id} (kind "rfq"): site, lines [{ d, q,
   u }], sups [ids], prices { supId: { lineIndex: £ each } }, sentAt { supId: time }, ordered. */
const rfqAll = () => (S.rfqs || []).slice().sort((a, b) => (b.created || 0) - (a.created || 0));
async function rfqSave(r) {
  const rec = Object.assign({}, r, { kind: "rfq", updated: Date.now() });
  const id = rec.id || "rfq-" + newId();
  delete rec.id;
  if (!rec.created) rec.created = Date.now();
  await S.db.doc("todos/" + id).set(rec);
  const out = Object.assign({ id }, rec);
  S.rfqs = (S.rfqs || []).filter((x) => x.id !== id).concat([out]);
  return out;
}
/* a merchant's price for a line: typed in, else from their price list */
function rfqPrice(r, sup, i) {
  const t = ((r.prices || {})[sup] || {})[i];
  if (t !== undefined && t !== "" && t !== null) return +t;
  const pl = (S.priceLists || []).find((x) => x.sup === sup);
  const it =
    pl &&
    (pl.items || []).find(
      (x) => String(x.n || "").toLowerCase() === String(r.lines[i].d || "").toLowerCase(),
    );
  return it ? +it.p : null;
}
function rfqListHtml() {
  const L = rfqAll();
  return L.length
    ? `<div class="flabel">💬 Price requests</div>${L.map((r) => `<button type="button" class="incrow rfq-open" data-id="${esc(r.id)}"><span><b>${esc(r.title || r.site || "Materials")}</b> <span class="who">${r.lines.length} items · ${r.sups.length} merchants${r.ordered ? " · ordered" : ""}</span></span><span aria-hidden="true">›</span></button>`).join("")}`
    : "";
}
function rfqWireList() {
  if ($("rfq-new")) $("rfq-new").onclick = () => rfqEdit(null);
  document.querySelectorAll(".rfq-open").forEach(
    (b) =>
      (b.onclick = () => {
        const r = rfqAll().find((x) => x.id === b.dataset.id);
        if (r) rfqTable(r);
      }),
  );
}
function rfqEdit(r0) {
  const sups = supMaster().filter((x) => x.name);
  const sites = siteNames();
  let lines = r0 ? r0.lines.map((l) => Object.assign({}, l)) : [{ d: "", q: 1, u: "" }];
  openSheet(
    `<h3 id="sheettitle">💬 Ask merchants for prices</h3>
    <div class="grid2"><label for="rfq-site">For the job<select id="rfq-site"><option value="">Pick the job…</option>${sites.map((s) => `<option${r0 && r0.site === s ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></label><label for="rfq-title">Name (optional)<input id="rfq-title" maxlength="60" placeholder="e.g. Extension blockwork" value="${esc((r0 && r0.title) || "")}"></label></div>
    <div class="flabel">The materials</div><div id="rfq-lines"></div>
    <div class="actions"><button type="button" class="btn" id="rfq-add">+ Another line</button>${
      poAll().length
        ? `<select id="rfq-from" aria-label="Copy the lines from an order"><option value="">Copy from an order…</option>${poAll()
            .map(
              (o) =>
                `<option value="${esc(o.id)}">${esc(o.number)} · ${esc(o.supName)} · ${esc(o.site || "")}</option>`,
            )
            .join("")}</select>`
        : ""
    }</div>
    <fieldset class="od-who"><legend>Ask these merchants</legend>${sups.map((s) => `<label class="inl"><input type="checkbox" class="rfq-sup" value="${esc(s.id)}"${r0 && r0.sups.includes(s.id) ? " checked" : ""}> ${esc(s.name)}${s.email ? "" : ' <span class="who">(no email)</span>'}</label>`).join("") || '<span class="who">Add your merchants first.</span>'}</fieldset>
    ${formFoot(false, r0 ? "Save" : "Save and send the requests")}`,
    async () => {
      const site = $("rfq-site").value;
      const ls = lines
        .filter((l) => String(l.d).trim() && +l.q > 0)
        .map((l) => ({ d: String(l.d).trim(), q: +l.q, u: l.u || "" }));
      const ss = [...document.querySelectorAll(".rfq-sup:checked")].map((x) => x.value);
      if (!ls.length) return showErr("List the materials");
      if (ss.length < 1) return showErr("Tick the merchants to ask");
      try {
        const r = await rfqSave(
          Object.assign({}, r0 || {}, {
            site,
            title: $("rfq-title").value.trim(),
            lines: ls,
            sups: ss,
            prices: (r0 && r0.prices) || {},
          }),
        );
        closeForm();
        rfqTable(r);
        if (!r0) rfqSend(r);
      } catch (e) {
        showErr("Couldn't save – check your connection");
      }
    },
    "rfq-site",
  );
  const draw = () => {
    $("rfq-lines").innerHTML = lines
      .map(
        (l, i) =>
          `<div class="rfq-line" data-i="${i}"><input class="rfq-d" maxlength="120" placeholder="e.g. 7N dense block 100mm" value="${esc(l.d)}" aria-label="Item ${i + 1}"><input class="rfq-q" type="number" inputmode="decimal" min="0" step="any" value="${esc(l.q)}" aria-label="How many"><input class="rfq-u" maxlength="10" placeholder="each" value="${esc(l.u)}" aria-label="Unit"><button type="button" class="linkdanger rfq-x" aria-label="Remove line ${i + 1}">✕</button></div>`,
      )
      .join("");
    $("rfq-lines")
      .querySelectorAll(".rfq-line")
      .forEach((r) => {
        const l = lines[+r.dataset.i];
        r.querySelector(".rfq-d").oninput = (e) => (l.d = e.target.value);
        r.querySelector(".rfq-q").oninput = (e) => (l.q = e.target.value);
        r.querySelector(".rfq-u").oninput = (e) => (l.u = e.target.value);
        r.querySelector(".rfq-x").onclick = () => {
          lines.splice(+r.dataset.i, 1);
          if (!lines.length) lines.push({ d: "", q: 1, u: "" });
          draw();
        };
      });
  };
  draw();
  $("rfq-add").onclick = () => {
    lines.push({ d: "", q: 1, u: "" });
    draw();
  };
  if ($("rfq-from"))
    $("rfq-from").onchange = (e) => {
      const o = poAll().find((x) => x.id === e.target.value);
      e.target.value = "";
      if (!o) return;
      lines = o.lines.map((l) => ({ d: l.d, q: l.q, u: l.u || "" }));
      if (o.site) $("rfq-site").value = o.site;
      draw();
    };
}
/* the request PDF: the list with blank price columns */
async function rfqPdf(r, supName) {
  await loadJsPdf();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const co = coData(),
    brand = BRGB();
  const M = 20,
    R = 190;
  const pics = await lhPics();
  let y = 48;
  if (pics) {
    y = Math.max(lhPutTop(doc, pics, 44), 30) + 10;
    lhPutBot(doc, pics);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...brand);
    doc.text(co.name, M, 20);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(30, 30, 30);
  doc.text("Request for prices", M, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`To: ${supName} · Job: ${r.site || ""} · ${ukDate(iso(new Date()))}`, M, y);
  y += 9;
  doc.setFont("helvetica", "bold");
  doc.text("Item", M, y);
  doc.text("Qty", R - 70, y, { align: "right" });
  doc.text("Price each", R - 30, y, { align: "right" });
  doc.text("Total", R, y, { align: "right" });
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(M, y, R, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  r.lines.forEach((l) => {
    doc.splitTextToSize(l.d, 100).forEach((t, k) => {
      doc.text(t, M, y);
      if (!k) {
        doc.text(`${l.q} ${l.u || ""}`.trim(), R - 70, y, { align: "right" });
        doc.text("________", R - 30, y, { align: "right" });
        doc.text("________", R, y, { align: "right" });
      }
      y += 6;
    });
  });
  y += 4;
  doc.text(
    "Please give your prices before VAT, delivered to site, and how soon you can deliver.",
    M,
    y,
  );
  return doc.output("blob");
}
async function rfqSend(r, only) {
  const co = coData();
  for (const sid of only ? [only] : r.sups) {
    const s = supMaster().find((x) => x.id === sid) || {};
    try {
      const how = await sdShareMail({
        to: s.email || "",
        subject: `Prices please – ${r.title || r.site || "materials"} – ${co.name}`,
        body: `Hello,\n\nCould you price the attached list for delivery to ${r.site || "our job"}${s.accountNo ? ` (account ${s.accountNo})` : ""}? Prices before VAT please, and how soon you could deliver.\n\nMany thanks\n${co.owner || ""}\n${co.name}`,
        blob: await rfqPdf(r, s.name || ""),
        filename: `Price request ${r.title || r.site || ""} ${s.name || ""}.pdf`.replace(
          /[\\/:*?"<>|]+/g,
          " ",
        ),
      });
      if (!how) continue;
      r = await rfqSave(
        Object.assign({}, r, { sentAt: Object.assign({}, r.sentAt || {}, { [sid]: Date.now() }) }),
      );
    } catch (e) {}
    if (!only && r.sups.length > 1) await new Promise((res) => setTimeout(res, 400));
  }
}
function rfqTable(r) {
  const sups = r.sups.map((id) => supMaster().find((x) => x.id === id) || { id, name: "Merchant" });
  const best = r.lines.map((l, i) => {
    let b = null;
    sups.forEach((s) => {
      const p = rfqPrice(r, s.id, i);
      if (p != null && p > 0 && (!b || p < b.p)) b = { sup: s.id, p };
    });
    return b;
  });
  const tot = (sid) => {
    let t = 0,
      miss = 0;
    r.lines.forEach((l, i) => {
      const p = rfqPrice(r, sid, i);
      if (p == null || !(p > 0)) miss++;
      else t += p * l.q;
    });
    return { t: sdR2(t), miss };
  };
  const bestTot = sdR2(best.reduce((a, b, i) => a + (b ? b.p * r.lines[i].q : 0), 0));
  openViewer(`<div class="rfq-v"><div class="vhead"><b>💬 ${esc(r.title || r.site || "Price request")}</b></div><div class="who">${esc(r.site || "")} · type each merchant's price when it comes back (prices in their price list fill in by themselves)</div>
    <div class="tablewrap"><table class="rfq-tbl"><thead><tr><th>Item</th><th>Qty</th>${sups.map((s) => `<th>${esc(s.name)}${(r.sentAt || {})[s.id] ? '<br><span class="who">asked</span>' : `<br><button type="button" class="linkbtn rfq-ask" data-s="${esc(s.id)}">✉ Ask</button>`}</th>`).join("")}</tr></thead><tbody>${r.lines
      .map(
        (l, i) =>
          `<tr><td>${esc(l.d)}</td><td>${esc(l.q)} ${esc(l.u || "")}</td>${sups
            .map((s) => {
              const p = rfqPrice(r, s.id, i);
              const isB = best[i] && best[i].sup === s.id;
              return `<td class="${isB ? "rfq-best" : ""}"><input class="rfq-p" data-s="${esc(s.id)}" data-i="${i}" type="number" inputmode="decimal" min="0" step="0.01" value="${p != null ? esc(p) : ""}" aria-label="${esc(s.name)} price for ${esc(l.d)}">${isB ? '<span class="rfq-tick">cheapest</span>' : ""}</td>`;
            })
            .join("")}</tr>`,
      )
      .join("")}</tbody><tfoot><tr><td><b>Total</b></td><td></td>${sups
      .map((s) => {
        const t = tot(s.id);
        return `<td><b>${gbp(t.t)}</b>${t.miss ? `<br><span class="who">${t.miss} not priced</span>` : ""}<br><button type="button" class="btn rfq-all" data-s="${esc(s.id)}"${t.miss ? " disabled" : ""}>Order all from them</button></td>`;
      })
      .join("")}</tr></tfoot></table></div>
    <div class="notice">Cheapest for each line: <b>${gbp(bestTot)}</b> + VAT${best.some((b) => !b) ? " (some lines not priced yet)" : ""}.</div>
    <div class="actions"><button type="button" class="btn primary" id="rfq-best"${best.every((b) => !b) ? " disabled" : ""}>📦 Order each line from the cheapest</button><button type="button" class="btn" id="rfq-edit">✎ Change the list or merchants</button></div></div>`);
  document.querySelectorAll(".rfq-p").forEach(
    (inp) =>
      (inp.onchange = async () => {
        const prices = JSON.parse(JSON.stringify(r.prices || {}));
        prices[inp.dataset.s] = prices[inp.dataset.s] || {};
        prices[inp.dataset.s][inp.dataset.i] = inp.value === "" ? "" : sdR2(+inp.value);
        try {
          r = await rfqSave(Object.assign({}, r, { prices }));
          rfqTable(r);
        } catch (e) {
          toast("Couldn't save");
        }
      }),
  );
  document.querySelectorAll(".rfq-ask").forEach((b) => (b.onclick = () => rfqSend(r, b.dataset.s)));
  const order = async (pick) => {
    const by = {};
    r.lines.forEach((l, i) => {
      const s = pick(i);
      if (!s) return;
      (by[s] = by[s] || []).push({ d: l.d, q: l.q, u: l.u || "", p: rfqPrice(r, s, i), for: "" });
    });
    const made = [];
    for (const [sid, ls] of Object.entries(by))
      made.push(
        await poSave({
          site: r.site,
          sup: sid,
          supName: plSupName(sid),
          lines: ls,
          status: "draft",
          rfq: r.id,
        }),
      );
    await rfqSave(Object.assign({}, r, { ordered: Date.now() }));
    closeViewer();
    poOrdersSheet(made);
  };
  $("rfq-best").onclick = () => order((i) => best[i] && best[i].sup);
  document
    .querySelectorAll(".rfq-all")
    .forEach((b) => (b.onclick = () => order(() => b.dataset.s)));
  $("rfq-edit").onclick = () => {
    closeViewer();
    rfqEdit(r);
  };
}
