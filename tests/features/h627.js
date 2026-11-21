// Menus: each firm names, orders and hides its own sections and pages (made-up data).
// Setup › 🧭 Menus: rename a side-menu section, move it up, hide one; rename a page and hide one; rename a trades'
// page; ↺ back to standard. Writes h627*.png.
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
 const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(300);
 await p.evaluate(()=>{const S=window.__S;S.otab='setup';S.f.stab='menus';window.render()});await p.waitForTimeout(400);
 ok(await p.locator('#main .mnu-row .mnu-sn').count()>5,'Setup › Menus lists the side menu sections');
 const side=async()=>p.evaluate(()=>[...document.querySelectorAll('.nl-b')].map(b=>b.dataset.s+':'+b.querySelector('.nl-lw').textContent));
 const before=await side();
 /* rename Jobs & clients, move Money (or whatever is 3rd) up, hide Papers */
 await p.fill('#main .mnu-row[data-k="jobs"] .mnu-sn','Contracts');
 const keys=await p.evaluate(()=>[...document.querySelectorAll('#main .mnu-row .mnu-sn')].map(i=>i.closest('.mnu-row').dataset.k));
 const mover=keys[2];
 await p.click(`#main .mnu-row[data-k="${mover}"] .mnu-up`);
 const hid=keys.find(k=>k!=='setup'&&k!=='jobs'&&k!==mover);
 await p.check(`#main .mnu-row[data-k="${hid}"] .mnu-sh`);
 await p.fill('#main .mnu-tab[data-k="sales"] .mnu-tn','Quotes and bills');
 await p.check('#main .mnu-tab[data-k="estim"] .mnu-th');
 await p.fill('#main .mnu-emp[data-k="plans"] .mnu-en','My jobs');
 await p.screenshot({path:'h627-setup.png',fullPage:true});
 await p.click('#mnu-save');await p.waitForTimeout(700);
 const after=await side();
 ok(after.some(x=>x==='jobs:Contracts'),'the side menu shows the new section name');
 ok(after.findIndex(x=>x.startsWith(mover+':'))<after.findIndex(x=>x.startsWith(keys[1]+':')),'the section moved up the side menu');
 ok(!after.some(x=>x.startsWith(hid+':'))&&before.some(x=>x.startsWith(hid+':')),'the hidden section is gone from the side menu');
 ok(after[0].startsWith('today:')&&after.some(x=>x.startsWith('setup:')),'Today stays first and Setup stays');
 const st=await p.evaluate(()=>Object.values(window.__st).find(v=>v&&v.menus));
 ok(st&&st.menus.sec.jobs==='Contracts'&&st.menus.tab.sales==='Quotes and bills'&&st.menus.emp.plans==='My jobs','saved for the whole firm');
 /* the section page uses the page names and hides the hidden page */
 let sec='';for(const s of after.map(x=>x.split(':')[0])){await p.click(`.nl-b[data-s="${s}"]`);await p.waitForTimeout(400);if(await p.locator('#main .nl-go[data-t="sales"]').count()){sec=await p.innerText('#main');break}}
 ok(/Quotes and bills/.test(sec),'the section page shows the renamed page');
 ok(!/Estimating/.test(sec),'the hidden page is not on the section page');
 await p.screenshot({path:'h627-section.png'});
 ok(await p.evaluate(()=>{const b=document.querySelector('#tabs [data-t="sales"],#tabs button[data-tab="sales"]');return !b||/Quotes and bills/.test(b.textContent)}),'the tab row uses the new name too');
 /* back to standard */
 await p.evaluate(()=>{const S=window.__S;S.otab='setup';S.f.stab='menus';window.render()});await p.waitForTimeout(400);
 await p.click('#mnu-std');await p.waitForTimeout(700);
 ok(JSON.stringify(await side())===JSON.stringify(before),'↺ puts the standard names and order back');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h627: ${bad} failed`:'h627: all passed');await b.close();process.exit(bad?1:0);
})();
