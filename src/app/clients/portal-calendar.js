/* ================= CLIENT PORTAL: SHARED JOB CALENDAR ================= */
import { clientSites } from "./address-book.js";
import { clAddNote, clList, clStage, saveClient } from "./clients.js";
import { PT, newCode, ptAttach, ptChatId, ptCl, ptInvite, ptKind, ptManager, ptMgrSubscribe, ptOf, ptSrc, wireAttDl } from "./portal.js";
import { clAddPlan, clAddr } from "./stages-planner.js";
import { mapDocs } from "../core/data.js";
import { askOwnerPin } from "../core/dictation.js";
import { $, addDays, esc, gbp, iso, shortDay, stamp, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { getFileBlob, openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { printBlob } from "../files/print.js";
import { coData } from "../owner/company-details.js";
import { auditFirst } from "../owner/deletion-record.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { loadJsPdf, sigPad } from "../safety/site-inductions.js";
import { sjClientOK, sjMaster, sjPayload } from "../sites/job-details.js";
import { same } from "../sites/project-pages.js";
import { myName } from "../survey/door-window-survey.js";
export { pdClientDatesOn, pdClientTab, pdOwnerSection, pdSorted, pdWatchAll, pdWhen, portalTab, ptChatMembers, ptExitPreview, ptOwnerSign, ptPreview, ptSignPdf, signHere, wirePdClient, wirePdOwner };
const PD_KINDS=[["date","Important date"],["visit","Visit / appointment"],["delivery","Delivery"],["work","Work on site"],["away","We're away / not available"],["other","Other"]];
const pdKind=k=>(PD_KINDS.find(x=>x[0]===k)||PD_KINDS[0])[1];
const pdWhen=d=>shortDay(d.from)+(d.to&&d.to!==d.from?" – "+shortDay(d.to):"")+(d.time?" · "+d.time:"");
function pdSorted(list){return (list||[]).filter(d=>d.from&&d.title).slice().sort((a,b)=>(a.from+(a.time||"")).localeCompare(b.from+(b.time||"")))}
function pdMonthHtml(list,ym,mine){const [y,m]=ym.split("-").map(Number);const first=new Date(y,m-1,1);const start=addDays(first,-((first.getDay()+6)%7));const today=iso(new Date());
  let h=`<div class="pdcal"><div class="pdnav"><button type="button" class="iconbtn pd-mv" data-d="-1" aria-label="Previous month">‹</button><b>${first.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</b><button type="button" class="iconbtn pd-mv" data-d="1" aria-label="Next month">›</button></div><div class="pdgrid">${["M","T","W","T","F","S","S"].map(d=>`<span class="pdh">${d}</span>`).join("")}`;
  for(let i=0;i<42;i++){const d=addDays(start,i),k=iso(d);const on=list.filter(x=>x.from<=k&&(x.to||x.from)>=k);
    h+=`<button type="button" class="pdday ${d.getMonth()!==m-1?"out":""} ${k===today?"today":""} ${on.length?"has":""}" data-k="${k}">${d.getDate()}${on.length?`<span class="pddots">${on.slice(0,3).map(x=>`<i class="${x.by==="client"?"c":"j"}"></i>`).join("")}</span>`:""}</button>`}
  return h+`</div><div class="pdkey"><span><i class="j"></i> From James</span><span><i class="c"></i> Added by ${mine?"you":"the client"}</span></div></div>`}
function pdListHtml(list,mine,owner){const t=iso(new Date());const up=list.filter(d=>(d.to||d.from)>=t),past=list.filter(d=>(d.to||d.from)<t);
  const it=d=>`<button type="button" class="pdrow ${d.by==="client"?"cl":"jb"}" data-id="${esc(d.id)}"><span class="pdwhen">${esc(pdWhen(d))}</span><span><b>${esc(d.title)}</b>${d.by==="client"?` <span class="tag pdflag">${mine?"Added by you":"🚩 From client"}</span>`:""}${owner&&d.by==="client"&&!d.seenAt?' <span class="tag bad">New</span>':""}<br><span class="who">${esc(pdKind(d.kind))}${d.note?" · "+esc(d.note):""}</span></span></button>`;
  return `${up.length?up.map(it).join(""):'<div class="nothing">No dates coming up.</div>'}${past.length?`<details class="pdpast"><summary class="who">Past dates (${past.length})</summary>${past.reverse().map(it).join("")}</details>`:""}`}
function pdEditor(d,onSave,onDel,who){d=d||{};const ed=!!d.id;
  openSheet(`<h3 id="sheettitle">${ed?"Edit date":"Add a date"}</h3>
    <label for="pd-t">What is it?<input id="pd-t" required maxlength="100" value="${esc(d.title||"")}" placeholder="${who==="client"?"e.g. We're on holiday / Kitchen being delivered":"e.g. Scaffold goes up"}"></label>
    <label for="pd-k">Type<select id="pd-k">${PD_KINDS.map(([k,l])=>`<option value="${k}" ${d.kind===k?"selected":""}>${esc(l)}</option>`).join("")}</select></label>
    <div class="grid2"><label for="pd-f">Date<input id="pd-f" type="date" required value="${esc(d.from||iso(new Date()))}"></label><label for="pd-to">Until (optional)<input id="pd-to" type="date" value="${esc(d.to&&d.to!==d.from?d.to:"")}"></label></div>
    <label for="pd-tm" style="max-width:200px">Time (optional)<input id="pd-tm" type="time" value="${esc(d.time||"")}"></label>
    <label for="pd-n">Note (optional)<input id="pd-n" maxlength="300" value="${esc(d.note||"")}"></label>
    ${formFoot(ed&&!!onDel,ed?"Save":"Add date")}`,async()=>{const t=$("pd-t").value.trim(),f=$("pd-f").value;if(!t||!f){showErr("Add what it is and the date");return}
      const to=$("pd-to").value;if(to&&to<f){showErr("The end date must be after the start");return}
      $("f-save").disabled=true;try{await onSave({title:t,kind:$("pd-k").value,from:f,to:to||f,time:$("pd-tm").value,note:$("pd-n").value.trim()});closeForm()}catch(e){showErr("Couldn't save. Check your connection.");$("f-save").disabled=false}},"pd-t");
  if(ed&&onDel)armDelete(async()=>{await onDel()});
}
/* client side */
function pdClientTab(){const list=pdSorted(PT.dates);const ym=PT.pdym||iso(new Date()).slice(0,7);const prev=S.client&&S.client._preview;
  return `<div class="ptsend"><div><b>📅 Your job calendar</b><br><span class="who">Important dates for your job. Add your own, like holidays or deliveries, and James will see them.</span></div><button type="button" class="btn primary" id="pd-add">+ Add a date</button></div>
    ${pdMonthHtml(list,ym,true)}<div class="flabel" style="margin-top:10px">Coming up</div>${pdListHtml(list,true,false)}`}
function wirePdClient(){const prev=S.client&&S.client._preview;const uid=prev?(PT.mgr&&PT.mgr.uid):S.me;
  const save=async(id,data)=>{if(prev){toast("This is a preview. Only the client can add dates.");throw 0}await S.db.doc(`portal/${S.me}/dates/${id}`).set(data);await S.db.doc("portal/"+S.me).update({lastAct:Date.now(),lastWhat:"added a date: "+data.title+" ("+pdWhen(data)+")"});toast("Added. James can see it.")};
  if($("pd-add"))$("pd-add").onclick=()=>pdEditor(null,d=>save(newId(),Object.assign(d,{by:"client",at:Date.now()})),null,"client");
  $("main").querySelectorAll(".pd-mv").forEach(b=>b.onclick=()=>{const [y,m]=(PT.pdym||iso(new Date()).slice(0,7)).split("-").map(Number);const d=new Date(y,m-1+(+b.dataset.d),1);PT.pdym=iso(d).slice(0,7);render()});
  $("main").querySelectorAll(".pdday.has").forEach(b=>b.onclick=()=>{const k=b.dataset.k;const r=$("main").querySelector(`.pdrow[data-id="${(pdSorted(PT.dates).find(x=>x.from<=k&&(x.to||x.from)>=k)||{}).id}"]`);if(r){r.scrollIntoView({behavior:"smooth",block:"center"});r.classList.add("flash");setTimeout(()=>r.classList.remove("flash"),1200)}});
  $("main").querySelectorAll(".pdrow").forEach(b=>b.onclick=()=>{const d=(PT.dates||[]).find(x=>x.id===b.dataset.id);if(!d)return;
    if(d.by==="client"&&!prev)pdEditor(d,async x=>{{const o=Object.assign({},d,x,{edited:Date.now()});delete o.id;await S.db.doc(`portal/${S.me}/dates/${d.id}`).set(o)};await S.db.doc("portal/"+S.me).update({lastAct:Date.now(),lastWhat:"changed a date: "+x.title})},async()=>{await S.db.doc(`portal/${S.me}/dates/${d.id}`).delete()},"client");
    else openViewer(`<span class="tag">${esc(pdKind(d.kind))}</span><h3 style="margin:6px 0">${esc(d.title)}</h3><div class="who">${esc(pdWhen(d))}</div>${d.note?`<div class="talkbody" style="margin-top:8px">${esc(d.note)}</div>`:""}<div class="who" style="margin-top:8px">${d.by==="client"?"Added by you":"From James"}</div>`)});
}
/* owner side */
function pdOwnerSection(c,p){const src=ptSrc(c);const list=pdSorted(src.dates());const newC=list.filter(d=>d.by==="client"&&!d.seenAt).length;
  return `<div class="ptsec"><div class="ptsech"><b>📅 Job calendar (${list.length})${newC?` <span class="tag bad">${newC} new from client</span>`:""}</b></div>
    <div class="actions"><button type="button" class="btn primary" id="pm-dadd">+ Add a date</button>${(c.site||c.id)?`<button type="button" class="btn" id="pm-dplan">📅 Pick from my planner</button>`:""}</div>
    <div class="who">Client-added dates are flagged 🚩 in a different colour.</div>${pdListHtml(list,false,true)}</div>`}
function wirePdOwner(c,p){const src=ptSrc(c);const V=$("viewer-body");
  const again=()=>setTimeout(()=>ptManager(ptCl(c)),src.linked?350:80);
  if($("pm-dadd"))$("pm-dadd").onclick=()=>pdEditor(null,async d=>{await src.addDate(newId(),Object.assign(d,{by:"owner",at:Date.now()}));await src.bump();toast("Added to their calendar");again()},null,"owner");
  if($("pm-dplan"))$("pm-dplan").onclick=()=>{const t=iso(new Date());const have=new Set(src.dates().map(d=>d.planId).filter(Boolean));
    const ps=(S.plan||[]).concat((S.planPrivate||[]).map(x=>Object.assign({},x,{vis:"me"}))).filter(x=>(x.clientId===c.id||(c.site&&same(x.site,c.site)))&&(x.to||x.from)>=t).sort((a,b)=>(a.from+(a.time||"")).localeCompare(b.from+(b.time||"")));
    openSheet(`<h3 id="sheettitle">Pick from your planner</h3><div class="who">Planner entries for ${esc(c.site||c.name)}. Tick the ones ${esc(c.name)} should see.</div>
      <div class="pflist">${ps.map(x=>`<label class="pfitem ${have.has(x.id)?"done":""}"><input type="checkbox" value="${esc(x.id)}" ${have.has(x.id)?"disabled checked":""}><span><b>${esc(x.title)}</b><br><span class="who">${esc(pdWhen(x))}${have.has(x.id)?" · already shared":""}</span></span></label>`).join("")||'<div class="nothing">Nothing coming up in the planner for this job.</div>'}</div>${formFoot(false,"Add to their calendar")}`,async()=>{
        const picks=[...document.querySelectorAll(".pflist input:checked:not(:disabled)")].map(x=>ps.find(y=>y.id===x.value)).filter(Boolean);if(!picks.length){showErr("Tick at least one");return}
        $("f-save").disabled=true;try{for(const x of picks)await src.addDate(newId(),{title:x.title.replace(/^(Visit|Cost job|Chase estimate): /,""),kind:x.type==="delivery"?"delivery":x.type==="work"?"work":x.type==="meeting"?"visit":"date",from:x.from,to:x.to||x.from,time:x.time||"",note:"",by:"owner",planId:x.id,at:Date.now()});await src.bump();closeForm();toast(`Added ${picks.length} to their calendar`);again()}catch(e){showErr("Couldn't save");$("f-save").disabled=false}})};
  V.querySelectorAll(".ptsec .pdrow").forEach(b=>b.onclick=async()=>{const d=src.dates().find(x=>x.id===b.dataset.id);if(!d)return;
    if(d.by==="client"){if(!d.seenAt&&src.linked)try{await src.updDate(d.id,{seenAt:Date.now()})}catch(e){}
      openViewer(`<button type="button" class="btn backbtn" id="pdo-back">‹ Back to portal</button><div style="margin-top:8px"><span class="tag pdflag">🚩 From ${esc(c.name)}</span> <span class="tag">${esc(pdKind(d.kind))}</span></div><h3 style="margin:6px 0">${esc(d.title)}</h3><div class="who">${esc(pdWhen(d))} · added ${esc(stamp(d.at))}</div>${d.note?`<div class="talkbody" style="margin-top:8px">${esc(d.note)}</div>`:""}
        <div class="actions" style="margin-top:10px"><button type="button" class="btn primary" id="pdo-plan">${d.planId?"✓ In your planner":"Add to my planner"}</button><button type="button" class="linkdanger" id="pdo-del">Delete</button></div>`);
      $("pdo-back").onclick=()=>ptManager(ptCl(c));
      $("pdo-plan").onclick=async()=>{if(d.planId){toast("Already in your planner");return}try{const pid=await clAddPlan(ptCl(c),{title:"🚩 "+c.name+": "+d.title,type:d.kind==="delivery"?"delivery":d.kind==="away"?"other":"keydate",from:d.from,to:d.to||d.from,time:d.time||"",notes:d.note||""});await src.updDate(d.id,{planId:pid});d.planId=pid;$("pdo-plan").textContent="✓ In your planner";toast("Added to your planner")}catch(e){toast("Couldn't add")}};
      let a=false;$("pdo-del").onclick=async()=>{if(!a){a=true;$("pdo-del").textContent="Tap again to delete";return}try{await src.delDate(d.id);ptManager(ptCl(c))}catch(e){toast("Couldn't delete")}}}
    else pdEditor(d,async x=>{await src.updDate(d.id,x);again()},async()=>{await src.delDate(d.id);again()},"owner")});
}
/* owner: client dates in the planner diary */
const PDO={subs:{},data:{}};
function pdWatchAll(){(S.portal||[]).filter(p=>p.linked&&!p.revoked).forEach(p=>{if(PDO.subs[p.id])return;PDO.subs[p.id]=S.db.collection(`portal/${p.id}/dates`).onSnapshot(snap=>{PDO.data[p.id]=mapDocs(snap);render()},()=>{})})}
function pdClientDatesOn(day){const out=[];(S.portal||[]).forEach(p=>{(PDO.data[p.id]||[]).filter(d=>d.by==="client"&&d.from<=day&&(d.to||d.from)>=day&&!d.planId).forEach(d=>{const c=(S.clients||[]).find(x=>x.portalUid===p.id);out.push({k:"cdate",label:"🚩 Client",title:d.title,sub:(c?c.name:p.name)+(d.time?" · "+d.time:""),client:c})})});return out}

function ptChatMembers(c,p,chat,after){
  const ids=teamIds();const mem=chat&&Array.isArray(chat.members)?chat.members:[];
  openSheet(`<h3 id="sheettitle">Who can talk to ${esc(c.name)}?</h3><div class="who">Only the people you tick (and you) can see this chat. Other trades won't see it at all.</div>
    <fieldset class="pm-who">${ids.map(id=>`<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" value="${esc(id)}" ${mem.includes(id)?"checked":""}> ${esc(nameOf(id))}${(S.team[id]&&S.team[id].details&&S.team[id].details.trade)?` <span class="who">${esc(S.team[id].details.trade)}</span>`:""}</label>`).join("")||'<div class="nothing">No trades on the app yet.</div>'}</fieldset>
    ${formFoot(false,chat?"Save":"Start the chat")}`,async()=>{
      const pick=[...document.querySelectorAll(".pm-who input:checked")].map(x=>x.value);const members=[p.id,S.me].concat(pick);
      const d={kind:"client",name:(c.work?c.work+": ":"")+c.name,clientId:c.id,members,names:{[p.id]:p.name},site:p.site||"",updated:Date.now()};
      try{const cid=chat?chat.id:ptChatId(c);if(chat)await S.db.doc("chats/"+cid).update(d);else await S.db.doc("chats/"+cid).set(Object.assign({created:Date.now(),lastAt:0},d));
        const added=pick.filter(id=>!mem.includes(id)),removed=mem.filter(id=>id!==p.id&&id!==S.me&&!pick.includes(id));
        if(added.length||removed.length){const at=Date.now();const txt=[added.length?myName()+" added "+added.map(id=>nameOf(id)).join(", ")+" to this chat.":"",removed.length?removed.map(id=>nameOf(id)).join(", ")+(removed.length===1?" has":" have")+" left the chat.":""].filter(Boolean).join(" ");
          await S.db.doc("msgs/"+cid+"/m/"+newId()).set({by:S.me,byName:myName(),text:"ℹ️ "+txt,at,site:"",jobId:"",jobTitle:""});await S.db.doc("chats/"+cid).update({lastAt:at,lastBy:S.me,lastName:myName(),lastText:"ℹ️ "+txt.slice(0,110)})}
        {const i=S.chats.findIndex(z=>z.id===cid);const rec=Object.assign({id:cid},i>=0?S.chats[i]:{created:Date.now(),lastAt:0},d);if(i>=0)S.chats[i]=rec;else S.chats.push(rec)}
        closeForm();toast(chat?"Saved":"Chat started");if(after)after(cid);else ptManager(c)}catch(e){showErr("Couldn't save")}});
}
function ptOwnerSign(c,p,x,docs){
  const K=ptKind(x.kind);
  openViewer(`<button type="button" class="btn backbtn" id="po-back">${PT.backTo?"‹ Back to sign-offs":"‹ Back to portal"}</button><span class="tag" style="margin-left:8px">${esc(K[1])}</span><h3 style="margin:8px 0 4px">${esc(x.title)}</h3>
    ${x.details?`<div class="talkbody pnotes">${esc(x.details)}</div>`:""}${x.amount?`<div class="ptamt">Amount: <b>${gbp(+x.amount)}</b> ${esc(x.vat||"")}</div>`:""}
    <div class="who" style="margin-top:6px">They agree: “${esc(x.statement||K[2])}”</div>${ptAttach(x,docs)}
    ${x.status==="open"?`<div class="notice" style="margin-top:12px">Waiting for ${esc(p?p.name:c.name)} to sign. Sent ${esc(stamp(x.created))}.</div>`:`<div class="notice ${x.status==="signed"?"":"warn"}" style="margin-top:12px"><b>${x.status==="signed"?"✓ Signed by "+esc(x.signedName||(p?p.name:c.name)):"Changes asked for by "+esc(x.signedName||(p?p.name:c.name))}</b> · ${esc(stamp(x.signedAt))}${x.status==="signed"?`<br>🔒 Signature locked. It can't be changed, and deleting it needs your PIN.`:""}${x.comment?`<br>“${esc(x.comment)}”`:""}</div>${x.sig?`<img src="${x.sig}" alt="Client signature" class="ptsig">`:""}`}
    <div class="actions" style="margin-top:10px">${x.status!=="signed"?`<button type="button" class="btn primary" id="po-here">✍️ ${esc(c.name)} signs now on this device</button>`:""}<button type="button" class="btn" id="po-print">🖨 Print${x.status==="open"?" to sign on paper":""}</button>${x.status!=="open"?`<button type="button" class="btn primary" id="po-pdf">📄 Download PDF record</button>`:""}${x.status==="changes"?`<button type="button" class="btn" id="po-resend">Send again for sign-off</button>`:""}<button type="button" class="linkdanger" id="po-del">Delete</button></div>`);
  $("po-back").onclick=()=>{if(PT.backTo){const f=PT.backTo;PT.backTo=null;f();return}ptManager(c)};
  $("viewer-body").querySelectorAll(".pt-att").forEach(b=>b.onclick=()=>openFile(b.dataset.a,b.dataset.n,b.dataset.t));wireAttDl($("viewer-body"));
  if($("po-pdf"))$("po-pdf").onclick=e=>ptSignPdf(c,p,x,docs,e.currentTarget);
  $("po-print").onclick=async e=>{const b=await ptSignPdf(c,p,x,docs,e.currentTarget,true);if(b)printBlob(b,"Sign-off - "+x.title+".pdf");e.currentTarget.disabled=false};
  if($("po-here"))$("po-here").onclick=()=>signHere(c,x,()=>ptOwnerSign(c,p,x,docs));
  if($("po-resend"))$("po-resend").onclick=async()=>{if(x.status==="signed"&&!x.__pinOk){askOwnerPin("It has been signed. Sending it again clears the signature. Enter your PIN. The signed version is kept in your permanent deletion record.",async()=>{if(await auditFirst("Signature cleared (sent to sign again)",x.title||"Sign-off",`Client: ${c.name}. Signed by ${x.signedName||"?"}${x.signedAt?" on "+stamp(x.signedAt):""}.`,x)){x.__pinOk=1;$("po-resend").click()}});return}try{await ptSrc(c).updSign(x.id,{status:"open",history:(x.history||[]).concat([{status:x.status,comment:x.comment,signedAt:x.signedAt,signedName:x.signedName}]),comment:"",signedAt:null,sig:""});toast("Sent again");ptManager(c)}catch(e){toast("Couldn't save")}};
  let a=false;const doDel=async()=>{try{await ptSrc(c).delSign(x.id);toast("Deleted");setTimeout(()=>ptManager(ptCl(c)),300)}catch(e){toast("Couldn't delete")}};
  $("po-del").onclick=()=>{if(x.status==="signed"){askOwnerPin("This sign-off has been signed and is locked. Enter your PIN to delete it. The details are kept in your permanent deletion record.",async()=>{if(await auditFirst("Signed sign-off deleted",x.title||"Sign-off",`Client: ${c.name}. Signed by ${x.signedName||"?"}${x.signedAt?" on "+stamp(x.signedAt):""}. Status was ${x.status}.`,x))doDel()});return}if(!a){a=true;$("po-del").textContent="Tap again to delete";return}doDel()};
}
/* the client signs on James's tablet / phone, on site */
function signHere(c,x,after){const K=ptKind(x.kind);const d=document.createElement("div");d.className="dimask";d.style.zIndex="130";
  d.innerHTML=`<div class="dimbox" style="width:min(560px,100%);max-height:92vh;overflow:auto"><b>✍️ ${esc(x.title)}</b><div class="who">Hand the device to ${esc(c.name)} to read and sign.</div>
    ${x.details?`<div class="talkbody pnotes" style="margin-top:6px">${esc(x.details)}</div>`:""}${x.amount?`<div class="ptamt">Amount: <b>${gbp(+x.amount)}</b> ${esc(x.vat||"")}</div>`:""}
    <label class="inl ptconfirm" style="margin-top:8px"><input type="checkbox" class="sh-ok"> ${esc(x.statement||K[2])}</label>
    <label>Full name<input class="sh-name" maxlength="80" value="${esc(c.name||"")}"></label>
    <div><div class="checkhead"><span class="flabel" style="margin:0">Sign with your finger</span><button type="button" class="pillbtn sh-clr">Clear</button></div><canvas class="sigpad sh-sig" aria-label="Signature box"></canvas></div>
    <label>Comments (optional)<textarea class="sh-com" maxlength="600"></textarea></label>
    <div class="dimbtns"><button type="button" class="btn sh-x">Cancel</button><button type="button" class="btn primary sh-go">✍ Sign and approve</button></div></div>`;
  document.body.appendChild(d);const pad=sigPad(d.querySelector(".sh-sig"));d.querySelector(".sh-clr").onclick=()=>pad.clear();d.querySelector(".sh-x").onclick=()=>d.remove();
  d.querySelector(".sh-go").onclick=async()=>{const nm=d.querySelector(".sh-name").value.trim();if(!d.querySelector(".sh-ok").checked){toast("Tick the box to agree");return}if(!nm){toast("Add the name");return}if(!pad.drawn){toast("Please sign in the box");return}
    const b=d.querySelector(".sh-go");b.disabled=true;b.textContent="Saving…";const data={status:"signed",signedName:nm,comment:d.querySelector(".sh-com").value.trim(),signedAt:Date.now(),sig:pad.data(),locked:true,onDevice:true,witnessedBy:myName(),device:"In person on "+myName()+"'s device"};
    try{await ptSrc(c).updSign(x.id,data);Object.assign(x,data);try{const src=ptSrc(c);if(src.bump)await src.bump()}catch(e){}try{await clAddNote(c,"Signed in person: "+x.title)}catch(e){}d.remove();toast("Signed by "+nm);if(after)after()}
    catch(e){b.disabled=false;b.textContent="✍ Sign and approve";toast("Couldn't save. Check your connection.")}}}
async function ptSignPdf(c,p,x,docs,btn,asBlob){
  if(!asBlob&&!S.dl){toast("Downloads only work when the page is opened in claude.ai");return}
  if(btn)btn.disabled=true;try{await loadJsPdf()}catch(e){if(!asBlob)toast("Couldn't load the PDF maker");if(btn)btn.disabled=false;return}
  const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4"});const W=210,M=18;let y=20;const K=ptKind(x.kind);
  const clean=t=>String(t||"").replace(/[–—]/g,"-").replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/×/g,"x").replace(/[^\x09\x0A\x0D\x20-\x7E£·•°]/g,"");
  const text=(t,size=10,style="normal",gap=2,col)=>{doc.setFont("helvetica",style);doc.setFontSize(size);doc.setTextColor(...(col||[20,20,20]));doc.splitTextToSize(clean(t),W-2*M).forEach(l=>{doc.text(l,M,y);y+=size*0.43});y+=gap;doc.setTextColor(20,20,20)};
  doc.setFillColor(...BRGB());doc.rect(0,0,W,6,"F");
  await pdfLogo(doc,W-M,10,48,22);
  text("JEB BUILDING SERVICES",9,"bold",4,BRGB());text("Client sign-off record",11,"normal",3,[110,100,100]);y+=2;text(x.title,17,"bold",4);
  const kv=(l,v)=>{if(!v)return;doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(110,100,100);doc.text(clean(l),M,y);doc.setTextColor(20,20,20);doc.setFont("helvetica","normal");const ls=doc.splitTextToSize(clean(v),W-2*M-48);ls.forEach((ln,i)=>doc.text(ln,M+48,y+i*4.5));y+=ls.length*4.5+2};
  kv("Type",K[1]);kv("Client",c.name);kv("Property",[c.address,c.postcode].filter(Boolean).join(", ")||p.site);kv("Amount",x.amount?gbp(+x.amount)+(x.vat?" "+x.vat:""):"");kv("Sent for sign-off",stamp(x.created));
  const att=(x.docIds||[]).map(id=>docs.find(d=>d.id===id)).filter(Boolean).map(d=>d.title||d.fileName);kv("Documents",att.join("\n"));
  {const ims=(x.docIds||[]).map(id=>docs.find(d=>d.id===id)).filter(d=>d&&/^image\//.test(d.contentType||"")).map(d=>d.assetId).concat((x.files||[]).filter(f=>/^image\//.test(f.type||"")).map(f=>f.assetId)).filter(Boolean).slice(0,6);
   if(ims.length){const cw=(W-2*M-6)/2,ch=56;let col=0;y+=2;for(const id of ims){try{const b=await getFileBlob(id);const u=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(b)});const dm=await new Promise(r=>{const im=new Image();im.onload=()=>r([im.naturalWidth,im.naturalHeight]);im.onerror=()=>r([4,3]);im.src=u});
     if(col===0&&y+ch>262){doc.addPage();y=18}let w=cw-2,h=w*dm[1]/dm[0];if(h>ch-2){h=ch-2;w=h*dm[0]/dm[1]}const x0=M+col*(cw+6);doc.setDrawColor(210);doc.setLineWidth(.3);doc.rect(x0,y,cw,ch);doc.addImage(u,/png/i.test(b.type||"")?"PNG":"JPEG",x0+(cw-w)/2,y+(ch-h)/2,w,h);col++;if(col===2){col=0;y+=ch+4}}catch(e){}}if(col)y+=ch+4;y+=2}}
  if(x.details){y+=2;text("Details",11,"bold",1);text(x.details,10,"normal",3)}
  y+=2;text("Statement",11,"bold",1);text(x.statement||K[2],10,"italic",4);
  if(x.status==="open"){if(y>205){doc.addPage();y=18}text("FOR SIGNATURE",13,"bold",2,BRGB());const L=(lab,h)=>{doc.setFontSize(10);doc.setTextColor(60,55,55);doc.text(lab,M,y+5);doc.setDrawColor(150);doc.setLineWidth(.3);if(h)doc.rect(M+48,y,90,h);else doc.line(M+48,y+6,M+138,y+6);y+=(h||8)+4};
    doc.setDrawColor(120);doc.rect(M,y+1,4.5,4.5);doc.setFontSize(10);doc.setTextColor(40,36,35);doc.text(clean("I agree to the statement above"),M+8,y+5);y+=11;L("Name");L("Signature",26);L("Date");L("Comments")}
  else{text(x.status==="signed"?"APPROVED":"CHANGES REQUESTED",13,"bold",2,x.status==="signed"?[29,138,74]:[179,38,30]);
  kv("Name",x.signedName);kv("Date and time",stamp(x.signedAt));kv("Comments",x.comment);
  if(x.sig){try{doc.addImage(x.sig,"PNG",M+48,y,70,26);doc.setDrawColor(180);doc.line(M+48,y+27,M+118,y+27);y+=32}catch(e){}}}
  doc.setFontSize(8);doc.setTextColor(130,120,120);doc.splitTextToSize(clean(x.status==="open"?"Please tick, sign, date and return a copy to "+coData().name+" – or sign it in the client portal.":x.onDevice?"Signed in person on "+coData().name+"'s device"+(x.witnessedBy?" with "+x.witnessedBy:"")+".":"Signed electronically in the "+coData().name+" client portal. Device: "+(x.device||"").slice(0,160)),W-2*M).slice(0,3).forEach((l,i,arr)=>doc.text(l,M,290-(arr.length-1-i)*3.4));
  if(asBlob)return doc.output("blob");
  try{await S.dl.save({filename:`Sign-off - ${clean(c.name).replace(/[^\w\s&-]/g,"").trim()} - ${clean(x.title).replace(/[^\w\s-]/g,"").trim().slice(0,50)}.pdf`,data:doc.output("blob")})}catch(e){if(!(e&&e.code==="declined"))toast("Download didn't go through")}
  if(btn)btn.disabled=false;
}

/* ---------- owner: Client portal tab + preview as client ---------- */
function portalTab(){
  const clsAll=clList();const today=iso(new Date());const stored=clsAll.filter(c=>["done","lost"].includes(c.stage));const cls=clsAll.filter(c=>!["done","lost"].includes(c.stage));
  const st=c=>{const p=ptOf(c);return p?"on":c.portalCode?"wait":"off"};
  const on=cls.filter(c=>st(c)==="on"),wait=cls.filter(c=>st(c)==="wait"),off=cls.filter(c=>st(c)==="off");
  const row=c=>{const p=ptOf(c),s=st(c);return `<div class="ptrow"><div><b>${esc(c.name)}</b> <span class="tag ${s==="on"?"ok":s==="wait"?"day":""}">${s==="on"?"Connected":s==="wait"?"Invite sent":"Not set up"}</span><br><span class="who">${c.phone?"📞 "+esc(c.phone)+" · ":""}${c.site?"🏗️ "+esc(c.site)+" · ":""}${esc([c.work,c.address&&c.address.split("\n")[0],c.postcode].filter(Boolean).join(" · "))}${p&&p.lastWhat?` · ${esc(p.name)} ${esc(p.lastWhat)} ${esc(stamp(p.lastAct))}`:""}</span></div>
    <div class="actions"><button type="button" class="btn primary pt-mg" data-c="${esc(c.id)}">Open portal</button><button type="button" class="btn pt-pv" data-c="${esc(c.id)}">👁 See what they see</button></div></div>`};
  $("main").innerHTML=`<div class="notice"><b>Your clients' own page.</b> Share documents with them, ask them to sign off drawings, designs, stages, variations and handover, and let them message the trades you choose. Tap <b>👁 See what they see</b> to look at it exactly as the client does.</div>
    ${cls.length?"":stored.length?`<div class="empty"><strong>No current jobs</strong>Completed and rejected jobs are in Storage below.</div>`:`<div class="empty"><strong>No clients yet</strong>Add one in the Clients tab first.</div>`}
    ${on.length?`<div class="flabel">Connected (${on.length})</div>${on.map(row).join("")}`:""}
    ${wait.length?`<div class="flabel">Invite sent, waiting for them to join (${wait.length})</div>${wait.map(row).join("")}`:""}
    ${off.length?`<div class="flabel">Not set up yet (${off.length})</div>${off.map(row).join("")}`:""}
    ${stored.length?`<details class="card arcbox" ${S.f.ptArc?"open":""} id="pt-arc"><summary><b>🗄 Storage (${stored.length})</b> <span class="who">completed and rejected jobs</span></summary><div class="arclist">${stored.map(c=>`<div class="arcrow"><span><b>${esc(c.name)}</b><br><span class="who">${esc(clStage(c.stage))}${c.site?" · "+esc(c.site):""}${ptOf(c)?" · portal still open for them":""}</span></span><span class="arcbtns"><button type="button" class="pillbtn pt-mg" data-c="${esc(c.id)}">Open portal</button></span></div>`).join("")}</div></details>`:""}
    <details class="pthow"><summary><b>How a client joins</b></summary><ol><li>Tap <b>Set up</b> on the client. They get a 6-letter code.</li><li>In Claude, open this app's <b>Share</b> menu and add their email with <b>can use</b> access. They need a free Claude account.</li><li>Send them the invite message (Text, WhatsApp or Email). They open the link, tap <b>I'm a JEB client</b> and type the code.</li><li>They're connected automatically and you get a pop-up.</li></ol></details>`;
  const C=id=>clsAll.find(x=>x.id===id);if($("pt-arc"))$("pt-arc").addEventListener("toggle",e=>{S.f.ptArc=e.target.open});
  $("main").querySelectorAll(".pt-mg").forEach(b=>b.onclick=()=>ptManager(C(b.dataset.c)));
  $("main").querySelectorAll(".pt-inv").forEach(b=>b.onclick=()=>ptInvite(C(b.dataset.c)));
  $("main").querySelectorAll(".pt-su").forEach(b=>b.onclick=async()=>{const c=C(b.dataset.c);try{const rec=await saveClient(Object.assign({},c,{portalCode:newCode()}));render();ptInvite(rec)}catch(e){toast("Couldn't save")}});
  $("main").querySelectorAll(".pt-pv").forEach(b=>b.onclick=()=>ptPreview(C(b.dataset.c)));
}
function ptPreview(c){
  const p=ptOf(c);closeViewer();
  const fake={name:p?p.name:c.name,linked:true,site:c.site||p&&p.site||clAddr(c),project:p&&p.project||c.work||"",_preview:true,_cid:c.id};
  {const st=clientSites(c)[0];const m=st&&sjMaster(st);if(m&&sjClientOK(m)){const pl=sjPayload(m,"__client");if(pl.any)fake.siteJob={site:m.site,address:pl.address,job:pl.job,photo:pl.photo,photos:pl.photos}}if(st)fake.site=st}
  PT.pv={tab:S.otab};PT.tab="home";PT.folder="";
  if(p){ptMgrSubscribe(c);PT.mgr=Object.assign({},c,{uid:p.id})}
  S.client=fake;PT.docs=p?(PT.mgrDocs||[]):(c.ptDocs||[]).slice();PT.signs=p?(PT.mgrSigns||[]):(c.ptSigns||[]).slice();window.scrollTo(0,0);render();
}
function ptExitPreview(){S.client=null;PT.docs=[];PT.signs=[];const t=PT.pv&&PT.pv.tab;PT.pv=null;if(t){S.otab=t}render()}

