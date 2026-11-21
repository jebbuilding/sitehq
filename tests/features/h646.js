// A client's estimates and invoices on their page (made-up): Sue Jones has an accepted estimate (£10,000 + VAT) and
// two invoices on 4 Rolle Road (£6,000 + VAT paid £3,000, and a draft), and one with no job; her page lists them job
// by job with agreed, invoiced, paid and still owed; tapping one opens it; + New estimate starts one for her.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/sd-cm1"]={kind:"sale",type:"estimate",number:"41",date:"2026-10-01",client:"Sue Jones",clientId:"c1",site:"4 Rolle Road, Exmouth",title:"Kitchen extension",status:"accepted",lines:[{d:"Build",a:10000,vc:"S20",k:"lab"}]};'+
 'store["todos/sd-cm2"]={kind:"sale",type:"invoice",number:"90",date:"2026-10-20",client:"Sue Jones",clientId:"c1",site:"4 Rolle Road, Exmouth",title:"Stage 1",status:"sent",lines:[{d:"Stage 1",a:6000,vc:"S20",k:"lab"}],payments:[{amt:3000,date:"2026-10-25"}]};'+
 'store["todos/sd-cm3"]={kind:"sale",type:"invoice",number:"91",date:"2026-11-02",client:"Sue Jones",clientId:"c1",title:"Garden gate",status:"draft",lines:[{d:"Gate",a:300,vc:"S20",k:"lab"}]};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1100}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{const S=window.__S;S.otab='clients';S.f.clf='all';window.render()});await p.waitForTimeout(400);
 await p.click('.abcard .cl-open[data-c=c1]');await p.waitForTimeout(600);
 ok(await p.locator('.cmy-card').count()===1,'the client page has 💰 Estimates & invoices');
 const sums=await p.innerText('.cmy-card .cmy-sums');console.log(sums.replace(/\n+/g,' | '));
 ok(/Agreed\s*£12,000\.00/.test(sums)&&/Invoiced\s*£7,200\.00/.test(sums)&&/Paid\s*£3,000\.00/.test(sums)&&/Still owed\s*£4,200\.00/.test(sums),'agreed £12,000, invoiced £7,200, paid £3,000, still owed £4,200');
 const jobs=await p.$$eval('.cmy-card .cmy-jh',x=>x.map(e=>e.textContent));console.log(jobs);
 ok(jobs.some(j=>/Rolle Road/.test(j))&&jobs.some(j=>/Not on a job yet/.test(j)),'grouped by job, and the one with no job on its own');
 const rr=await p.locator('.cmy-card .cmy-job').first().innerText();
 ok(/EST-41/.test(rr)&&/INV-90/.test(rr)&&/£4,200\.00 to pay/.test(rr),'the estimate and the invoice with what\'s left to pay');
 await p.locator('.cmy-card').scrollIntoViewIfNeeded();await p.screenshot({path:'h646-client.png'});
 await p.click('.cmy-card .cmy-row[data-id="sd-cm2"]');await p.waitForTimeout(600);
 ok(await p.isVisible('#sd-close')&&/90/.test(await p.innerText('#viewer-body')),'tapping it opens the invoice');
 await p.click('#sd-close');await p.waitForTimeout(400);
 await p.evaluate(()=>{const S=window.__S;S.otab='clients';window.render()});await p.waitForTimeout(300);
 await p.click('.abcard .cl-open[data-c=c1]');await p.waitForTimeout(600);
 await p.click('#cmy-est');await p.waitForTimeout(600);
 ok(await p.inputValue('#sd-client')==='Sue Jones','+ New estimate starts one for her');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h646: ${bad} failed`:'h646: all passed');await b.close();process.exit(bad?1:0);
})();
