// Build-ups tie together (made-up drawing): a timber frame wall drawn up its inside face, a warm slate roof off the
// wall head, an upper floor run into the wall and a ground slab under it. The wall and roof meet in a mitre (the same
// outer corner point), the floor stops at the wall's inside face, the wall stands on the slab's top face, and a
// build-up on its own is drawn as before.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},sc:(v)=>{doc.scale=v;draw();},u:(mm)=>toUnits(mm),lib:()=>[NPSU_LIB,npsuLayers],join:(o)=>NPSU_JOIN.get(o)||null};\n  function eraseAt(p) {');
const SP='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:1000},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A3',orient:'land',pro:true})});await p.waitForTimeout(1200);
 const r=await p.evaluate(()=>{const N=window.__np;N.sc(20);const u=N.u,[Lb,lay]=N.lib();
  const mk=(key,a,b,code,x)=>Object.assign({t:'shape',k:'secbu',a,b,c:'#111111',w:1.5,bu:lay(key),bn:Lb.find(y=>y[0]===key)[1],bc:code},x||{});
  const X0=330,Ytop=230,Yf=Ytop+u(150),Yslab=Ytop+u(2700);
  const slabT=u(150+25+100+100+65+10);
  const wall=mk('tfclad',[X0,Yslab-slabT],[X0,Ytop],'EW01');
  const roof=mk('slatewarm',[X0,Ytop],[X0+u(2000),Ytop-u(2000)],'RF01');
  const floor=mk('upfloor',[X0,Yf],[X0+u(3200),Yf],'FF01');
  const slab=mk('gslab',[X0-u(600),Yslab],[X0+u(3200),Yslab],'GF01');
  const lone=mk('cavbrick',[X0+u(5000),Yslab-u(400)],[X0+u(5000),Yslab-u(2400)],'EW02');
  N.set([wall,roof,floor,slab,lone]);
  const o=N.get();const J=o.map(x=>N.join(x));
  const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  return {has:J.map(j=>!!j),
   mitre:J[0]&&J[1]?d(J[0][2],J[1][3]):99, inner:J[0]&&J[1]?d(J[0][1],J[1][0]):99,
   floorEnd:J[2]?Math.abs(J[2][0][0]-X0)+Math.abs(J[2][3][0]-X0):99,
   slabCut:J[3]&&Math.min(J[3][0][0],J[3][3][0])>X0-u(500),wallFoot:J[0]?Math.abs(J[0][0][1]-(Yslab-slabT))+Math.abs(J[0][3][1]-(Yslab-slabT)):99};});
 ok(r.has[0]&&r.has[1]&&r.has[2],'the wall, roof and floor are tied together');
 ok(!r.has[4],'a build-up on its own is left as it is');
 ok(r.mitre<0.5&&r.inner<0.5,'the wall and roof meet in a mitre: same inner and outer corner points');
 ok(r.floorEnd<0.5,'the upper floor stops at the wall\'s inside face');
 ok(r.wallFoot<0.5,'the wall stands on the top of the slab');ok(!r.slabCut,'the slab runs on under the wall');
 await p.waitForTimeout(300);
 await p.screenshot({path:SP+'bu-tied.png'});
 await p.screenshot({path:SP+'bu-tied-eaves.png',clip:{x:150,y:260,width:330,height:200}});
 await p.screenshot({path:SP+'bu-tied-foot.png',clip:{x:150,y:520,width:330,height:120}});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h595: ${bad} failed`:'h595: all passed');await b.close();process.exit(bad?1:0);
})();
