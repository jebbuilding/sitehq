// Estimate files: on the estimate screen, add several files at once (quotes, photos, drawings, spreadsheets), say what
// they are, see them with a picture or icon, change a file's name / folder / company / price / note, compare quote
// prices against the estimate, add a quote to the estimate as a line with a mark-up, delete a file (to Deleted items,
// and put it back from there), and the same files in the 📁 Job file. Synthetic data only.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+'store["todos/salesset"]={kind:"salesset",head:"Test Builders Ltd, 1 Test Street"};');
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {').replace('\nfunction binView(','\nwindow.binView=binView;function binView(').replace('\nfunction closeViewer(','\nwindow.closeViewer=closeViewer;function closeViewer(');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:820,height:1100}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const jobFile=()=>p.evaluate(()=>{const e=Object.entries(window.__st).find(([k,v])=>v&&v.kind==='jobfile');return e?Object.assign({id:e[0]},e[1]):null});
 const sale=()=>p.evaluate(()=>{const e=Object.entries(window.__st).find(([k,v])=>v&&v.kind==='sale'&&v.type==='estimate');return e?Object.assign({id:e[0]},e[1]):null});
 const more=async(name)=>{await p.locator('.esf-item',{hasText:name}).first().locator('.esf-more').click();await p.waitForTimeout(300);};
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
  if(await p.isVisible('#nl-tog'))await p.click('#nl-tog');await p.waitForTimeout(300);
  await p.evaluate(()=>{window.__S.otab='sales';window.render()});await p.waitForTimeout(300);await p.click('#sd-tabs button[data-v=est]');await p.waitForTimeout(200);
  await p.click('#sd-new');await p.waitForTimeout(400);
  ok(await p.isVisible('#esf-box'),'the estimate has a Quotes, drawings & files section');
  ok(/none yet/.test(await p.innerText('#esf-box')),'it starts empty');
  const pickers=await p.$$eval('#esf-box input[type=file]',L=>L.map(x=>({cls:x.className,multi:x.multiple,hidden:x.hidden,disp:getComputedStyle(x).display,op:getComputedStyle(x).opacity})));
  ok(pickers.length===2&&pickers.every(x=>/fpick/.test(x.cls)&&!x.hidden&&x.disp!=='none'&&x.op==='0')&&pickers[0].multi,'file pickers are see-through overlays (iPad-safe), Add files takes several at once');
  const tall=await p.$$eval('#esf-box .esf-pick',L=>L.every(x=>x.getBoundingClientRect().height>=44));ok(tall,'add buttons are at least 44px tall');
  await p.fill('#sd-client','Mr Test Client');await p.fill('#sd-title','Garage conversion');
  const r0=(await p.$$('#sd-lines .sd-line'))[0];await (await r0.$('.sd-ld')).fill('Convert garage to a room');await (await r0.$('.sd-la')).fill('8000');
  /* several at once, as supplier quotes */
  await p.selectOption('#esf-fold','supq');
  await p.setInputFiles('.esf-file',[{name:'clip_sheet.pdf',mimeType:'application/pdf',buffer:fs.readFileSync('fixtures/clip_sheet.pdf')},{name:'test.jpg',mimeType:'image/jpeg',buffer:fs.readFileSync('fixtures/test.jpg')},{name:'Prices.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from('PK test sheet')}]);
  await p.waitForTimeout(1500);
  ok(/Added 3 to Supplier quotes/.test(await lastToast()),'three files added in one go: '+await lastToast());
  let est=await sale();ok(est&&est.client==='Mr Test Client','the estimate was saved first, so the files belong to it');
  let jf=await jobFile();ok(jf&&jf.id.startsWith('todos/jf-')&&jf.items.length===3&&jf.estId===est.id.replace('todos/',''),'kept in an owner-only job file record tied to the estimate');
  ok(await p.locator('#esf-box .esf-item').count()===3,'all three listed');
  ok(await p.locator('#esf-box .esf-item img').count()===1,'the photo shows as a picture');
  const ics=await p.$$eval('#esf-box .jf-ic',L=>L.map(x=>x.textContent).join(''));ok(/📕/.test(ics)&&/📗/.test(ics),'the PDF and the spreadsheet show their icons ('+ics+')');
  ok(await p.evaluate(()=>{const j=Object.values(window.__st).find(v=>v&&v.kind==="jobfile");const x=j.items.find(i=>i.name==="Prices.xlsx");return x&&x.assetId.startsWith("w~")&&/spreadsheetml/.test(x.type)}),"a spreadsheet (which the file store will not take) is kept in the app database in pieces, like Word files");
  /* a drawing, in Plans & drawings */
  await p.selectOption('#esf-fold','plans');
  await p.setInputFiles(".esf-file",[{name:"Plan rev B.dxf",mimeType:"",buffer:Buffer.from("0\nSECTION\n2\nENTITIES\n0\nENDSEC\n0\nEOF\n")},{name:"Engineer email.eml",mimeType:"message/rfc822",buffer:Buffer.from("From: eng@example.com\nSubject: Beam sizes\n\nUse 203x133x25 UB.")}]);await p.waitForTimeout(1000);console.log("  toasts:",await p.evaluate(()=>[...document.querySelectorAll(".toast")].map(t=>t.textContent).join(" / ")),(await jobFile()).items.map(i=>i.name+"="+i.type).join(", "));
  ok(/📐/.test(await p.locator(".esf-item",{hasText:"Plan rev B.dxf"}).innerText())&&/✉️/.test(await p.locator(".esf-item",{hasText:"Engineer email.eml"}).innerText()),"a DXF drawing and a saved email go in with their own icons");
  ok((await jobFile()).items.length===5,"five files in the job file");
  /* rename, re-tag, company, price, note */
  await more('clip_sheet.pdf');
  ok(await p.isVisible('#esf-o')&&await p.isVisible('#esf-dl')&&await p.isVisible('#esf-send'),'a file can be opened, saved as a copy and sent');
  ok(!(await p.isVisible('#esf-line')),'no "add to the estimate" until it has a price');
  await p.fill('#esf-n','Roof quote.pdf');await p.selectOption('#esf-f','subq');await p.fill('#esf-fr','Coastal Roofing Ltd');await p.fill('#esf-p','2400');await p.fill('#esf-no','Flat roof, GRP');
  await p.click('#f-save');await p.waitForTimeout(500);
  let bt=await p.innerText('#esf-box');
  ok(/Subcontractor quotes/.test(bt)&&/Roof quote\.pdf/.test(bt)&&/Coastal Roofing Ltd · Flat roof, GRP · £2,400\.00/.test(bt),'renamed, moved to Subcontractor quotes, company, note and price shown');
  ok(/Total of the quotes\s*£2,400\.00/.test(bt)&&/This estimate \(before VAT\)\s*£8,000\.00/.test(bt)&&/Left for your labour and profit\s*£5,600\.00 \(70%\)/.test(bt),'quote prices compared against the estimate');
  /* the photo of a paper quote, from another company */
  await more('test.jpg');await p.fill('#esf-n','Paper quote photo');await p.fill('#esf-fr','Devon Scaffold Co');await p.fill('#esf-p','650');await p.click('#f-save');await p.waitForTimeout(500);
  ok(/Total of the quotes\s*£3,050\.00/.test(await p.innerText('#esf-box')),'two quotes added up');
  /* pull a quote into the estimate's prices */
  await more('Roof quote');await p.click('#esf-line');await p.waitForTimeout(300);
  ok(await p.inputValue('#esf-ld')==='Coastal Roofing Ltd – Flat roof, GRP'&&await p.inputValue('#esf-lk')==='lab','the line starts with the company and note, as labour (a subcontractor)');
  await p.fill('#esf-lmu','10');ok((await p.innerText('#esf-la'))==='£2,640.00','10% added on: £2,640.00');
  await p.click('#f-save');await p.waitForTimeout(400);
  const lines=await p.$$eval('#sd-lines .sd-line',L=>L.map(r=>[r.querySelector('.sd-ld').value,r.querySelector('.sd-la').value]));
  ok(lines.length===2&&lines[1][0]==='Coastal Roofing Ltd – Flat roof, GRP'&&+lines[1][1]===2640,'the quote is a new line on the estimate: '+JSON.stringify(lines));
  ok(/✓ on the estimate/.test(await p.innerText('#esf-box')),'the file shows it is on the estimate');
  ok(/This estimate \(before VAT\)\s*£10,640\.00/.test(await p.innerText('#esf-box')),'the comparison uses the new total');
  await p.$eval('#esf-box',e=>e.scrollIntoView({block:'center'}));await p.waitForTimeout(200);await p.locator('#esf-box').screenshot({path:'h600-files.png'});
  await p.click('#sd-save');await p.waitForTimeout(500);
  est=await sale();ok(est.lines.some(l=>+l.a===2640&&/Coastal Roofing/.test(l.d)),'saved on the estimate');
  /* delete goes to Deleted items, and back */
  await p.locator('.sd-row',{hasText:'Mr Test Client'}).first().click();await p.waitForTimeout(400);
  ok(await p.locator('#esf-box .esf-item').count()===5,'the files are there when the estimate is opened again');
  await more('Plan rev B');await p.click('#f-del');await p.waitForTimeout(300);
  ok(/Deleted items/.test(await p.innerText('.dimbox')),'delete asks first and says it goes to Deleted items');
  await p.click('.bf-yes');await p.waitForTimeout(800);
  jf=await jobFile();ok(jf.items.length===4&&!jf.items.some(x=>/Plan rev B/.test(x.name)),'the drawing is out of the job file');
  const bin=await p.evaluate(()=>Object.values(window.__st).find(v=>v&&v.kind==='bin'&&/Plan rev B/.test(v.title)));
  ok(bin&&bin.refs.some(r=>r.t==='jfitem')&&/Job file/.test(bin.sub),'it is in Deleted items, remembering it came from the job file');
  ok(await p.locator('#esf-box .esf-item').count()===4,'and off the list');
  await p.click('#sd-close');await p.waitForTimeout(300);
  await p.evaluate(()=>binView());await p.waitForTimeout(400);
  await p.locator('.attrow',{hasText:'Plan rev B'}).locator('.bn-res').click();await p.waitForTimeout(800);
  jf=await jobFile();ok(jf.items.length===5&&jf.items.some(x=>/Plan rev B/.test(x.name)),'put back from Deleted items, it is in the job file again');
  /* the same files in the job file */
  await p.evaluate(()=>closeViewer());await p.waitForTimeout(200);
  await p.evaluate(()=>{window.__S.otab='sales';window.render()});await p.waitForTimeout(300);await p.click('#sd-tabs button[data-v=est]');await p.waitForTimeout(200);
  await p.locator('.sd-row',{hasText:'Mr Test Client'}).first().click();await p.waitForTimeout(400);
  ok(await p.locator('#esf-box .esf-item').count()===5,'back on the estimate too');
  await p.click('#esf-jf');await p.waitForTimeout(400);
  const jt=await p.innerText('.jf-page');ok(/Roof quote\.pdf/.test(jt)&&/Plan rev B\.dxf/.test(jt)&&/Prices\.xlsx/.test(jt),'the whole job file shows the same files');
  /* deleting from the job file also goes to Deleted items now */
  await p.locator('.jf-item[data-id]',{hasText:'Prices.xlsx'}).locator('.jf-edit').click();await p.waitForTimeout(300);await p.click('#f-del');await p.waitForTimeout(300);await p.click('.bf-yes');await p.waitForTimeout(800);
  jf=await jobFile();ok(jf.items.length===4&&await p.evaluate(()=>Object.values(window.__st).some(v=>v&&v.kind==='bin'&&v.title==='Prices.xlsx')),'deleting in the job file goes to Deleted items too');
  ok(!(await p.locator('.jf-page',{hasText:'Prices.xlsx'}).count()),'and the job file page is redrawn without it');
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0]);bad++}
 console.log(bad?'FAILED '+bad:'ALL OK');
 await b.close()})();
