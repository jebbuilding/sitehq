// Scaffold designer (James's own, ported in), on made-up jobs: 4 Rolle Road (client Sue Jones) and a second site
// 9 Test Lane. Company details are made up (Test Builders Ltd). Walks James's checks:
// 1 opened from 🏗️ Design scaffold on the job: name, client and address filled in, the 3D model loads, tapping a
//   coupler in 3D shows the coupler;
// 2 Building & scaffold: semi with a two-storey bay, porch and conservatory (runs bridge over the conservatory and join
//   at the corners); then a row of 4 terraced houses scaffolding houses 2–3;
// 3 Trace a drawing from a picture of a plan: set the scale, trace two buildings, Scaffold round them – no AI called;
// 4 leave and come back: the design is still on that job; the second job has its own;
// 5 both PDFs: company details on them, no prices on the picking list, the client PDF shows a price only when ticked;
// 6 the team view and a trade's app have no scaffold designer and no costing;
// 7 the libraries come from SiteHQ's loaders (served offline here) – nothing else is fetched.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
/* uploads kept, so pictures saved as files can be read back (as h538) */
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {')
 .replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;')
 /* the tools-list entry's own function, to open it as Jobs & clients › Vans, tools and plant does */
 .replace('async function scfPick() {','window.__scfPick=scfPick;async function scfPick() {');
const SITE='4 Rolle Road, Exmouth',SITE2='9 Test Lane, Exmouth';
const LIBS=[['three.min','threepkg/package/build/three.min.js'],['jspdf.plugin.autotable','autotablepkg/package/dist/jspdf.plugin.autotable.min.js'],['jspdf.umd','jspdfpkg/package/dist/jspdf.umd.min.js'],['pdf.worker','pdfjspkg/package/build/pdf.worker.min.js'],['pdf.min','pdfjspkg/package/build/pdf.min.js']];
const fetched=[],blocked=[];
const route=ctx=>ctx.route(/^https?:\/\//,r=>{const u=r.request().url();const l=LIBS.find(([k])=>u.includes(k));if(l){fetched.push(l[0]);return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(l[1],'utf8')})}if(!/fonts\.(googleapis|gstatic)|api\.postcodes\.io|api\.open-meteo\.com/.test(u))blocked.push(u);return r.abort()});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1280,height:950}});ctx.setDefaultTimeout(10000);await route(ctx);
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.evaluate(async()=>{const S=window.__S;await S.db.doc('settings/app').update({company:{name:'Test Builders Ltd',address:'1 Test Street, Testtown TT1 1TT',phone:'01234 567890',email:'office@example.com',website:'www.example.com'}});await S.db.doc('sites/s9').set({name:'9 Test Lane, Exmouth'});
  const u=window.claude.use;window.__uses=[];window.claude.use=n=>{window.__uses.push(n);return u(n)}});
 await p.waitForTimeout(500);
 const D=p.locator('#scf-host');const val=id=>D.locator('#'+id).inputValue();
 const openJob=async(site)=>{await p.evaluate(s=>{const S=window.__S;S.otab='projects';S.f.proj=s;S.f.projList=false;S.f.pjtab='overview';window.render()},site);await p.waitForTimeout(600);await p.click('#jb-scaf');await D.locator('#job').waitFor();await p.waitForTimeout(800)};
 const close=async()=>{await p.click('#viewer-close');await p.waitForTimeout(1200)};
 const models=()=>p.evaluate(()=>window.__scaf.models().map(m=>({kind:m.kind,name:m.b.name,type:m.b.type,gap:!!m.gap,js:!!(m.b._js??m.b.js),je:!!(m.b._je??m.b.je),x:m.b.x,len:m.b.len,L:m.L})));
 const wings=()=>p.evaluate(()=>window.__scaf.state().wings.map(w=>({name:w.name,kind:w.kind||'',w:w.w,d:w.d})));

 /* 1 */
 await openJob(SITE);
 ok(await val('job')===SITE&&await val('client')==='Sue Jones'&&await val('site')===SITE,'opened from the job: job name, client and address filled in');
 ok(await D.locator('#job').getAttribute('readonly')!==null,'the job details come from the job (not typed again)');
 ok(!(await D.locator('#co_name').count())&&!(await D.locator('#logo').count())&&await D.locator('#signimg').count()===1,'no company details form – only the sign board upload');
 ok(!(await D.locator('#file').count())&&!(await D.locator('#jobsbtn').count())&&await D.locator('#jobfrom').count()===1,'no AI drawing upload and no own job list; Copy scaffold design from another job is there');
 await p.waitForFunction(()=>window.__scaf&&window.__scaf.T()&&window.__scaf.T().scene,null,{timeout:15000});await p.waitForTimeout(800);
 ok(await D.locator('#load').evaluate(e=>getComputedStyle(e).display)==='none'&&await D.locator('#stage canvas').count()>0,'the 3D model loads');
 const pt=await p.evaluate(()=>{const T=window.__scaf.T(),M=window.__scaf.models(),c=T.r.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();
  for(const m of T.pick){const u=m.userData;if(u.k!=='fit')continue;const q0=M[u.e]&&M[u.e].P[u.i];if(!q0||!/coupler/i.test(q0.name))continue;
   const v=new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).project(T.cam);if(Math.abs(v.x)>0.7||Math.abs(v.y)>0.6)continue;
   ray.setFromCamera(new THREE.Vector2(v.x,v.y),T.cam);const hs=ray.intersectObjects(T.pick,false);if(!hs.length)continue;let h=hs[0];const fh=hs.find(x=>x.object.userData.k==='fit'&&x.distance<hs[0].distance+0.3);if(fh)h=fh;
   const q=M[h.object.userData.e].P[h.object.userData.i];if(q&&/coupler/i.test(q.name))return{x:c.left+(v.x+1)/2*c.width,y:c.top+(1-v.y)/2*c.height,name:q.name}}return null});
 if(pt){await p.mouse.move(pt.x,pt.y);await p.mouse.down();await p.mouse.up();await p.waitForTimeout(400)}
 const selp=pt?await D.locator('#selp').innerText():'';
 ok(!!pt&&/coupler/i.test(selp)&&await D.locator('#selp').isVisible(),'tapping a coupler in 3D shows the coupler'+(pt?' ('+pt.name+')':''));
 await p.screenshot({path:'h707-3d.png'});
 await D.locator('[data-selx]').click().catch(()=>{});

 /* 2 */
 await D.locator('#q_style').selectOption('semi');await D.locator('#q_bay').selectOption('2');await D.locator('#q_porch').check();await D.locator('#q_cons').check();
 await D.locator('#q_go').click();await p.waitForTimeout(1500);
 let W=await wings(),M=await models();
 ok(['Neighbour','Two-storey bay','Porch','Conservatory'].every(n=>W.some(w=>w.name===n)),'semi: neighbour, two-storey bay, porch and conservatory drawn');
 const runs=M.filter(m=>m.kind==='run');
 ok(runs.length>=2&&runs.some(m=>m.gap),'runs set out, and one bridges over the conservatory on beams');
 ok(runs.some(m=>m.js||m.je),'runs join at the corners');
 ok(!runs.some(m=>/left/i.test(m.name)),'no scaffold on the party wall side');
 await p.screenshot({path:'h707-semi.png'});
 await D.locator('#q_style').selectOption('row');await D.locator('#q_n').fill('4');await D.locator('#q_from').fill('2');await D.locator('#q_to').fill('3');
 await D.locator('#q_go').click();await p.waitForTimeout(1500);
 W=await wings();M=await models();
 const houses=W.filter(w=>/^House \d$/.test(w.name)),front=M.find(m=>m.kind==='run'&&/front/.test(m.name));
 ok(houses.length===4,'a row of 4 terraced houses');
 ok(!!front&&/Houses 2–3/.test(front.name)&&Math.abs(front.x-houses[0].w)<0.01&&Math.abs(front.len-2*houses[0].w)<0.01,'the scaffold runs along houses 2–3 only ('+(front&&front.name)+')');
 await p.screenshot({path:'h707-row.png'});

 /* 3 */
 const nb=D.locator('#newdesign');await nb.click();await nb.click();await p.waitForTimeout(600);
 ok((await wings()).length===0,'Start a new drawing clears it');
 const plan=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=500;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,800,500);x.strokeStyle='#000';x.lineWidth=4;x.strokeRect(100,100,320,240);x.strokeRect(480,100,200,200);x.font='20px sans-serif';x.fillStyle='#000';x.fillText('8.0 m',230,90);return c.toDataURL('image/png').split(',')[1]});
 await D.locator('#tracebtn').click();await D.locator('#tracefile').setInputFiles({name:'plan.png',mimeType:'image/png',buffer:Buffer.from(plan,'base64')});await p.waitForTimeout(1200);
 ok(/Set the scale/i.test(await D.locator('#psb').innerText()),'the picture is behind the Plan and it asks for the scale');
 await D.locator('#stage').evaluate(e=>e.scrollIntoView({block:'center'}));await p.waitForTimeout(300);const box=await D.locator('#pl').boundingBox();const X0=box.x+box.width*0.3,Y0=box.y+box.height*0.35;
 await p.mouse.click(X0,Y0);await p.waitForTimeout(300);await p.mouse.click(X0+200,Y0);await p.waitForTimeout(300);
 await D.locator('#trd').fill('8');await D.locator('[data-tr="applyscale"]').click();await p.waitForTimeout(600);
 const tap=async(x,y)=>{await p.mouse.click(x,y);await p.waitForTimeout(250)};
 await tap(X0,Y0);await tap(X0+200,Y0+150);await tap(X0+250,Y0);await tap(X0+350,Y0+100);
 W=await wings();
 ok(W.length===2&&Math.abs(W[0].w/W[0].d-4/3)<0.05&&Math.abs(W[1].w/W[1].d-1)<0.05&&Math.abs(W[0].w/W[1].w-2)<0.08&&W[0].w>5&&W[0].w<11,'two buildings traced to scale ('+W.map(w=>w.w+'×'+w.d).join(', ')+' m)');
 await D.locator('[data-tr="scafall"]').click();await p.waitForTimeout(1500);
 M=await models();
 ok(M.filter(m=>m.kind==='run').length>=6,'Scaffold round them: runs round both buildings');
 ok(!(await p.evaluate(()=>window.__uses)).includes('sample'),'no AI was called');
 await p.screenshot({path:'h707-trace.png'});

 /* 4 */
 await D.locator('#ref').fill('Q-707');await p.waitForTimeout(100);
 await close();
 const rec=await p.evaluate(()=>window.__st['scaffold/job-s2']);
 ok(!!rec&&rec.site===SITE&&rec.data&&rec.data.wings.length===2&&!!rec.data.bgimgId&&!rec.data.bgimg,'saved on the job (scaffold/job-s2), with the traced drawing kept as a file');
 ok(!!rec&&!('co' in rec.data)&&!('pdf' in rec.data)&&!Object.keys(rec.data).some(k=>k[0]==='_')&&!JSON.stringify(rec.data).includes('"_'),'the firm-wide settings and worked-out values are not in the job record');
 await openJob(SITE);await p.waitForTimeout(600);
 ok((await wings()).length===2&&await val('ref')==='Q-707'&&await p.evaluate(()=>!!window.__scaf.state().bgimg),'come back: the design, ref and traced drawing are still on the job');
 await close();
 await openJob(SITE2);
 ok(await val('job')===SITE2&&(await wings()).length!==2,'the second job has its own design');
 ok(!(await p.evaluate(()=>window.__st['scaffold/job-s9'])),'just opening a job saves nothing');
 await D.locator('#jobfrom').click();await p.waitForTimeout(500);
 const picks=await p.locator('.scf-pick').allInnerTexts();
 ok(picks.length===1&&picks[0].includes(SITE),'Copy scaffold design from another job lists the job with a design');
 await p.locator('.scf-pick').first().click();await p.waitForTimeout(1500);
 ok((await wings()).length===2&&await val('job')===SITE2,'copied: the other job\'s buildings, this job\'s details');
 await close();
 const rec2=await p.evaluate(()=>window.__st['scaffold/job-s9']);
 ok(!!rec2&&rec2.site===SITE2&&rec2.data.bgimgId===rec.data.bgimgId,'the second job saved its own design (sharing the same drawing file)');

 /* 5 */
 await openJob(SITE);
 await D.locator('#crate').fill('25');await D.locator('#cpdf').uncheck();await p.waitForTimeout(300);
 const pdfText=async(btn)=>{const n=await p.evaluate(()=>(window.__dl||[]).length);await D.locator('#'+btn).click();await p.waitForFunction(n=>(window.__dl||[]).length>n,n,{timeout:30000});
  const r=await p.evaluate(async()=>{const d=window.__dl[window.__dl.length-1];const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(const x of b)s+=String.fromCharCode(x);return{fn:d.filename,b64:btoa(s)}});
  const buf=Buffer.from(r.b64,'base64');
  /* only the words written on the pages (the pictures' bytes would match anything) */
  const txt=[...buf.toString('latin1').matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map(m=>m[1].replace(/\\([0-7]{3})/g,(x,o)=>String.fromCharCode(parseInt(o,8))).replace(/\\(.)/g,'$1')).join('\n');
  return{fn:r.fn,buf,txt}};
 const pick=await pdfText('pdfPick');fs.writeFileSync('h707-picking.pdf',pick.buf);
 const cl1=await pdfText('pdfClient');fs.writeFileSync('h707-client.pdf',cl1.buf);
 await D.locator('#cpdf').check();await p.waitForTimeout(300);
 const cl2=await pdfText('pdfClient');fs.writeFileSync('h707-client-price.pdf',cl2.buf);
 const has=(t,s)=>t.includes(s);
 ok(/Picking list/.test(pick.fn)&&has(pick.txt,'Test Builders Ltd')&&has(pick.txt,'01234 567890'),'picking list PDF made, with the company details from Setup');
 ok(!/\xa3|^Price$|Rate|VAT/m.test(pick.txt),'the picking list has no prices');
 ok(has(cl1.txt,'Test Builders Ltd')&&has(cl1.txt,'Sue Jones')&&!/\xa3|^Price$/m.test(cl1.txt),'client PDF: company and client on it, no price when the box is not ticked');
 ok(/^Price$/m.test(cl2.txt)&&/\xa3/.test(cl2.txt)&&/^Total$/m.test(cl2.txt),'client PDF shows the price when ticked');
 const owned=await D.locator('.cost .only').innerText();
 ok(/Only you/.test(owned),'Costing is marked 🔒 Only you');
 await close();
 /* on the firm's letterhead (made up: a teal top 40 mm tall, a foot from 277 mm), as SiteHQ's other documents */
 await p.evaluate(async()=>{
  const pic=(h,label)=>new Promise(res=>{const c=document.createElement('canvas');c.width=840;c.height=h*4;const g=c.getContext('2d');g.fillStyle='#ffffff';g.fillRect(0,0,c.width,c.height);g.fillStyle='#0f766e';g.fillRect(0,c.height-10,c.width,10);g.font='bold 40px sans-serif';g.fillText(label,40,60);c.toBlob(res,'image/png');});
  window.__blobs.lhtop=await pic(40,'TEST BUILDERS LTD – TEST LETTERHEAD');window.__blobs.lhbot=await pic(20,'Test Builders Ltd · 1 Test Street');
  const cur=(await window.__S.db.doc('todos/salesset').get()).data()||{};
  await window.__S.db.doc('todos/salesset').set(Object.assign({},cur,{kind:'salesset',lhTop:{id:'lhtop',h:40},lhBot:{id:'lhbot',y:277,h:20}}))});
 await p.waitForTimeout(500);
 await openJob(SITE);
 const cl3=await pdfText('pdfClient');fs.writeFileSync('h707-client-lh.pdf',cl3.buf);
 ok(/\/Subtype \/Image/.test(cl3.buf.toString('latin1'))&&/^Page 1 of \d+$/m.test(cl3.txt)&&!/^Test Builders Ltd  ·/m.test(cl3.txt),'on the letterhead: its pictures, page numbers, and no second header or footer of its own');
 await close();

 /* 6 */
 await p.evaluate(()=>{const S=window.__S;S.preview=true;S.otab='projects';S.f.proj='4 Rolle Road, Exmouth';S.f.projList=false;S.f.pjtab='overview';window.render()});await p.waitForTimeout(600);
 ok(!(await p.locator('#jb-scaf').count()),'"See what the team sees": no Design scaffold button');
 await p.evaluate(()=>{window.__S.preview=false;window.render()});
 const p2=await ctx.newPage();p2.on('pageerror',e=>{console.log('ERR trade',e.message);bad++;});
 await p2.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src+'</body></html>');await p2.waitForTimeout(2200);await p2.keyboard.press('Escape');
 let tradeTxt='';for(const t of await p2.locator('.tab').all()){await t.click().catch(()=>{});await p2.waitForTimeout(250);tradeTxt+=await p2.locator('body').innerText()}
 ok(!/scaffold designer|Design scaffold|Costing/i.test(tradeTxt)&&!(await p2.locator('#scf-host').count()),'a trade\'s app has no scaffold designer and no costing');
 await p2.close();

 /* 7 */
 await openJob(SITE2);
 const pdfPlan=await p.evaluate(()=>{const d=new window.jspdf.jsPDF({unit:'mm',format:'a4',orientation:'landscape'});d.setLineWidth(1);d.rect(40,40,120,80);d.rect(180,40,60,60);const b=new Uint8Array(d.output('arraybuffer'));let s='';for(const x of b)s+=String.fromCharCode(x);return btoa(s)});
 const bg0=await p.evaluate(()=>window.__scaf.state().bgimg);
 await D.locator('#tracefile').setInputFiles({name:'plan.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdfPlan,'base64')});await p.waitForTimeout(2500);
 ok(/Set the scale/i.test(await D.locator('#psb').innerText())&&await p.evaluate(b=>{const n=window.__scaf.state().bgimg;return !!n&&n!==b},bg0),'Trace a drawing from a PDF plan: pdf.js turns its page into the picture');
 await close();
 ok(['three.min','jspdf.umd','jspdf.plugin.autotable','pdf.min'].every(k=>fetched.includes(k)),'three.js, jsPDF, autotable and pdf.js loaded through SiteHQ\'s loaders');
 ok(!blocked.length,'nothing else fetched'+(blocked.length?': '+blocked.slice(0,3).join(' '):''));
 /* 9 a scaffold for an estimate or enquiry, or on its own (James: "new scaffold for estimate or jobs not just current jobs") */
 ok(page_src.split('window.__scfPick=scfPick;').length===2,'test hook on the Scaffold designer entry found once');
 const est=()=>p.evaluate(()=>Object.entries(window.__st).filter(([k])=>/^scaffold\/est-/.test(k)).map(([k,v])=>Object.assign({k},v)));
 await p.evaluate(()=>window.__scfPick());await p.waitForTimeout(500);
 ok(await p.locator('#scf-new').isVisible()&&/Current jobs/.test(await p.locator('.dimbox').innerText()),'Scaffold designer: ＋ New scaffold, and the current jobs');
 await p.click('#scf-new');await p.waitForTimeout(300);
 await p.selectOption('#scf-cl','c2');await p.waitForTimeout(200);
 ok(await p.inputValue('#scf-nm')==='Bob Lee – Extension','picking the enquiry names it');
 await p.click('#scf-go');await D.locator('#job').waitFor();await p.waitForTimeout(1200);
 ok(await val('job')==='Bob Lee – Extension'&&await val('client')==='Bob Lee'&&await D.locator('#job').getAttribute('readonly')===null&&await D.locator('#client').getAttribute('readonly')!==null,'for an enquiry: its name can be typed, the client comes from the client');
 let E=await est();
 ok(E.length===1&&E[0].clientId==='c2'&&E[0].name==='Bob Lee – Extension'&&!E[0].site&&Array.isArray(E[0].data.blocks),'saved straight away, tied to the client, not to a job');
 await D.locator('#job').fill('Bob Lee – extension estimate');await D.locator('#bay').fill('1.8');await p.waitForTimeout(1200);
 await close();
 E=await est();
 ok(E[0].name==='Bob Lee – extension estimate'&&+E[0].data.bay===1.8,'its new name and changes are saved');
 await p.evaluate(()=>window.__scfPick());await p.waitForTimeout(300);await p.click('#scf-new');await p.waitForTimeout(300);
 await p.fill('#scf-nm','Barn at Lower Farm');await p.click('#scf-go');await D.locator('#job').waitFor();await p.waitForTimeout(800);
 ok(await D.locator('#client').getAttribute('readonly')===null,'not for a client: the client and address can be typed');
 await D.locator('#client').fill('Mr Test');await D.locator('#site').fill('Lower Farm, Testtown');await p.waitForTimeout(1200);
 await close();
 E=await est();const barn=E.find(x=>x.name==='Barn at Lower Farm');
 ok(E.length===2&&!!barn&&barn.client==='Mr Test'&&barn.siteAddr==='Lower Farm, Testtown'&&!barn.clientId,'a scaffold on its own keeps its name, client and address');
 await p.evaluate(()=>window.__scfPick());await p.waitForTimeout(800);
 const oth=await p.locator('.scf-oth').allInnerTexts();
 ok(oth.length===2&&oth.some(t=>/Bob Lee – extension estimate/.test(t)&&/Bob Lee/.test(t))&&oth.some(t=>/Barn at Lower Farm/.test(t)),'listed under Estimates and other scaffolds');
 await p.locator('.scf-oth',{hasText:'Barn at Lower Farm'}).click();await D.locator('#job').waitFor();await p.waitForTimeout(800);
 ok(await val('job')==='Barn at Lower Farm'&&await val('client')==='Mr Test'&&await val('site')==='Lower Farm, Testtown','opening it again brings it all back');
 await D.locator('#jobfrom').click();await p.waitForTimeout(500);
 ok((await p.locator('.scf-pick').allInnerTexts()).some(t=>/Bob Lee – extension estimate/.test(t)&&/Not on a job/.test(t)),'Copy scaffold design lists the estimate too');
 await p.locator('.scf-x').click();
 await close();
 /* 8 phone width, dark mode: the designer's cards take SiteHQ's dark colours and nothing runs off the side */
 await p.setViewportSize({width:430,height:900});await p.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));
 await openJob(SITE);await p.waitForTimeout(800);
 const look=await p.evaluate(()=>{const R=document.getElementById('scf-host').shadowRoot,card=R.querySelector('.card'),v=document.getElementById('viewer');return{bg:getComputedStyle(card).backgroundColor,ink:getComputedStyle(R.querySelector('.scaf')).color,over:v.scrollWidth-v.clientWidth}});
 ok(look.bg==='rgb(30, 24, 25)'&&look.ink==='rgb(241, 235, 235)','dark mode: the designer uses SiteHQ\'s dark colours ('+look.bg+')');
 ok(look.over<=1,'phone width: nothing runs off the side ('+look.over+'px)');
 await p.screenshot({path:'h707-phone-dark.png'});
 await close();
 }catch(e){console.log('ERR',e);bad++}
 await b.close();console.log(bad?`FAILED (${bad})`:'ALL PASSED');process.exit(bad?1:0)})();
