/* ================= EST FILES: quotes, drawings and every other file for an estimate, kept on the estimate screen ================= */
import { $, esc, gbp, iso, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { blobUrl, saveAsset, uploadAnyFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { SENDTO } from "../files/send-to.js";
import { binFromViewer } from "../owner/deleted-items.js";
import { shrinkImage } from "../safety/training.js";
import { JF_FOLDERS, jfFolderName, jfFor, jfOpen, jfSave } from "./job-file.js";
import { SD_KINDS, sdR2 } from "./sales-calc.js";
export { efMount };
/* A section on the estimate itself: add several files at once (other companies' quotes, photos of paper quotes,
   designs and drawings, spreadsheets, Word documents, saved emails), say what they are (the job file's folders),
   and see them with a picture or an icon. Tap a file to open it; ⋯ to rename it, move it to another folder, add a
   note, record who the quote is from and its price, save a copy, send it to someone, add it to the estimate as a
   line (with a mark-up), or delete it (to Deleted items). Quote prices are added up against the estimate's total.
   The files live in the job's file (todos/jf-*, owner-only), so they're the same files the 📁 Job file shows; nobody
   else sees them unless James sends one with 📤. ctx = { rec() the estimate as typed (with its id once saved),
   save() saves it and gives the record (or null), addLine(line) puts a line on the estimate, net() its total before
   VAT }. efMount returns a function that redraws the section. */
const EF_ACCEPT =
  "application/pdf,image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.odt,.ods,.dwg,.dxf,.eml,.msg,.zip";
const efIcon = (i) =>
  /pdf/.test(i.type || "") || /\.pdf$/i.test(i.name || "")
    ? "📕"
    : /sheet|excel|csv|\.xlsx?$|\.ods$/i.test((i.type || "") + " " + (i.name || ""))
      ? "📗"
      : /word|document|\.docx?$|\.odt$|\.rtf$/i.test((i.type || "") + " " + (i.name || ""))
        ? "📘"
        : /\.(dxf|dwg)$/i.test(i.name || "")
          ? "📐"
          : /\.(eml|msg)$/i.test(i.name || "") || /message/.test(i.type || "")
            ? "✉️"
            : "📄";
const efIsImg = (i) => /^image\/(jpeg|png|webp|gif|heic|heif|avif|bmp)$/.test(i.type || "");
function efMount(ctx) {
  const box = $("esf-box");
  if (!box) return () => {};
  const jobFor = () => {
    const r = ctx.rec();
    return jfFor(r);
  };
  const newJob = (r) => ({
    clientId: r.clientId || "",
    estId: r.id || "",
    client: r.client || "",
    title: r.title || "",
    site: r.site || "",
    items: [],
  });
  const draw = () => {
    const j = jobFor();
    const items = (j && j.items) || [];
    const priced = items.filter((i) => +i.price > 0);
    const costs = sdR2(priced.reduce((a, i) => a + +i.price, 0));
    const net = ctx.net();
    const fold = S.f.efadd || "supq";
    box.innerHTML = `<div class="cardbody">
      <div class="esf-head"><b>📎 Quotes, drawings & files</b><span class="who">${items.length ? items.length + " file" + (items.length === 1 ? "" : "s") : "none yet"}</span></div>
      <div class="who">Keep everything that goes with this estimate here: other companies' quotes (or a photo of a paper one), designs and drawings, spreadsheets, letters and emails. Only you can see them.</div>
      <div class="esf-add">
        <label for="esf-fold" class="esf-foldl">What are they?<select id="esf-fold">${JF_FOLDERS.map(([k, l]) => `<option value="${k}"${k === fold ? " selected" : ""}>${l}</option>`).join("")}</select></label>
        <label class="btn primary esf-pick">📄 Add files<input type="file" class="fpick esf-file" multiple accept="${EF_ACCEPT}" aria-label="Add files to this estimate"></label>
        <label class="btn esf-pick">📷 Take a photo<input type="file" class="fpick esf-cam" accept="image/*" capture="environment" aria-label="Take a photo for this estimate"></label>
      </div>
      ${JF_FOLDERS.map(([k, l]) => {
        const fs = items
          .filter((i) => (i.folder || "other") === k)
          .sort((a, b) => (b.added || 0) - (a.added || 0));
        if (!fs.length) return "";
        return `<div class="flabel">${l}</div>${fs
          .map(
            (i) =>
              `<div class="jf-item esf-item" data-id="${esc(i.id)}"><button type="button" class="esf-open" aria-label="Open ${esc(i.name)}">${efIsImg(i) ? `<img src="${esc(blobUrl(i.assetId))}" alt="" loading="lazy">` : `<span class="jf-ic">${efIcon(i)}</span>`}<span class="jf-nm"><b>${esc(i.name)}</b><small>${esc([i.from, i.note].filter(Boolean).join(" · "))}${i.price ? `${i.from || i.note ? " · " : ""}<b>${gbp(i.price)}</b>` : ""}${i.inEst ? " · ✓ on the estimate" : ""}</small></span></button><button type="button" class="btn esf-more" aria-label="More for ${esc(i.name)}">⋯</button></div>`,
          )
          .join("")}`;
      }).join("")}
      ${
        priced.length
          ? `<div class="esf-sum"><div class="flabel">Quotes you've got</div>
        ${priced.map((i) => `<div class="drow"><span>${esc(i.from || i.name)}${i.note ? ` <span class="who">· ${esc(i.note)}</span>` : ""}</span><span>${gbp(i.price)}</span></div>`).join("")}
        <div class="drow"><span><b>Total of the quotes</b></span><b>${gbp(costs)}</b></div>
        ${net ? `<div class="drow"><span>This estimate (before VAT)</span><span>${gbp(net)}</span></div><div class="drow sd-due"><span><b>Left for your labour and profit</b></span><b class="${net - costs < 0 ? "jf-neg" : ""}">${gbp(net - costs)} (${Math.round(((net - costs) / net) * 100)}%)</b></div>` : ""}
      </div>`
          : ""
      }
      ${items.length ? `<div class="sd-acts"><button type="button" class="btn" id="esf-jf">📁 Open the whole job file</button></div>` : ""}
    </div>`;
    $("esf-fold").onchange = () => (S.f.efadd = $("esf-fold").value);
    [".esf-file", ".esf-cam"].forEach((cl) => {
      const fi = box.querySelector(cl);
      fi.onchange = () => {
        const files = [...(fi.files || [])];
        fi.value = "";
        add(files, $("esf-fold").value);
      };
    });
    box.querySelectorAll(".esf-item").forEach((row) => {
      const it = items.find((i) => i.id === row.dataset.id);
      row.querySelector(".esf-open").onclick = () => openFile(it.assetId, it.name, it.type);
      row.querySelector(".esf-more").onclick = () => efItemSheet(j, it, ctx, draw);
    });
    if ($("esf-jf"))
      $("esf-jf").onclick = async () => {
        const r = await ctx.save();
        if (r) jfOpen(r);
      };
  };
  const add = async (files, folder) => {
    if (!files.length) return;
    /* the estimate is saved first, so the files have something to belong to */
    const r = await ctx.save();
    if (!r) return;
    toast("Adding " + files.length + " file" + (files.length === 1 ? "" : "s") + "…");
    const added = [];
    for (const f of files) {
      try {
        const img = /^image\/(jpeg|png|webp|gif|heic|heif|avif|bmp)$/.test(f.type);
        const blob = img ? await shrinkImage(f, 2200) : f;
        const a = await uploadAnyFile(blob, f.name || "photo.jpg");
        added.push({
          id: newId(),
          assetId: a.id,
          name: f.name || "Photo " + shortDay(iso(new Date())),
          type: img ? "image/jpeg" : a.contentType || f.type || "",
          folder,
          added: Date.now(),
        });
      } catch (e) {
        toast("Couldn't add " + (f.name || "a file") + ". Check your connection.");
      }
    }
    if (!added.length) return;
    const j = jfFor(r) || newJob(r);
    try {
      await jfSave(Object.assign({}, j, { items: (j.items || []).concat(added) }));
      toast(`Added ${added.length} to ${jfFolderName(folder).replace(/^\S+\s/, "")}`);
      draw();
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  };
  draw();
  return draw;
}
/* one file: change its details, or open, save, send, add to the estimate, delete */
function efItemSheet(j, it, ctx, redraw) {
  const priced = +it.price > 0;
  openSheet(
    `<h3 id="sheettitle">${esc(it.name)}</h3>
    <div class="esf-acts">
      <button type="button" class="btn" id="esf-o">👁 Open</button>
      <button type="button" class="btn" id="esf-dl">⬇️ Save a copy</button>
      <button type="button" class="btn" id="esf-send">📤 Send to someone</button>
      ${priced ? `<button type="button" class="btn primary" id="esf-line">➕ Add to the estimate</button>` : ""}
    </div>
    <label for="esf-n">Name<input id="esf-n" maxlength="120" value="${esc(it.name)}"></label>
    <label for="esf-f">What is it?<select id="esf-f">${JF_FOLDERS.map(([k, l]) => `<option value="${k}"${k === (it.folder || "other") ? " selected" : ""}>${l}</option>`).join("")}</select></label>
    <div class="grid2"><label for="esf-fr">Company or person it's from<input id="esf-fr" maxlength="80" value="${esc(it.from || "")}" placeholder="e.g. Coastal Roofing Ltd"></label><label for="esf-p">Their price £ (before VAT)<input id="esf-p" type="number" inputmode="decimal" step="0.01" value="${esc(it.price || "")}" placeholder="if it's a quote"></label></div>
    <label for="esf-no">Note<input id="esf-no" maxlength="200" value="${esc(it.note || "")}" placeholder="e.g. Revision C, steel beams only"></label>
    ${formFoot(true, "Save")}`,
    async () => {
      const patch = {
        name: $("esf-n").value.trim() || it.name,
        folder: $("esf-f").value,
        from: $("esf-fr").value.trim(),
        price: sdR2($("esf-p").value) || 0,
        note: $("esf-no").value.trim(),
      };
      try {
        await efPatch(j, it, patch);
        closeForm();
        redraw();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    "esf-n",
  );
  $("esf-o").onclick = () => {
    closeForm();
    openFile(it.assetId, it.name, it.type);
  };
  $("esf-dl").onclick = () => saveAsset(it.assetId, it.name);
  $("esf-send").onclick = () => {
    closeForm();
    SENDTO.open({
      assetId: it.assetId,
      name: it.name,
      type: it.type || "application/pdf",
      title: String(it.name || "").replace(/\.[^.]+$/, ""),
    });
  };
  if ($("esf-line")) $("esf-line").onclick = () => efLineSheet(j, it, ctx, redraw);
  $("f-del").onclick = () => {
    closeForm();
    binFromViewer(
      {
        assets: [it.assetId],
        title: it.name,
        type: it.type || "application/pdf",
        sub: "Job file" + (j.client ? " · " + j.client : ""),
      },
      redraw,
    );
  };
}
/* save one file's details in the job file (the freshest copy of it) */
async function efPatch(j, it, patch) {
  const cur = (S.jobFiles || []).find((x) => x.id === j.id) || j;
  return jfSave(
    Object.assign({}, cur, {
      items: (cur.items || []).map((x) => (x.id === it.id ? Object.assign({}, x, patch) : x)),
    }),
  );
}
/* a quote's price as a line on the estimate, with James's mark-up added if he wants */
function efLineSheet(j, it, ctx, redraw) {
  const k = it.folder === "supq" ? "mat" : it.folder === "subq" ? "lab" : "oth";
  const mu = S.f.efmu == null ? "" : S.f.efmu;
  const desc = [it.from, it.note].filter(Boolean).join(" – ") || it.name.replace(/\.[^.]+$/, "");
  openSheet(
    `<h3 id="sheettitle">➕ Add to the estimate</h3>
    <div class="who">${esc(it.from || it.name)}: ${gbp(it.price)} before VAT.</div>
    <label for="esf-ld">What the line says<textarea id="esf-ld" rows="2" maxlength="800">${esc(desc)}</textarea></label>
    <div class="grid2"><label for="esf-lmu">Add on for you %<input id="esf-lmu" type="number" inputmode="decimal" step="0.5" value="${esc(mu)}" placeholder="e.g. 15"></label>
    <label for="esf-lk">Type<select id="esf-lk">${Object.entries(SD_KINDS)
      .map(([v, l]) => `<option value="${v}"${v === k ? " selected" : ""}>${l}</option>`)
      .join("")}</select></label></div>
    <div class="drow sd-due"><span><b>Line amount</b></span><b id="esf-la"></b></div>
    ${formFoot(false, "Add the line")}`,
    async () => {
      const m = +$("esf-lmu").value || 0;
      const a = sdR2(+it.price * (1 + m / 100));
      S.f.efmu = $("esf-lmu").value;
      ctx.addLine({ d: $("esf-ld").value.trim() || desc, a, k: $("esf-lk").value });
      try {
        await efPatch(j, it, { inEst: true });
      } catch (e) {}
      closeForm();
      redraw();
      toast("Added as a line – press Save to keep it on the estimate");
    },
    "esf-ld",
  );
  const show = () =>
    ($("esf-la").textContent = gbp(sdR2(+it.price * (1 + (+$("esf-lmu").value || 0) / 100))));
  $("esf-lmu").oninput = show;
  show();
}
