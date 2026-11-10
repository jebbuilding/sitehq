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
   ticked to start with – and picks the label sheet: square 45 × 45 mm, 20 on an A4 sheet (Avery L7124 and the like,
   4 across, 5 down) – his usual; small (21 on a sheet of 70 × 42.4 mm); or large (8 on a sheet of 99.1 × 67.7 mm) for
   vans and plant. A picture of the sheet shows where each sticker goes: tapping a space marks it as already used (for
   a part-used sheet), and the stickers fill the free spaces in order, then carry on onto fresh sheets. If the print
   sits a little off the labels, "Line up" moves everything right/down by up to 5 mm; a lining-up sheet (just the
   outlines, numbered) can be printed on plain paper and held against a label sheet to check. The sheet, the used
   spaces' layout choice and the nudge are remembered in settings/app.qrs { size, dx, dy }.
   Each sticker gets a number (vans V-001…, everything else T-001…) kept on its equipment record as tag, and the date
   its sticker was printed as tagAt. The QR code holds "SITEHQ " + the number. Scanning it in the app (📷 Scan a
   sticker) opens that one: for James the tool in Tools & plant (to book out or in) or the van's page (dates,
   bookings, history); for a trade, on 📋 Reports, the check for that van or machine with it already picked. */
const QRS_GROUPS = [
  ["vehicle", "🚐 Vans & vehicles"],
  ["trailer", "🛻 Trailers"],
  ["digger", "🚜 Diggers"],
  ["machine", "⚙️ Machinery & small plant"],
  ["ladder", "🪜 Ladders"],
];
/* label sheets (A4, mm): n labels, cols across, each W × H, a step of PX across and PY down, the first one's top-left
   corner at X0, Y0, corners rounded by r. The square sheet's layout is from the maker's template (SQ45 / L7124). */
const QRS_SIZES = {
  square: {
    n: 20,
    cols: 4,
    W: 45,
    H: 45,
    PX: 48,
    PY: 48,
    X0: 10.5,
    Y0: 30,
    r: 2,
    label: "Square 45 × 45 mm – 20 on a sheet (Avery L7124)",
  },
  small: {
    n: 21,
    cols: 3,
    W: 70,
    H: 42.4,
    PX: 70,
    PY: 42.4,
    X0: 0,
    Y0: 0,
    r: 0,
    label: "Small 70 × 42.4 mm – 21 on a sheet",
  },
  large: {
    n: 8,
    cols: 2,
    W: 99.1,
    H: 67.7,
    PX: 99.1,
    PY: 67.7,
    X0: 5.9,
    Y0: 13,
    r: 0,
    label: "Large 99.1 × 67.7 mm – 8 on a sheet",
  },
};
const qrsCfg = () => Object.assign({ size: "square", dx: 0, dy: 0 }, (S.settings || {}).qrs || {});
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
/* where each sticker goes: [sheet, space] for each of n stickers, skipping the used spaces on the first sheet */
function qrsPlaces(n, z, used) {
  const out = [];
  let sheet = 0,
    k = 0;
  while (out.length < n) {
    if (!(sheet === 0 && used.has(k))) out.push([sheet, k]);
    k++;
    if (k >= z.n) {
      k = 0;
      sheet++;
    }
  }
  return out;
}
function qrsPrint() {
  const all = qrsAll();
  if (!all.length) {
    toast("Add vans, plant, tools and ladders in Setup first");
    return;
  }
  const cfg = qrsCfg();
  const none = all.filter((e) => !e.tagAt);
  const on = new Set((none.length ? none : all).map((e) => e.id));
  const used = new Set();
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
    <label for="qrs-size">Label sheet<select id="qrs-size">${Object.entries(QRS_SIZES)
      .map(
        ([k, z]) =>
          `<option value="${k}"${k === cfg.size ? " selected" : ""}>${esc(z.label)}</option>`,
      )
      .join("")}</select></label>
    <div class="flabel">Where they go on the sheet</div>
    <div class="who">Tap any space you've already used on this sheet and it's left empty. The stickers fill the rest in order.</div>
    <div class="qrs-sheet" id="qrs-grid"></div>
    <div class="who" id="qrs-more"></div>
    <details class="qrs-line"><summary>Line up (if the print sits off the labels)</summary>
      <div class="grid2"><label for="qrs-dx">Move right (mm, minus = left)<input id="qrs-dx" type="number" inputmode="decimal" step="0.5" min="-5" max="5" value="${esc(cfg.dx)}"></label><label for="qrs-dy">Move down (mm, minus = up)<input id="qrs-dy" type="number" inputmode="decimal" step="0.5" min="-5" max="5" value="${esc(cfg.dy)}"></label></div>
      <button type="button" class="btn" id="qrs-test">Print a lining-up sheet (plain paper)</button>
      <div class="who">Print it on plain paper, hold it behind a label sheet against a window, and see whether the boxes sit on the labels. Move them here if not; it's remembered.</div>
    </details>
    <div class="who">Print at 100% (not "fit to page").</div>
    ${formFoot(false, "Make the sticker sheet")}`,
    async () => {
      const list = chosen();
      if (!list.length) return showErr("Tick at least one");
      $("f-save").disabled = true;
      try {
        await qrsKeep();
        await qrsSheet(list, $("qrs-size").value, used, nudge());
        closeForm();
      } catch (e) {
        $("f-save").disabled = false;
        showErr("Couldn't make the stickers – check your connection");
      }
    },
    null,
  );
  const chosen = () => {
    const ids = [...document.querySelectorAll(".qrs-on:checked")].map((x) => x.dataset.id);
    return all.filter((e) => ids.includes(e.id));
  };
  const clamp = (v) => Math.max(-5, Math.min(5, +v || 0));
  const nudge = () => ({ dx: clamp($("qrs-dx").value), dy: clamp($("qrs-dy").value) });
  /* remember the sheet and the nudge for next time */
  const qrsKeep = async () => {
    const qrs = Object.assign({ size: $("qrs-size").value }, nudge());
    const c0 = qrsCfg();
    if (c0.size === qrs.size && c0.dx === qrs.dx && c0.dy === qrs.dy) return;
    await S.db
      .doc("settings/app")
      .update({ qrs })
      .catch(() => {});
    S.settings = Object.assign({}, S.settings, { qrs });
  };
  /* the picture of the first sheet: each space shows the sticker going there, or ✕ if it's used */
  const draw = () => {
    const z = QRS_SIZES[$("qrs-size").value] || QRS_SIZES.square;
    [...used].forEach((k) => k >= z.n && used.delete(k));
    const list = chosen();
    const pl = qrsPlaces(list.length, z, used);
    const at = {};
    pl.forEach(([s, k], i) => s === 0 && (at[k] = list[i]));
    const g = $("qrs-grid");
    g.style.gridTemplateColumns = `repeat(${z.cols}, 1fr)`;
    g.style.setProperty("--qrs-ar", `${z.W} / ${z.H}`);
    g.innerHTML = Array.from({ length: z.n }, (_, k) => {
      const e = at[k];
      return `<button type="button" class="qrs-cell${used.has(k) ? " qrs-used" : e ? " qrs-fill" : ""}" data-k="${k}" aria-pressed="${used.has(k)}" aria-label="Space ${k + 1}${used.has(k) ? ", already used" : e ? ", " + esc(e.name || "") : ", empty"}">${used.has(k) ? "✕" : e ? `<b>${esc(e.tag || "new")}</b><span>${esc(e.name || "")}</span>` : ""}</button>`;
    }).join("");
    const sheets = pl.length ? pl[pl.length - 1][0] + 1 : 0;
    const free = z.n - used.size;
    $("qrs-more").textContent = !list.length
      ? "Nothing ticked yet."
      : sheets > 1
        ? `${list.length} stickers: ${Math.min(list.length, free)} on this sheet, the rest on ${sheets - 1} more sheet${sheets > 2 ? "s" : ""}.`
        : `${list.length} sticker${list.length === 1 ? "" : "s"} on this sheet.`;
    g.querySelectorAll(".qrs-cell").forEach(
      (b) =>
        (b.onclick = () => {
          const k = +b.dataset.k;
          if (used.has(k)) used.delete(k);
          else if (used.size < z.n - 1) used.add(k);
          draw();
        }),
    );
  };
  const setAll = (v) => {
    document.querySelectorAll(".qrs-on").forEach((x) => (x.checked = v));
    draw();
  };
  $("qrs-every").onclick = () => setAll(true);
  $("qrs-none").onclick = () => setAll(false);
  document.querySelectorAll(".qrs-on").forEach((x) => (x.onchange = draw));
  $("qrs-size").onchange = draw;
  $("qrs-test").onclick = async () => {
    try {
      await qrsKeep();
      await qrsTest($("qrs-size").value, nudge());
    } catch (e) {
      toast("Couldn't make it – check your connection");
    }
  };
  draw();
}
/* the corner of space k, moved by the nudge */
const qrsXY = (z, k, nd) => [
  z.X0 + (k % z.cols) * z.PX + ((nd && nd.dx) || 0),
  z.Y0 + Math.floor(k / z.cols) * z.PY + ((nd && nd.dy) || 0),
];
async function qrsSheet(list, size, used, nd) {
  await qrsTags(list);
  await kitLoadQr();
  await loadJsPdf();
  const z = QRS_SIZES[size] || QRS_SIZES.square;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const co = coData();
  let page = 0;
  qrsPlaces(list.length, z, used || new Set()).forEach(([s, k], i) => {
    const e = list[i];
    while (page < s) {
      doc.addPage();
      page++;
    }
    const [x, y] = qrsXY(z, k, nd);
    const q = window.qrcode(0, "M");
    q.addData("SITEHQ " + e.tag);
    q.make();
    doc.setTextColor(0, 0, 0);
    if (size === "square") {
      /* the code across the top, the number and the name under it */
      const qs = 30;
      doc.addImage(q.createDataURL(8, 0), "GIF", x + (z.W - qs) / 2, y + 2.5, qs, qs);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(e.tag, x + z.W / 2, y + 37.2, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(doc.splitTextToSize(e.name || "", z.W - 5)[0] || "", x + z.W / 2, y + 41.4, {
        align: "center",
      });
      return;
    }
    const big = size === "large";
    const qs = big ? 52 : 32;
    const qx = x + (big ? 5 : 4),
      qy = y + (z.H - qs) / 2;
    doc.addImage(q.createDataURL(8, 0), "GIF", qx, qy, qs, qs);
    const tx = qx + qs + 3,
      tw = z.W - (tx - x) - 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(big ? 22 : 14);
    doc.text(e.tag, tx, qy + (big ? 9 : 7));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(big ? 11 : 9);
    doc.text(doc.splitTextToSize(e.name || "", tw).slice(0, 3), tx, qy + (big ? 17 : 13));
    doc.setFontSize(big ? 8.5 : 7);
    doc.text(
      doc.splitTextToSize(
        e.kind === "ladder" ? "Scan in SiteHQ" : "Scan in SiteHQ to do its check",
        tw,
      ),
      tx,
      qy + qs - (big ? 9 : 6),
    );
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
    `${list.length} sticker${list.length === 1 ? "" : "s"} ready – print at 100% on ${z.label.split(" – ")[0].replace(/^\S+\s/, "")} labels`,
  );
}
/* plain paper: each label's outline, numbered, where the stickers would print */
async function qrsTest(size, nd) {
  await loadJsPdf();
  const z = QRS_SIZES[size] || QRS_SIZES.square;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  for (let k = 0; k < z.n; k++) {
    const [x, y] = qrsXY(z, k, nd);
    if (z.r) doc.roundedRect(x, y, z.W, z.H, z.r, z.r);
    else doc.rect(x, y, z.W, z.H);
    doc.setFontSize(10);
    doc.text(String(k + 1), x + z.W / 2, y + z.H / 2 + 1.5, { align: "center" });
  }
  doc.setFontSize(8);
  doc.text(
    "Lining-up sheet: " +
      z.label +
      ". Print at 100% on plain paper and hold it behind a label sheet against a window.",
    105,
    6,
    { align: "center" },
  );
  await S.dl.save({ filename: "QR stickers – lining-up sheet.pdf", data: doc.output("blob") });
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
