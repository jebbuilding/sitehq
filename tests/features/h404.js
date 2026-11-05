const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/c1"].portalUid="u9";store["sheets/owner/photos/dr1"]={kind:"sketch",assetId:"img1",title:"Kitchen layout",site:"4 Rolle Road, Exmouth",category:"Drawings & sketches",takenAt:1,date:"2026-11-04",mine:true,created:1};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const img=fs.readFileSync('fixtures/ld1.png').toString('base64');
const page_src=fs.readFileSync('timesheets.html','utf8')
  .replace('const blobUrl=id=>"/_blob/"+id;','const blobUrl=id=>{if(!window.__blobs[id]&&id==="img1"){const b=atob(window.__IMG);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);window.__blobs.img1=new Blob([u],{type:"image/png"})}return window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id};')
  .replace('function openPersonMonth(','window.openPersonMonth=openPersonMonth;function openPersonMonth(').replace('function render(){','window.render=render;function render(){').replace('function drawOpen(p){','window.drawOpen=drawOpen;function drawOpen(p){').replace('const S={db:null','const S=window.__S={db:null').replace('async function ptSignPdf(','window.ptSignPdf=ptSignPdf;async function ptSignPdf(').replace('async function openFile(id,name,type){','window.openFile=openFile;async function openFile(id,name,type){');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:900,height:1000}});ctx.setDefaultTimeout(10000);const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body><script>window.__IMG="'+img+'";</script>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 await p.evaluate(async()=>{const c=window.__S.clients.find(x=>x.id==='c1');const t=Date.now();const d=Object.assign({},c,{stage:'won',work:'Kitchen',desc:'New kitchen, knock through',quote:'18500',enqAt:t-5*864e5,pastJobs:[{work:'Bathroom',desc:'Full bathroom refit',quote:'7200',stage:'done',startAt:t-400*864e5,at:t-300*864e5}],notes:[{text:'Bathroom: tiles chosen',at:t-350*864e5},{text:'Kitchen visit done',at:t-2*864e5}],media:[{id:'img1',kind:'photo',at:t-320*864e5,note:'old bath'}]});delete d.id;await window.__S.db.doc('todos/c1').set(d);Object.assign(c,d);window.__S.otab='clients';window.__S.f.clf='all';window.render()});await p.waitForTimeout(600);
 await p.click('.cl-tab[data-v=book]');await p.waitForTimeout(400);console.log('tabs',await p.locator('.cl-tab').allInnerTexts(),'| job lines',await p.locator('.bklist .abjob').count());
 await p.locator('.bklist').screenshot({path:'abook.png'});
 await p.locator('.abjob',{hasText:'Bathroom'}).first().click();await p.waitForTimeout(500);
 console.log('job page',await p.evaluate(()=>document.getElementById('viewer-body').innerText.slice(0,400).replace(/\n+/g,' | ')));
 await p.click('#cj-open');await p.waitForTimeout(400);console.log('client page jobs',await p.locator('.cvjobs .abjob').count());await p.locator('.cvjobs .abjob').first().click();await p.waitForTimeout(400);console.log('cur job',await p.evaluate(()=>document.querySelector('#viewer-body h3').textContent),await p.isVisible('#cj-edit'));
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0])}
 await b.close()})();
