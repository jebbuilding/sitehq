/* ================= TEAM MAP: where everyone lives, against head office, the jobs and the merchants ================= */
import { coHome } from "../core/company-names.js";
import { esc, toast } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { siteLabel } from "../sites/job-details.js";
import { smpMiles, smpRouteUrl } from "../sites/map-people.js";
import { pcGeo, pcOf } from "../sites/maps-pins.js";
import { smOpenWith } from "../sites/sites-map.js";
export { tmpOpen };
/* James (Nov 2026): "In employees allow me to have a map of where they live in relation to head office or jobs or
   merchants". Employees › 🗺️ Map of where everyone lives: a pin for each person from their home postcode (My details),
   your base 🏠 with your rings, and – picked along the top – the live jobs and the merchants too. Tap a person for how
   far they are from head office and their nearest job, with 🚗 Route. Owner only: home postcodes are private. Uses the
   same map as the sites (sites/sites-map.js › smOpenWith). */
async function tmpOpen() {
  if (!ownerMode()) return;
  toast("Finding everyone on the map…");
  const geo = async (pc) => (pc ? await pcGeo(pc) : null);
  const people = [];
  for (const w of teamIds()) {
    const d = (S.team && S.team[w] && S.team[w].details) || {};
    const pc = pcOf(d.postcode || "") || pcOf(d.address || "");
    const ll = await geo(pc);
    people.push({
      k: "person",
      st: "emp",
      name: nameOf(w),
      sub: d.trade || "",
      pc,
      lat: ll ? ll.lat : null,
      lon: ll ? ll.lon : null,
    });
  }
  const jobs = [];
  for (const s of (S.sites || []).filter((x) => !x.archived && x.name)) {
    let lat = s.lat != null ? +s.lat : null,
      lon = s.lon != null ? +s.lon : null;
    if (lat == null) {
      const ll = await geo(pcOf(s.name) || pcOf(s.address || ""));
      if (ll) [lat, lon] = [ll.lat, ll.lon];
    }
    jobs.push({
      k: "job",
      st: "live",
      name: s.name,
      pc: pcOf(s.name) || pcOf(s.address || ""),
      lat,
      lon,
    });
  }
  const mers = [];
  for (const m of S.suppliers || []) {
    const pc = pcOf(m.postcode || "") || pcOf(m.address || "");
    const ll = m.lat != null ? { lat: +m.lat, lon: +m.lon } : await geo(pc);
    mers.push({
      k: "mer",
      st: "mer",
      name: m.name || "Merchant",
      pc,
      lat: ll ? ll.lat : null,
      lon: ll ? ll.lon : null,
    });
  }
  const home = coHome();
  const nearest = (p, list) =>
    list
      .filter((x) => x.lat != null)
      .map((x) => [x, smpMiles([p.lat, p.lon], [x.lat, x.lon])])
      .sort((a, b) => a[1] - b[1])[0];
  const fmt = (mi) => (mi < 10 ? mi.toFixed(1) : Math.round(mi)) + " mi";
  smOpenWith({
    title: "🗺️ Where everyone lives",
    label: "Map of where the team lives, with head office, the jobs and the merchants",
    pts: people.concat(jobs, mers),
    segs: [
      ["people", "Just the team"],
      ["jobs", "Team and jobs"],
      ["mers", "Team and merchants"],
      ["all", "Everything"],
    ],
    f: "jobs",
    show: (p, f) =>
      p.k === "person" ||
      f === "all" ||
      (f === "jobs" && p.k === "job") ||
      (f === "mers" && p.k === "mer"),
    keyHtml: `<span><i class="tmp-dot tmp-emp"></i> Where someone lives</span><span><i class="tmp-dot tmp-job"></i> Live job</span><span><i class="tmp-dot tmp-mer"></i> Merchant</span><span>🏠 Head office</span>${
      people.some((p) => p.lat == null)
        ? `<span class="who">Not on the map (no home postcode): ${esc(
            people
              .filter((p) => p.lat == null)
              .map((p) => p.name)
              .join(", "),
          )}</span>`
        : ""
    }`,
    card: (p) => {
      if (p.k !== "person")
        return `<b>${esc(p.name)}</b><div class="who">${p.k === "job" ? "Live job" : "Merchant"}${p.pc ? " · " + esc(p.pc) : ""}</div>`;
      const ho = home ? smpMiles([p.lat, p.lon], home) : null;
      const nj = nearest(p, jobs);
      const nm = nearest(p, mers);
      return `<b>${esc(p.name)}</b><div class="who">${p.sub ? esc(p.sub) + " · " : ""}lives near ${esc(p.pc)}</div>
        ${ho != null ? `<div class="drow"><span>🏠 Head office</span><b>${fmt(ho)}</b></div>` : ""}
        ${nj ? `<div class="drow"><span>Nearest job: ${esc(siteLabel(nj[0].name))}</span><b>${fmt(nj[1])}</b></div>` : ""}
        ${nm ? `<div class="drow"><span>Nearest merchant: ${esc(nm[0].name)}</span><b>${fmt(nm[1])}</b></div>` : ""}
        <div class="actions">${nj ? `<a class="btn" href="${esc(smpRouteUrl(p.pc, nj[0].pc || nj[0].name))}" target="_blank" rel="noopener">🚗 Route to ${esc(siteLabel(nj[0].name))}</a>` : ""}</div>`;
    },
  });
}
