/* ================= CLIENT STAGES <-> PLANNER ================= */
import { clStage, saveClient } from "./clients.js";
import { VISIT_REMIND_MIN, viewClient } from "./quick-enquiry.js";
import { $, addDays, dayLabel, esc, gbp, iso, parse, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer } from "../core/viewer.js";
import { newId } from "../files/outbox.js";
import { openPlanEditor } from "../planner/board.js";
import { toHM } from "../planner/diary.js";
import { siteFromClient, sjMaster } from "../sites/job-details.js";
export { clAddPlan, clAddr, clNextPlan, clPlanListHtml, clPlans, clStepsHtml, wireClSteps };
const CL_FLOW=["enquiry","visit","quote","won","onsite","done","lost"];
function clPlans(c){return (S.plan||[]).concat(S.planPrivate||[]).filter(p=>p.clientId===c.id).sort((a,b)=>(a.from+(a.time||"")).localeCompare(b.from+(b.time||"")))}
function clNextPlan(c){const t=iso(new Date());return clPlans(c).find(p=>(p.to||p.from)>=t)}
function clStepsHtml(c){return `<div class="flabel" style="margin-top:12px">Move this client to…</div><div class="clsteps">${CL_FLOW.map(k=>`<button type="button" class="clstep st-${k}" data-s="${k}" aria-pressed="${c.stage===k}">${esc(clStage(k))}</button>`).join("")}</div>`}
function clPlanListHtml(c){const ps=clPlans(c);const t=iso(new Date());
  return `<div class="flabel" style="margin-top:12px;display:flex;justify-content:space-between;align-items:center">In the planner <button type="button" class="pillbtn" id="cpl-add">+ Add to planner</button></div>
  ${ps.length?ps.map(p=>`<button type="button" class="chrow cpl ${(p.to||p.from)<t?"pastp":""}" data-p="${esc(p.id)}"><span class="chic">📅</span><span><b>${esc(p.title)}</b><br><span class="who">${esc(dayLabel(parse(p.from)))}${p.time?" · "+esc(p.time)+(p.endTime?"–"+esc(p.endTime):""):""}${(p.to||p.from)<t?" · done":""}</span></span><span aria-hidden="true">›</span></button>`).join(""):'<div class="nothing">Nothing in the planner for this client yet.</div>'}`}
function wireClSteps(c){
  $("viewer-body").querySelectorAll(".clstep").forEach(b=>b.onclick=()=>clMove(c,b.dataset.s));
  $("viewer-body").querySelectorAll(".cpl").forEach(b=>b.onclick=()=>{const p=clPlans(c).find(x=>x.id===b.dataset.p);if(p){closeViewer();openPlanEditor(p)}});
  $("cpl-add").onclick=()=>{closeViewer();openPlanEditor(null,iso(addDays(new Date(),1)),clPlanSeed(c,{title:c.name+": ",type:"meeting"}))};
}
function clAddr(c){return [c.address&&c.address.split("\n").join(", "),c.postcode].filter(Boolean).join(", ")}
function clPlanSeed(c,o){return Object.assign({site:c.site||"",contact:c.name,phone:c.phone||"",notes:[clAddr(c),c.work,c.desc].filter(Boolean).join("\n").slice(0,1500),vis:"me",clientId:c.id},o)}
async function clAddPlan(c,o,everyone){const id=newId();const coll=everyone?"plan":"planprivate";
  const d=Object.assign({title:"",type:"meeting",from:iso(new Date()),to:"",time:"",endTime:"",site:c.site||"",people:[],notes:[clAddr(c),c.work].filter(Boolean).join("\n"),contact:c.name,phone:c.phone||"",files:[],clientId:c.id,jobId:"",jobTitle:"",created:Date.now(),updated:Date.now()},o);
  if(!d.to)d.to=d.from;if(everyone)d.vis="all";await S.db.doc(coll+"/"+id).set(d);return id}
function clMove(c,stage){
  const L=clStage(stage),tm=iso(addDays(new Date(),1));
  const chk=(id,label,on)=>`<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" id="${id}" ${on?"checked":""}> ${label}</label>`;
  let body="";
  if(stage==="enquiry")body=`<div class="who">Book when you'll go and see the job.</div><div class="grid2"><label for="cm-d">Visit date<input id="cm-d" type="date" value="${tm}"></label><label for="cm-t">Time<input id="cm-t" type="time" value="10:00"></label></div>${chk("cm-plan","Put the visit in my planner",true)}`;
  else if(stage==="visit")body=`<div class="who">You've seen it. When do you want to have it costed by?</div><label for="cm-d">Cost it by<input id="cm-d" type="date" value="${iso(addDays(new Date(),3))}"></label>${chk("cm-plan","Add a reminder to my planner",true)}`;
  else if(stage==="quote")body=`<div class="grid2"><label for="cm-amt">Estimate £<input id="cm-amt" inputmode="decimal" value="${esc(c.quote||"")}"></label><label for="cm-d">Chase it up on<input id="cm-d" type="date" value="${iso(addDays(new Date(),7))}"></label></div>${chk("cm-plan","Add a chase-up reminder to my planner",true)}`;
  else if(stage==="won")body=`<div class="grid2"><label for="cm-d">Start date (if known)<input id="cm-d" type="date"></label><label for="cm-d2">Finish date<input id="cm-d2" type="date"></label></div>${chk("cm-plan","Put the job in the planner",true)}${chk("cm-all","Show it to everyone in the planner (not just me)",false)}${chk("cm-site",c.site?"Update the site's job details from this client (address, pin, photos, work and contact)":"Make it a site with all the client's details, photos and pin. You then choose who sees each part.",true)}`;
  else if(stage==="onsite")body=`<div class="who">Work has started.</div>${c.site&&sjMaster(c.site)?"":chk("cm-site",c.site?"Fill in the site's job details from this client":"Make it a site with all the client's details, photos and pin",true)}`;
  else if(stage==="done")body=`<div class="who">The job's finished. It moves to Completed and stays in their history.</div>${chk("cm-clear","Remove any upcoming reminders for this client from my planner",true)}`;
  else if(stage==="lost")body=`<label for="cm-why">Why? (optional)<input id="cm-why" maxlength="200" placeholder="e.g. Went with a cheaper quote"></label>${chk("cm-clear","Remove any upcoming reminders for this client from my planner",true)}`;
  openSheet(`<h3 id="sheettitle">${esc(c.name)} → ${esc(L)}</h3>${body}<label for="cm-note">Note (optional)<input id="cm-note" maxlength="300"></label>${formFoot(false,"Move to "+L)}`,async()=>{
    const v=id=>$(id)?$(id).value:"",on=id=>$(id)&&$(id).checked;const d=v("cm-d");const upd={stage};const notes=(c.notes||[]).slice();let planned="";
    $("f-save").disabled=true;
    try{
      if(stage==="enquiry"&&on("cm-plan")&&d){const t=v("cm-t");const [h,m]=(t||"10:00").split(":").map(Number);const end=toHM(Math.min(23*60+59,h*60+m+60));await clAddPlan(c,{title:"Visit: "+c.name+(c.work?" ("+c.work+")":""),type:"meeting",from:d,time:t,endTime:end,remind:VISIT_REMIND_MIN});upd.follow=d;upd.visit={date:d,time:t,end};planned="Visit booked "+shortDay(d)+(t?" "+t:"")}
      if(stage==="visit"&&d){upd.follow=d;if(on("cm-plan")){await clAddPlan(c,{title:"Cost job: "+c.name,type:"keydate",from:d});planned="Cost by "+shortDay(d)}}
      if(stage==="quote"){const a=v("cm-amt").replace(/[£,\s]/g,"");if(a)upd.quote=a;upd.estimateSent=iso(new Date());if(d){upd.follow=d;if(on("cm-plan")){await clAddPlan(c,{title:"Chase estimate: "+c.name+(a?" ("+gbp(+a)+")":""),type:"keydate",from:d});planned="Chase up "+shortDay(d)}}}
      if(stage==="won"){upd.follow="";const d2=v("cm-d2");if(on("cm-site")){const name=await siteFromClient(c,d,d2);if(name&&!c.site)upd.site=name}
        if(d&&on("cm-plan")){await clAddPlan(Object.assign({},c,upd),{title:(c.work||"Job")+": "+c.name,type:"work",from:d,to:d2&&d2>=d?d2:d},on("cm-all"));planned="Starts "+shortDay(d)}}
      if(stage==="onsite"&&on("cm-site")){const name=await siteFromClient(c,"","");if(name&&!c.site)upd.site=name}
      if((stage==="done"||stage==="lost")){upd.follow="";if(on("cm-clear")){const t=iso(new Date());for(const p of clPlans(c).filter(p=>p.from>t)){try{await S.db.doc((p.vis&&p.vis!=="me"?"plan":"planprivate")+"/"+p.id).delete()}catch(e){}}}}
      const extra=[planned,stage==="lost"&&v("cm-why")?"Reason: "+v("cm-why"):"",v("cm-note")].filter(Boolean).join(" · ");
      notes.push({text:"Stage: "+L+(extra?" · "+extra:""),at:Date.now(),auto:true});upd.notes=notes;
      const rec=await saveClient(Object.assign({},c,upd));closeForm();toast("Moved to "+L+(planned?" · in your planner":""));render();viewClient(rec);setTimeout(()=>{if(!$("viewer").hidden&&$("viewer-body").querySelector(".clsteps"))viewClient((S.clients||[]).find(x=>x.id===rec.id)||rec)},700)}
    catch(e){showErr("Couldn't save. Check your connection.");$("f-save").disabled=false}},stage==="lost"?"cm-why":"cm-d");
}

