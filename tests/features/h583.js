// Pop-up boxes fit a tablet (made-up drawing): on a small landscape tablet screen, the drawing's 🏷 Details box is
// taller than the screen – it scrolls inside the screen and its Done button stays on screen at the bottom; Done
// closes it. Same on a phone-sized screen.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();
 for(const [W,H,what] of [[1024,600,'small tablet'],[390,700,'phone']]){
 const ctx=await b.newContext({viewport:{width:W,height:H},hasTouch:true});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 await p.click('.np-info');await p.waitForTimeout(400);
 const box=await p.locator('.dimask .dimbox').boundingBox();
 const done=await p.locator('.dimask .dimbtns [type=submit]').boundingBox();
 ok(box.y>=0&&box.y+box.height<=H+1,what+': the Details box fits on the screen');
 ok(done&&done.y>=0&&done.y+done.height<=H+1,what+': its Done button is on screen ('+Math.round(done.y)+' of '+H+')');
 await p.screenshot({path:'details-'+W+'.png'});
 await p.click('.dimask .dimbtns [type=submit]');await p.waitForTimeout(300);
 ok(!(await p.isVisible('.dimask .dimbox')),what+': Done closes it');
 }catch(e){console.log('FAIL',what,e.message);bad++;}
 await ctx.close();}
 console.log(bad?`h583: ${bad} failed`:'h583: all passed');await b.close();process.exit(bad?1:0);
})();
