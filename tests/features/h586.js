// + Add has 📝 New enquiry (made-up data): tapping + Add shows "New enquiry" beside "Quick enquiry", even with a
// list of + Add choices saved before it existed; it opens the full new enquiry form ("who's it for?").
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function qaOpen() {','window.qaOpen=qaOpen;function qaOpen() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* a list saved before New enquiry existed */
 await p.evaluate(()=>{window.__S.settings=Object.assign({},window.__S.settings,{qaItems:['photo','enq','todo']});window.qaOpen();});await p.waitForTimeout(300);
 const items=await p.evaluate(()=>[...document.querySelectorAll('.qa-pop .qa-b')].map(b=>b.textContent.trim()));
 ok(items.some(t=>/New enquiry/.test(t))&&items.some(t=>/Quick enquiry/.test(t)),'+ Add shows New enquiry and Quick enquiry ('+items.join(' | ')+')');
 await p.click('.qa-pop .qa-b[data-k=newenq]');await p.waitForTimeout(400);
 ok(/New enquiry/.test(await p.innerText('#sheettitle')),'New enquiry opens the full enquiry form');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h586: ${bad} failed`:'h586: all passed');await b.close();process.exit(bad?1:0);
})();
