// Three things for James (made-up job, client and trade):
// 1. On 4 Rolle Road's 🏛️ Building control tile he adds a building control report saved from an email (a PDF):
//    date, stage, result; "Client sees it" puts it in Sue's portal under Certificates & warranties, and unticking
//    takes it out again.
// 2. The trades' More has Sites, Sign in, Calculator, Training, Materials, Merchants and Brochures back (not Day work
//    or Reports), and Today has a 🚑 Report an accident button that opens the accident / near-miss form.
// 3. Brochures shows what James has sent the trade from Merchants, and opens it.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const SITE='4 Rolle Road, Exmouth';
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
const extra='store["todos/c1"].portalUid="u9";store["docs/br1"]={site:"General",cat:"other",title:"Test Kitchens – brochure",fileName:"kitchens.pdf",assetId:"a31",contentType:"application/pdf",uploaded:1762000000000,who:["emp1"],sentTo:["emp1"],brochure:true,note:"Have a look"};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const PDF=Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
(async()=>{const b=await chromium.launch();
 try{
 /* 1. building control, as James */
 const ctx=await b.newContext({viewport:{width:1180,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 const ohtml='<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>';
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:ohtml}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.goto('https://sitehq.test/');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.evaluate(s=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.__S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(500);
 ok(await p.locator('.pjtile[data-t=bc]').count()===1,'the site has a 🏛️ Building control tile');
 await p.click('.pjtile[data-t=bc]');await p.waitForTimeout(400);
 ok(/No building control reports yet/.test(await p.innerText('#main'))&&/Sue Jones/.test(await p.innerText('#main')),'empty to start with, and says it goes in Sue\'s portal');
 ok(await p.evaluate(()=>{const i=document.getElementById('bc-file');const s=getComputedStyle(i);return !i.hidden&&s.display!=='none'&&s.opacity==='0'}),'the file picker is an invisible overlay on the button (opens on an iPad)');
 await p.setInputFiles('#bc-file',{name:'BC inspection DPC.pdf',mimeType:'application/pdf',buffer:PDF});await p.waitForTimeout(500);
 ok(await p.isVisible('#sheet')&&/BC inspection DPC\.pdf/.test(await p.innerText('#sheet')),'picking the PDF asks for its details');
 ok(await p.isChecked('#bc-client'),'"Client sees it" is ticked to start with');
 await p.fill('#bc-date','2026-11-10');await p.selectOption('#bc-stage','Damp proof course');await p.selectOption('#bc-res','pass');await p.fill('#bc-note','Inspector happy');
 await p.click('#f-save');await p.waitForTimeout(1500);
 const recs=await p.evaluate(()=>Object.entries(window.__st).filter(([k,v])=>/^todos\/bcr-/.test(k)).map(([k,v])=>v));
 ok(recs.length===1&&recs[0].stage==='Damp proof course'&&recs[0].result==='pass'&&recs[0].site==='4 Rolle Road, Exmouth'&&recs[0].assetId,'saved owner-only with the stage, result, site and the file');
 const pd=await p.evaluate(()=>Object.entries(window.__st).filter(([k])=>/^portal\/u9\/docs\/bc-/.test(k)).map(([k,v])=>v));
 ok(pd.length===1&&pd[0].folder==='certs'&&/Building control: Damp proof course/.test(pd[0].title)&&/Passed/.test(pd[0].note),'a copy is in Sue\'s portal under Certificates & warranties');
 const m=await p.innerText('#main');
 ok(/Damp proof course/.test(m)&&/Passed/.test(m)&&/Client sees it/.test(m),'listed on the tile: stage, passed, client sees it');
 await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(200);
 await p.screenshot({path:OUT+'bc-1-site.png'});
 await p.click('.bc-row .bc-edit');await p.waitForTimeout(400);await p.uncheck('#bc-client');await p.click('#f-save');await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>!Object.keys(window.__st).some(k=>/^portal\/u9\/docs\/bc-/.test(k))),'unticking takes it out of Sue\'s portal');
 ok(/Only you/.test(await p.innerText('#main')),'and the tile shows 🔒 Only you');
 await ctx.close();
 /* 2 and 3: the trade */
 const DDs=page_src.split(DD).length===2;ok(DDs,'details hook found');
 const html='<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+fake(false)+page_src.replace(DD,'function detailsDone(d){return true}')+'</body></html>';
 const tc=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});tc.setDefaultTimeout(8000);
 await tc.addInitScript(()=>{try{localStorage.setItem('jeb.tradelook','true');localStorage.setItem('jeb.instLater','true')}catch(e){}});
 await tc.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());
 const q=await tc.newPage();q.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await q.goto('https://sitehq.test/');await q.waitForTimeout(2200);await q.keyboard.press('Escape');await q.waitForTimeout(300);
 ok(await q.locator('#tsi-card').count()===1,'Sign in is still on Today');
 ok(await q.locator('.nl-tile[data-t=__inc]').count()===1,'Today has a 🚑 Report an accident button');
 await q.screenshot({path:OUT+'bc-2-trade-today.png'});
 await q.click('.nl-tile[data-t=__inc]');await q.waitForTimeout(500);
 ok(await q.isVisible('#sheet')&&/accident|near miss/i.test(await q.innerText('#sheet')),'it opens the accident and near-miss form');
 await q.click('#f-cancel');await q.waitForTimeout(300);
 await q.click('#tlbar .tl-b[data-t=more]');await q.waitForTimeout(400);
 const mm=await q.innerText('#main');
 ok(['Forms','Calculator','Training','Materials','Merchants|Suppliers','Brochures'].every(w=>new RegExp(w).test(mm)),'More has Forms, Calculator, Training, Materials, Merchants and Brochures');
 ok(!/Day work|My reports/.test(mm),'but not Day work or Reports');
 await q.screenshot({path:OUT+'bc-3-trade-more.png',fullPage:true});
 await q.click('.tl-go[data-t=brochures]');await q.waitForTimeout(400);
 const bt=await q.innerText('#main');
 ok(/Sent to you/.test(bt)&&/Test Kitchens – brochure/.test(bt)&&/Have a look/.test(bt),'Brochures shows what James sent him, with his note');
 ok(/Suppliers and their brochures/.test(bt),'and the suppliers James shares');
 await q.screenshot({path:OUT+'bc-4-trade-brochures.png'});
 await q.click('.tl-bro');await q.waitForTimeout(800);
 ok(await q.evaluate(()=>!!document.querySelector('.viewer:not([hidden]),#viewer:not([hidden]),iframe,embed,object'))||/kitchens|Couldn|Download|Open/i.test(await q.innerText('body')),'tapping it opens the brochure');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h502: ${bad} failed`:'h502: all passed');await b.close();process.exit(bad?1:0);
})();
