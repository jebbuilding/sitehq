// Pricing with quantity × rate lines (made-up prices). In 💷 Price this job a price is made of lines – what, how
// many, the unit, the rate – totalled as you type; lines can be added and taken out; the page shows each line under
// the price. An older lump-sum price opens as one line. Writes h623*.png.
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
 await p.click('#viewer-body .jpr-add[data-k="sup"]');await p.waitForTimeout(300);
 await p.fill('#jp-from','Builders Merchant');
 const L=(i,s)=>`#jp-lines .jp-l[data-i="${i}"] ${s}`;
 await p.fill(L(0,'.jp-ld'),'Concrete blocks');await p.fill(L(0,'.jp-lq'),'400');await p.fill(L(0,'.jp-lu'),'no.');await p.fill(L(0,'.jp-lr'),'1.20');
 ok(/£480\.00/.test(await p.innerText('#jp-tot')),'400 × £1.20 adds up to £480 as you type');
 await p.click('#jp-addl');await p.waitForTimeout(150);
 await p.fill(L(1,'.jp-ld'),'Sand');await p.fill(L(1,'.jp-lq'),'2');await p.fill(L(1,'.jp-lu'),'tonne');await p.fill(L(1,'.jp-lr'),'35');
 await p.click('#jp-addl');await p.waitForTimeout(150);
 await p.fill(L(2,'.jp-ld'),'Mistake');await p.fill(L(2,'.jp-lq'),'1');await p.fill(L(2,'.jp-lr'),'999');
 await p.click(L(2,'.jp-lx'));await p.waitForTimeout(150);
 ok(await p.locator('#jp-lines .jp-l').count()===2&&/£550\.00/.test(await p.innerText('#jp-tot')),'a line can be added and taken out: total £550');
 await p.screenshot({path:'h623-lines.png'});
 await p.click('#f-save');await p.waitForTimeout(800);
 const it=await p.evaluate(()=>{const j=(window.__S.jobFiles||[]).find(x=>x.clientId==='c1');return j&&j.items.find(i=>i.from==='Builders Merchant')});
 ok(it&&it.price===550&&it.lines.length===2&&it.lines[0].q===400&&it.lines[0].u==='no.'&&it.lines[1].r===35,'saved with its lines and £550');
 const pg=await p.innerText('#viewer-body .jpr-g');
 ok(/Concrete blocks 400 no\. × £1\.20 = £480\.00/.test(pg)&&/Sand 2 tonne × £35\.00 = £70\.00/.test(pg),'the page shows each line under the price');
 /* an older lump-sum price */
 await p.evaluate(async()=>{const S=window.__S;const j=(S.jobFiles||[]).find(x=>x.clientId==='c1');const items=j.items.concat([{id:'old1',cost:true,ck:'trade',folder:'subq',from:'Roofer',note:'Re-roof',price:3200,name:'Roofer – Re-roof'}]);await S.db.doc('todos/'+j.id).set(Object.assign({},j,{items,id:undefined}));S.jobFiles=S.jobFiles.map(x=>x.id===j.id?Object.assign({},j,{items}):x)});
 await p.evaluate(()=>document.getElementById('viewer-close').click());await p.waitForTimeout(300);await p.click('.abcard .cl-open[data-c=c1]').catch(()=>{});await p.waitForTimeout(400);
 if(await p.isVisible('#cv-price')){await p.click('#cv-price');await p.waitForTimeout(500);}
 await p.click('#viewer-body .jpr-ed[data-id="old1"]');await p.waitForTimeout(300);
 ok(await p.locator('#jp-lines .jp-l').count()===1&&await p.inputValue('#jp-lines .jp-lr')==='3200'&&await p.inputValue('#jp-lines .jp-lq')==='1','an older lump-sum price opens as one line, 1 × £3,200');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h623: ${bad} failed`:'h623: all passed');await b.close();process.exit(bad?1:0);
})();
