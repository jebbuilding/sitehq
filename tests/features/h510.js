// Reminders James can put off or cancel (made-up people): on People the yellow "Needs sorting" box says a person hasn't
// finished their details. ⏰ Remind me in 30 days hides it and keeps it hidden (saved owner-only); after 30 days it
// comes back. ✕ Cancel this reminder hides it for good – unless what it's about changes.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const box=async p=>(await p.locator('#wnbox').count())?await p.innerText('#wnbox'):'';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='people';window.render()});await p.waitForTimeout(500);
 const t0=await box(p);
 ok(/hasn't finished their details/.test(t0)&&/Remind me in 30 days/.test(t0)&&/Cancel this reminder/.test(t0),'the reminder has ⏰ Remind me in 30 days and ✕ Cancel this reminder');
 await p.screenshot({path:OUT+'rem-1-box.png'});
 const n0=(t0.match(/Remind me in 30 days/g)||[]).length;
 await p.locator('.wnsn[data-d="30"]').first().click();await p.waitForTimeout(800);
 const t1=await box(p);
 ok(!/hasn't finished their details/.test(t1),'Remind me in 30 days hides it');
 const rec=await p.evaluate(()=>window.__st['todos/wnsnooze']);
 const u=rec&&Object.values(rec.keys||{})[0];
 ok(rec&&rec.kind==='wnsnooze'&&u>Date.now()+29*864e5&&u<Date.now()+31*864e5,'saved for 30 days, only for James');
 await p.evaluate(()=>{window.__S.otab='today';window.render();window.__S.otab='people';window.render()});await p.waitForTimeout(400);
 ok(!/hasn't finished their details/.test(await box(p)),'and stays hidden when he comes back');
 /* 30 days on */
 await p.evaluate(()=>{const k=window.__S.wnSnooze.keys;Object.keys(k).forEach(x=>k[x]=Date.now()-1000);window.render()});await p.waitForTimeout(400);
 ok(/hasn't finished their details/.test(await box(p)),'after 30 days it comes back');
 /* cancel */
 if(n0>1){await p.locator('.wnsn[data-d="0"]').last().click();await p.waitForTimeout(800);ok(((await box(p)).match(/Remind me in 30 days/g)||[]).length===n0-1,'✕ Cancel hides that one for good');}
 await p.locator('.wnsn[data-d="0"]').first().click();await p.waitForTimeout(800);
 ok(!/hasn't finished their details/.test(await box(p))&&Object.values((await p.evaluate(()=>window.__st['todos/wnsnooze'])).keys).includes(-1),'✕ Cancel this reminder hides it for good');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h510: ${bad} failed`:'h510: all passed');await b.close();process.exit(bad?1:0);
})();
