/* ================= JOB STORY: the client's job told as it happens – progress photos, signed-off stages and what's been paid ================= */
import { clientSites } from "./address-book.js";
import { saveClient } from "./clients.js";
import { PT, ptOf } from "./portal.js";
import { $, esc, gbp, iso, parse, toast } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { blobUrl, isImg } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { sdCalc, sdNo, sdR2, sdSales, sdStatus } from "../sales/sales-calc.js";
import { vrTot } from "../sales/variations.js";
import { same } from "../sites/project-pages.js";
export { initJobStory, ptStoryHtml, stToggleHtml, stWireToggle, wirePtStory };
/* The client's portal gets a 📖 Job story tab: a summary (the price agreed – the accepted estimate plus signed
   variations – what's been invoiced, paid and left to pay, stages signed off) and a timeline, newest first, of
   the progress photos shared with them, every sign-off, and each invoice and payment.
   Money is James's own record, so the owner's app keeps a copy of just this client's figures on their portal
   record (portal/{uid}.money: { price, invoiced, paid, left, invoices: [{ no, date, title, total, paid, left,
   payments: [{ date, amt }] }], updated }), checked every minute and written only when it changes. Switch it off
   for a client in their portal page (client record storyMoney: false) and the copy is removed. */

/* ---------- the owner's side: this client's money, for their portal ---------- */
function stMoney(c) {
  const sites = clientSites(c);
  const mine = (d) => d.clientId === c.id || (d.site && sites.some((s) => same(s, d.site)));
  const all = sdSales().filter(mine);
  const est = all
    .filter((d) => d.type === "estimate" && d.status === "accepted")
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  const vars = (S.variations || []).filter(
    (v) => v.status === "signed" && sites.some((s) => same(s, v.site)),
  );
  const invs = all
    .filter((d) => d.type === "invoice" && !["draft", "converted"].includes(sdStatus(d)) && !d.af)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (!est && !invs.length && !vars.length) return null;
  const varTot = vars.reduce((a, v) => a + vrTot(v), 0);
  const price = sdR2((est ? sdCalc(est).gross : 0) + varTot);
  const rows = invs.map((d) => {
    const k = sdCalc(d);
    return {
      no: sdNo(d),
      date: d.date || "",
      title: d.title || "",
      total: k.due,
      paid: k.paid,
      left: k.balance,
      payments: (d.payments || []).map((p) => ({ date: p.date || "", amt: sdR2(p.amt) })),
    };
  });
  const invoiced = sdR2(rows.reduce((a, r) => a + r.total, 0));
  const paid = sdR2(rows.reduce((a, r) => a + r.paid, 0));
  return {
    price,
    variations: vars.length,
    invoiced,
    paid,
    left: sdR2(Math.max(price, invoiced) - paid),
    invoices: rows,
  };
}
/* keep each client's portal copy up to date (only writes when something changed) */
const stSent = new Map();
async function stSync() {
  if (!ownerMode() || !S.db) return;
  for (const c of S.clients || []) {
    const p = ptOf(c);
    if (!p) continue;
    let m = null;
    try {
      m = c.storyMoney === false ? null : stMoney(c);
    } catch (e) {
      continue;
    }
    const sig = JSON.stringify(m);
    const had = p.money
      ? JSON.stringify(Object.assign({}, p.money, { updated: undefined }))
      : "null";
    if (
      stSent.get(p.id) === sig ||
      had === JSON.stringify(m && Object.assign({}, m, { updated: undefined }))
    )
      continue;
    try {
      await S.db
        .doc("portal/" + p.id)
        .update({ money: m ? Object.assign({}, m, { updated: Date.now() }) : null });
      stSent.set(p.id, sig);
    } catch (e) {}
  }
}
/* Runs once when the app starts, called from core/boot.js. */
function initJobStory() {
  setTimeout(() => stSync().catch(() => {}), 8000);
  setInterval(() => stSync().catch(() => {}), 60000);
}
/* the switch on the client's portal page */
function stToggleHtml(c) {
  return `<label class="inl st-tog"><input type="checkbox" id="pm-money"${c.storyMoney === false ? "" : " checked"}> Show what's been invoiced and paid in their 📖 Job story</label>`;
}
function stWireToggle(c) {
  const el = $("pm-money");
  if (!el) return;
  el.onchange = async () => {
    try {
      await saveClient(Object.assign({}, c, { storyMoney: el.checked }));
      c.storyMoney = el.checked;
      await stSync();
      toast(
        el.checked
          ? "They'll see what's been invoiced and paid"
          : "Money taken off their job story",
      );
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  };
}
/* ---------- the client's side ---------- */
const stDay = (t) => {
  const d = typeof t === "number" ? new Date(t) : parse(String(t).slice(0, 10));
  return isNaN(d)
    ? ""
    : d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
};
const stKey = (t) => (typeof t === "number" ? iso(new Date(t)) : String(t || "").slice(0, 10));
function ptStoryHtml(C) {
  const m = C.money || null;
  const signs = (PT.signs || []).filter((x) => x.status === "signed");
  const stages = signs.filter((x) => ["stage", "handover"].includes(x.kind));
  const photos = (PT.docs || []).filter((d) => d.folder === "photos" && isImg(d.contentType));
  const ev = [];
  photos.forEach((d) => ev.push({ k: stKey(d.sharedAt), t: d.sharedAt || 0, kind: "photo", d }));
  signs.forEach((x) =>
    ev.push({
      k: stKey(x.signedAt),
      t: x.signedAt || 0,
      kind: "sign",
      icon:
        x.kind === "handover"
          ? "🏁"
          : x.kind === "variation"
            ? "📝"
            : x.kind === "estimate"
              ? "🤝"
              : "✍️",
      text:
        (x.kind === "stage"
          ? "Stage signed off: "
          : x.kind === "handover"
            ? "Handed over: "
            : x.kind === "variation"
              ? "Extra work agreed: "
              : x.kind === "estimate"
                ? "Estimate accepted: "
                : "Signed: ") + (x.title || ""),
      who: x.signedName || "",
    }),
  );
  if (m)
    (m.invoices || []).forEach((r) => {
      ev.push({
        k: r.date,
        t: 0,
        kind: "inv",
        icon: "🧾",
        text: `Invoice ${r.no}${r.title ? " – " + r.title : ""}: ${gbp(r.total)}`,
      });
      (r.payments || []).forEach((p) =>
        ev.push({
          k: p.date,
          t: 0,
          kind: "pay",
          icon: "✓",
          text: `Payment received: ${gbp(p.amt)} (invoice ${r.no})`,
        }),
      );
    });
  /* newest day first; photos of one day together */
  const days = {};
  ev.forEach((e) => {
    if (!e.k) return;
    (days[e.k] = days[e.k] || []).push(e);
  });
  const order = Object.keys(days).sort().reverse();
  const summary = `<div class="card st-sum"><div class="cardbody">
    <b>${esc(C.project || C.site || "Your job")}</b>
    <div class="st-boxes">
      ${m && m.price ? `<div class="st-box"><small>Price agreed</small><b>${gbp(m.price)}</b><span>${m.variations ? `including ${m.variations} extra${m.variations === 1 ? "" : "s"} agreed` : "inc VAT"}</span></div>` : ""}
      ${m ? `<div class="st-box"><small>Invoiced</small><b>${gbp(m.invoiced)}</b><span>${(m.invoices || []).length} invoice${(m.invoices || []).length === 1 ? "" : "s"}</span></div><div class="st-box ok"><small>Paid</small><b>${gbp(m.paid)}</b><span>thank you</span></div><div class="st-box"><small>Left to pay</small><b>${gbp(Math.max(0, m.left))}</b><span>${m.left > 0.005 ? "over the rest of the job" : "all paid ✓"}</span></div>` : ""}
      <div class="st-box"><small>Stages signed off</small><b>${stages.length}</b><span>${signs.length} sign-off${signs.length === 1 ? "" : "s"} in all</span></div>
    </div></div></div>`;
  if (!order.length)
    return (
      summary +
      `<div class="empty"><strong>Your job story starts here</strong>As the work goes on, photos, stages signed off and payments appear here, newest first.</div>`
    );
  return (
    summary +
    `<div class="st-line">${order
      .map((k) => {
        const es = days[k];
        const ph = es.filter((e) => e.kind === "photo");
        const rest = es.filter((e) => e.kind !== "photo");
        return `<div class="st-day"><div class="st-date">${esc(stDay(k))}</div>
          ${rest.map((e) => `<div class="st-ev st-${e.kind}"><span class="st-ic" aria-hidden="true">${e.icon}</span><span>${esc(e.text)}${e.who ? ` <span class="who">– ${esc(e.who)}</span>` : ""}</span></div>`).join("")}
          ${ph.length ? `<div class="st-ev st-photo"><span class="st-ic" aria-hidden="true">📷</span><span>${ph.length} progress photo${ph.length === 1 ? "" : "s"}</span></div><div class="st-photos">${ph.map((e) => `<button type="button" class="st-ph" data-id="${esc(e.d.id)}" aria-label="${esc(e.d.title || "Photo")}"><img src="${esc(blobUrl(e.d.assetId))}" alt="${esc(e.d.title || "Progress photo")}" loading="lazy"></button>`).join("")}</div>` : ""}
        </div>`;
      })
      .join("")}</div>`
  );
}
function wirePtStory() {
  document.querySelectorAll("#main .st-ph").forEach(
    (b) =>
      (b.onclick = () => {
        const d = (PT.docs || []).find((x) => x.id === b.dataset.id);
        if (d) openFile(d.assetId, d.fileName || d.title, d.contentType);
      }),
  );
}
