// CDM documents › At handover › Building Control completion statement (made-up job at 4 Rolle Road): it is on the
// list, and makes a PDF with the job and building control details filled in, the principal contractor's and
// principal designer's contact details, the client's, principal contractor's and principal designer's statements
// (each with the date they were appointed), the domestic client line, and the certificates to send with it.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=hs]').click());await p.waitForTimeout(500);
 await p.selectOption('#hs-cdmsite','4 Rolle Road, Exmouth');await p.click('#hs-cdm');await p.waitForTimeout(500);
 ok(/At handover[\s\S]*Building Control completion statement/.test(await p.innerText('#cdm-body')),'the CDM documents list has the Building Control completion statement under At handover');
 await p.click('#cdm-none');await p.waitForTimeout(150);
 await p.check('.cdd[data-k=bccs]');
 await p.click('#cdm-ct button[data-v=domestic]');await p.waitForTimeout(150);
 const fill=async(k,v)=>{const el=p.locator('.cdf[data-k="'+k+'"]');if(await el.count())await el.fill(v);};
 await fill('client','Mrs Sue Jones');await fill('project','Loft conversion');await fill('address','4 Rolle Road, Exmouth EX8 2AB');await fill('desc','Loft conversion with a rear dormer');
 await fill('bc','Test Building Control Partnership');await fill('bcRef','BC/2026/0123');await fill('pdName','Test Designs Ltd');
 await p.check('#cdm-dl');
 await p.click('#f-save');await p.waitForTimeout(3500);
 const d=await p.evaluate(()=>(window.__dl||[]).map(x=>[x.filename,x.data.size]));
 console.log(JSON.stringify(d));
 ok(d.length&&/\.pdf$/.test(d[d.length-1][0])&&d[d.length-1][1]>3000,'a PDF is made');
 const b64=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return btoa(s)});
 fs.writeFileSync('h470-bccs.pdf',Buffer.from(b64,'base64'));
 const txt=Buffer.from(b64,'base64').toString('latin1');
 const has=t=>txt.includes(t);
 ok(has('Building Control completion statement'),'its title');
 ok(has('Test Building Control Partnership')&&has('BC/2026/0123'),'the building control body and reference');
 ok(has('1. Client') && has('2. Principal contractor') && has('3. Principal designer'),'the three statements');
 ok((txt.match(/appointed on ___\/___\/______/g)||[]).length===2,'each statement has the date they were appointed');
 ok(has('domestic client'),'the domestic client line');
 ok(has('Test Designs Ltd'),'the principal designer named');
 ok(has('within 5 days'),'when to send it');
 ok(has('Gas Safe')&&has('FENSA'),'the certificates to send with it');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h470: ${bad} failed`:'h470: all passed');await b.close();process.exit(bad?1:0);
})();
