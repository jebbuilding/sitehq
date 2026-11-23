// A client's document drawn on and put on a sketch page (made-up client Sue Jones and drawing): opened from her page, the
// PDF has ✏️ Draw on it and 📝 Put on a sketch page. Drawing on it and Next saves the marked-up copy in her 📷 Photos &
// sketches (not Send to…). 📝 Put on a sketch page opens the page on a drawing page (pen, text, measurements); saving it
// puts the page in her Photos & sketches too. A file opened from elsewhere doesn't have 📝 Put on a sketch page.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+'store["todos/c1"].docs=[{assetId:"pdf1",name:"Ground floor plan.pdf",type:"application/pdf",at:1}];');
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {').replace(DD,'function detailsDone(d){return true}').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;').replace('async function openFile(id, name, type) {','window.openFile=openFile;async function openFile(id, name, type) {');
const PDF=fs.readFileSync('fixtures/clip_sheet.pdf').toString('base64');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1100,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('xlsx'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('xlsxpkg/package/dist/xlsx.full.min.js','utf8')});if(u.includes('pdf.worker.min'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('pdfjspkg/package/build/pdf.worker.min.js','utf8')});if(u.includes('pdf.min.js'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('pdfjspkg/package/build/pdf.min.js','utf8')});if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src.replace('function render() {','window.__T=()=>({viewClient});function render() {')+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 await p.evaluate(async b64=>{const by=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));window.__blobs.pdf1=new Blob([by],{type:'application/pdf'});},PDF);
 /* from elsewhere: no sketch page button */
 await p.evaluate(()=>window.openFile('pdf1','Ground floor plan.pdf','application/pdf'));await p.waitForTimeout(2500);
 ok(await p.isVisible('#fv-draw')&&!(await p.isVisible('#fv-page')),'opened from elsewhere: ✏️ Draw on it, but no 📝 Put on a sketch page');
 await p.click('#fv-close');await p.waitForTimeout(400);
 const openDoc=async()=>{await p.evaluate(()=>{const S=window.__S;window.__T().viewClient(S.clients.find(c=>c.id==='c1'))});await p.waitForTimeout(700);
  await p.locator('.cd-open').first().scrollIntoViewIfNeeded();await p.click('.cd-open');await p.waitForTimeout(3000);};
 await openDoc();
 ok(await p.isVisible('#fv-draw')&&await p.isVisible('#fv-page'),'opened from Sue\'s page: ✏️ Draw on it and 📝 Put on a sketch page');
 await p.click('#fv-draw');await p.waitForTimeout(2500);
 const cv=await p.locator('#mk-cv').boundingBox();
 await p.mouse.move(cv.x+cv.width*0.3,cv.y+cv.height*0.3);await p.mouse.down();for(let i=1;i<=10;i++){await p.mouse.move(cv.x+cv.width*(0.3+i*0.03),cv.y+cv.height*(0.3+i*0.02));await p.waitForTimeout(15);}await p.mouse.up();await p.waitForTimeout(300);
 await p.click('#mk-done');await p.waitForTimeout(1800);
 let m=await p.evaluate(()=>window.__st['todos/c1'].media||[]);
 ok(m.some(x=>x.kind==='photo'&&x.marked&&/Ground floor plan/.test(x.note)),'Next saves the marked-up copy in her Photos & sketches');
 ok(!(await p.isVisible('#sheettitle'))||!/Send/.test(await p.innerText('#sheettitle').catch(()=>'')),'(not Send to…)');
 ok(await p.evaluate(()=>window.__blobs.pdf1.type==='application/pdf'),'the original PDF isn\'t changed');
 await openDoc();
 await p.click('#fv-page');await p.waitForTimeout(3000);
 ok(await p.isVisible('.np-save'),'📝 Put on a sketch page opens a drawing page');
 await p.screenshot({path:'h661-page.png'});
 await p.click('.np-save');await p.waitForTimeout(2500);
 m=await p.evaluate(()=>window.__st['todos/c1'].media||[]);
 ok(m.some(x=>x.kind==='page'&&x.from==='pdf1'&&x.src&&/Ground floor plan/.test(x.note)),'saving puts the page in her Photos & sketches');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h661: ${bad} failed`:'h661: all passed');await b.close();process.exit(bad?1:0);
})();
