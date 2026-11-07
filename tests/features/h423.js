// DXF import: a small CAD plan (a 4,000 × 3,000 mm room as a closed polyline, a door swing arc, a 1,000 mm circle and a
// label) comes in from Import drawing as real lines, circles and text at real size at 1:50, on the Imports layer.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const dxf=['0','SECTION','2','HEADER','9','$INSUNITS','70','4','0','ENDSEC','0','SECTION','2','ENTITIES',
 '0','LWPOLYLINE','8','0','90','4','70','1','10','0','20','0','10','4000','20','0','10','4000','20','3000','10','0','20','3000',
 '0','ARC','8','0','10','0','20','0','40','800','50','0','51','90',
 '0','CIRCLE','8','0','10','2000','20','1500','40','500',
 '0','TEXT','8','0','10','1500','20','2500','40','200','1','KITCHEN',
 '0','ENDSEC','0','EOF'].join('\n');
fs.writeFileSync('h423-plan.dxf',dxf);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 await p.evaluate(()=>document.querySelector('.np .np-import').click());await p.waitForTimeout(200);
 ok(/DXF/.test(await p.evaluate(()=>document.querySelector('.np .dimask').innerText)),'Import drawing mentions DXF files');
 await p.setInputFiles('.np .dimask input[type=file]','h423-plan.dxf');await p.waitForTimeout(500);
 ok(/^Imported \d+ items \(4 × 3 m\) at 1:50\./.test(await lastToast()),'imported at real size: '+await lastToast());
 await p.screenshot({path:'h423.png'});
 await p.fill('.np .np-title','Imported');await p.click('.np .np-save');await p.waitForTimeout(1500);
 const o=await p.evaluate(async()=>{const k=Object.keys(window.__st).find(k=>window.__st[k]&&window.__st[k].kind==='sketch'&&window.__st[k].pageSrc);const d=window.__st[k];const pg=JSON.parse(await window.__blobs[d.pageSrc].text());return pg.pages?pg.pages[0].objs:pg.objs;});
 const len=x=>Math.round(Math.hypot(x.b[0]-x.a[0],x.b[1]-x.a[1]));
 const walls=o.filter(x=>x.t==='line'&&[400,300].includes(len(x)));
 ok(walls.length===4,'the room is 4 lines, 4,000 and 3,000 mm at 1:50: '+walls.map(len).join(', '));
 const c=o.find(x=>x.t==='circle');ok(c&&Math.round(Math.abs(c.b[0]-c.a[0]))===100,'the 1,000 mm circle is 100 units across');
 ok(o.some(x=>x.t==='text'&&x.s==='KITCHEN'),'the label comes in as text');
 ok(o.filter(x=>x.t==='line'&&len(x)<100).length>=4,'the door swing arc comes in as short lines');
 ok(o.every(x=>x.ly==='imports'),'everything is on the Imports layer');
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0]);bad++}
 console.log(bad?'h423: '+bad+' FAILED':'h423: all passed');
 await b.close()})();
