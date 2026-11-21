// A CIS trade sends an invoice (made-up): with My details › CIS filled in and a VAT number, Send an invoice asks for the
// materials and VAT in it and reminds them of the reverse charge wording; the figures are saved with the invoice.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null')&&page_src.includes(DD),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(10000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const t=await ctx.newPage();t.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await t.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src.replace(DD,'function detailsDone(d){return true}')+'</body></html>');await t.waitForTimeout(2500);await t.keyboard.press('Escape');
 await t.evaluate(async()=>{const S=window.__S;const d=Object.assign({},(S.myProfile&&S.myProfile.details)||{},{empType:'cis',cisStatus:'reg',utr:'1234567890',vatNo:'GB123456789'});await S.db.doc('sheets/'+S.me).update({details:d})});await t.waitForTimeout(600);
 await t.evaluate(()=>{const S=window.__S;S.tab='invoices';window.render()});await t.waitForTimeout(500);
 await t.click('#addI');await t.waitForTimeout(400);
 ok(await t.isVisible('#i-mat')&&await t.isVisible('#i-vat'),'Send an invoice asks for the materials and VAT in it');
 ok(/Section 55A/.test(await t.innerText('#sheet')),'and reminds a VAT registered trade to put the reverse charge wording on');
 await t.screenshot({path:'h634-inv.png'});
 await t.fill('#i-num','T-100');await t.fill('#i-amt','1000');await t.fill('#i-mat','200');await t.fill('#i-vat','0');
 await t.setInputFiles('#i-file',{name:'inv.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%%EOF')});
 await t.click('#f-save');await t.waitForTimeout(1500);
 const v=await t.evaluate(()=>Object.values(window.__st).find(x=>x&&x.number==='T-100'));
 ok(v&&v.mat===200&&v.vat===0&&v.cis===true,'the materials and VAT are saved with the invoice');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h634: ${bad} failed`:'h634: all passed');await b.close();process.exit(bad?1:0);
})();
