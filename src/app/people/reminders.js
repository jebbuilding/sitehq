/* ================= REMINDERS (owner asks someone to fill in a form) ================= */
import { $, addDays, esc, iso, monday, shortDay, stamp, store, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { SENDTO } from "../files/send-to.js";
import { allTeam, nameOf, teamIds } from "../owner/owner.js";
import { openDetails } from "./personal-details.js";
import { PDOC_TYPES, openPdoc } from "./personal-documents.js";
import { openPhoto, photoViewer } from "../photos/photos.js";
import { planEntries } from "../planner/time-off.js";
import { openPlanDetail } from "../planner/views.js";
import { openInvoice } from "../purchasing/invoices.js";
import { openMatEditor, openReceipt } from "../purchasing/materials-receipts.js";
import { KINDS, ck } from "../safety/checklists.js";
import { openCheck } from "../safety/checks.js";
import { openRaForm } from "../safety/rams.js";
import { openInduction } from "../safety/site-inductions.js";
import { openCert, openTalk } from "../safety/training.js";
import { openSign } from "../sites/plans-specs.js";
import { same } from "../sites/project-pages.js";
import { openEntry } from "../timesheets/time.js";
export { DOW, PROMPT_FORMS, autoClearPrompts, installCard, markPrompt, maybePopPrompts, myOpenPrompts, mySchedDue, openPromptSender, promptBanner, promptForJob, promptsOf, remindersPanel, schedBanner, schedStatus, wireInstall, wirePromptBanner, wireReminders, wireSched };
const PROMPT_FORMS={
  timesheet:["Fill in your timesheet","time",()=>openEntry("hours")],
  jobtime:["Log your day work / job time","time",()=>openEntry("job")],
  "check-vehicle":["Do a Vehicle check","checks",()=>openCheck("vehicle",null)],
  "check-digger":["Do a Digger check","checks",()=>openCheck("digger",null)],
  "check-machine":["Do a Machinery check","checks",()=>openCheck("machine",null)],
  "check-scaffold":["Do a Scaffold inspection","checks",()=>openCheck("scaffold",null)],
  "check-excavation":["Do an Excavation inspection","checks",()=>openCheck("excavation",null)],
  "check-ladder":["Do a Ladder inspection","checks",()=>openCheck("ladder",null)],
  "check-ra":["Fill in a risk assessment","checks",()=>openRaForm(null)],
  plan:["Look at the planner","planner",ref=>{const p=planEntries().find(x=>x.id===ref);if(p)openPlanDetail(p);else toast("That entry has been removed")}],
  "check-trailer":["Do a Trailer check","checks",()=>openCheck("trailer",null)],
  photos:["Take and send photos","photos",()=>openPhoto()],
  receipt:["Add your receipts","receipts",()=>openReceipt()],
  materials:["Send the materials and tools you need","materials",()=>openMatEditor(null)],
  sitedocs:["Read the site's plans and documents","plans",ref=>{S.f.folder=ref||"";S.f.path="";render()}],
  invoice:["Send your invoice","invoices",()=>openInvoice()],
  details:["Check and update your details","details",()=>openDetails()],
  induction:["Do the site induction","plans",ref=>{const i=S.inductions.find(x=>x.id===ref);if(i)openInduction(i);else toast("That induction has been removed")}],
  talk:["Read and sign a toolbox talk","training",ref=>openTalk(ref)],
  rams:["Read and sign RAMS","plans",ref=>{const d=S.docs.find(x=>x.id===ref);if(d)openSign(d);else toast("That document has been removed")}],
  cert:["Add your cards and certificates","training",()=>openCert()],
  persdoc:["Upload a personal document","details",ref=>openPdoc(ref||"licence")],
  policy:["Read a company policy","policies",ref=>{const d=(S.policies||[]).find(x=>x.id===ref);if(d)openFile(d.assetId,d.fileName||d.title,d.contentType);else toast("That document has been removed")}],
  markup:["Look at James's notes on your photo","photos",ref=>{const p=S.mine.photos.find(x=>x.id===ref);if(p)photoViewer(p,false);else toast("That photo has been removed")}],
  sketchnew:["Look at James's drawing","photos",ref=>{const p=S.mine.photos.find(x=>x.id===ref);if(p)photoViewer(p,false);else toast("That drawing has been removed")}],
  sketchchk:["Look at James's reply on your drawing","photos",ref=>{const p=S.mine.photos.find(x=>x.id===ref);if(p)photoViewer(p,false);else toast("That drawing has been removed")}],
  issuereply:["James replied about the app problem you reported",null,null],
  sent:["James sent you","plans",ref=>SENDTO.openRef(ref)],
  other:["Something else (see note)",null,null]
};
const promptsOf=list=>(list||[]).filter(s=>s.type==="prompt");
const myOpenPrompts=()=>promptsOf(S.mine.signoffs).filter(p=>p.status==="open").sort((a,b)=>a.created-b.created);
function promptLabel(p){const f=PROMPT_FORMS[p.form]||PROMPT_FORMS.other;return f[0]+(p.refLabel?": "+p.refLabel:"")}
function doPrompt(p){
  const f=PROMPT_FORMS[p.form]; if(!f||!f[2]){toast("Read James's note, then tap Done when it's sorted");return}
  if(f[1]){S.tab=f[1];store.set("jeb.tab",S.tab)} if(f[1]==="checks")S.f.rcat=p.form.replace("check-",""); closeForm(); render(); setTimeout(()=>f[2](p.ref),50);
}
async function markPrompt(p,status){try{await S.db.doc("sheets/"+(p.who||S.me)+"/signoffs/"+p.id).update({status,doneAt:Date.now()})}catch(e){if(status!=="done")toast("Couldn't save")}}
function autoClearPrompts(form,ref){
  if(ownerMode()&&!S.preview) return;
  myOpenPrompts().filter(p=>p.form===form&&(!p.ref||!ref||p.ref===ref)).forEach(p=>markPrompt(p,"done"));
}
function promptForJob(j){
  const d=j.data||{};
  if(j.coll==="entries") return [d.type==="hours"?"timesheet":"jobtime"];
  if(j.coll==="checks") return ["check-"+(d.kind||"vehicle")];
  if(j.coll==="photos") return ["photos"];
  if(j.coll==="invoices") return [d.kind==="receipt"?"receipt":d.kind==="materials"?"materials":"invoice"];
  if(j.coll==="signoffs"){if(d.type==="induction")return ["induction",d.inductionId];if(d.type==="talk")return ["talk",d.talkId];if(d.type==="cert")return ["cert"];if(d.type==="polread")return ["policy",d.docId];if(d.type==="persdoc")return ["persdoc",d.kind];if(d.docId)return ["rams",d.docId]}
  return [""];
}
const DOW=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
function schedStatus(eq,checks){
  // checks: list of checks for that person (or anyone, for the owner view)
  const today=new Date(), ti=iso(today);
  const mine=(checks||[]).map(ck).filter(c=>c.kind===eq.kind&&same(c.asset,eq.name));
  const last=mine.map(c=>c.date).sort().pop()||"";
  if(eq.freq==="daily"){const wd=today.getDay();if(wd===0||wd===6)return {state:"none",last};return {state:last===ti?"done":"due",last,label:"today"}}
  if(eq.freq==="weekly"){const ws=iso(monday(today));const dueDay=+(eq.dueDay??1);const dueDate=addDays(monday(today),(dueDay+6)%7);
    if(last>=ws) return {state:"done",last,label:"this week"};
    const di=iso(dueDate); return {state:ti<di?"upcoming":ti===di?"due":"overdue",last,label:DOW[dueDay]+" "+shortDay(di),dueDate:di}}
  return {state:"none",last};
}
function mySchedDue(){
  if(ownerMode()&&!S.preview) return [];
  return S.equipment.filter(eq=>eq.assignee===S.me&&eq.freq&&eq.freq!=="none").map(eq=>Object.assign({eq},schedStatus(eq,S.mine.checks))).filter(x=>x.state==="due"||x.state==="overdue");
}
function schedBanner(){
  const due=mySchedDue(); if(!due.length) return "";
  return `<div class="notice warn prompts sched"><b>Scheduled checks:</b>${due.map(x=>`<div class="prow" data-eq="${esc(x.eq.id)}"><span><b>${esc(KINDS[x.eq.kind].name)} check: ${esc(x.eq.name)}</b><br><span class="sub">${x.eq.freq==="weekly"?"Weekly check, due "+esc(x.label):"Daily check, due today"}${x.state==="overdue"?' <b style="color:var(--danger)">· overdue</b>':""}</span>${x.last?`<br><span class="who">Last done ${esc(shortDay(x.last))}</span>`:""}</span>
    <span class="pbtns"><button type="button" class="btn primary sc-go" style="padding:7px 12px">Do it now</button></span></div>`).join("")}</div>`;
}
function wireSched(root){(root||document).querySelectorAll(".sched .prow").forEach(r=>{const eq=S.equipment.find(x=>x.id===r.dataset.eq);if(!eq)return;
  r.querySelector(".sc-go").onclick=()=>{closeForm();S.tab="checks";S.f.rcat=eq.kind;store.set("jeb.tab","checks");render();setTimeout(()=>openCheck(eq.kind,null,eq.name),50)}})}
function installCard(){
  if(store.get("jeb.installed",false)) return "";
  const standalone=(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||navigator.standalone;
  if(standalone) return "";
  const ua=navigator.userAgent||""; const ios=/iPhone|iPad|iPod/.test(ua); const sam=/SamsungBrowser/.test(ua); const android=/Android/.test(ua);
  const inApp=/FBAN|FBAV|Instagram|WhatsApp|Line\/|GSA\//.test(ua);
  const steps=ios?["Open this page in <b>Safari</b> (if you came from an email or WhatsApp, tap ⋯ or the compass and choose <b>Open in Safari</b>).","Tap the <b>Share</b> button (square with an arrow).","Tap <b>Add to Home Screen</b>, call it <b>JEB</b>, then <b>Add</b>.","Open JEB from the new icon and sign in once more. It stays signed in after that."]
    :sam?["Tap <b>≡</b> at the bottom right.","Tap <b>Add page to</b>, then <b>Home screen</b>.","Use the <b>JEB</b> icon from now on."]
    :android?["Tap <b>⋮</b> at the top right of Chrome.","Tap <b>Add to home screen</b>, then <b>Add</b>.","Use the <b>JEB</b> icon from now on."]
    :["Bookmark this page, or drag it to your desktop, so you can open it straight away next time."];
  return `<div class="notice install"><b>Save JEB to your ${ios||android?"phone's home screen":"computer"}</b> so you can open it with one tap, without going back to the invite.
    ${inApp?'<div class="sub" style="color:var(--danger)">You\'re viewing this inside another app. Open it in your normal browser first.</div>':""}
    <ol>${steps.map(x=>`<li>${x}</li>`).join("")}</ol>
    <div class="actions"><button type="button" class="btn primary" id="inst-done">Done, I've saved it</button><button type="button" class="pillbtn" id="inst-later">Remind me later</button></div></div>`;
}
function wireInstall(){const d=$("inst-done");if(d)d.onclick=()=>{store.set("jeb.installed",true);toast("Great. Use the JEB icon from now on.");render()};const l=$("inst-later");if(l)l.onclick=()=>{S.instLater=true;render()}}
function promptBanner(){
  const ps=myOpenPrompts(); if(!ps.length) return "";
  return `<div class="notice warn prompts"><b>James has asked you to:</b>${ps.map(p=>`<div class="prow" data-p="${esc(p.id)}"><span><b>${esc(promptLabel(p))}</b>${p.note?`<br><span class="sub">${esc(p.note)}</span>`:""}<br><span class="who">Asked ${stamp(p.created)}</span></span>
    <span class="pbtns">${PROMPT_FORMS[p.form]&&PROMPT_FORMS[p.form][2]?`<button type="button" class="btn primary pr-go" style="padding:7px 12px">Do it now</button>`:""}<button type="button" class="pillbtn pr-done">Done</button></span></div>`).join("")}</div>`;
}
function wirePromptBanner(){
  document.querySelectorAll(".prompts .prow").forEach(r=>{const p=myOpenPrompts().find(x=>x.id===r.dataset.p);if(!p)return;
    const g=r.querySelector(".pr-go");if(g)g.onclick=()=>doPrompt(p);
    r.querySelector(".pr-done").onclick=async()=>{await markPrompt(p,"done");toast("Marked as done")}});
}
function maybePopPrompts(){
  if(ownerMode()||!$("sheet").hidden||!$("viewer").hidden) return;
  const fresh=myOpenPrompts().filter(p=>!S.promptsShown.has(p.id));
  const sd=mySchedDue().filter(x=>!S.promptsShown.has("eq-"+x.eq.id+"-"+iso(new Date())));
  if(!fresh.length&&!sd.length) return;
  fresh.forEach(p=>S.promptsShown.add(p.id)); sd.forEach(x=>S.promptsShown.add("eq-"+x.eq.id+"-"+iso(new Date())));
  openSheet(`<h3 id="sheettitle">${fresh.length?"James has asked you to…":"Check due"}</h3>${fresh.length?promptBanner().replace('notice warn prompts','prompts').replace('<b>James has asked you to:</b>',''):""}${sd.length?schedBanner().replace('notice warn prompts sched','prompts sched'):""}
    <div class="formactions"><span></span><button type="button" class="btn" id="f-cancel">Later</button></div>`,()=>{},null);
  wireSched($("form"));
  $("form").querySelectorAll(".prow").forEach(r=>{const p=myOpenPrompts().find(x=>x.id===r.dataset.p);if(!p)return;
    const g=r.querySelector(".pr-go");if(g)g.onclick=()=>doPrompt(p);
    r.querySelector(".pr-done").onclick=async()=>{await markPrompt(p,"done");r.remove();if(!$("form").querySelector(".prow"))closeForm()}});
}
function openPromptSender(ids,preset){
  preset=preset||{}; const team=teamIds();
  const refOpts=f=>f==="sitedocs"?[...new Set(S.docs.map(d=>d.site||"General"))].sort().map(x=>[x,x]):f==="persdoc"?Object.entries(PDOC_TYPES):f==="policy"?(S.policies||[]).map(d=>[d.id,d.title]):f==="induction"?S.inductions.map(i=>[i.id,i.site]):f==="talk"?S.talks.map(t=>[t.id,t.title]):f==="rams"?S.docs.filter(d=>d.cat==="rams").map(d=>[d.id,(d.site||"General")+" – "+(d.title||d.fileName)]):null;
  openSheet(`<h3 id="sheettitle">Send a reminder</h3>
    <div><div class="flabel">Who to</div><div class="seg" id="pr-who">${team.map(id=>`<button type="button" data-v="${esc(id)}" aria-pressed="${(ids||[]).includes(id)}">${esc(nameOf(id))}</button>`).join("")||'<span class="nothing">No employees yet.</span>'}</div></div>
    <label for="pr-form">What do they need to do?<select id="pr-form">${Object.entries(PROMPT_FORMS).filter(([k])=>k!=="markup"&&k!=="plan"&&k!=="sketchchk"&&k!=="sketchnew"&&k!=="issuereply").map(([k,[l]])=>`<option value="${k}" ${preset.form===k?"selected":""}>${esc(l)}</option>`).join("")}</select></label>
    <label for="pr-ref" id="pr-refl" hidden>Which one<select id="pr-ref"></select></label>
    <label for="pr-note">Note (optional)<textarea id="pr-note" maxlength="400" placeholder="e.g. Tuesday's finish time looks wrong, please correct it.">${esc(preset.note||"")}</textarea></label>
    <div class="who">It pops up the next time they open the app, and clears itself once they've done it.</div>
    ${formFoot(false,"Send reminder")}`,async()=>{
      const who=[...$("pr-who").querySelectorAll('[aria-pressed="true"]')].map(b=>b.dataset.v);
      if(!who.length){showErr("Choose at least one person.");return}
      const form=$("pr-form").value, refSel=$("pr-ref"), ref=$("pr-refl").hidden?"":refSel.value, refLabel=ref?refSel.options[refSel.selectedIndex].text:"";
      if(!$("pr-refl").hidden&&!ref){showErr("Choose which one.");return}
      const note=$("pr-note").value.trim(); if(form==="other"&&!note){showErr("Add a note saying what they need to do.");return}
      $("f-save").disabled=true;
      try{for(const w of who) await S.db.doc("sheets/"+w+"/signoffs/pr-"+newId()).set({type:"prompt",form,ref,refLabel,note,status:"open",created:Date.now()});
        closeForm();toast("Reminder sent to "+who.map(nameOf).join(", "));render()}
      catch(e){showErr("Couldn't send. Check your connection.");$("f-save").disabled=false}
    },null);
  $("pr-who").querySelectorAll("button").forEach(b=>b.onclick=()=>b.setAttribute("aria-pressed",String(b.getAttribute("aria-pressed")!=="true")));
  const sync=()=>{const o=refOpts($("pr-form").value);$("pr-refl").hidden=!o;if(o)$("pr-ref").innerHTML=(o.length?'<option value="">Choose…</option>':'<option value="">None set up yet</option>')+o.map(([v,l])=>`<option value="${esc(v)}" ${preset.ref===v?"selected":""}>${esc(l)}</option>`).join("")};
  $("pr-form").onchange=sync; sync();
}
function remindersPanel(){
  const all=allTeam("signoffs").filter(s=>s.type==="prompt").sort((a,b)=>b.created-a.created);
  const open=all.filter(p=>p.status==="open");
  return `<details class="card" data-id="__rem" ${S.open.has("__rem")||open.length?"open":""}><summary><div class="nm">Reminders<small>${open.length} waiting · ${all.length-open.length} done</small></div></summary><div class="cardbody">
    ${all.slice(0,40).map(p=>`<div class="citem"><span><b>${esc(nameOf(p.who))}</b> · ${esc(promptLabel(p))}${p.note?`<br><span class="who">${esc(p.note)}</span>`:""}<br><span class="who">Sent ${stamp(p.created)}${p.status==="done"?" · done "+stamp(p.doneAt):p.status==="cancelled"?" · cancelled":""}</span></span>
      ${p.status==="open"?`<span style="display:flex;gap:6px;flex:none"><span class="tag day">Waiting</span><button type="button" class="linkdanger pr-cancel" data-w="${esc(p.who)}" data-p="${esc(p.id)}">Cancel</button></span>`:p.status==="done"?'<span class="tag ok">Done</span>':""}</div>`).join("")||'<div class="nothing">No reminders sent yet.</div>'}</div></details>`;
}
function wireReminders(){
  $("main").querySelectorAll(".pr-cancel").forEach(b=>b.onclick=async()=>{try{await S.db.doc("sheets/"+b.dataset.w+"/signoffs/"+b.dataset.p).update({status:"cancelled",doneAt:Date.now()});toast("Reminder cancelled")}catch(e){toast("Couldn't cancel")}});
  $("main").querySelectorAll(".pr-send").forEach(b=>b.onclick=()=>openPromptSender(b.dataset.w?[b.dataset.w]:[]));
}

