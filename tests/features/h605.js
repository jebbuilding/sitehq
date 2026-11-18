// A job's name everywhere (made-up job): James names 4 Rolle Road "Jones loft conversion" and it shows instead of the
// bare address on the timesheets (owner's and the trade's), the to-do site list (job name · address, the address
// still saved), a new RFI, the photo folders, the planner and search – the address stays the key underneath.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const SITE='4 Rolle Road, Exmouth',JN='Jones loft conversion';
const extra='store["plan/pjn1"]={title:"Plasterer in",type:"job",site:"4 Rolle Road, Exmouth",from:"2026-11-18",to:"2026-11-18",people:[]};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/00cdeb7f-6da0-486e-8003-08318ed39e60/scratchpad/';
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1180,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 const ohtml='<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>';
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true');localStorage.setItem('jeb.splash','1')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:ohtml}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.goto('https://sitehq.test/');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 /* name the job from the top of the site page */
 await p.evaluate(s=>{const o=document.getElementById('ohq');if(o)o.hidden=true;const S=window.__S;S.otab='projects';S.f.proj=s;S.f.projList=false;S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(500);
 await p.click('#ss-name');await p.fill('#ss-nm',JN);await p.click('#f-save');await p.waitForTimeout(800);
 ok(window_st_ok=await p.evaluate(()=>window.__st['sites/s2'].jobName)===JN&&await p.evaluate(()=>window.__st['sites/s2'].name)==='4 Rolle Road, Exmouth','the name is saved on the site; the address is unchanged');
 /* owner's timesheets */
 await p.evaluate(()=>{const S=window.__S;S.otab='time';window.render()});await p.waitForTimeout(600);
 const tm=await p.innerText('#main');
 ok(tm.includes(JN),'owner timesheets show the job name');
 await p.locator('text=Time by job').first().click().catch(()=>{});await p.waitForTimeout(300);await p.locator('text=Time by job').first().scrollIntoViewIfNeeded();await p.screenshot({path:OUT+'jobname-time.png'});
 /* to-do site list: job name · address as the words, the address as the value */
 await p.evaluate(()=>{const S=window.__S;S.otab='todo';window.render()});await p.waitForTimeout(500);
 const op=await p.evaluate(s=>{const o=[...document.querySelectorAll('#td-site option')].find(x=>x.value===s);return o?o.textContent:null},SITE);
 ok(op===JN+' · '+SITE,'to-do site list says "'+op+'"');
 await p.selectOption('#td-site',SITE);ok(await p.inputValue('#td-site')===SITE,'choosing it still picks the address');
 /* a new RFI on the site */
 await p.evaluate(()=>{const S=window.__S;S.otab='projects';S.f.pjtab='rfi';window.render()});await p.waitForTimeout(500);
 await p.click('#rfi-new');await p.waitForTimeout(400);
 ok((await p.innerText('#sheet')).includes(JN),'a new RFI is headed with the job name');
 await p.click('#f-cancel');await p.waitForTimeout(300);
 /* planner */
 await p.evaluate(()=>{const S=window.__S;S.otab='planner';S.f.pmode='where';S.f.pwday='2026-11-18';window.render()});await p.waitForTimeout(700);
 const pl=await p.innerText('#main');
 ok(pl.includes(JN),'the planner shows the job name');
 await p.screenshot({path:OUT+'jobname-planner.png',clip:{x:0,y:0,width:1180,height:560}});
 /* search */
 await p.evaluate(()=>{const b=document.getElementById('sr-btn');b&&b.click()});await p.waitForTimeout(300);
 if(await p.$('#sr-q')){await p.fill('#sr-q','jones loft');await p.waitForTimeout(500);ok((await p.innerText('body')).includes(JN),'search finds the site by its job name');await p.keyboard.press('Escape');}
 else ok(false,'search box opens');
 /* the trade sees it too */
 const t=await ctx.newPage();t.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await t.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src+'</body></html>');await t.waitForTimeout(2200);await t.keyboard.press('Escape');
 await t.evaluate(()=>window.__S.db.doc('sites/s2').update({jobName:'Jones loft conversion'}));await t.waitForTimeout(500);
 await t.evaluate(()=>{const S=window.__S;S.tab='week';window.render()});await t.waitForTimeout(600);
 const tw=await t.innerText('#main');
 ok(!/4 Rolle Road, Exmouth/.test(tw)||tw.includes(JN),'trade\'s week: no bare address where the job has a name');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h605: ${bad} failed`:'h605: all passed');await b.close();process.exit(bad?1:0);
})();
let window_st_ok;
