/* ================= ACCOUNTS TRADE PAID: trades' invoices marked paid count in the accounts by themselves ================= */
import { addDays, iso, parse } from "../core/helpers.js";
import { allTeam, nameOf } from "../owner/owner.js";
import { isInv } from "../purchasing/materials-receipts.js";
import { acAllTx, acUpdateTx } from "./acct-data.js";
import { acLockedRec } from "./acct-reconcile.js";
export { atpLinked, atpMatchBank, atpWaiting };
/* James, Nov 2026: "Trade invoices paid should automatically go into accounts". A trade's invoice marked paid counts
   as a Subcontractors cost on the day it was paid, straight away. When the bank statement comes in, the payment out
   of the same amount (from 3 days before to 14 days after) is linked to it by itself and sorted as Subcontractors,
   so it is never counted twice. Until then a payment of that amount on the statement that isn't linked to anything
   is taken to be it, so bringing in a statement never doubles it up. */

/* "who|id" of every trade invoice a bank payment is already linked to */
function atpLinked(all) {
  return new Set(
    all.filter((t) => t.link && t.link.t === "trade").map((t) => t.link.who + "|" + t.link.id),
  );
}
const atpDay = (v) => v.paidOn || (v.paidAt ? iso(new Date(v.paidAt)) : "");
/* trades' invoices paid but not linked to a bank payment */
function atpPaid() {
  return allTeam("invoices")
    .filter(isInv)
    .filter((v) => v.status === "paid" && +v.amount > 0 && atpDay(v));
}
/* the bank payment out that could be this invoice: same amount, near the day paid, not linked to anything */
function atpFind(v, all, used) {
  const d = atpDay(v);
  const lo = iso(addDays(parse(d), -3)),
    hi = iso(addDays(parse(d), 14));
  return all.find(
    (t) =>
      t.amt < 0 &&
      !t.link &&
      !t.rcpt &&
      !(t.split && t.split.length) &&
      (!t.cat || t.cat === "subs" || t.cat === "wages") &&
      t.date >= lo &&
      t.date <= hi &&
      Math.abs(Math.abs(t.amt) - +v.amount) < 0.015 &&
      !used.has(t.rec + "|" + t.id),
  );
}
/* paid invoices in the date range that aren't on a bank statement yet (these are added to the costs) */
function atpWaiting(from, to) {
  const all = acAllTx();
  const linked = atpLinked(all);
  const used = new Set();
  return atpPaid()
    .filter((v) => !linked.has(v.who + "|" + v.id))
    .filter((v) => {
      if (v.paidHow === "cash") return true;
      const t = atpFind(v, all, used);
      if (t) used.add(t.rec + "|" + t.id);
      return !t;
    })
    .filter((v) => atpDay(v) >= from && atpDay(v) <= to)
    .map((v) => ({ v, date: atpDay(v), amt: +v.amount }));
}
/* after a statement comes in: link each paid invoice to its bank payment. Returns how many were linked. */
async function atpMatchBank() {
  const all = acAllTx();
  const linked = atpLinked(all);
  const used = new Set();
  const changes = {};
  let n = 0;
  atpPaid()
    .filter((v) => !linked.has(v.who + "|" + v.id) && v.paidHow !== "cash")
    .forEach((v) => {
      const t = atpFind(v, all, used);
      if (!t) return;
      const k = t.rec + "|" + t.id;
      used.add(k);
      if (acLockedRec(t.rec)) return;
      changes[k] = {
        cat: "subs",
        link: {
          t: "trade",
          id: v.id,
          who: v.who,
          label: `${nameOf(v.who)} invoice ${v.number || ""}`,
        },
      };
      n++;
    });
  if (n) await acUpdateTx(changes);
  return n;
}
