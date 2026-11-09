// Drawing → price → order (made-up merchants and prices): Merchants › 💷 Price lists – one merchant's prices typed in,
// another's brought in from a CSV; a drawing with four 100 mm block walls (a 4 × 3 m room at 1:50); 🧮 Quantities ›
// 💷 Price it and order matches the blocks, mortar and footing concrete to the prices (the cheapest good match), totals
// it, makes it the job's materials budget, and makes one order per merchant (PDF and a ready-written email).
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/sup-a"]={kind:"supplier",name:"Test Merchants",loc:"Exeter",cat:"Builders merchant",vis:"me",email:"orders@example.com",accountNo:"A123",created:1};'+
 'store["todos/sup-b"]={kind:"supplier",name:"Other Builders Supplies",loc:"Exmouth",cat:"Builders merchant",vis:"me",email:"sales@example.org",created:2};'+
 'store["todos/sd-e1"]={kind:"sale",type:"estimate",number:"3001",date:"2026-10-01",client:"Mr Test",site:"12 Marine Way, Exmouth",status:"accepted",lines:[{d:"Building work",a:6000,vc:"S20",k:"lab"},{d:"Materials",a:4000,vc:"S20",k:"mat"}],payments:[]};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const HOOK='  let lenObj = null;';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2,'test hook found once');
page_src=page_src.replace(HOOK,HOOK+'window.__np=()=>doc;');
fs.writeFileSync('h466-prices.csv',['Product code,Description,Unit,Price (ex VAT)','B100,Dense concrete block 440x215x100 7N,each,1.45','M25,Mortar ready mixed,m3,95.00','C1,Concrete C25 ready mix,m3,128.00','X9,Something else entirely,each,9.99'].join('\r\n'));
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const toasts=()=>p.evaluate(()=>window.__toasts||[]);
 const pls=()=>p.evaluate(()=>Object.values(window.__st).filter(v=>v&&v.kind==='pricelist'));
 const pos=()=>p.evaluate(()=>Object.values(window.__st).filter(v=>v&&v.kind==='purchaseorder'));
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__toasts=[];new MutationObserver(()=>document.querySelectorAll('.toast').forEach(t=>{const x=t.textContent;if(x&&window.__toasts[window.__toasts.length-1]!==x)window.__toasts.push(x)})).observe(document.body,{childList:true,subtree:true,characterData:true});});
 if(await p.$('#nl-tog')){await p.click('#nl-tog');await p.waitForTimeout(300);await p.evaluate(()=>{const t=document.querySelector('#nl-tog');if(t)t.style.display='none'});}
 /* Merchants › Price lists */
 await p.evaluate(()=>document.querySelector('.tab[data-t=suppliers]').click());await p.waitForTimeout(300);
 await p.click('.mer-t[data-v=prices]');await p.waitForTimeout(300);
 ok(/Only you see them/.test(await p.innerText('#main'))&&(await p.$$('.pl-row')).length>=2,'Merchants has a 💷 Price lists tab with each merchant (prices only you see)');
 await p.locator('.pl-row',{hasText:'Test Merchants'}).locator('.pl-edit').click();await p.waitForTimeout(300);
 await p.locator('.pl-item').nth(0).locator('.pl-n').fill('Dense block 440x215x100');await p.locator('.pl-item').nth(0).locator('.pl-u').fill('each');await p.locator('.pl-item').nth(0).locator('.pl-p').fill('1.65');
 await p.click('#pl-add');await p.locator('.pl-item').nth(1).locator('.pl-n').fill('General purpose mortar');await p.locator('.pl-item').nth(1).locator('.pl-u').fill('m3');await p.locator('.pl-item').nth(1).locator('.pl-p').fill('88');
 await p.click('#f-save');await p.waitForTimeout(400);
 ok((await pls()).find(l=>l.sup==='sup-a').items.length===2,'two prices typed in for Test Merchants');
 await p.locator('.pl-row',{hasText:'Other Builders'}).locator('.pl-file').setInputFiles('h466-prices.csv');await p.waitForTimeout(600);
 ok((await toasts()).some(t=>/4 prices brought in for Other Builders Supplies/.test(t)),'a CSV price list brought in: '+(await toasts()).slice(-1)[0]);
 ok(/4 prices/.test(await p.locator('.pl-row',{hasText:'Other Builders'}).innerText()),'the list shows 4 prices');
 /* a drawing: four 100 mm block walls, a 4 × 3 m room at 1:50 (5 units per mm of paper) */
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 const sc=await p.evaluate(()=>{const d=window.__np();const u=v=>v/d.scale*5;const x0=200,y0=200,W=u(4000),H=u(3000);const w=(a,b)=>({t:'shape',k:'wall',a,b,c:'#111111',w:2,th:u(100)});d.objs.push(w([x0,y0],[x0+W,y0]),w([x0+W,y0],[x0+W,y0+H]),w([x0+W,y0+H],[x0,y0+H]),w([x0,y0+H],[x0,y0]));return d.scale;});
 ok(sc===50,'drawing at 1:50');
 await p.evaluate(()=>document.querySelector('.np .np-qty').click());await p.waitForTimeout(500);
 const qt=await p.evaluate(()=>{const d=[...document.querySelectorAll('.np .dimask')].pop();return d?d.innerText:'';});
 ok(/Blocks for/.test(qt)&&/Mortar/.test(qt),'Quantities lists blocks and mortar');
 ok(await p.isVisible('.qtybox .qprice'),'and has 💷 Price it and order');
 await p.click('.qtybox .qprice');await p.waitForTimeout(500);
 ok(await p.isVisible('#po-lines')&&/Price it and order/.test(await p.innerText('#sheettitle')),'the priced list opens over the drawing');
 const lines=await p.$$eval('#po-lines .po-line',ls=>ls.map(l=>({what:l.querySelector('.po-what').textContent,pick:(l.querySelector('.po-pick')||{}).value||'',opt:l.querySelector('.po-pick')?l.querySelector('.po-pick').selectedOptions[0].textContent:'',tot:l.querySelector('.po-lt').textContent})));
 console.log(lines.map(l=>l.what+' → '+l.opt+' '+l.tot).join('\n'));
 const blk=lines.find(l=>/Blocks/.test(l.what)),mor=lines.find(l=>/^Mortar/.test(l.what)),con=lines.find(l=>/footing concrete/i.test(l.what));
 ok(blk&&/Other Builders Supplies.* – Dense concrete block .* £1\.45/.test(blk.opt),'blocks: the cheaper match (£1.45 at Other Builders, not £1.65)');
 ok(mor&&/Test Merchants.* – General purpose mortar – £88\.00/.test(mor.opt),'mortar: £88/m³ at Test Merchants (cheaper than £95)');
 ok(con&&/Concrete C25/.test(con.opt),'footing concrete: the concrete at Other Builders');
 ok(/of \d+ priced/.test(await p.innerText('#po-tot'))&&/£[\d,]+\.\d\d \+ VAT/.test(await p.innerText('#po-tot')),'a total: '+(await p.innerText('#po-tot')).replace(/\s+/g,' '));
 await p.screenshot({path:'h466-priced.png'});
 /* no job picked: asks for it */
 await p.click('#f-save');await p.waitForTimeout(200);
 ok(/Pick the job/.test(await p.innerText('body')),'it asks which job');
 await p.selectOption('#po-site','12 Marine Way, Exmouth');
 const total=+(await p.innerText('#po-tot')).match(/£([\d,]+\.\d\d)/)[1].replace(/,/g,'');
 await p.click('#po-budget');await p.waitForTimeout(400);
 const jc=await p.evaluate(()=>Object.values(window.__st).find(v=>v&&v.kind==='jobcost'&&v.site==='12 Marine Way, Exmouth'));
 ok(jc&&Math.abs(jc.matBudget-total)<0.01,'made the job\'s materials budget: £'+(jc&&jc.matBudget));
 await p.click('#f-save');await p.waitForTimeout(800);
 const o=await pos();
 ok(o.length===2&&o.every(x=>x.site==='12 Marine Way, Exmouth'&&x.status==='draft')&&o.some(x=>x.supName.startsWith('Test Merchants'))&&o.some(x=>x.supName.startsWith('Other Builders')),'one order for each merchant: '+o.map(x=>x.number+' '+x.supName+' '+x.net).join(', '));
 ok(Math.abs(o.reduce((a,x)=>a+x.net,0)-total)<0.02,'the orders add up to the priced total');
 ok(/2 orders ready/.test(await p.innerText('#sheettitle')),'2 orders ready');
 await p.screenshot({path:'h466-orders.png'});
 /* the PDF and the email */
 await p.locator('.po-pdf').first().click();await p.waitForTimeout(1500);
 const dl=await p.evaluate(()=>(window.__dl||[]).map(d=>[d.filename,d.data.size]));
 ok(dl.some(d=>/^Order PO\d .*\.pdf$/.test(d[0])&&d[1]>3000),'the order PDF: '+JSON.stringify(dl.slice(-1)));
 {const b64=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return btoa(s)});fs.writeFileSync('h466-order.pdf',Buffer.from(b64,'base64'));}
 await p.locator('.po-mail').first().click();await p.waitForTimeout(1500);
 ok((await pos()).some(x=>x.status==='sent'&&x.sentAt),'emailing it marks the order sent');
 /* the job budget now uses it */
 await p.evaluate(()=>{const v=document.querySelector('#viewer');if(v&&!v.hidden)document.querySelector('#viewer-close').click()});await p.waitForTimeout(200);
 await p.evaluate(()=>document.querySelector('#f-save').click());await p.waitForTimeout(300);
 /* leave the drawing (test only: take it off the screen) */
 await p.evaluate(()=>{const n=document.querySelector('.np');if(n)n.remove()});
 await p.evaluate(()=>document.querySelector('.tab[data-t=accounts]').click());await p.waitForTimeout(300);
 await p.click('#ac-tabs button[data-v=jobs]');await p.waitForTimeout(300);await p.locator('.jc-row',{hasText:'12 Marine Way'}).click();await p.waitForTimeout(300);
 ok(new RegExp('Materials and hire \\(from the drawing.s priced list\\)[\\s\\S]*of £'+total.toLocaleString('en-GB',{minimumFractionDigits:2})).test(await p.innerText('.jbg-card')),'live profit uses it as the materials budget');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h466: ${bad} failed`:'h466: all passed');await b.close();process.exit(bad?1:0);
})();
