// Drawing › 🏘️ Elevations & 3D (made-up plan): a 4 × 3 m room at 1:50 with a door in the front (bottom) wall and a
// window in the back (top) wall. "Draw the elevations" makes four pages – front, back, left and right – each with the
// walls 2,400 high, the door on the front, the window on the back; the 3D view draws the walls with the openings and
// turns round.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const HOOK='  let lenObj = null;';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2,'test hook found once');
page_src=page_src.replace(HOOK,HOOK+'window.__np=()=>doc;');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 await p.evaluate(()=>{const d=window.__np();const u=v=>v/d.scale*5;const x0=200,y0=200,W=u(4000),H=u(3000);const w=(a,b)=>({t:'shape',k:'wall',a,b,c:'#111111',w:2,th:u(100)});
  d.objs.push(w([x0,y0],[x0+W,y0]),w([x0+W,y0],[x0+W,y0+H]),w([x0+W,y0+H],[x0,y0+H]),w([x0,y0+H],[x0,y0]));
  d.objs.push({t:'shape',k:'door',a:[x0+u(1500),y0+H],b:[x0+u(2400),y0+H],c:'#111111',w:2});
  d.objs.push({t:'shape',k:'window',a:[x0+u(1000),y0-u(50)],b:[x0+u(2200),y0+u(50)],c:'#111111',w:2});});
 ok(await p.locator('.np [data-bt=elev3d]').count()===1,'the drawing has 🏘️ Elevations & 3D');
 await p.evaluate(()=>document.querySelector('.np [data-bt=elev3d]').click());await p.waitForTimeout(300);
 const m=await p.innerText('.dimbox');console.log(m.replace(/\n/g,' | '));
 ok(/4 walls, 2 doors and windows, walls 2400 mm high/.test(m),'it finds the 4 walls, the door and the window');
 await p.click('.el-3d');await p.waitForTimeout(500);
 ok(await p.isVisible('#hs3-cv'),'the 3D view opens');
 const ink=await p.evaluate(()=>{const c=document.getElementById('hs3-cv');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let wall=0,win=0,door=0;for(let i=0;i<d.length;i+=4){if(d[i]>190&&d[i+1]>160&&d[i+1]<210&&d[i+2]>120&&d[i+2]<170)wall++;if(d[i]>140&&d[i]<170&&d[i+1]>185&&d[i+2]>220)win++;if(d[i]>95&&d[i]<115&&d[i+1]>75&&d[i+1]<95&&d[i+2]<75)door++;}return {wall,win,door}});
 console.log(JSON.stringify(ink));
 ok(ink.wall>2000,'the walls are drawn');
 ok(ink.win>20||ink.door>20,'with the openings on the faces in view');
 await p.click('#hs3-r');await p.waitForTimeout(200);
 await p.click('#hs3-save');await p.waitForTimeout(600);
 ok(await p.evaluate(()=>(window.__dl||[]).some(x=>x.filename==='3D view.png')),'turns round, and the picture can be saved');
 await p.click('#hs3-x');await p.waitForTimeout(300);
 await p.evaluate(()=>document.querySelector('.np [data-bt=elev3d]').click());await p.waitForTimeout(300);
 await p.click('.el-all');await p.waitForTimeout(800);
 const pages=await p.evaluate(()=>window.__np().pages.map(x=>[x.name,x.objs.length,x.objs.filter(o=>o.t==='rect'&&o.fill==='#f3f4f6').length,x.objs.filter(o=>o.t==='rect'&&o.fill==='#dbeafe').length]));console.log(JSON.stringify(pages));
 const pg=(n)=>pages.find(x=>x[0]===n)||[];
 ok(['Front elevation','Back elevation','Left side elevation','Right side elevation'].every(n=>pages.some(x=>x[0]===n)),'four elevation pages: front, back, left and right');
 ok(pg('Front elevation')[2]===1&&pg('Front elevation')[3]===0,'the front has the door');
 ok(pg('Back elevation')[3]===1&&pg('Back elevation')[2]===0,'the back has the window');
 ok(pg('Left side elevation')[2]===0&&pg('Left side elevation')[3]===0,'the sides have no openings');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h490: ${bad} failed`:'h490: all passed');await b.close();process.exit(bad?1:0);
})();
