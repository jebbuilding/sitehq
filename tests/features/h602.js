// Moving rooms, labels and the key without their box popping up (James: "the issues with moving item and the box for
// information comes over the top is the same for other item"): with Select, tapping or dragging a selected room, tag
// label or key just moves it; a quick double tap opens its box.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},desel:()=>{sel=null;draw();},scr:(x,y)=>{const r=cv.getBoundingClientRect();return [r.left+ox+x*s,r.top+oy+y*s];}};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message,(e.stack||'').split('\n').slice(1,4).join(' | '));bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A3',orient:'land',pro:true})});await p.waitForTimeout(1200);
 await p.evaluate(()=>{const N=window.__np;N.set([
  {t:'room',p:[[200,200],[500,200],[500,420],[200,420]],c:'#444444',w:1.4,size:20,name:'Lounge'},
  {t:'shape',k:'tagbox',a:[700,250],b:[780,290],c:'#111111',w:1.5,s:'EW01'},
  {t:'shape',k:'legend',a:[850,500],b:[1050,640],c:'#111111',w:1.5}]);N.desel();});
 await p.evaluate(()=>document.querySelector('.np .np-t[data-t=move]').click());await p.waitForTimeout(200);
 const box=async()=>p.evaluate(()=>!!document.querySelector('.np .dimask'));
 const clear=async()=>p.evaluate(()=>document.querySelectorAll('.np .dimask').forEach(d=>d.remove()));
 for(const [i,name,x,y] of [[0,'room',350,310],[1,'tag label',740,270],[2,'key',950,570]]){
  const q=await p.evaluate(([x,y])=>window.__np.scr(x,y),[x,y]);
  const before=JSON.stringify(await p.evaluate((i)=>{const o=window.__np.get()[i];return o.p||o.a;},i));
  await p.mouse.click(q[0],q[1]);await p.waitForTimeout(500);
  await p.mouse.click(q[0],q[1]);await p.waitForTimeout(500);
  ok(!(await box()),`tapping a selected ${name} again does not open its box`);
  await p.mouse.move(q[0],q[1]);await p.mouse.down();await p.mouse.move(q[0]+50,q[1]+30,{steps:8});await p.mouse.up();await p.waitForTimeout(500);
  const after=JSON.stringify(await p.evaluate((i)=>{const o=window.__np.get()[i];return o.p||o.a;},i));
  ok(!(await box())&&after!==before,`dragging the ${name} moves it with no box`);
  const q2=[q[0]+50,q[1]+30];
  await p.mouse.click(q2[0],q2[1]);await p.waitForTimeout(100);await p.mouse.click(q2[0],q2[1]);await p.waitForTimeout(400);
  ok(await box(),`a quick double tap opens the ${name}'s box`);
  await clear();await p.evaluate(()=>window.__np.desel());await p.waitForTimeout(200);
 }
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h602: ${bad} failed`:'h602: all passed');await b.close();process.exit(bad?1:0);
})();
