// Quantities from a drawing (made-up kitchen, 4 m × 3 m with a door, drawn at 1:50): in + Add a price, 📐 From a drawing
// lists the drawings; picking it offers floor 12 m², skirting 14 m, walls 33.6 m² at 2.4 m high, the door; ticking floor
// and skirting adds them as lines with the quantities, rates to fill.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;').replace('function render() {','window.render=render;window.__T=()=>({jprOpen});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(400);
 /* a drawing at 1:50: 5 units a paper mm, so 1 unit = 10 mm; the kitchen 400 × 300 units = 4 m × 3 m */
 await p.evaluate(async()=>{const W=(a,b)=>({t:'shape',k:'wall',a,b,w:6});
   const doc={scale:50,objs:[{t:'room',name:'Kitchen',p:[[0,0],[400,0],[400,300],[0,300]]},W([0,0],[400,0]),W([400,0],[400,300]),W([400,300],[0,300]),W([0,300],[0,0]),{t:'shape',k:'door',a:[100,0],b:[190,0]}]};
   window.__blobs.src1=new Blob([JSON.stringify(doc)],{type:'application/json'});
   await window.__S.db.doc('sheets/owner/photos/dw1').set({kind:'sketch',assetId:'pv1',pageSrc:'src1',title:'Kitchen plan',created:Date.now()});});
 await p.waitForTimeout(800);
 await p.evaluate(()=>window.__T().jprOpen(window.__S.clients.find(c=>c.id==='c1')));await p.waitForTimeout(800);
 await p.locator('.jpr-add[data-k=sup]').click();await p.waitForTimeout(500);
 ok(await p.isVisible('#jp-fromdw'),'+ Add a price has 📐 From a drawing');
 await p.click('#jp-fromdw');await p.waitForTimeout(400);
 ok(/Kitchen plan/.test(await p.innerText('.dqt-box')),'it lists the drawings');
 await p.click('.dqt-dw');await p.waitForTimeout(800);
 const t=await p.innerText('.dqt-box');
 ok(/Kitchen – floor\s*12 m²/.test(t)&&/Kitchen – skirting\s*14 m/.test(t)&&/Kitchen – walls \(2\.4 m high\)\s*33\.6 m²/.test(t)&&/Doors\s*1 no\./.test(t)&&/total length\s*14 m/.test(t),'it measures the kitchen: floor 12 m², skirting 14 m, walls 33.6 m², 1 door, 14 m of wall');
 await p.screenshot({path:'h678-qty.png'});
 await p.fill('#dqt-h','2.7');await p.dispatchEvent('#dqt-h','change');await p.waitForTimeout(300);
 ok(/walls \(2\.7 m high\)\s*37\.8 m²/.test(await p.innerText('.dqt-box')),'a 2.7 m wall height gives 37.8 m²');
 await p.locator('.dqt-l',{hasText:'Kitchen – floor'}).locator('input').check();await p.locator('.dqt-l',{hasText:'Kitchen – skirting'}).locator('input').check();
 await p.click('.dqt-add');await p.waitForTimeout(500);
 const L=await p.$$eval('#jp-lines .jp-l',x=>x.map(r=>[r.querySelector('.jp-ld').value,r.querySelector('.jp-lq').value,r.querySelector('.jp-lu').value,r.querySelector('.jp-lr').value]));
 ok(L.length===2&&L[0][0]==='Kitchen – floor'&&L[0][1]==='12'&&L[0][2]==='m²'&&L[0][3]===''&&L[1][1]==='14'&&L[1][2]==='m','the ticked ones become lines with the quantities, rates to fill: '+JSON.stringify(L));
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h678: ${bad} failed`:'h678: all passed');await b.close();process.exit(bad?1:0);
})();
