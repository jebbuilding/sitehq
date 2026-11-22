// ✏️ Draw on it (made-up drawing): a PDF opened in the document viewer has ✏️ Draw on it; it opens the page in the
// mark-up tools (above the viewer); drawing and Next saves a new picture and – for the account holder – opens
// 📤 Send to…; a trade picks the site and it goes in with their photos. The original file isn't changed.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {').replace(DD,'function detailsDone(d){return true}').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;').replace('async function openFile(id, name, type) {','window.openFile=openFile;async function openFile(id, name, type) {');
const PDF=fs.readFileSync('fixtures/clip_sheet.pdf').toString('base64');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();
 try{
 for(const owner of [true,false]){
 const ctx=await b.newContext({viewport:{width:1100,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('xlsx'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('xlsxpkg/package/dist/xlsx.full.min.js','utf8')});if(u.includes('pdf.worker.min'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('pdfjspkg/package/build/pdf.worker.min.js','utf8')});if(u.includes('pdf.min.js'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('pdfjspkg/package/build/pdf.min.js','utf8')});if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(owner)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 const who=owner?'owner':'trade';
 await p.evaluate(async b64=>{const by=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));window.__blobs.pdf1=new Blob([by],{type:'application/pdf'});window.openFile('pdf1','Ground floor plan.pdf','application/pdf')},PDF);await p.waitForTimeout(3000);
 ok(await p.isVisible('#fv-draw'),who+': the viewer has ✏️ Draw on it');
 await p.click('#fv-draw');await p.waitForTimeout(2500);
 ok(await p.isVisible('#markup #mk-cv')&&/Ground floor plan/.test(await p.innerText('#markup .mk-top')),who+': it opens the drawing in the mark-up tools');
 const cv=await p.locator('#mk-cv').boundingBox();
 await p.mouse.move(cv.x+cv.width*0.3,cv.y+cv.height*0.3);await p.mouse.down();for(let i=1;i<=10;i++){await p.mouse.move(cv.x+cv.width*(0.3+i*0.03),cv.y+cv.height*(0.3+i*0.02));await p.waitForTimeout(15);}await p.mouse.up();await p.waitForTimeout(300);
 if(owner)await p.screenshot({path:'h649-draw.png'});
 const n0=await p.evaluate(()=>Object.keys(window.__blobs).length);
 await p.click('#mk-done');await p.waitForTimeout(1500);
 if(owner){
  ok(/Send/.test(await p.innerText('#sheettitle'))&&/marked up/.test(await p.innerText('#sheettitle')),'owner: Next opens 📤 Send to… for the marked-up page ('+(await p.innerText('#sheettitle'))+')');
  ok(await p.evaluate(()=>Object.keys(window.__blobs).length)===n0+1,'owner: the marked-up page is saved as a new picture');
  ok(await p.evaluate(()=>window.__blobs.pdf1.type==='application/pdf'&&Object.keys(window.__blobs).length===2),'owner: the original PDF isn\'t changed');
 } else {
  ok(/Save your mark-up/.test(await p.innerText('#sheettitle')),'trade: Next asks which site');
  await p.click('#f-save');await p.waitForTimeout(2000);
  const ph=await p.evaluate(()=>Object.entries(window.__st).filter(([k,v])=>/^sheets\/emp1\/photos\//.test(k)&&v.markup));
  ok(ph.length===1&&/Ground floor plan/.test(ph[0][1].caption)&&ph[0][1].assetId,'trade: it goes in with their photos for the site ('+(ph[0]&&ph[0][1].caption)+')');
 }
 await ctx.close();
 }
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h649: ${bad} failed`:'h649: all passed');await b.close();process.exit(bad?1:0);
})();
