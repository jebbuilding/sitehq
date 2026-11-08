/* ================= SALES WORD IMPORT: bring in an estimate written in Word (client, number, wording, costs, terms) ================= */
import { iso } from "../core/helpers.js";
import { loadXlsx } from "../timesheets/day-work-xlsx.js";
export { sdParseEstimate, sdReadDocxAll };
/* A .docx is a zip; its words are in word/document.xml, one <w:p> per paragraph, with its style (Heading1/2), list
   (numbered or bullet, from word/numbering.xml), alignment and any picture. The page header (logo + address lines)
   and footer (job ref, trades line, VAT number) are in word/header*.xml and word/footer*.xml. James's estimates run:
   client name and address, "Estimate Number: …", the date, "Re: …", "Dear …", the wording, "Summary of Estimated
   Costs" ("Total estimate: £… +VAT"), "Estimate is valid for …" and a note, "Works Included…", "Works Excluded…",
   closing words, "Yours sincerely," / "Kind Regards" with his signature, his name, then the terms and conditions.
   Anything not found is left blank. The file's words are data only. */
function sdXmlText(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
/* numbering.xml: numId → "bullet" | "decimal" (its first level) */
function sdDocxLists(xml) {
  const abs = {},
    out = {};
  (xml.match(/<w:abstractNum [\s\S]*?<\/w:abstractNum>/g) || []).forEach((a) => {
    const id = (a.match(/w:abstractNumId="(\d+)"/) || [])[1];
    const f = (a.match(/<w:numFmt w:val="([a-zA-Z]+)"/) || [])[1] || "decimal";
    abs[id] = f === "bullet" ? "bullet" : "decimal";
  });
  (xml.match(/<w:num w:numId="\d+"[\s\S]*?<\/w:num>/g) || []).forEach((n) => {
    const id = (n.match(/w:numId="(\d+)"/) || [])[1];
    const a = (n.match(/<w:abstractNumId w:val="(\d+)"/) || [])[1];
    out[id] = abs[a] || "decimal";
  });
  return out;
}
/* paragraphs: [{ t, h (1|2|0), list ("bullet"|"decimal"|""), center, img (relationship id), b, i, u }] */
function sdDocxParas(xml, lists) {
  const out = [];
  const body = xml.replace(/<w:footnotes[\s\S]*$/, "");
  (body.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).forEach((p) => {
    let t = "";
    p.replace(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g, (m, txt) => {
      t += txt != null ? sdXmlText(txt) : m === "<w:br/>" ? "\n" : "\t";
      return m;
    });
    t = t
      .replace(/[  ]+/g, " ")
      .replace(/ *\t[\t ]*/g, "\t")
      .trim();
    const st = (p.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || "";
    const num = (p.match(/<w:numId w:val="(\d+)"/) || [])[1];
    const img = (p.match(/r:embed="([^"]+)"/) || [])[1] || "";
    if (!t && !img) return;
    out.push({
      t,
      h: /^(Heading1|Title)$/i.test(st) ? 1 : /^Heading[2-9]$/i.test(st) ? 2 : 0,
      list: num && num !== "0" ? (lists || {})[num] || "decimal" : "",
      center: /<w:jc w:val="center"\/>/.test(p),
      img,
      b: /<w:b\/>|<w:b w:val="1"\/>/.test(p),
      i: /<w:i\/>/.test(p),
      u: /<w:u w:val="single"\/>/.test(p),
    });
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
/* a paragraph back to marked text for the terms: "# " heading, "## " sub-heading, "- " bullet, ">> " centred */
const sdMark = (p) =>
  (p.h === 1
    ? "# "
    : p.h === 2
      ? "## "
      : p.list === "bullet"
        ? "- "
        : p.list
          ? "1. "
          : p.center
            ? ">> "
            : p.b && p.t.length < 40 && !/_{3,}/.test(p.t)
              ? "### "
              : "") + p.t;
/* paragraphs → { est, terms, termsTitle, intro, closing, costNote, signoff, sigRel } */
function sdParseEstimate(paras) {
  const T = paras.map((p) => p.t);
  const find = (re, from) => {
    for (let i = from || 0; i < T.length; i++) if (re.test(T[i])) return i;
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
    [iSum, iInc, iExc, iEnd, iTerms, T.length].filter((x) => x > i).sort((a, b) => a - b)[0];
  const head = T.slice(0, iNo >= 0 ? iNo : iRe >= 0 ? iRe : iDear >= 0 ? iDear : 0);
  const est = {
    type: "estimate",
    number: iNo >= 0 ? (T[iNo].match(/:\s*([A-Za-z0-9\-/]+)/) || [])[1] || "" : "",
    client: head[0] || "",
    address: head.slice(1).join("\n"),
    date: "",
    title: iRe >= 0 ? T[iRe].replace(/^re\s*:\s*/i, "") : "",
    dear: iDear >= 0 ? T[iDear].replace(/^dear\s+/i, "").replace(/[,.]$/, "") : "",
    lines: [],
    incl: "",
    excl: "",
  };
  for (let i = Math.max(iNo, 0); i < Math.min(T.length, Math.max(iRe, iNo) + 3); i++) {
    const di = sdDocxDate(T[i]);
    if (di) {
      est.date = di;
      break;
    }
  }
  const intro = iDear >= 0 ? T.slice(iDear + 1, stop(iDear)).join("\n\n") : "";
  /* costs: each line with £ in the summary is a cost (the total line only if there's nothing else) */
  const sum = iSum >= 0 ? T.slice(iSum + 1, stop(iSum)) : [];
  let total = 0,
    costNote = "",
    afterValid = false;
  sum.forEach((p) => {
    const v = sdMoney(p);
    const vd = p.match(/valid for (\d+) days/i);
    if (vd) {
      est.validDays = +vd[1];
      afterValid = true;
      return;
    }
    if (!v) {
      if (afterValid || /subject to change|please be advised/i.test(p))
        costNote += (costNote ? "\n\n" : "") + p;
      return;
    }
    if (/total/i.test(p)) {
      if (!total) total = v;
    } else if (!/inc(luding)?\.? vat/i.test(p))
      est.lines.push({
        d:
          p
            .split("\t")[0]
            .replace(/:?\s*£\s*[\d,]+(\.\d+)?.*$/, "")
            .trim() || "Works",
        a: v,
        vc: "S20",
        k: "lab",
      });
  });
  if (!est.lines.length && total)
    est.lines.push({ d: est.title || "Works as described", a: total, vc: "S20", k: "lab" });
  /* no mention of VAT at all: the prices have none */
  if (sum.length && !sum.some((p) => /vat/i.test(p))) est.lines.forEach((l) => (l.vc = "NV"));
  est.incl = iInc >= 0 ? T.slice(iInc + 1, stop(iInc)).join("\n") : "";
  if (iInc >= 0 && /break ?down of costs/i.test(T[iInc])) est.inclHead = T[iInc];
  /* excluded runs until the closing words ("Please note…", "We look forward…") */
  let exc = iExc >= 0 ? T.slice(iExc + 1, stop(iExc)) : [];
  const iClose = exc.findIndex((p) =>
    /^(please note|we (very much )?look forward|should you|thank you)/i.test(p),
  );
  const closingParas = iClose >= 0 ? exc.slice(iClose) : [];
  if (iClose >= 0) exc = exc.slice(0, iClose);
  est.excl = exc.join("\n");
  /* sign-off: "Yours sincerely," and/or "Kind Regards", a signature picture, the name */
  let signoff = "",
    sigRel = "";
  if (iEnd >= 0)
    for (let i = iEnd; i < Math.min(T.length, iEnd + 4); i++) {
      if (/^(yours|kind regards|best regards|regards)/i.test(T[i]))
        signoff += (signoff ? "\n" : "") + T[i];
      if (paras[i].img && !sigRel) sigRel = paras[i].img;
    }
  /* the terms: a title line, maybe "Version date: …", then the clauses kept with their headings and lists */
  let terms = "",
    termsVer = "";
  if (iTerms >= 0) {
    let rest = paras.slice(iTerms + 1);
    if (rest[0] && /^version/i.test(rest[0].t)) {
      termsVer = rest[0].t;
      rest = rest.slice(1);
    }
    terms = rest.map(sdMark).join("\n");
  }
  return {
    est,
    terms,
    termsTitle: iTerms >= 0 ? T[iTerms] : "",
    termsVer,
    intro,
    closing: closingParas.join("\n\n"),
    costNote,
    signoff,
    sigRel,
  };
}
/* the letterhead in a Word file's page header and footer */
function sdParseLetterhead(headXml, footXml) {
  const lines = (xml) =>
    (xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).map((p) => {
      let t = "";
      p.replace(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g, (m, x) => (t += sdXmlText(x)));
      return t.replace(/\s+/g, " ").trim();
    });
  const hl = lines(headXml || "");
  /* keep blank lines between groups (address / contacts) but not at the ends */
  const head = hl
    .join("\n")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
  const fl = lines(footXml || "").filter(Boolean);
  const vat = fl.map((t) => (t.match(/VAT[^0-9]*([0-9 ]{9,14})/i) || [])[1]).find(Boolean) || "";
  const tagline = fl.find((t) => /\|/.test(t) && !/page/i.test(t)) || "";
  return {
    head,
    vat: vat.replace(/\s/g, ""),
    tagline,
    logoRel: ((headXml || "").match(/r:embed="([^"]+)"/) || [])[1] || "",
  };
}
/* reads the zip: { paras, letterhead, image(rel, part) → Blob } */
async function sdReadDocxAll(file) {
  await loadXlsx();
  const CFB = window.XLSX.CFB;
  const zip = CFB.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
  const get = (p) => CFB.find(zip, "/" + p) || CFB.find(zip, p);
  const txt = (p) => {
    const e = get(p);
    return e ? new TextDecoder().decode(e.content) : "";
  };
  const doc = txt("word/document.xml");
  if (!doc) throw new Error("not a word file");
  /* the header and footer used on the first page */
  const rels = txt("word/_rels/document.xml.rels");
  const relTarget = (relsXml, id) =>
    (relsXml.match(new RegExp('Id="' + id + '"[^>]*Target="([^"]+)"')) ||
      relsXml.match(new RegExp('Target="([^"]+)"[^>]*Id="' + id + '"')) ||
      [])[1] || "";
  const firstRef = (kind) => {
    const m =
      doc.match(
        new RegExp("<w:" + kind + 'Reference w:type="(?:first|default)" r:id="([^"]+)"', "g"),
      ) || [];
    const ids = m.map((x) => x.match(/r:id="([^"]+)"/)[1]);
    for (const id of ids) {
      const t = relTarget(rels, id);
      if (
        t &&
        txt("word/" + t)
          .replace(/<[^>]+>/g, "")
          .trim()
      )
        return t;
    }
    return ids.length ? relTarget(rels, ids[0]) : "";
  };
  const headPart = firstRef("header"),
    footPart = firstRef("footer");
  const image = (relsPart, id) => {
    if (!id) return null;
    const t = relTarget(txt(relsPart), id);
    const e = t && get("word/" + t.replace(/^\.\//, ""));
    if (!e) return null;
    const ext = (t.split(".").pop() || "png").toLowerCase();
    return new Blob([e.content], {
      type: ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/" + ext,
    });
  };
  const lh = sdParseLetterhead(
    headPart ? txt("word/" + headPart) : "",
    footPart ? txt("word/" + footPart) : "",
  );
  return {
    paras: sdDocxParas(doc, sdDocxLists(txt("word/numbering.xml"))),
    letterhead: lh,
    logo: headPart ? image("word/_rels/" + headPart + ".rels", lh.logoRel) : null,
    image: (id) => image("word/_rels/document.xml.rels", id),
  };
}
