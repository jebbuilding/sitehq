// Drawing › 🏘️ with an L-shaped plan (made-up, 1:50): a 10 × 5 m main part and a 4 × 4 m wing off the right-hand end
// towards the front. The roof is worked out as two – one along the main part, one over the wing – meeting like a valley:
// the 3D shows both, and the front elevation draws two roofs (the wing's gable end in front of the main roof).
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const HOOK='  let lenObj = null;';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2,'test hook found once');
page_src=page_src.replace(HOOK,HOOK+'window.__np=()=>doc;window.__goPage=(i)=>goPage(i);');
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('three'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('threepkg/package/build/three.min.js','utf8')});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 await p.evaluate(()=>{const d=window.__np();const u=v=>v/d.scale*5;const x0=150,y0=150;const P=(x,y)=>[x0+u(x),y0+u(y)];const w=(a,b)=>({t:'shape',k:'wall',a:P(...a),b:P(...b),c:'#111111',w:2,th:u(250)});
  d.objs.push(w([0,0],[10000,0]),w([10000,0],[10000,9000]),w([10000,9000],[6000,9000]),w([6000,9000],[6000,5000]),w([6000,5000],[0,5000]),w([0,5000],[0,0]));
  d.objs.push({t:'shape',k:'door',a:P(2000,5000),b:P(2900,5000),c:'#111111',w:2});
  d.objs.push({t:'shape',k:'window',a:P(7300,8900),b:P(8700,9100),c:'#111111',w:2});});
 await p.evaluate(()=>document.querySelector('.np [data-bt=elev3d]').click());await p.waitForTimeout(300);
 const m=await p.innerText('.el-box');console.log(m.split('\n')[1]);
 ok(/2 roofs where the plan turns/.test(m),'the L shape gets two roofs');
 await p.click('.el-3d');await p.waitForTimeout(3500);
 const du=await p.evaluate(()=>document.getElementById('hr-cv').toDataURL('image/png'));fs.writeFileSync(OUT+'h494-L-3d.png',Buffer.from(du.split(',')[1],'base64'));
 ok(du.length>50000,'the 3D draws');
 await p.click('#hr-x');await p.waitForTimeout(200);
 await p.evaluate(()=>document.querySelector('.np [data-bt=elev3d]').click());await p.waitForTimeout(300);
 await p.click('.el-all');await p.waitForTimeout(900);
 const front=await p.evaluate(()=>{const pg=window.__np().pages.find(x=>x.name==='Front elevation');return pg.objs.filter(o=>o.t==='stroke'&&o.fill==='#ffffff').length});
 ok(front===2,'the front elevation draws two roofs');
 const ok2=await p.evaluate(()=>window.__np().pages.find(x=>x.name==='Front elevation').objs.filter(o=>o.t==='stroke').every(o=>Array.isArray(o.p)&&typeof o.p[0][0]==='number'));
 ok(ok2,'every roof outline is stored so it draws');
 const cv=await p.evaluate(()=>{const c=document.querySelector('.np canvas');return c?c.toDataURL('image/png'):''});if(cv)fs.writeFileSync(OUT+'h494-front.png',Buffer.from(cv.split(',')[1],'base64'));
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h494: ${bad} failed`:'h494: all passed');await b.close();process.exit(bad?1:0);
})();
