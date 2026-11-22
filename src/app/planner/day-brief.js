/* ================= DAY BRIEF: each trade gets "here's tomorrow" in the evening and "here's today" in the morning ================= */
import { bossFirst } from "../core/company-names.js";
import { $, addDays, esc, iso, parse, shortDay, store, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { RAW, S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { nameOf } from "../owner/owner.js";
import { onDay, planEntries } from "./time-off.js";
import { gmapDir } from "../sites/maps-pins.js";
export { dbrSettings, initDayBrief };
/* James (Nov 2026): "how does the app let the people know what job or jobs they have for the day so they know in the
   morning" → a message on their phone, without him having to send it. When a trade opens the app from the evening
   (4pm by default) it pops up 🌙 Tomorrow – each job's time, title, address with 🧭 Directions, who else is on it and
   the notes – and from 5am to noon ☀️ Today, once each per day on that phone. Nothing booked on a weekday says so
   ("check with James"). Their planner dates only (the same ones their Calendar shows). James turns it off or picks
   the time in 📅 Calendar › menu › 🌙 Evening & morning message; saved in settings/app.dayBrief { off, eve }.
   A real buzz on a locked phone needs push notifications on our own hosting (Jasper's list). */
function dbrCfg() {
  const c = (S.settings || {}).dayBrief || {};
  return { off: !!c.off, eve: +c.eve || 16 };
}
function dbrDue(now) {
  const c = dbrCfg();
  if (c.off) return null;
  const h = now.getHours();
  if (h >= c.eve) return { slot: "eve", day: iso(addDays(now, 1)), label: "🌙 Tomorrow" };
  if (h >= 5 && h < 12) return { slot: "am", day: iso(now), label: "☀️ Today" };
  return null;
}
function dbrList(day) {
  const list = planEntries().filter((p) => onDay(p, day) && !p.pending);
  return {
    jobs: list
      .filter((p) => p.type !== "holiday")
      .sort((a, b) => (a.time || "99").localeCompare(b.time || "99")),
    off: list.find((p) => p.type === "holiday"),
  };
}
function dbrHtml(due) {
  const { jobs, off } = dbrList(due.day);
  const wkday = ![0, 6].includes(parse(due.day).getDay());
  if (!jobs.length && !off && !wkday) return "";
  const item = (p) => {
    const others = (p.people || [])
      .filter((x) => x !== S.me)
      .map(nameOf)
      .filter(Boolean);
    return `<div class="dbr-job"><div class="dbr-t">${p.time ? esc(p.time) + (p.endTime ? "–" + esc(p.endTime) : "") : "All day"}</div><div class="dbr-w"><b>${esc(p.title || p.site || "Job")}</b>${p.site && p.site !== p.title ? `<small>📍 ${esc(p.site)}</small>` : ""}${others.length ? `<small>👷 With ${esc(others.join(", "))}</small>` : ""}${p.notes ? `<small class="dbr-n">${esc(p.notes.slice(0, 240))}${p.notes.length > 240 ? "…" : ""}</small>` : ""}${p.site ? `<a class="btn dbr-dir" href="${esc(gmapDir(p.site))}" target="_blank" rel="noopener">🧭 Directions</a>` : ""}</div></div>`;
  };
  return `<div class="dimbox dbr-box" role="dialog" aria-label="${esc(due.label)}"><b>${esc(due.label)} · ${esc(shortDay(due.day))}</b>
    ${off ? `<div class="notice">🌴 ${esc(off.title || "Time off")}</div>` : ""}
    ${jobs.length ? jobs.map(item).join("") : off ? "" : `<div class="who">Nothing booked yet. Check with ${esc(bossFirst())}.</div>`}
    <div class="dimbtns"><button type="button" class="btn dbr-cal">📅 My calendar</button><button type="button" class="btn primary dbr-ok">OK, got it</button></div></div>`;
}
/* shown this session (also kept on the phone, so reopening the app later that evening does not show it again) */
const dbrShown = new Set();
function dbrCheck() {
  if (!S.db || !S.me || S.client || ownerMode() || !S.settings) return;
  if (document.visibilityState === "hidden" || document.querySelector(".dbr-box")) return;
  if (!S.plan || !RAW.plan) return;
  const due = dbrDue(new Date());
  if (!due) return;
  const key = "dbr." + S.me + "." + due.day + "." + due.slot;
  if (dbrShown.has(key) || store.get(key, 0)) return;
  const html = dbrHtml(due);
  dbrShown.add(key);
  store.set(key, 1);
  if (!html) return;
  const d = document.createElement("div");
  d.className = "dimask";
  d.innerHTML = html;
  document.body.appendChild(d);
  d.querySelector(".dbr-ok").onclick = () => d.remove();
  d.querySelector(".dbr-cal").onclick = () => {
    d.remove();
    S.tab = "planner";
    render();
  };
  d.querySelector(".dbr-ok").focus();
}
function dbrSettings() {
  const c = dbrCfg();
  const hrs = [14, 15, 16, 17, 18, 19, 20];
  openSheet(
    `<h3 id="sheettitle">🌙 Evening &amp; morning message</h3>
    <div class="who">When someone opens the app in the evening it shows them tomorrow's jobs from the planner – the time, the address with directions, who else is on it and your notes. In the morning (5am to noon) it shows today's. Once each per day.</div>
    <label class="inl"><input type="checkbox" id="dbr-on" ${c.off ? "" : "checked"}> Show it to everyone</label>
    <label for="dbr-eve">Show tomorrow's from<select id="dbr-eve">${hrs.map((h) => `<option value="${h}" ${h === c.eve ? "selected" : ""}>${h - 12}pm</option>`).join("")}</select></label>
    ${formFoot(false, "Save")}`,
    async () => {
      try {
        await S.db
          .doc("settings/app")
          .update({ dayBrief: { off: !$("dbr-on").checked, eve: +$("dbr-eve").value } });
        closeForm();
        toast("Saved");
      } catch (e) {
        showErr("Couldn't save – check your connection");
      }
    },
    "dbr-on",
  );
}
function initDayBrief() {
  setInterval(dbrCheck, 60000);
  document.addEventListener("visibilitychange", () => setTimeout(dbrCheck, 1500));
  setTimeout(dbrCheck, 4000);
}
