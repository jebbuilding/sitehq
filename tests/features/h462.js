// Letterhead as it looks: Setup › My letterhead takes a picture or a PDF of a (made-up) letterhead – a block at the
// top with a line under it, a line and foot lines at the bottom – finds the top and bottom, keeps them as pictures
// and shows them; the sample page, invoices and receipts print them; a Word letterhead brought in afterwards
// replaces them (and says the layout won't be exact).
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
 XL.CFB.utils.cfb_add(z,'/word/document.xml',Buffer.from('<?xml version="1.0"?><w:document xmlns:w="w" xmlns:r="r"><w:body>'+W('')+'<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/></w:sectPr></w:body></w:document>'));
 XL.CFB.utils.cfb_add(z,'/word/_rels/document.xml.rels',Buffer.from('<?xml version="1.0"?><Relationships><Relationship Id="rIdH" Type="h" Target="header1.xml"/></Relationships>'));
 XL.CFB.utils.cfb_add(z,'/word/header1.xml',Buffer.from('<w:hdr>'+['Test Builders Ltd','1 Test Street'].map(W).join('')+'</w:hdr>'));
 fs.writeFileSync('h462-lh.docx',XL.CFB.write(z,{fileType:'zip',type:'buffer'}));}
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('xlsx'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('xlsxpkg/package/dist/xlsx.full.min.js','utf8')});if(u.includes('pdf.worker.min'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('pdfjspkg/package/build/pdf.worker.min.js','utf8')});if(u.includes('pdf.min.js'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('pdfjspkg/package/build/pdf.min.js','utf8')});if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const lastToast=()=>p.evaluate(()=>{const t=window.__toasts||[];return t.length?t[t.length-1]:''});
 const set=()=>p.evaluate(()=>window.__st['todos/salesset']||{});
 const dl=()=>p.evaluate(()=>(window.__dl||[]).map(r=>[r.filename,r.data.size]));
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__toasts=[];new MutationObserver(()=>document.querySelectorAll('.toast').forEach(t=>{const x=t.textContent;if(x&&window.__toasts[window.__toasts.length-1]!==x)window.__toasts.push(x)})).observe(document.body,{childList:true,subtree:true,characterData:true});});
 if(await p.$('#nl-tog')){await p.click('#nl-tog');await p.waitForTimeout(300);await p.evaluate(()=>{const t=document.querySelector('#nl-tog');if(t)t.style.display='none'});}
 await p.evaluate(()=>document.querySelector('.tab[data-t=setup]').click());await p.waitForTimeout(400);
 ok(/PDF of your letterhead/.test(await p.innerText('.lh-card'))&&/\.pdf/.test(await p.$eval('.lh-card .lh-file',i=>i.accept)),'the card asks for a PDF (or picture, or Word) of the letterhead');
 /* a made-up letterhead as a picture, A4 shaped: a block and a line at the top (to 50 mm), a line and words at the foot (from 272 mm) */
 const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=1240;c.height=1754;const x=c.getContext('2d');const mm=1754/297;
  x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#8a1c22';x.fillRect(60,12*mm,300,25*mm);
  x.fillStyle='#777';x.font='40px sans-serif';x.textAlign='right';['Test Builders Ltd','1 Test Street','Exeter'].forEach((t,i)=>x.fillText(t,1180,(18+i*8)*mm));
  x.fillStyle='#8a1c22';x.fillRect(50,46*mm,1140,6);x.fillRect(50,272*mm,1140,6);
  x.fillStyle='#777';x.textAlign='center';x.fillText('Builds | Extensions | Repairs',620,280*mm);
  return c.toDataURL('image/png').split(',')[1];});
 await p.setInputFiles('.lh-card .lh-file',{name:'letterhead.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await p.waitForTimeout(5000);
 ok(/Letterhead saved – it will print exactly like this/.test(await lastToast()),await lastToast());
 let s=await set();
 ok(s.lhTop&&s.lhTop.id&&s.lhTop.h>45&&s.lhTop.h<52,'the top is kept down to its line (about 48 mm): '+JSON.stringify(s.lhTop));
 ok(s.logoId&&s.logoId!==s.lhTop.id,'its logo is picked out, for the other PDFs');
 const lg=await p.evaluate(async id=>{const b=window.__blobs[id];const im=await createImageBitmap(b);return [im.width,im.height]},s.logoId);
 ok(lg[0]>395&&lg[0]<430&&lg[1]>195&&lg[1]<225,'the logo is just the block on the left (400 × 197 at print size, with a little margin): '+lg.join(' × '));
 ok(s.lhBot&&s.lhBot.id&&s.lhBot.y>266&&s.lhBot.y<272&&s.lhBot.y+s.lhBot.h>296,'the bottom from its line to the foot of the page: '+JSON.stringify(s.lhBot));
 ok(await p.isVisible('.lh-card .lh-ptop')&&await p.isVisible('.lh-card .lh-pbot')&&/Kept exactly as your letterhead looks/.test(await p.innerText('.lh-card')),'the card shows the top and bottom as they look');
 ok((await p.$eval('.lh-card .lh-ptop',i=>i.naturalWidth))>1000,'the top picture shows');
 await p.locator('.lh-card').screenshot({path:'h462-card.png'});
 await p.click('#lh-pdf');await p.waitForTimeout(2500);
 let d=await dl();ok(d.length&&d[d.length-1][0]==='Letterhead sample.pdf'&&d[d.length-1][1]>10000,'a sample page on it (with the pictures): '+JSON.stringify(d[d.length-1]));
 /* the same letterhead as a PDF */
 const pdf=await p.evaluate(async()=>{const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:'mm',format:'a4'});doc.setFillColor(138,28,34);doc.rect(10,12,50,25,'F');doc.setFontSize(10);doc.setTextColor(120,120,120);doc.text('Test Builders Ltd',200,18,{align:'right'});doc.setDrawColor(138,28,34);doc.setLineWidth(0.8);doc.line(8,40,202,40);doc.line(8,275,202,275);doc.text('Builds | Extensions | Repairs',105,282,{align:'center'});const u=new Uint8Array(doc.output('arraybuffer'));let s='';u.forEach(x=>s+=String.fromCharCode(x));return btoa(s);});
 await p.setInputFiles('.lh-card .lh-file',{name:'Letterhead.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf,'base64')});await p.waitForTimeout(6000);
 s=await set();
 ok(/it will print exactly/.test(await lastToast())&&s.lhTop.h>39&&s.lhTop.h<45&&s.lhBot.y>270&&s.lhBot.y<275,'a PDF letterhead: top to its line at 40 mm, bottom from 275 mm: '+JSON.stringify([s.lhTop.h,s.lhBot.y]));
 /* an invoice and its payment receipt print it */
 await p.evaluate(()=>document.querySelector('.tab[data-t=sales]').click());await p.waitForTimeout(300);
 await p.click('#sd-new');await p.waitForTimeout(300);await p.fill('#sd-client','Mr Test');
 const rows=await p.$$('#sd-lines .sd-line');await (await rows[0].$('.sd-ld')).fill('Labour');await (await rows[0].$('.sd-la')).fill('100');
 await p.click('#sd-sent');await p.waitForTimeout(400);await p.click('.sd-row');await p.waitForTimeout(300);
 const n0=(await dl()).length;
 await p.click('#sd-pdf');await p.waitForTimeout(2500);
 d=await dl();ok(d.length===n0+1&&/^Invoice/.test(d[d.length-1][0])&&!(await p.$('.dimask')),'invoice PDF made on it, no asking: '+JSON.stringify(d[d.length-1]));
 /* a Word letterhead afterwards replaces the pictures, and says it won't be exact */
 await p.evaluate(()=>document.querySelector('.tab[data-t=setup]').click());await p.waitForTimeout(400);
 await p.setInputFiles('.lh-card .lh-file','h462-lh.docx');await p.waitForTimeout(2500);
 s=await set();
 ok(!s.lhTop&&/Test Builders Ltd/.test(s.head||''),'a Word letterhead replaces the pictures');
 ok(/fonts and spacing won't match exactly/.test(await p.innerText('.lh-card'))&&await p.isVisible('#lh-edit'),'and the card says a PDF gives an exact copy');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h462: ${bad} failed`:'h462: all passed');await b.close();process.exit(bad?1:0);
})();
