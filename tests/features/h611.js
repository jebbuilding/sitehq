// Scan a document (a made-up page drawn in the test). Photos has 📄 Scan a document: a picture of a page on a dark
// table is cropped to the paper and cleaned up; pages can be turned, taken out and added; the pages become one PDF
// saved to a site's documents (James) or to a person's documents (James for a trade, or a trade for themselves).
// Writes h611*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null')&&page_src.includes(DD),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
const JSPDF=fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(10000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:JSPDF});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(400);
 /* a made-up page photographed on a dark table */
 const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=900;c.height=1200;const g=c.getContext('2d');g.fillStyle='#4a3b2c';g.fillRect(0,0,900,1200);g.fillStyle='#e9e4da';g.fillRect(120,110,660,960);g.fillStyle='#333';g.font='bold 34px sans-serif';g.fillText('DELIVERY NOTE',170,190);g.font='22px sans-serif';for(let i=0;i<14;i++)g.fillText('Item '+(i+1)+'  ·  Blocks 440x215  ·  qty '+(i*3+2),170,260+i*48);return c.toDataURL('image/png').split(',')[1];});
 const file={name:'page.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')};
 await p.evaluate(()=>{const S=window.__S;S.otab='photos';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('#dsc-open'),'Photos has 📄 Scan a document');
 await p.click('#dsc-open');await p.waitForTimeout(400);
 ok(/Scan a document/.test(await p.innerText('#sheet')),'it opens the scanner');
 await p.setInputFiles('#dsc-cam',file);await p.waitForTimeout(1200);
 await p.setInputFiles('#dsc-cam',file);await p.waitForTimeout(1200);
 ok(await p.locator('#dsc-pages .dsc-pg').count()===2,'two pages taken');
 const crop=await p.evaluate(()=>{const im=document.querySelector('#dsc-pages .dsc-pg img');return new Promise(r=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);const d=g.getImageData(2,2,1,1).data;r({w:i.width,h:i.height,corner:d[0]})};i.src=im.src;})});
 ok(crop.w<860&&crop.w>560&&crop.h<1160&&crop.h>850,'it is cropped to the paper ('+crop.w+'×'+crop.h+')');
 ok(crop.corner>220,'and the paper comes out white ('+crop.corner+')');
 await p.click('#dsc-pages .dsc-rot >> nth=1');await p.waitForTimeout(300);
 const rot=await p.evaluate(()=>{const im=document.querySelectorAll('#dsc-pages .dsc-pg img')[1];return new Promise(r=>{const i=new Image();i.onload=()=>r(i.width>i.height);i.src=im.src;})});
 ok(rot,'↻ turns a page round');
 await p.click('#dsc-pages .dsc-x >> nth=1');await p.waitForTimeout(300);
 ok(await p.locator('#dsc-pages .dsc-pg').count()===1,'✕ takes a page out');
 await p.fill('#dsc-title','Delivery note blocks');
 await p.screenshot({path:'h611-scan.png'});
 const site=await p.evaluate(()=>document.getElementById('dsc-s').value);
 await p.click('#f-save');await p.waitForTimeout(2500);
 const sd=await p.evaluate(()=>Object.values(window.__st).find(v=>v&&v.kind==='sitedoc'&&v.title==='Delivery note blocks'));
 ok(sd&&sd.site===site&&sd.contentType==='application/pdf'&&sd.assetId,'saved as a PDF in the site\'s documents ('+(sd&&sd.site)+')');
 /* to a trade's documents */
 await p.click('#dsc-open');await p.waitForTimeout(400);
 await p.setInputFiles('#dsc-cam',file);await p.waitForTimeout(1200);
 await p.click('#dsc-to button[data-v="person"]');await p.waitForTimeout(150);
 ok(await p.isVisible('#dsc-person')&&!(await p.isVisible('#dsc-site')),'it can go to a person instead');
 await p.selectOption('#dsc-pk','cis');await p.fill('#dsc-title','CIS statement October');
 const who=await p.evaluate(()=>document.getElementById('dsc-p').value);
 await p.click('#f-save');await p.waitForTimeout(2500);
 const pd=await p.evaluate(w=>Object.entries(window.__st).find(([k,v])=>k.startsWith('sheets/'+w+'/signoffs/pd-')&&v.type==='persdoc'&&v.kind==='cis'),who);
 ok(pd&&pd[1].photos.length===1&&pd[1].byOwner,'saved in that person\'s documents as a CIS statement');
 /* a trade scans into their own documents */
 const t=await ctx.newPage();t.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await t.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src.replace(DD,'function detailsDone(d){return true}')+'</body></html>');await t.waitForTimeout(2500);await t.keyboard.press('Escape');
 await t.evaluate(()=>{const S=window.__S;S.tab='photos';window.render()});await t.waitForTimeout(500);
 ok(await t.isVisible('#dsc-open'),'trades have 📄 Scan a document too');
 await t.click('#dsc-open');await t.waitForTimeout(400);
 ok(!(await t.locator('#dsc-to').count())&&/My documents/.test(await t.innerText('#sheet')),'a trade can only put it in their own documents');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h611: ${bad} failed`:'h611: all passed');await b.close();process.exit(bad?1:0);
})();
