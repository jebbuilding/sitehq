/* ================= SALES SUMS: estimates and invoices to clients – totals, VAT, CIS, status, numbers ================= */
import { addDays, iso, parse } from "../core/helpers.js";
import { S } from "../core/state.js";
import { newId } from "../files/outbox.js";
export {
  SD_KINDS,
  SD_VATC,
  sdAmt,
  sdCalc,
  sdDueDate,
  sdGroups,
  sdKind,
  sdLines,
  sdNextNumber,
  sdNo,
  sdR2,
  sdSales,
  sdSaveRec,
  sdSet,
  sdStatus,
  sdTag,
  sdTaxYear,
  sdVc,
};
/* Each estimate or invoice is one owner-private record todos/sd-{id} (kind "sale"):
   { type: "estimate"|"invoice", number, date, validDays | dueDate, clientId, client, address, email, site, title,
     dear, intro, lines: [{ d, a (amount £), q, u, r (qty × rate, when priced that way), vc (VAT code), k (lab|mat|oth) }],
     inc (prices include VAT), incl, excl, notes, cis: ""|"20"|"30"|"0", ret (retention %), status, sentAt,
     payments: [{ date, amt, note }], emails, fromId (the estimate an invoice came from), part: "Deposit 25%" … }
   Older records have lines { q, r, v (VAT %), lab } and a whole-invoice drc (reverse charge) flag: still read.
   Settings: one record todos/salesset (kind "salesset"): numbers, payment days, letterhead, wording, terms, bank. */
/* VAT codes: rate, whether the customer pays it to HMRC (reverse charge), and the words on the PDF */
const SD_VATC = {
  S20: { r: 20, l: "20% Standard", p: "20%" },
  R5: { r: 5, l: "5% Reduced (e.g. converting to homes, empty homes)", p: "5%" },
  Z0: { r: 0, l: "0% Zero rated (e.g. new-build homes, energy-saving, disabled access)", p: "0%" },
  RC20: { r: 20, rc: 1, l: "Reverse charge 20% (CIS: the contractor pays the VAT)", p: "RC 20%" },
  RC5: { r: 5, rc: 1, l: "Reverse charge 5% (CIS: the contractor pays the VAT)", p: "RC 5%" },
  EX: { r: 0, l: "Exempt", p: "Exempt" },
  NV: { r: 0, l: "No VAT (outside the scope)", p: "No VAT" },
};
const SD_KINDS = { lab: "Labour", mat: "Materials", oth: "Other" };
const SD_EST_ST = {
  draft: ["Draft", ""],
  sent: ["Sent", "day"],
  accepted: ["Accepted", "ok"],
  declined: ["Declined", "bad"],
  invoiced: ["Invoiced", "ok"],
};
const SD_INV_ST = {
  draft: ["Draft", ""],
  awaiting: ["Awaiting payment", "day"],
  part: ["Part paid", "warn"],
  overdue: ["Overdue", "bad"],
  paid: ["Paid", "ok"],
};
const sdR2 = (n) => Math.round((+n || 0) * 100 + (n < 0 ? -1e-9 : 1e-9)) / 100;
const sdSales = () => S.sales || [];
function sdSet() {
  const s = Object.assign(
    {
      nextEst: 1,
      nextInv: 1,
      payDays: 14,
      validDays: 30,
      vatReg: true,
      inc: false,
      vc: "S20",
      tagline: "New Builds | Extensions | Loft Conversions | Refurbishments | Project Management",
      head: "",
      intro:
        "Thank you for the opportunity to submit an estimate for the proposed works. Please find our estimate below, setting out what is and is not included.",
      costNote:
        "Please note these figures may change with the cost of materials, which is beyond our control.",
      closing:
        "Please note that any amendments to the drawings or specification upon which this estimate is based may result in a revision to the figures stated above.\n\nWe look forward to the opportunity of working with you on this project. Should you have any questions, please do not hesitate to contact us.",
      signoff: "Yours sincerely,\nKind Regards",
      inclHead: "Works Included Within the Estimate",
      exclHead: "Works Excluded from the Estimate",
      terms: "",
      termsTitle: "Terms and Conditions of Contract",
      termsVer: "",
      bank: "",
      invNote: "Thank you for your business.",
      invIntro: "Please find below our invoice for the works carried out.",
    },
    S.salesSet || {},
  );
  return s;
}
/* one line: its VAT code (older lines had a % and a whole-invoice reverse-charge flag) */
function sdVc(l, d) {
  if (l.vc && SD_VATC[l.vc]) return l.vc;
  const v = l.v == null ? 20 : +l.v;
  if (d && d.drc) return v === 5 ? "RC5" : "RC20";
  return v === 5 ? "R5" : v === 0 ? "Z0" : "S20";
}
const sdKind = (l) => (l.k && SD_KINDS[l.k] ? l.k : l.lab === false ? "mat" : "lab");
/* the amount on a line: the amount saved with it (the form works out qty × rate into it); older lines: qty × price */
function sdAmt(l) {
  if (l.a != null && l.a !== "") return sdR2(l.a);
  return sdR2((l.q === "" || l.q == null ? 1 : +l.q) * (+l.r || 0));
}
const sdLines = (d) => (d.lines || []).filter((l) => l && !l.h && (l.d || sdAmt(l)));
/* the lines grouped under their headings: [{ h: heading or "", lines, sub }] */
function sdGroups(d) {
  const out = [];
  let g = null;
  (d.lines || []).forEach((l) => {
    if (!l) return;
    if (l.h) {
      g = { h: l.d || "", lines: [], sub: 0 };
      out.push(g);
      return;
    }
    if (!(l.d || sdAmt(l))) return;
    if (!g) {
      g = { h: "", lines: [], sub: 0 };
      out.push(g);
    }
    g.lines.push(l);
    g.sub = sdR2(g.sub + sdAmt(l));
  });
  return out.filter((x) => x.h || x.lines.length);
}
/* the money on one estimate or invoice */
function sdCalc(d) {
  const inc = !!d.inc;
  let net = 0,
    vat = 0,
    rcVat = 0,
    lab = 0,
    mat = 0;
  const byRate = {};
  sdLines(d).forEach((l) => {
    const c = SD_VATC[sdVc(l, d)];
    let n = sdAmt(l);
    /* prices with VAT in: take it out */
    if (inc && c.r && !c.rc) n = sdR2(n / (1 + c.r / 100));
    const v = sdR2((n * c.r) / 100);
    net += n;
    if (c.rc) rcVat += v;
    else vat += v;
    const k = sdVc(l, d);
    byRate[k] = byRate[k] || { net: 0, vat: 0 };
    byRate[k].net += n;
    byRate[k].vat += v;
    if (sdKind(l) === "lab") lab += n;
    else if (sdKind(l) === "mat") mat += n;
  });
  net = sdR2(net);
  vat = sdR2(vat);
  const gross = sdR2(net + vat);
  /* CIS: a contractor takes tax off the labour (not materials, not VAT) */
  const cis = d.type === "invoice" && +d.cis ? sdR2((lab * +d.cis) / 100) : 0;
  /* retention: the client holds back a % of the work until the defects period ends */
  const ret = d.type === "invoice" && +d.ret ? sdR2((net * +d.ret) / 100) : 0;
  const due = sdR2(gross - cis - ret);
  const paid = sdR2((d.payments || []).reduce((a, p) => a + (+p.amt || 0), 0));
  Object.values(byRate).forEach((x) => {
    x.net = sdR2(x.net);
    x.vat = sdR2(x.vat);
  });
  return {
    net,
    vat,
    rcVat: sdR2(rcVat),
    gross,
    lab: sdR2(lab),
    mat: sdR2(mat),
    cis,
    ret,
    due,
    paid,
    balance: sdR2(due - paid),
    byRate,
  };
}
function sdDueDate(d) {
  if (d.dueDate) return d.dueDate;
  return iso(addDays(parse(d.date || iso(new Date())), +sdSet().payDays || 14));
}
function sdStatus(d) {
  if (d.type === "estimate") return d.status && SD_EST_ST[d.status] ? d.status : "draft";
  if (!d.status || d.status === "draft") return "draft";
  const c = sdCalc(d);
  if (c.paid >= c.due - 0.005 && c.due > 0) return "paid";
  if (sdDueDate(d) < iso(new Date())) return "overdue";
  return c.paid > 0 ? "part" : "awaiting";
}
function sdTag(d) {
  const st = sdStatus(d);
  const t = (d.type === "estimate" ? SD_EST_ST : SD_INV_ST)[st];
  return `<span class="tag ${t[1]}">${t[0]}</span>`;
}
const sdNo = (d) => (d.type === "estimate" ? "EST-" : "INV-") + (d.number || "?");
/* the next free number (never re-uses one already on a record) */
function sdNextNumber(type) {
  const k = type === "estimate" ? "nextEst" : "nextInv";
  const used = sdSales()
    .filter((d) => d.type === type)
    .map((d) => +d.number || 0);
  return Math.max(+sdSet()[k] || 1, used.length ? Math.max(...used) + 1 : 1);
}
/* UK tax year (6 April – 5 April) that a date falls in: its start year */
function sdTaxYear(di) {
  const d = parse(di);
  return d.getMonth() > 3 || (d.getMonth() === 3 && d.getDate() >= 6)
    ? d.getFullYear()
    : d.getFullYear() - 1;
}

/* ---------- saving ---------- */
async function sdSaveRec(d) {
  const rec = Object.assign({}, d, { kind: "sale", updated: Date.now() });
  const id = rec.id || "sd-" + newId();
  delete rec.id;
  if (!rec.number) rec.number = String(sdNextNumber(rec.type));
  if (!rec.created) rec.created = Date.now();
  await S.db.doc("todos/" + id).set(rec);
  /* keep the next number ahead of every one used */
  const k = rec.type === "estimate" ? "nextEst" : "nextInv";
  if ((+rec.number || 0) >= (+sdSet()[k] || 1))
    await S.db
      .doc("todos/salesset")
      .set(Object.assign({}, S.salesSet || {}, { kind: "salesset", [k]: (+rec.number || 0) + 1 }));
  return Object.assign({ id }, rec);
}
