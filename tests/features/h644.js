// Paperwork without My page, and the Calendar's jobs (made-up): Paperwork no longer lists My page (it's the Me button);
// the Calendar has 🏗 Jobs: All jobs or one, at the top of every view, and opening it from the menu shows every job.
const fs=require('fs');const {chromium}=require('playwright');
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
 await p.click('.nl-b[data-s="paper"]');await p.waitForTimeout(400);
 ok(await p.locator('#main .nl-go[data-t="me"]').count()===0,'Paperwork no longer has My page');
 ok(await p.isVisible('#me-btn'),'it is the 🙋 Me button at the top');
 /* the calendar left on one job opens on all of them from the menu */
 await p.evaluate(()=>{window.__S.f.psite='4 Rolle Road, Exmouth'});
 await p.click('.nl-b[data-s="cal"]');await p.waitForTimeout(500);
 ok(await p.isVisible('#pb-job'),'the Calendar has 🏗 Jobs at the top');
 ok(await p.inputValue('#pb-job')==='','opening it from the menu shows all jobs');
 const opts=await p.$$eval('#pb-job option',o=>o.map(x=>x.value));
 await p.selectOption('#pb-job',opts.find(v=>v));await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!!window.__S.f.psite)&&await p.inputValue('#pb-job')!=='','pick one job to see just that');
 for(const v of ['board','month','stages']){await p.click(`#pb-mode button[data-v="${v}"]`);await p.waitForTimeout(300);if(!await p.isVisible('#pb-job')){ok(false,'the job picker shows on '+v);}}
 ok(true,'the job picker is on Board, Month and Jobs');
 await p.selectOption('#pb-job','');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!window.__S.f.psite),'and back to All jobs');
 await p.screenshot({path:'h644-cal.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h644: ${bad} failed`:'h644: all passed');await b.close();process.exit(bad?1:0);
})();
