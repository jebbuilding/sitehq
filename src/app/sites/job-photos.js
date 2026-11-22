/* ================= JOB PHOTOS: filter a job's photos by date, who took them and stage, and choose which ones the client sees ================= */
import { clientSites } from "../clients/address-book.js";
import { ptCl, ptOf, ptSrc } from "../clients/portal.js";
import { mapDocs } from "../core/data.js";
import { $, esc, shortDay, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { isSketch } from "../drawing/trade-drawings.js";
import { blobUrl } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { noBin } from "../owner/deleted-items.js";
import { allTeam, nameOf } from "../owner/owner.js";
import { photoTile, siteFolders } from "../photos/photos.js";
import { same } from "./project-pages.js";
export { jphActive, jphBar, jphGrid, jphWire };
/* James (Nov 2026): "in photos for each job can I allow the client only to see the ones i want them to see. also I
   want to be able to filter the photos by date, who took them and the stage it was attached too".
   On a site's page (Sites › the job › Photos): a filter bar – From / To dates, Taken by, Stage, and Client (all, the
   ones the client sees, the ones they don't). With any filter set the photos show as one grid instead of the stage
   folders. The client only ever sees photos James shares (they go to their portal's 📷 Photos as portal docs,
   folder "photos", with photoId and fromSite); each one they can see has a 👁 on it here. 👁 Choose what <client>
   sees: tap photos on or off, then Save – new ones are shared, ones taken off are removed from their portal (the
   photo itself stays in the job). Filters live in S.f.jph { site, from, to, who, stage, cl }. */
const JPH = { shared: null, cid: "", busy: false, pick: null };
/* the job's client, if any, and their portal */
function jphClient(site) {
  return (S.clients || []).find((c) => clientSites(c).some((n) => same(n, site))) || null;
}
const jphF = (site) => {
  if (!S.f.jph || S.f.jph.site !== site)
    S.f.jph = { site, from: "", to: "", who: "", stage: "", cl: "" };
  return S.f.jph;
};
const jphActive = (site) => {
  const f = jphF(site);
  return !!(f.from || f.to || f.who || f.stage || f.cl || JPH.pick);
};
/* what the client can see now: asset id → portal doc id */
async function jphLoad(c) {
  if (!c || JPH.busy) return;
  JPH.busy = true;
  const m = new Map();
  try {
    const p = ptOf(ptCl(c));
    const docs = p
      ? mapDocs(await S.db.collection("portal/" + p.id + "/docs").get())
      : ptSrc(c).docs();
    docs
      .filter((d) => d.assetId && (d.folder === "photos" || /^image\//.test(d.contentType || "")))
      .forEach((d) => m.set(d.assetId, d.id));
  } catch (e) {}
  JPH.shared = m;
  JPH.cid = c.id;
  JPH.busy = false;
  render();
}
const jphShared = (c) => (c && JPH.cid === c.id && JPH.shared ? JPH.shared : null);
const jphStage = (p, fl) => (fl.includes(p.category) ? p.category : "Other photos");
/* the job's photos with the filters on (inPeriod: the page's own period, used when no dates are set) */
function jphList(site, inPeriod) {
  const f = jphF(site);
  const fl = siteFolders(site);
  const sh = jphShared(jphClient(site));
  return allTeam("photos")
    .filter((p) => same(p.site, site) && p.assetId && !isSketch(p))
    .filter((p) =>
      f.from || f.to
        ? (!f.from || p.date >= f.from) && (!f.to || p.date <= f.to)
        : inPeriod(p.date || ""),
    )
    .filter((p) => !f.who || p.who === f.who)
    .filter((p) => !f.stage || jphStage(p, fl) === f.stage)
    .filter((p) => !f.cl || !sh || (f.cl === "yes") === sh.has(p.assetId))
    .sort((a, b) => (b.takenAt || 0) - (a.takenAt || 0));
}
function jphBar(site) {
  const f = jphF(site);
  const c = jphClient(site);
  if (c && JPH.cid !== c.id && !JPH.busy) setTimeout(() => jphLoad(c), 0);
  const all = allTeam("photos").filter((p) => same(p.site, site) && p.assetId && !isSketch(p));
  const whos = [...new Set(all.map((p) => p.who))];
  const fl = siteFolders(site);
  const stages = fl.concat(all.some((p) => !fl.includes(p.category)) ? ["Other photos"] : []);
  const sh = jphShared(c);
  const first = c ? String(c.name || "").split(" ")[0] : "";
  return `<div class="jph-bar"><label for="jph-from">From<input type="date" id="jph-from" value="${esc(f.from)}"></label><label for="jph-to">To<input type="date" id="jph-to" value="${esc(f.to)}"></label>
    <label for="jph-who">Taken by<select id="jph-who"><option value="">Everyone</option>${whos.map((w) => `<option value="${esc(w)}" ${f.who === w ? "selected" : ""}>${esc(nameOf(w))}</option>`).join("")}</select></label>
    <label for="jph-stage">Stage<select id="jph-stage"><option value="">All stages</option>${stages.map((s) => `<option ${f.stage === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
    ${c ? `<label for="jph-cl">${esc(first)} sees<select id="jph-cl"><option value="">All photos</option><option value="yes" ${f.cl === "yes" ? "selected" : ""}>👁 Ones ${esc(first)} can see${sh ? " (" + all.filter((p) => sh.has(p.assetId)).length + ")" : ""}</option><option value="no" ${f.cl === "no" ? "selected" : ""}>Not shared</option></select></label>` : ""}
    ${jphActive(site) && !JPH.pick ? '<button type="button" class="pillbtn" id="jph-clear">✕ Clear filters</button>' : ""}</div>
    ${c ? `<div class="jph-cl">${JPH.pick ? `<b>Tap the photos ${esc(first)} should see</b> <span class="who">👁 = they can see it</span><button type="button" class="btn primary" id="jph-save">Save</button><button type="button" class="btn" id="jph-cancel">Cancel</button>` : `<button type="button" class="btn" id="jph-pick">👁 Choose what ${esc(first)} sees</button><span class="who">${sh ? `${esc(first)} can see ${all.filter((p) => sh.has(p.assetId)).length} of ${all.length} photos in their portal` : "Checking what they can see…"}</span>`}</div>` : '<div class="who">No client on this job yet, so nobody outside the firm sees these photos.</div>'}`;
}
/* the grid when filtering or choosing */
function jphGrid(site, inPeriod) {
  const L = jphList(site, inPeriod);
  if (!L.length) return '<div class="nothing">No photos match.</div>';
  if (JPH.pick)
    return `<div class="phgrid jph-pickgrid">${L.map((p) => `<button type="button" class="jph-pk" data-a="${esc(p.assetId)}" aria-pressed="${JPH.pick.has(p.assetId)}"><img src="${blobUrl(p.assetId)}" alt="${esc(p.caption || p.category || "Site photo")}" loading="lazy"><span class="jph-eye" aria-hidden="true">👁</span><span class="phcap">${esc(p.category || "")}<br>${esc(shortDay(p.date))} · ${esc(nameOf(p.who))}</span></button>`).join("")}</div>`;
  return `<div class="who">${L.length} photo${L.length === 1 ? "" : "s"}</div><div class="phgrid">${L.map((p) => photoTile(p, true, p.who)).join("")}</div>`;
}
function jphWire(site, inPeriod) {
  const f = jphF(site);
  const c = jphClient(site);
  const set = (k) => (e) => {
    f[k] = e.target.value;
    e.target.blur();
    render();
  };
  [
    ["jph-from", "from"],
    ["jph-to", "to"],
    ["jph-who", "who"],
    ["jph-stage", "stage"],
    ["jph-cl", "cl"],
  ].forEach(([id, k]) => {
    if ($(id)) $(id).onchange = set(k);
  });
  if ($("jph-clear"))
    $("jph-clear").onclick = () => {
      S.f.jph = { site, from: "", to: "", who: "", stage: "", cl: "" };
      render();
    };
  /* 👁 on the photos the client can see */
  const sh = jphShared(c);
  if (sh)
    $("main")
      .querySelectorAll(".ph[data-a]")
      .forEach((b) => {
        if (sh.has(b.dataset.a) && !b.querySelector(".jph-eye")) {
          b.classList.add("jph-on");
          b.insertAdjacentHTML(
            "beforeend",
            '<span class="jph-eye" title="The client can see this">👁</span>',
          );
        }
      });
  if ($("jph-pick"))
    $("jph-pick").onclick = () => {
      if (!sh) {
        toast("Still checking what they can see – try again in a moment");
        return;
      }
      JPH.pick = new Set(sh.keys());
      render();
    };
  if ($("jph-cancel"))
    $("jph-cancel").onclick = () => {
      JPH.pick = null;
      render();
    };
  $("main")
    .querySelectorAll(".jph-pk")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const a = b.dataset.a;
          JPH.pick.has(a) ? JPH.pick.delete(a) : JPH.pick.add(a);
          b.setAttribute("aria-pressed", String(JPH.pick.has(a)));
        }),
    );
  if ($("jph-save"))
    $("jph-save").onclick = async () => {
      const btn = $("jph-save");
      btn.disabled = true;
      btn.textContent = "Saving…";
      const src = ptSrc(c);
      const all = allTeam("photos").filter((p) => same(p.site, site) && p.assetId && !isSketch(p));
      /* only the photos on this job are changed – anything else in their portal stays */
      const add = all.filter((p) => JPH.pick.has(p.assetId) && !sh.has(p.assetId));
      const off = all.filter((p) => !JPH.pick.has(p.assetId) && sh.has(p.assetId));
      try {
        for (const p of add)
          await src.addDoc(newId(), {
            title: (p.caption || p.category || "Site photo") + " · " + shortDay(p.date),
            fileName: "photo.jpg",
            assetId: p.assetId,
            contentType: "image/jpeg",
            folder: "photos",
            note: "",
            sharedAt: Date.now(),
            fromSite: site,
            photoId: p.id,
          });
        for (const p of off) await noBin(() => src.delDoc(sh.get(p.assetId)));
        if (add.length || off.length) await src.bump();
        JPH.pick = null;
        JPH.cid = "";
        toast(
          add.length || off.length
            ? `${c.name.split(" ")[0]} can now see ${add.length ? add.length + " more" : ""}${add.length && off.length ? ", " : ""}${off.length ? off.length + " fewer" : ""}`
            : "No change",
        );
        jphLoad(c);
      } catch (e) {
        toast("Couldn't save. Check your connection.");
        btn.disabled = false;
        btn.textContent = "Save";
      }
    };
}
