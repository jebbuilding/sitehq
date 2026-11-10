// Drawing › 🏘️ › 3D › 🔪 Inside (made-up plan at 1:50): an 8 × 5 m bungalow with a wall between a kitchen (units along
// the back wall) and a bedroom (a double bed and a sofa), with a door between them and a window in each room. The
// cutaway takes the roof off and cuts the walls at waist height: tiled kitchen floor, carpet in the bedroom, white
// units with a dark worktop, the bed with a white duvet, and dark tops on the cut walls.
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
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('three'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('threepkg/package/build/three.min.js','utf8')});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 await p.evaluate(()=>{const d=window.__np();const u=v=>v/d.scale*5;const x0=150,y0=150,W=u(8000),H=u(5000),M=x0+u(4500);const w=(a,b,t)=>({t:'shape',k:'wall',a,b,c:'#111111',w:2,th:u(t||250)});
  d.objs.push(w([x0,y0],[x0+W,y0]),w([x0+W,y0],[x0+W,y0+H]),w([x0+W,y0+H],[x0,y0+H]),w([x0,y0+H],[x0,y0]),w([M,y0],[M,y0+H],100));
  d.objs.push({t:'shape',k:'door',a:[M,y0+u(3500)],b:[M,y0+u(4400)],c:'#111111',w:2});
  d.objs.push({t:'shape',k:'door',a:[x0+u(1500),y0+H],b:[x0+u(2400),y0+H],c:'#111111',w:2});
  d.objs.push({t:'shape',k:'window',a:[x0+u(1200),y0-u(100)],b:[x0+u(3000),y0+u(100)],c:'#111111',w:2});
  d.objs.push({t:'shape',k:'window',a:[x0+u(5500),y0+H-u(100)],b:[x0+u(7200),y0+H+u(100)],c:'#111111',w:2});
  d.objs.push({t:'room',p:[[x0,y0],[M,y0],[M,y0+H],[x0,y0+H]],name:'Kitchen',c:'#444444',w:1.4});
  d.objs.push({t:'room',p:[[M,y0],[x0+W,y0],[x0+W,y0+H],[M,y0+H]],name:'Bedroom 1',c:'#444444',w:1.4});
  d.objs.push({t:'shape',k:'units',a:[x0+u(300),y0+u(150)],b:[x0+u(4300),y0+u(750)],c:'#111111',w:2});
  d.objs.push({t:'shape',k:'sink',a:[x0+u(3300),y0+u(150)],b:[x0+u(4200),y0+u(750)],c:'#111111',w:2});
  d.objs.push({t:'shape',k:'dbed',a:[x0+u(5500),y0+u(200)],b:[x0+u(7000),y0+u(2200)],c:'#111111',w:2});
  d.objs.push({t:'shape',k:'sofa',a:[x0+u(1000),y0+u(3300)],b:[x0+u(3000),y0+u(4200)],c:'#111111',w:2});});
 await p.evaluate(()=>document.querySelector('.np [data-bt=elev3d]').click());await p.waitForTimeout(300);
 await p.click('.el-3d');await p.waitForTimeout(3500);
 ok(await p.locator('.hr-mode[data-m=in]').count()===1,'the 3D view has Outside and Inside');
 await p.click('.hr-mode[data-m=in]');await p.waitForTimeout(1500);
 const du=await p.evaluate(()=>document.getElementById('hr-cv').toDataURL('image/png'));fs.writeFileSync(OUT+'h492-cutaway.png',Buffer.from(du.split(',')[1],'base64'));
 const ink=await p.evaluate(()=>{const src=document.getElementById('hr-cv');const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const x=c.getContext('2d');x.drawImage(src,0,0);const d=x.getImageData(0,0,c.width,c.height).data;let tile=0,carpet=0,cut=0,white=0,grass=0;for(let i=0;i<d.length;i+=16){const r=d[i],g=d[i+1],b=d[i+2];if(g>r+15&&g>b+15)grass++;else if(r<105&&Math.abs(r-g)<10&&b<115)cut++;else if(r>235&&g>235&&b>230)white++;else if(Math.abs(r-g)<10&&r>150&&r<235&&b<r)tile++;else if(Math.abs(r-g)<14&&r>120&&r<200&&b<r-2)carpet++;}return {tile,carpet,cut,white,grass,n:d.length/16}});
 console.log(JSON.stringify(ink));
 ok(ink.grass<ink.n*0.01,'inside: no garden, a plain studio background');
 ok(ink.cut>200,'the cut walls have dark tops');
 ok(ink.white>ink.n*0.02,'white walls and units');
 ok(await p.evaluate(()=>document.querySelector('.hr-mode[data-m=in]').getAttribute('aria-pressed'))==='true','Inside is picked');
 await p.click('.hr-mode[data-m=out]');await p.waitForTimeout(1200);
 const du2=await p.evaluate(()=>document.getElementById('hr-cv').toDataURL('image/png'));fs.writeFileSync(OUT+'h492-outside.png',Buffer.from(du2.split(',')[1],'base64'));
 ok(await p.evaluate(()=>document.querySelector('.hr-mode[data-m=out]').getAttribute('aria-pressed'))==='true','and back outside');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h492: ${bad} failed`:'h492: all passed');await b.close();process.exit(bad?1:0);
})();
