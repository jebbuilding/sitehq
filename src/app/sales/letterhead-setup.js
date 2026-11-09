/* ================= LETTERHEAD SETUP: one place in Setup to bring in the letterhead every PDF uses ================= */
import { $, esc, iso, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { blobUrl } from "../files/files.js";
import { logoId } from "../photos/photos.js";
import { sdSet } from "./sales-calc.js";
import { sdHeadLines, sdPdf } from "./sales-pdf.js";
import { sdQuickLetterhead, sdSettings } from "./sales-settings.js";
export { lhCard, lhLogoId, lhWire };
/* The letterhead is kept with the estimate and invoice settings (todos/salesset: head lines, tagline (foot line),
   vatNo, logoId). Letters – estimates, invoices, payment receipts, wage sheets, CIS statements, supplier letters –
   print it whole; every other PDF (RAMS, inductions, sign-in books, day work…) puts its logo in the corner. */

/* the logo for PDFs: the letterhead's, else the company logo, else the original one */
const lhLogoId = () => sdSet().logoId || logoId();
function lhCard() {
  const s = sdSet();
  const has = !!(s.head || s.logoId);
  const lines = has ? sdHeadLines().filter((t) => t.trim()) : [];
  return `<div class="card lh-card"><div class="cardbody" style="border:0"><b>📄 My letterhead</b>
    <div class="who">Used on every PDF the app makes. Estimates, invoices, payment receipts, wage sheets, CIS statements and letters to suppliers are printed on it in full; forms such as RAMS, inductions and sign-in sheets carry its logo.</div>
    ${
      has
        ? `<div class="lh-prev" aria-label="Your letterhead"><div class="lh-top"><img src="${esc(blobUrl(lhLogoId()))}" alt="Logo" class="lh-logo"><div class="lh-lines">${lines.map((t) => `<div>${esc(t)}</div>`).join("")}</div></div><div class="lh-rule"></div><div class="lh-foot">${s.tagline ? `<div>${esc(s.tagline)}</div>` : ""}${s.vatNo ? `<div>VAT Number ${esc(s.vatNo)}</div>` : ""}</div></div>`
        : `<div class="notice warn">Not set up yet: estimates and invoices come out without your logo, address or foot line. Bring in the Word file you use as your letterhead.</div>`
    }
    <div class="actions"><span class="btn ${has ? "" : "primary "}sd-filebtn">📄 ${has ? "Bring in a new letterhead" : "Bring in my Word letterhead"}<input type="file" class="lh-file" accept=".docx" aria-label="Bring in my Word letterhead"></span>${has ? `<button type="button" class="btn" id="lh-edit">✎ Change the lines or logo</button><button type="button" class="btn" id="lh-pdf">👁 See a sample page</button>` : ""}</div>
  </div></div>`;
}
function lhWire() {
  const fi = document.querySelector(".lh-file");
  if (!fi) return;
  fi.onchange = async () => {
    const f = fi.files[0];
    fi.value = "";
    if (f) await sdQuickLetterhead(f);
  };
  if ($("lh-edit")) $("lh-edit").onclick = () => sdSettings();
  if ($("lh-pdf")) $("lh-pdf").onclick = lhSample;
}
/* a sample page on the letterhead, to check it */
async function lhSample() {
  const sample = {
    type: "invoice",
    number: "SAMPLE",
    date: iso(new Date()),
    client: "Sample customer",
    addr: "1 Sample Street\nYour town",
    title: "A sample page to check your letterhead",
    lines: [{ d: "Sample work", a: 100, vc: "S20", k: "lab" }],
    payments: [],
  };
  toast("Making a sample page…");
  try {
    const blob = await sdPdf(sample);
    await S.dl.save({ filename: "Letterhead sample.pdf", data: blob });
  } catch (e) {
    toast("Couldn't make the sample. Check your connection.");
  }
}
