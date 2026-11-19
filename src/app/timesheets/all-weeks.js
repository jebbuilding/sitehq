/* ================= ALL WEEKS: team hours over recent weeks, and every timesheet a trade has sent ================= */
import { esc, hrs, iso, monday, parse } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { nameOf, teamIds } from "../owner/owner.js";
export { awCardHtml, awWire };
/* James (Nov 2026): "in time sheets is not showing team hours or any other hours nor does it show hours for each trade
   and I should be able to see each trades full time sheets". Timesheets only showed the chosen week, so a week with
   nothing in it read 0 everywhere. Now it starts with 📊 Recent weeks: each trade's hours for the last 8 weeks and the
   team total, every figure a button to that week; when this week is empty it says so and points at the latest week
   with hours. Each trade's card has 📚 All timesheets: every week they have sent, newest first – days, hours, to
   approve, never checked out – each opening that week with their card open. */
function awOwn(id) {
  return ((id === S.me ? S.mine.entries : S.data.entries[id]) || []).filter(
    (e) => e.date && !e.forName && (e.type === "hours" || e.type === "job"),
  );
}
function awWeeks(id) {
  const W = {};
  awOwn(id).forEach((e) => {
    const k = iso(monday(parse(e.date)));
    const w = (W[k] = W[k] || { wk: k, h: 0, dj: 0, days: new Set(), pend: 0, open: 0 });
    if (e.type === "hours") {
      w.h += +e.hours || 0;
      w.days.add(e.date);
      if (e.open) w.open++;
    } else w.dj += +e.hours || 0;
    if (!e.approved) w.pend++;
  });
  return Object.values(W).sort((a, b) => b.wk.localeCompare(a.wk));
}
const awWkLabel = (k) =>
  "w/c " +
  parse(k).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
function awCardHtml() {
  const ids = teamIds();
  if (!ids.length) return "";
  const cur = iso(S.week);
  const wks = [];
  for (let i = 7; i >= 0; i--) {
    const d = parse(iso(monday(new Date())));
    d.setDate(d.getDate() - 7 * i);
    wks.push(iso(d));
  }
  const per = {};
  ids.forEach((id) => {
    per[id] = {};
    awWeeks(id).forEach((w) => (per[id][w.wk] = w));
  });
  const tot = (k) => ids.reduce((a, id) => a + ((per[id][k] || {}).h || 0), 0);
  const curH = tot(cur);
  let latest = "";
  ids.forEach((id) => {
    const w = awWeeks(id).find((x) => x.h > 0 && x.wk <= iso(monday(new Date())));
    if (w && w.wk > latest) latest = w.wk;
  });
  const cell = (k, w) =>
    `<td class="num"><button type="button" class="aw-go${k === cur ? " aw-cur" : ""}" data-k="${esc(k)}">${w && (w.h || w.open) ? hrs(w.h) + (w.open ? " ⚠️" : "") : "–"}</button></td>`;
  return `${
    !curH && latest && latest !== cur
      ? `<div class="notice aw-empty">No timesheet hours for the week you're looking at. The latest hours are in the <b>${esc(awWkLabel(latest))}</b> week. <button type="button" class="btn primary aw-go" data-k="${esc(latest)}">Go to that week</button></div>`
      : ""
  }<details class="card aw-card" data-id="__aw" ${S.f.awShut ? "" : "open"}><summary><div class="nm">📊 Recent weeks<small>Each trade's timesheet hours, last 8 weeks. Tap a figure to open that week.</small></div><div class="figs"><span><b>${hrs(tot(cur))}</b> h this week</span></div></summary>
    <div class="cardbody"><div class="tablewrap"><table class="aw-tbl"><thead><tr><th>Who</th>${wks.map((k) => `<th class="num">${esc(parse(k).toLocaleDateString("en-GB", { day: "numeric", month: "short" }))}</th>`).join("")}<th></th></tr></thead><tbody>
    ${ids.map((id) => `<tr><td><b>${esc(nameOf(id))}</b></td>${wks.map((k) => cell(k, per[id][k])).join("")}<td><button type="button" class="pillbtn aw-all" data-w="${esc(id)}">📚 All</button></td></tr>`).join("")}
    <tr class="aw-tot"><td><b>Team</b></td>${wks.map((k) => `<td class="num"><button type="button" class="aw-go${k === cur ? " aw-cur" : ""}" data-k="${esc(k)}"><b>${hrs(tot(k))}</b></button></td>`).join("")}<td></td></tr>
    </tbody></table></div><div class="who">⚠️ = a day they checked in and never checked out (it counts 0 hours until a finish is put in).</div></div></details>`;
}
function awOpen(id) {
  const L = awWeeks(id);
  const allH = L.reduce((a, w) => a + w.h, 0);
  openViewer(`<h2 class="aw-h">📚 ${esc(nameOf(id))}: all timesheets</h2>
    <div class="who">${L.length} week${L.length === 1 ? "" : "s"} · ${hrs(allH)} h on timesheets in all. Tap a week to open it.</div>
    ${
      L.length
        ? `<div class="tablewrap"><table class="aw-tbl"><thead><tr><th>Week</th><th class="num">Days</th><th class="num">Hours</th><th class="num">Day work</th><th>State</th><th></th></tr></thead><tbody>
      ${L.map((w) => `<tr><td><b>${esc(awWkLabel(w.wk))}</b></td><td class="num">${w.days.size}</td><td class="num"><b>${hrs(w.h)}</b></td><td class="num">${w.dj ? hrs(w.dj) : "–"}</td><td>${w.open ? `<span class="tag warn">⚠️ ${w.open} never checked out</span> ` : ""}${w.pend ? `<span class="tag">${w.pend} to approve</span>` : '<span class="tag ok">Approved</span>'}</td><td><button type="button" class="btn aw-wk" data-k="${esc(w.wk)}">Open ›</button></td></tr>`).join("")}
      </tbody></table></div>`
        : '<div class="nothing">No timesheets from them yet.</div>'
    }`);
  document.querySelectorAll("#viewer-body .aw-wk").forEach(
    (b) =>
      (b.onclick = () => {
        S.week = monday(parse(b.dataset.k));
        S.open.add(id);
        closeViewer();
        render();
      }),
  );
}
function awWire() {
  document
    .querySelectorAll(".aw-card")
    .forEach((d) => d.addEventListener("toggle", () => (S.f.awShut = !d.open)));
  document.querySelectorAll(".aw-go").forEach(
    (b) =>
      (b.onclick = () => {
        S.week = monday(parse(b.dataset.k));
        render();
      }),
  );
  document.querySelectorAll(".aw-all").forEach((b) => (b.onclick = () => awOpen(b.dataset.w)));
}
