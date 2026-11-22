// The eaves (made-up drawing): a warm slate roof drawn off the head of a timber frame wall runs past the wall by the
// overhang (300 mm to start with) to a plumb cut, with a fascia, soffit, gutter, over-fascia vent and a wall plate; the
// wall stops at the roof underside; Properties sets the overhang (450 mm), and 0 mitres the roof to the wall instead.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},sc:(v)=>{doc.scale=v;draw();},u:(mm)=>toUnits(mm),lib:()=>[NPSU_LIB,npsuLayers],join:(o)=>NPSU_JOIN.get(o)||null,eav:(o)=>NPSU_EAVES.get(o)||null,pick:(i)=>{sel=i;draw();fineOpen();},scr:(x,y)=>{const r=cv.getBoundingClientRect();return [r.left+ox+x*s,r.top+oy+y*s];}};\n  function eraseAt(p) {');
const SP='';
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:1000},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A3',orient:'land',pro:true})});await p.waitForTimeout(1200);
 const r=await p.evaluate(()=>{const N=window.__np;N.sc(20);const u=N.u,[Lb,lay]=N.lib();
  const mk=(key,a,b,code)=>({t:'shape',k:'secbu',a,b,c:'#111111',w:1.5,bu:lay(key),bn:Lb.find(y=>y[0]===key)[1],bc:code});
  const X0=600,Ytop=560;
  N.set([mk('tfclad',[X0,Ytop+u(2400)],[X0,Ytop],'EW01'),mk('slatewarm',[X0,Ytop],[X0+u(2000),Ytop-u(2000)],'RF01')]);
  const o=N.get(),W=N.join(o[0]),R=N.join(o[1]),E=N.eav(o[1]);
  const wallOut=X0-u(234),under=(x)=>Ytop-(x-X0)-u(88*Math.SQRT2);
  return {E:!!E,plumb:R?Math.min(R[0][0],R[3][0]):0,want:wallOut-u(300),
   wallTop:W?[W[1],W[2]].every(q=>Math.abs(q[1]-under(q[0]))<0.6):false};});
 ok(r.E,'the roof meeting the wall head gets eaves');
 ok(Math.abs(r.plumb-r.want)<0.6,'the roof runs 300 mm past the wall to a plumb cut');
 ok(r.wallTop,'the wall runs up to the underside of the rafters (the lining stops at the wall)');
 await p.waitForTimeout(300);
 {const e=await p.evaluate(()=>window.__np.scr(600-window.__np.u(600),560));await p.screenshot({path:SP+'eaves-300.png',clip:{x:e[0]-40,y:e[1]-120,width:320,height:260}});await p.screenshot({path:SP+'eaves-whole.png'});}
 await p.evaluate(()=>window.__np.pick(1));await p.waitForTimeout(300);
 ok(await p.isVisible('.nfbu-eo')&&await p.inputValue('.nfbu-eo')==='300','Properties shows the 300 mm overhang');
 await p.fill('.nfbu-eo','450');await p.press('.nfbu-eo','Enter');await p.waitForTimeout(200);
 const m=await p.evaluate(()=>{const N=window.__np,J=N.join(N.get()[1]);return [Math.min(J[0][0],J[3][0]),600-N.u(234+450)];});
 ok(Math.abs(m[0]-m[1])<0.6,'setting 450 mm moves the plumb cut further out');
 await p.fill('.nfbu-eo','0');await p.press('.nfbu-eo','Enter');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>!window.__np.eav(window.__np.get()[1])&&!!window.__np.join(window.__np.get()[1])),'0 takes the eaves off and mitres the roof to the wall');
 await p.fill('.nfbu-eo','300');await p.press('.nfbu-eo','Enter');await p.waitForTimeout(200);
 await p.keyboard.press('Escape');await p.waitForTimeout(200);
 await p.screenshot({path:SP+'eaves-whole.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h596: ${bad} failed`:'h596: all passed');await b.close();process.exit(bad?1:0);
})();
