// Provisional sums, PC sums and contingency on an estimate (made-up job): a line can be a PC sum (kitchen units) or a
// provisional sum (drainage); + Add a contingency adds 5% of the lines so far; the PDF says what each is and has a note
// that they're adjusted to the actual cost on the final invoice and the contingency is only charged if needed.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({sdEdit});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1100,height:1100}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.evaluate(async()=>{await window.__S.db.doc('todos/salesset').set({kind:'salesset',head:'Test Builders, 1 Test Street'});});await p.waitForTimeout(500);
 await p.evaluate(()=>window.__T().sdEdit({type:'estimate'}));await p.waitForTimeout(600);
 await p.fill('#sd-client','Sue Jones');await p.fill('#sd-title','Kitchen extension').catch(()=>{});
 const row=i=>p.locator('#sd-lines .sd-line:not(.sd-hrow)').nth(i);
 await row(0).locator('.sd-ld').fill('Build the extension');await row(0).locator('.sd-la').fill('20000');
 await p.click('#sd-addl');await row(1).locator('.sd-ld').fill('Kitchen units (client to choose)');await row(1).locator('.sd-la').fill('5000');
 ok(await row(1).locator('.sd-lal').count()===1,'each line has "Price is": fixed, provisional sum, PC sum or contingency');
 await row(1).locator('.sd-lal').selectOption('pc');
 await p.click('#sd-addl');await row(2).locator('.sd-ld').fill('Drainage connection (depth unknown)');await row(2).locator('.sd-la').fill('1500');await row(2).locator('.sd-lal').selectOption('ps');
 await p.click('#sd-addc');await p.waitForTimeout(300);await p.fill('#sd-cp','5');await p.click('.dimbox button[type=submit]');await p.waitForTimeout(400);
 const c3=await row(3).locator('.sd-la').inputValue();
 ok(c3==='1325'&&await row(3).locator('.sd-lal').inputValue()==='cont','+ Add a contingency adds 5% of £26,500 = £1,325, marked contingency');
 await p.click('#sd-save');await p.waitForTimeout(1000);await p.click('#viewer-close').catch(()=>{});await p.keyboard.press('Escape');
 const rec=Object.values(await p.evaluate(()=>window.__st)).find(v=>v&&v.kind==='sale');
 ok(rec&&rec.lines.filter(l=>l.al).map(l=>l.al).join(',')==='pc,ps,cont','saved with what each is');
 await p.evaluate(()=>{window.__S.otab='sales';window.render()});await p.waitForTimeout(600);
 await p.evaluate(()=>{const r=Object.entries(window.__st).find(([k,v])=>v&&v.kind==='sale');window.__T().sdEdit(Object.assign({id:r[0].replace('todos/','')},r[1]))});await p.waitForTimeout(600);await p.click('#sd-pdf');await p.waitForTimeout(3500);
 const pdf=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];if(!d)return '';const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return s});
 fs.writeFileSync('h681-est.pdf',Buffer.from(pdf,'latin1'));
 ok(/prime cost/.test(pdf)&&/provisional sum/.test(pdf)&&/only charged if/.test(pdf),'the PDF says what each line is');
 ok(/This estimate includes/.test(pdf)&&/PC sums/.test(pdf)&&/actual cost/.test(pdf),'and has the note that they are adjusted to the actual cost');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h681: ${bad} failed`:'h681: all passed');await b.close();process.exit(bad?1:0);
})();
