// Office access in Setup › People & access (made-up trade Sam Test): a "Office access: managers and accounts" part with
// what a Manager and an Accounts person can open (Jobs & clients, Estimates & invoices, People, Paperwork, Accounts,
// Estimating) and a choice for each person. James gives Accounts Estimating too and makes Sam a Manager; saved in the
// settings and noted in the changes; it says it starts working on our own server.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='setup';window.__S.f.stab='access';window.render()});await p.waitForTimeout(400);
 const t=await p.innerText('#main');
 ok(/Office access: managers and accounts/.test(t)&&/Estimates & invoices/.test(t)&&/Estimating/.test(t),'People & access has Office access, with your areas for a Manager and Accounts');
 ok(await p.isChecked('.pa-off[data-r=accounts][data-k=money]')&&!(await p.isChecked('.pa-off[data-r=accounts][data-k=estim]')),'Accounts starts with Accounts and Estimates & invoices');
 ok(/starts working when SiteHQ moves to our own server/.test(t),'it says it starts working on our own server');
 await p.check('.pa-off[data-r=accounts][data-k=estim]');await p.selectOption('.pa-offr[data-w=emp1]','manager');
 await p.locator('.pa-offr[data-w=emp1]').scrollIntoViewIfNeeded();await p.screenshot({path:OUT+'off-1-access.png'});
 await p.click('#pa-save');await p.waitForTimeout(1000);
 const o=await p.evaluate(()=>((window.__st['settings/app']||{}).access||{}).office);
 ok(o&&o.roles.accounts.areas.includes('estim')&&o.people.emp1==='manager','saved: Accounts can open Estimating, Sam is a Manager');
 ok(/Sam Test: office access Manager/.test(await p.innerText('#main')),'and noted in the changes');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h523: ${bad} failed`:'h523: all passed');await b.close();process.exit(bad?1:0);
})();
