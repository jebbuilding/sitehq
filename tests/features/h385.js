const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900}});const p=await ctx.newPage();await ctx.route(/^https?:\/\//,r=>r.abort());
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 for(const [tab,btn] of [['signin','#sb-add'],['suppliers','#su-add, #newSup, .btn.primary']]){await p.click('.tab[data-t='+tab+']');await p.waitForTimeout(800);const h0=await p.innerText('#h1');const b1=p.locator(btn).first();if(!await b1.count()){console.log(tab,'no button');continue}await b1.click();await p.waitForTimeout(800);await p.click('#f-cancel');await p.waitForTimeout(1200);console.log(tab,'before',h0,'after',await p.innerText('#h1'))}
 await b.close()})();
