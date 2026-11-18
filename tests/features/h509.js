// Adding someone without the tick (made-up people): James taps + Add a trade not on the app, types only an email and
// saves – no "tick the box" stop; the record is saved, not marked as checked with them. For a trade on the app (Sam
// Test) he changes the mobile and leaves the box unticked: saved, not confirmed, so Sam is asked to check his own
// details. With nothing at all (no name, no email) it asks for one of them.
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
 await p.evaluate(()=>{window.__S.otab='people';window.render()});await p.waitForTimeout(500);
 await p.click('#pp-add');await p.waitForTimeout(400);
 await p.fill('#dt-fullName','');await p.click('#f-save');await p.waitForTimeout(300);
 ok(/at least their name or their email/.test(await p.innerText('#sheet')),'with nothing filled in, it asks for a name or an email');
 await p.fill('#dt-email','new.trade@example.com');
 ok(!(await p.isChecked('#dt-ok'))&&/Leave it unticked/.test(await p.innerText('#sheet')),'the box is unticked, and it says that\'s fine');
 await p.locator('#dt-ok').scrollIntoViewIfNeeded();await p.screenshot({path:OUT+'det-1-email-only.png'});
 await p.click('#f-save');await p.waitForTimeout(1000);
 const off=await p.evaluate(()=>Object.entries(window.__st).filter(([k])=>/^offapp\//.test(k)).map(([k,v])=>v).find(v=>v.details&&v.details.email==='new.trade@example.com'));
 ok(!!off&&!off.details.confirmedAt&&await p.isHidden('#sheet'),'saved with just the email, not marked as checked');
 /* a trade on the app */
 await p.evaluate(()=>{window.__S.f.prole='';window.render()});await p.waitForTimeout(300);await p.evaluate(()=>{const d=document.querySelector('details[data-id="__pemp1"]');if(d)d.open=true});await p.waitForTimeout(200);await p.click('.pp-edit[data-w=emp1]');await p.waitForTimeout(400);
 await p.fill('#dt-mobile','07700 900555');
 if(await p.isChecked('#dt-ok'))await p.uncheck('#dt-ok');
 await p.click('#f-save');await p.waitForTimeout(1000);
 const d=await p.evaluate(()=>(window.__st['sheets/emp1']||{}).details||{});
 ok(d.mobile==='07700 900555'&&!d.confirmedAt,'Sam\'s details saved unticked: not confirmed, so he\'s asked to check them himself');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h509: ${bad} failed`:'h509: all passed');await b.close();process.exit(bad?1:0);
})();
