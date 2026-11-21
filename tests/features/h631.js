// VAT rates and schemes (made-up figures): every rate a builder needs in the list; a subbie's £1,000 bill on reverse
// charge 20% adds £200 to box 1 and box 4; the Flat Rate Scheme (14.5% labour-only) puts 14.5% of the £1,200 takings in box 1.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/sd-vt1"]={kind:"sale",type:"invoice",number:"50",date:"2026-08-10",client:"Test Client",status:"sent",lines:[{d:"Work",a:1000,vc:"S20",k:"lab"}],payments:[{amt:600,date:"2026-09-01",note:"Bank"}]};'+
 'store["todos/rc-vt1"]={kind:"acrcpt",status:"done",paid:"cash",date:"2026-08-12",total:120,vat:20,cat:"mat",supplier:"Test Merchant",desc:"Blocks"};'+
 'store["todos/cis-2026-09"]={kind:"cismonth",month:"2026-09",pays:{},extra:[{who:"sub-t1",inv:"RC1",date:"2026-08-20",status:"paid",paidOn:"2026-08-20",lines:[{d:"Labour",q:1,r:1000,vc:"RC20",acct:"lab"}]}]};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('xlsx'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('xlsxpkg/package/dist/xlsx.full.min.js','utf8')});if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='accounts';window.__S.f.act='vat';window.render()});await p.waitForTimeout(500);
 await p.click('#vt-set');await p.waitForTimeout(200);
 const sch=await p.$$eval('#vt-sch option',o=>o.map(x=>x.value));
 ok(sch.includes('flat')&&sch.includes('flatcash')&&sch.includes('cash'),'schemes: standard, cash, flat rate (and flat rate on money received)');
 const frs=await p.$$eval('#vt-frs option',o=>o.map(x=>x.value));
 ok(frs.join()==='14.5,9.5,16.5','flat rates: 14.5% labour-only, 9.5% general building, 16.5% limited cost');
 await p.selectOption('#vt-ends','3');await p.selectOption('#vt-sch','standard');await p.click('#f-save');await p.waitForTimeout(600);
 const qs=await p.$$eval('#vt-qs button',b=>b.map(x=>x.textContent));const i=qs.findIndex(t=>/Jul – Sept? 2026/.test(t));
 await p.locator('#vt-qs button').nth(i).click();await p.waitForTimeout(400);
 const box=async(n)=>(await p.innerText(`.vt-box[data-n="${n}"] b`)).trim();
 let B=[];for(const n of [1,4,5,6])B.push(await box(n));console.log(B);
 ok(B[0]==='£400.00'&&B[1]==='£220.00'&&B[2]==='£180.00','reverse charge: £200 in box 1 and box 4, box 5 unchanged at £180');
 await p.click('#vt-set');await p.waitForTimeout(200);await p.selectOption('#vt-sch','flat');await p.selectOption('#vt-frs','14.5');await p.click('#f-save');await p.waitForTimeout(600);
 await p.locator('#vt-qs button').nth(i).click();await p.waitForTimeout(400);
 B=[];for(const n of [1,4,5,6])B.push(await box(n));console.log(B);
 ok(B[0]==='£374.00'&&B[1]==='£200.00'&&B[2]==='£174.00'&&B[3]==='£1,200','flat rate 14.5%: box 1 £174 + £200 reverse charge, box 5 £174, box 6 £1,200 with VAT');
 ok(/Flat Rate Scheme 14\.5%/.test(await p.innerText('#main')),'the page says it is on the Flat Rate Scheme at 14.5%');
 /* the rates in the list */
 await p.evaluate(()=>{const v=document.getElementById('sheet');window.__S.otab='sales';window.render()});await p.waitForTimeout(400);
 await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Wording, numbers, VAT/.test(x.textContent));b&&b.click()});await p.waitForTimeout(500);
 const vc=await p.$$eval('#ss-vc option',o=>o.map(x=>x.value));console.log(vc.join());
 ok(['S20','R5','ESM0','ESM5','MOB5','Z0','RC20','RC5','EX','NR','NV'].every(k=>vc.includes(k)),'all the VAT rates are in the list');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h631: ${bad} failed`:'h631: all passed');await b.close();process.exit(bad?1:0);
})();
