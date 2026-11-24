// Glass shapes, holes and cut-outs (made-up job): a splashback with a double socket cut-out (its usual 135 x 75 filled in)
// and one too near the edge; a 12mm handrail panel with a hole too small and too near the edge; a pane with a sloping
// top (area of the real shape); a mirror with rounded corners. The drawing follows the typing, the warnings follow the
// rules for toughened glass, and the order PDF lists them and draws each piece to scale.
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
 await p.click('.glo-new[data-t=splash]');await p.waitForTimeout(300);
 await item(0).locator('[data-k=w]').fill('1800');await item(0).locator('[data-k=h]').fill('600');
 await item(0).locator('.glo-cadd').click();await p.waitForTimeout(300);
 await item(0).locator('.glo-crow').nth(0).locator('[data-v=k]').selectOption('s2');
 ok(await item(0).locator('.glo-crow').nth(0).locator('[data-v=w]').inputValue()==='135'&&await item(0).locator('.glo-crow').nth(0).locator('[data-v=h]').inputValue()==='75','Double socket fills its usual 135 x 75');
 await item(0).locator('.glo-crow').nth(0).locator('[data-v=x]').fill('300');await item(0).locator('.glo-crow').nth(0).locator('[data-v=y]').fill('300');
 await item(0).locator('.glo-cadd').click();await p.waitForTimeout(300);
 ok(await item(0).locator('.glo-crow').nth(0).locator('[data-v=x]').inputValue()==='300','adding another cut-out keeps the first one\'s position');
 await item(0).locator('.glo-crow').nth(1).locator('[data-v=x]').fill('1790');await item(0).locator('.glo-crow').nth(1).locator('[data-v=y]').fill('300');
 ok(await item(0).locator('.glo-svg rect').count()===2,'the drawing shows both cut-outs');
 ok(/Cut-out 2 goes past the edge/.test(await item(0).locator('.glo-warn').innerText()),'a cut-out past the edge is warned about');
 await item(0).locator('.glo-crow').nth(1).locator('[data-v=x]').fill('1755');
 ok(/Cut-out 2 is \d+mm from the edge – keep at least 12mm/.test(await item(0).locator('.glo-warn').innerText()),'one closer than 2 x the glass thickness to the edge is warned about');
 await item(0).locator('.glo-crow').nth(1).locator('[data-v=x]').fill('1500');
 ok(await item(0).locator('.glo-warn').isHidden(),'moved in, no warning');
 await item(0).locator('.glo-draw').scrollIntoViewIfNeeded();await p.screenshot({path:'h669-splash.png'});
 /* 2 handrail panel with holes */
 await p.click('.glo-new[data-t=rail]');await p.waitForTimeout(300);
 await item(1).locator('[data-k=w]').fill('1000');await item(1).locator('[data-k=h]').fill('850');await item(1).locator('[data-k=thk]').selectOption('12mm toughened');
 await item(1).locator('.glo-hadd').click();await p.waitForTimeout(300);
 await item(1).locator('.glo-hrow').nth(0).locator('[data-v=d]').fill('10');await item(1).locator('.glo-hrow').nth(0).locator('[data-v=x]').fill('20');await item(1).locator('.glo-hrow').nth(0).locator('[data-v=y]').fill('100');
 const w=await item(1).locator('.glo-warn').innerText();
 ok(/Hole 1 is 10mm across – for 12mm glass it needs to be at least 12mm/.test(w)&&/Hole 1 is 15mm from the edge – keep at least 24mm/.test(w),'a 10mm hole 20mm in on 12mm glass: too small and too near the edge ('+w.replace(/\n/g,' | ')+')');
 await item(1).locator('.glo-hrow').nth(0).locator('[data-v=d]').fill('14');await item(1).locator('.glo-hrow').nth(0).locator('[data-v=x]').fill('100');
 ok(await item(1).locator('.glo-warn').isHidden(),'a 14mm hole 100mm in is fine');
 await item(1).locator('.glo-draw').scrollIntoViewIfNeeded();await p.screenshot({path:'h669-rail.png'});
 /* 3 sloping top */
 await p.click('.glo-new[data-t=pane]');await p.waitForTimeout(300);
 await item(2).locator('[data-k=w]').fill('800');await item(2).locator('[data-k=h]').fill('1000');
 await item(2).locator('.glo-shsel').selectOption('rake');await p.waitForTimeout(400);
 ok(await item(2).locator('[data-k=hs]').count()===1&&await item(2).locator('[data-k=side]').count()===1,'Sloping top asks which side is shorter and its height');
 ok(await item(0).locator('.glo-crow').count()===2&&await item(1).locator('[data-v=d]').inputValue()==='14','changing a shape keeps the other pieces');
 await item(2).locator('[data-k=hs]').fill('600');await item(2).locator('[data-k=hs]').dispatchEvent('input');
 ok(/0\.64 m²/.test(await item(2).locator('.glo-area').innerText()),'the area is the real shape: 800 wide, 600 to 1000 high = 0.64 m²');
 /* 4 rounded corners */
 await p.click('.glo-new[data-t=mirror]');await p.waitForTimeout(300);
 await item(3).locator('[data-k=w]').fill('600');await item(3).locator('[data-k=h]').fill('900');
 await item(3).locator('.glo-shsel').selectOption('radius');await p.waitForTimeout(400);
 await item(3).locator('[data-k=rad]').fill('50');await item(3).locator('[data-k=rad]').dispatchEvent('input');
 /* PDF */
 await p.click('#glo-pdf');await p.waitForTimeout(3500);
 const pdf=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];if(!d)return '';const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return s});
 fs.writeFileSync('h669-order.pdf',Buffer.from(pdf,'latin1'));
 ok(/Cut-out 1: double socket 135 x 75mm, centre 300mm from the left edge/.test(pdf)&&/Safety backing: yes/.test(pdf)&&/14mm across/.test(pdf)&&/Sloping top: left side 600mm/.test(pdf)&&/50mm radius/.test(pdf),'the PDF lists the cut-outs, holes and shapes');
 await p.click('#pdfbar-x').catch(()=>{});await p.waitForTimeout(300);
 await p.click('#f-save');await p.waitForTimeout(800);
 const rec=Object.values(await p.evaluate(()=>window.__st)).find(v=>v&&v.kind==='glassorder');
 ok(rec&&rec.items[0].cuts.length===2&&rec.items[0].cuts[0].k==='s2'&&rec.items[1].holes[0].d==='14'&&rec.items[2].shape==='rake'&&rec.items[2].hs==='600'&&rec.items[3].rad==='50','saved with the shapes, holes and cut-outs');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h669: ${bad} failed`:'h669: all passed');await b.close();process.exit(bad?1:0);
})();
