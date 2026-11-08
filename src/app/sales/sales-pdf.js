/* ================= SALES PDF: estimates as a letter on the letterhead, invoices with totals, VAT and CIS ================= */
import { gbp, iso, parse, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { getFileBlob } from "../files/in-app-files.js";
import { coData } from "../owner/company-details.js";
import { BRGB } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { SD_VATC, sdAmt, sdCalc, sdDueDate, sdLines, sdSet, sdVc } from "./sales-calc.js";
export { sdHeadLines, sdImgData, sdLongDate, sdPdf, sdSavePdf };
/* Set out like James's own Word estimate: the logo top left and the company's address and contacts top right in the
   brand colour, a full-width line under them; at the foot a line, the job and reference in grey, the trades line,
   the VAT number and "Page | n", all centred. The estimate: client address, estimate number, the date, Re:, Dear…,
   the wording, "Summary of Estimated Costs" with the total +VAT and Inc VAT, how long it's valid and a note, the
   works included and excluded as numbered lists, the closing words, the sign-off, signature and name, then the
   terms with their headings in the brand colour. The letterhead (lines, logo, footer line) and wording come from
   Estimates & invoices › Letterhead (brought in from his Word letterhead), else from Company details. */
function sdLongDate(di) {
  const d = parse(di || iso(new Date())),
    n = d.getDate();
  return n + sdOrd(n) + " " + d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
const sdOrd = (n) =>
  n % 10 === 1 && n !== 11
    ? "st"
    : n % 10 === 2 && n !== 12
      ? "nd"
      : n % 10 === 3 && n !== 13
        ? "rd"
        : "th";
/* an uploaded picture as a data URL with its size, or null */
async function sdImgData(id) {
  if (!id) return null;
  try {
    const b = await getFileBlob(id);
    const u = await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => res(null);
      fr.readAsDataURL(b);
    });
    if (!u) return null;
    const im = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = u;
    });
    return {
      u,
      w: im.naturalWidth,
      h: im.naturalHeight,
      f: /^data:image\/jpe?g/.test(u) ? "JPEG" : "PNG",
    };
  } catch (e) {
    return null;
  }
}
/* the letterhead's lines: from the brought-in letterhead, else Company details */
function sdHeadLines() {
  const set = sdSet(),
    co = coData();
  if (set.head) return set.head.split("\n");
  return [co.name]
    .concat(String(co.address || "").split(/\s*\n\s*/))
    .concat([""])
    .concat([co.phone || co.mobile, co.email, co.website].filter(Boolean));
}
const sdVatNo = () => sdSet().vatNo || coData().vatNo || "";
async function sdPdf(d) {
  await loadJsPdf();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const co = coData(),
    set = sdSet(),
    c = sdCalc(d),
    est = d.type === "estimate";
  const W = 210,
    M = 25,
    R = 186,
    TW = R - M,
    BOT = 262;
  const brand = BRGB();
  const ink = () => doc.setTextColor(20, 20, 20);
  const red = () => doc.setTextColor(...brand);
  const logo = await sdImgData(set.logoId || ((S.settings || {}).company || {}).logoId);
  const sig = await sdImgData(set.sigId);
  const headLines = sdHeadLines();
  let y = 0,
    page = 1;
  const head = () => {
    if (logo) {
      const k = Math.min(72 / logo.w, 40 / logo.h);
      doc.addImage(logo.u, logo.f, 16, 6, logo.w * k, logo.h * k, "sdlogo", "FAST");
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      red();
      doc.text(co.name, 19, 24);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    red();
    let hy = 12.5;
    headLines.forEach((t) => {
      if (!t.trim()) {
        hy += 2.6;
        return;
      }
      doc.text(t, R, hy, { align: "right" });
      hy += 4.6;
    });
    const ly = Math.max(52, hy + 2);
    doc.setDrawColor(...brand);
    doc.setLineWidth(0.7);
    doc.line(2.5, ly, 207.5, ly);
    y = ly + (page === 1 ? 17 : 8);
  };
  const newPage = () => {
    doc.addPage();
    page++;
    head();
  };
  const need = (h) => {
    if (y + h > BOT) newPage();
  };
  const LH = 5.1;
  /* a paragraph: { st font style, sz size, red | grey, center | justify, u underline, x, lh line height, gap after } */
  const para = (t, o) => {
    o = o || {};
    doc.setFont("helvetica", o.st || "normal");
    doc.setFontSize(o.sz || 10.5);
    const col = () => (o.red ? red() : o.grey ? doc.setTextColor(140, 140, 140) : ink());
    const x = o.x || M,
      w = o.w || R - x;
    const lines = doc.splitTextToSize(String(t || ""), w);
    const lh = o.lh || (o.sz || 10.5) * 0.47;
    lines.forEach((ln, i) => {
      need(lh);
      col();
      doc.setFont("helvetica", o.st || "normal");
      doc.setFontSize(o.sz || 10.5);
      const last = i === lines.length - 1;
      if (o.center) doc.text(ln, W / 2, y, { align: "center" });
      else if (o.justify && !last) doc.text(ln, x, y, { align: "justify", maxWidth: w });
      else doc.text(ln, x, y);
      if (o.u) {
        doc.setLineWidth(0.25);
        doc.setDrawColor(20, 20, 20);
        doc.line(x, y + 0.8, x + doc.getTextWidth(ln), y + 0.8);
      }
      y += lh;
    });
    y += o.gap == null ? 3.2 : o.gap;
  };
  const paras = (t, o) =>
    String(t || "")
      .split(/\n\s*\n/)
      .filter((x) => x.trim())
      .forEach((b) =>
        para(
          b.trim(),
          Object.assign({ st: /^please note/i.test(b.trim()) ? "italic" : "normal" }, o),
        ),
      );
  /* a numbered (or bullet) list */
  const list = (items, o) => {
    o = o || {};
    items.forEach((it, i) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      const lines = doc.splitTextToSize(it, R - (M + 13));
      need(o.lh || LH);
      ink();
      doc.text(o.bullet ? "•" : i + 1 + ".", M + 9, y, { align: "right" });
      lines.forEach((ln) => {
        need(o.lh || LH);
        ink();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.text(ln, M + 13, y);
        y += o.lh || LH;
      });
      y += o.gap == null ? 1.6 : o.gap;
    });
    y += 3;
  };
  const listOf = (s) =>
    String(s || "")
      .split(/\n+/)
      .map((x) => x.replace(/^\s*(\d+[.)]|[•\-*·])\s*/, "").trim())
      .filter(Boolean);
  head();
  ink();
  const addrLines = [d.client].concat(String(d.address || "").split(/\s*\n\s*/)).filter(Boolean);
  if (est) {
    addrLines.forEach((t) => para(t, { gap: 0, lh: 4.9 }));
    y += 4.3;
    para("Estimate Number: " + (d.number || ""), { gap: 4.4 });
    /* the date, with "th" raised like Word does it */
    const dd = parse(d.date || iso(new Date())),
      n = dd.getDate();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    ink();
    doc.text(String(n), M, y);
    let x = M + doc.getTextWidth(String(n));
    doc.setFontSize(6.5);
    doc.text(sdOrd(n), x, y - 1.6);
    x += doc.getTextWidth(sdOrd(n)) + 1;
    doc.setFontSize(10.5);
    doc.text(dd.toLocaleDateString("en-GB", { month: "long", year: "numeric" }), x, y);
    y += 19;
    if (d.title) para("Re: " + d.title, { st: "bold", gap: 4.4 });
    para("Dear " + (d.dear || d.client || "Sir or Madam"), { gap: 4.4 });
    paras(d.intro != null ? d.intro : set.intro, { gap: 4.4 });
    y += 2;
    need(36);
    para("Summary of Estimated Costs", { st: "bold", u: 1, gap: 4.6 });
    const lines = sdLines(d);
    if (lines.length > 1) {
      lines.forEach((l) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        const t = doc.splitTextToSize(l.d || "Item", TW - 42);
        need(LH * t.length);
        ink();
        t.forEach((ln, i) => doc.text(ln, M, y + i * LH));
        doc.text(gbp(sdAmt(l)), R, y, { align: "right" });
        y += LH * t.length + 1.2;
      });
      y += 2;
    }
    need(16);
    const vatOn = set.vatReg !== false && (c.vat || c.rcVat);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    ink();
    doc.text("Total estimate:", M, y);
    doc.setFont("helvetica", "bold");
    doc.text(gbp(c.net) + (vatOn ? " +VAT" : set.vatReg === false ? "" : " (no VAT)"), M + 38, y);
    y += 6.6;
    if (c.vat) {
      doc.text(gbp(c.gross) + " Inc VAT", M + 38, y);
      y += 6.6;
    }
    if (c.rcVat)
      para(`Reverse charge: the ${gbp(c.rcVat)} VAT is paid by you to HMRC, not to us.`, {
        sz: 9.5,
      });
    y += 6;
    para(`Estimate is valid for ${+d.validDays || +set.validDays || 30} Days`, {
      st: "bold",
      gap: 1.4,
    });
    if (set.costNote) paras(set.costNote, { st: "italic", gap: 4 });
    y += 6;
    const inc = listOf(d.incl),
      exc = listOf(d.excl);
    if (inc.length) {
      need(20);
      para(d.inclHead || set.inclHead, { st: "bold", u: 1, gap: 5 });
      list(inc, { lh: 5.4, gap: 2.2 });
      y += 4;
    }
    if (exc.length) {
      need(20);
      para(set.exclHead, { st: "bold", u: 1, gap: 6 });
      list(exc, { lh: 5, gap: 2.2 });
      y += 4;
    }
    if (d.notes) paras(d.notes, { gap: 4.4 });
    paras(set.closing, { gap: 5 });
    /* sign-off: e.g. "Yours sincerely," then "Kind Regards", the signature, the name */
    need(40);
    y += 4;
    const so = String(set.signoff || "")
      .split("\n")
      .filter((x) => x.trim());
    so.forEach((t, i) => para(t, { gap: i < so.length - 1 ? 9 : 2 }));
    if (sig) {
      const k = Math.min(55 / sig.w, 16 / sig.h);
      doc.addImage(sig.u, sig.f, M - 9, y, sig.w * k, sig.h * k, "sdsig", "FAST");
      y += sig.h * k + 4;
    } else y += 12;
    para(co.owner, { gap: 0 });
    const rule = () => {
      doc.setDrawColor(...brand);
      doc.setLineWidth(0.3);
      doc.line(M, y - 5, R, y - 5);
    };
    if (set.terms)
      sdTermsPages(set, { head: newPage, para, list, rule, at: () => y, set: (v) => (y = v), M });
  } else {
    /* invoice */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    red();
    const taxInv = set.vatReg !== false && sdVatNo() && c.vat > 0;
    doc.text(taxInv ? "TAX INVOICE" : "INVOICE", M, y);
    y += 10;
    const top = y;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("INVOICE TO", M, y);
    y += 5;
    addrLines.forEach((t, i) => {
      doc.setFont("helvetica", i ? "normal" : "bold");
      doc.setFontSize(10.5);
      ink();
      doc.text(t, M, y);
      y += 4.9;
    });
    const facts = [
      ["Invoice number", String(d.number || "")],
      ["Invoice date", sdLongDate(d.date)],
      ["Payment due", sdLongDate(sdDueDate(d))],
      d.site ? ["Site", d.site] : null,
      d.ref ? ["Your order / ref", d.ref] : null,
      taxInv ? ["VAT number", sdVatNo()] : null,
    ].filter(Boolean);
    let fy = top;
    facts.forEach(([k, v]) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(k, 118, fy);
      ink();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(doc.splitTextToSize(v, R - 150)[0], R, fy, { align: "right" });
      fy += 5.4;
    });
    y = Math.max(y, fy) + 6;
    if (d.title) para("Re: " + d.title + (d.part ? " – " + d.part : ""), { st: "bold", gap: 4 });
    /* the lines */
    const cols = [
      [M + 2, "Description", "left"],
      [128, "Qty", "right"],
      [150, "Rate", "right"],
      [166, "VAT", "right"],
      [R - 2, "Amount", "right"],
    ];
    const tableHead = () => {
      doc.setFillColor(...brand);
      doc.rect(M, y - 4.6, TW, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      cols.forEach(([x, t, a]) => doc.text(t, x, y, { align: a }));
      y += 7;
    };
    tableHead();
    for (const l of sdLines(d)) {
      const vc = SD_VATC[sdVc(l, d)];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const txt = doc.splitTextToSize(String(l.d || ""), 128 - M - 22);
      if (y + 4.6 * txt.length > BOT) {
        newPage();
        tableHead();
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      ink();
      txt.forEach((ln, i) => doc.text(ln, M + 2, y + i * 4.4));
      const priced = l.q !== "" && l.q != null && l.r !== "" && l.r != null;
      doc.text(priced ? String(+l.q) + (l.u ? " " + l.u : "") : "1", 128, y, { align: "right" });
      doc.text(gbp(priced ? l.r : sdAmt(l)), 150, y, { align: "right" });
      doc.text(set.vatReg === false ? "–" : vc.p, 166, y, { align: "right" });
      doc.text(gbp(sdAmt(l)), R - 2, y, { align: "right" });
      y += 4.4 * txt.length + 2;
      doc.setDrawColor(225, 225, 225);
      doc.setLineWidth(0.2);
      doc.line(M, y - 3.6, R, y - 3.6);
    }
    /* totals, with VAT by rate */
    const tot = [[d.inc ? "Total before VAT" : "Subtotal", gbp(c.net)]];
    if (set.vatReg !== false)
      Object.keys(c.byRate).forEach((k) => {
        const v = SD_VATC[k];
        if (v.rc) tot.push([`VAT ${v.r}% reverse charge`, "£0.00"]);
        else if (v.r) tot.push([`VAT at ${v.r}% on ${gbp(c.byRate[k].net)}`, gbp(c.byRate[k].vat)]);
      });
    tot.push(["Total", gbp(c.gross), 1]);
    if (c.cis) tot.push([`Less CIS ${d.cis}% on labour of ${gbp(c.lab)}`, "-" + gbp(c.cis)]);
    if (c.ret) tot.push([`Less retention ${d.ret}%`, "-" + gbp(c.ret)]);
    if (c.paid) tot.push(["Paid so far", "-" + gbp(c.paid)]);
    tot.push(["Amount due", gbp(c.balance), 2]);
    need(7 * tot.length + 8);
    y += 3;
    tot.forEach(([k, v, b]) => {
      if (b === 2) {
        doc.setFillColor(...brand);
        doc.rect(108, y - 5, R - 108, 8, "F");
        doc.setTextColor(255, 255, 255);
      } else ink();
      doc.setFont("helvetica", b ? "bold" : "normal");
      doc.setFontSize(b ? 11 : 9.5);
      doc.text(doc.splitTextToSize(k, 58)[0], 110, y);
      doc.text(v, R - 2, y, { align: "right" });
      y += b === 2 ? 9 : 6;
    });
    y += 4;
    if (c.rcVat)
      para(
        `Reverse charge: customer to account to HMRC for the VAT (VAT Act 1994 Section 55A). VAT the customer pays to HMRC: ${gbp(c.rcVat)}.`,
        { sz: 9 },
      );
    if (c.cis)
      para("CIS: please send us a payment and deduction statement for the tax taken off.", {
        sz: 9,
      });
    if (c.ret)
      para(`Retention of ${gbp(c.ret)} to be released at the end of the defects period.`, {
        sz: 9,
      });
    if (set.bank) {
      para("How to pay", { st: "bold", red: 1, sz: 11, gap: 2 });
      String(set.bank)
        .split("\n")
        .forEach((t) => para(t, { gap: 0.4 }));
      para(
        "Please use " +
          (d.number ? "invoice number " + d.number : "the invoice number") +
          " as the reference.",
        { sz: 9 },
      );
    }
    if (d.notes) paras(d.notes);
    if (set.invNote) para(set.invNote);
  }
  /* footer on every page */
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...brand);
    doc.setLineWidth(0.7);
    doc.line(3.5, 270.5, 208.5, 270.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(200, 200, 200);
    doc.text(`${d.title || (est ? "Estimate" : "Invoice")} – Ref:${d.number || ""}`, W / 2, 275.2, {
      align: "center",
    });
    red();
    let fy = 279.8;
    if (set.tagline) {
      doc.text(set.tagline, W / 2, fy, { align: "center" });
      fy += 4.6;
    }
    if (sdVatNo() && set.vatReg !== false) {
      doc.text("VAT Number " + sdVatNo(), W / 2, fy, { align: "center" });
      fy += 4.6;
    }
    doc.text("Page | " + i, W / 2, fy, { align: "center" });
  }
  return doc.output("blob");
}
/* the terms: company name and title centred, the version in grey, then the clauses ("# " headings, "## " sub-headings,
   "- " bullets, ">> " centred lines, lines of ____ for signing, others as justified paragraphs) */
function sdTermsPages(set, h) {
  const co = coData();
  h.head();
  h.para(co.name, { st: "bold", sz: 22, red: 1, center: 1, gap: 9, lh: 9 });
  h.para(set.termsTitle || "Terms and Conditions of Contract", {
    st: "bold",
    sz: 15,
    red: 1,
    center: 1,
    gap: set.termsVer ? 2 : 8,
    lh: 7,
  });
  if (set.termsVer) h.para(set.termsVer, { st: "italic", sz: 9, grey: 1, center: 1, gap: 9 });
  let bul = [];
  const flush = () => {
    if (bul.length) h.list(bul, { bullet: 1, lh: 4.7, gap: 0.9 });
    bul = [];
  };
  String(set.terms)
    .split("\n")
    .forEach((raw) => {
      const t = raw.trim();
      if (!t) return;
      if (/^- /.test(t)) return bul.push(t.slice(2));
      flush();
      if (/^# /.test(t)) {
        h.set(h.at() + 6);
        if (h.at() > 236) h.head();
        h.para(t.slice(2), { sz: 16, red: 1, gap: 2.5, lh: 7 });
      } else if (/^## /.test(t)) {
        h.set(h.at() + 1.5);
        if (h.at() > 244) h.head();
        h.para(t.slice(3), { sz: 13, red: 1, gap: 2, lh: 6 });
      } else if (/^### /.test(t)) {
        /* a short bold heading, e.g. Acceptance: kept with what follows (the signing lines) */
        h.set(h.at() + 6);
        if (h.at() > 190) h.head();
        h.rule();
        h.para(t.slice(4), { st: "bold", sz: 11.5, red: 1, gap: 3 });
      } else if (/^>> /.test(t)) h.para(t.slice(3), { center: 1, gap: 2 });
      else if (/^1\. /.test(t)) h.para(t.slice(3), { x: h.M + 6, gap: 1.5 });
      else if (/_{5,}/.test(t)) {
        h.set(h.at() + 6);
        h.para(t, { gap: 4 });
      } else h.para(t, { justify: 1, gap: 2.2 });
    });
  flush();
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
