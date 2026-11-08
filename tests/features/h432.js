// Client sign-off of an estimate, payment receipts, and CIS bills (all made-up).
// Sign-off: "Ask the client to sign" puts the estimate PDF and a request in the client's portal; once signed the
// estimate is marked accepted with who and when. Receipts: recording a payment offers a receipt (PDF, email, portal).
// CIS bill like an accounts package: lines with accounts and tax rates; £200 labour + £100 materials + 20% VAT =
// £360, less CIS 20% of the £200 labour (£40) = £320 due; approved and paid puts it on the return.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra=`store["todos/c9"]={kind:"client",name:"Mrs Sign Test",email:"sign@example.com",address:"7 Test Lane, Exmouth",work:"Garage conversion",stage:"quote",created:1};`;
src=src.replace('store["sheets/"+E]={name:"Sam Test",updated:Date.now()};','store["sheets/"+E]={name:"Sam Test",updated:Date.now(),details:{empType:"cis",utr:"1234567890"}};');
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const savePdf=async(p,name)=>{const b64=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return btoa(s)});fs.writeFileSync(name,Buffer.from(b64,'base64'));};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const st=()=>p.evaluate(()=>window.__st);
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* ---- estimate sign-off ---- */
 await p.click('#tabs .tab[data-t=sales]');await p.waitForTimeout(300);await p.click('#sd-tabs button[data-v=est]');await p.waitForTimeout(200);
 await p.click('#sd-new');await p.waitForTimeout(300);
 await p.selectOption('#sd-cl',{label:'Mrs Sign Test'});await p.waitForTimeout(100);
 const r0=(await p.$$('#sd-lines .sd-line'))[0];await (await r0.$('.sd-ld')).fill('Garage conversion');await (await r0.$('.sd-la')).fill('8000');
 await p.click('#sd-sign');await p.waitForTimeout(2500);
 ok(/they'll see it to sign when they join the portal|portal to sign/.test(await lastToast()),'sent for signing: '+await lastToast());
 let cl=(await st())['todos/c9'];
 const sgn=(cl.ptSigns||[]).find(x=>x.kind==='estimate');
 ok(sgn&&sgn.status==='open'&&sgn.amount===8000&&(cl.ptDocs||[]).some(d=>d.folder==='quotes'&&/Estimate/.test(d.title)),'the estimate PDF and a sign request (kind estimate, £8,000) are in the client\'s portal');
 /* the client signs (in their portal) */
 await p.evaluate(async()=>{const db=await window.claude.use('db');const c=window.__st['todos/c9'];const signs=c.ptSigns.map(x=>x.kind==='estimate'?Object.assign({},x,{status:'signed',signedName:'Mrs Sign Test',signedAt:Date.now(),sig:'data:image/png;base64,iVBORw0KGgo='}):x);await db.doc('todos/c9').update({ptSigns:signs});});
 await p.waitForTimeout(400);await p.click('#sd-tabs button[data-v=inv]');await p.waitForTimeout(200);await p.click('#sd-tabs button[data-v=est]');await p.waitForTimeout(800);
 const est=Object.values(await st()).find(v=>v&&v.kind==='sale'&&v.client==='Mrs Sign Test');
 ok(est.status==='accepted'&&est.acceptedBy==='Mrs Sign Test','once signed, the estimate is marked accepted by Mrs Sign Test');
 await p.locator('.sd-row',{hasText:'Mrs Sign Test'}).first().click();await p.waitForTimeout(300);
 ok(/Accepted and signed by Mrs Sign Test/.test(await p.innerText('.sd-ed')),'the estimate shows who signed it and when');
 /* ---- receipt after a payment ---- */
 await p.click('#sd-toinv');await p.waitForTimeout(200);await p.selectOption('#sti-k','deposit');await p.click('#f-save');await p.waitForTimeout(600);
 await p.click('#sd-sent');await p.waitForTimeout(400);
 await p.locator('.sd-row',{hasText:'Mrs Sign Test'}).first().click();await p.waitForTimeout(300);
 await p.click('#sd-pay');await p.waitForTimeout(200);await p.fill('#sp-note','Bank transfer');await p.click('#f-save');await p.waitForTimeout(800);
 ok(await p.isVisible('#rc-to')&&await p.inputValue('#rc-to')==='sign@example.com'&&/Thank you for your payment of £2,400\.00/.test(await p.inputValue('#rc-msg'))&&/paid in full/.test(await p.inputValue('#rc-msg')),'recording the payment offers a receipt: £2,400, paid in full, to sign@example.com');
 await p.click('#rc-pdf');await p.waitForTimeout(2000);
 const dl=await p.evaluate(()=>(window.__dl||[]).map(r=>r.filename));
 ok(/^Receipt \d+-1 Mrs Sign Test\.pdf$/.test(dl[dl.length-1]),'receipt PDF: '+dl[dl.length-1]);
 await savePdf(p,'h432-receipt.pdf');
 await p.click('#f-cancel');await p.waitForTimeout(300);
 /* ---- any PDF can be saved to a client's job file and/or a site ---- */
 ok(await p.isVisible('#pdfbar-f'),'the "PDF saved" bar offers 📁 Save to…');
 await p.click('#pdfbar-f');await p.waitForTimeout(300);
 await p.check('#fi-cl');await p.selectOption('#fi-c',{label:'Mrs Sign Test – Garage conversion'});await p.selectOption('#fi-f','mail');
 await p.check('#fi-st');await p.selectOption('#fi-sc','other');
 await p.click('#f-save');await p.waitForTimeout(800);
 ok(/Saved to Mrs Sign Test's job file \(Letters & emails\) and /.test(await lastToast()),'filed: '+await lastToast());
 const all=Object.values(await st());
 ok(all.some(v=>v&&v.kind==='jobfile'&&v.clientId==='c9'&&v.items.some(i=>i.folder==='mail'&&/^Receipt/.test(i.name)))&&all.some(v=>v&&v.kind==='sitedoc'&&/^Receipt/.test(v.title)&&v.cat==='other'),'in the client\'s job file (before any estimate is needed) and in the site\'s documents');
 /* ---- my signature, drawn in Setup ---- */
 await p.click('#tabs .tab[data-t=setup]');await p.waitForTimeout(400);
 ok(await p.isVisible('#sg-draw'),'Setup has ✍️ My signature');
 await p.click('#sg-draw');await p.waitForTimeout(300);
 const bx=await (await p.$('#sg-pad')).boundingBox();
 await p.mouse.move(bx.x+20,bx.y+bx.height/2);await p.mouse.down();for(let i=1;i<=12;i++)await p.mouse.move(bx.x+20+i*15,bx.y+bx.height/2+(i%2?18:-18));await p.mouse.up();
 await p.click('#f-save');await p.waitForTimeout(800);
 ok(/Signature saved/.test(await lastToast())&&!!((await st())['todos/salesset']||{}).sigId,'signature drawn and saved for documents');
 ok(await p.isVisible('.sg-img'),'shown in Setup');
 /* ---- CIS bill ---- */
 await p.click('#tabs .tab[data-t=cis]');await p.waitForTimeout(400);
 await p.click('#cis-add');await p.waitForTimeout(400);
 const L=await p.$$('#cb-lines .cb-line');await (await L[0].$('.cb-d')).fill('Labour – blockwork');await (await L[0].$('.cb-r')).fill('200');await (await L[0].$('.cb-v')).selectOption('S20');
 await p.click('#cb-add');const L2=(await p.$$('#cb-lines .cb-line'))[1];await (await L2.$('.cb-d')).fill('Blocks and mortar');await (await L2.$('.cb-r')).fill('100');await (await L2.$('.cb-a')).selectOption('mat');await (await L2.$('.cb-v')).selectOption('S20');
 await p.fill('#cb-ref','ST-55');await p.waitForTimeout(150);
 const tot=await p.innerText('#cb-tot');
 ok(/Subtotal\s+£300\.00/.test(tot)&&/VAT\s+£60\.00/.test(tot)&&/Total\s+£360\.00/.test(tot)&&/Less CIS deduction \(20% of labour £200\.00\)\s+-£40\.00/.test(tot)&&/Amount due to Sam Test\s+£320\.00/.test(tot),'bill: £300 + £60 VAT = £360, less £40 CIS = £320 due');
 await p.fill('#cb-paid',await p.evaluate(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}));
 await p.click('#cb-pay');await p.waitForTimeout(600);
 ok(/Payment recorded – on the CIS return/.test(await lastToast()),'approved and paid: '+await lastToast());
 const ret=await p.innerText('.cis-tbl');
 ok(/£300\.00\s+£100\.00\s+£40\.00/.test(ret),'on the return: £300 paid (no VAT), £100 materials, £40 tax');
 ok(/Invoice ST-55/.test(await p.innerText('.cis-pays')),'the bill is in the month\'s payments');
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h432: '+bad+' FAILED':'h432: all passed');
 await b.close()})();
