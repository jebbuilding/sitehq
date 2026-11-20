/* ================= SITES MAP: every site and job on one map you can drag and zoom ================= */
import { viewClient } from "../clients/quick-enquiry.js";
import { coHome } from "../core/company-names.js";
import { $, esc } from "../core/helpers.js";
import { S, isArchivedSite } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { siteRec } from "../photos/photos.js";
import { goSite } from "./go-site.js";
import { gmapDir, pcGeo, pcOf } from "./maps-pins.js";
import { projectSites } from "./project-pages.js";
import { siteClient } from "./summary.js";
import { ukMap } from "./uk-map-data.js";
export { smOpen, smOpenWith };
/* OpenStreetMap tiles drawn by hand (no map library): drag to move, + / − or pinch / the wheel to zoom. A pin for each
   site – live jobs red, finished (archived) grey – and each enquiry with a location blue. A site's place is its own
   pin, else its client's, else its postcode (looked up once with postcodes.io and remembered for this visit). Tap a
   pin for the site, the client, Open the site and Directions. Sites with no postcode are listed under the map. */
const SM = { z: 10, x: 0, y: 0, pts: [], el: null, sel: "" };
const smWorld = (lat, lon, z) => {
  const n = 256 * Math.pow(2, z);
  const lr = (lat * Math.PI) / 180;
  return [
    ((lon + 180) / 360) * n,
    ((1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2) * n,
  ];
};
/* where each site and enquiry is */
function smPoints() {
  const out = [];
  const seen = new Set();
  const all = [...new Set(projectSites().concat((S.sites || []).map((s) => s.name)))].filter(
    Boolean,
  );
  all.forEach((n) => {
    if (seen.has(n.toLowerCase())) return;
    seen.add(n.toLowerCase());
    const sr = siteRec(n) || {};
    const c = siteClient(n);
    const lat = sr.lat != null ? +sr.lat : c && c.lat != null ? +c.lat : null;
    const lon = sr.lat != null ? +sr.lon : c && c.lat != null ? +c.lon : null;
    out.push({
      k: "site",
      name: n,
      st: isArchivedSite(n) ? "done" : "live",
      client: c ? c.name : "",
      cid: c ? c.id : "",
      lat,
      lon,
      pc:
        pcOf(n) ||
        pcOf(sr.address || "") ||
        (c ? pcOf(c.postcode || "") || pcOf(c.address || "") : ""),
    });
  });
  (S.clients || [])
    .filter((c) => c.stage === "enquiry" && c.lat != null)
    .forEach((c) =>
      out.push({
        k: "enq",
        name: c.name,
        st: "enq",
        client: c.name,
        cid: c.id,
        lat: +c.lat,
        lon: +c.lon,
        pc: "",
        work: c.work || "",
      }),
    );
  return out;
}
/* the built-in map (sites/uk-map-data.js) for when the map pictures can't load: land, sea and the places, more of
   them the closer you zoom in, never two names on top of each other */
function smBase(x0, y0, W, H, z) {
  let m;
  try {
    m = ukMap();
  } catch (e) {
    return "";
  }
  const paths = m.rings
    .map((r) => {
      let d = "",
        any = false;
      for (let i = 0; i < r.length; i++) {
        const [px, py] = smWorld(r[i][1], r[i][0], z);
        const X = px - x0,
          Y = py - y0;
        if (X > -W && X < 2 * W && Y > -H && Y < 2 * H) any = true;
        d += (i ? "L" : "M") + X.toFixed(1) + " " + Y.toFixed(1);
      }
      return any ? `<path d="${d}Z"/>` : "";
    })
    .join("");
  /* main roads: motorways from far out, A roads closer in, other main roads closer still; a road's number once */
  const maxRoad = z <= 6 ? 1 : z <= 8 ? 2 : 3;
  const named = new Set();
  let roadLabels = "";
  const roads = (m.roads || [])
    .filter((r) => r[0] <= maxRoad)
    .map(([cls, ref, pts]) => {
      let d = "",
        any = false,
        mid = null;
      pts.forEach(([lon, lat], i) => {
        const [px, py] = smWorld(lat, lon, z);
        const X = px - x0,
          Y = py - y0;
        if (X > -50 && X < W + 50 && Y > -50 && Y < H + 50) {
          any = true;
          if (!mid && X > 30 && X < W - 30 && Y > 20 && Y < H - 20) mid = [X, Y];
        }
        d += (i ? "L" : "M") + X.toFixed(1) + " " + Y.toFixed(1);
      });
      if (!any) return "";
      if (ref && mid && z >= 8 && !named.has(ref)) {
        named.add(ref);
        roadLabels += `<span class="sm-rd r${cls}" style="left:${Math.round(mid[0])}px;top:${Math.round(mid[1])}px">${esc(ref)}</span>`;
      }
      return `<path class="r${cls}" d="${d}"/>`;
    })
    .join("");
  const maxTier = z <= 7 ? 1 : z <= 8 ? 2 : z <= 10 ? 3 : 4;
  const used = new Set();
  let labels = "";
  for (const [nm, lat, lon, tier] of m.places) {
    if (tier > maxTier) continue;
    const [px, py] = smWorld(lat, lon, z);
    const X = px - x0,
      Y = py - y0;
    if (X < 0 || Y < 0 || X > W || Y > H) continue;
    const k = Math.floor(X / 90) + ":" + Math.floor(Y / 20);
    if (used.has(k)) continue;
    used.add(k);
    labels += `<span class="sm-pl t${tier}" style="left:${Math.round(X)}px;top:${Math.round(Y)}px">${esc(nm)}</span>`;
  }
  return `<svg class="sm-land" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${paths}<g class="sm-roads">${roads}</g></svg>${roadLabels}${labels}`;
}
/* towns to name when there are no map pictures: the ones given (cfg.towns), else each pin's own town */
function smTowns() {
  if (SM.cfg && SM.cfg.towns) return SM.cfg.towns;
  return [];
}
/* the same map for other things (James, Nov 2026: the planning leads). cfg: { title, label, pts [{lat, lon, st,
   name}], segs [[key, label]], f (the chosen seg), show(p, f), keyHtml, card(p) → html, wire(p, cardEl) } */
function smOpenWith(cfg) {
  SM.cfg = cfg;
  SM.pts = cfg.pts;
  SM.sel = "";
  openViewer(`<div class="sm-page"><h2>${esc(cfg.title)}</h2>
    <div class="seg" id="sm-f">${cfg.segs.map(([k, l]) => `<button type="button" data-v="${esc(k)}" aria-pressed="${cfg.f === k}">${esc(l)}</button>`).join("")}</div>
    <div class="sm-key">${cfg.keyHtml || ""}</div>
    <div class="sm-map" id="sm-map" role="application" aria-label="${esc(cfg.label || cfg.title)}. Drag to move, use + and − to zoom."><div class="sm-tiles"></div><div class="sm-back"></div><div class="sm-pins"></div>
      <div class="sm-zoom"><button type="button" class="iconbtn" id="sm-in" aria-label="Zoom in">+</button><button type="button" class="iconbtn" id="sm-out" aria-label="Zoom out">−</button><button type="button" class="iconbtn" id="sm-fit" aria-label="Show them all">⤢</button></div>
      <span class="sm-attr">© OpenStreetMap · places GeoNames</span><div class="sm-card" id="sm-card" hidden></div></div>
    <div id="sm-none"></div><div class="who" id="sm-count"></div>
  </div>`);
  SM.el = $("sm-map");
  $("sm-f")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          cfg.f = b.dataset.v;
          $("sm-f")
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          $("sm-card").hidden = true;
          smFit();
        }),
    );
  $("sm-in").onclick = () => smZoom(1);
  $("sm-out").onclick = () => smZoom(-1);
  $("sm-fit").onclick = smFit;
  smWire();
  smFit();
}
function smOpen() {
  SM.cfg = null;
  SM.pts = smPoints();
  SM.sel = "";
  const f = S.f.smf || "live";
  openViewer(`<div class="sm-page"><h2>🗺️ Your sites</h2>
    <div class="seg" id="sm-f">${[
      ["all", "Everything"],
      ["live", "Live jobs"],
      ["done", "Finished"],
      ["enq", "Enquiries"],
    ]
      .map(
        ([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${f === k}">${l}</button>`,
      )
      .join("")}</div>
    <div class="sm-key"><span><i class="sm-dot live"></i> Live job</span><span><i class="sm-dot done"></i> Finished</span><span><i class="sm-dot enq"></i> Enquiry</span></div>
    <div class="sm-map" id="sm-map" role="application" aria-label="Map of your sites. Drag to move, use + and − to zoom."><div class="sm-tiles"></div><div class="sm-back"></div><div class="sm-pins"></div>
      <div class="sm-zoom"><button type="button" class="iconbtn" id="sm-in" aria-label="Zoom in">+</button><button type="button" class="iconbtn" id="sm-out" aria-label="Zoom out">−</button><button type="button" class="iconbtn" id="sm-fit" aria-label="Show all">⤢</button></div>
      <span class="sm-attr">© OpenStreetMap</span><div class="sm-card" id="sm-card" hidden></div></div>
    <div id="sm-none"></div>
  </div>`);
  SM.el = $("sm-map");
  $("sm-f")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.smf = b.dataset.v;
          $("sm-f")
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          smFit();
        }),
    );
  $("sm-in").onclick = () => smZoom(1);
  $("sm-out").onclick = () => smZoom(-1);
  $("sm-fit").onclick = smFit;
  smWire();
  smFit();
  /* look up the postcodes of sites with no pin, then show them */
  (async () => {
    let got = 0;
    for (const p of SM.pts.filter((x) => x.lat == null && x.pc)) {
      const ll = await pcGeo(p.pc);
      if (ll) {
        p.lat = ll.lat;
        p.lon = ll.lon;
        got++;
      }
    }
    if (got && SM.el && document.body.contains(SM.el)) smFit();
  })();
}
const smShown = () => {
  if (SM.cfg) return SM.pts.filter((p) => p.lat != null && SM.cfg.show(p, SM.cfg.f));
  const f = S.f.smf || "live";
  return SM.pts.filter((p) => p.lat != null && (f === "all" || p.st === f));
};
/* zoom and centre to show every pin */
function smFit() {
  const pts = smShown();
  const W = SM.el.clientWidth || 600,
    H = SM.el.clientHeight || 420;
  if (!pts.length) {
    /* nothing to show yet: over the company's own place, else the whole of the UK */
    const h = coHome();
    SM.z = h ? 10 : 6;
    [SM.x, SM.y] = h ? smWorld(h[0], h[1], SM.z) : smWorld(54.2, -2.6, SM.z);
  } else {
    let z = 16;
    for (; z > 3; z--) {
      const xy = pts.map((p) => smWorld(p.lat, p.lon, z));
      const xs = xy.map((a) => a[0]),
        ys = xy.map((a) => a[1]);
      if (Math.max(...xs) - Math.min(...xs) < W - 80 && Math.max(...ys) - Math.min(...ys) < H - 90)
        break;
    }
    SM.z = Math.min(z, 15);
    const xy = pts.map((p) => smWorld(p.lat, p.lon, SM.z));
    SM.x = (Math.min(...xy.map((a) => a[0])) + Math.max(...xy.map((a) => a[0]))) / 2;
    SM.y = (Math.min(...xy.map((a) => a[1])) + Math.max(...xy.map((a) => a[1]))) / 2;
  }
  smDraw();
  if (SM.cfg) {
    const n = smShown().length,
      off = SM.pts.filter((p) => p.lat == null && SM.cfg.show(p, SM.cfg.f)).length;
    $("sm-count").textContent = n + " on the map" + (off ? ` · ${off} with no known place` : "");
    return;
  }
  const none = SM.pts.filter((p) => p.k === "site" && p.lat == null);
  $("sm-none").innerHTML = none.length
    ? `<div class="who">Not on the map (no pin or postcode): ${none.map((p) => esc(p.name)).join(", ")}. Add the postcode to the site's name or address, or drop a pin on the site page.</div>`
    : "";
}
function smZoom(d, ax, ay) {
  const z2 = Math.max(3, Math.min(18, SM.z + d));
  if (z2 === SM.z) return;
  const W = SM.el.clientWidth,
    H = SM.el.clientHeight;
  /* keep the point under the finger (or the middle) where it is */
  const fx = ax == null ? W / 2 : ax,
    fy = ay == null ? H / 2 : ay;
  const wx = SM.x - W / 2 + fx,
    wy = SM.y - H / 2 + fy;
  const k = Math.pow(2, z2 - SM.z);
  SM.x = wx * k - (fx - W / 2);
  SM.y = wy * k - (fy - H / 2);
  SM.z = z2;
  smDraw();
}
function smDraw() {
  const el = SM.el;
  if (!el) return;
  const W = el.clientWidth,
    H = el.clientHeight;
  const z = SM.z,
    n = Math.pow(2, z);
  const x0 = SM.x - W / 2,
    y0 = SM.y - H / 2;
  let t = "";
  for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + W) / 256); tx++)
    for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + H) / 256); ty++) {
      if (ty < 0 || ty >= n) continue;
      const X = ((tx % n) + n) % n;
      t += `<img src="https://tile.openstreetmap.org/${z}/${X}/${ty}.png" alt="" draggable="false" style="left:${Math.round(tx * 256 - x0)}px;top:${Math.round(ty * 256 - y0)}px">`;
    }
  el.querySelector(".sm-tiles").innerHTML = t;
  /* the map's own background: rings 5, 10 and 20 miles from your base, your base, and – when the map pictures can't
     load (the claude.ai copy blocks pictures from other websites; James, Nov 2026: "the map … is blank") – the towns */
  const home = coHome();
  let bk = "";
  if (home) {
    const [hx, hy] = smWorld(home[0], home[1], z);
    const mpp = (156543.03 * Math.cos((home[0] * Math.PI) / 180)) / n;
    [5, 10, 20].forEach((mi) => {
      const r = (mi * 1609.34) / mpp;
      if (r < 12 || r > 4000) return;
      bk += `<span class="sm-ring" style="left:${Math.round(hx - x0 - r)}px;top:${Math.round(hy - y0 - r)}px;width:${Math.round(2 * r)}px;height:${Math.round(2 * r)}px"><i>${mi} mi</i></span>`;
    });
    bk += `<span class="sm-home" style="left:${Math.round(hx - x0)}px;top:${Math.round(hy - y0)}px" title="Your base">🏠</span>`;
  }
  if (SM.noTiles) bk = smBase(x0, y0, W, H, z) + bk;
  if (SM.noTiles && !bk.includes("sm-land"))
    smTowns().forEach((tw) => {
      const [tx2, ty2] = smWorld(tw.lat, tw.lon, z);
      bk += `<span class="sm-town" style="left:${Math.round(tx2 - x0)}px;top:${Math.round(ty2 - y0)}px">${esc(tw.t)}</span>`;
    });
  el.querySelector(".sm-back").innerHTML = bk;
  el.classList.toggle("sm-plain", !!SM.noTiles);
  const im = el.querySelector(".sm-tiles img");
  if (im && SM.noTiles == null) {
    im.onerror = () => {
      SM.noTiles = true;
      smDraw();
    };
    im.onload = () => (SM.noTiles = false);
  }
  el.querySelector(".sm-pins").innerHTML = smShown()
    .map((p, i) => {
      const [px, py] = smWorld(p.lat, p.lon, z);
      const L = px - x0,
        T = py - y0;
      if (L < -30 || T < -40 || L > W + 30 || T > H + 40) return "";
      return `<button type="button" class="sm-pin ${p.st}${SM.sel === p.name ? " on" : ""}" data-i="${i}" style="left:${Math.round(L)}px;top:${Math.round(T)}px" aria-label="${esc(p.name)}${p.client && p.client !== p.name ? " – " + esc(p.client) : ""}"><svg viewBox="0 0 24 34" width="26" height="36" aria-hidden="true"><path d="M12 33s11-12.4 11-21A11 11 0 0 0 1 12c0 8.6 11 21 11 21z" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="#fff"/></svg></button>`;
    })
    .join("");
  const shown = smShown();
  el.querySelectorAll(".sm-pin").forEach(
    (b) =>
      (b.onclick = (ev) => {
        ev.stopPropagation();
        smCard(shown[+b.dataset.i]);
      }),
  );
}
function smCard(p) {
  SM.sel = p.name;
  const c = $("sm-card");
  c.hidden = false;
  if (SM.cfg) {
    c.innerHTML =
      `<button type="button" class="iconbtn sm-x" aria-label="Close">✕</button>` + SM.cfg.card(p);
    c.querySelector(".sm-x").onclick = () => {
      c.hidden = true;
      SM.sel = "";
      smDraw();
    };
    if (SM.cfg.wire) SM.cfg.wire(p, c);
    smDraw();
    return;
  }
  c.innerHTML = `<button type="button" class="iconbtn sm-x" aria-label="Close">✕</button><b>${esc(p.name)}</b>
    <div class="who">${p.st === "live" ? "Live job" : p.st === "done" ? "Finished" : "Enquiry"}${p.client && p.client !== p.name ? " · " + esc(p.client) : ""}${p.work ? " · " + esc(p.work) : ""}</div>
    <div class="actions">${p.k === "site" ? `<button type="button" class="btn primary" id="sm-go">Open the site</button>` : `<button type="button" class="btn primary" id="sm-cl">Open the enquiry</button>`}<a class="btn" href="${esc(gmapDir(p.lat + "," + p.lon))}" target="_blank" rel="noopener">🚗 Directions</a></div>`;
  c.querySelector(".sm-x").onclick = () => {
    c.hidden = true;
    SM.sel = "";
    smDraw();
  };
  if ($("sm-go"))
    $("sm-go").onclick = () => {
      goSite(p.name);
    };
  if ($("sm-cl"))
    $("sm-cl").onclick = () => {
      const cl = (S.clients || []).find((x) => x.id === p.cid);
      if (cl) viewClient(cl);
    };
  smDraw();
}
/* dragging, the wheel and pinching */
function smWire() {
  const el = SM.el;
  const ptrs = new Map();
  let last = null,
    pinch = 0,
    moved = 0;
  el.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".sm-zoom, .sm-card, .sm-pin")) return;
    el.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    last = [e.clientX, e.clientY];
    moved = 0;
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch = Math.hypot(a[0] - b[0], a[1] - b[1]);
    }
  });
  el.addEventListener("pointermove", (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch && Math.abs(Math.log2(d / pinch)) >= 0.6) {
        const r = el.getBoundingClientRect();
        smZoom(d > pinch ? 1 : -1, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
        pinch = d;
      }
      return;
    }
    if (!last) return;
    SM.x -= e.clientX - last[0];
    SM.y -= e.clientY - last[1];
    moved += Math.abs(e.clientX - last[0]) + Math.abs(e.clientY - last[1]);
    last = [e.clientX, e.clientY];
    smDraw();
  });
  const up = (e) => {
    ptrs.delete(e.pointerId);
    if (!ptrs.size) last = null;
    pinch = 0;
  };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  el.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      smZoom(e.deltaY < 0 ? 1 : -1, e.clientX - r.left, e.clientY - r.top);
    },
    { passive: false },
  );
  void moved;
}
