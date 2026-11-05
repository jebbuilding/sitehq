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
 await p.click('#fv-cut');await p.waitForSelector('.cutcv');await p.waitForTimeout(800);const bb=await p.locator('.cutcv').boundingBox();
 await p.mouse.move(bb.x+bb.width*0.1,bb.y+bb.height*0.2);await p.mouse.down();await p.mouse.move(bb.x+bb.width*0.7,bb.y+bb.height*0.45,{steps:8});await p.mouse.up();
 await p.click('.cut-ok');await p.waitForSelector('.ct-name');await p.fill('.ct-name','Oak worktop sample');await p.click('[data-a=so]');await p.waitForSelector('.ct-go');
 console.log('default option',await p.inputValue('.ct-cl'));await p.click('.ct-go');await p.waitForSelector('#ss-mname');await p.waitForTimeout(300);
 console.log('manual fields visible',await p.isVisible('#ss-mname'),'| clip ticked',await p.locator('.ss-clip:checked').count(),'| title',await p.inputValue('#ss-title'),'| kind',await p.inputValue('#ss-kind'),'| trades hidden',!(await p.isVisible('details.pmdet')));
 await p.click('#f-save');await p.waitForTimeout(500);console.log('err no name',await p.evaluate(()=>{const e=document.getElementById('f-err');return e&&!e.hidden?e.textContent:'none'}));
 await p.fill('#ss-mname','Mr & Mrs Smith');await p.fill('#ss-maddr','12 High Street, Topsham EX3 0AA');await p.fill('#ss-mtel','07700 900123');await p.click('#f-save');
 await p.waitForSelector('[data-a=here]',{timeout:15000});const k=await p.evaluate(()=>Object.keys(window.__st).find(k=>/^todos\/gs-/.test(k)));console.log('saved',k,JSON.stringify(await p.evaluate(k=>{const r=window.__st[k];return {kind:r.kind,man:r.signSheet.manual,ex:r.signSheet.extras.length,asset:!!r.signSheet.asset}},k)));
 const pdf1=await p.evaluate(async k=>{const b=window.__blobs[window.__st[k].signSheet.asset];const u=new Uint8Array(await b.arrayBuffer());let t='';for(let i=0;i<u.length;i+=8192)t+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(t)},k);fs.writeFileSync('solo_blank.pdf',Buffer.from(pdf1,'base64'));
 await p.click('[data-a=here]');await p.waitForSelector('.sh-sig');await p.check('.sh-ok');const sb=await p.locator('.sh-sig').boundingBox();await p.mouse.move(sb.x+20,sb.y+30);await p.mouse.down();await p.mouse.move(sb.x+150,sb.y+60,{steps:10});await p.mouse.move(sb.x+220,sb.y+20,{steps:6});await p.mouse.up();
 await p.click('.sh-go');await p.waitForTimeout(1200);console.log('signed',await p.evaluate(k=>{const m=window.__st[k].signSheet.manualSign;return m&&m.signedName+' sig '+(m.sig||'').length},k));
 console.log('view open',await p.isVisible('.gs-x'),'| here btn gone',!(await p.isVisible('#ss-here')));
 await p.evaluate(()=>{window.__S.dl={save:async o=>{window.__rec=o.data}}});await p.click('#ss-rec');await p.waitForTimeout(2500);const rec=await p.evaluate(async()=>{const b=window.__rec;if(!b)return '';const u=new Uint8Array(await b.arrayBuffer());let t='';for(let i=0;i<u.length;i+=8192)t+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(t)});fs.writeFileSync('solo_signed.pdf',Buffer.from(rec,'base64'));await p.evaluate(()=>{const x=document.getElementById('pdfbar');if(x)x.remove()});
 await p.click('.gs-x');await p.evaluate(()=>{window.__S.otab='signoffs';window.render()});await p.waitForTimeout(600);
 console.log('listed',await p.locator('.so-dw').allInnerTexts());
 await p.click('#so-new');await p.waitForSelector('#so-cl');console.log('new default',await p.inputValue('#so-cl'));await p.evaluate(()=>document.getElementById('form').requestSubmit());await p.waitForSelector('#ss-mname');await p.waitForTimeout(300);console.log('solo from tab, manual shown',await p.isVisible('#ss-mname'),'kind',await p.inputValue('#ss-kind'));
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0])}
 await b.close()})();
