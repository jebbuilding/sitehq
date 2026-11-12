// Client details and emails easy to see (made-up client Sue Jones): her page starts with a 👤 Client details box – name,
// phone, her email written out (tap to email) and the address on separate lines with the postcode in capitals – and the
// job's own details are under 🔨 This job. Her site's page shows her email too, with an ✉ Email button.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+'store["todos/c1"].address="4 Rolle Road, Exmouth";store["todos/c1"].postcode="ex8 2ab";');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='clients';window.__S.f.clf='all';window.render()});await p.waitForTimeout(400);
 await p.click('.abcard .cl-open[data-c=c1]');await p.waitForTimeout(500);
 ok(await p.isVisible('.cldet'),'her page has a 👤 Client details box');
 const t=await p.innerText('.cldet');
 ok(/Sue Jones/.test(t)&&/07700900111/.test(t),'name and phone');
 ok(await p.locator('.cldet a[href="mailto:sue@example.com"]').count()===1&&/sue@example\.com/.test(t),'her email written out, tap to email');
 ok(/4 Rolle Road\nExmouth\nEX8 2AB/.test(await p.innerText('.cldet-addr')),'the address on separate lines, postcode in capitals');
 ok(/This job/.test(await p.innerText('#viewer')),'the job\'s own details are under 🔨 This job');
 await p.screenshot({path:OUT+'cl-1-details.png'});
 /* her site */
 await p.evaluate(()=>{const x=document.querySelector('.vclose,#vclose,[aria-label="Close"]');x&&x.click();window.__S.otab='projects';window.__S.f.proj='4 Rolle Road, Exmouth';window.__S.f.projList=false;window.__S.f.pjtab='overview';window.render()});await p.waitForTimeout(600);
 ok(await p.locator('#main a[href="mailto:sue@example.com"]').count()>=1,'her site\'s page shows her email');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h512: ${bad} failed`:'h512: all passed');await b.close();process.exit(bad?1:0);
})();
