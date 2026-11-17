// The size and length boxes stay small (made-up drawing): selecting or moving a door in a wall shows its size as a
// small tag, not the whole size bar; 📏 Size in the bottom bar opens it out; – makes it small again. A line selected
// shows its length as a small tag; 📏 Size opens the length box.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={set:(a)=>{setObjs(a);a.forEach(seatOnWall);draw();},sel:(i)=>{sel=i;draw();},u:(mm)=>toUnits(mm)};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 await p.evaluate(()=>{const u=window.__np.u;window.__np.set([{t:'shape',k:'cavity',a:[200,300],b:[200+u(6000),300],c:'#111',w:3,th:u(300)},{t:'shape',k:'door',a:[200+u(1000),300],b:[200+u(1900),300],c:'#111',w:3},{t:'line',a:[200,600],b:[500,600],c:'#111',w:3}]);window.__np.sel(1);});await p.waitForTimeout(300);
 ok(await p.isVisible('.np-opbar .nob-sum')&&!(await p.isVisible('.np-opbar .nob-w')),'a door selected shows its size as a small tag ('+await p.innerText('.np-opbar .nob-sum')+')');
 ok(await p.isVisible('.np-sb[data-a=size]'),'the bottom bar has 📏 Size');
 await p.click('.np-sb[data-a=size]');await p.waitForTimeout(200);
 ok(await p.isVisible('.np-opbar .nob-w'),'📏 Size opens the size bar');
 await p.click('.np-opbar .nob-min');await p.waitForTimeout(200);
 ok(await p.isVisible('.np-opbar .nob-sum')&&!(await p.isVisible('.np-opbar .nob-w')),'– makes it small again');
 await p.evaluate(()=>window.__np.sel(2));await p.waitForTimeout(300);
 ok(await p.isVisible('.np-lenbar .nlb-sum')&&!(await p.isVisible('.nlb-l')),'a line selected shows its length as a small tag');
 await p.click('.np-sb[data-a=size]');await p.waitForTimeout(200);
 ok(await p.isVisible('.nlb-l'),'📏 Size opens the length box');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h589: ${bad} failed`:'h589: all passed');await b.close();process.exit(bad?1:0);
})();
