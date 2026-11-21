/* ================= MAP PEOPLE: on the sites map, how far a trade, person or company is from each job, the route, and your own rings ================= */
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { pcGeo, pcOf } from "./maps-pins.js";
import { smWorld } from "./sites-map.js";
export {
  SMP,
  smRings,
  smRingsOn,
  smpBarHtml,
  smpCardHtml,
  smpMiles,
  smpOverlay,
  smpRouteUrl,
  smpWire,
};
/* James (Nov 2026): "In site map allow a way to choose a company, trade or person to see how far out they are from the
   job and route. Also … put out how far out in rings from account holder address is". 🧭 Who's nearest: pick anyone on
   the team (their home postcode from My details) or a company (its address); they go on the map as 👷, each job pin
   says how far they are (as the crow flies, and roughly by road and in minutes), the nearest jobs are listed, and
   🚗 Route opens Google Maps from them to the job. ⭕ Rings: your own distances out from your base (Company details),
   e.g. 5, 10, 15, 25 miles, saved in settings/app.mapRings; switched off with Hide rings. Owner only – people's home
   postcodes never show to anyone else. */
const SMP = { who: "", ll: null, name: "", pc: "" };
const SMP_DEF_RINGS = [5, 10, 20];
const smRings = () => {
  const r = (S.settings || {}).mapRings;
  return Array.isArray(r) && r.length ? r.filter((x) => +x > 0).map(Number) : SMP_DEF_RINGS;
};
const smRingsOn = () => !S.f.smNoRings;
/* everyone who can be picked: the team (home postcode) and companies (address) */
function smpPeople() {
  const out = [];
  teamIds().forEach((w) => {
    const d = (S.team && S.team[w] && S.team[w].details) || {};
    const pc = pcOf(d.postcode || "") || pcOf(d.address || "");
    out.push({ k: "p:" + w, name: nameOf(w), sub: d.trade || "", pc, grp: "Your team" });
  });
  (S.firms || []).forEach((f) => {
    const pc = pcOf(f.postcode || "") || pcOf(f.address || "");
    out.push({
      k: "f:" + f.id,
      name: f.name || "Company",
      sub: f.trades || "",
      pc,
      grp: "Companies",
    });
  });
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
/* miles between two points as the crow flies */
function smpMiles(a, b) {
  const R = 3958.8,
    rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]),
    dLon = rad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/* roughly by road: a third longer than straight, at about 30 mph on Devon roads */
const smpRoad = (mi) => {
  const rd = mi * 1.3;
  return { rd, min: Math.max(2, Math.round((rd / 30) * 60)) };
};
const smpFmt = (mi) => (mi < 10 ? mi.toFixed(1) : Math.round(mi)) + " mi";
const smpRouteUrl = (from, toName) =>
  "https://www.google.com/maps/dir/?api=1&origin=" +
  encodeURIComponent(from) +
  "&destination=" +
  encodeURIComponent(toName) +
  "&travelmode=driving";
function smpBarHtml() {
  if (!ownerMode()) return "";
  const P = smpPeople();
  const grp = (g) =>
    P.filter((p) => p.grp === g)
      .map(
        (p) =>
          `<option value="${esc(p.k)}"${SMP.who === p.k ? " selected" : ""}${p.pc ? "" : " disabled"}>${esc(p.name)}${p.sub ? " – " + esc(p.sub) : ""}${p.pc ? "" : " (no postcode)"}</option>`,
      )
      .join("");
  return `<div class="smp-bar"><label for="smp-who">🧭 Who's nearest<select id="smp-who"><option value="">Pick a trade, person or company…</option><optgroup label="Your team">${grp("Your team")}</optgroup>${(S.firms || []).length ? `<optgroup label="Companies">${grp("Companies")}</optgroup>` : ""}</select></label>
    <button type="button" class="pillbtn" id="smp-rings">⭕ Rings: ${esc(smRings().join(", "))} mi</button><button type="button" class="pillbtn" id="smp-rtog" aria-pressed="${smRingsOn()}">${smRingsOn() ? "Hide rings" : "Show rings"}</button></div>
    <div id="smp-list"></div>`;
}
/* the nearest jobs to whoever is picked */
function smpListHtml(pts) {
  if (!SMP.ll) return "";
  const rows = pts
    .filter((p) => p.lat != null && p.k === "site")
    .map((p) => Object.assign({ p, mi: smpMiles(SMP.ll, [p.lat, p.lon]) }))
    .sort((a, b) => a.mi - b.mi)
    .slice(0, 8);
  if (!rows.length) return "";
  return `<section class="card smp-near"><div class="cardbody"><b>Nearest jobs to ${esc(SMP.name)}</b><div class="who">From ${esc(SMP.pc)}. Miles as the crow flies; by road roughly a third more.</div>
    ${rows
      .map((r) => {
        const rd = smpRoad(r.mi);
        return `<div class="smp-row"><span><b>${esc(r.p.name)}</b><small>${smpFmt(r.mi)} · about ${Math.round(rd.rd)} mi by road, ${rd.min} min</small></span><a class="pillbtn" href="${esc(smpRouteUrl(SMP.pc, r.p.pc || r.p.name))}" target="_blank" rel="noopener">🚗 Route</a></div>`;
      })
      .join("")}</div></section>`;
}
/* the person's pin and their line to the job open on the card */
function smpOverlay(x0, y0, z, sel) {
  if (!SMP.ll) return "";
  const [px, py] = smWorld(SMP.ll[0], SMP.ll[1], z);
  let h = `<span class="smp-pin" style="left:${Math.round(px - x0)}px;top:${Math.round(py - y0)}px" title="${esc(SMP.name)}">👷</span>`;
  if (sel && sel.lat != null) {
    const [sx, sy] = smWorld(sel.lat, sel.lon, z);
    const L = Math.min(px, sx) - x0,
      T = Math.min(py, sy) - y0,
      W = Math.abs(sx - px) || 1,
      H = Math.abs(sy - py) || 1;
    h += `<svg class="smp-line" style="left:${Math.round(L)}px;top:${Math.round(T)}px" width="${Math.round(W)}" height="${Math.round(H)}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><line x1="${px - x0 - L}" y1="${py - y0 - T}" x2="${sx - x0 - L}" y2="${sy - y0 - T}"/></svg>`;
  }
  return h;
}
/* on a job's card: how far the picked person is, and the route */
function smpCardHtml(p) {
  if (!SMP.ll || p.lat == null) return "";
  const mi = smpMiles(SMP.ll, [p.lat, p.lon]);
  const rd = smpRoad(mi);
  return `<div class="smp-card"><b>👷 ${esc(SMP.name)}</b>: ${smpFmt(mi)} away (about ${Math.round(rd.rd)} mi by road, ${rd.min} min) <a class="pillbtn" href="${esc(smpRouteUrl(SMP.pc, p.pc || p.name))}" target="_blank" rel="noopener">🚗 Route from ${esc(SMP.name.split(" ")[0])}</a></div>`;
}
function smpWire(redraw, pts) {
  if (!$("smp-who")) return;
  const list = () => ($("smp-list").innerHTML = smpListHtml(pts()));
  $("smp-who").onchange = async () => {
    const k = $("smp-who").value;
    const P = smpPeople().find((x) => x.k === k);
    SMP.who = k;
    SMP.ll = null;
    if (!P) {
      list();
      return redraw(false);
    }
    const ll = await pcGeo(P.pc);
    if (!ll) {
      toast("Couldn't find " + P.pc + " – check their postcode");
      return;
    }
    Object.assign(SMP, { ll: [ll.lat, ll.lon], name: P.name, pc: P.pc });
    list();
    redraw(true);
  };
  $("smp-rtog").onclick = () => {
    S.f.smNoRings = !S.f.smNoRings;
    $("smp-rtog").setAttribute("aria-pressed", String(smRingsOn()));
    $("smp-rtog").textContent = smRingsOn() ? "Hide rings" : "Show rings";
    redraw(false);
  };
  $("smp-rings").onclick = () =>
    openSheet(
      `<h3 id="sheettitle">⭕ Rings from your base</h3><div class="who">Circles on the map this far from your address in Company details. Put the miles with commas between.</div>
      <label for="smp-ri">Miles<input id="smp-ri" inputmode="decimal" value="${esc(smRings().join(", "))}" placeholder="e.g. 5, 10, 15, 25"></label>${formFoot(false, "Save rings")}`,
      async () => {
        const v = $("smp-ri")
          .value.split(/[,\s]+/)
          .map(Number)
          .filter((x) => x > 0 && x <= 500)
          .sort((a, b) => a - b)
          .slice(0, 8);
        if (!v.length) return showErr("Put at least one distance, e.g. 10");
        try {
          await S.db.doc("settings/app").update({ mapRings: v });
          S.settings = Object.assign({}, S.settings, { mapRings: v });
          closeForm();
          S.f.smNoRings = false;
          $("smp-rings").textContent = `⭕ Rings: ${v.join(", ")} mi`;
          $("smp-rtog").setAttribute("aria-pressed", "true");
          $("smp-rtog").textContent = "Hide rings";
          redraw(false);
        } catch (e) {
          showErr("Couldn't save. Check your connection.");
        }
      },
      "smp-ri",
    );
  list();
}
