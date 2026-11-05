/* ================= SHEET (forms) ================= */
import { wirePicks } from "./fields.js";
import { $, esc, toast } from "./helpers.js";
import { S, ownerMode } from "./state.js";
import { render } from "./tabs-week.js";
import { closeViewer } from "./viewer.js";
import { isWord } from "../files/files.js";
import { VID_MAX } from "../photos/photos.js";
export { armDelete, closeForm, editing, formFoot, formType, initSheet, kindVal, myColl, myDoc, openSheet, setEditing, setFormType, setKindVal, showErr, touch };
let editing=null, delArmed=false, formType="hours", kindVal="extra", formSubmit=null;
/* other files set these through here: a variable can only be assigned in the file that declares it */
function setEditing(v){editing=v}
function setFormType(v){formType=v}
function setKindVal(v){kindVal=v}
function openSheet(html,submit,focusId){
  formSubmit=submit; delArmed=false;
  $("form").innerHTML=html; wirePicks($("form")); enhanceCamera($("form"));
  $("scrim").hidden=false;$("sheet").hidden=false;
  const c=$("f-cancel"); if(c) c.onclick=closeForm;
  if(focusId) setTimeout(()=>{const el=$(focusId);if(el)el.focus()},60);
}
function enhanceCamera(root){
  root.querySelectorAll('input[type=file]').forEach(inp=>{
    if(inp.dataset.cam||inp.hidden||inp.hasAttribute("capture")||!/image/.test(inp.accept||""))return; inp.dataset.cam="1";
    const lab=inp.closest("label")||inp; const wrap=document.createElement("div"); wrap.className="camrow";
    wrap.innerHTML=`<label class="btn primary camb"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="1.5" y="4" width="13" height="9.5" rx="2"/><circle cx="8" cy="8.7" r="2.5"/><path d="M5.5 4l1-2h3l1 2"/></svg><span>Take photo</span><input type="file" accept="image/*" capture="environment" hidden></label><span class="who camcount"></span>`;
    lab.insertAdjacentElement("beforebegin",wrap);
    const first=lab.firstChild;if(first&&first.nodeType===3&&lab!==inp){const hd=document.createElement("div");hd.className="flabel camhead";hd.textContent=first.textContent.trim();wrap.insertAdjacentElement("beforebegin",hd)}
    const cam=wrap.querySelector("input"), txt=wrap.querySelector(".camb span"), cnt=wrap.querySelector(".camcount");
    const upd=()=>{const n=inp.files.length;cnt.textContent=n?n+" photo"+(n===1?"":"s")+" ready":"";txt.textContent=n&&inp.multiple?"Take another":"Take photo"};
    cam.onchange=()=>{const f=cam.files[0];if(!f)return;
      try{const dt=new DataTransfer();if(inp.multiple)[...inp.files].forEach(x=>dt.items.add(x));dt.items.add(f);inp.files=dt.files;inp.dispatchEvent(new Event("change",{bubbles:true}))}
      catch(e){ // older phones: use the camera input itself as the form's file input
        const id=inp.id;inp.removeAttribute("id");inp.required=false;cam.id=id;cam.dataset.cam="1";inp.hidden=true;const l=inp.closest("label");if(l&&l!==inp)l.style.display="none";
        cnt.textContent="1 photo ready";txt.textContent="Retake photo";cam.onchange=()=>{cnt.textContent=cam.files.length?"1 photo ready":""};return}
      cam.value="";upd()};
    inp.addEventListener("change",upd);
    /* separate buttons (one file type each, which phones handle best) that all add into the form's own file input */
    const merge=(fs,btnInput)=>{if(!fs.length)return;try{const dt=new DataTransfer();if(inp.multiple)[...inp.files].forEach(x=>dt.items.add(x));(inp.multiple?fs:fs.slice(0,1)).forEach(x=>dt.items.add(x));inp.files=dt.files;inp.dispatchEvent(new Event("change",{bubbles:true}))}
      catch(e){const id=inp.id;inp.removeAttribute("id");inp.required=false;btnInput.id=id;inp.hidden=true;cnt.textContent=fs.length+" ready";return}};
    const addBtn=(html,acc,multi)=>{const l=document.createElement("label");l.className="btn fhpickbtn";l.innerHTML=html+`<input type="file" accept="${esc(acc)}" ${multi?"multiple":""} data-cam="1">`;wrap.insertBefore(l,cnt);const i=l.querySelector("input");i.onchange=()=>{const fs=[...i.files];merge(fs,i);i.value=""}};
    const parts=(inp.accept||"").split(",").map(x=>x.trim()).filter(Boolean);const vids=parts.filter(x=>/^video\//.test(x));const other=parts.filter(x=>!/^image\//.test(x)&&!/^video\//.test(x));
    addBtn("🖼 "+(inp.multiple?"Choose photos":"Choose a photo"),"image/*",inp.multiple);
    if(vids.length){const l=document.createElement("label");l.className="btn fhpickbtn";l.innerHTML=`🎥 Record video<input type="file" accept="video/*" capture="environment" data-cam="1">`;wrap.insertBefore(l,cnt);const i=l.querySelector("input");i.onchange=()=>{merge([...i.files],i);i.value=""};
      addBtn("🎞 Choose video","video/*",inp.multiple)}
    if(other.length)addBtn("📄 "+(other.some(x=>/pdf/.test(x))?(other.some(x=>/doc/.test(x))?"PDF / Word / file":"PDF / file"):"File"),other.join(","),inp.multiple);
    if(lab!==inp){lab.style.position="absolute";lab.style.width="1px";lab.style.height="1px";lab.style.overflow="hidden";lab.style.opacity="0";lab.style.pointerEvents="none"}else{inp.style.display="none"}
    /* show each chosen file with a ✕ so it can be taken off before saving */
    const list=document.createElement("div");list.className="camlist";wrap.insertAdjacentElement("afterend",list);let urls=[];
    const upd2=()=>{const fs=[...inp.files];const n=fs.length;const big=fs.filter(f=>/^video\//.test(f.type||"")&&f.size>VID_MAX);
      cnt.textContent=n?`${big.length?"⚠ "+big.length+" video too big (over 19 MB). ":""}${n} ready`:"";
      urls.forEach(u=>URL.revokeObjectURL(u));urls=[];
      list.innerHTML=fs.map((f,i)=>{const img=/^image\//.test(f.type||"")&&!/heic|heif/i.test(f.type||"");let u="";if(img){u=URL.createObjectURL(f);urls.push(u)}
        const ic=/^video\//.test(f.type||"")?"🎥":/^audio\//.test(f.type||"")?"🎤":isWord(f)?"📝":/pdf/.test(f.type||"")||/\.pdf$/i.test(f.name||"")?"📄":/^image\//.test(f.type||"")?"🖼":"📎";
        return `<div class="camitem">${img?`<img src="${u}" alt="">`:`<span class="camic">${ic}</span>`}<span class="camn">${esc(f.name||"photo.jpg")}<br><span class="who">${f.size>=1048576?(f.size/1048576).toFixed(1)+" MB":Math.max(1,Math.round(f.size/1024))+" KB"}${/^video\//.test(f.type||"")&&f.size>VID_MAX?" · too big":""}</span></span><button type="button" class="iconbtn camx" data-i="${i}" aria-label="Remove ${esc(f.name||"file")}">✕</button></div>`}).join("");
      list.querySelectorAll(".camx").forEach(b=>b.onclick=()=>{try{const dt=new DataTransfer();[...inp.files].forEach((x,k)=>{if(k!==+b.dataset.i)dt.items.add(x)});inp.files=dt.files;inp.dispatchEvent(new Event("change",{bubbles:true}))}catch(e){inp.value="";inp.dispatchEvent(new Event("change",{bubbles:true}))}})};
    inp.addEventListener("change",upd2);
  });
}
function showErr(t){const el=$("f-err");if(el){el.textContent=t;el.hidden=false}}
function closeForm(){$("scrim").hidden=true;$("sheet").hidden=true;editing=null;formSubmit=null;if(S.pending)render()}
const formFoot=(del,save="Save")=>`<div class="err" id="f-err" hidden></div>
  <div class="formactions"><span>${del?`<button type="button" class="linkdanger" id="f-del">Delete</button>`:""}</span>
  <span style="display:flex;gap:10px"><button type="button" class="btn" id="f-cancel">Cancel</button><button type="submit" class="btn primary" id="f-save">${save}</button></span></div>`;
function armDelete(fn){const b=$("f-del");if(!b)return;b.onclick=async()=>{if(!delArmed){delArmed=true;b.textContent="Tap again to delete";return}b.disabled=true;try{await fn();closeForm();toast("Deleted");touch()}catch(e){showErr("Couldn't delete. Check your connection and try again.");b.disabled=false}}}
function touch(){if(S.me&&!ownerMode()&&!S.client)S.db.doc("sheets/"+S.me).update({updated:Date.now()}).catch(()=>{})}
const myColl=c=>S.db.collection("sheets/"+S.me+"/"+c);
const myDoc=(c,id)=>S.db.doc("sheets/"+S.me+"/"+c+"/"+id);

/* Runs once when the app starts, called from core/boot.js. Nothing else in this file runs at load. */
function initSheet(){
/* call / text / email links: open them outside the app, so the app page never turns blank (on a computer a "tel:" link has nowhere to go) */
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest('a[href^="tel:"],a[href^="sms:"],a[href^="mailto:"]');if(!a)return;e.preventDefault();e.stopPropagation();
  const href=a.getAttribute("href");const num=decodeURIComponent(href.replace(/^(tel|sms|mailto):/i,"").split("?")[0]);const isMail=/^mailto:/i.test(href);
  const desk=window.matchMedia&&window.matchMedia("(pointer:fine)").matches&&!/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  if(desk){try{navigator.clipboard&&navigator.clipboard.writeText(num)}catch(x){}toast((isMail?"Email address":"Number")+" copied: "+num+(isMail?"":". Call it from your phone."))
    if(isMail){try{window.open(href,"_blank","noopener")}catch(x){}}return}
  try{const w=window.open(href,"_blank");if(!w){const l=document.createElement("a");l.href=href;l.target="_top";l.rel="noopener";document.body.appendChild(l);l.click();l.remove()}}catch(x){toast((isMail?"Email: ":"Number: ")+num)}},true);
$("scrim").onclick=closeForm;
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!$("viewer").hidden)closeViewer();else if(!$("sheet").hidden)closeForm()}});
$("form").addEventListener("submit",ev=>{ev.preventDefault();if(formSubmit)formSubmit()});
/* phones' app views often don't show the browser's "fill this in" bubble, so say what's missing ourselves */
$("form").addEventListener("invalid",ev=>{const el=ev.target;if($("form")._invT)return;$("form")._invT=setTimeout(()=>{$("form")._invT=null},300);
  const lab=(el.closest("label")&&el.closest("label").childNodes[0]&&el.closest("label").childNodes[0].textContent.trim())||el.getAttribute("aria-label")||el.placeholder||"a required box";
  const msg=el.type==="file"?"Add a photo or file first":`Please fill in: ${lab.replace(/\s*\(.*?\)\s*$/,"")}`;try{showErr(msg)}catch(e){toast(msg)}
  const v=el.type==="file"&&el.closest("label")&&el.closest("label").style.position==="absolute"?el.closest("form").querySelector(".camrow")||el:el;try{v.scrollIntoView({behavior:"smooth",block:"center"})}catch(e){}if(el.type!=="file")setTimeout(()=>{try{el.focus()}catch(e){}},300)},true);
}
