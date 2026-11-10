// Today › morning briefing (made-up figures): an invoice 20 days overdue, a van with its MOT due in 10 days, an open
// snag and Sam's holiday request. The card at the top of Today greets James with the date and lists each, and tapping a
// line opens the place to deal with it (the overdue invoices open Accounts › Getting paid).
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const day=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const extra='store["todos/sd-br1"]={kind:"sale",type:"invoice",number:"88",date:"'+day(-34)+'",dueDate:"'+day(-20)+'",client:"Test Client",status:"sent",lines:[{d:"Work",a:1000,vc:"S20",k:"lab"}],payments:[]};'+
 'store["equipment/vb1"]={kind:"vehicle",name:"Van 2",dates:{mot:"'+day(10)+'"}};'+
 'store["jobs/jb-sn1"]={kind:"snag",title:"Snags",site:"4 Rolle Road, Exmouth",assignees:[],tasks:[{id:"t1",text:"Touch up landing ceiling"}],status:"open",created:1};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(500);
 ok(await p.isVisible('.nl-today .brf'),'Today opens with the morning briefing');
 const t=await p.innerText('.brf');console.log(t.replace(/\n+/g,' | '));
 ok(/^Good (morning|afternoon|evening)/.test(t)&&new RegExp(new Date().toLocaleDateString('en-GB',{weekday:'long'})).test(t),'it greets James with the day');
 ok(/£1,200\.00 overdue on 1 invoice/.test(t),'the overdue invoice');
 ok(/1 van or plant to book in/.test(t),'the van to book in');
 ok(/\d+ snags? still open/.test(t),'the open snags');
 ok(/holiday request/.test(t),'the holiday request');
 await p.locator('.brf-l:has-text("overdue")').click();await p.waitForTimeout(600);
 ok(await p.evaluate(()=>window.__S.otab==='accounts'&&window.__S.f.act==='gp'),'tapping it opens Accounts › Getting paid');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h493: ${bad} failed`:'h493: all passed');await b.close();process.exit(bad?1:0);
})();
