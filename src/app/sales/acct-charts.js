/* ================= ACCOUNTS CHARTS: where the money goes, and which jobs brought in the most and made the most ================= */
import { esc, gbp } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { AC_CATS } from "./acct-data.js";
import { jcData, jcSites } from "./job-costs.js";
import { siteLabel } from "../sites/job-details.js";
export { acgHtml, acgWire };
/* James (Nov 2026): "good to see some graphs or pie charts to see how the business is doing and what jobs have made
   the most revenue". On Accounts › Overview, under Money in and out each month:
   🍩 Where the money goes – the costs for the period by category, the biggest five and the rest as Other, each with
   its £ and share; 💷 Your best jobs – the eight jobs that have brought in the most (invoiced, all time) with the
   profit on each (Job costs: labour, receipts and bills, subbies), a loss shown as a loss. Colours: a fixed order, the
   same in light and dark (stepped for each), and every slice and bar also named in words. */
const ACG_N = 5;
function acgDonut(s) {
  const rows = AC_CATS.filter((c) => c[2] === "out" && s.byCat[c[0]])
    .map((c) => [c[1], Math.abs(s.byCat[c[0]])])
    .filter((r) => r[1] > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!rows.length) return "";
  const top = rows.slice(0, ACG_N);
  const rest = rows.slice(ACG_N).reduce((a, r) => a + r[1], 0);
  if (rest > 0) top.push(["Other", rest]);
  const total = top.reduce((a, r) => a + r[1], 0);
  const R = 60,
    C = 2 * Math.PI * R,
    gap = top.length > 1 ? 2 : 0;
  let off = 0;
  const segs = top
    .map(([n, v], i) => {
      const len = (v / total) * C;
      const dash = Math.max(0.5, len - gap);
      const cls = n === "Other" && rest > 0 && i === top.length - 1 ? "acg-o" : "acg-" + (i + 1);
      const el = `<circle class="acg-seg ${cls}" r="${R}" cx="80" cy="80" fill="none" stroke-width="26" stroke-dasharray="${dash.toFixed(2)} ${(C - dash).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"><title>${esc(n)}: ${gbp(v)} (${Math.round((v / total) * 100)}%)</title></circle>`;
      off += len;
      return el;
    })
    .join("");
  return `<section class="card acg-card"><div class="cardbody"><b>🍩 Where the money goes</b><div class="who">Your costs for the period above.</div>
    <div class="acg-donut"><svg viewBox="0 0 160 160" role="img" aria-label="Costs by category"><g transform="rotate(-90 80 80)">${segs}</g><text x="80" y="76" class="acg-mid">${gbp(Math.round(total))}</text><text x="80" y="94" class="acg-midl">total costs</text></svg>
      <div class="acg-leg">${top
        .map(
          ([n, v], i) =>
            `<div class="acg-li"><i class="acg-sw ${n === "Other" && rest > 0 && i === top.length - 1 ? "acg-o" : "acg-" + (i + 1)}"></i><span>${esc(n)}</span><b>${gbp(v)}</b><small>${Math.round((v / total) * 100)}%</small></div>`,
        )
        .join("")}</div></div>
  </div></section>`;
}
function acgJobs() {
  const rows = jcSites()
    .map((site) => Object.assign({ site }, jcData(site)))
    .filter((d) => d.invoiced > 0)
    .sort((a, b) => b.invoiced - a.invoiced)
    .slice(0, 8);
  if (!rows.length) return "";
  const top = Math.max(1, ...rows.map((d) => d.invoiced));
  return `<section class="card acg-card"><div class="cardbody"><b>💷 Your best jobs</b><div class="who">The jobs that have brought in the most, and the profit on each (from Job costs).</div>
    <div class="sd-key"><i class="acg-sw acg-1"></i> Invoiced <i class="acg-sw acg-3"></i> Profit</div>
    <div class="acg-jobs">${rows
      .map((d) => {
        const p = Math.max(0, d.profit);
        return `<button type="button" class="acg-job" data-s="${esc(d.site)}" title="${esc(siteLabel(d.site))}: invoiced ${gbp(d.invoiced)}, ${d.profit < 0 ? "loss " + gbp(-d.profit) : "profit " + gbp(d.profit)}"><span class="acg-jn">${esc(siteLabel(d.site))}</span>
          <span class="acg-bars"><i class="acg-bar acg-1" style="width:${Math.max(1, Math.round((d.invoiced / top) * 100))}%"></i><i class="acg-bar acg-3" style="width:${p ? Math.max(1, Math.round((p / top) * 100)) : 0}%"></i></span>
          <span class="acg-jv"><b>${gbp(d.invoiced)}</b><small class="${d.profit < 0 ? "acg-loss" : ""}">${d.profit < 0 ? "loss " + gbp(-d.profit) : gbp(d.profit) + (d.pctProfit ? " · " + d.pctProfit + "%" : "")}</small></span></button>`;
      })
      .join("")}</div>
  </div></section>`;
}
function acgHtml(s) {
  const a = acgDonut(s),
    b = acgJobs();
  return a || b ? `<div class="acg-cols">${a}${b}</div>` : "";
}
function acgWire() {
  document.querySelectorAll("#main .acg-job").forEach(
    (b) =>
      (b.onclick = () => {
        S.f.act = "jobs";
        S.f.jcs = b.dataset.s;
        render();
        window.scrollTo(0, 0);
      }),
  );
}
