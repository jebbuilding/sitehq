const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900}});const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await ctx.route(/^https?:\/\//,r=>r.abort());
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 await p.click('.tab[data-t=signin]');await p.waitForTimeout(800);await p.click('#sb-add');await p.waitForTimeout(800);
 await p.evaluate(()=>{const el=document.getElementById('sa-site');el.selectedIndex=1});await p.click('#f-save');
 for(const t of [100,300,600,1000,1500]){await p.waitForTimeout(t===100?100:t-([100,300,600,1000,1500][[100,300,600,1000,1500].indexOf(t)-1]));console.log(t,await p.innerText('#h1'),'sheet',await p.evaluate(()=>!document.getElementById('sheet').hidden),'hist',await p.evaluate(()=>history.length))}
 await b.close()})();
