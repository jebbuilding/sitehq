/* ================= CHASE HOURS: missing timesheets found the next morning, reminders in one tap, and a nudge on the trade's phone ================= */
import { addDays, esc, iso, nowHM, parse, shortDay, toMin, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { onDay } from "../planner/time-off.js";
import { siteLabel } from "../sites/job-details.js";
import { pcOff } from "./plan-check.js";
import { openEntry } from "./time.js";
import { dayFor } from "./working-day.js";
export { chsCardHtml, chsTradeHtml, chsTradeWire, chsWire };
/* James (Nov 2026): "chase missing hours automatically" – he found out about missing timesheets two weeks late.
   James: Today and Timesheets show ⏰ No hours for the last working day – everyone who normally puts hours in (any in
   the last four weeks) or was booked on the planner that day, isn't off, and has no timesheet for it – with
   📨 Remind them all (or one at a time). A reminder pops up on their phone (people/reminders.js) and opens the
   timesheet on that day; each is sent once.
   Trades: their Time page asks for the last working day's hours if they're missing, and – once their usual finish
   time has passed – today's, if they haven't checked in or put a day in. (Reminders while the app is shut need a
   server: on Jasper's list.) */
const chsEnts = (id) => (id === S.me ? S.mine.entries : S.data.entries[id]) || [];
const chsHasDay = (L, d) => L.some((e) => e.type === "hours" && e.date === d && !e.forName);
/* the last weekday before today */
function chsLastDay() {
  let d = addDays(new Date(), -1);
  while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, -1);
  return iso(d);
}
function chsList(d) {
  d = d || chsLastDay();
  const since = iso(addDays(parse(d), -28));
  const booked = {};
  (S.plan || [])
    .concat(S.planPrivate || [])
    .filter((p) => p.type === "work" && p.site && onDay(p, d) && Array.isArray(p.people))
    .forEach((p) => p.people.forEach((id) => (booked[id] = booked[id] || p.site)));
  return teamIds()
    .filter((id) => !String(id).startsWith("off:") && !(S.team[id] || {}).left)
    .filter((id) => {
      const L = chsEnts(id);
      const regular = L.some((e) => e.type === "hours" && e.date >= since && e.date < d);
      return (regular || booked[id]) && !pcOff(id, d) && !chsHasDay(L, d);
    })
    .map((id) => ({
      id,
      d,
      site: booked[id] || "",
      sent: ((S.data.signoffs || {})[id] || []).some(
        (x) => x.type === "prompt" && x.form === "timesheet" && x.ref === d && x.status === "open",
      ),
    }));
}
function chsCardHtml() {
  if (!S.owner || S.preview) return "";
  const L = chsList();
  if (!L.length) return "";
  const d = L[0].d;
  const todo = L.filter((r) => !r.sent).length;
  return `<div class="card chs-card"><div class="cardbody" style="border:0">
    <div class="chs-h">⏰ No hours for ${esc(shortDay(d))} (${L.length})</div>
    ${L.map(
      (r) =>
        `<div class="chs-row"><span><b>${esc(nameOf(r.id))}</b>${r.site ? `<span class="who">Booked on ${esc(siteLabel(r.site))}</span>` : ""}</span>${r.sent ? '<span class="tag ok">📨 Reminded</span>' : `<button type="button" class="pillbtn chs-one" data-w="${esc(r.id)}">📨 Remind</button>`}</div>`,
    ).join("")}
    ${todo ? `<div class="actions"><button type="button" class="btn primary chs-all" data-d="${esc(d)}">📨 Remind ${todo === 1 ? "them" : "them all"} (${todo})</button></div>` : '<div class="who">Reminded. Their days show here once they\'re in.</div>'}
    <div class="who">A reminder pops up on their phone the next time they open the app and takes them to that day. If they say they did put it in, it's probably still on their phone: see 📵 Not coming through on Timesheets.</div>
  </div></div>`;
}
async function chsSend(ids, d) {
  let n = 0;
  for (const id of ids) {
    try {
      await S.db.doc("sheets/" + id + "/signoffs/pr-" + newId()).set({
        type: "prompt",
        form: "timesheet",
        ref: d,
        refLabel: shortDay(d),
        note: `No hours came through for ${shortDay(d)}. Please put them in. If you already did, open the app with signal so it can send them.`,
        status: "open",
        created: Date.now(),
      });
      n++;
    } catch (e) {}
  }
  toast(
    n
      ? "Reminder sent to " + ids.slice(0, n).map(nameOf).join(", ")
      : "Couldn't send. Check your connection.",
  );
  render();
}
function chsWire() {
  document.querySelectorAll("#main .chs-one").forEach(
    (b) =>
      (b.onclick = () => {
        b.disabled = true;
        chsSend([b.dataset.w], chsLastDay());
      }),
  );
  document.querySelectorAll("#main .chs-all").forEach(
    (b) =>
      (b.onclick = () => {
        b.disabled = true;
        chsSend(
          chsList(b.dataset.d)
            .filter((r) => !r.sent)
            .map((r) => r.id),
          b.dataset.d,
        );
      }),
  );
}
/* the trade's own nudge, at the top of their Time page */
function chsTradeHtml() {
  if (S.owner && !S.preview) return "";
  const L = S.mine.entries || [];
  const out = [];
  const last = chsLastDay();
  const since = iso(addDays(parse(last), -28));
  if (
    L.some((e) => e.type === "hours" && e.date >= since) &&
    !chsHasDay(L, last) &&
    !pcOff(S.me, last)
  )
    out.push([last, `No hours from you for <b>${esc(shortDay(last))}</b>.`]);
  const today = iso(new Date());
  const wd = new Date().getDay();
  if (
    wd !== 0 &&
    wd !== 6 &&
    toMin(nowHM()) >= toMin(dayFor(S.me).e) &&
    !chsHasDay(L, today) &&
    !pcOff(S.me, today)
  )
    out.push([today, "Finished for today? Put today's hours in before you forget."]);
  if (!out.length) return "";
  return out
    .map(
      ([d, t]) =>
        `<div class="notice warn chs-nudge">⏰ ${t} <button type="button" class="btn primary chs-put" data-d="${esc(d)}">+ Put ${d === today ? "today's" : "them"} in</button></div>`,
    )
    .join("");
}
function chsTradeWire() {
  document.querySelectorAll("#main .chs-put").forEach(
    (b) =>
      (b.onclick = () => {
        S.entryDatePreset = b.dataset.d;
        openEntry("hours");
      }),
  );
}
