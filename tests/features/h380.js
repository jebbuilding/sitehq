const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};store["todos/sup-ems"]={kind:"supplier",name:"EMS Waste Services",cat:"Skips & waste",branch:"Hill Barton Business Park, Sidmouth Road, Clyst St Mary, Exeter EX5 1DR",phone:"01395233748",email:"info@emswasteservices.co.uk",vis:"all",created:1};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},hasTouch:true});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const savePdf=async(name)=>{const r=await p.evaluate(async()=>{const d=(window.__dl||[]).pop();if(!d)return null;const u=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return {fn:d.filename,b64:btoa(s)}});console.log('pdf',r&&r.fn);if(r)fs.writeFileSync(name,Buffer.from(r.b64,'base64'))};
 const sign=async k=>{const cv=p.locator('#wt-sc-'+k);await cv.scrollIntoViewIfNeeded();const bb=await cv.boundingBox();await p.mouse.move(bb.x+20,bb.y+60);await p.mouse.down();await p.mouse.move(bb.x+120,bb.y+95,{steps:6});await p.mouse.move(bb.x+220,bb.y+50,{steps:6});await p.mouse.up();await p.click('#wt-sok-'+k);await p.waitForTimeout(500)};
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('.tab[data-t=jobs]');await p.waitForTimeout(400);await p.click('#wt-new');await p.waitForTimeout(500);
 console.log('C defaults',await p.inputValue('#wt-C-company'),'|',await p.inputValue('#wt-C-carrierNo'),'| carrier ticked',await p.isChecked('#wt-C-is-carrier'),'| B producer',await p.isChecked('#wt-B-is-producer'));
 await p.selectOption('#wt-B-cl',{index:1});await p.waitForTimeout(400);console.log('B',await p.inputValue('#wt-B-name'),'|',await p.inputValue('#wt-B-addr'),'|',await p.inputValue('#wt-B-postcode'),'| D1',await p.inputValue('#wt-D-addr'));
 await p.fill('#wt-qty','1 x 8 yd skip, approx 1.5 t');await p.check('#wt-cont-Sacks');await p.click('#wt-add');await p.waitForTimeout(300);const lines=p.locator('.wt .line');await lines.nth(1).locator('[data-k=desc]').fill('Plasterboard');await lines.nth(1).locator('[data-k=code]').selectOption('17 08 02');await lines.nth(1).locator('[data-k=code]').dispatchEvent('change');
 await p.fill('#wt-notes','Rear garden access');await p.fill('#wt-D-time','08:30');await p.dispatchEvent('#wt-D-time','change');
 await sign('B');await sign('C');console.log('signed',await p.locator('.wt .done').count(),'settings carrier',await p.evaluate(()=>window.__st['settings/app']&&window.__st['settings/app'].company&&window.__st['settings/app'].company.wasteCarrier));
 await p.click('#wt-pdf');await p.waitForTimeout(4000);await savePdf('wtn2.pdf');
 await p.click('#wt-send');await p.waitForTimeout(400);console.log('send',(await p.innerText('.dimask .dimbox')).replace(/\n/g,' | ').slice(0,200));await p.click('.wt-x');
 // second note: us -> EMS
 await p.click('#viewer-close');await p.waitForTimeout(300);await p.click('#wt-new');await p.waitForTimeout(400);await p.click('[data-party=B][data-role=us]');await p.waitForTimeout(300);await p.click('[data-party=C][data-role=supplier]');await p.waitForTimeout(300);await p.selectOption('#wt-C-sup','sup-ems');await p.waitForTimeout(300);
 console.log('note2 B',await p.inputValue('#wt-B-company'),await p.inputValue('#wt-B-carrierNo'),'C',await p.inputValue('#wt-C-company'),'|',await p.inputValue('#wt-C-postcode'));
 await p.click('#viewer-close');await p.waitForTimeout(300);console.log('list',(await p.innerText('.wtl')).replace(/\n/g,' | ').slice(0,300));
 }catch(e){console.log('FAIL',e.message.split('\n').slice(0,4).join('|'))}
 await b.close()})();
