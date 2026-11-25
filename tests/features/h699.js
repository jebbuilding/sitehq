// Stair glass (made-up job): a toughened balustrade panel can be a Stair panel – the top and bottom follow the stairs – with
// the angle (42°) and which way it rises; a sloping top can be given by its angle (30° works out the short side); and a
// sloping bottom with a level top. The drawing slopes, the area is the real glass, and the PDF gives the angle, the
// sloping edge length and the overall size. Writes h699*.png / .pdf.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({GLO});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(400);
 await p.evaluate(()=>window.__T().GLO.edit(null,{}));await p.waitForTimeout(500);
 await p.fill('#glo-supn','Example Glass Ltd');
 const item=i=>p.locator('.glo-item').nth(i);
 /* 1 splashback with cut-outs */
 /* a stair panel: top and bottom follow a 42° stair */
 await p.click('.glo-new[data-t=rail]');await p.waitForTimeout(300);
 await item(0).locator('[data-k=w]').fill('1000');await item(0).locator('[data-k=h]').fill('900');
 const opts=await item(0).locator('.glo-shsel option').allTextContents();
 ok(opts.some(t=>/Stair panel/.test(t))&&opts.some(t=>/Sloping bottom/.test(t)),'shapes include Stair panel and Sloping bottom');
 await item(0).locator('.glo-shsel').selectOption('stair');await p.waitForTimeout(400);
 ok(await item(0).locator('[data-k=ang]').count()===1&&await item(0).locator('[data-k=side]').count()===1,'a stair panel asks the angle of the stairs and which way it rises');
 await item(0).locator('[data-k=ang]').fill('42');await item(0).locator('[data-k=ang]').dispatchEvent('input');await p.waitForTimeout(400);
 ok(/0\.9 m²|0\.90 m²/.test(await item(0).locator('.glo-area').innerText()),'its area is width × plumb height: 1000 × 900 = 0.9 m² ('+(await item(0).locator('.glo-area').innerText())+')');
 const pts=await item(0).locator('svg polygon').first().getAttribute('points');
 const ys=pts.split(' ').map(q=>+q.split(',')[1]);
 ok(ys[0]!==ys[1],'the drawing slopes top and bottom');
 await item(0).locator('svg').first().screenshot({path:'h699-stair.png'});
 /* a sloping top by angle */
 await p.click('.glo-new[data-t=rail]');await p.waitForTimeout(300);
 await item(1).locator('[data-k=w]').fill('1000');await item(1).locator('[data-k=h]').fill('1200');
 await item(1).locator('.glo-shsel').selectOption('rake');await p.waitForTimeout(400);
 await item(1).locator('[data-k=ang]').fill('30');await item(1).locator('[data-k=ang]').dispatchEvent('input');await p.waitForTimeout(400);
 /* sloping bottom */
 await p.click('.glo-new[data-t=rail]');await p.waitForTimeout(300);
 await item(2).locator('[data-k=w]').fill('800');await item(2).locator('[data-k=h]').fill('1100');
 await item(2).locator('.glo-shsel').selectOption('rakeb');await p.waitForTimeout(400);
 await item(2).locator('[data-k=hs]').fill('700');await item(2).locator('[data-k=hs]').dispatchEvent('input');await p.waitForTimeout(400);
 await p.screenshot({path:'h699-form.png'});
 await p.click('#glo-pdf');await p.waitForTimeout(4000);
 const pdf=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];if(!d)return '';const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return s});
 fs.writeFileSync('h699-survey.pdf',Buffer.from(pdf,'latin1'));
 ok(/Stair panel: 42/.test(pdf)&&/1346mm long/.test(pdf)&&/1000 x 1800mm/.test(pdf),'the PDF: stair panel at 42°, sloping edges 1346mm, overall 1000 x 1800');
 ok(/Sloping top/.test(pdf)&&/30/.test(pdf)&&/side 623mm/.test(pdf),'sloping top by angle: 30° works out the short side, 623mm');
 ok(/Sloping bottom/.test(pdf)&&/side 700mm/.test(pdf)&&/top level/.test(pdf),'sloping bottom: 700mm short side, level top');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h699: ${bad} failed`:'h699: all passed');await b.close();process.exit(bad?1:0);
})();
