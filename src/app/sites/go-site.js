/* ================= GO SITE: every tap on a site opens the same site page ================= */
import { $, store } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer } from "../core/viewer.js";
export { goSite };
/* James (Nov 2026): "when you go to different parts that is about the site it all has different layouts … make sure
   that every time you click on to a site it takes you to the same page for consistency". Jobs & clients showed the
   job beside the list, while Sites, Today, Search, the map and Clients opened the site page – and that page kept
   whichever tab was open last time. Now every one of them calls goSite: the one site page, at the top, on its
   Overview (the job at a glance – stages, money, photos, who's on it, paperwork – then the site's tabs), unless a
   button asks for a particular part of it (RAMS, photos). */
function goSite(site, tab) {
  if (!site) return;
  if (!$("viewer").hidden) closeViewer();
  S.f.proj = site;
  S.f.jbSel = site;
  S.f.projList = false;
  S.f.pjSite = site;
  S.f.pjtab = tab || "overview";
  S.otab = "projects";
  store.set("jeb.otab", "projects");
  render();
  window.scrollTo(0, 0);
}
