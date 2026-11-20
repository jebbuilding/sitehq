/* ================= VISIT DIARY: what's already in the diary on the day a visit is being booked ================= */
import { $, addDays, esc, iso, parse, shortDay, toMin } from "../core/helpers.js";
import { S } from "../core/state.js";
import { nameOf } from "../owner/owner.js";
import { toHM } from "../planner/diary.js";
import { onDay, planEntries } from "../planner/time-off.js";
export { vdWire };
/* James (Nov 2026): "when doing a quick enquiry and looking for a date for the visit allow me to open my diary to make
   sure it doesnt conflict with anything". Under the visit date: everything in the planner that day (visits,
   meetings, jobs, holidays, and the trades booked), in time order, with ⚠️ on anything that overlaps the time and
   length chosen, and ‹ › to look at the days either side (tapping a day picks it). It updates as the date, time or
   length change. */
function vdItems(d) {
  let L = [];
  try {
    L = planEntries();
  } catch (e) {
    L = (S.plan || []).concat(S.planPrivate || []);
  }
  return L.filter((p) => p && p.title && onDay(p, d)).sort(
    (a, b) =>
      (a.time || "99").localeCompare(b.time || "99") ||
      String(a.title).localeCompare(String(b.title)),
  );
}
function vdHtml(d, t, len) {
  const L = vdItems(d);
  const a = t ? toMin(t) : null,
    b = a != null ? a + (+len || 60) : null;
  const clash = (p) =>
    a != null && p.time && toMin(p.time) < b && toMin(p.endTime || toHM(toMin(p.time) + 60)) > a;
  const n = L.filter(clash).length;
  return `<div class="vd-head"><button type="button" class="iconbtn vd-day" data-d="${esc(iso(addDays(parse(d), -1)))}" aria-label="Day before">‹</button><b>📅 Your diary ${esc(shortDay(d))}</b><button type="button" class="iconbtn vd-day" data-d="${esc(iso(addDays(parse(d), 1)))}" aria-label="Day after">›</button></div>
    ${n ? `<div class="vd-warn">⚠️ ${n} thing${n === 1 ? "" : "s"} at the same time</div>` : L.length ? '<div class="vd-ok">✓ Nothing at that time</div>' : ""}
    ${
      L.length
        ? L.map(
            (p) =>
              `<div class="vd-row${clash(p) ? " vd-clash" : ""}"><span class="vd-t">${p.time ? esc(p.time) + (p.endTime ? "–" + esc(p.endTime) : "") : "All day"}</span><span>${esc(p.title)}${Array.isArray(p.people) && p.people.length ? `<span class="who"> · ${esc(p.people.map(nameOf).join(", "))}</span>` : ""}</span></div>`,
          ).join("")
        : '<div class="who">Nothing in the diary that day.</div>'
    }`;
}
/* box: where the list goes; ids of the date, time and length inputs */
function vdWire(box, dId, tId, lenId) {
  const draw = () => {
    const d = $(dId).value;
    if (!d) {
      box.innerHTML = "";
      return;
    }
    box.innerHTML = vdHtml(d, $(tId) ? $(tId).value : "", $(lenId) ? $(lenId).value : 60);
    box.querySelectorAll(".vd-day").forEach(
      (x) =>
        (x.onclick = () => {
          $(dId).value = x.dataset.d;
          draw();
        }),
    );
  };
  [dId, tId, lenId].forEach((id) => {
    if ($(id)) $(id).addEventListener("change", draw);
  });
  draw();
}
