// Glass order options (made-up client Sue Jones, made-up supplier): the supplier picked or typed in and saved to the
// list; a room / position per piece; the door & window obscure glass list on sealed units; laminated on every kind;
// arrised and rounded edges; heat soak and the other ticks; glass or opening size; the weight; holes measured from the
// right; countersunk holes; the PDF with all of it and a client approval line; ✍ Client sign-off like a drawing's.
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
 await p.evaluate(()=>window.__T().GLO.edit(null,{clientId:'c1',site:'4 Rolle Road, Exmouth'}));await p.waitForTimeout(500);
 const opts=async(loc)=>loc.evaluate(s=>[...s.options].map(o=>o.textContent));
 const item=i=>p.locator('.glo-item').nth(i);
 /* supplier typed in, saved to the list */
 ok(await p.locator('#glo-sup').count()===1&&await p.isVisible('#glo-supn')&&await p.isVisible('#glo-supsave'),'supplier: pick from my list, or type one with "Save this supplier to my supplier list"');
 await p.fill('#glo-supn','Example Toughening Ltd');await p.fill('#glo-supe','sales@example.com');await p.check('#glo-supsave');
 /* sealed unit: the same obscure list as doors & windows, room */
 await p.click('.glo-new[data-t=unit]');await p.waitForTimeout(300);
 const pats=await opts(item(0).locator('[data-k=pat]'));
 const wsList=await p.evaluate(()=>typeof GLS_PATTERNS!=='undefined'?GLS_PATTERNS:null);
 ok(pats.includes('Pilkington Arctic')&&pats.includes('Pilkington Stippolyte')&&pats[0]==='Clear'&&(!wsList||wsList.length===pats.length),'a sealed unit\'s obscure glass is the door & window list ('+pats.length+' choices)');
 await item(0).locator('[data-k=pat]').selectOption('Pilkington Arctic');
 await item(0).locator('[data-k=room]').fill('Bathroom window');
 await item(0).locator('[data-k=w]').fill('600');await item(0).locator('[data-k=h]').fill('900');
 ok((await opts(item(0).locator('[data-k=out]'))).includes('6.8mm acoustic laminated'),'sealed unit panes include laminated and acoustic laminated');
 ok((await opts(item(0).locator('[data-k=sz]'))).includes('Opening size – supplier to take off'),'the sizes can be the glass or the opening');
 await item(0).locator('[data-k=sz]').selectOption('Opening size – supplier to take off');
 /* handrail: laminated, interlayer, edges, ticks, weight, holes measured from the right */
 await p.click('.glo-new[data-t=rail]');await p.waitForTimeout(300);
 const th=await opts(item(1).locator('[data-k=thk]'));const it=await opts(item(1).locator('[data-k=int]'));const ed=await opts(item(1).locator('[data-k=edg]'));
 ok(th.includes('11.5mm toughened laminated')&&it.some(x=>/SentryGlas/.test(x))&&ed.includes('Arrised (sanded safe)')&&ed.includes('Rounded (pencil polished)'),'handrail panel: toughened laminated, the interlayer, and arrised / rounded edges');
 await item(1).locator('[data-k=room]').fill('Landing balustrade');
 await item(1).locator('[data-k=w]').fill('1000');await item(1).locator('[data-k=h]').fill('850');await item(1).locator('[data-k=thk]').selectOption('12mm toughened');await item(1).locator('[data-k=edg]').selectOption('Rounded (pencil polished)');
 await item(1).locator('[data-k=ex_heat]').check();await item(1).locator('[data-k=h]').dispatchEvent('input');
 ok(/about 26 kg each/.test(await item(1).locator('.glo-area').innerText()),'the weight: 1000 x 850 x 12mm is about 26 kg ('+(await item(1).locator('.glo-area').innerText())+')');
 await item(1).locator('.glo-hadd').click();await p.waitForTimeout(300);
 ok(await item(1).locator('.glo-fromsel').count()===1,'with a hole, it asks which corner to measure from');
 await item(1).locator('.glo-fromsel').selectOption('Bottom right corner');await p.waitForTimeout(400);
 ok(/From right edge/.test(await item(1).locator('.glo-hrow').innerText()),'measured from the right: the box says From right edge');
 const hr=item(1).locator('.glo-hrow').nth(0);
 await hr.locator('[data-v=d]').fill('14');await hr.locator('[data-v=x]').fill('100');await hr.locator('[data-v=y]').fill('100');await hr.locator('[data-v=cs]').selectOption('Countersunk');
 const cx=await item(1).locator('.glo-svg circle.glo-hole').getAttribute('cx');
 ok(+cx>200,'the hole 100 from the right is drawn on the right ('+cx+' of 300)');
 ok(await item(1).locator('.glo-svg .glo-zero').count()===1,'the drawing marks the corner it is measured from');
 /* colour, splash, mirror, shelf: laminated */
 await p.click('.glo-new[data-t=colour]');await p.waitForTimeout(300);
 ok((await opts(item(2).locator('[data-k=thk]'))).includes('8.8mm laminated')&&(await opts(item(2).locator('[data-k=edg]'))).includes('Bevelled'),'coloured glass: laminated thicknesses and the edge finishes');
 await item(2).locator('[data-k=w]').fill('500');await item(2).locator('[data-k=h]').fill('500');
 await item(2).locator('.glo-x').click();await p.waitForTimeout(300);
 for(const t of ['splash','mirror','shelf','pane']){await p.click('.glo-new[data-t='+t+']');await p.waitForTimeout(250);}
 const lam=await p.evaluate(()=>[...document.querySelectorAll('.glo-item')].slice(2).map(el=>[...el.querySelectorAll('[data-k=thk] option,[data-k=typ] option')].some(o=>/laminated/.test(o.textContent))));
 ok(lam.length===4&&lam.every(Boolean),'splashback, mirror, shelf and single pane all have laminated');
 for(let i=0;i<4;i++)await p.locator('.glo-item').nth(2).locator('.glo-x').click();
 /* PDF */
 await p.click('#glo-pdf');await p.waitForTimeout(3500);
 const pdf=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];if(!d)return '';const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return s});
 fs.writeFileSync('h670-order.pdf',Buffer.from(pdf,'latin1'));
 const has=re=>re.test(pdf);
 ok(has(/Obscure: Pilkington Arctic/)&&has(/Bathroom window/)&&has(/Landing balustrade/)&&has(/soak tested/)&&has(/pencil polished/)&&has(/countersunk/)&&has(/from the right edge/)&&has(/take off for fitting/)&&has(/Approved by/)&&has(/kg/),'the PDF has the obscure glass, rooms, heat soak, edges, countersunk hole from the right, opening size, weight and the client approval line');
 await p.click('#pdfbar-x').catch(()=>{});await p.waitForTimeout(300);
 /* client sign-off */
 await p.click('#glo-sign');await p.waitForTimeout(4500);
 ok(await p.isVisible('#pa-title')&&/Glass GO-001/.test(await p.inputValue('#pa-title'))&&/can be ordered/.test(await p.inputValue('#pa-stmt')),'✍ Client sign-off opens a sign-off sheet for Sue with the glass order ('+(await p.inputValue('#pa-title').catch(()=>''))+')');
 const rec=Object.values(await p.evaluate(()=>window.__st)).find(v=>v&&v.kind==='glassorder');
 ok(rec&&rec.items[1].from==='Bottom right corner'&&rec.items[1].ex_heat==='yes'&&rec.items[1].holes[0].cs==='Countersunk'&&rec.items[0].room==='Bathroom window'&&rec.items[0].pat==='Pilkington Arctic','the order is saved with all of it');
 const sup=Object.values(await p.evaluate(()=>window.__st)).find(v=>v&&v.kind==='supplier'&&v.name==='Example Toughening Ltd');
 ok(!!sup&&rec.supId,'the typed supplier is saved to the supplier list');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h670: ${bad} failed`:'h670: all passed');await b.close();process.exit(bad?1:0);
})();
