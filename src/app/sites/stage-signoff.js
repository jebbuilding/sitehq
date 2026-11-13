/* ================= STAGE SIGN-OFF: each job's stages, signed off as they're done, with a record of what's done and what isn't ================= */
import { $, esc, iso, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
import { siteRec } from "../photos/photos.js";
import { siteLabel } from "./job-details.js";
export { stgEdit, stgHtml, stgSign, stgWire };
/* James (Nov 2026): "the stages of a project or build … should have stages that can be signed off to say they are
   completed and then a record of this should be kept … customisable as every job is different. Need basic templates
   to use and custom." A site's stages are sites/{id}.stages (the same list Jobs shows); signing one off saves
   sites/{id}.stageDone[name] = { at, by, note } and adds to sites/{id}.stageLog [{ stage, act: "done" | "undone",
   at, by, note }] – the record, never cleared. "Not done after all" takes the tick off but stays in the record.
   Stages are changed from a template (STG_TEMPLATES, or James's own saved ones: todos/stgtpl-{id} kind "stagetpl"
   { name, stages }) or by editing the list; any list can be saved as a template of his own. The current stage
   (sites/{id}.stage, used by Jobs) follows the last stage signed off. */
const STG_TEMPLATES = [
  ["Basic", ["Start", "Work in progress", "Snagging", "Finished and handed over"]],
  [
    "Extension",
    [
      "Set out",
      "Foundations dug",
      "Building control: foundations",
      "Foundations poured",
      "Drainage",
      "Building control: drainage",
      "Brickwork to DPC",
      "Oversite / floor slab",
      "Walls up",
      "Roof on",
      "Windows and doors in",
      "First fix",
      "Building control: pre-plaster",
      "Plastering",
      "Second fix",
      "Decorating",
      "Snagging",
      "Building control: completion",
      "Handover",
    ],
  ],
  [
    "Loft conversion",
    [
      "Scaffold up",
      "Steels and floor joists",
      "Building control: structure",
      "Dormer / roof work",
      "Roof windows",
      "Stairs",
      "First fix",
      "Insulation",
      "Building control: pre-plaster",
      "Plastering",
      "Fire doors and safety",
      "Second fix",
      "Decorating",
      "Snagging",
      "Building control: completion",
      "Handover",
    ],
  ],
  [
    "Kitchen",
    [
      "Strip out",
      "First fix plumbing and electrics",
      "Plastering",
      "Floor",
      "Units fitted",
      "Worktops templated",
      "Worktops fitted",
      "Appliances",
      "Second fix",
      "Tiling / splashback",
      "Decorating",
      "Snagging",
      "Handover",
    ],
  ],
  [
    "Bathroom",
    [
      "Strip out",
      "First fix plumbing and electrics",
      "Boarding / tanking",
      "Bath / shower tray",
      "Tiling",
      "Sanitaryware",
      "Second fix",
      "Silicone and finishing",
      "Snagging",
      "Handover",
    ],
  ],
  [
    "New build",
    [
      "Site set up",
      "Groundworks and foundations",
      "Building control: foundations",
      "Drainage and services",
      "Ground floor slab",
      "Superstructure",
      "Roof",
      "Windows and doors",
      "First fix",
      "Building control: pre-plaster",
      "Plastering",
      "Second fix",
      "Kitchens and bathrooms",
      "Decorating",
      "External works",
      "Snagging",
      "Building control: completion",
      "Handover",
    ],
  ],
  [
    "Renovation",
    [
      "Strip out",
      "Structural work",
      "First fix",
      "Plastering",
      "Second fix",
      "Decorating",
      "Snagging",
      "Handover",
    ],
  ],
];
const STG_DEFAULT = ["Groundworks", "Shell", "First fix", "Plastering", "Second fix", "Finishing"];
const stgList = (sr) =>
  sr && Array.isArray(sr.stages) && sr.stages.length ? sr.stages : STG_DEFAULT;
const stgMine = () =>
  (S.stageTpls || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
const stgDoneOf = (sr) => (sr && sr.stageDone) || {};
/* the record for one site */
function stgHtml(site) {
  const sr = siteRec(site) || {};
  const st = stgList(sr);
  const done = stgDoneOf(sr);
  const n = st.filter((s) => done[s]).length;
  const log = ((sr && sr.stageLog) || []).slice().reverse();
  return `<div class="stg">
    <div class="stg-top"><b>${n} of ${st.length} stages signed off</b><div class="stg-bar" role="img" aria-label="${n} of ${st.length} signed off"><span style="width:${st.length ? Math.round((n / st.length) * 100) : 0}%"></span></div></div>
    <div class="who">Tap a stage to sign it off when it's finished. Everything signed off is kept in the record below.</div>
    <div class="stg-list">${st
      .map((s, i) => {
        const d = done[s];
        return `<button type="button" class="stg-row${d ? " stg-done" : ""}" data-i="${i}"><span class="stg-tick" aria-hidden="true">${d ? "✓" : i + 1}</span><span class="stg-txt"><b>${esc(s)}</b>${d ? `<span class="who">Signed off ${esc(shortDay(iso(new Date(d.at))))}${d.by ? " by " + esc(d.by) : ""}${d.note ? " · " + esc(d.note) : ""}</span>` : `<span class="who">Not done yet – tap to sign off</span>`}</span></button>`;
      })
      .join("")}</div>
    <div class="actions"><button type="button" class="btn" id="stg-edit">✎ Change the stages</button></div>
    ${log.length ? `<details class="pmdet"><summary>📋 Record (${log.length})</summary>${log.map((l) => `<div class="dwsrow"><span>${l.act === "undone" ? "↩" : "✓"} <b>${esc(l.stage)}</b>${l.act === "undone" ? " – taken off" : " – signed off"}${l.note ? ` <span class="who">· ${esc(l.note)}</span>` : ""}</span><span class="who">${esc(shortDay(iso(new Date(l.at))))}${l.by ? " · " + esc(l.by) : ""}</span></div>`).join("")}</details>` : ""}
  </div>`;
}
function stgWire(site) {
  document
    .querySelectorAll(".stg-row")
    .forEach((b) => (b.onclick = () => stgSign(site, +b.dataset.i)));
  if ($("stg-edit")) $("stg-edit").onclick = () => stgEdit(site);
}
async function stgSave(sr, patch) {
  await S.db.doc("sites/" + sr.id).update(patch);
  Object.assign(sr, patch);
}
/* sign a stage off (or take the tick off) */
function stgSign(site, i) {
  const sr = siteRec(site);
  if (!sr || !sr.id) return toast("Add this site in Setup first");
  const st = stgList(sr);
  const s = st[i];
  const d = stgDoneOf(sr)[s];
  const me = (S.myProfile && S.myProfile.name) || S.ownerName || "James";
  openSheet(
    `<h3 id="sheettitle">${d ? "✓ " : ""}${esc(s)}</h3><div class="who">${esc(siteLabel(site))}</div>
    ${
      d
        ? `<div class="notice">Signed off ${esc(shortDay(iso(new Date(d.at))))}${d.by ? " by " + esc(d.by) : ""}${d.note ? ": " + esc(d.note) : ""}.</div><label class="inl"><input type="checkbox" id="stg-undo"> Not done after all – take the tick off (it stays in the record)</label>`
        : `<div class="grid2"><label for="stg-date">Finished on<input id="stg-date" type="date" value="${esc(iso(new Date()))}"></label><label for="stg-by">Signed off by<input id="stg-by" maxlength="60" value="${esc(me)}"></label></div>
      <label for="stg-note">Note (optional)<input id="stg-note" maxlength="200" placeholder="e.g. passed building control, photos taken"></label>`
    }
    ${formFoot(false, d ? "Save" : "✓ Sign off " + s)}`,
    async () => {
      const done = Object.assign({}, stgDoneOf(sr));
      const log = (sr.stageLog || []).slice();
      if (d) {
        if (!$("stg-undo").checked) return closeForm();
        delete done[s];
        log.push({ stage: s, act: "undone", at: Date.now(), by: me });
      } else {
        const at = $("stg-date").value
          ? new Date($("stg-date").value + "T12:00").getTime()
          : Date.now();
        const rec = { at, by: $("stg-by").value.trim(), note: $("stg-note").value.trim() };
        done[s] = rec;
        log.push(Object.assign({ stage: s, act: "done" }, rec));
      }
      /* the current stage (Jobs) is the last one signed off */
      let cur = -1;
      st.forEach((x, k) => {
        if (done[x]) cur = k;
      });
      $("f-save").disabled = true;
      try {
        await stgSave(sr, { stages: st, stageDone: done, stageLog: log.slice(-300), stage: cur });
        closeForm();
        toast(d ? s + " – tick taken off" : s + " signed off");
        render();
      } catch (e) {
        $("f-save").disabled = false;
        showErr("Couldn't save. Check your connection.");
      }
    },
    null,
  );
}
/* change the stages: a template (built-in or his own), or the list itself; save any list as his own template */
function stgEdit(site) {
  const sr = siteRec(site);
  if (!sr || !sr.id) return toast("Add this site in Setup first");
  const mine = stgMine();
  openSheet(
    `<h3 id="sheettitle">✎ Stages for ${esc(siteLabel(site))}</h3>
    <label for="stg-tpl">Start from a template<select id="stg-tpl"><option value="">Choose a template…</option><optgroup label="Templates">${STG_TEMPLATES.map(([n], i) => `<option value="b${i}">${esc(n)}</option>`).join("")}</optgroup>${mine.length ? `<optgroup label="Your templates">${mine.map((t) => `<option value="m${esc(t.id)}">${esc(t.name)}</option>`).join("")}</optgroup>` : ""}</select></label>
    <label for="stg-lines">The stages, one on each line (add, remove or change any)<textarea id="stg-lines" rows="12">${esc(stgList(sr).join("\n"))}</textarea></label>
    <div class="who">Stages already signed off keep their tick if the name stays the same.</div>
    <label for="stg-tname">Save this list as your own template (optional)<input id="stg-tname" maxlength="40" placeholder="e.g. Garage conversion"></label>
    ${formFoot(false, "Save the stages")}`,
    async () => {
      const stages = [
        ...new Set(
          $("stg-lines")
            .value.split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
        ),
      ].slice(0, 40);
      if (!stages.length) return showErr("Put at least one stage.");
      $("f-save").disabled = true;
      try {
        const done = {};
        Object.entries(stgDoneOf(sr)).forEach(([k, v]) => {
          if (stages.includes(k)) done[k] = v;
        });
        let cur = -1;
        stages.forEach((x, k) => {
          if (done[x]) cur = k;
        });
        await stgSave(sr, { stages, stageDone: done, stage: cur });
        const tn = $("stg-tname").value.trim();
        if (tn) {
          const id = "stgtpl-" + newId();
          const rec = { kind: "stagetpl", name: tn, stages, created: Date.now() };
          await S.db.doc("todos/" + id).set(rec);
          S.stageTpls = (S.stageTpls || []).concat([Object.assign({ id }, rec)]);
        }
        closeForm();
        toast("Stages saved" + (tn ? ' – and kept as your template "' + tn + '"' : ""));
        render();
      } catch (e) {
        $("f-save").disabled = false;
        showErr("Couldn't save. Check your connection.");
      }
    },
    null,
  );
  $("stg-tpl").onchange = () => {
    const v = $("stg-tpl").value;
    if (!v) return;
    const L =
      v[0] === "b"
        ? (STG_TEMPLATES[+v.slice(1)] || [])[1]
        : (mine.find((t) => t.id === v.slice(1)) || {}).stages || [];
    if (L && L.length) $("stg-lines").value = L.join("\n");
  };
}
