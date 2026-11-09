// Live profit, filled in by itself (made-up figures): a signed £1,000 variation puts 12 Marine Way's price up from
// £10,000 to £11,000; how far through comes from the job sheet (1 of 4 tasks ticked = 25%); Sam's hours are costed
// from their subcontractor agreement (£200 a day = £25/h) without typing a rate; the Cost rates sheet fills a rate
// in from a saved wage calculation; and a second payment to the same merchant suggests the job the first went to.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/sd-e1"]={kind:"sale",type:"estimate",number:"3001",date:"2026-10-01",client:"Mr Test",site:"12 Marine Way, Exmouth",status:"accepted",lines:[{d:"Building work",a:6000,vc:"S20",k:"lab"},{d:"Materials",a:4000,vc:"S20",k:"mat"}],payments:[]};'+
 'store["todos/var-1"]={kind:"variation",number:"V1",site:"12 Marine Way, Exmouth",title:"Extra window",amt:1000,vc:"S20",status:"signed",sign:{name:"Mr Test",at:1},created:1};'+
 'store["jobs/jb1"]={title:"Kitchen extension",site:"12 Marine Way, Exmouth",tasks:[{id:"t1",text:"Footings"},{id:"t2",text:"Walls"},{id:"t3",text:"Roof"},{id:"t4",text:"Finish"}],assignees:[]};store["jobdone/jb1__t1"]={done:true};'+
 'store["sheets/emp1/signoffs/sa1"]={type:"persdoc",kind:"subagree",agree:{name:"Sam Test",rate:200,rateType:"day"},created:5};'+
 'store["todos/wc-1"]={kind:"wagecalc",name:"Carpenter",rate:20,days:253,hol:28,hrs:8};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const H='Date,Type,Description,Paid out,Paid in,Balance';
fs.writeFileSync('h465-bank.csv',[H,'02/10/2026,DEB,TRAVIS PERKINS EXMOUTH 1,240.00,,7760.00','12/10/2026,DEB,TRAVIS PERKINS EXMOUTH 2,120.00,,7640.00'].join('\r\n'));
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await ctx.route(/^https?:\/\//,r=>r.abort());
 const row=(txt)=>p.locator('.ac-tx',{hasText:txt}).first();
 const goJob=async()=>{await p.evaluate(()=>document.querySelector('.tab[data-t=accounts]').click());await p.waitForTimeout(200);await p.click('#ac-tabs button[data-v=jobs]');await p.waitForTimeout(300);if(await p.$('#jc-back')){await p.click('#jc-back');await p.waitForTimeout(200);}await p.locator('.jc-row',{hasText:'12 Marine Way'}).click();await p.waitForTimeout(300);};
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 if(await p.$('#nl-tog')){await p.click('#nl-tog');await p.waitForTimeout(300);await p.evaluate(()=>{const t=document.querySelector('#nl-tog');if(t)t.style.display='none'});}
 await goJob();
 const box=await p.innerText('.sd-boxes');
 ok(/Price \(estimate \+ variations\)\s*£11,000\.00/.test(box)&&/1 variation £1,000\.00/.test(box),'the signed variation puts the price up to £11,000');
 ok(/£11,000\.00 less 20% profit, including £1,000\.00 of signed variations/.test(await p.innerText('.jbg-card')),'and the budget (£8,800) counts it');
 {const m=(await p.innerText('.jbg-card')).match(/(\d+)% through – from the job sheets: (\d+) of (\d+) tasks ticked off/);
 ok(m&&+m[1]===Math.round(+m[2]/+m[3]*100)&&+m[2]>=1,'how far through comes from the job sheets\' ticked tasks: '+(m&&m[0]));}
 const lab=await p.innerText('.card:has-text("Labour") table');
 ok(/Sam Test[\s\S]*£25\.00/.test(lab)&&!/count as £0/.test(await p.innerText('.jbg-card')),'Sam\'s hours cost £25/h from their agreement (£200 a day) – no £0 warning');
 /* the Cost rates sheet: from a wage calculation */
 await p.click('#jc-rates');await p.waitForTimeout(300);
 ok(/agreement £25\.00\/h/.test(await p.innerText('#form')),'Cost rates shows Sam\'s agreement rate');
 const sel=p.locator('.jr-wc').first();
 ok(await sel.count()===1&&/Carpenter – £\d+\.\d\d\/h/.test(await sel.innerText()),'a wage calculation can fill in a rate: '+(await sel.innerText()).replace(/\s+/g,' '));
 const wid=await sel.getAttribute('data-w');
 await sel.selectOption({label:(await sel.locator('option').nth(1).innerText())});await p.waitForTimeout(100);
 const filled=await p.inputValue('#jr-'+wid);
 ok(+filled>20&&+filled<40,'it fills in what they cost you an hour (pay + NI, pension, holiday): £'+filled);
 await p.click('#f-save');await p.waitForTimeout(400);
 ok(+(await p.evaluate(w=>window.__st['todos/jcset'].cost[w],wid))===+filled,'and it is saved');
 /* the bank: the job suggested from the last payment to the same merchant */
 await p.evaluate(()=>document.querySelector('.tab[data-t=accounts]').click());await p.waitForTimeout(200);await p.click('#ac-tabs button[data-v=bank]');await p.waitForTimeout(200);
 await p.click('#ac-newacc');await p.waitForTimeout(200);await p.fill('#aa-n','Business');await p.click('#f-save');await p.waitForTimeout(400);
 await p.setInputFiles('#main .ac-file','h465-bank.csv');await p.waitForTimeout(800);await p.click('#ac-f button[data-v=all]');await p.waitForTimeout(200);
 ok(!(await row('EXMOUTH 2').locator('.acr-job').count()),'no suggestion before any have been booked');
 await row('EXMOUTH 1').locator('.ac-more').click();await p.waitForTimeout(200);await p.selectOption('#at-s','12 Marine Way, Exmouth');await p.click('#f-save');await p.waitForTimeout(400);
 const pill=row('EXMOUTH 2').locator('.acr-job');
 ok(await pill.count()===1&&/📍 12 Marine Way, Exmouth\?/.test(await pill.innerText()),'the next Travis Perkins payment suggests 📍 12 Marine Way');
 await pill.click();await p.waitForTimeout(400);
 const tx=await p.evaluate(()=>Object.values(window.__st).filter(v=>v&&v.kind==='acctx').flatMap(v=>v.tx));
 ok(tx.every(t=>t.site==='12 Marine Way, Exmouth'),'one tap books it to the job');
 ok(/📍 12 Marine Way/.test(await row('EXMOUTH 2').innerText()),'the row shows the job');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h465: ${bad} failed`:'h465: all passed');await b.close();process.exit(bad?1:0);
})();
