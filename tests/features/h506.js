// James's menus (made-up data): Orders and Materials are off his menus (Jobs & clients, Paperwork, search) – trades'
// materials requests still reach him from Today. Setup has "➕ What's in + Add": he unticks Photo and ticks Day work and
// Accident or near miss, saves, and + Add then offers exactly those; Day work asks who it's for.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:950},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(500);
 await p.click('.nl-b[data-s=jobs]');await p.waitForTimeout(400);
 await p.click('.jb-tabs button[data-v=more]');await p.waitForTimeout(400);
 const jm=await p.innerText('#main');
 ok(!/Materials & tools|Orders & deliveries/.test(jm)&&/Vans, tools and plant/.test(jm)&&/Vehicles & plant/.test(jm),'Jobs & clients: no Materials or Orders; vans, tools and plant still there');
 await p.click('.nl-b[data-s=paper]');await p.waitForTimeout(400);
 ok(!/Materials/.test(await p.innerText('#main')),'Paperwork: no Materials');
 await p.evaluate(()=>{window.__S.f.merTab='mer';window.__S.otab='suppliers';window.render()});await p.waitForTimeout(400);
 ok(await p.locator('.mer-t[data-v=orders]').count()===0,'Merchants has no Orders tab');
 /* Setup › + Add */
 await p.evaluate(()=>{window.__S.f.stab='setup';window.__S.otab='setup';window.render()});await p.waitForTimeout(400);
 ok(/What's in \+ Add/.test(await p.innerText('#main'))&&await p.locator('.qa-tick').count()===11,'Setup has "What\'s in + Add" with 11 to choose from');
 ok(await p.isChecked('.qa-tick[value=photo]')&&!(await p.isChecked('.qa-tick[value=dw]')),'the usual nine are ticked to start with');
 await p.uncheck('.qa-tick[value=photo]');await p.check('.qa-tick[value=dw]');await p.check('.qa-tick[value=inc]');
 await p.locator('.qa-tick[value=dw]').scrollIntoViewIfNeeded();await p.screenshot({path:OUT+'qa-1-setup.png'});
 await p.click('#qa-save');await p.waitForTimeout(800);
 const k=await p.evaluate(()=>window.__st['settings/app'].qaItems);
 ok(Array.isArray(k)&&!k.includes('photo')&&k.includes('dw')&&k.includes('inc')&&k.length===10,'saved: '+JSON.stringify(k));
 await p.click('#nl-add');await p.waitForTimeout(300);
 const qa=await p.evaluate(()=>[...document.querySelectorAll('.qa-b')].map(x=>x.dataset.k));
 ok(!qa.includes('photo')&&qa.includes('dw')&&qa.includes('inc')&&qa.length===10,'+ Add offers what he ticked ('+qa.join(',')+')');
 await p.screenshot({path:OUT+'qa-2-add.png'});
 await p.click('.qa-b[data-k=dw]');await p.waitForTimeout(400);
 ok(/Add day work/.test(await p.innerText('#sheet')),'Day work asks who it\'s for');
 await p.click('#f-cancel');await p.waitForTimeout(200);
 /* search */
 await p.evaluate(()=>{const b=document.getElementById('sr-btn');b&&b.click()});await p.waitForTimeout(300);
 const inp=await p.$('#sr-q');if(inp){await inp.fill('materials');await p.waitForTimeout(400);console.log(jm.slice(0,600));ok(!/Materials & tools/.test(await p.innerText('body')),'search doesn\'t offer Materials');}
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h506: ${bad} failed`:'h506: all passed');await b.close();process.exit(bad?1:0);
})();
