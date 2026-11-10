// Receipts (made-up merchant "Test Merchant Ltd"): a bill for £45.60 (ref INV-123) saved as plant hire; a second copy of
// it (same total a day later) gets a duplicate warning; a newly read receipt from the same merchant takes the category
// and payment from the last one; and their October statement (INV-123 £45.60, INV-130 £210.00) is checked: INV-130 is
// missing from SiteHQ, and a £12.00 bill in SiteHQ isn't on the statement.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/rc-ta"]={kind:"acrcpt",status:"done",type:"bill",supplier:"Test Merchant Ltd",date:"2026-10-03",ref:"INV-123",total:45.6,vat:7.6,cat:"hire",paid:"acct",created:1};'+
 'store["todos/rc-tb"]={kind:"acrcpt",status:"check",type:"bill",supplier:"Test Merchant Ltd",date:"2026-10-04",total:45.6,vat:7.6,cat:"oexp",paid:"card",created:2};'+
 'store["todos/rc-tc"]={kind:"acrcpt",status:"done",type:"bill",supplier:"Test Merchant",date:"2026-10-20",ref:"INV-140",total:12,vat:2,cat:"hire",paid:"acct",created:3};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const HOOK='function rcsLearn(got) {';ok(page_src.split(HOOK).length===2,'hook found once');
page_src=page_src.replace(HOOK,'window.__learn=(g)=>rcsLearn(g);'+HOOK);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='accounts';window.__S.f.act='rcpt';window.__S.f.acrf='all';window.__S.f.acsel='rc-tb';window.render()});await p.waitForTimeout(600);
 const t=await p.innerText('#main');
 ok(/looks like a receipt you already have: Test Merchant Ltd, £45\.60 on 03\/10\/2026 \(ref INV-123\)/.test(t),'the second copy gets a duplicate warning');
 await p.click('.rcs-open');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>window.__S.f.acsel)==='rc-ta','"See the other one" opens the first');
 const L=await p.evaluate(()=>window.__learn({supplier:'TEST MERCHANT LTD',date:'2026-11-02',total:30,vat:5,cat:'oexp',paid:'card'}));
 ok(L.cat==='hire'&&L.paid==='acct'&&L.learned,'a new receipt from them takes the category and payment from the last one');
 /* the statement */
 await p.click('#rcs-stmt');await p.waitForTimeout(300);
 await p.fill('#rcs-sup','Test Merchant Ltd');await p.fill('#rcs-m','2026-10');
 await p.fill('#rcs-lines','03/10/2026  INV-123  45.60\n10/10/2026  INV-130  210.00');
 await p.click('#f-save');await p.waitForTimeout(600);
 const r=await p.innerText('#viewer-body');console.log(r.replace(/\n+/g,' | ').slice(0,400));
 ok(/1 of 2 found in SiteHQ/.test(r)&&/Statement total £255\.60/.test(r),'1 of the 2 statement lines is in SiteHQ');
 ok(/On the statement but not in SiteHQ \(1\)[\s\S]*INV-130[\s\S]*£210\.00/.test(r),'INV-130 for £210 is missing from SiteHQ');
 ok(/In SiteHQ but not on the statement \(1\)[\s\S]*INV-140[\s\S]*£12\.00/.test(r),'the £12 bill in SiteHQ isn\'t on the statement');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h482: ${bad} failed`:'h482: all passed');await b.close();process.exit(bad?1:0);
})();
