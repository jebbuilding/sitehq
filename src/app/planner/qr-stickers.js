/* ================= QR STICKERS: a sticker for every van, trailer, digger, machine, tool and ladder – scan it to open that one ================= */
import { $, esc, iso, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { coData } from "../owner/company-details.js";
import { kitLoadQr, kitScan, kitView } from "./kit-out.js";
import { KINDS } from "../safety/checklists.js";
import { openCheck } from "../safety/checks.js";
import { openEqDates } from "../safety/expiry-dates.js";
import { loadJsPdf } from "../safety/site-inductions.js";
export { qrsAll, qrsOwnerOpen, qrsPrint, qrsTradeScan };
/* 🏷 QR stickers (Tools & plant, or Vehicles & plant): James ticks which ones to print – those with no sticker yet are
   ticked to start with – and picks the size: small (21 on an A4 sheet of 70 × 42.4 mm labels) for tools and ladders,
   or large (8 on a sheet of 99.1 × 67.7 mm labels) for vans and plant, readable from further away. Each gets a number
   (vans V-001…, everything else T-001…) kept on its equipment record as tag, and the date its sticker was printed as
   tagAt. The QR code holds "SITEHQ " + the number. Scanning it in the app (📷 Scan a sticker) opens that one: for James
   the tool in Tools & plant (to book out or in) or the van's page (dates, bookings, history); for a trade, on
   📋 Reports, the check for that van or machine with it already picked. */
const QRS_GROUPS = [
  ["vehicle", "🚐 Vans & vehicles"],
  ["trailer", "🛻 Trailers"],
  ["digger", "🚜 Diggers"],
  ["machine", "⚙️ Machinery & small plant"],
  ["ladder", "🪜 Ladders"],
];
const QRS_SIZES = {
  small: {
    n: 21,
    cols: 3,
    W: 70,
    H: 42.4,
    X0: 0,
    Y0: 0,
    label: "Small – 21 on a sheet (70 × 42.4 mm)",
  },
  large: {
    n: 8,
    cols: 2,
    W: 99.1,
    H: 67.7,
    X0: 5.9,
    Y0: 13,
    label: "Large – 8 on a sheet (99.1 × 67.7 mm)",
  },
};
const qrsAll = () =>
  (S.equipment || [])
    .filter((e) => QRS_GROUPS.some(([k]) => k === e.kind))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
const qrsPre = (e) => (e.kind === "vehicle" ? "V-" : "T-");
/* the equipment a scanned number belongs to */
const qrsFind = (tag) =>
  (S.equipment || []).find(
    (e) => String(e.tag || "").toUpperCase() === String(tag || "").toUpperCase(),
  ) || null;
/* give each of these a number for its sticker, carrying on from the highest of its kind */
async function qrsTags(list) {
  const all = S.equipment || [];
  const next = {};
  for (const e of list.filter((x) => !x.tag)) {
    const p = qrsPre(e);
    if (next[p] == null)
      next[p] = Math.max(
        0,
        ...all
          .filter((x) => String(x.tag || "").startsWith(p))
          .map((x) => +String(x.tag).slice(2) || 0),
      );
    next[p]++;
    const tag = p + String(next[p]).padStart(3, "0");
    await S.db.doc("equipment/" + e.id).update({ tag });
    e.tag = tag;
  }
}
function qrsPrint() {
  const all = qrsAll();
  if (!all.length) {
    toast("Add vans, plant, tools and ladders in Setup first");
    return;
  }
  const none = all.filter((e) => !e.tagAt);
  const on = new Set((none.length ? none : all).map((e) => e.id));
  openSheet(
    `<h3 id="sheettitle">🏷 QR stickers to print</h3>
    <div class="who">Stick one on each van, machine, tool and ladder. Scan it in the app (📷 Scan a sticker) to open that one – a trade scanning a van or machine goes straight to its check. Ticked to start with: ${none.length ? "the ones without a sticker yet" : "all of them"}.</div>
    <div class="qrs-all"><button type="button" class="pillbtn" id="qrs-every">Tick all</button><button type="button" class="pillbtn" id="qrs-none">Untick all</button></div>
    ${QRS_GROUPS.map(([k, l]) => {
      const g = all.filter((e) => e.kind === k);
      return g.length
        ? `<div class="flabel">${esc(l)}</div>${g
            .map(
              (e) =>
                `<label class="inl qrs-row"><input type="checkbox" class="qrs-on" data-id="${esc(e.id)}"${on.has(e.id) ? " checked" : ""}> <span>${esc(e.name || "")}${e.tag ? ` <span class="tag">${esc(e.tag)}</span>` : ""}${e.tagAt ? ` <span class="who">printed ${esc(shortDay(iso(new Date(e.tagAt))))}</span>` : ""}</span></label>`,
            )
            .join("")}`
        : "";
    }).join("")}
    <label for="qrs-size">Sticker size<select id="qrs-size">${Object.entries(QRS_SIZES)
      .map(([k, z]) => `<option value="${k}">${esc(z.label)}</option>`)
      .join("")}</select></label>
    <div class="who">Print at 100% (not "fit to page") on a sheet of labels that size. Large ones suit vans and plant: they're easier to scan from further away and outside.</div>
    ${formFoot(false, "Make the sticker sheet")}`,
    async () => {
      const ids = [...document.querySelectorAll(".qrs-on:checked")].map((x) => x.dataset.id);
      if (!ids.length) return showErr("Tick at least one");
      $("f-save").disabled = true;
      try {
        const list = all.filter((e) => ids.includes(e.id));
        await qrsSheet(list, $("qrs-size").value);
        closeForm();
      } catch (e) {
        $("f-save").disabled = false;
        showErr("Couldn't make the stickers – check your connection");
      }
    },
    null,
  );
  const setAll = (v) => document.querySelectorAll(".qrs-on").forEach((x) => (x.checked = v));
  $("qrs-every").onclick = () => setAll(true);
  $("qrs-none").onclick = () => setAll(false);
}
async function qrsSheet(list, size) {
  await qrsTags(list);
  await kitLoadQr();
  await loadJsPdf();
  const z = QRS_SIZES[size] || QRS_SIZES.small;
  const big = z === QRS_SIZES.large;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const co = coData();
  list.forEach((e, i) => {
    const k = i % z.n;
    if (i && !k) doc.addPage();
    const x = z.X0 + (k % z.cols) * z.W,
      y = z.Y0 + Math.floor(k / z.cols) * z.H;
    const q = window.qrcode(0, "M");
    q.addData("SITEHQ " + e.tag);
    q.make();
    const qs = big ? 52 : 32;
    const qx = x + (big ? 5 : 4),
      qy = y + (z.H - qs) / 2;
    doc.addImage(q.createDataURL(8, 0), "GIF", qx, qy, qs, qs);
    const tx = qx + qs + 3,
      tw = z.W - (tx - x) - 3;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(big ? 22 : 14);
    doc.text(e.tag, tx, qy + (big ? 9 : 7));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(big ? 11 : 9);
    const nm = doc.splitTextToSize(e.name || "", tw).slice(0, 3);
    doc.text(nm, tx, qy + (big ? 17 : 13));
    doc.setFontSize(big ? 8.5 : 7);
    const how = doc.splitTextToSize(
      e.kind === "ladder" ? "Scan in SiteHQ" : "Scan in SiteHQ to do its check",
      tw,
    );
    doc.text(how, tx, qy + qs - (big ? 9 : 6));
    doc.setFontSize(big ? 7.5 : 6.5);
    doc.text(doc.splitTextToSize(co.name || "", tw).slice(0, 1), tx, qy + qs - 1);
  });
  await S.dl.save({
    filename: (list.length === 1 ? list[0].name + " sticker" : "QR stickers") + ".pdf",
    data: doc.output("blob"),
  });
  const at = Date.now();
  for (const e of list) {
    await S.db
      .doc("equipment/" + e.id)
      .update({ tagAt: at })
      .catch(() => {});
    e.tagAt = at;
  }
  toast(
    `${list.length} sticker${list.length === 1 ? "" : "s"} ready – print at 100% on ${z.label.split(" – ")[1]} labels`,
  );
}
/* a scanned sticker, for James: a tool opens in Tools & plant, a van (or anything with dates) on its own page */
function qrsOwnerOpen(tag) {
  const e = qrsFind(tag);
  if (!e) {
    toast(tag + " isn't on anything any more");
    kitView();
    return;
  }
  if (e.kind === "vehicle") openEqDates(e);
  else kitView(e.tag);
}
/* for a trade, on Reports: the check for that van or machine, with it picked */
function qrsTradeScan() {
  kitScan((tag) => {
    const e = qrsFind(tag);
    if (!e || !KINDS[e.kind]) {
      toast("That sticker isn't on anything in the app – pick it from the list instead");
      return;
    }
    openCheck(e.kind, null, e.name);
  });
}
