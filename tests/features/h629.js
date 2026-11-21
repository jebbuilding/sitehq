// 🙋 Me (made-up data): James's own page, like a trade's – a button by Search opens the trades' look as himself, with
// My timesheet and My day work on its Today, and 🏢 Office / ‹ Back to the office to return. Writes h629*.png.
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
 const ctx=await b.newContext({viewport:{width:1100,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(300);
 const nSec=await p.locator('#nlbar .nl-b').count();
 ok(await p.isVisible('#me-btn'),'🙋 Me is at the top, by Search');
 await p.click('#me-btn');await p.waitForTimeout(600);
 ok(await p.evaluate(()=>window.__S.preview&&window.__S.tab==='home'),'it opens my own page on its Today');
 ok(await p.isVisible('#tlbar')&&!await p.isVisible('#nlbar'),'with the trades\' bar instead of the office menu');
 ok(await p.isHidden('#me-btn'),'the Me button hides while on my page');
 const main=await p.innerText('#main');
 ok(/My timesheet/.test(main)&&/My day work/.test(main),'my Today has My timesheet and My day work');
 ok(/Back to the office/.test(main),'and a clear way back to the office');
 await p.screenshot({path:'h629-me.png'});
 await p.click('#main .tl-go[data-t="time"], #main [data-t="time"] >> nth=0');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>window.__S.tab==='time')&&await p.locator('#main').count(),'My timesheet opens my own timesheet');
 ok(await p.locator('#tlbar .tl-b[data-t="__office"]').count()===1,'🏢 Office is on the bar');
 await p.click('#tlbar .tl-b[data-t="__office"]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>!window.__S.preview)&&await p.isVisible('#nlbar')&&!await p.isVisible('#tlbar'),'🏢 Office goes back to the office view');
 ok(await p.locator('#nlbar .nl-b').count()===nSec,'the side menu has no extra section');
 /* on a phone */
 await p.setViewportSize({width:390,height:844});await p.click('#me-btn');await p.waitForTimeout(600);
 await p.screenshot({path:'h629-phone.png'});
 await p.click('#endprev');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!window.__S.preview),'‹ Back to the office works too');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h629: ${bad} failed`:'h629: all passed');await b.close();process.exit(bad?1:0);
})();
