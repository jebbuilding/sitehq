// Wardrobe options (all made-up sizes): an opening 2000 wide (2010 at the top) × 2500 high, with a 50 mm filler on the
// left, 30 on the right, an end panel on the left and a 100 mm cornice: the carcass is 2000 − 50 − 30 − 18 = 1902
// wide × 2400 high. Three bays: one door; a glazed door; open with a shoe rack and an LED light. The cutting list
// (read from the workshop pack) has the fillers, end panel, cornice, glazed frame and glass, shoe shelves, LED and
// hinges; the 3D view draws it.
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
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb]').click());await p.waitForTimeout(300);
 ok(await p.isVisible('#cb2-fl')&&await p.isVisible('#cb2-co')&&await p.isVisible('#cb2-wt'),'wardrobe: fillers, end panels, cornice and out-of-square width');
 await p.fill('#cb2-name','Wardrobe – options');await p.fill('#cb2-W','2000');await p.fill('#cb2-H','2500');await p.fill('#cb2-D','600');
 await p.fill('#cb2-fl','50');await p.fill('#cb2-fr','30');await p.check('#cb2-el');await p.fill('#cb2-co','100');await p.fill('#cb2-wt','2010');
 await p.selectOption('#cb2-doors','hinged');
 await p.fill('#cb2-n','3');await p.waitForTimeout(150);
 const bays=await p.$$('.cb2-bay');
 ok(bays.length===3&&!!(await bays[0].$('.cb2-dr'))&&!!(await bays[0].$('.cb2-shoe')),'each bay has its doors and fittings');
 await (await bays[0].$('.cb2-k')).selectOption('hang1');
 await (await bays[1].$('.cb2-k')).selectOption('shelves');await (await bays[1].$('.cb2-s')).fill('3');await (await bays[1].$('.cb2-dr')).selectOption('glass');
 await (await bays[2].$('.cb2-k')).selectOption('shelves');await (await bays[2].$('.cb2-s')).fill('2');await (await bays[2].$('.cb2-dr')).selectOption('none');await (await bays[2].$('.cb2-shoe')).check();await (await bays[2].$('.cb2-led')).check();
 await p.click('#f-save');await p.waitForTimeout(900);
 ok(/Drawn on a new page/.test(await lastToast()),await lastToast());
 await p.screenshot({path:'h443-wardrobe.png'});
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupbpack]').click());await p.waitForTimeout(400);
 await p.click('#cbp-pdf');await p.waitForTimeout(2500);
 const txt=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return s});
 ok(/Top\) Tj|Top/.test(txt)&&/1866 . 600/.test(txt.replace(/[^\x20-\x7e]/g,' ')),'carcass top 1866 long: the carcass is 1902 wide (2000 − 50 − 30 − 18)');
 ok(['Filler','End panel','Cornice','Glazed door frame','Shoe shelf'].every(w=>txt.includes(w)),'cutting list has the fillers, end panel, cornice, glazed door frame and shoe shelves');
 ok(/Glass panel/.test(txt)&&/LED strip/.test(txt)&&/hinges/.test(txt),'and the glass, LED strip and hinges to buy');
 await p.click('#f-cancel').catch(()=>{});await p.waitForTimeout(200);
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb3d]').click());await p.waitForTimeout(500);
 const tones=await p.evaluate(()=>{const c=document.getElementById('cb3-cv');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let gl=0;for(let i=0;i<d.length;i+=16){if(d[i+2]>d[i]+4&&d[i+2]>150)gl++}return gl});
 ok(tones>200,'3D view draws the glazed door ('+tones+')');
 await p.screenshot({path:'h443-3d.png'});
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h443: '+bad+' FAILED':'h443: all passed');
 await b.close()})();
