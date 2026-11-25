/* ================= OWN WEATHER: the app fetches the forecast itself (Open-Meteo) when nothing else has sent it ================= */
import { refreshNowWx } from "../core/now-bar.js";
import { S, isArchivedSite } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { coData } from "../owner/company-details.js";
import { siteRec } from "../photos/photos.js";
import { siteLabel } from "../sites/job-details.js";
import { pcGeo, pcOf } from "../sites/maps-pins.js";
import { projectSites, same } from "../sites/project-pages.js";
export { initOwnWeather };
/* James (Nov 2026): "in site diary … I can't see the weather report". The forecast used to come from the "JEB weather
   forecast" routine, which only ever wrote into the old claude.ai copy – our own hosting never got any, so the site
   diary, the planner's weather warnings and the date bar had nothing. Now James's app (the owner's, so it's done once)
   fetches it itself every few hours from Open-Meteo (free, no account) for his base and each live site with a map pin,
   and writes it where everything already looks: settings/weather (the weather now, for the date bar and photos) and
   settings/forecast (10 days, for the diary, planner and Today). Only the rough map position of each place is sent.
   If the routine's own forecast is fresh (under 6 hours old) it's left alone; where the fetch can't go out (the
   claude.ai copy), nothing changes. */
const OWX = (() => {
  /* Open-Meteo's weather codes as words, and the nearest AccuWeather icon number the rest of the app already reads */
  const CODE = (c) =>
    c === 0
      ? ["Sunny", 1]
      : c === 1
        ? ["Mostly sunny", 2]
        : c === 2
          ? ["Partly cloudy", 3]
          : c === 3
            ? ["Cloudy", 7]
            : c === 45 || c === 48
              ? ["Fog", 11]
              : c >= 51 && c <= 57
                ? ["Drizzle", 12]
                : c === 61 || c === 63 || (c >= 80 && c <= 81)
                  ? [c >= 80 ? "Showers" : "Rain", 12]
                  : c === 65 || c === 82
                    ? ["Heavy rain", 18]
                    : c === 66 || c === 67
                      ? ["Freezing rain", 24]
                      : (c >= 71 && c <= 77) || c === 85 || c === 86
                        ? ["Snow", 22]
                        : c >= 95
                          ? ["Thunderstorms", 15]
                          : ["Cloudy", 7];
  const HOME = { name: "Exmouth", lat: 50.6196, lon: -3.4134 };
  let busy = false;
  async function places() {
    const out = [];
    const co = coData();
    let home = null;
    try {
      const pc = pcOf(co.address || "") || pcOf(co.postcode || "");
      const ll = pc ? await pcGeo(pc) : null;
      if (ll) home = { name: co.town || "Base", lat: ll.lat, lon: ll.lon };
    } catch (e) {}
    out.push(home || Object.assign({}, HOME, { name: co.town || HOME.name }));
    projectSites()
      .filter((s) => !isArchivedSite(s))
      .forEach((site) => {
        const sr = siteRec(site) || {};
        const cl = (S.clients || []).find((c) => c.site && same(c.site, site) && c.lat != null);
        const ll = sr.lat != null ? sr : cl;
        if (ll && ll.lat != null && out.length < 20)
          out.push({ name: siteLabel(site), site, lat: +ll.lat, lon: +ll.lon });
      });
    return out;
  }
  async function fetchAll(P) {
    const q =
      "https://api.open-meteo.com/v1/forecast?latitude=" +
      P.map((p) => p.lat.toFixed(3)).join(",") +
      "&longitude=" +
      P.map((p) => p.lon.toFixed(3)).join(",") +
      "&current=temperature_2m,weather_code,wind_speed_10m" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_gusts_10m_max" +
      "&timezone=Europe%2FLondon&forecast_days=10";
    const ctl = new AbortController();
    const tm = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(q, { signal: ctl.signal });
    clearTimeout(tm);
    if (!r.ok) throw new Error("weather " + r.status);
    const j = await r.json();
    return Array.isArray(j) ? j : [j];
  }
  async function tick(force) {
    if (busy || !S.db || !S.owner || S.client || S.preview) return;
    const fresh = (f, h) => f && f.at && Date.now() - f.at < h * 3600e3 && f.src !== "open-meteo";
    if (
      !force &&
      (fresh(S.wxFc, 6) ||
        (S.wxFc && S.wxFc.src === "open-meteo" && Date.now() - S.wxFc.at < 2.5 * 3600e3))
    )
      return;
    busy = true;
    try {
      const P = await places();
      const R = await fetchAll(P);
      const at = Date.now();
      const now = [],
        fc = [];
      P.forEach((p, i) => {
        const x = R[i];
        if (!x) return;
        const base = { name: p.name, lat: p.lat, lon: p.lon };
        if (p.site) base.site = p.site;
        if (x.current) {
          const [phrase, icon] = CODE(+x.current.weather_code);
          now.push(
            Object.assign({}, base, {
              temp: x.current.temperature_2m,
              /* km/h to mph */
              wind: Math.round((+x.current.wind_speed_10m || 0) * 0.621),
              icon,
              phrase,
            }),
          );
        }
        const d = x.daily || {};
        if (Array.isArray(d.time))
          fc.push(
            Object.assign({}, base, {
              key: "om-" + p.lat.toFixed(2) + "," + p.lon.toFixed(2),
              days: d.time.map((t, k) => ({
                d: t,
                phrase: CODE(+d.weather_code[k])[0],
                rain: d.precipitation_probability_max ? d.precipitation_probability_max[k] : null,
                mm: d.precipitation_sum ? d.precipitation_sum[k] : null,
                max: d.temperature_2m_max ? d.temperature_2m_max[k] : null,
                min: d.temperature_2m_min ? d.temperature_2m_min[k] : null,
                /* km/h, as the forecast records have always been */
                gust: d.wind_gusts_10m_max ? d.wind_gusts_10m_max[k] : null,
              })),
            }),
          );
      });
      if (now.length) {
        const w = { at, src: "open-meteo", places: now };
        await S.db.doc("settings/weather").set(w);
        S.wxFeed = w;
      }
      if (fc.length) {
        const f = { at, src: "open-meteo", places: fc };
        await S.db.doc("settings/forecast").set(f);
        S.wxFc = f;
      }
      try {
        refreshNowWx();
      } catch (e) {}
      if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))
        return;
      render();
    } catch (e) {
      /* no internet, or the fetch isn't allowed here – try again next time */
    } finally {
      busy = false;
    }
  }
  return { tick, CODE };
})();
function initOwnWeather() {
  setTimeout(() => OWX.tick(), 8000);
  setInterval(() => OWX.tick(), 30 * 60000);
}
