/* ================= PLANNER & TIME OFF ================= */
import { addDays, esc, iso, parse } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { planPeopleNames, planSeen, planTimeTxt } from "./views.js";
import { myJobs } from "../sites/job-sheets.js";
export { LEAVE_TYPES, PTYPES, VIS, entryChip, leaveOf, onDay, planEntries, workDays };
const PTYPES={keydate:"Key date",work:"Work",meeting:"Meeting",delivery:"Delivery",inspection:"Inspection",holiday:"Time off",other:"Other"};
const LEAVE_TYPES={holiday:"Holiday",unpaid:"Unpaid leave",appointment:"Appointment",sick:"Sick",other:"Other"};
const VIS={all:"Everyone",people:"Only the people on it",me:"Only me"};
function leaveOf(list){return (list||[]).filter(s=>s.type==="leave")}
function workDays(from,to,half){if(!from||!to)return 0;let n=0;for(let d=parse(from);iso(d)<=to;d=addDays(d,1)){const w=d.getDay();if(w&&w!==6)n++}return half&&from===to?0.5:n}
function planEntries(){
  const owner=ownerMode();
  let list=S.plan.concat(owner?S.planPrivate.map(p=>Object.assign({},p,{vis:"me"})):[]);
  if(!owner) list=list.filter(p=>p.vis==="all"||(Array.isArray(p.people)&&p.people.includes(S.me)));
  const jobs=(owner?S.jobs:myJobs()).filter(j=>j.due&&j.status!=="closed").map(j=>({id:"job-"+j.id,from:j.due,to:j.due,type:"other",title:"Due: "+j.title,site:j.site,people:j.assignees,auto:"job",jobId:j.id}));
  const mine=owner?[]:leaveOf(S.mine.signoffs).filter(l=>l.status==="pending").map(l=>({id:"req-"+l.id,from:l.from,to:l.to,type:"holiday",title:"Time off requested",pending:true}));
  return list.concat(jobs,mine);
}
function onDay(p,d){return p.from<=d&&(p.to||p.from)>=d}
function entryChip(p,owner){
  const names=planPeopleNames(p,owner);
  const multi=p.to&&p.to!==p.from?`${parse(p.from).toLocaleDateString("en-GB",{day:"numeric",month:"short"})} – ${parse(p.to).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}`:"";
  return `<button type="button" class="pentry t-${esc(p.type)}" data-p="${esc(p.id)}"><span class="pbar"></span><span class="pmain">
    <span class="ptop"><span class="ptype">${esc(PTYPES[p.type]||"")}</span>${planTimeTxt(p)?`<span class="ptime">${esc(planTimeTxt(p))}</span>`:""}${multi?`<span class="ptime">${esc(multi)}</span>`:""}</span>
    <b class="ptitle">${esc(p.title)}</b>
    <span class="sub">${[p.site,p.jobTitle,names.join(", ")].filter(Boolean).map(esc).join(" · ")}${p.pending?" · waiting for James":""}${owner&&p.vis==="me"?" · only you":owner&&p.vis==="people"?" · only the people on it":""}</span>
    ${p.notes?`<span class="pnote">${esc(p.notes.length>140?p.notes.slice(0,140)+"…":p.notes)}</span>`:""}${(p.files||[]).length?`<span class="who">📎 ${p.files.length} attached</span>`:""}${owner?(()=>{const sn=planSeen(p.id);if(!sn.length)return "";const d=sn.filter(x=>x.status==="done").length;return `<span class="seen ${d===sn.length?"all":""}">👁 Seen by ${d} of ${sn.length}</span>`})():""}</span></button>`;
}
