// Measurements pulled away from what they measure (made-up drawing): with Measure line, drag along a wall; the bar says
// to pull it away; press again and drag up – the red line goes where the finger is, with dotted lines back to the
// wall, and letting go asks its size; another one left on the line with ✓ Leave it on the line.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},view:()=>[s,ox,oy],u:(mm)=>toUnits(mm)};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 const scr=async(x,y)=>{const bb=await p.locator('.np-cv').boundingBox();const [s,ox,oy]=await p.evaluate(()=>window.__np.view());return [bb.x+ox+x*s,bb.y+oy+y*s];};
 const drag=async(x0,y0,x1,y1)=>{const A=await scr(x0,y0),B=await scr(x1,y1);await p.mouse.move(A[0],A[1]);await p.mouse.down();await p.mouse.move(B[0],B[1],{steps:8});await p.mouse.up();await p.waitForTimeout(250);};
 await p.evaluate(()=>window.__np.set([{t:'shape',k:'wall',a:[200,300],b:[500,300],c:'#111',w:3,th:window.__np.u(100)}]));
 await p.click('.np-gt[data-gt=measure]');await p.click('.np-t[data-t=dim]');
 await drag(200,300,500,300);
 ok(await p.isVisible('.np-chainbar')&&/pull the measurement away/.test(await p.innerText('.np-chaintxt')),'after drawing it, the bar says to pull it away');
 ok(!(await p.isVisible('.dimbox .dim-skip')),'its size isn\'t asked yet');
 await drag(350,300,350,240);
 let o=await p.evaluate(()=>window.__np.get().find(x=>x.t==='dim'));
 const u50=await p.evaluate(()=>window.__np.u(50));
 ok(o&&Math.abs(Math.abs(o.off)-60)<u50+0.01,'the measurement is pulled up off the wall (offset '+(o&&Math.round(o.off))+')');
 ok(await p.isVisible('.dimbox .dim-skip'),'letting go asks its size');
 await p.click('.dimbox [type=submit]');await p.waitForTimeout(200);
 o=await p.evaluate(()=>window.__np.get().find(x=>x.t==='dim'));
 ok(/mm/.test(o.s||'')||o.auto,'the size is kept ('+(o.s||'')+')');
 await p.screenshot({path:'np-dimpull.png'});
 /* one left on the line */
 await drag(200,450,400,450);
 await p.click('.np-chainok');await p.waitForTimeout(200);
 const all=await p.evaluate(()=>window.__np.get().filter(x=>x.t==='dim'));
 ok(all.length===2&&!all[1].off&&await p.isVisible('.dimbox .dim-skip'),'✓ Leave it on the line keeps it on the line, then asks its size');
 await p.click('.dimbox .dim-skip');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h573: ${bad} failed`:'h573: all passed');await b.close();process.exit(bad?1:0);
})();
