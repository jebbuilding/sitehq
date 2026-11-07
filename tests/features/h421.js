// CAD keys and typing: keyboard shortcuts pick tools (L line, X tape…), ? shows the list, Ctrl+Z undoes; typed lengths and
// angles with Next ➜ draw connected lines exactly (a room from a laser measure); the tape measure says the real distance
// and draws nothing. Writes h421.png.
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
 const pressed=()=>p.evaluate(()=>{const b=document.querySelector('.np .np-t[data-t][aria-pressed=true]');return b&&b.dataset.t});
 const objs=async()=>{await p.fill('.np .np-title','Keys');await p.click('.np .np-save');await p.waitForTimeout(1500);return p.evaluate(async()=>{const ks=Object.keys(window.__st).filter(k=>window.__st[k]&&window.__st[k].kind==='sketch'&&window.__st[k].pageSrc);const d=window.__st[ks[ks.length-1]];const pg=JSON.parse(await window.__blobs[d.pageSrc].text());return pg.pages?pg.pages[0].objs:pg.objs;});};
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 const box=await (await p.$('.np .np-cv')).boundingBox();const X=x=>box.x+x,Y=y=>box.y+y;
 await p.mouse.click(X(900),Y(500));
 await p.keyboard.press('l');ok((await pressed())==='line','L picks Line');
 await p.keyboard.press('x');ok((await pressed())==='tape','X picks the tape measure');
 await p.keyboard.press('Shift+?');ok(/Keys: L line/.test(await lastToast()),'? shows the list of keys');
 /* tape measure: a real distance, nothing drawn */
 await p.mouse.move(X(200),Y(600));await p.mouse.down();await p.mouse.move(X(300),Y(600));await p.mouse.move(X(400),Y(600));await p.mouse.up();await p.waitForTimeout(150);
 ok(/^Tape: .*\(\d[\d,]* mm\)$/.test(await lastToast()),'tape measure: '+await lastToast());
 /* typed lengths: 4,000 right, Next, 3,000 down, Next, 4,000 left, Set */
 await p.keyboard.press('l');
 await p.mouse.move(X(200),Y(200));await p.mouse.down();await p.mouse.move(X(260),Y(200));await p.mouse.move(X(300),Y(200));await p.mouse.up();await p.waitForTimeout(150);
 ok(await p.isVisible('.np .np-lenbar'),'after drawing a line, Length and Angle can be typed');
 await p.fill('.np .nlb-l','4000');await p.fill('.np .nlb-a','0');await p.click('.np .nlb-next');await p.waitForTimeout(100);
 await p.fill('.np .nlb-l','3000');await p.fill('.np .nlb-a','270');await p.click('.np .nlb-next');await p.waitForTimeout(100);
 await p.fill('.np .nlb-l','4000');await p.fill('.np .nlb-a','180');await p.click('.np .nlb-lenbar button[type=submit], .np .np-lenbar button[type=submit]');await p.waitForTimeout(150);
 await p.screenshot({path:'h421.png'});
 /* Ctrl+Z takes the last one back off, Ctrl+Y puts it back */
 await p.keyboard.press('Escape');await p.keyboard.press('Control+z');await p.waitForTimeout(100);await p.keyboard.press('Control+y');await p.waitForTimeout(100);
 const o=(await objs()).filter(x=>x.t==='line');
 const len=x=>Math.round(Math.hypot(x.b[0]-x.a[0],x.b[1]-x.a[1]));
 ok(o.length===3&&len(o[0])===400&&len(o[1])===300&&len(o[2])===400,'three lines 4,000 / 3,000 / 4,000 mm at 1:50: '+o.map(len).join(', '));
 const joined=o.length===3&&Math.hypot(o[1].a[0]-o[0].b[0],o[1].a[1]-o[0].b[1])<1e-6&&Math.hypot(o[2].a[0]-o[1].b[0],o[2].a[1]-o[1].b[1])<1e-6;
 ok(joined&&o[1].b[1]>o[1].a[1]&&o[2].b[0]<o[2].a[0],'each starts where the last ended, going right, down, left');
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0]);bad++}
 console.log(bad?'h421: '+bad+' FAILED':'h421: all passed');
 await b.close()})();
