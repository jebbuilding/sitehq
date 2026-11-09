// Workshop pack – materials and sheets (made-up sizes): a 2400 × 2400 wardrobe in white MFC with oak-veneered doors.
// The pack shows a row for each material with a sheet size and price; bigger sheets need fewer; your own size that's
// too small says which panels won't fit; prices give a total; the sizes are remembered; the PDF has Materials to
// order and a cutting layout for every sheet.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb]').click());await p.waitForTimeout(300);
 await p.fill('#cb2-name','Wardrobe – sheets');await p.fill('#cb2-W','2400');await p.fill('#cb2-H','2400');await p.fill('#cb2-D','600');await p.fill('#cb2-n','3');
 await p.$$eval('details.cb2-fin',ds=>ds.forEach(d=>d.open=true));
 await p.selectOption('#cb2-mc','MFC');await p.selectOption('#cb2-cc','#f4f4f1');await p.selectOption('#cb2-md','oak veneer MDF');
 await p.click('#f-save');await p.waitForTimeout(900);
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupbpack]').click());await p.waitForTimeout(400);
 const rows=await p.$$eval('.cbp-mrow',r=>r.map(x=>x.dataset.k));
 ok(rows.some(k=>/18 mm brilliant white MFC/.test(k))&&rows.some(k=>/oak veneer MDF/.test(k)),'a row for each material ('+rows.join(' | ')+')');
 const out=()=>p.innerText('#cbp-out');
 const n1=+(/(\d+) sheets? of 18 mm brilliant white MFC/.exec(await out())||[])[1];
 ok(n1>0,'sheets of white MFC worked out at 2440 × 1220 ('+n1+')');
 const row=await p.$('.cbp-mrow[data-k*="white MFC"]');
 await (await row.$('.cbp-sz')).selectOption('2800x2070');await p.waitForTimeout(200);
 const n2=+(/(\d+) sheets? of 18 mm brilliant white MFC/.exec(await out())||[])[1];
 ok(n2>0&&n2<n1,'bigger 2800 × 2070 sheets need fewer ('+n2+')');
 await (await row.$('.cbp-p')).fill('48.50');await p.fill('#cbp-ep','0.60');await p.waitForTimeout(200);
 ok(new RegExp('£'+(n2*48.5).toFixed(2)).test(await out())&&/Boards and edging about £/.test(await out()),'prices give a cost for the sheets and a total');
 const vrow=await p.$('.cbp-mrow[data-k*="oak veneer"]');
 await (await vrow.$('.cbp-sz')).selectOption('own');await (await vrow.$('.cbp-L')).fill('1800');await (await vrow.$('.cbp-W')).fill('600');await p.waitForTimeout(200);
 ok(/Too big for this sheet/.test(await out()),'a sheet too small for the doors says which won\'t fit');
 ok(/grain kept along the length/.test(await out()),'veneer keeps its grain along the length');
 await (await vrow.$('.cbp-sz')).selectOption('2440x1220');await p.waitForTimeout(150);
 await p.click('#f-cancel');await p.waitForTimeout(200);await p.evaluate(()=>document.querySelector('.np [data-bt=cupbpack]').click());await p.waitForTimeout(400);
 const r2=await p.$('.cbp-mrow[data-k*="white MFC"]');
 ok((await (await r2.$('.cbp-L')).inputValue())==='2800'&&(await (await r2.$('.cbp-p')).inputValue())==='48.5','sheet sizes and prices are remembered');
 await p.screenshot({path:'h452-pack.png'});
 await p.click('#cbp-pdf');await p.waitForTimeout(2500);
 const t=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return s});
 const b64=Buffer.from(t,'latin1').toString('base64');fs.writeFileSync('h452-pack.pdf',Buffer.from(b64,'base64'));
 ok(/Materials to order/.test(t)&&/Cutting layout/.test(t)&&/sheet 1 of/.test(t),'the PDF has Materials to order and a cutting layout per sheet');
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h452: '+bad+' FAILED':'h452: all passed');
 await b.close()})();
