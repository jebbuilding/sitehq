// Moving a measurement (James: "every time i try to move a measurement the measurement input tab pops up … and choose
// what side the size/number are"): dragging a selected measurement moves it without the number box; a quick double
// tap or ✏️ Change number opens the box; ⇅ Number other side puts the number on the other side of the line.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},sc:(v)=>{doc.scale=v;draw();},desel:()=>{sel=null;draw();},scr:(x,y)=>{const r=cv.getBoundingClientRect();return [r.left+ox+x*s,r.top+oy+y*s];}};\n  function eraseAt(p) {');
const SP='';
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A3',orient:'land',pro:true})});await p.waitForTimeout(1200);
 await p.evaluate(()=>{const N=window.__np;N.set([{t:'dim',a:[400,400],b:[800,400],c:'#111111',w:3,s:'4000 mm'}]);N.desel();});await p.evaluate(()=>document.querySelector('.np .np-t[data-t=move]').click());await p.waitForTimeout(200);
 const box=async()=>p.isVisible('.dimbox');
 const at=async(x,y)=>p.evaluate(([x,y])=>window.__np.scr(x,y),[x,y]);
 // tap to select it
 let q=await at(600,400);await p.mouse.click(q[0],q[1]);await p.waitForTimeout(600);
 ok(!(await box()),'tapping a measurement selects it without the number box');
 await p.screenshot({path:SP+'dim-sel.png',clip:{x:q[0]-260,y:q[1]-140,width:520,height:260}});
 // drag it while selected
 await p.mouse.move(q[0],q[1]);await p.mouse.down();await p.mouse.move(q[0]+40,q[1]+60,{steps:8});await p.mouse.up();await p.waitForTimeout(600);
 ok(!(await box()),'dragging the selected measurement does not open the number box');
 const o=await p.evaluate(()=>window.__np.get()[0]);
 ok((o.off||0)>20||o.a[1]>420,'the measurement moved');
 // double tap opens the box
 q=await at((o.a[0]+o.b[0])/2,o.a[1]);await p.mouse.click(q[0],q[1]);await p.waitForTimeout(120);await p.mouse.click(q[0],q[1]);await p.waitForTimeout(300);
 ok(await box(),'a quick double tap opens the number box');
 await p.fill('.dimbox input','4100');await p.click('.dimbox [type=submit]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>window.__np.get()[0].s)==='4100 mm','the new number is kept');
 // ✏️ button
 await p.click('.np-sb[data-a=dnum]');await p.waitForTimeout(300);
 ok(await box(),'✏️ Change number opens the number box too');
 await p.click('.dimbox .dim-skip').catch(()=>{});await p.evaluate(()=>{const d=document.querySelector('.dimask');d&&d.remove();});
 await p.evaluate(()=>{window.__np.get()[0].s='4100 mm';});
 // number other side
 await p.click('.np-sb[data-a=dside]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>window.__np.get()[0].lb===1),'⇅ Number other side puts the number under the line');
 await p.evaluate(()=>window.__np.desel());await p.waitForTimeout(200);
 await p.screenshot({path:SP+'dim-below.png',clip:{x:q[0]-260,y:q[1]-140,width:520,height:260}});
 await p.evaluate(()=>window.__np.get()[0]);
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h598: ${bad} failed`:'h598: all passed');await b.close();process.exit(bad?1:0);
})();
