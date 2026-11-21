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
  .replace('function openPersonMonth(','window.openPersonMonth=openPersonMonth;function openPersonMonth(').replace('function render() {','window.render=render;function render() {').replace('function drawOpen(p) {','window.drawOpen=drawOpen;function drawOpen(p) {').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('async function ptSignPdf(','window.ptSignPdf=ptSignPdf;async function ptSignPdf(').replace('async function openFile(id, name, type) {','window.openFile=openFile;async function openFile(id, name, type) {');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:900,height:1000}});ctx.setDefaultTimeout(10000);const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body><script>window.__IMG="'+img+'";</script>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='suppliers';window.__S.f.merTab='mer';window.render()});await p.waitForTimeout(400);
 await p.click('#mer-who');await p.waitForSelector('.wsrow2');console.log('rows',await p.locator('.wsrow2').count());
 await p.selectOption('.wsrow2[data-id=distinction] .wsr-v','some');await p.check('.wsrow2[data-id=distinction] .wsr-t[value=emp1]');
 await p.selectOption('.wsrow2[data-id=ews] .wsr-v','all');
 const sup=await p.evaluate(()=>document.querySelector('.wsrow2[data-kind=sup]')&&document.querySelector('.wsrow2[data-kind=sup]').dataset.id);if(sup)await p.selectOption(`.wsrow2[data-id="${sup}"] .wsr-v`,'me');
 await p.evaluate(()=>document.getElementById('form').requestSubmit());await p.waitForTimeout(6000);
 console.log('copies',await p.evaluate(()=>Object.keys(window.__st).filter(k=>/signoffs\/mkc-/.test(k))));
 await p.click('.mer-t[data-v=makers]');await p.waitForTimeout(400);console.log('tags',await p.evaluate(()=>['distinction','ews','rehau'].map(k=>k+':'+document.querySelector(`.mkcard[data-k=${k}] .figs .tag`).textContent).join(' | ')));
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0])}
 await b.close()})();
