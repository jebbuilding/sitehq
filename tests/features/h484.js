// Merchants › 📦 Orders › 💬 Ask merchants for prices (made-up merchants A and B): 100 blocks and 10 bags of sand for
// 4 Rolle Road. Merchant A's price list has blocks at £1.50 (filled in by itself); James types A's sand £4.20 and B's
// prices £1.40 and £4.50. Side by side, B is cheapest for blocks and A for sand; ordering each line from the cheapest
// makes two orders: 100 blocks from B (£140) and 10 sand from A (£42).
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/sup-ma"]={kind:"supplier",name:"Test Merchant A",email:"a@example.com"};store["todos/sup-mb"]={kind:"supplier",name:"Test Merchant B",email:"b@example.com"};'+
 'store["todos/pl-sup-ma"]={kind:"pricelist",sup:"sup-ma",items:[{n:"Dense block 100mm",u:"each",p:1.5}]};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{navigator.canShare=()=>false;window.__links=[];HTMLAnchorElement.prototype.click=function(){window.__links.push(this.href)};window.__S.otab='suppliers';window.__S.f.merTab='orders';window.render()});await p.waitForTimeout(500);
 await p.click('#rfq-new');await p.waitForTimeout(300);
 await p.selectOption('#rfq-site','4 Rolle Road, Exmouth');await p.fill('#rfq-title','Extension blockwork');
 await p.fill('.rfq-d','Dense block 100mm');await p.fill('.rfq-q','100');await p.fill('.rfq-u','each');
 await p.click('#rfq-add');await p.locator('.rfq-d').nth(1).fill('Sharp sand');await p.locator('.rfq-q').nth(1).fill('10');await p.locator('.rfq-u').nth(1).fill('bag');
 await p.check('.rfq-sup[value=sup-ma]');await p.check('.rfq-sup[value=sup-mb]');
 await p.click('#f-save');await p.waitForTimeout(3500);
 const L=await p.evaluate(()=>window.__links);console.log(L.map(x=>x.slice(0,40)));
 ok(L.filter(x=>/^mailto:/.test(x)).length===2&&L.some(x=>x.startsWith('mailto:a%40example.com')||x.startsWith('mailto:a@example.com')),'each merchant gets the request by email');
 ok(await p.evaluate(()=>(window.__dl||[]).filter(x=>/Price request/.test(x.filename)).length)===2,'with a PDF of the list for each');
 ok(await p.inputValue('.rfq-p[data-s=sup-ma][data-i="0"]')==='1.5','merchant A\'s price list fills in their block price');
 const set=async(s,i,v)=>{await p.fill(`.rfq-p[data-s=${s}][data-i="${i}"]`,v);await p.dispatchEvent(`.rfq-p[data-s=${s}][data-i="${i}"]`,'change');await p.waitForTimeout(500);};
 await set('sup-ma',1,'4.20');await set('sup-mb',0,'1.40');await set('sup-mb',1,'4.50');
 const best=await p.$$eval('td.rfq-best .rfq-p',x=>x.map(i=>i.dataset.s+':'+i.dataset.i));console.log(best);
 ok(best.includes('sup-mb:0')&&best.includes('sup-ma:1'),'B is cheapest for blocks, A for sand');
 ok(/Cheapest for each line: £182\.00/.test(await p.innerText('#viewer-body')),'cheapest total £182 (£140 + £42)');
 await p.click('#rfq-best');await p.waitForTimeout(1200);
 const pos=await p.evaluate(()=>Object.values(window.__st).filter(v=>v&&v.kind==='purchaseorder').map(o=>[o.sup,o.net,o.lines.map(l=>l.d).join('+')]));console.log(JSON.stringify(pos));
 ok(pos.length===2&&pos.some(o=>o[0]==='sup-mb'&&o[1]===140&&o[2]==='Dense block 100mm')&&pos.some(o=>o[0]==='sup-ma'&&o[1]===42&&o[2]==='Sharp sand'),'two orders: blocks from B (£140), sand from A (£42)');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h484: ${bad} failed`:'h484: all passed');await b.close();process.exit(bad?1:0);
})();
