// Walls that stay joined and square (made-up drawing): four walls make a room; dragging the top wall up and a bit
// sideways pushes it straight out – the two side walls stretch with it, still upright and joined; a side wall set to
// 📏 Keep length stops the push; dragging a corner moves the end of the wall joined there too.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},view:()=>[s,ox,oy],pick:(i)=>{sel=i;draw();fineOpen();},u:(mm)=>toUnits(mm)};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const near=(a,b)=>Math.abs(a-b)<0.01;
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 const scr=async(x,y)=>{const bb=await p.locator('.np-cv').boundingBox();const [s,ox,oy]=await p.evaluate(()=>window.__np.view());return [bb.x+ox+x*s,bb.y+oy+y*s];};
 const room=()=>p.evaluate(()=>{const w=(a,b2)=>({t:'shape',k:'wall',a,b:b2,c:'#111',w:3,th:window.__np.u(100)});window.__np.set([w([200,200],[500,200]),w([500,200],[500,400]),w([500,400],[200,400]),w([200,400],[200,200])]);});
 const drag=async(x0,y0,x1,y1)=>{const A=await scr(x0,y0),B=await scr(x1,y1);await p.mouse.move(A[0],A[1]);await p.mouse.down();await p.mouse.move(B[0],B[1],{steps:8});await p.mouse.up();await p.waitForTimeout(250);};
 await room();await p.click('.np-t[data-t=move]');
 await drag(350,200,380,140);
 let o=await p.evaluate(()=>window.__np.get());
 ok(near(o[0].a[0],200)&&near(o[0].b[0],500)&&o[0].a[1]<190,'the top wall moves straight up, not sideways ('+o[0].a.map(Math.round)+' → '+o[0].b.map(Math.round)+')');
 ok(near(o[1].a[1],o[0].b[1])&&near(o[3].b[1],o[0].a[1]),'the side walls stretch up with it, still joined');
 ok(near(o[1].a[0],o[1].b[0])&&near(o[3].a[0],o[3].b[0]),'and still upright');
 /* keep the left wall at its length */
 await room();await p.evaluate(()=>window.__np.pick(3));await p.waitForTimeout(200);
 ok(await p.isVisible('.nfa-fix'),'Properties has 📏 Keep length');
 await p.click('.nfa-fix');await p.click('.nfx');
 ok(await p.evaluate(()=>window.__np.get()[3].fix===1),'the left wall keeps its length');
 await p.evaluate(()=>window.__np.pick(null));await p.waitForTimeout(150);
 await drag(350,200,350,150);
 o=await p.evaluate(()=>window.__np.get());
 ok(near(o[0].a[1],200)&&near(o[3].b[1],200),'pushing the top wall is stopped by the wall kept at its length');
 /* Shift moves it on its own */
 await room();await p.keyboard.down('Shift');await drag(350,200,350,150);await p.keyboard.up('Shift');
 o=await p.evaluate(()=>window.__np.get());
 ok(o[0].a[1]<195&&near(o[1].a[1],200),'with Shift held the wall moves on its own');
 /* a corner: the wall joined there follows */
 await room();await p.evaluate(()=>window.__np.pick(0));await p.click(".nfx");await p.waitForTimeout(150);await drag(500,200,500,160);
 o=await p.evaluate(()=>window.__np.get());
 ok(o[0].b[1]<195&&Math.abs(o[1].a[0]-o[0].b[0])<0.01&&Math.abs(o[1].a[1]-o[0].b[1])<0.01,"dragging a corner moves the end of the wall joined there too");
 await room();await drag(350,200,350,120);
 await p.screenshot({path:'C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/np-push.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h571: ${bad} failed`:'h571: all passed');await b.close();process.exit(bad?1:0);
})();
