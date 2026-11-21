// Accounts health check (made-up data): a receipt to check, a CIS subbie not verified and an overdue customer invoice
// show at the top of Accounts › Overview; tapping the CIS one opens CIS › Subcontractors.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/cissubs"]={kind:"cissubs",subs:{"sub-pb":{name:"Pat Brick",utr:"1111111111",rate:"20",type:"sole"}}};'+
 'store["todos/rc-h1"]={kind:"acrcpt",status:"check",type:"receipt",paid:"card",date:"2026-11-01",total:50,vat:0,supplier:"Test Shop"};'+
 'store["todos/sd-h1"]={kind:"sale",type:"invoice",number:"77",date:"2026-08-01",due:"2026-08-31",client:"Test Client",status:"sent",lines:[{d:"Work",a:500,vc:"S20",k:"lab"}],payments:[]};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(300);
 await p.evaluate(()=>{const S=window.__S;S.otab='accounts';S.f.act='over';window.render()});await p.waitForTimeout(500);
 const t=await p.innerText('#main .ahc-card');console.log(t.replace(/\n+/g,' | '));
 ok(/receipt or bill to check/.test(t),'a receipt to check is listed');
 ok(/CIS subcontractor not verified/.test(t),'the unverified CIS subbie is listed');
 ok(/customer invoice overdue/.test(t),'the overdue customer invoice is listed');
 await p.screenshot({path:'h636-health.png'});
 await p.locator('#main .ahc-row',{hasText:'not verified'}).click();await p.waitForTimeout(400);
 ok(await p.evaluate(()=>window.__S.otab==='cis'&&window.__S.f.cisv==='subs'),'tapping it opens CIS › Subcontractors');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h636: ${bad} failed`:'h636: all passed');await b.close();process.exit(bad?1:0);
})();
