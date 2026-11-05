/* ================= SAMPLES: James's sample library (set up with photos) and a book-out log linked to clients ================= */
import { clAddNote } from "../clients/clients.js";
import { $, addDays, esc, iso, shortDay, stamp, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { curTab, render } from "../core/tabs-week.js";
import { openViewer } from "../core/viewer.js";
import { pdfShow } from "../drawing/paving.js";
import { blobUrl, uploadErr, uploadFile } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { shrinkImage } from "../safety/training.js";
import { myName } from "../survey/door-window-survey.js";
export { SAMPLES };
const SAMPLES=(()=>{
const CATS=["Doors","Windows / profiles","Worktops","Kitchen doors","Tiles","Flooring","Bricks / stone","Roof tiles / slates","Cladding","Paint / colour cards","Glass","Handles / hardware","Brochures / books","Other"];
const all=()=>(S.samples||[]).slice().sort((a,b)=>(a.cat||"").localeCompare(b.cat||"")||(a.name||"").localeCompare(b.name||""));
const isOut=x=>!!(x.out&&x.out.at);
const clName=x=>{const c=x.out&&(S.clients||[]).find(c=>c.id===x.out.client);return c?c.name:(x.out&&x.out.clientName)||"Someone"};
const overdue=x=>isOut(x)&&x.out.due&&x.out.due<iso(new Date());
const thumb=(x,sz)=>(x.photos||[])[0]?`<img src="${blobUrl(x.photos[0])}" alt="" style="width:${sz}px;height:${sz}px;object-fit:cover;border-radius:8px;flex:none;background:var(--soft)">`:`<span style="width:${sz}px;height:${sz}px;border-radius:8px;background:var(--soft);display:flex;align-items:center;justify-content:center;font-size:${Math.round(sz/2.4)}px;flex:none">🎨</span>`;
async function put(x){const d=Object.assign({},x);delete d.id;d.kind="sample";d.updated=Date.now();await S.db.doc("todos/"+x.id).set(d);const L=(S.samples||[]).filter(y=>y.id!==x.id);L.push(Object.assign({},d,{id:x.id}));S.samples=L}
/* ---- book out / in ---- */
async function bookOut(ids,cid,due,note){const c=(S.clients||[]).find(x=>x.id===cid);const now=Date.now();
  for(const id of ids){const x=(S.samples||[]).find(y=>y.id===id);if(!x||isOut(x))continue;const out={client:cid,clientName:c?c.name:"",at:now,due:due||"",note:note||"",by:myName()};
    await put(Object.assign({},x,{out,log:(x.log||[]).concat([{t:"out",client:cid,clientName:out.clientName,at:now,due:due||"",note:note||"",by:myName()}]).slice(-60)}))}
  if(c)try{await clAddNote(c,"Samples booked out: "+ids.map(id=>((S.samples||[]).find(y=>y.id===id)||{}).name).filter(Boolean).join(", "))}catch(e){}}
async function bookIn(ids){const now=Date.now();
  for(const id of ids){const x=(S.samples||[]).find(y=>y.id===id);if(!x||!isOut(x))continue;
    await put(Object.assign({},x,{out:null,log:(x.log||[]).concat([{t:"in",client:x.out.client,clientName:clName(x),at:now,by:myName()}]).slice(-60)}))}}
function outDlg(ids,cid0,after){const cls=(S.clients||[]).filter(c=>c.stage!=="lost").sort((a,b)=>(a.name||"").localeCompare(b.name||""));if(!cls.length){toast("Add the client first");return}
  const names=ids.map(id=>((S.samples||[]).find(y=>y.id===id)||{}).name).filter(Boolean);
  openSheet(`<h3 id="sheettitle">📤 Book out ${names.length===1?esc(names[0]):names.length+" samples"}</h3>${names.length>1?`<div class="who">${esc(names.join(", "))}</div>`:""}
    <label for="sb-cl">Who's got them<select id="sb-cl">${cls.map(c=>`<option value="${esc(c.id)}" ${c.id===cid0?"selected":""}>${esc(c.name)}${c.site?" · "+esc(c.site):""}</option>`).join("")}</select></label>
    <label for="sb-due">Back by (optional)<input id="sb-due" type="date" value="${esc(iso(addDays(new Date(),7)))}"></label>
    <label for="sb-note">Note (optional)<input id="sb-note" maxlength="200" placeholder="e.g. left with Mrs Smith, collect at next visit"></label>
    ${formFoot(false,"Book out")}`,async()=>{$("f-save").disabled=true;try{await bookOut(ids,$("sb-cl").value,$("sb-due").value,$("sb-note").value.trim());closeForm();toast(names.length+" booked out");if(after)after();else render()}catch(e){showErr("Couldn't save. Check your connection.");$("f-save").disabled=false}},"sb-cl")}
/* ---- the overview tab ---- */
function view(){const f=S.f.smf||"all",q=(S.f.smq||"").toLowerCase();const L=all();const outN=L.filter(isOut).length,od=L.filter(overdue).length;
  const shown=L.filter(x=>(f==="all"||(f==="out"?isOut(x):f==="in"?!isOut(x):overdue(x)))&&(!q||[x.name,x.maker,x.code,x.cat,isOut(x)?clName(x):""].join(" ").toLowerCase().includes(q)));
  const by={};shown.forEach(x=>{(by[x.cat||"Other"]=by[x.cat||"Other"]||[]).push(x)});
  $("main").innerHTML=`<div class="notice">🎨 <b>Samples.</b> ${L.length} in the library · <b>${outN}</b> booked out${od?` · <b style="color:var(--danger)">${od} overdue</b>`:""}. Tick the ones you're handing over and tap <b>Book out</b>, or tick the ones that came back and tap <b>Back in</b>.</div>
    <div class="actions"><button type="button" class="btn" id="sm-setup">⚙ Add / edit samples</button><button type="button" class="btn" id="sm-pdf">📄 Out list PDF</button></div>
    <div class="seg" id="sm-f">${[["all","All ("+L.length+")"],["in","In ("+(L.length-outN)+")"],["out","Out ("+outN+")"],["over","Overdue ("+od+")"]].map(([k,l])=>`<button type="button" data-v="${k}" aria-pressed="${f===k}">${l}</button>`).join("")}</div>
    <input id="sm-q" type="search" placeholder="Search samples or clients" value="${esc(S.f.smq||"")}" style="margin:6px 0">
    ${L.length?Object.keys(by).sort().map(cat=>`<div class="flabel" style="margin-top:10px">${esc(cat)} · ${by[cat].length}</div>${by[cat].map(x=>`<label class="smrow ${isOut(x)?"smout":""} ${overdue(x)?"smover":""}"><input type="checkbox" class="sm-t" value="${esc(x.id)}">${thumb(x,52)}
      <span style="flex:1;min-width:0"><b>${esc(x.name)}</b>${x.code?` <span class="who">${esc(x.code)}</span>`:""}<br><span class="who">${esc([x.maker,x.where&&!isOut(x)?"kept: "+x.where:""].filter(Boolean).join(" · "))}</span>
      ${isOut(x)?`<br><span class="tag ${overdue(x)?"bad":"day"}">Out · ${esc(clName(x))} · since ${esc(shortDay(iso(new Date(x.out.at))))}${x.out.due?" · back by "+esc(shortDay(x.out.due)):""}</span>`:`<br><span class="tag ok">In</span>`}</span>
      <button type="button" class="iconbtn sm-one" data-id="${esc(x.id)}" aria-label="${isOut(x)?"Back in":"Book out"}" title="${isOut(x)?"Back in":"Book out"}">${isOut(x)?"↩":"📤"}</button></label>`).join("")}`).join("")
      :`<div class="empty"><strong>No samples yet</strong>Tap <b>Add / edit samples</b> (or Setup › Samples) to add them with photos.</div>`}
    <div class="smbar" id="sm-bar" hidden><span id="sm-n"></span><button type="button" class="btn primary" id="sm-out">📤 Book out</button><button type="button" class="btn" id="sm-in">↩ Back in</button><button type="button" class="btn" id="sm-clear">Clear</button></div>`;
  $("sm-f").querySelectorAll("button").forEach(b=>b.onclick=()=>{S.f.smf=b.dataset.v;render()});
  $("sm-q").oninput=e=>{S.f.smq=e.target.value;clearTimeout(view.t);view.t=setTimeout(()=>{render();const i=$("sm-q");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},350)};
  $("sm-setup").onclick=setupView;$("sm-pdf").onclick=e=>pdf(e.currentTarget);
  const sel=()=>[...document.querySelectorAll(".sm-t:checked")].map(x=>x.value);
  const bar=()=>{const ids=sel();$("sm-bar").hidden=!ids.length;if(!ids.length)return;const xs=ids.map(id=>(S.samples||[]).find(y=>y.id===id));const nIn=xs.filter(x=>x&&!isOut(x)).length,nOut=xs.length-nIn;$("sm-n").textContent=ids.length+" ticked";$("sm-out").hidden=!nIn;$("sm-out").textContent="📤 Book out"+(nIn&&nOut?" ("+nIn+")":"");$("sm-in").hidden=!nOut;$("sm-in").textContent="↩ Back in"+(nIn&&nOut?" ("+nOut+")":"")};
  document.querySelectorAll(".sm-t").forEach(c=>c.onchange=bar);
  $("sm-clear").onclick=()=>{document.querySelectorAll(".sm-t:checked").forEach(c=>c.checked=false);bar()};
  $("sm-out").onclick=()=>{const ids=sel().filter(id=>!isOut((S.samples||[]).find(y=>y.id===id)||{}));if(ids.length)outDlg(ids)};
  $("sm-in").onclick=async e=>{const ids=sel().filter(id=>isOut((S.samples||[]).find(y=>y.id===id)||{}));if(!ids.length)return;e.currentTarget.disabled=true;try{await bookIn(ids);toast(ids.length+" back in");render()}catch(x){toast("Couldn't save");e.currentTarget.disabled=false}};
  document.querySelectorAll(".sm-one").forEach(b=>b.onclick=async e=>{e.preventDefault();e.stopPropagation();const x=(S.samples||[]).find(y=>y.id===b.dataset.id);if(!x)return;if(isOut(x)){b.disabled=true;try{await bookIn([x.id]);toast(x.name+" back in");render()}catch(err){toast("Couldn't save");b.disabled=false}}else outDlg([x.id])})}
/* ---- Setup: add / edit samples with photos ---- */
function setupView(){const draw=()=>{const L=all();openViewer(`<span class="tag">🎨 Setup</span><h3 style="font-family:var(--f-display);font-size:24px;margin:6px 0 8px;color:var(--accent)">Samples</h3>
    <div class="who">Everything you lend to clients – doors, worktops, tiles, bricks, colour cards. Add a photo so you can see at a glance what's what.</div>
    <div class="actions"><button type="button" class="btn primary" id="ss-add">+ Add a sample</button></div>
    ${L.map(x=>`<button type="button" class="incrow ss-ed" data-id="${esc(x.id)}" style="display:flex;gap:10px;align-items:center">${thumb(x,44)}<span style="flex:1;text-align:left"><b>${esc(x.name)}</b><br><span class="who">${esc([x.cat,x.maker,x.code].filter(Boolean).join(" · "))}</span></span>${isOut(x)?'<span class="tag day">Out</span>':'<span class="tag ok">In</span>'}</button>`).join("")||'<div class="nothing">No samples yet.</div>'}`);
    $("ss-add").onclick=()=>edit(null,draw);document.querySelectorAll(".ss-ed").forEach(b=>b.onclick=()=>edit((S.samples||[]).find(y=>y.id===b.dataset.id),draw))};draw()}
function edit(x0,after){const x=x0?JSON.parse(JSON.stringify(x0)):{id:"smp-"+newId(),name:"",cat:"Doors",maker:"",code:"",where:"",notes:"",photos:[],at:Date.now()};let photos=(x.photos||[]).slice();
  openSheet(`<h3 id="sheettitle">${x0?"✎ Edit sample":"+ Add a sample"}</h3>
    <label for="sx-name">Name<input id="sx-name" maxlength="80" value="${esc(x.name)}" required placeholder="e.g. Oak worktop offcut, Anthracite composite door sample"></label>
    <div class="grid2"><label for="sx-cat">Type<select id="sx-cat">${CATS.map(c=>`<option ${c===x.cat?"selected":""}>${esc(c)}</option>`).join("")}</select></label><label for="sx-maker">Maker / supplier<input id="sx-maker" maxlength="60" value="${esc(x.maker||"")}"></label></div>
    <div class="grid2"><label for="sx-code">Colour / code (optional)<input id="sx-code" maxlength="60" value="${esc(x.code||"")}"></label><label for="sx-where">Where it's kept (optional)<input id="sx-where" maxlength="60" value="${esc(x.where||"")}" placeholder="e.g. van, office shelf 2"></label></div>
    <div class="flabel">Photos</div><div id="sx-ph" style="display:flex;gap:6px;flex-wrap:wrap"></div>
    <label class="btn" style="position:relative;overflow:hidden;margin-top:6px">📷 Take or add photos<input type="file" id="sx-pin" accept="image/*" multiple style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
    <label for="sx-notes">Notes (optional)<textarea id="sx-notes" maxlength="400">${esc(x.notes||"")}</textarea></label>
    ${x0&&(x0.log||[]).length?`<details class="pmdet"><summary>History (${x0.log.length})</summary>${x0.log.slice().reverse().map(l=>`<div class="who">${l.t==="out"?"📤 Out to":"↩ Back from"} ${esc(l.clientName||"")} · ${esc(stamp(l.at))}${l.note?" · "+esc(l.note):""}</div>`).join("")}</details>`:""}
    ${formFoot(!!x0,"Save")}`,async()=>{const name=$("sx-name").value.trim();if(!name){showErr("Add a name");return}$("f-save").disabled=true;
      try{await put(Object.assign({},x,{name,cat:$("sx-cat").value,maker:$("sx-maker").value.trim(),code:$("sx-code").value.trim(),where:$("sx-where").value.trim(),notes:$("sx-notes").value.trim(),photos}));closeForm();toast("Saved");if(after)after();if(curTab()==="samples")render()}catch(e){showErr("Couldn't save. Check your connection.");$("f-save").disabled=false}},"sx-name");
  const ph=()=>{$("sx-ph").innerHTML=photos.map((id,i)=>`<span style="position:relative"><img src="${blobUrl(id)}" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:8px"><button type="button" class="iconbtn sx-rm" data-i="${i}" aria-label="Remove photo" style="position:absolute;top:-6px;right:-6px;background:var(--surface)">✕</button></span>`).join("")||'<span class="who">No photo yet.</span>';
    $("sx-ph").querySelectorAll(".sx-rm").forEach(b=>b.onclick=()=>{photos.splice(+b.dataset.i,1);ph()})};ph();
  $("sx-pin").onchange=async e=>{const fs=[...e.target.files];e.target.value="";if(!S.assets){toast(uploadErr({code:"not_granted"}));return}for(const f of fs){try{const b=await shrinkImage(f,1600);const a=await uploadFile(b,"sample.jpg");photos.push(a.id);ph()}catch(err){toast("Couldn't add that photo")}}};
  if(x0)armDelete(async()=>{if(isOut(x0)){toast("It's booked out – book it back in first");throw new Error("out")}await S.db.doc("todos/"+x0.id).delete();S.samples=(S.samples||[]).filter(y=>y.id!==x0.id);if(after)after()})}
/* ---- on the client's page ---- */
function clientHtml(c){const L=(S.samples||[]).filter(x=>isOut(x)&&x.out.client===c.id);const past=(S.samples||[]).filter(x=>!isOut(x)&&(x.log||[]).some(l=>l.client===c.id)).length;
  if(!L.length&&!(S.samples||[]).length)return "";
  return `<div class="flabel" style="margin-top:12px">🎨 Samples with ${esc(c.name)} (${L.length})</div>${L.map(x=>`<div class="dwsrow" style="align-items:center"><span style="display:flex;gap:8px;align-items:center">${thumb(x,36)}<span><b>${esc(x.name)}</b><br><span class="who">since ${esc(shortDay(iso(new Date(x.out.at))))}${x.out.due?" · back by "+esc(shortDay(x.out.due)):""}</span></span></span><button type="button" class="pillbtn cs-in" data-id="${esc(x.id)}">↩ Back in</button></div>`).join("")||'<div class="who">None out with them'+(past?" (they've had "+past+" before)":"")+".</div>"}
    <div class="actions"><button type="button" class="btn cs-out">📤 Book samples out to ${esc(c.name)}</button></div>`}
function wireClient(c,reopen){document.querySelectorAll(".cs-in").forEach(b=>b.onclick=async()=>{b.disabled=true;try{await bookIn([b.dataset.id]);toast("Back in");reopen()}catch(e){toast("Couldn't save");b.disabled=false}});
  const o=document.querySelector(".cs-out");if(o)o.onclick=()=>{const inL=all().filter(x=>!isOut(x));if(!inL.length){toast("Everything's out – or add samples in Setup");return}
    openSheet(`<h3 id="sheettitle">📤 Book out to ${esc(c.name)}</h3><div class="who">Tick what you're leaving with them.</div><div style="max-height:46vh;overflow:auto">${inL.map(x=>`<label class="smrow"><input type="checkbox" class="cso-t" value="${esc(x.id)}">${thumb(x,44)}<span><b>${esc(x.name)}</b><br><span class="who">${esc([x.cat,x.code].filter(Boolean).join(" · "))}</span></span></label>`).join("")}</div>
      <label for="cso-due">Back by (optional)<input id="cso-due" type="date" value="${esc(iso(addDays(new Date(),7)))}"></label>${formFoot(false,"Book out")}`,async()=>{const ids=[...document.querySelectorAll(".cso-t:checked")].map(x=>x.value);if(!ids.length){showErr("Tick at least one");return}$("f-save").disabled=true;
        try{await bookOut(ids,c.id,$("cso-due").value,"");closeForm();toast(ids.length+" booked out");reopen()}catch(e){showErr("Couldn't save.");$("f-save").disabled=false}})}}
/* ---- PDF of what's out ---- */
async function pdf(btn){const L=all().filter(isOut);if(!L.length){toast("Nothing is booked out");return}const lab=btn.textContent;btn.disabled=true;btn.textContent="Making the PDF…";
  try{await loadJsPdf();const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4"});const W=210,M=14,co=coData(),BR=BRGB();let y=0;const clean=t=>String(t||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[–—]/g,"-").replace(/[^\x20-\x7E£]/g,"");
    const T=(t,x,yy,sz,st,col)=>{doc.setFont("helvetica",st||"normal");doc.setFontSize(sz);doc.setTextColor(...(col||[25,22,21]));doc.text(clean(t),x,yy)};
    doc.setFillColor(...BR);doc.rect(0,0,W,4,"F");await pdfLogo(doc,W-M,8,36,16);T(co.name.toUpperCase(),M,13,8,"bold",BR);T("Samples booked out",M,20,15,"bold");T(new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}),M,25.5,9,"normal",[90,80,80]);y=33;
    const cols=[["Sample",62],["Client",48],["Out since",24],["Back by",24],["Note",24]];doc.setFillColor(240,236,234);doc.rect(M,y,W-2*M,6,"F");let x=M;cols.forEach(([h,w])=>{T(h,x+1.5,y+4.2,8,"bold",[80,72,70]);x+=w});y+=6;
    L.sort((a,b)=>clName(a).localeCompare(clName(b))).forEach(s=>{if(y>280){doc.addPage();y=16}x=M;[s.name+(s.code?" ("+s.code+")":""),clName(s),new Date(s.out.at).toLocaleDateString("en-GB"),s.out.due?new Date(s.out.due+"T12:00").toLocaleDateString("en-GB")+(overdue(s)?" !":""):"-",s.out.note||""].forEach((v,i)=>{T(doc.splitTextToSize(clean(v),cols[i][1]-3)[0]||"",x+1.5,y+4.4,8.5,i===0?"bold":"normal",i===3&&overdue(s)?[180,35,24]:undefined);x+=cols[i][1]});y+=6.4;doc.setDrawColor(225,218,214);doc.setLineWidth(.2);doc.line(M,y,W-M,y)});
    const blob=doc.output("blob");const fn="Samples booked out "+iso(new Date())+".pdf";if(S.dl){try{await S.dl.save({filename:fn,data:blob})}catch(e){pdfShow(blob,fn)}}else pdfShow(blob,fn)}catch(e){toast("Couldn't make the PDF")}
  btn.disabled=false;btn.textContent=lab}
return {view,setupView,clientHtml,wireClient,overdueN:()=>(S.samples||[]).filter(overdue).length};
})();
