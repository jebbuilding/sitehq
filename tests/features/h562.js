// How jobs are going (new look, all made-up): 4 Rolle Road has a £20,000 accepted estimate, £1,000 of materials booked
// to it, a £5,000 + VAT invoice from two months ago with £2,000 paid, and a kitchen programme started 3 weeks ago. Its
// Overview has 📊 How this job is going – spent of the price and what's left, invoiced / paid / client still owes /
// still to invoice, progress from the programme with stages behind, and flags (overdue, behind). The sites list has
// 📊 How all jobs are going with a line per live job, worst first; tapping one opens it.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const ago=(n)=>{const x=new Date();x.setDate(x.getDate()-n);return x.toISOString().slice(0,10);};
const extra=`store["todos/sd-e1"]={kind:"sale",type:"estimate",number:"9",date:"2026-10-01",client:"Sue Jones",clientId:"c1",site:"4 Rolle Road, Exmouth",lines:[{d:"Kitchen",a:20000,vc:"S20",k:"lab"}],status:"accepted"};
store["todos/rc-x1"]={kind:"acrcpt",supplier:"Test Merchants",date:"2026-10-20",total:1200,vat:200,cat:"mat",paid:"card",status:"done",site:"4 Rolle Road, Exmouth",created:1};
store["todos/sd-i1"]={kind:"sale",type:"invoice",number:"101",date:"${ago(60)}",dueDate:"${ago(46)}",client:"Sue Jones",clientId:"c1",site:"4 Rolle Road, Exmouth",lines:[{d:"Stage 1",a:5000,vc:"S20",k:"lab"}],status:"sent",payments:[{amt:2000,date:"${ago(30)}"}]};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1400},deviceScaleFactor:1.25});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true');localStorage.setItem('jeb.splash','1')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset=utf8><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fake(true)+page_src+'</body></html>'}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.goto('https://sitehq.test/');await p.waitForTimeout(3000);await p.keyboard.press('Escape');
 const site='4 Rolle Road, Exmouth';
 /* a kitchen programme that started three weeks ago */
 await p.evaluate(s=>{const o=document.getElementById('ohq');if(o)o.hidden=true;const S=window.__S;S.otab='projects';S.f.projList=false;S.f.proj=s;window.render();S.f.pjtab='programme';window.render()},site);await p.waitForTimeout(500);
 await p.fill('#pg-start',ago(21));await p.click('.pg-new[data-t=kitchen]');await p.waitForTimeout(900);await p.click('#pg-save');await p.waitForTimeout(1500);
 await p.evaluate(()=>{const S=window.__S;S.f.pjtab='overview';window.render();window.scrollTo(0,0)});await p.waitForTimeout(600);
 ok(await p.locator('.jh-card').count()===1,'the site\'s Overview has "How this job is going"');
 const t=(await p.innerText('.jh-card')).replace(/\s+/g,' ');
 ok(/£1,000\.00 spent of £20,000\.00/.test(t)&&/£19,000\.00 left/.test(t),'spent of the price, and what\'s left');
 ok(/£5,000\.00 invoiced/.test(t)&&/£2,000\.00 paid by the client/.test(t)&&/£4,000\.00 client still owes/.test(t)&&/£15,000\.00 still to invoice/.test(t),'invoiced, paid, what the client still owes, still to invoice');
 ok(/1 invoice overdue/.test(t),'flags the overdue invoice');
 ok(/stages done/.test(t)&&/behind/.test(t),'progress from the programme, with stages behind ('+(t.match(/\d+ of \d+ stages done/)||[''])[0]+')');
 ok(/Finishes/.test(t),'the finish date');
 await p.locator('.jh-card').screenshot({path:OUT+'jh-card.png'});
 await p.click('#jh-costs');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>window.__S.f.jcs)==='4 Rolle Road, Exmouth','"Job costs in full" opens this job\'s costs');
 /* the sites list */
 await p.evaluate(()=>{const S=window.__S;S.otab='projects';S.f.projList=true;window.render();window.scrollTo(0,0)});await p.waitForTimeout(600);
 ok(await p.locator('.jh-all').count()===1,'the sites list has "How all jobs are going"');
 const rows=await p.evaluate(()=>[...document.querySelectorAll('.jh-row')].map(r=>r.dataset.s));
 ok(rows.length>=2&&rows[0]===site,'a line per live job, the one in trouble first ('+rows.join(' | ')+')');
 ok(/£4,000\.00/.test(await p.innerText('.jh-all tfoot')),'the total clients owe');
 await p.locator('.jh-all').screenshot({path:OUT+'jh-all.png'});
 await p.click('.jh-row[data-s="'+site+'"]');await p.waitForTimeout(600);
 ok(await p.evaluate(()=>window.__S.f.projList===false&&window.__S.f.proj)===site,'tapping a job opens it');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h562: ${bad} failed`:'h562: all passed');await b.close();process.exit(bad?1:0);
})();
