// Glass colours (made-up sample): 🎨 Choose colour on coloured glass and splashbacks opens the RAL chart (search by number
// or name); a sample of real glass (two photos, RAL number, finish) added there shows at the top and puts its photo on the piece;
// a typed RAL number shows its colour; the order PDF has the colour square and the sample's photo. On Forms 🎨 RAL colours is
// the chart only; 🟦 Glass samples lists the samples – tap to see the photos and details, ✎ Edit to change them.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>(window.__last=b,window.__blobs["up"+c]=b,');
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;').replace('function render() {','window.render=render;window.__T=()=>({GLO});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(400);
 await p.evaluate(()=>window.__T().GLO.edit(null,{}));await p.waitForTimeout(500);
 await p.click('.glo-new[data-t=colour]');await p.waitForTimeout(300);
 const it=p.locator('.glo-item').nth(0);
 await it.locator('[data-k=w]').fill('600');await it.locator('[data-k=h]').fill('400');
 ok(await it.locator('.glc-open').count()===1,'coloured glass has 🎨 Choose colour');
 await it.locator('.glc-open').click();await p.waitForTimeout(500);
 const n=await p.locator('.glc-sw').count();
 ok(n>=210,'the picker shows the RAL chart ('+n+' colours) in families');
 await p.screenshot({path:'h675-picker.png'});
 await p.fill('.glc-q','9010');await p.waitForTimeout(300);
 ok(await p.locator('.glc-sw').count()===1&&/Pure white/.test(await p.innerText('.glc-sw')),'searching 9010 finds Pure white');
 await p.fill('.glc-q','blue');await p.waitForTimeout(300);
 ok(await p.locator('.glc-sw').count()>=20,'searching blue finds the blues ('+(await p.locator('.glc-sw').count())+')');
 await p.locator('.glc-sw[data-c="5024"]').click();await p.waitForTimeout(400);
 ok(await it.locator('[data-k=col]').inputValue()==='RAL 5024 Pastel blue'&&/background/.test(await it.locator('.glc-chip').getAttribute('style')),'tapping one fills the colour, with its little square');
 /* a photo of real glass */
 const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=60;const g=c.getContext('2d');g.fillStyle='#2a6b8a';g.fillRect(0,0,80,60);return c.toDataURL('image/png').split(',')[1]});
 await p.click('.glo-new[data-t=splash]');await p.waitForTimeout(300);
 const it2=p.locator('.glo-item').nth(1);
 await it2.locator('[data-k=w]').fill('1800');await it2.locator('[data-k=h]').fill('600');
 await it2.locator('.glc-open').click();await p.waitForTimeout(400);
 const png2=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=60;const g=c.getContext('2d');g.fillStyle='#1d4f66';g.fillRect(0,0,80,60);return c.toDataURL('image/png').split(',')[1]});
 await p.click('.glc-new');await p.waitForTimeout(400);
 await p.setInputFiles('.glc-file',[{name:'sample.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')},{name:'fitted.png',mimeType:'image/png',buffer:Buffer.from(png2,'base64')}]);await p.waitForTimeout(500);
 ok(await p.locator('.glc-ph').count()===2,'📷 Add a glass sample: two photos at once');
 await p.locator('.glc-cap').nth(1).fill('Fitted, daylight');
 await p.fill('#glc-nm','Smoked teal');await p.fill('#glc-ral','5021');await p.selectOption('#glc-fi','Gloss (back-painted)');await p.fill('#glc-gl','6mm toughened, back-painted');await p.fill('#glc-nt','Example Glass sample');
 await p.click('form.dimbox button[type=submit]');await p.waitForTimeout(1500);
 const sm=Object.values(await p.evaluate(()=>window.__st)).find(v=>v&&v.kind==='glasscolour');
 ok(sm&&sm.name==='Smoked teal'&&sm.photos.length===2&&sm.photos[1].cap==='Fitted, daylight'&&sm.ral==='5021'&&sm.assetId===sm.photos[0].assetId,'saved with both photos, the RAL number, finish and glass');
 ok(await p.locator('.glc-use').count()===1&&/Smoked teal/.test(await p.innerText('.glc-use'))&&await p.isVisible('.glc-edq'),'it shows at the top of the picker with ✎ Edit');
 await p.screenshot({path:'h675-samples.png'});
 await p.click('.glc-use');await p.waitForTimeout(400);
 ok(await it2.locator('[data-k=col]').inputValue()==='Smoked teal'&&await it2.locator('img.glc-chip').count()===1,'choosing it puts its name and photo on the piece');
 /* typed colour */
 await p.click('.glo-new[data-t=colour]');await p.waitForTimeout(300);
 const it3=p.locator('.glo-item').nth(2);
 await it3.locator('[data-k=col]').fill('ral 3020');await p.waitForTimeout(200);
 ok(/background/.test(await it3.locator('.glc-chip').getAttribute('style')||''),'typing "ral 3020" shows its colour too');
 await it3.locator('.glo-x').click();await p.waitForTimeout(300);
 /* PDF */
 await p.click('#glo-pdf');await p.waitForTimeout(4000);
 const pdf=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return s});
 fs.writeFileSync('h675-order.pdf',Buffer.from(pdf,'latin1'));
 ok(/RAL 5024 Pastel blue/.test(pdf)&&/Smoked teal/.test(pdf)&&/\/Subtype \/Image/.test(pdf),'the PDF has the RAL colour and the sample with its photo');
 await p.click('#pdfbar-x').catch(()=>{});
 await p.click('#f-save');await p.waitForTimeout(1000);
 const rec=Object.values(await p.evaluate(()=>window.__st)).find(v=>v&&v.kind==='glassorder');
 ok(rec&&rec.items[0].colHex&&rec.items[1].colPhoto===sm.assetId,'saved with the colour and the photo');
 /* on Forms, for anything */
 await p.evaluate(()=>{window.__S.otab='jobs';window.render()});await p.waitForTimeout(600);
 ok(await p.isVisible('#ral-chart'),'Forms has 🎨 RAL colours');
 await p.click('#ral-chart');await p.waitForTimeout(500);
 ok(/RAL colours/.test(await p.innerText('.glc-head'))&&await p.locator('.glc-sw').count()>=210&&await p.locator('.glc-use,.glc-new').count()===0,'it opens the RAL chart only – no glass samples');
 await p.fill('.glc-q','9016');await p.waitForTimeout(300);await p.click('.glc-sw');await p.waitForTimeout(400);
 ok(/RAL 9016 Traffic white/.test(await p.innerText('.glc-big'))&&await p.isVisible('.glc-cp'),'tapping a colour shows it big with its number and name, and 📋 Copy');
 await p.screenshot({path:'h675-big.png'});
 await p.click('.glc-ok');await p.waitForTimeout(300);
 /* 🟦 Glass samples, on their own page */
 ok(await p.isVisible('#glass-lib'),'Forms has 🟦 Glass samples');
 await p.click('#glass-lib');await p.waitForTimeout(500);
 ok(await p.locator('.glc-see').count()===1&&/RAL 5021/.test(await p.innerText('.glc-see')),'it lists the sample, with its RAL number');
 await p.click('.glc-see');await p.waitForTimeout(400);
 ok(await p.locator('.glc-th').count()===2&&/6mm toughened/.test(await p.innerText('.glc-sbig')),'tapping it shows both photos and the details');
 await p.click('.glc-ed');await p.waitForTimeout(400);
 await p.locator('.glc-phx').nth(0).click();await p.waitForTimeout(300);
 await p.selectOption('#glc-fi','Satin / acid-etched');
 await p.click('form.dimbox button[type=submit]');await p.waitForTimeout(1200);
 const sm2=Object.values(await p.evaluate(()=>window.__st)).find(v=>v&&v.kind==='glasscolour');
 ok(sm2.photos.length===1&&sm2.photos[0].cap==='Fitted, daylight'&&sm2.finish==='Satin / acid-etched'&&sm2.assetId===sm2.photos[0].assetId,'✎ Edit: a photo taken out, the finish changed');
 await p.screenshot({path:'h675-lib.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h675: ${bad} failed`:'h675: all passed');await b.close();process.exit(bad?1:0);
})();
