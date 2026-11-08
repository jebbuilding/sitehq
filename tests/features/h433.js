// Receipts checked like Hubdoc, booked to sites, and a file for each supplier (all made-up).
// Receipts tab: the list, the receipt itself and the details side by side; tax rate works out the VAT; a receipt
// split over two sites (lines must add up); Save & next goes to the next one to check; a PDF bill is kept as a PDF.
// Trades' receipts come in with "File it". Suppliers & sites: Screwfix's file (two spellings in one file) with
// spend by site; the By site view; the merchant card shows what's been spent. CIS: someone from a Ltd company
// (not set as CIS) can be added to CIS.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const pad=n=>String(n).padStart(2,'0');const isoD=x=>x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());
const D=(n)=>{const x=new Date();x.setDate(x.getDate()-n);return x;};
const extra=`store["todos/m1"]={kind:"supplier",name:"Screwfix",cat:"Tools and fixings",vis:"all"};
store["todos/rc-a"]={kind:"acrcpt",supplier:"SCREWFIX DIRECT",date:"${isoD(D(4))}",total:48,vat:8,cat:"mat",paid:"cash",status:"done",site:"12 Marine Way, Exmouth",created:1};
store["sheets/emp1/invoices/r1"]={kind:"receipt",type:"materials",amount:30,supplier:"Toolstation",date:"${isoD(D(2))}",site:"4 Rolle Road, Exmouth",paidBy:"own"};`;
src=src.replace('store["sheets/"+E]={name:"Sam Test",updated:Date.now()};','store["sheets/"+E]={name:"Sam Test",updated:Date.now(),details:{empType:"company",company:"Test Builds Ltd"}};');
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
/* a stand-in for Claude reading the photos: two Screwfix Exmouth receipts */
src=src.replace('downloads:{save:','sample:Object.assign(async()=>({text:""}),{limits:async()=>({maxPromptBytes:65536,images:{maxCount:5,maxInputBytes:5e6,mediaTypes:["image/jpeg","image/png"]}}),json:async(p,o)=>{window.__sampled=(window.__sampled||0)+1;return {supplier:"Screwfix Exmouth",date:"'+isoD(D(1))+'",total:120,vat:20,vatNo:"GB123456789",desc:"Screws and timber",cat:"mat",paid:"card"}}}),downloads:{save:');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const pdfBytes=Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1400,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await ctx.route(/^https?:\/\//,r=>r.abort());
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const st=()=>p.evaluate(()=>window.__st);
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#tabs .tab[data-t=accounts]');await p.waitForTimeout(300);
 await p.click('#ac-tabs button[data-v=rcpt]');await p.waitForTimeout(300);
 /* the trade's receipt comes in with File it */
 ok(/From your trades \(1\)/.test(await p.innerText('#main'))&&/Toolstation/.test(await p.innerText('.ac-trc')),'Sam\'s Toolstation receipt waits under From your trades');
 await p.click('.ac-trf');await p.waitForTimeout(800);
 let all=Object.values(await st());
 const trc=all.find(v=>v&&v.kind==='acrcpt'&&v.supplier==='Toolstation');
 ok(trc&&trc.site==='4 Rolle Road, Exmouth'&&trc.paid==='own'&&trc.cat==='mat'&&trc.status==='check','filed: Materials, Rolle Road, paid with their own money, to check');
 ok(!(await p.innerText('#main')).includes('From your trades'),'and it leaves the waiting list');
 ok(await p.isVisible('.acv-list')&&await p.isVisible('.acv-doc')&&await p.isVisible('.acv-det'),'three panes: the list, the receipt, the details');
 ok(await p.inputValue('#rr-s')==='Toolstation','the filed receipt is open beside the list');
 await p.click('#rr-save');await p.waitForTimeout(500);
 /* two receipt photos read by Claude */
 await p.setInputFiles('#main .ac-rfile',['fixtures/test.jpg','fixtures/test.jpg']);await p.waitForTimeout(2000);
 ok(await p.evaluate(()=>window.__sampled)===2,'both photos sent to Claude to read');
 const todo=await p.$$('.acv-item .acv-st.warn');
 ok(todo.length===2,'two to check (⚠) in the list');
 ok(await p.inputValue('#rr-s')==='Screwfix Exmouth'&&await p.inputValue('#rr-t')==='120'&&await p.inputValue('#rr-rate')==='20'&&await p.inputValue('#rr-v')==='20','read: Screwfix Exmouth, £120, 20% VAT = £20');
 ok(/Subtotal\s+£100\.00/.test(await p.innerText('#rr-sum')),'subtotal £100 shown');
 /* the rate works out the VAT */
 await p.selectOption('#rr-rate','5');await p.waitForTimeout(100);
 ok(await p.inputValue('#rr-v')==='5.71','5% of £120 inc VAT = £5.71');
 await p.selectOption('#rr-rate','20');await p.waitForTimeout(100);
 /* split over two sites */
 await p.click('#rr-lm button[data-v=n]');await p.waitForTimeout(100);
 let L=await p.$$('#rr-lines .acv-line');
 await (await L[0].$('.rr-la')).fill('80');await (await L[0].$('.rr-ls')).selectOption('12 Marine Way, Exmouth');await (await L[0].$('.rr-ld')).fill('Timber');
 await p.click('#rr-ladd');await p.waitForTimeout(100);L=await p.$$('#rr-lines .acv-line');
 ok(await (await L[1].$('.rr-la')).inputValue()==='40','the new line takes what is left (£40)');
 await (await L[1].$('.rr-ls')).selectOption('4 Rolle Road, Exmouth');await (await L[1].$('.rr-ld')).fill('Screws');
 ok(/✓ The lines add up/.test(await p.innerText('#rr-left')),'lines add up: '+await p.innerText('#rr-left'));
 const firstId=await p.evaluate(()=>document.querySelector('.acv-item.on').dataset.id);
 await p.click('#rr-save');await p.waitForTimeout(600);
 const r1=(await st())['todos/'+firstId];
 ok(r1.status==='done'&&r1.multi&&r1.lines.length===2&&r1.lines[1].site==='4 Rolle Road, Exmouth'&&r1.lines[1].amt===40,'saved split: £80 Marine Way, £40 Rolle Road');
 const nowId=await p.evaluate(()=>document.querySelector('.acv-item.on').dataset.id);
 ok(nowId!==firstId&&await p.inputValue('#rr-s')==='Screwfix Exmouth','Save & next moved to the next one to check');
 /* the second: single site; type something, let the screen redraw, it's still there */
 await p.selectOption('#rr-site','12 Marine Way, Exmouth');await p.fill('#rr-ref','INV-778');
 await p.click('#ac-tabs button[data-v=rcpt]');await p.waitForTimeout(300);
 ok(await p.inputValue('#rr-ref')==='INV-778'&&await p.inputValue('#rr-site')==='12 Marine Way, Exmouth','unsaved typing survives the screen redrawing');
 await p.selectOption('#rr-p','acct');await p.fill('#rr-due',isoD(D(-20)));
 await p.click('#rr-save');await p.waitForTimeout(600);
 ok(/Bill saved – it'll be matched when you pay it/.test(await lastToast()),'on account: '+await lastToast());
 /* a PDF bill stays a PDF */
 await p.evaluate(()=>window.__sampled=0);
 await p.setInputFiles('#main .ac-rfile',{name:'bill.pdf',mimeType:'application/pdf',buffer:pdfBytes});await p.waitForTimeout(1500);
 all=Object.values(await st());
 const pr=all.find(v=>v&&v.kind==='acrcpt'&&v.ctype==='application/pdf');
 ok(pr&&pr.type==='bill'&&await p.isVisible('.acv-pdf'),'PDF bill kept as a PDF, shown in the middle, type Bill');
 await p.fill('#rr-s','Jewson');await p.fill('#rr-t','240');await p.click('#rr-save');await p.waitForTimeout(500);
 /* zoom and rotate the picture */
 await p.click('.acv-item >> nth=1');await p.waitForTimeout(300);
 await p.click('#acv-zi');await p.click('#acv-rr');
 ok(/rotate\(90deg\) scale\(1\.25\)/.test(await p.getAttribute('.acv-view img','style')),'zoom in and rotate the picture');
 await p.screenshot({path:'h433-receipts.png'});
 /* Suppliers & sites */
 await p.click('#ac-tabs button[data-v=sup]');await p.waitForTimeout(300);
 const rows=await p.innerText('.acs-list');
 ok(/Screwfix[\s\S]*£288\.00/.test(rows)&&/Merchant/.test(rows),'Screwfix (both spellings, £120 + £120 + £48 = £288) in one file, linked to the merchant');
 await p.locator('.acs-row',{hasText:'Screwfix'}).click();await p.waitForTimeout(300);
 const fl=await p.innerText('.acs-file');
 ok(/Also written as/.test(fl)&&/12 Marine Way, Exmouth\s+£248\.00/.test(fl)&&/4 Rolle Road, Exmouth\s+£40\.00/.test(fl),'Screwfix\'s file: £248 Marine Way (80 + 120 + 48), £40 Rolle Road');
 await p.screenshot({path:'h433-supplier.png'});
 await p.click('#acs-csv1');await p.waitForTimeout(500);
 const dl=await p.evaluate(()=>(window.__dl||[]).map(r=>r.filename));
 ok(/^Screwfix spend /.test(dl[dl.length-1]),'export: '+dl[dl.length-1]);
 await p.click('#acs-back');await p.click('#acs-mode button[data-v=site]');await p.waitForTimeout(300);
 const sv=await p.innerText('#main');
 ok(/4 Rolle Road, Exmouth[\s\S]*£70\.00/.test(sv),'By site: Rolle Road £70 (Screwfix £40 + Toolstation £30)');
 /* merchant card */
 await p.click('#tabs .tab[data-t=suppliers]').catch(()=>{});await p.waitForTimeout(400);
 if(await p.isVisible('.supcard summary')){await p.locator('.supcard',{hasText:'Screwfix'}).locator('summary').click();await p.waitForTimeout(200);}
 ok(/Spent this tax year: £288\.00 \(3 receipts\)/.test(await p.innerText('#main')),'the Screwfix merchant card shows £288 spent');
 await p.click('.sup-file');await p.waitForTimeout(300);
 ok(await p.isVisible('.acs-file'),'Open their file goes to it');
 /* CIS: Sam is from a Ltd company – add him to CIS */
 await p.click('#tabs .tab[data-t=cis]');await p.waitForTimeout(300);await p.click('#cis-tabs button[data-v=subs]');await p.waitForTimeout(300);
 ok(/Others on the app/.test(await p.innerText('#main')),'CIS lists others on the app not set as CIS');
 await p.click('.cis-addapp');await p.waitForTimeout(500);
 ok(/added to CIS/.test(await lastToast())&&!(await p.isVisible('.cis-addapp')),'Sam (Ltd company) added to CIS: '+await lastToast());
 const cfg=Object.values(await st()).find(v=>v&&v.kind==='cissubs');
 ok(cfg&&Object.values(cfg.subs||{}).some(x=>x.cis===true&&x.type==='company'),'saved as a company on CIS');
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h433: '+bad+' FAILED':'h433: all passed');
 await b.close()})();
