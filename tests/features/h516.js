// Today doesn't grow and grow (made-up sites): with 14 live sites, the 🏗️ Sites card lists them all in its own scrolling
// box instead of making the page longer; This week and Today's jobs scroll in their own boxes too.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
let extra='';for(let i=1;i<=14;i++)extra+='store["sites/t'+i+'"]={name:"'+i+' Test Street, Exmouth",created:'+i+'};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:950},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(500);
 await p.click('.nl-b[data-s=today]');await p.waitForTimeout(600);
 const s=await p.evaluate(()=>{const l=document.querySelector('.td-sites .td-list');if(!l)return null;const cs=getComputedStyle(l);return {n:l.querySelectorAll('.td-s').length,scroll:l.scrollHeight>l.clientHeight,oy:cs.overflowY,h:l.clientHeight}});
 ok(s&&s.n>=14,'the Sites card lists every live site ('+(s&&s.n)+')');
 ok(s&&s.scroll&&s.oy==='auto'&&s.h<=360,'in its own scrolling box, no taller than 360px ('+(s&&s.h)+'px)');
 const w=await p.evaluate(()=>[...document.querySelectorAll('.tdw-wrap')].map(x=>getComputedStyle(x).maxHeight));
 ok(w.length>=1&&w.every(x=>x==='460px'),'This week and Today\'s jobs scroll in their own boxes ('+w.join(',')+')');
 await p.locator('.td-sites').scrollIntoViewIfNeeded();await p.screenshot({path:OUT+'today-scroll.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h516: ${bad} failed`:'h516: all passed');await b.close();process.exit(bad?1:0);
})();
