/* ================= MONTH FILTER: the planner's month with all jobs, some jobs, or just the diary – and the clashes ================= */
import { $, esc, iso, shortDay } from "../core/helpers.js";
import { closeForm, formFoot, openSheet } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { nameOf } from "../owner/owner.js";
import { onDay } from "./time-off.js";
import { siteLabel } from "../sites/job-details.js";
export { pmfBarHtml, pmfClash, pmfClashHtml, pmfFilter, pmfWire };
/* James (Nov 2026): "in planner i need to be able to put all jobs or some jobs up to view conflicts of dates and just
   the month up without jobs like the information from outlook". Above the month (James's planner): Show
   📋 Everything / 🏗 Jobs / 📅 My diary only (meetings, visits, deliveries, inspections, time off, key dates – no job
   bookings), and 🏗 Which jobs: all, or tick some. With jobs showing, a day with two or more jobs is marked, ⚠️ if
   someone is booked on two at once, and the month's clashes are listed under it. */
/* a job booking: work on a site or for a job, or a stage of a job's programme */
const pmfIsJob = (p) =>
  !!p &&
  (p.type === "work" ||
    /^(prg-|job-)/.test(String(p.id || "")) ||
    (!!p.jobId && p.type !== "meeting"));
const pmfJobKey = (p) => String(p.site || (p.jobId ? "job:" + p.jobId : p.title || "")).trim();
const pmfJobLabel = (k) => (k.startsWith("job:") ? k.slice(4) : siteLabel(k));
function pmfFilter(list) {
  const show = S.f.pmshow || "all";
  const pick = S.f.pmjobs || [];
  return list.filter((p) => {
    const job = pmfIsJob(p);
    if (show === "diary") return !job;
    if (show === "jobs" && !job) return false;
    return !job || !pick.length || pick.includes(pmfJobKey(p));
  });
}
/* the jobs booked that month, for the picker */
function pmfJobsIn(list, first) {
  const a = iso(first),
    b = iso(new Date(first.getFullYear(), first.getMonth() + 1, 0));
  return [
    ...new Set(
      list
        .filter((p) => pmfIsJob(p) && (p.to || p.from) >= a && p.from <= b)
        .map(pmfJobKey)
        .filter(Boolean),
    ),
  ].sort();
}
/* a day's clash: two or more jobs, and anyone booked on more than one */
function pmfClash(list, di) {
  const jobs = list.filter((p) => pmfIsJob(p) && onDay(p, di));
  const keys = [...new Set(jobs.map(pmfJobKey))];
  if (keys.length < 2) return null;
  const by = {};
  jobs.forEach((p) =>
    (p.people || []).forEach((w) => (by[w] = (by[w] || new Set()).add(pmfJobKey(p)))),
  );
  const people = Object.keys(by).filter((w) => by[w].size > 1);
  return { keys, people };
}
function pmfBarHtml(list, first) {
  const show = S.f.pmshow || "all";
  const pick = S.f.pmjobs || [];
  const n = pmfJobsIn(list, first).length;
  return `<div class="pmf-bar"><div class="seg" id="pmf-show" role="group" aria-label="What to show">${[
    ["all", "📋 Everything"],
    ["jobs", "🏗 Jobs"],
    ["diary", "📅 My diary only"],
  ]
    .map(
      ([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${show === k}">${l}</button>`,
    )
    .join(
      "",
    )}</div>${show === "diary" ? "" : `<button type="button" class="btn pmf-pick" id="pmf-pick">🏗 ${pick.length ? pick.length + " job" + (pick.length === 1 ? "" : "s") + " picked" : "All jobs" + (n ? " (" + n + ")" : "")} ▾</button>`}</div>`;
}
function pmfClashHtml(list, first) {
  if ((S.f.pmshow || "all") === "diary") return "";
  const end = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const out = [];
  for (let d = new Date(first); d <= end; d.setDate(d.getDate() + 1)) {
    const di = iso(d),
      c = pmfClash(list, di);
    if (c) out.push([di, c]);
  }
  if (!out.length) return '<div class="who pmf-none">✓ No jobs overlap this month.</div>';
  return `<div class="card pmf-clashes"><div class="cardbody" style="border:0"><b>Jobs on the same days (${out.length})</b>${out
    .map(
      ([di, c]) =>
        `<div class="pmf-row${c.people.length ? " pmf-bad" : ""}"><span class="pmf-d">${esc(shortDay(di))}</span><span>${c.keys.map((k) => esc(pmfJobLabel(k))).join(" · ")}${c.people.length ? `<span class="pmf-w">⚠️ ${esc(c.people.map(nameOf).join(", "))} on more than one</span>` : ""}</span></div>`,
    )
    .join("")}</div></div>`;
}
function pmfWire(list, first) {
  const s = $("pmf-show");
  if (s)
    s.querySelectorAll("button").forEach(
      (b) =>
        (b.onclick = () => {
          S.f.pmshow = b.dataset.v;
          render();
        }),
    );
  if ($("pmf-pick"))
    $("pmf-pick").onclick = () => {
      const all = pmfJobsIn(list, first);
      const pick = new Set(S.f.pmjobs || []);
      openSheet(
        `<h3 id="sheettitle">🏗 Which jobs to show</h3><div class="who">Tick the jobs to compare. None ticked shows them all.</div>
        <div class="pmf-list">${all.length ? all.map((k, i) => `<label class="tick"><input type="checkbox" class="pmf-j" data-i="${i}"${pick.has(k) ? " checked" : ""}> <span>${esc(pmfJobLabel(k))}</span></label>`).join("") : '<div class="who">No jobs booked this month.</div>'}</div>
        <button type="button" class="linkbtn" id="pmf-none">Show all jobs</button>
        ${formFoot(false, "Show these")}`,
        () => {
          S.f.pmjobs = [...document.querySelectorAll("#sheet .pmf-j:checked")].map(
            (x) => all[+x.dataset.i],
          );
          if (S.f.pmjobs.length && (S.f.pmshow || "all") === "all") S.f.pmshow = "jobs";
          closeForm();
          render();
        },
        null,
      );
      $("pmf-none").onclick = () => {
        S.f.pmjobs = [];
        closeForm();
        render();
      };
    };
}
