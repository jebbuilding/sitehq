// Measurements on the glass drawing (made-up splashback): each hole and cut-out gets a line from the 0 edges with the
// number typed; cut-outs can be measured to their centre or to their nearest edge (the line stops there, and the PDF
// says so); holes are always to the centre.
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
 const it=p.locator('.glo-item').nth(0);
 await p.click('.glo-new[data-t=splash]');await p.waitForTimeout(300);
 await it.locator('[data-k=w]').fill('1800');await it.locator('[data-k=h]').fill('600');
 await it.locator('.glo-cadd').click();await p.waitForTimeout(300);
 const c=it.locator('.glo-crow').nth(0);
 await c.locator('[data-v=k]').selectOption('s2');await c.locator('[data-v=x]').fill('300');await c.locator('[data-v=y]').fill('250');await c.locator('[data-v=y]').dispatchEvent('input');
 ok(await it.locator('.glo-svg line.glo-dl').count()===2,'the drawing shows two measurement lines to the cut-out');
 const t=await it.locator('.glo-svg .glo-dt').allTextContents();
 ok(t.includes('300')&&t.includes('250'),'with the numbers typed: '+t.join(', '));
 const centre=await it.locator('.glo-svg line.glo-dl').first().getAttribute('x2');
 ok(await c.locator('[data-v=to]').count()===1,'each cut-out: measured to its centre or its nearest edge');
 await c.locator('[data-v=to]').selectOption('Nearest edge');await p.waitForTimeout(400);
 ok(/to its edge/.test(await it.locator('.glo-crow [data-v=x]').getAttribute('placeholder')),'the boxes say "to its edge"');
 const edge=await it.locator('.glo-svg line.glo-dl').first().getAttribute('x2');
 const rect=await it.locator('.glo-svg rect.glo-hole').getAttribute('x');
 ok(Math.abs(+edge-+rect)<0.2,'measured to the edge: the line stops at the cut-out\'s near side');
 const rx2=+rect;await c.locator('[data-v=to]').selectOption('Centre');await p.waitForTimeout(400);
 const rect2=await it.locator('.glo-svg rect.glo-hole').getAttribute('x');
 ok(+rect2<rx2,'the same 300 to the edge puts the cut-out further in than 300 to its centre');
 await c.locator('[data-v=to]').selectOption('Nearest edge');await p.waitForTimeout(400);
 await it.locator('.glo-hadd').click();await p.waitForTimeout(300);
 const h=it.locator('.glo-hrow').nth(0);await h.locator('[data-v=d]').fill('8');await h.locator('[data-v=x]').fill('900');await h.locator('[data-v=y]').fill('500');await h.locator('[data-v=y]').dispatchEvent('input');
 ok(await it.locator('.glo-svg line.glo-dl').count()===4,'a hole gets its two measurement lines too');
 await h.locator('[data-v=to]').selectOption('Nearest edge');await p.waitForTimeout(400);
 const hl=await it.locator('.glo-svg line.glo-dl').nth(0).getAttribute('x2');const hc=await it.locator('.glo-svg circle.glo-hole').getAttribute('cx');const hr=await it.locator('.glo-svg circle.glo-hole').getAttribute('r');
 ok(+hl<+hc-0.5&&/to its edge/.test(await it.locator('.glo-hrow [data-v=x]').getAttribute('placeholder')),'a hole can be measured to its edge too: the line stops at the side of the hole');
 await it.locator('.glo-cadd').click();await p.waitForTimeout(300);
 const c2=it.locator('.glo-crow').nth(1);await c2.locator('[data-v=x]').fill('1500');await c2.locator('[data-v=y]').fill('300');await c2.locator('[data-v=y]').dispatchEvent('input');
 ok(await it.locator('.glo-crow').nth(0).locator('[data-v=to]').inputValue()==='Nearest edge'&&await c2.locator('[data-v=to]').inputValue()==='Centre','each cut-out keeps its own choice: C1 to its edge, C2 to its centre');
 await it.locator('.glo-draw').scrollIntoViewIfNeeded();await p.screenshot({path:'h671-dims.png'});
 await p.click('#glo-pdf');await p.waitForTimeout(3500);
 const pdf=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return s});
 fs.writeFileSync('h671-order.pdf',Buffer.from(pdf,'latin1'));
 ok(/its nearest edge 300mm/.test(pdf)&&/its nearest edge 900mm/.test(pdf)&&/1500mm from the left/.test(pdf)&&(pdf.match(/nearest edge/g)||[]).length===2,'the PDF says what each is measured to');
 ok((pdf.match(/\(300\) Tj|\(250\) Tj|\(900\) Tj|\(500\) Tj/g)||[]).length>=4,'and writes the measurements on the drawing');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h671: ${bad} failed`:'h671: all passed');await b.close();process.exit(bad?1:0);
})();
