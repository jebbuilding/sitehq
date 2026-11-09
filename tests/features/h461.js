// Setup › 📄 My letterhead: not set up yet says so; bringing in a (made-up) Word letterhead there shows it – address
// lines, foot line, VAT number – and a sample page can be made on it; estimates and invoices then need no asking.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const XL=require('../xlsxpkg/package/xlsx.js');
{const W=t=>'<w:p><w:r><w:t xml:space="preserve">'+t+'</w:t></w:r></w:p>';
 const z=XL.CFB.utils.cfb_new();
 XL.CFB.utils.cfb_add(z,'/word/document.xml',Buffer.from('<?xml version="1.0"?><w:document xmlns:w="w" xmlns:r="r"><w:body>'+W('')+'<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/><w:footerReference w:type="default" r:id="rIdF"/></w:sectPr></w:body></w:document>'));
 XL.CFB.utils.cfb_add(z,'/word/_rels/document.xml.rels',Buffer.from('<?xml version="1.0"?><Relationships><Relationship Id="rIdH" Type="h" Target="header1.xml"/><Relationship Id="rIdF" Type="f" Target="footer1.xml"/></Relationships>'));
 XL.CFB.utils.cfb_add(z,'/word/header1.xml',Buffer.from('<w:hdr>'+['Test Builders Ltd','1 Test Street','Exeter','','01234 567890'].map(W).join('')+'</w:hdr>'));
 XL.CFB.utils.cfb_add(z,'/word/footer1.xml',Buffer.from('<w:ftr>'+W('Builds | Extensions | Repairs')+W('VAT Number 123456789')+'</w:ftr>'));
 fs.writeFileSync('h461-lh.docx',XL.CFB.write(z,{fileType:'zip',type:'buffer'}));}
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('xlsx'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('xlsxpkg/package/dist/xlsx.full.min.js','utf8')});if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 if(await p.$('#nl-tog')){await p.click('#nl-tog');await p.waitForTimeout(300);await p.evaluate(()=>{const t=document.querySelector('#nl-tog');if(t)t.style.display='none'});}
 await p.evaluate(()=>document.querySelector('.tab[data-t=setup]').click());await p.waitForTimeout(400);
 ok(await p.isVisible('.lh-card')&&/📄 My letterhead/.test(await p.innerText('.lh-card')),'Setup has a 📄 My letterhead card');
 ok(/Not set up yet/.test(await p.innerText('.lh-card')),'it says it is not set up yet');
 ok((await p.$eval('.lh-card .lh-file',i=>getComputedStyle(i).display))!=='none','its file picker is not hidden (iPad)');
 await p.setInputFiles('.lh-card .lh-file','h461-lh.docx');await p.waitForTimeout(2500);
 ok(/Letterhead saved · VAT number 123456789/.test(await lastToast()),await lastToast());
 const card=await p.innerText('.lh-card');
 ok(/Test Builders Ltd/.test(card)&&/1 Test Street/.test(card)&&/01234 567890/.test(card),'the card shows its address lines');
 ok(/Builds \| Extensions \| Repairs/.test(card)&&/VAT Number 123456789/.test(card),'and its foot line and VAT number');
 await p.locator('.lh-card').scrollIntoViewIfNeeded();await p.locator('.lh-card').screenshot({path:'h461-card.png'});
 const n0=await p.evaluate(()=>(window.__dl||[]).length);
 await p.click('#lh-pdf');await p.waitForTimeout(2500);
 const dl=await p.evaluate(()=>(window.__dl||[]).map(r=>[r.filename,r.data.size]));
 ok(dl.length===n0+1&&dl[dl.length-1][0]==='Letterhead sample.pdf'&&dl[dl.length-1][1]>2000,'a sample page on it: '+JSON.stringify(dl[dl.length-1]));
 await p.click('#lh-edit');await p.waitForTimeout(300);
 ok(/Letterhead, terms & bank/.test(await p.innerText('#sheettitle')),'Change the lines or logo opens the letterhead settings');
 await p.click('#f-cancel');await p.waitForTimeout(200);
 /* an invoice PDF now goes straight through */
 await p.evaluate(()=>document.querySelector('.tab[data-t=sales]').click());await p.waitForTimeout(300);
 await p.click('#sd-new');await p.waitForTimeout(300);await p.fill('#sd-client','Mr Test');
 const rows=await p.$$('#sd-lines .sd-line');await (await rows[0].$('.sd-ld')).fill('Labour');await (await rows[0].$('.sd-la')).fill('100');
 await p.click('#sd-sent');await p.waitForTimeout(400);await p.click('.sd-row');await p.waitForTimeout(300);
 await p.click('#sd-pdf');await p.waitForTimeout(2000);
 ok(!(await p.$('.dimask'))&&(await p.evaluate(()=>(window.__dl||[]).length))===n0+2,'invoice PDF: no asking, made on the letterhead');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h461: ${bad} failed`:'h461: all passed');await b.close();process.exit(bad?1:0);
})();
