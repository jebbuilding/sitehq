/* ================= WAGE CALCULATOR PDF: a wage calculation on the letterhead, as shown on screen ================= */
import { $, iso } from "../core/helpers.js";
import { S } from "../core/state.js";
import { coData } from "../owner/company-details.js";
import { wcMoney } from "./wage-calc.js";
import { BRGB } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { sdSet } from "../sales/sales-calc.js";
import { sdHeadLines, sdImgData, sdLongDate } from "../sales/sales-pdf.js";
export { wcPdf };
/* The figures put in (salary, van, pensions, holiday, days and hours) and the results exactly as the calculator
   shows them: the four headline boxes, then "What they pay" and "What they cost you" row by row. Owner use only
   (it's his costings), saved with the "Print" bar like every PDF. */
async function wcPdf(o) {
  await loadJsPdf();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const brand = BRGB(),
    co = coData(),
    set = sdSet();
  const M = 20,
    R = 190;
  const logo = await sdImgData(set.logoId || ((S.settings || {}).company || {}).logoId);
  if (logo) {
    const k = Math.min(60 / logo.w, 32 / logo.h);
    doc.addImage(logo.u, logo.f, 16, 8, logo.w * k, logo.h * k, "wclogo", "FAST");
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
    doc.text(t, R, hy, { align: "right" });
    hy += 4.2;
  });
  doc.setDrawColor(...brand);
  doc.setLineWidth(0.7);
  doc.line(3, 46, 207, 46);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Wage calculation" + (o.name ? " – " + o.name : ""), M, 57);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(
    "Worked out " +
      sdLongDate(iso(new Date())) +
      " · tax year 2026/27 rates · a guide, not payroll",
    M,
    63,
  );
  let y = 72;
  /* what was put in */
  const facts = [
    ["Gross salary a year", wcMoney(o.salary)],
    o.vanMode !== "none" && o.van
      ? [
          "Company van a year",
          wcMoney(o.van) + (o.vanMode === "benefit" ? " (taxable benefit)" : " (paid by them)"),
        ]
      : null,
    ["Their pension", (o.eePen || 0) + "%"],
    ["Your pension", (o.erPen || 0) + "%"],
    o.other ? ["Other deductions a year", wcMoney(o.other)] : null,
    ["Holiday (paid days, incl. bank holidays)", String(o.hol || 0)],
    ["Paid days a year", String(o.days || 0)],
    ["Hours a day", String(o.hrs || 0)],
    o.charge ? ["Charged out at (an hour)", wcMoney(o.charge, 2)] : null,
  ].filter(Boolean);
  doc.setFontSize(10);
  facts.forEach(([k, v], i) => {
    const col = i % 2,
      x = col ? 108 : M;
    doc.setTextColor(110, 110, 110);
    doc.text(k, x, y);
    doc.setTextColor(20, 20, 20);
    doc.text(v, x + 80, y, { align: "right" });
    if (col) y += 6;
  });
  if (facts.length % 2) y += 6;
  y += 4;
  /* the headline boxes, read from the screen */
  const out = $("wc-out");
  const tots = [...out.querySelectorAll(".wc-head .tot")].map((t) => [
    t.querySelector(".n").textContent,
    t.querySelector(".l").textContent,
  ]);
  const bw = (R - M - 6 * (tots.length - 1)) / Math.max(1, tots.length);
  tots.forEach(([n, l], i) => {
    const x = M + i * (bw + 6);
    doc.setDrawColor(...brand);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, bw, 24, 2, 2, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...brand);
    doc.text(n, x + bw / 2, y + 9, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(doc.splitTextToSize(l, bw - 4).slice(0, 3), x + bw / 2, y + 14, { align: "center" });
  });
  y += 32;
  /* the two tables, row by row as shown */
  [...out.querySelectorAll(".flabel")].forEach((fl) => {
    const tbl = fl.nextElementSibling && fl.nextElementSibling.querySelector("table");
    if (!tbl) return;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...brand);
    doc.text(fl.textContent, M, y);
    y += 6;
    [...tbl.querySelectorAll("tr")].forEach((tr) => {
      const td = tr.querySelectorAll("td");
      if (td.length < 2) return;
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      const b = tr.classList.contains("wc-tot");
      doc.setFont("helvetica", b ? "bold" : "normal");
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      doc.text(td[0].textContent, M + 2, y);
      doc.text(td[1].textContent, R - 2, y, { align: "right" });
      doc.setDrawColor(225, 225, 225);
      doc.setLineWidth(0.2);
      doc.line(M, y + 2, R, y + 2);
      y += 6.4;
    });
    y += 6;
  });
  doc.setFontSize(8.5);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Figures from the SiteHQ wage calculator. Check tax and NI rates each April; Scottish income tax bands differ.",
    105,
    288,
    { align: "center" },
  );
  return doc.output("blob");
}
