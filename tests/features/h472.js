// Sites › a site › 📔 Site diary (made-up job at 4 Rolle Road): the day writes itself from what's in the app – who
// signed in (timesheet and a visitor in the sign-in book), the work logged, the photos – James adds a note, it is
// saved, and the week becomes one PDF with all of it.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const SITE='4 Rolle Road, Exmouth';
const d0=new Date();const TODAY=d0.getFullYear()+'-'+String(d0.getMonth()+1).padStart(2,'0')+'-'+String(d0.getDate()).padStart(2,'0');
const extra='store["sheets/owner/photos/sd1"]={kind:"photo",assetId:"img1",caption:"Joists in",site:"'+SITE+'",takenAt:'+d0.getTime()+',date:"'+TODAY+'",weather:"Sunny, 12°C",mine:true,created:1};'+
 'store["sheets/owner/entries/sd2"]={type:"hours",date:"'+TODAY+'",job:"'+SITE+'",start:"08:00",finish:"16:30",hours:8.5,notes:"Fitted the loft floor joists",created:1};'+
 'store["sheets/owner/signins/sd3"]={date:"'+TODAY+'",site:"'+SITE+'",guest:{name:"Dave Testscaffold",company:"Test Scaffolding Ltd"},in:"09:00",out:"11:00",created:1};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const img=fs.readFileSync('fixtures/ld1.png').toString('base64');
const page_src=fs.readFileSync('timesheets.html','utf8')
  .replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>{if(!window.__blobs[id]&&id==="img1"){const b=atob(window.__IMG);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);window.__blobs.img1=new Blob([u],{type:"image/png"})}return window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id};')
  .replace('function render() {','window.render=render;function render() {').replace('const S = {\n  db: null','const S=window.__S={db:null');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message,String(e.stack||'').slice(0,300));bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body><script>window.__IMG="'+img+'";</script>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(s=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.__S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(600);
 ok(await p.locator('.pjtile[data-t=diary]').count()===1,'the site page has a Site diary tile');
 await p.click('.pjtile[data-t=diary]');await p.waitForTimeout(500);
 const t=await p.innerText('.sdi');console.log(t.slice(0,400).replace(/\n+/g,' | '));
 ok(/today/.test(t),'it opens on today');
 ok(/On site/.test(t)&&/Dave Testscaffold/.test(t)&&/09:00/.test(t),'who was on site, with the visitor from the sign-in book and their times');
 ok(/Work logged/.test(t)&&/Fitted the loft floor joists/.test(t),'the work logged');
 ok(/Sunny, 12°C/.test(t),'the weather (from the photo)');
 ok(/Photos \(1\)/.test(t)&&await p.locator('.sdi .ph').count()===1,'the photo taken that day');
 ok(await p.locator('#sdi-note').count()===1&&/Speak/.test(t),'a note box you can speak into');
 await p.fill('#sdi-note','Building control passed the joists. Steel late by 2 hours.');await p.click('#sdi-save');await p.waitForTimeout(500);
 const rec=await p.evaluate(()=>Object.entries(window.__st).filter(([k,v])=>/^todos\/sdi-/.test(k)).map(([k,v])=>[k,v.note,v.date]));console.log(JSON.stringify(rec));
 ok(rec.length===1&&/Building control passed/.test(rec[0][1]),'the note is saved for the day');
 /* the day before: nothing */
 await p.click('#sdi-prev');await p.waitForTimeout(300);
 ok(/Nothing recorded on this day yet/.test(await p.innerText('.sdi')),'the day before has nothing');
 await p.click('#sdi-next');await p.waitForTimeout(300);
 ok(/Building control passed/.test(await p.inputValue('#sdi-note')),'back on today, the note is there');
 /* the week as a PDF */
 await p.click('#sdi-pdf');await p.waitForTimeout(300);await p.click('#f-save');await p.waitForTimeout(3000);
 const d=await p.evaluate(()=>(window.__dl||[]).map(x=>[x.filename,x.data.size]));console.log(JSON.stringify(d));
 const last=d[d.length-1]||[];
 ok(/^Site diary - 4 Rolle Road, Exmouth - .*\.pdf$/.test(last[0]||'')&&last[1]>3000,'a PDF of the week is made');
 const pdf=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return s});
 fs.writeFileSync('h472-diary.pdf',Buffer.from(pdf,'latin1'));
 ok(pdf.includes('Site diary')&&pdf.includes('Dave Testscaffold')&&pdf.includes('Fitted the loft floor joists'),'with who was on site and the work');
 ok(pdf.includes('Building control passed the joists'),'and the note');
 ok(/\/Subtype \/Image/.test(pdf),'and the photo');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h472: ${bad} failed`:'h472: all passed');await b.close();process.exit(bad?1:0);
})();
