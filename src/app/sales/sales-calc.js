/* ================= SALES SUMS: estimates and invoices to clients – totals, VAT, CIS, status, numbers ================= */
import { addDays, iso, parse } from "../core/helpers.js";
import { S } from "../core/state.js";
export {
  SD_VAT,
  sdCalc,
  sdDueDate,
  sdNextNumber,
  sdNo,
  sdR2,
  sdSales,
  sdSet,
  sdStatus,
  sdTag,
  sdTaxYear,
};
/* Each estimate or invoice is one owner-private record todos/sd-{id} (kind "sale"):
   { type: "estimate"|"invoice", number, date, validDays | dueDate, clientId, client, address, email, site, title,
     dear, intro, lines: [{ d, q, r, v, lab }], incl, excl, notes, cis: ""|"20"|"30", drc, status, sentAt,
     payments: [{ date, amt, note }], fromId (the estimate an invoice came from), part: "deposit 25%" … }
   Settings for both are one record todos/salesset (kind "salesset"): next numbers, payment days, bank details, the
   standard letter wording and terms, the footer line. */
const SD_VAT = [20, 5, 0];
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
const sdR2 = (n) => Math.round((+n || 0) * 100) / 100;
const sdSales = () => S.sales || [];
function sdSet() {
  return Object.assign(
    {
      nextEst: 1,
      nextInv: 1,
      payDays: 14,
      validDays: 30,
      tagline: "New Builds | Extensions | Loft Conversions | Refurbishments | Project Management",
      intro:
        "Thank you for the opportunity to submit an estimate for the proposed works. Please find our estimate below, setting out what is and is not included.",
      closing:
        "Please note that any amendments to the drawings or specification upon which this estimate is based may result in a revision to the figures stated above.\n\nWe look forward to the opportunity of working with you on this project. Should you have any questions, please do not hesitate to contact us.",
      terms: "",
      bank: "",
      invNote: "Thank you for your business.",
    },
    S.salesSet || {},
  );
}
/* the money on one estimate or invoice */
function sdCalc(d) {
  const lines = (d.lines || []).filter((l) => l && (l.d || +l.r));
  let net = 0,
    vat = 0,
    lab = 0;
  lines.forEach((l) => {
    const n = sdR2((l.q === "" || l.q == null ? 1 : +l.q) * (+l.r || 0));
    net += n;
    if (!d.drc) vat += (n * (l.v == null ? 20 : +l.v)) / 100;
    if (l.lab !== false) lab += n;
  });
  net = sdR2(net);
  vat = sdR2(vat);
  const gross = sdR2(net + vat);
  /* CIS: a contractor takes tax off the labour (not materials, not VAT) */
  const cis = d.type === "invoice" && d.cis ? sdR2((lab * +d.cis) / 100) : 0;
  const due = sdR2(gross - cis);
  const paid = sdR2((d.payments || []).reduce((a, p) => a + (+p.amt || 0), 0));
  return { net, vat, gross, lab: sdR2(lab), cis, due, paid, balance: sdR2(due - paid) };
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
