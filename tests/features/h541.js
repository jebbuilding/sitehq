// RAMS made from the CDM page (made-up job at 4 Rolle Road): under the hazards, 📝 RAMS for these hazards lists the RAMS
// the ticked hazards need (work at height, excavations – which also covers existing services – and hot works); one tap
// makes them without leaving the page: each is saved as a risk assessment (hazards, controls, PPE, permit, method) and
// its PDF is filed in 4 Rolle Road › RAMS; the box then says they're already on the site. Opening CDM documents again
// for the site ticks those hazards from its RAMS.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='';
const SITE='4 Rolle Road, Exmouth';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:1100},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 const openCdm=async()=>{await p.evaluate(()=>{document.getElementById('sheet').hidden=true;document.querySelector('.tab[data-t=hs]').click()});await p.waitForTimeout(500);await p.selectOption('#hs-cdmsite',SITE);await p.click('#hs-cdm');await p.waitForTimeout(600);};
 await openCdm();
 await p.evaluate(()=>document.querySelectorAll('.cdr:checked').forEach(i=>{i.checked=false;i.dispatchEvent(new Event('change'))}));await p.waitForTimeout(300);
 ok(/Tick the hazards above and the RAMS this job needs show here/.test(await p.innerText('#cdm-rabox')),'with no hazards ticked, the RAMS box says to tick them');
 for(const k of ['wah','exc','svc','hot']){await p.check(`.cdr[data-k=${k}]`);await p.locator(`.cdr[data-k=${k}]`).dispatchEvent('change');}
 await p.waitForTimeout(400);
 const box=await p.innerText('#cdm-rabox');
 ok(/Work at height/.test(box)&&/Excavations, foundations and drainage/.test(box)&&/Hot works/.test(box)&&/Make these 3 RAMS/.test(box),'ticking work at height, excavations, services and hot works lists 3 RAMS to make (services go with excavations)');
 await (await p.$('#cdm-rabox')).screenshot({path:OUT+'cdmra-1.png'});
 await p.click('#cdm-mkra');await p.waitForTimeout(6000);
 const st=await p.evaluate(()=>{const S=window.__st;const ra=Object.entries(S).filter(([k,v])=>/\/signoffs\/ra-/.test(k)&&v&&v.cdmKey).map(([k,v])=>v);const docs=Object.values(S).filter(v=>v&&v.cat==='rams'&&v.cdmKey);return {ra,docs}});
 ok(st.ra.length===3&&st.ra.every(r=>r.rows.length&&r.rows.every(x=>x.h&&x.c)&&r.ppe.length&&r.method.seq),'3 risk assessments saved, each with hazards and controls, PPE and a method');
 ok(st.ra.find(r=>r.cdmKey==='exc').permit==='Permit to dig'&&st.ra.find(r=>r.cdmKey==='hot').permit==='Hot work','excavations carry a permit to dig, hot works a hot works permit');
 ok(st.docs.length===3&&st.docs.every(d=>d.site===SITE&&d.assetId&&/\.pdf$/.test(d.fileName)),'and 3 RAMS PDFs filed in '+SITE+' › RAMS');
 const pdf=await p.evaluate(async(id)=>{const bl=window.__blobs[id];if(!bl)return '';const u=new Uint8Array(await bl.arrayBuffer());let s='';for(let i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return s},(st.docs.find(d=>d.cdmKey==='wah')||{}).assetId);
 ok(/%PDF/.test(pdf)&&/Work at height/.test(pdf),'the work at height RAMS PDF is a real PDF');
 ok(/Already on/.test(await p.innerText('#cdm-rabox'))&&/Every hazard ticked has its RAMS/.test(await p.innerText('#cdm-rabox')),'the box now says they are already on the site');
 /* open it again: the hazards come back ticked from the site's RAMS */
 await p.evaluate(()=>{const S=window.__st;const k=Object.keys(S).find(k=>/^cdm|cdmsite|todos\/cdm/.test(k));});
 await p.click('#f-cancel').catch(()=>{});await p.waitForTimeout(300);
 await openCdm();
 const t=await p.$$eval('.cdr:checked',x=>x.map(i=>i.dataset.k));
 ok(['wah','exc','hot'].every(k=>t.includes(k)),'opening CDM documents again, the hazards are ticked from the site\'s RAMS ('+t.join(', ')+')');
 /* they show on the site's RAMS tab */
 await p.click('#f-cancel').catch(()=>{});await p.waitForTimeout(300);
 await p.evaluate((s)=>{document.getElementById('sheet').hidden=true;const S=window.__S||null;},SITE);
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h541: ${bad} failed`:'h541: all passed');await b.close();process.exit(bad?1:0);
})();
