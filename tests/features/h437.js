// Job costs (all made-up): a job at 9 Test Close for Mr Cost Test. Sam (employed) works 8 h + 6 h there, a Jewson
// receipt (£120 inc £20 VAT) is booked to it, a Screwfix receipt (£60 inc £10 VAT) isn't booked anywhere and is
// booked from the Job costs page, and an invoice for £500 comes in for the job. With Sam costing £30/h: labour £420,
// materials £100 + £50, subbies £500 = £1,070 costs. Made cost plus at day-work rates (£40/h) and +15%: £560 +
// £172.50 + £575 = £1,307.50 to charge; "Invoice what's not been charged" makes that draft invoice and ticks every
// cost off; once sent, profit £237.50 (18.2%). The spreadsheet has the hours, rates, mark-ups and profit %.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const pad=n=>String(n).padStart(2,'0');const isoD=x=>x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());
const D=(n)=>{const x=new Date();x.setDate(x.getDate()-n);return x;};
const J='9 Test Close, Exmouth';
const extra=`store["todos/c9"]={kind:"client",name:"Mr Cost Test",email:"cost@example.com",site:"${J}",work:"Kitchen extension",stage:"won",created:1};
store["sites/sx"]={name:"${J}"};
store["sheets/emp1/entries/jx1"]={type:"hours",date:"${isoD(D(3))}",job:"${J}",start:"08:00",finish:"16:30",breakMin:30,hours:8,created:1};
store["sheets/emp1/entries/jx2"]={type:"hours",date:"${isoD(D(2))}",job:"${J}",start:"08:00",finish:"14:30",breakMin:30,hours:6,created:2};
store["sheets/emp1/invoices/ix"]={number:"77",invDate:"${isoD(D(1))}",amount:500,site:"${J}",status:"approved",sentAt:1};
store["todos/rc-j1"]={kind:"acrcpt",supplier:"Jewson",date:"${isoD(D(2))}",total:120,vat:20,cat:"mat",paid:"card",status:"done",site:"${J}",created:1};
store["todos/rc-j2"]={kind:"acrcpt",supplier:"Screwfix",date:"${isoD(D(1))}",total:60,vat:10,cat:"mat",paid:"card",status:"done",created:2};`;
src=src.replace('store["sheets/"+E]={name:"Sam Test",updated:Date.now()};','store["sheets/"+E]={name:"Sam Test",updated:Date.now(),details:{empType:"employed"}};');
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('xlsx'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('xlsxpkg/package/dist/xlsx.full.min.js','utf8')});r.abort()});
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const st=()=>p.evaluate(()=>window.__st);
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#tabs .tab[data-t=accounts]');await p.waitForTimeout(300);
 await p.click('#ac-tabs button[data-v=jobs]');await p.waitForTimeout(300);
 ok(await p.isVisible(`.jc-row[data-s="${J}"]`),'the job is listed under 💷 Job costs');
 ok(/Not booked to a job/.test(await p.innerText('#main'))&&/Screwfix/.test(await p.innerText('#main')),'the Screwfix receipt shows as not booked to a job');
 await p.selectOption('.jc-book[data-id="rc-j2"]',J);await p.waitForTimeout(500);
 ok((await st())['todos/rc-j2'].site===J,'booked to 9 Test Close');
 /* what Sam costs an hour */
 await p.click('#jc-rates');await p.waitForTimeout(200);await p.fill('#jr-emp1','30');await p.click('#f-save');await p.waitForTimeout(400);
 await p.click(`.jc-row[data-s="${J}"]`);await p.waitForTimeout(300);
 let m=await p.innerText('#main');
 ok(/Costs so far\s+£1,070\.00\s+14 h labour/.test(m),'costs: £420 labour + £150 materials + £500 subbie = £1,070, 14 h');
 /* cost plus */
 await p.click('#jc-mode button[data-v=costplus]');await p.waitForTimeout(400);
 m=await p.innerText('#main');
 ok(/Charge \(cost plus\)\s+£1,307\.50/.test(m)&&/Not invoiced yet\s+£1,307\.50/.test(m),'cost plus: £560 + £172.50 + £575 = £1,307.50, none invoiced yet');
 await p.click('#jc-xls');await p.waitForTimeout(1500);
 const dl=await p.evaluate(()=>(window.__dl||[]).map(r=>r.filename));
 ok(dl[dl.length-1]==='Job costs – 9 Test Close, Exmouth.xlsx','spreadsheet: '+dl[dl.length-1]);
 const b64=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return btoa(s)});fs.writeFileSync('h437-jobcosts.xlsx',Buffer.from(b64,'base64'));
 const XL=require(require('path').resolve('xlsxpkg/package'));const wb=XL.read(fs.readFileSync('h437-jobcosts.xlsx'),{cellFormula:true});
 ok(wb.SheetNames.join(',')==='Summary,Labour,Materials & hire,Subcontractors,Invoices','sheets: '+wb.SheetNames.join(', '));
 const lab=XL.utils.sheet_to_json(wb.Sheets.Labour,{header:1});
 ok(lab[1][3]===8&&lab[1][4]===30&&lab[1][6]===40&&wb.Sheets.Labour.F2.f==='D2*E2'&&wb.Sheets.Summary.B17.f,'labour rows: hours, cost rate, charge rate, with formulas; profit % in the summary');
 await p.click('#jc-inv');await p.waitForTimeout(1200);
 ok(/Draft invoice made/.test(await lastToast()),await lastToast());
 const all=Object.values(await st());
 const inv=all.find(v=>v&&v.kind==='sale'&&v.type==='invoice'&&v.site===J);
 const sum=inv?inv.lines.reduce((a,l)=>a+(+l.a||0),0):0;
 ok(inv&&Math.abs(sum-1307.5)<0.01&&inv.clientId==='c9'&&/Labour – Sam Test: 14 h @ £40\.00\/h/.test(inv.lines[0].d),'draft invoice for Mr Cost Test: £1,307.50, Labour – Sam Test: 14 h @ £40/h');
 const jc=all.find(v=>v&&v.kind==='jobcost');
 ok(jc&&Object.keys(jc.invoiced).length===5,'all 5 costs ticked off as invoiced');
 /* sent: profit */
 const s2=await st();const ik=Object.keys(s2).find(k=>s2[k]&&s2[k].kind==='sale'&&s2[k].type==='invoice'&&s2[k].site===J);
 await p.evaluate(async(k)=>{const db=await window.claude.use('db');await db.doc(k).update({status:'sent'});},ik);await p.waitForTimeout(300);
 if(await p.isVisible('#f-cancel'))await p.click('#f-cancel').catch(()=>{});
 await p.click('#viewer-close').catch(()=>{});
 await p.click('#tabs .tab[data-t=accounts]');await p.waitForTimeout(300);await p.click('#ac-tabs button[data-v=jobs]');await p.waitForTimeout(300);
 m=await p.innerText('#main');
 ok(/Invoiced\s+£1,307\.50/.test(m)&&/Profit\s+£237\.50\s+18\.2% of the price/.test(m)&&/Not invoiced yet\s+£0\.00/.test(m),'sent: invoiced £1,307.50, profit £237.50 (18.2%), nothing left to invoice');
 await p.screenshot({path:'h437-job.png',fullPage:true});
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h437: '+bad+' FAILED':'h437: all passed');
 await b.close()})();
