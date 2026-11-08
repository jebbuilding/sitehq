// Accounts › 💳 Paid / not paid (all made-up): owed to you – invoice 21 (£1,200 inc VAT, 40 days overdue) and invoice
// 22 (£600, not due yet); you owe – a Jewson bill on account (£240, 10 days overdue) and Sam's invoice (£500).
// Aged into not due / 1–30 / 31–60…; Overdue shows just the overdue ones; 💷 Paid records the payment on the
// invoice; ✓ Mark paid marks the bill and Sam's invoice paid; both then show under Paid in the last 30 days.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const pad=n=>String(n).padStart(2,'0');const isoD=x=>x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());
const D=(n)=>{const x=new Date();x.setDate(x.getDate()-n);return x;};
const extra=`store["todos/sd-o1"]={kind:"sale",type:"invoice",number:"21",date:"${isoD(D(54))}",dueDate:"${isoD(D(40))}",client:"Mrs Owe Test",email:"owe@example.com",lines:[{d:"Work",a:1000,vc:"S20",k:"lab"}],status:"awaiting",payments:[]};
store["todos/sd-o2"]={kind:"sale",type:"invoice",number:"22",date:"${isoD(D(1))}",dueDate:"${isoD(D(-13))}",client:"Mr Later Test",lines:[{d:"Work",a:500,vc:"S20",k:"lab"}],status:"awaiting",payments:[]};
store["todos/rc-b1"]={kind:"acrcpt",supplier:"Jewson",type:"bill",ref:"J-88",date:"${isoD(D(40))}",due:"${isoD(D(10))}",total:240,vat:40,cat:"mat",paid:"acct",status:"done",created:1};
store["sheets/emp1/invoices/iv5"]={number:"55",invDate:"${isoD(D(5))}",amount:500,site:"12 Marine Way, Exmouth",status:"approved",sentAt:1};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const st=()=>p.evaluate(()=>window.__st);
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#tabs .tab[data-t=accounts]');await p.waitForTimeout(300);
 await p.click('#ac-tabs button[data-v=due]');await p.waitForTimeout(300);
 let m=await p.innerText('#main');
 ok(/Owed to you\s+£1,800\.00\s+1 overdue · £1,200\.00/.test(m),'owed to you £1,800, £1,200 overdue');
 ok(/You owe\s+£1,590\.00\s+1 overdue · £240\.00/.test(m),'you owe £1,590 (Jewson £240 overdue, Sam £500 and £850)');
 ok(/Mrs Owe Test[\s\S]*40 days overdue/.test(m)&&/31–60 days over\s+£1,200\.00/.test(m),'invoice 21 is 40 days overdue, in the 31–60 column');
 ok(await p.isVisible('.ad-chase'),'✉ Chase for the overdue invoice (email ready to send)');
 await p.click('#ad-f button[data-v=over]');await p.waitForTimeout(200);
 m=await p.innerText('#main');
 ok(/Mrs Owe Test/.test(m)&&!/Mr Later Test/.test(m)&&/Jewson/.test(m)&&!/Sam Test/.test(m),'Overdue shows just the overdue ones');
 await p.click('#ad-f button[data-v=all]');await p.waitForTimeout(200);
 await p.click('.ad-pay >> nth=0');await p.waitForTimeout(200);await p.click('#f-save');await p.waitForTimeout(800);
 if(await p.isVisible('#f-cancel'))await p.click('#f-cancel');await p.waitForTimeout(200);
 ok(((await st())['todos/sd-o1'].payments||[]).length===1,'💷 Paid records the payment on invoice 21');
 await p.click('#tabs .tab[data-t=accounts]');await p.waitForTimeout(300);await p.click('#ac-tabs button[data-v=due]');await p.waitForTimeout(300);
 await p.click('.ad-paid >> nth=0');await p.waitForTimeout(200);await p.fill('#adp-r','BACS 123');await p.click('#f-save');await p.waitForTimeout(600);
 await p.click('.ad-paid >> nth=0');await p.waitForTimeout(200);await p.click('#f-save');await p.waitForTimeout(600);
 const s=await st();
 ok(s['todos/rc-b1'].paidOn&&s['sheets/emp1/invoices/iv5'].status==='paid','the Jewson bill and Sam\'s invoice marked paid');
 m=await p.innerText('#main');
 ok(/You owe\s+£850\.00/.test(m)&&/Paid in, last 30 days\s+£1,200\.00/.test(m)&&/Jewson/.test(m)&&/Sam Test/.test(m),'£850 left to pay; the two paid show under Paid in the last 30 days');
 await p.screenshot({path:'h440-due.png',fullPage:true});
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h440: '+bad+' FAILED':'h440: all passed');
 await b.close()})();
