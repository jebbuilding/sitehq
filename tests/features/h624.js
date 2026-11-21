// Terms as uploaded (a made-up two-page terms PDF). Letterhead, terms & bank takes a terms PDF; an estimate's PDF then
// ends with those pages exactly as they are (2 more pages); choosing ✏️ The typed terms on one estimate uses the typed
// terms instead. Writes h624*.pdf.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
/* uploaded files are kept in the page so they can be read back (the test backend has no file server) */
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const FETCH='  const r = await fetch(blobUrl(id));';
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null')&&page_src.includes(FETCH),'test hooks found');
page_src=page_src.split(FETCH).join('  if (window.__blobs && window.__blobs[id]) return window.__blobs[id];\n'+FETCH);
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
const JSPDF=fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1150,height:1000}});ctx.setDefaultTimeout(15000);
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();
   if(u.includes('pdf.worker.min'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('pdfjspkg/package/build/pdf.worker.min.js','utf8')});
   if(u.includes('pdf.min'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('pdfjspkg/package/build/pdf.min.js','utf8')});
   if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:JSPDF});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.addScriptTag({content:JSPDF});
 const tb64=await p.evaluate(()=>{const d=new window.jspdf.jsPDF();d.setFontSize(18);d.text('MY OWN TERMS - page 1',20,30);d.addPage();d.text('MY OWN TERMS - page 2',20,30);return d.output('datauristring').split(',')[1]});
 /* Setup › 📜 My terms and conditions: a set of terms as a PDF */
 await p.evaluate(()=>{const S=window.__S;S.otab='setup';S.f.stab='setup';window.render()});await p.waitForTimeout(500);
 ok(await p.locator('#main .tms-card').count()===1&&await p.locator('#main .lh-card + .tms-card').count()===1,'Setup has 📜 My terms and conditions, right under the letterhead');
 await p.click('#tms-add');await p.waitForTimeout(400);
 await p.fill('#tme-nm','Standard terms');
 await p.setInputFiles('#tme-pdf',{name:'Our terms.pdf',mimeType:'application/pdf',buffer:Buffer.from(tb64,'base64')});
 await p.click('#f-save');await p.waitForTimeout(2500);
 ok(await p.evaluate(()=>{const s=window.__st['todos/salesset']||{};return !!s.termsPdfId&&s.termsPdfName==='Our terms.pdf'&&(s.termSets||[]).length===1}),'the terms PDF is kept as the standard terms');
 ok(await p.evaluate(()=>Object.entries(window.__st).some(([k,v])=>k.startsWith('docs/terms-')&&v&&v.folder==='Terms and conditions'&&v.assetId)),'and it is in Policies › Terms and conditions');
 /* a second, typed set */
 await p.click('#tms-add');await p.waitForTimeout(400);
 await p.fill('#tme-nm','Small works');await p.fill('#tme-tx','# Small works terms\nPay on completion.');
 await p.click('#f-save');await p.waitForTimeout(2500);
 ok(await p.locator('#main .tms-row').count()===2,'two sets of terms listed');
 ok(await p.evaluate(()=>Object.values(window.__st).some(v=>v&&v.folder==='Terms and conditions'&&v.title==='Small works'&&v.assetId)),'the typed set is made into a PDF in Policies too');
 await p.screenshot({path:'h624-setup.png'});
 const pages=async(typed,setName)=>{
  await p.evaluate(()=>{const v=document.getElementById('viewer');if(v&&!v.hidden)document.getElementById('viewer-close').click();const S=window.__S;S.otab='clients';S.f.clf='all';window.render()});await p.waitForTimeout(400);
  await p.click('.abcard .cl-open[data-c=c1]');await p.waitForTimeout(500);await p.click('#cv-jf');await p.waitForTimeout(500);await p.click('#jf-newest');await p.waitForTimeout(700);
  await p.fill('#sd-lines .sd-line .sd-la','1000').catch(()=>{});
  if(typed){await p.click('.sd-tdet summary');await p.click('#sd-tuse button[data-v="typed"]');}
  if(setName){await p.click('.sd-tdet summary');await p.selectOption('#sd-tset',{label:setName});await p.waitForTimeout(200);ok(/Small works terms/.test(await p.inputValue('#sd-terms')),'picking Small works puts its terms in the box');}
  await p.evaluate(()=>{window.__pdf=null;window.__S.dl.save=async x=>{window.__pdf=x;return null}});
  await p.click('#sd-pdf');await p.waitForTimeout(800);if(await p.isVisible('.sd-lhno'))await p.click('.sd-lhno');
  await p.waitForFunction(()=>window.__pdf,null,{timeout:30000});
  const b64=await p.evaluate(async()=>{const d=window.__pdf.data;const bl=d instanceof Blob?d:new Blob([d]);const buf=new Uint8Array(await bl.arrayBuffer());let s='';for(let i=0;i<buf.length;i++)s+=String.fromCharCode(buf[i]);return btoa(s)});
  fs.writeFileSync(setName?'h624-small.pdf':typed?'h624-typed.pdf':'h624-terms.pdf',Buffer.from(b64,'base64'));
  return (Buffer.from(b64,'base64').toString('latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length;
 };
 const withPdf=await pages(false);
 const typed=await pages(true);
 const small=await pages(false,'Small works');
 ok(small>=1&&small<withPdf,'an estimate on the Small works terms has no PDF terms pages ('+small+' pages)');
 ok(withPdf>=3,'the estimate PDF ends with the 2 uploaded terms pages ('+withPdf+' pages)');
 ok(typed>=1&&typed!==withPdf,'choosing the typed terms on one estimate uses those instead ('+typed+' pages)');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h624: ${bad} failed`:'h624: all passed');await b.close();process.exit(bad?1:0);
})();
