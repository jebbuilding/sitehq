// The two routes the public website (jebbuilding.co.uk) calls, with nobody signed in:
//
//   POST /api/public/enquiry   the contact form: one document in webenq/<id>, which pops up in the owner's app
//   POST /api/public/hit       one page view: added to that day's counts in webstats/<yyyy-mm-dd>; or, as they
//                              leave the page, the seconds they spent on it
//
// Both only ever write into owner-only collections (nobody can read anything through them) and answer the same
// short "ok" whatever happens, so they tell a caller nothing. No cookies, no IP addresses and nothing that
// identifies a visitor is stored: a page view is counted, not recorded. A filled-in hidden field (the form's
// honeypot) is thanked and thrown away, and there is a cap on enquiries a day, so a bot can't flood the owner.
// The website is on another address, so the answers allow any origin (there is nothing to read in them).
import { randomBytes } from "node:crypto";

export const MAX_ENQUIRIES_A_DAY = 60;
const MAX_BODY = 16 * 1024;
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
  "cache-control": "no-store",
};
const OK = { status: 200, headers: { "content-type": "application/json; charset=utf-8", ...CORS }, body: '{"ok":true}' };
const PAGE = /^\/[\w\-./]{0,79}$/;
const HOST = /^[a-z0-9.-]{1,60}$/;

const clean = (v, n) =>
  String(v == null ? "" : v)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, n);
const today = (now) => new Date(now).toISOString().slice(0, 10);

/** The form arrives as JSON, or as the browser's own form encoding (the form also works with no script). */
function readBody(req) {
  if (!req.body || !req.body.length || req.body.length > MAX_BODY) return null;
  const text = req.body.toString("utf8");
  const type = String(req.headers["content-type"] || "");
  try {
    if (/x-www-form-urlencoded/.test(type)) return Object.fromEntries(new URLSearchParams(text));
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch (e) {
    return null;
  }
}

/** Add `n` (1 unless given) to a count in a map, keeping the map to `max` keys (the rest go under "other"). */
function bump(map, key, max, n = 1) {
  const m = map && typeof map === "object" ? map : {};
  const k = key in m || Object.keys(m).length < max ? key : "other";
  m[k] = (m[k] || 0) + n;
  return m;
}
/** The visitor's town or area, as the hosting (CloudFront) works it out from the connection – only the name is kept. */
function placeOf(headers) {
  let v = "";
  for (const h of ["cloudfront-viewer-city", "cloudfront-viewer-country-region-name", "cloudfront-viewer-country-name"])
    if (headers[h]) {
      v = String(headers[h]);
      break;
    }
  try {
    v = decodeURIComponent(v);
  } catch (e) {}
  return /^[\p{L} .'-]{1,40}$/u.test(v) ? v : "";
}

/**
 * @param deps.store    document store
 * @param deps.changed  (path) => tell the owner's open app something changed
 * @param deps.now      () => ms, for tests
 */
export function createPublic({ store, changed, now = () => Date.now() }) {
  async function enquiry(b) {
    if (clean(b["company-website"] || b.hp, 200)) return OK; // the honeypot: only bots fill it in
    const e = {
      name: clean(b.name, 80),
      email: clean(b.email, 120),
      phone: clean(b.phone, 30),
      location: clean(b.location, 120),
      type: clean(b["project-type"] || b.type, 80),
      message: clean(b.message, 4000),
      page: PAGE.test(String(b.page || "")) ? String(b.page) : "",
    };
    if (!e.name || (!e.email && !e.phone)) return OK;
    if (e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email)) e.email = "";
    const t = now(), day = today(t);
    const stats = (await store.get("webstats", day)) || {};
    if ((stats.enquiries || 0) >= MAX_ENQUIRIES_A_DAY) return OK;
    const id = "w" + t.toString(36) + randomBytes(4).toString("hex");
    await store.set("webenq", id, Object.assign(e, { at: t, status: "new" }));
    await store.update("webstats", day, { enquiries: (stats.enquiries || 0) + 1 });
    await changed("webenq/" + id);
    await changed("webstats/" + day);
    return OK;
  }

  async function hit(b, headers) {
    const page = PAGE.test(String(b.p || "")) ? String(b.p).replace(/\/index\.html$/, "/") : "other";
    /* the time someone spent on a page, sent as they leave it */
    if (b.s != null) {
      const secs = Math.round(+b.s);
      if (!(secs >= 1 && secs <= 1800)) return OK;
      const day0 = today(now());
      const s0 = (await store.get("webstats", day0)) || {};
      await store.update("webstats", day0, {
        secs: bump(s0.secs, page, 150, secs),
        secsN: bump(s0.secsN, page, 150),
        visitSecs: (s0.visitSecs || 0) + secs,
      });
      await changed("webstats/" + day0);
      return OK;
    }
    const ref = HOST.test(String(b.r || "").toLowerCase()) ? String(b.r).toLowerCase().replace(/^www\./, "") : "";
    const day = today(now());
    const s = (await store.get("webstats", day)) || {};
    const next = {
      views: (s.views || 0) + 1,
      visits: (s.visits || 0) + (b.n ? 1 : 0),
      pages: bump(s.pages, page, 150),
      dev: bump(s.dev, b.m ? "phone" : "computer", 3),
    };
    if (b.n) {
      next.refs = bump(s.refs, ref || "direct", 60);
      next.entry = bump(s.entry, page, 150);
      const place = placeOf(headers || {});
      if (place) next.places = bump(s.places, place, 80);
    }
    await store.update("webstats", day, next);
    await changed("webstats/" + day);
    return OK;
  }

  return async function handle(req) {
    if (req.method === "OPTIONS") return { status: 204, headers: CORS, body: null };
    if (req.method !== "POST") return OK;
    const b = readBody(req);
    if (!b) return OK;
    try {
      if (req.path === "/api/public/enquiry") return await enquiry(b);
      if (req.path === "/api/public/hit") return await hit(b, req.headers || {});
    } catch (e) {
      console.error("public: failed:", e && e.name);
    }
    return OK;
  };
}
