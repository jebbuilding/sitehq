/* ================= SUPPLIERS (manufacturers): company details + their brochures, shown in Merchants › Suppliers and in the survey's 📖 Brochures ================= */
import { $, esc, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { uploadErr, uploadFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { scheduleMkSync, whoSeesDlg } from "./merchants.js";
import { DWS } from "../survey/door-window-survey.js";
export { makersAll, makersView, wireMakers };
const MK_CATS=["Window & door systems","Composite doors","Aluminium systems","Garage doors","Timber windows & doors","Glass","Kitchens","Bathrooms","Roofing","Other"];
const MK_DEFCAT={profile22:"Window & door systems",deceuninck:"Window & door systems",rehau:"Window & door systems",cortizo:"Aluminium systems",origin:"Aluminium systems",aluk:"Aluminium systems",distinction:"Composite doors",visage:"Composite doors",royale:"Composite doors",ews:"Window & door systems",hormann:"Garage doors",garador:"Garage doors",sws:"Garage doors",gliderol:"Garage doors",cardale:"Garage doors",carteck:"Garage doors",novoferm:"Garage doors",ryterna:"Garage doors",jeldwen:"Timber windows & doors",mumfordwood:"Timber windows & doors",accoya:"Timber windows & doors"};
/* every maker: the built-in list plus James's own, with any details he's saved */
function makersAll(){const B=DWS.broch();const recs=S.makers||[];const out={};
  Object.keys(B).filter(k=>k!=="other").forEach(k=>{const r=recs.find(x=>x.key===k)||{};out[k]={key:k,m:r.name||B[k].m,l:B[k].l,rec:r,cat:r.cat||MK_DEFCAT[k]||"Other",builtin:true}});
  recs.filter(r=>!B[r.key]&&r.key!=="other").forEach(r=>{out[r.key]={key:r.key,m:r.name,l:r.website?[["Website",/^https?:/.test(r.website)?r.website:"https://"+r.website]]:[],rec:r,cat:r.cat||"Other"}});
  out.other={key:"other",m:"Other / my own",l:[],rec:{},cat:"Other"};return out}
function makerCard(M){const r=M.rec||{};const br=(S.brochures||[]).filter(b=>b.maker===M.key).sort((a,b)=>(b.at||0)-(a.at||0));const tel=String(r.phone||"").replace(/\s+/g,"");const web=r.website?(/^https?:/.test(r.website)?r.website:"https://"+r.website):"";
  return `<details class="card supcard mkcard" data-k="${esc(M.key)}" ${S.open.has("mk"+M.key)?"open":""}><summary><div class="nm">${esc(M.m)}<small>${esc([M.cat,r.contact?"Rep: "+r.contact:""].filter(Boolean).join(" · "))}</small></div><div class="figs"><span class="tag ${r.vis==="all"?"ok":r.vis==="some"?"day":""}">${r.vis==="all"?"👥 Everyone":r.vis==="some"?"👥 "+(r.people||[]).filter(id=>S.team[id]).length+" trade"+((r.people||[]).length===1?"":"s"):"🔒 Only me"}</span>${br.length?`<span class="tag ok">📖 ${br.length}</span>`:""}${r.accountNo?`<span>Acc <b>${esc(r.accountNo)}</b></span>`:""}</div></summary>
    <div class="cardbody"><div class="actions">${tel?`<a class="btn primary" href="tel:${esc(tel)}">📞 Call</a>`:""}${r.email?`<a class="btn" href="mailto:${esc(r.email)}">✉ Email</a>`:""}${web?`<a class="btn" href="${esc(web)}" target="_blank" rel="noopener">Website ↗</a>`:""}<button type="button" class="btn mk-edit">✎ Details</button><button type="button" class="btn mk-vis">👥 ${r.vis==="all"?"Everyone can see this":r.vis==="some"?"Chosen trades can see this":"Only you can see this"} – change</button></div>
      <div class="details">${[["Phone",r.phone],["Email",r.email],["Address",r.address],["Rep / contact",[r.contact,r.contactPhone].filter(Boolean).join(" · ")],["Account no.",r.accountNo],["Bought through",r.via],["Notes",r.notes]].filter(x=>x[1]).map(([l,v])=>`<div class="drow"><span>${esc(l)}</span><span>${esc(v)}</span></div>`).join("")||'<div class="who">No details yet – tap ✎ Details to add phone, email, rep and account.</div>'}</div>
      <div class="flabel" style="margin-top:8px">📖 Brochures (${br.length})</div>
      ${br.map(b=>`<div class="dwsrow"><span>📄 ${esc(b.title)}</span><span style="display:flex;gap:6px"><button type="button" class="pillbtn mk-open" data-id="${esc(b.id)}">Open</button><button type="button" class="pillbtn mk-del" data-id="${esc(b.id)}" aria-label="Delete">✕</button></span></div>`).join("")||'<div class="who">None saved yet.</div>'}
      <label class="pillbtn" style="position:relative;overflow:hidden;display:inline-block;margin:6px 0">+ Add brochure PDFs or photos<input type="file" class="mk-up" accept="application/pdf,image/*" multiple style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
      ${M.l.length?`<div class="flabel" style="margin-top:6px">Their brochures online</div>${M.l.map(([t,u])=>`<div class="dwsrow"><a href="${esc(u)}" target="_blank" rel="noopener">🌐 ${esc(t)}</a></div>`).join("")}`:""}</div></details>`}
function makersView(){const A=makersAll();const q=(S.f.mkq||"").toLowerCase();const L=Object.values(A).filter(M=>M.key!=="other"||(S.brochures||[]).some(b=>b.maker==="other")).filter(M=>!q||[M.m,M.cat,(M.rec||{}).contact,(M.rec||{}).notes].join(" ").toLowerCase().includes(q));
  const cats=MK_CATS.filter(c=>L.some(M=>M.cat===c));
  return `<div class="actions"><button class="btn primary" id="mk-add" type="button">+ Add a supplier</button><button class="btn hv" id="mk-who" type="button">👥 Choose who sees what</button></div>
    <div class="notice">The companies that make what you buy – window and door systems, composite and garage doors, timber joinery. Keep their details and brochures here; the brochures also show in the <b>door &amp; window survey</b> under <b>📖 Brochures</b>.</div>
    <input id="mk-q" type="search" placeholder="Search suppliers" value="${esc(S.f.mkq||"")}" aria-label="Search suppliers">
    ${cats.map(c=>`<div class="day"><div class="dayh"><span>${esc(c)}</span><span class="sum">${L.filter(M=>M.cat===c).length}</span></div>${L.filter(M=>M.cat===c).sort((a,b)=>a.m.localeCompare(b.m)).map(makerCard).join("")}</div>`).join("")||'<div class="nothing">No suppliers match.</div>'}`}
function wireMakers(){const A=makersAll();if($("mk-add"))$("mk-add").onclick=()=>makerEdit(null);if($("mk-who"))$("mk-who").onclick=()=>whoSeesDlg();
  if($("mk-q"))$("mk-q").oninput=e=>{S.f.mkq=e.target.value;const pos=e.target.selectionStart;render();const n=$("mk-q");if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(x){}}};
  $("main").querySelectorAll(".mkcard").forEach(dt=>{const M=A[dt.dataset.k];if(!M)return;dt.addEventListener("toggle",()=>{dt.open?S.open.add("mk"+M.key):S.open.delete("mk"+M.key)});
    dt.querySelector(".mk-edit").onclick=()=>makerEdit(M);dt.querySelector(".mk-vis").onclick=()=>whoSeesDlg("mk",M.key);
    dt.querySelectorAll(".mk-open").forEach(b=>b.onclick=()=>{const x=(S.brochures||[]).find(y=>y.id===b.dataset.id);if(x)openFile(x.assetId,x.fileName||x.title,x.contentType)});
    dt.querySelectorAll(".mk-del").forEach(b=>b.onclick=async()=>{if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Delete?";return}try{await S.db.doc("todos/"+b.dataset.id).delete();S.brochures=(S.brochures||[]).filter(x=>x.id!==b.dataset.id);render()}catch(e){toast("Couldn't delete")}});
    dt.querySelector(".mk-up").onchange=async e=>{const fs=[...e.target.files];e.target.value="";if(!fs.length)return;if(!S.assets){toast(uploadErr({code:"not_granted"}));return}toast("Saving…");let n=0;
      for(let i=0;i<fs.length;i++){const f=fs[i];try{const a=await uploadFile(f,f.name);const id="br-"+newId();const rec={kind:"brochure",maker:M.key,title:f.name.replace(/\.[^.]+$/,"").slice(0,80),assetId:a.id,contentType:f.type||"application/pdf",fileName:f.name,at:Date.now()+i};await S.db.doc("todos/"+id).set(rec);S.brochures=(S.brochures||[]).concat([Object.assign({id},rec)]);n++}catch(err){toast(uploadErr(err))}}
      toast(n+" brochure"+(n===1?"":"s")+" saved");S.open.add("mk"+M.key);scheduleMkSync();render()}})}
function makerEdit(M){const r=Object.assign({},M?M.rec:{});const isNew=!M;
  openSheet(`<h3 id="sheettitle">${isNew?"+ Add a supplier":"✎ "+esc(M.m)}</h3>
    <label for="mk-name">Company name<input id="mk-name" maxlength="80" required value="${esc(M?M.m:"")}" placeholder="e.g. Liniar, Solidor, Duality"></label>
    <label for="mk-cat">Type<select id="mk-cat">${MK_CATS.map(c=>`<option ${c===(M?M.cat:"Window & door systems")?"selected":""}>${esc(c)}</option>`).join("")}</select></label>
    <div class="grid2"><label for="mk-phone">Phone<input id="mk-phone" type="tel" maxlength="30" value="${esc(r.phone||"")}"></label><label for="mk-email">Email<input id="mk-email" type="email" maxlength="120" value="${esc(r.email||"")}"></label></div>
    <label for="mk-addr">Address<input id="mk-addr" maxlength="200" value="${esc(r.address||"")}"></label>
    <label for="mk-web">Website<input id="mk-web" maxlength="160" value="${esc(r.website||"")}" placeholder="www…"></label>
    <div class="grid2"><label for="mk-ct">Rep / contact name<input id="mk-ct" maxlength="60" value="${esc(r.contact||"")}"></label><label for="mk-ctp">Rep's phone<input id="mk-ctp" type="tel" maxlength="30" value="${esc(r.contactPhone||"")}"></label></div>
    <div class="grid2"><label for="mk-acc">Account no. (if any)<input id="mk-acc" maxlength="40" value="${esc(r.accountNo||"")}"></label><label for="mk-via">Bought through (merchant)<input id="mk-via" maxlength="80" value="${esc(r.via||"")}" placeholder="e.g. Exeter Window Store"></label></div>
    <label for="mk-notes">Notes<textarea id="mk-notes" maxlength="600">${esc(r.notes||"")}</textarea></label>
    ${formFoot(!isNew&&!M.builtin,"Save")}`,async()=>{const name=$("mk-name").value.trim();if(!name){showErr("Add the company name");return}$("f-save").disabled=true;
      const key=M?M.key:"mk-"+newId();const id=r.id||("mk-"+key.replace(/^mk-/,""));const d={vis:r.vis||"me",people:r.people||[],kind:"maker",key,name,cat:$("mk-cat").value,phone:$("mk-phone").value.trim(),email:$("mk-email").value.trim(),website:$("mk-web").value.trim(),address:$("mk-addr").value.trim(),contact:$("mk-ct").value.trim(),contactPhone:$("mk-ctp").value.trim(),accountNo:$("mk-acc").value.trim(),via:$("mk-via").value.trim(),notes:$("mk-notes").value.trim(),updated:Date.now()};
      try{await S.db.doc("todos/"+id).set(d);S.makers=(S.makers||[]).filter(x=>x.key!==key).concat([Object.assign({id},d)]);closeForm();toast("Saved");scheduleMkSync();S.open.add("mk"+key);render()}catch(e){showErr("Couldn't save. Check your connection.");$("f-save").disabled=false}},"mk-name");
  if(!isNew&&!M.builtin&&r.id)armDelete(async()=>{await S.db.doc("todos/"+r.id).delete();S.makers=(S.makers||[]).filter(x=>x.id!==r.id);render()})}
