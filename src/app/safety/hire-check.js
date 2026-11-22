/* ================= HIRE CHECK: hired-in equipment checked before it's used and after – photos, a video and any damage already on it ================= */
import { pickVal } from "../core/fields.js";
import { $, esc, shortDay } from "../core/helpers.js";
import { S, ownerMode, siteNames } from "../core/state.js";
import { blobUrl } from "../files/files.js";
import { allTeam } from "../owner/owner.js";
import { siteLabel } from "../sites/job-details.js";
export { hicFields, hicMore, hicRead, hicSub, hicTag, hicVideo, hicWire };
/* James (Nov 2026): "Hire in equipment check before its used and after. photos videos. any damage before its used".
   It's one of the checks in 📋 Reports (KINDS.hire in safety/checklists.js), so it saves with no signal and shows
   defects like the others. These are its extra parts: Before use / After use, the hire firm and hire number, the
   site, hours or fuel, "was the damage already on it when it came?", photos all round (needed) and a short video.
   On the after-use check the before-use photos of the same thing are shown, to compare. Saved on the check record:
   stage, hireCo, hireRef, site, meter, preDamage, video. */
function hicAll() {
  const L = ownerMode()
    ? allTeam("checks")
    : (S.mine.checks || []).map((c) => Object.assign({ who: S.me }, c));
  return L.filter((c) => c.kind === "hire");
}
const hicSame = (a, b) =>
  String(a || "")
    .trim()
    .toLowerCase() ===
  String(b || "")
    .trim()
    .toLowerCase();
/* the last before-use check of this thing */
function hicBefore(asset, notId) {
  return hicAll()
    .filter((c) => c.stage !== "after" && c.id !== notId && hicSame(c.asset, asset))
    .sort(
      (a, b) => String(b.date).localeCompare(String(a.date)) || (b.created || 0) - (a.created || 0),
    )[0];
}
function hicFields(c) {
  c = c || {};
  const stage = c.stage || "before";
  const firms = [
    ...new Set(
      hicAll()
        .map((x) => x.hireCo)
        .filter(Boolean),
    ),
  ];
  return `<div class="hic-box"><div class="flabel">When is this check?</div><div class="seg" id="hic-stage"><button type="button" data-v="before" aria-pressed="${stage === "before"}">📥 Before use (it's arrived)</button><button type="button" data-v="after" aria-pressed="${stage === "after"}">📤 After use (going back)</button></div>
    <div class="grid2"><label for="hic-co">Hire company<input id="hic-co" maxlength="80" list="hic-cos" value="${esc(c.hireCo || "")}" placeholder="e.g. HSS, Speedy, local hire shop"></label><datalist id="hic-cos">${firms.map((f) => `<option value="${esc(f)}">`).join("")}</datalist>
    <label for="hic-ref">Hire number / contract (optional)<input id="hic-ref" maxlength="60" value="${esc(c.hireRef || "")}"></label></div>
    <div class="grid2"><label for="hic-site">Site<select id="hic-site"><option value="">Not on a site</option>${siteNames()
      .map(
        (n) =>
          `<option value="${esc(n)}" ${c.site === n ? "selected" : ""}>${esc(siteLabel(n))}</option>`,
      )
      .join("")}</select></label>
    <label for="hic-meter">Hours or fuel level (optional)<input id="hic-meter" maxlength="40" value="${esc(c.meter || "")}" placeholder="e.g. 412 hrs, ¾ tank"></label></div>
    <div id="hic-cmp"></div></div>`;
}
/* after the questions: was the damage there already, and the video */
function hicMore(c) {
  c = c || {};
  return `<div class="hic-box"><div class="flabel">Any damage already on it when it came?</div><div class="seg" id="hic-pre"><button type="button" data-v="none" aria-pressed="${(c.preDamage || "none") === "none"}">No damage</button><button type="button" data-v="yes" aria-pressed="${c.preDamage === "yes"}">Yes – it came like that</button></div>
    ${c.video ? `<div class="flabel">Video already added</div><video src="${blobUrl(c.video)}" controls playsinline class="hic-vid"></video>` : ""}
    <div class="flabel">🎥 A short video walking round it (optional, about 20 seconds)</div><div class="actions"><label class="btn fhpickbtn">🎥 Record video<input type="file" class="hic-vin" id="hic-video" accept="video/*" capture="environment"></label><label class="btn fhpickbtn">🎞 Choose video<input type="file" class="hic-vin" accept="video/*"></label></div><div class="who" id="hic-vname"></div></div>`;
}
/* the video chosen on this check */
let hicVid = null;
const hicVideo = () => hicVid;
function hicWire(c) {
  hicVid = null;
  document.querySelectorAll(".hic-vin").forEach(
    (i) =>
      (i.onchange = () => {
        hicVid = (i.files || [])[0] || null;
        $("hic-vname").textContent = hicVid
          ? "🎥 Video ready (" + (hicVid.size / 1048576).toFixed(1) + " MB)"
          : "";
      }),
  );
  const seg = (id) =>
    $(id)
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            $(id)
              .querySelectorAll("button")
              .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
            cmp();
          }),
      );
  const cmp = () => {
    const box = $("hic-cmp");
    if (!box) return;
    const after = $("hic-stage").querySelector('[aria-pressed="true"]').dataset.v === "after";
    const asset = pickVal("c-asset");
    const b = after && asset ? hicBefore(asset, c && c.id) : null;
    box.innerHTML = b
      ? `<div class="notice"><b>📥 Before use, ${esc(shortDay(b.date))}</b>${b.hireCo ? " · " + esc(b.hireCo) : ""}${b.preDamage === "yes" ? ' · <span class="tag day">came with damage</span>' : ""}${b.notes ? `<div class="who">${esc(b.notes)}</div>` : ""}${(b.photos || []).length ? `<div class="thumbs">${b.photos.map((id) => `<img src="${blobUrl(id)}" alt="Before-use photo">`).join("")}</div>` : ""}${b.video ? `<video src="${blobUrl(b.video)}" controls playsinline class="hic-vid"></video>` : ""}<div class="who">Take the same photos now, so any new damage shows.</div></div>`
      : after
        ? '<div class="who">No before-use check found for this one.</div>'
        : "";
    if (b && !$("hic-co").value) $("hic-co").value = b.hireCo || "";
    if (b && !$("hic-ref").value) $("hic-ref").value = b.hireRef || "";
    if (b && !$("hic-site").value && b.site) $("hic-site").value = b.site;
  };
  seg("hic-stage");
  seg("hic-pre");
  const a = $("c-asset");
  if (a) a.addEventListener("change", cmp);
  cmp();
}
function hicRead() {
  const on = (id) => $(id).querySelector('[aria-pressed="true"]').dataset.v;
  return {
    stage: on("hic-stage"),
    hireCo: $("hic-co").value.trim(),
    hireRef: $("hic-ref").value.trim(),
    site: $("hic-site").value,
    meter: $("hic-meter").value.trim(),
    preDamage: on("hic-pre"),
  };
}
/* for the check's card */
function hicTag(c) {
  return `<span class="tag">${c.stage === "after" ? "📤 After use" : "📥 Before use"}</span>${c.preDamage === "yes" ? '<span class="tag day">Came damaged</span>' : ""}`;
}
function hicSub(c) {
  return [
    c.hireCo,
    c.hireRef ? "No. " + c.hireRef : "",
    c.site ? siteLabel(c.site) : "",
    c.video ? "🎥 video" : "",
  ]
    .filter(Boolean)
    .map(esc)
    .join(" · ");
}
