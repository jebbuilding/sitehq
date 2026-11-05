/* ===== Site storage: completed or rejected jobs move out of Sites into storage ===== */
const ARC_STAGES=["done","lost"];
function arcWhy(site){const sr=siteRec(site)||{};return sr.archivedWhy||"finished"}
async function siteArchive(site,manual,why){const sr=siteRec(site);if(!sr||!sr.id)return;const d={archived:true,archivedAt:Date.now(),archivedBy:manual?"you":"auto",archivedWhy:why||(manual?"put away":"finished")};
  try{await S.db.doc("sites/"+sr.id).update(d);Object.assign(sr,d);if(manual){toast(site+" moved to storage");S.f.projList=true;render()}}catch(e){if(manual)toast("Couldn't move it. Check your connection.")}}
async function siteRestore(site){const sr=siteRec(site);if(!sr||!sr.id)return;const d={archived:false,restoredAt:Date.now()};try{await S.db.doc("sites/"+sr.id).update(d);Object.assign(sr,d);toast(site+" is back in Sites");S.f.proj=site;render()}catch(e){toast("Couldn't restore it")}}
async function siteArchiveForClient(c,oldStage){const now=c.stage;const sites=clientSites(c).map(siteRec).filter(Boolean);if(!sites.length)return;
  if(ARC_STAGES.includes(now)){for(const sr of sites)if(!sr.archived)await siteArchive(sr.name,false,now==="done"?"completed":"rejected");toast(sites.map(x=>x.name).join(", ")+(sites.length===1?" has":" have")+" moved to storage (Sites › Storage)")}
  else if(ARC_STAGES.includes(oldStage)){for(const sr of sites)if(sr.archived&&sr.archivedBy==="auto")await siteRestore(sr.name)}}
/* first run: put away sites for jobs that were already completed or rejected (sites you've restored by hand stay put) */
let arcMigrated=false;
function arcMigrate(){if(arcMigrated||!ownerMode()||S.preview||!(S.clients||[]).length||!(S.sites||[]).length)return;arcMigrated=true;
  (S.clients||[]).filter(c=>ARC_STAGES.includes(c.stage)).forEach(c=>clientSites(c).map(siteRec).filter(sr=>sr&&sr.archived===undefined&&!sr.restoredAt).forEach(sr=>siteArchive(sr.name,false,c.stage==="done"?"completed":"rejected")))}
function storageHtml(cur){const a=archivedSites();if(!a.length)return "";
  return `<details class="card arcbox" ${S.f.arcOpen?"open":""}><summary><b>🗄 Storage (${a.length})</b> <span class="who">completed and rejected jobs<span class="arcmatch"></span></span></summary><div class="arclist">${a.map(sr=>{const c=siteClient(sr.name);return `<div class="arcrow" data-q="${esc([sr.name,c&&c.name,sr.project,c&&c.work,c&&c.postcode,sr.archivedWhy].filter(Boolean).join(" ").toLowerCase())}"><span><b>${esc(sr.name)}</b><br><span class="who">${c?"👤 "+esc(c.name)+" · ":""}${esc(sr.archivedWhy||"finished")}${sr.archivedAt?" · "+esc(stamp(sr.archivedAt)):""}</span></span><span class="arcbtns"><button type="button" class="pillbtn arc-open" data-s="${esc(sr.name)}">Open</button><button type="button" class="pillbtn arc-back" data-s="${esc(sr.name)}">↩ Restore</button><button type="button" class="pillbtn arc-del" data-s="${esc(sr.name)}" aria-label="Delete ${esc(sr.name)}">🗑</button></span></div>`}).join("")}</div></details>`}
function wireStorage(){const d=document.querySelector(".arcbox");if(d)d.addEventListener("toggle",()=>{S.f.arcOpen=d.open});
  document.querySelectorAll(".arc-open").forEach(b=>b.onclick=()=>{S.f.proj=b.dataset.s;S.f.projList=false;render();window.scrollTo(0,0)});document.querySelectorAll(".arc-back").forEach(b=>b.onclick=()=>siteRestore(b.dataset.s));document.querySelectorAll(".arc-del").forEach(b=>b.onclick=()=>deleteSiteFlow(b.dataset.s))}




