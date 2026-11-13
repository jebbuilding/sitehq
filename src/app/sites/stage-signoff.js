/* ================= STAGE SIGN-OFF: each job's stages, signed off as they're done, with a record of what's done and what isn't ================= */
import { ptKind, ptOf, ptOnFor, ptSrc } from "../clients/portal.js";
import { $, esc, iso, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId, saveOrKeep } from "../files/outbox.js";
import { siteRec } from "../photos/photos.js";
import { siteLabel } from "./job-details.js";
import { siteClient } from "./summary.js";
export { stgEdit, stgHtml, stgSign, stgWire };
/* James (Nov 2026): "the stages of a project or build … should have stages that can be signed off to say they are
   completed and then a record of this should be kept … customisable as every job is different. Need basic templates
   to use and custom." A site's stages are sites/{id}.stages (the same list Jobs shows); signing one off saves
   sites/{id}.stageDone[name] = { at, by, note } and adds to sites/{id}.stageLog [{ stage, act: "done" | "undone",
   at, by, note }] – the record, never cleared. "Not done after all" takes the tick off but stays in the record.
   Stages are changed from a template (STG_TEMPLATES, or James's own saved ones: todos/stgtpl-{id} kind "stagetpl"
   { name, stages }) or by editing the list; any list can be saved as a template of his own. The current stage
   (sites/{id}.stage, used by Jobs) follows the last stage signed off. James can sign a stage off himself, and
   optionally ask the client to sign it off too in their portal (a "stage" sign request; stageDone[name].clientSign
   { id, cid }); the stage then shows whether they've signed. */
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
        return `<button type="button" class="stg-row${d ? " stg-done" : ""}" data-i="${i}"><span class="stg-tick" aria-hidden="true">${d ? "✓" : i + 1}</span><span class="stg-txt"><b>${esc(s)}</b>${d ? `<span class="who">Signed off ${esc(shortDay(iso(new Date(d.at))))}${d.by ? " by " + esc(d.by) : ""}${d.note ? " · " + esc(d.note) : ""}</span>${d.clientSign ? `<span class="who stg-cs" data-s="${esc(s)}">✍ Asked the client to sign it off – waiting</span>` : ""}` : `<span class="who">Not done yet – tap to sign off</span>`}</span></button>`;
      })
      .join("")}</div>
    <div class="actions"><button type="button" class="btn" id="stg-edit">✎ Change the stages</button></div>
    ${log.length ? `<details class="pmdet"><summary>📋 Record (${log.length})</summary>${log.map((l) => `<div class="dwsrow"><span>${l.act === "undone" ? "↩" : l.act === "asked" ? "✍" : "✓"} <b>${esc(l.stage)}</b>${l.act === "undone" ? " – taken off" : l.act === "asked" ? " – client asked to sign" : " – signed off"}${l.note ? ` <span class="who">· ${esc(l.note)}</span>` : ""}</span><span class="who">${esc(shortDay(iso(new Date(l.at))))}${l.by ? " · " + esc(l.by) : ""}</span></div>`).join("")}</details>` : ""}
  </div>`;
}
function stgWire(site) {
  stgClientState(site);
  document
    .querySelectorAll(".stg-row")
    .forEach((b) => (b.onclick = () => stgSign(site, +b.dataset.i)));
  if ($("stg-edit")) $("stg-edit").onclick = () => stgEdit(site);
}
async function stgSave(sr, patch) {
  /* works with no signal too: kept on this phone and sent when there is */
  const how = await saveOrKeep("sites/" + sr.id, "update", patch, "Stage sign-off");
  if (how === "queued") toast("No signal – saved on this phone, it sends when you're back online");
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
  /* the client can sign a stage off too, in their portal, if James asks (James, Nov 2026) */
  const c = siteClient(site);
  const askCl = !!(c && ptOnFor(c));
  openSheet(
    `<h3 id="sheettitle">${d ? "✓ " : ""}${esc(s)}</h3><div class="who">${esc(siteLabel(site))}</div>
    ${
      d
        ? `<div class="notice">Signed off ${esc(shortDay(iso(new Date(d.at))))}${d.by ? " by " + esc(d.by) : ""}${d.note ? ": " + esc(d.note) : ""}.</div>${askCl && !d.clientSign ? `<label class="inl"><input type="checkbox" id="stg-cl"> ✍ Ask ${esc(c.name)} to sign it off in their portal now</label>` : ""}<label class="inl"><input type="checkbox" id="stg-undo"> Not done after all – take the tick off (it stays in the record)</label>`
        : `<div class="grid2"><label for="stg-date">Finished on<input id="stg-date" type="date" value="${esc(iso(new Date()))}"></label><label for="stg-by">Signed off by<input id="stg-by" maxlength="60" value="${esc(me)}"></label></div>
      <label for="stg-note">Note (optional)<input id="stg-note" maxlength="200" placeholder="e.g. passed building control, photos taken"></label>
      ${askCl ? `<label class="inl"><input type="checkbox" id="stg-cl"> ✍ Also ask ${esc(c.name)} to sign it off in their portal</label><div class="who">Leave it unticked to sign it off yourself only.</div>` : ""}`
    }
    ${formFoot(false, d ? "Save" : "✓ Sign off " + s)}`,
    async () => {
      const done = Object.assign({}, stgDoneOf(sr));
      const log = (sr.stageLog || []).slice();
      const wantCl = askCl && $("stg-cl") && $("stg-cl").checked;
      if (d) {
        if ($("stg-undo").checked) {
          delete done[s];
          log.push({ stage: s, act: "undone", at: Date.now(), by: me });
        } else if (wantCl) {
          done[s] = Object.assign({}, d, { clientSign: await stgAskClient(c, site, s, d.note) });
          log.push({
            stage: s,
            act: "asked",
            at: Date.now(),
            by: me,
            note: "Asked " + c.name + " to sign it off",
          });
        } else return closeForm();
      } else {
        const at = $("stg-date").value
          ? new Date($("stg-date").value + "T12:00").getTime()
          : Date.now();
        const rec = { at, by: $("stg-by").value.trim(), note: $("stg-note").value.trim() };
        if (wantCl) rec.clientSign = await stgAskClient(c, site, s, rec.note);
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

/* ask the client to sign a stage off in their portal; returns { id, cid } kept on the stage */
async function stgAskClient(c, site, stage, note) {
  const id = newId();
  const src = ptSrc(c);
  await src.addSign(id, {
    kind: "stage",
    title: ("Stage finished: " + stage).slice(0, 120),
    details: [siteLabel(site), note].filter(Boolean).join(" – "),
    statement: ptKind("stage")[2],
    status: "open",
    created: Date.now(),
    fromSite: site,
  });
  try {
    await src.bump();
  } catch (e) {}
  return { id, cid: c.id };
}
/* show whether the client has signed each stage they were asked to (read from their portal) */
async function stgClientState(site) {
  const sr = siteRec(site) || {};
  const c = siteClient(site);
  if (!c) return;
  const p = ptOf(c);
  for (const [s, d] of Object.entries(stgDoneOf(sr))) {
    if (!d.clientSign) continue;
    let x = null;
    try {
      if (p) {
        const g = await S.db.doc("portal/" + p.id + "/signs/" + d.clientSign.id).get();
        x = g.exists ? g.data() : null;
      } else x = (c.ptSigns || []).find((y) => y.id === d.clientSign.id) || null;
    } catch (e) {}
    const el = document.querySelector('.stg-cs[data-s="' + CSS.escape(s) + '"]');
    if (!el || !x) continue;
    el.textContent =
      x.status === "signed"
        ? "✍ " +
          (x.signedName || c.name) +
          " signed it off" +
          (x.signedAt ? " " + shortDay(iso(new Date(x.signedAt))) : "")
        : x.status === "changes"
          ? "✍ " + c.name + " asked for changes"
          : "✍ Asked " + c.name + " to sign it off – waiting";
    el.classList.toggle("stg-csok", x.status === "signed");
  }
}
