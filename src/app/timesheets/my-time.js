/* ================= MY TIME: James's own timesheet and day work, from the top of Timesheets and Day work ================= */
import { $, esc, hrs, shortDay } from "../core/helpers.js";
import { S, inWeek } from "../core/state.js";
import { startPreview } from "../owner/owner.js";
import { siteLabel } from "../sites/job-details.js";
import { openEntry, sumH, typeTag } from "./time.js";
export { mytCardHtml, mytWire };
/* James (Nov 2026): "i need a way as the account holder to fill in time sheet and day work sheets easily". His own
   hours only showed once he already had some, buried with the trades. Now Timesheets and Day work start with
   🙋 My own time: this week's hours and day work, + My timesheet day (today, his usual hours and last site already
   in), 🧱 + My day work, ⏱ Check in like the trades, and his days this week, each tap to change. They are saved
   on his own sheet, like a trade's. */
function mytCardHtml() {
  if (!S.owner || S.preview) return "";
  const mine = (S.mine.entries || []).filter((e) => inWeek(e) && !e.forName);
  const h = sumH(mine, (e) => e.type === "hours"),
    j = sumH(mine, (e) => e.type === "job");
  const open = (S.mine.entries || []).find((e) => e.open);
  return `<details class="card myt-card" data-id="__myt"${S.f.mytShut ? "" : " open"}><summary><div class="nm">🙋 My own time<small>Your own timesheet and day work this week</small></div><div class="figs"><span><b>${hrs(h)}</b> h worked</span><span><b>${hrs(j)}</b> h day work</span></div></summary>
    <div class="cardbody"><div class="actions myt-acts"><button type="button" class="btn primary" id="myt-h">+ My timesheet day</button><button type="button" class="btn hv" id="myt-j">🧱 + My day work</button><button type="button" class="btn" id="myt-ci">${open ? "🙋 My page – check out" : "🙋 My page – check in, forms, photos"}</button></div>
    ${
      mine.length
        ? `<div class="myt-list">${mine
            .slice()
            .sort(
              (a, b) =>
                a.date.localeCompare(b.date) || (a.start || "").localeCompare(b.start || ""),
            )
            .map(
              (e) =>
                `<button type="button" class="myt-row" data-e="${esc(e.id)}"><span><b>${esc(shortDay(e.date))}</b> ${typeTag(e)} ${esc(siteLabel(e.job) || "No site")}<span class="who">${e.type === "hours" ? (e.open ? "Checked in at " + esc(e.start) : esc(e.start) + "–" + esc(e.finish)) : esc(e.task || "")}</span></span><b>${hrs(e.hours)} h</b></button>`,
            )
            .join("")}</div>`
        : '<div class="who">Nothing from you this week yet.</div>'
    }</div></details>`;
}
function mytWire() {
  const card = document.querySelector("#main .myt-card");
  if (!card) return;
  card.addEventListener("toggle", () => (S.f.mytShut = !card.open));
  $("myt-h").onclick = () => openEntry("hours");
  $("myt-j").onclick = () => openEntry("job");
  $("myt-ci").onclick = () => startPreview();
  card.querySelectorAll(".myt-row").forEach(
    (b) =>
      (b.onclick = () => {
        const e = S.mine.entries.find((x) => x.id === b.dataset.e);
        if (e) openEntry(e.type, e);
      }),
  );
}
