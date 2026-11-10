// Accounts › 📨 Getting paid (made-up client Sue Jones): an invoice for £1,200 that is 20 days overdue, and an older one
// with 5% retention (£50) held back over a year ago. The chase list has the friendly reminder ready to email; once it's
// sent it's noted and the next one waits a week. Sue's statement is a PDF with both invoices and the balance. The
// retention is due – an email to ask for it – and ticked off when received.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const day=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const extra='store["todos/sd-gp1"]={kind:"sale",type:"invoice",number:"61",date:"'+day(-50)+'",due:"'+day(-20)+'",client:"Sue Jones",clientId:"c1",email:"sue@example.com",status:"sent",lines:[{d:"Stage 2",a:1000,vc:"S20",k:"lab"}],payments:[]};'+
 'store["todos/sd-gp2"]={kind:"sale",type:"invoice",number:"40",date:"'+day(-400)+'",due:"'+day(-370)+'",client:"Sue Jones",clientId:"c1",email:"sue@example.com",status:"sent",ret:5,lines:[{d:"Stage 1",a:1000,vc:"S20",k:"lab"}],payments:[{amt:1150,date:"'+day(-380)+'",note:"Bank"}]};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{HTMLAnchorElement.prototype.click=function(){};window.__S.otab='accounts';window.__S.f.act='gp';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('#ac-tabs button[data-v=gp]'),'Accounts has a 📨 Getting paid tab');
 const t=await p.innerText('#main');
 ok(/Chase today \(1\)/.test(t)&&/Sue Jones/.test(t)&&/days overdue/.test(t),'the overdue invoice is in today\'s chase list');
 const href=await p.getAttribute('.gp-send','data-href');
 ok(/^mailto:sue@example\.com/.test(href)&&/friendly%20reminder/.test(href)&&decodeURIComponent(href).includes('£1,200.00'),'the friendly reminder email is ready, to Sue, for £1,200');
  await p.click('.gp-send');await p.waitForTimeout(900);
 const ch=await p.evaluate(()=>window.__st['todos/sd-gp1'].chases);
 ok(ch&&ch.length===1,'sending it is noted on the invoice');
 const t2=await p.innerText('#main');
 ok(/Chase today \(0\)/.test(t2)&&/chased and waiting \(1\)/.test(t2),'the next reminder waits (at least a week)');
 /* statement */
 await p.locator('.gp-st').first().click();await p.waitForTimeout(1500);
 ok(await p.isVisible('.gp-save'),'a statement is made');
 await p.click('.gp-save');await p.waitForTimeout(800);
 const pdf=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return [r.filename,s]});
 console.log(pdf[0]);
 ok(/^Statement – Sue Jones/.test(pdf[0])&&pdf[1].includes('Balance owed')&&pdf[1].includes('Stage 2')&&pdf[1].includes('Stage 1'),'the statement has both her invoices and the balance');
 /* retention */
 const t3=await p.innerText('#main');
 ok(/Retention held back/.test(t3)&&/£50\.00/.test(t3)&&/ask for it/.test(t3),'the £50 retention is due, with an email to ask for it');
 await p.click('.gp-retok');await p.waitForTimeout(700);
 const rp=await p.evaluate(()=>window.__st['todos/sd-gp2'].retPaid);
 ok(rp&&rp.amt===50,'ticked off when received');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h480: ${bad} failed`:'h480: all passed');await b.close();process.exit(bad?1:0);
})();
