const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl=id=>"/_blob/"+id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const savePdf=async(name)=>{const r=await p.evaluate(async()=>{const d=(window.__dl||[]).pop();if(!d)return null;const u=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return {fn:d.filename,b64:btoa(s)}});console.log('pdf',r&&r.fn);if(r)fs.writeFileSync(name,Buffer.from(r.b64,'base64'))};
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('.tab[data-t=jobs]');await p.waitForTimeout(400);await p.click('#ws-new');await p.waitForTimeout(500);
 // make two jpegs in the page and set them on the file input
 const png=fs.readFileSync('fixtures/ld1.png');await p.setInputFiles('#wsx-phpick',[{name:'a.png',mimeType:'image/png',buffer:png},{name:'b.png',mimeType:'image/png',buffer:fs.readFileSync('fixtures/ld1.png')}]);await p.waitForTimeout(1500);
 console.log('thumbs',await p.locator('#wsx-ph button').count(),'list badge',(await p.innerText('#wsx-list')).includes('📷 2'));
 await p.evaluate(()=>document.querySelector('#wsx-ph').scrollIntoView());await p.screenshot({path:'ph1.png'});
 await p.locator('#wsx-ph button').first().click();await p.waitForTimeout(300);console.log('viewer',await p.locator('.dimask img').count());await p.click('.ph-del');await p.waitForTimeout(300);await p.click('.bf-yes');await p.waitForTimeout(600);console.log('after delete',await p.locator('#wsx-ph button').count(),'bin',await p.evaluate(()=>Object.keys(window.__st).filter(k=>k.startsWith('todos/bin-')).length));
 await p.click('#wsx-pdf');await p.waitForTimeout(600);await p.click('[data-m=full]');await p.waitForTimeout(4000);await savePdf('ph.pdf');
 }catch(e){console.log('FAIL',e.message.split('\n').slice(0,4).join('|'))}
 await b.close()})();
