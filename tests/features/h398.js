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
 await p.evaluate(async()=>{const t=Object.assign({},window.__S.team.emp1);delete t.id;t.role='sub';t.details=Object.assign({},t.details||{},{fullName:'Sam Tester',trade:'Carpenter',empType:'cis',utr:'1234567890',address:'5 Long Lane, Exmouth',postcode:'EX8 1AA',mobile:'07700900111'});await window.__S.db.doc('sheets/emp1').set(t);window.__S.team.emp1=Object.assign({id:'emp1'},t);window.__S.otab='people';window.__S.f.prole='';window.__S.open.add('__pemp1');window.render()});await p.waitForTimeout(700);
 console.log('make btn',await p.isVisible('.ct-make'));await p.click('.ct-make');await p.waitForSelector('#sa-name');console.log('prefill',await p.inputValue('#sa-name'),'|',await p.inputValue('#sa-trade'),'|',await p.inputValue('#sa-utr'),'|',await p.inputValue('#sa-cis'));
 await p.fill('#sa-rate','180');await p.evaluate(()=>document.getElementById('form').requestSubmit());await p.waitForSelector('.sg-p1');
 await p.check('.sg-ok');for(const c of ['.sg-p1','.sg-p2']){const bb=await p.locator(c).boundingBox();await p.mouse.move(bb.x+20,bb.y+30);await p.mouse.down();await p.mouse.move(bb.x+140,bb.y+70,{steps:10});await p.mouse.move(bb.x+220,bb.y+25,{steps:6});await p.mouse.up()}
 await p.click('.sg-go');await p.waitForTimeout(3500);
 const k=await p.evaluate(()=>Object.keys(window.__st).find(k=>/^sheets\/emp1\/signoffs\/pd-/.test(k)&&window.__st[k].kind==='subagree'));console.log('saved',k,await p.evaluate(k=>{const r=window.__st[k];return r.signed+' '+r.names[0]+' rate '+r.agree.rate},k));
 const pdf=await p.evaluate(async k=>{const b=window.__blobs[window.__st[k].photos[0]];const u=new Uint8Array(await b.arrayBuffer());let t='';for(let i=0;i<u.length;i+=8192)t+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(t)},k);fs.writeFileSync('subag.pdf',Buffer.from(pdf,'base64'));
 await p.evaluate(()=>{window.__S.otab='people';window.__S.f.prole='';window.render()});await p.waitForTimeout(500);console.log('box now',await p.evaluate(()=>{const b=document.querySelector('.ctbox');return b&&b.innerText.slice(0,160)}));
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0])}
 await b.close()})();
