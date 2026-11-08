/* ================= ACCOUNTS DATA: bank accounts, transactions, categories, rules and the sums for the accounts pages ================= */
import { S } from "../core/state.js";
import { allTeam } from "../owner/owner.js";
import { isInv } from "../purchasing/materials-receipts.js";
import { sdCalc, sdR2, sdSales, sdStatus } from "./sales-calc.js";
export {
  AC_CATS,
  acAllTx,
  acBalance,
  acCatKind,
  acCatName,
  acCfg,
  acMonths,
  acParseStatement,
  acRuleFor,
  acSaleMatches,
  acSaveCfg,
  acSums,
  acTradeMatches,
  acUpdateTx,
};
/* Owner-private. One record todos/acct (kind "acct"): { accounts: [{ id, name, bank, last4, opening, openingDate }],
   rules: [{ m (words to look for), cat, vat (VAT % to take out, optional) }] }. Transactions are kept a month at a
   time per account: todos/atx-{account}-{YYYY-MM} (kind "acctx"): { acc, month, tx: [{ id, date, desc, amt (+ in,
   − out), bal, cat, vat (VAT in it, £), note, link: { t: "sale"|"trade", id, who } }] }. Statements come in as the
   CSV file every UK bank lets you download; a live bank feed needs our own server (see the note for Jasper). */
const AC_CATS = [
  ["sales", "Sales (customers paying)", "in"],
  ["oinc", "Other income", "in"],
  ["refund", "Refunds and tax repaid", "in"],
  ["mat", "Materials", "out"],
  ["subs", "Subcontractors (CIS)", "out"],
  ["wages", "Wages, PAYE and pensions", "out"],
  ["veh", "Vans, fuel and travel", "out"],
  ["hire", "Plant, skip and tool hire", "out"],
  ["tools", "Tools and equipment", "out"],
  ["ins", "Insurance", "out"],
  ["phone", "Phone, internet and software", "out"],
  ["prof", "Accountant and professional fees", "out"],
  ["prem", "Premises, yard and storage", "out"],
  ["adv", "Advertising and marketing", "out"],
  ["train", "Workwear, PPE and training", "out"],
  ["bank", "Bank charges and interest", "out"],
  ["oexp", "Other costs", "out"],
  ["tax", "HMRC (VAT, PAYE, CIS, tax)", "move"],
  ["draw", "Your drawings / dividends", "move"],
  ["loan", "Loans and finance repayments", "move"],
  ["xfer", "Transfer between your accounts", "move"],
];
const acCatName = (k) => (AC_CATS.find((c) => c[0] === k) || [k, k ? k : "To sort"])[1];
const acCatKind = (k) => (AC_CATS.find((c) => c[0] === k) || [])[2] || "";
const acCfg = () => Object.assign({ accounts: [], rules: [] }, S.acct || {});
const acMonths = () => S.acctx || [];
/* every transaction, newest first, each with its account and record */
function acAllTx(accId) {
  const out = [];
  acMonths()
    .filter((m) => !accId || m.acc === accId)
    .forEach((m) =>
      (m.tx || []).forEach((t) =>
        out.push(Object.assign({ acc: m.acc, rec: m.id, month: m.month }, t)),
      ),
    );
  return out.sort(
    (a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)),
  );
}
async function acSaveCfg(patch) {
  const rec = Object.assign({}, S.acct || {}, patch, { kind: "acct" });
  delete rec.id;
  await S.db.doc("todos/acct").set(rec);
  S.acct = Object.assign({ id: "acct" }, rec);
}
/* change some transactions: { "rec|txid": patch } */
async function acUpdateTx(changes) {
  const byRec = {};
  Object.entries(changes).forEach(([k, p]) => {
    const [rec, id] = k.split("|");
    (byRec[rec] = byRec[rec] || {})[id] = p;
  });
  for (const [rec, ps] of Object.entries(byRec)) {
    const m = acMonths().find((x) => x.id === rec);
    if (!m) continue;
    const tx = (m.tx || []).map((t) => (ps[t.id] ? Object.assign({}, t, ps[t.id]) : t));
    const d = Object.assign({}, m, { tx, updated: Date.now() });
    delete d.id;
    await S.db.doc("todos/" + rec).set(d);
    m.tx = tx;
  }
}
/* ---------- reading a bank statement CSV ---------- */
function acCsvRows(text) {
  const rows = [];
  let row = [],
    cell = "",
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === "," || c === ";" || c === "\t") {
      row.push(cell.trim());
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some((x) => x)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some((x) => x)) rows.push(row);
  return rows;
}
function acDate(s) {
  s = String(s || "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{2,4})/);
  if (m) {
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
    ].indexOf(m[2].toLowerCase());
    if (mi >= 0)
      return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${String(mi + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return "";
}
const acNum = (s) => {
  const t = String(s || "")
    .replace(/[£,\s]/g, "")
    .replace(/^\((.*)\)$/, "-$1");
  if (!t || t === "-") return null;
  const n = +t.replace(/CR$/i, "").replace(/DR$/i, "");
  if (isNaN(n)) return null;
  return /DR$/i.test(t) ? -Math.abs(n) : n;
};
/* finds the columns (date, description, amount or paid in/out, balance) from the header row */
function acParseStatement(text) {
  const rows = acCsvRows(text.replace(/^﻿/, ""));
  const hi = rows.findIndex(
    (r) =>
      r.some((c) => /date/i.test(c)) &&
      r.some((c) => /amount|paid|debit|credit|money|value|in|out/i.test(c)),
  );
  if (hi < 0) throw new Error("no header");
  const h = rows[hi].map((c) => c.toLowerCase());
  const col = (re, not) => h.findIndex((c) => re.test(c) && !(not && not.test(c)));
  const cDate = col(/^(transaction )?date|^date/);
  const cDesc = [
    col(/description|details|narrative|memo|payee|name|reference|transaction$/, /date|type/),
    col(/type/),
  ].filter((x) => x >= 0);
  const cAmt = col(/^amount|^value|amount \(gbp\)|amount\(gbp\)/);
  const cIn = col(/paid in|credit|money in|^in$|deposits?/);
  const cOut = col(/paid out|debit|money out|^out$|withdrawals?|payments?$/);
  const cBal = col(/balance/);
  if (cDate < 0 || (cAmt < 0 && cIn < 0 && cOut < 0)) throw new Error("no columns");
  const out = [];
  rows.slice(hi + 1).forEach((r) => {
    const date = acDate(r[cDate]);
    if (!date) return;
    let amt = null;
    if (cAmt >= 0) amt = acNum(r[cAmt]);
    else {
      const i = acNum(r[cIn]),
        o = acNum(r[cOut]);
      amt = (i ? Math.abs(i) : 0) - (o ? Math.abs(o) : 0);
      if (!i && !o) amt = null;
    }
    if (amt == null || amt === 0) return;
    const desc = cDesc
      .map((c) => r[c])
      .filter(Boolean)
      .join(" · ")
      .replace(/\s+/g, " ")
      .slice(0, 160);
    out.push({
      date,
      desc: desc || "(no description)",
      amt: sdR2(amt),
      bal: cBal >= 0 ? acNum(r[cBal]) : null,
    });
  });
  return out;
}
/* the rule that fits a description, if any */
function acRuleFor(desc) {
  const d = String(desc || "").toLowerCase();
  return acCfg().rules.find((r) => r.m && d.includes(String(r.m).toLowerCase())) || null;
}
/* invoices this payment in could be paying: same amount still owed (or within 1p) */
function acSaleMatches(t) {
  if (t.amt <= 0) return [];
  return sdSales()
    .filter((d) => d.type === "invoice" && ["awaiting", "part", "overdue"].includes(sdStatus(d)))
    .filter(
      (d) =>
        Math.abs(sdCalc(d).balance - t.amt) < 0.015 ||
        String(t.desc)
          .toUpperCase()
          .includes(("INV-" + d.number).toUpperCase()) ||
        new RegExp("\\b" + d.number + "\\b").test(t.desc),
    )
    .slice(0, 3);
}
/* trade invoices this payment out could be paying: approved or received, same amount */
function acTradeMatches(t) {
  if (t.amt >= 0) return [];
  return allTeam("invoices")
    .filter(isInv)
    .filter(
      (v) =>
        ["received", "approved", "sent"].includes(v.status || "sent") &&
        Math.abs((+v.amount || 0) - Math.abs(t.amt)) < 0.015,
    )
    .slice(0, 3);
}
/* the sums for a date range: in, out, profit, by category, by month, VAT */
function acSums(from, to) {
  const tx = acAllTx().filter((t) => t.date >= from && t.date <= to);
  const byCat = {};
  let inc = 0,
    exp = 0,
    vatIn = 0;
  tx.forEach((t) => {
    const k = t.cat || "";
    const kind = acCatKind(k) || (t.amt > 0 ? "in" : "out");
    /* costs without the VAT in them (it is claimed back) */
    const net = t.amt < 0 && t.vat ? t.amt + +t.vat : t.amt;
    byCat[k] = sdR2((byCat[k] || 0) + (kind === "move" ? t.amt : net));
    if (kind === "move") return;
    if (t.amt > 0) inc += net;
    else exp += -net;
    if (t.amt < 0 && t.vat) vatIn += +t.vat;
  });
  /* VAT charged: on invoices dated in the range (and not reverse charge) */
  const vatOut = sdSales()
    .filter(
      (d) =>
        d.type === "invoice" && d.status && d.status !== "draft" && d.date >= from && d.date <= to,
    )
    .reduce((a, d) => a + sdCalc(d).vat, 0);
  return {
    tx,
    byCat,
    inc: sdR2(inc),
    exp: sdR2(exp),
    profit: sdR2(inc - exp),
    vatOut: sdR2(vatOut),
    vatIn: sdR2(vatIn),
    unsorted: tx.filter((t) => !t.cat).length,
  };
}
/* an account's balance: the last balance its statement gave, else opening + everything since */
function acBalance(a) {
  const tx = acAllTx(a.id);
  const withBal = tx.find((t) => t.bal != null);
  if (withBal) {
    const later = tx.filter((t) => t.date > withBal.date);
    return sdR2(withBal.bal + later.reduce((x, t) => x + t.amt, 0));
  }
  return sdR2(
    (+a.opening || 0) +
      tx.filter((t) => !a.openingDate || t.date >= a.openingDate).reduce((x, t) => x + t.amt, 0),
  );
}
