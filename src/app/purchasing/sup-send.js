/* ================= SEND A MERCHANT OR SUPPLIER: their details (as a PDF) and brochures, to clients, trades or by email ================= */
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet } from "../core/sheet.js";
import { S } from "../core/state.js";
import { uploadFile } from "../files/files.js";
import { SENDTO } from "../files/send-to.js";
import { coData } from "../owner/company-details.js";
import { BRGB } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { sdSet } from "../sales/sales-calc.js";
import { sdHeadLines, sdImgData } from "../sales/sales-pdf.js";
export { supSendSheet };
/* From a merchant's or a supplier's card: pick what to send – their contact details made into a one-page PDF on the
   letterhead, or one of their brochures – and the usual Send to… dialog takes it to trades (in their app), clients
   (in their portal) and/or email. Only details safe to share go in the PDF: never account numbers, account names,
   counter PINs or James's own notes. */
const SUP_SHARE = [
  ["branch", "Address"],
  ["address", "Address"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["website", "Website"],
  ["contact", "Contact"],
  ["contactPhone", "Contact's phone"],
  ["hours", "Opening hours"],
];
async function supDetailsPdf(name, rec, kind) {
  await loadJsPdf();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const brand = BRGB(),
    co = coData(),
    set = sdSet();
  const logo = await sdImgData(set.logoId || ((S.settings || {}).company || {}).logoId);
  if (logo) {
    const k = Math.min(60 / logo.w, 32 / logo.h);
    doc.addImage(logo.u, logo.f, 16, 8, logo.w * k, logo.h * k, "splogo", "FAST");
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...brand);
    doc.text(co.name, 18, 22);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...brand);
  let hy = 12;
  sdHeadLines().forEach((t) => {
    if (!t.trim()) {
      hy += 2;
      return;
    }
    doc.text(t, 190, hy, { align: "right" });
    hy += 4.2;
  });
  doc.setDrawColor(...brand);
  doc.setLineWidth(0.7);
  doc.line(3, 46, 207, 46);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(name, 20, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(kind === "maker" ? "Supplier / manufacturer" : "Merchant", 20, 66);
  let y = 78;
  const seen = new Set();
  SUP_SHARE.forEach(([k, l]) => {
    const v = String(rec[k] || "").trim();
    if (!v || seen.has(l + v)) return;
    seen.add(l + v);
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text(l, 20, y);
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(v, 120);
    doc.text(lines, 70, y);
    y += 6 * lines.length + 2;
  });
  (rec.branches || []).forEach((b) => {
    if (y > 260) return;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...brand);
    doc.text(b.name || "Branch", 20, y + 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    y += 8;
    [b.address, b.phone ? "Phone " + b.phone : ""].filter(Boolean).forEach((t) => {
      doc.text(doc.splitTextToSize(t, 150), 20, y);
      y += 6;
    });
  });
  doc.setFontSize(8.5);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Sent by ${co.name}${co.phone || co.mobile ? " · " + (co.phone || co.mobile) : ""}`,
    105,
    288,
    { align: "center" },
  );
  return doc.output("blob");
}
/* what to send: the details, or one of the brochures */
function supSendSheet(name, rec, kind, files) {
  openSheet(
    `<h3 id="sheettitle">📤 Send ${esc(name)}</h3>
    <div class="who">Pick what to send. Next you choose trades (in their app), clients (in their portal) and/or email.</div>
    <div class="sps-list">
      <button type="button" class="btn sps-item" data-i="-1">📇 Their details (as a PDF)<small>Address, phone, email, website, contact${kind === "merchant" ? ", opening hours" : ""} – never your account number or PIN</small></button>
      ${(files || []).map((f, i) => `<button type="button" class="btn sps-item" data-i="${i}">📖 ${esc(f.title || f.name)}</button>`).join("")}
    </div>
    ${formFoot(false, "Close")}`,
    async () => closeForm(),
  );
  const fs = $("f-save");
  if (fs) fs.hidden = true;
  document.querySelectorAll(".sps-item").forEach(
    (b) =>
      (b.onclick = async () => {
        const i = +b.dataset.i;
        if (i >= 0) {
          closeForm();
          return SENDTO.open(files[i]);
        }
        b.disabled = true;
        try {
          const blob = await supDetailsPdf(name, rec, kind);
          const fn = `${name} – contact details.pdf`.replace(/[\\/:*?"<>|]+/g, "");
          const a = await uploadFile(blob, fn);
          closeForm();
          SENDTO.open({
            assetId: a.id,
            title: name + " – contact details",
            name: fn,
            type: "application/pdf",
            folder: "other",
          });
        } catch (e) {
          b.disabled = false;
          toast("Couldn't make it. Check your connection.");
        }
      }),
  );
}
