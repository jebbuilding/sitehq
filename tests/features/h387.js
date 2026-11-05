const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/c1"].portalUid="u9";store["sheets/owner/photos/dr1"]={kind:"sketch",assetId:"img1",title:"Kitchen layout",site:"4 Rolle Road, Exmouth",category:"Drawings & sketches",takenAt:1,date:"2026-11-04",mine:true,created:1};';
function mk(more){more=(more||'').replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${');let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs=window.__blobs||{};'+seed+extra+(more||''));
  src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
  eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return fake}
const img=fs.readFileSync('fixtures/ld1.png').toString('base64');
const page_src=fs.readFileSync('timesheets.html','utf8').replace('function detailsDone(d){return !!(d&&d.confirmedAt)}','function detailsDone(d){return true}')
  .replace('const blobUrl=id=>"/_blob/"+id;','const blobUrl=id=>{if(!window.__blobs[id]&&id==="img1"){const b=atob(window.__IMG);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);window.__blobs.img1=new Blob([u],{type:"image/png"})}return window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id};')
  .replace('function drawOpen(p){','window.drawOpen=drawOpen;function drawOpen(p){').replace('const S={db:null','const S=window.__S={db:null');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(10000);const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const load=async(owner,more,blobs)=>{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body><script>window.__IMG="'+img+'";</script>'+mk(more)(owner)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');await p.waitForTimeout(300)};
 const savePdfFromBlobId=async(id,name)=>{const b64=await p.evaluate(async id=>{const b=window.__blobs[id];const u=new Uint8Array(await b.arrayBuffer());let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s)},id);fs.writeFileSync(name,Buffer.from(b64,'base64'))};
 const sign=async sel=>{const cv=p.locator(sel);await cv.scrollIntoViewIfNeeded();const bb=await cv.boundingBox();await p.mouse.move(bb.x+20,bb.y+60);await p.mouse.down();await p.mouse.move(bb.x+120,bb.y+95,{steps:6});await p.mouse.move(bb.x+220,bb.y+40,{steps:6});await p.mouse.up()};
 try{
 await load(true);await p.evaluate(()=>drawOpen(window.__S.mine.photos.find(x=>x.id==="dr1")));await p.waitForTimeout(400);
 await p.click('#dw-ssheet');await p.waitForSelector('#ss-title');console.log('client preselected',await p.inputValue('#ss-cl'),'| site ticked',await p.isChecked('#ss-site'));
 await p.check('.ss-t[value=emp1]');await p.fill('#ss-note','Check sockets');await p.evaluate(()=>document.getElementById('form').requestSubmit());
 await p.waitForSelector('.ss-x',{timeout:15000});console.log('done dialog',(await p.innerText('.dimask .dimbox')).replace(/\n/g,' | ').slice(0,160));await p.click('.ss-x');
 const st=await p.evaluate(()=>{const s=window.__st;const d=s['sheets/owner/photos/dr1'];return {sheet:d.signSheet&&{ref:d.signSheet.ref,asset:d.signSheet.asset,site:d.signSheet.site,siteDoc:d.signSheet.siteDoc,clientSign:d.signSheet.clientSign},portalSign:Object.keys(s).filter(k=>k.startsWith('portal/u9/signs/')).length,trade:Object.keys(s).filter(k=>k.startsWith('sheets/emp1/photos/')&&s[k].signReq==='open').length,prompt:Object.keys(s).filter(k=>k.startsWith('sheets/emp1/signoffs/pr-')).map(k=>s[k].refLabel),siteDoc:Object.values(s).filter(x=>x&&x.needSign).length,clientPdf:(s['todos/c1'].recordPdfs||[]).length}});
 console.log(JSON.stringify(st));await savePdfFromBlobId(st.sheet.asset,'sheet_blank.pdf');
 let dump=await p.evaluate(()=>JSON.stringify(window.__st));let blobs=await p.evaluate(async()=>{const o={};for(const [k,b] of Object.entries(window.__blobs)){const u=new Uint8Array(await b.arrayBuffer());let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));o[k]=[b.type,btoa(s)]}return o});
 const restore='window.__blobs=window.__blobs||{};(function(o){for(const k in o){const b=atob(o[k][1]);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);window.__blobs[k]=new Blob([u],{type:o[k][0]})}})('+JSON.stringify(blobs)+');';
 // trade signs the drawing and the site doc
 await load(false,restore+'Object.assign(store,'+dump+');');
 const tp=await p.evaluate(()=>{const s=window.__S;return s.mine.photos.filter(x=>x.signReq==='open').map(x=>x.id)});console.log('trade has drawing to sign',tp.length);
 await p.evaluate(id=>drawOpen(window.__S.mine.photos.find(x=>x.id===id)),tp[0]);await p.waitForTimeout(400);console.log('sig pad',await p.locator('#dw-sig').count(),'stmt',await p.locator('text=By signing you confirm').count());
 await p.click('#dw-ok');await p.waitForTimeout(300);await sign('#dw-sig');await p.click('#dw-ok');await p.waitForTimeout(600);
 await p.click('.tab[data-t=plans]');await p.waitForTimeout(500);console.log('site banner',(await p.innerText('#main .notice.warn').catch(()=>'none')).replace(/\n/g,' | ').slice(0,120));
 await p.click('.ss-sign');await p.waitForSelector('#s-sig');await p.check('#s-ok');await sign('#s-sig');await p.evaluate(()=>document.getElementById('form').requestSubmit());await p.waitForTimeout(800);
 dump=await p.evaluate(()=>JSON.stringify(window.__st));
 // owner: status + signed copy
 await load(true,restore+'Object.assign(store,'+dump+');');await p.waitForTimeout(1500);
 await p.evaluate(()=>drawOpen(window.__S.mine.photos.find(x=>x.id==="dr1")));await p.waitForTimeout(400);console.log('card',(await p.innerText('#viewer-body .card')).replace(/\n/g,' | ').slice(0,300));
 await p.click('#ss-rec');await p.waitForTimeout(4000);const r=await p.evaluate(async()=>{const d=(window.__dl||[]).pop();if(!d)return null;const u=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return {fn:d.filename,b64:btoa(s)}});console.log('signed pdf',r&&r.fn,'| print bar',await p.locator('#pdfbar').count());if(r)fs.writeFileSync('sheet_signed.pdf',Buffer.from(r.b64,'base64'));
 await p.click('#viewer-close');await p.click('.tab[data-t=signoffs]');await p.waitForTimeout(500);console.log('signoffs tab',(await p.innerText('#main')).replace(/\n/g,' | ').slice(0,260));
 }catch(e){console.log('FAIL',e.message.split('\n').slice(0,4).join('|'))}
 await b.close()})();
