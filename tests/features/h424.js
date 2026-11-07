// My symbols: a box saved with ⭐ Save as my symbol (owner-private todos record, kind npsym), then dropped back in from
// ⭐ My symbols, also on a page at another scale (resized to stay the same real size).
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 const box=await (await p.$('.np .np-cv')).boundingBox();const X=x=>box.x+x,Y=y=>box.y+y;
 await p.mouse.click(X(900),Y(600));await p.keyboard.press('b');
 await p.mouse.move(X(200),Y(200));await p.mouse.down();await p.mouse.move(X(250),Y(230));await p.mouse.move(X(300),Y(260));await p.mouse.up();await p.waitForTimeout(150);
 await p.keyboard.press('v');await p.mouse.click(X(200),Y(230));await p.waitForTimeout(150);
 ok(await p.isVisible('.np .np-sb[data-a=mysym]'),'a selected box offers ⭐ Save as my symbol');
 await p.click('.np .np-sb[data-a=mysym]');await p.fill('.np .msn','Kitchen unit');await p.click('.np .dimbox button[type=submit]');await p.waitForTimeout(400);
 ok(/Saved to ⭐ My symbols: Kitchen unit/.test(await lastToast()),'saved: '+await lastToast());
 const rec=await p.evaluate(()=>{const k=Object.keys(window.__st).find(k=>/^todos\/sym-/.test(k));return k&&window.__st[k];});
 ok(rec&&rec.kind==='npsym'&&rec.name==='Kitchen unit'&&rec.scale===50&&rec.objs.length===1,'stored as an owner-private record with its scale');
 const w0=rec&&Math.abs(rec.objs[0].b[0]-rec.objs[0].a[0]);
 /* drop it in again */
 await p.evaluate(()=>document.querySelector('.np .np-mysym').click());await p.waitForTimeout(200);
 ok(/Kitchen unit/.test(await p.evaluate(()=>document.querySelector('.np .dimask').innerText)),'⭐ My symbols lists it');
 await p.click('.np .msi');await p.waitForTimeout(200);ok(/Kitchen unit added$/.test(await lastToast()),'added: '+await lastToast());
 /* change the page to 1:20 and drop it in: 2.5 × as big on the page, the same real size */
 await p.evaluate(()=>document.querySelector('.np .np-setup').click());await p.waitForTimeout(150);await p.selectOption('.np .ps-scale','20');await p.click('.np .dimbox button[type=submit]');await p.waitForTimeout(200);
 await p.evaluate(()=>document.querySelector('.np .np-mysym').click());await p.waitForTimeout(200);await p.click('.np .msi');await p.waitForTimeout(200);
 ok(/resized from 1:50 to 1:20/.test(await lastToast()),'resized for the new scale: '+await lastToast());
 await p.fill('.np .np-title','Mine');await p.click('.np .np-save');await p.waitForTimeout(1500);
 const o=await p.evaluate(async()=>{const k=Object.keys(window.__st).find(k=>window.__st[k]&&window.__st[k].kind==='sketch'&&window.__st[k].pageSrc);const d=window.__st[k];const pg=JSON.parse(await window.__blobs[d.pageSrc].text());return (pg.pages?pg.pages[0].objs:pg.objs).filter(x=>x.t==='rect');});
 const ws=o.map(r=>Math.round(Math.abs(r.b[0]-r.a[0])*10)/10);
 ok(o.length===3&&ws.filter(x=>Math.abs(x-w0)<0.2).length===2&&ws.some(x=>Math.abs(x-w0*2.5)<0.3),'3 boxes: the original, a copy the same size, and one 2.5 × as big: '+ws.join(', '));
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0]);bad++}
 console.log(bad?'h424: '+bad+' FAILED':'h424: all passed');
 await b.close()})();
