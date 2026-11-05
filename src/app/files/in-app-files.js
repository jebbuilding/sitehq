/* ================= IN-APP FILES (kept inside the app, not in the phone's downloads) ================= */
import { $, esc, toast } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { CUT } from "./cut-outs.js";
import { assetBlob, isWord, loadMammoth, saveAsset } from "./files.js";
import { printAsset } from "./print.js";
import { FVM, fvmClick, fvmDetectScale, fvmDraw, fvmHover, fvmLoad, fvmToggle, fvmVec } from "./scale-ruler.js";
import { SENDTO } from "./send-to.js";
import { binFromViewer, binIsImg } from "../owner/deleted-items.js";
import { audTag } from "../photos/photos.js";
export { FC, FV, closeFile, fcOpen, fcPut, fvHostAt, getFileBlob, initInAppFiles, keepFolder, loadPdfJs, loadScript, openFile };
const FC={db:null,ids:new Set(),ready:null};
function fcOpen(){if(FC.ready)return FC.ready;FC.ready=new Promise(res=>{try{const r=indexedDB.open("jeb-files",1);r.onupgradeneeded=()=>r.result.createObjectStore("f");
  r.onsuccess=()=>{FC.db=r.result;try{const q=FC.db.transaction("f").objectStore("f").getAllKeys();q.onsuccess=()=>{(q.result||[]).forEach(k=>FC.ids.add(k));res()};q.onerror=()=>res()}catch(e){res()}};r.onerror=()=>res()}catch(e){res()}});return FC.ready}
function fcGet(id){return new Promise(res=>{if(!FC.db)return res(null);try{const q=FC.db.transaction("f").objectStore("f").get(id);q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null)}catch(e){res(null)}})}
function fcPut(id,blob){return new Promise(res=>{if(!FC.db)return res();try{const t=FC.db.transaction("f","readwrite");t.objectStore("f").put(blob,id);t.oncomplete=()=>{FC.ids.add(id);res()};t.onerror=()=>res();t.onabort=()=>res()}catch(e){res()}})}
async function getFileBlob(id){await fcOpen();const c=await fcGet(id);if(c)return c;const b=await assetBlob(id);await fcPut(id,b);return b}
let pdfP=null;
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>{s.remove();rej(new Error("load"))};document.head.appendChild(s)})}
function loadPdfJs(){if(window.pdfjsLib&&window.pdfjsWorker)return Promise.resolve();if(pdfP)return pdfP;
  pdfP=loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js").then(()=>loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js")).catch(e=>{pdfP=null;throw e});return pdfP}
const FV={zoom:1,pdf:null,pages:[],obs:null,url:null,gen:0,id:null,name:""};
function fvMsg(title,body){$("fv-body").innerHTML=`<div class="empty" style="margin:20px"><strong>${esc(title)}</strong>${body||""}</div>`}
async function openFile(id,name,type){
  const gen=++FV.gen; closeFileInner();
  FV.id=id;FV.name=name||"Document";FV.zoom=1; fvmLoad(); if(FVM.on)fvmToggle();
  $("fileview").hidden=false; $("fv-title").textContent=FV.name; $("fv-zoomlabel").textContent="Fit";
  $("fv-save").hidden=!ownerMode();if($("fv-del"))$("fv-del").hidden=!ownerMode();if($("fv-send"))$("fv-send").hidden=!ownerMode();if($("fv-cut"))$("fv-cut").hidden=!ownerMode();FV.blobType="";
  fvMsg("Opening…",FC.ids.has(id)?"":"This file is being kept in the app so it opens straight away next time.");
  let blob; try{blob=await getFileBlob(id)}catch(e){if(gen===FV.gen)fvMsg("Couldn't open this file",navigator.onLine===false?"You have no signal and this file hasn't been opened on this phone before. Open it once when you have signal and it will be kept in the app.":"Check your connection and try again.");return}
  if(gen!==FV.gen) return;
  render();
  const t=type||blob.type||"";FV.blobType=t;
  if(isWord({type:t,name:name||""})){FV.url=URL.createObjectURL(blob);const fnm=name||"Document.docx";
    $("fv-body").innerHTML=`<div style="padding:12px"><div class="actions" style="margin:0 0 10px"><button type="button" class="btn primary" id="fv-wdl">⬇ Download to open in Word</button></div><div class="wordview" id="fv-word"><div class="who">Getting a preview ready…</div></div></div>`;
    $("fv-wdl").onclick=async()=>{if(!S.dl){toast("Downloads only work when the page is opened in claude.ai");return}try{await S.dl.save({filename:/\.\w+$/.test(fnm)?fnm:fnm+".docx",data:blob})}catch(e){if(!(e&&e.code==="declined"))toast("Download didn't go through")}};
    if(/\.docx$/i.test(fnm)||/wordprocessingml/.test(t)){try{await loadMammoth();const r=await window.mammoth.convertToHtml({arrayBuffer:await blob.arrayBuffer()});if(gen!==FV.gen)return;
        const tmp=document.createElement("div");tmp.innerHTML=r.value;tmp.querySelectorAll("script,iframe,object,embed,link,style").forEach(x=>x.remove());tmp.querySelectorAll("*").forEach(el=>[...el.attributes].forEach(a=>{if(/^on/i.test(a.name)||(a.name==="href"&&/^\s*javascript:/i.test(a.value)))el.removeAttribute(a.name)}));
        $("fv-word").innerHTML=tmp.innerHTML||'<div class="who">This document looks empty.</div>'}catch(e){if(gen===FV.gen)$("fv-word").innerHTML='<div class="who">A preview can\'t be shown here. Download it to open in Word.</div>'}}
    else $("fv-word").innerHTML='<div class="who">Older Word files (.doc) can\'t be previewed in the app. Download it to open in Word.</div>';
    return}
  if(/^audio\//.test(t)||/\.(m4a|mp3|aac|ogg|wav|amr)$/i.test(name||"")){FV.url=URL.createObjectURL(blob);$("fv-body").innerHTML=`<div style="padding:24px 12px;text-align:center;font-size:40px">🎤<br>${audTag(FV.url,'style="width:100%;margin-top:12px"')}</div>`;return}
  if(/^video\//.test(t)||/\.(mp4|mov|webm|3gp)$/i.test(name||"")){FV.url=URL.createObjectURL(blob);$("fv-body").innerHTML=`<div style="padding:10px"><video src="${FV.url}" controls playsinline style="width:100%;max-height:80vh;background:#000;border-radius:8px"></video></div>`;return}
  if(/^image\//.test(t)||/\.(jpe?g|png|webp|gif)$/i.test(name||"")){
    FV.url=URL.createObjectURL(blob); $("fv-body").innerHTML=`<div class="fvimgwrap"><span class="fvimgbox"><img id="fv-img" src="${FV.url}" alt="${esc(FV.name)}"></span></div>`; applyZoom(); return}
  if(/pdf/.test(t)||/\.pdf$/i.test(name||"")){
    try{await loadPdfJs()}catch(e){fvMsg("Couldn't load the PDF viewer","It needs signal the first time it's used on this phone. Try again when you have signal.");return}
    try{
      FV.pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise;
      if(gen!==FV.gen) return;
      const n=FV.pdf.numPages; const first=(await FV.pdf.getPage(1)).getViewport({scale:1});
      $("fv-body").innerHTML=`<div class="fvpages" id="fv-pages">${Array.from({length:n},(_,i)=>`<div class="fvpage" data-p="${i+1}"><canvas class="fvbase"></canvas><canvas class="fvdet" hidden></canvas><span class="fvnum">${i+1} / ${n}</span></div>`).join("")}</div>`;
      FV.pages=[...$("fv-pages").children].map(el=>({el,ratio:first.height/first.width,ptsW:first.width,ptsH:first.height,done:0}));
      sizePages();
      FV.obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)drawPage(+e.target.dataset.p,gen)}),{root:$("fv-body"),rootMargin:"800px 0px"});
      FV.pages.forEach(p=>FV.obs.observe(p.el));
    }catch(e){fvMsg("Couldn't open this PDF","The file may be damaged. Ask James to upload it again.")}
    return}
  if(/^text\/|json/.test(t)){const tx=await blob.text();$("fv-body").innerHTML=`<pre class="fvtext">${esc(tx)}</pre>`;return}
  fvMsg("This file type can't be shown in the app","");
}
const FVZ={maxPdf:64,maxImg:12};
const fvMaxZoom=()=>FV.pages.length?FVZ.maxPdf:FVZ.maxImg;
function fitWidth(){return Math.max(200,($("fv-body").clientWidth||360)-24)}
function pageWidth(){return fitWidth()*FV.zoom}
function sizePages(){const w=pageWidth();FV.pages.forEach(p=>{p.el.style.width=w+"px";p.el.style.height=(w*p.ratio)+"px"})}
async function drawPage(i,gen){ // base render: the whole page at about twice screen-fit sharpness
  const p=FV.pages[i-1]; if(!p||!FV.pdf||p.done) return; p.done=1;
  try{
    const page=await FV.pdf.getPage(i); if(gen!==FV.gen) return; p.page=page;
    const base=page.getViewport({scale:1}); p.ratio=base.height/base.width; p.ptsW=base.width; p.ptsH=base.height; p.vt=base.transform;
    p.el.style.height=(pageWidth()*p.ratio)+"px";
    const dpr=Math.min(3,window.devicePixelRatio||1); let scale=fitWidth()*Math.max(2,dpr)/base.width;
    const maxPx=5e6; if(base.width*base.height*scale*scale>maxPx) scale=Math.sqrt(maxPx/(base.width*base.height));
    const vp=page.getViewport({scale}); const cv=p.el.querySelector("canvas.fvbase");
    cv.width=Math.floor(vp.width); cv.height=Math.floor(vp.height);
    await page.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise; p.baseScale=scale;
    fvDetailSoon(30); if(FVM.on){fvmVec(i);if(i===1)fvmDetectScale()}
  }catch(e){p.done=0}
}
let fvDetT=null;
function fvDetailSoon(d){clearTimeout(fvDetT);fvDetT=setTimeout(fvDetail,d==null?140:d)}
async function fvDetail(){ // sharp render of just what's on screen, at full screen resolution
  if(!FV.pdf) return; const body=$("fv-body"),br=body.getBoundingClientRect(),dpr=Math.min(3,window.devicePixelRatio||1),gen=FV.gen;
  for(const p of FV.pages){const det=p.el.querySelector("canvas.fvdet");if(!det)continue;const r=p.el.getBoundingClientRect();
    const x0=Math.max(r.left,br.left),y0=Math.max(r.top,br.top),x1=Math.min(r.right,br.right),y1=Math.min(r.bottom,br.bottom);
    const need=p.page&&x1>x0&&y1>y0&&r.width*dpr>(p.baseScale||0)*p.ptsW*1.08;
    if(!need){if(p.detTask){try{p.detTask.cancel()}catch(e){}p.detTask=null}if(!(x1>x0&&y1>y0)||(p.page&&!(r.width*dpr>(p.baseScale||0)*p.ptsW*1.08))){det.hidden=true;det.width=det.height=0}continue}
    const pdX=(x1-x0)*.3,pdY=(y1-y0)*.3;
    const lx=Math.max(0,x0-r.left-pdX),ly=Math.max(0,y0-r.top-pdY),lw=Math.min(r.width,x1-r.left+pdX)-lx,lh=Math.min(r.height,y1-r.top+pdY)-ly;
    let k=dpr;const maxPx=9e6;if(lw*lh*k*k>maxPx)k=Math.sqrt(maxPx/(lw*lh));
    const vp=p.page.getViewport({scale:r.width/p.ptsW*k,offsetX:-lx*k,offsetY:-ly*k});
    if(p.detTask){try{p.detTask.cancel()}catch(e){}}
    const off=document.createElement("canvas");off.width=Math.ceil(lw*k);off.height=Math.ceil(lh*k);
    const g=off.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,off.width,off.height);
    const task=p.page.render({canvasContext:g,viewport:vp});p.detTask=task;
    try{await task.promise}catch(e){continue}
    if(gen!==FV.gen||p.detTask!==task)continue;p.detTask=null;
    if(Math.abs(p.el.getBoundingClientRect().width-r.width)>0.5)continue;
    det.width=off.width;det.height=off.height;det.getContext("2d").drawImage(off,0,0);
    Object.assign(det.style,{left:lx+"px",top:ly+"px",width:lw+"px",height:lh+"px"});det.hidden=false;
    off.width=off.height=0}
}
function fvHostAt(cx,cy){let best=null,bd=1e9;document.querySelectorAll("#fv-body .fvpage,#fv-body .fvimgbox").forEach(h=>{const r=h.getBoundingClientRect();const d=(cy<r.top?r.top-cy:cy>r.bottom?cy-r.bottom:0)+(cx<r.left?r.left-cx:cx>r.right?cx-r.right:0);if(d<bd){bd=d;best=h}});return best}
function fvLayout(){const img=$("fv-img");if(img){const bx=img.parentElement;bx.style.width=(fitWidth()*FV.zoom)+"px";bx.style.maxWidth="none";img.style.width="100%";img.style.maxWidth="none"}
  if(FV.pages.length)sizePages();
  $("fv-zoomlabel").textContent=Math.abs(FV.zoom-1)<0.001?"Fit width":Math.abs(FV.zoom-fvWholeZ())<0.002?"Whole page":Math.round(FV.zoom*100)+"%"}
/* zoom that shows the whole first page / picture on screen */
function fvWholeZ(){const body=$("fv-body");const h=Math.max(150,(body.clientHeight||500)-24);let r=1;
  if(FV.pages.length)r=FV.pages[0].ratio||1.414;else{const im=$("fv-img");if(im&&im.naturalWidth)r=im.naturalHeight/im.naturalWidth}
  return Math.min(1,h/(fitWidth()*r))}
function fvSetZoom(z,cx,cy,tx,ty){
  z=Math.max(0.15,Math.min(fvMaxZoom(),z));
  const body=$("fv-body"),br=body.getBoundingClientRect();if(cx==null){cx=br.left+br.width/2;cy=br.top+br.height/2}if(tx==null){tx=cx;ty=cy}
  const host=fvHostAt(cx,cy);let fx=.5,fy=.5;if(host){const hr=host.getBoundingClientRect();fx=(cx-hr.left)/hr.width;fy=(cy-hr.top)/hr.height}
  FV.zoom=z;fvLayout();
  if(host){const nr=host.getBoundingClientRect();body.scrollLeft+=(nr.left+fx*nr.width)-tx;body.scrollTop+=(nr.top+fy*nr.height)-ty}
  if(FVM.on)fvmDraw();fvDetailSoon(60)}
function applyZoom(){fvLayout();requestAnimationFrame(()=>{if(FVM.on)fvmDraw();fvDetailSoon(60)})}

function closeFileInner(){if(FV.obs){FV.obs.disconnect();FV.obs=null}if(FV.pdf){try{FV.pdf.destroy()}catch(e){}FV.pdf=null}if(FV.url){URL.revokeObjectURL(FV.url);FV.url=null}FV.pages=[];$("fv-body").innerHTML=""}
function closeFile(){FV.gen++;closeFileInner();$("fileview").hidden=true;$("fileview").style.zIndex=""}
  
async function keepFolder(list){
  await fcOpen(); const todo=list.filter(d=>!FC.ids.has(d.assetId));
  if(!todo.length){toast("Everything in this folder is already kept in the app");return}
  if(navigator.onLine===false){toast("You need signal to keep files in the app");return}
  let n=0; for(const d of todo){toast(`Keeping ${n+1} of ${todo.length} in the app…`);try{await getFileBlob(d.assetId);n++}catch(e){}}
  toast(n===todo.length?`Done. ${n} file${n===1?"":"s"} will open without signal.`:`Kept ${n} of ${todo.length}. Try again with better signal.`); render();
}

/* Runs once when the app starts, called from core/boot.js. Nothing else in this file runs at load. */
function initInAppFiles(){
window.addEventListener("resize",()=>{if(FVM.on&&!$("fileview").hidden)requestAnimationFrame(fvmDraw)});
window.fvSetZoom=fvSetZoom;
$("fv-in").onclick=()=>fvSetZoom(FV.zoom*1.6);
$("fv-out").onclick=()=>fvSetZoom(FV.zoom/1.6);
$("fv-fit").onclick=()=>{const w=fvWholeZ();fvSetZoom(Math.abs(FV.zoom-w)<0.002||w>=0.999?1:w)};
(function(){const body=$("fv-body");let pz=null;
  const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY),mid=t=>[(t[0].clientX+t[1].clientX)/2,(t[0].clientY+t[1].clientY)/2];
  body.addEventListener("touchstart",e=>{if(e.touches.length!==2)return;const tgt=$("fv-pages")||body.querySelector(".fvimgwrap");if(!tgt)return;e.preventDefault();
    const m=mid(e.touches),tr=tgt.getBoundingClientRect();pz={d:dist(e.touches),m,tgt,k:1,dx:0,dy:0};tgt.style.transformOrigin=(m[0]-tr.left)+"px "+(m[1]-tr.top)+"px";tgt.style.willChange="transform"},{passive:false});
  body.addEventListener("touchmove",e=>{if(!pz||e.touches.length!==2)return;e.preventDefault();const m=mid(e.touches);
    pz.k=Math.max(0.15/FV.zoom,Math.min(fvMaxZoom()/FV.zoom,dist(e.touches)/pz.d));pz.dx=m[0]-pz.m[0];pz.dy=m[1]-pz.m[1];pz.tgt.style.transform=`translate(${pz.dx}px,${pz.dy}px) scale(${pz.k})`},{passive:false});
  const end=e=>{if(!pz||e.touches.length>=2)return;const {tgt,k,m,dx,dy}=pz;pz=null;tgt.style.transform="";tgt.style.transformOrigin="";tgt.style.willChange="";FVM.pinchAt=Date.now();fvSetZoom(FV.zoom*k,m[0],m[1],m[0]+dx,m[1]+dy)};
  body.addEventListener("touchend",end);body.addEventListener("touchcancel",end);
  body.addEventListener("wheel",e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();fvSetZoom(FV.zoom*Math.exp(-e.deltaY*0.008),e.clientX,e.clientY)},{passive:false});
  ["gesturestart","gesturechange"].forEach(n=>document.addEventListener(n,e=>{if(!$("fileview").hidden)e.preventDefault()},{passive:false}));
  body.addEventListener("dblclick",e=>{if(FVM.on)return;fvSetZoom(FV.zoom<2.5&&FV.zoom>=0.999?FV.zoom*3:FV.zoom<0.999?1:fvWholeZ(),e.clientX,e.clientY)});
  body.addEventListener("scroll",()=>fvDetailSoon(),{passive:true});
})();
$("fv-save").onclick=()=>{if(FV.id)saveAsset(FV.id,FV.name)};
if($("fv-cut"))$("fv-cut").onclick=()=>CUT.start();
if($("fv-print"))$("fv-print").onclick=()=>{if(FV.id)printAsset(FV.id,FV.name)};
if($("fv-send"))$("fv-send").onclick=()=>{if(!FV.id)return;SENDTO.open({assetId:FV.id,name:FV.name,type:FV.blobType||"application/pdf",title:String(FV.name||"").replace(/\.[^.]+$/,"")})};
if($("fv-del"))$("fv-del").onclick=()=>{if(!FV.id)return;const id=FV.id,nm=FV.name;const blobT=(FV.blobType||"");binFromViewer({assets:[id],title:nm,type:blobT||"application/pdf",thumb:binIsImg(blobT)?id:""},()=>{try{$("fv-close").click()}catch(e){}render()})};
$("fv-close").onclick=closeFile;
$("fv-ruler").onclick=fvmToggle;
$("fv-body").addEventListener("click",e=>fvmClick(e));
$("fv-body").addEventListener("pointermove",e=>fvmHover(e));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("fileview").hidden){e.stopImmediatePropagation();closeFile()}},true);
window.addEventListener("resize",()=>{if(!$("fileview").hidden)applyZoom()});
}
