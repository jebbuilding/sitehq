const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/c1"].portalUid="u9";store["sheets/owner/photos/dr1"]={kind:"sketch",assetId:"img1",title:"Kitchen layout",site:"4 Rolle Road, Exmouth",category:"Drawings & sketches",takenAt:1,date:"2026-11-04",mine:true,created:1};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const img=fs.readFileSync('fixtures/ld1.png').toString('base64');
const page_src=fs.readFileSync('timesheets.html','utf8')
  .replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>{if(!window.__blobs[id]&&id==="img1"){const b=atob(window.__IMG);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);window.__blobs.img1=new Blob([u],{type:"image/png"})}return window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id};')
  .replace('function render() {','window.render=render;function render() {').replace('function drawOpen(p) {','window.drawOpen=drawOpen;function drawOpen(p) {').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('async function ptSignPdf(','window.ptSignPdf=ptSignPdf;async function ptSignPdf(').replace('async function openFile(id, name, type) {','window.openFile=openFile;async function openFile(id, name, type) {');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:900,height:1000}});ctx.setDefaultTimeout(10000);const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body><script>window.__IMG="'+img+'";</script>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 const info=await p.evaluate(()=>({c1:window.__S.clients.find(x=>x.id==='c1'),dws:(window.__S.mine.photos||[]).filter(p=>p.kind==='sketch').map(p=>p.title+'@'+p.site),docs:(window.__S.docs||[]).map(d=>d.title+'@'+d.site)}));console.log('c1 site',info.c1.site,'| drawings',info.dws.join(', '),'| docs',info.docs.slice(0,4).join(', '));
 await p.evaluate(()=>{window.__S.otab='signoffs';window.render()});await p.waitForTimeout(400);await p.click('#so-new');await p.waitForSelector('#so-cl');await p.evaluate(()=>document.getElementById('form').requestSubmit());await p.waitForSelector('#ss-mname');await p.waitForTimeout(300);
 console.log('buttons',await p.locator('.cutpick + div label, .cutpick + div button').allInnerTexts(),'| clips shown (manual)',await p.locator('.clipt').count());
 await p.click('.cutpick-add');await p.waitForSelector('.cc-x');console.log('manual chooser',await p.evaluate(()=>document.querySelector('.dimask').innerText.replace(/\n+/g,' | ').slice(0,200)));await p.click('.cc-x');
 await p.selectOption('#ss-cl','c1');await p.waitForTimeout(200);await p.click('.cutpick-add');await p.waitForSelector('.cc-x');console.log('c1 chooser',await p.evaluate(()=>document.querySelector('.dimask').innerText.replace(/\n+/g,' | ').slice(0,300)));
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0])}
 await b.close()})();
