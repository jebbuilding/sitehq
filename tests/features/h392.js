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
  .replace('function render(){','window.render=render;function render(){').replace('function drawOpen(p){','window.drawOpen=drawOpen;function drawOpen(p){').replace('const S={db:null','const S=window.__S={db:null').replace('async function ptSignPdf(','window.ptSignPdf=ptSignPdf;async function ptSignPdf(').replace('async function openFile(id,name,type){','window.openFile=openFile;async function openFile(id,name,type){');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:900,height:1000}});ctx.setDefaultTimeout(10000);const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body><script>window.__IMG="'+img+'";</script>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.blobUrl&&0;openFile("img1","Brochure page.png","image/png")});await p.waitForTimeout(1200);console.log('cut btn visible',await p.isVisible('#fv-cut'),'| print btn',await p.isVisible('#fv-print'));
 await p.evaluate(()=>{window.__S.otab='signin';window.render()});await p.waitForTimeout(500);
 await p.click('#sb-add');await p.waitForSelector('#sa-who');console.log('guest fields hidden at start',!(await p.isVisible('#sa-gname')));
 await p.selectOption('#sa-who','__guest');console.log('guest fields shown',await p.isVisible('#sa-gname'));
 await p.evaluate(()=>document.getElementById('form').requestSubmit());await p.waitForTimeout(300);console.log('err',await p.evaluate(()=>{const e=document.getElementById('f-err');return e&&!e.hidden?e.textContent:'none'}));
 await p.fill('#sa-gname','Tom Baker');await p.fill('#sa-gco','Building control');await p.fill('#sa-gtel','07700 900456');
 await p.evaluate(()=>{const i=document.getElementById('sa-site');if(i){i.value='4 Rolle Road, Exmouth';i.dispatchEvent(new Event('input'))}});
 await p.evaluate(()=>document.getElementById('form').requestSubmit());await p.waitForTimeout(1500);console.log('err2',await p.evaluate(()=>{const e=document.getElementById('f-err');return e&&!e.hidden?e.textContent:'none'}));
 console.log('stored',await p.evaluate(()=>JSON.stringify(Object.entries(window.__st).filter(([k,v])=>/signins/.test(k)&&v.guest).map(([k,v])=>k+' '+v.guest.name+' '+v.site+' open '+v.open))));
 await p.evaluate(()=>{window.__S.otab='signin';window.render()});await p.waitForTimeout(400);
 console.log('row',await p.locator('#main .citem').allInnerTexts());
 await p.click('#sb-roll');await p.waitForTimeout(500);console.log('roll call has Tom',await p.evaluate(()=>document.body.innerText.includes('Tom Baker')),'call btn',await p.locator('.rollrow a[href^="tel:0770090045"]').count());await p.keyboard.press('Escape');await p.evaluate(()=>{try{closeViewer()}catch(e){}});
 await p.evaluate(()=>{window.__S.otab='signin';window.render()});await p.waitForTimeout(300);
 await p.click('.sb-ed');await p.waitForSelector('#sa-gname');console.log('edit shows name',await p.inputValue('#sa-gname'));await p.fill('#sa-gname','Tom Baker (BC)');await p.fill('#se-out','15:30');await p.evaluate(()=>document.getElementById('form').requestSubmit());await p.waitForTimeout(1200);
 console.log('after edit',await p.evaluate(()=>JSON.stringify(Object.values(window.__st).filter(v=>v&&v.guest).map(v=>v.guest.name+' out '+v.out+' open '+v.open))));
 await p.evaluate(()=>{window.__S.otab='signin';window.render()});await p.waitForTimeout(300);console.log('row2',await p.locator('#main .citem').allInnerTexts());
 await p.evaluate(()=>{window.__S.dl={save:async o=>{window.__rec=o.data}}});await p.click('#sb-pdf');await p.waitForTimeout(2500);const rec=await p.evaluate(async()=>{const b=window.__rec;if(!b)return '';const u=new Uint8Array(await b.arrayBuffer());let t='';for(let i=0;i<u.length;i+=8192)t+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(t)});fs.writeFileSync('reg.pdf',Buffer.from(rec,'base64'));
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0])}
 await b.close()})();
