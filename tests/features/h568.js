// Drawing made easier (made-up drawing): ⭐ Easy shows just the tools used most; the ✨ Smart pen straightens a rough
// line, box, circle and L-shaped run, leaves handwriting alone, and Undo brings back the stroke as drawn; Corner can
// round a corner off or cut it across; a box just drawn offers Width × Depth, a line its length with → ↑ ← ↓ and a
// number pad; typing a number after drawing goes into the length; the status bar keeps a running total.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},view:()=>[s,ox,oy],scale:()=>doc.scale};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const R=(x)=>Math.round(x);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{try{localStorage.setItem('np.snap','0')}catch(e){};window.openNotePage({title:'',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 const scr=async(pts)=>{const bb=await p.locator('.np-cv').boundingBox();const [s,ox,oy]=await p.evaluate(()=>window.__np.view());return pts.map(([x,y])=>[bb.x+ox+x*s,bb.y+oy+y*s]);};
 let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647-0.5;};
 const wobbly=(pts,step,j)=>{const out=[];for(let i=1;i<pts.length;i++){const a=pts[i-1],b2=pts[i],L=Math.hypot(b2[0]-a[0],b2[1]-a[1]),n=Math.ceil(L/step);for(let k=0;k<n;k++)out.push([a[0]+(b2[0]-a[0])*k/n+rnd()*j,a[1]+(b2[1]-a[1])*k/n+rnd()*j]);}out.push(pts[pts.length-1]);return out;};
 const stroke=async(pts)=>{const S=await scr(pts);await p.mouse.move(S[0][0],S[0][1]);await p.mouse.down();for(const q of S.slice(1))await p.mouse.move(q[0],q[1]);await p.mouse.up();await p.waitForTimeout(250);};
 const clear=async()=>{await p.evaluate(()=>window.__np.set([]));};
 /* ⭐ Easy */
 await p.click('.np-gt[data-gt=easy]');await p.waitForTimeout(200);
 const shown=await p.evaluate(()=>[...document.querySelectorAll('.np-bar .np-t[data-t]')].filter(b=>b.offsetParent).map(b=>b.dataset.t));
 ok(shown.includes('smart')&&shown.includes('line')&&shown.includes('rect')&&shown.includes('room')&&shown.includes('erase')&&!shown.includes('dimc')&&!shown.includes('trim'),'⭐ Easy shows just the main tools ('+shown.join(', ')+')');
 /* ✨ Smart pen */
 await p.click('.np-t[data-t=smart]');
 await stroke(wobbly([[200,200],[500,206]],4,3));
 let o=await p.evaluate(()=>window.__np.get());
 ok(o.length===1&&o[0].t==='line'&&Math.abs(o[0].a[1]-o[0].b[1])<0.01,'a rough line becomes a straight level line');
 await clear();await stroke(wobbly([[200,200],[500,195],[505,400],[198,405],[203,202]],4,4));
 o=await p.evaluate(()=>window.__np.get());
 ok(o.length===1&&o[0].t==='rect','a rough box becomes a box ('+(o[0]&&o[0].t)+')');
 await clear();const circ=[];for(let i=0;i<=60;i++){const a=i/60*Math.PI*2;circ.push([400+Math.cos(a)*120+rnd()*4,350+Math.sin(a)*120+rnd()*4]);}await stroke(circ);
 o=await p.evaluate(()=>window.__np.get());
 ok(o.length===1&&o[0].t==='circle','a rough ring becomes a circle');
 await clear();await stroke(wobbly([[200,200],[500,204],[497,450]],4,3));
 o=await p.evaluate(()=>window.__np.get());
 ok(o.length===2&&o.every(x=>x.t==='line')&&R(o[0].b[0])===R(o[1].a[0])&&Math.abs(o[1].a[0]-o[1].b[0])<0.01,'an L becomes two straight lines meeting square');
 await p.click('.np-undo');await p.waitForTimeout(200);
 o=await p.evaluate(()=>window.__np.get());
 ok(o.length===1&&o[0].t==='stroke','Undo brings back the stroke as drawn');
 await clear();const wav=[];for(let i=0;i<150;i++)wav.push([200+i*2,300+Math.sin(i/4)*25]);await stroke(wav);
 o=await p.evaluate(()=>window.__np.get());
 ok(o.length===1&&o[0].t==='stroke','handwriting / a squiggle stays as drawn');
 /* Corner: rounded and cut */
 await p.click('.np-gt[data-gt=edit]');
 await p.evaluate(()=>window.__np.set([{t:'line',a:[200,400],b:[480,400],c:'#111',w:3},{t:'line',a:[500,380],b:[500,150],c:'#111',w:3}]));
 await p.click('.np-t[data-t=corner]');await p.waitForTimeout(200);
 ok(await p.isVisible('.np-ck'),'Corner shows Sharp / Rounded / Cut');
 await p.selectOption('.np-ck','r');await p.fill('.np-cks','1000');
 let S2=await scr([[300,400],[500,250]]);await p.mouse.click(S2[0][0],S2[0][1]);await p.waitForTimeout(150);await p.mouse.click(S2[1][0],S2[1][1]);await p.waitForTimeout(300);
 o=await p.evaluate(()=>window.__np.get());
 const sc=await p.evaluate(()=>window.__np.scale());
 ok(o.length===3&&o.some(x=>x.bend),'Rounded: the lines meet with a curve between them');
 await p.evaluate(()=>window.__np.set([{t:'line',a:[200,400],b:[480,400],c:'#111',w:3},{t:'line',a:[500,380],b:[500,150],c:'#111',w:3}]));
 await p.selectOption('.np-ck','c');
 await p.mouse.click(S2[0][0],S2[0][1]);await p.waitForTimeout(150);await p.mouse.click(S2[1][0],S2[1][1]);await p.waitForTimeout(300);
 o=await p.evaluate(()=>window.__np.get());
 const cut=o.find(x=>!x.bend&&Math.abs(x.a[0]-x.b[0])>1&&Math.abs(x.a[1]-x.b[1])>1);
 ok(o.length===3&&cut,'Cut: a straight splay across the corner');
 await p.screenshot({path:'C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/np-easy1.png'});
 /* a box just drawn: Width × Depth */
 await clear();await p.click('.np-gt[data-gt=easy]');await p.click('.np-t[data-t=rect]');
 S2=await scr([[200,200],[400,320]]);await p.mouse.move(S2[0][0],S2[0][1]);await p.mouse.down();await p.mouse.move(S2[1][0],S2[1][1],{steps:5});await p.mouse.up();await p.waitForTimeout(300);
 ok(await p.isVisible('.np-lenbar')&&await p.innerText('.nlb-ll')==='Width','a box just drawn offers Width × Depth');
 await p.fill('.nlb-l','4000');await p.fill('.nlb-a','3000');await p.click('.np-lenbar [type=submit]');await p.waitForTimeout(200);
 o=await p.evaluate(()=>window.__np.get());
 const bx=o[o.length-1];
 ok(bx.t==='rect'&&Math.abs((bx.b[0]-bx.a[0])/(bx.b[1]-bx.a[1])-4/3)<0.01,'the box is set to 4000 × 3000');
 /* a line: number pad and direction */
 await p.click('.np-t[data-t=line]');
 S2=await scr([[200,500],[350,500]]);await p.mouse.move(S2[0][0],S2[0][1]);await p.mouse.down();await p.mouse.move(S2[1][0],S2[1][1],{steps:5});await p.mouse.up();await p.waitForTimeout(300);
 ok(await p.innerText('.nlb-ll')==='Length'&&!(await p.isVisible('.nlb-pad'))&&!(await p.isVisible('.nlb-dir')),'a line offers just its Length and Angle (no number pad unless asked)');
 await p.click('.nlb-morebtn');
 ok(await p.isVisible('.nlb-dir[data-a="90"]'),'⋯ shows → ↑ ← ↓ and the number pad button');
 await p.click('.nlb-padb');
 ok(await p.evaluate(()=>{const k=document.querySelector('.nlb-k[data-k="7"]');const s=getComputedStyle(k);return s.color!==s.backgroundColor&&k.offsetParent!==null;}),'the number pad keys can be read');
 if(!(await p.isVisible('.nlb-pad')))await p.click('.nlb-padb');
 for(const k of ['2','4','0','0'])await p.click('.nlb-k[data-k="'+k+'"]');
 ok(await p.inputValue('.nlb-l')==='2400','the number pad types 2400');
 await p.click('.nlb-dir[data-a="90"]');await p.waitForTimeout(200);
 o=await p.evaluate(()=>window.__np.get());
 let ln=o[o.length-1];const per1000=(bx.b[0]-bx.a[0])/4000;
 ok(Math.abs(ln.a[0]-ln.b[0])<0.01&&Math.abs((ln.a[1]-ln.b[1])/per1000-2400)<1,'↑ makes it 2400 going straight up');
 await p.click('.nlb-padb');await p.click('.nlb-morebtn');await p.waitForTimeout(150);
 /* on a keyboard: just type the number */
 await p.click('.np-t[data-t=line]');
 S2=await scr([[600,500],[700,500]]);await p.mouse.move(S2[0][0],S2[0][1]);await p.mouse.down();await p.mouse.move(S2[1][0],S2[1][1],{steps:5});await p.mouse.up();await p.waitForTimeout(300);
 await p.keyboard.type('1500');await p.keyboard.press('Enter');await p.waitForTimeout(200);
 o=await p.evaluate(()=>window.__np.get());ln=o[o.length-1];
 ok(Math.abs(Math.hypot(ln.b[0]-ln.a[0],ln.b[1]-ln.a[1])/per1000-1500)<1,'typing 1500 then Enter sets the line to 1500');
 /* running total */
 await p.evaluate(()=>window.__np.set([{t:'room',p:[[100,100],[300,100],[300,250],[100,250]],name:'Kitchen',c:'#1e3a8a',w:2}]));await p.waitForTimeout(700);
 ok(await p.isVisible('.np-livq')&&/Floor [\d.]+ m²/.test(await p.innerText('.np-livq')),'the status bar shows the floor area so far ('+await p.innerText('.np-livq')+')');
 await p.screenshot({path:'C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/np-easy2.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h568: ${bad} failed`:'h568: all passed');await b.close();process.exit(bad?1:0);
})();
