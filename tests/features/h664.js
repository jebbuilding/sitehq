// Jobs & clients › 📬 Enquiries (made-up data) opens Clients on the enquiries still to see (Job to see), not on Active site
// (James, Nov 2026: it took him to active sites). 👥 Clients still opens on Active site.
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
 await p.click('.nl-b[data-s="jobs"]');await p.waitForTimeout(400);
 ok(await p.isVisible('.jb-tabs [data-v="enq"]'),'Jobs & clients has 📬 Enquiries along the top');
 await p.click('.jb-tabs [data-v="enq"]');await p.waitForTimeout(600);
 const on=()=>p.evaluate(()=>{const b=document.querySelector('.clf[aria-pressed=true]');return b?b.innerText.replace(/\s+/g,' ').trim():''});
 const f=await on();
 ok(/Job to see/.test(f),'📬 Enquiries opens Clients on Job to see ('+f+')');
 await p.screenshot({path:'h664-enq.png'});
 await p.click('.nl-b[data-s="jobs"]');await p.waitForTimeout(400);
 await p.click('.jb-tabs [data-v="clients"]');await p.waitForTimeout(600);
 ok(/Active site/.test(await on()),'👥 Clients still opens on Active site');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h664: ${bad} failed`:'h664: all passed');await b.close();process.exit(bad?1:0);
})();
