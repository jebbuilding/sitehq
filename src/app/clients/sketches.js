/* ================= SKETCHES & PHOTO PAGES (clients) ================= */
import { saveClient } from "./clients.js";
import { ptCl } from "./portal.js";
import { viewClient } from "./quick-enquiry.js";
import { clAddr } from "./stages-planner.js";
import { $, esc, iso, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { openNotePage } from "../drawing/paving.js";
import { blobUrl, saveAsset, uploadFile } from "../files/files.js";
import { BIN_DAYS, binDelete, binFromViewer } from "../owner/deleted-items.js";
import { openMarkup } from "../photos/mark-up.js";
import { VID_MAX, audExt, audTag, isAud, vidExt, vidTag, wireVoice } from "../photos/photos.js";
import { shrinkImage } from "../safety/training.js";
export { clMediaHtml, wireClMedia };
function blankSketch(paper){return new Promise(res=>{const cv=document.createElement("canvas");cv.width=1600;cv.height=1200;const g=cv.getContext("2d");
  g.fillStyle="#ffffff";g.fillRect(0,0,cv.width,cv.height);
  if(paper!=="plain"){const step=paper==="grid"?40:50;g.strokeStyle=paper==="grid"?"#dfe6ee":"#e6eef6";g.lineWidth=1;
    if(paper==="grid")for(let x=step;x<cv.width;x+=step){g.beginPath();g.moveTo(x+.5,0);g.lineTo(x+.5,cv.height);g.stroke()}
    for(let y=step;y<cv.height;y+=step){g.beginPath();g.moveTo(0,y+.5);g.lineTo(cv.width,y+.5);g.stroke()}
    if(paper==="grid"){g.strokeStyle="#c9d4e0";for(let x=step*5;x<cv.width;x+=step*5){g.beginPath();g.moveTo(x+.5,0);g.lineTo(x+.5,cv.height);g.stroke()}for(let y=step*5;y<cv.height;y+=step*5){g.beginPath();g.moveTo(0,y+.5);g.lineTo(cv.width,y+.5);g.stroke()}}}
  cv.toBlob(b=>res(b),"image/png")})}
function clMediaHtml(c){const ms=(c.media||[]).slice().sort((a,b)=>b.at-a.at);
  return `<div class="flabel" style="margin-top:12px">Photos &amp; sketches (${ms.length})</div>
    <div class="actions"><label class="btn primary camb" style="cursor:pointer">📷 Take photos<input type="file" id="cm-cam" accept="image/*" capture="environment" hidden></label><label class="btn" style="cursor:pointer">🖼 Add photos<input type="file" id="cm-pick" accept="image/*" multiple hidden></label><label class="btn" style="cursor:pointer">🎥 Video<input type="file" id="cm-vid" accept="video/*" capture="environment" hidden></label><button class="btn vrec" id="cm-voice1" type="button">🎤 Voice note</button><button class="btn hv" id="cm-sketch" type="button">📝 New page</button></div><button type="button" class="linkbtn" onclick="window.__photoTest&&window.__photoTest()">📷 Camera not opening? Test it here</button>
    <div class="who" id="cm-prog"></div>
    ${ms.length?`<div class="cmselbar"><button type="button" class="pillbtn" id="cm-selon">☑ Select to delete</button></div><div class="phgrid cmgrid">${ms.map(m=>`<button type="button" class="ph cm-item${m.kind==="video"?" phvid":""}${m.kind==="audio"?" phaud":""}" data-m="${esc(m.id)}">${m.kind==="audio"?'<span class="audico" aria-hidden="true">🎤</span>':m.kind==="video"?vidTag(m.id)+'<span class="vidplay" aria-hidden="true">▶</span>':`<img src="${blobUrl(m.id)}" alt="${esc(m.kind==="sketch"?"Sketch":"Photo")}" loading="lazy">`}<span class="phcap"><b>${m.kind==="audio"?"🎤 Voice note"+(m.secs?" · "+m.secs+"s":""):m.kind==="video"?"🎥 Video":m.kind==="page"?"📝 Page":m.kind==="sketch"?"✏️ Sketch":m.marked?"✎ Marked-up photo":"📷 Photo"}</b>${m.note?" · "+esc(m.note):""}<br>${esc(stamp(m.at))}</span></button>`).join("")}</div>`:'<div class="nothing">Take photos on the visit, or draw a quick sketch with measurements.</div>'}`}
function wireClMedia(c){
  const addFiles=async files=>{if(!files.length)return;if(!S.assets){toast("Uploads aren't available here");return}
    const pr=$("cm-prog");const added=[];
    for(let i=0;i<files.length;i++){if(pr)pr.textContent=`Adding photo ${i+1} of ${files.length}…`;
      try{const f=files[i];if(isAud(f)){if(pr)pr.textContent="Uploading voice note…";const a=await uploadFile(f,"voice."+audExt(f.type));added.push({id:a.id,kind:"audio",type:f.type||"audio/mp4",secs:f.secs||0,at:Date.now()+i});continue}if(/^video\//.test(f.type||"")){if(f.size>VID_MAX){toast(`That video is too big (${(f.size/1048576).toFixed(0)} MB). Keep it to about 20 seconds.`);continue}if(pr)pr.textContent="Uploading video…";const a=await uploadFile(f,"video."+vidExt(f.type));added.push({id:a.id,kind:"video",type:f.type||"video/mp4",at:Date.now()+i});continue}
        const b=await shrinkImage(f);const a=await uploadFile(b,"photo.jpg");added.push({id:a.id,kind:"photo",at:Date.now()+i})}catch(e){toast("A photo or video couldn't be added")}}
    if(added.length){try{const rec=await saveClient(Object.assign({},c,{media:(c.media||[]).concat(added)}));toast(added.every(x=>x.kind==="audio")?"Voice note added":`Added ${added.length} photo${added.length===1?"":"s"}`);viewClient(rec)}catch(e){toast("Couldn't save")}}};
  $("cm-cam").onchange=e=>{const f=[...e.target.files];e.target.value="";addFiles(f)};
  $("cm-pick").onchange=e=>{const f=[...e.target.files];e.target.value="";addFiles(f)};if($("cm-vid"))$("cm-vid").onchange=e=>{const f=[...e.target.files];e.target.value="";addFiles(f)};wireVoice($("cm-voice1"),f=>addFiles([f]));
  $("cm-sketch").onclick=()=>{closeViewer();openNotePage({title:"",size:"A4",orient:"port",pro:ownerMode(),headLines:[["Client",c.name||""],["Address",clAddr(c)],["Phone",c.phone||""],["Email",c.email||""],["Work",[c.work,c.desc].filter(Boolean).join(" · ")],["Budget",c.budget||""],["Notes",(c.notes||[]).filter(n=>!n.auto).slice(-3).map(n=>n.text).join("\n")],["Visit",new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"})]],site:c.site||clAddr(c),pageType:"Site visit notes",client:c.name||"",clientAddr:clAddr(c),onSave:async r=>{try{const rec=await saveClient(Object.assign({},c,{media:(c.media||[]).concat([{id:r.preview,src:r.src,kind:"page",note:r.title,at:Date.now()}])}));toast("Page saved");viewClient(rec)}catch(e){toast("Couldn't save")}}})};
  let selMode=false;const picked=new Set();const bar=$("viewer").querySelector(".cmselbar");
  const drawBar=()=>{if(!bar)return;bar.innerHTML=selMode?`<b>${picked.size} selected</b><button type="button" class="btn delbtn" id="cm-seldel" ${picked.size?"":"disabled"}>🗑 Delete ${picked.size||""}</button><button type="button" class="pillbtn" id="cm-seloff">Cancel</button>`:`<button type="button" class="pillbtn" id="cm-selon">☑ Select to delete</button>`;
    const on=$("cm-selon");if(on)on.onclick=()=>{selMode=true;$("viewer").querySelector(".cmgrid").classList.add("selmode");drawBar()};
    const off=$("cm-seloff");if(off)off.onclick=()=>{selMode=false;picked.clear();$("viewer").querySelectorAll(".cm-item").forEach(t=>t.classList.remove("picked"));$("viewer").querySelector(".cmgrid").classList.remove("selmode");drawBar()};
    const del=$("cm-seldel");if(del)del.onclick=async()=>{if(!picked.size)return;if(del.dataset.armed!=="1"){del.dataset.armed="1";del.textContent=`Tap again to delete ${picked.size}`;return}
      try{const items=(ptCl(c).media||[]).filter(x=>picked.has(x.id));let n=0;for(const m of items){if(await binDelete({assets:[m.id,m.src].filter(Boolean),title:(m.note||({photo:"Photo",sketch:"Sketch",page:"Note page",video:"Video",audio:"Voice note"}[m.kind]||"Photo"))+" · "+c.name,sub:"Client photos & sketches · "+c.name,type:m.kind==="video"?(m.type||"video/mp4"):m.kind==="audio"?(m.type||"audio/mp4"):"image/jpeg",thumb:m.kind==="video"||m.kind==="audio"?"":m.id}))n++}toast(`${n} deleted · in Setup › Deleted items for ${BIN_DAYS} days`);viewClient(ptCl(c))}catch(e){toast("Couldn't delete")}}};
  drawBar();
  $("viewer").querySelectorAll(".cm-item").forEach(b=>b.onclick=()=>{if(selMode){const id=b.dataset.m;if(picked.has(id))picked.delete(id);else picked.add(id);b.classList.toggle("picked",picked.has(id));drawBar();return}const m=(c.media||[]).find(x=>x.id===b.dataset.m);if(m)viewClMedia(c,m)});
}
function openSketchNew(c){
  openSheet(`<h3 id="sheettitle">New sketch</h3><div><div class="flabel">Paper</div><div class="seg" id="sk-paper"><button type="button" data-v="plain" aria-pressed="true">Plain</button><button type="button" data-v="grid" aria-pressed="false">Squared</button><button type="button" data-v="lined" aria-pressed="false">Lined</button></div></div>
    <label for="sk-note">Title (optional)<input id="sk-note" maxlength="80" placeholder="e.g. Ground floor layout"></label>${formFoot(false,"Start drawing")}`,async()=>{
      const paper=$("sk-paper").querySelector('[aria-pressed="true"]').dataset.v, note=$("sk-note").value.trim(); closeForm();
      const blob=await blankSketch(paper);
      openMarkup(blob,async out=>{try{const a=await uploadFile(out,"sketch.jpg");const rec=await saveClient(Object.assign({},c,{media:(c.media||[]).concat([{id:a.id,kind:"sketch",note,at:Date.now()}])}));toast("Sketch saved");viewClient(rec)}catch(e){toast("Couldn't save the sketch")}},note||"Sketch: "+c.name,{col:"#111111",done:"Save"})},null);
  $("sk-paper").querySelectorAll("button").forEach(b=>b.onclick=()=>$("sk-paper").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))));
}
function viewClMedia(c,m){
  openViewer(`${m.kind==="audio"?`<div class="audview">🎤 ${audTag(blobUrl(m.id),'style="width:100%"')}</div>`:m.kind==="video"?`<video src="${blobUrl(m.id)}" controls playsinline preload="metadata" style="width:100%;border-radius:8px;background:#000"></video>`:`<img src="${blobUrl(m.id)}" alt="" style="width:100%;border-radius:8px;background:#fff">`}
    <label for="cmv-note" style="margin-top:10px">Note<input id="cmv-note" maxlength="120" value="${esc(m.note||"")}" placeholder="e.g. Rear wall, damp patch"></label>
    <div class="actions" style="margin-top:10px">${m.kind==="video"||m.kind==="audio"?"":`<button class="btn primary" id="cmv-draw" type="button">${m.kind==="page"?"✎ Open and edit":"✎ Draw on it"}</button>`}<button class="btn" id="cmv-save" type="button">Save note</button><button class="btn" id="cmv-dl" type="button">Download</button><button class="btn" id="cmv-back" type="button">‹ Back to client</button><button class="btn delbtn" id="cmv-del" type="button">🗑 Delete</button></div>`);
  const upd=async(patch,msg)=>{const media=(c.media||[]).map(x=>x.id===m.id?Object.assign({},x,patch):x);const rec=await saveClient(Object.assign({},c,{media}));if(msg)toast(msg);return rec};
  $("cmv-save").onclick=async()=>{try{const rec=await upd({note:$("cmv-note").value.trim()},"Saved");viewClient(rec)}catch(e){toast("Couldn't save")}};
  $("cmv-back").onclick=()=>viewClient(c);
  $("cmv-dl").onclick=()=>saveAsset(m.id,`${c.name.replace(/[^\w\s-]/g,"").trim()} ${m.kind==="sketch"?"sketch":m.kind==="audio"?"voice note":m.kind==="video"?"video":"photo"} ${iso(new Date(m.at))}.${m.kind==="audio"?audExt(m.type):m.kind==="video"?vidExt(m.type):"jpg"}`);
  if(m.kind==="video"||m.kind==="audio"){}else if(m.kind==="page"||m.kind==="photo"||m.marked) $("cmv-draw").onclick=()=>{closeViewer();
    const done=async r=>{try{const media=m.kind==="page"?(c.media||[]).map(x=>x.id===m.id?Object.assign({},x,{id:r.preview,src:r.src,note:r.title||x.note,at:Date.now()}):x):(c.media||[]).concat([{id:r.preview,src:r.src,kind:"page",note:r.title,at:Date.now(),from:m.id}]);
      const rec=await saveClient(Object.assign({},c,{media}));toast(m.kind==="page"?"Page saved":"Saved as a new page");viewClient(rec)}catch(e){toast("Couldn't save")}};
    if(m.kind==="page")openNotePage({srcId:m.src,title:m.note,pro:ownerMode(),onSave:done});else openNotePage({title:m.note||"",size:"A4",orient:"port",addPhoto:m.id,onSave:done})};
  else $("cmv-draw").onclick=()=>{closeViewer();openMarkup(blobUrl(m.id),async out=>{try{const a=await uploadFile(out,"marked.jpg");
      const rec=await saveClient(Object.assign({},c,{media:(c.media||[]).concat([{id:a.id,kind:m.kind,marked:m.kind!=="sketch",note:$("cmv-note")?$("cmv-note").value.trim():m.note||"",at:Date.now(),from:m.id}])}));toast("Saved as a new copy");viewClient(rec)}catch(e){toast("Couldn't save")}},m.kind==="sketch"?"Edit sketch":"Draw on photo",{col:m.kind==="sketch"?"#111111":undefined,done:"Save"})};
  const d=$("cmv-del");d.onclick=()=>binFromViewer({assets:[m.id,m.src].filter(Boolean),title:(m.note||({photo:"Photo",sketch:"Sketch",page:"Note page",video:"Video",audio:"Voice note"}[m.kind]||"Photo"))+" · "+c.name,sub:"Client photos & sketches · "+c.name,type:m.kind==="video"?(m.type||"video/mp4"):m.kind==="audio"?(m.type||"audio/mp4"):"image/jpeg",thumb:m.kind==="video"||m.kind==="audio"?"":m.id},()=>viewClient(ptCl(c)));
}

