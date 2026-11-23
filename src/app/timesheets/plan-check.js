/* ================= PLAN CHECK: the planner against the timesheets – booked but no timesheet, or on another job ================= */
import { addDays, esc, iso, parse, shortDay, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { crewIds, nameOf } from "../owner/owner.js";
import { onDay } from "../planner/time-off.js";
import { siteLabel } from "../sites/job-details.js";
import { same } from "../sites/project-pages.js";
import { qwOpen } from "./quick-week.js";
export { pcCardHtml, pcList, pcOff, pcWire, pcYesterday };
/* James (Nov 2026): "the planner checks the timesheets". For each weekday of the week shown on Timesheets, up to
   yesterday: everyone booked on a job in the planner (work bookings with a site and people) is checked against their
   timesheet for that day – no timesheet at all, or a timesheet only on other jobs. Someone on holiday, leave or a
   course that day isn't asked. Each line opens that person's ✎ Quick edit for the week to put it right, or "It's fine"
   hides that one line for good (settings/app.pcOk, kept short). The same check for yesterday feeds Today. */
const pcEnts = (id) => (id === S.me ? S.mine.entries : S.data.entries[id]) || [];
/* someone off that day: holiday, leave or a course booked for them */
const pcOff = (id, d) =>
  (S.plan || [])
    .concat(S.planPrivate || [])
    .some(
      (p) =>
        (p.type === "holiday" || p.type === "course") &&
        onDay(p, d) &&
        Array.isArray(p.people) &&
        p.people.includes(id),
    );
/* what doesn't match on the days from..to (iso, both included; weekdays before today only) */
function pcList(from, to) {
  const today = iso(new Date());
  const ok = new Set((S.settings || {}).pcOk || []);
  const out = [];
  /* James too, when he is booked on a job (James, Nov 2026: "am i being picked up on things like weekly wrap up") */
  const team = new Set(crewIds());
  for (let d = from; d <= to && d < today; d = iso(addDays(parse(d), 1))) {
    const wd = parse(d).getDay();
    if (wd === 0 || wd === 6) continue;
    (S.plan || [])
      .concat(S.planPrivate || [])
      .filter((p) => p.type === "work" && p.site && onDay(p, d) && Array.isArray(p.people))
      .forEach((p) =>
        p.people.forEach((id) => {
          if (!team.has(id) || pcOff(id, d)) return;
          const key = d + "|" + id + "|" + p.id;
          if (ok.has(key)) return;
          const ts = pcEnts(id).filter((e) => e.type === "hours" && e.date === d);
          if (!ts.length) out.push({ key, d, id, site: p.site, kind: "none" });
          else if (!ts.some((e) => same(e.job, p.site)))
            out.push({
              key,
              d,
              id,
              site: p.site,
              kind: "other",
              said: [...new Set(ts.map((e) => e.job))],
            });
        }),
      );
  }
  return out;
}
function pcCardHtml() {
  if (!S.owner) return "";
  const from = iso(S.week),
    to = iso(addDays(S.week, 6));
  const L = pcList(from, to);
  if (!L.length) return "";
  return `<div class="notice warn pccard"><b>🗓 The planner and the timesheets don't match (${L.length})</b><div class="who">People booked on a job this week, by the planner, with no timesheet for that day or a timesheet on another job.</div>
    ${L.map(
      (x, i) =>
        `<div class="pcrow"><span><b>${esc(nameOf(x.id))}</b> · ${esc(shortDay(x.d))} · booked on <b>${esc(siteLabel(x.site))}</b> · ${x.kind === "none" ? "<b>no timesheet</b>" : "timesheet says <b>" + esc(x.said.join(", ")) + "</b>"}</span><span class="pcacts"><button type="button" class="btn pc-fix" data-w="${esc(x.id)}">✎ Put it right</button><button type="button" class="btn pc-ok" data-k="${i}">It's fine</button></span></div>`,
    ).join("")}</div>`;
}
function pcWire() {
  const card = document.querySelector(".pccard");
  if (!card) return;
  const L = pcList(iso(S.week), iso(addDays(S.week, 6)));
  card.querySelectorAll(".pc-fix").forEach((b) => (b.onclick = () => qwOpen(b.dataset.w)));
  card.querySelectorAll(".pc-ok").forEach(
    (b) =>
      (b.onclick = async () => {
        const x = L[+b.dataset.k];
        if (!x) return;
        const keep = [...new Set(((S.settings || {}).pcOk || []).concat([x.key]))].slice(-400);
        try {
          await S.db.doc("settings/app").set(Object.assign({}, S.settings, { pcOk: keep }));
          S.settings = Object.assign({}, S.settings, { pcOk: keep });
          render();
        } catch (e) {
          toast("Couldn't save");
        }
      }),
  );
}
/* yesterday (or Friday, on a Monday): how many don't match – for Today */
function pcYesterday() {
  const t = new Date();
  let d = addDays(t, -1);
  while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, -1);
  return pcList(iso(d), iso(d));
}
