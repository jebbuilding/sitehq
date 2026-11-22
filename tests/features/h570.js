// Elevations keep up with the plan (made-up drawing): a plan of four walls, 📐 Draw the elevations makes a page for
// each side; a note added by hand on the front elevation; the plan is made 2 m longer; opening the front elevation
// draws it again from the plan – wider now – keeping the note, without adding more pages.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},pages:()=>doc.pages,pg:()=>pg,go:(i)=>{goPage(i);draw();},all:()=>elevAll(),u:(mm)=>toUnits(mm)};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 await p.evaluate(()=>{const u=window.__np.u,x0=200,y0=150,W=u(6000),D=u(4000),th=u(300);const w=(a,b2)=>({t:'shape',k:'cavity',a,b:b2,c:'#111',w:3,th});
  window.__np.set([w([x0,y0],[x0+W,y0]),w([x0+W,y0],[x0+W,y0+D]),w([x0+W,y0+D],[x0,y0+D]),w([x0,y0+D],[x0,y0])]);});
 await p.evaluate(()=>window.__np.all());await p.waitForTimeout(500);
 let pages=await p.evaluate(()=>window.__np.pages().map(x=>({n:x.name,auto:x.auto&&x.auto.side})));
 const n0=pages.length;
 ok(n0>=3&&pages.slice(1).every(x=>x.auto),'elevations drawn, each remembering its plan ('+pages.map(x=>x.n).join(', ')+')');
 const front=pages.findIndex(x=>/front/i.test(x.n));
 const widthOf=async(i)=>p.evaluate((i)=>{const o=window.__np.pages()[i].objs.filter(o=>o.au&&o.a&&o.b);const xs=o.flatMap(q=>[q.a[0],q.b[0]]);return Math.max(...xs)-Math.min(...xs);},i);
 const w0=await widthOf(front);
 /* a note by hand on the front elevation */
 await p.evaluate((i)=>window.__np.go(i),front);await p.waitForTimeout(300);
 await p.evaluate(()=>{const a=window.__np.get();a.push({t:'text',x:300,y:120,s:'Match existing bricks',c:'#111',size:20});window.__np.set(a);});
 /* back to the plan: make it 2 m longer */
 await p.evaluate(()=>window.__np.go(0));await p.waitForTimeout(300);
 await p.evaluate(()=>{const u=window.__np.u,a=window.__np.get();const d=u(2000);a[0].b[0]+=d;a[1].a[0]+=d;a[1].b[0]+=d;a[2].a[0]+=d;window.__np.set(a);});
 await p.evaluate((i)=>window.__np.go(i),front);await p.waitForTimeout(400);
 const w1=await widthOf(front);
 ok(w1>w0*1.2,'opening the front elevation draws it again from the plan, wider now ('+Math.round(w0)+' → '+Math.round(w1)+')');
 ok(await p.evaluate(()=>window.__np.get().some(o=>o.t==='text'&&o.s==='Match existing bricks')),'the note added by hand is kept');
 ok(await p.evaluate(()=>window.__np.pages().length)===n0,'no extra pages made');
 ok(/up to date with the plan/.test(await p.evaluate(()=>[...document.querySelectorAll('.toast,#toast,[role=status]')].map(x=>x.textContent).join(' '))),'it says it was brought up to date');
 await p.screenshot({path:'np-elev.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h570: ${bad} failed`:'h570: all passed');await b.close();process.exit(bad?1:0);
})();
