/* ================= HOLIDAYS: each employee's allowance for the year, what's taken, booked, waiting and left ================= */
import { $, addDays, esc, iso, parse, shortDay } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { EMP_TYPES } from "../people/employment-types.js";
import { leaveCard, pbPending, wireLeave } from "./board.js";
import { leaveOf } from "./time-off.js";
import { ukDate } from "../safety/rams-maker.js";
import { empTypeOf } from "../sites/job-details.js";
export { holCardHtml, holOwnerHtml, holSettings, holTeamHtml, holTeamWire, holWire };
/* Employees see a 🌴 My holidays card on their planner: how many days they get this holiday year, how many they've
   taken, how many are booked (approved, still to come), how many are waiting for an answer, and how many are left –
   with the bank holidays, and their holidays listed. James sets the holiday year (when it starts), the usual
   allowance (28 days for 5 days a week, the legal minimum, bank holidays included) and anyone who gets a different
   number, in a 🌴 Holidays card on his planner, which shows everyone's figures. Days are working days (Mon–Fri) and
   a half day counts as a half; bank holidays aren't counted twice. Kept in settings/app.holidays: { start ("MM-DD"),
   days, bankIn (bank holidays come out of the allowance), people { uid: days } }. */
const HOL_BANK = [
  "2025-01-01",
  "2025-04-18",
  "2025-04-21",
  "2025-05-05",
  "2025-05-26",
  "2025-08-25",
  "2025-12-25",
  "2025-12-26",
  "2026-01-01",
  "2026-04-03",
  "2026-04-06",
  "2026-05-04",
  "2026-05-25",
  "2026-08-31",
  "2026-12-25",
  "2026-12-28",
  "2027-01-01",
  "2027-03-26",
  "2027-03-29",
  "2027-05-03",
  "2027-05-31",
  "2027-08-30",
  "2027-12-27",
  "2027-12-28",
  "2028-01-03",
  "2028-04-14",
  "2028-04-17",
  "2028-05-01",
  "2028-05-29",
  "2028-08-28",
  "2028-12-25",
  "2028-12-26",
];
const holCfg = () =>
  Object.assign(
    { start: "01-01", days: 28, bankIn: true, people: {} },
    (S.settings || {}).holidays || {},
  );
/* the holiday year that a date falls in */
function holYear(d) {
  const c = holCfg();
  const y = +d.slice(0, 4);
  let from = `${y}-${c.start}`;
  if (d < from) from = `${y - 1}-${c.start}`;
  const to = iso(addDays(parse(`${+from.slice(0, 4) + 1}-${c.start}`), -1));
  return { from, to };
}
const holAllow = (uid) => {
  const c = holCfg();
  const v = (c.people || {})[uid];
  /* employees get the usual allowance; subcontractors and other firms none, unless James gives them one */
  const t = uid === S.me && !S.owner ? ((S.myProfile || {}).details || {}).empType : empTypeOf(uid);
  return v != null && v !== "" ? +v : t === "employed" ? +c.days : 0;
};
/* working days in a holiday, leaving out bank holidays */
function holDays(l, from, to) {
  const a = l.from > from ? l.from : from,
    b = (l.to || l.from) < to ? l.to || l.from : to;
  if (a > b) return 0;
  let n = 0;
  for (let d = parse(a); iso(d) <= b; d = addDays(d, 1)) {
    const w = d.getDay();
    if (w && w !== 6 && !HOL_BANK.includes(iso(d))) n++;
  }
  return l.half && n ? n - 0.5 : n;
}
/* someone's figures for the holiday year round a date */
function holSum(uid, list, at) {
  const c = holCfg();
  const Y = holYear(at || iso(new Date()));
  const today = iso(new Date());
  const allow = holAllow(uid);
  const bank = HOL_BANK.filter((d) => d >= Y.from && d <= Y.to && new Date(d).getDay() % 6 !== 0);
  const hol = leaveOf(list).filter(
    (l) =>
      (l.leaveType || "holiday") === "holiday" &&
      l.status !== "declined" &&
      l.status !== "cancelled" &&
      (l.to || l.from) >= Y.from &&
      l.from <= Y.to,
  );
  let taken = 0,
    booked = 0,
    waiting = 0;
  hol.forEach((l) => {
    const n = holDays(l, Y.from, Y.to);
    if (l.status !== "approved") waiting += n;
    else {
      taken += holDays(l, Y.from, today < Y.to ? today : Y.to);
      booked += n - holDays(l, Y.from, today < Y.to ? today : Y.to);
    }
  });
  const bankUse = c.bankIn ? bank.length : 0;
  const left = allow - bankUse - taken - booked;
  return { Y, allow, bank, bankUse, taken, booked, waiting, left, hol };
}
const holN = (n) => (Math.round(n * 2) / 2).toString().replace(".5", "½");
function holCardHtml() {
  if (!holAllow(S.me)) return "";
  const s = holSum(S.me, S.mine.signoffs);
  const today = iso(new Date());
  return `<details class="card hol-card"${S.open.has("__hol") ? " open" : ""} data-id="__hol"><summary><div class="nm">🌴 My holidays<small>${holN(s.left)} day${s.left === 1 ? "" : "s"} left this holiday year</small></div></summary><div class="cardbody">
    <div class="hol-boxes"><div><b>${holN(s.allow)}</b><span>a year</span></div><div><b>${holN(s.taken)}</b><span>taken</span></div><div><b>${holN(s.booked)}</b><span>booked</span></div>${s.waiting ? `<div><b>${holN(s.waiting)}</b><span>waiting</span></div>` : ""}<div class="hol-left"><b>${holN(s.left)}</b><span>left</span></div></div>
    <div class="who">Holiday year ${esc(ukDate(s.Y.from))} to ${esc(ukDate(s.Y.to))}${s.bankUse ? ` · ${s.bankUse} bank holidays come out of the ${holN(s.allow)}` : ""}.</div>
    ${
      s.hol.length
        ? `<div class="flabel">Your holidays</div>${s.hol
            .slice()
            .sort((a, b) => a.from.localeCompare(b.from))
            .map(
              (l) =>
                `<div class="drow"><span>${esc(shortDay(l.from))}${l.to && l.to !== l.from ? " – " + esc(shortDay(l.to)) : ""}${l.half ? " (half day)" : ""}</span><span>${holN(holDays(l, s.Y.from, s.Y.to))} day${holDays(l, s.Y.from, s.Y.to) === 1 ? "" : "s"} · ${l.status === "approved" ? ((l.to || l.from) < today ? "taken" : "booked") : "waiting for an answer"}</span></div>`,
            )
            .join("")}`
        : ""
    }
    ${s.bank.length ? `<div class="flabel">Bank holidays</div><div class="who">${s.bank.map((d) => esc(shortDay(d))).join(" · ")}</div>` : ""}
  </div></details>`;
}
/* James's view: everyone's figures, and the settings */
function holOwnerHtml() {
  const ids = teamIds().filter((id) => holAllow(id) > 0);
  const c = holCfg();
  return `<details class="card hol-card"${S.open.has("__holo") ? " open" : ""} data-id="__holo"><summary><div class="nm">🌴 Holidays<small>${ids.length} people with a holiday allowance</small></div></summary><div class="cardbody">
    ${
      ids
        .map((id) => {
          const s = holSum(id, S.data.signoffs[id]);
          return `<div class="drow hol-row"><span><b>${esc(nameOf(id))}</b> <span class="who">${holN(s.allow)} a year</span></span><span class="who">${holN(s.taken)} taken · ${holN(s.booked)} booked${s.waiting ? ` · ${holN(s.waiting)} waiting` : ""} · <b class="${s.left < 0 ? "hol-neg" : ""}">${holN(s.left)} left</b></span></div>`;
        })
        .join("") ||
      `<div class="nothing">No employees yet. Subcontractors don't get holiday pay, so they aren't listed unless you give them an allowance.</div>`
    }
    <div class="actions"><button type="button" class="btn" id="hol-set">⚙ Holiday year and allowances</button></div>
    <div class="who">Holiday year starts ${esc(parse("2026-" + c.start).toLocaleDateString("en-GB", { day: "numeric", month: "long" }))} · ${holN(c.days)} days for a full-time employee${c.bankIn ? ", bank holidays included" : " plus bank holidays"}.</div>
  </div></details>`;
}
function holWire() {
  document.querySelectorAll(".hol-card").forEach(
    (d) =>
      (d.ontoggle = () => {
        if (d.open) S.open.add(d.dataset.id);
        else S.open.delete(d.dataset.id);
      }),
  );
  if ($("hol-set")) $("hol-set").onclick = holSettings;
}
function holSettings() {
  const c = holCfg();
  const ids = teamIds();
  openSheet(
    `<h3 id="sheettitle">🌴 Holiday year and allowances</h3>
    <div class="grid2"><label for="hol-start">Holiday year starts<select id="hol-start">${["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((m) => `<option value="${m}-01"${c.start === m + "-01" ? " selected" : ""}>1 ${parse("2026-" + m + "-01").toLocaleDateString("en-GB", { month: "long" })}</option>`).join("")}</select></label><label for="hol-days">Days a year (full time)<input id="hol-days" type="number" inputmode="decimal" min="0" max="60" step="0.5" value="${esc(c.days)}"></label></div>
    <label class="inl"><input type="checkbox" id="hol-bank"${c.bankIn ? " checked" : ""}> Bank holidays come out of the allowance (28 days including bank holidays is the legal minimum for 5 days a week)</label>
    <div class="flabel">Anyone who gets a different number (part time, longer service…)</div>
    ${ids.map((id) => `<label class="hol-p">${esc(nameOf(id))} <span class="who">${esc(EMP_TYPES[empTypeOf(id)] || "")}</span><input class="hol-pv" data-w="${esc(id)}" type="number" inputmode="decimal" min="0" max="60" step="0.5" placeholder="${empTypeOf(id) === "employed" ? holN(c.days) : "0"}" value="${esc((c.people || {})[id] != null ? c.people[id] : "")}"></label>`).join("")}
    ${formFoot(false, "Save")}`,
    async () => {
      const people = {};
      document.querySelectorAll(".hol-pv").forEach((x) => {
        if (x.value !== "") people[x.dataset.w] = +x.value;
      });
      const holidays = {
        start: $("hol-start").value,
        days: +$("hol-days").value || 0,
        bankIn: $("hol-bank").checked,
        people,
      };
      try {
        await S.db.doc("settings/app").update({ holidays });
        S.settings = Object.assign({}, S.settings, { holidays });
        closeForm();
        render();
      } catch (e) {
        showErr("Couldn't save");
      }
    },
    "hol-days",
  );
}
/* the team page: holiday requests waiting for an answer (with what each person has left), then everyone's figures */
function holTeamHtml() {
  const pending = pbPending();
  return `<section class="card hol-team"><div class="cardbody"><b>🌴 Holiday requests${pending.length ? ` <span class="badge">${pending.length}</span>` : ""}</b>
    ${
      pending.length
        ? pending
            .map((l) => {
              const s = holAllow(l.who) ? holSum(l.who, S.data.signoffs[l.who], l.from) : null;
              return `${leaveCard(l, true)}${s ? `<div class="who hol-after">${esc(nameOf(l.who))} has ${holN(s.left)} day${s.left === 1 ? "" : "s"} left in that holiday year before this (${holN(holDays(l, s.Y.from, s.Y.to))} day${holDays(l, s.Y.from, s.Y.to) === 1 ? "" : "s"})${s.left - holDays(l, s.Y.from, s.Y.to) < 0 ? ' – <b class="hol-neg">this would take them over</b>' : ""}.</div>` : ""}`;
            })
            .join("")
        : `<div class="nothing">No holiday requests waiting.</div>`
    }</div></section>${holOwnerHtml()}`;
}
function holTeamWire() {
  wireLeave(true, $("main"));
  holWire();
}
