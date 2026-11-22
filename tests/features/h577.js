// Existing and proposed on one plan (made-up drawing): a room of existing walls, one marked ✕ To knock down and a new
// extension's walls marked ✚ New in Properties. The knocked-down wall is drawn dashed and white, the new walls
// hatched; the next wall drawn on the page is new too; 🧮 Quantities counts only the new walls for materials and lists
// the wall to knock down on its own; the elevations leave the knocked-down wall out.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},pick:(i)=>{sel=i;draw();fineOpen();},view:()=>[s,ox,oy],u:(mm)=>toUnits(mm),qty:()=>qtyCalc(2400),eb:()=>elevBuild()};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 await p.evaluate(()=>{const u=window.__np.u;const W=(a,b2)=>({t:'shape',k:'cavity',a,b:b2,c:'#111111',w:3,th:u(300)});
  const x0=150,y0=150,L=u(5000),D=u(4000),E=u(3000);
  window.__np.set([W([x0,y0],[x0+L,y0]),W([x0+L,y0],[x0+L,y0+D]),W([x0+L,y0+D],[x0,y0+D]),W([x0,y0+D],[x0,y0]),
   W([x0+L,y0],[x0+L+E,y0]),W([x0+L+E,y0],[x0+L+E,y0+D]),W([x0+L+E,y0+D],[x0+L,y0+D])]);});
 const before=await p.evaluate(()=>{const q=window.__np.qty();return Object.values(q.walls).reduce((a,w)=>a+w.L,0);});
 /* the wall between old and new comes down */
 await p.evaluate(()=>window.__np.pick(1));await p.waitForTimeout(300);
 ok(await p.isVisible('.nfstrow'),'a wall\'s Properties ask what it is: Existing, To knock down or New');
 await p.click('.nfst button[data-v=demo]');
 for(const i of [4,5,6]){await p.evaluate((i)=>window.__np.pick(i),i);await p.waitForTimeout(150);await p.click('.nfst button[data-v=new]');}
 const o=await p.evaluate(()=>window.__np.get().map(x=>x.st||''));
 ok(o[1]==='demo'&&o[4]==='new'&&o[5]==='new'&&o[6]==='new'&&!o[0],'one wall to knock down, three new, the rest existing');
 await p.click('.nfx');await p.evaluate(()=>window.__np.pick(null));await p.waitForTimeout(300);
 /* how they look: the knocked-down wall is white, the new walls hatched (dark lines over the fill) */
 const px=await p.evaluate(()=>{const cv=document.querySelector('.np-cv');const [s,ox,oy]=window.__np.view();const u=window.__np.u;const dpr=cv.width/cv.getBoundingClientRect().width;const g=cv.getContext('2d');
  const at=(x,y)=>[...g.getImageData(Math.round((x*s+ox)*dpr),Math.round((y*s+oy)*dpr),1,1).data].slice(0,3);
  const demo=at(150+u(5000)-u(100),150+u(2000));
  /* along the middle of a new wall's outer leaf: count dark pixels */
  let dark=0;for(let k=0;k<60;k++){const c2=at(150+u(5000)+u(300)+k*u(40),150-u(110));if(c2[0]+c2[1]+c2[2]<300)dark++;}
  return {demo,dark};});
 ok(px.demo.every(v=>v>235),'the wall to knock down is left white ('+px.demo.join(',')+')');
 ok(px.dark>=4,'the new walls are hatched ('+px.dark+' dark crossings)');
 /* the next wall on the page is new too */
 await p.click('.np-gt[data-gt=draw]');await p.click('.np-t[data-t=pwall]');
 const scr=async(x,y)=>{const bb=await p.locator('.np-cv').boundingBox();const [s,ox,oy]=await p.evaluate(()=>window.__np.view());return [bb.x+ox+x*s,bb.y+oy+y*s];};
 const A=await scr(200,600),B=await scr(400,600);await p.mouse.click(A[0],A[1]);await p.waitForTimeout(150);await p.mouse.click(B[0],B[1]);await p.waitForTimeout(150);await p.click('.np-chainok');await p.waitForTimeout(300);
 const last=await p.evaluate(()=>{const a=window.__np.get();return a[a.length-1];});
 ok(last&&last.st==='new','the next wall drawn on the page is new too');
 await p.evaluate(()=>{const a=window.__np.get();a.pop();window.__np.set(a);});
 const q=await p.evaluate(()=>window.__np.qty());
 const newL=Object.values(q.walls).reduce((a,w)=>a+w.L,0);
 ok(newL>0&&newL<before*0.6,'Quantities counts only the new walls ('+before.toFixed(1)+' m → '+newL.toFixed(1)+' m)');
 ok(q.sym['Walls to knock down (m)']>0,'and lists the wall to knock down ('+q.sym['Walls to knock down (m)']+' m)');
 const eb=await p.evaluate(()=>{const B2=window.__np.eb();return B2?B2.W.length:0;});
 ok(eb===6,'the elevations leave the knocked-down wall out ('+eb+' walls)');
 await p.screenshot({path:'np-exprop.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h577: ${bad} failed`:'h577: all passed');await b.close();process.exit(bad?1:0);
})();
