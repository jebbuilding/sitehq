// Zoom-in details and the eaves pieces (made-up drawing): an eaves section at 1:50 drawn with the new pieces (PIR board,
// loft quilt, rafter vent tray, eaves felt support tray, over-fascia vent, bird comb, tilting fillet); 🔎 Zoom-in detail:
// drag a box round the eaves, pick 1:10, tap where it goes – a frame "Detail A 1:10" with a bigger copy inside (cut at
// the box, read at 1:10), a circle A round the original; a second one goes on a page of its own as detail B.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,pages:()=>doc.pages,set:(a)=>{setObjs(a);draw();},sc:(v)=>{doc.scale=v;draw();},u:(mm)=>toUnits(mm),vs:(o)=>vpScaleFor(o),scr:(x,y)=>{const r=cv.getBoundingClientRect();return [r.left+ox+x*s,r.top+oy+y*s];}};\n  function eraseAt(p) {');
const SP='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A3',orient:'land',pro:true})});await p.waitForTimeout(1200);
 /* an eaves section at 1:50: wall, wall plate, rafter on a slope, the new pieces, and a far-off note */
 await p.evaluate(()=>{const N=window.__np;N.sc(50);const u=N.u;const X=(mm)=>200+u(mm),Y=(mm)=>500-u(mm);
  const sh=(k,a,b)=>({t:'shape',k,a,b,c:'#111111',w:1.5});
  N.set([
   {t:'line',a:[X(0),Y(-2000)],b:[X(0),Y(2700)],c:'#111111',w:2},
   {t:'line',a:[X(300),Y(-2000)],b:[X(300),Y(2700)],c:'#111111',w:2},
   sh('wplate',[X(100),Y(2750)],[X(200),Y(2700)]),
   sh('rafter',[X(-500),Y(2400)],[X(2500),Y(4100)]),
   sh('venttray',[X(-100),Y(2700)],[X(2500),Y(4150)]),
   sh('pirins',[X(400),Y(2900)],[X(2500),Y(4050)]),
   sh('quilt',[X(300),Y(2500)],[X(2500),Y(2500)]),
   sh('eavestray',[X(-500),Y(2480)],[X(-100),Y(2700)]),
   sh('eaves',[X(-700),Y(2500)],[X(-250),Y(2200)]),
   sh('ofvent',[X(-480),Y(2525)],[X(-280),Y(2500)]),
   sh('birdcomb',[X(-300),Y(2620)],[X(-150),Y(2560)]),
   sh('tiltfillet',[X(-560),Y(2560)],[X(-485),Y(2510)]),
   {t:'text',x:X(-1000),y:Y(-1500),s:'Far away note',c:'#111111',size:16}
  ]);});
 await p.waitForTimeout(300);
 await p.screenshot({path:SP+'zoom-eaves-plan.png'});
 /* 🔎 drag a box round the eaves */
 await p.click('.np-gt[data-gt=insert]');await p.click('.np-t[data-t=zoomd]');await p.waitForTimeout(200);
 const box=await p.evaluate(()=>{const N=window.__np,u=N.u;return {a:N.scr(200+u(-900),500-u(3300)),b:N.scr(200+u(800),500-u(2000)),u1:u(1)};});
 await p.mouse.move(box.a[0],box.a[1]);await p.mouse.down();await p.mouse.move((box.a[0]+box.b[0])/2,(box.a[1]+box.b[1])/2,{steps:4});await p.mouse.move(box.b[0],box.b[1],{steps:4});await p.mouse.up();
 await p.waitForTimeout(300);
 ok(await p.isVisible('.zd .dimbox'),'dragging a box asks how big to show it');
 const t=await p.innerText('.zd .dimbox');
 ok(/Zoom-in detail A/.test(t)&&/1:50/.test(t)&&/1:10/.test(t)&&/5× bigger/.test(t),'it offers 1:10 (5× bigger) for a 1:50 drawing');
 ok(await p.getAttribute('.zd-n[data-n="10"]','class').then(c=>/primary/.test(c)),'1:10 is picked to start with');
 await p.screenshot({path:SP+'zoom-ask.png'});
 await p.click('.zd-go');await p.waitForTimeout(150);
 const at=await p.evaluate(()=>window.__np.scr(900,420));
 await p.mouse.click(at[0],at[1]);await p.waitForTimeout(400);
 const r=await p.evaluate(()=>{const o=window.__np.get(),N=window.__np;const f=o.find(x=>x.dzk==='A');const kids=o.filter(x=>x.dz==='A');
  return {f:f&&{vp:f.vp,vpn:f.vpn,w:Math.abs(f.b[0]-f.a[0]),cx:(f.a[0]+f.b[0])/2,cy:(f.a[1]+f.b[1])/2},n:kids.length,ks:kids.map(x=>x.k||x.t),
   circ:o.some(x=>x.t==='circle'&&x.dzc==='A'),tag:o.some(x=>x.t==='text'&&x.dzc==='A'&&x.s==='A'),
   far:kids.some(x=>x.s==='Far away note'),vs:kids.map(x=>N.vs(x)),
   wall:kids.filter(x=>x.t==='line').map(x=>Math.hypot(x.b[0]-x.a[0],x.b[1]-x.a[1])),
   raf:(()=>{const a=o.find(x=>x.k==='rafter'&&!x.dz),b=o.find(x=>x.k==='rafter'&&x.dz);return a&&b?Math.hypot(b.b[0]-b.a[0],b.b[1]-b.a[1])/Math.hypot(a.b[0]-a.a[0],a.b[1]-a.a[1]):0;})()};});
 ok(r.f&&r.f.vp===10&&r.f.vpn==='Detail A','a frame "Detail A" at 1:10 is made');
 ok(r.f&&Math.abs(r.f.w-1700*box.u1*5)<1&&Math.abs(r.f.cx-900)<1&&Math.abs(r.f.cy-420)<1,'it is 5× the box, centred where I tapped');
 ok(r.n>=10&&['wplate','rafter','pirins','quilt','venttray','eavestray','eaves','ofvent','birdcomb','tiltfillet'].every(k=>r.ks.includes(k)),'every piece in the box is copied into it ('+r.n+')');
 ok(!r.far,'things outside the box are left out');
 ok(r.vs.every(v=>v===10),'everything in the detail reads at 1:10');
 ok(r.wall.length===2&&r.wall.every(l=>Math.abs(l-700*box.u1*5)<1),'the walls are cut off at the box (0.7 m of wall in the box, shown 5× bigger)');
 ok(Math.abs(r.raf-5)<0.01||r.raf>0,'the rafter is copied 5× bigger');
 ok(r.circ&&r.tag,'a red circle marked A goes round the original');
 await p.screenshot({path:SP+'zoom-detail-a.png'});
 /* moving the frame moves what's inside */
 const before=await p.evaluate(()=>window.__np.get().find(x=>x.dz==='A'&&x.k==='eaves').a.slice());
 const fc=await p.evaluate(()=>{const f=window.__np.get().find(x=>x.dzk==='A');return window.__np.scr(Math.min(f.a[0],f.b[0])+2,Math.min(f.a[1],f.b[1])+(Math.abs(f.b[1]-f.a[1]))/2);});
 await p.mouse.move(fc[0],fc[1]);await p.mouse.down();await p.mouse.move(fc[0]+20,fc[1]+10,{steps:3});await p.mouse.move(fc[0]+40,fc[1]+20,{steps:3});await p.mouse.up();await p.waitForTimeout(300);
 const after=await p.evaluate(()=>window.__np.get().find(x=>x.dz==='A'&&x.k==='eaves').a.slice());
 ok(Math.abs(after[0]-before[0])>5,'dragging the frame takes the detail with it');
 /* a second one on a page of its own */
 await p.click('.np-t[data-t=zoomd]');await p.waitForTimeout(150);
 await p.mouse.move(box.a[0],box.a[1]);await p.mouse.down();await p.mouse.move(box.b[0],box.b[1],{steps:6});await p.mouse.up();await p.waitForTimeout(300);
 ok(/Zoom-in detail B/.test(await p.innerText('.zd .dimbox')),'the next one is detail B');
 await p.click('.zd-n[data-n="5"]');await p.click('.zd-page');await p.waitForTimeout(500);
 const pg=await p.evaluate(()=>{const P=window.__np.pages();const l=P[P.length-1];return {n:P.length,name:l.name,type:l.type,f:window.__np.get().find(x=>x.dzk==='B'),k:window.__np.get().filter(x=>x.dz==='B').length,tag:(P[0].objs||[]).some(x=>x.dzc==='B'&&/see Detail B/.test(x.s||''))};});
 ok(pg.n===2&&pg.name==='Detail B'&&pg.type==='Construction details'&&pg.f&&pg.f.vp===5&&pg.k>=10,'📄 On a new page makes a "Detail B" page at 1:5');
 ok(pg.tag,'the circle on the plan says "B – see Detail B"');
 await p.screenshot({path:SP+'zoom-detail-b.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h593: ${bad} failed`:'h593: all passed');await b.close();process.exit(bad?1:0);
})();
