// Estimate sections like James's Word estimates (made-up job and figures): numbered sections, each with its work as
// bullet points and its own total; the Word import reads them (with the project duration); the PDF prints them
// ("1. Title", bullets, "Total estimate: £x +VAT / £y Inc VAT"). And Merchants: 📤 Send makes the merchant's details
// into a PDF (never the account number or PIN) and opens the Send to… dialog.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra=`store["todos/m1"]={kind:"supplier",name:"Test Timber Ltd",branch:"1 Yard Road, Exeter",phone:"01392 000000",email:"sales@example.com",accountNo:"ACC-998877",pin:"4321",vis:"me"};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
/* a Word estimate set out in sections (made-up client and figures) */
const XL=require('../xlsxpkg/package/xlsx.js');
const P=(t,o)=>{o=o||{};return `<w:p><w:pPr>${o.list?'<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr>':''}</w:pPr><w:r>${o.b?'<w:rPr><w:b/></w:rPr>':''}<w:t xml:space="preserve">${t.replace(/&/g,'&amp;')}</w:t></w:r></w:p>`;};
const body=[P('Mr Section Test'),P('2 Sample Road'),P('Exeter'),P('Estimate Number: 3001'),P('1st October 2026'),P('Re: Alterations',{b:1}),P('Dear Mr Section Test'),P('Thank you for asking us to price the alterations.'),
 P('Summary of Estimated Costs',{b:1}),P('Total estimate:\t\t£15,000.00 +VAT',{b:1}),P('£18,000.00 Inc VAT',{b:1}),P('Estimated project duration 5 weeks',{b:1}),P('Estimate is valid for 30 Days',{b:1}),
 P('Works Included Within the Estimate',{b:1}),P('1. Structural works',{b:1}),P('Remove walls as per plans',{list:1}),P('Install steels as per plans',{list:1}),P('Total estimate:\t£10,000.00 +VAT',{b:1}),P('£12,000.00 Inc VAT',{b:1}),
 P('2. Windows and doors',{b:1}),P('Supply and fit 6 windows',{list:1}),P('This is a PC Sum',{list:1}),P('Total estimate:\t£5,000.00 +VAT',{b:1}),P('£6,000.00 Inc VAT',{b:1}),
 P('3. All other works',{b:1}),P('Hourly rate of £49.00 +VAT per person',{list:1}),
 P('Works Excluded from the Estimate',{b:1}),P('Decorating',{list:1}),P('Please note that changes may alter the price.'),P('Yours sincerely,')].join('');
const z=XL.CFB.utils.cfb_new();XL.CFB.utils.cfb_add(z,'/word/document.xml',Buffer.from('<?xml version="1.0"?><w:document xmlns:w="w"><w:body>'+body+'</w:body></w:document>'));
XL.CFB.utils.cfb_add(z,'/word/numbering.xml',Buffer.from('<w:numbering><w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum><w:num w:numId="3"><w:abstractNumId w:val="1"/></w:num></w:numbering>'));
fs.writeFileSync('h431-sections.docx',XL.CFB.write(z,{fileType:'zip',type:'buffer'}));
const savePdf=async(p,name)=>{const b64=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return btoa(s)});fs.writeFileSync(name,Buffer.from(b64,'base64'));};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('xlsx'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('xlsxpkg/package/dist/xlsx.full.min.js','utf8')});if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* ---- Word estimate in sections ---- */
 await p.click('#tabs .tab[data-t=sales]');await p.waitForTimeout(300);await p.click('#sd-tabs button[data-v=est]');await p.waitForTimeout(200);
 await p.setInputFiles('#main .sd-file','h431-sections.docx');await p.waitForTimeout(1500);
 ok(/£15,000\.00 \+VAT/.test(await p.innerText('.sd-imp')),'read: £10,000 + £5,000 = £15,000 +VAT, matching its summary');
 await p.click('#f-save');await p.waitForTimeout(600);
 const e=Object.values(await p.evaluate(()=>window.__st)).find(v=>v&&v.kind==='sale'&&v.number==='3001');
 ok(e&&e.bd==='sections'&&e.dur==='5 weeks'&&e.lines.length===3&&e.lines[0].h===1&&e.lines[0].d==='Structural works'&&e.lines[0].a===10000&&/Remove walls as per plans\nInstall steels as per plans/.test(e.lines[0].w)&&e.lines[2].d==='All other works'&&e.lines[2].a===''&&/Hourly rate/.test(e.lines[2].w),'three sections with their work lists and totals; the hourly-rate section has no price; 5 weeks');
 await p.locator('.sd-row',{hasText:'Mr Section Test'}).first().click();await p.waitForTimeout(400);
 ok(await p.inputValue('#sd-bd')==='sections'&&(await p.$$('#sd-lines .sd-hrow')).length===3&&await p.inputValue('#sd-dur')==='5 weeks','editor: three sections, shown like the Word estimate, duration 5 weeks');
 const st=await p.$$eval('#sd-lines .sd-hrow .sd-ltot',x=>x.map(e=>e.textContent));
 ok(st[0]==='Section total £10,000.00'&&st[1]==='Section total £5,000.00','section totals');
 /* a new section added by hand */
 await p.click('#sd-addh');const hs=await p.$$('#sd-lines .sd-hrow');const h4=hs[hs.length-1];
 await (await h4.$('.sd-lhx')).fill('Roof');await (await h4.$('.sd-hw')).fill('Strip and re-tile\nNew fascias');await (await h4.$('.sd-ha')).fill('3000');await p.waitForTimeout(150);
 ok(/Total before VAT\s+£18,000\.00/.test(await p.innerText('#sd-tot')),'a fourth section of £3,000: £18,000 before VAT');
 await p.click('#sd-pdf');await p.waitForTimeout(2500);await savePdf(p,'h431-sections.pdf');
 const dl=await p.evaluate(()=>(window.__dl||[]).map(r=>r.filename));
 ok(/Estimate 3001 Mr Section Test\.pdf/.test(dl[dl.length-1]),'estimate PDF made');
 await p.click('#sd-close');await p.waitForTimeout(300);
 /* ---- Merchants: send the details (no account number or PIN) ---- */
 await p.click('#tabs .tab[data-t=suppliers]');await p.waitForTimeout(400);
 await p.locator('.supcard',{hasText:'Test Timber Ltd'}).locator('summary').click();await p.waitForTimeout(200);
 await p.locator('.supcard',{hasText:'Test Timber Ltd'}).locator('.sup-send').click();await p.waitForTimeout(300);
 ok(/never your account number or PIN/.test(await p.innerText('.sps-list')),'send: their details as a PDF (never the account number or PIN)');
 await p.click('.sps-item[data-i="-1"]');await p.waitForTimeout(2500);
 ok(/Send “Test Timber Ltd – contact details”/.test(await p.innerText('#sheettitle')),'the Send to… dialog opens with the details PDF (trades, clients, email)');
 const blobTxt=await p.evaluate(async()=>{const k=Object.keys(window.__blobs);const b=window.__blobs[k[k.length-1]];const t=await b.text();return t.length+'|'+/ACC-998877|4321/.test(t)+'|'+/01392 000000/.test(t)});
 ok(/\|false\|true$/.test(blobTxt),'the PDF has the phone number but not the account number or PIN');
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h431: '+bad+' FAILED':'h431: all passed');
 await b.close()})();
