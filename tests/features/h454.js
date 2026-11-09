// Wardrobe sheet like a drawing set (made-up sizes): numbered view titles with their scale, the front coloured in
// the door colour, a section through every bay, a finishes key, the 3D picture on the sheet and four details at 1:5;
// the cutting list on the page after; the gola handle option. Writes h454-sheet.png and h454-cut.png.
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
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb]').click());await p.waitForTimeout(300);
 await p.fill('#cb2-name','Wardrobe – sheet');await p.fill('#cb2-W','2400');await p.fill('#cb2-H','2400');await p.fill('#cb2-D','600');await p.fill('#cb2-n','3');await p.waitForTimeout(150);
 const bays=await p.$$('.cb2-bay');
 await (await bays[0].$('.cb2-k')).selectOption('hang2');
 await (await bays[1].$('.cb2-k')).selectOption('shelves');await (await bays[1].$('.cb2-s')).fill('4');await (await bays[1].$('.cb2-d')).fill('2');
 await (await bays[2].$('.cb2-k')).selectOption('hang1');
 await p.$$eval('details.cb2-fin',ds=>ds.forEach(d=>d.open=true));
 await p.selectOption('#cb2-cd','#c9a477');await p.selectOption('#cb2-cc','#f4f4f1');await p.selectOption('#cb2-md','oak veneer MDF');await p.selectOption('#cb2-mc','MFC');
 await p.selectOption('#cb2-hd','gola');
 await p.click('#f-save');await p.waitForTimeout(1500);
 ok(/Drawn on a new page with the cutting list on the page after/.test(await lastToast()),await lastToast());
 const st=await p.evaluate(()=>{const d=window.__np();const pg=d.pages.find(x=>x.cupb);const cutp=d.pages.find(x=>/cutting list/.test(x.name));const tx=pg.objs.filter(o=>o.t==='text').map(o=>o.s);
  return {titles:tx.filter(s=>/^(FRONT|SECTION|PLAN)/.test(s)),nums:tx.filter(s=>/^\d\d$/.test(s)).length,scale:tx.some(s=>/^1:\d+$/.test(s)),img:pg.objs.some(o=>o.t==='img'),det:pg.objs.some(o=>o.t==='rect'&&o.vp===5)||(cutp&&cutp.objs.some(o=>o.vp===5)),detTitles:(pg.objs.concat(cutp?cutp.objs:[])).filter(o=>o.t==='text'&&/PLINTH|GOLA PROFILE|SHELF PIN|^\d\d  TOP/.test(o.s)).map(o=>o.s),finishes:tx.includes('FINISHES'),oak:pg.objs.some(o=>o.fill==='#c9a477'),cut:cutp&&cutp.objs.some(o=>o.t==='text'&&/CUTTING LIST/.test(o.s)),cutOnSheet:tx.some(s=>/CUTTING LIST/.test(s))}});
 console.log(JSON.stringify(st));
 ok(st.titles.filter(s=>/^SECTION/.test(s)).length===3,'a section through every bay ('+st.titles.join(' | ')+')');
 ok(st.nums>=6&&st.scale,'numbered view titles with their scale');
 ok(st.oak&&st.finishes,'the doors coloured in oak, and a finishes key');
 ok(st.img,'the 3D picture is on the sheet');
 ok(st.det&&st.detTitles.length>=4,'four details at 1:5 ('+st.detTitles.join(' | ')+')');
 ok(st.cut&&!st.cutOnSheet,'the cutting list is on its own page');
 await p.evaluate(()=>{const b=[...document.querySelectorAll('.np button')].find(x=>x.textContent.trim()==='Fit'||/Fit/.test(x.getAttribute('aria-label')||''));b&&b.click();});await p.waitForTimeout(500);
 await p.screenshot({path:'h454-sheet.png'});
 await p.evaluate(()=>{const b=[...document.querySelectorAll('.np button, .np [role=tab]')].find(x=>/cutting list/.test(x.textContent));b&&b.click();});await p.waitForTimeout(500);
 await p.screenshot({path:'h454-cut.png'});
 /* the pack orders gola profile */
 await p.evaluate(()=>{const b=[...document.querySelectorAll('.np button, .np [role=tab]')].find(x=>/Wardrobe – sheet$/.test(x.textContent.trim()));b&&b.click();});await p.waitForTimeout(300);
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h454: '+bad+' FAILED':'h454: all passed');
 await b.close()})();
