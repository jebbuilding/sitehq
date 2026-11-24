// What's on each van (made-up vans WK21 JEB – Transit and YR19 JEB – Connect, made-up SDS drill): 📦 What's on each van
// from 🚐 Vehicles & plant. Put the drill on the Transit (the tools list then says it's on the Transit); add Expanding
// foam to its stock (3), use two (− −) so it's low; 🛒 Restock list says the Transit needs 2; Today shows it;
// ✓ Restocked fills it back to 3. Take the drill off → back in the yard. Writes h690*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["equipment/e8"]={kind:"vehicle",name:"YR19 JEB – Connect"};store["equipment/e9"]={kind:"machine",name:"SDS drill",tag:"T-009"};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({VNS,kitView,closeViewer});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 await p.click('#nl-tog').catch(()=>{});await p.waitForTimeout(400);
 await p.evaluate(()=>window.__T().VNS.open());await p.waitForTimeout(500);
 const vans=await p.$$eval('.vns-v',x=>x.map(e=>e.textContent));
 ok(vans.length===2&&/WK21/.test(vans.join())&&/YR19/.test(vans.join()),'📦 What\'s on each van: a button for each van');
 const cur=await p.getAttribute('.vns-v[aria-pressed=true]','data-v');
 await p.click(`.vns-v[data-v=e1]`);await p.waitForTimeout(300);
 await p.selectOption('#vns-tool','e9');await p.waitForTimeout(800);
 ok(await p.evaluate(()=>window.__st['equipment/e9'].out.van==='e1'),'the drill is put on the Transit');
 ok(/SDS drill/.test(await p.innerText('.vns')),'and listed under 🧰 Tools on this van');
 await p.locator('.vns-pre',{hasText:'Expanding foam'}).click();await p.waitForTimeout(700);
 await p.click('.vns-st .vns-m');await p.waitForTimeout(600);await p.click('.vns-st .vns-m');await p.waitForTimeout(600);
 let it=await p.evaluate(()=>window.__st['todos/vs-e1'].items[0]);
 ok(it.what==='Expanding foam'&&it.have===1&&it.want===3&&await p.isVisible('.vns-st.vns-lo'),'foam: has 1, should have 3 – shown low');
 ok(/Restock list \(1\)/.test(await p.innerText('#vns-low')),'🛒 Restock list (1)');
 await p.screenshot({path:'h690-van.png'});
 await p.evaluate(()=>window.__T().kitView());await p.waitForTimeout(400);
 ok(/On WK21 JEB/.test(await p.innerText('.kit')),'🧰 Tools & plant says the drill is on the Transit');
 await p.evaluate(()=>{window.__T().closeViewer();window.__S.otab='today';window.render()});await p.waitForTimeout(400);
 ok(await p.isVisible('.vns-today')&&/1 thing to restock/.test(await p.innerText('.vns-today')),'Today: 🛒 1 thing to restock on the vans');
 await p.click('#vns-today');await p.waitForTimeout(400);
 const txt=await p.inputValue('#vns-txt');
 ok(/WK21 JEB – Transit:\n- Expanding foam: 2/.test(txt),'the list: Transit – Expanding foam: 2');
 await p.screenshot({path:'h690-restock.png'});
 await p.click('#vns-done');await p.waitForTimeout(800);
 it=await p.evaluate(()=>window.__st['todos/vs-e1'].items[0]);
 ok(it.have===3,'✓ Restocked fills it back to 3');
 await p.evaluate(()=>window.__T().VNS.open('e1'));await p.waitForTimeout(400);
 await p.click('.vns-off');await p.waitForTimeout(700);
 ok(await p.evaluate(()=>!window.__st['equipment/e9'].out),'Take off – the drill is back in the yard');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h690: ${bad} failed`:'h690: all passed');await b.close();process.exit(bad?1:0);
})();
