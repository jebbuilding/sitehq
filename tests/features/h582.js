// Windows & doors: Pilkington Satin in the glass list (made-up survey). A new survey's glass list has
// "Pilkington Satin"; picking it is kept on the opening and counts as obscure glass.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('.tab[data-t=jobs]');await p.waitForTimeout(400);await p.click('#ws-new');await p.waitForTimeout(500);
 const opts=await p.evaluate(()=>[...document.querySelectorAll('#wsx-g-type option')].map(o=>o.textContent));
 ok(opts.includes('Pilkington Satin'),'the glass list has Pilkington Satin');
 await p.selectOption('#wsx-g-type','Pilkington Satin');await p.waitForTimeout(300);
 ok(await p.inputValue('#wsx-g-type')==='Pilkington Satin','it can be picked for the opening');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h582: ${bad} failed`:'h582: all passed');await b.close();process.exit(bad?1:0);
})();
