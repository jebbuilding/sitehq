/* ===== Photo test: plain phone file boxes, to tell an app/phone problem from a SiteHQ one ===== */
import { APP_LINK } from "../clients/portal.js";
import { esc } from "../core/helpers.js";
export { initPhotoTest };
function photoTest(){const d=document.createElement("div");d.className="dimask";d.style.zIndex="90";
  d.innerHTML=`<div class="dimbox" style="max-width:440px;max-height:90vh;overflow:auto"><b>📷 Photo test</b><div class="who">These are your phone's own plain buttons, with nothing from SiteHQ around them. Tap each one.</div>
    <div class="ptst"><b>1. Camera</b><input type="file" accept="image/*" capture="environment" id="pt1" data-cam="1"><span id="pt1r" class="who">Not tried</span></div>
    <div class="ptst"><b>2. Gallery</b><input type="file" accept="image/*" id="pt2" data-cam="1"><span id="pt2r" class="who">Not tried</span></div>
    <div class="ptst"><b>3. Any file</b><input type="file" id="pt3" data-cam="1"><span id="pt3r" class="who">Not tried</span></div>
    <div class="notice" style="margin:8px 0 0">If nothing opens when you tap these, the Claude app on this phone isn't letting pages open the camera or files. Try:<br>• Phone <b>Settings › Apps › Claude › Permissions</b>: allow <b>Camera</b> and <b>Photos and videos</b>.<br>• Update the Claude app, then close it fully and open it again.<br>• Or open SiteHQ in <b>Chrome</b>: ${esc(APP_LINK)}</div>
    <div class="dimbtns"><button type="button" class="btn primary ptx">Close</button></div></div>`;
  document.body.appendChild(d);d.querySelector(".ptx").onclick=()=>d.remove();
  [1,2,3].forEach(n=>{const i=d.querySelector("#pt"+n),r=d.querySelector("#pt"+n+"r");i.addEventListener("click",()=>{r.textContent="Tapped… waiting for your phone";r.style.color=""});i.onchange=()=>{const f=i.files[0];r.textContent=f?`✓ Worked: ${f.name||"photo"} (${Math.round((f.size||0)/1024)} KB)`:"Opened but nothing chosen";r.style.color=f?"var(--ok)":""}})}

/* Runs once when the app starts, called from core/boot.js. Nothing else in this file runs at load. */
function initPhotoTest(){
window.__photoTest=photoTest;
}
