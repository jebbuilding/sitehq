// Plans on a site: the magnifier while moving a measurement's end (made-up plan area). It shows in the corner of the
// plan furthest from the finger, never over where the finger is going: finger bottom-left → magnifier top-right,
// finger top-right → bottom-left; it is 160 px across.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('function fvmLoupe(','window.fvmLoupe=fvmLoupe;function fvmLoupe(');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:768},hasTouch:true});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 const place=(fx,fy)=>p.evaluate(([fx,fy])=>{let h=document.getElementById('h580');if(!h){h=document.createElement('div');h.id='h580';h.style.cssText='position:fixed;left:40px;top:80px;width:900px;height:600px;background:#eee';const im=document.createElement('canvas');im.className='fvbase';im.width=900;im.height=600;h.appendChild(im);document.body.appendChild(h);}
  const r=h.getBoundingClientRect();window.fvmLoupe(h,[fx,fy],r.left+fx*r.width,r.top+fy*r.height);const l=document.getElementById('fvm-loupe').getBoundingClientRect();return {l:{x:l.left,y:l.top,w:l.width},r:{x:r.left,y:r.top,w:r.width,h:r.height},f:[r.left+fx*r.width,r.top+fy*r.height]};},[fx,fy]);
 let a=await place(0.15,0.85);
 ok(a.l.x>a.r.x+a.r.w/2&&a.l.y<a.r.y+a.r.h/2,'finger bottom-left: the magnifier is top-right');
 ok(Math.hypot(a.l.x+80-a.f[0],a.l.y+80-a.f[1])>300,'well away from the finger');
 a=await place(0.85,0.15);
 ok(a.l.x<a.r.x+a.r.w/2&&a.l.y>a.r.y+a.r.h/2,'finger top-right: the magnifier is bottom-left');
 ok(Math.round(a.l.w)===160,'it is 160 px across');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h580: ${bad} failed`:'h580: all passed');await b.close();process.exit(bad?1:0);
})();
