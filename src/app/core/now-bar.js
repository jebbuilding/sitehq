/* ================= DATE, TIME & WEATHER BAR ================= */
import { coTown } from "./company-names.js";
import { $, esc, iso, store } from "./helpers.js";
import { S, ownerMode } from "./state.js";
import { feedNear, siteRec } from "../photos/photos.js";
import { onSiteNow, openRollCall } from "../sites/roll-call.js";
export { drawNowBar, refreshNowWx, startNowBar };
const WX_ICON = (k) =>
  /snow/i.test(k)
    ? "❄️"
    : /thunder/i.test(k)
      ? "⛈️"
      : /heavy rain|light rain/i.test(k)
        ? "🌧️"
        : /drizzle/i.test(k)
          ? "🌦️"
          : /fog/i.test(k)
            ? "🌫️"
            : /sunny/i.test(k)
              ? "☀️"
              : /wind/i.test(k)
                ? "💨"
                : "☁️";
function wxPlace() {
  const today = iso(new Date());
  if (!ownerMode()) {
    const e = (S.mine.entries || [])
      .filter((x) => x.type === "hours" && x.date === today)
      .sort((a, b) => (b.created || 0) - (a.created || 0))[0];
    const s = e && siteRec(e.job);
    if (s) return { lat: s.lat, lon: s.lon, site: s.name, name: s.name.split(",")[0] };
  }
  /* the company's home place: picked from the weather feed by the town in Company details (photos.js feedNear) */
  return { lat: null, lon: null, name: coTown() };
}
function drawNowBar() {
  const el = $("nowbar");
  if (!el) return;
  const d = new Date();
  if (S.db && S.wxFeed) {
    const p = wxPlace();
    const f = feedNear(p.lat, p.lon, p.site);
    S.nowWx = f ? Object.assign(f, { place: f.place || p.name }) : null;
    S.wxFailed = !f;
  }
  const w = S.nowWx;
  const wx =
    w && w.kind
      ? `<span class="nb-wx">${WX_ICON(w.kind)} ${esc(w.kind.replace("Dry / ", ""))}${w.temp != null ? ` <b>${w.temp}°C</b>` : ""}${w.wind ? ` · wind ${w.wind} mph` : ""} <span class="nb-pl">${esc(w.place || "")}${w.at ? " · " + new Date(w.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}</span></span>`
      : `<span class="nb-wx nb-pl">${S.wxFailed ? "Weather not updated yet" : "Getting weather…"}</span>`;
  setTimeout(() => {
    const b = $("nb-site");
    if (b) b.onclick = openRollCall;
  }, 0);
  const ons = ownerMode() && S.db && !S.client && !S.preview ? onSiteNow().length : -1;
  el.innerHTML =
    (ons >= 0
      ? `<button type="button" class="nb-site" id="nb-site">👷 <b>${ons}</b> on site now</button>`
      : "") +
    `<span class="nb-date">${d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span><span class="nb-time">${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>${wx}`;
}
async function refreshNowWx() {
  const p = wxPlace();
  const w = feedNear(p.lat, p.lon, p.site);
  if (w) {
    S.nowWx = Object.assign(w, { place: p.name === w.place || !w.place ? p.name : w.place });
    S.wxFailed = false;
  } else {
    S.nowWx = null;
    S.wxFailed = true;
  }
  drawNowBar();
}
function startNowBar() {
  const c = store.get("jeb.nowwx", null);
  if (c && Date.now() - c.at < 6 * 3600e3) S.nowWx = c;
  drawNowBar();
  setInterval(drawNowBar, 20000);
  refreshNowWx();
  setInterval(refreshNowWx, 30 * 60000);
  window.addEventListener("online", refreshNowWx);
}
