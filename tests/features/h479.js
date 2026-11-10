// Accounts › 🧾 VAT return, profit and loss PDF and the pack for the accountant (all made-up figures): one invoice dated
// 10 Aug 2026 for £1,000 + £200 VAT with £600 paid on 1 Sep, and a £120 cash receipt for materials with £20 VAT. With
// quarters ending March/June/September/December, the Jul – Sep 2026 return shows box 1 £200, box 4 £20, box 5 £180,
// box 6 £1,000 and box 7 £100; on the cash scheme box 1 is £100 and box 6 £500 (half the invoice paid). Marked
// filed, the figures are kept. The P&L PDF and the Excel pack are made.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/sd-vt1"]={kind:"sale",type:"invoice",number:"50",date:"2026-08-10",client:"Test Client",status:"sent",lines:[{d:"Work",a:1000,vc:"S20",k:"lab"}],payments:[{amt:600,date:"2026-09-01",note:"Bank"}]};'+
 'store["todos/rc-vt1"]={kind:"acrcpt",status:"done",paid:"cash",date:"2026-08-12",total:120,vat:20,cat:"mat",supplier:"Test Merchant",desc:"Blocks"};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('xlsx'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('xlsxpkg/package/dist/xlsx.full.min.js','utf8')});if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='accounts';window.__S.f.act='vat';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('#ac-tabs button[data-v=vat]'),'Accounts has a 🧾 VAT return tab');
 await p.click('#vt-set');await p.waitForTimeout(200);await p.selectOption('#vt-ends','3');await p.selectOption('#vt-sch','standard');await p.click('#f-save');await p.waitForTimeout(600);
 const qs=await p.$$eval('#vt-qs button',b=>b.map(x=>x.textContent));console.log(qs.slice(0,3));
 const i=qs.findIndex(t=>/Jul – Sept? 2026/.test(t));
 ok(i>=0,'the Jul – Sep 2026 quarter is there');
 await p.locator('#vt-qs button').nth(i).click();await p.waitForTimeout(400);
 const box=async(n)=>(await p.innerText(`.vt-box[data-n="${n}"] b`)).trim();
 const B=[];for(const n of [1,4,5,6,7])B.push(await box(n));console.log(B);
 ok(B[0]==='£200.00'&&B[1]==='£20.00'&&B[2]==='£180.00'&&B[3]==='£1,000'&&B[4]==='£100','standard scheme: box 1 £200, box 4 £20, box 5 £180, box 6 £1,000, box 7 £100');
 ok(/due by .*07\/11\/2026/.test(await p.innerText('#main')),'due a month and 7 days after the quarter (7 Nov 2026)');
 await p.click('.vt-box[data-n="1"]');await p.waitForTimeout(300);
 ok(/Invoice 50 Test Client/.test(await p.innerText('.vt-det')),'tap box 1 to see the invoice in it');
 /* cash scheme */
 await p.click('#vt-set');await p.waitForTimeout(200);await p.selectOption('#vt-sch','cash');await p.click('#f-save');await p.waitForTimeout(600);
 await p.locator('#vt-qs button').nth(i).click();await p.waitForTimeout(400);
 ok(await box(1)==='£100.00'&&await box(6)==='£500','cash scheme: only what was paid counts (box 1 £100, box 6 £500)');
 /* filed */
 await p.click('#vt-file');await p.waitForTimeout(200);await p.fill('#vt-ref','TEST-REF-1');await p.click('#f-save');await p.waitForTimeout(700);
 const f=await p.evaluate(()=>window.__st['todos/vat-2026-09-30']);
 ok(f&&f.boxes&&f.boxes[1]===100&&f.ref==='TEST-REF-1','marked filed with its reference and the figures as sent');
 ok(/Filed on/.test(await p.innerText('#main'))&&/✓/.test((await p.$$eval('#vt-qs button',b=>b.map(x=>x.textContent)))[i]),'the quarter shows it was filed');
 /* P&L PDF and the accountant pack */
 await p.evaluate(()=>{window.__S.f.act='over';window.render()});await p.waitForTimeout(400);
 await p.click('#vt-pl');await p.waitForTimeout(200);await p.selectOption('#vt-per','d');await p.fill('#vt-f','2026-07-01');await p.fill('#vt-t','2026-09-30');await p.click('#f-save');await p.waitForTimeout(2500);
 const pdf=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return [r.filename,s]});
 console.log(pdf[0]);
 ok(/^Profit and loss/.test(pdf[0])&&pdf[1].includes('Profit and loss')&&pdf[1].includes('Materials'),'a profit and loss PDF');
 await p.click('#vt-pack');await p.waitForTimeout(200);await p.selectOption('#vt-per','d');await p.fill('#vt-f','2026-07-01');await p.fill('#vt-t','2026-09-30');await p.click('#f-save');await p.waitForTimeout(2500);
 const x=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const wb=window.XLSX.read(new Uint8Array(await r.data.arrayBuffer()),{type:'array'});return [r.filename,wb.SheetNames,window.XLSX.utils.sheet_to_csv(wb.Sheets['VAT quarters'])]});
 console.log(x[0],x[1]);
 ok(/\.xlsx$/.test(x[0])&&x[1].includes('Summary')&&x[1].includes('Profit and loss')&&x[1].includes('VAT quarters')&&x[1].includes('Your invoices'),'an Excel pack with a summary, P&L, VAT quarters and the lists');
 ok(/TEST-REF-1/.test(x[2]),'the pack has the filed VAT quarter');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h479: ${bad} failed`:'h479: all passed');await b.close();process.exit(bad?1:0);
})();
