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
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('script.google.com')){(global.__pops=global.__pops||[]).push(r.request().url());return r.fulfill({status:200,contentType:'text/html',body:'ok'})}if(r.request().url().includes('qrcode-generator'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('qrlib/package/qrcode.js','utf8')});if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body><script>window.__IMG="'+img+'";</script>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='setup';window.render()});await p.waitForTimeout(400);await p.click('#co-qr');await p.waitForSelector('#qs-url');
 await p.fill('#qs-url','https://script.google.com/macros/s/ABC/exec');await p.fill('#qs-key','k123');await p.evaluate(()=>document.getElementById('form').requestSubmit());await p.waitForTimeout(600);
 console.log('cfg',await p.evaluate(()=>JSON.stringify(window.__st['todos/qrcfg'])));
 const site=await p.evaluate(()=>window.__S.inductions[0]&&window.__S.inductions[0].site);console.log('site with induction',site);
 await p.evaluate(s=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.render()},site);await p.waitForTimeout(600);
 console.log('qr card',await p.isVisible('.qr-go'),(await p.innerText('.qrcard')).replace(/\n/g,' '));
 await p.click('.qr-go');await p.waitForSelector('#qq-send');await p.waitForTimeout(800);console.log('qr svg',await p.evaluate(()=>!!document.querySelector('#qq-prev svg')));
 const pops=global.__pops=[];await p.click('#qq-send');await p.waitForTimeout(1200);console.log('opened',pops[0]&&pops[0].slice(0,120));
 const u=pops[0]||'';const b64=decodeURIComponent((u.match(/setup=([^&]+)/)||[])[1]||'');console.log('payload',Buffer.from(b64,'base64url').toString().slice(0,200));
 await p.evaluate(()=>{const o=URL.createObjectURL;URL.createObjectURL=b=>{if(b&&b.type==='application/pdf')window.__rec=b;return o(b)}});await p.click('#qq-pdf');await p.waitForTimeout(2500);
 const pdf=await p.evaluate(async()=>{const b=window.__lastPoster;if(!b)return '';const u=new Uint8Array(await b.arrayBuffer());let t='';for(let i=0;i<u.length;i+=8192)t+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(t)});if(pdf)fs.writeFileSync('qrposter.pdf',Buffer.from(pdf,'base64'));console.log('poster bytes',pdf.length,await p.evaluate(()=>{const t=document.querySelector('.toast,#toast');return t&&t.textContent}),await p.evaluate(()=>!!document.querySelector('.pdfbar,#pdfbar')));
 await p.evaluate(()=>{const c=document.getElementById('f-cancel');if(c)c.click()});await p.waitForTimeout(300);
 await p.evaluate(()=>{window.__S.otab='signin';window.render()});await p.waitForTimeout(400);await p.click('#sb-qr');await p.waitForSelector('#qi-t');
 const t=new Date();t.setHours(8,5,0,0);const o=new Date();o.setHours(15,40,0,0);
 await p.fill('#qi-t',JSON.stringify({sitehq:'qr',at:Date.now(),rows:[{id:'qr-abc',siteId:'x',site:site,name:'Dan Visitor',company:'Building control',mobile:'07700900999',in:+t,out:+o,how:'signed out',inducted:'v1'}]}));
 await p.evaluate(()=>document.getElementById('form').requestSubmit());await p.waitForTimeout(1000);
 console.log('book',await p.locator('#main .citem').allInnerTexts());
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0])}
 await b.close()})();
