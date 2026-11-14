/* ================= OVERTIME: trades ask for an early start or late finish to be paid; James approves it ================= */
import { bossFirst } from "../core/company-names.js";
import { $, calcHours, esc, lunchBreak, toMin, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { submitJob } from "../files/outbox.js";
import { dayFor } from "./working-day.js";
export { otmAsk, otmButtons, otmLine, otmOffer, otmWire };
/* Checking in before the start of someone's usual day, or out after its finish, still pays the usual day – unless
   they ask for the extra as overtime. At check-out, if they arrived at least 10 minutes early or left at least 10
   minutes late, they're asked: tick early and/or late, say why, and it goes to James. On the owner's timesheet the
   entry shows "Overtime asked" with Approve / Decline: approving moves the paid start back to when they arrived
   (and/or the finish to when they left), works the lunch and hours out again, and the extra is shown as overtime.
   The entry keeps ot: { early, late, lunch (minutes), from, to (the times they say), why (they must give one, so the
   change is logged), status "asked"|"ok"|"no", at, okAt }. They can also ask themselves (⏱ Different hours today?):
   started early, finished late, worked through lunch (James, Nov 2026). Approving pays it and keeps what was there. */
const OTM_MIN = 10;
/* minutes outside the paid day, from the times they were actually on site */
function otmExtra(e) {
  const early =
    e.actualIn && e.start && toMin(e.actualIn) < toMin(e.start)
      ? toMin(e.start) - toMin(e.actualIn)
      : 0;
  const late =
    e.actualOut && e.finish && toMin(e.actualOut) > toMin(e.finish)
      ? toMin(e.actualOut) - toMin(e.finish)
      : 0;
  return { early, late };
}
const otmLen = (m) =>
  m >= 60 ? Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : "") : m + " min";
/* the line on a timesheet entry */
function otmLine(e) {
  const o = e && e.ot;
  if (!o) return "";
  const parts = [
    o.early ? otmLen(o.early) + " early" : "",
    o.late ? otmLen(o.late) + " late" : "",
    o.lunch ? "worked through lunch" : "",
  ]
    .filter(Boolean)
    .join(" + ");
  const st =
    o.status === "ok"
      ? '<span class="tag ok">Overtime approved</span>'
      : o.status === "no"
        ? '<span class="tag">Overtime not approved</span>'
        : '<span class="tag warn">Overtime asked</span>';
  return `<div class="otm-line">${st} ${esc(parts)}${o.why ? ` – ${esc(o.why)}` : ""}</div>`;
}
/* after checking out: ask about the extra time, if there was any */
function otmOffer(e) {
  const x = otmExtra(e);
  if (x.early < OTM_MIN && x.late < OTM_MIN) return;
  otmAsk(e, x);
}
function otmAsk(e, x) {
  x = x || otmExtra(e);
  const D = dayFor(S.me);
  const fin0 = e.finish || D.e;
  const lunchMin = +e.breakMin || lunchBreak(e.start, fin0, D) || 0;
  const done = !e.open;
  openSheet(
    `<h3 id="sheettitle">⏱ Different hours today?</h3>
    <div class="who">You're paid ${esc(e.start)}–${esc(fin0)}${lunchMin ? " less " + lunchMin + " min lunch" : ""}. Tick what was different and say why – ${esc(bossFirst())} approves it.</div>
    <label class="tick"><input type="checkbox" id="otm-e"${x.early >= OTM_MIN ? " checked" : ""}> <span>Started early, at <input type="time" id="otm-et" value="${esc(e.actualIn || e.start)}" style="width:auto;display:inline-block">${x.early >= OTM_MIN ? ` (${otmLen(x.early)} before ${esc(e.start)})` : ""}</span></label>
    <label class="tick"><input type="checkbox" id="otm-l"${x.late >= OTM_MIN ? " checked" : ""}> <span>${done ? "Finished" : "Working"} late, until <input type="time" id="otm-lt" value="${esc(e.actualOut || fin0)}" style="width:auto;display:inline-block">${x.late >= OTM_MIN ? ` (${otmLen(x.late)} after ${esc(fin0)})` : ""}</span></label>
    ${lunchMin ? `<label class="tick"><input type="checkbox" id="otm-lu"> <span>Worked through lunch (${lunchMin} min)</span></label>` : ""}
    <label for="otm-why">Why? (you must say, so it can be logged)<input id="otm-why" maxlength="160" placeholder="e.g. concrete pour, getting the roof covered before rain"></label>
    ${formFoot(false, `Ask ${bossFirst()} to pay it`)}`,
    async () => {
      const from = $("otm-et").value,
        to = $("otm-lt").value;
      const early =
        $("otm-e").checked && from && toMin(from) < toMin(e.start)
          ? toMin(e.start) - toMin(from)
          : 0;
      const late =
        $("otm-l").checked && to && toMin(to) > toMin(fin0) ? toMin(to) - toMin(fin0) : 0;
      const lunch = $("otm-lu") && $("otm-lu").checked ? lunchMin : 0;
      if (!early && !late && !lunch)
        return showErr("Tick what was different (with times outside your usual day), or Cancel.");
      const why = $("otm-why").value.trim();
      if (!why)
        return showErr(
          `Say what it was for – it has to be logged before ${bossFirst()} can pay it.`,
        );
      const data = Object.assign({}, e, {
        ot: {
          early,
          late,
          lunch,
          from: early ? from : "",
          to: late ? to : "",
          why,
          status: "asked",
          at: Date.now(),
        },
        updated: Date.now(),
      });
      delete data.id;
      S.mine.entries = S.mine.entries.map((y) =>
        y.id === e.id ? Object.assign({ id: e.id }, data) : y,
      );
      try {
        const r = await submitJob({ coll: "entries", docId: e.id, data });
        closeForm();
        toast(
          r === "queued"
            ? `Saved on this phone – sends to ${bossFirst()} when you have signal`
            : `Overtime sent to ${bossFirst()} to approve`,
        );
        render();
      } catch (err) {
        showErr("Couldn't send. Try again.");
      }
    },
    "otm-why",
  );
  const c = $("f-cancel");
  if (c) c.textContent = "No, just my usual day";
}
/* James: approve or decline, from the week's timesheet */
function otmButtons(e) {
  return e.ot && e.ot.status === "asked"
    ? `<div class="otm-acts"><button type="button" class="pillbtn otm-ok" data-e="${esc(e.id)}" data-src="${esc(e._src || "")}">✓ Pay overtime</button><button type="button" class="pillbtn otm-no" data-e="${esc(e.id)}" data-src="${esc(e._src || "")}">Decline</button></div>`
    : "";
}
function otmWire(root, who, list) {
  root.querySelectorAll(".otm-ok, .otm-no").forEach(
    (b) =>
      (b.onclick = async () => {
        const e = list().find((x) => x.id === b.dataset.e);
        if (!e || !e.ot) return;
        const id = b.dataset.src || who;
        const ok = b.classList.contains("otm-ok");
        let up;
        if (ok) {
          const start = e.ot.early ? e.ot.from || e.actualIn : e.start,
            finish = e.ot.late ? e.ot.to || e.actualOut : e.finish;
          const br = e.ot.lunch ? 0 : lunchBreak(start, finish, dayFor(id));
          up = {
            start,
            finish,
            breakMin: br,
            hours: Math.round(calcHours(start, finish, br) * 100) / 100,
            ot: Object.assign({}, e.ot, {
              status: "ok",
              okAt: Date.now(),
              was: { start: e.start, finish: e.finish, hours: e.hours },
            }),
          };
        } else up = { ot: Object.assign({}, e.ot, { status: "no", okAt: Date.now() }) };
        b.disabled = true;
        try {
          await S.db.doc("sheets/" + id + "/entries/" + e.id).update(up);
          toast(
            ok
              ? `Overtime approved: ${otmLen((e.ot.early || 0) + (e.ot.late || 0) + (e.ot.lunch || 0))} added`
              : "Overtime declined – their usual day is paid",
          );
        } catch (err) {
          b.disabled = false;
          toast("Couldn't save");
        }
      }),
  );
}
/* overtime hours approved in a list of entries (for totals) */
const otmHours = (list) =>
  Math.round(
    list
      .filter((e) => e.ot && e.ot.status === "ok")
      .reduce((a, e) => a + (e.ot.early || 0) + (e.ot.late || 0) + (e.ot.lunch || 0), 0) / 0.6,
  ) / 100;
