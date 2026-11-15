// Health & safety along the top of Jobs & clients (made-up firm "Acme Build Ltd", new look, iPad size): the
// Jobs & clients page has 🦺 Health & safety in its row of tabs (Jobs, Clients, Planner…); tapping it opens the CDM documents and RAMS page,
// with the menu showing Jobs & clients, and nothing on it says James, JEB or Devon.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const src0=src;
src=src.replace('ownerName:"James Bray",company:{name:"JEB Building Services",owner:"James Bray"}','ownerName:"Pat Jones",company:{name:"Acme Build Ltd",owner:"Pat Jones",mobile:"07700900500"}');
if(src===src0)throw new Error('company seed patch did not match');
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed).replace(/WK21 JEB/g,'AB21 CDE').replace(/"James"/g,'"Pat"');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:1100},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true');localStorage.setItem('jeb.splash','1')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset=utf8><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fake(true)+page_src+'</body></html>'}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.goto('https://sitehq.test/');await p.waitForTimeout(3000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{const o=document.getElementById('ohq');if(o)o.hidden=true});
 await p.click('.nl-b[data-s=jobs]');await p.waitForTimeout(600);
 const row=p.locator('#main .jb-tabs button[data-v=hs]');
 ok(await row.count()===1&&/Health & safety/.test(await row.innerText()),'Jobs & clients has 🦺 Health & safety along the top, with Jobs, Clients and Planner');
 await p.screenshot({path:OUT+'hs-1-jobs.png'});
 await row.click();await p.waitForTimeout(700);
 const t=await p.innerText('#main');
 ok(await p.evaluate(()=>window.__S.otab==='hs')&&/CDM 2015 documents/.test(t)&&/Make RAMS for a site/.test(t),'tapping it opens the CDM documents and RAMS page');
 ok(await p.locator('.nl-b[data-s=jobs][aria-current=page]').count()===1,'the menu shows Jobs & clients');
 ok(!/James|\bJEB\b|Devon/.test(t),'and nothing on it says James, JEB or Devon');
 await p.screenshot({path:OUT+'hs-2-page.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h539: ${bad} failed`:'h539: all passed');await b.close();process.exit(bad?1:0);
})();
