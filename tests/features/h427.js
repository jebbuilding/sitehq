// Estimates & invoices and CIS returns (owner). Invoices: VAT and CIS sums (5 days' labour at £200 + £500 materials,
// 20% VAT, contractor takes 20% CIS off labour: total £1,800, less £200 CIS, £1,600 due), mark sent, part payment,
// overview boxes, PDF. Estimates: bringing in a Word estimate laid out like James's (made-up client and figures),
// its terms as the standard terms, the letter PDF, turning it into a 25% deposit invoice. CIS: a CIS worker's paid
// invoice in the tax month, VAT and materials taken out, tax at 20%, the return totals, statements, HMRC link.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const pad=n=>String(n).padStart(2,'0');const isoD=x=>x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());
/* a day in the last completed tax month (6th–5th) */
const T=new Date();const end=new Date(T.getFullYear(),T.getMonth()+(T.getDate()>=6?0:-1),5);const payDay=isoD(new Date(end.getFullYear(),end.getMonth(),2));
src=src.replace('store["sheets/"+E]={name:"Sam Test",updated:Date.now()};','store["sheets/"+E]={name:"Sam Test",updated:Date.now(),details:{empType:"cis",utr:"1234567890"}};store["sheets/"+E+"/invoices/k"]={number:"0040",invDate:"'+payDay+'",sentAt:1,status:"paid",paidAt:Date.now(),paidOn:"'+payDay+'",amount:1200,assetId:"a3",fileName:"inv.pdf",contentType:"application/pdf"};');
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
/* a small Word estimate laid out like James's (made-up person and figures) */
const XL=require('../xlsxpkg/package/xlsx.js');
const P=t=>`<w:p><w:r><w:t xml:space="preserve">${t.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</w:t></w:r></w:p>`;
const paras=['Mr Test Person','1 Sample Street','Exmouth','EX8 1AA','Estimate Number: 2001','12th October 2026','Re: Garden Room','Dear Mr Person','Thank you for asking us to price the garden room.','Summary of Estimated Costs','Total estimate:£10,000.00 +VAT','£12,000.00 Inc VAT','Estimate is valid for 30 Days','Works Included Within the Estimate','Base and footings','Timber frame and roof','Works Excluded from the Estimate','Electrics','Decorating','Please note that changes may alter the price.','Yours sincerely,','Kind Regards','Terms and Conditions of Contract','1. Definitions','The Company means the builder.','2. Payment','Payment is due within 14 days.'];
const xml='<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+paras.map(P).join('')+'</w:body></w:document>';
const z=XL.CFB.utils.cfb_new();XL.CFB.utils.cfb_add(z,'/word/document.xml',Buffer.from(xml));XL.CFB.utils.cfb_add(z,'/[Content_Types].xml',Buffer.from('<Types/>'));
fs.writeFileSync('h427-est.docx',XL.CFB.write(z,{fileType:'zip',type:'buffer'}));
const savePdf=async(p,name)=>{const b64=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return btoa(s)});fs.writeFileSync(name,Buffer.from(b64,'base64'));};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('xlsx'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('xlsxpkg/package/dist/xlsx.full.min.js','utf8')});if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const sales=()=>p.evaluate(()=>Object.entries(window.__st).filter(([k,v])=>v&&v.kind==='sale').map(([k,v])=>Object.assign({id:k},v)));
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 ok(await p.isVisible('#tabs .tab[data-t=sales]')&&await p.isVisible('#tabs .tab[data-t=cis]'),'Estimates & invoices and CIS returns tabs');
 await p.click('#tabs .tab[data-t=sales]');await p.waitForTimeout(300);
 ok(/No invoices yet/.test(await p.innerText('#main')),'empty to start');
 /* an invoice to a contractor, with CIS */
 await p.click('#sd-new');await p.waitForTimeout(300);
 await p.fill('#sd-client','Big Builder Ltd');await p.fill('#sd-addr','2 Test Road\nExeter');await p.fill('#sd-title','Groundworks');
 let rows=await p.$$('#sd-lines .sd-line');await (await rows[0].$('.sd-ld')).fill('Labour, 5 days');await (await rows[0].$('.sd-lq')).fill('5');await (await rows[0].$('.sd-lr')).fill('200');
 await p.click('#sd-addl');rows=await p.$$('#sd-lines .sd-line');await (await rows[1].$('.sd-ld')).fill('Materials');await (await rows[1].$('.sd-lr')).fill('500');
 await p.selectOption('#sd-cis','20');await p.waitForTimeout(150);await (await rows[1].$('.sd-ll')).uncheck();await p.waitForTimeout(150);
 const tot=await p.innerText('#sd-tot');
 ok(/Total before VAT\s+£1,500\.00/.test(tot)&&/VAT\s+£300\.00/.test(tot)&&/Total with VAT\s+£1,800\.00/.test(tot),'£1,500 + £300 VAT = £1,800');
 ok(/Less CIS 20% on labour of £1,000\.00\s+-£200\.00/.test(tot)&&/Amount due\s+£1,600\.00/.test(tot),'less £200 CIS on the labour only: £1,600 due');
 await p.click('#sd-sent');await p.waitForTimeout(400);
 let main=await p.innerText('#main');
 ok(/INV-1/.test(main)&&/Big Builder Ltd/.test(main)&&/Awaiting payment/.test(main),'on the list, awaiting payment');
 ok(/Awaiting payment\s+£1,600\.00/i.test(await p.innerText('.sd-boxes')),'Awaiting payment box: £1,600');
 await p.click('.sd-row');await p.waitForTimeout(300);await p.click('#sd-pay');await p.waitForTimeout(200);await p.fill('#sp-amt','600');await p.click('#f-save');await p.waitForTimeout(400);
 main=await p.innerText('#main');
 ok(/Part paid/.test(main)&&/£1,000\.00/.test(main),'part paid: £1,000 left');
 ok(/Paid in last 30 days\s+£600\.00/i.test(await p.innerText('.sd-boxes')),'Paid in last 30 days: £600');
 await p.click('.sd-row');await p.waitForTimeout(300);await p.click('#sd-pdf');await p.waitForTimeout(2500);
 let dl=await p.evaluate(()=>(window.__dl||[]).map(r=>[r.filename,r.data.size]));
 ok(dl.length&&/Invoice 1 Big Builder Ltd\.pdf/.test(dl[dl.length-1][0])&&dl[dl.length-1][1]>3000,'invoice PDF made: '+JSON.stringify(dl[dl.length-1]));
 await savePdf(p,'h427-invoice.pdf');
 await p.click('#sd-close');await p.waitForTimeout(300);
 /* estimates: bring in a Word one */
 await p.click('#sd-tabs button[data-v=est]');await p.waitForTimeout(300);
 await p.setInputFiles('#main .sd-file','h427-est.docx');await p.waitForTimeout(1500);
 const imp=await p.innerText('.sd-imp');
 ok(/Mr Test Person/.test(imp)&&/2001/.test(imp)&&/Garden Room/.test(imp)&&/£10,000\.00 \+VAT/.test(imp)&&/2 \/ 2 lines/.test(imp),'Word estimate read: client, number, Re:, £10,000 +VAT, 2 included / 2 excluded');
 await p.click('#f-save');await p.waitForTimeout(500);
 ok(/Estimate 2001 brought in/.test(await lastToast()),'brought in as estimate 2001: '+await lastToast());
 const set=await p.evaluate(()=>window.__st['todos/salesset']);
 ok(set&&/Payment is due within 14 days/.test(set.terms),'its terms saved as the standard terms');
 const e=(await sales()).find(x=>x.type==='estimate');
 ok(e&&e.address==='1 Sample Street\nExmouth\nEX8 1AA'&&e.date==='2026-10-12'&&e.dear==='Mr Person'&&/Base and footings/.test(e.incl)&&/Electrics/.test(e.excl)&&!/Please note/.test(e.excl),'address, date, Dear, included, excluded all in the right place');
 ok(/Sent, waiting to hear\s+£10,000\.00/i.test(await p.innerText('.sd-boxes')),'Sent box: £10,000');
 await p.click('.sd-row');await p.waitForTimeout(300);await p.click('#sd-pdf');await p.waitForTimeout(2500);
 dl=await p.evaluate(()=>(window.__dl||[]).map(r=>[r.filename,r.data.size]));
 ok(/Estimate 2001 Mr Test Person\.pdf/.test(dl[dl.length-1][0]),'estimate letter PDF made');
 await savePdf(p,'h427-estimate.pdf');
 /* deposit invoice */
 await p.click('#sd-toinv');await p.waitForTimeout(300);await p.check('input[name=sti][value=pct]');await p.click('#f-save');await p.waitForTimeout(600);
 const inv2=(await sales()).find(x=>x.type==='invoice'&&x.fromId);
 ok(inv2&&inv2.number==='2'&&inv2.lines[0].r===2500&&/Deposit 25% on estimate 2001/.test(inv2.lines[0].d),'deposit invoice 2: 25% = £2,500 + VAT');
 /* email it (no share sheet here, so the PDF saves and a new email opens) */
 await p.click('#sd-mail');await p.waitForTimeout(800);
 ok(/Please find attached invoice 2/.test(await p.inputValue('#se-msg'))&&/Garden Room/.test(await p.inputValue('#se-sub')),'email filled in: subject and message');
 await p.fill('#se-to','test.person@example.com');await p.click('#f-save');await p.waitForTimeout(1500);
 const inv2b=(await sales()).find(x=>x.type==='invoice'&&x.fromId);
 ok(inv2b&&(inv2b.emails||[]).length===1&&inv2b.emails[0].to==='test.person@example.com'&&inv2b.status==='awaiting','noted as emailed to them and now awaiting payment');
 dl=await p.evaluate(()=>(window.__dl||[]).map(r=>r.filename));ok(/Invoice 2 Mr Test Person.pdf/.test(dl[dl.length-1]),'its PDF saved to attach');
 if(await p.isVisible('#sd-close')){await p.click('#sd-close');await p.waitForTimeout(300);}
 /* CIS return */
 await p.click('#tabs .tab[data-t=cis]');await p.waitForTimeout(400);
 main=await p.innerText('#main');
 ok(/Sam Test/.test(main)&&/Invoice 0040/.test(main),"the CIS worker's paid invoice is in the tax month");
 /* the page catches up when you leave the box, as everywhere in the app */
 await p.fill('.cis-pay .cis-vat','200');await p.fill('.cis-pay .cis-mat','300');await p.evaluate(()=>document.activeElement.blur());await p.waitForTimeout(500);
 const ret=await p.innerText('.cis-tbl');
 ok(/1234567890/.test(ret)&&/£1,000\.00\s+£300\.00\s+£140\.00/.test(ret),'return: £1,000 paid (no VAT), £300 materials, £140 tax (20% of £700)');
 ok(/You pay them £1,060\.00/.test(await p.innerText('.cis-pays')),'you pay them £1,060');
 ok(await p.getAttribute('#cis-hmrc','href')==='https://www.gov.uk/use-construction-industry-scheme-online','link to HMRC CIS online');
 await p.click('#cis-stm');await p.waitForTimeout(2500);
 dl=await p.evaluate(()=>(window.__dl||[]).map(r=>[r.filename,r.data.size]));
 ok(/CIS statements/.test(dl[dl.length-1][0]),'payment and deduction statements PDF');
 await savePdf(p,'h427-cis.pdf');
 await p.click('#cis-send');await p.waitForTimeout(200);await p.click('#f-save');await p.waitForTimeout(2500);
 const pd=await p.evaluate(()=>Object.entries(window.__st).find(([k,v])=>k.startsWith('sheets/emp1/signoffs/pd-cis')));
 ok(pd&&pd[1].type==='persdoc'&&pd[1].kind==='cis'&&pd[1].photos.length===1&&/£140.00/.test(pd[1].note),"statement sent to Sam's app (My details › documents)");
 ok(/Sam Test ✓ sent/.test(await p.innerText('.cis-sent')),'shown as sent');
 await p.click('#cis-filed');await p.waitForTimeout(200);await p.click('#f-save');await p.waitForTimeout(400);
 ok(/Return filed/.test(await p.innerText('.cis-due')),'marked as filed');
 }catch(e){console.log('FAIL',String(e.message).split('\n').slice(0,8).join(' | '));bad++}
 console.log(bad?'h427: '+bad+' FAILED':'h427: all passed');
 await b.close()})();
