/* ================= DOC SCAN: scan a paper document with the camera and put it on a site or with a person ================= */
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { uploadErr, uploadFile } from "../files/files.js";
import { newId, submitJob } from "../files/outbox.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { PDOC_TYPES } from "../people/personal-documents.js";
import { loadImage } from "./photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { siteLabel } from "../sites/job-details.js";
import { DOC_CATS } from "../sites/plans-specs.js";
export { dscOpen };
/* James (Nov 2026): "In camera allow scan document to then input into a site or trade". Photos has 📄 Scan a
   document: take a picture of each page (or pick ones already taken), and each is cleaned up to look like a scan –
   cropped to the paper, straightened to white, in black and white or colour – turned round if needed, taken out
   with ✕, and put in order. The pages become one PDF which goes to:
   - a site's documents, in the folder chosen (James only; private to him, like File it), or
   - a person's documents (their driving licence, a CIS statement, a fit note…), as James or as the trade
     themselves – a trade can only put it in their own documents. */
const DSC = { pages: [], mono: true };
/* the paper: the bright part of the picture, a little in from the edges; then whiten it */
function dscClean(img, mono) {
  const max = 1800;
  const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * sc),
    h = Math.round(img.naturalHeight * sc);
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d");
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const lum = (i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  /* how bright the paper is: the 80th percentile of a sample */
  const smp = [];
  for (let i = 0; i < d.length; i += 4 * 37) smp.push(lum(i));
  smp.sort((a, b) => a - b);
  const paper = smp[Math.floor(smp.length * 0.8)] || 200;
  const thr = paper * 0.72;
  /* rows and columns that are mostly paper */
  const rowOk = (y) => {
    let n = 0;
    for (let x = 0; x < w; x += 6) if (lum((y * w + x) * 4) > thr) n++;
    return n / (w / 6) > 0.45;
  };
  const colOk = (x) => {
    let n = 0;
    for (let y = 0; y < h; y += 6) if (lum((y * w + x) * 4) > thr) n++;
    return n / (h / 6) > 0.45;
  };
  let t = 0,
    b = h - 1,
    l = 0,
    r = w - 1;
  while (t < h * 0.3 && !rowOk(t)) t++;
  while (b > h * 0.7 && !rowOk(b)) b--;
  while (l < w * 0.3 && !colOk(l)) l++;
  while (r > w * 0.7 && !colOk(r)) r--;
  const cw = Math.max(10, r - l),
    ch = Math.max(10, b - t);
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  const o = out.getContext("2d");
  o.drawImage(cv, l, t, cw, ch, 0, 0, cw, ch);
  const id = o.getImageData(0, 0, cw, ch);
  const p = id.data;
  const white = Math.max(120, paper * 0.92),
    black = Math.min(white - 60, paper * 0.35);
  for (let i = 0; i < p.length; i += 4) {
    if (mono) {
      const v = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
      const s = Math.max(0, Math.min(255, ((v - black) / (white - black)) * 255));
      p[i] = p[i + 1] = p[i + 2] = s;
    } else
      for (let k = 0; k < 3; k++)
        p[i + k] = Math.max(0, Math.min(255, ((p[i + k] - black) / (white - black)) * 255));
  }
  o.putImageData(id, 0, 0);
  return out;
}
function dscTurn(cv) {
  const o = document.createElement("canvas");
  o.width = cv.height;
  o.height = cv.width;
  const g = o.getContext("2d");
  g.translate(o.width, 0);
  g.rotate(Math.PI / 2);
  g.drawImage(cv, 0, 0);
  return o;
}
async function dscAdd(files) {
  for (const f of files) {
    try {
      const img = await loadImage(f);
      DSC.pages.push({ img, rot: 0, cv: dscClean(img, DSC.mono) });
    } catch (e) {
      toast('A picture couldn\'t be opened. Set the camera to JPG ("Most Compatible" on iPhone).');
    }
  }
  dscPages();
}
function dscPages() {
  const box = $("dsc-pages");
  if (!box) return;
  box.innerHTML = DSC.pages.length
    ? DSC.pages
        .map(
          (pg, i) =>
            `<div class="dsc-pg"><img src="${pg.cv.toDataURL("image/jpeg", 0.6)}" alt="Page ${i + 1}"><div class="dsc-pgb"><b>${i + 1}</b><button type="button" class="iconbtn dsc-rot" data-i="${i}" aria-label="Turn page ${i + 1}">↻</button>${i ? `<button type="button" class="iconbtn dsc-up" data-i="${i}" aria-label="Move page ${i + 1} earlier">↑</button>` : ""}<button type="button" class="iconbtn dsc-x" data-i="${i}" aria-label="Take out page ${i + 1}">✕</button></div></div>`,
        )
        .join("")
    : '<div class="who">No pages yet. Lay the document flat in good light and take a picture of each page.</div>';
  box.querySelectorAll(".dsc-x").forEach(
    (b) =>
      (b.onclick = () => {
        DSC.pages.splice(+b.dataset.i, 1);
        dscPages();
      }),
  );
  box.querySelectorAll(".dsc-up").forEach(
    (b) =>
      (b.onclick = () => {
        const i = +b.dataset.i;
        [DSC.pages[i - 1], DSC.pages[i]] = [DSC.pages[i], DSC.pages[i - 1]];
        dscPages();
      }),
  );
  box.querySelectorAll(".dsc-rot").forEach(
    (b) =>
      (b.onclick = () => {
        const pg = DSC.pages[+b.dataset.i];
        pg.rot = (pg.rot + 1) % 4;
        pg.cv = dscTurn(pg.cv);
        dscPages();
      }),
  );
  const n = $("dsc-n");
  if (n)
    n.textContent = DSC.pages.length
      ? DSC.pages.length + " page" + (DSC.pages.length === 1 ? "" : "s")
      : "";
}
async function dscPdf() {
  await loadJsPdf();
  const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
  DSC.pages.forEach((pg, i) => {
    if (i) doc.addPage();
    const W = 210,
      H = 297,
      m = 6;
    const k = Math.min((W - 2 * m) / pg.cv.width, (H - 2 * m) / pg.cv.height);
    const w = pg.cv.width * k,
      h = pg.cv.height * k;
    doc.addImage(pg.cv.toDataURL("image/jpeg", 0.82), "JPEG", (W - w) / 2, (H - h) / 2, w, h);
  });
  return doc.output("blob");
}
function dscOpen() {
  DSC.pages = [];
  const owner = ownerMode() && !S.preview;
  const sites = (S.sites || []).filter((s) => !s.archived).map((s) => s.name);
  const people = owner ? teamIds() : [];
  openSheet(
    `<h3 id="sheettitle">📄 Scan a document</h3>
    <div class="dsc-take"><label class="btn primary dsc-cam">📷 Take a picture of a page<input type="file" class="fpick" id="dsc-cam" accept="image/*" capture="environment"></label><label class="btn dsc-cam">🖼 Pick pictures already taken<input type="file" class="fpick" id="dsc-lib" accept="image/*" multiple data-cam="1"></label><span class="who" id="dsc-n"></span></div>
    <div class="seg" id="dsc-mode" role="group" aria-label="How it looks"><button type="button" data-v="mono" aria-pressed="true">⚫ Black and white</button><button type="button" data-v="col" aria-pressed="false">🎨 Colour</button></div>
    <div class="dsc-pages" id="dsc-pages"></div>
    <label for="dsc-title">What is it?<input id="dsc-title" maxlength="100" placeholder="e.g. Building control letter, Delivery note, CIS statement"></label>
    ${
      owner
        ? `<div class="flabel">Put it in</div><div class="seg" id="dsc-to" role="group"><button type="button" data-v="site" aria-pressed="true">🏗️ A site</button><button type="button" data-v="person" aria-pressed="false">👷 A person's documents</button></div>
    <div id="dsc-site"><div class="grid2"><label for="dsc-s">Site<select id="dsc-s">${sites.map((s) => `<option value="${esc(s)}"${s === S.f.proj ? " selected" : ""}>${esc(siteLabel(s))}</option>`).join("") || '<option value="">No sites yet</option>'}</select></label><label for="dsc-sc">Folder<select id="dsc-sc">${DOC_CATS.map(([k, l]) => `<option value="${k}"${k === "other" ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label></div></div>
    <div id="dsc-person" hidden><div class="grid2"><label for="dsc-p">Who<select id="dsc-p">${people.map((id) => `<option value="${esc(id)}">${esc(nameOf(id))}</option>`).join("") || '<option value="">No one yet</option>'}</select></label><label for="dsc-pk">Kind of document<select id="dsc-pk">${Object.entries(
      PDOC_TYPES,
    )
      .map(([k, l]) => `<option value="${k}"${k === "other" ? " selected" : ""}>${esc(l)}</option>`)
      .join("")}</select></label></div></div>`
        : `<div class="who">It goes into <b>My documents</b> on your details page.</div><label for="dsc-pk">Kind of document<select id="dsc-pk">${Object.entries(
            PDOC_TYPES,
          )
            .map(
              ([k, l]) =>
                `<option value="${k}"${k === "other" ? " selected" : ""}>${esc(l)}</option>`,
            )
            .join("")}</select></label>`
    }
    ${formFoot(false, "Save the scan")}`,
    async () => {
      if (!DSC.pages.length) return showErr("Take a picture of at least one page.");
      const title = $("dsc-title").value.trim() || "Scanned document";
      const to = owner ? $("dsc-to").querySelector('[aria-pressed="true"]').dataset.v : "me";
      if (to === "site" && !$("dsc-s").value) return showErr("Choose the site.");
      if (to === "person" && !$("dsc-p").value) return showErr("Choose who it's for.");
      $("f-save").disabled = true;
      $("f-save").textContent = "Saving…";
      try {
        const blob = await dscPdf();
        const fn =
          title
            .replace(/[^\w\s&().-]/g, "")
            .trim()
            .slice(0, 80) + ".pdf";
        const file = new File([blob], fn, { type: "application/pdf" });
        let said = "";
        if (to === "site") {
          const a = await uploadFile(file, fn);
          const site = $("dsc-s").value,
            cat = $("dsc-sc").value;
          await S.db.doc("todos/" + newId()).set({
            kind: "sitedoc",
            site,
            cat,
            title,
            fileName: fn,
            assetId: a.id,
            contentType: "application/pdf",
            size: blob.size,
            scanned: true,
            uploaded: Date.now(),
          });
          said =
            siteLabel(site) +
            " (" +
            (DOC_CATS.find((x) => x[0] === cat) || [, "Documents"])[1] +
            ")";
        } else {
          const k = $("dsc-pk").value;
          const data = {
            type: "persdoc",
            kind: k,
            label: k === "other" ? title : "",
            number: "",
            expires: "",
            note: k === "other" ? "" : title,
            types: ["application/pdf"],
            names: [fn],
            scanned: true,
            created: Date.now(),
          };
          if (to === "person") {
            const a = await uploadFile(file, fn);
            await S.db
              .doc("sheets/" + $("dsc-p").value + "/signoffs/pd-" + newId())
              .set(Object.assign(data, { photos: [a.id], byOwner: true }));
            said = nameOf($("dsc-p").value) + "'s documents";
          } else {
            const r = await submitJob({
              coll: "signoffs",
              docId: "pd-" + newId(),
              data,
              files: [{ blob: file, name: fn, field: "photos" }],
            });
            said =
              r === "queued" ? "your documents (sends when you have signal)" : "your documents";
          }
        }
        DSC.pages = [];
        closeForm();
        toast("Scanned " + title + " · saved to " + said);
        render();
      } catch (e) {
        showErr(uploadErr(e));
        $("f-save").disabled = false;
        $("f-save").textContent = "Save the scan";
      }
    },
    null,
  );
  $("dsc-cam").onchange = (e) => {
    dscAdd([...e.target.files]);
    e.target.value = "";
  };
  $("dsc-lib").onchange = (e) => {
    dscAdd([...e.target.files]);
    e.target.value = "";
  };
  $("dsc-mode")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          DSC.mono = b.dataset.v === "mono";
          $("dsc-mode")
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          DSC.pages.forEach((pg) => {
            let cv = dscClean(pg.img, DSC.mono);
            for (let i = 0; i < pg.rot; i++) cv = dscTurn(cv);
            pg.cv = cv;
          });
          dscPages();
        }),
    );
  if ($("dsc-to"))
    $("dsc-to")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            $("dsc-to")
              .querySelectorAll("button")
              .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
            $("dsc-site").hidden = b.dataset.v !== "site";
            $("dsc-person").hidden = b.dataset.v !== "person";
          }),
      );
  dscPages();
}
