// No letterhead yet: making an invoice PDF (or emailing it) first says the letterhead isn't in the app, and offers to
// bring in the Word letterhead there and then. "Make it without" still makes the PDF; Cancel stops; bringing in a
// (made-up) Word letterhead saves its lines, foot line and VAT number and the PDF is made on it; after that no box.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
/* a made-up Word letterhead: lines in the page header, trades line and VAT number in the footer */
const XL=require('../xlsxpkg/package/xlsx.js');
{const W=t=>'<w:p><w:r><w:t xml:space="preserve">'+t+'</w:t></w:r></w:p>';
 const z=XL.CFB.utils.cfb_new();
 XL.CFB.utils.cfb_add(z,'/word/document.xml',Buffer.from('<?xml version="1.0"?><w:document xmlns:w="w" xmlns:r="r"><w:body>'+W('')+'<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/><w:footerReference w:type="default" r:id="rIdF"/></w:sectPr></w:body></w:document>'));
 XL.CFB.utils.cfb_add(z,'/word/_rels/document.xml.rels',Buffer.from('<?xml version="1.0"?><Relationships><Relationship Id="rIdH" Type="h" Target="header1.xml"/><Relationship Id="rIdF" Type="f" Target="footer1.xml"/></Relationships>'));
 XL.CFB.utils.cfb_add(z,'/word/header1.xml',Buffer.from('<w:hdr>'+['Test Builders Ltd','1 Test Street','Exeter','','01234 567890'].map(W).join('')+'</w:hdr>'));
 XL.CFB.utils.cfb_add(z,'/word/footer1.xml',Buffer.from('<w:ftr>'+W('Builds | Extensions | Repairs')+W('VAT Number 123456789')+'</w:ftr>'));
 fs.writeFileSync('h460-lh.docx',XL.CFB.write(z,{fileType:'zip',type:'buffer'}));}
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('xlsx'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('xlsxpkg/package/dist/xlsx.full.min.js','utf8')});if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const dls=()=>p.evaluate(()=>(window.__dl||[]).length);
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 if(await p.$('#nl-tog')){await p.click('#nl-tog');await p.waitForTimeout(300);await p.evaluate(()=>{const t=document.querySelector('#nl-tog');if(t)t.style.display='none'});}
 await p.evaluate(()=>document.querySelector('.tab[data-t=sales]').click());await p.waitForTimeout(300);
 /* a quick invoice */
 await p.click('#sd-new');await p.waitForTimeout(300);
 await p.fill('#sd-client','Mr Test');await p.fill('#sd-title','Repairs');
 const rows=await p.$$('#sd-lines .sd-line');await (await rows[0].$('.sd-ld')).fill('Labour');await (await rows[0].$('.sd-la')).fill('100');
 await p.click('#sd-sent');await p.waitForTimeout(500);
 await p.click('.sd-row');await p.waitForTimeout(300);
 /* no letterhead: the box */
 await p.click('#sd-pdf');await p.waitForTimeout(300);
 await p.screenshot({path:'h460-box.png'});
 ok(await p.isVisible('.dimbox')&&/Your letterhead isn't in the app yet/.test(await p.innerText('.dimbox')),'PDF: says the letterhead is not in the app yet');
 ok(await p.isVisible('.dimbox .sd-filebtn')&&(await p.$eval('.dimbox .sd-lhask',i=>getComputedStyle(i).display))!=='none','offers to bring it in (a file picker that is not hidden, for the iPad)');
 const n0=await dls();
 await p.click('.dimbox .sax');await p.waitForTimeout(500);
 ok(await dls()===n0&&!(await p.$('.dimask')),'Cancel: no PDF made');
 await p.click('#sd-pdf');await p.waitForTimeout(300);
 await p.click('.dimbox .sd-lhno');await p.waitForTimeout(2000);
 ok(await dls()===n0+1,'Make it without: the PDF is still made');
 await p.click('#sd-pdf');await p.waitForTimeout(300);
 ok(await p.isVisible('.dimbox'),'asks again next time while there is still no letterhead');
 await p.setInputFiles('.dimbox .sd-lhask','h460-lh.docx');await p.waitForTimeout(2500);
 const set=await p.evaluate(()=>window.__st['todos/salesset']);
 ok(set&&/Test Builders Ltd\n1 Test Street/.test(set.head)&&set.vatNo==='123456789'&&/Repairs/.test(set.tagline),'brought in from the box: address lines, foot line, VAT number');
 ok(await dls()===n0+2&&!(await p.$('.dimask')),'and the PDF is made on it');
 await p.click('#sd-pdf');await p.waitForTimeout(2000);
 ok(!(await p.$('.dimask'))&&await dls()===n0+3,'with a letterhead: no box, straight to the PDF');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h460: ${bad} failed`:'h460: all passed');await b.close();process.exit(bad?1:0);
})();
