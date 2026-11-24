// Costs onto the job by themselves (made-up job 4 Rolle Road): a tip run's £85 tip charge, and – with ＋ Add a cost –
// 36 van miles at 45p and an £240 skip, all show in the job's costs; ✕ takes a hand-added one off again.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({jcData});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1100,height:1100}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 const SITE='4 Rolle Road, Exmouth';
 await p.evaluate(async(s)=>{await window.__S.db.doc('sheets/emp1/signoffs/tr1').set({type:'tiprun',date:'2026-11-20',site:s,toName:'Example Recycling',status:'tipped',weight:'1.2',wunit:'t',fee:85,tippedDate:'2026-11-20',created:Date.now()});},SITE);
 await p.waitForTimeout(800);
 let d=await p.evaluate(s=>window.__T().jcData(s).items.map(i=>[i.desc,i.cost]),SITE);
 ok(d.some(([n,c])=>/Tip run – Example Recycling \(1\.2 t\)/.test(n)&&c===85),'the tip run\'s £85 tip charge is on the job\'s costs');
 await p.evaluate(s=>{const S=window.__S;S.otab='accounts';S.f.act='jobs';S.f.actab='jobs';S.f.jcs=s;window.render()},SITE);await p.waitForTimeout(700);
 if(!(await p.isVisible('#jc-addx'))){const t=await p.$('[data-v=jobs]');if(t){await t.click();await p.waitForTimeout(500);}await p.evaluate(s=>{window.__S.f.jcs=s;window.render()},SITE);await p.waitForTimeout(600);}
 ok(await p.isVisible('#jc-addx'),'the job\'s costs have ＋ Add a cost');
 await p.click('#jc-addx');await p.waitForTimeout(400);
 await p.click('#jcx-k [data-v=miles]');await p.fill('#jcx-d','Van to site and back, 2 days');await p.fill('#jcx-mi','36');await p.click('#f-save');await p.waitForTimeout(800);
 await p.click('#jc-addx');await p.waitForTimeout(400);
 await p.click('#jcx-k [data-v=skip]');await p.fill('#jcx-d','8 yard skip');await p.fill('#jcx-c','240');await p.click('#f-save');await p.waitForTimeout(800);
 d=await p.evaluate(s=>window.__T().jcData(s).items.map(i=>[i.desc,i.cost]),SITE);
 ok(d.some(([n,c])=>/Van to site and back, 2 days \(36 miles at £0\.45\)/.test(n)&&c===16.2),'36 van miles at 45p = £16.20 on the costs');
 ok(d.some(([n,c])=>n==='8 yard skip'&&c===240),'the £240 skip on the costs');
 ok(/8 yard skip/.test(await p.innerText('#main'))&&/Tip run/.test(await p.innerText('#main')),'and both show on the job\'s costs page');
 await p.screenshot({path:'h683-costs.png'});
 await p.click('#jc-addx');await p.waitForTimeout(400);
 await p.locator('.jcx-del').first().click();await p.locator('.jcx-del').first().click();await p.waitForTimeout(800);
 d=await p.evaluate(s=>window.__T().jcData(s).items.filter(i=>i.xid).length,SITE);
 ok(d===1,'✕ takes a hand-added cost off again');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h683: ${bad} failed`:'h683: all passed');await b.close();process.exit(bad?1:0);
})();
