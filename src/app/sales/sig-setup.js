/* ================= MY SIGNATURE (owner, in Setup): draw or upload James's signature for his documents ================= */
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { render } from "../core/tabs-week.js";
import { blobUrl, uploadFile } from "../files/files.js";
import { sigPad } from "../safety/site-inductions.js";
import { shrinkImage } from "../safety/training.js";
import { sdSet } from "./sales-calc.js";
import { sdSaveSet } from "./sales-settings.js";
export { sdSigCard, sdWireSig };
/* One signature, kept with the estimate and invoice settings (todos/salesset sigId), used on estimates, invoices,
   payment receipts and CIS statements. Draw it with a finger or pen, or upload a photo of it signed on white paper. */
function sdSigCard() {
  const id = sdSet().sigId;
  return `<div class="card sg-card"><div class="cardbody" style="border:0"><b>✍️ My signature</b>
    <div class="who">Goes on your estimates, invoices, payment receipts and CIS statements.</div>
    <div class="sg-now">${id ? `<img src="${esc(blobUrl(id))}" alt="Your signature" class="sg-img">` : `<span class="who">No signature yet.</span>`}</div>
    <div class="actions"><button type="button" class="btn primary" id="sg-draw">✍️ ${id ? "Draw it again" : "Draw my signature"}</button><span class="btn sd-filebtn">📷 Upload a photo of it<input type="file" class="sg-file" accept="image/*" aria-label="Upload a photo of your signature"></span>${id ? `<button type="button" class="linkdanger" id="sg-del">Remove</button>` : ""}</div>
  </div></div>`;
}
async function sdSigSave(blob, name) {
  const a = await uploadFile(blob, name);
  await sdSaveSet({ sigId: a.id });
}
function sdWireSig() {
  if (!$("sg-draw")) return;
  $("sg-draw").onclick = () => {
    openSheet(
      `<h3 id="sheettitle">✍️ Draw your signature</h3>
      <div class="who">Sign in the box with your finger (or a stylus), as you would on paper.</div>
      <div><div class="checkhead"><span class="flabel" style="margin:0">Your signature</span><button type="button" class="pillbtn" id="sg-clear">Clear</button></div><canvas id="sg-pad" class="sigpad" aria-label="Signature box"></canvas></div>
      ${formFoot(false, "Save my signature")}`,
      async () => {
        if (!pad.drawn) return showErr("Sign in the box first.");
        $("f-save").disabled = true;
        try {
          const blob = await (await fetch(pad.data())).blob();
          await sdSigSave(blob, "signature.png");
          closeForm();
          toast("Signature saved");
          render();
        } catch (e) {
          showErr("Couldn't save. Check your connection.");
          $("f-save").disabled = false;
        }
      },
    );
    const pad = sigPad($("sg-pad"));
    $("sg-clear").onclick = () => pad.clear();
  };
  const fi = document.querySelector(".sg-file");
  fi.onchange = async () => {
    const f = fi.files[0];
    fi.value = "";
    if (!f) return;
    try {
      await sdSigSave(await shrinkImage(f, 1200), f.name || "signature.jpg");
      toast("Signature saved");
      render();
    } catch (e) {
      toast("Couldn't save the picture. Check your connection.");
    }
  };
  if ($("sg-del"))
    $("sg-del").onclick = async () => {
      try {
        await sdSaveSet({ sigId: "" });
        toast("Signature removed");
        render();
      } catch (e) {
        toast("Couldn't save. Check your connection.");
      }
    };
}
