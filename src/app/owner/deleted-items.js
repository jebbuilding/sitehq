/* ===== DELETED ITEMS: photos and files the owner deletes go here first, come off everywhere they were used, and are removed for good after 30 days (or straight away from Setup) ===== */
const BIN_DAYS=30;
/* every record James deletes goes to Deleted items first (records put back with ↩, gone for good after BIN_DAYS or when he purges with his PIN) */
const BIN_SKIP=/^(todos\/bin-|todos\/audit|sphotos\/|wfiles\/|data\/users\/|settings\/|portal\/[^/]+\/uploads\/|.*\/parts\/|.*\/_$)/;
async function noBin(f){S.noBin=(S.noBin||0)+1;try{return await f()}finally{S.noBin--}}
function binTitleFor(path,d){const seg=path.split("/"),coll=seg[0];
  const where={todos:d.kind==="client"?"Clients":d.kind==="supplier"?"Suppliers":d.kind==="winsurvey"?"Door & window surveys":d.kind==="wtn"?"Waste transfer notes":d.kind==="wsdesign"?"Your window & door designs":d.kind==="nptpl"?"Drawing templates":d.kind==="sitejob"?"Sites":d.kind==="dwline"?"Day work":d.kind==="cdm"?"CDM records":d.kind==="sitedoc"?"Documents":d.kind==="seen"?"App":d.text?"My to-do":"Records",sites:"Sites",jobs:"Forms (jobs & to-dos)",plan:"Planner",planprivate:"Planner (private)",chats:"Chat",msgs:"Chat messages",talks:"Training",docs:"Documents",equipment:"Equipment",inductions:"Inductions",portal:"Client portal",offapp:"Off-app trades",jobdone:"Job sheet progress",sheets:({entries:"Timesheets",signoffs:"Sign-offs & forms",photos:"Photos",checks:"Reports",invoices:"Invoices",signins:"Sign-in book"})[seg[2]]||"Trade records"}[coll]||coll;
  const who=coll==="sheets"?nameOf(seg[1]):"";
  const t=(seg[2]==="signins"&&d.site?(d.date||"")+" · "+d.site+" · in "+(d.in||""):"")||d.name||d.title||d.text||(d.hours!=null&&d.date?d.date+" · "+d.hours+"h · "+(d.job||d.task||d.site||""):"")||(d.type&&d.date?d.type+" · "+d.date:"")||d.site||d.subject||d.label||(d.date?d.date+(d.hours?" · "+d.hours+"h":""):"")||d.ref||d.job||seg[seg.length-1];
  return {title:String(t).slice(0,120),sub:where+(who?" · "+who:"")}}
let binGrp=null;
async function binRecord(path){if(!ownerMode()||window.__binBusy||S.noBin||BIN_SKIP.test(path)||!S.rawDb)return;
  let snap;try{snap=await S.rawDb.doc(path).get()}catch(e){return}
  if(!snap||!snap.exists)return;const d=snap.data()||{};const nm=binTitleFor(path,d);
  const assets=[d.assetId,d.src,d.preview,d.frontPhoto,d.photo].concat(Array.isArray(d.photos)?d.photos.map(p=>typeof p==="string"?p:p&&p.id):[]).filter(x=>typeof x==="string"&&x&&!/^local:/.test(x));
  const ref={t:"rec",path,data:d};
  if(binGrp&&Date.now()-binGrp.t<1200){const g=binGrp;g.rec.refs.push(ref);assets.forEach(a=>{if(!g.rec.assets.includes(a))g.rec.assets.push(a)});g.n++;g.rec.title=g.first+" + "+(g.n-1)+" more";if(!g.rec.sub.includes(nm.sub))g.rec.sub=(g.rec.sub+" · "+nm.sub).slice(0,200);g.t=Date.now();clearTimeout(g.tm);g.tm=setTimeout(binGrpFlush,400);return}
  const id="bin-"+newId();const rec={kind:"bin",at:Date.now(),by:myName(),title:nm.title,sub:nm.sub,type:"record",thumb:binIsImg(d.contentType||d.type||"")&&d.assetId?d.assetId:"",assets,refs:[ref]};
  binGrp={id,rec,first:nm.title,n:1,t:Date.now(),tm:setTimeout(binGrpFlush,400)};
  S.bin=(S.bin||[]).concat([Object.assign({id},rec)])}
async function binGrpFlush(){const gp=binGrp;if(!gp)return;clearTimeout(gp.tm);const rec=JSON.parse(JSON.stringify(gp.rec));
  try{await S.rawDb.doc("todos/"+gp.id).set(rec)}catch(e){}
  const i=(S.bin||[]).findIndex(x=>x.id===gp.id);if(i>=0)S.bin[i]=Object.assign({id:gp.id},rec);
  if(binGrp===gp){if(Date.now()-gp.t>=1200)binGrp=null;else gp.tm=setTimeout(binGrpFlush,1200)}}
function binRecView(it){const d=document.createElement("div");d.className="dimask";d.style.zIndex="125";
  const rows=(it.refs||[]).filter(r=>r.t==="rec").map(r=>{const o=r.data||{};const keys=Object.keys(o).filter(k=>!/^(kind|versions|parts|hash|prev|snap)$/.test(k)&&typeof o[k]!=="object"&&String(o[k]).trim()!=="").slice(0,14);
    return `<div style="border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin-top:8px"><b>${esc(binTitleFor(r.path,o).title)}</b><br><span class="who">${esc(binTitleFor(r.path,o).sub)}</span><div style="font-size:12.5px;margin-top:4px;display:grid;grid-template-columns:max-content 1fr;gap:2px 10px">${keys.map(k=>`<span class="who">${esc(k)}</span><span>${esc(String(o[k]).slice(0,160))}</span>`).join("")}</div></div>`}).join("");
  d.innerHTML=`<div class="dimbox" style="max-width:min(96vw,640px);max-height:85vh;overflow:auto"><b>${esc(it.title)}</b><div class="who">${esc(it.sub||"")}</div>${rows||'<div class="who" style="margin-top:8px">No record details kept.</div>'}<div class="dimbtns"><button type="button" class="btn primary bnv-x">Close</button></div></div>`;
  document.body.appendChild(d);d.querySelector(".bnv-x").onclick=()=>d.remove();d.onclick=e=>{if(e.target===d)d.remove()}}
const binList=()=>(S.bin||[]).slice().sort((a,b)=>(b.at||0)-(a.at||0));
const binIsImg=t=>/^image\//.test(t||"");
/* every place in the app that points at these stored files */
async function binRefsFor(assetIds){const A=new Set(assetIds.filter(Boolean));const refs=[];if(!A.size)return refs;
  const addPhoto=(who,p)=>{if(p&&A.has(p.assetId))refs.push({t:"photo",who,id:p.id,data:JSON.parse(JSON.stringify(p))})};
  (S.mine.photos||[]).forEach(p=>addPhoto(S.me,p));Object.entries(S.data.photos||{}).forEach(([who,L])=>(L||[]).forEach(p=>addPhoto(who,p)));
  ((S.sph||{}).list||[]).forEach(p=>{if(A.has(p.assetId))refs.push({t:"sphoto",who:p.who,id:p.id,data:JSON.parse(JSON.stringify(p))})});
  (RAW.docs||[]).concat(RAW.privDocs||[]).forEach(d=>{if(A.has(d.assetId)||(d.versions||[]).some(v=>A.has(v.assetId)))refs.push({t:"doc",id:d.id,priv:!!d._priv,data:JSON.parse(JSON.stringify(Object.assign({},d,{_priv:undefined})))})});
  for(const c of (S.clients||[])){(c.media||[]).forEach(m=>{if(A.has(m.id)||A.has(m.src))refs.push({t:"media",cid:c.id,item:JSON.parse(JSON.stringify(m))})});
    (c.ptDocs||[]).forEach(d=>{if(A.has(d.assetId))refs.push({t:"ptdoc",cid:c.id,item:JSON.parse(JSON.stringify(d))})});
    (c.recordPdfs||[]).forEach(r=>{if(A.has(r.assetId))refs.push({t:"recpdf",cid:c.id,item:JSON.parse(JSON.stringify(r))})});
    if(A.has(c.frontPhoto))refs.push({t:"cfront",cid:c.id,asset:c.frontPhoto});
    const p=ptOf(c);if(p){try{const snap=await S.db.collection("portal/"+p.id+"/docs").get();mapDocs(snap).forEach(d=>{if(A.has(d.assetId))refs.push({t:"pdoc",pid:p.id,id:d.id,data:JSON.parse(JSON.stringify(Object.assign({},d,{id:undefined})))})})}catch(e){}}}
  (S.sites||[]).forEach(sr=>{if(A.has(sr.frontPhoto))refs.push({t:"sfront",sid:sr.id,asset:sr.frontPhoto})});
  Object.entries(S.jobdone||{}).forEach(([key,x])=>{const ph=(x&&x.photos)||[];const hit=ph.filter(id=>A.has(id));if(hit.length)refs.push({t:"jobdone",key,assets:hit})});
  return refs}
const binWhere=r=>({photo:"Site photos"+(r.data&&r.data.site?" · "+r.data.site:""),sphoto:"Shared site photos",doc:"Documents"+(r.data&&r.data.site?" · "+r.data.site:""),media:"Client photos & sketches",ptdoc:"Client portal",pdoc:"Client portal",recpdf:"Client PDFs",cfront:"Client front photo",sfront:"Site front photo",jobdone:"Job sheet task photo",rec:r.path?binTitleFor(r.path,r.data||{}).sub:"Record"}[r.t]||r.t);
async function binRemoveRefs(refs){for(const r of refs){try{
  if(r.t==="photo"){await S.db.doc("sheets/"+r.who+"/photos/"+r.id).delete();S.db.doc("sphotos/"+r.who+"/p/"+r.id).delete().catch(()=>{});if(S.sph)S.sph.list=(S.sph.list||[]).filter(x=>!(x.id===r.id&&x.who===r.who));if(r.who===S.me&&S.mine.photos)S.mine.photos=S.mine.photos.filter(x=>x.id!==r.id);else if(S.data.photos&&S.data.photos[r.who])S.data.photos[r.who]=S.data.photos[r.who].filter(x=>x.id!==r.id)}
  else if(r.t==="sphoto"){await S.db.doc("sphotos/"+r.who+"/p/"+r.id).delete();if(S.sph)S.sph.list=(S.sph.list||[]).filter(x=>!(x.id===r.id&&x.who===r.who))}
  else if(r.t==="doc"){await S.db.doc((r.priv?"todos/":"docs/")+r.id).delete();RAW.docs=(RAW.docs||[]).filter(x=>x.id!==r.id);RAW.privDocs=(RAW.privDocs||[]).filter(x=>x.id!==r.id)}
  else if(r.t==="media"){const c=(S.clients||[]).find(x=>x.id===r.cid);if(c)await saveClient(Object.assign({},ptCl(c),{media:(ptCl(c).media||[]).filter(x=>x.id!==r.item.id)}))}
  else if(r.t==="ptdoc"){const c=(S.clients||[]).find(x=>x.id===r.cid);if(c)await saveClient(Object.assign({},ptCl(c),{ptDocs:(ptCl(c).ptDocs||[]).filter(x=>x.id!==r.item.id)}))}
  else if(r.t==="recpdf"){const c=(S.clients||[]).find(x=>x.id===r.cid);if(c)await saveClient(Object.assign({},ptCl(c),{recordPdfs:(ptCl(c).recordPdfs||[]).filter(x=>x.assetId!==r.item.assetId)}))}
  else if(r.t==="cfront"){const c=(S.clients||[]).find(x=>x.id===r.cid);if(c)await saveClient(Object.assign({},ptCl(c),{frontPhoto:""}))}
  else if(r.t==="pdoc"){await S.db.doc("portal/"+r.pid+"/docs/"+r.id).delete()}
  else if(r.t==="sfront"){await S.db.doc("sites/"+r.sid).update({frontPhoto:""});const sr=(S.sites||[]).find(x=>x.id===r.sid);if(sr)sr.frontPhoto=""}
  else if(r.t==="jobdone"){const x=S.jobdone[r.key];if(x){const ph=(x.photos||[]).filter(id=>!r.assets.includes(id));await S.db.doc("jobdone/"+r.key).update({photos:ph});x.photos=ph}}
  }catch(e){console.warn("bin remove",r.t,e)}}}
async function binRestoreRefs(refs){for(const r of refs){try{
  if(r.t==="photo"){const d=Object.assign({},r.data);delete d.id;await S.db.doc("sheets/"+r.who+"/photos/"+r.id).set(d);const rec=Object.assign({id:r.id},d);if(r.who===S.me)S.mine.photos=(S.mine.photos||[]).filter(x=>x.id!==r.id).concat([rec]);else{S.data.photos=S.data.photos||{};S.data.photos[r.who]=(S.data.photos[r.who]||[]).filter(x=>x.id!==r.id).concat([rec])}if(sphotoWanted(rec))sphotoPut(r.who,r.id,rec)}
  else if(r.t==="sphoto"){}
  else if(r.t==="rec"){const d=Object.assign({},r.data);delete d.id;await S.rawDb.doc(r.path).set(d);const m=r.path.match(/^sheets\/([^/]+)\//);if(m&&m[1]!==S.me){TR.stamp[m[1]]=undefined;queueTrade(m[1])}}
  else if(r.t==="doc"){const d=Object.assign({},r.data);delete d.id;delete d._priv;await S.db.doc((r.priv?"todos/":"docs/")+r.id).set(d)}
  else if(r.t==="media"){const c=(S.clients||[]).find(x=>x.id===r.cid);if(c){const cur=ptCl(c);await saveClient(Object.assign({},cur,{media:(cur.media||[]).filter(x=>x.id!==r.item.id).concat([r.item])}))}}
  else if(r.t==="ptdoc"){const c=(S.clients||[]).find(x=>x.id===r.cid);if(c){const cur=ptCl(c);await saveClient(Object.assign({},cur,{ptDocs:(cur.ptDocs||[]).filter(x=>x.id!==r.item.id).concat([r.item])}))}}
  else if(r.t==="recpdf"){const c=(S.clients||[]).find(x=>x.id===r.cid);if(c){const cur=ptCl(c);await saveClient(Object.assign({},cur,{recordPdfs:[r.item].concat((cur.recordPdfs||[]).filter(x=>x.assetId!==r.item.assetId))}))}}
  else if(r.t==="cfront"){const c=(S.clients||[]).find(x=>x.id===r.cid);if(c)await saveClient(Object.assign({},ptCl(c),{frontPhoto:r.asset}))}
  else if(r.t==="pdoc"){const d=Object.assign({},r.data);delete d.id;await S.db.doc("portal/"+r.pid+"/docs/"+r.id).set(d)}
  else if(r.t==="sfront"){await S.db.doc("sites/"+r.sid).update({frontPhoto:r.asset});const sr=(S.sites||[]).find(x=>x.id===r.sid);if(sr)sr.frontPhoto=r.asset}
  else if(r.t==="jobdone"){const x=S.jobdone[r.key];const ph=((x&&x.photos)||[]).filter(id=>!r.assets.includes(id)).concat(r.assets);await S.db.doc("jobdone/"+r.key).update({photos:ph});if(x)x.photos=ph}
  }catch(e){console.warn("bin restore",r.t,e)}}}
/* move something to Deleted items: o = {assets:[ids], title, sub, type, thumb} */
async function binDelete(o){if(!ownerMode()){toast("Only James can delete this");return false}const assets=[...new Set((o.assets||[]).filter(Boolean))];if(!assets.length)return false;
  const refs=await binRefsFor(assets);(refs.filter(r=>r.t==="doc")).forEach(r=>(r.data.versions||[]).forEach(v=>{if(v.assetId&&!assets.includes(v.assetId))assets.push(v.assetId)}));
  const id="bin-"+newId();const rec={kind:"bin",at:Date.now(),by:myName(),title:String(o.title||"Photo").slice(0,120),sub:String(o.sub||[...new Set(refs.map(binWhere))].join(" · ")).slice(0,200),type:o.type||"image/jpeg",thumb:o.thumb||(binIsImg(o.type||"image/jpeg")?assets[0]:""),assets,refs};
  try{await S.db.doc("todos/"+id).set(rec)}catch(e){toast("Couldn't save to Deleted items, so nothing was deleted. Check your connection.");return false}
  S.bin=(S.bin||[]).concat([Object.assign({id},rec)]);window.__binBusy=(window.__binBusy||0)+1;try{await binRemoveRefs(refs)}finally{window.__binBusy--}return true}
async function binRestore(item){await binRestoreRefs(item.refs||[]);try{await S.db.doc("todos/"+item.id).delete()}catch(e){}S.bin=(S.bin||[]).filter(x=>x.id!==item.id)}
async function binPurge(item){window.__binPurging=(window.__binPurging||0)+1;try{for(const a of item.assets||[]){if((S.bin||[]).some(b=>b.id!==item.id&&(b.assets||[]).includes(a)))continue;try{if(S.assets)await S.assets.delete(a)}catch(e){}}}finally{window.__binPurging--}try{await S.db.doc("todos/"+item.id).delete()}catch(e){}S.bin=(S.bin||[]).filter(x=>x.id!==item.id)}
async function binAutoPurge(){if(!ownerMode()||!S.assets||window.__binAuto)return;window.__binAuto=1;try{const old=(S.bin||[]).filter(x=>Date.now()-(x.at||0)>BIN_DAYS*864e5);for(const it of old)await binPurge(it);if(old.length)toast(old.length+" deleted item"+(old.length===1?"":"s")+" removed for good after "+BIN_DAYS+" days")}finally{window.__binAuto=0}}
const binDaysLeft=it=>Math.max(0,Math.ceil((it.at+BIN_DAYS*864e5-Date.now())/864e5));
function binView(){if(!ownerMode())return;const L=binList();const picked=new Set();
  const draw=()=>{const L=binList();openViewer(`<span class="tag">🗑 ${L.length} item${L.length===1?"":"s"}</span><h3 style="font-family:var(--f-display);font-size:24px;margin:6px 0 8px;color:var(--accent)">Deleted items</h3>
    <div class="who">Anything you delete comes here first – photos, files and records (clients, sites, jobs, planner entries, timesheet entries, forms, surveys, messages). Photos and files come off everywhere they were used. They're removed for good automatically after <b>${BIN_DAYS} days</b>. Until then you can put them back.</div>
    ${L.length?`<div class="actions" style="margin-top:10px"><button type="button" class="btn" id="bn-all">☑ Tick all</button><button type="button" class="btn" id="bn-none">☐ Untick all</button><button type="button" class="btn delbtn" id="bn-del" ${picked.size?"":"disabled"}>🗑 Delete ticked for good now (${picked.size})</button><button type="button" class="btn delbtn" id="bn-empty">Delete everything for good now</button></div>`:""}
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">${L.map(it=>`<div class="attrow" style="align-items:center"><label class="tick" style="margin:0"><input type="checkbox" class="bn-c" data-id="${esc(it.id)}" ${picked.has(it.id)?"checked":""}></label>${it.thumb?`<img src="${blobUrl(it.thumb)}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:6px;background:#ddd">`:`<span class="attic" aria-hidden="true">${it.type==="record"?"🗂":/pdf/.test(it.type||"")?"📄":"📎"}</span>`}<span style="flex:1;min-width:0"><b>${esc(it.title)}</b><br><span class="who">${esc(it.sub||"")}${it.sub?" · ":""}deleted ${esc(stamp(it.at))} by ${esc(it.by||"")} · ${binDaysLeft(it)} day${binDaysLeft(it)===1?"":"s"} left</span></span><button type="button" class="btn bn-view" data-id="${esc(it.id)}">👁</button><button type="button" class="btn primary bn-res" data-id="${esc(it.id)}">↩ Put back</button></div>`).join("")||'<div class="nothing">Nothing in Deleted items.</div>'}</div>`);
    const vb=$("viewer-body");vb.querySelectorAll(".bn-c").forEach(c=>c.onchange=()=>{if(c.checked)picked.add(c.dataset.id);else picked.delete(c.dataset.id);const b=$("bn-del");if(b){b.disabled=!picked.size;b.textContent=`🗑 Delete ticked for good now (${picked.size})`}});
    const all=$("bn-all");if(all)all.onclick=()=>{L.forEach(it=>picked.add(it.id));draw()};const none=$("bn-none");if(none)none.onclick=()=>{picked.clear();draw()};
    vb.querySelectorAll(".bn-view").forEach(b=>b.onclick=()=>{const it=L.find(x=>x.id===b.dataset.id);if(!it)return;if(it.type==="record"){binRecView(it);return}if(binIsImg(it.type)&&it.thumb){const d=document.createElement("div");d.className="dimask";d.style.zIndex="125";d.innerHTML=`<div class="dimbox" style="max-width:min(96vw,900px)"><b>${esc(it.title)}</b><img src="${blobUrl(it.thumb)}" alt="${esc(it.title)}" style="max-height:70vh;width:auto;max-width:100%;display:block;margin:8px auto;border-radius:8px"><div class="dimbtns"><button type="button" class="btn primary bnv-x">Close</button></div></div>`;document.body.appendChild(d);d.querySelector(".bnv-x").onclick=()=>d.remove();d.onclick=e=>{if(e.target===d)d.remove()}}else openFile(it.assets[0],it.title,it.type)});
    vb.querySelectorAll(".bn-res").forEach(b=>b.onclick=async()=>{const it=L.find(x=>x.id===b.dataset.id);if(!it)return;b.disabled=true;b.textContent="Putting back…";try{await binRestore(it);toast("Put back: "+it.title);picked.delete(it.id);draw();render()}catch(e){toast("Couldn't put it back");b.disabled=false;b.textContent="↩ Put back"}});
    const purge=async items=>{if(!items.length)return;askOwnerPin(`Enter your PIN to delete ${items.length} item${items.length===1?"":"s"} for good. This can't be undone and they won't be anywhere in the app afterwards.`,async()=>{
      if(!await auditFirst("Deleted items removed for good",`${items.length} item${items.length===1?"":"s"}`,items.map(x=>`${x.title} (${x.sub||""}, deleted ${stamp(x.at)})`).join("; ").slice(0,1900),items.map(x=>({title:x.title,sub:x.sub,at:x.at,by:x.by,assets:x.assets,where:(x.refs||[]).map(binWhere)}))))return;
      toast("Removing…");for(const it of items){await binPurge(it);picked.delete(it.id)}toast(items.length+" removed for good");draw()})};
    const del=$("bn-del");if(del)del.onclick=()=>purge(L.filter(x=>picked.has(x.id)));const emp=$("bn-empty");if(emp)emp.onclick=()=>purge(L.slice())};
  draw()}
/* one-tap delete from any viewer: moves to Deleted items and takes it off everywhere */
async function binFromViewer(o,after){const d=document.createElement("div");d.className="dimask";d.style.zIndex="125";
  d.innerHTML=`<div class="dimbox" role="alertdialog" aria-label="Delete"><b>🗑 Delete “${esc(o.title||"this")}”?</b><div class="who" style="margin-top:4px">It comes off everywhere it's used in the app and goes to <b>Setup › Deleted items</b>, where you can put it back for ${BIN_DAYS} days. After that it's removed for good.</div><div class="dimbtns"><button type="button" class="btn bf-no">Keep it</button><button type="button" class="btn delbtn bf-yes">Delete</button></div></div>`;
  document.body.appendChild(d);d.querySelector(".bf-no").onclick=()=>d.remove();d.onclick=e=>{if(e.target===d)d.remove()};
  d.querySelector(".bf-yes").onclick=async()=>{const b=d.querySelector(".bf-yes");b.disabled=true;b.textContent="Deleting…";const ok=await binDelete(o);d.remove();if(ok){toast("Deleted. It's in Setup › Deleted items for "+BIN_DAYS+" days.");if(after)after()}}}
