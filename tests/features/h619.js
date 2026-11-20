// 📅 Calendar for everyone. James's side menu has 📅 Calendar right under Today, opening the planner in one tap; the
// trades' bottom bar says 📅 Calendar for the same. Writes h619*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes(DD)&&page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1150,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(300);
 const order=await p.evaluate(()=>[...document.querySelectorAll('.nl-b')].map(b=>b.dataset.s));
 ok(order[0]==='today'&&order[1]==='cal','📅 Calendar is in the side menu, right under Today ('+order.slice(0,3).join(', ')+')');
 await p.click('.nl-b[data-s="cal"]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>window.__S.otab==='planner'),'one tap opens the calendar (the planner)');
 ok(await p.isVisible('.nl-b[data-s="cal"][aria-current="page"]'),'and Calendar shows as the page you\'re on');
 await p.screenshot({path:'h619-owner.png'});
 const t=await ctx.newPage();t.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await t.addInitScript(()=>{try{localStorage.setItem('jeb.tradelook','true')}catch(e){}});
 await t.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src.replace(DD,'function detailsDone(d){return true}')+'</body></html>');await t.waitForTimeout(2500);await t.keyboard.press('Escape');
 await t.evaluate(()=>window.render());await t.waitForTimeout(400);
 const tb=await t.evaluate(()=>{const bs=[...document.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>b.innerText.replace(/\s+/g,' ').trim());return {cal:bs.some(x=>/Calendar/.test(x)),plan:bs.some(x=>/(^|\s)Planner$/.test(x)),all:bs.slice(0,12)}});
 ok(tb.cal&&!tb.plan,'the trades\' bar says 📅 Calendar ('+JSON.stringify(tb.all)+')');
 await t.screenshot({path:'h619-trade.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h619: ${bad} failed`:'h619: all passed');await b.close();process.exit(bad?1:0);
})();
