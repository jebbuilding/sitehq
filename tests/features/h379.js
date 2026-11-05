const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};store["todos/sup-ems"]={kind:"supplier",name:"EMS Waste Services",cat:"Skips & waste",branch:"Hill Barton, Exeter EX5 1DR",phone:"01395233748",email:"info@emswasteservices.co.uk",vis:"all",created:1};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},hasTouch:true});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const savePdf=async(name)=>{const r=await p.evaluate(async()=>{const d=(window.__dl||[]).pop();if(!d)return null;const u=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return {fn:d.filename,b64:btoa(s)}});console.log('pdf',r&&r.fn);if(r)fs.writeFileSync(name,Buffer.from(r.b64,'base64'))};
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('.tab[data-t=jobs]');await p.waitForTimeout(400);await p.click('#wt-new');await p.waitForTimeout(500);
 console.log('ref',await p.innerText('#viewer-body h3'));
 await p.selectOption('#wt-site',{index:1});await p.selectOption('#wt-p-cl',{index:1});await p.waitForTimeout(200);console.log('producer',await p.inputValue('#wt-p-name'),'|',await p.inputValue('#wt-p-addr'));await p.selectOption('#wt-t-sup','sup-ems');await p.waitForTimeout(300);console.log('to',await p.inputValue('#wt-t-name'),await p.inputValue('#wt-t-email'),'addr',await p.inputValue('#wt-transferAddr'));
 await p.fill('#wt-t-carrier','CBDU123456');await p.fill('#wt-notes','Skip to be collected Friday. Keep gate clear.');await p.fill('#wt-t-dest','Hill Barton transfer station');await p.fill('#wt-t-permit','EPR/AB1234CD');await p.click('#wt-add');await p.waitForTimeout(300);
 const lines=p.locator('.wt .line');console.log('lines',await lines.count());await lines.nth(1).locator('[data-k=desc]').fill('Plasterboard offcuts');await lines.nth(1).locator('[data-k=ewc]').selectOption('17 08 02');await lines.nth(1).locator('[data-k=unit]').selectOption('bulk bag(s)');await lines.nth(1).locator('[data-k=qty]').fill('3');await lines.nth(1).locator('[data-k=qty]').dispatchEvent('change');
 await p.evaluate(()=>document.querySelector('#wt-lines').scrollIntoView());await p.screenshot({path:'wt1.png'});
 const cv0=p.locator('#wt-sc-prod');await cv0.scrollIntoViewIfNeeded();const b0=await cv0.boundingBox();await p.mouse.move(b0.x+20,b0.y+60);await p.mouse.down();await p.mouse.move(b0.x+150,b0.y+90,{steps:6});await p.mouse.up();await p.click('#wt-sok-prod');await p.waitForTimeout(500);
 // sign transferor
 const cv=p.locator('#wt-sc-from');await cv.scrollIntoViewIfNeeded();const bb=await cv.boundingBox();await p.mouse.move(bb.x+20,bb.y+60);await p.mouse.down();await p.mouse.move(bb.x+120,bb.y+90,{steps:6});await p.mouse.move(bb.x+200,bb.y+50,{steps:6});await p.mouse.up();
 await p.click('#wt-sok-from');await p.waitForTimeout(600);console.log('signed from',await p.locator('.wt .done').count(),'locked inputs',await p.locator('#wt-t-name[disabled]').count());
 const cv2=p.locator('#wt-sc-to');await cv2.scrollIntoViewIfNeeded();const b2=await cv2.boundingBox();await p.mouse.move(b2.x+20,b2.y+60);await p.mouse.down();await p.mouse.move(b2.x+150,b2.y+80,{steps:6});await p.mouse.up();await p.fill('#wt-sn-to','Dave the driver');await p.click('#wt-sok-to');await p.waitForTimeout(600);
 console.log('signed all',await p.locator('.wt .done').count(),'supplier updated',await p.evaluate(()=>window.__st['todos/sup-ems'].wasteCarrier));
 await p.screenshot({path:'wt2.png'});
 await p.click('#wt-pdf');await p.waitForTimeout(4000);await savePdf('wtn.pdf');console.log('pdf stored',await p.evaluate(()=>{const r=Object.values(window.__st).find(x=>x&&x.kind==='wtn');return r&&r.pdf&&r.pdf.name}));
 await p.click('#wt-send');await p.waitForTimeout(400);console.log('send dlg',(await p.innerText('.dimask .dimbox')).replace(/\n/g,' | ').slice(0,300));await p.click('[data-how=copy]');await p.waitForTimeout(200);await p.click('.wt-x');
 await p.click('#viewer-close');await p.waitForTimeout(400);console.log('list',(await p.innerText('.wtl')).replace(/\n/g,' | ').slice(0,200));
 }catch(e){console.log('FAIL',e.message.split('\n').slice(0,4).join('|'))}
 await b.close()})();
