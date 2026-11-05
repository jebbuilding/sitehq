/* ================= CLIENT PORTAL ================= */
import { openChat, openClientChat, unread, visibleChats } from "../chat/chat.js";
import { clContactsHtml, clInvHtml, clMainHtml, clientSites } from "./address-book.js";
import { clAddNote, clStage, saveClient } from "./clients.js";
import { pdClientTab, pdOwnerSection, pdSorted, pdWatchAll, pdWhen, ptChatMembers, ptExitPreview, ptOwnerSign, ptPreview, ptSignPdf, wirePdClient, wirePdOwner } from "./portal-calendar.js";
import { viewClient } from "./quick-enquiry.js";
import { clAddr } from "./stages-planner.js";
import { cuDraw, cuListHtml, cuOpen, cuQuickPhoto, cuQuickVideo, cuQuickVoice, cuSend } from "./uploads.js";
import { mapDocs } from "../core/data.js";
import { $, esc, gbp, iso, shortDay, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { isSketch } from "../drawing/trade-drawings.js";
import { attachPicker } from "../files/attachment-picker.js";
import { CUT } from "../files/cut-outs.js";
import { blobUrl, isImg, saveAsset, uploadErr, uploadFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { coData, companyCard } from "../owner/company-details.js";
import { allTeam, nameOf, teamIds } from "../owner/owner.js";
import { siteRec, wireVoice } from "../photos/photos.js";
import { sigPad } from "../safety/site-inductions.js";
import { shrinkImage } from "../safety/training.js";
import { clientJobCard, wireSjPhotos } from "../sites/job-details.js";
import { gmapDir, miniMap } from "../sites/maps-pins.js";
import { docPath } from "../sites/plans-specs.js";
import { same } from "../sites/project-pages.js";
import { folderIcon } from "../sites/trade-sites.js";
export { APP_LINK, PT, PT_FOLDERS, PT_KINDS, newCode, ptAskSign, ptAttach, ptChatId, ptCl, ptClientBlock, ptInvite, ptKind, ptManager, ptMgrSubscribe, ptOf, ptSrc, renderClient, renderClientJoin, renderWelcomeChoice, startClient, startPortalOwner, wireAttDl, wirePtClientBlock };
const APP_LINK="https://claude.ai/artifact/FjLkyzz3jsxrGeowjY2fmh";
const PT_FOLDERS=[["hs","Health & safety (CDM)"],["drawings","Drawings & plans"],["designs","Designs (windows, kitchens, etc.)"],["quotes","Quotes & variations"],["certs","Certificates & warranties"],["photos","Progress photos"],["other","Other documents"]];
const PT_KINDS=[["design","Drawing / design approval","I'm happy with this design and want it to go ahead as shown."],["materials","Materials / finishes choice","I approve these materials and finishes and want the work to go ahead with them."],["goahead","Go-ahead for work","I give the go-ahead for this work to start as described."],["cdm","CDM / health & safety document","I have received and read this document. I understand who holds the CDM 2015 duties on this project and what is needed from me."],["stage","Stage completion","I confirm this stage of the work has been completed to my satisfaction."],["variation","Variation / extra cost","I agree to this change to the work and the extra cost shown."],["handover","Final handover","I confirm the work is complete and I accept the handover."],["gdpr","Privacy policy (GDPR)","I have read and accept the privacy (GDPR) policy, and I agree to my details being kept and used to carry out my job."]];
const ptKind=k=>PT_KINDS.find(x=>x[0]===k)||PT_KINDS[0];
const PT={docs:[],signs:[],unsub:[],tab:"home",folder:"",mgr:null,mgrUnsub:[]};
const isClientMode=()=>!!S.client;
function newCode(){const a="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let s="";for(let i=0;i<6;i++)s+=a[Math.floor(Math.random()*a.length)];return s}
const normCode=c=>String(c||"").toUpperCase().replace(/[^A-Z0-9]/g,"").replace(/^JEB/,"");

/* ---------- client side ---------- */
function startClient(pd){
  S.client=pd||{};S.myProfile={name:S.client.name||"Client",reads:S.client.reads||{}};
  ["issbtn","aibtn"].forEach(id=>{const b=$(id);if(b){b.hidden=true;b.style.display="none"}});
  S.db.doc("portal/"+S.me).onSnapshot(s=>{if(!s.exists)return;S.client=s.data();S.myProfile=Object.assign({},S.myProfile,{name:S.client.name||"Client",reads:S.client.reads||(S.myProfile||{}).reads||{}});render()},()=>{});
  PT.unsub.push(S.db.collection("portal/"+S.me+"/docs").onSnapshot(snap=>{PT.docs=mapDocs(snap).filter(d=>d.assetId).sort((a,b)=>(b.sharedAt||0)-(a.sharedAt||0));render()},()=>{}));
  PT.unsub.push(S.db.collection("portal/"+S.me+"/dates").onSnapshot(snap=>{PT.dates=mapDocs(snap);render()},()=>{}));
  PT.unsub.push(S.db.collection("portal/"+S.me+"/uploads").onSnapshot(snap=>{PT.ups=mapDocs(snap).filter(x=>x.name).sort((a,b)=>b.at-a.at);render()},()=>{}));
  PT.unsub.push(S.db.collection("portal/"+S.me+"/signs").onSnapshot(snap=>{PT.signs=mapDocs(snap).filter(x=>x.title).sort((a,b)=>(b.created||0)-(a.created||0));render()},()=>{}));
  render();
}
function renderWelcomeChoice(){
  $("h1").textContent="Welcome to SiteHQ";$("who").textContent=coData().name;
  $("main").innerHTML=`<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px">
      <b style="font-size:18px">Who are you?</b>
      <button type="button" class="btn primary" id="wc-team" style="justify-content:flex-start">👷 I work for ${esc(coData().name)} (staff or trade)</button>
      <button type="button" class="btn" id="wc-client" style="justify-content:flex-start">🏡 I'm a client</button></div>`;
  $("wc-team").onclick=()=>{S.wcRole="team";render()};
  $("wc-client").onclick=()=>{S.wcRole="client";render()};
}
function renderClientJoin(){
  $("h1").textContent="Client portal";$("who").textContent=coData().name;
  $("main").innerHTML=`<form class="card" id="cj-form" style="padding:16px;display:flex;flex-direction:column;gap:12px">
    <div>Follow your project, see your drawings and documents, message the team and sign things off, all in one place.</div>
    <label for="cj-name">Your name<input id="cj-name" required maxlength="80" placeholder="e.g. Sarah Jones"></label>
    <label for="cj-code">Your portal code from James<input id="cj-code" required maxlength="12" placeholder="e.g. 4K7QXM" style="text-transform:uppercase;letter-spacing:2px"></label>
    <div class="who">James sends you the code by text or email. Your details are only shared with James and the people he chooses.</div>
    <button class="btn primary" type="submit">Join</button><button class="linkbtn" type="button" id="cj-back">‹ Back</button></form>`;
  $("cj-back").onclick=()=>{S.wcRole="";render()};
  $("cj-form").onsubmit=async e=>{e.preventDefault();const name=$("cj-name").value.trim(),code=normCode($("cj-code").value);if(!name||code.length<4){toast("Add your name and the code");return}
    const d={name,code,requestedAt:Date.now(),linked:false,lastAct:Date.now(),lastWhat:"joined the portal"};
    try{await S.db.doc("portal/"+S.me).set(d);startClient(d)}catch(err){toast("Couldn't join. Ask James to check he has shared the app with you.")}};
}
function ptOpenSigns(){return PT.signs.filter(x=>x.status==="open")}
function renderClient(){
  $("tabs").hidden=true;$("weekbar").hidden=true;const C=S.client||{};
  if(C._preview){const sr=ptSrc({id:C._cid});if(!sr.linked||(PT.mgr&&PT.mgr.id===C._cid)){PT.docs=sr.docs();PT.signs=sr.signs();PT.dates=sr.dates()}}
  $("h1").textContent=C.linked?"Your project":"Client portal";$("who").textContent=(C.name||"")+(C.site?" · "+C.site:"");
  if(C.revoked){$("main").innerHTML=`<div class="empty"><strong>Portal access has ended</strong>Contact James if you need anything for your project.</div>`;return}
  if(!C.linked){$("main").innerHTML=`<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:10px"><b style="font-size:18px">Thanks, ${esc(C.name||"")}!</b>
      <div>James will connect your account to your project. This page updates by itself as soon as he does.</div>
      <div class="who">Code entered: <b>${esc(C.code||"")}</b>. Wrong code? <button type="button" class="linkbtn" id="cl-recode">Enter it again</button></div></div>`;
    $("cl-recode").onclick=()=>{const c=prompt?null:null;openSheet(`<h3 id="sheettitle">Portal code</h3><label for="rc-c">Code from James<input id="rc-c" maxlength="12" style="text-transform:uppercase"></label>${formFoot(false,"Save")}`,async()=>{const code=normCode($("rc-c").value);if(code.length<4){showErr("Check the code");return}try{await S.db.doc("portal/"+S.me).update({code,requestedAt:Date.now()});closeForm();toast("Saved")}catch(e){showErr("Couldn't save")}},"rc-c")};return}
  const open=ptOpenSigns(),chats=visibleChats().filter(c=>c.kind==="client"),un=chats.filter(unread).length;
  const coOn=((S.settings||{}).company||{}).showClients!==false;const cpols=(S.policies||[]).filter(d=>d.clientVisible&&d.assetId);
  const newDocs=(PT.docs||[]).filter(d=>(d.sharedAt||0)>(C.seenDocsAt||0));
  const tabs=[["home","🏠 Home"],["photos","📷 Photos"],["docs","📄 Documents"+(newDocs.length?` <span class="badge">${newDocs.length}</span>`:"")],["draw","✏️ Drawing"],["cal","📅 Dates"],["signs","✍️ Sign-offs"+(open.length?` <span class="badge">${open.length}</span>`:"")],["chat","💬 Messages"+(un?` <span class="badge">${un}</span>`:"")]].concat(coOn||cpols.length?[["about","🏢 About us & policies"]]:[]);
  const tab=PT.tab;
  let html=`<div class="seg ptabs" role="tablist">${tabs.map(([k,l])=>`<button type="button" data-v="${k}" aria-pressed="${tab===k}">${l}</button>`).join("")}</div>`;
  if(tab==="home"){
    html+=`<div class="card pthero"><div class="who">Hello ${esc((C.name||"").split(" ")[0])}</div><b style="font-size:20px">${esc(C.project||C.site||"Your project")}</b>${C.site?`<button type="button" class="maplink" data-addr="${esc(C.site)}">📍 ${esc(C.site)}</button>`:""}</div>
      ${C.site?(()=>{const sr=siteRec(C.site)||{};const j=(C.siteJob&&C.siteJob.job)||{};const work=j.work||C.project||sr.project||"";
        return `<div class="sitesum"><div class="sshead">${C.siteJob&&C.siteJob.photo?`<img class="ssph" src="${blobUrl(C.siteJob.photo)}" alt="Your property">`:""}<div style="flex:1"><div class="who">Your job</div><b>📍 ${esc(C.site)}</b>${(()=>{const ad=(C.siteJob&&C.siteJob.address)||"";return ad&&!String(C.site).toLowerCase().includes(ad.toLowerCase())?`<div class="who">${esc(ad)}</div>`:""})()}${work?`<div class="sswork">${esc(work)}</div>`:""}${j.start||j.finish?`<div class="who">${j.start?"Starts "+esc(shortDay(j.start)):""}${j.start&&j.finish?" · ":""}${j.finish?"Due to finish "+esc(shortDay(j.finish)):""}</div>`:""}</div></div>
          ${sr.lat!=null?`<div class="mmwrap">${miniMap(sr.lat,sr.lon,{addr:C.site,label:C.site})}</div>`:""}
          <div class="actions"><button type="button" class="btn maplink" data-addr="${esc(C.site)}" ${sr.lat!=null?`data-lat="${sr.lat}" data-lon="${sr.lon}"`:""} data-label="${esc(C.site)}">📍 Maps &amp; share</button></div></div>`})():""}
      ${newDocs.length?`<div class="notice warn" style="display:flex;flex-direction:column;gap:6px"><b>📬 ${esc((S.settings||{}).ownerName||"James")} sent you ${newDocs.length===1?"a new document":newDocs.length+" new documents"}</b>${newDocs.slice(0,4).map(d=>`<span>${isImg(d.contentType)?"🖼":"📄"} ${esc(d.title||d.fileName)}${d.note?` <span class="who">– ${esc(d.note)}</span>`:""}</span>`).join("")}<div class="actions"><button type="button" class="btn primary pt-go" data-v="docs">Open documents</button><button type="button" class="btn" id="pt-seen">Got it</button></div></div>`:""}
      ${clientJobCard(C.siteJob)}
      <div class="ptquick"><label class="btn primary fhpickbtn">📷 Take a photo<input type="file" class="pt-qcam" accept="image/*" capture="environment"></label><label class="btn fhpickbtn">🖼 Choose photos<input type="file" class="pt-qpick" accept="image/*" multiple></label><label class="btn fhpickbtn">🎥 Video<input type="file" class="pt-qvid" accept="video/*" capture="environment"></label><button type="button" class="btn pt-qvoice">🎤 Voice note</button><button type="button" class="btn" id="pt-qfiles">📤 Send files</button><button type="button" class="btn pt-go" data-v="draw">✏️ Draw something</button></div>
      ${(()=>{const t=iso(new Date());const nx=pdSorted(PT.dates).filter(d=>(d.to||d.from)>=t).slice(0,3);return nx.length?`<button type="button" class="notice pt-go pdnext" data-v="cal" style="text-align:left;cursor:pointer"><b>📅 Coming up</b><br>${nx.map(d=>`${esc(pdWhen(d))}: ${esc(d.title)}${d.by==="client"?" 🚩":""}`).join("<br>")}</button>`:""})()}
      ${open.length?`<button type="button" class="notice warn pt-go" data-v="signs" style="text-align:left;cursor:pointer"><b>✍ ${open.length} thing${open.length===1?"":"s"} for you to sign off</b><br>${open.slice(0,3).map(x=>esc(x.title)).join(" · ")}</button>`:`<div class="notice">Nothing waiting for you to sign. 👍</div>`}
      <div class="folders"><button type="button" class="folder pt-go" data-v="photos"><span class="ricon">📷</span><span class="fname">Photos</span><span class="who">${PT.docs.filter(d=>isImg(d.contentType)).length+(PT.ups||[]).filter(u=>/^image\//.test(u.type||"")&&u.kind!=="drawing").length}</span></button><button type="button" class="folder pt-go" data-v="docs"><span class="ricon">📄</span><span class="fname">Documents</span><span class="who">${PT.docs.filter(d=>!isImg(d.contentType)).length}</span></button><button type="button" class="folder pt-go" data-v="chat"><span class="ricon">💬</span><span class="fname">Messages</span><span class="who">${un?un+" unread":chats.length?"Open":"Not set up yet"}</span></button>${coOn||cpols.length?`<button type="button" class="folder pt-go" data-v="about"><span class="ricon">🏢</span><span class="fname">About us &amp; policies</span><span class="who">${cpols.length?cpols.length+" document"+(cpols.length===1?"":"s"):"Contact details"}</span></button>`:""}<button type="button" class="folder pt-go" data-v="signs"><span class="ricon">✍️</span><span class="fname">Sign-offs</span><span class="who">${PT.signs.filter(x=>x.status!=="open").length} done</span></button></div>
      ${PT.docs.length?`<div class="flabel" style="margin-top:12px">Latest documents</div>${PT.docs.slice(0,4).map(ptDocRow).join("")}`:""}`}
  if(tab==="signs"){html+=PT.signs.length?PT.signs.map(x=>`<button type="button" class="incrow pt-sign" data-id="${esc(x.id)}"><span><b>${esc(x.title)}</b> <span class="tag ${x.status==="signed"?"ok":x.status==="changes"?"bad":"day"}">${x.status==="signed"?"Signed":x.status==="changes"?"Changes asked":"Please sign"}</span><br><span class="who">${esc(ptKind(x.kind)[1])}${x.amount?" · "+gbp(+x.amount):""} · ${esc(stamp(x.created))}</span></span><span aria-hidden="true">›</span></button>`).join(""):'<div class="empty"><strong>Nothing to sign yet</strong>When James needs your approval on a drawing, design, stage or extra cost, it appears here.</div>'}
  const ptDocsOnly=PT.docs.filter(d=>!isImg(d.contentType)),ptPics=PT.docs.filter(d=>isImg(d.contentType));
  const myPics=(PT.ups||[]).filter(u=>/^image\//.test(u.type||"")&&u.kind!=="drawing"),myDocs=(PT.ups||[]).filter(u=>!/^image\//.test(u.type||""));
  if(tab==="photos"){html+=`<div class="ptquick"><label class="btn primary fhpickbtn">📷 Take a photo<input type="file" class="pt-qcam" accept="image/*" capture="environment"></label><label class="btn fhpickbtn">🖼 Choose photos<input type="file" class="pt-qpick" accept="image/*" multiple></label><label class="btn fhpickbtn">🎥 Video<input type="file" class="pt-qvid" accept="video/*" capture="environment"></label><button type="button" class="btn pt-qvoice">🎤 Voice note</button></div>
      <div class="flabel">From James</div>${ptPics.length?`<div class="phgrid">${ptPics.map(d=>`<button type="button" class="ph pt-doc" data-id="${esc(d.id)}"><img src="${blobUrl(d.assetId)}" alt="${esc(d.title||"Photo")}" loading="lazy">${d.title?`<span class="phcap">${esc(d.title)}</span>`:""}</button>`).join("")}</div>`:'<div class="nothing">No photos from James yet.</div>'}
      <div class="flabel" style="margin-top:12px">Photos you've sent</div>${myPics.length?cuListHtml(myPics,false):'<div class="nothing">None yet. Tap the button above to send one.</div>'}`}
  if(tab==="docs"&&!PT.folder){html+=`<div class="ptsend"><div><b>📤 Send documents to James</b><br><span class="who">For example a PDF, a quote you've had, or a form he needs.</span></div><button type="button" class="btn primary" id="pt-send">Send to James</button></div>
      ${myDocs.length?`<div class="flabel">You've sent</div>${cuListHtml(myDocs,false)}`:""}<div class="flabel" style="margin-top:10px">From James</div>`}
  if(tab==="docs"&&newDocs.length&&!C._preview){setTimeout(()=>{S.db.doc("portal/"+S.me).update({seenDocsAt:Date.now()}).catch(()=>{})},1500)}
  if(tab==="docs"){const f=PT.folder;
    if(!f){html+=`<div class="folders">${PT_FOLDERS.map(([k,l])=>{const n=ptDocsOnly.filter(d=>(d.folder||"other")===k).length;return n?`<button type="button" class="folder pt-fold" data-f="${k}"><span class="ficon">${folderIcon()}</span><span class="fname">${esc(l)}</span><span class="who">${n} file${n===1?"":"s"}</span></button>`:""}).join("")||'<div class="empty"><strong>No documents yet</strong>Drawings, designs and certificates James shares with you appear here.</div>'}</div>`}
    else html+=`<div class="actions"><button type="button" class="btn backbtn" id="pt-fback">‹ All folders</button><b>${esc((PT_FOLDERS.find(x=>x[0]===f)||[,""])[1])}</b></div>${ptDocsOnly.filter(d=>(d.folder||"other")===f).map(ptDocRow).join("")}`}
  if(tab==="cal")html+=pdClientTab();
  if(tab==="draw"){const dr=(PT.ups||[]).filter(u=>u.kind==="drawing");html+=`<button type="button" class="btn primary drawnew" id="pt-draw">✏️ Start a new drawing</button>
      <div class="who" style="margin:6px 0 12px">Sketch an idea, a layout or where you'd like things. Add photos and measurements. When you save it, you can send it to James.</div>
      ${dr.length?`<div class="flabel">Drawings you've sent (${dr.length})</div>${cuListHtml(dr,false)}`:`<div class="empty"><strong>No drawings sent yet</strong>Your drawings appear here once you've sent them to James.</div>`}`}
  if(tab==="about"){html+=(coOn?companyCard(true):"")+(cpols.length?`<div class="flabel" style="margin-top:6px">Our policies &amp; insurance</div>${cpols.slice().sort((a,b)=>(a.title||"").localeCompare(b.title||"")).map(d=>`<button type="button" class="incrow pt-pol" data-id="${esc(d.id)}"><span><b>${esc(d.title||d.fileName)}</b><br><span class="who">${esc([d.insurer,d.policyNo?"Policy no. "+d.policyNo:"",d.expires?"Runs to "+shortDay(d.expires):""].filter(Boolean).join(" · "))}</span></span><span aria-hidden="true">📄</span></button>`).join("")}`:"")}
  if(tab==="chat"){html+=chats.length?`<div class="chatlist">${chats.map(c=>`<button type="button" class="chatrow pt-chat" data-c="${esc(c.id)}"><span class="cmain"><b>${esc(c.name||"Your project")}</b><span class="who">${esc(c.lastText||"No messages yet")}</span></span>${unread(c)?'<span class="badge">new</span>':""}</button>`).join("")}</div><div class="who" style="margin-top:8px">James and the trades working on your project can read and reply here.</div>`:'<div class="empty"><strong>Messages aren\'t set up yet</strong>James will open a chat for your project.</div>'}
  if(C._preview)html=`<div class="pvbar"><span>👁 <b>Preview:</b> this is exactly what ${esc(C.name)} sees. Signing is turned off here.</span><button type="button" class="btn backbtn" id="pv-exit">‹ Back to my view</button></div>`+html;
  $("main").innerHTML=html;
  if($("pv-exit"))$("pv-exit").onclick=ptExitPreview;
  $("main").querySelectorAll(".ptabs button,.pt-go").forEach(b=>b.onclick=()=>{PT.tab=b.dataset.v;PT.folder="";render()});
  if($("pt-seen"))$("pt-seen").onclick=()=>{if(S.client._preview){toast("Preview only");return}S.db.doc("portal/"+S.me).update({seenDocsAt:Date.now()}).catch(()=>{})};
  $("main").querySelectorAll(".pt-fold").forEach(b=>b.onclick=()=>{PT.folder=b.dataset.f;render()});
  if($("pt-fback"))$("pt-fback").onclick=()=>{PT.folder="";render()};
  $("main").querySelectorAll(".pt-doc").forEach(b=>b.onclick=()=>{const d=PT.docs.find(x=>x.id===b.dataset.id);if(d)openFile(d.assetId,d.fileName||d.title,d.contentType)});
  $("main").querySelectorAll(".pt-sign").forEach(b=>b.onclick=()=>{const x=PT.signs.find(y=>y.id===b.dataset.id);if(x)ptSignView(x)});
  $("main").querySelectorAll(".pt-chat").forEach(b=>b.onclick=()=>openChat(b.dataset.c));
  if($("pt-send"))$("pt-send").onclick=cuSend;if($("pt-qfiles"))$("pt-qfiles").onclick=cuSend;if($("pt-draw"))$("pt-draw").onclick=cuDraw;
  $("main").querySelectorAll(".pt-qcam,.pt-qpick").forEach(inp=>inp.onchange=e=>{const fs=[...(e.target.files||[])];e.target.value="";if(fs.length)cuQuickPhoto(fs)});
  $("main").querySelectorAll(".pt-qvoice").forEach(b=>wireVoice(b,f=>cuQuickVoice(f)));
  $("main").querySelectorAll(".pt-qvid").forEach(inp=>inp.onchange=e=>{const f=(e.target.files||[])[0];e.target.value="";if(f)cuQuickVideo(f)});
  if(tab==="cal")wirePdClient();
  wireSjPhotos($("main"));
  if(!C._preview)$("main").querySelectorAll(".cuitem").forEach(b=>b.onclick=()=>{const u=(PT.ups||[]).find(x=>x.id===b.dataset.id);if(u)cuOpen(S.me,u,false)});
  $("main").querySelectorAll(".pt-pol").forEach(b=>b.onclick=()=>{const d=(S.policies||[]).find(x=>x.id===b.dataset.id);if(d)openFile(d.assetId,d.fileName||d.title,d.contentType)});
}
function ptDocRow(d){return `<button type="button" class="incrow pt-doc" data-id="${esc(d.id)}"><span><b>${esc(d.title||d.fileName||"Document")}</b><br><span class="who">${esc((PT_FOLDERS.find(x=>x[0]===(d.folder||"other"))||[,""])[1])} · shared ${esc(stamp(d.sharedAt))}${d.note?" · "+esc(d.note):""}</span></span><span aria-hidden="true">${isImg(d.contentType)?"🖼":"📄"}</span></button>`}
function ptAttach(x,docs){const ids=x.docIds||[];const list=ids.map(id=>docs.find(d=>d.id===id)).filter(Boolean).concat((x.files||[]).map(f=>({assetId:f.assetId,title:f.name,fileName:f.name,contentType:f.type,id:f.assetId})));
  return list.length?`<div class="flabel" style="margin-top:10px">What you're signing off</div>${list.map(d=>`<div class="attrow"><button type="button" class="incrow pt-att" data-a="${esc(d.assetId)}" data-n="${esc(d.fileName||d.title||"")}" data-t="${esc(d.contentType||"")}">${isImg(d.contentType)?`<img class="attth" src="${blobUrl(d.assetId)}" alt="" loading="lazy">`:'<span class="attic" aria-hidden="true">📄</span>'}<span><b>${esc(d.title||d.fileName||"File")}</b><br><span class="who">Tap to open and check it</span></span></button><button type="button" class="iconbtn pt-attdl" data-a="${esc(d.assetId)}" data-n="${esc(d.fileName||d.title||"file")}" aria-label="Download ${esc(d.title||d.fileName||"file")}" title="Download">⬇</button></div>`).join("")}${list.length>1?`<button type="button" class="linkbtn pt-attall">⬇ Download all ${list.length} files</button>`:""}`:""}
function wireAttDl(root){root.querySelectorAll(".pt-attdl").forEach(b=>b.onclick=()=>saveAsset(b.dataset.a,b.dataset.n));const all=root.querySelector(".pt-attall");if(all)all.onclick=async()=>{for(const b of root.querySelectorAll(".pt-attdl")){await saveAsset(b.dataset.a,b.dataset.n)}}}
function ptSignView(x){
  const K=ptKind(x.kind);const done=x.status!=="open";
  openViewer(`<span class="tag">${esc(K[1])}</span><h3 style="margin:6px 0 4px">${esc(x.title)}</h3>
    ${x.details?`<div class="talkbody pnotes">${esc(x.details)}</div>`:""}
    ${x.amount?`<div class="ptamt">${x.kind==="variation"?"Extra cost":"Amount"}: <b>${gbp(+x.amount)}</b>${x.vat?` <span class="who">${esc(x.vat)}</span>`:""}</div>`:""}
    ${ptAttach(x,PT.docs)}
    ${done?`<div class="notice ${x.status==="signed"?"":"warn"}" style="margin-top:12px"><b>${x.status==="signed"?"✓ You signed this":"You asked for changes"}</b> on ${esc(stamp(x.signedAt))}${x.status==="signed"?" · 🔒 locked":""}${x.comment?`<br>“${esc(x.comment)}”`:""}</div>${x.sig?`<img src="${x.sig}" alt="Your signature" class="ptsig">`:""}`
    :`<div class="flabel" style="margin-top:14px">Your decision</div>
      <label class="inl ptconfirm"><input type="checkbox" id="ps-ok"> ${esc(x.statement||K[2])}</label>
      <label for="ps-name">Your full name<input id="ps-name" maxlength="80" value="${esc((S.client&&S.client.name)||"")}"></label>
      <div><div class="checkhead"><span class="flabel" style="margin:0">Sign with your finger</span><button type="button" class="pillbtn" id="ps-clear">Clear</button></div><canvas id="ps-sig" class="sigpad" aria-label="Signature box"></canvas></div>
      <label for="ps-com">Comments (optional)<textarea id="ps-com" maxlength="1000" placeholder="Anything you'd like James to know"></textarea></label>
      <div class="actions"><button type="button" class="btn primary" id="ps-sign">✍ Sign and approve</button><button type="button" class="btn" id="ps-chg">I need changes</button></div>`}`);
  $("viewer-body").querySelectorAll(".pt-att").forEach(b=>b.onclick=()=>openFile(b.dataset.a,b.dataset.n,b.dataset.t));wireAttDl($("viewer-body"));
  if(done){$("viewer-body").insertAdjacentHTML("beforeend",`<div class="actions" style="margin-top:12px"><button type="button" class="btn primary" id="ps-rec">📄 Download my sign-off record (PDF)</button></div>`);
    $("ps-rec").onclick=e=>ptSignPdf({name:(S.client&&S.client.name)||"Client",address:"",postcode:""},{site:(S.client&&S.client.site)||""},x,PT.docs||[],e.currentTarget);return}
  const sig=sigPad($("ps-sig"));$("ps-clear").onclick=()=>sig.clear();
  const save=async ok=>{if(S.client&&S.client._preview){toast("This is a preview. Only the client can sign.");return}const name=$("ps-name").value.trim(),com=$("ps-com").value.trim();
    if(ok){if(!$("ps-ok").checked){toast("Tick the box to confirm");return}if(!name){toast("Add your name");return}if(!sig.drawn){toast("Please sign in the box");return}}
    else if(!com){toast("Say what you'd like changed");$("ps-com").focus();return}
    const d={status:ok?"signed":"changes",signedName:name,comment:com,signedAt:Date.now(),sig:ok?sig.data():"",device:navigator.userAgent.slice(0,160)};if(ok)d.locked=true;
    try{const cur=await S.db.doc("portal/"+S.me+"/signs/"+x.id).get();if(cur.exists&&cur.data().status==="signed"){Object.assign(x,cur.data());toast("This has already been signed and is locked");ptSignView(x);return}
      await S.db.doc("portal/"+S.me+"/signs/"+x.id).update(d);await S.db.doc("portal/"+S.me).update({lastAct:Date.now(),lastWhat:(ok?"signed off: ":"asked for changes to: ")+x.title});
      Object.assign(x,d);toast(ok?"Signed. Thank you!":"Sent to James");ptSignView(x);render()}catch(e){toast("Couldn't save. Check your connection.")}};
  $("ps-sign").onclick=()=>save(true);$("ps-chg").onclick=()=>save(false);
}

/* ---------- owner side ---------- */
function startPortalOwner(){
  S.db.collection("portal").onSnapshot(snap=>{S.portal=mapDocs(snap);ptAutoLink();pdWatchAll();render();if(PT.mgr&&!$("viewer").hidden&&$("viewer-body").querySelector(".ptmgr"))ptManager(PT.mgr)},()=>{});
}
const ptOf=c=>c&&c.portalUid?(S.portal||[]).find(p=>p.id===c.portalUid):null;
function ptInvite(c){
  const txt=`Hi ${String(c.name).split(" ")[0]}, it's James at JEB Building Services. You can follow your project, see your drawings and sign things off in our client portal:\n\n1. Open this link: ${APP_LINK}\n   (You'll need a free Claude account, using the email I've invited.)\n2. Tap "I'm a JEB client"\n3. Enter your code: ${c.portalCode}\n\nAny problems, give me a call.`;
  openSheet(`<h3 id="sheettitle">Invite ${esc(c.name)}</h3>
    <div class="notice"><b>Step 1:</b> share the app with them. In Claude, open the app's <b>Share</b> menu, add their email address and give them <b>can use</b> access (not editor). <span class="who">They'll need a free Claude account with that email.</span></div>
    <div class="notice"><b>Step 2:</b> send them this message with their code <b class="ptcode">${esc(c.portalCode)}</b>. When they join, they're connected to ${esc(c.name)} automatically and you'll get a pop-up.</div>
    <textarea readonly style="min-height:150px">${esc(txt)}</textarea>
    <div class="plgrid">${c.phone?`<a class="btn primary" href="sms:${esc(String(c.phone).replace(/\s+/g,""))}?&body=${encodeURIComponent(txt)}">💬 Text</a><a class="btn" href="https://wa.me/${esc(String(c.phone).replace(/\D/g,"").replace(/^0/,"44"))}?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">WhatsApp</a>`:""}${c.email?`<a class="btn" href="mailto:${esc(c.email)}?subject=${encodeURIComponent("Your JEB client portal")}&body=${encodeURIComponent(txt)}">✉ Email</a>`:""}<button type="button" class="btn" id="pi-copy">📋 Copy</button></div>
    <div class="actions"><button type="button" class="btn" id="f-cancel">Done</button></div>`,null);
  $("pi-copy").onclick=async()=>{try{await navigator.clipboard.writeText(txt);toast("Copied")}catch(e){toast("Couldn't copy here. Use Text or Email.")}};
}
function ptMgrSubscribe(c){
  const p=ptOf(c);if(!p)return;if(PT.mgr&&PT.mgr.uid===p.id&&PT.mgrUnsub.length)return;
  PT.mgrUnsub.forEach(u=>{try{u()}catch(e){}});PT.mgrUnsub=[];PT.mgrDocs=[];PT.mgrSigns=[];
  PT.mgrUnsub.push(S.db.collection("portal/"+p.id+"/docs").onSnapshot(snap=>{PT.mgrDocs=mapDocs(snap).filter(d=>d.assetId).sort((a,b)=>(b.sharedAt||0)-(a.sharedAt||0));ptRefresh()},()=>{}));
  PT.mgrUnsub.push(S.db.collection("portal/"+p.id+"/dates").onSnapshot(snap=>{PT.mgrDates=mapDocs(snap);ptRefresh()},()=>{}));
  PT.mgrUnsub.push(S.db.collection("portal/"+p.id+"/uploads").onSnapshot(snap=>{PT.mgrUps=mapDocs(snap).filter(x=>x.name).sort((a,b)=>b.at-a.at);ptRefresh()},()=>{}));
  PT.mgrUnsub.push(S.db.collection("portal/"+p.id+"/signs").onSnapshot(snap=>{PT.mgrSigns=mapDocs(snap).filter(x=>x.title).sort((a,b)=>(b.created||0)-(a.created||0));ptRefresh()},()=>{}));
}
function ptRefresh(){if(S.client&&S.client._preview){render();return}if(PT.mgr&&!$("viewer").hidden&&$("viewer-body").querySelector(".ptmgr")&&$("sheet").hidden)ptManager(PT.mgr)}
const ptChatId=c=>"client-"+String(c.id).replace(/[^a-zA-Z0-9_-]/g,"");
function ptCl(c){return (S.clients||[]).find(x=>x.id===c.id)||c}
function ptSrc(c){c=ptCl(c);const p=ptOf(c);
  if(p)return {linked:true,p,docs:()=>PT.mgrDocs||[],signs:()=>PT.mgrSigns||[],
    addDoc:(id,d)=>S.db.doc("portal/"+p.id+"/docs/"+id).set(d),delDoc:id=>S.db.doc("portal/"+p.id+"/docs/"+id).delete(),
    dates:()=>PT.mgrDates||[],addDate:(id,d)=>S.db.doc("portal/"+p.id+"/dates/"+id).set(d),updDate:(id,d)=>S.db.doc("portal/"+p.id+"/dates/"+id).update(d),delDate:id=>S.db.doc("portal/"+p.id+"/dates/"+id).delete(),
    addSign:(id,d)=>S.db.doc("portal/"+p.id+"/signs/"+id).set(d),updSign:(id,d)=>S.db.doc("portal/"+p.id+"/signs/"+id).update(d),delSign:id=>S.db.doc("portal/"+p.id+"/signs/"+id).delete(),
    bump:()=>S.db.doc("portal/"+p.id).update({ownerAct:Date.now()})};
  const save=async(k,fn)=>{let cur=ptCl(c);try{const d=await S.db.doc("todos/"+c.id).get();if(d.exists)cur=Object.assign({},d.data(),{id:c.id})}catch(e){}
    const list=fn((cur[k]||[]).slice());await S.db.doc("todos/"+c.id).update({[k]:list,updated:Date.now()});const i=(S.clients||[]).findIndex(x=>x.id===c.id);if(i>=0)S.clients[i]=Object.assign({},S.clients[i],cur,{[k]:list})};
  return {linked:false,p:null,docs:()=>(ptCl(c).ptDocs||[]).slice().sort((a,b)=>(b.sharedAt||0)-(a.sharedAt||0)),signs:()=>(ptCl(c).ptSigns||[]).slice().sort((a,b)=>(b.created||0)-(a.created||0)),
    addDoc:(id,d)=>save("ptDocs",L=>L.filter(x=>x.id!==id).concat([Object.assign({id},d)])),delDoc:id=>save("ptDocs",L=>L.filter(x=>x.id!==id)),
    dates:()=>ptCl(c).ptDates||[],addDate:(id,d)=>save("ptDates",L=>L.concat([Object.assign({id},d)])),updDate:(id,d)=>save("ptDates",L=>L.map(x=>x.id===id?Object.assign({},x,d):x)),delDate:id=>save("ptDates",L=>L.filter(x=>x.id!==id)),
    addSign:(id,d)=>save("ptSigns",L=>L.concat([Object.assign({id},d)])),updSign:(id,d)=>save("ptSigns",L=>L.map(x=>x.id===id?Object.assign({},x,d):x)),delSign:id=>save("ptSigns",L=>L.filter(x=>x.id!==id)),
    bump:async()=>{}}}
async function ptAutoLink(){
  for(const p of S.portal||[]){if(p.linked||p.revoked||!p.code)continue;const c=(S.clients||[]).find(x=>x.portalCode&&normCode(x.portalCode)===normCode(p.code));if(!c)continue;
    try{await S.db.doc("portal/"+p.id).update({linked:true,clientId:c.id,site:c.site||clAddr(c),project:c.work||"",linkedAt:Date.now()});
      for(const d of c.ptDocs||[]){const x=Object.assign({},d);delete x.id;await S.db.doc("portal/"+p.id+"/docs/"+d.id).set(x)}
      for(const g of c.ptDates||[]){const x=Object.assign({},g);delete x.id;await S.db.doc("portal/"+p.id+"/dates/"+g.id).set(x)}
      for(const g of c.ptSigns||[]){const x=Object.assign({},g);delete x.id;await S.db.doc("portal/"+p.id+"/signs/"+g.id).set(x)}
      const rec=await saveClient(Object.assign({},c,{portalUid:p.id,portalName:p.name,portalLinkedAt:Date.now(),ptDocs:[],ptSigns:[],ptDates:[],notes:(c.notes||[]).concat([{text:"Joined the client portal as "+p.name,at:Date.now(),auto:true}])}));
      try{const ch=S.chats.find(x=>x.id===ptChatId(c));if(ch&&Array.isArray(ch.members)&&!ch.members.includes(p.id)){const members=ch.members.concat([p.id]);await S.db.doc("chats/"+ch.id).update({members,names:Object.assign({},ch.names||{},{[p.id]:p.name}),pending:false});ch.members=members}}catch(e){}
      toast(`🔔 ${p.name} has joined the client portal (${c.name})`)}catch(e){}}
}
function ptClientBlock(c){
  const p=ptOf(c);const n=p?null:(c.ptDocs||[]).length+(c.ptSigns||[]).length;
  return `<div class="ptblock"><b>🏡 Client portal${p?": connected":c.portalCode?": waiting for them to join":""}</b>
    <span class="who">${p?`${esc(p.name)}${p.lastAct?` · last active ${esc(stamp(p.lastAct))}`:""}${p.lastWhat?` (${esc(p.lastWhat)})`:""}`:`Share documents and ask for sign-offs now. They'll be waiting when ${esc(c.name)} joins.${n?` ${n} item${n===1?"":"s"} ready.`:""}`}</span>
    ${p?(()=>{const ch=S.chats.find(x=>x.id===ptChatId(c));const tr=ch&&Array.isArray(ch.members)?teamIds().filter(id=>ch.members.includes(id)):[];return `<div class="ptchatline">💬 <b>Chat:</b> ${ch?`you${tr.length?", "+tr.map(id=>esc(nameOf(id))).join(", "):""} and ${esc(p.name)}`:"not started yet"} <span class="actions" style="display:inline-flex;margin:0"><button type="button" class="pillbtn" id="pt-chat">${ch?"Open chat":"Start chat"}</button><button type="button" class="pillbtn" id="pt-who">👷 Choose trades</button></span></div>`})():""}
    <div class="actions"><button type="button" class="btn primary" id="pt-manage">Open ${esc(c.name)}'s portal</button><button type="button" class="btn" id="pt-pv">👁 See what they see</button></div></div>`}
function wirePtClientBlock(c){
  if($("pt-manage"))$("pt-manage").onclick=()=>ptManager(c);
  if($("pt-pv"))$("pt-pv").onclick=()=>ptPreview(c);
  if($("pt-chat"))$("pt-chat").onclick=()=>openClientChat(c);
  if($("pt-who"))$("pt-who").onclick=()=>{const p=ptOf(c);const ch=S.chats.find(x=>x.id===ptChatId(c));ptChatMembers(c,p,ch,()=>viewClient(ptCl(c)))};
}
const PT_FOLDER_OF=d=>(d.cat||"other")==="plans"?"drawings":d.cat==="rams"?"other":d.cat==="specs"?"designs":"other";
function ptManager(c){
  c=ptCl(c);const p=ptOf(c);PT.mgr=Object.assign({},c,{uid:p?p.id:""});if(p)ptMgrSubscribe(c);
  const src=ptSrc(c);const docs=src.docs(),signs=src.signs();
  const chat=S.chats.find(x=>x.id===ptChatId(c));const mem=chat&&Array.isArray(chat.members)?chat.members:[];const trades=teamIds().filter(id=>mem.includes(id));
  const site=c.site||"";const sites=[...new Set(siteNames().concat(clientSites(c)))].sort((a,b)=>a.localeCompare(b));
  const status=p?`<span class="tag ok">Connected</span> ${esc(p.name)} can see this.`:c.portalCode?`<span class="tag day">Invite sent</span> Not joined yet. Code <b class="ptcode">${esc(c.portalCode)}</b>. Everything below is waiting for them.`:`<span class="tag">Not invited yet</span> You can set it all up first, then invite them.`;
  openViewer(`<div class="ptmgr"><button type="button" class="btn backbtn" id="pm-back">‹ Back to ${esc(c.name)}</button>
    <h3 style="margin:10px 0 4px">🏡 ${esc(c.name)}'s portal</h3><div class="who">${status}</div>
    ${ptSumHtml(c)}
    <div class="actions" style="margin-top:6px">${p?"":`<button type="button" class="btn primary" id="pm-invite">${c.portalCode?"Send the invite again":"Invite them"}</button>`}<button type="button" class="btn" id="pm-pv">👁 See what they see</button></div>
    <div class="ptsec"><b>🏗️ Their job site</b>
      <label for="pm-site" style="max-width:420px">Site for this client<select id="pm-site"><option value="">Not linked to a site yet</option>${sites.map(s=>`<option ${same(s,site)?"selected":""}>${esc(s)}</option>`).join("")}</select></label>
      ${site?"":`<button type="button" class="btn hv" id="pm-mksite" style="align-self:flex-start">+ Make their address a new site</button>`}</div>
    ${p?`<div class="ptsec"><div class="ptsech"><b>📥 Sent to you by ${esc(p.name)} (${(PT.mgrUps||[]).length})</b></div>${cuListHtml(PT.mgrUps||[],true)}</div>`:""}
    <div class="ptsec"><div class="ptsech"><b>📁 Documents they can see (${docs.length})</b></div>
      <div class="actions">${site?`<button type="button" class="btn primary" id="pm-fromsite">📂 Send from ${esc(site)}</button>`:""}<button type="button" class="btn ${site?"":"primary"}" id="pm-up">⬆ Upload new</button></div>
      ${docs.map(d=>`<div class="pmdoc"><button type="button" class="linkbtn pm-open" data-id="${esc(d.id)}">${isImg(d.contentType)?"🖼":"📄"} ${esc(d.title||d.fileName)}</button><span class="who">${esc((PT_FOLDERS.find(x=>x[0]===(d.folder||"other"))||[,""])[1])} · ${esc(stamp(d.sharedAt))}</span><button type="button" class="linkdanger pm-del" data-id="${esc(d.id)}">Remove</button></div>`).join("")||'<div class="nothing">Nothing shared yet. Only what you send here is visible to the client.</div>'}</div>
    <div class="ptsec"><div class="ptsech"><b>✍ Sign-offs (${signs.length})</b><button type="button" class="btn primary" id="pm-ask">+ Ask for a sign-off</button></div>
      ${signs.map(x=>`<button type="button" class="incrow pm-sign" data-id="${esc(x.id)}"><span><b>${esc(x.title)}</b> <span class="tag ${x.status==="signed"?"ok":x.status==="changes"?"bad":"day"}">${x.status==="signed"?"Signed":x.status==="changes"?"Changes asked":"Waiting"}</span><br><span class="who">${esc(ptKind(x.kind)[1])}${x.amount?" · "+gbp(+x.amount):""} · ${x.signedAt?esc((x.status==="signed"?"signed ":"replied ")+stamp(x.signedAt)):"sent "+esc(stamp(x.created))}</span></span><span aria-hidden="true">›</span></button>`).join("")||'<div class="nothing">Nothing sent for sign-off yet.</div>'}</div>
    ${pdOwnerSection(c,p)}
    <div class="ptsec"><div class="ptsech"><b>💬 Client chat</b>${chat&&p?`<button type="button" class="btn primary" id="pm-chat">Open chat</button>`:""}</div>
      ${p?`<div class="who">${chat?`In the chat: you, ${esc(p.name)}${trades.length?", "+trades.map(id=>esc(nameOf(id))).join(", "):""}.`:"No chat yet. Choose which trades can talk to the client."}</div><button type="button" class="btn" id="pm-members" style="align-self:flex-start">${chat?"Change who's in the chat":"Set up the chat"}</button>`:`<div class="who">The chat can be set up once they've joined.</div>`}</div>
    ${p?`<div class="ptsec"><button type="button" class="linkdanger" id="pm-revoke">End ${esc(c.name)}'s portal access</button></div>`:""}</div>`);
  $("pm-back").onclick=()=>{PT.mgr=null;viewClient(ptCl(c))};
  $("pm-pv").onclick=()=>ptPreview(c);
  if($("pm-invite"))$("pm-invite").onclick=async()=>{let cc=ptCl(c);if(!cc.portalCode){try{cc=await saveClient(Object.assign({},cc,{portalCode:newCode()}))}catch(e){toast("Couldn't save");return}}ptInvite(cc)};
  $("pm-site").onchange=async e=>{const v=e.target.value;try{const rec=await saveClient(Object.assign({},ptCl(c),{site:v}));if(p)await S.db.doc("portal/"+p.id).update({site:v||clAddr(rec)});toast(v?"Linked to "+v:"Site unlinked");ptManager(rec);render()}catch(x){toast("Couldn't save")}};
  if($("pm-mksite"))$("pm-mksite").onclick=async()=>{const name=(clAddr(c)||c.name).trim();try{if(!siteNames().some(n=>same(n,name)))await S.db.collection("sites").add(Object.assign({name,project:c.work||"",client:c.name,created:Date.now()},c.lat!=null?{lat:c.lat,lon:c.lon,pins:c.pins||[]}:{}));const rec=await saveClient(Object.assign({},ptCl(c),{site:name}));if(p)await S.db.doc("portal/"+p.id).update({site:name});toast("Site added: "+name);setTimeout(()=>ptManager(rec),300)}catch(x){toast("Couldn't add the site")}};
  if($("pm-fromsite"))$("pm-fromsite").onclick=()=>ptFromSite(c,site);
  $("pm-up").onclick=()=>ptShareDocs(c);
  $("pm-ask").onclick=()=>ptAskSign(c);
  wirePdOwner(c,p);
  if(p)$("viewer-body").querySelectorAll(".cuitem").forEach(b=>b.onclick=()=>{const u=(PT.mgrUps||[]).find(x=>x.id===b.dataset.id);if(u)cuOpen(p.id,u,true,ptCl(c))});
  $("viewer-body").querySelectorAll(".pm-open").forEach(b=>b.onclick=()=>{const d=docs.find(x=>x.id===b.dataset.id);if(d)openFile(d.assetId,d.fileName||d.title,d.contentType)});
  $("viewer-body").querySelectorAll(".pm-del").forEach(b=>{let a=false;b.onclick=async()=>{if(!a){a=true;b.textContent="Tap again to remove";return}try{await ptSrc(c).delDoc(b.dataset.id);toast("Removed from the portal");if(!p)ptManager(ptCl(c))}catch(e){toast("Couldn't remove")}}});
  $("viewer-body").querySelectorAll(".pm-sign").forEach(b=>b.onclick=()=>{const x=signs.find(y=>y.id===b.dataset.id);if(x)ptOwnerSign(c,p,x,docs)});
  if($("pm-chat"))$("pm-chat").onclick=()=>{closeViewer();openChat(ptChatId(c))};
  if($("pm-members"))$("pm-members").onclick=()=>ptChatMembers(c,p,chat);
  if($("pm-revoke")){let ra=false;$("pm-revoke").onclick=async()=>{if(!ra){ra=true;$("pm-revoke").textContent="Tap again: they will lose access to the portal";return}
    try{await S.db.doc("portal/"+p.id).update({revoked:true,linked:false});if(chat)await S.db.doc("chats/"+chat.id).update({archived:true});const r=Object.assign({},ptCl(c),{notes:(c.notes||[]).concat([{text:"Portal access ended",at:Date.now(),auto:true}])});delete r.portalUid;delete r.portalCode;const rec=await saveClient(r);toast("Portal access ended");PT.mgr=null;viewClient(rec)}catch(e){toast("Couldn't save")}}}
}
function ptSumHtml(c){const tel=String(c.phone||"").replace(/\s+/g,"");const site=c.site||"";const sr=site?siteRec(site)||{}:{};const work=c.work||sr.project||"";
  const row=(l,v)=>v?`<div class="drow"><span>${esc(l)}</span><span>${v}</span></div>`:"";
  return `<div class="sitesum" style="margin-top:8px">
    <div class="sshead"><div><div class="who">Job address</div>${site?`<button type="button" class="maplink ssaddr" data-addr="${esc(site)}">📍 ${esc(site)}</button>`:clAddr(c)?`<button type="button" class="maplink ssaddr" data-addr="${esc(clAddr(c))}" data-client="${esc(c.id)}">📍 ${esc(clAddr(c))}</button>`:`<b>No address yet</b>`}${work?`<div class="sswork">${esc(work)}</div>`:""}</div><span class="tag">${esc(clStage(c.stage))}</span></div>
    ${clMainHtml(c)}${clContactsHtml(c)}<div class="details" style="margin-top:8px">${[row("Property",clAddr(c)&&!same(clAddr(c),site)?esc(clAddr(c)):""),row("Estimate",c.quote?gbp(+c.quote):""),row("What they want",c.desc?esc(c.desc.length>160?c.desc.slice(0,160)+"…":c.desc):"")].join("")}</div>${clInvHtml(c)}
    <div class="actions">${tel?`<a class="btn primary" href="tel:${esc(tel)}">📞 Call</a><a class="btn" href="sms:${esc(tel)}">💬 Text</a>`:""}${site?`<a class="btn" href="${esc(gmapDir(sr.lat!=null?sr.lat+","+sr.lon:site))}" target="_blank" rel="noopener">🚗 Directions</a>`:""}</div></div>`}
function ptFromSite(c,site){
  const src=ptSrc(c);const have=new Set(src.docs().map(d=>d.assetId));
  const sd=S.docs.filter(d=>same(d.site,site)&&d.assetId);const groups=[["plans","Plans & drawings"],["specs","Specs & other documents"],["rams","RAMS"]];
  const ph=allTeam("photos").filter(x=>same(x.site,site)&&x.assetId&&!isSketch(x)).sort((a,b)=>b.takenAt-a.takenAt).slice(0,60);
  const item=(id,label,sub,on)=>`<label class="pfitem ${on?"done":""}"><input type="checkbox" value="${esc(id)}" ${on?"disabled checked":""}><span><b>${esc(label)}</b><br><span class="who">${on?"Already shared":esc(sub)}</span></span></label>`;
  openSheet(`<h3 id="sheettitle">Send from ${esc(site)}</h3><div class="who">Tick what ${esc(c.name)} should see. Only the ticked items go to their portal.</div>
    ${groups.map(([k,l])=>{const g=sd.filter(d=>(d.cat==="other"?"specs":d.cat||"specs")===k);return g.length?`<div class="flabel">${esc(l)} <button type="button" class="linkbtn pf-all" data-g="${k}">tick all</button></div><div class="pflist" data-g="${k}">${g.map(d=>item("d:"+d.id,d.title||d.fileName,(docPath(d)?docPath(d)+" · ":"")+(d.fileName||""),have.has(d.assetId))).join("")}</div>`:""}).join("")||'<div class="nothing">No plans or documents in this site yet. Upload them in Sites first, or use Upload new.</div>'}
    ${ph.length?`<div class="flabel">Site photos <button type="button" class="linkbtn pf-all" data-g="ph">tick all</button></div><div class="pfphotos pflist" data-g="ph">${ph.map(x=>`<label class="pfph ${have.has(x.assetId)?"done":""}"><input type="checkbox" value="p:${esc(x.who)}:${esc(x.id)}" ${have.has(x.assetId)?"disabled checked":""}><img src="${blobUrl(x.assetId)}" alt="" loading="lazy"><span>${esc(shortDay(x.date))}</span></label>`).join("")}</div>`:""}
    <label for="pf-note">Note for them (optional)<input id="pf-note" maxlength="200" placeholder="e.g. Latest drawings after Building Control"></label>
    <div class="who" id="pf-prog"></div>${formFoot(false,"Send to "+String(c.name).split(" ")[0])}`,async()=>{
      const picks=[...document.querySelectorAll(".pflist input:checked:not(:disabled)")].map(x=>x.value);if(!picks.length){showErr("Tick at least one item");return}
      $("f-save").disabled=true;const note=$("pf-note").value.trim();let n=0;
      try{for(const v of picks){$("pf-prog").textContent=`Sending ${++n} of ${picks.length}…`;
          if(v.startsWith("d:")){const d=S.docs.find(x=>x.id===v.slice(2));if(!d)continue;await src.addDoc(newId(),{title:d.title||d.fileName,fileName:d.fileName||"",assetId:d.assetId,contentType:d.contentType||"application/pdf",folder:PT_FOLDER_OF(d),note,sharedAt:Date.now(),fromSite:site,srcId:d.id})}
          else{const [,w,id]=v.split(":");const x=allTeam("photos").find(q=>q.id===id&&q.who===w);if(!x)continue;await src.addDoc(newId(),{title:(x.caption||x.category||"Site photo")+" · "+shortDay(x.date),fileName:"photo.jpg",assetId:x.assetId,contentType:"image/jpeg",folder:"photos",note,sharedAt:Date.now(),fromSite:site})}}
        await src.bump();closeForm();toast(`Sent ${picks.length} item${picks.length===1?"":"s"} to ${c.name}'s portal`);setTimeout(()=>ptManager(ptCl(c)),src.linked?400:100)}
      catch(e){showErr("Couldn't send. Check your connection.");$("f-save").disabled=false}});
  $("form").querySelectorAll(".pf-all").forEach(b=>b.onclick=()=>{$("form").querySelectorAll(`.pflist[data-g="${b.dataset.g}"] input:not(:disabled)`).forEach(i=>i.checked=true)});
}
function ptShareDocs(c){
  const src=ptSrc(c);
  openSheet(`<h3 id="sheettitle">Upload for ${esc(c.name)}</h3><div class="who">Only ${esc(c.name)} (and you) will see these. They don't go to the trades.</div>
    <label for="ps-files">Files (PDFs, drawings, photos)<input id="ps-files" type="file" multiple accept="application/pdf,image/*,.doc,.docx,.rtf,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></label>
    <label for="ps-folder">Folder<select id="ps-folder">${PT_FOLDERS.map(([k,l])=>`<option value="${k}">${esc(l)}</option>`).join("")}</select></label>
    <label for="ps-title">Name (optional, for a single file)<input id="ps-title" maxlength="100" placeholder="e.g. Kitchen design rev C"></label>
    <label for="ps-note">Note (optional)<input id="ps-note" maxlength="200"></label>
    <label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" id="ps-ask"> Also ask them to sign it off as a design approval</label>
    <div class="who" id="ps-prog"></div>${formFoot(false,"Upload")}`,async()=>{
      const files=[...($("ps-files").files||[])];if(!files.length){showErr("Choose at least one file");return}if(!S.assets){showErr(uploadErr({code:"not_granted"}));return}
      $("f-save").disabled=true;const folder=$("ps-folder").value,note=$("ps-note").value.trim(),t1=$("ps-title").value.trim();const ids=[];
      try{for(let i=0;i<files.length;i++){const f=files[i];$("ps-prog").textContent=`Uploading ${i+1} of ${files.length}…`;const img=isImg(f.type)&&!/svg/.test(f.type);
          const a=await uploadFile(img?await shrinkImage(f,2400):f,f.name);const id=newId();ids.push(id);
          await src.addDoc(id,{title:files.length===1&&t1?t1:f.name.replace(/\.[^.]+$/,""),fileName:f.name,assetId:a.id,contentType:img?"image/jpeg":f.type||"application/pdf",folder,note,sharedAt:Date.now()})}
        if($("ps-ask").checked)await ptSrc(c).addSign(newId(),{kind:"design",title:(files.length===1&&t1)||("Design approval: "+files.map(f=>f.name.replace(/\.[^.]+$/,"")).join(", ")).slice(0,120),details:note,docIds:ids,status:"open",created:Date.now()});
        await src.bump();closeForm();toast(`Shared ${files.length} file${files.length===1?"":"s"} with ${c.name}`);setTimeout(()=>ptManager(ptCl(c)),src.linked?400:100)}
      catch(e){showErr(uploadErr(e));$("f-save").disabled=false}});
}
function ptAskSign(c,x0,preKind,after){
  const src=ptSrc(c);const docs=src.docs();
  openSheet(`<h3 id="sheettitle">Ask ${esc(c.name)} to sign off</h3>
    <label for="pa-kind">What is it?<select id="pa-kind">${PT_KINDS.map(([k,l])=>`<option value="${k}" ${k===preKind?"selected":""}>${esc(l)}</option>`).join("")}</select></label>
    <label for="pa-title">Title<input id="pa-title" required maxlength="120" placeholder="e.g. Kitchen layout and units"></label>
    <label for="pa-det">Details<textarea id="pa-det" maxlength="3000" style="min-height:90px" placeholder="e.g. Shaker doors in sage green, oak worktops, island with 3 stools"></textarea></label>
    <div class="grid2" id="pa-amtrow"><label for="pa-amt">Amount £ (optional)<input id="pa-amt" inputmode="decimal" maxlength="12"></label><label for="pa-vat">VAT<select id="pa-vat"><option value="">Not stated</option><option>plus VAT</option><option>including VAT</option><option>no VAT</option></select></label></div>
    <label for="pa-stmt">What they're agreeing to<textarea id="pa-stmt" maxlength="400" style="min-height:60px"></textarea></label>
    ${docs.length?`<div class="flabel">Attach documents they can already see</div><fieldset class="pa-docs">${docs.map(d=>`<label class="inl" style="font-size:14px;color:var(--ink);font-weight:500"><input type="checkbox" value="${esc(d.id)}"> ${esc(d.title||d.fileName)}</label>`).join("")}</fieldset>`:""}
    <div class="flabel">${docs.length?"Or add new photos or files":"Add photos or files for them to check"}</div><div id="pa-pick"></div>
    <div class="flabel">✂️ Parts of PDFs or drawings</div>${CUT.pickerBox("pa-clip",S.preClips||[])}
    <div class="who" id="pa-prog"></div>${formFoot(false,"Send for sign-off")}`,async()=>{
      const title=$("pa-title").value.trim();if(!title){showErr("Add a title");return}const kind=$("pa-kind").value;
      $("f-save").disabled=true;const docIds=[...document.querySelectorAll(".pa-docs input:checked")].map(x=>x.value);const files=pick.files();
      try{for(let i=0;i<files.length;i++){const f=files[i];$("pa-prog").textContent=`Uploading ${i+1} of ${files.length}…`;const img=isImg(f.type)&&!/svg/.test(f.type);const a=await uploadFile(img?await shrinkImage(f,2400):f,f.name);const id=newId();docIds.push(id);
          await ptSrc(c).addDoc(id,{title:f.name.replace(/\.[^.]+$/,""),fileName:f.name,assetId:a.id,contentType:img?"image/jpeg":f.type||"application/pdf",folder:kind==="variation"?"quotes":kind==="design"?"designs":"other",note:"For sign-off: "+title,sharedAt:Date.now()})}
        for(const ck of [...document.querySelectorAll(".pa-clip:checked")].map(x=>x.value)){const cl=(S.clips||[]).find(x=>x.id===ck);if(!cl)continue;const id=newId();docIds.push(id);await ptSrc(c).addDoc(id,{title:cl.name,fileName:cl.name+".jpg",assetId:cl.assetId,contentType:"image/jpeg",folder:kind==="variation"?"quotes":kind==="design"||kind==="materials"?"designs":"other",note:"For sign-off: "+title,sharedAt:Date.now()})}
        await ptSrc(c).addSign(newId(),{kind,title,details:$("pa-det").value.trim(),amount:$("pa-amt").value.trim().replace(/[£,\s]/g,""),vat:$("pa-vat").value,statement:$("pa-stmt").value.trim()||ptKind(kind)[2],docIds,status:"open",created:Date.now()});
        await src.bump();await clAddNote(c,"Sent for sign-off: "+title);
        closeForm();toast(src.linked?"Sent to "+c.name+" to sign":"Ready for "+c.name+" to sign when they join");if(after)setTimeout(after,src.linked?400:100);else setTimeout(()=>ptManager(ptCl(c)),src.linked?400:100)}catch(e){showErr(uploadErr(e));$("f-save").disabled=false}});
  const upd=()=>{const k=$("pa-kind").value;$("pa-stmt").placeholder=ptKind(k)[2];$("pa-amtrow").style.display=k==="variation"||k==="stage"?"":"none"};$("pa-kind").onchange=upd;upd();
  const pick=attachPicker($("pa-pick"));CUT.wireBox($("form"),()=>({sites:clientSites(c),client:c.id}));S.preClips=null;
}

