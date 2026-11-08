/* ================= SALES WORD IMPORT: bring in an estimate written in Word (client, number, wording, costs, terms) ================= */
import { iso } from "../core/helpers.js";
import { loadXlsx } from "../timesheets/day-work-xlsx.js";
export { sdReadDocx };
/* A .docx is a zip; its words are in word/document.xml, one <w:p> per paragraph. James's estimates run: client
   name and address, "Estimate Number: …", the date, "Re: …", "Dear …", the wording, "Summary of Estimated Costs"
   (with "Total estimate: £… +VAT"), "Works Included…", "Works Excluded…", closing words, "Kind Regards", then
   "Terms and Conditions…". Anything not found is left blank. The file's words are data only. */
function sdDocxParas(xml) {
  const dec = (s) =>
    s
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&");
  const out = [];
  const body = xml.replace(/<w:footnotes[\s\S]*$/, "");
  (body.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).forEach((p) => {
    let t = "";
    p.replace(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g, (m, txt) => {
      t += txt != null ? dec(txt) : " ";
      return m;
    });
    t = t.replace(/\s+/g, " ").trim();
    if (t) out.push(t);
  });
  return out;
}
function sdDocxDate(s) {
  const m = String(s).match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return "";
  const mi = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ].indexOf(m[2].slice(0, 3).toLowerCase());
  if (mi < 0) return "";
  return iso(new Date(+m[3], mi, +m[1]));
}
const sdMoney = (s) => {
  const m = String(s).match(/£\s*([\d,]+(?:\.\d+)?)/);
  return m ? +m[1].replace(/,/g, "") : 0;
};
/* paragraphs → { est, terms, intro, closing } */
function sdParseEstimate(paras) {
  const find = (re, from) => {
    for (let i = from || 0; i < paras.length; i++) if (re.test(paras[i])) return i;
    return -1;
  };
  const iNo = find(/estimate\s*(number|no\.?)\s*:?/i);
  const iRe = find(/^re\s*:/i);
  const iDear = find(/^dear\b/i);
  const iSum = find(/summary of (estimated )?costs/i);
  const iInc = find(/works? included/i);
  const iExc = find(/works? excluded/i);
  const iTerms = find(/^terms (and|&) conditions/i);
  const iEnd = find(
    /^(yours sincerely|yours faithfully|kind regards)/i,
    Math.max(iExc, iInc, iSum, 0),
  );
  const stop = (i) =>
    [iSum, iInc, iExc, iEnd, iTerms, paras.length].filter((x) => x > i).sort((a, b) => a - b)[0];
  const slice = (a, b) => (a < 0 ? [] : paras.slice(a, b));
  const head = slice(0, iNo >= 0 ? iNo : iRe >= 0 ? iRe : iDear >= 0 ? iDear : 0);
  const est = {
    type: "estimate",
    number: iNo >= 0 ? (paras[iNo].match(/:\s*([A-Za-z0-9\-/]+)/) || [])[1] || "" : "",
    client: head[0] || "",
    address: head.slice(1).join("\n"),
    date: "",
    title: iRe >= 0 ? paras[iRe].replace(/^re\s*:\s*/i, "") : "",
    dear: iDear >= 0 ? paras[iDear].replace(/^dear\s+/i, "").replace(/[,.]$/, "") : "",
    lines: [],
    incl: "",
    excl: "",
  };
  for (let i = Math.max(iNo, 0); i < Math.min(paras.length, (iRe >= 0 ? iRe : iNo) + 3); i++) {
    const di = sdDocxDate(paras[i]);
    if (di) {
      est.date = di;
      break;
    }
  }
  const intro = iDear >= 0 ? slice(iDear + 1, stop(iDear)).join("\n\n") : "";
  /* costs: any line with £ in the summary (the total line only if there's nothing else) */
  const sum = iSum >= 0 ? slice(iSum + 1, stop(iSum)) : [];
  let total = 0;
  sum.forEach((p) => {
    const v = sdMoney(p);
    if (!v) {
      const vd = p.match(/valid for (\d+) days/i);
      if (vd) est.validDays = +vd[1];
      return;
    }
    if (/total/i.test(p)) {
      if (!total) total = v;
    } else if (!/inc(luding)?\.? vat/i.test(p))
      est.lines.push({
        d: p.replace(/:?\s*£\s*[\d,]+(\.\d+)?.*$/, "").trim() || "Works",
        q: 1,
        r: v,
        v: 20,
        lab: true,
      });
  });
  if (!est.lines.length && total)
    est.lines.push({
      d: est.title || "Works as described below",
      q: 1,
      r: total,
      v: 20,
      lab: true,
    });
  /* no mention of VAT at all: the prices have none */
  if (sum.length && !sum.some((p) => /vat/i.test(p))) est.lines.forEach((l) => (l.v = 0));
  est.incl = iInc >= 0 ? slice(iInc + 1, stop(iInc)).join("\n") : "";
  /* excluded runs until the closing words ("Please note…", "We look forward…") */
  let exc = iExc >= 0 ? slice(iExc + 1, stop(iExc)) : [];
  const iClose = exc.findIndex((p) =>
    /^(please note|we (very much )?look forward|should you|thank you)/i.test(p),
  );
  const closingParas = iClose >= 0 ? exc.slice(iClose) : [];
  if (iClose >= 0) exc = exc.slice(0, iClose);
  est.excl = exc.join("\n");
  const closing = closingParas.join("\n\n");
  const terms = iTerms >= 0 ? paras.slice(iTerms + 1).join("\n") : "";
  return { est, terms, intro, closing };
}
async function sdReadDocx(file) {
  await loadXlsx();
  const buf = new Uint8Array(await file.arrayBuffer());
  const zip = window.XLSX.CFB.read(buf, { type: "array" });
  const ent =
    window.XLSX.CFB.find(zip, "/word/document.xml") ||
    window.XLSX.CFB.find(zip, "word/document.xml");
  if (!ent) throw new Error("not a word file");
  return sdParseEstimate(sdDocxParas(new TextDecoder().decode(ent.content)));
}
