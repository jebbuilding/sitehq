/* ================= NOT CHECKED OUT: trades still checked in from an earlier day, and when each last sent a timesheet ================= */
import { esc, iso, monday, parse } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { crewIds, nameOf, openStopFor, sheetOf } from "../owner/owner.js";
import { siteLabel } from "../sites/job-details.js";
export { ncoCardHtml, ncoNothingHtml, ncoWire };
/* James (Nov 2026): "timesheets dont seem to show details and hours of trades within the app" / "doesnt seem to work
   right at all". Three trades checked in on a Thursday and never checked out; a check-in left open shows 0 hours, and
   the trade's Time page used to stop them checking in again until they set a finish, so nothing came in for two weeks
   and James's Timesheets page (on the current week) just said "Nothing logged this week". Now: Timesheets starts with
   everyone still checked in from an earlier day – the site, the day, when they arrived – with Set finish (their usual
   finish already filled in) and Go to that week; a person with nothing this week shows when their last timesheet was,
   with a button to that week. The trade can check in again while an old day is open (it asks them to set its finish). */
function ncoList() {
  const today = iso(new Date());
  const out = [];
  crewIds().forEach((id) =>
    sheetOf("entries", id)
      .filter((e) => e.open && e.type === "hours" && e.date && e.date < today)
      .forEach((e) => out.push({ id, e })),
  );
  return out.sort((a, b) => a.e.date.localeCompare(b.e.date));
}
function ncoCardHtml() {
  const L = ncoList();
  if (!L.length) return "";
  return `<div class="card nco-card"><div class="cardbody" style="border:0">
    <div class="nco-h">⚠️ Never checked out (${L.length})</div>
    <div class="who">They checked in and didn't check out, so these days count as <b>0 hours</b> until a finish time is put in.</div>
    ${L.map(
      ({
        id,
        e,
      }) => `<div class="nco-row"><div class="nco-t"><b>${esc(nameOf(id))}</b><span class="who">${esc(parse(e.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }))} · ${esc(siteLabel(e.job))} · in at ${esc(e.actualIn || e.start)}</span></div>
      <button type="button" class="btn primary nco-fin" data-w="${esc(id)}" data-e="${esc(e.id)}">Set finish</button><button type="button" class="pillbtn nco-wk" data-d="${esc(e.date)}">Go to that week</button></div>`,
    ).join("")}</div></div>`;
}
function ncoWire() {
  document.querySelectorAll(".nco-fin").forEach(
    (b) =>
      (b.onclick = () => {
        const e = sheetOf("entries", b.dataset.w).find((x) => x.id === b.dataset.e);
        if (e) openStopFor(b.dataset.w, e);
      }),
  );
  document.querySelectorAll(".nco-wk").forEach(
    (b) =>
      (b.onclick = () => {
        S.week = monday(parse(b.dataset.d));
        render();
      }),
  );
}
/* the last day someone put a timesheet in (any week), for "Nothing logged this week" */
function ncoLast(id) {
  const ds = sheetOf("entries", id)
    .filter((e) => !e.forName && e.date)
    .map((e) => e.date)
    .sort();
  return ds.length ? ds[ds.length - 1] : "";
}
function ncoNothingHtml(id) {
  const d = ncoLast(id);
  return `<div class="nothing">Nothing logged this week.${
    d
      ? ` <span class="nco-last">Last timesheet: <b>${esc(parse(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }))}</b> <button type="button" class="pillbtn nco-wk" data-d="${esc(d)}">Go to that week</button></span>`
      : " No timesheets from them yet."
  }</div>`;
}
