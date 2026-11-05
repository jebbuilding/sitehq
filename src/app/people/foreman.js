/* ================= FOREMAN (extra access) ================= */
const isForeman=id=>!!((id===S.me&&!S.owner?S.myProfile:S.team[id])||{}).foreman;
const amForeman=()=>!ownerMode()&&!!(S.myProfile&&S.myProfile.foreman);
let proxyFor=null;
function allVisitInds(){return (S.visitInds||[]).concat(allTeam("signoffs").filter(x=>x.type==="visitind").map(x=>Object.assign({},x,{recordedBy:x.recordedBy||nameOf(x.who)})))}
function proxyPeople(){return (S.settings.people||[]).filter(p=>p.id!==S.me)}
function openProxyPick(type){
  const ppl=proxyPeople();
  openSheet(`<h3 id="sheettitle">${type==="hours"?"Timesheet":"Job time"} for someone else</h3>
    <label for="px-who">Who is it for?<select id="px-who"><option value="">Choose…</option>${ppl.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}<option value="__other">Someone not on the app…</option></select></label>
    <label for="px-name" id="px-namel" hidden>Their full name<input id="px-name" maxlength="80" placeholder="e.g. Dave Smith (labourer)"></label>
    <div class="who">It goes straight to James under their name, marked as filled in by you.</div>
    ${formFoot(false,"Next")}`,()=>{const v=$("px-who").value;if(!v){showErr("Choose who it's for.");return}
      const name=v==="__other"?$("px-name").value.trim():(ppl.find(p=>p.id===v)||{}).name;if(!name){showErr("Type their name.");return}
      closeForm();proxyFor={id:v==="__other"?"":v,name};openEntry(type,null,null)},"px-who");
  $("px-who").onchange=e=>{$("px-namel").hidden=e.target.value!=="__other";if(e.target.value==="__other")$("px-name").focus()};
}
function foremanView(){
  const mineFor=S.mine.entries.filter(e=>e.forName).sort((a,b)=>b.date.localeCompare(a.date)||(b.created||0)-(a.created||0));
  const wk=mineFor.filter(inWeek);
  const vis=S.mine.signoffs.filter(x=>x.type==="visitind").sort((a,b)=>b.signedAt-a.signedAt);
  const inds=S.inductions.slice().sort((a,b)=>a.site.localeCompare(b.site));
  $("main").innerHTML=`<div class="notice">You're a <b>foreman</b>. You can fill in timesheets for your team and induct people on site using your phone.</div>
    <div class="day"><div class="dayh"><span>Timesheets for others</span><span class="sum">${wk.length} this week</span></div>
      <div class="actions"><button class="btn primary" id="fm-hours" type="button">+ Timesheet for someone</button><button class="btn hv" id="fm-job" type="button">🧱 + Day work / job time for someone</button></div>
      ${wk.map(e=>`<div class="entry"><div class="main"><div class="job"><b>${esc(e.forName)}</b> · ${esc(e.type==="hours"?"Timesheet":"Job time")}</div><div class="sub">${esc(shortDay(e.date))} · ${esc(e.job)}${e.type==="hours"?` · ${esc(e.start)}–${esc(e.finish)}`:` · ${esc(e.task||"")}`} · ${hrs(e.hours)} h</div></div></div>`).join("")||'<div class="nothing">None this week.</div>'}</div>
    <div class="day"><div class="dayh"><span>Site inductions on your phone</span><span class="sum">${vis.length} done</span></div>
      <div class="who">For visitors, delivery drivers or workers who don't have the app. Hand them your phone to read, tick and sign.</div>
      ${inds.length?inds.map(i=>`<div class="citem"><span><b>${esc(i.site)}</b><br><span class="who">${vis.filter(v=>v.inductionId===i.id).length} done by you</span></span><button type="button" class="btn primary fm-ind" data-i="${esc(i.id)}">Induct someone</button></div>`).join(""):'<div class="nothing">James hasn\'t set up any site inductions yet.</div>'}
      ${vis.slice(0,15).map(v=>`<div class="sub">${esc(v.name)} · ${esc(v.site)} · ${esc(stamp(v.signedAt))}</div>`).join("")}</div>
    <div class="who">Accident reports, checks and risk assessments can be filled in from <b>Reports</b> as usual, for anyone.</div>`;
  $("fm-hours").onclick=()=>openProxyPick("hours"); $("fm-job").onclick=()=>openProxyPick("job");
  $("main").querySelectorAll(".fm-ind").forEach(b=>b.onclick=()=>{const i=S.inductions.find(x=>x.id===b.dataset.i);if(i)openInduction(i,true)});
}

/* red back buttons: any button whose label starts with ‹ */
function markBack(root){(root||document).querySelectorAll("button").forEach(b=>{if(!b.classList.contains("backbtn")&&/^\s*‹/.test(b.textContent||""))b.classList.add("backbtn")})}
let mbT=null; new MutationObserver(()=>{clearTimeout(mbT);mbT=setTimeout(()=>markBack(),30)}).observe(document.body,{childList:true,subtree:true});

