// Foundations and DPC (made-up drawing): a brick and block cavity wall standing on a ground-bearing slab carries on down
// past the floor to a concrete trench fill foundation 1000 mm below ground; the DPC is at the floor's DPM, ground level
// 150 mm below it, the cavity is filled with lean-mix to 225 mm below the DPC, the slab stops at the wall's inside face
// with an edge insulation upstand. Properties switches to a strip foundation or none, and the specification lists it.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},sc:(v)=>{doc.scale=v;draw();},u:(mm)=>toUnits(mm),lib:()=>[NPSU_LIB,npsuLayers],join:(o)=>NPSU_JOIN.get(o)||null,fd:(o)=>NPSU_FOUND.get(o)||null,up:(o)=>NPSU_UPST.get(o)||null,spec:()=>npsuSpec(doc.objs),pick:(i)=>{sel=i;draw();fineOpen();},desel:()=>{sel=null;draw();},scr:(x,y)=>{const r=cv.getBoundingClientRect();return [r.left+ox+x*s,r.top+oy+y*s];}};\n  function eraseAt(p) {');
const SP='';
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:1000},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A3',orient:'land',pro:true})});await p.waitForTimeout(1200);
 const r=await p.evaluate(()=>{const N=window.__np;N.sc(10);const u=N.u,[Lb,lay]=N.lib();
  const mk=(key,a,b,code,x)=>Object.assign({t:'shape',k:'secbu',a,b,c:'#111111',w:1.5,bu:lay(key),bn:Lb.find(y=>y[0]===key)[1],bc:code},x||{});
  const X0=900,Yslab=520,slabT=u(150+25+100+100+65+10);
  window.__g={X0,Yslab};
  N.set([mk('gslab',[X0-u(200),Yslab],[X0+u(1400),Yslab],'GF01'),mk('cavbrick',[X0,Yslab-slabT],[X0,Yslab-slabT-u(700)],'EW01',{lab:1})]);
  const o=N.get(),J=o.map(x=>N.join(x)),F=N.fd(o[1]);
  return {F:!!F,type:F&&F.type,dpc:F?Math.abs(F.yDPC-(Yslab-u(275))):99,gl:F?Math.abs(F.yGL-(Yslab-u(125))):99,
   foot:J[1]?Math.abs(J[1][0][1]-(Yslab+u(25)))+Math.abs(J[1][3][1]-(Yslab+u(25))):99,
   bot:F?Math.abs(F.yBot-(Yslab+u(875))):99,
   slabEnd:J[0]?Math.abs(Math.min(J[0][0][0],J[0][3][0])-(X0-u(13))):99,plaster:F?Math.abs(F.cut[0]-(Yslab-slabT))<0.5&&F.cut[1]==null:false,up:!!N.up(o[0]),
   spec:N.spec().map(x=>x[0]+' '+x[1]+' | '+x[2].join(' | '))};});
 ok(r.F&&r.type==='trench','a cavity wall standing on a ground floor gets a trench fill foundation');
 ok(r.dpc<0.5,'the DPC is at the floor\'s DPM level');
 ok(r.gl<0.5,'ground level is 150 mm below the DPC');
 ok(r.foot<0.5,'the wall carries on down past the floor to the top of the trench fill (150 mm below ground)');
 ok(r.bot<0.5,'the foundation goes 1000 mm below ground');
 ok(r.slabEnd<0.5,'the slab runs to the face of the block inner leaf');ok(r.plaster,'the plaster stops at the floor');
 ok(r.up,'the slab gets an edge insulation upstand against the wall');
 ok(r.spec.some(x=>/^FD01 Foundation: concrete trench fill/.test(x)&&/225 mm below DPC/.test(x)),'the specification lists the foundation');
 await p.waitForTimeout(300);
 const clip=async(name)=>{if(await p.isVisible(".np-finebox .nfx")){await p.click(".np-finebox .nfx");await p.waitForTimeout(200);}await p.evaluate(()=>window.__np.desel());await p.waitForTimeout(150);const g=await p.evaluate(()=>{const N=window.__np,{X0,Yslab}=window.__g;return [N.scr(X0-N.u(2600),Yslab-N.u(1200)),N.scr(X0+N.u(700),Yslab+N.u(1000))];});
  await p.screenshot({path:SP+name,clip:{x:g[0][0],y:g[0][1],width:g[1][0]-g[0][0],height:g[1][1]-g[0][1]}});};
 await clip('fd-trench.png');
 await p.evaluate(()=>window.__np.pick(1));await p.waitForTimeout(300);
 ok(await p.isVisible('.nfbu-fd')&&await p.inputValue('.nfbu-fd')==='trench'&&await p.inputValue('.nfbu-fdd')==='1000','Properties shows the trench fill, 1000 mm deep');
 await p.selectOption('.nfbu-fd','strip');await p.waitForTimeout(200);
 const st=await p.evaluate(()=>{const N=window.__np,{Yslab}=window.__g,o=N.get(),F=N.fd(o[1]),J=N.join(o[1]);return {t:F&&F.type,foot:J?Math.abs(J[0][1]-(Yslab+N.u(875-225))):99};});
 ok(st.t==='strip'&&st.foot<0.5,'a strip foundation: the wall carries on down to the top of a 225 mm strip');
 await p.fill('.nfbu-fdd','1200');await p.fill('.nfbu-fdw','750');await p.press('.nfbu-fdd','Enter');await p.waitForTimeout(200);
 const dd=await p.evaluate(()=>{const N=window.__np,{Yslab}=window.__g,F=N.fd(N.get()[1]);return F?[Math.abs(F.yBot-(Yslab+N.u(1075))),F.width]:[99,0];});
 ok(dd[0]<0.5&&dd[1]===750,'depth 1200 and width 750 are set from Properties');
 await p.keyboard.press('Escape');await p.waitForTimeout(200);
 await clip('fd-strip.png');
 await p.evaluate(()=>window.__np.pick(1));await p.waitForTimeout(300);
 await p.selectOption('.nfbu-fd','none');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>{const N=window.__np,o=N.get();return !N.fd(o[1])&&!!N.join(o[1]);}),'"None" takes the foundation off and the wall stands on the floor again');
 await p.selectOption('.nfbu-fd','trench');await p.waitForTimeout(200);
 await p.fill('.nfbu-fdd','1000');await p.fill('.nfbu-fdw','600');await p.press('.nfbu-fdd','Enter');await p.waitForTimeout(200);
 await p.keyboard.press('Escape');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>!!window.__np.fd(window.__np.get()[1])),'back to trench fill');
 await clip('fd-trench.png');
 // a timber frame wall is left standing on the slab
 ok(await p.evaluate(()=>{const N=window.__np,{X0,Yslab}=window.__g,u=N.u,[Lb,lay]=N.lib();const o=N.get();
  N.set([o[0],{t:'shape',k:'secbu',a:[X0,Yslab-u(450)],b:[X0,Yslab-u(1500)],c:'#111111',w:1.5,bu:lay('tfclad'),bn:'Timber frame wall',bc:'EW02'}]);
  return !N.fd(N.get()[1]);}),'a timber frame wall gets no masonry foundation of its own');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h597: ${bad} failed`:'h597: all passed');await b.close();process.exit(bad?1:0);
})();
