// Accounts (owner): add a bank account, bring in a statement CSV (made-up figures, "Paid in / Paid out" columns like
// most UK banks), skip ones already brought in, sort a payment and make a rule (which sorts the others), add VAT
// from a receipt, match money in to an invoice (records the payment) and money out to a trade's invoice (marks it
// paid), and the overview: money in, out, profit, profit and loss by category, VAT estimate, export.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const pad=n=>String(n).padStart(2,'0');const isoD=x=>x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());const uk=x=>pad(x.getDate())+'/'+pad(x.getMonth()+1)+'/'+x.getFullYear();
const D=(n)=>{const x=new Date();x.setDate(x.getDate()-n);return x;};
/* a customer invoice for £1,200 (inc VAT) waiting to be paid, and a trade's approved invoice for £850 */
src=src.replace('store["sheets/"+E+"/invoices/i"]={number:"0042",invDate:today,sentAt:Date.now(),status:"sent",amount:850,','store["todos/sd-a"]={kind:"sale",type:"invoice",number:"7",date:"'+isoD(D(20))+'",client:"Mrs Test",lines:[{d:"Work",a:1000,vc:"S20",k:"lab"}],status:"awaiting",payments:[]};store["sheets/"+E+"/invoices/i"]={number:"0042",invDate:today,sentAt:Date.now(),status:"approved",amount:850,');
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
/* a stand-in for Claude reading the receipt photo: the platform's sample(), with images */
src=src.replace('downloads:{save:','sample:Object.assign(async()=>({text:""}),{limits:async()=>({maxPromptBytes:65536,images:{maxCount:5,maxInputBytes:5e6,mediaTypes:["image/jpeg","image/png"]}}),json:async(p,o)=>{window.__sampled=(o&&o.images||[]).length;return {supplier:"Screwfix Exmouth",date:window.__rcDate,total:120,vat:20,vatNo:"GB123456789",desc:"Screws and fixings",cat:"mat",paid:"card"}}}),downloads:{save:');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const csv=['Date,Type,Description,Paid out,Paid in,Balance',
 `${uk(D(10))},DEB,SCREWFIX DIRECT 1234,120.00,,4880.00`,
 `${uk(D(8))},DEB,SCREWFIX DIRECT 5678,60.00,,4820.00`,
 `${uk(D(6))},FPI,MRS TEST INV 7,,1200.00,6020.00`,
 `${uk(D(5))},FPO,SAM TEST 0042,850.00,,5170.00`,
 `${uk(D(3))},DD,VAN FINANCE LTD,300.00,,4870.00`].join('\r\n');
fs.writeFileSync('h428-bank.csv',csv);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await ctx.route(/^https?:\/\//,r=>r.abort());
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const st=()=>p.evaluate(()=>window.__st);
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 ok(await p.isVisible('#tabs .tab[data-t=accounts]'),'Accounts tab (owner)');
 await p.click('#tabs .tab[data-t=accounts]');await p.waitForTimeout(300);
 await p.click('#ac-tabs button[data-v=bank]');await p.waitForTimeout(200);
 await p.click('#ac-newacc');await p.waitForTimeout(200);await p.fill('#aa-n','Business account');await p.fill('#aa-b','Test Bank');await p.fill('#aa-l','1234');await p.click('#f-save');await p.waitForTimeout(400);
 await p.setInputFiles('#main .ac-file','h428-bank.csv');await p.waitForTimeout(800);
 ok(/Brought in 5 payments/.test(await lastToast()),'statement brought in: '+await lastToast());
 await p.setInputFiles('#main .ac-file','h428-bank.csv');await p.waitForTimeout(800);
 ok(/Brought in 0 payments \(5 already there\)/.test(await lastToast()),'the same statement again adds nothing: '+await lastToast());
 await p.click('#ac-f button[data-v=all]');await p.waitForTimeout(200);
 ok(/balance £4,870\.00/.test(await p.innerText('#main')),'balance from the statement: £4,870');
 /* sort Screwfix with a rule and 20% VAT: the other Screwfix payment is sorted too */
 const row=async(txt)=>p.locator('.ac-tx',{hasText:txt}).first();
 await (await row('SCREWFIX DIRECT 1234')).locator('.ac-more').click();await p.waitForTimeout(200);
 await p.selectOption('#at-c','mat');await p.click('#at-v20');await p.check('#at-r');await p.fill('#at-rw','SCREWFIX');await p.click('#f-save');await p.waitForTimeout(500);
 ok(/1 more sorted/.test(await lastToast()),'rule saved and the other Screwfix payment sorted: '+await lastToast());
 const s1=await st();const tx=Object.values(s1).filter(v=>v&&v.kind==='acctx').flatMap(v=>v.tx);
 ok(tx.filter(t=>/SCREWFIX/.test(t.desc)&&t.cat==='mat').length===2&&tx.find(t=>/1234/.test(t.desc)).vat===20,'both in Materials, £20 VAT on the £120 receipt');
 /* a receipt photo: Claude reads it, it's checked, and matched to the second Screwfix payment's twin (£120 on the same week) */
 await p.evaluate(d=>window.__rcDate=d,isoD(D(10)));
 await p.click('#ac-tabs button[data-v=rcpt]');await p.waitForTimeout(200);
 await p.setInputFiles('#main .ac-rfile','fixtures/test.jpg');await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>window.__sampled)===1,'the photo was sent to Claude to read');
 ok(await p.isVisible('#rr-s')&&await p.inputValue('#rr-s')==='Screwfix Exmouth'&&await p.inputValue('#rr-t')==='120'&&await p.inputValue('#rr-v')==='20','shop, total and VAT filled in from the photo');
 ok(/bank payment on/.test(await p.innerText('#rr-m')),'it found the bank payment: '+await p.innerText('#rr-m'));
 await p.click('#f-save');await p.waitForTimeout(600);
 ok(/matched to the bank payment/.test(await lastToast()),'saved and matched: '+await lastToast());
 const rc=Object.values(await st()).find(v=>v&&v.kind==='acrcpt');
 const txr=Object.values(await st()).filter(v=>v&&v.kind==='acctx').flatMap(v=>v.tx).find(t=>t.rcpt);
 ok(rc&&rc.status==='done'&&rc.tx&&txr&&/SCREWFIX DIRECT 1234/.test(txr.desc)&&txr.vat===20,'the bank payment holds the receipt and its £20 VAT');
 await p.click('#ac-tabs button[data-v=bank]');await p.waitForTimeout(300);await p.click('#ac-f button[data-v=all]');await p.waitForTimeout(200);
 ok((await p.$$('.ac-rlink')).length===1,'📎 Receipt shown on the bank payment');
 /* match money in to the invoice, money out to Sam's invoice */
 await (await row('MRS TEST')).locator('.ac-match').click();await p.waitForTimeout(500);
 const inv=(await st())['todos/sd-a'];
 ok(inv.payments.length===1&&inv.payments[0].amt===1200,'£1,200 recorded on invoice 7 (now paid)');
 await (await row('SAM TEST 0042')).locator('.ac-match').click();await p.waitForTimeout(500);
 const tr=(await st())['sheets/emp1/invoices/i'];
 ok(tr.status==='paid'&&tr.paidOn,'Sam\'s invoice marked paid');
 await (await row('VAN FINANCE')).locator('.ac-cat').selectOption('loan');await p.waitForTimeout(400);
 /* overview */
 await p.click('#ac-tabs button[data-v=over]');await p.waitForTimeout(300);await p.click('#ac-per button[data-v="3m"]');await p.waitForTimeout(300);
 const ov=await p.innerText('#main');
 /* in: 1,200 sales; out: 100 + 50 materials (VAT taken out) + 850 subcontractors = 1,000; profit 200; van finance not counted */
 ok(/Money in\s+£1,200\.00/i.test(ov)&&/Money out\s+£1,000\.00/i.test(ov)&&/Profit \(before tax\)\s+£200\.00/i.test(ov),'in £1,200, out £1,000 (VAT taken out), profit £200');
 ok(/Materials\s+£150\.00/.test(ov)&&/Subcontractors \(CIS\)\s+£850\.00/.test(ov)&&/Loans and finance repayments\s+£300\.00/.test(ov),'profit and loss by category; the van finance shown as not counted in profit');
 ok(/VAT on your invoices\s+£200\.00/.test(ov)&&/VAT on your costs \(where added\)\s+-£30\.00/.test(ov),'VAT estimate: £200 charged, £30 on costs');
 await p.click('#ac-export');await p.waitForTimeout(400);
 const dl=await p.evaluate(()=>(window.__dl||[]).map(r=>r.filename));
 ok(/^Accounts .*\.csv$/.test(dl[dl.length-1]||''),'export for the accountant');
 }catch(e){console.log('FAIL',String(e.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h428: '+bad+' FAILED':'h428: all passed');
 await b.close()})();
