/* ================= CHECK REASONS: late in, early out, and moving to another job during the day ================= */
import { pickField, pickVal, wirePicks } from "../core/fields.js";
import { $, esc, iso, nowHM, toMin, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { submitJob } from "../files/outbox.js";
import { siteLabel } from "../sites/job-details.js";
import { nstGroups } from "./non-site-time.js";
import { checkInAt, checkOut } from "./time.js";
export {
  crsArrived,
  crsEarlyAsk,
  crsIsEarly,
  crsIsLate,
  crsLateAsk,
  crsLine,
  crsMove,
  crsTravelHtml,
};
/* James (Nov 2026): "if they sign in after [their set start] they have to give a reason like late to work or starting
   later today. that is then when there hours start for the wages. But they might start the day at one job and go to
   another so they need to be able to stop the sign in for that job and then … a drop down that then has traveling to
   new job, start in another job and allow them to choose which job to then sign into. if they finish early and before
   there set hours they need to give a reason behind that like finishing early for the day."
   Checking in after the usual start asks why (paid from when they checked in). 🚚 Stop here / move to another job
   ends this job's time now and starts the next job: travelling there (the time counts on the next job, and they tap
   ✅ I've arrived when they get there) or starting there now. Checking out before the usual finish asks why (paid to
   when they checked out). The reasons, the move and the arrival time show on their timesheet. */
const CRS_LATE = ["Late to work", "Starting later today (agreed)", "Appointment first", "Other"];
const CRS_EARLY = ["Finishing early for the day", "Not feeling well", "Appointment", "Other"];
const crsLateMin = 5;
function crsIsLate(D) {
  const today = iso(new Date());
  if (S.mine.entries.some((e) => e.date === today && e.type === "hours")) return false;
  return toMin(nowHM()) > toMin(D.s) + crsLateMin;
}
const crsIsEarly = (D) => toMin(nowHM()) < toMin(D.e) - crsLateMin;
function crsSeg(id, opts) {
  return `<div class="seg crs-seg" id="${id}" role="group">${opts.map((o, i) => `<button type="button" data-v="${esc(o)}" aria-pressed="${i === 0}">${esc(o)}</button>`).join("")}</div>`;
}
function crsWireSeg(id) {
  $(id)
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () =>
          $(id)
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)))),
    );
}
const crsSegVal = (id) => {
  const b = $(id).querySelector('[aria-pressed="true"]');
  return b ? b.dataset.v : "";
};
function crsWhy(id, noteId) {
  const v = crsSegVal(id),
    n = $(noteId).value.trim();
  return v === "Other" ? n : n ? v + " – " + n : v;
}
/* checking in after the usual start: why? */
function crsLateAsk(site, D, go) {
  openSheet(
    `<h3 id="sheettitle">⏰ Checking in after ${esc(D.s)}</h3>
    <div class="who">${esc(siteLabel(site))} · it's ${esc(nowHM())}. Your hours start from now.</div>
    <div class="flabel">Why?</div>${crsSeg("crs-late", CRS_LATE)}
    <label for="crs-ln">Anything to add (optional)<input id="crs-ln" maxlength="200" placeholder="e.g. Dentist, told James on Monday"></label>
    ${formFoot(false, "Check in now")}`,
    () => {
      const why = crsWhy("crs-late", "crs-ln");
      if (!why) return showErr("Say why you're starting late.");
      closeForm();
      go({ lateWhy: why });
    },
    null,
  );
  crsWireSeg("crs-late");
}
/* checking out before the usual finish: why? (or moving to another job) */
function crsEarlyAsk(e, D, go) {
  openSheet(
    `<h3 id="sheettitle">Checking out before ${esc(D.e)}</h3>
    <div class="who">${esc(siteLabel(e.job))} · it's ${esc(nowHM())}. You're paid to now.</div>
    <button type="button" class="btn crs-tomove">🚚 I'm going to another job instead</button>
    <div class="flabel">Why are you finishing early?</div>${crsSeg("crs-early", CRS_EARLY)}
    <label for="crs-en">Anything to add (optional)<input id="crs-en" maxlength="200"></label>
    ${formFoot(false, "Check out now")}`,
    () => {
      const why = crsWhy("crs-early", "crs-en");
      if (!why) return showErr("Say why you're finishing early.");
      closeForm();
      go({ earlyWhy: why });
    },
    null,
  );
  crsWireSeg("crs-early");
  $("sheet").querySelector(".crs-tomove").onclick = () => {
    closeForm();
    crsMove(e);
  };
}
/* stop this job and go to (or start at) another */
function crsMove(e) {
  openSheet(
    `<h3 id="sheettitle">🚚 Stop here and move job</h3>
    <div class="who">Your time on <b>${esc(siteLabel(e.job))}</b> stops now (${esc(nowHM())}).</div>
    <div class="flabel">What next?</div>${crsSeg("crs-next", ["🚚 Travelling to another job", "🏗 Starting at another job now"])}
    ${pickField(
      "crs-site",
      "Which job",
      siteNames().filter((s) => s !== e.job),
      "",
      "e.g. 12 High Street",
      true,
      nstGroups(),
    )}
    <div class="who">Travelling: your time counts on the next job from now. Tap <b>✅ I've arrived</b> when you get there.</div>
    ${formFoot(false, "Stop here and move")}`,
    async () => {
      const site = pickVal("crs-site");
      if (!site) return showErr("Choose the job you're going to.");
      const travel = /Travelling/.test(crsSegVal("crs-next"));
      closeForm();
      await checkOut(e, { moveTo: site, moveWhy: travel ? "travel" : "start" });
      await checkInAt(
        site,
        Object.assign({ fromJob: e.job, moved: true }, travel ? { travel: true } : {}),
      );
    },
    null,
  );
  crsWireSeg("crs-next");
  wirePicks($("sheet"));
}
/* the travelling bar on the check-in card */
function crsTravelHtml(open) {
  if (!open.travel) return "";
  return open.arrivedAt
    ? `<div class="sub crs-trv">🚚 Travelled from ${esc(siteLabel(open.fromJob))} · arrived ${esc(open.arrivedAt)}</div>`
    : `<div class="crs-trv"><b>🚚 Travelling from ${esc(siteLabel(open.fromJob))}</b><button type="button" class="btn primary crs-arr" data-id="${esc(open.id)}">✅ I've arrived</button></div>`;
}
async function crsArrived(e) {
  const data = Object.assign({}, e, { arrivedAt: nowHM(), updated: Date.now() });
  delete data.id;
  S.mine.entries = S.mine.entries.map((x) =>
    x.id === e.id ? Object.assign({ id: e.id }, data) : x,
  );
  render();
  try {
    await submitJob({ coll: "entries", docId: e.id, data });
    toast("Arrived at " + data.arrivedAt);
  } catch (err) {
    toast("Couldn't save. Try again.");
  }
}
/* the reasons and moves, for the timesheet lines (plain text; escape when putting in HTML) */
function crsLine(e) {
  const p = [];
  if (e.lateWhy) p.push("Late in: " + e.lateWhy);
  if (e.travel)
    p.push(
      "Travelled from " + siteLabel(e.fromJob) + (e.arrivedAt ? ", arrived " + e.arrivedAt : ""),
    );
  else if (e.moved && e.fromJob) p.push("Came from " + siteLabel(e.fromJob));
  if (e.moveTo)
    p.push((e.moveWhy === "travel" ? "Left to travel to " : "Moved to ") + siteLabel(e.moveTo));
  if (e.earlyWhy) p.push("Left early: " + e.earlyWhy);
  return p.join(" · ");
}
