const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});if(u.includes('/_blob/')){const id=u.split('/_blob/')[1];return p.evaluate(async id=>{const b=window.__blobs[id];if(!b)return null;const u=new Uint8Array(await b.arrayBuffer());let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s)},id).then(b64=>b64?r.fulfill({status:200,contentType:'image/jpeg',body:Buffer.from(b64,'base64')}):r.abort())}r.abort()});
 const savePdf=async(name)=>{const r=await p.evaluate(async()=>{const d=(window.__dl||[]).pop();if(!d)return null;const u=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return {fn:d.filename,b64:btoa(s)}});console.log('pdf',r&&r.fn);if(r)fs.writeFileSync(name,Buffer.from(r.b64,'base64'))};
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('.tab[data-t=jobs]');await p.waitForTimeout(400);await p.click('#ws-new');await p.waitForTimeout(500);
 await p.click('#wsx-draw');await p.waitForTimeout(800);
 const cv=p.locator('.np-cv');const bb=await cv.boundingBox();console.log('canvas',bb&&Math.round(bb.width),bb&&Math.round(bb.height));
 const drag=async(x0,y0,x1,y1)=>{await p.mouse.move(bb.x+x0,bb.y+y0);await p.mouse.down();await p.mouse.move(bb.x+(x0+x1)/2,bb.y+(y0+y1)/2,{steps:4});await p.mouse.move(bb.x+x1,bb.y+y1,{steps:4});await p.mouse.up();await p.waitForTimeout(150)};
 await p.click('.np-t[data-t=rect]');
 // frame + 3 panes: left pane with top light, middle big, right pane
 await drag(100,250,500,650);
 await drag(110,260,230,330); await drag(110,340,230,640); await drag(240,260,370,640); await drag(380,260,490,640);
 // V in the right pane with the point at the left edge (hinge left)
 await p.click('.np-t[data-t=line]');await drag(488,262,382,450);await drag(382,450,488,638);
 // label the middle pane fixed, top light TH
 await p.click('.np-t[data-t=text]');await p.mouse.click(bb.x+300,bb.y+450);await p.waitForTimeout(300);await p.fill('.np-text input','F');await p.keyboard.press('Enter');await p.waitForTimeout(300);
 await p.mouse.click(bb.x+170,bb.y+295);await p.waitForTimeout(300);await p.fill('.np-text input','TH');await p.keyboard.press('Enter');await p.waitForTimeout(300);
 await p.screenshot({path:'dr1.png'});
 const objs=await p.evaluate(()=>null);
 await p.click('.np-save');await p.waitForTimeout(1500);
 await p.screenshot({path:'dr2.png'});
 const dlg=await p.locator('.dimask .dimbox').count();console.log('dialog',dlg);if(dlg){console.log((await p.innerText('.dimask .dimbox')).replace(/\n/g,' | ').slice(0,600));
   await p.fill('#wsx-dn','Three panes, top light');await p.click('.ws-ok');await p.waitForTimeout(800)}
 console.log('name',await p.innerText('#wsx-d-name'),'| calc',(await p.innerText('#wsx-calc')).replace(/\n/g,' '));
 console.log('mine in gallery',await p.locator('.wsgb[data-c]').count(),'designs saved',await p.evaluate(()=>Object.keys(window.__st).filter(k=>window.__st[k]&&window.__st[k].kind==='wsdesign').length));
 await p.screenshot({path:'dr3.png'});
 // sketch-only flow: draw again but keep drawing
 await p.click('#wsx-draw');await p.waitForTimeout(800);const bb2=await p.locator('.np-cv').boundingBox();await p.click('.np-t[data-t=rect]');await p.mouse.move(bb2.x+100,bb2.y+250);await p.mouse.down();await p.mouse.move(bb2.x+400,bb2.y+600,{steps:5});await p.mouse.up();await p.waitForTimeout(200);
 await p.click('.np-save');await p.waitForTimeout(1500);if(await p.locator('.dimask .ws-x').count()){console.log((await p.innerText('.dimask .dimbox')).replace(/\n/g,' | ').slice(0,300));await p.click('.dimask .ws-x');await p.waitForTimeout(300)}
 console.log('name2',await p.innerText('#wsx-d-name'),'img in sketch',await p.locator('#wsx-sk image').count(),'img in list',await p.locator('#wsx-list image').count());
 await p.screenshot({path:'dr4.png'});
 await p.click('#wsx-pdf');await p.waitForTimeout(600);if(await p.locator('[data-m=order]').count())await p.click('[data-m=order]');await p.waitForTimeout(4000);await savePdf('dr.pdf');
 }catch(e){console.log('FAIL',e.message.split('\n').slice(0,4).join('|'))}
 await b.close()})();
