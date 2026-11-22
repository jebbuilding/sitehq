/* ================= PLAN REMINDERS: ⏰ a reminder on any planner entry – an hour before, the day before – and onto the phone's own calendar ================= */
import { visitToPhone } from "../clients/quick-enquiry.js";
export { prmName, prmPhone, prmSelect, prmStart };
/* James (Nov 2026): "checking that the app Reminder 1 hour before for seeing jobs or other things like MOTs". Every
   planner entry can have a reminder (remind = minutes before: 15, 30, 60, 120 or 1440 for the day before); an entry
   with no start time counts from 8am that day. While the app is open it pops up (visitWatch in
   clients/quick-enquiry.js) for James on everything, and for a trade on the entries they're named on. Because a web
   page can't wake a phone when it's shut, 📲 Add to my phone calendar puts the entry in the phone's own calendar
   with the same alarm, which goes off whether the app is open or not. */
const PRM_OPTS = [
  [0, "No reminder"],
  [15, "15 minutes before"],
  [30, "30 minutes before"],
  [60, "1 hour before"],
  [120, "2 hours before"],
  [1440, "The day before"],
];
const prmName = (m) =>
  (PRM_OPTS.find((x) => x[0] === +m) || [0, +m ? m + " minutes before" : ""])[1];
function prmSelect(id, val) {
  const v = +val || 0;
  return `<label for="${id}">⏰ Reminder<select id="${id}">${PRM_OPTS.map(([m, l]) => `<option value="${m}" ${m === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
}
/* when the entry starts: its time, or 8am */
function prmStart(p) {
  const t = /^\d{2}:\d{2}$/.test(p.time || "") ? p.time : "08:00";
  return new Date(p.from + "T" + t).getTime();
}
function prmPhone(p) {
  visitToPhone({
    uid: p.id,
    date: p.from,
    time: p.time || "08:00",
    end: p.endTime || "",
    title: p.title,
    location: p.site || "",
    notes: p.notes || "",
    remind: +p.remind || 60,
    fname: p.title,
  });
}
