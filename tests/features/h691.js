// Before & after (made-up client Sue Jones, 4 Rolle Road; made-up coloured squares as photos): 📸 Before & after on her
// job → + Add a pair, name it Kitchen, the before side lists the job's photos (one from the job is chosen), the after
// side is uploaded. They show side by side; Save keeps them on her record; 📄 Make the PDF puts both on it;
// 📤 Put it in their portal adds it to her 📷 Photos. Writes h691*.png / .pdf.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+'store["todos/c1"].portalUid="u9";');
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>(window.__last=b,window.__blobs["up"+c]=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null')&&page_src.includes('const blobUrl = (id) => "/_blob/" + id;'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;').replace('function render() {','window.render=render;window.__T=()=>({viewClient});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 await p.click('#nl-tog').catch(()=>{});await p.waitForTimeout(400);
 const mk=(col)=>p.evaluate((col)=>{const c=document.createElement('canvas');c.width=160;c.height=120;const g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,160,120);return c.toDataURL('image/jpeg').split(',')[1]},col);
 /* a photo already on the job, taken by Sam */
 const site=await p.evaluate(()=>window.__S.clients.find(c=>c.id==='c1').site);
 await p.evaluate(async([site,b64])=>{const S=window.__S;const bl=await (await fetch('data:image/jpeg;base64,'+b64)).blob();window.__blobs.jobph=bl;await S.db.doc('sheets/emp1/photos/ph1').set({site,assetId:'jobph',date:'2026-10-01',takenAt:1,caption:'Old kitchen'});},[site,await mk('#8a5a3a')]);
 await p.waitForTimeout(1500);await p.evaluate(()=>window.__T().viewClient(window.__S.clients.find(c=>c.id==='c1')));await p.waitForTimeout(700);
 ok(await p.isVisible('#cv-baf'),'Sue\'s job has 📸 Before & after');
 await p.click('#cv-baf');await p.waitForTimeout(400);
 await p.click('#baf-add');await p.waitForTimeout(300);
 await p.fill('.baf-cap','Kitchen');
 await p.click('.baf-slot[data-side=before]');await p.waitForTimeout(400);
 ok(await p.locator('.baf-ph').count()>=1,'the before side lists the job\'s photos');
 await p.click('.baf-ph[data-a=jobph]');await p.waitForTimeout(400);
 await p.click('.baf-slot[data-side=after]');await p.waitForTimeout(400);
 await p.setInputFiles('.baf-file',{name:'after.jpg',mimeType:'image/jpeg',buffer:Buffer.from(await mk('#e8e0d0'),'base64')});await p.waitForTimeout(1500);
 ok(await p.locator('.baf-slot img').count()===2&&await p.inputValue('.baf-cap')==='Kitchen','both sides filled, side by side, name kept');
 await p.screenshot({path:'h691-pair.png'});
 await p.click('#baf-pdf');await p.waitForTimeout(3000);
 const pdf=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];if(!d)return '';const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return d.filename+'\n'+s});
 fs.writeFileSync('h691-pdf.pdf',Buffer.from(pdf.slice(pdf.indexOf('\n')+1),'latin1'));
 ok(/^Before and after Sue Jones\.pdf/.test(pdf)&&/BEFORE/.test(pdf)&&/AFTER/.test(pdf)&&/Kitchen/.test(pdf)&&(pdf.match(/\/Subtype \/Image/g)||[]).length>=2,'📄 the PDF: Kitchen, before and after, both photos');
 await p.click('#baf-send');await p.waitForTimeout(3000);
 const doc=await p.evaluate(()=>Object.entries(window.__st).find(([k,v])=>/baf-c1/.test(k)));
 ok(doc&&doc[1].folder==='photos'&&doc[1].title==='Before & after','📤 it goes in her portal\'s Photos');
 await p.click('#f-save');await p.waitForTimeout(800);
 const rec=await p.evaluate(()=>window.__st['todos/c1']);
 ok(rec.beforeAfter.length===1&&rec.beforeAfter[0].before==='jobph'&&rec.beforeAfter[0].after&&rec.beforeAfter[0].cap==='Kitchen'&&rec.baSentAt,'saved on her record');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h691: ${bad} failed`:'h691: all passed');await b.close();process.exit(bad?1:0);
})();
