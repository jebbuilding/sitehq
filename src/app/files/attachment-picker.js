/* ===== Simple attachment picker: separate Take photo / Photos / PDF-file buttons (each with one file type, which phones handle best) ===== */
import { esc, stamp, toast } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { myDrawings } from "../drawing/drawings-tab.js";
import { openNotePage } from "../drawing/paving.js";
import { assetBlob, blobUrl } from "./files.js";
import { loadJsPdf } from "../safety/site-inductions.js";
export { attachPicker, drawPdfFile };
/* a drawing as a PDF (all pages) so it can go into a sign-off */
async function drawPdfFile(p){const nm=(p.title||"Drawing").replace(/[^\w\s-]/g,"").trim()||"Drawing";
  const asJpg=async()=>{const b=await assetBlob(p.assetId);return new File([b],nm+".jpg",{type:"image/jpeg"})};
  if(!p.pageSrc)return asJpg();
  let pages=null;try{pages=await openNotePage({srcId:p.pageSrc,title:p.title,render:true});await loadJsPdf()}catch(e){pages=null}if(!pages||!pages.length||!window.jspdf)return asJpg();let doc=null;
  for(const pg of pages){const o=pg.wmm>pg.hmm?"landscape":"portrait";if(!doc)doc=new window.jspdf.jsPDF({unit:"mm",format:[pg.wmm,pg.hmm],orientation:o});else doc.addPage([pg.wmm,pg.hmm],o);doc.addImage(pg.data,"JPEG",0,0,pg.wmm,pg.hmm)}
  return new File([doc.output("blob")],nm+".pdf",{type:"application/pdf"})}
function pickDrawing(done){const list=myDrawings();if(!list.length){toast("You haven't saved any drawings yet. Make one in the Drawings tab.");return}
  const d=document.createElement("div");d.className="dimask";d.style.zIndex="90";
  d.innerHTML=`<div class="dimbox" style="width:min(520px,94vw);max-height:80vh;overflow:auto"><b>✏️ Choose a drawing</b><div class="drawgrid" style="margin-top:8px">${list.map(p=>`<button type="button" class="drawtile" data-id="${esc(p.id)}"><img src="${blobUrl(p.assetId)}" alt="" loading="lazy"><span class="dtt"><b>${esc(p.title||"Drawing")}</b><span class="who">${esc(stamp(p.editedAt||p.created))}</span></span></button>`).join("")}</div><div class="dimbtns"><button type="button" class="btn dpx">Cancel</button></div></div>`;
  document.body.appendChild(d);d.querySelector(".dpx").onclick=()=>d.remove();d.addEventListener("click",e=>{if(e.target===d)d.remove()});
  d.querySelectorAll(".drawtile").forEach(b=>b.onclick=async()=>{const p=list.find(x=>x.id===b.dataset.id);if(!p)return;d.querySelector(".dimbox").innerHTML='<b>Making the drawing PDF…</b><div class="who">One moment</div>';
    try{const f=await drawPdfFile(p);d.remove();done(f,p)}catch(e){d.remove();toast("Couldn't add that drawing")}})}
function attachPicker(host){const files=(S.preAttach||[]).slice();S.preAttach=null;
  host.innerHTML=`<div class="apk">${ownerMode()?`<button type="button" class="btn primary apkdraw">✏️ My drawings</button>`:""}<label class="btn primary fhpickbtn">📷 Take photo<input type="file" accept="image/*" capture="environment" data-sp="1"></label><label class="btn fhpickbtn">🖼 Photos<input type="file" accept="image/*" multiple data-sp="1"></label><label class="btn fhpickbtn">📄 PDF / Word<input type="file" accept="application/pdf,.doc,.docx,.rtf,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple data-sp="1"></label></div><div class="apklist"></div>`;
  host.querySelectorAll("input[type=file]").forEach(i=>{i.dataset.cam="1";i.onchange=()=>{[...(i.files||[])].forEach(f=>files.push(f));i.value="";draw()}});
  const list=host.querySelector(".apklist");if(host.querySelector(".apkdraw"))host.querySelector(".apkdraw").onclick=()=>pickDrawing(f=>{files.push(f);draw();toast("Drawing added")});
  function draw(){list.innerHTML=files.map((f,k)=>`<div class="apkrow">${/^image\//.test(f.type)?`<img src="${URL.createObjectURL(f)}" alt="">`:'<span class="apkic">📄</span>'}<span class="apkn">${esc(f.name||"photo.jpg")}<br><span class="who">${(f.size/1048576).toFixed(1)} MB</span></span><button type="button" class="iconbtn apkx" data-k="${k}" aria-label="Remove">✕</button></div>`).join("")+(files.length?`<div class="who">${files.length} ready to send</div>`:"");
    list.querySelectorAll(".apkx").forEach(b=>b.onclick=()=>{files.splice(+b.dataset.k,1);draw()})}
  if(files.length)draw();
  return {files:()=>files.slice(),add:f=>{files.push(f);draw()}}}

