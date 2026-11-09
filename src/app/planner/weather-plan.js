/* ================= WEATHER-WISE PLANNER: warns before a pour, roof strip or render on a wet or frosty day, and offers to move or swap ================= */
import { $, addDays, esc, iso, parse, toast } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { pbEntryDays } from "./board.js";
import { same } from "../sites/project-pages.js";
export { wpCard, wpPlannerTop, wpWire };
/* The forecast comes in its own record, settings/forecast (written three times a day by the "JEB weather forecast"
   routine from AccuWeather; the live weather in settings/weather may carry the same): { at, places: [{ name, site,
   key, days }] }, each place's days: [{ d (YYYY-MM-DD), rain (% chance, daytime), mm (rain, day + night), max, min (°C, the
   night after), gust (km/h), phrase }]. A booking's kind of work is read from its title and notes; each kind has
   the weather it can't take. A problem day offers the first suitable day after it ("Move to Thu 12"), or a swap
   with an indoor booking on that day. Nothing here runs without a forecast. */
const WP_KINDS = [
  {
    k: "concrete",
    re: /concrete|\bpour|slab|footing|founds?\b|screed|oversite/i,
    name: "Concrete",
    bad: (d) =>
      d.rain >= 60 || d.mm >= 5
        ? `rain ${d.rain}%${d.mm ? ", " + d.mm + " mm" : ""}`
        : d.min <= 2
          ? `frost risk (${d.min}°C overnight)`
          : "",
  },
  {
    k: "roof",
    re: /roof|strip|felt|tiling|re-?tile|slate|scaffold|chimney|gutter|fascia|soffit/i,
    name: "Roof work",
    bad: (d) =>
      d.rain >= 50
        ? `rain ${d.rain}%`
        : d.gust >= 50
          ? `gusts ${Math.round(d.gust * 0.621)} mph`
          : "",
  },
  {
    k: "masonry",
    re: /render|pointing|brickwork|bricklay|blockwork|brick|block|masonry|mortar/i,
    name: "Render and masonry",
    bad: (d) =>
      d.rain >= 60 ? `rain ${d.rain}%` : d.min <= 3 ? `too cold for mortar (${d.min}°C)` : "",
  },
  {
    k: "paint",
    re: /(outside|external|exterior).{0,20}(paint|decorat)|(paint|decorat).{0,20}(outside|external|exterior)|fence|decking|masonry paint/i,
    name: "Outside painting",
    bad: (d) => (d.rain >= 40 ? `rain ${d.rain}%` : d.min <= 5 ? `cold (${d.min}°C)` : ""),
  },
  {
    k: "ground",
    re: /dig|excavat|groundwork|drainage|patio|paving|landscap|tarmac|driveway/i,
    name: "Groundwork",
    bad: (d) => (d.mm >= 10 ? `heavy rain (${d.mm} mm)` : ""),
  },
];
const wpKind = (p) => {
  const t = [p.title, p.notes, p.note].filter(Boolean).join(" ");
  return WP_KINDS.find((x) => x.re.test(t)) || null;
};
/* the forecast for a booking's site: that site's place, else the nearest, else Exmouth */
function wpDays(site) {
  /* the forecast record (settings/forecast) first, else forecast days carried in the live weather */
  const withDays =
    [S.wxFc, S.wxFeed]
      .filter((f) => f && Array.isArray(f.places))
      .map((f) => f.places.filter((p) => Array.isArray(p.days) && p.days.length))
      .find((l) => l.length) || [];
  if (!withDays.length) return null;
  const pl =
    (site && withDays.find((p) => p.site && same(p.site, site))) ||
    withDays.find((p) => /exmouth/i.test(p.name || "")) ||
    withDays[0];
  const m = {};
  pl.days.forEach((d) => (m[d.d] = d));
  return { place: (pl.name || "").split(",")[0], by: m };
}
const wpDayName = (d) =>
  parse(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const wpAll = () =>
  (S.plan || [])
    .concat(S.planPrivate || [])
    .filter((p) => p && p.from && p.kind !== "leave" && !/^leave-/.test(p.id || ""));
/* every booking with a day the weather is wrong for, with a better day and a swap if there is one */
function wpProblems() {
  const today = iso(new Date());
  const all = wpAll();
  const out = [];
  all.forEach((p) => {
    const kind = wpKind(p);
    if (!kind) return;
    const fc = wpDays(p.site);
    if (!fc) return;
    pbEntryDays(p)
      .filter((d) => d >= today)
      .forEach((d) => {
        const w = fc.by[d];
        if (!w) return;
        const why = kind.bad(w);
        if (!why) return;
        /* a better day: the first forecast day after it that the work can take (not Sunday) */
        const len = pbEntryDays(p).length;
        const better = Object.keys(fc.by)
          .sort()
          .filter((x) => x > d && parse(x).getDay() !== 0)
          .find((x) => {
            for (let i = 0; i < len; i++) {
              const dd = iso(addDays(parse(x), i));
              if (!fc.by[dd] || kind.bad(fc.by[dd])) return false;
            }
            return true;
          });
        /* a swap: a one-day indoor booking on that better day */
        const swap =
          better && len === 1
            ? all.find(
                (q) =>
                  q.id !== p.id && !wpKind(q) && q.from === better && (q.to || q.from) === better,
              )
            : null;
        out.push({ p, d, kind, why, better, swap, place: fc.place, w });
      });
  });
  /* one line per booking: its first bad day */
  const seen = new Set();
  return out
    .sort((a, b) => a.d.localeCompare(b.d))
    .filter((x) => (seen.has(x.p.id) ? false : seen.add(x.p.id)));
}
const wpPath = (p) => (p.vis === "me" ? "planprivate" : "plan") + "/" + p.id;
async function wpMove(p, toDay) {
  const shift = Math.round((parse(toDay) - parse(p.from)) / 864e5);
  await S.db.doc(wpPath(p)).update({
    from: iso(addDays(parse(p.from), shift)),
    to: iso(addDays(parse(p.to || p.from), shift)),
  });
}
/* the card: on Today, and at the top of the planner */
function wpCard() {
  if (!ownerMode()) return "";
  let probs;
  try {
    probs = wpProblems();
  } catch (e) {
    return "";
  }
  if (!probs.length) return "";
  return `<div class="card wp-card"><div class="cardbody" style="border:0"><b>🌧 ${probs.length} booking${probs.length === 1 ? "" : "s"} the weather looks wrong for</b>${probs
    .slice(0, 6)
    .map(
      (x, i) =>
        `<div class="wp-row"><div><b>${esc(x.p.title || x.kind.name)}</b>${x.p.site ? ` · ${esc(x.p.site)}` : ""}<div class="who">${esc(wpDayName(x.d))}: ${esc(x.why)} (${esc(x.place)} forecast)</div></div><div class="wp-btns">${x.swap ? `<button type="button" class="btn wp-swap" data-i="${i}">⇄ Swap with ${esc(x.swap.title || "the indoor job")} (${esc(wpDayName(x.better))})</button>` : ""}${x.better ? `<button type="button" class="btn primary wp-move" data-i="${i}">Move to ${esc(wpDayName(x.better))}</button>` : `<span class="who">No better day in the next 10 days</span>`}</div></div>`,
    )
    .join("")}</div></div>`;
}
function wpWire() {
  const probs = (() => {
    try {
      return wpProblems();
    } catch (e) {
      return [];
    }
  })();
  document.querySelectorAll("#main .wp-move").forEach(
    (b) =>
      (b.onclick = async () => {
        const x = probs[+b.dataset.i];
        if (!x) return;
        try {
          await wpMove(x.p, x.better);
          toast(`${x.p.title || "Booking"} moved to ${wpDayName(x.better)}`);
          render();
        } catch (e) {
          toast("Couldn't move it. Check your connection.");
        }
      }),
  );
  document.querySelectorAll("#main .wp-swap").forEach(
    (b) =>
      (b.onclick = async () => {
        const x = probs[+b.dataset.i];
        if (!x || !x.swap) return;
        try {
          await wpMove(x.p, x.better);
          await wpMove(x.swap, x.d);
          toast(
            `Swapped: ${x.p.title || "booking"} to ${wpDayName(x.better)}, ${x.swap.title || "indoor job"} to ${wpDayName(x.d)}`,
          );
          render();
        } catch (e) {
          toast("Couldn't swap them. Check your connection.");
        }
      }),
  );
}
/* the planner: the card above the board */
function wpPlannerTop() {
  const h = wpCard();
  if (!h) return;
  $("main").insertAdjacentHTML("afterbegin", h);
  wpWire();
}
