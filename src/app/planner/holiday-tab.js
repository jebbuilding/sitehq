/* ================= HOLIDAY TAB: the planner's 🌴 Holidays tab – requests to answer, holidays booked, taken, and days left ================= */
import { $, esc, iso, parse, shortDay } from "../core/helpers.js";
import { S } from "../core/state.js";
import { nameOf } from "../owner/owner.js";
import { openLeave } from "./board.js";
import { hpOpen } from "./holiday-person.js";
import { holSettings, holTeamHtml, holTeamWire, holYear } from "./holidays.js";
import { workDays } from "./time-off.js";
import { openPlanDetail } from "./views.js";
export { htHtml, htWire };
/* James (Nov 2026): "in planner allow tabs for holidays booked". The owner's planner gets a 🌴 Holidays tab beside
   Who's where / Board / Day / Jobs / Month: the time-off requests waiting for an answer (with what each person has
   left), every holiday or time off booked from today on, grouped by month (tap one to see or change it), the ones
   already taken this holiday year (folded away), and everyone's allowance figures. Booked time off is a plan entry
   of type "holiday" (approved requests become plan/leave-<id>; "Book time off" adds one straight away). */
const htOff = (entries) =>
  entries
    .filter((p) => p.type === "holiday" && !p.pending)
    .sort((a, b) => a.from.localeCompare(b.from));
function htRow(p, today) {
  const to = p.to || p.from;
  const days = workDays(p.from, to, p.half);
  const now = p.from <= today && to >= today;
  const who = (p.people || []).map((id) => (id === S.me ? "You" : nameOf(id))).join(", ");
  return `<button type="button" class="ht-row${now ? " ht-now" : ""}" data-p="${esc(p.id)}"><span class="ht-when"><b>${esc(shortDay(p.from))}${to !== p.from ? " – " + esc(shortDay(to)) : ""}</b><small>${days} working day${days === 1 ? "" : "s"}</small></span><span class="ht-who"><b>${esc(who || "Nobody chosen")}</b><small>${esc(p.title || "Holiday")}${p.vis === "people" ? " · only them and you see it" : p.vis === "me" ? " · only you see it" : ""}</small></span>${now ? '<span class="tag ok">Off now</span>' : ""}</button>`;
}
function htHtml(entries) {
  const today = iso(new Date());
  const all = htOff(entries);
  const ahead = all.filter((p) => (p.to || p.from) >= today);
  const yr = holYear(today);
  const past = all.filter((p) => (p.to || p.from) < today && (p.to || p.from) >= yr.from).reverse();
  const months = [];
  ahead.forEach((p) => {
    const k = p.from < today ? today.slice(0, 7) : p.from.slice(0, 7);
    let m = months.find((x) => x.k === k);
    if (!m) months.push((m = { k, list: [] }));
    m.list.push(p);
  });
  const mName = (k) =>
    parse(k + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  return `<div class="ht-page">
    <div class="ht-acts"><button type="button" class="btn primary" id="ht-book">🌴 Book time off for someone</button><button type="button" class="btn" id="ht-set">⚙ Holiday year and allowances</button></div>
    ${/* everyone's figures open here: tap a person to change their holidays */ holTeamHtml().replace('<details class="card hol-card" data-id="__holo">', '<details class="card hol-card" open data-id="__holo">')}
    <section class="card"><div class="cardbody"><b>🗓 Holidays booked</b> <span class="who">${ahead.length ? ahead.length + " from today on" : ""}</span>
      ${
        months.length
          ? months
              .map(
                (m) =>
                  `<div class="flabel">${esc(mName(m.k))}</div>${m.list.map((p) => htRow(p, today)).join("")}`,
              )
              .join("")
          : '<div class="nothing">No holidays booked from today on.</div>'
      }
    </div></section>
    <details class="card ht-past" data-id="__htpast"${S.open.has("__htpast") ? " open" : ""}><summary><div class="nm">Taken this holiday year<small>${past.length} since ${esc(shortDay(yr.from))}</small></div></summary><div class="cardbody">${past.map((p) => htRow(p, today)).join("") || '<div class="nothing">None yet.</div>'}</div></details>
  </div>`;
}
function htWire(entries) {
  holTeamWire();
  $("ht-book").onclick = () => openLeave(true);
  $("ht-set").onclick = holSettings;
  const past = document.querySelector("#main .ht-past");
  if (past)
    past.ontoggle = () => {
      if (past.open) S.open.add("__htpast");
      else S.open.delete("__htpast");
    };
  document.querySelectorAll("#main .ht-row").forEach(
    (b) =>
      (b.onclick = () => {
        const p = entries.find((x) => x.id === b.dataset.p);
        if (!p) return;
        /* a booked holiday opens that person's holiday page, where it can be changed */
        const w = (p.people || [])[0];
        if (p.leaveId && w) hpOpen(w, p.from);
        else openPlanDetail(p);
      }),
  );
}
