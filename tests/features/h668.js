// Glass order (made-up client Sue Jones, made-up supplier): Job sheets has 🪟 Glass order beside the door & window survey.
// A sealed unit, a toughened handrail panel and a splashback, each with its own questions; the area works itself out;
// choosing the client fills her site. 📄 PDF makes the order; Save keeps it (listed on Job sheets and her job page);
// 📧 Send to supplier emails it and marks it sent.
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
 await p.addInitScript(()=>{window.__mail=[];const o=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(/^mailto:/.test(this.href)){window.__mail.push(this.href);return}return o.call(this)};try{navigator.canShare=()=>false}catch(e){}});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__mail=[];const o=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(/^mailto:/.test(this.href)){window.__mail.push(this.href);return}return o.call(this)};navigator.canShare=()=>false;});
 await p.click('#nl-tog');await p.waitForTimeout(400);
 await p.evaluate(()=>{window.__S.otab='jobs';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('#glo-new')&&await p.isVisible('#ws-new'),'Job sheets has 🪟 Glass order beside 🪟 Door & window survey');
 await p.click('#glo-new');await p.waitForTimeout(500);
 ok(/Glass order GO-001/.test(await p.innerText('#sheettitle')),'a new glass order, GO-001');
 const kinds=await p.$$eval('.glo-new',x=>x.map(b=>b.textContent.trim()));
 ok(['Sealed unit','handrail','Coloured glass','Splashback','Mirror','Single pane','Shelf','Something else'].every(k=>kinds.some(t=>t.includes(k))),'it can add: '+kinds.join(' / '));
 await p.selectOption('#glo-cl','c1');await p.dispatchEvent('#glo-cl','change');
 const site=await p.evaluate(()=>document.getElementById('glo-site').value);
 ok(site==='4 Rolle Road, Exmouth','choosing Sue fills her site ('+site+')');
 await p.fill('#glo-supn','Example Glass Ltd');await p.fill('#glo-supe','orders@example.com');
 /* a sealed unit */
 await p.click('.glo-new[data-t=unit]');await p.waitForTimeout(400);
 let it=p.locator('.glo-item').nth(0);
 ok(await it.locator('[data-k=spc]').count()===1&&await it.locator('[data-k=gas]').count()===1&&await it.locator('[data-k=out]').count()===1,'a sealed unit asks for the panes, spacer bar and gas');
 await it.locator('[data-k=qty]').fill('2');await it.locator('[data-k=w]').fill('900');await it.locator('[data-k=h]').fill('1100');await it.locator('[data-k=h]').dispatchEvent('input');
 await it.locator('[data-k=out]').selectOption('4mm toughened');
 ok(/1\.98 m²/.test(await it.locator('.glo-area').innerText()),'2 at 900 × 1100 = 1.98 m²');
 /* a handrail panel */
 await p.click('.glo-new[data-t=rail]');await p.waitForTimeout(400);
 it=p.locator('.glo-item').nth(1);
 ok(await it.locator('[data-k=hol]').count()===1&&/12mm toughened/.test(await it.locator('[data-k=thk]').innerText()),'a handrail panel asks for the thickness, edges, fixing and holes');
 await it.locator('[data-k=w]').fill('1000');await it.locator('[data-k=h]').fill('850');await it.locator('[data-k=thk]').selectOption('12mm toughened');
 ok(await p.inputValue('.glo-item:nth-of-type(1) [data-k=w]')==='900','the sealed unit kept its sizes after adding another');
 /* a splashback */
 await p.click('.glo-new[data-t=splash]');await p.waitForTimeout(400);
 it=p.locator('.glo-item').nth(2);
 await it.locator('[data-k=w]').fill('1800');await it.locator('[data-k=h]').fill('600');await it.locator('[data-k=col]').fill('RAL 9010 white');await it.locator('[data-k=cut]').fill('2 double sockets, 300 from the left');
 await p.locator('.glo-item').nth(2).scrollIntoViewIfNeeded();await p.screenshot({path:'h668-form.png'});
 /* the PDF */
 await p.click('#glo-pdf');await p.waitForTimeout(3500);
 const pdf=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];if(!d)return '';const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return d.filename+'\n'+s});
 ok(/^Glass order GO-001/.test(pdf)&&/Glass order/.test(pdf)&&/900 x 1100/.test(pdf)&&/Sealed unit/.test(pdf)&&/RAL 9010/.test(pdf)&&/Example Glass Ltd/.test(pdf),'📄 PDF: the order with the sizes, what each is and the supplier');
 fs.writeFileSync('h668-order.pdf',Buffer.from(await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return btoa(s)}),'base64'));await p.click('#pdfbar-x').catch(()=>{});await p.waitForTimeout(300);
 /* save */
 await p.click('#f-save');await p.waitForTimeout(800);
 let rec=Object.values(await p.evaluate(()=>window.__st)).find(v=>v&&v.kind==='glassorder');
 ok(rec&&rec.items.length===3&&rec.items[0].qty==='2'&&rec.items[0].out==='4mm toughened'&&rec.items[2].col==='RAL 9010 white'&&rec.clientId==='c1','saved with its 3 pieces');
 ok(/GO-001/.test(await p.innerText('#glo-jl')),'listed on Job sheets');
 /* send */
 await p.click('#glo-jl .glo-row');await p.waitForTimeout(500);
 await p.click('#glo-send');await p.waitForTimeout(3500);
 const m=await p.evaluate(()=>window.__mail.slice(-1)[0]||'');
 ok(/^mailto:orders%40example\.com/.test(m)&&/900%20x%201100/.test(m),'📧 Send to supplier emails orders@example.com with the order written out');
 rec=Object.values(await p.evaluate(()=>window.__st)).find(v=>v&&v.kind==='glassorder');
 ok(rec.status==='sent','and marks it sent');
 await p.click('#f-cancel').catch(()=>{});await p.waitForTimeout(300);
 /* on Sue's job page */
 await p.evaluate(()=>{window.__S.otab='clients';window.__S.f.clf='all';window.render()});await p.waitForTimeout(400);
 await p.click('.cl-open[data-c="c1"]');await p.waitForTimeout(700);
 ok(await p.isVisible('#glo-cnew')&&/GO-001/.test(await p.innerText('#glo-cl-list')),'Sue\'s job page lists GO-001 with 🪟 Glass order');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h668: ${bad} failed`:'h668: all passed');await b.close();process.exit(bad?1:0);
})();
