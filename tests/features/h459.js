// Reconcile the bank (owner, made-up figures): the way you sorted a payment is offered for the next one like it
// ("learns"), a merchant payment split between two categories (and the profit and loss counts both parts), find and
// match a part payment to an invoice, a transfer to a second account spotted from both halves, choose several and
// sort them at once, tick lines off, check against the statement balance (wrong figure: out by; right figure: agrees,
// ticks off and locks the finished month), a later statement leaves the locked month alone and sorts a payment the
// way it was sorted before, and a locked month can be unlocked after a yes.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
/* a customer invoice for £1,200 (inc VAT) waiting to be paid */
src=src.replace('store["sheets/"+E+"/invoices/i"]={','store["todos/sd-a"]={kind:"sale",type:"invoice",number:"7",date:"2026-09-01",client:"Mrs Test",lines:[{d:"Work",a:1000,vc:"S20",k:"lab"}],status:"awaiting",payments:[]};store["sheets/"+E+"/invoices/i"]={');
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const H='Date,Type,Description,Paid out,Paid in,Balance';
fs.writeFileSync('h459-business.csv',[H,
 '01/09/2026,DEB,SCREWFIX EXETER 1111,50.00,,950.00',
 '05/09/2026,DEB,SCREWFIX EXETER 2222,30.00,,920.00',
 '10/09/2026,FPO,TRANSFER TO SAVINGS,200.00,,720.00',
 '20/09/2026,DEB,TRAVIS PERKINS EXMOUTH,300.00,,420.00',
 '30/09/2026,FPI,MRS TEST PART PAYMENT,,600.00,1020.00',
 '02/10/2026,DEB,BP FUEL EXMOUTH,40.00,,980.00',
 '15/10/2026,DEB,BP FUEL EXMOUTH,60.00,,920.00'].join('\r\n'));
fs.writeFileSync('h459-savings.csv',[H,'11/09/2026,FPI,TRANSFER FROM BUSINESS,,200.00,5200.00'].join('\r\n'));
fs.writeFileSync('h459-later.csv',[H,
 '29/09/2026,DEB,SOMETHING MISSED,5.00,,1015.00',
 '20/10/2026,DEB,SCREWFIX EXETER 3333,25.00,,895.00'].join('\r\n'));
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await ctx.route(/^https?:\/\//,r=>r.abort());
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const txs=()=>p.evaluate(()=>Object.entries(window.__st).filter(([k,v])=>v&&v.kind==='acctx').flatMap(([k,v])=>v.tx.map(t=>Object.assign({rec:k.replace('todos/',''),acc:v.acc},t))));
 const months=()=>p.evaluate(()=>Object.values(window.__st).filter(v=>v&&v.kind==='acctx').map(v=>({acc:v.acc,month:v.month,locked:!!v.locked})));
 const row=(txt)=>p.locator('.ac-tx',{hasText:txt}).first();
 const all=async()=>{await p.click('#ac-f button[data-v=all]');await p.waitForTimeout(200);};
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 if(await p.$('#nl-tog')){await p.click('#nl-tog');await p.waitForTimeout(300);await p.evaluate(()=>{const t=document.querySelector('#nl-tog');if(t)t.style.display='none'});}
 await p.evaluate(()=>document.querySelector('.tab[data-t=accounts]').click());await p.waitForTimeout(300);
 await p.click('#ac-tabs button[data-v=bank]');await p.waitForTimeout(200);
 await p.click('#ac-newacc');await p.waitForTimeout(200);await p.fill('#aa-n','Business');await p.fill('#aa-b','Test Bank');await p.click('#f-save');await p.waitForTimeout(400);
 await p.setInputFiles('#main .ac-file','h459-business.csv');await p.waitForTimeout(800);
 ok(/Brought in 7 payments/.test(await lastToast()),'statement in: '+await lastToast());
 await all();
 ok(/✓ 0 of 7 ticked off/.test(await p.innerText('.acr-bar')),'the bar: 0 of 7 ticked off');
 /* learns: sort one Screwfix payment, the other offers the same */
 await row('SCREWFIX EXETER 1111').locator('.ac-cat').selectOption('mat');await p.waitForTimeout(300);
 const pill=row('SCREWFIX EXETER 2222').locator('.acr-learn');
 ok(await pill.count()===1&&/Materials\?/.test(await pill.innerText()),'the next Screwfix payment offers 💡 Materials (as before)');
 await pill.click();await p.waitForTimeout(300);
 ok((await txs()).filter(t=>/SCREWFIX/.test(t.desc)&&t.cat==='mat').length===2,'one tap sorts it the same way');
 /* split Travis Perkins: £200 materials, £100 tool hire */
 await row('TRAVIS PERKINS').locator('.ac-more').click();await p.waitForTimeout(200);
 await p.click('#at-split');await p.waitForTimeout(300);
 const sp=p.locator('#acr-sps .acr-sp');
 await sp.nth(0).locator('.acr-spc').selectOption('mat');await sp.nth(0).locator('.acr-spa').fill('200');
 await sp.nth(0).locator('.acr-spv').fill('33.33');
 ok(/£100\.00 still to put in a part/.test(await p.innerText('#acr-left')),'it says what is left: £100');
 await sp.nth(1).locator('.acr-spc').selectOption('hire');await sp.nth(1).locator('.acr-spa').fill('150');
 await p.click('#f-save');await p.waitForTimeout(300);
 ok(/come to £350\.00/.test(await p.innerText('.sheet, #sheet, body')),'parts that do not add up are refused');
 await p.locator('#acr-sps .acr-sp').nth(1).locator('.acr-spa').fill('100');await p.click('#f-save');await p.waitForTimeout(400);
 ok(/Split into 2 parts/.test(await lastToast()),await lastToast());
 const tp=(await txs()).find(t=>/TRAVIS/.test(t.desc));
 ok(tp.split&&tp.split.length===2&&tp.split[0].amt===-200&&tp.split[1].cat==='hire'&&!tp.cat&&tp.vat===33.33,'saved as two parts (£200 materials with £33.33 VAT, £100 hire)');
 ok(/✂️ Split: Materials £200\.00, Plant, skip and tool hire £100\.00/.test(await row('TRAVIS PERKINS').innerText()),'the row shows the split');
 /* find and match a part payment */
 await row('MRS TEST PART').locator('.ac-more').click();await p.waitForTimeout(200);
 await p.click('#at-find');await p.waitForTimeout(300);
 await p.fill('#acr-fq','mrs');await p.waitForTimeout(200);
 ok(/INV-7 · Mrs Test/.test(await p.innerText('#acr-fl'))&&/part payment/.test(await p.innerText('#acr-fl')),'finds INV-7 (a part payment)');
 await p.locator('#acr-fl .acr-fi').first().click();await p.waitForTimeout(500);
 ok(/Payment recorded on invoice 7/.test(await lastToast()),await lastToast());
 const inv=await p.evaluate(()=>window.__st['todos/sd-a']);
 ok(inv.payments.length===1&&inv.payments[0].amt===600,'£600 recorded on the invoice');
 /* a second account: the transfer is spotted from both sides */
 await p.click('#ac-newacc');await p.waitForTimeout(200);await p.fill('#aa-n','Savings');await p.click('#f-save');await p.waitForTimeout(400);
 await p.setInputFiles('#main .ac-file','h459-savings.csv');await p.waitForTimeout(800);
 await all();
 ok(/Transfer from Business\?/.test(await row('TRANSFER FROM BUSINESS').innerText()),'Savings: 🔁 Transfer from Business?');
 await p.click('#ac-accs button:has-text("Business")');await p.waitForTimeout(200);await all();
 await row('TRANSFER TO SAVINGS').locator('.acr-xf').click();await p.waitForTimeout(400);
 const xf=(await txs()).filter(t=>/TRANSFER/.test(t.desc));
 ok(xf.length===2&&xf.every(t=>t.cat==='xfer'&&t.link&&t.link.t==='xfer'),'both halves are transfers, linked to each other');
 ok(/To Savings/.test(await row('TRANSFER TO SAVINGS').innerText()),'the row says "To Savings"');
 /* choose several: the two BP payments */
 await p.click('#ac-f button[data-v=sort]');await p.waitForTimeout(200);
 ok(await p.locator('.ac-tx').count()===2,'two left to sort (the fuel)');
 await p.click('#acr-pick');await p.waitForTimeout(200);
 await p.click('#acr-pall');await p.waitForTimeout(200);
 ok(/2 chosen/.test(await p.innerText('#acr-pn')),'choose all shown: 2 chosen');
 await p.click('#acr-pgo');await p.waitForTimeout(200);
 await p.selectOption('#acr-bc','veh');await p.click('#f-save');await p.waitForTimeout(400);
 ok(/2 payments done/.test(await lastToast()),await lastToast());
 ok((await txs()).filter(t=>/BP FUEL/.test(t.desc)&&t.cat==='veh').length===2,'both in Vans, fuel and travel');
 await p.click('#acr-pick');await p.waitForTimeout(200);await all();
 /* tick one off by hand */
 await row('BP FUEL').locator('.acr-okc').check();await p.waitForTimeout(300);
 ok(/✓ 1 of 7 ticked off/.test(await p.innerText('.acr-bar')),'ticked one off by hand');
 await p.screenshot({path:'h459-bank.png',fullPage:true});
 /* check against the statement */
 await p.click('#acr-check');await p.waitForTimeout(200);
 await p.fill('#acr-d','2026-09-30');await p.fill('#acr-b','1000');await p.waitForTimeout(150);
 ok(/SiteHQ's balance on [\s\S]*£1,020\.00/.test(await p.innerText('#acr-res'))&&/Out by £20\.00/.test(await p.innerText('#acr-res')),'a wrong figure: out by £20.00');
 await p.click('#f-save');await p.waitForTimeout(200);
 ok(/Out by £20\.00: the statement has less/.test(await p.innerText('body')),'and it will not agree');
 await p.fill('#acr-b','1020');await p.waitForTimeout(150);
 ok(/Agrees with your statement/.test(await p.innerText('#acr-res')),'the right figure agrees');
 await p.screenshot({path:'h459-check.png'});
 await p.click('#f-save');await p.waitForTimeout(500);
 ok(/Agrees with the statement: £1,020\.00/.test(await lastToast())&&/5 ticked off/.test(await lastToast())&&/1 month locked/.test(await lastToast()),await lastToast());
 const ms=await months();
 ok(ms.find(m=>m.month==='2026-09'&&m.acc!==(ms.find(x=>x.locked&&x.month==='2026-10')||{}).acc).locked&&!ms.find(m=>m.month==='2026-10').locked,'September is locked, October is not');
 await all();
 ok(await row('SCREWFIX EXETER 1111').locator('.ac-cat').isDisabled()&&/🔒/.test(await row('SCREWFIX EXETER 1111').innerText()),'September payments show 🔒 and cannot be changed');
 ok(!(await row('BP FUEL EXMOUTH').locator('.ac-cat').isDisabled()),'October can still be changed');
 /* a later statement: September is left alone, the new Screwfix is sorted as before */
 await p.setInputFiles('#main .ac-file','h459-later.csv');await p.waitForTimeout(800);
 const t2=await lastToast();
 ok(/Brought in 1 payment/.test(t2)&&/1 sorted the way you did before/.test(t2)&&/1 left out: their month is locked/.test(t2),'later statement: '+t2);
 ok((await txs()).find(t=>/3333/.test(t.desc)).cat==='mat'&&!(await txs()).some(t=>/SOMETHING MISSED/.test(t.desc)),'the new Screwfix is in Materials; nothing added to September');
 /* unlock September */
 await all();
 await row('SCREWFIX EXETER 1111').locator('.ac-more').click();await p.waitForTimeout(200);
 ok(await p.isVisible('#at-unlock'),'the payment sheet offers to unlock the month');
 await p.click('#at-unlock');await p.waitForTimeout(200);
 ok(/Unlock September 2026\?/.test(await p.innerText('.dimbox')),'asks first');
 await p.click('.dimbox .sago');await p.waitForTimeout(400);
 ok(!(await months()).some(m=>m.locked),'September unlocked');
 ok(!(await row('SCREWFIX EXETER 1111').locator('.ac-cat').isDisabled()),'and can be changed again');
 /* the profit and loss counts the split */
 await p.click('#ac-tabs button[data-v=over]');await p.waitForTimeout(300);
 const ov=await p.innerText('#main');
 ok(/Plant, skip and tool hire\s+-?£100\.00/.test(ov),'profit and loss: £100 tool hire from the split');
 ok(/Materials\s+-?£(?:2[0-9]{2}|3[0-9]{2})\.\d\d/.test(ov),'and materials includes the split part');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h459: ${bad} failed`:'h459: all passed');await b.close();process.exit(bad?1:0);
})();
