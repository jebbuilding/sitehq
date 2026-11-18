// The CDM scale (made-up job at 4 Rolle Road): CDM documents › 📋 Project assessment has 📏 See the scale, which opens
// a page with the four levels – the jobs each suits, when a job is at that level, what to plan for and the documents it
// ticks – with the level worked out for this job marked "Suggested for this job". Choose Level 3 ticks Level 3's
// documents (design risk register, temporary works register, inspection log…) straight away, and another can still be
// ticked; choosing a level in the Level box ticks its documents too. The hazards have a line saying what they are for.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const ticked=p=>p.$$eval('.cdd:checked',x=>x.map(i=>i.dataset.k));
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:1100},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=hs]').click());await p.waitForTimeout(500);
 await p.selectOption('#hs-cdmsite','4 Rolle Road, Exmouth');await p.click('#hs-cdm');await p.waitForTimeout(500);
 /* a small job with one contractor: Level 1 worked out */
 await p.click('#cdm-nc button[data-v=one]');await p.waitForTimeout(300);
 await p.evaluate(()=>document.querySelectorAll('.cdr:checked').forEach(i=>{i.checked=false;i.dispatchEvent(new Event('change'))}));await p.waitForTimeout(200);
 await p.fill('.cdf[data-k=workDays]','5');await p.locator('.cdf[data-k=workDays]').dispatchEvent('change');
 await p.fill('.cdf[data-k=maxWorkers]','2');await p.locator('.cdf[data-k=maxWorkers]').dispatchEvent('change');await p.waitForTimeout(200);
 ok(/Tick each kind of work or risk this job has/.test(await p.innerText('#cdm-body')),'the hazards have a line saying what they are for');
 await p.click('#cdm-scale');await p.waitForTimeout(400);
 const sc=p.locator('.cdm-scale');
 ok(await sc.isVisible()&&await p.locator('.cdm-scale .cdm-scl').count()===4,'📏 See the scale opens a page with the four levels');
 const st=await sc.innerText();
 ok(/Jobs like:/.test(st)&&/When:/.test(st)&&/Plan for:/.test(st)&&/Documents it ticks:/.test(st),'each level says the jobs it suits, when, what to plan and the documents it ticks');
 ok(/Suggested for this job/.test(await p.locator('.cdm-scale .cdm-scl.cdm-l1').innerText()),'Level 1 is marked as suggested for this small job');
 await p.screenshot({path:OUT+'cdm-scale.png'});
 await p.click('.cdm-scale .cdm-scpick[data-n="3"]');await p.waitForTimeout(500);
 ok(await p.locator('.cdm-scale').count()===0,'choosing a level closes the scale');
 let t=await ticked(p);
 ok(/Level 3/.test(await p.innerText('.cdm-lvl'))&&['cpp','drr','tw','log','subcon'].every(k=>t.includes(k)),'Choose Level 3 ticks Level 3\'s documents straight away ('+t.join(', ')+')');
 await p.check('.cdd[data-k=hotpermit]');t=await ticked(p);
 ok(t.includes('hotpermit')&&t.includes('drr'),'and another document can still be ticked');
 await p.selectOption('#cdm-lset','1');await p.waitForTimeout(400);
 t=await ticked(p);
 ok(/Level 1/.test(await p.innerText('.cdm-lvl'))&&t.includes('cpp')&&!t.includes('drr'),'choosing Level 1 in the Level box ticks Level 1\'s documents');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h540: ${bad} failed`:'h540: all passed');await b.close();process.exit(bad?1:0);
})();
