// Variations signed on site (made-up job and client): + Add › Variation; the job, what, details, a photo and the
// price (£450 + 20% VAT = £540); the client types their name and signs with a finger; it's saved signed and locked
// with its signed sheet (PDF). One left unsigned waits for a signature and can be cancelled. "Put on an invoice"
// makes an Extra work invoice with the variation as a line; the next signed one goes onto that same draft invoice.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const vars=()=>p.evaluate(()=>Object.entries(window.__st).filter(([k,v])=>v&&v.kind==='variation').map(([k,v])=>Object.assign({id:k.replace('todos/','')},v)));
 const sales=()=>p.evaluate(()=>Object.entries(window.__st).filter(([k,v])=>v&&v.kind==='sale').map(([k,v])=>Object.assign({id:k.replace('todos/','')},v)));
 const toasts=()=>p.evaluate(()=>window.__toasts||[]);
 const photo=async()=>Buffer.from(await p.evaluate(()=>{const c=document.createElement('canvas');c.width=400;c.height=300;const x=c.getContext('2d');x.fillStyle='#c8a165';x.fillRect(0,0,400,300);x.fillStyle='#333';x.fillRect(150,80,100,140);return c.toDataURL('image/jpeg').split(',')[1]}),'base64');
 const fillNew=async(title,amt)=>{await p.selectOption('#vr-site','12 Marine Way, Exmouth');await p.fill('#vr-client','Mrs Sample');await p.fill('#vr-title',title);await p.fill('#vr-det','Drain down, new pipework, refit and refill');await p.fill('#vr-amt',String(amt));await p.waitForTimeout(100);};
 const sign=async(name)=>{await p.fill('#vr-name',name);const bb=await p.locator('#vr-pad').boundingBox();await p.mouse.move(bb.x+30,bb.y+bb.height/2);await p.mouse.down();await p.mouse.move(bb.x+150,bb.y+20,{steps:8});await p.mouse.move(bb.x+260,bb.y+bb.height-20,{steps:8});await p.mouse.up();await p.click('#f-save');await p.waitForTimeout(2500);};
 const notNow=async()=>{await p.evaluate(()=>{const c=document.querySelector('#f-cancel');if(c)c.click()});await p.waitForTimeout(300);};
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__toasts=[];new MutationObserver(()=>document.querySelectorAll('.toast').forEach(t=>{const x=t.textContent;if(x&&window.__toasts[window.__toasts.length-1]!==x)window.__toasts.push(x)})).observe(document.body,{childList:true,subtree:true,characterData:true});});
 if(await p.$('#nl-tog')){await p.click('#nl-tog');await p.waitForTimeout(300);await p.evaluate(()=>{const t=document.querySelector('#nl-tog');if(t)t.style.display='none'});}
 /* + Add › Variation */
 await p.click('#nl-add');await p.waitForTimeout(200);
 ok(await p.isVisible('.qa-b[data-k=var]'),'+ Add has a 📝 Variation button');
 await p.click('.qa-b[data-k=var]');await p.waitForTimeout(300);
 ok(/New variation/.test(await p.innerText('#sheettitle')),'it opens a new variation');
 await p.click('#f-save');await p.waitForTimeout(200);
 ok(/Pick the job/.test(await p.innerText('body')),'it needs the job first');
 await fillNew('Move the radiator to the other wall',450);
 ok(/£450\.00 \+ VAT £90\.00 = £540\.00/.test(await p.innerText('#vr-total')),'£450 + VAT £90 = £540');
 await p.setInputFiles('.vr-file',{name:'wall.jpg',mimeType:'image/jpeg',buffer:await photo()});await p.waitForTimeout(800);
 ok((await p.$$('#vr-ph .vr-thumb')).length===1,'a photo added');
 await p.click('#f-save');await p.waitForTimeout(600);
 ok(/V1 · Move the radiator/.test(await p.innerText('#sheettitle'))&&/I agree to this extra work at this price/.test(await p.innerText('.vr-stmt')),'the client sees what it is, the price and what they are agreeing to');
 ok((await vars()).length===1&&(await vars())[0].status==='open','saved, waiting for the signature, before they sign');
 await p.click('#f-save');await p.waitForTimeout(200);
 ok(/Sign in the box first/.test(await p.innerText('body')),'it needs a signature');
 await p.screenshot({path:'h464-sign.png'});
 await sign('Mrs Sample');
 ok(/Send them a copy/.test(await p.innerText('#sheettitle'))&&/signed copy of variation V1/.test(await p.inputValue('#vr-msg'))&&(await p.innerText('#f-cancel'))==='Not now','after signing: a ready-written email with their signed copy (or Not now)');
 await p.fill('#vr-to','client@example.com');await p.click('#f-save');await p.waitForTimeout(800);
 ok((await toasts()).some(t=>/Copy sent/.test(t))&&await p.evaluate(()=>(window.__dl||[]).some(d=>/^Variation V1/.test(d.filename))),'the copy is sent (the PDF goes with the email)');
 let v=(await vars())[0];
 ok(v.status==='signed'&&v.emailedAt&&v.sign&&v.sign.name==='Mrs Sample'&&v.sign.sigId&&v.sign.pdfId&&v.photos.length===1,'signed: name, signature, photo and the signed sheet kept');
 ok((await toasts()).some(t=>/Signed by Mrs Sample: V1 ready to go on the next invoice/.test(t)),'it says so');
 const pdfSize=await p.evaluate(id=>window.__blobs[id]&&window.__blobs[id].size,v.sign.pdfId);
 ok(pdfSize>5000,'the signed sheet PDF ('+pdfSize+' bytes)');
 {const b64=await p.evaluate(async id=>{const u=new Uint8Array(await window.__blobs[id].arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return btoa(s)},v.sign.pdfId);fs.writeFileSync('h464-variation.pdf',Buffer.from(b64,'base64'));}
 /* the Variations tab */
 await p.evaluate(()=>document.querySelector('.tab[data-t=sales]').click());await p.waitForTimeout(300);
 await p.click('#sd-tabs button[data-v=var]');await p.waitForTimeout(300);
 ok(/V1 · Move the radiator/.test(await p.innerText('.vr-list'))&&/Signed/.test(await p.innerText('.vr-list')),'Estimates & invoices › Variations lists it, signed');
 ok(/1 signed variation not invoiced yet, £450\.00 \+ VAT/.test(await p.innerText('.vr-due')),'and says it is not invoiced yet');
 await p.screenshot({path:'h464-list.png'});
 /* signed: locked */
 await p.click('.vr-row');await p.waitForTimeout(300);
 ok(!(await p.$('#vr-cancel'))&&!(await p.$('#vr-edit'))&&await p.isVisible('#vr-send')&&/can't be changed/.test(await p.innerText('body'))&&await p.isVisible('#vr-pdf'),'a signed one is locked (no cancel) and has its signed sheet');
 await p.click('#vr-pdf');await p.waitForTimeout(600);
 ok(await p.evaluate(()=>(window.__dl||[]).some(d=>/^Variation V1/.test(d.filename))),'the signed sheet downloads');
 /* put it on an invoice */
 await p.click('#vr-toinv');await p.waitForTimeout(1200);
 let inv=(await sales()).filter(d=>d.type==='invoice');
 ok(inv.length===1&&inv[0].ik==='extra'&&inv[0].site==='12 Marine Way, Exmouth'&&inv[0].lines.length===1&&/Variation V1: Move the radiator/.test(inv[0].lines[0].d)&&inv[0].lines[0].a===450,'an Extra work invoice with the variation as a line: '+JSON.stringify(inv[0]&&inv[0].lines));
 ok((await vars())[0].invId===inv[0].id,'the variation knows its invoice');
 await p.evaluate(()=>{const c=document.querySelector('#f-cancel');if(c)c.click()});await p.waitForTimeout(300);
 await p.evaluate(()=>{const v=document.querySelector('#viewer');if(v&&!v.hidden)document.querySelector('#viewer-close').click()});await p.waitForTimeout(200);
 /* a second: not signed yet, then cancelled */
 await p.click('#nl-add');await p.waitForTimeout(200);await p.click('.qa-b[data-k=var]');await p.waitForTimeout(300);
 await fillNew('Extra socket in the kitchen',120);await p.click('#f-save');await p.waitForTimeout(600);
 await p.evaluate(()=>document.querySelector('#f-cancel').click());await p.waitForTimeout(300);
 let v2=(await vars()).find(x=>/socket/.test(x.title));
 ok(v2&&v2.status==='open'&&v2.number==='V2','not ready to sign: kept as V2, waiting for a signature');
 await p.evaluate(()=>document.querySelector('.tab[data-t=sales]').click());await p.waitForTimeout(300);await p.click('#sd-tabs button[data-v=var]');await p.waitForTimeout(300);
 await p.locator('.vr-row',{hasText:'socket'}).click();await p.waitForTimeout(300);
 await p.click('#vr-edit');await p.waitForTimeout(300);
 ok(/Change V2/.test(await p.innerText('#sheettitle'))&&(await p.inputValue('#vr-title'))==='Extra socket in the kitchen'&&(await p.inputValue('#vr-amt'))==='120','an unsigned one can be changed: its details are filled in');
 await p.fill('#vr-title','Two extra sockets in the kitchen');await p.fill('#vr-amt','220');await p.click('#f-save');await p.waitForTimeout(600);await notNow();
 v2=(await vars()).find(x=>/sockets/.test(x.title));
 ok(v2&&v2.number==='V2'&&v2.amt===220&&(await vars()).length===2,'saved as the same V2 with the new price');
 await p.evaluate(()=>document.querySelector('.tab[data-t=sales]').click());await p.waitForTimeout(300);await p.click('#sd-tabs button[data-v=var]');await p.waitForTimeout(300);
 await p.locator('.vr-row',{hasText:'sockets'}).click();await p.waitForTimeout(300);
 await p.click('#vr-cancel');await p.waitForTimeout(400);
 ok((await vars()).find(x=>/sockets/.test(x.title)).status==='cancelled','an unsigned one can be cancelled');
 /* a third, signed, goes onto the same draft invoice */
 await p.click('#nl-add');await p.waitForTimeout(200);await p.click('.qa-b[data-k=var]');await p.waitForTimeout(300);
 await fillNew('Paint the new wall',200);await p.click('#f-save');await p.waitForTimeout(600);await sign('Mrs Sample');await notNow();
 await p.evaluate(()=>document.querySelector('.tab[data-t=sales]').click());await p.waitForTimeout(300);await p.click('#sd-tabs button[data-v=var]');await p.waitForTimeout(300);
 await p.click('.vr-inv');await p.waitForTimeout(1200);
 inv=(await sales()).filter(d=>d.type==='invoice');
 ok(inv.length===1&&inv[0].lines.length===2&&/Variation V3: Paint the new wall/.test(inv[0].lines[1].d),'the next one goes onto the same draft invoice (2 lines)');
 ok((await toasts()).some(t=>/added to the draft invoice/.test(t)),'it says it went onto the draft');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h464: ${bad} failed`:'h464: all passed');await b.close();process.exit(bad?1:0);
})();
