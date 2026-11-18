// Windows that show how they open, and rooms that find themselves (made-up drawing). A run of four walls with the
// Wall run tool, closed up: the room inside is found by itself (with its area) and asks its name – "Kitchen"; ⬠ Find
// rooms finds nothing new after that; a second room made by a wall across the middle is found. A window in a wall
// set to "Side hung, hinge left" in Properties keeps it (o.wo) and draws a dashed swing outside the wall.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);a.forEach(seatOnWall);draw();},pick:(i)=>{sel=i;draw();fineOpen();},view:()=>[s,ox,oy],u:(mm)=>toUnits(mm),mm:(u)=>realMm(u)};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 const scr=async(x,y)=>{const bb=await p.locator('.np-cv').boundingBox();const [s,ox,oy]=await p.evaluate(()=>window.__np.view());return [bb.x+ox+x*s,bb.y+oy+y*s];};
 const u=async(mm)=>p.evaluate((m)=>window.__np.u(m),mm);
 const U4=await u(4000),U3=await u(3000);
 /* a wall run round a room, closed up */
 await p.click('.np-gt[data-gt=draw]');await p.click('.np-t[data-t=pwall]');
 for(const [x,y] of [[200,330],[200+U4,330],[200+U4,330+U3],[200,330+U3]]){const A=await scr(x,y);await p.mouse.click(A[0],A[1]);await p.waitForTimeout(150);}
 await p.click('.np-pwclose');await p.waitForTimeout(500);
 ok(await p.isVisible('.dimask .rmn'),'closing the walls finds the room and asks its name');
 let rooms=await p.evaluate(()=>window.__np.get().filter(o=>o.t==='room'));
 const area=rooms.length?await p.evaluate((r)=>{let a=0;for(let i=0;i<r.p.length;i++){const q=r.p[i],w=r.p[(i+1)%r.p.length];a+=q[0]*w[1]-w[0]*q[1];}const m=window.__np.mm(1);return Math.abs(a)/2*m*m/1e6;},rooms[0]):0;
 ok(rooms.length===1&&area>9&&area<12,'one room, about the size inside the walls ('+area.toFixed(2)+' m²)');
 await p.fill('.dimask .rmn','Kitchen');await p.click('.dimask [type=submit]');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>window.__np.get().find(o=>o.t==='room').name)==='Kitchen','it is named Kitchen');
 await p.click('.np-gt[data-gt=measure]');await p.click('.np-findrooms');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>window.__np.get().filter(o=>o.t==='room').length)===1&&!(await p.isVisible('.dimask .rmn')),'⬠ Find rooms finds nothing new');
 /* a wall across the middle makes two */
 await p.evaluate((U)=>{const a=window.__np.get();const w=a.find(o=>o.k==='wall');a.push({t:'shape',k:w.k,a:[200+U/2,330],b:[200+U/2,330+U*0.75],c:w.c,w:w.w,th:w.th});window.__np.set(a);},U4);
 await p.click('.np-findrooms');await p.waitForTimeout(300);
 ok(await p.isVisible('.dimask .rmn'),'a wall across the middle: Find rooms finds the new room');
 await p.click('.dimask [type=submit]');
 /* a window that opens */
 await p.evaluate((U)=>{const a=window.__np.get();a.push({t:'shape',k:'window',a:[200+U/4-50,320],b:[200+U/4+50,340],c:'#111111',w:3});window.__np.set(a);},U4);
 const wi=await p.evaluate(()=>window.__np.get().findIndex(o=>o.k==='window'));
 await p.evaluate((i)=>window.__np.pick(i),wi);await p.waitForTimeout(300);
 ok(await p.isVisible('.nfworow'),'a window\'s Properties ask how it opens');
 await p.click('.nfwo button[data-v=sl]');await p.waitForTimeout(200);
 const w=await p.evaluate((i)=>window.__np.get()[i],wi);
 ok(w.wo==='sl'&&w.os,'it is side hung, hinge left, and knows its outside');
 await p.click('.nfx');await p.evaluate(()=>window.__np.pick(null));await p.waitForTimeout(300);
 await p.screenshot({path:'C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/np-rooms.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h578: ${bad} failed`:'h578: all passed');await b.close();process.exit(bad?1:0);
})();
