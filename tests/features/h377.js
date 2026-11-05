const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const savePdf=async(name)=>{const r=await p.evaluate(async()=>{const d=(window.__dl||[]).pop();if(!d)return null;const u=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return {fn:d.filename,b64:btoa(s)}});console.log('pdf',r&&r.fn);if(r)fs.writeFileSync(name,Buffer.from(r.b64,'base64'))};
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('.tab[data-t=jobs]');await p.waitForTimeout(400);await p.click('#ws-new');await p.waitForTimeout(500);
 console.log('sys opts (uPVC)',await p.locator('#wsx-f-sys option').count());await p.selectOption('#wsx-o-mat','Aluminium');await p.waitForTimeout(200);console.log('sys opts (alu)',(await p.locator('#wsx-f-sys option').allTextContents()).join(' | '));
 await p.selectOption('#wsx-f-sys','Aluminium – Origin OW80');await p.selectOption('#wsx-c-out','Other RAL…');await p.waitForTimeout(300);console.log('calc',(await p.innerText('#wsx-calc')).replace(/\n/g,' '));
 // sash window limit warning
 await p.click('.wsgb[data-i="25"]');await p.fill('#wsx-m-sw','1800');await p.fill('#wsx-m-sh','1500');await p.dispatchEvent('#wsx-m-sh','change');await p.waitForTimeout(300);console.log('calc2',(await p.innerText('#wsx-calc')).replace(/\n/g,' '));
 // door with slab/thr
 await p.click('[data-new=door]');await p.waitForTimeout(300);await p.selectOption('#wsx-o-mat','Composite');await p.selectOption('#wsx-f-sys','Composite – Distinction (Deceuninck frame)');await p.fill('#wsx-d-slab','Distinction Ludlow 2');await p.selectOption('#wsx-d-nums','Numerals on door');await p.fill('#wsx-d-num','12A');await p.selectOption('#wsx-d-nstyle','Stainless steel');await p.fill('#wsx-d-gdes','Elegance');await p.selectOption('#wsx-f-thr','Low threshold (Part M)');await p.dispatchEvent('#wsx-f-thr','change');
 await p.fill('#wsx-j-sup','Exeter Window Store, 10-11 Apple Lane, Sidmouth Road, Exeter EX2 5GL');
 await p.click('#wsx-pdf');await p.waitForTimeout(600);await p.click('[data-m=order]');await p.waitForTimeout(4000);await savePdf('ews.pdf');
 await p.click('#wsx-pdf');await p.waitForTimeout(600);await p.click('[data-m=full]');await p.waitForTimeout(4000);await savePdf('ews2.pdf');
 const st=await p.evaluate(()=>{const r=Object.values(window.__st).find(x=>x&&x.kind==='winsurvey');return r&&r.items.map(i=>[i.sys,i.thr,i.slab,i.gdes])});console.log(JSON.stringify(st));
 }catch(e){console.log('FAIL',e.message.split('\n').slice(0,4).join('|'))}
 await b.close()})();
