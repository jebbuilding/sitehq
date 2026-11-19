/* ================= JOB HEALTH: how a job is going – money spent and left, what the client still owes, progress and what needs doing ================= */
import { $, esc, gbp, hrs, iso, parse, shortDay } from "../core/helpers.js";
import { S, isArchivedSite, ownerMode } from "../core/state.js";
import { nlGo } from "../owner/today.js";
import { siteRec } from "../photos/photos.js";
import { pgCalc, pgRec } from "../planner/programme.js";
import { jbBudget } from "../sales/job-budget.js";
import { jcData } from "../sales/job-costs.js";
import { sdCalc, sdR2, sdStatus } from "../sales/sales-calc.js";
import { goSite } from "./go-site.js";
import { siteLabel } from "./job-details.js";
import { same } from "./project-pages.js";
import { onSiteNow } from "./roll-call.js";
import { stgDoneOf, stgList } from "./stage-signoff.js";
export { jhAllHtml, jhAllWire, jhCardHtml, jhWire };
/* James (Nov 2026): "on the site I want to see a good way to see how much money has been spent, left to pay, the
   progress and anything else that is helpful … also on the site page something similar to see how all jobs are
   going". On a site's Overview (owner): 📊 How this job is going – the price (accepted estimate + signed variations,
   or what's been charged on cost plus), spent so far and what's left of it, invoiced, paid and still owed by the
   client, still to invoice, progress (the programme's stages, else the stages signed off) and the dates (finish,
   days left, late), and what needs looking at (snags, RAMS signatures, bills, who's on site). The sites list has
   📊 How all jobs are going – one line per live job with the same in short, worst first. Money only for the owner. */
function jhData(site) {
  const today = iso(new Date());
  const d = jcData(site);
  const owed = sdR2(
    d.invs
      .filter((v) => v.type === "invoice" && sdStatus(v) !== "draft")
      .reduce((a, v) => a + Math.max(0, sdCalc(v).balance), 0),
  );
  const paid = sdR2(d.invs.reduce((a, v) => a + sdCalc(v).paid, 0));
  const overdue = d.invs.filter((v) => v.type === "invoice" && sdStatus(v) === "overdue").length;
  /* progress: the programme first, else the stages signed off */
  const pr = pgRec(site);
  let prog = null;
  if (pr && (pr.stages || []).length) {
    const dt = pgCalc(pr);
    const st = pr.stages;
    const done = st.filter((s) => s.done).length;
    const ends = st.map((s) => dt[s.id].to).sort();
    const starts = st.map((s) => dt[s.id].from).sort();
    const now = st.find((s) => !s.done && dt[s.id].from <= today && dt[s.id].to >= today);
    const behind = st.filter((s) => !s.done && dt[s.id].to < today).length;
    prog = {
      from: "programme",
      done,
      total: st.length,
      pct: Math.round((done / st.length) * 100),
      start: starts[0],
      finish: ends[ends.length - 1],
      now: now ? now.name : "",
      behind,
      next: (st.find((s) => !s.done) || {}).name || "",
    };
  } else {
    const sr = siteRec(site) || {};
    const st = stgList(sr);
    const dn = stgDoneOf(sr);
    const done = st.filter((x) => dn[x]).length;
    const j = sr.job || {};
    prog = {
      from: "stages",
      done,
      total: st.length,
      pct: st.length ? Math.round((done / st.length) * 100) : 0,
      start: j.start || "",
      finish: j.finish || "",
      now: "",
      behind: 0,
      next: st.find((x) => !dn[x]) || "",
    };
  }
  const daysLeft = prog.finish ? Math.round((parse(prog.finish) - parse(today)) / 864e5) : null;
  const snags = (S.jobs || []).filter((j) => same(j.site, site) && j.status !== "closed").length;
  const onSite = onSiteNow().filter((r) => same(r.job, site)).length;
  return {
    site,
    d,
    price: d.price,
    spent: d.cost,
    left: sdR2(d.price - d.cost),
    pctSpent: d.price ? Math.round((d.cost / d.price) * 100) : 0,
    invoiced: d.invoiced,
    paid,
    owed,
    overdue,
    toInvoice: sdR2(Math.max(0, d.price - d.invoiced)),
    prog,
    daysLeft,
    snags,
    onSite,
  };
}
/* a bar: how much of a whole is used, coloured when it goes past what it should */
const jhBar = (pct, cls, label) =>
  `<div class="jh-bar${cls ? " " + cls : ""}" role="img" aria-label="${esc(label)}"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span></div>`;
/* 📊 How this job is going – on the site's Overview */
/* labour so far against its share of the budget, with roughly how many hours that is (at the team's own cost rates) */
function jhLabourHtml(h) {
  const b = jbBudget(h.d);
  if (!b) return "";
  const lp = b.parts.find((p) => p.k === "lab");
  if (!lp || !(lp.budget > 0)) return "";
  const pc = Math.round((lp.spent / lp.budget) * 100);
  const rated = h.d.items.filter((i) => i.kind === "lab" && i.costRate > 0);
  const rH = rated.reduce((a, i) => a + i.hours, 0),
    rC = rated.reduce((a, i) => a + i.cost, 0);
  const rate = rH ? rC / rH : 0;
  const hrsAllowed = rate ? Math.round(lp.budget / rate) : 0;
  const ahead = b.done >= 5 && pc > b.done + 15;
  return `<div class="jh-lab"><div class="jh-line"><span>👷 Labour <b>${gbp(lp.spent)}</b> of ${gbp(lp.budget)} allowed${hrsAllowed ? ` · about <b>${hrs(h.d.hours)}</b> of ~${hrsAllowed} hours` : ""}</span><span>${pc}%</span></div>${jhBar(Math.min(100, pc), pc > 100 ? "bad" : ahead ? "warn" : "", pc + "% of the labour allowed used")}${ahead ? `<div class="who jh-neg">⚠ Labour is running ahead: ${pc}% used and the job is ${b.done}% done (${esc(b.doneFrom)}).</div>` : `<div class="who">The job is ${b.done}% done (${esc(b.doneFrom)}).</div>`}</div>`;
}
function jhCardHtml(site) {
  const owner = ownerMode();
  const h = jhData(site);
  const p = h.prog;
  /* money is ahead of the work when more of the price is spent than of the job is done */
  const ahead = h.price && p.total && h.pctSpent > p.pct + 15;
  const flags = [
    p.behind
      ? `<span class="tag bad">${p.behind} stage${p.behind === 1 ? "" : "s"} behind</span>`
      : "",
    h.daysLeft != null && h.daysLeft < 0 && p.pct < 100
      ? `<span class="tag bad">${-h.daysLeft} days past the finish date</span>`
      : "",
    owner && h.overdue
      ? `<span class="tag bad">${h.overdue} invoice${h.overdue === 1 ? "" : "s"} overdue</span>`
      : "",
    owner && h.price && h.spent > h.price
      ? `<span class="tag bad">Spent more than the price</span>`
      : "",
    owner && ahead && h.spent <= h.price
      ? `<span class="tag warn">Spending ahead of the work</span>`
      : "",
    h.snags
      ? `<span class="tag warn">${h.snags} snag${h.snags === 1 ? "" : "s"} or job${h.snags === 1 ? "" : "s"} open</span>`
      : "",
    h.onSite ? `<span class="tag ok">${h.onSite} on site now</span>` : "",
  ].filter(Boolean);
  const money = owner
    ? `<div class="jh-sec"><div class="jh-h"><b>💷 Money</b><span class="who">🔒 Only you see this</span></div>
      ${
        h.price
          ? `<div class="jh-line"><span><b>${gbp(h.spent)}</b> spent of ${gbp(h.price)}${h.d.cp ? " (cost plus: charged so far)" : ""}</span><span class="${h.left < 0 ? "jh-neg" : ""}"><b>${gbp(h.left)}</b> ${h.left < 0 ? "over" : "left"}</span></div>${jhBar(h.pctSpent, h.spent > h.price ? "bad" : ahead ? "warn" : "", h.pctSpent + "% of the price spent")}`
          : `<div class="who">${gbp(h.spent)} spent so far – no accepted estimate yet, so there's no price to measure it against.</div>`
      }
      ${jhLabourHtml(h)}
      <div class="jh-boxes"><div><b>${gbp(h.invoiced)}</b><span>invoiced</span></div><div><b>${gbp(h.paid)}</b><span>paid by the client</span></div><div class="${h.owed ? "jh-owe" : ""}"><b>${gbp(h.owed)}</b><span>client still owes${h.overdue ? ` (${h.overdue} overdue)` : ""}</span></div><div><b>${gbp(h.toInvoice)}</b><span>still to invoice</span></div></div>
      <div class="jh-split who">Materials and hire ${gbp(h.d.items.filter((i) => i.kind === "mat").reduce((a, i) => a + i.cost, 0))} · Labour ${gbp(h.d.items.filter((i) => i.kind === "lab").reduce((a, i) => a + i.cost, 0))} (${hrs(h.d.hours)} h) · Subcontractors ${gbp(h.d.items.filter((i) => i.kind === "sub").reduce((a, i) => a + i.cost, 0))}</div>
      <div class="actions"><button type="button" class="btn" id="jh-costs">💷 Job costs in full</button></div></div>`
    : "";
  return `<section class="card jh-card"><div class="cardbody"><div class="jh-h"><b>📊 How this job is going</b>${flags.length ? "" : '<span class="tag ok">On track</span>'}</div>
    ${flags.length ? `<div class="jh-flags">${flags.join("")}</div>` : ""}
    <div class="jh-sec jh-prog" role="button" tabindex="0" aria-label="Open the programme for this job"><div class="jh-h"><b>🧱 Progress <span class="jh-open">· open the programme ›</span></b><span class="who">${p.total ? `${p.done} of ${p.total} ${p.from === "programme" ? "stages done" : "stages signed off"}` : "No stages yet"}</span></div>
      ${p.total ? jhBar(p.pct, p.behind ? "bad" : "", p.pct + "% done") : ""}
      <div class="jh-line who"><span>${p.now ? `Now: <b>${esc(p.now)}</b>` : p.next ? `Next: <b>${esc(p.next)}</b>` : p.total ? "<b>All done</b>" : ""}</span><span>${p.finish ? `Finishes ${esc(shortDay(p.finish))}${h.daysLeft != null ? (h.daysLeft >= 0 ? ` · ${h.daysLeft} day${h.daysLeft === 1 ? "" : "s"} left` : "") : ""}` : "No finish date yet"}</span></div>
      ${p.from === "stages" && !p.done && !p.finish ? `<div class="who">Add a programme (📊 Programme) for dates, what's on now and whether it's behind.</div>` : ""}
    </div>
    ${money}
  </div></section>`;
}
function jhWire(site) {
  /* tap the progress to open this job's programme (James, Nov 2026: "click on the programme and it open into the
     programme for that job") */
  const pg = document.querySelector("#main .jh-prog");
  if (pg)
    pg.onclick = pg.onkeydown = (e) => {
      if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
      goSite(site, "programme");
    };
  const b = $("jh-costs");
  if (b)
    b.onclick = () => {
      S.f.act = "jobs";
      S.f.jcs = site;
      nlGo("accounts");
    };
}
/* 📊 How all jobs are going – the sites list (owner) */
function jhAllHtml(sites) {
  if (!ownerMode() || !sites.length) return "";
  const rows = sites
    .filter((n) => !isArchivedSite(n))
    .map((n) => jhData(n))
    .map((h) => ({
      h,
      score:
        (h.prog.behind ? 4 : 0) +
        (h.overdue ? 3 : 0) +
        (h.price && h.spent > h.price ? 3 : 0) +
        (h.price && h.prog.total && h.pctSpent > h.prog.pct + 15 ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.h.site.localeCompare(b.h.site));
  if (!rows.length) return "";
  const tot = (k) => sdR2(rows.reduce((a, r) => a + (r.h[k] || 0), 0));
  return `<details class="card jh-all" data-id="__jhall"${S.open.has("__jhall") ? "" : " open"}><summary><div class="nm">📊 How all jobs are going<small>${rows.length} live job${rows.length === 1 ? "" : "s"} · ${gbp(tot("spent"))} spent · clients owe ${gbp(tot("owed"))} · 🔒 only you see the money</small></div></summary><div class="cardbody">
    <div class="tablewrap"><table class="jh-tbl"><thead><tr><th>Job</th><th>Progress</th><th>Spent of price</th><th class="num">Client owes</th><th class="num">To invoice</th><th>Finishes</th></tr></thead><tbody>
    ${rows
      .map(({ h }) => {
        const p = h.prog;
        const flag = [
          p.behind ? `<span class="tag bad">${p.behind} behind</span>` : "",
          h.overdue ? `<span class="tag bad">${h.overdue} overdue</span>` : "",
          h.price && h.spent > h.price ? '<span class="tag bad">Over</span>' : "",
          h.snags ? `<span class="tag warn">${h.snags} open</span>` : "",
        ].join("");
        return `<tr class="jh-row" data-s="${esc(h.site)}" tabindex="0" role="button"><td><b>${esc(siteLabel(h.site))}</b>${flag ? `<div>${flag}</div>` : ""}</td>
          <td>${p.total ? `${jhBar(p.pct, p.behind ? "bad" : "", p.pct + "% done")}<small>${p.done}/${p.total}${p.now ? " · " + esc(p.now) : ""}</small>` : '<small class="who">No stages</small>'}</td>
          <td>${h.price ? `${jhBar(h.pctSpent, h.spent > h.price ? "bad" : "", h.pctSpent + "% spent")}<small>${gbp(h.spent)} of ${gbp(h.price)}</small>` : `<small>${gbp(h.spent)} · no price yet</small>`}</td>
          <td class="num">${h.owed ? `<b>${gbp(h.owed)}</b>` : "–"}</td><td class="num">${h.toInvoice ? gbp(h.toInvoice) : "–"}</td>
          <td>${p.finish ? esc(shortDay(p.finish)) + (h.daysLeft != null && h.daysLeft >= 0 ? `<small>${h.daysLeft} days</small>` : "") : "–"}</td></tr>`;
      })
      .join("")}
    </tbody><tfoot><tr><td><b>All live jobs</b></td><td></td><td><small>${gbp(tot("spent"))} of ${gbp(tot("price"))}</small></td><td class="num"><b>${gbp(tot("owed"))}</b></td><td class="num">${gbp(tot("toInvoice"))}</td><td></td></tr></tfoot></table></div>
    <div class="who">Worst first: behind, overdue or over the price at the top. Tap a job to open it.</div>
  </div></details>`;
}
function jhAllWire() {
  const d = document.querySelector("#main .jh-all");
  if (!d) return;
  d.ontoggle = () => {
    if (d.open) S.open.delete("__jhall");
    else S.open.add("__jhall");
  };
  d.querySelectorAll(".jh-row").forEach((r) => {
    const go = () => {
      goSite(r.dataset.s);
    };
    r.onclick = go;
    r.onkeydown = (e) => {
      if (e.key === "Enter") go();
    };
  });
}
