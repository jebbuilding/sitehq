/* ================= KIT: tools and plant on QR stickers – booked out to a person or a site, and back in ================= */
import { $, esc, iso, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, siteNames } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { coData } from "../owner/company-details.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { KINDS } from "../safety/checklists.js";
import { EQ_DATES, daysTo } from "../safety/expiry-dates.js";
import { loadJsPdf } from "../safety/site-inductions.js";
export { kitView };
/* 🧰 Tools & plant: every machine, piece of small plant, ladder, digger and trailer with where it is now – in the yard,
   on a site, or with a person (and since when). Book it out (to someone, a site or both) and back in; each move is
   kept on its record. 🏷 QR stickers: a sheet of stickers to print, each with a QR code, the item's name and its
   number (T-001…). 📷 Scan: on a phone or tablet that can read QR codes in the browser the camera finds the sticker;
   otherwise type the number from it. Anything with an inspection or PAT test due within 30 days is flagged. Stored on
   the equipment record: tag, out { who, site, at, note }, kitLog [{ at, act, who, site }]. */
const KIT_KINDS = ["machine", "ladder", "digger", "trailer"];
const kitAll = () =>
  (S.equipment || [])
    .filter((e) => KIT_KINDS.includes(e.kind))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
const kitWhere = (e) =>
  e.out && (e.out.who || e.out.site)
    ? [e.out.who ? nameOf(e.out.who) : "", e.out.site || ""].filter(Boolean).join(" · ")
    : "In the yard";
function kitDue(e) {
  const ds = (EQ_DATES[e.kind] || []).map(([k, l]) => [l, (e.dates || {})[k]]).filter(([, d]) => d);
  const soon = ds.filter(([, d]) => daysTo(d) <= 30).sort((a, b) => a[1].localeCompare(b[1]))[0];
  return soon ? `${soon[0]} ${daysTo(soon[1]) < 0 ? "overdue" : "due " + shortDay(soon[1])}` : "";
}
let kitQrP = null;
let kitTimer = null;
function kitLoadQr() {
  if (window.qrcode) return Promise.resolve();
  if (kitQrP) return kitQrP;
  kitQrP = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
    s.onload = res;
    s.onerror = () => {
      kitQrP = null;
      rej(new Error("load"));
    };
    document.head.appendChild(s);
  });
  return kitQrP;
}
/* give everything a number for its sticker */
async function kitTags() {
  const all = kitAll();
  let n = Math.max(0, ...all.map((e) => +String(e.tag || "").replace(/\D/g, "") || 0));
  for (const e of all.filter((x) => !x.tag)) {
    n++;
    const tag = "T-" + String(n).padStart(3, "0");
    await S.db.doc("equipment/" + e.id).update({ tag });
    e.tag = tag;
  }
}
function kitView(q) {
  const L = kitAll();
  const f = String(q || "")
    .trim()
    .toLowerCase();
  const shown = f
    ? L.filter(
        (e) =>
          (e.name || "").toLowerCase().includes(f) ||
          (e.tag || "").toLowerCase() === f ||
          (e.tag || "").toLowerCase().includes(f),
      )
    : L;
  const groups = {};
  shown.forEach((e) => (groups[kitWhere(e)] = groups[kitWhere(e)] || []).push(e));
  const keys = Object.keys(groups).sort((a, b) =>
    a === "In the yard" ? -1 : b === "In the yard" ? 1 : a.localeCompare(b),
  );
  openViewer(`<div class="kit"><div class="vhead"><b>🧰 Tools &amp; plant – who has what</b></div>
    <div class="kit-top"><input id="kit-q" type="search" placeholder="Name or sticker number, e.g. T-004" value="${esc(q || "")}" aria-label="Find a tool"><button type="button" class="btn" id="kit-scan">📷 Scan a sticker</button><button type="button" class="btn" id="kit-qr">🏷 QR stickers</button></div>
    ${
      keys
        .map(
          (k) =>
            `<div class="flabel">${k === "In the yard" ? "🏠" : "📍"} ${esc(k)} (${groups[k].length})</div>${groups[
              k
            ]
              .map((e) => {
                const due = kitDue(e);
                return `<div class="kit-row"><span><b>${esc(e.name)}</b> ${e.tag ? `<span class="tag">${esc(e.tag)}</span>` : ""}<br><span class="who">${esc((KINDS[e.kind] || {}).name || "")}${e.out && e.out.at ? " · out since " + esc(shortDay(iso(new Date(e.out.at)))) : ""}${due ? ` · <span class="kit-due">${esc(due)}</span>` : ""}</span></span><span class="kit-acts">${e.out && (e.out.who || e.out.site) ? `<button type="button" class="btn kit-in" data-id="${esc(e.id)}">↩ Back in</button><button type="button" class="btn kit-out" data-id="${esc(e.id)}">Move</button>` : `<button type="button" class="btn primary kit-out" data-id="${esc(e.id)}">Book out</button>`}</span></div>`;
              })
              .join("")}`,
        )
        .join("") ||
      `<div class="nothing">${f ? "Nothing matches." : "Add machinery, small plant and ladders in Setup."}</div>`
    }</div>`);
  const find = (b) => L.find((x) => x.id === b.dataset.id);
  $("kit-q").oninput = (e) => {
    clearTimeout(kitTimer);
    kitTimer = setTimeout(() => {
      kitView(e.target.value);
      const el = $("kit-q");
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }, 300);
  };
  document.querySelectorAll(".kit-out").forEach((b) => (b.onclick = () => kitBook(find(b))));
  document.querySelectorAll(".kit-in").forEach((b) => (b.onclick = () => kitBack(find(b))));
  $("kit-qr").onclick = kitStickers;
  $("kit-scan").onclick = kitScan;
}
function kitBook(e) {
  if (!e) return;
  const sites = siteNames();
  openSheet(
    `<h3 id="sheettitle">Book out: ${esc(e.name)}${e.tag ? " (" + esc(e.tag) + ")" : ""}</h3>
    <label for="kit-who">To<select id="kit-who"><option value="">Nobody – just a site</option>${teamIds()
      .map(
        (id) =>
          `<option value="${esc(id)}"${(e.out || {}).who === id ? " selected" : ""}>${esc(nameOf(id))}</option>`,
      )
      .join("")}</select></label>
    <label for="kit-site">On site<select id="kit-site"><option value="">Not on a site</option>${sites.map((s) => `<option${(e.out || {}).site === s ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
    <label for="kit-note">Note (optional)<input id="kit-note" maxlength="120" placeholder="e.g. with 2 spare blades"></label>
    ${formFoot(false, "Book out")}`,
    async () => {
      const who = $("kit-who").value,
        site = $("kit-site").value;
      if (!who && !site) return showErr("Who has it, or which site is it on?");
      const now = Date.now();
      try {
        const up = {
          out: { who, site, at: now, note: $("kit-note").value.trim() },
          kitLog: (e.kitLog || []).concat([{ at: now, act: "out", who, site }]).slice(-100),
        };
        await S.db.doc("equipment/" + e.id).update(up);
        Object.assign(e, up);
        closeForm();
        toast(
          `${e.name} booked out to ${[who ? nameOf(who) : "", site].filter(Boolean).join(" at ")}`,
        );
        kitView();
      } catch (er) {
        showErr("Couldn't save – check your connection");
      }
    },
    "kit-who",
  );
}
async function kitBack(e) {
  if (!e) return;
  try {
    const up = {
      out: null,
      kitLog: (e.kitLog || []).concat([{ at: Date.now(), act: "in" }]).slice(-100),
    };
    await S.db.doc("equipment/" + e.id).update(up);
    Object.assign(e, up);
    toast(e.name + " back in the yard");
    kitView();
  } catch (er) {
    toast("Couldn't save");
  }
}
/* a sheet of stickers: 3 across, 7 down */
async function kitStickers() {
  try {
    await kitTags();
    await kitLoadQr();
    await loadJsPdf();
  } catch (e) {
    toast("Couldn't make the stickers – check your connection");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const co = coData();
  const W = 70,
    H = 42.4,
    X0 = 0,
    Y0 = 0;
  kitAll().forEach((e, i) => {
    const k = i % 21;
    if (i && !k) doc.addPage();
    const x = X0 + (k % 3) * W,
      y = Y0 + Math.floor(k / 3) * H;
    const q = window.qrcode(0, "M");
    q.addData("SITEHQ " + e.tag);
    q.make();
    doc.addImage(q.createDataURL(8, 0), "GIF", x + 4, y + 5, 32, 32);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(e.tag, x + 39, y + 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(e.name || "", 28).slice(0, 3), x + 39, y + 20);
    doc.setFontSize(7);
    doc.text(co.name, x + 39, y + 36);
  });
  await S.dl.save({ filename: "Tool stickers.pdf", data: doc.output("blob") });
  toast("Print on a sheet of 21 labels (70 × 42.4 mm)");
}
/* scan a sticker with the camera where the browser can read QR codes; otherwise type the number */
async function kitScan() {
  if (!("BarcodeDetector" in window) || !navigator.mediaDevices) {
    toast("Type the number from the sticker (e.g. T-004) in the box");
    if ($("kit-q")) $("kit-q").focus();
    return;
  }
  let stream = null;
  const d = document.createElement("div");
  d.className = "dimask";
  d.innerHTML = `<div class="dimbox" role="dialog" aria-label="Scan a sticker"><b>📷 Point at the sticker</b><video class="kit-video" playsinline muted></video><div class="dimbtns"><button type="button" class="btn kit-stop">Cancel</button></div></div>`;
  document.body.appendChild(d);
  const stop = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    d.remove();
  };
  d.querySelector(".kit-stop").onclick = stop;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const v = d.querySelector("video");
    v.srcObject = stream;
    await v.play();
    const det = new window.BarcodeDetector({ formats: ["qr_code"] });
    const look = async () => {
      if (!d.isConnected) return;
      try {
        const got = await det.detect(v);
        const t = got && got[0] && String(got[0].rawValue || "");
        const m = t.match(/SITEHQ\s+(T-\d+)/);
        if (m) {
          stop();
          kitView(m[1]);
          return;
        }
      } catch (e) {}
      setTimeout(look, 300);
    };
    look();
  } catch (e) {
    stop();
    toast("Couldn't open the camera – type the number from the sticker instead");
  }
}
