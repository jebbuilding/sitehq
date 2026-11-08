// Drawing tool › Build › 🧱 Retaining wall (all made-up sizes): each type drawn on its own page with a section,
// elevation, plan and materials; a wall holding back more than 1 m or with a drive behind says to get an engineer;
// the ground dropping along the wall steps the top. Writes h448-<type>.png to look at.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const WALLS=[
 ['block',{L:6000,H:900,H2:900,up:150,behind:'garden'},false],
 ['brick',{L:5000,H:700,H2:400,up:150,behind:'path'},false],
 ['rc',{L:8000,H:1400,H2:1400,up:0,behind:'drive'},true],
 ['sleeper',{L:4800,H:600,H2:600,up:0,behind:'garden'},false],
 ['gabion',{L:6000,H:1200,H2:1200,up:0,behind:'garden'},true],
];
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 ok(!!(await p.$('.np [data-bt=retw]')),'Build has 🧱 Retaining wall');
 for(const [type,v,eng] of WALLS){
  await p.evaluate(()=>document.querySelector('.np [data-bt=retw]').click());await p.waitForTimeout(300);
  await p.selectOption('#rw-type',type);await p.fill('#rw-name','Wall – '+type);
  await p.fill('#rw-L',String(v.L));await p.fill('#rw-H',String(v.H));await p.fill('#rw-H2',String(v.H2));await p.fill('#rw-up',String(v.up));await p.selectOption('#rw-behind',v.behind);await p.waitForTimeout(150);
  const w=await p.innerText('#rw-warn');
  ok(eng?/engineer/.test(w):!/engineer/.test(w),`${type}: ${eng?'says to get an engineer':'no engineer warning'} in the form`);
  await p.click('#f-save');await p.waitForTimeout(900);
  const t=await lastToast();
  ok(/Drawn on a new page: section at 1:\d+, elevation and plan at 1:\d+/.test(t),`${type}: ${t.slice(0,90)}`);
  const pg=await p.evaluate(()=>{const tx=[...document.querySelectorAll('.np-pages button, .np-ptab')].map(x=>x.textContent).join('|');return tx;});
  ok(pg.includes('Wall – '+type),`${type}: its own page`);
  await p.screenshot({path:`h448-${type}.png`});
 }
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h448: '+bad+' FAILED':'h448: all passed');
 await b.close()})();
