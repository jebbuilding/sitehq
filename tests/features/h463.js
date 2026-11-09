// Live profit per job (made-up figures): an accepted estimate for 12 Marine Way – £6,000 labour, £4,000 materials –
// is the price; aiming for 20% profit the budget is £8,000 (labour £4,800, materials £3,200). Bank payments booked to
// the job count as costs: £2,000 of materials is on track; at 20% through it's heading over; more materials push it
// over budget, then past the price (losing money). The job list and Today show the warning, and Today's card opens
// the job.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+'store["todos/sd-e1"]={kind:"sale",type:"estimate",number:"3001",date:"2026-10-01",client:"Mr Test",site:"12 Marine Way, Exmouth",status:"accepted",lines:[{d:"Building work",a:6000,vc:"S20",k:"lab"},{d:"Materials",a:4000,vc:"S20",k:"mat"}],payments:[]};');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const H='Date,Type,Description,Paid out,Paid in,Balance';
fs.writeFileSync('h463-bank.csv',[H,'02/10/2026,DEB,TRAVIS PERKINS EXMOUTH,2400.00,,7600.00','05/10/2026,DEB,JEWSON EXETER,1800.00,,5800.00','09/10/2026,DEB,BUILDBASE EXETER,5000.00,,800.00'].join('\r\n'));
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await ctx.route(/^https?:\/\//,r=>r.abort());
 const row=(txt)=>p.locator('.ac-tx',{hasText:txt}).first();
 const msg=()=>p.innerText('.jbg-msg');
 const goJob=async()=>{await p.evaluate(()=>document.querySelector('.tab[data-t=accounts]').click());await p.waitForTimeout(200);await p.click('#ac-tabs button[data-v=jobs]');await p.waitForTimeout(300);if(await p.$('#jc-back')){await p.click('#jc-back');await p.waitForTimeout(200);}await p.locator('.jc-row',{hasText:'12 Marine Way'}).click();await p.waitForTimeout(300);};
 /* book a bank payment to the job, at 20% VAT (net = 5/6) */
 const book=async(txt)=>{await p.evaluate(()=>document.querySelector('.tab[data-t=accounts]').click());await p.waitForTimeout(200);await p.click('#ac-tabs button[data-v=bank]');await p.waitForTimeout(200);await p.click('#ac-f button[data-v=all]');await p.waitForTimeout(200);
  await row(txt).locator('.ac-more').click();await p.waitForTimeout(200);await p.selectOption('#at-c','mat');await p.click('#at-v20');await p.selectOption('#at-s','12 Marine Way, Exmouth');await p.click('#f-save');await p.waitForTimeout(400);};
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 if(await p.$('#nl-tog')){await p.click('#nl-tog');await p.waitForTimeout(300);await p.evaluate(()=>{const t=document.querySelector('#nl-tog');if(t)t.style.display='none'});}
 await p.evaluate(()=>document.querySelector('.tab[data-t=accounts]').click());await p.waitForTimeout(300);
 await p.click('#ac-tabs button[data-v=bank]');await p.waitForTimeout(200);
 await p.click('#ac-newacc');await p.waitForTimeout(200);await p.fill('#aa-n','Business');await p.click('#f-save');await p.waitForTimeout(400);
 await p.setInputFiles('#main .ac-file','h463-bank.csv');await p.waitForTimeout(800);
 await goJob();
 ok(/Mark the estimate|Budget and profit/.test(await p.innerText('.jbg-card'))&&/Budget and profit/.test(await p.innerText('.jbg-card')),'the job has a Budget and profit card (from the accepted estimate)');
 ok(/✓ On track/.test(await msg()),'nothing spent yet: on track');
 ok(/£10,000\.00 less 20% profit/.test(await p.innerText('.jbg-card'))&&/£0\.00 of £8,000\.00/.test(await p.innerText('.jbg-card')),'budget £8,000 (price £10,000 less 20%)');
 ok(/£0\.00 of £4,800\.00/.test(await p.innerText('.jbg-card'))&&/£0\.00 of £3,200\.00/.test(await p.innerText('.jbg-card')),'split like the estimate: labour £4,800, materials £3,200');
 /* £2,400 inc VAT of materials = £2,000 */
 await book('TRAVIS PERKINS');
 await goJob();
 ok(/Bank: TRAVIS PERKINS/.test(await p.innerText('#main'))&&/£2,000\.00 of £3,200\.00/.test(await p.innerText('.jbg-card')),'the bank payment counts: £2,000 of the £3,200 materials');
 ok(/✓ On track/.test(await msg()),'still on track');
 ok(/Some hours count as £0/.test(await p.innerText('.jbg-card')),'it says hours with no cost rate count as £0');
 /* only 20% through: on course for £10,000 */
 await p.fill('#jbg-done','20');await p.press('#jbg-done','Tab');await p.waitForTimeout(400);
 ok(/⚠ Heading over/.test(await msg())&&/on course to cost £10,000\.00, £2,000\.00 over budget/.test(await msg()),'20% through: heading over – '+await msg());
 await p.screenshot({path:'h463-job.png',fullPage:true});
 await p.fill('#jbg-done','');await p.press('#jbg-done','Tab');await p.waitForTimeout(400);
 /* £1,500 more materials: £3,500 is more than its £3,200 share */
 await book('JEWSON');
 await goJob();
 ok(/⚠ Heading over/.test(await msg())&&/Materials and hire already £300\.00 over its share/.test(await msg()),'materials over their share: '+await msg());
 /* the job list */
 await p.click('#jc-back');await p.waitForTimeout(300);
 ok(/⚠ Heading over/.test(await p.locator('.jc-row',{hasText:'12 Marine Way'}).innerText()),'the job list says it is heading over');
 /* £4,166.67 more: £7,666.67 is still under £8,000 overall… then the profit aim goes up to 25% */
 await book('BUILDBASE');
 await goJob();
 ok(/✕ Losing money|⚠ Over budget|⚠ Heading over/.test(await msg()),'more materials: '+await msg());
 await p.fill('#jbg-tgt','25');await p.press('#jbg-tgt','Tab');await p.waitForTimeout(400);
 ok(/⚠ Over budget £166\.67 over: profit down to £2,333\.33/.test(await msg())&&/aiming for 25%/.test(await msg()),'aiming for 25% (budget £7,500): over budget by £166.67 – '+await msg());
 /* Today shows it */
 await p.evaluate(()=>document.querySelector('#nlbar .nl-b[data-s=today]')&&document.querySelector('#nlbar .nl-b[data-s=today]').click());await p.waitForTimeout(400);
 ok(await p.isVisible('.jbg-today')&&/1 job going over budget/.test(await p.innerText('.jbg-today'))&&/12 Marine Way/.test(await p.innerText('.jbg-today')),'Today: a card says 1 job is going over budget');
 await p.screenshot({path:'h463-today.png'});
 await p.click('.jbg-today .jbg-go');await p.waitForTimeout(500);
 ok(await p.isVisible('.jbg-card')&&/12 Marine Way/.test(await p.innerText('.jc-h')),'tapping it opens the job');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h463: ${bad} failed`:'h463: all passed');await b.close();process.exit(bad?1:0);
})();
