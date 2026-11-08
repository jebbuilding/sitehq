// Job file and site inductions by person (owner).
// Job file: from an estimate, add a plan (PDF) and a photo into folders, give a supplier quote a price, and see the
// prices against the estimate (£2,000 estimate, £500 of prices: £1,500 left, 75%). Inductions: a grid of who has
// signed which site's induction – ✓ with the date, "Old" when the induction has changed since, "Needed" when they
// worked on the site without signing – and the signed record opens from the grid.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
/* a second site with an induction that has changed (version 2) since Sam signed version 1 */
const extra=`store["inductions/i2"]={site:"4 Rolle Road, Exmouth",items:["I will wear PPE."],details:{pc:"JEB"},version:2,updated:Date.now()};
store["sheets/emp1/signoffs/ind-i2-v1"]={type:"induction",inductionId:"i2",version:1,site:"4 Rolle Road, Exmouth",items:["I will wear PPE."],details:{pc:"JEB"},name:"Sam Test",worker:{},signature:"data:image/png;base64,iVBORw0KGgo=",signedAt:Date.parse("2026-09-01T09:00:00Z"),created:1};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await ctx.route(/^https?:\/\//,r=>r.abort());
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* ---- job file ---- */
 await p.click('#tabs .tab[data-t=sales]');await p.waitForTimeout(300);await p.click('#sd-tabs button[data-v=est]');await p.waitForTimeout(200);
 await p.click('#sd-new');await p.waitForTimeout(300);
 await p.fill('#sd-client','Mrs File Test');await p.fill('#sd-title','Loft conversion');
 const r0=(await p.$$('#sd-lines .sd-line'))[0];await (await r0.$('.sd-ld')).fill('Loft conversion');await (await r0.$('.sd-la')).fill('2000');
 await p.click('#sd-jf');await p.waitForTimeout(500);
 ok(await p.isVisible('.jf-page')&&/Mrs File Test · Loft conversion/.test(await p.innerText('.jf-page')),'job file opens from the estimate, tied to the client and job');
 ok((await p.$$('.jf-fold')).length===7,'folders: plans, supplier quotes, subbie quotes, photos, building control, letters, other');
 await p.selectOption('#jf-fold','plans');await p.setInputFiles('.jf-file','fixtures/clip_sheet.pdf');await p.waitForTimeout(800);
 ok(/Added 1 to Plans & drawings/.test(await lastToast()),'plan added: '+await lastToast());
 await p.selectOption('#jf-fold','supq');await p.setInputFiles('.jf-file','fixtures/test.jpg');await p.waitForTimeout(800);
 const fold=async k=>p.innerText(`.jf-fold[data-k=${k}]`);
 ok(/clip_sheet\.pdf/.test(await fold('plans'))&&/test\.jpg/.test(await fold('supq')),'each file in its folder');
 await p.click('.jf-fold[data-k=supq] .jf-edit');await p.waitForTimeout(200);
 await p.fill('#ji-n','Timber quote');await p.fill('#ji-fr','Travis Perkins');await p.fill('#ji-p','500');await p.click('#f-save');await p.waitForTimeout(500);
 const pr=await p.innerText('.jf-prices');
 ok(/Travis Perkins\s+£500\.00/.test(pr)&&/Your estimate \(before VAT\)\s+£2,000\.00/.test(pr)&&/Left for labour and profit\s+£1,500\.00 \(75%\)/.test(pr),'prices against the estimate: £1,500 left (75%)');
 const jf=Object.values(await p.evaluate(()=>window.__st)).find(v=>v&&v.kind==='jobfile');
 const est=Object.entries(await p.evaluate(()=>window.__st)).find(([k,v])=>v&&v.kind==='sale'&&v.client==='Mrs File Test');
 ok(jf&&est&&jf.estId===est[0].replace('todos/','')&&jf.items.length===2&&jf.items.find(i=>i.price===500&&i.folder==='supq'),'saved as the estimate\'s job file');
 await p.click('#jf-back');await p.waitForTimeout(300);
 ok(/Job file \(2\)/.test(await p.innerText('#sd-jf')),'the estimate shows "Job file (2)"');
 await p.click('#sd-close');await p.waitForTimeout(300);
 /* ---- inductions by person ---- */
 ok(await p.isVisible('#tabs .tab[data-t=inductions]'),'Site inductions tab (owner)');
 await p.click('#tabs .tab[data-t=inductions]');await p.waitForTimeout(400);
 const t=await p.innerText('#main');
 ok(/12 Marine Way, Exmouth/i.test(t)&&/4 Rolle Road, Exmouth/i.test(t)&&/Sam Test/i.test(t),'a column per site, a row per person');
 const row=await p.innerText('.im-t tr[data-p=emp1]');
 ok(/Needed/.test(row)&&/Old/.test(row),'Sam: worked at Marine Way without signing (Needed); Rolle Road changed since he signed (Old)');
 await p.click('.im-t tr[data-p=emp1] .im-c.old');await p.waitForTimeout(300);
 ok(/Site induction record/.test(await p.innerText('#viewer-body'))&&/4 Rolle Road/.test(await p.innerText('#viewer-body')),'tapping it opens the signed record');
 }catch(e){console.log('FAIL',String(e.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h429: '+bad+' FAILED':'h429: all passed');
 await b.close()})();
