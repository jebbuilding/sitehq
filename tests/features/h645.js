// Estimates and invoices in their own sections (made-up): from Estimating, 💰 Estimates shows only the estimate tabs (no
// Invoices); from Accounts, 📑 Invoices shows no Estimates tab; the settings button is ⚙️ Wording, numbers, VAT & bank and
const fs=require('fs');const {chromium}=require('playwright');
// points to Setup for the letterhead and terms.
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(300);
 await p.click('.nl-b[data-s="estim"]');await p.waitForTimeout(400);await p.click('#main .nl-go[data-t="sales"]');await p.waitForTimeout(500);
 const vis=async()=>p.$$eval('#sd-tabs button',b=>b.filter(x=>x.offsetParent).map(x=>x.dataset.v));
 let v=await vis();ok(v.join()==='est,var','from Estimating: only Estimates and Variations ('+v.join()+')');
 ok(await p.locator('#main .sd-filebtn',{hasText:'Word estimate'}).count()===1,'Bring in a Word estimate is with the estimates');
 ok(/Wording, numbers, VAT & bank/.test(await p.innerText('#sd-set')),'the settings button is ⚙️ Wording, numbers, VAT & bank');
 await p.click('#sd-set');await p.waitForTimeout(400);
 ok(/Your letterhead and 📜 terms are in/.test(await p.innerText('#sheet'))&&await p.locator('#sheet .ss-lhfile').count()===0,'it points to Setup for the letterhead and terms');
 await p.click('#f-cancel');await p.waitForTimeout(200);
 await p.click('.nl-b[data-s="money"]');await p.waitForTimeout(400);await p.click('#main .nl-go[data-t="sales"]');await p.waitForTimeout(500);
 ok(await p.isHidden('#sd-tabs')&&await p.locator('#main .sd-filebtn',{hasText:'Word estimate'}).count()===0,'from Accounts: just the invoices, no Estimates tab');
 await p.screenshot({path:'h645-inv.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h645: ${bad} failed`:'h645: all passed');await b.close();process.exit(bad?1:0);
})();
