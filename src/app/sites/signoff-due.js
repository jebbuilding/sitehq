/* ================= SIGN-OFFS STILL TO SORT: sign-off sheets on a site that aren't fully signed – on the site, the site list and the morning briefing ================= */
import { esc } from "../core/helpers.js";
import { S } from "../core/state.js";
import { drawOpen } from "../drawing/drawings-tab.js";
import { SIGNSHEET } from "../drawing/sign-off-sheet.js";
import { same } from "./project-pages.js";
export { sodAll, sodFor, sodHtml, sodSites, sodWhy, sodWire };
/* James (Nov 2026): "in a site if a sign off sheet hasnt been done say that it notify me and has it up on the site
   that it needs sorting still". A sign-off sheet (made from a drawing, or a go-ahead sheet) is still to sort until
   everyone on it has signed: it is listed at the top of its site in red with who it is waiting for (or that they asked
   for changes), the site gets a ✍️ mark in the sites list, the site diary lists it, and the morning briefing tells
   James how many are waiting. Nothing is stored: it is worked out from the sheets each time. */
function sodAll() {
  const L = (S.mine.photos || []).filter((x) => x && x.signSheet).concat(S.gosheets || []);
  return L.map((p) => {
    let st = [];
    try {
      st = SIGNSHEET.status(p);
    } catch (e) {}
    const wait = st.filter((x) => x.st !== "ok");
    return {
      p,
      site: p.signSheet.site || p.site || "",
      title: p.signSheet.title || "Sign-off sheet",
      wait,
      none: !st.length,
      change: wait.some((x) => x.st === "change"),
      at: p.signSheet.at || 0,
    };
  })
    .filter((r) => r.none || r.wait.length)
    .sort((a, b) => a.at - b.at);
}
const sodFor = (site) => sodAll().filter((r) => r.site && same(r.site, site));
const sodDays = (r) => (r.at ? Math.max(0, Math.floor((Date.now() - r.at) / 864e5)) : 0);
function sodWhy(r) {
  if (r.none) return "nobody is on it to sign yet";
  const ch = r.wait.filter((x) => x.st === "change");
  if (ch.length) return ch.map((x) => x.name).join(", ") + " asked for changes";
  return "waiting for " + r.wait.map((x) => x.name || x.role).join(", ");
}
const sodAge = (r) => {
  const d = sodDays(r);
  return r.at ? (d === 0 ? "made today" : d === 1 ? "made yesterday" : `made ${d} days ago`) : "";
};
/* the warning at the top of a site */
function sodHtml(site) {
  const L = sodFor(site);
  if (!L.length) return "";
  return `<div class="notice warn sod"><b>✍️ ${L.length} sign-off sheet${L.length === 1 ? "" : "s"} still to sort</b>${L.map((r, i) => `<button type="button" class="incrow sod-row" data-i="${i}"><span><b>${esc(r.title)}</b><br><span class="who">${esc(sodWhy(r))}${sodAge(r) ? " · " + esc(sodAge(r)) : ""}</span></span><span>Open ›</span></button>`).join("")}</div>`;
}
function sodWire(site) {
  const L = sodFor(site);
  document.querySelectorAll(".sod-row").forEach(
    (b) =>
      (b.onclick = () => {
        const r = L[+b.dataset.i];
        if (!r) return;
        if ((S.mine.photos || []).some((x) => x.id === r.p.id)) drawOpen(r.p);
        else SIGNSHEET.view(r.p);
      }),
  );
}
/* the sites that have one, for the ✍️ mark in the sites list */
const sodSites = () => [
  ...new Set(
    sodAll()
      .map((r) => r.site)
      .filter(Boolean),
  ),
];
