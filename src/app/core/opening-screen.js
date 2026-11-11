/* ================= OPENING SCREEN: the company first, SiteHQ by Stranix small, while the app opens ================= */
import { $, store } from "./helpers.js";
import { coData } from "../owner/company-details.js";
import { coTileOf } from "../owner/today.js";
export { initOpening };
/* The page starts with #ohq over everything (src/shell.html): the company's square and name big in the middle, and
   "SiteHQ by STRANIX" small at the bottom (James chose "JEB first, SiteHQ small" from his Stranix logo set, Nov 2026).
   It stays until the app has drawn its first page (the "Opening…" placeholder in #main is gone) and at least OHQ_MIN ms
   have passed, then fades out; after OHQ_MAX it goes anyway. When nobody is signed in to the platform it stays, showing
   how to sign in. The company's name is remembered on this device (store "jeb.ohqCo") so the next opening shows it
   straight away. Tests (navigator.webdriver) remove it at once unless store "jeb.splash" is true (tests/features/h505.js). */
const OHQ_MIN = 900;
const OHQ_MAX = 9000;
const ohqT0 = Date.now();
function ohqCompany(name) {
  if (!name) return;
  if ($("ohq-tile")) $("ohq-tile").textContent = coTileOf(name);
  if ($("ohq-name")) $("ohq-name").textContent = name;
}
function ohqHide() {
  const o = $("ohq");
  if (!o || o.classList.contains("ohq-out")) return;
  try {
    const n = coData().name;
    if (n) store.set("jeb.ohqCo", n);
  } catch (e) {}
  o.classList.add("ohq-out");
  setTimeout(() => o.remove(), 400);
}
function initOpening() {
  const o = $("ohq");
  if (!o) return;
  if (navigator.webdriver && !store.get("jeb.splash", false)) {
    o.remove();
    return;
  }
  ohqCompany(store.get("jeb.ohqCo", ""));
  const t = setInterval(() => {
    const m = $("main");
    const txt = (m && m.textContent) || "";
    if (/Sign in to use the app/.test(txt)) {
      /* not signed in: the opening screen says how */
      clearInterval(t);
      if ($("ohq-how")) $("ohq-how").hidden = false;
      if ($("ohq-sub")) $("ohq-sub").hidden = true;
      return;
    }
    const drawn = m && !/^\s*Opening…/.test(txt);
    const waited = Date.now() - ohqT0;
    if ((drawn && waited >= OHQ_MIN) || waited >= OHQ_MAX) {
      clearInterval(t);
      ohqHide();
    }
  }, 150);
}
