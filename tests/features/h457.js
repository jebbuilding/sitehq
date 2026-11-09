// Cupboards from the wardrobe picture (made-up sizes): a 2400 × 2400 wardrobe under a ceiling sloping down to 1400 at
// the left over the first 1200, with a face frame (doors over it) and four bays – hanging, three drawers of 250, 200
// and 150, and two of shelves. The cutting list has the short low-end side, the raking top, the frame's stiles, rails
// and muntins in tulipwood, the drawer fronts at their own heights with their boxes, doors cut to the slope and shelves
// cut short under it. Then a second cupboard: the toast says the workshop pack can do both, and the pack for the whole
// job has both cupboards' panels, each named by its cupboard.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const HOOK='  let lenObj = null;';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2,'test hook found once');
page_src=page_src.replace(HOOK,HOOK+'window.__np=()=>doc;window.__pg=()=>pg;');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const cutList=()=>p.evaluate(()=>{const d=window.__np();const pgs=d.pages.filter(x=>/cutting list/.test(x.name||''));const q=pgs[pgs.length-1];return q.objs.filter(o=>o.t==='text').map(o=>o.s)});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 /* the eaves wardrobe */
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb]').click());await p.waitForTimeout(300);
 await p.selectOption('#cb2-kind','full');await p.waitForTimeout(100);
 await p.fill('#cb2-name','Eaves wardrobe');await p.fill('#cb2-W','2400');await p.fill('#cb2-H','2400');await p.fill('#cb2-D','600');
 ok(!(await p.isVisible('#cb2-slh'))&&!(await p.isVisible('#cb2-ffw')),'the slope and frame sizes are hidden until picked');
 await p.selectOption('#cb2-sl','L');await p.fill('#cb2-slh','1400');await p.fill('#cb2-slw','1200');
 await p.selectOption('#cb2-ff','overlay');
 ok(await p.isVisible('#cb2-slh')&&await p.isVisible('#cb2-ffw')&&(await p.inputValue('#cb2-ffm'))==='Tulipwood','picked: their sizes show (frame timber Tulipwood)');
 await p.fill('#cb2-n','4');await p.waitForTimeout(150);
 const bays=await p.$$('.cb2-bay');
 await (await bays[0].$('.cb2-k')).selectOption('hang1');
 await (await bays[1].$('.cb2-k')).selectOption('drawers');await (await bays[1].$('.cb2-d')).fill('3');await (await bays[1].$('.cb2-s')).fill('2');
 await (await bays[1].$('details.cb2-adj')).evaluate(d=>d.open=true);await (await bays[1].$('.cb2-dh')).fill('250, 200, 150');
 await (await bays[2].$('.cb2-k')).selectOption('shelves');await (await bays[2].$('.cb2-s')).fill('4');
 await (await bays[3].$('.cb2-k')).selectOption('shelves');await (await bays[3].$('.cb2-s')).fill('4');
 await p.click('#f-save');await p.waitForTimeout(1200);
 ok(/Drawn on a new page/.test(await lastToast()),await lastToast());
 const cl=(await cutList()).join('\n');
 ok(/1 × Side: 1400 × 600/.test(cl)&&/low end, under the slope/.test(cl),'the low-end side is 1400 high');
 ok(/Top \(raking\)/.test(cl)&&/ends cut at \d+°/.test(cl)&&/the level part/.test(cl),'a raking top under the slope and a level top for the rest');
 ok(/2 × Face frame stile: 2300 × 45 × 20 – tulipwood/i.test(cl),'two face frame stiles, 2300 × 45 × 20 tulipwood');
 ok(/3 × Face frame muntin/.test(cl)&&/Face frame rail/.test(cl),'three muntins between four bays, and the rails');
 ok(/Drawer front: \d+ × 247/.test(cl)&&/Drawer front: \d+ × 197/.test(cl)&&/Drawer front: \d+ × 147/.test(cl),'drawer fronts at 250, 200 and 150 (less the gaps)');
 ok(/Drawer box side/.test(cl)&&/Drawer base/.test(cl),'with their drawer boxes');
 ok(/top cut to the slope: \d+ at the left, \d+ at the right/.test(cl),'doors under the slope are cut to it, with both heights');
 ok(/overlays the face frame by 12/.test(cl),'doors overlay the frame');
 ok(/end cut to the slope/.test(cl)||!/Shelf.*bay 1/.test(cl),'shelves high up under the slope are cut short ('+(/end cut to the slope/.test(cl)?'cut':'none high enough')+')');
 /* the drawing: the front follows the slope */
 const front=await p.evaluate(()=>{const d=window.__np();const q=d.pages.find(x=>x.name==='Eaves wardrobe');return q.objs.filter(o=>o.t==='text').map(o=>o.s).join(' | ')});
 ok(/slope \d+°/.test(front)&&/sloping down to 1400 at the left/.test(front),'the drawing says the slope and its angle');
 ok(/face frame 45 mm tulipwood, doors over the frame/.test(front),'and the face frame');
 await p.evaluate(()=>{const d=window.__np();const i=d.pages.findIndex(x=>x.name==='Eaves wardrobe');const b=[...document.querySelectorAll('.np-pg, .np .np-pages button')].find(x=>x.dataset&&+x.dataset.i===i);b&&b.click();});await p.waitForTimeout(400);
 await p.screenshot({path:'h457-eaves.png'});
 /* the 3D view still draws */
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb3d]').click());await p.waitForTimeout(600);
 await p.screenshot({path:'h457-3d.png'});
 ok(await p.isVisible('#cb3-cv'),'the 3D view opens');
 await p.click('#cb3-x');await p.waitForTimeout(200);
 /* a second cupboard: the whole job */
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb]').click());await p.waitForTimeout(300);
 await p.fill('#cb2-name','Alcove wardrobe');await p.selectOption('#cb2-sl','');await p.selectOption('#cb2-ff','');await p.fill('#cb2-W','1200');await p.fill('#cb2-n','2');await p.waitForTimeout(150);
 await p.click('#f-save');await p.waitForTimeout(1200);
 ok(/2 cupboards in this job/.test(await lastToast()),'second cupboard: '+await lastToast());
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupbpack]').click());await p.waitForTimeout(400);
 ok(await p.isVisible('#cbp-which'),'the workshop pack asks: this cupboard or the whole job');
 const one=await p.innerText('.sheet .who');
 await p.selectOption('#cbp-which','job');await p.waitForTimeout(500);
 const all=await p.innerText('.sheet .who');
 const n1=+(/(\d+) panels/.exec(one)||[0,0])[1],n2=+(/(\d+) panels/.exec(all)||[0,0])[1];
 ok(n2>n1&&/every cupboard in this drawing/.test(all),'the whole job has more panels ('+n1+' → '+n2+')');
 await p.screenshot({path:'h457-pack.png'});
 await p.click('#cbp-pdf');await p.waitForTimeout(2000);
 const t=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return [r.filename,s]});
 const txt=t[1].replace(/[^\x20-\x7e]/g,' ');
 ok(/Whole job/.test(t[0])&&/Eaves wardrobe/.test(txt)&&/Alcove wardrobe/.test(txt),'the PDF is for the whole job, naming both cupboards ('+t[0]+')');
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h457: '+bad+' FAILED':'h457: all passed');
 await b.close()})();
