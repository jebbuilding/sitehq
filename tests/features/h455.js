// Importing a drawing to scale (made-up picture): a 2000 × 1000 picture with an 8 m line across 1600 of its pixels.
// On a page with no scale yet, measuring the line as 8000 mm sets a page scale that fits and places it to scale;
// selecting it shows "Scale measured · on this page at 1:N · ✓ to scale". If the page scale is changed, it says how
// far out it is and ↺ Back to scale puts it right; 📏 Check the scale re-measures it.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const HOOK='  let lenObj = null;';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2,'test hook found once');
page_src=page_src.replace(HOOK,HOOK+'window.__np=()=>doc;window.__mm=(u)=>realMm(u);window.__draw=()=>{draw();opBar(sel!=null?doc.objs[sel]:null);};');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 await p.evaluate(()=>{window.__np().scale=0;});
 /* the picture: white, with a thick line from x 200 to x 1800 */
 const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=2000;c.height=1000;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,2000,1000);g.fillStyle='#000';g.fillRect(200,495,1600,10);g.fillRect(195,450,10,100);g.fillRect(1795,450,10,100);return c.toDataURL('image/png').split(',')[1]});
 await p.evaluate(()=>document.querySelector('.np .np-import').click());await p.waitForTimeout(300);
 await p.setInputFiles('.dimask input[type=file]',{name:'plan.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await p.waitForTimeout(1500);
 ok(/no scale yet/.test(await p.innerText('.npinote')),'it says the page has no scale and one will be set');
 const cb=await (await p.$('.npicv')).boundingBox();
 await p.click('.npimode button[data-m=meas]');
 await p.mouse.click(cb.x+cb.width*0.1,cb.y+cb.height*0.5);await p.waitForTimeout(100);
 await p.mouse.click(cb.x+cb.width*0.9,cb.y+cb.height*0.5);await p.waitForTimeout(100);
 await p.fill('.npimm','8000');await p.click('.npiok');await p.waitForTimeout(500);
 const t1=await lastToast();
 const st=await p.evaluate(()=>{const d=window.__np();const o=d.objs.find(x=>x.t==='img');return {sc:d.scale,w:Math.round(window.__mm(o.w)),mmpp:o.mmpp}});
 ok(st.sc>0&&/the page had no scale/.test(t1),'a page scale was set: 1:'+st.sc+' ('+t1+')');
 ok(Math.abs(st.w-10000)<=20,'the picture is 10 m wide for real (2000 px at 5 mm a pixel): '+st.w);
 ok(await p.isVisible('.np-opbar')&&/Scale measured · on this page at 1:\d+ · ✓ to scale/.test(await p.innerText('.np-opbar .nob-i')),'its bar: '+await p.innerText('.np-opbar .nob-i'));
 /* the page scale changed: it says it's out, and puts it back */
 await p.evaluate(()=>{const d=window.__np();d.scale=d.scale*2;window.__draw();});await p.waitForTimeout(200);
 const out=await p.innerText('.np-opbar .nob-i');
 ok(/⚠ \d+% too big/.test(out)&&await p.isVisible('.np-opbar .nob-fix'),'after the page scale changes: '+out);
 await p.click('.np-opbar .nob-fix');await p.waitForTimeout(200);
 const st2=await p.evaluate(()=>{const o=window.__np().objs.find(x=>x.t==='img');return Math.round(window.__mm(o.w))});
 ok(Math.abs(st2-10000)<=20&&/✓ to scale/.test(await p.innerText('.np-opbar .nob-i')),'↺ Back to scale: 10 m again ('+st2+')');
 /* check the scale: measure the same line as 4000 – it halves */
 await p.click('.np-opbar .nob-chk');await p.waitForTimeout(400);
 ok(/Check the scale/.test(await p.innerText('.npimpbox b')),'📏 Check the scale opens measuring');
 const cb2=await (await p.$('.npicv')).boundingBox();
 await p.mouse.click(cb2.x+cb2.width*0.1,cb2.y+cb2.height*0.5);await p.waitForTimeout(100);
 await p.mouse.click(cb2.x+cb2.width*0.9,cb2.y+cb2.height*0.5);await p.waitForTimeout(100);
 await p.fill('.npimm','4000');await p.click('.npiok');await p.waitForTimeout(400);
 const st3=await p.evaluate(()=>{const o=window.__np().objs.find(x=>x.t==='img');return Math.round(window.__mm(o.w))});
 ok(Math.abs(st3-5000)<=20,'re-measured as 4 m: now 5 m wide ('+st3+')');
 await p.screenshot({path:'h455.png'});
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h455: '+bad+' FAILED':'h455: all passed');
 await b.close()})();
