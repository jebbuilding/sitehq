/* ================= TRADES' SIGN IN BY LOCATION: on Today and Sites, the phone finds the site you're at and signs you in with one tap ================= */
import { $, esc, iso, store } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { SIGNIN, signOnly } from "../sites/sign-in-book.js";
import { otmAsk } from "../timesheets/overtime.js";
import { checkInAt, checkOut } from "../timesheets/time.js";
export { tsiCardHtml, tsiSitesTop, tsiWire };
/* James (Nov 2026): signing in goes on the trades' Today and in Sites, using the phone's location so it's easy. The
   card asks the phone where it is (once every few minutes, not on every screen), finds the nearest site that has a
   pin on the map (Sites › the site's 📍 location, sites/{id}.lat/lon) and offers "Sign in at <site>". Further than
   TSI_NEAR_M away, or no location, it lists the sites to pick from. Signed in, it shows where and since when, with
   Sign out. The sign-in itself is the plain site sign-in book (sites/sign-in-book.js, SIGNIN.signIn). */
const TSI_NEAR_M = 500;
let tsiPos = null; /* {lat, lon, at} or {err, at} */
let tsiAsking = false;
/* metres between two points */
function tsiDist(a, b) {
  const R = 6371000,
    r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r,
    dLon = (b.lon - a.lon) * r;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const tsiSites = () => (S.sites || []).filter((x) => x.name && !x.archived);
/* the nearest site with a map pin, and how far */
function tsiNearest() {
  if (!tsiPos || tsiPos.lat == null) return null;
  let best = null;
  tsiSites()
    .filter((x) => x.lat != null && x.lon != null)
    .forEach((x) => {
      const d = tsiDist(tsiPos, { lat: +x.lat, lon: +x.lon });
      if (!best || d < best.d) best = { site: x.name, d };
    });
  return best;
}
/* signed in now: a timesheet check-in (most trades) or a plain sign-in (people set to sign-in only) */
const tsiTs = () => !signOnly(S.me);
const tsiEntry = () =>
  (S.mine.entries || []).find((e) => e.open && e.type === "hours" && e.date === iso(new Date()));
const tsiOpen = () => {
  const e = tsiTs() && tsiEntry();
  if (e) return { site: e.job, in: e.actualIn || e.start, entry: e };
  return (S.mine.signins || []).find((x) => x.date === iso(new Date()) && x.open);
};
/* today's finished timesheet day, for "Worked different hours today?" after signing out */
const tsiDone = () =>
  tsiTs() &&
  (S.mine.entries || [])
    .filter((e) => !e.open && e.type === "hours" && e.date === iso(new Date()) && e.checkIn)
    .pop();
const tsiIn = (site) => (tsiTs() ? checkInAt(site) : SIGNIN.signIn(site));
function tsiLocate(force) {
  if (tsiAsking) return;
  if (!force && tsiPos && Date.now() - tsiPos.at < 5 * 60e3) return;
  if (!navigator.geolocation) {
    tsiPos = { err: "none", at: Date.now() };
    return;
  }
  tsiAsking = true;
  /* the phone may wait for a yes to "use your location": give up after 20 seconds and offer Try again */
  const t0 = Date.now();
  setTimeout(() => {
    if (tsiAsking && Date.now() - t0 >= 19000) {
      tsiAsking = false;
      tsiPos = { err: "failed", at: Date.now() };
      tsiRefresh();
    }
  }, 20000);
  navigator.geolocation.getCurrentPosition(
    (p) => {
      tsiAsking = false;
      tsiPos = { lat: p.coords.latitude, lon: p.coords.longitude, at: Date.now() };
      tsiRefresh();
    },
    (e) => {
      tsiAsking = false;
      tsiPos = { err: e && e.code === 1 ? "denied" : "failed", at: Date.now() };
      tsiRefresh();
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
  );
}
/* redraw just the card, wherever it is on the page */
function tsiRefresh() {
  const c = $("tsi-card");
  if (!c) return;
  c.outerHTML = tsiCardHtml();
  tsiWire();
}
function tsiCardHtml() {
  const open = tsiOpen();
  let body;
  if (open)
    body = `<div class="tsi-st"><b>✅ Signed in at ${esc(open.site)}</b><span class="who">Since ${esc(open.in || "")} today${open.entry && open.entry.start !== open.in ? " · paid from " + esc(open.entry.start) : ""}</span></div>
      <button type="button" class="btn danger nl-wide" id="tsi-out">Sign out</button>${open.entry ? `<button type="button" class="pillbtn" id="tsi-diff">⏱ Started early or working through lunch?</button>` : ""}`;
  else {
    const n = tsiNearest();
    const sites = tsiSites().map((x) => x.name);
    const pick = `<label class="tsi-pick" for="tsi-site">Or choose the site<select id="tsi-site"><option value="">Choose…</option>${sites.map((s) => `<option${n && s === n.site ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></label>`;
    if (n && n.d <= TSI_NEAR_M)
      body = `<div class="tsi-st"><span class="who">📡 You're at</span><b>${esc(n.site)}</b><span class="who">${Math.round(n.d)} m away</span></div>
        <button type="button" class="btn primary nl-wide" id="tsi-in" data-site="${esc(n.site)}">📍 Sign in at ${esc(n.site)}</button>${pick}`;
    else if (!tsiPos || tsiAsking) body = `<div class="who">📡 Finding where you are…</div>${pick}`;
    else
      body = `<div class="who">${tsiPos.err === "denied" ? "📡 Location is turned off for this app – choose the site instead." : tsiPos.err ? "📡 Couldn't find where you are – choose the site instead." : "📡 You're not at one of our sites yet – choose it below."}</div>${pick}<button type="button" class="btn nl-wide" id="tsi-again">📡 Try again</button>`;
  }
  const dn = !open && tsiDone();
  if (dn && !dn.ot)
    body =
      `<div class="who">✓ Signed out today – paid ${esc(dn.start)}–${esc(dn.finish)}.</div><button type="button" class="pillbtn" id="tsi-diff">⏱ Worked different hours today?</button>` +
      body;
  return `<section class="nl-card" id="tsi-card"><div class="nl-cardh"><h2>📍 Sign in</h2><button type="button" class="pillbtn" id="tsi-book">Past sign-ins</button></div>${body}</section>`;
}
function tsiWire() {
  if ($("tsi-in"))
    $("tsi-in").onclick = async () => {
      $("tsi-in").disabled = true;
      await tsiIn($("tsi-in").dataset.site);
      tsiRefresh();
    };
  if ($("tsi-site"))
    $("tsi-site").onchange = async () => {
      const s = $("tsi-site").value;
      if (!s) return;
      await tsiIn(s);
      tsiRefresh();
    };
  if ($("tsi-out"))
    $("tsi-out").onclick = async () => {
      $("tsi-out").disabled = true;
      const o = tsiOpen();
      if (o && o.entry) await checkOut(o.entry);
      else await SIGNIN.signOut(o);
      tsiRefresh();
    };
  if ($("tsi-diff"))
    $("tsi-diff").onclick = () => {
      const o = tsiOpen();
      otmAsk((o && o.entry) || tsiDone());
    };
  if ($("tsi-again"))
    $("tsi-again").onclick = () => {
      tsiPos = null;
      tsiLocate(true);
      tsiRefresh();
    };
  if ($("tsi-book"))
    $("tsi-book").onclick = () => {
      S.tab = "signin";
      store.set("jeb.tab", "signin");
      render();
      window.scrollTo(0, 0);
    };
  if (!tsiOpen()) tsiLocate(false);
}
/* the card at the top of the trades' Sites page */
function tsiSitesTop() {
  if (!$("main") || $("tsi-card")) return;
  $("main").insertAdjacentHTML("afterbegin", tsiCardHtml());
  tsiWire();
}
