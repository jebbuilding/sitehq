// Accounts › 📈 Cash flow (made-up figures): £2,000 in the bank; an invoice for £1,200 due in 10 days; a merchant bill
// for £3,000 due in 3 days. The 13 weeks show the bill going out this week (the bank goes to −£1,000, picked out as
// overdrawn), the invoice coming in the week after, and an extra line James adds (a £500 deposit in 2 weeks).
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const day=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const mon=(()=>{const d=new Date();const k=(d.getDay()+6)%7;d.setDate(d.getDate()-k);return d})();
const inW=(n)=>{const d=new Date(mon);d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const extra='store["todos/acct"]={kind:"acct",accounts:[{id:"a1",name:"Business",bank:"Test Bank",opening:2000}],rules:[]};'+
 'store["todos/sd-cf1"]={kind:"sale",type:"invoice",number:"70",date:"'+day(-20)+'",dueDate:"'+inW(9)+'",client:"Test Client",status:"sent",lines:[{d:"Work",a:1000,vc:"S20",k:"lab"}],payments:[]};'+
 'store["todos/rc-cf1"]={kind:"acrcpt",status:"done",type:"bill",paid:"acct",supplier:"Test Merchant",date:"'+day(-27)+'",due:"'+inW(2)+'",total:3000,vat:500,cat:"mat",created:1};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='accounts';window.__S.f.act='cf';window.render()});await p.waitForTimeout(600);
 ok(await p.isVisible('#ac-tabs button[data-v=cf]'),'Accounts has a 📈 Cash flow tab');
 const t=await p.innerText('#main');console.log(t.slice(t.indexOf('In the bank'),t.indexOf('In the bank')+200).replace(/\n+/g,' | '));
 ok(/In the bank now\s*£2,000\.00/.test(t),'starts from the £2,000 in the bank');
 ok(/Lowest in the next 13 weeks\s*-£1,000\.00/.test(t),'the lowest week is −£1,000');
 ok(/goes overdrawn/.test(t),'it warns the bank goes overdrawn');
 const W=await p.$$eval('.csf-w',x=>x.map(b=>b.innerText.replace(/\s+/g,' ')));console.log(W.slice(0,3));
 ok(W.length===13,'13 weeks');
 ok(/−£3,000\.00/.test(W[0])&&/\+£1,200\.00/.test(W[1]),'the bill goes out this week, the invoice comes in next week');
 await p.click('.csf-w[data-i="0"]');await p.waitForTimeout(300);
 ok(/Test Merchant/.test(await p.innerText('.csf-det')),'tap a week to see what\'s in it');
 await p.click('#csf-add');await p.waitForTimeout(200);
 await p.click('#csf-dir button[data-v=in]');await p.fill('#csf-what','Deposit from a new client');await p.fill('#csf-amt','500');
 await p.evaluate(d=>{document.getElementById('csf-date').value=d},(()=>{const d=new Date(mon);d.setDate(d.getDate()+15);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})());
 await p.click('#f-save');await p.waitForTimeout(700);
 const W2=await p.$$eval('.csf-w',x=>x.map(b=>b.innerText.replace(/\s+/g,' ')));
 ok(/\+£500\.00/.test(W2[2]),'the deposit James adds comes in 2 weeks on');
 const cl=await p.evaluate(()=>window.__st['todos/acct'].cashLines);
 ok(cl&&cl.length===1&&cl[0].amt===500,'his line is saved');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h485: ${bad} failed`:'h485: all passed');await b.close();process.exit(bad?1:0);
})();
