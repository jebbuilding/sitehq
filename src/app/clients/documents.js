/* ===== Client documents: add PDFs / photos of paperwork, choose which go into the client PDF ===== */
import { saveClient } from "./clients.js";
import { ptCl } from "./portal.js";
import { viewClient } from "./quick-enquiry.js";
import { $, esc, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { closeViewer } from "../core/viewer.js";
import { blobUrl, saveAsset, uploadErr, uploadFile } from "../files/files.js";
import { loadPdfJs, openFile } from "../files/in-app-files.js";
import { shrinkImage } from "../safety/training.js";
export { clDocsHtml, docPicker, pdfToPages, wireClDocs };
function docPicker(host, existing) {
  const items = (existing || []).map((d) => ({ existing: d, inPdf: d.inPdf !== false }));
  host.innerHTML = `<div class="apk"><label class="btn fhpickbtn">📄 PDF / Word<input type="file" accept="application/pdf,.doc,.docx,.rtf,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple data-cam="1"></label><label class="btn fhpickbtn">📷 Photo of a document<input type="file" accept="image/*" capture="environment" data-cam="1"></label><label class="btn fhpickbtn">🖼 Choose photos<input type="file" accept="image/*" multiple data-cam="1"></label></div><div class="apklist"></div>`;
  const list = host.querySelector(".apklist");
  host.querySelectorAll("input[type=file]").forEach(
    (i) =>
      (i.onchange = () => {
        [...(i.files || [])].forEach((f) => items.push({ file: f, inPdf: true }));
        i.value = "";
        draw();
      }),
  );
  function draw() {
    list.innerHTML = items
      .map((it, k) => {
        const f = it.file,
          d = it.existing;
        const nm = f ? f.name || "photo.jpg" : d.name;
        const img = f ? /^image\//.test(f.type || "") : /^image\//.test(d.type || "");
        return `<div class="apkrow">${img ? `<img src="${f ? URL.createObjectURL(f) : blobUrl(d.assetId)}" alt="">` : '<span class="apkic">📄</span>'}<span class="apkn">${esc(nm)}<label class="inl dpin"><input type="checkbox" data-k="${k}" ${it.inPdf ? "checked" : ""}> Add to client PDF</label></span><button type="button" class="iconbtn apkx" data-k="${k}" aria-label="Remove">✕</button></div>`;
      })
      .join("");
    list.querySelectorAll(".dpin input").forEach(
      (cb) =>
        (cb.onchange = () => {
          items[+cb.dataset.k].inPdf = cb.checked;
        }),
    );
    list.querySelectorAll(".apkx").forEach(
      (b) =>
        (b.onclick = () => {
          items.splice(+b.dataset.k, 1);
          draw();
        }),
    );
  }
  draw();
  return { items: () => items.slice() };
}
function clDocsHtml(c) {
  const ds = c.docs || [];
  return `<div class="card" style="margin-top:12px;padding:10px 12px" id="cv-docs"><div class="checkhead"><b>📄 Documents (${ds.length})</b><button type="button" class="pillbtn" id="cd-add">+ Add documents</button></div>
    ${
      ds.length
        ? ds
            .map(
              (
                d,
                i,
              ) => `<div class="attrow"><button type="button" class="incrow cd-open" data-i="${i}">${/^image\//.test(d.type || "") ? `<img class="attth" src="${blobUrl(d.assetId)}" alt="" loading="lazy">` : '<span class="attic" aria-hidden="true">📄</span>'}<span><b>${esc(d.name || "Document")}</b><br><span class="who">${esc(stamp(d.at))}</span></span></button>
      <label class="inl dpin2" title="Add to client PDF"><input type="checkbox" class="cd-pdf" data-i="${i}" ${d.inPdf !== false ? "checked" : ""}> In PDF</label><button type="button" class="iconbtn cd-dl" data-i="${i}" aria-label="Download">⬇</button><button type="button" class="iconbtn cd-x" data-i="${i}" aria-label="Delete" style="color:var(--danger)">🗑</button></div>`,
            )
            .join("")
        : `<div class="who">None yet. Add plans, quotes or letters, and tick which go into the client PDF.</div>`
    }</div>`;
}
function wireClDocs(c) {
  const box = $("cv-docs");
  if (!box) return;
  const ds = () => ptCl(c).docs || [];
  box.querySelectorAll(".cd-open").forEach(
    (b) =>
      (b.onclick = () => {
        const d = ds()[+b.dataset.i];
        if (d) openFile(d.assetId, d.name, d.type);
      }),
  );
  box.querySelectorAll(".cd-dl").forEach(
    (b) =>
      (b.onclick = () => {
        const d = ds()[+b.dataset.i];
        if (d) saveAsset(d.assetId, d.name);
      }),
  );
  box.querySelectorAll(".cd-pdf").forEach(
    (cb) =>
      (cb.onchange = async () => {
        const cur = ptCl(c);
        const docs = (cur.docs || []).map((d, i) =>
          i === +cb.dataset.i ? Object.assign({}, d, { inPdf: cb.checked }) : d,
        );
        try {
          await saveClient(Object.assign({}, cur, { docs }));
          toast(cb.checked ? "Will be in the client PDF" : "Left out of the client PDF");
        } catch (e) {
          cb.checked = !cb.checked;
          toast("Couldn't save");
        }
      }),
  );
  box.querySelectorAll(".cd-x").forEach(
    (b) =>
      (b.onclick = async () => {
        if (b.dataset.armed !== "1") {
          b.dataset.armed = "1";
          b.textContent = "Sure?";
          b.style.width = "auto";
          b.style.padding = "0 8px";
          toast("Tap again to delete this document");
          return;
        }
        const cur = ptCl(c);
        const d = (cur.docs || [])[+b.dataset.i];
        try {
          const rec = await saveClient(
            Object.assign({}, cur, { docs: (cur.docs || []).filter((x, i) => i !== +b.dataset.i) }),
          );
          toast("Document deleted");
          viewClient(rec);
        } catch (e) {
          toast("Couldn't delete");
        }
      }),
  );
  $("cd-add").onclick = () => {
    const cur = ptCl(c);
    closeViewer();
    openSheet(
      `<h3 id="sheettitle">📄 Add documents for ${esc(cur.name)}</h3><div id="cd-pick"></div>${formFoot(false, "Save")}`,
      async () => {
        const its = pick.items().filter((x) => x.file);
        if (!its.length) {
          showErr("Add a document first");
          return;
        }
        if (!S.assets) {
          showErr(uploadErr({ code: "not_granted" }));
          return;
        }
        $("f-save").disabled = true;
        const nd = [];
        try {
          for (let i = 0; i < its.length; i++) {
            const it = its[i];
            $("f-save").textContent = `Saving ${i + 1}/${its.length}…`;
            const img = /^image\//.test(it.file.type || "");
            let blob = it.file;
            if (img) {
              try {
                blob = await shrinkImage(it.file, 2200);
              } catch (e) {}
            }
            const a = await uploadFile(blob, it.file.name || "document");
            nd.push({
              assetId: a.id,
              name: it.file.name || (img ? "Document photo.jpg" : "Document"),
              type: img ? "image/jpeg" : it.file.type || "application/pdf",
              size: blob.size,
              at: Date.now() + i,
              inPdf: it.inPdf,
            });
          }
          const c2 = ptCl(cur);
          const rec = await saveClient(Object.assign({}, c2, { docs: (c2.docs || []).concat(nd) }));
          closeForm();
          toast(`${nd.length} document${nd.length === 1 ? "" : "s"} added`);
          viewClient(rec);
        } catch (e) {
          showErr(uploadErr(e));
          $("f-save").disabled = false;
          $("f-save").textContent = "Save";
        }
      },
      null,
    );
    const pick = docPicker($("cd-pick"), []);
  };
}
/* turn a stored PDF into page pictures for the client PDF */
async function pdfToPages(assetId) {
  await loadPdfJs();
  const lib = window.pdfjsLib;
  const buf = await (await fetch(blobUrl(assetId))).arrayBuffer();
  const pdf = await lib.getDocument({ data: buf, isEvalSupported: false }).promise;
  const out = [];
  for (let i = 1; i <= Math.min(pdf.numPages, 40); i++) {
    const pg = await pdf.getPage(i);
    const v1 = pg.getViewport({ scale: 1 });
    const sc = Math.min(2, 1600 / Math.max(v1.width, v1.height));
    const v = pg.getViewport({ scale: sc });
    const cv = document.createElement("canvas");
    cv.width = Math.round(v.width);
    cv.height = Math.round(v.height);
    const g = cv.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, cv.width, cv.height);
    await pg.render({ canvasContext: g, viewport: v }).promise;
    out.push({
      data: cv.toDataURL("image/jpeg", 0.85),
      wmm: (v1.width * 25.4) / 72,
      hmm: (v1.height * 25.4) / 72,
    });
  }
  return out;
}
