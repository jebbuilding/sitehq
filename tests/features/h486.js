// Accounts › 💰 Tax (made-up figures): £60,000 of sales and £20,000 of materials in the bank this tax year – £40,000
// profit. As a limited company: corporation tax at 19% = £7,600 to put aside. As a sole trader: income tax £5,486
// (20% on £27,430 after the £12,570 allowance) and Class 4 NI £1,645.80 (6% on £27,430), and the quarterly figures
// under HMRC's headings.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const d0=new Date();const ty=(d0.getMonth()>3||(d0.getMonth()===3&&d0.getDate()>=6))?d0.getFullYear():d0.getFullYear()-1;
const D=ty+'-05-10',M=ty+'-05';
const extra='store["todos/acct"]={kind:"acct",accounts:[{id:"a1",name:"Business",bank:"Test Bank",opening:0}],rules:[]};'+
 'store["todos/atx-a1-'+M+'"]={kind:"acctx",acc:"a1",month:"'+M+'",tx:[{id:"t1",date:"'+D+'",desc:"Customer payment",amt:60000,cat:"sales"},{id:"t2",date:"'+D+'",desc:"Test Merchant",amt:-20000,cat:"mat"}]};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='accounts';window.__S.f.act='tx';window.render()});await p.waitForTimeout(600);
 ok(await p.isVisible('#ac-tabs button[data-v=tx]'),'Accounts has a 💰 Tax tab');
 ok(/limited company or you're a sole trader/.test(await p.innerText('#main')),'it asks which the business is');
 await p.click('#tx-type button[data-v=ltd]');await p.waitForTimeout(600);
 let t=await p.innerText('#main');
 ok(/Profit so far this tax year\s*£40,000\.00/.test(t),'profit so far £40,000');
 ok(/Corporation tax on the profit so far\s*£7,600\.00/.test(t),'limited company: corporation tax £7,600');
 await p.click('#tx-type button[data-v=sole]');await p.waitForTimeout(600);
 t=await p.innerText('#main');
 ok(/Income tax on the profit so far\s*£5,486\.00/.test(t)&&/Class 4 National Insurance\s*£1,645\.80/.test(t),'sole trader: income tax £5,486 and Class 4 £1,645.80');
 ok(/Total to keep aside\s*£7,131\.80/.test(t),'£7,131.80 to keep aside');
 ok(/Quarterly figures/.test(t)&&await p.locator('.tx-q').count()===4,'the four quarterly updates for sole traders');
 await p.evaluate(()=>document.querySelector('.tx-q').open=true);await p.waitForTimeout(100);
 const q1=await p.innerText('.tx-q >> nth=0');
 ok(/Turnover \(income\)\s*£60,000\.00/.test(q1)&&/Cost of goods bought for resale or goods used\s*£20,000\.00/.test(q1),'the first quarter: turnover and costs under HMRC\'s headings');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h486: ${bad} failed`:'h486: all passed');await b.close();process.exit(bad?1:0);
})();
