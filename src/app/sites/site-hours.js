/* ================= SITE HOURS: the site page's hours, person by person, each opening Timesheets on that job ================= */
import { esc, hrs, iso, monday, parse, shortDay, store } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { nameOf } from "../owner/owner.js";
import { sumH } from "../timesheets/time.js";
export { shrsHtml, shrsWire };
/* James (Nov 2026): "in sites the timesheet hours and extra work do not show the hours from the trades and I need to
   be able to click on them and it take me to the timesheet with the information for that job". The site's
   Overview shows Timesheet hours, Extra work hours and People worked here as buttons, and under them each person
   with their hours on this job (and days they never checked out, which count 0 until a finish is put in). Each opens
   Timesheets filtered to this job (and that person), on the latest week with hours here. */
function shrsGo(site, who, list) {
  const L = (list || [])
    .filter((e) => !who || e.who === who)
    .map((e) => e.date)
    .filter(Boolean)
    .sort();
  const last = L.length ? L[L.length - 1] : iso(new Date());
  S.f.fltSite = String(site || "")
    .trim()
    .toLowerCase();
  S.f.fltWho = who ? [who] : [];
  S.week = monday(parse(last));
  if (who) S.open.add(who);
  S.otab = "time";
  store.set("jeb.otab", "time");
  render();
  window.scrollTo(0, 0);
}
function shrsHtml(ts, extra, people) {
  const per = people
    .map((w) => {
      const t = ts.filter((e) => e.who === w),
        x = extra.filter((e) => e.who === w);
      const open = t.filter((e) => e.open).length;
      const days = new Set(t.map((e) => e.date)).size;
      const last =
        t
          .concat(x)
          .map((e) => e.date)
          .sort()
          .pop() || "";
      return { w, h: sumH(t, () => true), x: sumH(x, () => true), open, days, last };
    })
    .sort((a, b) => b.h + b.x - (a.h + a.x));
  return `<div class="totals shrs-tots"><button type="button" class="tot shrs-go"><div class="n">${hrs(sumH(ts, () => true))}</div><div class="l">Timesheet hours ›</div></button><button type="button" class="tot hi shrs-go"><div class="n">${hrs(sumH(extra, () => true))}</div><div class="l">Extra work hours ›</div></button><button type="button" class="tot shrs-go"><div class="n">${people.length}</div><div class="l">People worked here ›</div></button></div>
    ${
      per.length
        ? `<div class="shrs-list" aria-label="Hours on this job by person">${per
            .map(
              (r) =>
                `<button type="button" class="shrs-row" data-w="${esc(r.w)}"><span><b>${esc(nameOf(r.w))}</b><span class="who">${r.days} day${r.days === 1 ? "" : "s"}${r.last ? " · last " + esc(shortDay(r.last)) : ""}${r.open ? ` · <span class="shrs-warn">⚠️ ${r.open} never checked out</span>` : ""}</span></span><span class="shrs-h"><b>${hrs(r.h)} h</b>${r.x ? `<span class="who">+ ${hrs(r.x)} h extra</span>` : ""}</span></button>`,
            )
            .join("")}</div>`
        : '<div class="who">No hours on this job yet.</div>'
    }`;
}
function shrsWire(site, list) {
  document
    .querySelectorAll("#main .shrs-go")
    .forEach((b) => (b.onclick = () => shrsGo(site, "", list)));
  document
    .querySelectorAll("#main .shrs-row")
    .forEach((b) => (b.onclick = () => shrsGo(site, b.dataset.w, list)));
}
