/* ================= QUOTE WATCH: estimates about to run out, and merchants' prices going up after a job was priced ================= */
import { addDays, esc, iso, parse } from "../core/helpers.js";
import { S } from "../core/state.js";
import { plSupName } from "../purchasing/price-order.js";
import { sdNo, sdSet, sdStatus } from "./sales-calc.js";
export { QTW };
/* James (Nov 2026, "price-rise warnings"): an estimate that's been sent and not answered shows "⏳ Runs out in 3 days"
   from a week before its "valid for" days are up, and "⌛ Ran out 5 days ago" after – a nudge to chase it or re-price.
   When a merchant's price list is brought in again and prices have gone up (purchasing/price-order.js keeps each rise
   on the list: rises [{ at, n, avg }]), every estimate still waiting (draft or sent) that was priced before it says so –
   "Travis Perkins put up 12 prices, 6% on average, since this was priced". The estimates list has both at the top. */
const QTW = (() => {
  const waiting = (d) => d && d.type === "estimate" && ["draft", "sent"].includes(sdStatus(d));
  /* days left on a sent estimate (negative once it has run out), or null */
  function daysLeft(d) {
    if (!d || d.type !== "estimate" || sdStatus(d) !== "sent" || !d.date) return null;
    const vd = +d.validDays || +sdSet().validDays || 30;
    const end = addDays(parse(d.date), vd);
    const t = parse(iso(new Date()));
    return Math.round((end - t) / 864e5);
  }
  function expiryTag(d) {
    const n = daysLeft(d);
    if (n == null || n > 7) return "";
    return n >= 0
      ? ` <span class="tag day">⏳ Runs out ${n === 0 ? "today" : "in " + n + " day" + (n === 1 ? "" : "s")}</span>`
      : ` <span class="tag bad">⌛ Ran out ${-n} day${n === -1 ? "" : "s"} ago</span>`;
  }
  /* price rises since an estimate was priced: [{ sup, n, avg }] */
  function risesFor(d) {
    if (!waiting(d)) return [];
    const since = d.updated || d.created || (d.date ? parse(d.date).getTime() : 0);
    const out = [];
    (S.priceLists || []).forEach((pl) => {
      const R = (pl.rises || []).filter((x) => x.at > since);
      if (!R.length) return;
      const n = R.reduce((a, x) => a + x.n, 0);
      const avg = Math.round((R.reduce((a, x) => a + x.avg * x.n, 0) / n) * 10) / 10;
      out.push({ sup: plSupName(pl.sup), n, avg });
    });
    return out;
  }
  const riseTag = (d) =>
    risesFor(d).length ? ' <span class="tag warn">📈 Prices gone up</span>' : "";
  const riseText = (r) =>
    `${r.sup} put up ${r.n} price${r.n === 1 ? "" : "s"}, ${r.avg}% on average`;
  /* the warnings at the top of the estimates list */
  function listNotice(list) {
    const soon = list.filter((d) => {
      const n = daysLeft(d);
      return n != null && n >= 0 && n <= 7;
    });
    const gone = list.filter((d) => {
      const n = daysLeft(d);
      return n != null && n < 0;
    });
    const risen = list.filter((d) => risesFor(d).length);
    if (!soon.length && !gone.length && !risen.length) return "";
    const li = (arr) => arr.map((d) => esc(sdNo(d) + (d.client ? " " + d.client : ""))).join(", ");
    return `<div class="notice warn qtw-note">${soon.length ? `<div>⏳ <b>${soon.length} running out this week</b> – ${li(soon)}. Chase them, or send a new version.</div>` : ""}${gone.length ? `<div>⌛ <b>${gone.length} ran out</b> without an answer – ${li(gone)}.</div>` : ""}${risen.length ? `<div>📈 <b>Prices have gone up</b> since ${risen.length === 1 ? "this one was" : "these were"} priced – ${li(risen)}. Check them before they're accepted.</div>` : ""}</div>`;
  }
  /* inside an estimate: the price rises since it was priced */
  function editNotice(d) {
    const R = risesFor(d);
    return R.length
      ? `<div class="notice warn qtw-note">📈 Since this was priced: ${R.map((r) => esc(riseText(r))).join("; ")}. Check the materials before it's accepted.</div>`
      : "";
  }
  return { daysLeft, expiryTag, risesFor, riseTag, listNotice, editNotice };
})();
