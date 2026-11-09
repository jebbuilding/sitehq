// Drawing precision (made-up drawing): a line drawn at about 32° goes to 30° (15° steps); while drawing, a magnifier
// shows next to the finger; selecting a line shows its length to type a new one; ✥ Move by… moves it a typed
// distance, or nudges it; 📋 Copy then 📋 Paste puts it on another page in the same place.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const HOOK='  let lenObj = null;',LOUPE='return !!(window.matchMedia && window.matchMedia("(pointer:coarse)").matches);';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2&&page_src.split(LOUPE).length===2,'test hooks found once');
page_src=page_src.replace(HOOK,HOOK+'window.__np=()=>doc;window.__mm=(u)=>realMm(u);window.__xf=()=>[s,ox,oy,dpr];window.__pg=()=>pg;').replace(LOUPE,'return true;');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 const box=await (await p.$('.np .np-cv')).boundingBox();const X=x=>box.x+x,Y=y=>box.y+y;
 const tool=t=>p.evaluate(t=>document.querySelector(`.np .np-t[data-t="${t}"]`).click(),t);
 /* a line at about 32°, with a look at the magnifier halfway */
 await tool('line');
 const L=260,an=32*Math.PI/180;
 await p.mouse.move(X(300),Y(500));await p.mouse.down();
 for(let i=1;i<=10;i++)await p.mouse.move(X(300+L*Math.cos(an)*i/10),Y(500-L*Math.sin(an)*i/10));
 const loupe=await p.evaluate(([x,y])=>{const [s,ox,oy,dpr]=window.__xf();const cv=document.querySelector('.np .np-cv');const lx=x-120<72?x+120:x-120,ly=Math.max(72,y-120);const d=cv.getContext('2d').getImageData(Math.round((lx+66)*dpr),Math.round(ly*dpr),1,1).data;return [d[0],d[1],d[2]]},[300+L*Math.cos(an),500-L*Math.sin(an)]);
 ok(loupe[2]>140&&loupe[0]<110,'a magnifier shows next to the finger while drawing ('+loupe.join(',')+')');
 await p.mouse.up();await p.waitForTimeout(300);
 const ln=await p.evaluate(()=>{const o=window.__np().objs.find(o=>o.t==='line');return {an:Math.round(Math.atan2(-(o.b[1]-o.a[1]),o.b[0]-o.a[0])*180/Math.PI*10)/10}});
 ok(Math.abs(ln.an-30)<0.2,'drawn at about 32°, it goes to 30° ('+ln.an+'°)');
 await p.keyboard.press('Escape');
 /* select it: its length to type */
 await tool('move');
 const mid=await p.evaluate(()=>{const [s,ox,oy]=window.__xf();const o=window.__np().objs.find(o=>o.t==='line');return [((o.a[0]+o.b[0])/2)*s+ox,((o.a[1]+o.b[1])/2)*s+oy]});
 await p.mouse.click(box.x+mid[0],box.y+mid[1]);await p.waitForTimeout(300);
 ok(await p.isVisible('.np-lenbar'),'selecting the line shows its length bar');
 await p.fill('.np-lenbar .nlb-l','2000');await p.click('.np-lenbar button[type=submit]');await p.waitForTimeout(300);
 const len=await p.evaluate(()=>{const o=window.__np().objs.find(o=>o.t==='line');return Math.round(window.__mm(Math.hypot(o.b[0]-o.a[0],o.b[1]-o.a[1])))});
 ok(Math.abs(len-2000)<=1,'typing 2000 makes it 2000 long ('+len+')');
 /* move by 500 across */
 const mid2=await p.evaluate(()=>{const [s,ox,oy]=window.__xf();const o=window.__np().objs.find(o=>o.t==='line');return [((o.a[0]+o.b[0])/2)*s+ox,((o.a[1]+o.b[1])/2)*s+oy]});
 await p.mouse.click(box.x+mid2[0],box.y+mid2[1]);await p.waitForTimeout(300);
 const a0=await p.evaluate(()=>window.__np().objs.find(o=>o.t==='line').a.slice());
 await p.evaluate(()=>document.querySelector('.np-sb[data-a=moveby]').click());await p.waitForTimeout(200);
 await p.fill('.np-mvbox .mv-x','500');await p.click('.np-mvbox button[type=submit]');await p.waitForTimeout(200);
 const a1=await p.evaluate(()=>window.__np().objs.find(o=>o.t==='line').a.slice());
 ok(Math.abs(await p.evaluate(([a,b])=>window.__mm(b[0]-a[0]),[a0,a1])-500)<=1&&Math.abs(a1[1]-a0[1])<1e-6,'✥ Move by 500 across moves it 500 right');
 await p.evaluate(()=>document.querySelector('.np-sb[data-a=moveby]').click());await p.waitForTimeout(200);
 await p.selectOption('.np-mvbox .mv-step','100');await p.click('.np-mvbox [data-d=u]');await p.click('.np-mvbox [data-d=u]');await p.click('.np-mvbox .mv-x2');await p.waitForTimeout(200);
 const a2=await p.evaluate(()=>window.__np().objs.find(o=>o.t==='line').a.slice());
 ok(Math.abs(await p.evaluate(([a,b])=>window.__mm(a[1]-b[1]),[a1,a2])-200)<=1,'nudging up twice by 100 moves it 200 up');
 /* copy, a new page, paste */
 await p.evaluate(()=>document.querySelector('.np-sb[data-a=clip]').click());await p.waitForTimeout(200);
 ok(/copied/.test(await lastToast())&&await p.isVisible('.np .np-paste'),'📋 Copy, and Paste is ready');
 await p.evaluate(()=>{const b=[...document.querySelectorAll('.np button')].find(x=>/^\+ ?Page$/.test(x.textContent.trim()));b&&b.click();});await p.waitForTimeout(400);
 const pg1=await p.evaluate(()=>window.__pg());
 await p.evaluate(()=>document.querySelector('.np .np-paste').click());await p.waitForTimeout(300);
 const pasted=await p.evaluate(()=>{const d=window.__np();return {n:d.objs.filter(o=>o.t==='line').length,a:(d.objs.find(o=>o.t==='line')||{}).a}});
 ok(pg1>0&&pasted.n===1&&Math.abs(pasted.a[0]-a2[0])<1e-6&&Math.abs(pasted.a[1]-a2[1])<1e-6,'pasted onto page '+(pg1+1)+' in the same place');
 await p.screenshot({path:'h456.png'});
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h456: '+bad+' FAILED':'h456: all passed');
 await b.close()})();
