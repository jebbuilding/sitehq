/* ================= ACCOUNTS CHARTS: where the money goes, and which jobs brought in the most and made the most ================= */
import { esc, gbp, iso } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { AC_CATS, acSums } from "./acct-data.js";
import { jcData, jcSites } from "./job-costs.js";
import { sdTaxYear } from "./sales-calc.js";
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
/* 📈 Profit each month: money in less money out for each of the last 12 months, as a line with a zero line; above
   zero made money, below lost it. Each point says its month and figure. */
function acgProfitLine() {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = iso(d).slice(0, 7);
    const last = iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const s = acSums(m + "-01", last);
    months.push({ m, d, p: s.profit, inc: s.inc, exp: s.exp });
  }
  if (!months.some((x) => x.inc || x.exp)) return "";
  const W = 380,
    H = 190,
    L = 44,
    R = 12,
    T = 14,
    B = 28;
  const lo = Math.min(0, ...months.map((x) => x.p)),
    hi = Math.max(0, ...months.map((x) => x.p));
  const span = hi - lo || 1;
  const X = (i) => L + (i * (W - L - R)) / (months.length - 1);
  const Y = (v) => T + ((hi - v) * (H - T - B)) / span;
  const pts = months.map((x, i) => `${X(i).toFixed(1)},${Y(x.p).toFixed(1)}`).join(" ");
  const kf = (v) => (Math.abs(v) >= 1000 ? "£" + Math.round(v / 1000) + "k" : "£" + Math.round(v));
  const best = months.reduce((a, x) => (x.p > a.p ? x : a), months[0]);
  const mon = (x, y) =>
    x.d.toLocaleDateString("en-GB", y ? { month: "long", year: "numeric" } : { month: "short" });
  return `<section class="card acg-card"><div class="cardbody"><b>📈 Profit each month</b><div class="who">Money in less money out, the last 12 months. Best: ${esc(mon(best, 1))}, ${gbp(best.p)}.</div>
    <svg class="acg-line" viewBox="0 0 ${W} ${H}" role="img" aria-label="Profit each month">
      <line x1="${L}" x2="${W - R}" y1="${Y(hi).toFixed(1)}" y2="${Y(hi).toFixed(1)}" class="acg-grid"/><text x="${L - 6}" y="${(Y(hi) + 4).toFixed(1)}" class="acg-ax">${kf(hi)}</text>
      ${lo < 0 ? `<line x1="${L}" x2="${W - R}" y1="${Y(lo).toFixed(1)}" y2="${Y(lo).toFixed(1)}" class="acg-grid"/><text x="${L - 6}" y="${(Y(lo) + 4).toFixed(1)}" class="acg-ax">${kf(lo)}</text>` : ""}
      <line x1="${L}" x2="${W - R}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" class="acg-zero"/><text x="${L - 6}" y="${(Y(0) + 4).toFixed(1)}" class="acg-ax">£0</text>
      <polyline points="${pts}" class="acg-pl acg-1"/>
      ${months
        .map(
          (x, i) =>
            `<g class="acg-pt"><circle cx="${X(i).toFixed(1)}" cy="${Y(x.p).toFixed(1)}" r="4.5" class="acg-dot acg-1${x.p < 0 ? " acg-neg" : ""}"/><circle cx="${X(i).toFixed(1)}" cy="${Y(x.p).toFixed(1)}" r="14" class="acg-hit"><title>${esc(mon(x, 1))}: ${x.p < 0 ? "loss " + gbp(-x.p) : "profit " + gbp(x.p)} (in ${gbp(x.inc)}, out ${gbp(x.exp)})</title></circle><text x="${X(i).toFixed(1)}" y="${H - 8}" class="acg-mx">${esc(mon(x))}</text></g>`,
        )
        .join("")}
    </svg>
  </div></section>`;
}
/* This year against last year: the tax year so far against the same dates a year before */
function acgYoy() {
  const today = iso(new Date());
  const ty = sdTaxYear(today);
  const a = acSums(ty + "-04-06", today);
  const lastTo = String(+today.slice(0, 4) - 1) + today.slice(4);
  const b = acSums(ty - 1 + "-04-06", lastTo);
  if (!b.inc && !b.exp) return "";
  const row = (lab, x, y, good) => {
    const ch = y ? Math.round(((x - y) / Math.abs(y)) * 100) : null;
    const up = x >= y;
    const ok = good ? up : !up;
    return `<div class="acg-yr"><span>${esc(lab)}</span><b>${gbp(x)}</b><span class="who">${gbp(y)}</span><span class="acg-ch ${ch == null || x === y ? "" : ok ? "acg-up" : "acg-down"}">${ch == null || x === y ? "–" : (up ? "▲ " : "▼ ") + Math.abs(ch) + "%"}</span></div>`;
  };
  return `<section class="card acg-card"><div class="cardbody"><b>📊 This year against last year</b><div class="who">From 6 April to today, against the same dates last tax year.</div>
    <div class="acg-yr acg-yrh"><span></span><small>This year</small><small>Last year</small><small>Change</small></div>
    ${row("Money in", a.inc, b.inc, true)}${row("Money out", a.exp, b.exp, false)}${row("Profit", a.profit, b.profit, true)}
  </div></section>`;
}
function acgHtml(s) {
  const a = acgDonut(s),
    b = acgJobs(),
    c = acgProfitLine(),
    d = acgYoy();
  return a || b || c || d ? `<div class="acg-cols">${c}${d}${a}${b}</div>` : "";
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
