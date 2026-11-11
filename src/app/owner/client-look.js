/* ================= CLIENTS' LOOK: the client's portal in the new look – Home, Photos, Documents, Messages and More along the bottom ================= */
import { $, esc, store } from "../core/helpers.js";
import { S } from "../core/state.js";
import { coData } from "./company-details.js";
import { NL_BY, coTileOf, nlBrandHtml } from "./today.js";
export { clApply, clMoreHtml, clOn };
/* The client gets the same look as James and the trades (body.nl-on, the styles in owner.css): no wall of buttons at
   the top, but a bar along the bottom on a phone (a side menu on an iPad or computer) with 🏠 Home, 📷 Photos,
   📄 Documents, 💬 Messages and ☰ More; More lists the other parts James lets them see (Job story, Choices, Drawing,
   Dates, Sign-offs, About us & policies). James's preview of a portal keeps the old row of buttons, inside his own
   look. Tests (navigator.webdriver) start in the old layout; store "jeb.clientlook" true switches it on. */
const CL_BAR = [
  ["home", "Home", "🏠"],
  ["photos", "Photos", "📷"],
  ["docs", "Documents", "📄"],
  ["chat", "Messages", "💬"],
  ["more", "More", "☰"],
];
const clOn = () => {
  const C = S.client;
  if (!C || C._preview || !C.linked || C.revoked) return false;
  if (!navigator.webdriver) return true;
  return !!store.get("jeb.clientlook", false);
};
/* the number in a tab's label (its badge), and the label without it */
const clNum = (l) => +((String(l).match(/class="badge">(\d+)</) || [])[1] || 0);
const clText = (l) => String(l).replace(/\s*<span class="badge">.*$/, "");
/* the bar, for the tabs this client has ([key, label] as the portal builds them); go(k) opens a tab */
function clApply(tabs, cur, go) {
  let bar = $("clbar");
  if (!clOn()) {
    if (bar) bar.hidden = true;
    return;
  }
  document.body.classList.add("nl-on");
  if (!bar) {
    bar = document.createElement("nav");
    bar.id = "clbar";
    bar.className = "nlbar";
    bar.setAttribute("aria-label", "Sections");
    document.body.appendChild(bar);
  }
  bar.hidden = false;
  const have = new Set(tabs.map((x) => x[0]));
  const items = CL_BAR.filter(([k]) => k === "more" || have.has(k));
  const inBar = new Set(items.map((x) => x[0]));
  const moreN = tabs.filter(([k]) => !inBar.has(k)).reduce((s, [, l]) => s + clNum(l), 0);
  const on = inBar.has(cur) ? cur : "more";
  const co = (coData().name || "SiteHQ").trim();
  const tile = coTileOf(co);
  const hd = document.querySelector("header.top>div");
  if (hd) hd.dataset.tile = tile;
  bar.innerHTML =
    nlBrandHtml(co) +
    items
      .map(([k, l, i]) => {
        const n = k === "more" ? moreN : clNum((tabs.find((x) => x[0] === k) || [])[1]);
        return `<button type="button" class="nl-b cl-b" data-v="${k}"${k === on ? ' aria-current="page"' : ""}><span class="nl-ic"><span class="tl-i" aria-hidden="true">${i}</span>${n ? `<span class="nl-dot">${n}</span>` : ""}</span><span class="nl-l">${esc(l)}</span></button>`;
      })
      .join("") +
    NL_BY;
  bar.querySelectorAll(".cl-b").forEach((b) => (b.onclick = () => go(b.dataset.v)));
}
/* ☰ More: the client's other parts, as rows (they open with the portal's own .pt-go buttons) */
function clMoreHtml(tabs) {
  const inBar = new Set(CL_BAR.map((x) => x[0]));
  const rest = tabs.filter(([k]) => !inBar.has(k));
  return `<div class="nl-secpage cl-more"><section class="nl-grp">${
    rest
      .map(([k, l]) => {
        const n = clNum(l);
        return `<button type="button" class="nl-row2 pt-go" data-v="${k}"><span class="nl-rl">${esc(clText(l))}</span>${n ? `<span class="nl-new">${n}</span>` : ""}<span class="nl-chev" aria-hidden="true">›</span></button>`;
      })
      .join("") || `<div class="who">Nothing else here yet.</div>`
  }</section></div>`;
}
