// The job stage "On site" is called "Active site" (made-up client Sue Jones, stage onsite): the Clients filter says
// Active site and lists her, her card's stage says Active site; "on site now" (where people are) is unchanged.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed.replace('stage:"won",portalCode','stage:"onsite",portalCode'));
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:900}});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 ok(await p.evaluate(()=>window.__st['todos/c1'].stage==='onsite'),'Sue is at the on-site stage (saved as before)');
 await p.click('#tabs .tab[data-t=clients]');await p.waitForTimeout(500);
 const t=await p.innerText('#main');
 ok(/Active site/.test(t),'the Clients page says Active site');
 ok(!/\bOn site\b/.test(t),'and doesn\'t say On site');
 ok(await p.locator('.abcard .cl-open[data-c=c1]').count()===1,'Sue is listed under Active site');
 ok(/accepted or active site/.test(t),'the summary says "accepted or active site"');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h532: ${bad} failed`:'h532: all passed');await b.close();process.exit(bad?1:0);
})();
