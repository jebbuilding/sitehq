/* ================= EST PREVIEW: see an estimate or invoice as it will print, before printing or saving ================= */
import { esc, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { loadPdfJs } from "../files/in-app-files.js";
import { printBlob } from "../files/print.js";
import { sdIsPf } from "./sales-calc.js";
import { sdPdf } from "./sales-pdf.js";
import { sdLetterheadAsk } from "./sales-settings.js";
export { epvOpen };
/* James (Nov 2026): "In invoice and estimate add a preview button to see what it looks like before printing or saving".
   👁 Preview in the estimate or invoice window makes the PDF from what is on the screen now (nothing is saved) and
   shows every page as a picture – an iPad shows only the first page of a PDF in a frame, so the pages are drawn with
   pdf.js – with 🖨 Print and 📄 Save PDF under them. A new one with no number yet shows "(number when saved)". */
async function epvOpen(d) {
  if (!(await sdLetterheadAsk())) return;
  const mask = document.createElement("div");
  mask.className = "dimask epv-mask";
  mask.innerHTML = `<div class="dimbox epv-box" role="dialog" aria-label="Preview"><div class="epv-head"><b>👁 Preview – ${esc(d.type === "estimate" ? "estimate" : "invoice")}${d.number ? " " + esc(d.number) : " (number when saved)"}</b><button type="button" class="btn primary" id="epv-x">Close</button></div><div class="epv-pages" id="epv-pages"><div class="who">Making the preview…</div></div><div class="dimbtns"><button type="button" class="btn" id="epv-print" disabled>🖨 Print</button><button type="button" class="btn" id="epv-save" disabled>📄 Save PDF</button></div></div>`;
  document.body.appendChild(mask);
  const close = () => mask.remove();
  mask.querySelector("#epv-x").onclick = close;
  mask.onclick = (e) => {
    if (e.target === mask) close();
  };
  let blob;
  try {
    blob = await sdPdf(d);
  } catch (e) {
    mask.querySelector("#epv-pages").innerHTML =
      '<div class="who">Couldn\'t make the preview. Check your connection.</div>';
    return;
  }
  const fn =
    `${d.type === "estimate" ? "Estimate" : sdIsPf(d) ? "Pro forma" : "Invoice"} ${d.number || ""} ${d.client || ""}`
      .replace(/[\\/:*?"<>|]+/g, "")
      .trim() + ".pdf";
  const pr = mask.querySelector("#epv-print"),
    sv = mask.querySelector("#epv-save");
  pr.disabled = sv.disabled = false;
  pr.onclick = () => printBlob(blob, fn);
  sv.onclick = async () => {
    try {
      await S.dl.save({ filename: fn, data: blob });
    } catch (e) {
      toast("Couldn't save the PDF here");
    }
  };
  const box = mask.querySelector("#epv-pages");
  try {
    await loadPdfJs();
    const pdf = await window.pdfjsLib.getDocument({
      data: new Uint8Array(await blob.arrayBuffer()),
    }).promise;
    box.innerHTML = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      if (!mask.isConnected) return;
      const page = await pdf.getPage(p);
      const v1 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: 1100 / v1.width });
      const cv = document.createElement("canvas");
      cv.width = Math.round(vp.width);
      cv.height = Math.round(vp.height);
      cv.className = "epv-page";
      cv.setAttribute("aria-label", "Page " + p + " of " + pdf.numPages);
      const g = cv.getContext("2d");
      g.fillStyle = "#fff";
      g.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: g, viewport: vp }).promise;
      box.appendChild(cv);
    }
  } catch (e) {
    /* no pdf.js (no signal): show the PDF itself */
    const u = URL.createObjectURL(blob);
    box.innerHTML = `<iframe class="epv-frame" src="${u}" title="Preview"></iframe>`;
  }
}
