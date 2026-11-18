/* ================= WORKING DAY: each person's usual start, finish and lunch, or the standard day if they haven't set one ================= */
import { bossFirst } from "../core/company-names.js";
import { $, dayLine, esc, toMin, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { nameOf } from "../owner/owner.js";
export { WE, WS, dayFor, openMyDay };
const WS = () => S.settings.workStart || "08:00",
  WE = () => S.settings.workEnd || "16:30";
/* each person's usual day: their own start, finish and lunch, or your standard day if they haven't set one */
function dayFor(id) {
  const t = (id && id === S.me ? S.myProfile : (S.team || {})[id]) || {};
  const d = t.day || {};
  return {
    s: d.start || WS(),
    e: d.finish || WE(),
    la: d.lunchAt || "13:00",
    lm: d.lunchMin != null ? +d.lunchMin : 30,
    own: !!(t.day && (t.day.start || t.day.finish || t.day.lunchAt || t.day.lunchMin != null)),
  };
}
function openMyDay(id) {
  const D = dayFor(id);
  const mine = id === S.me;
  openSheet(
    `<h3 id="sheettitle">⏰ ${mine ? "My usual working day" : esc(nameOf(id)) + "'s usual working day"}</h3>
    <div class="who">${mine ? `Fills in your start, finish and lunch each day, and sets the times you're paid from when you check in and out. You can still change any single day by hand. ${bossFirst()} can see and change this too.` : "Their check-in, check-out and new days use these times. They can see and change it too. Leave it on the standard day if they work your normal hours."}</div>
    <div class="grid2"><label for="md-s">Start<input id="md-s" type="time" value="${esc(D.s)}"></label><label for="md-e">Finish<input id="md-e" type="time" value="${esc(D.e)}"></label></div>
    <div class="grid2"><label for="md-la">Unpaid lunch starts<input id="md-la" type="time" value="${esc(D.la)}"></label><label for="md-lm">Lunch length<select id="md-lm">${[0, 15, 20, 30, 45, 60].map((m) => `<option value="${m}" ${D.lm === m ? "selected" : ""}>${m ? m + " min" : "No unpaid lunch"}</option>`).join("")}</select></label></div>
    <div class="who">Standard day: ${esc(dayLine({ s: WS(), e: WE(), la: "13:00", lm: 30 }))}.</div>
    <div class="actions">${D.own ? `<button type="button" class="btn" id="md-reset">Use the standard day</button>` : ""}</div>
    ${formFoot(false, "Save")}`,
    async () => {
      const st = $("md-s").value,
        fi = $("md-e").value;
      if (!st || !fi || toMin(fi) <= toMin(st)) {
        showErr("The finish must be after the start.");
        return;
      }
      const day = {
        start: st,
        finish: fi,
        lunchAt: $("md-la").value || "13:00",
        lunchMin: +$("md-lm").value,
        by: mine ? "self" : "owner",
        at: Date.now(),
      };
      try {
        await S.db.doc("sheets/" + id).update({ day });
        if (mine) S.myProfile = Object.assign({}, S.myProfile || {}, { day });
        else S.team[id] = Object.assign({}, S.team[id] || {}, { day });
        closeForm();
        toast("Working day saved");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    null,
  );
  if ($("md-reset"))
    $("md-reset").onclick = async () => {
      try {
        await S.db.doc("sheets/" + id).update({ day: null });
        if (mine) S.myProfile = Object.assign({}, S.myProfile || {}, { day: null });
        else S.team[id] = Object.assign({}, S.team[id] || {}, { day: null });
        closeForm();
        toast("Back to the standard day");
        render();
      } catch (e) {
        toast("Couldn't save");
      }
    };
}
