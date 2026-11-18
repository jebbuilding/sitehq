// Windows stand out on a plan (made-up drawing): a room of cavity walls with three windows put in its walls – each
// window knows which side is outside (the sill side, away from the middle of the room), and on screen the glass shows
// pale blue between the jambs.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={set:(a)=>{setObjs(a);a.forEach(seatOnWall);draw();},u:(mm)=>toUnits(mm),view:()=>[s,ox,oy],zoom:(z,x,y)=>{s=z;ox=x;oy=y;draw();}};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 const info=await p.evaluate(()=>{const u=window.__np.u;const W=(a,b2)=>({t:'shape',k:'cavity',a,b:b2,c:'#111111',w:3,th:u(300)});
  const x0=150,y0=150,L=u(6000),D=u(4000);
  const win=(cx,cy,w,h)=>({t:'shape',k:'window',a:[cx-w/2,cy-h/2],b:[cx+w/2,cy+h/2],c:'#111111',w:3});
  const ws=[win(x0+u(3000),y0,u(1800),u(300)),win(x0+L,y0+u(2000),u(300),u(1200)),win(x0+u(3000),y0+D,u(1200),u(300))];
  window.__np.set([W([x0,y0],[x0+L,y0]),W([x0+L,y0],[x0+L,y0+D]),W([x0+L,y0+D],[x0,y0+D]),W([x0,y0+D],[x0,y0])].concat(ws));
  return ws.map(o=>{const r=o.r||0,dn=[-Math.sin(r),Math.cos(r)],c=[(o.a[0]+o.b[0])/2,(o.a[1]+o.b[1])/2],g=[x0+L/2,y0+D/2];return {os:o.os,away:Math.sign((c[0]-g[0])*dn[0]+(c[1]-g[1])*dn[1])};});});
 await p.waitForTimeout(400);
 ok(info.every(x=>x.os&&x.os===x.away),'each window knows its outside, away from the middle of the room ('+info.map(x=>x.os).join(', ')+')');
 /* the glass is pale blue on screen: look at the middle of the top window */
 const col=await p.evaluate(()=>{const cv=document.querySelector('.np-cv');const [s,ox,oy]=window.__np.view();const u=window.__np.u;const dpr=cv.width/cv.getBoundingClientRect().width;
  const x=(150+u(3000))*s+ox,y=150*s+oy;const d=cv.getContext('2d').getImageData(Math.round(x*dpr),Math.round(y*dpr),1,1).data;return [...d];});
 ok(col[2]>col[0]+25&&col[2]>200,'the glass shows pale blue (rgb '+col.slice(0,3).join(',')+')');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h576: ${bad} failed`:'h576: all passed');await b.close();process.exit(bad?1:0);
})();
