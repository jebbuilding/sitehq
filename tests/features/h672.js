// GDPR in the enquiry and the visit to see the job (made-up client Bob Lee): Edit enquiry has the privacy policy to read
// and email, a tick, name and signature; saved, it's on his record and locked (shown as signed, can't be changed by a
// save). It has the visit date and time too: on the planner with a reminder an hour before and to the phone / Outlook
// calendar; changing it moves the one visit.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({openClientForm,viewClient,saveClient});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(400);
 await p.evaluate(()=>{window.__mail=[];const o=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(/^mailto:/.test(this.href)){window.__mail.push(this.href);return}return o.call(this)};navigator.canShare=()=>false;
   window.__blobs.pol1=new Blob(['%PDF-1.4 privacy'],{type:'application/pdf'});
});
 await p.evaluate(()=>window.__S.db.doc('docs/pol1').set({cat:'policy',title:'Privacy policy (GDPR)',fileName:'Privacy policy.pdf',assetId:'pol1',contentType:'application/pdf',created:1}));await p.waitForTimeout(600);
 const bob=()=>p.evaluate(()=>window.__S.clients.find(c=>c.id==='c2'));
 const edit=async()=>{await p.evaluate(()=>window.__T().openClientForm(window.__S.clients.find(c=>c.id==='c2'),'enquiry'));await p.waitForTimeout(700);};
 await edit();
 /* GDPR in the enquiry */
 ok(await p.isVisible('.gdf-box')&&await p.isVisible('#gdf-sig')&&await p.isVisible('#gdf-ok'),'Edit enquiry has 🔒 Privacy (GDPR): the tick, their name and a signature box');
 ok(await p.isVisible('#gdf-view')&&await p.isVisible('#gdf-mail'),'with 📄 Read the privacy policy and ✉ Email it to them');
 await p.click('#gdf-mail');await p.waitForTimeout(1200);
 const m=await p.evaluate(()=>window.__mail.slice(-1)[0]||'');
 const dl=await p.evaluate(()=>(window.__dl||[]).map(d=>d.filename));
 ok(/^mailto:/.test(m)&&/privacy/i.test(decodeURIComponent(m)),'✉ Email it to them opens an email to them about the privacy policy (the file is shared or saved with it on a phone)');
 await p.click('#pdfbar-x').catch(()=>{});
 /* half done: signed but not ticked */
 const box=await p.locator('#gdf-sig').boundingBox();
 await p.locator('#gdf-sig').scrollIntoViewIfNeeded();const b2=await p.locator('#gdf-sig').boundingBox();
 await p.mouse.move(b2.x+20,b2.y+30);await p.mouse.down();for(let i=1;i<10;i++)await p.mouse.move(b2.x+20+i*15,b2.y+30+(i%2)*20);await p.mouse.up();
 await p.click('#f-save');await p.waitForTimeout(600);
 ok(/tick the box/.test(await p.innerText('#f-err')),'signed but not ticked: it asks for the tick and does not save');
 await p.check('#gdf-ok');await p.fill('#gdf-name','Bob Lee');
 /* the visit */
 const tom=await p.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+3);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')});
 ok(await p.isVisible('#cf-vd')&&await p.isVisible('#cf-vics'),'Edit enquiry has 📅 Visit to see the job, with the phone / Outlook calendar tick');
 await p.fill('#cf-vd',tom);await p.fill('#cf-vt','14:00');
 await p.click('#f-save');await p.waitForTimeout(1500);
 let c=await bob();
 ok(c.gdpr&&c.gdpr.status==='signed'&&c.gdpr.name==='Bob Lee'&&/^data:image/.test(c.gdpr.sig)&&c.gdpr.method==='in person','saved: the GDPR signature is on Bob\'s record');
 ok(c.visit&&c.visit.date===tom&&c.visit.time==='14:00','and the visit: '+JSON.stringify(c.visit));
 const plans=async()=>Object.entries(await p.evaluate(()=>window.__st)).filter(([k,v])=>v&&k.startsWith('planprivate/')&&/^Visit: Bob Lee/.test(v.title||''));
 let pl=await plans();
 ok(pl.length===1&&pl[0][1].from===tom&&pl[0][1].time==='14:00'&&pl[0][1].remind===60,'it is on the planner with a reminder an hour before');
 const ics=await p.evaluate(()=>(window.__dl||[]).some(d=>/\.ics$/.test(d.filename)));
 ok(ics,'and goes to the phone / Outlook calendar (.ics)');
 await p.click('#pdfbar-x').catch(()=>{});await p.click('#viewer-close').catch(()=>{});await p.keyboard.press('Escape');await p.waitForTimeout(300);
 /* again: locked, and the visit moves */
 await edit();
 ok(await p.isVisible('.gdf-box')&&/Signed · locked/.test(await p.innerText('.gdf-box'))&&!(await p.isVisible('#gdf-sig')),'opening it again: "✓ Signed · locked", no signature box');
 ok(await p.inputValue('#cf-vd')===tom&&await p.inputValue('#cf-vt')==='14:00'&&/Booked/.test(await p.innerText('#cf-vhead')),'the booked visit shows in the job\'s details');
 await p.fill('#cf-vt','15:30');await p.click('#f-save');await p.waitForTimeout(1500);
 pl=await plans();
 ok(pl.length===1&&pl[0][1].time==='15:30','changing the time moves it on the planner (still one visit)');
 c=await bob();
 ok(c.gdpr&&c.gdpr.name==='Bob Lee'&&c.visit.time==='15:30','the signature is unchanged');
 /* the signature can't be changed by saving the client */
 await p.evaluate(async()=>{const c=window.__S.clients.find(x=>x.id==='c2');await window.__T().saveClient(Object.assign({},c,{gdpr:{status:'signed',name:'Someone Else',at:1}}));});
 c=await bob();
 ok(c.gdpr.name==='Bob Lee','a later save can\'t change the signature');
 /* the client page: Change */
 await p.click('#pdfbar-x').catch(()=>{});
 await p.evaluate(()=>window.__T().viewClient(window.__S.clients.find(c=>c.id==='c2')));await p.waitForTimeout(700);
 ok(await p.isVisible('#cv-vchg')&&await p.isVisible('#gd-mail'),'Bob\'s page: ✎ Change on the visit, and ✉ Email it to them on the privacy box');
 await p.screenshot({path:'h672-client.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h672: ${bad} failed`:'h672: all passed');await b.close();process.exit(bad?1:0);
})();
