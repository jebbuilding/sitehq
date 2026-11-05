/* ================= BOOT: get the platform (database, user, files, downloads), work out who is signed in, start the app ================= */
(async()=>{
  const use=n=>window.claude&&window.claude.use?window.claude.use(n).catch(()=>null):Promise.resolve(null);
  const [db,user,assets,dl]=await Promise.all([use("db"),use("user"),use("assets"),use("downloads")]);
  const id=user?await user.id():null;
  if(!db||!user||!id){
    $("weekbar").hidden=true;$("tabs").hidden=true;
    $("main").innerHTML=`<div class="empty"><strong>Sign in to use the app</strong>Open this page while signed in to claude.ai, using the email address James invited.</div>`;return;
  }
  const dl2=dl?{save:async o=>{const r=await dl.save(o);try{if(/\.pdf$/i.test((o&&o.filename)||"")){const b=o.data instanceof Blob?o.data:new Blob([o.data],{type:"application/pdf"});pdfSavedBar(b,o.filename)}}catch(e){}return r}}:null;
  Object.assign(S,{db:wrapDb(db),user,assets:wrapAssets(assets),dl:dl2,me:id});
  fcOpen().then(()=>render());
  OB.db=await obOpen(); refreshOutbox().then(flushOutbox);
  S.owner=await user.isOwner();
  db.collection("sites").onSnapshot(snap=>{S.sites=mapDocs(snap).filter(x=>x.name).sort((a,b)=>a.name.localeCompare(b.name));applyGone();render()},()=>{});
  db.collection("equipment").onSnapshot(snap=>{S.equipment=mapDocs(snap).filter(x=>x.name).sort((a,b)=>a.name.localeCompare(b.name));render()},()=>{});
  db.collection("docs").onSnapshot(snap=>{RAW.docs=mapDocs(snap);applyGone();render()},()=>{});
  db.collection("chats").onSnapshot(snap=>{RAW.chats=mapDocs(snap);applyGone();S.chatsLoaded=true;if(S.owner)syncSettings();if(CH.open)renderChatHead();render()},()=>{});
  db.doc("settings/app").onSnapshot(s=>{S.settings=s.exists?s.data():{};applyBrand();applyGone();render()},()=>{});
  db.doc("settings/weather").onSnapshot(s=>{S.wxFeed=s.exists?s.data():null;refreshNowWx()},()=>{});
  db.doc("settings/matcalc").onSnapshot(s=>{S.matcalc=s.exists?s.data():{lists:[]};if(curTab()==="calc")render()},()=>{});
  db.collection("plan").onSnapshot(snap=>{RAW.plan=mapDocs(snap).filter(p=>p.from&&p.title);applyGone();render()},()=>{});
  if(S.owner) db.collection("todos").onSnapshot(snap=>{const all=mapDocs(snap);S.todos=all.filter(t=>t.text&&!t.kind);S.suppliers=all.filter(t=>t.kind==="supplier");S.dwRates=all.find(t=>t.kind==="dwrates")||null;S.dwLines=all.filter(t=>t.kind==="dwline");S.sitejobs=all.filter(t=>t.kind==="sitejob");S.clients=all.filter(t=>t.kind==="client");S.cdmRecs=all.filter(t=>t.kind==="cdm");S.winSurveys=all.filter(t=>t.kind==="winsurvey");S.wsDesigns=all.filter(t=>t.kind==="wsdesign");S.wtns=all.filter(t=>t.kind==="wtn");S.clips=all.filter(t=>t.kind==="clip");S.brochures=all.filter(t=>t.kind==="brochure");S.samples=all.filter(t=>t.kind==="sample");S.makers=all.filter(t=>t.kind==="maker");S.qrSites=all.filter(t=>t.kind==="qrsite");S.qrCfg=all.find(t=>t.kind==="qrcfg")||null;S.gosheets=all.filter(t=>t.kind==="gosheet"&&t.signSheet);S.npTpls=all.filter(t=>t.kind==="nptpl");S.audit=all.filter(t=>t.kind==="audit");S.bin=all.filter(t=>t.kind==="bin");if(!window.__binPurgeT)window.__binPurgeT=setTimeout(()=>{try{binAutoPurge()}catch(e){}},8000);RAW.privDocs=all.filter(t=>t.kind==="sitedoc").map(t=>Object.assign({},t,{_priv:true}));setTimeout(()=>{try{soWatch()}catch(e){}},400);S.seenDoc=all.find(t=>t.kind==="seen")||null;S.suppliersLoaded=true;applyGone();scheduleSupSync();render()},()=>{});
  if(S.owner) db.collection("offapp").onSnapshot(snap=>{S.offapp=mapDocs(snap).filter(o=>o.details);render()},()=>{});
  if(S.owner) db.collection("visitinds").onSnapshot(snap=>{S.visitInds=mapDocs(snap);render()},()=>{});
  if(S.owner) db.collection("planprivate").onSnapshot(snap=>{RAW.planPrivate=mapDocs(snap).filter(p=>p.from&&p.title).map(p=>Object.assign({},p,{vis:"me"}));applyGone();render()},()=>{});
  db.collection("talks").onSnapshot(snap=>{S.talks=mapDocs(snap).filter(t=>t.title);render()},()=>{});
  db.collection("jobs").onSnapshot(snap=>{RAW.jobs=mapDocs(snap).filter(j=>j.title&&Array.isArray(j.tasks));applyGone();render();refreshJobDetail()},()=>{});
  db.collection("jobdone").onSnapshot(snap=>{const m={};mapDocs(snap).forEach(x=>{m[x.id]=x});S.jobdone=m;render();refreshJobDetail()},()=>{});
  user.name&&user.name().then(n=>{S.ownerName=n||"";if(S.owner)syncSettings()}).catch(()=>{});
  db.collection("inductions").onSnapshot(snap=>{RAW.inductions=mapDocs(snap).filter(i=>i.site&&Array.isArray(i.items));applyGone();render()},()=>{});
  if(S.owner){startOwner();startPortalOwner()}
  else{S.roleChecking=true;let pd=null;try{pd=await db.doc("portal/"+id).get()}catch(e){}S.roleChecking=false;
    if(pd&&pd.exists)startClient(pd.data());else{S.employeeStarted=true;startEmployee()}}
  render(); startNowBar(); startAi();
})();
