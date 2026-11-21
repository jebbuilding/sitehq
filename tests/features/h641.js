// Breaking a job down for a client (made-up): two sections, one marked Optional extra – it's left out of the total and
// shown on its own (adds £500 +VAT); a payment plan (25% deposit, 75% on completion) shows each £, and both are
// printed on the estimate PDF.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
/* uploaded files are kept in the page so they can be read back (the test backend has no file server) */
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const FETCH='  const r = await fetch(blobUrl(id));';
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null')&&page_src.includes(FETCH),'test hooks found');
page_src=page_src.split(FETCH).join('  if (window.__blobs && window.__blobs[id]) return window.__blobs[id];\n'+FETCH);
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
const JSPDF=fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1150,height:1000}});ctx.setDefaultTimeout(15000);
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();
   if(u.includes('pdf.worker.min'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('pdfjspkg/package/build/pdf.worker.min.js','utf8')});
   if(u.includes('pdf.min'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('pdfjspkg/package/build/pdf.min.js','utf8')});
   if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:JSPDF});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.evaluate(()=>{const S=window.__S;S.otab='clients';S.f.clf='all';window.render()});await p.waitForTimeout(400);
 await p.click('.abcard .cl-open[data-c=c1]');await p.waitForTimeout(500);await p.click('#cv-jf');await p.waitForTimeout(500);await p.click('#jf-newest');await p.waitForTimeout(700);
 await p.click('#sd-addh');await p.waitForTimeout(200);
 let h=p.locator('#sd-lines .sd-hrow').last();await h.locator('.sd-lhx').fill('Garden wall');await h.locator('.sd-hw').fill('Dig footings\nBuild wall');await h.locator('.sd-ha').fill('1000');
 await p.click('#sd-addh');await p.waitForTimeout(200);
 h=p.locator('#sd-lines .sd-hrow').last();await h.locator('.sd-lhx').fill('New porch');await h.locator('.sd-ha').fill('500');await h.locator('.sd-hopt').check();await h.locator('.sd-ha').press('Tab');await p.waitForTimeout(200);
 await p.click('.spn-det summary').catch(()=>{});await p.click('.spn-p[data-i="0"]');await p.waitForTimeout(300);
 const tot=await p.innerText('#sd-tot');console.log(tot.replace(/\n+/g,' | '));
 ok(/Total with VAT\s*£1,200\.00/.test(tot),'the total is just the garden wall (£1,000 + VAT)');
 ok(/Optional: New porch \(not in the total\)\s*\+£600\.00/.test(tot),'the optional porch shows on its own: +£600 with VAT');
 ok(/Deposit \(25%\)\s*£300\.00/.test(tot)&&/On completion \(75%\)\s*£900\.00/.test(tot),'payment plan: £300 deposit, £900 on completion');
 await p.screenshot({path:'h641-est.png',fullPage:true});
 await p.evaluate(()=>{window.__pdf=null;window.__S.dl.save=async x=>{window.__pdf=x;return null}});
 await p.click('#sd-pdf');await p.waitForTimeout(800);if(await p.isVisible('.sd-lhno'))await p.click('.sd-lhno');
 await p.waitForFunction(()=>window.__pdf,null,{timeout:30000});
 const b64=await p.evaluate(async()=>{const d=window.__pdf.data;const bl=d instanceof Blob?d:new Blob([d]);const buf=new Uint8Array(await bl.arrayBuffer());let s='';for(let i=0;i<buf.length;i++)s+=String.fromCharCode(buf[i]);return btoa(s)});
 fs.writeFileSync('h641-est.pdf',Buffer.from(b64,'base64'));
 const txt=Buffer.from(b64,'base64').toString('latin1').replace(/\\/g,'');
 ok(/Optional extras/.test(txt)&&/New porch/.test(txt),'the PDF has the optional extras');
 ok(/How you/.test(txt)&&/Deposit \(25%\)/.test(txt),'and how they\'ll pay');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h641: ${bad} failed`:'h641: all passed');await b.close();process.exit(bad?1:0);
})();
