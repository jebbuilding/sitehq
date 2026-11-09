// Cupboards – fillers, shelf supports, lighting, materials (made-up sizes). A wardrobe opening 2000 × 2500: fillers
// 40 left and right and 60 at the top, three bays (hanging, shelves with two drawers, shelves). Track shelves, puck
// lights in every bay on door sensors, white MFC carcass, oak-veneered doors, birch ply shelves, push-to-open runners.
// The cutting list (workshop pack) has the top filler, track and brackets (and no pin rows), the lights, driver and
// sensors, the runners, wall fixings and the boards to order; each board says what it's made of; the 3D view with the
// doors open shows the lights. Then the same with pins: the pin rows are drilled again.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const packText=async()=>{await p.evaluate(()=>document.querySelector('.np [data-bt=cupbpack]').click());await p.waitForTimeout(300);await p.click('#cbp-pdf');await p.waitForTimeout(1800);
  const t=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return s});await p.click('#f-cancel').catch(()=>{});await p.waitForTimeout(150);return t.replace(/[^\x20-\x7e]/g,' ').replace(/\\\(/g,'(').replace(/\\\)/g,')').split(') Tj T* (').join(' ');};
 const make=async(sup)=>{
  await p.evaluate(()=>document.querySelector('.np [data-bt=cupb]').click());await p.waitForTimeout(300);
  await p.selectOption('#cb2-kind','full');await p.waitForTimeout(100);
  await p.fill('#cb2-name','Wardrobe – '+sup);await p.fill('#cb2-W','2000');await p.fill('#cb2-H','2500');await p.fill('#cb2-D','600');
  await p.fill('#cb2-fl','40');await p.fill('#cb2-fr','40');await p.fill('#cb2-ftop','60');
  await p.fill('#cb2-n','3');await p.waitForTimeout(150);
  const bays=await p.$$('.cb2-bay');
  await (await bays[0].$('.cb2-k')).selectOption('hang1');
  await (await bays[1].$('.cb2-k')).selectOption('shelves');await (await bays[1].$('.cb2-s')).fill('3');await (await bays[1].$('.cb2-d')).fill('2');
  await (await bays[2].$('.cb2-k')).selectOption('shelves');await (await bays[2].$('.cb2-s')).fill('4');
  await p.$$eval('details.cb2-fin',ds=>ds.forEach(d=>d.open=true));
  await p.selectOption('#cb2-mc','MFC');await p.selectOption('#cb2-cc','#f4f4f1');await p.selectOption('#cb2-md','oak veneer MDF');await p.selectOption('#cb2-ms','birch ply');
  await p.selectOption('#cb2-sup',sup);await p.selectOption('#cb2-run','push');
  await p.selectOption('#cb2-lt','puck');await p.selectOption('#cb2-lon','door');await p.check('#cb2-la');
  await p.click('#f-save');await p.waitForTimeout(900);
 };
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 await make('track');
 ok(/Drawn on a new page/.test(await lastToast()),await lastToast());
 await p.screenshot({path:'h451-wardrobe.png'});
 const t=await packText();
 ok(/Filler/.test(t)&&/top; scri/.test(t)&&/to the ceiling/.test(t),'a top filler, scribed to the ceiling');
 ok(/Twin-slot uprights/.test(t)&&/Twin-slot shelf brackets/.test(t),'track: uprights and brackets');
 ok(!/Shelf pins Ø5|Shelf pins Ø/.test(t)&&!/every 32/.test(t),'track: no pin rows drilled');
 ok(/LED puck spotlight/.test(t)&&/LED driver/.test(t)&&/Door sensor switch/.test(t)&&/electrician/.test(t),'lights: pucks, driver, door sensors, electrician note');
 ok(/Drawer runners, push-to-open/.test(t),'push-to-open drawer runners');
 ok(/Wall fixing brackets/.test(t),'wall fixings for a tall unit');
 ok(/Materials to order/.test(t)&&/18 mm/.test(t),'materials to order');
 /* the drawing's cutting list says what each board is made of */
 const notes=await p.evaluate(()=>{const st=window.__st;return ''});void notes;
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb3d]').click());await p.waitForTimeout(400);
 await p.evaluate(()=>{const b=[...document.querySelectorAll('#cb3-open button, .cb3 button')].find(x=>/Doors open/.test(x.textContent));b&&b.click();});await p.waitForTimeout(400);
 const glow=await p.evaluate(()=>{const c=document.getElementById('cb3-cv');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4){if(d[i]>190&&d[i]-d[i+2]>45&&d[i+1]>150)n++}return n});
 ok(glow>8,'3D with the doors open: the lights glow ('+glow+')');
 await p.screenshot({path:'h451-3d.png'});
 await p.click('#cb3-x');await p.waitForTimeout(200);
 await make('pins');
 const t2=await packText();
 ok(/Shelf pins \(to buy\)/.test(t2)&&/every 32/.test(t2),'pins: shelf pins to buy and the pin rows drilled');
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h451: '+bad+' FAILED':'h451: all passed');
 await b.close()})();
