/* ================= SALES PDF: estimates as a letter on the letterhead, invoices with totals, VAT and CIS ================= */
import { gbp, iso, parse, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { coData } from "../owner/company-details.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { sdCalc, sdDueDate, sdR2, sdSet } from "./sales-calc.js";
export { sdLongDate, sdPdf, sdSavePdf };
/* The letterhead: logo top left, company address and contacts top right, a line in the brand colour; the footer has
   the job and reference, the trades line, VAT number and page number. An estimate reads like James's own letters:
   client address, estimate number and date, Re:, Dear…, the wording, a summary of costs, works included and
   excluded, the closing words and his name, then the terms on their own pages. A generic layout. */
function sdLongDate(di) {
  const d = parse(di || iso(new Date())),
    n = d.getDate();
  const th =
    n % 10 === 1 && n !== 11
      ? "st"
      : n % 10 === 2 && n !== 12
        ? "nd"
        : n % 10 === 3 && n !== 13
          ? "rd"
          : "th";
  return n + th + " " + d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
async function sdPdf(d) {
  await loadJsPdf();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const co = coData(),
    set = sdSet(),
    c = sdCalc(d),
    est = d.type === "estimate";
  const W = 210,
    M = 18,
    R = W - M,
    TW = R - M,
    BOT = 270;
  const brand = BRGB();
  const ink = () => doc.setTextColor(30, 30, 30);
  const soft = () => doc.setTextColor(100, 100, 100);
  let y = 0;
  /* letterhead on every page */
  const head = async () => {
    await pdfLogo(doc, M + 58, 10, 58, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    ink();
    const addr = [co.name]
      .concat(String(co.address || "").split(/\s*[\n,]\s*/))
      .concat([co.phone || co.mobile, co.email, co.website])
      .filter(Boolean);
    addr.forEach((t, i) => {
      if (i === 1) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
      }
      doc.text(String(t), R, 14 + i * 4.4, { align: "right" });
    });
    doc.setDrawColor(...brand);
    doc.setLineWidth(0.8);
    doc.line(M, 44, R, 44);
    y = 54;
  };
  const need = async (h) => {
    if (y + h <= BOT) return;
    doc.addPage();
    await head();
  };
  const para = async (t, size, bold, gap) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size || 10);
    ink();
    for (const block of String(t || "").split(/\n\s*\n/)) {
      const lines = doc.splitTextToSize(block.trim(), TW);
      for (const ln of lines) {
        await need(5);
        doc.text(ln, M, y);
        y += (size || 10) * 0.45;
      }
      y += gap == null ? 2.5 : gap;
    }
  };
  const bullets = async (list) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    ink();
    for (const it of list) {
      const lines = doc.splitTextToSize(it, TW - 6);
      await need(5 * lines.length);
      doc.setFillColor(...brand);
      doc.circle(M + 1.5, y - 1.2, 0.8, "F");
      lines.forEach((ln) => {
        doc.text(ln, M + 6, y);
        y += 4.6;
      });
      y += 0.8;
    }
    y += 2;
  };
  const heading = async (t) => {
    await need(14);
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...brand);
    doc.text(t, M, y);
    y += 6.5;
  };
  const listOf = (s) =>
    String(s || "")
      .split(/\n+/)
      .map((x) => x.replace(/^[\s•\-*·]+/, "").trim())
      .filter(Boolean);
  await head();
  ink();
  const addrLines = [d.client].concat(String(d.address || "").split(/\s*\n\s*/)).filter(Boolean);
  if (est) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    addrLines.forEach((t) => {
      doc.text(t, M, y);
      y += 4.6;
    });
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Estimate Number: " + (d.number || ""), M, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(sdLongDate(d.date), M, y);
    y += 8;
    if (d.title) {
      doc.setFont("helvetica", "bold");
      doc.text("Re: " + d.title, M, y);
      y += 8;
    }
    await para("Dear " + (d.dear || d.client || "Sir or Madam"), 10, false, 3);
    await para(d.intro != null ? d.intro : set.intro);
    await heading("Summary of Estimated Costs");
    const lines = (d.lines || []).filter((l) => l && (l.d || +l.r));
    doc.setFontSize(10);
    for (const l of lines) {
      const amt = sdR2((l.q === "" || l.q == null ? 1 : +l.q) * (+l.r || 0));
      const txt = doc.splitTextToSize(
        String(l.d || "") + (+l.q > 1 ? ` (${l.q} × ${gbp(l.r)})` : ""),
        TW - 40,
      );
      await need(5 * txt.length + 1);
      doc.setFont("helvetica", "normal");
      ink();
      txt.forEach((ln, i) => {
        doc.text(ln, M, y + i * 4.6);
      });
      doc.text(gbp(amt), R, y, { align: "right" });
      y += 4.6 * txt.length + 1.2;
      doc.setDrawColor(225, 225, 225);
      doc.setLineWidth(0.2);
      doc.line(M, y - 3.4, R, y - 3.4);
    }
    await need(22);
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Total estimate:", M, y);
    doc.text(gbp(c.net) + (c.vat ? " +VAT" : ""), R, y, { align: "right" });
    y += 5.5;
    if (c.vat) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(gbp(c.gross) + " Inc VAT", R, y, { align: "right" });
      y += 5.5;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Estimate is valid for ${+d.validDays || +set.validDays || 30} days`, M, y);
    y += 8;
    if (listOf(d.incl).length) {
      await heading("Works Included Within the Estimate");
      await bullets(listOf(d.incl));
    }
    if (listOf(d.excl).length) {
      await heading("Works Excluded from the Estimate");
      await bullets(listOf(d.excl));
    }
    if (d.notes) await para(d.notes);
    await para(set.closing);
    await need(22);
    y += 2;
    await para("Kind Regards", 10, false, 6);
    await para(co.owner + "\n" + co.name, 10, true, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    if (set.terms) {
      doc.addPage();
      await head();
      await heading("Terms and Conditions of Contract");
      doc.setFontSize(9);
      for (const p of String(set.terms).split(/\n/)) {
        const t = p.trim();
        if (!t) {
          y += 2;
          continue;
        }
        const isHead = /^\d+(\.\d+)?\.?\s+\S/.test(t) && t.length < 70;
        doc.setFont("helvetica", isHead ? "bold" : "normal");
        doc.setFontSize(isHead ? 10 : 9);
        ink();
        for (const ln of doc.splitTextToSize(t, TW)) {
          await need(4.5);
          doc.text(ln, M, y);
          y += 4.1;
        }
        y += isHead ? 0.5 : 1.5;
      }
    }
  } else {
    /* invoice */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...brand);
    doc.text(d.drc ? "INVOICE" : co.vatNo ? "TAX INVOICE" : "INVOICE", M, y + 4);
    y += 12;
    const top = y;
    doc.setFontSize(9);
    soft();
    doc.text("INVOICE TO", M, y);
    y += 4.6;
    ink();
    doc.setFontSize(10);
    addrLines.forEach((t, i) => {
      doc.setFont("helvetica", i ? "normal" : "bold");
      doc.text(t, M, y);
      y += 4.6;
    });
    const facts = [
      ["Invoice number", String(d.number || "")],
      ["Invoice date", sdLongDate(d.date)],
      ["Payment due", sdLongDate(sdDueDate(d))],
      d.site ? ["Site", d.site] : null,
      d.ref ? ["Your ref", d.ref] : null,
    ].filter(Boolean);
    let fy = top;
    facts.forEach(([k, v]) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      soft();
      doc.text(k, 120, fy);
      ink();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(doc.splitTextToSize(v, R - 150)[0], R, fy, { align: "right" });
      fy += 5.2;
    });
    y = Math.max(y, fy) + 6;
    if (d.title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      ink();
      doc.text(d.title + (d.part ? " – " + d.part : ""), M, y);
      y += 7;
    }
    /* the lines */
    const cols = [
      [M, "Description", "left"],
      [130, "Qty", "right"],
      [152, "Price", "right"],
      [166, "VAT", "right"],
      [R, "Amount", "right"],
    ];
    const tableHead = () => {
      doc.setFillColor(...brand);
      doc.rect(M, y - 4.5, TW, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      cols.forEach(([x, t, a]) =>
        doc.text(t, a === "left" ? x + 2 : x - (x === R ? 2 : 0), y, { align: a }),
      );
      y += 7;
    };
    tableHead();
    for (const l of (d.lines || []).filter((l) => l && (l.d || +l.r))) {
      const q = l.q === "" || l.q == null ? 1 : +l.q;
      const amt = sdR2(q * (+l.r || 0));
      const txt = doc.splitTextToSize(String(l.d || ""), 128 - M - 18);
      if (y + 4.6 * txt.length > BOT) {
        doc.addPage();
        await head();
        tableHead();
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      ink();
      txt.forEach((ln, i) => doc.text(ln, M + 2, y + i * 4.4));
      doc.text(String(q), 130, y, { align: "right" });
      doc.text(gbp(l.r || 0), 152, y, { align: "right" });
      doc.text(d.drc ? "RC" : (l.v == null ? 20 : +l.v) + "%", 166, y, { align: "right" });
      doc.text(gbp(amt), R - 2, y, { align: "right" });
      y += 4.4 * txt.length + 2;
      doc.setDrawColor(225, 225, 225);
      doc.setLineWidth(0.2);
      doc.line(M, y - 3.6, R, y - 3.6);
    }
    /* the totals */
    const tot = [
      ["Subtotal", gbp(c.net)],
      d.drc ? ["VAT", "Reverse charge"] : ["VAT", gbp(c.vat)],
      ["Total", gbp(c.gross), 1],
      c.cis ? [`Less CIS at ${d.cis}% on labour of ${gbp(c.lab)}`, "-" + gbp(c.cis)] : null,
      c.paid ? ["Paid so far", "-" + gbp(c.paid)] : null,
      ["Amount due", gbp(c.balance), 2],
    ].filter(Boolean);
    await need(8 * tot.length + 6);
    y += 3;
    tot.forEach(([k, v, b]) => {
      if (b === 2) {
        doc.setFillColor(...brand);
        doc.rect(110, y - 5, R - 110, 8, "F");
        doc.setTextColor(255, 255, 255);
      } else ink();
      doc.setFont("helvetica", b ? "bold" : "normal");
      doc.setFontSize(b ? 11 : 9.5);
      doc.text(doc.splitTextToSize(k, 60)[0], 112, y);
      doc.text(v, R - 2, y, { align: "right" });
      y += b === 2 ? 9 : 6;
    });
    y += 4;
    if (d.drc)
      await para(
        "Reverse charge: customer to account to HMRC for the VAT on these services (VAT Act 1994 Section 55A). VAT that would have been charged: " +
          gbp(sdR2(c.net * 0.2)) +
          ".",
        9,
      );
    if (c.cis)
      await para("CIS: please send us a payment and deduction statement for the tax taken off.", 9);
    if (set.bank) {
      await heading("How to pay");
      await para(set.bank, 10);
      await para(
        "Please use " +
          (d.number ? "invoice number " + d.number : "the invoice number") +
          " as the reference.",
        9,
      );
    }
    if (d.notes) await para(d.notes, 10);
    if (set.invNote) await para(set.invNote, 10);
  }
  /* footer on every page */
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...brand);
    doc.setLineWidth(0.5);
    doc.line(M, 279, R, 279);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    ink();
    doc.text(`${d.title || (est ? "Estimate" : "Invoice")} – Ref: ${d.number || ""}`, M, 283.5);
    doc.setFont("helvetica", "normal");
    soft();
    if (set.tagline) doc.text(set.tagline, W / 2, 287.5, { align: "center" });
    const reg = [
      co.vatNo ? "VAT Number " + co.vatNo : "",
      co.companyNo ? "Company No " + co.companyNo : "",
    ]
      .filter(Boolean)
      .join(" · ");
    if (reg) doc.text(reg, W / 2, 291.5, { align: "center" });
    doc.text("Page | " + i, R, 283.5, { align: "right" });
  }
  return doc.output("blob");
}
async function sdSavePdf(d) {
  toast("Making the PDF…");
  try {
    const blob = await sdPdf(d);
    const fn =
      `${d.type === "estimate" ? "Estimate" : "Invoice"} ${d.number || ""} ${d.client || ""}`
        .replace(/[\\/:*?"<>|]+/g, "")
        .trim() + ".pdf";
    await S.dl.save({ filename: fn, data: blob });
    return blob;
  } catch (e) {
    toast("Couldn't make the PDF. Check your connection.");
    return null;
  }
}
