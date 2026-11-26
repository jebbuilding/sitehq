// Price history (made-up merchants and prices): Merchants › Price lists has 📈 Price history. Plasterboard went from
// £9.00 (a year ago) to £10.50 (a month ago) at one merchant and is £10.20 at another; the list shows the cheapest now and
// ▲ over 12 months; "only ones that have gone up" hides sand, which went down. Tapping it shows each merchant's prices by
// date. A purchase order's line price is in it too. Saving a price list keeps the old price (histFor).
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const D=864e5,now=Date.now();
const extra='store["todos/m1"]={kind:"supplier",name:"Example Builders Merchant",loc:"Exeter"};store["todos/m2"]={kind:"supplier",name:"Sample Timber Ltd"};'
 +'store["todos/pl-m1"]={kind:"pricelist",sup:"m1",updated:'+(now-30*D)+',items:[{n:"Plasterboard 12.5mm 2400x1200",u:"sheet",p:10.5},{n:"Sharp sand bulk bag",u:"bag",p:48}],hist:{"plasterboard 12.5mm 2400x1200":[['+(now-400*D)+',9],['+(now-30*D)+',10.5]],"sharp sand bulk bag":[['+(now-400*D)+',52],['+(now-30*D)+',48]]}};'
 +'store["todos/pl-m2"]={kind:"pricelist",sup:"m2",updated:'+(now-10*D)+',items:[{n:"Plasterboard 12.5mm 2400x1200",u:"sheet",p:10.2}]};'
 +'store["todos/po-1"]={kind:"purchaseorder",number:"PO7",sup:"m2",created:'+(now-5*D)+',lines:[{d:"CLS 3x2 2.4m",q:20,u:"length",p:3.1}],status:"sent"};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({PHI,plView});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.evaluate(()=>window.__T().plView(''));await p.waitForTimeout(300);
 await p.click('#phi-open');await p.waitForTimeout(400);
 const v=await p.innerText('#viewer');
 const pb=await p.innerText('.phi-it:has-text("Plasterboard")');
 ok(/Cheapest now £10\.20 at Sample Timber/.test(pb)&&/2 merchants/.test(pb)&&/▲ 16\.7% 12 mths/.test(pb),'plasterboard: cheapest now £10.20, ▲ 16.7% over 12 months – '+pb.replace(/\n/g,' '));
 ok(/▼ 7\.7% 12 mths/.test(await p.innerText('.phi-it:has-text("Sharp sand")')),'sand went down ▼ 7.7%');
 ok(/CLS 3x2/.test(v)&&/£3\.10/.test(v),'a purchase order line is in it');
 await p.screenshot({path:'h703-list.png'});
 await p.click('#phi-up');await p.waitForTimeout(300);
 ok(await p.locator('.phi-it').count()===1&&/Plasterboard/.test(await p.innerText('#viewer')),'only ones that have gone up: just plasterboard');
 await p.click('.phi-it');await p.waitForTimeout(300);
 const one=await p.innerText('.phi-one');
 ok(/Cheapest: Sample Timber/.test(one)&&/£9\.00/.test(one)&&/▲ 16\.7%/.test(one),'its history: each merchant, the old £9.00 and the rise');
 await p.screenshot({path:'h703-one.png'});
 const h=await p.evaluate(()=>window.__T().PHI.histFor({updated:1000,items:[{n:"Cement",p:6}]},[{n:"Cement",p:6.5},{n:"Lime",p:12}],5000));
 ok(JSON.stringify(h)==='{"cement":[[1000,6],[5000,6.5]],"lime":[[5000,12]]}','saving a list keeps the old price and the new one');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h703: ${bad} failed`:'h703: all passed');await b.close();process.exit(bad?1:0);
})();
