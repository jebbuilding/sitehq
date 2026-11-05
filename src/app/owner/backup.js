/* ================= BACKUP ================= */
let zipP=null;
function loadZip(){if(window.JSZip)return Promise.resolve();if(zipP)return zipP;zipP=new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";s.onload=res;s.onerror=()=>{zipP=null;rej(new Error("load"))};document.head.appendChild(s)});return zipP}
const csvText=rows=>rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
async function makeBackup(withFiles,prog){
  if(!S.dl){toast("Downloads only work when the page is opened in claude.ai");return false}
  prog("Loading the zip maker…"); await loadZip();
  prog("Getting the latest records…"); await Promise.all(allIds().map(id=>fetchTrade(id)));
  const people={}; allIds().forEach(id=>{people[id]={profile:S.team[id],records:Object.fromEntries(TR_COLLS.map(c=>[c,S.data[c][id]||[]]))}});
  if(S.mine&&S.mine.entries) people[S.me]={profile:S.myProfile,records:Object.fromEntries(TR_COLLS.map(c=>[c,S.mine[c]||[]]))};
  const chats=[]; for(const c of S.chats){try{const snap=await S.rawDb.collection("msgs/"+c.id+"/m").orderBy("at","asc").limit(1000).get();chats.push({chat:c,messages:mapDocs(snap)})}catch(e){chats.push({chat:c,messages:[]})}}
  const data={made:new Date().toISOString(),app:"SiteHQ",settings:S.settings,sites:S.sites,equipment:S.equipment,documents:S.docs,policies:S.policies,inductions:S.inductions,visitorInductions:S.visitInds,
    jobs:S.jobs,jobProgress:S.jobdone,talks:S.talks,planner:S.plan,plannerPrivate:S.planPrivate,todos:S.todos,peopleNotOnApp:S.offapp,materialCalculator:S.matcalc,people,chats};
  const zip=new window.JSZip(); const json=JSON.stringify(data,null,1); zip.file("backup.json",json);
  const ent=[["Name","Date","Sheet","Site","Task","Start","Finish","Break (min)","Hours","Extra work","Approved","Notes"]];
  Object.entries(people).forEach(([id,p])=>(p.records.entries||[]).forEach(e=>ent.push([nameOf(id),e.date,e.type==="hours"?"Timesheet":"Job log",e.job,e.task||"",e.start||"",e.finish||"",e.breakMin||"",e.hours,e.kind==="extra"?"Yes":"",e.approved?"Yes":"No",e.notes||""])));
  zip.file("Timesheets (all).csv",csvText(ent));
  const inc=[["Date","Time","Type","Site","Reported by","Person hurt","Injury","Hospital","Possible RIDDOR","What happened","Action","Reviewed","Notes"]];
  Object.entries(people).forEach(([id,p])=>(p.records.signoffs||[]).filter(x=>x.type==="incident").forEach(x=>inc.push([x.date,x.time,INC_KINDS[x.kind]||x.kind,x.site,x.name||nameOf(id),x.person,x.injury,x.hospital,x.riddor?"Yes":"",x.what,x.action,x.status==="reviewed"?"Yes":"No",x.ownerNotes])));
  zip.file("Accident book.csv",csvText(inc));
  const chk=[["Name","Date","Type","Item","Safe","Defects","Notes","Fixed"]];
  Object.entries(people).forEach(([id,p])=>(p.records.checks||[]).forEach(c0=>{const c=ck(c0);chk.push([nameOf(id),c.date,(KINDS[c.kind]||{}).name,c.asset,c.safe===false?"No":"Yes",defectsOf(c).join("; "),c.notes,c.fixed?"Yes":""])}));
  zip.file("Checks and inspections.csv",csvText(chk));
  const keys=DET_SECTIONS.flatMap(([,f])=>f); const ppl=[["Name"].concat(keys.map(([,l])=>l)).concat(["Left"])];
  allIds().forEach(id=>{const d=(S.team[id]&&S.team[id].details)||{};ppl.push([nameOf(id)].concat(keys.map(([k])=>k==="empType"?EMP_TYPES[d[k]]||d[k]||"":d[k]||"")).concat([(S.team[id]||{}).left?"Yes":""]))});
  zip.file("People.csv",csvText(ppl));
  zip.file("READ ME.txt",`SiteHQ backup made ${stamp(Date.now())}.\r\n\r\nbackup.json has every record in the app. The CSV files open in Excel.\r\n${withFiles?"The files folder has the photos and documents, named by their id (the same id is in backup.json).":"Photos and documents are not included. Tick 'Include photos and documents' to add them."}\r\nKeep this file somewhere safe: it has personal information in it.\r\n`);
  if(withFiles){const ids=[...new Set((json.match(/"[0-9a-f]{32}"/g)||[]).map(x=>x.slice(1,-1)))];let total=0,n=0;
    for(const id of ids){prog(`Adding files ${++n} of ${ids.length}…`);try{const r=await fetch(blobUrl(id));if(!r.ok)continue;const b=await r.blob();total+=b.size;if(total>400*1048576){prog("Stopped adding files: the backup is getting too big.");break}
      const ext=/pdf/.test(b.type)?"pdf":/png/.test(b.type)?"png":/jpe?g/.test(b.type)?"jpg":/webp/.test(b.type)?"webp":"bin";zip.file("files/"+id+"."+ext,b)}catch(e){}}}
  prog("Making the zip…"); const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:5}});
  try{await S.dl.save({filename:`JEB backup ${iso(new Date())}.zip`,data:blob})}catch(e){if(e&&e.code==="declined")return false;throw e}
  try{await S.db.doc("settings/app").set(Object.assign({},S.settings,{lastBackup:Date.now()}))}catch(e){}
  return true;
}
function backupCard(){
  const lb=S.settings&&S.settings.lastBackup; const days=lb?Math.floor((Date.now()-lb)/864e5):null;
  return `<div class="card"><div class="cardbody" style="border:0"><b>Backup</b>
    <div class="who">Downloads everything in the app as one zip file: every record (backup.json), plus spreadsheets of timesheets, checks, the accident book and people. Keep it somewhere safe, it has personal information in it.</div>
    <div class="${days==null||days>30?"sub":"who"}" style="${days==null||days>30?"color:var(--danger)":""}">${lb?`Last backup ${stamp(lb)} (${days} day${days===1?"":"s"} ago).`:"No backup made yet."} Do one at least once a month.</div>
    <label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" id="bk-files"> Include photos and documents (bigger, slower)</label>
    <div><button class="btn primary" id="bk-go" type="button">Back up everything</button></div><div class="who" id="bk-prog"></div></div></div>`;
}
function wireBackup(){const b=$("bk-go");if(!b)return;b.onclick=async()=>{b.disabled=true;const pr=t=>{const e=$("bk-prog");if(e)e.textContent=t};
  try{const ok=await makeBackup($("bk-files").checked,pr);pr(ok?"Backup saved.":"Backup not saved.");if(ok)toast("Backup saved")}catch(e){pr("Backup didn't work. Check your connection and try again.")}b.disabled=false}}

