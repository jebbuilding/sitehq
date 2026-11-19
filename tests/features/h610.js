// One site page, and a sign-off sheet from it (made-up clients, sites and photos). A job tapped in Jobs & clients, a
// site tile in Sites and a site on Today all open the same site page, at the top, on its Overview – even if another
// tab was open last time – and the page starts with the job at a glance. Its ✍️ Sign-off sheet for the client goes
// straight to that site's client, with the site's photos and documents to tick; the sent sign-off carries them and the
// site. Forms › Sign-offs still has + New sign-off sheet. Writes h610*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'state hook found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1180,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(500);
 const st=()=>p.evaluate(()=>{const S=window.__S;return {otab:S.otab,proj:S.f.proj,list:S.f.projList,tab:S.f.pjtab,job:!!document.querySelector('#main .jb-job'),y:window.scrollY}});
 /* the client's site, with a photo and a document on it */
 const site=await p.evaluate(async()=>{const S=window.__S;const c=(S.clients||[]).find(x=>x.site);const s=c.site;
   await S.db.doc('sheets/emp1/photos/h610p').set({site:s,date:'2026-11-18',takenAt:Date.now(),assetId:'a-h610p',contentType:'image/jpeg',caption:'Kitchen wall before plastering',who:'emp1'});
   await S.db.doc('docs/h610d').set({site:s,cat:'plans',title:'Kitchen layout rev B',fileName:'kitchen.pdf',assetId:'a-h610d',contentType:'application/pdf',uploaded:Date.now()});
   return s;});
 await p.waitForTimeout(600);
 /* 1. Jobs & clients: a job opens the site page */
 await p.evaluate(()=>{const S=window.__S;S.otab='sec-jobs';S.f.jbt='jobs';window.render()});await p.waitForTimeout(500);
 ok(await p.locator('#main .jb-list.jb-full').count()===1&&await p.locator('#main .jb-job').count()===0,'Jobs & clients lists the jobs (the job no longer opens beside it)');
 await p.click(`#main .jb-item[data-s="${site}"]`);await p.waitForTimeout(600);
 let s1=await st();
 ok(s1.otab==='projects'&&s1.proj===site&&s1.list===false&&s1.tab==='overview'&&s1.job,'a job in Jobs & clients opens the site page, Overview, with the job at a glance ('+JSON.stringify(s1)+')');
 ok(await p.isVisible('#main #jb-sign')&&!(await p.locator('#main #jb-open').count()),'the site page has ✍️ Sign-off sheet for the client (and no "Open the site page")');
 await p.screenshot({path:'h610-site.png'});
 /* 2. another tab left open, then Sites › tile: back on Overview */
 await p.evaluate(()=>{const S=window.__S;S.f.pjtab='photos';S.f.projList=true;window.render();window.scrollTo(0,400)});await p.waitForTimeout(400);
 await p.click(`#main .sttile[data-s="${site}"]`);await p.waitForTimeout(600);
 s1=await st();ok(s1.tab==='overview'&&s1.job&&s1.y<150,'a site tile opens the same page, on Overview at the top ('+JSON.stringify(s1)+')');
 /* 3. Today */
 await p.evaluate(()=>{const S=window.__S;S.f.pjtab='diary';S.otab='today';window.render()});await p.waitForTimeout(500);
 const td=p.locator(`#main .td-s[data-s="${site}"]`);
 if(await td.count()){await td.first().click();await p.waitForTimeout(600);s1=await st();ok(s1.otab==='projects'&&s1.tab==='overview'&&s1.job,'a site on Today opens the same page');}
 else ok(true,'(Today shows no site rows in this seed)');
 /* 4. sign-off sheet from the site page */
 await p.evaluate(s=>{const S=window.__S;S.otab='projects';S.f.proj=s;S.f.projList=false;S.f.pjtab='overview';window.render()},site);await p.waitForTimeout(500);
 await p.click('#main #jb-sign');await p.waitForTimeout(700);
 const sh=await p.innerText('#sheet');
 ok(/sign off/i.test(sh)&&/📎 From/.test(sh),'it opens the sign-off for this site\'s client, with 📎 From the site');
 ok(!(await p.isVisible('#pa-sec-site'))&&/Nothing yet/.test(await p.innerText('#pa-in')),'it starts blank: nothing in it, the site\'s things hidden until asked for');
 await p.click('#sheet .pa-open[data-s="pa-sec-site"]');await p.waitForTimeout(200);
 ok(await p.isVisible('#pa-sec-site')&&/Kitchen layout rev B/.test(await p.innerText('#pa-sec-site'))&&await p.locator('#sheet .pa-sph input').count()>=1,'📎 From the site shows its documents and photos to tick');
 await p.fill('#pa-title','Kitchen layout and plaster finish');
 await p.check('#sheet .pa-sdocs input[value="h610d"]');await p.check('#sheet .pa-sph input[value="h610p"]');
 ok(await p.locator('#pa-in .pa-inrow').count()===2,'What goes in it lists the 2 ticked');
 await p.click('#pa-in .pa-inx >> nth=0');await p.waitForTimeout(150);
 ok(await p.locator('#pa-in .pa-inrow').count()===1,'✕ takes one out before sending');
 await p.check('#sheet .pa-sdocs input[value="h610d"]');await p.check('#sheet .pa-sph input[value="h610p"]');
 ok(await p.isVisible('#sq-new')&&await p.isVisible('#jk-open')&&await p.evaluate(()=>!!document.querySelector('.pjtst #sq-new')&&!!document.querySelector('.pjtst #jk-open')),'Snag and Send job details sit in the top row with the tabs');
 await p.screenshot({path:'h610-sign.png'});
 await p.click('#f-save');await p.waitForTimeout(1200);
 const sent=await p.evaluate(()=>{const st=window.__st;const sg=Object.entries(st).find(([k,v])=>v&&v.title==='Kitchen layout and plaster finish'&&v.status==='open');
   let inline=null;if(!sg){for(const [k,v] of Object.entries(st)){for(const arr of [v&&v.ptSigns].filter(Boolean)){const x=arr.find(y=>y.title==='Kitchen layout and plaster finish');if(x)inline=x;}}}
   const x=sg?sg[1]:inline;return x?{n:(x.docIds||[]).length,site:x.site}:null;});
 ok(sent&&sent.n===2,'the sign-off is sent with the document and the photo ('+JSON.stringify(sent)+')');
 ok(sent&&sent.site===site,'and records the site');
 /* 5. Forms › Sign-offs */
 await p.evaluate(()=>{const s=document.getElementById('sheet');if(s&&!s.hidden){const x=document.getElementById('f-cancel');if(x)x.click()}});
 await p.evaluate(()=>{const v=document.getElementById('viewer');if(v&&!v.hidden)document.getElementById('viewer-close').click()});
 await p.evaluate(()=>{const S=window.__S;S.otab='signoffs';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('#so-new'),'Forms › Sign-offs has + New sign-off sheet');
 await p.click('#so-new');await p.waitForTimeout(400);
 ok(await p.locator('#so-cl option[value="__manual"]').count()===1,'which asks which client, or to type their details in');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h610: ${bad} failed`:'h610: all passed');await b.close();process.exit(bad?1:0);
})();
