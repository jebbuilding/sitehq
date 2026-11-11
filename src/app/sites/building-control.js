/* ================= BUILDING CONTROL: a site's inspection reports and certificates – uploaded, and shown in the client's portal ================= */
import { ptSrc } from "../clients/portal.js";
import { $, esc, iso, shortDay, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { uploadErr, uploadFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { shrinkImage } from "../safety/training.js";
import { same } from "./project-pages.js";
import { siteClient } from "./summary.js";
export { bcHtml, bcWire };
/* On a site's 🏛️ Building control tile James adds each report or certificate building control sends him. From an
   email on the iPad: open the attachment, tap Share › Save to Files, then pick it here (PDFs or photos, several at
   once). Each has the date, the stage (foundations, DPC, drainage, pre-plaster, completion…), the result (passed,
   advice, not passed) and a note. "Client sees it" (ticked to start with) puts a copy in the client's portal under
   Certificates & warranties; unticking takes it out again. Stored owner-only in todos/bcr-{id} (kind "bcreport"):
   site, date, stage, result, note, assetId, fileName, contentType, toClient, portalDocId. */
const BC_STAGES = [
  "Commencement",
  "Foundations / excavation",
  "Damp proof course",
  "Drainage",
  "Oversite / floor slab",
  "Roof / structure",
  "Insulation",
  "Pre-plaster",
  "Fire safety",
  "Completion / final inspection",
  "Completion certificate",
  "Other",
];
const BC_RES = [
  ["pass", "✓ Passed"],
  ["advice", "Advice given"],
  ["fail", "✗ Not passed – needs work"],
  ["", "No result yet"],
];
const bcAll = (site) =>
  (S.bcReports || [])
    .filter((r) => same(r.site, site))
    .sort(
      (a, b) => (b.date || "").localeCompare(a.date || "") || (b.created || 0) - (a.created || 0),
    );
const bcResult = (k) => (BC_RES.find((x) => x[0] === (k || "")) || BC_RES[3])[1];
function bcHtml(site) {
  const L = bcAll(site);
  const c = siteClient(site);
  return `<div class="bc">
    <div class="who">Reports and certificates from building control for this job. ${c ? `Ones marked "Client sees it" are in ${esc(c.name)}'s portal under Certificates &amp; warranties.` : "No client is linked to this site, so they're kept here only."}</div>
    <span class="btn primary bc-addw">🏛️ Add a report or certificate<input type="file" id="bc-file" accept="application/pdf,image/*" multiple aria-label="Add a building control report"></span>
    <div class="who">From an email: open the attachment, tap <b>Share</b> › <b>Save to Files</b>, then tap the button above and pick it.</div>
    ${
      L.length
        ? L.map(
            (r) =>
              `<div class="card bc-row" data-id="${esc(r.id)}"><div class="bc-main"><b>${esc(r.stage || "Report")}</b> <span class="tag ${r.result === "pass" ? "ok" : r.result === "fail" ? "bad" : r.result === "advice" ? "day" : ""}">${esc(bcResult(r.result))}</span><div class="who">${esc(r.date ? shortDay(r.date) : "")}${r.fileName ? " · " + esc(r.fileName) : ""}${r.note ? " · " + esc(r.note) : ""}</div><div class="who">${r.toClient && c ? "🏡 Client sees it" : "🔒 Only you"}</div></div>
              <div class="bc-acts"><button type="button" class="btn bc-open">Open</button><button type="button" class="btn bc-edit">Edit</button></div></div>`,
          ).join("")
        : `<div class="empty"><strong>No building control reports yet</strong>Add each inspection report and the completion certificate as they come in.</div>`
    }</div>`;
}
function bcWire(site) {
  const f = $("bc-file");
  if (f)
    f.onchange = async (e) => {
      const files = [...(e.target.files || [])];
      e.target.value = "";
      if (!files.length) return;
      bcEdit(site, null, files);
    };
  document.querySelectorAll(".bc-row").forEach((row) => {
    const r = (S.bcReports || []).find((x) => x.id === row.dataset.id);
    if (!r) return;
    row.querySelector(".bc-open").onclick = () => openFile(r.assetId, r.fileName, r.contentType);
    row.querySelector(".bc-edit").onclick = () => bcEdit(site, r, null);
  });
}
/* the details for a new report (files picked) or an existing one */
function bcEdit(site, r0, files) {
  const r = r0 || {};
  const c = siteClient(site);
  openSheet(
    `<h3 id="sheettitle">🏛️ ${r0 ? "Building control report" : files.length > 1 ? files.length + " building control reports" : "Building control report"}</h3>
    ${files ? `<div class="who">${files.map((x) => esc(x.name)).join(" · ")}</div>` : ""}
    <div class="grid2"><label for="bc-date">Date of the inspection<input id="bc-date" type="date" value="${esc(r.date || iso(new Date()))}"></label>
    <label for="bc-stage">Stage<select id="bc-stage">${BC_STAGES.map((s) => `<option${(r.stage || "") === s ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></label></div>
    <label for="bc-res">Result<select id="bc-res">${BC_RES.map(([k, l]) => `<option value="${k}"${(r.result || "") === k ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
    <label for="bc-note">Note (optional)<input id="bc-note" maxlength="200" value="${esc(r.note || "")}" placeholder="e.g. inspector Test Name, wants photos of the DPC"></label>
    <label class="inl"><input type="checkbox" id="bc-client"${r0 ? (r.toClient ? " checked" : "") : " checked"}${c ? "" : " disabled"}> ${c ? `🏡 ${esc(c.name)} sees it in their portal` : "No client linked to this site"}</label>
    ${formFoot(!!r0, "Save")}`,
    async () => {
      $("f-save").disabled = true;
      const base = {
        site,
        date: $("bc-date").value || iso(new Date()),
        stage: $("bc-stage").value,
        result: $("bc-res").value,
        note: $("bc-note").value.trim(),
        toClient: !!(c && $("bc-client").checked),
      };
      try {
        if (r0) await bcSave(Object.assign({}, r0, base));
        else
          for (const f of files) {
            const blob = /^image\//.test(f.type) ? await shrinkImage(f, 2000) : f;
            const up = await uploadFile(blob, f.name);
            await bcSave(
              Object.assign({}, base, {
                assetId: up.id,
                fileName: f.name,
                contentType: up.contentType || f.type || "application/pdf",
              }),
            );
          }
        closeForm();
        toast(base.toClient ? "Saved, and in the client's portal" : "Saved");
        render();
      } catch (e) {
        $("f-save").disabled = false;
        showErr(uploadErr(e));
      }
    },
    null,
  );
  if (r0 && $("f-del"))
    armDelete(async () => {
      /* out of the client's portal first, then the record */
      await bcSave(Object.assign({}, r0, { toClient: false }));
      await S.db.doc("todos/" + r0.id).delete();
      S.bcReports = (S.bcReports || []).filter((x) => x.id !== r0.id);
      render();
    });
}
/* save the record, and put it in (or take it out of) the client's portal */
async function bcSave(r) {
  const id = r.id || "bcr-" + newId();
  const rec = Object.assign({}, r, { kind: "bcreport", updated: Date.now() });
  delete rec.id;
  if (!rec.created) rec.created = Date.now();
  const c = siteClient(rec.site);
  const src = c && ptSrc(c);
  if (src) {
    if (rec.toClient) {
      const pid = rec.portalDocId || "bc-" + id;
      await src.addDoc(pid, {
        title: "Building control: " + rec.stage + (rec.date ? " (" + shortDay(rec.date) + ")" : ""),
        fileName: rec.fileName || "",
        assetId: rec.assetId,
        contentType: rec.contentType || "application/pdf",
        folder: "certs",
        note: [bcResult(rec.result), rec.note].filter(Boolean).join(" · "),
        sharedAt: Date.now(),
        fromSite: rec.site,
        srcId: id,
      });
      rec.portalDocId = pid;
    } else if (rec.portalDocId) {
      await src.delDoc(rec.portalDocId).catch(() => {});
      rec.portalDocId = "";
    }
  }
  await S.db.doc("todos/" + id).set(rec);
  const out = Object.assign({ id }, rec);
  S.bcReports = (S.bcReports || []).filter((x) => x.id !== id).concat([out]);
  return out;
}
