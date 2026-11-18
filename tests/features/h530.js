// Paid trade invoices go into the accounts by themselves (made-up figures): Sam Test's approved invoice 0042 for £850
// is marked paid on 💳 Paid / not paid, and straight away the Overview counts it as a Subcontractors cost (with a note
// that it isn't on a bank statement yet). Then a statement comes in with the £850 payment: it's linked to the invoice
// by itself, sorted as Subcontractors, and the cost is still £850 (not counted twice).
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const pad=n=>String(n).padStart(2,'0');const uk=x=>pad(x.getDate())+'/'+pad(x.getMonth()+1)+'/'+x.getFullYear();
const D=(n)=>{const x=new Date();x.setDate(x.getDate()-n);return x;};
src=src.replace('store["sheets/"+E+"/invoices/i"]={number:"0042",invDate:today,sentAt:Date.now(),status:"sent",amount:850,','store["sheets/"+E+"/invoices/i"]={number:"0042",invDate:today,sentAt:Date.now(),status:"approved",amount:850,');
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const csv=['Date,Type,Description,Paid out,Paid in,Balance',
 `${uk(D(0))},FPO,SAM TEST 0042,850.00,,4150.00`,
 `${uk(D(0))},DD,VAN FINANCE LTD,300.00,,3850.00`].join('\r\n');
fs.writeFileSync('h530-bank.csv',csv);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await ctx.route(/^https?:\/\//,r=>r.abort());
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const subs=async()=>{const r=p.locator('.drow',{hasText:'Subcontractors (CIS)'}).first();return (await r.count())?(await r.innerText()).replace(/\s+/g,' '):'';};
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#tabs .tab[data-t=accounts]');await p.waitForTimeout(300);
 ok(!(await subs()),'before: no Subcontractors cost in the accounts');
 /* mark it paid */
 await p.click('#ac-tabs button[data-v=due]');await p.waitForTimeout(300);
 await p.locator('.ad-row',{hasText:'£850'}).locator('.ad-paid').click();await p.waitForTimeout(200);
 await p.click('#f-save');await p.waitForTimeout(600);
 ok(await p.evaluate(()=>window.__st['sheets/emp1/invoices/i'].status==='paid'&&window.__st['sheets/emp1/invoices/i'].paidHow==='bank'),'invoice 0042 marked paid (by bank)');
 await p.click('#ac-tabs button[data-v=over]');await p.waitForTimeout(300);
 ok(/£850\.00/.test(await subs()),'Overview: Subcontractors £850 straight away ('+await subs()+')');
 ok(/Money out\s*£850\.00/.test(await p.innerText('#main')),'Money out £850');
 ok(/includes 1 trade invoice you've marked paid \(£850\.00\)/.test(await p.innerText('#main')),'note: not on a bank statement yet');
 await p.screenshot({path:OUT+'tp-1-overview.png'});
 /* the bank statement comes in */
 await p.click('#ac-tabs button[data-v=bank]');await p.waitForTimeout(200);
 await p.click('#ac-newacc');await p.waitForTimeout(200);await p.fill('#aa-n','Business account');await p.fill('#aa-b','Test Bank');await p.fill('#aa-l','1234');await p.click('#f-save');await p.waitForTimeout(400);
 await p.setInputFiles('#main .ac-file','h530-bank.csv');await p.waitForTimeout(900);
 ok(/1 paid trade invoice matched/.test(await lastToast()),'statement in: '+await lastToast());
 const tx=await p.evaluate(()=>Object.values(window.__st).filter(v=>v&&v.kind==='acctx').flatMap(v=>v.tx));
 const t=tx.find(x=>/SAM TEST/.test(x.desc));
 ok(t&&t.cat==='subs'&&t.link&&t.link.t==='trade'&&t.link.id==='i'&&t.link.who==='emp1','the £850 payment is linked to invoice 0042 and sorted as Subcontractors');
 await p.click('#ac-f button[data-v=all]').catch(()=>{});await p.waitForTimeout(200);
 ok(/✓ Sam Test invoice 0042/.test(await p.innerText('#main')),'the payment shows ✓ Sam Test invoice 0042');
 await p.click('#ac-tabs button[data-v=over]');await p.waitForTimeout(300);
 ok(/£850\.00/.test(await subs())&&!/1,700/.test(await subs()),'Overview: Subcontractors still £850, not counted twice ('+await subs()+')');
 ok(/Money out\s*£1,150\.00/.test(await p.innerText('#main')),'Money out £1,150 (the £850 and the £300 van)');
 ok(!/marked paid \(£/.test(await p.innerText('#main')),'the "not on a statement yet" note has gone');
 await p.screenshot({path:OUT+'tp-2-after-bank.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h530: ${bad} failed`:'h530: all passed');await b.close();process.exit(bad?1:0);
})();
