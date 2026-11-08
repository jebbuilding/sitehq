// Wage calculator and Business costings (owner): the wage sums match James's spreadsheet (example salary £37,600 with a
// £7,000 van as a taxable benefit: tax £6,030, NI £2,002.40, take-home £27,687.60, cost £51,668), with holiday taken
// off the days worked; costings: the yearly overview by category (bars, every cost under its category), bringing in
// a workbook laid out like his (made-up figures), a person from the wage calculator, and pricing tucked away.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
/* a small workbook laid out like the Business costing one (made-up figures) */
const XL=require('../xlsxpkg/package/xlsx.js');const wbk=XL.utils.book_new();
const sheet=(rows)=>XL.utils.aoa_to_sheet([['t'],[''],[''],[''],['Cost name','Type','Amount (£)','How often?','Fixed or variable?','Notes']].concat(rows));
XL.utils.book_append_sheet(wbk,XL.utils.aoa_to_sheet([['s']]),'Summary');
XL.utils.book_append_sheet(wbk,sheet([['Van payment','Loan, finance & leasing',400,'Monthly','Fixed',''],['Insurance','Insurance',1200,'Yearly','Fixed',''],['e.g. tools','Tools & small equipment','','','','']]),'Running Costs');
XL.utils.book_append_sheet(wbk,sheet([['Timber yard','Timber',500,'Weekly','Variable','']]),'Materials');
XL.writeFile(wbk,'h425-costs.xlsx');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('xlsx'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('xlsxpkg/package/dist/xlsx.full.min.js','utf8')});if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 ok(await p.isVisible('#tabs .tab[data-t=wages]')&&await p.isVisible('#tabs .tab[data-t=costs]'),'Wage calculator and Business costings tabs (owner)');
 await p.click('#tabs .tab[data-t=wages]');await p.waitForTimeout(200);await p.click('#wc-new');await p.waitForTimeout(200);
 const set=async(id,v)=>{await p.fill('#'+id,String(v));};
 await set('wc-name','Carpenter');await set('wc-salary',37600);await set('wc-van',7000);await p.selectOption('#wc-vanmode','benefit');await set('wc-eepen',5);await set('wc-erpen',3);await set('wc-hol',28);await set('wc-days',260);await set('wc-hrs',8);await set('wc-charge',32.5);
 await p.waitForTimeout(150);
 const out=await p.innerText('#wc-out');
 ok(/Income tax\s+£6,030/.test(out)&&/National Insurance\s+£2,002/.test(out),'tax £6,030 and NI £2,002 as in the spreadsheet');
 ok(/Take-home a year\s+£27,688/.test(out),'take-home £27,688 a year');
 ok(/Total cost a year\s+£51,668/.test(out),'costs the business £51,668 a year');
 ok(/An hour actually worked \(1856 hours\)\s+£27\.84/.test(out),'£27.84 an hour actually worked (232 days × 8 hours, holiday taken off)');
 ok(/\+£4\.66/.test(out),'charged at £32.50 that leaves +£4.66 an hour');
 await p.click('#wc-pdf');await p.waitForTimeout(2500);
 const wdl=await p.evaluate(()=>(window.__dl||[]).map(r=>[r.filename,r.data.size]));
 ok(wdl.length&&wdl[wdl.length-1][0]==='Wage calculation Carpenter.pdf'&&wdl[wdl.length-1][1]>3000,'wage calculation as a PDF: '+JSON.stringify(wdl[wdl.length-1]));
 await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));window.__wpdf=btoa(s);});
 fs.writeFileSync('h425-wage.pdf',Buffer.from(await p.evaluate(()=>window.__wpdf),'base64'));
 await p.click('#wc-save');await p.waitForTimeout(300);
 ok(/Carpenter/.test(await p.innerText('#main'))&&/£27\.84/.test(await p.innerText('#main')),'saved: Carpenter, £27.84 an hour, on the list');
 /* business costings: the yearly overview */
 await p.click('#tabs .tab[data-t=costs]');await p.waitForTimeout(200);
 await p.setInputFiles('#main .bc-file','h425-costs.xlsx');await p.waitForTimeout(1500);
 ok(/Brought in 2 costs/.test(await lastToast()),'bringing in the workbook (running costs; its Materials sheet is left out): '+await lastToast());
 await p.selectOption('#bc-wcpick',{label:'Carpenter'});await p.waitForTimeout(150);
 const top=await p.innerText('#bc-top'),list=await p.innerText('#bc-list');
 /* 400 × 12 + 1,200 + 51,668 = 57,668 a year */
 ok(/£57,668\s*a year/i.test(top),'costs to run the business: £57,668 a year');
 ok(/£4,806 a month · £1,109 a week/.test(top),'£4,806 a month · £1,109 a week');
 ok(/Wages, NI & pensions/.test(top)&&/Loan, finance & leasing/.test(top)&&/Insurance/.test(top),'a bar for each category');
 ok(/Put aside £100 a month/.test(top),'put aside £100 a month for the yearly insurance');
 ok(/Wages, NI & pensions\s+£51,668 a year/.test(list)&&/Carpenter \(wages, NI, pension, van\)/.test(await p.evaluate(()=>[...document.querySelectorAll('#bc-list input')].map(i=>i.value).join('|'))),'every cost listed under its category with its yearly figure');
 ok(!(await p.$('.bc-tabs')),'one list, no tabs');
 /* pricing, tucked away */
 await p.click('.bc-price summary');await p.fill('#bc-pp','2');await p.dispatchEvent('#bc-pp','change');await p.waitForTimeout(150);
 ok(/Day rate per person just to cover costs\s+£120\.14/.test(await p.innerText('#bc-pricing')),'pricing: £120.14 a day per person (20 days, 2 people)');
 await p.click('#bc-save');await p.waitForTimeout(300);
 const rec=await p.evaluate(()=>window.__st['todos/bizcosts']);
 ok(rec&&rec.kind==='bizcosts'&&rec.items.length===3&&rec.people===2,'saved as one owner-private record');
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0]);bad++}
 console.log(bad?'h425: '+bad+' FAILED':'h425: all passed');
 await b.close()})();
