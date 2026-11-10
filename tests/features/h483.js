// Merchants › 📦 Orders (made-up merchant "Test Merchants" with a price list): a new order for 4 Rolle Road – 100 dense
// blocks at £1.50 from the price list (£150). 80 come with 20 short (part delivered), then the last 20 (delivered).
// Their bill (£150 + VAT, INV-9) is matched to the order and it matches.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/sup-t1"]={kind:"supplier",name:"Test Merchants",email:"orders@example.com"};'+
 'store["todos/pl-sup-t1"]={kind:"pricelist",sup:"sup-t1",items:[{n:"Dense block 100mm",u:"each",p:1.5},{n:"Sharp sand",u:"bag",p:4}]};'+
 'store["todos/rc-po1"]={kind:"acrcpt",status:"done",type:"bill",supplier:"Test Merchants",date:"2026-11-05",ref:"INV-9",total:180,vat:30,cat:"mat",paid:"acct",created:1};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='suppliers';window.__S.f.merTab='orders';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('.mer-t[data-v=orders][aria-pressed=true]'),'Merchants has a 📦 Orders tab');
 await p.click('#pord-new');await p.waitForTimeout(300);
 await p.selectOption('#pord-site','4 Rolle Road, Exmouth');await p.selectOption('#pord-sup','sup-t1');await p.dispatchEvent('#pord-sup','change');
 await p.fill('.pord-d','Dense block 100mm');await p.waitForTimeout(100);
 ok(await p.inputValue('.pord-p')==='1.5'&&await p.inputValue('.pord-u')==='each','picking from the price list fills the price');
 await p.fill('.pord-q','100');await p.click('#f-save');await p.waitForTimeout(800);
 const po=()=>p.evaluate(()=>Object.values(window.__st).find(v=>v&&v.kind==='purchaseorder'));
 let o=await po();
 ok(o&&o.site==='4 Rolle Road, Exmouth'&&o.net===150&&o.lines[0].q===100,'the order is made for the job: 100 blocks, £150');
 await p.evaluate(()=>{const c=document.querySelector('#f-cancel');if(c)c.click();});await p.waitForTimeout(200);
 await p.evaluate(()=>{window.__S.f.merTab='orders';window.render()});await p.waitForTimeout(400);
 /* 80 come, 20 short */
 await p.click('.pord-del');await p.waitForTimeout(300);
 await p.fill('.pord-g','80');await p.fill('#pord-note','20 short');
 await p.setInputFiles('#pord-photo','fixtures/ld1.png');await p.click('#f-save');await p.waitForTimeout(1200);
 o=await po();
 ok(o.deliveries.length===1&&o.deliveries[0].got['0']===80&&o.deliveries[0].photo&&/20 short/.test(o.deliveries[0].note),'the delivery is ticked off with the note and the photo');
 ok(/Part delivered/.test(await p.innerText('#main')),'the order shows part delivered');
 await p.click('.pord-del');await p.waitForTimeout(300);
 ok(await p.inputValue('.pord-g')==='20','the rest still to come is filled in (20)');
 await p.click('#f-save');await p.waitForTimeout(1000);
 ok(/Delivered/.test(await p.innerText('.pord-row .tag')),'then delivered');
 /* the invoice */
 await p.click('.pord-inv');await p.waitForTimeout(300);
 await p.selectOption('#pord-rc','rc-po1');await p.dispatchEvent('#pord-rc','change');await p.waitForTimeout(200);
 ok(/✓ It matches/.test(await p.innerText('#pord-cmp')),'their £150 + VAT bill matches what came');
 await p.click('#f-save');await p.waitForTimeout(800);
 o=await po();
 ok(o.rcpt==='rc-po1'&&/Invoiced/.test(await p.innerText('.pord-row .tag')),'matched to the order, which shows invoiced');
 ok(await p.evaluate(()=>window.__st['todos/rc-po1'].site)==='4 Rolle Road, Exmouth','the bill is put against the job');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h483: ${bad} failed`:'h483: all passed');await b.close();process.exit(bad?1:0);
})();
