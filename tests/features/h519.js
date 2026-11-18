// CDM project assessment (James's "CDM project assessment & notification guide"; made-up job at 4 Rolle Road): at the
// top of Health & safety › CDM documents it shows JEB's level, the CPP every project needs, the principal designer /
// principal contractor / H&S file when there's more than one contractor, the F10 tests, and what's still missing. It
// follows what's filled in: one contractor and a small job is Level 1; ticking structural alterations makes it Level 3;
// over 500 person-days makes it notifiable (Level 4). "Tick the documents this level needs" ticks them.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const lvl=p=>p.evaluate(()=>document.querySelector('.cdm-lvl').textContent);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=hs]').click());await p.waitForTimeout(500);
 await p.selectOption('#hs-cdmsite','4 Rolle Road, Exmouth');await p.click('#hs-cdm');await p.waitForTimeout(500);
 ok(await p.isVisible('.cdm-ass'),'CDM documents starts with a 📋 Project assessment');
 const a0=await p.innerText('.cdm-ass');
 ok(/construction phase plan \(CPP\)/.test(a0)&&/principal designer and principal contractor in writing/.test(a0)&&/health & safety file/.test(a0),'every project needs a CPP; more than one contractor brings PD and PC appointments and an H&S file');
 ok(/Still to fill in below/.test(a0),'it lists the details still missing');
 /* one contractor, small job, none of the risky ticks */
 await p.click('#cdm-nc button[data-v=one]');await p.waitForTimeout(300);
 await p.evaluate(()=>document.querySelectorAll('.cdr:checked').forEach(i=>{i.checked=false;i.dispatchEvent(new Event('change'))}));await p.waitForTimeout(200);
 await p.fill('.cdf[data-k=workDays]','5');await p.locator('.cdf[data-k=workDays]').dispatchEvent('change');
 await p.fill('.cdf[data-k=maxWorkers]','2');await p.locator('.cdf[data-k=maxWorkers]').dispatchEvent('change');await p.waitForTimeout(200);
 ok(/Level 1 – Basic/.test(await lvl(p))&&/One contractor/.test(await p.innerText('.cdm-ass')),'one contractor, 5 days, nothing risky: Level 1 – Basic');
 /* James chooses a higher level himself */
 await p.selectOption('#cdm-lset','2');await p.waitForTimeout(200);
 ok(/Level 2 – Enhanced/.test(await lvl(p))&&/you chose this/.test(await lvl(p))&&/worked out: Level 1/.test(await lvl(p)),'he can choose the level himself (Level 2 on a Level 1 job), and it says what it worked out');
 ok(/tick any other document below/.test(await p.innerText('.cdm-ass')),'and it says he can tick any other document too');
 ok(await p.locator('.cdm-ass a[href*="hse.gov.uk/forms/notification/f10"][target=_blank]').count()===1,'a button opens the F10 on the HSE website');
 await p.selectOption('#cdm-lset','');await p.waitForTimeout(200);
 /* structural alterations */
 await p.check('.cdr[data-k=struct]');await p.waitForTimeout(200);
 ok(/Level 3 – Comprehensive/.test(await lvl(p))&&/Significant hazards ticked: Structural alterations/.test(await p.innerText('.cdm-ass')),'ticking structural alterations makes it Level 3 and says why');
 /* notifiable */
 await p.fill('.cdf[data-k=workDays]','120');await p.locator('.cdf[data-k=workDays]').dispatchEvent('change');
 await p.fill('.cdf[data-k=maxWorkers]','6');await p.locator('.cdf[data-k=maxWorkers]').dispatchEvent('change');await p.waitForTimeout(200);
 const a2=await p.innerText('.cdm-ass');
 ok(/Level 4/.test(await lvl(p))&&/Notifiable/.test(a2)&&/F10/.test(a2),'120 days with 6 people (720 person-days) is notifiable: Level 4, send an F10');
 await p.locator('.cdm-ass').screenshot({path:OUT+'cdm-1-assess.png'});
 await p.click('#cdm-need');await p.waitForTimeout(400);
 const ticked=await p.evaluate(()=>[...document.querySelectorAll('.cdd:checked')].map(i=>i.dataset.k));
 ok(['cpp','f10','tw','drr','emerg'].every(k=>ticked.includes(k)),'"Tick the documents this level needs" ticks them ('+ticked.join(', ')+')');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h519: ${bad} failed`:'h519: all passed');await b.close();process.exit(bad?1:0);
})();
