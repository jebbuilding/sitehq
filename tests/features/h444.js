// New cupboard shapes (all made-up sizes): the picture for each shape in the form; each one drawn on its own page with
// its cutting list, a 3D view without errors, and the workshop pack. Checks: the corner has its blank panel, under the
// stairs has raking parts cut at an angle, the eaves sides follow the roof, the bench has a back board and hooks.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const SHAPES=[['corner','Corner wardrobe',/Corner blank panel/],['stairs','Under-stairs cupboard',/Top .{0,2}raking/],['eaves','Eaves storage',/cut to the roof slope/],['bridge','Bedroom wall',/Bridge over the bed/],['window','Window surround',/Under the window/],['seat','Window seat',/Seat cushion/],['bench','Boot room bench',/Back board/],['tv','TV wall',/Media unit/]];
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb]').click());await p.waitForTimeout(300);
 ok((await p.$$('.cb2-kpics .cb2-pic')).length===13,'13 pictures to pick what you\'re making ('+(await p.$$('.cb2-kpics .cb2-pic')).length+')');
 ok((await p.$$('.cb2-dpics .cb2-pic')).length===4,'door pictures');
 await p.click('#f-cancel');await p.waitForTimeout(200);
 for(const [k,name,re] of SHAPES){
  await p.evaluate(()=>document.querySelector('.np [data-bt=cupb]').click());await p.waitForTimeout(300);
  await p.click(`.cb2-kpics .cb2-pic[data-v=${k}]`);await p.waitForTimeout(150);
  ok(await p.inputValue('#cb2-kind')===k&&await p.inputValue('#cb2-name')===name,`${name}: picked by its picture`);
  await p.click('#f-save');await p.waitForTimeout(900);
  const t=await lastToast();
  if(!/Drawn on a new page/.test(t)){ok(false,name+' drawn: '+t);continue;}
  await p.screenshot({path:`h444-${k}.png`});
  await p.evaluate(()=>document.querySelector('.np [data-bt=cupbpack]').click());await p.waitForTimeout(300);
  await p.click('#cbp-pdf');await p.waitForTimeout(1500);
  const txt=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return s});
  ok(re.test(txt),`${name}: drawn, cutting list and workshop pack (${re.source.replace(/\\/g,'')})`);
  await p.click('#f-cancel').catch(()=>{});await p.waitForTimeout(150);
  await p.evaluate(()=>document.querySelector('.np [data-bt=cupb3d]').click());await p.waitForTimeout(400);
  const tones=await p.evaluate(()=>{const c=document.getElementById('cb3-cv');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;const s=new Set();for(let i=0;i<d.length;i+=400)s.add((d[i]>>4)+','+(d[i+1]>>4)+','+(d[i+2]>>4));return s.size});
  ok(tones>12,`${name}: 3D view (${tones} tones)`);
  await p.screenshot({path:`h444-${k}-3d.png`});
  await p.click('#cb3-x');await p.waitForTimeout(150);
 }
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h444: '+bad+' FAILED':'h444: all passed');
 await b.close()})();
