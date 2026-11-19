/* ================= PHONE SYNC: whose phone has hours that haven't come through, and who hasn't used the app lately ================= */
import { esc } from "../core/helpers.js";
import { S } from "../core/state.js";
import { nameOf, teamIds } from "../owner/owner.js";
export { psyncHtml };
/* James (Nov 2026): "kahns hours are in his time sheet but they arent going on to my view check for others also".
   His hours were on his phone and never reached the shared records (nothing from any trade had arrived since the
   morning of Thu 5 Nov). Timesheets now starts with 📵 Not coming through when a trade's phone reports items still
   waiting to send (and what went wrong), or a trade hasn't used the app for 3 days or more – with what to do. */
function psyncList() {
  const now = Date.now();
  return teamIds()
    .map((id) => {
      const t = S.team[id] || {};
      const last = Math.max(t.updated || 0, t.deliveredAt || 0, t.waitingAt || 0);
      return {
        id,
        waiting: +t.waiting || 0,
        since: t.waitingSince || 0,
        err: t.waitingErr || "",
        last,
        quiet: last && now - last > 3 * 864e5,
      };
    })
    .filter((r) => r.waiting || r.quiet)
    .sort((a, b) => b.waiting - a.waiting || a.last - b.last);
}
const psyncDay = (t) =>
  new Date(t).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
function psyncHtml() {
  if (!S.owner || S.preview) return "";
  const L = psyncList();
  if (!L.length) return "";
  return `<div class="card psync-card"><div class="cardbody" style="border:0">
    <div class="psync-h">📵 Not coming through (${L.length})</div>
    <div class="who">Hours only reach you once their phone has sent them. Anything below is still on their phone, or they haven't opened the app.</div>
    ${L.map(
      (r) =>
        `<div class="psync-row"><b>${esc(nameOf(r.id))}</b><span class="who">${
          r.waiting
            ? `⚠️ ${r.waiting} item${r.waiting === 1 ? "" : "s"} waiting on their phone${r.since ? " since " + esc(psyncDay(r.since)) : ""}${r.err ? " · problem: " + esc(r.err) : ""}`
            : ""
        }${r.waiting && r.quiet ? " · " : ""}${r.quiet ? `Last used the app <b>${esc(psyncDay(r.last))}</b>` : ""}</span></div>`,
    ).join("")}
    <div class="who psync-do"><b>What to do:</b> ask them to open the app where they have signal. If it says items are waiting to send, tap <b>Try sending now</b>. Their days then appear here. Don't let them clear the browser's data or delete the app first, or what's on the phone is lost.</div>
  </div></div>`;
}
