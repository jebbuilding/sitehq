/* ================= TODAY DESK: This week, Today's jobs, On site now, and the + Add sheet ================= */
import { clStage } from "../clients/clients.js";
import { quickEnquiry } from "../clients/quick-enquiry.js";
import { $, addDays, esc, hrs, iso, parse } from "../core/helpers.js";
import { S, isArchivedSite } from "../core/state.js";
import { allTeam, nameOf, teamIds } from "./owner.js";
import { nlGo, nlOpenTab } from "./today.js";
import { openPhoto } from "../photos/photos.js";
import { openPlanEditor } from "../planner/board.js";
import { onDay } from "../planner/time-off.js";
import { sdEdit } from "../sales/sales-edit.js";
import { vrNew } from "../sales/variations.js";
import { projectSites, same } from "../sites/project-pages.js";
import { onSiteNow } from "../sites/roll-call.js";
import { siteClient } from "../sites/summary.js";
import { pickPersonFor } from "../timesheets/day-work.js";
import { sumH } from "../timesheets/time.js";
export { qaOpen, tdDeskWire, tdjCard, tdoCard, tdwCard };
/* The Today page as in the layout pictures: This week (Mon–Fri, who's booked on each job from the planner, with
   gaps – a job nobody's booked on that day – and clashes – someone on two jobs), Today's jobs (live jobs with the
   client, stage, who and hours this week), On site now (each person, where, since when). + Add: one place to add a
   photo, enquiry, receipt, hours, to-do, planner booking, estimate or drawing. */
const TDW_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
/* this week's Monday–Friday dates */
function tdwDates() {
  const d = new Date();
  /* at the weekend, the week coming up */
  const mon =
    d.getDay() === 6
      ? addDays(d, 2)
      : d.getDay() === 0
        ? addDays(d, 1)
        : addDays(d, -((d.getDay() + 6) % 7));
  return TDW_DAYS.map((_, i) => iso(addDays(mon, i)));
}
/* who's booked on which job each day, from the planner (work bookings with a site and people) */
function tdwGrid() {
  const days = tdwDates();
  const plan = (S.plan || [])
    .concat(S.planPrivate || [])
    .filter((p) => p.site && p.type !== "holiday" && p.from);
  const off = (S.plan || []).filter((p) => p.type === "holiday");
  const sites = projectSites().filter((n) => !isArchivedSite(n));
  const team = teamIds();
  const rows = sites
    .map((s) => ({
      site: s,
      days: days.map((d) => [
        ...new Set(
          plan
            .filter((p) => same(p.site, s) && onDay(p, d))
            .flatMap((p) => (Array.isArray(p.people) ? p.people : [])),
        ),
      ]),
    }))
    .filter((r) => r.days.some((x) => x.length));
  const today = iso(new Date());
  /* clashes: someone on two jobs the same day */
  const clash = days.map((d, i) => {
    const seen = {},
      two = new Set();
    rows.forEach((r) => r.days[i].forEach((w) => (seen[w] ? two.add(w) : (seen[w] = 1))));
    return two;
  });
  /* gaps: a job with people some days this week but nobody on this one (today or later) */
  const gaps = rows.map((r) =>
    days.map((d, i) => d >= today && !r.days[i].length && r.days.some((x) => x.length)),
  );
  const free = days.map((d, i) =>
    team.filter(
      (w) =>
        !rows.some((r) => r.days[i].includes(w)) &&
        !off.some(
          (p) => onDay(p, d) && (Array.isArray(p.people) ? p.people.includes(w) : p.who === w),
        ),
    ),
  );
  const toSort = gaps.flat().filter(Boolean).length + clash.reduce((a, s) => a + s.size, 0);
  return { days, rows, clash, gaps, free, toSort, today };
}
function tdwCard() {
  const g = tdwGrid();
  const fmt = (d) => parse(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const nm = (w) => esc(nameOf(w).split(" ")[0]);
  const cell = (r, ri, i) => {
    const who = r.days[i];
    if (g.gaps[ri][i]) return `<td class="tdw-gap"><b>Nobody booked</b></td>`;
    if (!who.length) return `<td class="tdw-none">–</td>`;
    return `<td${who.some((w) => g.clash[i].has(w)) ? ' class="tdw-clash"' : ""}>${who.map((w) => (g.clash[i].has(w) ? `<b>${nm(w)}</b>` : nm(w))).join(", ")}${
      who.some((w) => g.clash[i].has(w))
        ? `<br><small>${who
            .filter((w) => g.clash[i].has(w))
            .map(nm)
            .join(", ")} on two jobs</small>`
        : ""
    }</td>`;
  };
  /* the phone version: a count for each day, with the gaps and clashes */
  const strip = g.days
    .map((d, i) => {
      const n = new Set(g.rows.flatMap((r) => r.days[i])).size;
      const bad = g.gaps.some((x) => x[i]) ? "gap" : g.clash[i].size ? "clash" : "";
      return `<span class="tdw-d${bad ? " bad" : ""}${d === g.today ? " now" : ""}"><small>${TDW_DAYS[i]}</small><b>${n}</b><small>${bad || "on site"}</small></span>`;
    })
    .join("");
  return `<section class="nl-card tdw" id="tdw"><div class="nl-cardh"><h2>This week <small class="who">${esc(fmt(g.days[0]))} – ${esc(fmt(g.days[4]))}</small></h2>${g.toSort ? `<span class="tdw-sort">${g.toSort} to sort out</span>` : ""}</div>
    ${
      g.rows.length
        ? `<div class="tdw-strip">${strip}</div><div class="tdw-wrap"><table class="tdw-t"><thead><tr><th>Job</th>${g.days.map((d, i) => `<th${d === g.today ? ' class="now"' : ""}>${TDW_DAYS[i]}</th>`).join("")}</tr></thead><tbody>${g.rows
            .map(
              (r, ri) =>
                `<tr><td class="tdw-job">${esc(r.site)}</td>${g.days.map((_, i) => cell(r, ri, i)).join("")}</tr>`,
            )
            .join(
              "",
            )}<tr class="tdw-free"><td>Free</td>${g.free.map((f) => `<td>${f.length ? f.map(nm).join(", ") : "–"}</td>`).join("")}</tr></tbody></table></div>`
        : `<div class="who">Nobody's booked on a job in the planner this week. Book people on jobs in the Planner and they show here.</div>`
    }
    <button type="button" class="btn tdw-go" id="tdw-go">Open the planner</button></section>`;
}
/* live jobs today: who's booked or on site, the client and stage, hours this week */
function tdjCard() {
  const today = iso(new Date()),
    wk0 = iso(addDays(new Date(), -6));
  const ents = allTeam("entries");
  const plan = (S.plan || [])
    .concat(S.planPrivate || [])
    .filter((p) => p.site && p.type !== "holiday");
  const on = onSiteNow();
  const jobs = projectSites()
    .filter((n) => !isArchivedSite(n))
    .map((n) => {
      const c = siteClient(n);
      const who = [
        ...new Set(
          on
            .filter((r) => same(r.job, n))
            .map((r) => r.who)
            .concat(
              plan.filter((p) => same(p.site, n) && onDay(p, today)).flatMap((p) => p.people || []),
            ),
        ),
      ];
      const h = sumH(
        ents.filter((x) => x.type === "hours" && same(x.job, n) && x.date >= wk0),
        () => true,
      );
      return { n, c, who, h };
    })
    .sort((a, b) => b.who.length - a.who.length || b.h - a.h)
    .slice(0, 8);
  return `<section class="nl-card tdj"><h2 class="tdj-h">Today's jobs</h2>${
    jobs.length
      ? `<div class="tdw-wrap"><table class="tdj-t"><thead><tr><th>Job</th><th>Stage</th><th>Who</th><th class="num">This week</th></tr></thead><tbody>${jobs
          .map(
            (j) =>
              `<tr class="tdj-r" data-s="${esc(j.n)}" tabindex="0"><td><b>${esc(j.n)}</b>${j.c ? `<br><small class="who">${esc([j.c.name, j.c.work].filter(Boolean).join(" – "))}</small>` : ""}</td><td>${j.c ? `<span class="tdj-st">${esc(clStage(j.c.stage))}</span>` : ""}</td><td class="who">${j.who.length ? j.who.map((w) => esc(nameOf(w))).join(", ") : "–"}</td><td class="num">${hrs(j.h)} h</td></tr>`,
          )
          .join("")}</tbody></table></div>`
      : '<div class="who">No live jobs.</div>'
  }</section>`;
}
function tdoCard() {
  const rows = onSiteNow().sort((a, b) =>
    (a.actualIn || a.start || "").localeCompare(b.actualIn || b.start || ""),
  );
  const ini = (n) =>
    String(n || "?")
      .split(/\s+/)
      .map((x) => x[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase();
  return `<section class="nl-card tdo"><div class="nl-cardh"><h2>On site now</h2><span class="nl-big">${rows.length}</span></div>${
    rows.length
      ? rows
          .slice(0, 6)
          .map(
            (r) =>
              `<div class="tdo-r"><span class="tdo-av" aria-hidden="true">${esc(ini(nameOf(r.who)))}</span><span><b>${esc(nameOf(r.who))}</b><br><small class="who">${esc(r.job || "No site")} · since ${esc(r.actualIn || r.start || "")}</small></span></div>`,
          )
          .join("")
      : '<div class="who">Nobody has checked in yet today.</div>'
  }<button type="button" class="btn nl-wide" id="nl-roll">${rows.length ? `See all ${rows.length} and the sign-in book` : "Sign-in book"}</button></section>`;
}
function tdDeskWire() {
  if ($("tdw-go")) $("tdw-go").onclick = () => nlOpenTab("planner");
  document.querySelectorAll("#main .tdj-r").forEach(
    (r) =>
      (r.onclick = r.onkeydown =
        (e) => {
          if (e.type === "keydown" && e.key !== "Enter") return;
          S.f.proj = r.dataset.s;
          S.f.projList = false;
          S.f.pjtab = "overview";
          nlGo("projects");
        }),
  );
}
/* + Add: one place to add anything */
const QA_ITEMS = [
  ["photo", "📷", "Photo"],
  ["enq", "⚡", "Enquiry"],
  ["rcpt", "🧾", "Receipt"],
  ["hours", "⏱️", "Hours for someone"],
  ["todo", "✅", "To-do"],
  ["plan", "🗓️", "Planner booking"],
  ["est", "💷", "Estimate"],
  ["var", "📝", "Variation"],
  ["draw", "✏️", "Drawing"],
];
function qaOpen() {
  const d = document.createElement("div");
  d.className = "dimask qa-pop";
  d.innerHTML = `<div class="dimbox" role="dialog" aria-labelledby="qa-h"><b id="qa-h">➕ Add</b><div class="qa-grid">${QA_ITEMS.map(([k, i, l]) => `<button type="button" class="qa-b" data-k="${k}"><span aria-hidden="true">${i}</span>${esc(l)}</button>`).join("")}</div><div class="dimbtns"><button type="button" class="btn" id="qa-x">Close</button></div></div>`;
  document.body.appendChild(d);
  d.querySelector("#qa-x").onclick = () => d.remove();
  d.onclick = (e) => e.target === d && d.remove();
  d.querySelectorAll(".qa-b").forEach(
    (b) =>
      (b.onclick = () => {
        d.remove();
        const k = b.dataset.k;
        if (k === "photo") openPhoto();
        else if (k === "enq") quickEnquiry();
        else if (k === "hours") pickPersonFor("hours");
        else if (k === "plan") openPlanEditor(null, iso(new Date()));
        else if (k === "est") sdEdit({ type: "estimate" });
        else if (k === "var") vrNew();
        else if (k === "rcpt") {
          S.f.act = "rcpt";
          nlGo("accounts");
          const fi = document.querySelector("#main .ac-rfile");
          if (fi) fi.click();
        } else if (k === "todo") {
          nlGo("todo");
          if ($("td-text")) $("td-text").focus();
        } else if (k === "draw") {
          nlGo("draw");
          if ($("dw-new")) $("dw-new").click();
        }
      }),
  );
}
