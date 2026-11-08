/* ================= JOB FILE: every document, plan, price and photo for a job, in folders, tied to the client ================= */
import { clStage } from "../clients/clients.js";
import { viewClient } from "../clients/quick-enquiry.js";
import { clAddr } from "../clients/stages-planner.js";
import { $, esc, gbp, iso, shortDay, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { blobUrl, uploadFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { shrinkImage } from "../safety/training.js";
import { SD_IK, sdCalc, sdIk, sdNo, sdR2, sdSales, sdTag } from "./sales-calc.js";
import { sdEdit, sdToInvoice } from "./sales-edit.js";
export { jfFolderName, jfFor, jfOpen, jfOpenClient };
/* One job file per client enquiry, from the moment the enquiry is taken: the enquiry itself (details, the client
   PDFs and documents already on the client card), then folders for plans and drawings, supplier quotes and prices,
   subcontractor quotes, photos and surveys, building control and planning, letters and emails, other. Each file
   can carry a note, who it's from and a price; prices are added up against the estimate. The job's estimates and
   invoices are listed in it, with buttons to make the estimate (filled in from the enquiry) or an invoice.
   Owner-private record todos/jf-{id} (kind "jobfile"): { clientId, estId, client, title, site, items: [{ id,
   assetId, name, type, folder, note, from, price, added }] }. Opened from the client card, an estimate or an
   invoice: all of them reach the same file through the client (or, with no client, the estimate). */
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
/* the job file for a client, an estimate or an invoice */
function jfFor(d) {
  if (!d) return null;
  if (d.clientId) {
    const j = jfFiles().find((x) => x.clientId === d.clientId);
    if (j) return j;
  }
  const estId = d.type === "estimate" ? d.id : d.fromId;
  return jfFiles().find((x) => estId && x.estId === estId) || null;
}
async function jfSave(j) {
  const rec = Object.assign({}, j, { kind: "jobfile", updated: Date.now() });
  const id = rec.id || "jf-" + newId();
  delete rec.id;
  if (!rec.created) rec.created = Date.now();
  await S.db.doc("todos/" + id).set(rec);
  const out = Object.assign({ id }, rec);
  /* keep the in-memory list current so the page shows it before the database answers */
  S.jobFiles = (S.jobFiles || []).filter((x) => x.id !== id).concat([out]);
  return out;
}
const jfClient = (j) =>
  j && j.clientId ? (S.clients || []).find((c) => c.id === j.clientId) : null;
/* from an estimate or invoice */
function jfOpen(d) {
  const c = d.clientId ? (S.clients || []).find((x) => x.id === d.clientId) : null;
  const j = jfFor(d) || {
    clientId: d.clientId || "",
    estId: d.type === "estimate" ? d.id : d.fromId || "",
    client: d.client || "",
    title: d.title || (c && c.work) || "",
    site: d.site || "",
    items: [],
  };
  jfView(j, {
    back: () => sdEdit(sdSales().find((x) => x.id === d.id) || d),
    backLab: d.type === "estimate" ? "estimate" : "invoice",
  });
}
/* from the client card (the enquiry) */
function jfOpenClient(c) {
  const j = jfFiles().find((x) => x.clientId === c.id) || {
    clientId: c.id,
    estId: "",
    client: c.name || "",
    title: c.work || "",
    site: c.site || clAddr(c) || "",
    items: [],
  };
  jfView(j, {
    back: () => viewClient((S.clients || []).find((x) => x.id === c.id) || c),
    backLab: "client",
  });
}
/* everything the job has: its estimates and invoices */
const jfSales = (j) =>
  sdSales()
    .filter(
      (x) =>
        (j.clientId && x.clientId === j.clientId) ||
        (j.estId && (x.id === j.estId || x.fromId === j.estId)),
    )
    .sort((a, b) =>
      a.type === b.type
        ? (b.date || "").localeCompare(a.date || "")
        : a.type === "estimate"
          ? -1
          : 1,
    );
function jfView(j, ctx) {
  const items = j.items || [];
  const c = jfClient(j);
  const sales = jfSales(j);
  const est = sales.find((x) => x.type === "estimate");
  const priced = items.filter((i) => +i.price > 0);
  const costs = sdR2(priced.reduce((a, i) => a + +i.price, 0));
  const estNet = est ? sdCalc(est).net : 0;
  const open = S.f.jfo || {};
  const cdocs = c
    ? (c.docs || [])
        .map((x) => ({
          assetId: x.assetId,
          name: x.name || "Document",
          type: x.type || "",
          at: x.at,
        }))
        .concat(
          (c.recordPdfs || []).map((x) => ({
            assetId: x.assetId,
            name: x.name,
            type: "application/pdf",
            at: x.at,
          })),
        )
    : [];
  openViewer(`<div class="jf-page">
    <div class="sd-edtop"><h3 style="margin:0">📁 Job file</h3><span class="who">${esc([j.client, j.title, j.site].filter(Boolean).join(" · "))}</span></div>
    ${
      c
        ? `<section class="card jf-enq"><div class="cardbody"><b>📝 The enquiry</b>
      ${[
        ["Client", c.name],
        ["Phone", c.phone],
        ["Email", c.email],
        [
          "Address",
          [String(c.address || "").replace(/\s*\n\s*/g, ", "), c.postcode]
            .filter(Boolean)
            .join(", "),
        ],
        ["The work", c.work],
        ["Where it's up to", clStage(c.stage)],
      ]
        .filter((x) => x[1])
        .map(([k, v]) => `<div class="drow"><span>${esc(k)}</span><span>${esc(v)}</span></div>`)
        .join("")}
      ${cdocs.length ? `<div class="flabel">On the client card</div>${cdocs.map((x, i) => `<div class="jf-item"><span class="jf-ic">${/pdf/.test(x.type) ? "📕" : /^image\//.test(x.type) ? "🖼" : "📄"}</span><span class="jf-nm"><b>${esc(x.name)}</b>${x.at ? `<small>${esc(stamp(x.at))}</small>` : ""}</span><button type="button" class="btn jf-copen" data-i="${i}">Open</button></div>`).join("")}` : ""}
      <div class="sd-acts"><button type="button" class="btn" id="jf-client">Open the client card (enquiry, sketches, visit photos)</button></div>
    </div></section>`
        : ""
    }
    <section class="card jf-money"><div class="cardbody"><b>💰 Estimates & invoices</b>
      ${sales.length ? sales.map((x) => `<button type="button" class="drow jf-sale" data-id="${esc(x.id)}"><span>${esc(sdNo(x))}${x.type === "invoice" ? " · " + esc(SD_IK[sdIk(x)]) : ""} ${sdTag(x)}</span><span>${gbp(x.type === "estimate" ? sdCalc(x).net : sdCalc(x).due)}</span></button>`).join("") : `<div class="who">No estimate yet.</div>`}
      <div class="sd-acts"><button type="button" class="btn primary" id="jf-newest">📝 ${est ? "Another estimate" : "Make the estimate"}</button><button type="button" class="btn" id="jf-newinv">🧾 ${est ? "Make an invoice" : "An invoice"}</button></div>
    </div></section>
    <div class="sd-acts">
      <label for="jf-fold" class="jf-foldl">Put new files in<select id="jf-fold">${JF_FOLDERS.map(([k, l]) => `<option value="${k}"${k === (S.f.jfadd || "plans") ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      <span class="btn primary sd-filebtn">📄 Add files<input type="file" class="jf-file" multiple accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.txt,.csv,.eml,.msg" aria-label="Add files to the job file"></span>
      <span class="btn sd-filebtn">📷 Take a photo<input type="file" class="jf-cam" accept="image/*" capture="environment" aria-label="Take a photo for the job file"></span>
    </div>
    ${
      priced.length
        ? `<section class="card jf-prices"><div class="cardbody"><b>Prices you've got</b>
      ${priced.map((i) => `<div class="drow"><span>${esc(i.from || i.name)}${i.note ? ` <span class="who">· ${esc(i.note)}</span>` : ""}</span><span>${gbp(i.price)}</span></div>`).join("")}
      <div class="drow"><span><b>Total of your prices</b></span><b>${gbp(costs)}</b></div>
      ${estNet ? `<div class="drow"><span>Your estimate (before VAT)</span><span>${gbp(estNet)}</span></div><div class="drow sd-due"><span><b>Left for labour and profit</b></span><b class="${estNet - costs < 0 ? "jf-neg" : ""}">${gbp(estNet - costs)} (${Math.round(((estNet - costs) / estNet) * 100)}%)</b></div>` : ""}
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
    <div class="sd-edacts"><button type="button" class="btn" id="jf-back">‹ Back to the ${esc(ctx.backLab)}</button></div>
  </div>`);
  $("jf-fold").onchange = () => (S.f.jfadd = $("jf-fold").value);
  document.querySelectorAll(".jf-fold").forEach(
    (x) =>
      (x.ontoggle = () => {
        S.f.jfo = Object.assign({}, S.f.jfo || {}, { [x.dataset.k]: x.open });
      }),
  );
  if ($("jf-client")) $("jf-client").onclick = () => viewClient(c);
  document.querySelectorAll(".jf-copen").forEach((b) => {
    const x = cdocs[+b.dataset.i];
    b.onclick = () => openFile(x.assetId, x.name, x.type);
  });
  document
    .querySelectorAll(".jf-sale")
    .forEach((b) => (b.onclick = () => sdEdit(sdSales().find((x) => x.id === b.dataset.id))));
  /* a new estimate or invoice, filled in from the enquiry */
  const from = (type) => {
    const base = {
      type,
      clientId: j.clientId || "",
      client: (c && c.name) || j.client || "",
      email: (c && c.email) || "",
      address: c
        ? [String(c.address || "").replace(/\s*,\s*/g, "\n"), c.postcode].filter(Boolean).join("\n")
        : "",
      dear: (c && c.name) || "",
      title: j.title || (c && c.work) || "",
      site: j.site || (c && c.site) || "",
    };
    if (type === "invoice" && est) Object.assign(base, { fromId: est.id });
    return base;
  };
  $("jf-newest").onclick = () => sdEdit(from("estimate"));
  $("jf-newinv").onclick = () => (est ? sdToInvoice(est) : sdEdit(from("invoice")));
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
      jfView(saved, ctx);
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  };
  [".jf-file", ".jf-cam"].forEach((cl) => {
    const fi = document.querySelector(cl);
    fi.onchange = () => {
      const files = [...(fi.files || [])];
      fi.value = "";
      add(files);
    };
  });
  document.querySelectorAll(".jf-item[data-id]").forEach((row) => {
    const it = items.find((i) => i.id === row.dataset.id);
    row.querySelector(".jf-open").onclick = () => openFile(it.assetId, it.name, it.type);
    row.querySelector(".jf-edit").onclick = () => jfEditItem(j, it, ctx);
  });
  $("jf-back").onclick = ctx.back;
}
function jfEditItem(j, it, ctx) {
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
        jfView(saved, ctx);
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
      jfView(saved, ctx);
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  };
}
