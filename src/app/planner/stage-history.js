/* ================= STAGE HISTORY: how long each kind of stage really took on past jobs, against what was planned ================= */
import { esc } from "../core/helpers.js";
import { S } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { pgWorkBetween } from "./programme.js";
import { siteLabel } from "../sites/job-details.js";
export { STH };
/* James (Nov 2026, "learn from past jobs"): every job's 📊 Programme keeps each stage's planned working days and, when
   its ✓ Done is tapped, when it really started and finished. Put together across jobs: on a programme, each stage
   says how long that kind of stage really took on the last few jobs (e.g. "Plaster: took 6 days on average on your
   last 3 jobs – you've put 4"), and 📈 How long stages really take lists every stage name – how many jobs, planned
   against real, and how far over or under. Stages match by name, ignoring case, numbers and "and"/"&". */
const STH = (() => {
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/\([^)]*\)/g, " ")
      .replace(/[^a-z ]+/g, " ")
      .replace(/\b(and|the|a|of|to)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  /* every finished stage: { key, name, site, planned, actual, at } */
  function all() {
    const out = [];
    (S.programmes || []).forEach((pr) =>
      (pr.stages || []).forEach((s) => {
        if (!s.done || !s.actFrom || !s.actTo || !s.name) return;
        const actual = pgWorkBetween(s.actFrom, s.actTo) + 1;
        const planned = +s.days || 0;
        if (!planned || !actual) return;
        out.push({
          key: norm(s.name),
          name: s.name,
          site: pr.site || "",
          planned,
          actual,
          at: s.actTo,
        });
      }),
    );
    return out.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
  }
  /* the last few jobs for a stage name: { n, planned, actual } (averages, to one place) */
  function statsFor(name, skipSite, howMany = 5) {
    const k = norm(name);
    if (!k) return null;
    const L = all()
      .filter((x) => x.key === k && !(skipSite && x.site === skipSite))
      .slice(0, howMany);
    if (!L.length) return null;
    const av = (f) => Math.round((L.reduce((a, x) => a + f(x), 0) / L.length) * 10) / 10;
    return { n: L.length, planned: av((x) => x.planned), actual: av((x) => x.actual) };
  }
  const days = (n) => (Number.isInteger(n) ? n : n.toFixed(1)) + " day" + (n === 1 ? "" : "s");
  /* the line under a stage's days on a programme */
  function hintHtml(name, daysNow, site) {
    const st = statsFor(name, site);
    if (!st) return "";
    const over = st.actual > (+daysNow || st.planned) + 0.4,
      under = st.actual < (+daysNow || st.planned) - 0.4;
    return `<div class="sth-hint ${over ? "sth-over" : under ? "sth-under" : ""}" title="On your last ${st.n} job${st.n === 1 ? "" : "s"} you planned ${days(st.planned)} on average">📈 Took ${days(st.actual)} on average (last ${st.n} job${st.n === 1 ? "" : "s"})${over ? " – more than you've put" : ""}</div>`;
  }
  /* 📈 How long stages really take */
  function report() {
    const A = all();
    const by = new Map();
    A.forEach((x) => {
      const g = by.get(x.key) || { name: x.name, L: [] };
      g.L.push(x);
      by.set(x.key, g);
    });
    const rows = [...by.values()]
      .map((g) => {
        const L = g.L.slice(0, 5);
        const av = (f) => Math.round((L.reduce((a, x) => a + f(x), 0) / L.length) * 10) / 10;
        const p = av((x) => x.planned),
          a = av((x) => x.actual);
        return { name: g.name, n: g.L.length, p, a, diff: Math.round((a - p) * 10) / 10, L };
      })
      .sort((x, y) => y.diff - x.diff || x.name.localeCompare(y.name));
    openViewer(`<h3 style="font-family:var(--f-display);margin:0">📈 How long stages really take</h3>
      <div class="who" style="margin:4px 0 10px">From the stages ticked ✓ Done on your job programmes: what you planned against how many working days they really took (the last 5 jobs of each). Worst first.</div>
      ${
        rows.length
          ? `<div class="tablewrap"><table class="sth-tbl"><thead><tr><th>Stage</th><th>Jobs</th><th>Planned</th><th>Really took</th><th>Over / under</th></tr></thead><tbody>${rows
              .map(
                (r) =>
                  `<tr><td><b>${esc(r.name)}</b><div class="who">${esc(
                    r.L.slice(0, 3)
                      .map((x) => siteLabel(x.site) + " " + x.actual + "d")
                      .join(" · "),
                  )}</div></td><td class="num">${r.n}</td><td class="num">${days(r.p)}</td><td class="num">${days(r.a)}</td><td class="num ${r.diff > 0.4 ? "sth-over" : r.diff < -0.4 ? "sth-under" : ""}">${r.diff > 0 ? "+" : ""}${days(r.diff).replace(/^-/, "−")}</td></tr>`,
              )
              .join("")}</tbody></table></div>`
          : '<div class="empty"><strong>Nothing yet</strong>When you tick ✓ Done on stages in a job\'s 📊 Programme, how long they really took builds up here.</div>'
      }`);
  }
  return { all, statsFor, hintHtml, report, norm };
})();
