// Delete a trade for good (made-up trade Sam Test, who has left): under People who have left James taps 🗑 Delete for
// good, is told what happens and confirms. Sam goes from every list; his profile goes to Deleted items for 30 days;
// his timesheets stay stored (the law says keep them).
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
 /* Sam has left */
 await p.evaluate(async()=>{await window.__S.db.doc('sheets/emp1').update({left:true,leftAt:Date.now()-864e5})});await p.waitForTimeout(400);
 const entries0=await p.evaluate(()=>Object.keys(window.__st).filter(k=>/^sheets\/emp1\/entries\//.test(k)).length);
 await p.evaluate(()=>{window.__S.otab='people';window.__S.f.prole='';window.__S.open.add('__leavers');window.render()});await p.waitForTimeout(500);
 ok(await p.locator('.lv-gone[data-w=emp1]').count()===1,'People who have left has 🗑 Delete for good');
 await p.click('.lv-gone[data-w=emp1]');await p.waitForTimeout(300);
 const t=await p.innerText('.dimbox');
 ok(/Delete Sam Test for good/.test(t)&&/Deleted items/.test(t)&&/30 days/.test(t)&&/timesheets/.test(t),'it says what happens: gone from every list, 30 days in Deleted items, work records kept');
 await p.screenshot({path:OUT+'del-1-confirm.png'});
 await p.click('#lvg-ok');await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>!window.__st['sheets/emp1']),'his profile is deleted');
 ok(await p.evaluate(()=>!Object.keys(window.__S.team).includes('emp1')),'and he\'s gone from the team');
 ok(await p.locator('.lv-gone[data-w=emp1]').count()===0,'and from People who have left');
 ok(await p.evaluate(()=>Object.entries(window.__st).some(([k,v])=>/^todos\/bin-/.test(k)&&JSON.stringify(v).includes('sheets/emp1'))),'it\'s in Deleted items for 30 days');
 const entries1=await p.evaluate(()=>Object.keys(window.__st).filter(k=>/^sheets\/emp1\/entries\//.test(k)).length);
 ok(entries1===entries0,'his timesheets are still stored ('+entries1+')');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h511: ${bad} failed`:'h511: all passed');await b.close();process.exit(bad?1:0);
})();
