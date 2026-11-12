// Client → site (made-up client Bob Lee, a new enquiry): 🏗️ Make it a site sits near the top of his page, by Call and
// Text; tapping it makes the site and moves him to On site (not Accepted), so the client list's On site tab shows him;
// the button then reads 🏗️ Open the site.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+'store["todos/c2"].address="9 Test Lane, Exmouth";store["todos/c2"].postcode="EX8 3ZZ";');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='clients';window.__S.f.clf='all';window.render()});await p.waitForTimeout(400);
 await p.click('.abcard .cl-open[data-c=c2]');await p.waitForTimeout(500);
 const y=await p.evaluate(()=>{const s=document.getElementById('cv-site').getBoundingClientRect();return s.top});
 ok(y>0&&y<600,'🏗️ Make it a site is near the top of his page, without scrolling ('+Math.round(y)+'px down)');
 await p.screenshot({path:OUT+'site-1-client.png'});
 await p.click('#cv-site');await p.waitForTimeout(1500);
 const r=await p.evaluate(()=>window.__st['todos/c2']);
 ok(r.stage==='onsite'&&/9 Test Lane/.test(r.site||''),'the site is made and he moves to On site ('+r.stage+')');
 ok(await p.evaluate(()=>Object.values(window.__st).some(v=>v&&/9 Test Lane/.test(v.name||'')&&v.client==='Bob Lee')),'the site is in Sites, and it\'s his');
 ok(await p.isVisible('#cv-gosite')&&/Open the site/.test(await p.innerText('#cv-gosite')),'the button now opens the site');
 await p.evaluate(()=>{const x=document.querySelector('.vclose,#vclose,[aria-label="Close"]');x&&x.click();window.__S.otab='clients';window.__S.f.clf='onsite';window.render()});await p.waitForTimeout(400);
 ok(await p.locator('.abcard .cl-open[data-c=c2]').count()===1,'the On site tab lists him');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h508: ${bad} failed`:'h508: all passed');await b.close();process.exit(bad?1:0);
})();
