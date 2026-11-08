// Jobs from the enquiry: the job file on the client card (the enquiry, then folders), the estimate made from it
// (filled in from the enquiry), estimate versions (a sent estimate changed → version 2, version 1 kept), invoice
// types (deposit, extra work held for the final invoice, the final invoice worked out: estimate + extra − deposit),
// the job account, a pro forma turned into a proper invoice, and attaching job file documents to the email.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra=`store["todos/c9"]={kind:"client",name:"Mrs Enquiry Test",phone:"01234 567890",email:"enq@example.com",address:"5 Test Lane, Exmouth",postcode:"EX8 1AA",work:"Kitchen extension",stage:"enquiry",created:1};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const sales=()=>p.evaluate(()=>Object.entries(window.__st).filter(([k,v])=>v&&v.kind==='sale').map(([k,v])=>Object.assign({id:k.replace('todos/','')},v)));
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* ---- the job file from the client card ---- */
 await p.click('#tabs .tab[data-t=clients]');await p.waitForTimeout(400);
 await p.locator('#main button',{hasText:'Mrs Enquiry Test'}).first().click();await p.waitForTimeout(400);
 ok(await p.isVisible('#cv-jf'),'the client card has a Job file button');
 await p.click('#cv-jf');await p.waitForTimeout(400);
 const jt=await p.innerText('.jf-page');
 ok(/The enquiry/.test(jt)&&/Kitchen extension/.test(jt)&&/enq@example\.com/.test(jt)&&/No estimate yet/.test(jt),'the job file starts at the enquiry: client, the work, no estimate yet');
 await p.selectOption('#jf-fold','plans');await p.setInputFiles('.jf-file','fixtures/clip_sheet.pdf');await p.waitForTimeout(800);
 ok(/Added 1 to Plans & drawings/.test(await lastToast()),'a plan added before any estimate');
 /* ---- the estimate, filled in from the enquiry ---- */
 await p.click('#jf-newest');await p.waitForTimeout(400);
 ok(await p.inputValue('#sd-client')==='Mrs Enquiry Test'&&await p.inputValue('#sd-title')==='Kitchen extension'&&/5 Test Lane\nExmouth\nEX8 1AA/.test(await p.inputValue('#sd-addr')),'estimate filled in from the enquiry');
 const r0=(await p.$$('#sd-lines .sd-line'))[0];await (await r0.$('.sd-ld')).fill('Kitchen extension');await (await r0.$('.sd-la')).fill('10000');
 ok(/Job file \(1\)/.test(await p.innerText('#sd-jf')),'the estimate shares the client\'s job file (1 file)');
 await p.click('#sd-sent');await p.waitForTimeout(400);
 /* ---- versions ---- */
 await p.click('#tabs .tab[data-t=sales]');await p.waitForTimeout(300);await p.click('#sd-tabs button[data-v=est]');await p.waitForTimeout(200);
 await p.locator('.sd-row',{hasText:'Mrs Enquiry Test'}).first().click();await p.waitForTimeout(300);
 await (await (await p.$$('#sd-lines .sd-line'))[0].$('.sd-la')).fill('12000');await p.click('#sd-save');await p.waitForTimeout(300);
 ok(await p.isVisible('#sv-new'),'changing a sent estimate asks: save as version 2?');
 await p.click('#sv-new');await p.waitForTimeout(500);
 let est=(await sales()).find(x=>x.type==='estimate');
 ok(est.ver===2&&est.versions.length===1&&est.versions[0].net===10000&&est.status==='draft',"version 2 saved (£12,000); version 1 (£10,000) kept");
 ok(/EST-\d+ v2/.test(await p.innerText('#main')),'the list shows it as v2');
 await p.locator('.sd-row',{hasText:'Mrs Enquiry Test'}).first().click();await p.waitForTimeout(300);
 ok((await p.$$('.sd-vpdf')).length===1,'the earlier version can be opened as a PDF');
 await p.click('#sd-sent');await p.waitForTimeout(300);
 /* ---- deposit, extra work held, final payment ---- */
 const mk=async(kind,fill)=>{await p.locator('.sd-row',{hasText:'Mrs Enquiry Test'}).first().click();await p.waitForTimeout(300);await p.click('#sd-toinv');await p.waitForTimeout(200);await p.selectOption('#sti-k',kind);if(fill)await fill();await p.click('#f-save');await p.waitForTimeout(600);};
 await p.click('#sd-tabs button[data-v=est]');await p.waitForTimeout(200);
 await mk('deposit');ok(/Deposit INV-\d+ made/.test(await lastToast()),'deposit invoice made: '+await lastToast());
 await p.click('#sd-sent');await p.waitForTimeout(400);
 await p.click('#sd-tabs button[data-v=est]');await p.waitForTimeout(200);
 await mk('extra');
 const er=(await p.$$('#sd-lines .sd-line'))[0];await (await er.$('.sd-ld')).fill('Extra socket in the utility');await (await er.$('.sd-la')).fill('500');
 await p.check('#sd-af');await p.click('#sd-save');await p.waitForTimeout(400);
 let all=await sales();const ex=all.find(x=>x.ik==='extra');
 ok(ex&&ex.af===true,'extra work saved to go on the final invoice');
 ok(/For the final invoice/.test(await p.innerText('#main')),'shown as "For the final invoice", not money invoiced yet');
 await p.click('#sd-tabs button[data-v=est]');await p.waitForTimeout(200);
 await mk('final');
 const tot=await p.innerText('#sd-tot');
 /* £12,000 estimate + £500 extra − £3,000 deposit (25%) = £9,500 + VAT */
 ok(/Total before VAT\s+£9,500\.00/.test(tot),'final invoice: £12,000 + £500 extra − £3,000 deposit = £9,500 before VAT');
 ok((await p.$$eval('#sd-lines .sd-hrow .sd-lhx',x=>x.map(e=>e.value))).join('|')==='Works as per estimate '+est.number+' (version 2) – Kitchen extension|Extra work|Less already invoiced','laid out as: the estimate\'s works, extra work, less already invoiced');
 all=await sales();
 ok(all.find(x=>x.ik==='extra').inFinal===all.find(x=>x.ik==='final').id,'the extra work is marked as added to the final invoice');
 const ja=await p.innerText('.sd-job');
 ok(/Job account/.test(ja)&&/Estimate \(before VAT\)\s+£12,000\.00/.test(ja)&&/Extra work\s+£500\.00/.test(ja),'job account shows the estimate, extra work and the invoices');
 /* ---- email: attach a plan from the job file ---- */
 await p.click('#sd-mail');await p.waitForTimeout(500);
 ok(/our final invoice/.test(await p.inputValue('#se-msg'))&&/balance due/.test(await p.inputValue('#se-msg')),'final invoice email wording');
 ok((await p.$$('.se-jf')).length===1,'the plan in the job file can be ticked to attach');
 await p.check('.se-jf');await p.fill('#se-to','enq@example.com');await p.waitForTimeout(300);await p.click('#f-save');await p.waitForTimeout(1500);
 const dl=await p.evaluate(()=>(window.__dl||[]).map(r=>r.filename));
 ok(dl.some(n=>/^Invoice \d+ Mrs Enquiry Test\.pdf$/.test(n))&&dl.includes('clip_sheet.pdf'),'the invoice PDF and the attached plan: '+dl.join(', '));
 {const b64=await p.evaluate(async()=>{const r=window.__dl.find(x=>/^Invoice/.test(x.filename));const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return btoa(s)});require('fs').writeFileSync('h430-final.pdf',Buffer.from(b64,'base64'));}
 /* ---- pro forma → invoice ---- */
 await p.click('#sd-close').catch(()=>{});await p.waitForTimeout(300);
 await p.click('#sd-tabs button[data-v=inv]');await p.waitForTimeout(200);
 await p.click('#sd-new');await p.waitForTimeout(300);await p.selectOption('#sd-ik','proforma');await p.waitForTimeout(100);
 ok(await p.inputValue('#sd-no')==='1','pro formas have their own numbers (PF-1)');
 await p.fill('#sd-client','Mr Pro Forma');const pr=(await p.$$('#sd-lines .sd-line'))[0];await (await pr.$('.sd-ld')).fill('Materials up front');await (await pr.$('.sd-la')).fill('1000');
 await p.click('#sd-sent');await p.waitForTimeout(400);
 ok(/PF-1/.test(await p.innerText('#main'))&&/Pro formas waiting\s+£1,200\.00/i.test(await p.innerText('.sd-boxes')),'pro forma sent: PF-1, waiting £1,200, not in money invoiced');
 await p.locator('.sd-row',{hasText:'Mr Pro Forma'}).first().click();await p.waitForTimeout(300);
 await p.click('#sd-pay');await p.waitForTimeout(200);await p.click('#f-save');await p.waitForTimeout(500);
 await p.locator('.sd-row',{hasText:'Mr Pro Forma'}).first().click();await p.waitForTimeout(300);
 await p.click('#sd-pfconv');await p.waitForTimeout(600);
 all=await sales();const pf=all.find(x=>x.ik==='proforma');const conv=all.find(x=>x.fromPf===pf.id);
 ok(pf.status==='converted'&&conv&&conv.ik==='oneoff'&&conv.payments.length===1&&/made from pro forma 1 \(payment carried over\)/.test(await lastToast()),'paid pro forma turned into a proper invoice, payment carried over');
 }catch(e){console.log('FAIL',String(e.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h430: '+bad+' FAILED':'h430: all passed');
 await b.close()})();
