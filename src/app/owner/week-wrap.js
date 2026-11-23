/* ================= WEEK WRAP: Friday's one screen – hours, missing timesheets, money owed, jobs going over, who's off, what's due ================= */
import { addDays, esc, gbp, hrs, iso, monday, parse, shortDay, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { coData } from "./company-details.js";
import { crewIds, nameOf } from "./owner.js";
import { nlOpenTab } from "./today.js";
import { dueSoonItems } from "../safety/expiry-dates.js";
import { jbProblems } from "../sales/job-budget.js";
import { sdCalc, sdSales, sdStatus } from "../sales/sales-calc.js";
import { siteLabel } from "../sites/job-details.js";
import { pcList, pcOff, pcYesterday } from "../timesheets/plan-check.js";
export { pcTodayCard, pcTodayWire, wuOpen, wuTodayCard, wuTodayWire };
/* James (Nov 2026): "a Friday wrap-up – one screen with everything you'd otherwise check in six places". This week so
   far: everyone's hours; weekdays with no timesheet (for people who put timesheets in, not off that day); the planner
   and timesheets that don't match; invoices overdue; jobs going over budget; holidays, leave and courses in the next
   two weeks; tickets, cards and dates due in the next 30 days. On Today from Friday to Monday, and from Timesheets any
   day. Copy as text, to send or keep. Owner only. */
function wuData() {
  const today = iso(new Date());
  const mon = monday(new Date());
  const wk = Array.from({ length: 7 }, (_, i) => iso(addDays(mon, i)));
  const ents = (id) => (id === S.me ? S.mine.entries : S.data.entries[id]) || [];
  const since = iso(addDays(new Date(), -28));
  /* people who put timesheets in: any in the last four weeks */
  const people = crewIds().filter((id) =>
    ents(id).some((e) => e.type === "hours" && e.date >= since),
  );
  const hoursBy = people
    .map((id) => ({
      id,
      h: ents(id)
        .filter((e) => e.type === "hours" && wk.includes(e.date) && !e.open)
        .reduce((a, e) => a + (+e.hours || 0), 0),
    }))
    .sort((a, b) => b.h - a.h);
  const missing = [];
  people.forEach((id) => {
    const days = wk.filter((d) => {
      const wd = parse(d).getDay();
      return (
        d < today &&
        wd !== 0 &&
        wd !== 6 &&
        !pcOff(id, d) &&
        !ents(id).some((e) => e.type === "hours" && e.date === d)
      );
    });
    if (days.length) missing.push({ id, days });
  });
  const yest = iso(addDays(new Date(), -1));
  const mism = pcList(wk[0], yest < wk[0] ? wk[0] : yest);
  const overdue = sdSales()
    .filter((v) => v.type === "invoice" && sdStatus(v) === "overdue")
    .map((v) => ({ v, owed: sdCalc(v).balance }))
    .filter((x) => x.owed > 0);
  let jobs = [];
  try {
    jobs = jbProblems();
  } catch (e) {}
  const t14 = iso(addDays(new Date(), 14));
  const off = (S.plan || [])
    .concat(S.planPrivate || [])
    .filter(
      (p) =>
        (p.type === "holiday" || p.type === "course") && (p.to || p.from) >= today && p.from <= t14,
    )
    .sort((a, b) => (a.from || "").localeCompare(b.from || ""));
  let due = [];
  try {
    due = dueSoonItems("all").filter((x) => x.n <= 30);
  } catch (e) {}
  return { mon, hoursBy, missing, mism, overdue, jobs, off, due };
}
function wuTodayCard() {
  if (!S.owner) return "";
  const wd = new Date().getDay();
  if (!(wd === 5 || wd === 6 || wd === 0 || wd === 1)) return "";
  let x;
  try {
    x = wuData();
  } catch (e) {
    return "";
  }
  const n = x.missing.length + x.mism.length + x.overdue.length + x.jobs.length;
  return `<button type="button" class="nl-card wu-today" id="wu-today"><b>📋 ${wd === 1 ? "Last week" : "Your week"} wrapped up</b><span class="who">${n ? n + " thing" + (n === 1 ? "" : "s") + " to look at" : "All clear"} · hours, timesheets, money, jobs, who's off · tap to see</span></button>`;
}
function wuTodayWire() {
  const b = document.getElementById("wu-today");
  if (b) b.onclick = () => wuOpen();
}
function wuOpen() {
  const x = wuData();
  const sec = (t, n, body, clear) =>
    `<section class="card wu-sec"><div class="cardbody"><div class="wu-h"><b>${t}</b>${n ? `<span class="tag warn">${n}</span>` : '<span class="tag ok">✓</span>'}</div>${n ? body : `<div class="who">${clear}</div>`}</div></section>`;
  const totH = x.hoursBy.reduce((a, p) => a + p.h, 0);
  const html = `<div class="wu"><h2>📋 Week wrap-up</h2><div class="who">Week of ${esc(x.mon.toLocaleDateString("en-GB", { day: "numeric", month: "long" }))}, up to today.</div>
    <section class="card wu-sec"><div class="cardbody"><div class="wu-h"><b>⏱ Hours this week</b><span class="tag">${hrs(totH)} h</span></div>${x.hoursBy.length ? x.hoursBy.map((p) => `<div class="drow"><span>${esc(nameOf(p.id))}</span><b>${hrs(p.h)} h</b></div>`).join("") : '<div class="who">No timesheets yet.</div>'}</div></section>
    ${sec("📝 Timesheets missing", x.missing.length, x.missing.map((m) => `<div class="drow"><span>${esc(nameOf(m.id))}</span><span>${m.days.map((d) => esc(shortDay(d))).join(", ")}</span></div>`).join(""), "Everyone's in for every weekday so far.")}
    ${sec("🗓 Planner and timesheets don't match", x.mism.length, x.mism.map((m) => `<div class="drow"><span>${esc(nameOf(m.id))} · ${esc(shortDay(m.d))}</span><span>booked on ${esc(siteLabel(m.site))} · ${m.kind === "none" ? "no timesheet" : "timesheet says " + esc(m.said.join(", "))}</span></div>`).join(""), "Everyone was where the planner said.")}
    ${sec("💷 Invoices overdue", x.overdue.length, x.overdue.map((o) => `<div class="drow"><span>${esc(o.v.client || "")} · invoice ${esc(o.v.number || "")}</span><b>${gbp(o.owed)}</b></div>`).join("") + `<div class="drow"><span>Total</span><b>${gbp(x.overdue.reduce((a, o) => a + o.owed, 0))}</b></div>`, "Nothing overdue.")}
    ${sec("📈 Jobs going over budget", x.jobs.length, x.jobs.map((j) => `<div class="drow"><span>${esc(siteLabel(j.site))}</span><span>${esc(j.b.msg)}</span></div>`).join(""), "Every priced job is on track.")}
    ${sec("🌴 Off in the next two weeks", x.off.length, x.off.map((p) => `<div class="drow"><span>${esc(p.title || "")}</span><span>${esc(shortDay(p.from))}${p.to && p.to !== p.from ? " – " + esc(shortDay(p.to)) : ""}</span></div>`).join(""), "Nobody booked off.")}
    ${sec("📅 Due in the next 30 days", x.due.length, x.due.map((d) => `<div class="drow"><span>${esc(d.what)}</span><span>${esc(shortDay(d.date))}</span></div>`).join(""), "Nothing due.")}
    <div class="actions"><button type="button" class="btn" id="wu-copy">📋 Copy as text</button><a class="btn primary" id="wu-mail" href="#" target="_blank" rel="noopener">✉️ Email it to me</a></div></div>`;
  openViewer(html);
  /* the wrap-up as plain text, for copying or an email */
  const wuText = () =>
    [...document.querySelectorAll(".wu .wu-sec")]
      .map((s) =>
        [s.querySelector(".wu-h b").textContent]
          .concat(
            [...s.querySelectorAll(".drow")].map(
              (r) => "  " + [...r.children].map((k) => k.textContent).join(" – "),
            ),
          )
          .join("\n"),
      )
      .join("\n\n");
  {
    /* ✉️ an email to the address in the company details (else the mail app asks who to), the wrap-up written in */
    const m = document.getElementById("wu-mail");
    if (m)
      m.href =
        "mailto:" +
        encodeURIComponent(coData().email || "") +
        "?subject=" +
        encodeURIComponent(
          "Week wrap-up – week of " +
            x.mon.toLocaleDateString("en-GB", { day: "numeric", month: "long" }),
        ) +
        "&body=" +
        encodeURIComponent(wuText().slice(0, 1800));
  }
  const c = document.getElementById("wu-copy");
  if (c)
    c.onclick = async () => {
      const t = wuText();
      try {
        await navigator.clipboard.writeText("Week wrap-up\n\n" + t);
        toast("Copied");
      } catch (e) {
        toast("Couldn't copy here");
      }
    };
}
/* Today: yesterday's timesheets that don't match the planner (plan-check.js) */
function pcTodayCard() {
  if (!S.owner) return "";
  let L;
  try {
    L = pcYesterday();
  } catch (e) {
    return "";
  }
  if (!L.length) return "";
  return `<button type="button" class="nl-card pc-today" id="pc-today"><b>🗓 ${L.length} timesheet${L.length === 1 ? "" : "s"} from ${esc(shortDay(L[0].d))} ${L.length === 1 ? "doesn't" : "don't"} match the planner</b><span class="who">${esc([...new Set(L.map((x) => nameOf(x.id)))].join(", "))} · tap to check</span></button>`;
}
function pcTodayWire() {
  const b = document.getElementById("pc-today");
  if (!b) return;
  b.onclick = () => {
    const L = pcYesterday();
    if (L.length) S.week = monday(parse(L[0].d));
    nlOpenTab("time");
  };
}
