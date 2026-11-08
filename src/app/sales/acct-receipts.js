/* ================= ACCOUNTS RECEIPTS: snap a receipt, Claude reads it, it's matched to the bank payment ================= */
import { addDays, esc, gbp, iso, parse, shortDay, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { blobUrl, uploadFile } from "../files/files.js";
import { getFileBlob, loadPdfJs } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { allTeam, nameOf } from "../owner/owner.js";
import { shrinkImage } from "../safety/training.js";
import { AC_CATS, acAllTx, acUpdateTx } from "./acct-data.js";
import { acRcptSheet } from "./acct-review.js";
import { sdR2 } from "./sales-calc.js";
export {
  acAddRcpts,
  acFileTradeRc,
  acLinkRcpt,
  acMatchWaiting,
  acRcptMatch,
  acRcptParts,
  acReceipts,
  acSaveRcpt,
  acTradeRcpts,
  acTradeRcptsHtml,
};
/* Like Hubdoc: take a photo (or several), Claude reads the shop, date, total, VAT and VAT number and suggests a
   category; James checks it and saves. Each receipt is matched to the bank payment of the same amount within a
   week (the payment gets the receipt, its VAT and the category); receipts paid in cash or with his own money count
   as costs by themselves. Reading needs Claude (the live app); without it the receipt is typed in by hand.
   Owner-private records: todos/rc-{id} (kind "acrcpt"): { assetId, supplier, date, total, vat, vatNo, cat, paid
   ("card"|"cash"|"own"), desc, note, status ("reading"|"check"|"done"), tx ("rec|id" of the matched payment) }. */
const AC_PAID = { card: "Business card / bank", cash: "Cash", own: "My own money" };
const acReceipts = () =>
  (S.acRcpts || [])
    .slice()
    .sort(
      (a, b) => (b.date || "").localeCompare(a.date || "") || (b.created || 0) - (a.created || 0),
    );
async function acSaveRcpt(r) {
  const rec = Object.assign({}, r, { kind: "acrcpt", updated: Date.now() });
  const id = rec.id || "rc-" + newId();
  delete rec.id;
  if (!rec.created) rec.created = Date.now();
  await S.db.doc("todos/" + id).set(rec);
  return Object.assign({ id }, rec);
}
/* the bank payment this receipt is for: money out of the same amount, within 7 days, not already holding a receipt */
function acRcptMatch(r) {
  if (!(+r.total > 0) || !r.date || r.type === "credit") return null;
  const d0 = parse(r.date).getTime();
  const acct = r.paid === "acct";
  const d1 = acct ? parse(r.due || iso(addDays(parse(r.date), 30))).getTime() : d0;
  const taken = new Set(
    acReceipts()
      .filter((x) => x.tx && x.id !== r.id)
      .map((x) => x.tx),
  );
  return (
    acAllTx()
      .filter(
        (t) =>
          t.amt < 0 &&
          Math.abs(Math.abs(t.amt) - +r.total) < 0.015 &&
          !taken.has(t.rec + "|" + t.id),
      )
      .map((t) => {
        const at = parse(t.date).getTime();
        const gap = acct
          ? at < d0 - 864e5
            ? 99
            : Math.max(0, (at - d1) / 864e5)
          : Math.abs(at - d0) / 864e5;
        return Object.assign({ gap }, t);
      })
      .filter((t) => t.gap <= (acct ? 14 : 7))
      .sort((a, b) => a.gap - b.gap)[0] || null
  );
}
/* ask Claude to read the photo; resolves the fields it found, or null */
async function acReadRcpt(blob) {
  let sample = null;
  try {
    sample = await window.claude.use("sample");
  } catch (e) {}
  if (!sample) return null;
  try {
    const lim = await sample.limits().catch(() => null);
    if (!lim || !lim.images) return null;
  } catch (e) {
    return null;
  }
  const cats = AC_CATS.filter((c) => c[2] === "out")
    .map((c) => `${c[0]} = ${c[1]}`)
    .join("; ");
  const prompt = `This photo is a receipt or bill for a UK building company. Read it and reply with JSON only, no other words:
{"supplier": shop or company name, "date": "YYYY-MM-DD", "total": total paid as a number, "vat": VAT amount as a number (0 if none shown), "vatNo": the seller's VAT number or "", "desc": a few words on what was bought, "cat": one of these codes: ${cats}, "paid": "card" or "cash" (as printed, else "card")}
If something can't be read, use "" (or 0 for numbers). UK dates are day/month/year.`;
  const j = await sample.json(prompt, { images: [blob], modelTier: "default" });
  if (!j || typeof j !== "object") return null;
  const num = (v) => {
    const n = +String(v == null ? "" : v).replace(/[£,\s]/g, "");
    return isNaN(n) ? 0 : sdR2(n);
  };
  return {
    supplier: String(j.supplier || "").slice(0, 80),
    date: /^\d{4}-\d{2}-\d{2}$/.test(j.date || "") ? j.date : "",
    total: num(j.total),
    vat: num(j.vat),
    vatNo: String(j.vatNo || "")
      .replace(/\s/g, "")
      .slice(0, 14),
    desc: String(j.desc || "").slice(0, 120),
    cat: AC_CATS.some((c) => c[0] === j.cat && c[2] === "out") ? j.cat : "oexp",
    paid: j.paid === "cash" ? "cash" : "card",
  };
}
/* new photos: save each straight away, then let Claude read them one by one */
async function acAddRcpts(files) {
  const made = [];
  for (const f of files) {
    try {
      const pdf = /pdf/i.test(f.type) || /\.pdf$/i.test(f.name || "");
      const blob = !pdf && /^image\//.test(f.type) ? await shrinkImage(f, 1800) : f;
      const a = await uploadFile(blob, f.name || (pdf ? "bill.pdf" : "receipt.jpg"));
      made.push([
        await acSaveRcpt({
          assetId: a.id,
          ctype: pdf ? "application/pdf" : "image/jpeg",
          type: pdf ? "bill" : "receipt",
          status: "reading",
          paid: "card",
          date: "",
          total: 0,
          vat: 0,
        }),
        blob,
      ]);
    } catch (e) {
      toast("Couldn't save a photo. Check your connection.");
    }
  }
  S.f.act = "rcpt";
  if (made.length) {
    S.f.acsel = made[0][0].id;
    S.f.acrf = "all";
  }
  render();
  let read = 0,
    last = null;
  for (const [r, blob] of made) {
    let got = null;
    try {
      got = await acReadRcpt(r.ctype === "application/pdf" ? await acPdfPicture(blob) : blob);
    } catch (e) {
      got = null;
    }
    if (got) read++;
    last = await acSaveRcpt(Object.assign({}, r, got || {}, { status: "check" }));
  }
  toast(
    read
      ? `Claude read ${read} receipt${read === 1 ? "" : "s"} – check ${read === 1 ? "it" : "them"} and save`
      : made.length
        ? "Saved. Type in the details (Claude can read receipts in the live app)"
        : "",
  );
  render();
  if (last && made.length === 1) S.f.acsel = last.id;
}
/* put the receipt on its bank payment: category, VAT and a link to the photo */
async function acLinkRcpt(r) {
  if (r.type === "credit") {
    if (r.tx) await acUpdateTx({ [r.tx]: { rcpt: "" } });
    if (r.tx) await acSaveRcpt(Object.assign({}, r, { tx: "" }));
    return "Credit note saved – taken off your costs";
  }
  if (r.paid !== "card" && r.paid !== "acct") {
    if (r.tx) await acUpdateTx({ [r.tx]: { rcpt: "" } });
    if (r.tx) await acSaveRcpt(Object.assign({}, r, { tx: "" }));
    return (
      "Receipt saved (counted as a cost paid " +
      (r.paid === "cash" ? "in cash" : "with your own money") +
      ")"
    );
  }
  const t = r.tx ? acAllTx().find((x) => x.rec + "|" + x.id === r.tx) : acRcptMatch(r);
  if (!t)
    return r.paid === "acct"
      ? "Bill saved – it'll be matched when you pay it"
      : "Receipt saved – it'll be matched when the bank statement comes in";
  const k = t.rec + "|" + t.id;
  await acUpdateTx({
    [k]: { cat: r.cat, vat: r.vat || 0, rcpt: r.id, note: t.note || r.desc || "" },
  });
  if (r.tx !== k) await acSaveRcpt(Object.assign({}, r, { tx: k }));
  return "Receipt saved and matched to the bank payment on " + shortDay(t.date);
}
/* after a statement comes in: match receipts waiting for their payment */
async function acMatchWaiting() {
  let n = 0;
  for (const r of acReceipts().filter(
    (x) =>
      x.status === "done" &&
      (x.paid === "card" || x.paid === "acct") &&
      x.type !== "credit" &&
      !x.tx,
  )) {
    const t = acRcptMatch(r);
    if (!t) continue;
    await acUpdateTx({ [t.rec + "|" + t.id]: { cat: r.cat, vat: r.vat || 0, rcpt: r.id } });
    await acSaveRcpt(Object.assign({}, r, { tx: t.rec + "|" + t.id }));
    n++;
  }
  return n;
}

/* ---------- the trades' receipts (sent from their app) ---------- */
const AC_RC_CAT = { fuel: "veh", materials: "mat", tools: "tools", parking: "veh", other: "oexp" };
const AC_RC_TYPE = {
  fuel: "Fuel",
  materials: "Materials",
  tools: "Tools & hire",
  parking: "Parking & tolls",
  other: "Other",
};
/* trades' receipts not yet brought into the accounts */
function acTradeRcpts() {
  const done = new Set(
    acReceipts()
      .map((r) => r.src)
      .filter(Boolean),
  );
  return allTeam("invoices")
    .filter((v) => v.kind === "receipt" && !done.has(v.who + "|" + v.id))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
function acTradeRcptsHtml() {
  const list = acTradeRcpts();
  const owed = allTeam("invoices").filter(
    (v) => v.kind === "receipt" && v.paidBy === "own" && !v.repaid,
  );
  const owedHtml = owed.length
    ? `<section class="card ac-owed"><div class="cardbody"><b>Owed back to your trades: ${gbp(owed.reduce((a, v) => a + (+v.amount || 0), 0))}</b><div class="who">Receipts they paid with their own money. Tap Paid back once you've paid them.</div>${owed
        .map(
          (v) =>
            `<div class="jf-item"><span class="jf-ic">💷</span><span class="jf-nm"><b>${esc(nameOf(v.who))} · ${v.amount != null ? gbp(v.amount) : ""}</b><small>${esc([shortDay(v.date), v.supplier, v.site].filter(Boolean).join(" · "))}</small></span><button type="button" class="btn ac-repaid" data-w="${esc(v.who)}" data-id="${esc(v.id)}">✓ Paid back</button></div>`,
        )
        .join("")}</div></section>`
    : "";
  if (!list.length) return owedHtml;
  return (
    owedHtml +
    `<section class="card ac-trc"><div class="cardbody"><b>From your trades (${list.length})</b>
    <div class="who">Receipts your trades sent from their app. Tap File it: it goes into the accounts in the right category, Claude reads the VAT off the photo, and it's matched to your bank payment (or noted as owed back if they paid with their own money).</div>
    ${list
      .slice(0, 30)
      .map(
        (v) =>
          `<div class="jf-item">${v.fileId ? `<img src="${esc(blobUrl(v.fileId))}" alt="" loading="lazy">` : '<span class="jf-ic">🧾</span>'}<span class="jf-nm"><b>${esc(nameOf(v.who))} · ${esc(AC_RC_TYPE[v.type] || "Receipt")}${v.amount != null ? " · " + gbp(v.amount) : ""}</b><small>${esc([shortDay(v.date), v.supplier, v.site, v.paidBy === "own" ? "their own money – pay them back" : "company card / account"].filter(Boolean).join(" · "))}</small></span><button type="button" class="btn primary ac-trf" data-k="${esc(v.who + "|" + v.id)}">File it</button></div>`,
      )
      .join("")}
  </div></section>`
  );
}
/* bring one in: a receipt record in the right category, the VAT read from the photo, then checked and matched */
async function acFileTradeRc(k) {
  const v = acTradeRcpts().find((x) => x.who + "|" + x.id === k);
  if (!v) return;
  toast("Filing it…");
  let r = {
    src: k,
    who: v.who,
    assetId: v.fileId || "",
    supplier: v.supplier || "",
    date: v.date || iso(new Date()),
    total: +v.amount || 0,
    vat: 0,
    cat: AC_RC_CAT[v.type] || "oexp",
    paid: v.paidBy === "own" ? "own" : "card",
    desc: [AC_RC_TYPE[v.type], v.site, v.vehicle, v.notes]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 120),
    site: v.site || "",
    status: "check",
  };
  try {
    if (v.fileId && /^image\//.test(v.contentType || "image/jpeg")) {
      const got = await acReadRcpt(await getFileBlob(v.fileId)).catch(() => null);
      if (got)
        r = Object.assign(r, {
          vat: got.vat || 0,
          vatNo: got.vatNo || "",
          supplier: r.supplier || got.supplier,
          total: r.total || got.total,
        });
    }
    const saved = await acSaveRcpt(r);
    try {
      await S.db.doc("sheets/" + v.who + "/invoices/" + v.id).update({ checked: true });
    } catch (e) {}
    S.f.act = "rcpt";
    render();
    acRcptSheet(saved);
  } catch (e) {
    toast("Couldn't file it. Check your connection.");
  }
}

/* the first page of a PDF bill as a picture, for Claude to read */
async function acPdfPicture(blob) {
  await loadPdfJs();
  const pdf = await window.pdfjsLib.getDocument({
    data: new Uint8Array(await blob.arrayBuffer()),
    isEvalSupported: false,
  }).promise;
  const pg = await pdf.getPage(1);
  const v1 = pg.getViewport({ scale: 1 });
  const v = pg.getViewport({ scale: Math.min(2.5, 1800 / Math.max(v1.width, v1.height)) });
  const cv = document.createElement("canvas");
  cv.width = Math.round(v.width);
  cv.height = Math.round(v.height);
  const g = cv.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, cv.width, cv.height);
  await pg.render({ canvasContext: g, viewport: v }).promise;
  return await new Promise((res) => cv.toBlob(res, "image/jpeg", 0.85));
}
/* what a receipt costs, in parts: one per line when split, each with its category, site and share of the VAT;
   a credit note counts as minus */
function acRcptParts(r) {
  const sign = r.type === "credit" ? -1 : 1;
  const total = +r.total || 0,
    vat = +r.vat || 0;
  const ls =
    r.multi && (r.lines || []).length
      ? r.lines
      : [{ desc: r.desc || "", amt: total, cat: r.cat || "oexp", site: r.site || "" }];
  return ls.map((l) => {
    const share = total ? (+l.amt || 0) / total : 0;
    const lv = sdR2(vat * share);
    return {
      desc: l.desc || r.desc || "",
      gross: sdR2(sign * (+l.amt || 0)),
      vat: sdR2(sign * lv),
      net: sdR2(sign * ((+l.amt || 0) - lv)),
      cat: l.cat || r.cat || "oexp",
      site: l.site || "",
    };
  });
}
