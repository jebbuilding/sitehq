// Today page (new look): a 💬 Chat card (latest conversations, unread first; tap opens the chat) and a 🏗️ Sites card
// (live sites, busiest first, with who's on site and hours this week; tap opens the site page; All sites, Map).
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(500);
 await p.evaluate(()=>{const t=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Today');t&&t.click();});await p.waitForTimeout(500);
 ok(await p.isVisible('.td-chat')&&await p.isVisible('.td-sites'),'Today has 💬 Chat and 🏗️ Sites');
 ok((await p.$$('.td-c')).length>=1&&(await p.$$('.td-s')).length>=1,'chats and live sites listed');
 const site=await p.getAttribute('.td-s','data-s');
 await p.click('.td-s');await p.waitForTimeout(600);
 ok(!(await p.$('.sttile'))&&/‹ All sites/.test(await p.innerText('#main')),'tapping a site opens its page ('+site+')');
 await p.evaluate(()=>{const t=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Today');t&&t.click();});await p.waitForTimeout(500);
 await p.click('.td-c');await p.waitForTimeout(600);
 ok(await p.isVisible('#chatwin'),'tapping a chat opens it');
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h439: '+bad+' FAILED':'h439: all passed');
 await b.close()})();
