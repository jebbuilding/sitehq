/* ================= JOB BUDGET: live profit per job – the quote against what's been spent, and a warning as soon as a job starts going over ================= */
import { $, esc, gbp, iso, parse } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { nlOpenTab } from "../owner/today.js";
import { jcData, jcJob, jcSave } from "./job-costs.js";
import { sdCalc, sdR2 } from "./sales-calc.js";
import { jobProgress } from "../sites/job-sheets.js";
import { same } from "../sites/project-pages.js";
export { jbBudget, jbCard, jbTag, jbTodayCard, jbTodayWire, jbWire };
/* A fixed-price job's price is its accepted estimate (or what's been invoiced, if more). The budget for costs is the
   price less the profit James aims to make on it (j.target %, else the usual one in jcset.target, else 20%), split
   like the estimate: its labour lines pay for his team's hours and the subbies, its materials lines for materials
   and hire, and other lines are shared between the two. How far through the job is (j.done %, typed, else worked
   out from what's been invoiced) turns the costs so far into a forecast of the final cost. Levels:
     "loss"  – costs already more than the price
     "over"  – costs already more than the budget
     "warn"  – heading over: the forecast is more than the budget (or a part is more than its share)
     "ok"    – on track. Cost-plus jobs can't go over, and jobs with no price have nothing to measure against. */
const JB_TARGET = 20;
const jbTarget = (j) => {
  const v = j && j.target != null && j.target !== "" ? +j.target : NaN;
  if (!isNaN(v)) return v;
  const s = (S.jcSet || {}).target;
  return s != null && s !== "" && !isNaN(+s) ? +s : JB_TARGET;
};
function jbBudget(d) {
  if (!d || d.cp || !d.price) return null;
  const tgt = jbTarget(d.j);
  const keep = 1 - tgt / 100;
  const budget = sdR2(d.price * keep);
  /* the estimate's split between labour, materials and the rest */
  const c = d.est ? sdCalc(d.est) : null;
  let labShare = 0.5,
    matShare = 0.5;
  if (c && c.net > 0) {
    const oth = Math.max(0, c.net - c.lab - c.mat);
    labShare = (c.lab + oth / 2) / c.net;
    matShare = (c.mat + oth / 2) / c.net;
  }
  const spentLab = sdR2(
    d.items.filter((i) => i.kind === "lab" || i.kind === "sub").reduce((a, i) => a + i.cost, 0),
  );
  const spentMat = sdR2(d.items.filter((i) => i.kind === "mat").reduce((a, i) => a + i.cost, 0));
  const parts = [
    {
      k: "lab",
      name: "Labour (your team and subbies)",
      budget: sdR2(budget * labShare),
      spent: spentLab,
    },
    { k: "mat", name: "Materials and hire", budget: sdR2(budget * matShare), spent: spentMat },
  ];
  /* how far through: typed in, else the job sheets' ticked tasks, else the planner, else what's been invoiced */
  const typed = d.j.done != null && d.j.done !== "" && !isNaN(+d.j.done);
  const auto = jbProgress(d);
  const done = typed ? Math.min(100, Math.max(0, +d.j.done)) : auto.pct;
  const doneFrom = typed ? "typed in" : auto.from;
  const forecast = done >= 5 ? sdR2((d.cost * 100) / done) : null;
  const profitNow = sdR2(d.price - d.cost);
  const profitEnd = forecast != null ? sdR2(d.price - forecast) : null;
  let lvl = "ok",
    msg = "On track";
  if (d.cost > d.price) {
    lvl = "loss";
    msg = `Costs are ${gbp(d.cost - d.price)} more than the price`;
  } else if (d.cost > budget) {
    lvl = "over";
    msg = `${gbp(d.cost - budget)} over: profit down to ${gbp(profitNow)} (${Math.round((profitNow / d.price) * 100)}%, aiming for ${tgt}%)`;
  } else if (forecast != null && forecast > budget) {
    lvl = "warn";
    msg = `At ${done}% done it's on course to cost ${gbp(forecast)}, ${gbp(forecast - budget)} over budget (profit ${gbp(profitEnd)}, ${Math.round((profitEnd / d.price) * 100)}%)`;
  } else {
    const p = parts.find((x) => x.budget > 0 && x.spent > x.budget);
    if (p) {
      lvl = "warn";
      msg = `${p.name} already ${gbp(p.spent - p.budget)} over its share of the budget`;
    }
  }
  return { tgt, budget, parts, done, doneFrom, typed, forecast, profitNow, profitEnd, lvl, msg };
}
/* how far through a job is, worked out: { pct, from } */
function jbProgress(d) {
  const site = d.site || d.j.site;
  /* the job sheets for the site: tasks ticked off */
  const jobs = (S.jobs || []).filter((j) => same(j.site, site) && (j.tasks || []).length);
  if (jobs.length) {
    let n = 0,
      k = 0;
    jobs.forEach((j) => {
      const p = jobProgress(j);
      n += p.n;
      k += p.d;
    });
    if (n)
      return {
        pct: Math.round((k / n) * 100),
        from: `the job sheets: ${k} of ${n} tasks ticked off`,
      };
  }
  /* the planner: how far today is through the days booked for it */
  const ps = (S.plan || []).concat(S.planPrivate || []).filter((p) => same(p.site, site) && p.from);
  if (ps.length) {
    const from = ps.map((p) => p.from).sort()[0];
    const to = ps
      .map((p) => p.to || p.from)
      .sort()
      .slice(-1)[0];
    const day = (x) => Math.round(parse(x).getTime() / 864e5);
    const all = day(to) - day(from) + 1;
    const gone = Math.min(all, Math.max(0, day(iso(new Date())) - day(from) + 1));
    return {
      pct: Math.round((gone / all) * 100),
      from: `the planner: day ${gone} of ${all} booked`,
    };
  }
  return {
    pct: d.price ? Math.min(100, Math.round((d.invoiced / d.price) * 100)) : 0,
    from: "what's been invoiced so far",
  };
}
const JB_TAG = {
  ok: ["ok", "✓ On track"],
  warn: ["warn", "⚠ Heading over"],
  over: ["bad", "⚠ Over budget"],
  loss: ["bad", "✕ Losing money"],
};
const jbTag = (b) => (b ? `<span class="tag ${JB_TAG[b.lvl][0]}">${JB_TAG[b.lvl][1]}</span>` : "");
/* the jobs going over, worst first */
function jbProblems() {
  const order = { loss: 0, over: 1, warn: 2 };
  return jcSitesLive()
    .map((site) => {
      const d = jcData(site);
      return { site, d, b: jbBudget(d) };
    })
    .filter((x) => x.b && x.b.lvl !== "ok")
    .sort((a, b) => order[a.b.lvl] - order[b.b.lvl]);
}
/* jobs that are running (not archived) */
const jcSitesLive = () => (S.sites || []).filter((s) => !s.archived && s.name).map((s) => s.name);
/* Today: a card when any job is going over */
function jbTodayCard() {
  if (!ownerMode()) return "";
  let probs;
  try {
    probs = jbProblems();
  } catch (e) {
    return "";
  }
  if (!probs.length) return "";
  return `<div class="card jbg-today"><div class="cardbody" style="border:0"><b>💷 ${probs.length} job${probs.length === 1 ? "" : "s"} going over budget</b>${probs
    .slice(0, 5)
    .map(
      (x) =>
        `<button type="button" class="citem jbg-go" data-s="${esc(x.site)}"><span>${esc(x.site)}<br><span class="who">${esc(x.b.msg)}</span></span>${jbTag(x.b)}</button>`,
    )
    .join("")}</div></div>`;
}
function jbTodayWire() {
  document.querySelectorAll("#main .jbg-go").forEach(
    (b) =>
      (b.onclick = () => {
        S.f.act = "jobs";
        S.f.jcs = b.dataset.s;
        nlOpenTab("accounts");
      }),
  );
}
/* the budget card on a job's page */
function jbCard(d) {
  const b = jbBudget(d);
  if (d.cp)
    return `<section class="card jbg-card"><div class="cardbody"><b>📈 Budget</b><div class="who">A cost-plus job is charged for what it costs, so it can't go over: keep an eye on "Not invoiced yet".</div></div></section>`;
  if (!b)
    return `<section class="card jbg-card"><div class="cardbody"><b>📈 Budget</b><div class="who">Mark the estimate for this job as accepted (Estimates & invoices) and its price becomes the budget: you'll see what's been spent against it and be warned as soon as the job starts going over.</div></div></section>`;
  const bar = (spent, budget) => {
    const pc = budget > 0 ? Math.round((spent / budget) * 100) : spent > 0 ? 100 : 0;
    return `<div class="jbg-bar${pc > 100 ? " jbg-over" : pc > 85 ? " jbg-near" : ""}" role="img" aria-label="${pc}% of its budget used"><i style="width:${Math.min(100, pc)}%"></i></div><div class="jbg-nums"><span>${gbp(spent)} of ${gbp(budget)}</span><span>${pc}%</span></div>`;
  };
  return `<section class="card jbg-card jbg-${b.lvl}"><div class="cardbody"><b>📈 Budget and profit</b>
    <div class="notice ${b.lvl === "ok" ? "" : "warn"} jbg-msg">${jbTag(b)} ${esc(b.msg)}</div>
    ${d.items.some((i) => i.kind === "lab" && !i.costRate && !i.note) ? `<div class="who">⚠ Some hours count as £0 because what that person costs you an hour isn't set (⚙️ Cost rates below), so labour looks cheaper than it is.</div>` : ""}
    <div class="jbg-set"><label for="jbg-tgt">Profit you're aiming for %<input id="jbg-tgt" type="number" inputmode="decimal" min="0" max="90" value="${esc(b.tgt)}"></label><label for="jbg-done">How far through the job %<input id="jbg-done" type="number" inputmode="numeric" min="0" max="100" value="${esc(b.typed ? b.done : "")}" placeholder="${esc(b.done)} (worked out)"></label></div>
    <div class="jbg-row"><div class="jbg-lab">Whole job: costs so far against the budget (price ${gbp(d.price)} less ${b.tgt}% profit${d.varNet ? `, including ${gbp(d.varNet)} of signed variations` : ""})</div>${bar(d.cost, b.budget)}</div>
    ${b.parts.map((p) => `<div class="jbg-row"><div class="jbg-lab">${esc(p.name)}</div>${bar(p.spent, p.budget)}</div>`).join("")}
    <div class="drow"><span>Profit if it finished now</span><b>${gbp(b.profitNow)}</b></div>
    <div class="who">${b.done}% through – from ${esc(b.doneFrom)}${b.typed ? "" : ". Type a figure to use your own"}.</div>
    ${b.forecast != null ? `<div class="drow"><span>On course to cost (at ${b.done}% done)</span><b>${gbp(b.forecast)}</b></div><div class="drow"><span>Profit at the end, on that course</span><b class="${b.profitEnd < 0 ? "jc-neg" : ""}">${gbp(b.profitEnd)} (${Math.round((b.profitEnd / d.price) * 100)}%)</b></div>` : `<div class="who">Put in how far through the job is to see where the costs are heading.</div>`}
  </div></section>`;
}
function jbWire(site) {
  const setF = (id, key) =>
    $(id) &&
    ($(id).onchange = async () => {
      const v = $(id).value.trim();
      await jcSave(Object.assign({}, jcJob(site), { [key]: v === "" ? "" : +v }));
      render();
    });
  setF("jbg-tgt", "target");
  setF("jbg-done", "done");
}
