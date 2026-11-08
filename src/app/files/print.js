/* ================= PRINT: every PDF can be printed (share sheet on the tab, print dialog on a computer) ================= */
import { esc, toast } from "../core/helpers.js";
import { ownerMode } from "../core/state.js";
import { fileItSheet } from "./file-it.js";
import { getFileBlob, loadPdfJs } from "./in-app-files.js";
export { pdfSavedBar, printAsset, printBlob };
const isTouch = () =>
  /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
async function printBlob(blob, name) {
  if (!blob) {
    toast("Nothing to print");
    return;
  }
  name = name || "document.pdf";
  const file = new File([blob], name, { type: blob.type || "application/pdf" });
  if (isTouch() && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  /* computers: draw each PDF page as a picture in a hidden page and print that – works in every browser and opens the normal print box where you pick your printer */
  if (/pdf/.test(blob.type || "application/pdf") || /\.pdf$/i.test(name)) {
    try {
      toast("Opening the print dialog…");
      await loadPdfJs();
      const pdf = await window.pdfjsLib.getDocument({
        data: new Uint8Array(await blob.arrayBuffer()),
      }).promise;
      const imgs = [];
      for (let i = 1; i <= Math.min(pdf.numPages, 60); i++) {
        const pg = await pdf.getPage(i);
        const vp = pg.getViewport({ scale: 2 });
        const cv = document.createElement("canvas");
        cv.width = Math.floor(vp.width);
        cv.height = Math.floor(vp.height);
        const g = cv.getContext("2d");
        g.fillStyle = "#fff";
        g.fillRect(0, 0, cv.width, cv.height);
        await pg.render({ canvasContext: g, viewport: vp }).promise;
        imgs.push({ src: cv.toDataURL("image/jpeg", 0.92), land: vp.width > vp.height });
      }
      try {
        pdf.destroy();
      } catch (e) {}
      const f = document.createElement("iframe");
      f.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0";
      f.srcdoc = `<!doctype html><html><head><title>${esc(name.replace(/\.pdf$/i, ""))}</title><style>@page{margin:0}html,body{margin:0;padding:0;background:#fff}img{display:block;width:100%;height:auto;page-break-after:always;break-after:page}img:last-child{page-break-after:auto;break-after:auto}</style></head><body>${imgs.map((x) => `<img src="${x.src}" alt="">`).join("")}</body></html>`;
      document.body.appendChild(f);
      let fired = false;
      const go = () => {
        if (fired) return;
        fired = true;
        setTimeout(() => {
          try {
            f.contentWindow.focus();
            f.contentWindow.print();
          } catch (e) {
            toast("Couldn't open printing here – download it and print from your files");
          }
          setTimeout(() => f.remove(), 60000);
        }, 400);
      };
      f.onload = go;
      setTimeout(go, 4000);
      return;
    } catch (e) {
      /* fall back to printing the PDF itself */
    }
  }
  try {
    const u = URL.createObjectURL(blob);
    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0";
    f.src = u;
    document.body.appendChild(f);
    f.onload = () => {
      setTimeout(() => {
        try {
          f.contentWindow.focus();
          f.contentWindow.print();
        } catch (e) {
          window.open(u, "_blank");
        }
        setTimeout(() => {
          f.remove();
          URL.revokeObjectURL(u);
        }, 60000);
      }, 300);
    };
    toast(isTouch() ? "Opening print…" : "Opening the print dialog…");
  } catch (e) {
    toast("Couldn't print here – download it and print from your files");
  }
}
async function printAsset(id, name) {
  try {
    toast("Getting it ready to print…");
    const b = await getFileBlob(id);
    await printBlob(b, name);
  } catch (e) {
    toast("Couldn't open it to print. Check your connection.");
  }
}
/* after any PDF is saved, offer Print straight away */
function pdfSavedBar(blob, name) {
  const old = document.getElementById("pdfbar");
  if (old) old.remove();
  const d = document.createElement("div");
  d.id = "pdfbar";
  d.className = "pdfbar";
  d.innerHTML = `<span>📄 ${esc(name)}</span><button type="button" class="btn primary" id="pdfbar-p">🖨 Print</button>${ownerMode() ? `<button type="button" class="btn" id="pdfbar-f">📁 Save to…</button>` : ""}<button type="button" class="iconbtn" id="pdfbar-x" aria-label="Close">✕</button>`;
  document.body.appendChild(d);
  d.querySelector("#pdfbar-p").onclick = () => {
    printBlob(blob, name);
    d.remove();
  };
  const fb = d.querySelector("#pdfbar-f");
  if (fb)
    fb.onclick = () => {
      d.remove();
      fileItSheet(blob, name);
    };
  d.querySelector("#pdfbar-x").onclick = () => d.remove();
  setTimeout(() => {
    if (d.isConnected) d.remove();
  }, 25000);
}
