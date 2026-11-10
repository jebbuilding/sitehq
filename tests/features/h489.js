// Accounts › 🏗 Applications (made-up job priced at £40,000: groundworks £10,000, brickwork £20,000, roof £10,000):
// application 1 on 2 Nov 2026 – groundworks done, brickwork half – values £20,000, less 3% retention (£600) = £19,400 due;
// due 9 Nov, final date 26 Nov, pay less notice by 19 Nov. Application 2 – roof half done – values £25,000, less
// retention £750, less the £19,400 before = £4,850 due, made into a draft invoice. The PDF is made.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/sd-app1"]={kind:"sale",type:"estimate",number:"3100",date:"2026-09-01",client:"Test Main Contractor Ltd",site:"4 Rolle Road, Exmouth",status:"accepted",lines:[{d:"Groundworks",a:10000,vc:"S20",k:"lab"},{d:"Brickwork",a:20000,vc:"S20",k:"lab"},{d:"Roof",a:10000,vc:"S20",k:"lab"}],payments:[]};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='accounts';window.__S.f.act='app';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('#ac-tabs button[data-v=app]'),'Accounts has a 🏗 Applications tab');
 await p.click('#app-new');await p.waitForTimeout(300);
 await p.selectOption('#app-est','sd-app1');await p.waitForTimeout(200);
 ok(await p.locator('.app-it').count()===3&&await p.inputValue('#app-client')==='Test Main Contractor Ltd','the items come from the accepted estimate');
 await p.fill('#app-date','2026-11-02');
 await p.locator('.app-p').nth(0).fill('100');await p.locator('.app-p').nth(1).fill('50');await p.waitForTimeout(100);
 const s1=await p.innerText('#app-sum');console.log(s1.replace(/\n/g,' | '));
 ok(/Valued to date £20,000\.00 of £40,000\.00/.test(s1)&&/retention £600\.00/.test(s1)&&/due this time £19,400\.00/.test(s1),'£20,000 valued, £600 retention, £19,400 due');
 ok(/Due Mon 9 Nov/.test(s1)&&/pay less notice by Thu 19 Nov/.test(s1)&&/final date for payment Thu 26 Nov/.test(s1),'due 9 Nov, pay less notice by 19 Nov, final date 26 Nov');
 await p.click('#f-save');await p.waitForTimeout(700);
 ok(/application 1/.test(await p.innerText('#main'))&&/£19,400\.00 due this time/.test(await p.innerText('#main')),'application 1 is listed');
 await p.click('.app-next');await p.waitForTimeout(300);
 await p.locator('.app-p').nth(2).fill('50');await p.waitForTimeout(100);
 const s2=await p.innerText('#app-sum');console.log(s2.replace(/\n/g,' | '));
 ok(/Valued to date £25,000\.00/.test(s2)&&/applied for before £19,400\.00/.test(s2)&&/due this time £4,850\.00/.test(s2),'application 2: £25,000 valued, less £19,400 before, £4,850 due');
 await p.click('#f-save');await p.waitForTimeout(700);
 await p.locator('.app-row:has-text("application 2") .app-inv').click();await p.waitForTimeout(800);
 const inv=await p.evaluate(()=>Object.values(window.__st).find(v=>v&&v.kind==='sale'&&v.type==='invoice'&&/Application for payment no\. 2/.test(v.title||'')));
 ok(inv&&inv.status==='draft'&&inv.lines[0].a===4850,'a draft invoice for £4,850 is made');
 await p.locator('.app-row:has-text("application 2") .app-pdf').click();await p.waitForTimeout(2000);
 const pdf=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return [r.filename,s]});
 ok(/^Application 2/.test(pdf[0])&&pdf[1].includes('Application for payment no. 2')&&pdf[1].includes('pay less notice'),'the application PDF is made');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h489: ${bad} failed`:'h489: all passed');await b.close();process.exit(bad?1:0);
})();
