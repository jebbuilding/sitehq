// Copy in a row and hatching: a box copied 3 times 1,000 mm apart to the right (exact spacing at 1:50), then given
// brick hatching from the fill box; every hatch pattern draws without errors. Writes h422.png.
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
 await p.mouse.move(X(200),Y(200));await p.mouse.down();await p.mouse.move(X(240),Y(240));await p.mouse.move(X(260),Y(280));await p.mouse.up();await p.waitForTimeout(150);
 await p.keyboard.press('v');await p.mouse.click(X(200),Y(240));await p.waitForTimeout(150);
 ok(await p.isVisible('.np .np-sb[data-a=repeat]'),'a selected box offers ⋯ Copy in a row');
 await p.click('.np .np-sb[data-a=repeat]');await p.waitForTimeout(150);
 await p.fill('.np .rpn','3');await p.fill('.np .rps','1000');await p.click('.np .dimbox button[type=submit]');await p.waitForTimeout(200);
 ok(/3 copies made, 1(\.0)? m apart|3 copies made, 1,000 mm apart|3 copies made/.test(await lastToast()),'copies made: '+await lastToast());
 /* hatch the original */
 await p.mouse.click(X(200),Y(240));await p.waitForTimeout(150);await p.click('.np .np-sb[data-a=fill]');await p.waitForTimeout(150);
 ok(await p.isVisible('.np .nc-hatch'),'the fill box offers Hatch');
 await p.selectOption('.np .nc-hatch','brick');await p.waitForTimeout(150);
 await p.evaluate(()=>{const x=document.querySelector('.np .np-colpop .ncx');x&&x.click();});
 /* every pattern draws */
 for(const k of ['block','concrete','insul','hardcore','earth','timber','sand']){await p.evaluate(()=>{const b=document.querySelector('.np .np-sb[data-a=fill]');b&&b.click()});await p.waitForTimeout(80);if(await p.isVisible('.np .nc-hatch')){await p.selectOption('.np .nc-hatch',k);await p.waitForTimeout(80);}}
 await p.selectOption('.np .nc-hatch','brick');await p.evaluate(()=>{const x=document.querySelector('.np .np-colpop .ncx');x&&x.click();});
 await p.keyboard.press('Escape');await p.waitForTimeout(100);
 await (await p.$('.np .np-stage')).screenshot({path:'h422.png'});
 await p.fill('.np .np-title','Rows');await p.click('.np .np-save');await p.waitForTimeout(1500);
 const o=await p.evaluate(async()=>{const k=Object.keys(window.__st).find(k=>window.__st[k]&&window.__st[k].kind==='sketch'&&window.__st[k].pageSrc);const d=window.__st[k];const pg=JSON.parse(await window.__blobs[d.pageSrc].text());return (pg.pages?pg.pages[0].objs:pg.objs).filter(x=>x.t==='rect');});
 const xs=o.map(r=>Math.min(r.a[0],r.b[0])).sort((a,b)=>a-b),gaps=xs.slice(1).map((x,i)=>Math.round((x-xs[i])*10)/10);
 ok(o.length===4&&gaps.every(g=>g===100),'4 boxes, each 1,000 mm (100 units at 1:50) from the last: '+gaps.join(', '));
 ok(o.filter(r=>r.hatch==='brick').length===1,'the first box is hatched as brickwork');
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0]);bad++}
 console.log(bad?'h422: '+bad+' FAILED':'h422: all passed');
 await b.close()})();
