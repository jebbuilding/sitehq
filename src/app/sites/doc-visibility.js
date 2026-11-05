/* ===== who can see a site document or drawing, and which folder it lives in ===== */
const docFolders=(site,cat)=>{const set=new Set();(S.docs||[]).filter(d=>same(d.site||"General",site||"General")&&(!cat||(d.cat||"other")===cat||(cat==="specs"&&["specs","other"].includes(d.cat||"other")))).forEach(d=>{let p=String(d.path||"");while(p){set.add(p);p=p.includes("/")?p.slice(0,p.lastIndexOf("/")):""}});return [...set].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))};
function folderPick(id,site,cat,cur){const fs=docFolders(site,cat);if(cur&&!fs.includes(cur))fs.push(cur);const top=({plans:"Plans & drawings",rams:"RAMS",specs:"Specs & documents"})[cat]||"the site";
  return `<label for="${id}">Folder<select id="${id}" class="fldsel"><option value="">Top of ${esc(top)}</option>${fs.map(f=>`<option value="${esc(f)}" ${f===cur?"selected":""}>📁 ${esc(f.split("/").join(" › "))}</option>`).join("")}<option value="__new">+ New folder…</option></select></label><input id="${id}-new" class="fldnew" maxlength="80" placeholder="New folder name, e.g. Structural (use / for a folder inside a folder)" hidden>`}
function folderWire(id){const sl=$(id);if(!sl)return;const nw=$(id+"-new");sl.onchange=()=>{nw.hidden=sl.value!=="__new";if(!nw.hidden)nw.focus()}}
const folderVal=id=>{const sl=$(id);if(!sl)return "";if(sl.value==="__new")return String($(id+"-new").value||"").replace(/\\/g,"/").split("/").map(x=>x.trim()).filter(Boolean).join("/");return sl.value};
/* audience: nobody ticked = only me; all trades; chosen trades; the client's portal (tick any mix) */
function audienceHtml(cur,site){const tids=teamIds().filter(id=>!String(id).startsWith("off:"));const cls=(S.clients||[]).filter(clActive);const sc=site?cls.find(c=>clientSites(c).some(x=>same(x,site))):null;const cid=cur.clientId||(sc&&sc.id)||"";
  return `<div class="flabel">Who can see it? <span class="who">(tick as many as you like. Nothing ticked = only you)</span></div>
    <label class="tick"><input type="checkbox" id="au-all" ${cur.all?"checked":""}> <span>👷 All trades on the site</span></label>
    <label class="tick"><input type="checkbox" id="au-some" ${!cur.all&&(cur.who||[]).length?"checked":""}> <span>👤 Only the trades I pick</span></label>
    <div id="au-list" class="aulist" ${!cur.all&&(cur.who||[]).length?"":"hidden"}>${tids.map(id=>`<label class="tick"><input type="checkbox" class="au-t" value="${esc(id)}" ${(cur.who||[]).includes(id)?"checked":""}> <span>${esc(nameOf(id))}</span></label>`).join("")||'<div class="who">No trades on the app yet.</div>'}</div>
    <label class="tick"><input type="checkbox" id="au-cl" ${cur.client?"checked disabled":""}> <span>🏡 The client, in their portal${cur.client?" (already sent)":""}</span></label>
    <div id="au-clbox" hidden><label>Client<select id="au-cid">${cls.map(c=>`<option value="${esc(c.id)}" ${c.id===cid?"selected":""}>${esc(c.name)}${c.site?" · "+esc(c.site):""}</option>`).join("")}</select></label><label class="tick"><input type="checkbox" id="au-ask"> <span>✍ Ask them to sign / approve it (the signed copy is filed here automatically)</span></label></div>
    <div class="who" id="au-sum"></div>`}
function audienceWire(){const sum=()=>{const a=$("au-all").checked,sm=$("au-some").checked,n=document.querySelectorAll(".au-t:checked").length,cl=$("au-cl").checked;const parts=[];if(a)parts.push("all the trades on the site");else if(sm&&n)parts.push(n+" trade"+(n===1?"":"s"));if(cl)parts.push("the client");$("au-sum").textContent="Who will see it: you"+(parts.length?", "+parts.join(", "):" only")+"."};
  $("au-all").onchange=()=>{if($("au-all").checked){$("au-some").checked=false;$("au-list").hidden=true}sum()};$("au-some").onchange=()=>{$("au-list").hidden=!$("au-some").checked;if($("au-some").checked)$("au-all").checked=false;sum()};
  document.querySelectorAll(".au-t").forEach(c=>c.onchange=sum);$("au-cl").onchange=()=>{$("au-clbox").hidden=!$("au-cl").checked;sum()};sum()}
const audienceVal=()=>{const all=$("au-all").checked;const who=!all&&$("au-some").checked?[...document.querySelectorAll(".au-t:checked")].map(c=>c.value):[];return {all,who,trades:all||who.length>0,client:$("au-cl").checked&&!$("au-cl").disabled,cid:$("au-cid")?$("au-cid").value:"",ask:$("au-ask")?$("au-ask").checked:false}};
async function audienceClient(a,rec){const cl=(S.clients||[]).find(c=>c.id===a.cid);if(!cl)return {};const src=ptSrc(cl);const did=newId();await src.addDoc(did,{title:rec.title,fileName:rec.fileName,assetId:rec.assetId,contentType:rec.contentType||"application/pdf",folder:rec.cat==="plans"?"drawings":rec.cat==="rams"?"hs":"other",note:"",sharedAt:Date.now()});const out={clientShared:Date.now(),clientId:cl.id};
  if(a.ask){const sid=newId();await src.addSign(sid,{kind:rec.cat==="rams"?"cdm":"design",title:String(rec.title).slice(0,120),details:"",docIds:[did],status:"open",created:Date.now(),site:rec.site});out.signId=sid}try{await src.bump()}catch(e){}return out}
/* change who can see a site document (and its folder) */
function cdmShare(d,after){const cat=d.cat||"other";
  openSheet(`<h3 id="sheettitle">👁 ${esc(d.title||d.fileName)}</h3><div class="who">${esc(d.site||"General")}</div>
    ${audienceHtml({all:!d._priv&&!(d.who||[]).length,who:d.who||[],client:!!d.clientShared,clientId:d.clientId},d.site)}
    <div class="flabel">Folder</div>${folderPick("sh-fold",d.site,cat==="other"?"specs":cat,d.path||"")}
    ${formFoot(false,"Save")}`,async()=>{const a=audienceVal();const path=folderVal("sh-fold");$("f-save").disabled=true;
    try{const extra={path};if(a.client)Object.assign(extra,await audienceClient(a,d));
      const wantPriv=!a.trades;const data=Object.assign({},d,extra,{who:a.all?[]:a.who});delete data.id;delete data._priv;
      if(wantPriv!==!!d._priv){if(wantPriv){data.kind="sitedoc";await S.db.doc("todos/"+newId()).set(data)}else{delete data.kind;await S.db.collection("docs").add(data)}await noBin(()=>docRef(d).delete())}
      else await docRef(d).update(Object.assign(extra,{who:a.all?[]:a.who}));
      closeForm();toast("Saved");setTimeout(()=>{render();if(after)after()},300)}catch(e){showErr("Couldn't save. Check your connection.");$("f-save").disabled=false}},null);
  audienceWire();folderWire("sh-fold")}
/* move a document to another folder */
function docMove(d){const cat=d.cat||"other";
  openSheet(`<h3 id="sheettitle">📁 Move "${esc(d.title||d.fileName)}"</h3>
    <label for="mv-cat">Section<select id="mv-cat">${[["plans","Plans & drawings"],["rams","RAMS"],["specs","Specs & documents"]].map(([k,l])=>`<option value="${k}" ${(cat==="other"?"specs":cat)===k?"selected":""}>${l}</option>`).join("")}</select></label>
    <div id="mv-fbox">${folderPick("mv-fold",d.site,cat==="other"?"specs":cat,d.path||"")}</div>
    ${formFoot(false,"Move")}`,async()=>{const path=folderVal("mv-fold");const nc=$("mv-cat").value;try{await docRef(d).update({path,cat:nc});closeForm();toast("Moved to "+(path?path.split("/").join(" › "):"the top of the folder"));render()}catch(e){showErr("Couldn't move it.")}},null);
  folderWire("mv-fold");$("mv-cat").onchange=()=>{$("mv-fbox").innerHTML=folderPick("mv-fold",d.site,$("mv-cat").value,"");folderWire("mv-fold")}}
/* who can see a drawing: filed as a PDF in the site's folder for the trades you choose, and/or the client's portal */
function drawShare(p,upd){const sd=p.siteDoc?(S.docs||[]).find(x=>x.id===p.siteDoc):null;
  openSheet(`<h3 id="sheettitle">👁 Who can see "${esc(p.title||"Drawing")}"</h3>
    ${pickField("dv-site","Site",siteNames(),p.site||"","e.g. 12 Marine Way, Exmouth",false)}
    ${audienceHtml({all:!!p.siteDoc&&!(p.seeWho||[]).length,who:p.seeWho||[],client:!!p.clientDoc,clientId:p.clientId},p.site)}
    <div class="flabel">Folder in the site's Plans & drawings</div><div id="dv-fbox">${folderPick("dv-fold",p.site,"plans",sd?sd.path||"":(p.sitePath!=null?p.sitePath:"Drawings"))}</div>
    <div class="who">Trades see it as a PDF at its scale, so they can measure it. When you change the drawing, their copy updates. To send it to one trade's own Drawings instead, use 📤 Send to a trade.</div><div class="who" id="dv-prog"></div>
    ${formFoot(false,"Save")}`,async()=>{const site=pickVal("dv-site");const a=audienceVal();const path=folderVal("dv-fold");if((a.trades||a.client)&&!site){showErr("Choose the site first.");return}$("f-save").disabled=true;$("dv-prog").textContent="Saving…";
      try{const patch={seeWho:a.all?[]:a.who,sitePath:path};if(site!==p.site)patch.site=site;let rec=null;
        if(a.trades||a.client){const f=await drawPdfFile(p);const up=await uploadFile(f,f.name);rec={site,path,cat:"plans",title:p.title||"Drawing",fileName:f.name,assetId:up.id,contentType:f.type,size:f.size,uploaded:Date.now(),fromDrawing:p.id,who:a.all?[]:a.who}}
        if(a.trades){if(p.siteDoc){try{await S.db.doc("docs/"+p.siteDoc).update(rec)}catch(e){const r=await S.db.collection("docs").add(rec);patch.siteDoc=r.id}}else{const r=await S.db.collection("docs").add(rec);patch.siteDoc=r.id}}
        else if(p.siteDoc){try{await S.db.doc("docs/"+p.siteDoc).delete()}catch(e){}patch.siteDoc=null}
        if(a.client&&rec){const o=await audienceClient(a,rec);patch.clientDoc=o.clientShared||Date.now();patch.clientId=o.clientId}
        await upd(patch);closeForm();toast(a.trades?(a.all?"All the trades on "+site:a.who.length+" trade"+(a.who.length===1?"":"s"))+" can now see it in Plans"+(path?" › "+path.split("/").join(" › "):""):"Only you"+(a.client?" and the client":"")+" can see it");render()}
      catch(e){showErr("Couldn't save. Check your connection.");$("f-save").disabled=false;$("dv-prog").textContent=""}},null);
  audienceWire();folderWire("dv-fold");const ds=$("dv-site");if(ds)ds.addEventListener("change",()=>{$("dv-fbox").innerHTML=folderPick("dv-fold",pickVal("dv-site"),"plans","Drawings");folderWire("dv-fold")})}
/* 🦺 Health & safety hub: make RAMS, RAMS on each site, risk assessments, policies, inductions */
function hsView(){const sites=siteNames().filter(liveSite);const tpl=ramsTemplates();
  const rams=n=>(S.docs||[]).filter(d=>d.cat==="rams"&&same(d.site,n)).length;
  const lg=(S.settings||{}).legal||null;const lgNew=lg&&(lg.items||[]).filter(x=>!(lg.seen||[]).includes(x.id));
  $("main").innerHTML=`<div class="card"><div class="cardbody" style="border:0"><b style="font-family:var(--f-display);font-size:18px">🏛️ CDM 2015 documents</b>
      <div class="who">Duty holder appointments, pre-construction information, construction phase plan, CDM checklist, F10 check and health &amp; safety file, filled in from the client and site you pick. One full CDM pack or separate PDFs.</div>
      ${sites.length?`<div class="actions" style="align-items:flex-end"><label style="flex:1;min-width:200px">Site<select id="hs-cdmsite">${sites.map(n=>`<option>${esc(n)}</option>`).join("")}</select></label><button type="button" class="btn primary" id="hs-cdm">🏛️ Make CDM documents</button></div><div id="hs-cdmmade"></div>`:'<div class="who">Add a site first.</div>'}</div></div>
    <div class="card"><div class="cardbody" style="border:0"><b style="font-family:var(--f-display);font-size:18px">📝 Make RAMS for a site</b>
      <div class="who">${tpl.length?`Copies your ${tpl.length} Word RAMS to a site: tick the ones the job needs and fill in the blanks (address, client, dates, first aiders…).`:"Upload your RAMS as Word files to any site first (Sites › the site › RAMS). Then you can copy them to new sites from here."}</div>
      ${sites.length?`<div class="actions" style="align-items:flex-end"><label style="flex:1;min-width:200px">Site<select id="hs-site">${sites.map(n=>`<option>${esc(n)}</option>`).join("")}</select></label><button type="button" class="btn primary" id="hs-mk" ${tpl.length?"":"disabled"}>📝 Make RAMS</button></div><div id="hs-ramsmade"></div>`:'<div class="who">Add a site first.</div>'}</div></div>
    <div class="card"><div class="cardbody" style="border:0"><b style="font-family:var(--f-display);font-size:18px">📂 RAMS on your sites</b>
      ${sites.map(n=>`<button type="button" class="incrow hs-rams" data-s="${esc(n)}" style="border-left-color:${rams(n)?"var(--ok)":"var(--danger)"}"><span><b>${esc(n)}</b><br><span class="who">${rams(n)?rams(n)+" RAMS":"No RAMS yet"} · ${indFor(n)?"Induction set up":"No induction yet"}</span></span><span aria-hidden="true">›</span></button>`).join("")||'<div class="who">No sites yet.</div>'}</div></div>
    <div class="card"><div class="cardbody" style="border:0">${raBlock(true)}</div></div>
    <div class="card"><div class="cardbody" style="border:0"><b style="font-family:var(--f-display);font-size:18px">🛡️ Policies &amp; insurance</b><div class="who">${(S.policies||[]).length} document${(S.policies||[]).length===1?"":"s"} that everyone on the app can read.</div><div class="actions"><button type="button" class="btn" id="hs-pol">Open Policies &amp; insurance ›</button><button type="button" class="btn" id="hs-inc">⚠️ Accidents &amp; near misses ›</button></div></div></div>
    <div class="card ${lgNew&&lgNew.length?"lgnew":""}"><div class="cardbody" style="border:0"><b style="font-family:var(--f-display);font-size:18px">📜 Legislation watch</b>
      <div class="who">Checked every month for changes to CDM 2015, health &amp; safety law, HSE guidance and the Building Regulations.${lg&&lg.checkedAt?` Last checked <b>${esc(stamp(lg.checkedAt))}</b>.`:" The first check runs soon."}</div>
      ${lg&&lg.summary?`<div class="notice ${lgNew&&lgNew.length?"warn":""}" style="margin:6px 0 0">${esc(lg.summary)}</div>`:""}
      ${lg&&(lg.items||[]).length?`<div class="lglist">${lg.items.map(x=>`<div class="lgi ${(lg.seen||[]).includes(x.id)?"":"new"}"><b>${esc(x.title)}</b>${x.date?` <span class="who">${esc(x.date)}</span>`:""}${(lg.seen||[]).includes(x.id)?"":' <span class="tag bad">New</span>'}<div class="who">${esc(x.summary||"")}</div>${x.action?`<div><b>What to do:</b> ${esc(x.action)}</div>`:""}${x.url?`<a href="${esc(x.url)}" target="_blank" rel="noopener">Read more ›</a>`:""}</div>`).join("")}</div>${lgNew&&lgNew.length?`<div class="actions"><button type="button" class="btn" id="hs-lgseen">✓ I've read these</button></div>`:""}`:""}</div></div>`;
  const madeList=(box,site,cdm)=>{if(!box)return;const list=(S.docs||[]).filter(d=>d.cat==="rams"&&same(d.site,site)&&(cdm?d.path==="CDM":d.path!=="CDM")&&d.assetId).sort((a,b)=>(b.uploaded||0)-(a.uploaded||0));
    box.innerHTML=list.length?`<div class="who" style="margin-top:8px"><b>${cdm?"CDM documents made":"RAMS"} for this site (${list.length})</b></div>`+list.map(d=>`<div class="hsmade" data-d="${esc(d.id)}"><span><b>${esc(d.title||d.fileName)}</b><br><span class="who">${d.uploaded?esc(ukDate(iso(new Date(d.uploaded)))):""} · ${d._priv?"🔒 Only me":"👷 Trades can see"}${d.signedRecord?" · ✍ Signed by the client":""}${cdmSignState(d)}</span></span><button type="button" class="btn hm-open">Open</button>${cdm?'<button type="button" class="btn hm-share">Share</button>':""}<button type="button" class="linkdanger hm-del">Delete</button></div>`).join(""):`<div class="who" style="margin-top:8px">Nothing ${cdm?"made":"saved"} for this site yet.</div>`;
    box.querySelectorAll(".hsmade").forEach(r=>{const d=list.find(x=>x.id===r.dataset.d);r.querySelector(".hm-open").onclick=()=>openFile(d.assetId,d.fileName||d.title,d.contentType);const sh=r.querySelector(".hm-share");if(sh)sh.onclick=()=>cdmShare(d,()=>madeList(box,site,cdm));const x=r.querySelector(".hm-del");x.onclick=async()=>{if(x.dataset.armed!=="1"){x.dataset.armed="1";x.textContent="Tap again to delete";return}
      try{await docRef(d).delete();S.assets&&S.assets.delete(d.assetId).catch(()=>{});S.docs=(S.docs||[]).filter(y=>y.id!==d.id);toast("Deleted");madeList(box,site,cdm)}catch(e){toast("Couldn't delete")}}})};
  if($("hs-cdmsite")){const f=()=>madeList($("hs-cdmmade"),$("hs-cdmsite").value,true);$("hs-cdmsite").addEventListener("change",f);f()}
  if($("hs-site")){const f=()=>madeList($("hs-ramsmade"),$("hs-site").value,false);$("hs-site").addEventListener("change",f);f()}
  if($("hs-mk"))$("hs-mk").onclick=()=>ramsMaker($("hs-site").value);if($("hs-cdm"))$("hs-cdm").onclick=()=>cdmMaker($("hs-cdmsite").value);
  if($("hs-lgseen"))$("hs-lgseen").onclick=async()=>{const lg2=Object.assign({},(S.settings||{}).legal||{});lg2.seen=(lg2.items||[]).map(x=>x.id);try{await S.db.doc("settings/app").set(Object.assign({},S.settings,{legal:lg2}));S.settings=Object.assign({},S.settings,{legal:lg2});render()}catch(e){toast("Couldn't save")}};
  $("main").querySelectorAll(".hs-rams").forEach(b=>b.onclick=()=>{S.f.proj=b.dataset.s;S.f.projList=false;S.f.pjtab="rams";S.otab="projects";store.set("jeb.otab","projects");render();window.scrollTo(0,0)});
  $("hs-pol").onclick=()=>{S.f.polf="";S.otab="policies";store.set("jeb.otab","policies");render();window.scrollTo(0,0)};
  $("hs-inc").onclick=()=>{S.f.rcat="incidents";S.otab="checks";store.set("jeb.otab","checks");render();window.scrollTo(0,0)};
  try{wireRa(true)}catch(e){}}
