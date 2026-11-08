/* ================= JOB FILE: every document, plan, price and photo for a job, in folders, tied to the client ================= */
import { $, esc, gbp, iso, shortDay, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { blobUrl, uploadFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { shrinkImage } from "../safety/training.js";
import { sdCalc, sdR2, sdSales } from "./sales-calc.js";
import { sdEdit } from "./sales-edit.js";
export { jfFor, jfOpen };
/* One job file per estimate (and the invoices made from it): plans and drawings, supplier quotes and prices,
   subcontractor quotes, photos and surveys, letters and emails, building control and planning, other. Each file can
   carry a note, who it's from and a price; prices are added up against the estimate so James can see the margin.
   Owner-private record todos/jf-{id} (kind "jobfile"): { estId, clientId, client, title, site, items: [{ id,
   assetId, name, type, folder, note, from, price, vat, added }] }. Opened from an estimate or invoice. */
const JF_FOLDERS = [
  ["plans", "📐 Plans & drawings"],
  ["supq", "🧱 Supplier quotes & prices"],
  ["subq", "👷 Subcontractor quotes"],
  ["photos", "📷 Photos & surveys"],
  ["bc", "🏛 Building control & planning"],
  ["mail", "✉️ Letters & emails"],
  ["other", "📁 Other"],
];
const jfFolderName = (k) => (JF_FOLDERS.find((f) => f[0] === k) || JF_FOLDERS[6])[1];
const jfFiles = () => S.jobFiles || [];
/* the job file for an estimate (an invoice uses its estimate's) */
function jfFor(d) {
  const estId = d.type === "estimate" ? d.id : d.fromId;
  return (
    jfFiles().find(
      (j) => (estId && j.estId === estId) || (d.id && j.invIds && j.invIds.includes(d.id)),
    ) || null
  );
}
async function jfSave(j) {
  const rec = Object.assign({}, j, { kind: "jobfile", updated: Date.now() });
  const id = rec.id || "jf-" + newId();
  delete rec.id;
  if (!rec.created) rec.created = Date.now();
  await S.db.doc("todos/" + id).set(rec);
  const out = Object.assign({ id }, rec);
  /* keep the in-memory list current so the page shows it before the database answers */
  const list = (S.jobFiles || []).filter((x) => x.id !== id).concat([out]);
  S.jobFiles = list;
  return out;
}
/* open (making it if needed) the job file for an estimate or invoice */
async function jfOpen(d) {
  let j = jfFor(d);
  if (!j) {
    j = {
      estId: d.type === "estimate" ? d.id : d.fromId || "",
      invIds: d.type === "invoice" && !d.fromId ? [d.id] : [],
      clientId: d.clientId || "",
      client: d.client || "",
      title: d.title || "",
      site: d.site || "",
      items: [],
    };
  }
  jfView(j, d);
}
function jfView(j, d) {
  const items = j.items || [];
  const est = d.type === "estimate" ? d : sdSales().find((x) => x.id === j.estId);
  const priced = items.filter((i) => +i.price > 0);
  const costs = sdR2(priced.reduce((a, i) => a + +i.price, 0));
  const estNet = est ? sdCalc(est).net : 0;
  const open = S.f.jfo || {};
  openViewer(`<div class="jf-page">
    <div class="sd-edtop"><h3 style="margin:0">📁 Job file</h3><span class="who">${esc([j.client, j.title, j.site].filter(Boolean).join(" · "))}</span></div>
    <div class="sd-acts">
      <label for="jf-fold" class="jf-foldl">Put new files in<select id="jf-fold">${JF_FOLDERS.map(([k, l]) => `<option value="${k}"${k === (S.f.jfadd || "plans") ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      <span class="btn primary sd-filebtn">📄 Add files<input type="file" class="jf-file" multiple accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.txt,.csv,.eml,.msg" aria-label="Add files to the job file"></span>
      <span class="btn sd-filebtn">📷 Take a photo<input type="file" class="jf-cam" accept="image/*" capture="environment" aria-label="Take a photo for the job file"></span>
    </div>
    ${
      priced.length || estNet
        ? `<section class="card jf-prices"><div class="cardbody"><b>Prices you've got</b>
      ${priced.map((i) => `<div class="drow"><span>${esc(i.from || i.name)}${i.note ? ` <span class="who">· ${esc(i.note)}</span>` : ""}</span><span>${gbp(i.price)}</span></div>`).join("")}
      <div class="drow"><span><b>Total of your prices</b></span><b>${gbp(costs)}</b></div>
      ${estNet ? `<div class="drow"><span>Your estimate (before VAT)</span><span>${gbp(estNet)}</span></div><div class="drow sd-due"><span><b>Left for labour and profit</b></span><b class="${estNet - costs < 0 ? "jf-neg" : ""}">${gbp(estNet - costs)}${estNet ? ` (${Math.round(((estNet - costs) / estNet) * 100)}%)` : ""}</b></div>` : ""}
      <div class="who">Add a price to any supplier or subcontractor quote (tap it, then Edit) to see it here.</div>
    </div></section>`
        : ""
    }
    ${JF_FOLDERS.map(([k, l]) => {
      const fs = items
        .filter((i) => (i.folder || "other") === k)
        .sort((a, b) => (b.added || 0) - (a.added || 0));
      return `<details class="card jf-fold" data-k="${k}"${open[k] || (fs.length && open[k] !== false) ? " open" : ""}><summary><b>${l}</b><span class="who">${fs.length ? fs.length + " file" + (fs.length === 1 ? "" : "s") : "empty"}</span></summary><div class="cardbody">
        ${
          fs.length
            ? fs
                .map(
                  (i) =>
                    `<div class="jf-item" data-id="${esc(i.id)}">${/^image\//.test(i.type || "") ? `<img src="${esc(blobUrl(i.assetId))}" alt="" loading="lazy">` : `<span class="jf-ic">${/pdf/.test(i.type || "") ? "📕" : /word|doc/.test(i.type || i.name) ? "📘" : /sheet|xls|csv/.test(i.type || i.name) ? "📗" : "📄"}</span>`}<span class="jf-nm"><b>${esc(i.name)}</b><small>${esc([i.from, i.note].filter(Boolean).join(" · "))}${i.price ? ` · <b>${gbp(i.price)}</b>` : ""} · added ${esc(stamp(i.added))}</small></span><button type="button" class="btn jf-open">Open</button><button type="button" class="iconbtn jf-edit" aria-label="Edit ${esc(i.name)}">✏️</button></div>`,
                )
                .join("")
            : `<div class="nothing">Nothing here yet.</div>`
        }
      </div></details>`;
    }).join("")}
    <div class="sd-edacts"><button type="button" class="btn" id="jf-back">‹ Back to the ${d.type === "estimate" ? "estimate" : "invoice"}</button></div>
  </div>`);
  $("jf-fold").onchange = () => (S.f.jfadd = $("jf-fold").value);
  document.querySelectorAll(".jf-fold").forEach(
    (x) =>
      (x.ontoggle = () => {
        S.f.jfo = Object.assign({}, S.f.jfo || {}, { [x.dataset.k]: x.open });
      }),
  );
  const add = async (files) => {
    if (!files.length) return;
    toast("Adding " + files.length + " file" + (files.length === 1 ? "" : "s") + "…");
    const folder = $("jf-fold").value;
    const added = [];
    for (const f of files) {
      try {
        const img = /^image\//.test(f.type) && !/svg/.test(f.type);
        const blob = img ? await shrinkImage(f, 2200) : f;
        const a = await uploadFile(blob, f.name || "photo.jpg");
        added.push({
          id: newId(),
          assetId: a.id,
          name: f.name || "Photo " + shortDay(iso(new Date())),
          type: img ? "image/jpeg" : f.type || "",
          folder,
          added: Date.now(),
        });
      } catch (e) {
        toast("Couldn't add " + (f.name || "a file") + ". Check your connection.");
      }
    }
    if (!added.length) return;
    try {
      const saved = await jfSave(Object.assign({}, j, { items: (j.items || []).concat(added) }));
      S.f.jfo = Object.assign({}, S.f.jfo || {}, { [folder]: true });
      toast(`Added ${added.length} to ${jfFolderName(folder).replace(/^\S+\s/, "")}`);
      jfView(saved, d);
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  };
  [".jf-file", ".jf-cam"].forEach((c) => {
    const fi = document.querySelector(c);
    fi.onchange = () => {
      const files = [...(fi.files || [])];
      fi.value = "";
      add(files);
    };
  });
  document.querySelectorAll(".jf-item").forEach((row) => {
    const it = items.find((i) => i.id === row.dataset.id);
    row.querySelector(".jf-open").onclick = () => openFile(it.assetId, it.name, it.type);
    row.querySelector(".jf-edit").onclick = () => jfEditItem(j, it, d);
  });
  $("jf-back").onclick = () => sdEdit(sdSales().find((x) => x.id === d.id) || d);
}
function jfEditItem(j, it, d) {
  openSheet(
    `<h3 id="sheettitle">${esc(it.name)}</h3>
    <label for="ji-n">Name<input id="ji-n" maxlength="120" value="${esc(it.name)}"></label>
    <label for="ji-f">Folder<select id="ji-f">${JF_FOLDERS.map(([k, l]) => `<option value="${k}"${k === (it.folder || "other") ? " selected" : ""}>${l}</option>`).join("")}</select></label>
    <div class="grid2"><label for="ji-fr">From (supplier, subbie, architect…)<input id="ji-fr" maxlength="80" value="${esc(it.from || "")}"></label><label for="ji-p">Price £ (before VAT, if it's a quote)<input id="ji-p" type="number" inputmode="decimal" step="0.01" value="${esc(it.price || "")}"></label></div>
    <label for="ji-no">Note<input id="ji-no" maxlength="200" value="${esc(it.note || "")}" placeholder="e.g. Revision C, steel beams only"></label>
    ${formFoot(true, "Save")}`,
    async () => {
      const patch = {
        name: $("ji-n").value.trim() || it.name,
        folder: $("ji-f").value,
        from: $("ji-fr").value.trim(),
        price: sdR2($("ji-p").value) || 0,
        note: $("ji-no").value.trim(),
      };
      try {
        const saved = await jfSave(
          Object.assign({}, j, {
            items: (j.items || []).map((x) => (x.id === it.id ? Object.assign({}, x, patch) : x)),
          }),
        );
        closeForm();
        jfView(saved, d);
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    "ji-n",
  );
  $("f-del").onclick = async () => {
    try {
      const saved = await jfSave(
        Object.assign({}, j, { items: (j.items || []).filter((x) => x.id !== it.id) }),
      );
      closeForm();
      toast("Taken out of the job file");
      jfView(saved, d);
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  };
}
