/* ================= DRAW ON A FILE: ✏️ Draw on it in the document viewer – draw, arrows, boxes, measure and text on any drawing or document page ================= */
import { saveClient } from "../clients/clients.js";
import { viewClient } from "../clients/quick-enquiry.js";
import { bossFirst } from "../core/company-names.js";
import { $, esc, iso, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode, siteNames } from "../core/state.js";
import { closeViewer } from "../core/viewer.js";
import { openNotePage } from "../drawing/paving.js";
import { uploadErr, uploadFile } from "./files.js";
import { FV, closeFile, fvHostAt, getFileBlob } from "./in-app-files.js";
import { newId, submitJob } from "./outbox.js";
import { SENDTO } from "./send-to.js";
import { openMarkup } from "../photos/mark-up.js";
import { siteLabel } from "../sites/job-details.js";
export { dofForClient, dofHasClient, dofPage, dofStart };
/* James (Nov 2026): "in all drawings and documents do quick draw or text on it like in photos". Every drawing and
   document opens in the same viewer, so it has ✏️ Draw on it: the page you're looking at (or the picture) opens in
   the photo mark-up tools. The original stays exactly as uploaded – the drawn-on page is saved as a new picture:
   for the account holder it goes into 📤 Send to… (send it to trades or clients and/or keep it on the job's
   documents); a trade picks the site and it goes in with their photos, so the office sees it.
   Opened from a client's page (their documents or an enquiry's drawings – James, Nov 2026: "the document that I load or
   the photos can I quick draw, text or measure of it … can any of those be included into the sketch tab"), the
   drawn-on copy goes into that client's 📷 Photos & sketches instead, and 📝 Put on a sketch page places the page on a
   drawing page (pen, text, measurements, scale) saved there too. */
/* which client the open file belongs to: set just before it's opened from their page */
let dofCl = null;
function dofForClient(c, assetId) {
  dofCl = c && assetId ? { id: c.id, assetId } : null;
}
const dofClient = () =>
  dofCl && FV.id === dofCl.assetId
    ? (S.clients || []).find((x) => x.id === dofCl.id) || null
    : null;
/* add a picture or page to the client's 📷 Photos & sketches */
async function dofToClient(c, item) {
  const cur = (S.clients || []).find((x) => x.id === c.id) || c;
  return await saveClient(
    Object.assign({}, cur, {
      media: (cur.media || []).concat([Object.assign({ at: Date.now() }, item)]),
    }),
  );
}
function dofPageNo() {
  if (!FV.pdf) return 1;
  const b = $("fv-body").getBoundingClientRect();
  const h = fvHostAt(b.left + b.width / 2, b.top + b.height / 2);
  return (h && +h.dataset.p) || 1;
}
async function dofSource(pageNo) {
  if (FV.pdf) {
    const pg = await FV.pdf.getPage(pageNo);
    const b = pg.getViewport({ scale: 1 });
    let sc = 2200 / Math.max(b.width, b.height);
    if (b.width * b.height * sc * sc > 9e6) sc = Math.sqrt(9e6 / (b.width * b.height));
    const vp = pg.getViewport({ scale: sc });
    const cv = document.createElement("canvas");
    cv.width = Math.floor(vp.width);
    cv.height = Math.floor(vp.height);
    const g = cv.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, cv.width, cv.height);
    await pg.render({ canvasContext: g, viewport: vp }).promise;
    return await new Promise((res) => cv.toBlob(res, "image/jpeg", 0.9));
  }
  return await getFileBlob(FV.id);
}
async function dofStart() {
  if (!FV.id || (!FV.pdf && !$("fv-img"))) {
    toast("Open a drawing, PDF or picture to draw on it");
    return;
  }
  const pageNo = dofPageNo();
  const base = String(FV.name || "Document").replace(/\.[^.]+$/, "");
  const title = base + (FV.pdf && FV.pdf.numPages > 1 ? " – page " + pageNo : "");
  let src;
  try {
    src = await dofSource(pageNo);
  } catch (e) {
    toast("Couldn't open that page to draw on");
    return;
  }
  if (!src) return;
  $("markup").classList.add("dof-over");
  openMarkup(src, (out) => dofSave(out, title), "✏️ " + title, { done: "Next" });
}
const dofHasClient = () => ownerMode() && !!dofClient();
/* 📝 Put on a sketch page: the page you're looking at, on a drawing page of the client's */
async function dofPage() {
  const cl = dofClient();
  if (!cl || !FV.id || (!FV.pdf && !$("fv-img"))) return;
  const pageNo = dofPageNo();
  const base = String(FV.name || "Document").replace(/\.[^.]+$/, "");
  const title = base + (FV.pdf && FV.pdf.numPages > 1 ? " – page " + pageNo : "");
  const from = FV.id;
  let a;
  try {
    toast("Putting it on a page…");
    const src = await dofSource(pageNo);
    a = await uploadFile(src, title + ".jpg");
  } catch (e) {
    toast(uploadErr(e));
    return;
  }
  closeFile();
  closeViewer();
  openNotePage({
    title,
    size: "A4",
    orient: "land",
    pro: true,
    addPhoto: a.id,
    onSave: async (r) => {
      try {
        const rec = await dofToClient(cl, {
          id: r.preview,
          src: r.src,
          kind: "page",
          note: r.title || title,
          from,
        });
        toast("Page saved in " + cl.name + "'s photos & sketches");
        viewClient(rec);
      } catch (e) {
        toast("Couldn't save the page");
      }
    },
  });
}
async function dofSave(blob, title) {
  const name = title + " (marked up).jpg";
  /* the viewer sits above pop-up sheets, and the marked-up copy is what's wanted now */
  const cl = ownerMode() ? dofClient() : null;
  closeFile();
  if (cl) {
    try {
      const a = await uploadFile(blob, name);
      const rec = await dofToClient(cl, {
        id: a.id,
        kind: "photo",
        marked: true,
        note: title + " (marked up)",
      });
      toast("Saved in " + cl.name + "'s photos & sketches");
      viewClient(rec);
    } catch (e) {
      toast(uploadErr(e));
    }
    return;
  }
  if (ownerMode()) {
    let a;
    try {
      a = await uploadFile(blob, name);
    } catch (e) {
      toast(uploadErr(e));
      return;
    }
    SENDTO.open({ assetId: a.id, name, type: "image/jpeg", title: title + " (marked up)" });
    return;
  }
  const sites = siteNames();
  openSheet(
    `<h3 id="sheettitle">✏️ Save your mark-up</h3>
    <div class="who">It goes in with your photos for the site, so ${esc(bossFirst())} sees it. The original drawing isn't changed.</div>
    <label for="dof-site">Which site<select id="dof-site">${sites.map((s) => `<option value="${esc(s)}">${esc(siteLabel(s))}</option>`).join("")}<option value="">Not for a site</option></select></label>
    <label for="dof-note">Note (optional)<textarea id="dof-note" maxlength="300" placeholder="e.g. Lintel needs to go here, not where drawn"></textarea></label>
    ${formFoot(false, "Save")}`,
    async () => {
      $("f-save").disabled = true;
      try {
        const note = $("dof-note").value.trim();
        await submitJob({
          coll: "photos",
          docId: newId(),
          data: {
            site: $("dof-site").value,
            caption: "✏️ " + title + (note ? " – " + note : ""),
            takenAt: Date.now(),
            date: iso(new Date()),
            markup: true,
            created: Date.now(),
          },
          files: [{ blob, name, field: "assetId" }],
        });
        closeForm();
        toast("Saved with your photos");
      } catch (e) {
        showErr("Couldn't save – check your connection");
        $("f-save").disabled = false;
      }
    },
    "dof-site",
  );
}
