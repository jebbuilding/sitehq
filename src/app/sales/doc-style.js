/* ================= DOCUMENT STYLE: each firm's look for the PDFs – font, how prices show, signature ================= */
import { $, esc, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { lhSample } from "./letterhead-setup.js";
import { sdSet } from "./sales-calc.js";
import { sdSaveSet } from "./sales-settings.js";
export { dstCardHtml, dstPatch, dstWire };
/* James (Nov 2026): "is every part of the app customizable for another company". Setup › 📄 Document style, under
   the terms: the font for every PDF the app makes (Helvetica – clean and modern, Times – traditional, Courier –
   typewriter), how a new estimate shows its prices (the total, each heading's total, every line, or sections like a
   Word estimate – still changeable on each one), and whether your signature goes on estimates and invoices. The brand
   colour is in Company details. Font in settings/app.pdfStyle (every PDF, trades' too); the rest in todos/salesset.
   The font is put in by wrapping jsPDF's setFont when it loads (safety/site-inductions.js › loadJsPdf). */
const DST_FONTS = [
  ["helvetica", "Helvetica – clean and modern"],
  ["times", "Times – traditional"],
  ["courier", "Courier – typewriter"],
];
const DST_BD = [
  ["total", "The total only"],
  ["head", "Each heading's total, then the total"],
  ["all", "Every line and heading, then the total"],
  ["sections", "Each section with its work and its total (like a Word estimate)"],
];
const dstFont = () => {
  const f = ((S.settings || {}).pdfStyle || {}).font;
  return DST_FONTS.some((x) => x[0] === f) ? f : "helvetica";
};
/* every setFont("helvetica", …) in the app uses the firm's font: each new document gets a setFont that swaps it */
function dstPatch() {
  const ns = window.jspdf;
  if (!ns || !ns.jsPDF || ns.jsPDF.__dstPatched) return;
  const Orig = ns.jsPDF;
  function Doc(...a) {
    const d = new Orig(...a);
    const sf = d.setFont;
    d.setFont = function (f, ...rest) {
      if (typeof f === "string" && f.toLowerCase() === "helvetica") f = dstFont();
      return sf.call(this, f, ...rest);
    };
    if (dstFont() !== "helvetica") {
      try {
        sf.call(d, dstFont(), "normal");
      } catch (e) {}
    }
    return d;
  }
  Object.assign(Doc, Orig);
  Doc.prototype = Orig.prototype;
  Doc.API = Orig.API;
  Doc.__dstPatched = true;
  try {
    ns.jsPDF = Doc;
  } catch (e) {}
}
function dstCardHtml() {
  const s = sdSet();
  return `<div class="card dst-card"><div class="cardbody" style="border:0"><b>📄 Document style</b>
    <div class="who">How the PDFs the app makes look. Your colour is in Company details; your letterhead and terms are above.</div>
    <label for="dst-font">Font on every PDF<select id="dst-font">${DST_FONTS.map(([k, l]) => `<option value="${k}"${k === dstFont() ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
    <label for="dst-bd">A new estimate shows<select id="dst-bd">${DST_BD.map(([k, l]) => `<option value="${k}"${k === (s.bdDefault || "") ? " selected" : ""}>${esc(l)}</option>`).join("")}<option value=""${s.bdDefault ? "" : " selected"}>Decide from the estimate (headings or not)</option></select></label>
    <label class="inl"><input type="checkbox" id="dst-sig"${s.noSig ? "" : " checked"}> Put my signature on estimates and invoices</label>
    <div class="actions"><button type="button" class="btn primary" id="dst-save">Save document style</button><button type="button" class="btn" id="dst-sample">👁 See a sample page</button></div>
  </div></div>`;
}
function dstWire() {
  if (!$("dst-save")) return;
  const save = async () => {
    await S.db.doc("settings/app").update({
      pdfStyle: Object.assign({}, (S.settings || {}).pdfStyle || {}, {
        font: $("dst-font").value,
      }),
    });
    S.settings = Object.assign({}, S.settings, {
      pdfStyle: Object.assign({}, (S.settings || {}).pdfStyle || {}, { font: $("dst-font").value }),
    });
    await sdSaveSet({ bdDefault: $("dst-bd").value, noSig: !$("dst-sig").checked });
  };
  $("dst-save").onclick = async () => {
    try {
      await save();
      toast("Document style saved – every new PDF uses it");
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  };
  $("dst-sample").onclick = async () => {
    try {
      await save();
    } catch (e) {}
    lhSample();
  };
}
