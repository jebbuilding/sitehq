const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/c1"].portalUid="u9";store["sheets/owner/photos/dr1"]={kind:"sketch",assetId:"img1",title:"Kitchen layout",site:"4 Rolle Road, Exmouth",category:"Drawings & sketches",takenAt:1,date:"2026-11-04",mine:true,created:1};store["portal/u9/signs/m1"]={kind:"materials",title:"Kitchen worktops - oak",details:"Solid oak, 40mm, oiled",statement:"I approve these materials.",status:"open",created:5,docIds:[]};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const img=fs.readFileSync('fixtures/ld1.png').toString('base64');
const page_src=fs.readFileSync('timesheets.html','utf8')
  .replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>{if(!window.__blobs[id]&&id==="img1"){const b=atob(window.__IMG);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);window.__blobs.img1=new Blob([u],{type:"image/png"})}return window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id};')
  .replace('function drawOpen(p) {','window.drawOpen=drawOpen;function drawOpen(p) {').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('async function ptSignPdf(','window.ptSignPdf=ptSignPdf;async function ptSignPdf(');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(10000);const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const sign=async sel=>{const cv=p.locator(sel);await cv.scrollIntoViewIfNeeded();const bb=await cv.boundingBox();await p.mouse.move(bb.x+20,bb.y+60);await p.mouse.down();await p.mouse.move(bb.x+120,bb.y+95,{steps:6});await p.mouse.move(bb.x+220,bb.y+40,{steps:6});await p.mouse.up()};
 try{
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body><script>window.__IMG="'+img+'";</script>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 await p.evaluate(()=>drawOpen(window.__S.mine.photos.find(x=>x.id==="dr1")));await p.waitForTimeout(400);console.log('button',await p.innerText('#dw-ssheet'));
 await p.click('#dw-ssheet');await p.waitForSelector('#ss-kind');console.log('kinds',(await p.locator('#ss-kind option').allTextContents()).join(' / '));
 await p.selectOption('#ss-kind','materials');console.log('stmt follows kind',(await p.inputValue('#ss-stmt')).slice(0,40),'| trades hidden by default',!(await p.locator('.ss-t').first().isVisible()));
 await p.selectOption('#ss-kind','design');await p.evaluate(()=>document.getElementById('form').requestSubmit());await p.waitForSelector('[data-a=here]',{timeout:15000});
 await p.click('[data-a=here]');await p.waitForSelector('.sh-sig');await p.check('.sh-ok');await sign('.sh-sig');await p.click('.sh-go');await p.waitForTimeout(800);
 const x=await p.evaluate(()=>{const s=window.__st;const k=Object.keys(s).find(k=>k.startsWith('portal/u9/signs/')&&k!=='portal/u9/signs/m1');return s[k]&&{status:s[k].status,name:s[k].signedName,onDevice:s[k].onDevice,kind:s[k].kind,hasSig:!!s[k].sig}});console.log('client signed here',JSON.stringify(x));
 console.log('client note',await p.evaluate(()=>JSON.stringify((window.__st['todos/c1'].notes||[]).slice(-1))));
 // general sign-off print to sign (materials one, still open)
 const blob=await p.evaluate(async()=>{const c=window.__S.clients.find(x=>x.id==='c1');const xx=Object.assign({id:'m1'},window.__st['portal/u9/signs/m1']);const b=await ptSignPdf(c,{name:'Sue',site:'4 Rolle Road'},xx,[],null,true);const u=new Uint8Array(await b.arrayBuffer());let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s)});fs.writeFileSync('print_to_sign.pdf',Buffer.from(blob,'base64'));
 await p.click('#viewer-close').catch(()=>{});await p.click('.tab[data-t=signoffs]');await p.waitForTimeout(800);console.log('signoffs',(await p.innerText('#main')).replace(/\n/g,' | ').slice(200,600));
 await p.locator('.so-row').first().click();await p.waitForTimeout(500);console.log('detail buttons',(await p.locator('#viewer-body .actions button').allTextContents()).join(' / '));
 }catch(e){console.log('FAIL',e.message.split('\n').slice(0,4).join('|'))}
 await b.close()})();
