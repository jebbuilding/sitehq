// Comparing quotes (made-up merchants and prices). In 💷 Price this job, ⇄ Compare on a price adds another quote for
// the same thing with the same lines and quantities, rates to fill in; the quotes sit together, the cheapest counts
// until one is ticked ✓, the others are kept but not added in, and the totals follow the one in use.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1150,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.evaluate(()=>{const S=window.__S;S.otab='clients';S.f.clf='all';window.render()});await p.waitForTimeout(400);
 await p.click('.abcard .cl-open[data-c=c1]');await p.waitForTimeout(500);await p.click('#cv-price');await p.waitForTimeout(500);
 const L=(i,s)=>`#jp-lines .jp-l[data-i="${i}"] ${s}`;
 await p.click('#viewer-body .jpr-add[data-k="sup"]');await p.waitForTimeout(300);
 await p.fill('#jp-from','Merchant A');await p.fill('#jp-what','Blocks and sand');
 await p.fill(L(0,'.jp-ld'),'Blocks');await p.fill(L(0,'.jp-lq'),'400');await p.fill(L(0,'.jp-lu'),'no.');await p.fill(L(0,'.jp-lr'),'1.20');
 await p.click('#f-save');await p.waitForTimeout(800);
 const total=()=>p.evaluate(()=>{const r=[...document.querySelectorAll('#viewer-body .jpr-sum .drow')].find(x=>/Total of your costs/.test(x.innerText));return r?r.innerText.replace(/\s+/g,' '):''});
 ok(/£480\.00/.test(await total()),'one price: total £480');
 await p.click('#viewer-body .jpr-cmp');await p.waitForTimeout(400);
 ok(/Another quote for the same thing/.test(await p.innerText('#sheet'))&&await p.inputValue(L(0,'.jp-lq'))==='400'&&await p.inputValue(L(0,'.jp-lr'))===''&&await p.inputValue('#jp-what')==='Blocks and sand','⇄ Compare opens another quote with the same lines and quantities, rates to fill in');
 await p.fill('#jp-from','Merchant B');await p.fill(L(0,'.jp-lr'),'1.05');
 await p.click('#f-save');await p.waitForTimeout(800);
 ok(await p.locator('#viewer-body .jpr-cbox .jpr-row').count()===2,'the two quotes sit together');
 ok(/£420\.00/.test(await total()),'the cheaper one (B, £420) counts, the other isn\'t added in');
 ok(/Merchant B/.test(await p.innerText('#viewer-body .jpr-cbox .jpr-row.jpr-on'))&&/Cheapest/.test(await p.innerText('#viewer-body .jpr-cbox')),'B is marked cheapest and in use');
 ok(/£420.00/.test(await p.innerText('#viewer-body .edc-card')),'About this job counts only the quote in use (£420)');
 await p.screenshot({path:'h626-compare.png'});
 const aId=await p.evaluate(()=>{const j=(window.__S.jobFiles||[]).find(x=>x.clientId==='c1');return j.items.find(i=>i.from==='Merchant A').id});
 await p.click(`#viewer-body .jpr-use[data-id="${aId}"]`);await p.waitForTimeout(800);
 ok(/£480\.00/.test(await total())&&/Merchant A/.test(await p.innerText('#viewer-body .jpr-cbox .jpr-row.jpr-on')),'✓ on A uses A instead: total £480');
 await p.click('#jpr-est');await p.waitForTimeout(700);
 const est=await p.evaluate(()=>[...document.querySelectorAll('#sd-lines .sd-line .sd-la')].map(x=>+x.value));
 ok(est.length===1&&Math.abs(est[0]-576)<0.01,'the estimate uses the chosen quote (480 + 20% = £576)');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h626: ${bad} failed`:'h626: all passed');await b.close();process.exit(bad?1:0);
})();
