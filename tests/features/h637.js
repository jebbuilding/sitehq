// Accounts charts (made-up figures): this tax year's costs (materials £2,000, vans £500, insurance £300) show in the
// 🍩 Where the money goes donut with names and £; a job with an invoice shows in 💷 Your best jobs and opens its costs. 📈 Profit each month and 📊 this year against last year.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const d0=new Date();const ty=(d0.getMonth()>3||(d0.getMonth()===3&&d0.getDate()>=6))?d0.getFullYear():d0.getFullYear()-1;
const D=ty+'-05-10',M=ty+'-05';
const extra='store["todos/acct"]={kind:"acct",accounts:[{id:"a1",name:"Business",bank:"Test Bank",opening:0}],rules:[]};'+
 'store["todos/atx-a1-'+M+'"]={kind:"acctx",acc:"a1",month:"'+M+'",tx:[{id:"t1",date:"'+D+'",desc:"Customer payment",amt:6000,cat:"sales"},{id:"t2",date:"'+D+'",desc:"Test Merchant",amt:-2000,cat:"mat"},{id:"t3",date:"'+D+'",desc:"Fuel",amt:-500,cat:"veh"},{id:"t4",date:"'+D+'",desc:"Insurer",amt:-300,cat:"ins"}]};'+
 'store["todos/atx-a1-'+(ty-1)+'-05"]={kind:"acctx",acc:"a1",month:"'+(ty-1)+'-05",tx:[{id:"y1",date:"'+(ty-1)+'-05-10",desc:"Customer payment",amt:4000,cat:"sales"},{id:"y2",date:"'+(ty-1)+'-05-12",desc:"Test Merchant",amt:-1000,cat:"mat"}]};'+
 'store["todos/sd-ch1"]={kind:"sale",type:"invoice",number:"81",date:"'+D+'",client:"Test Client",site:"12 Marine Way, Exmouth",status:"sent",lines:[{d:"Work",a:5000,vc:"S20",k:"lab"}],payments:[]};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1100}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(300);
 await p.evaluate(()=>{const S=window.__S;S.otab='accounts';S.f.act='over';S.f.acp='ty';window.render()});await p.waitForTimeout(600);
 ok(await p.locator('.acg-donut .acg-seg').count()>=3,'the donut has a slice for each cost');
 const leg=await p.innerText('.acg-leg');console.log(leg.replace(/\n+/g,' | '));
 ok(/Materials[\s\S]*£2,000/.test(leg)&&/Insurance/.test(leg),'each slice is named with its £ and share');
 const jobs=await p.innerText('.acg-jobs');console.log(jobs.replace(/\n+/g,' | '));
 ok(/Marine Way/.test(jobs)&&/£5,000/.test(jobs),'the job with the invoice is in Your best jobs');
 ok(await p.locator('.acg-line .acg-pt').count()===12,'📈 Profit each month has a point for each of the last 12 months');
 const yr=await p.innerText('.acg-card:has(.acg-yr)');console.log(yr.replace(/\n+/g,' | '));
 ok(/Money in\s*£6,000\.00\s*£4,000\.00\s*▲ 50%/.test(yr),'📊 this year against last: money in £6,000 against £4,000, up 50%');
 await p.locator('.acg-card').first().scrollIntoViewIfNeeded();await p.screenshot({path:'h637-charts.png'});
 await p.click('.acg-job');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>window.__S.f.act==='jobs'&&!!window.__S.f.jcs),'tapping a job opens its job costs');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h637: ${bad} failed`:'h637: all passed');await b.close();process.exit(bad?1:0);
})();
