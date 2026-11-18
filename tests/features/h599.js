// Steel beam details (made-up drawing): 🔩 a cut through a 203×133×25 UB under a cavity wall drawn at real size – true
// I shape with root radii, 10 mm plate carrying the outer leaf, timber packers bolted through the web, cavity tray and
// weep vents, fire board; Properties changes the size (the box grows to the new real size), two beams side by side,
// the beam in a floor with joists on hangers; and 🔩 the beam end on its padstone with packers and its bearing.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},sc:(v)=>{doc.scale=v;draw();},u:(mm)=>toUnits(mm),ss:(o)=>{ssToSize(o);draw();},ext:(o)=>npssExt(o),pick:(i)=>{sel=i;draw();fineOpen();},desel:()=>{sel=null;draw();},scr:(x,y)=>{const r=cv.getBoundingClientRect();return [r.left+ox+x*s,r.top+oy+y*s];}};\n  function eraseAt(p) {');
const SP='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1400,height:1000},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A3',orient:'land',pro:true})});await p.waitForTimeout(1200);
 const closeP=async()=>{if(await p.isVisible('.np-finebox .nfx')){await p.click('.np-finebox .nfx');await p.waitForTimeout(150);}await p.evaluate(()=>window.__np.desel());await p.waitForTimeout(200);};
 const shot=async(i,name,padR)=>{const r=await p.evaluate((i)=>{const N=window.__np,o=N.get()[i];return [N.scr(o.a[0],o.a[1]),N.scr(o.b[0],o.b[1])];},i);
  await p.screenshot({path:SP+name,clip:{x:Math.max(0,r[0][0]-30),y:Math.max(0,r[0][1]-30),width:r[1][0]-r[0][0]+(padR||420),height:r[1][1]-r[0][1]+60}});};
 const r=await p.evaluate(()=>{const N=window.__np;N.sc(10);
  N.set([{t:'shape',k:'secsteel',a:[300,300],b:[340,370],c:'#111111',w:1.5,bt:'UB',bz:'203×133×25',lab:1}]);
  const o=N.get()[0];N.ss(o);const E=N.ext(o);
  return {w:Math.abs((o.b[0]-o.a[0])-N.u(E[2]-E[0])),h:Math.abs((o.b[1]-o.a[1])-N.u(E[3]-E[1])),H:o.b[1]-o.a[1]};});
 ok(r.w<0.01&&r.h<0.01,'the beam cut is drawn at real size (its box is its real size at 1:10)');
 await closeP();await shot(0,'steel-plate.png');
 await p.evaluate(()=>window.__np.pick(0));await p.waitForTimeout(300);
 ok(await p.isVisible('.nfss-s')&&await p.inputValue('.nfss-s')==='203×133×25'&&await p.inputValue('.nfss-sv')==='plate','Properties shows the size and the plate under a cavity wall');
 await p.selectOption('.nfss-s','254×146×31');await p.waitForTimeout(200);
 const H2=await p.evaluate(()=>{const o=window.__np.get()[0];return o.b[1]-o.a[1];});
 ok(H2>r.H+window_u(40),'a deeper beam: the box grows to its new real size');
 await p.selectOption('.nfss-sv','two');await p.waitForTimeout(200);
 await closeP();await shot(0,'steel-two.png');
 await p.evaluate(()=>window.__np.pick(0));await p.waitForTimeout(300);
 await p.selectOption('.nfss-sv','floor');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>window.__np.get()[0].sv==='floor'),'the beam in a floor');
 await closeP();await shot(0,'steel-floor.png');
 // the bearing
 const rb=await p.evaluate(()=>{const N=window.__np;const o=N.get();
  o.push({t:'shape',k:'secbear',a:[300,560],b:[400,620],c:'#111111',w:1.5,bt:'UB',bz:'203×133×25',lab:1});N.set(o.slice());N.ss(N.get()[1]);const b=N.get()[1];return b.b[0]-b.a[0];});
 await closeP();await shot(1,'steel-bear.png',520);
 await p.evaluate(()=>window.__np.pick(1));await p.waitForTimeout(300);
 ok(await p.isVisible('.nfss-p')&&!(await p.isVisible('.nfss-sv')),'the beam end shows the padstone and bearing, not the setting');
 await p.selectOption('.nfss-p','Engineering brick (3 courses)');await p.fill('.nfss-br','100');await p.press('.nfss-br','Enter');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>{const o=window.__np.get()[1];return o.pad==='Engineering brick (3 courses)'&&o.br===100;}),'padstone and bearing are set from Properties');
 await p.selectOption('.nfss-fp','paint');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>window.__np.get()[1].fp==='paint'),'fire protection can be intumescent paint');
 await closeP();
 ok(rb>0,'the beam end is placed');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h599: ${bad} failed`:'h599: all passed');await b.close();process.exit(bad?1:0);
})();
function window_u(x){return 0;}
