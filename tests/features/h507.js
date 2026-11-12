// More than one job for a client (made-up client Sue Jones, already on site at 4 Rolle Road with a loft conversion):
// on her page James taps ＋ Another job – a garden wall, estimate sent, £4,500, at a new site 7 Beach Road – and both
// jobs show under 🔨 Jobs, the new site exists and is hers, and the client list shows her under On site and under
// Estimate sent. Opening the garden wall and marking it Completed moves it to her earlier jobs; the loft is untouched.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+'store["todos/c1"].stage="onsite";');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const sue=async(p)=>{await p.evaluate(()=>{const v=document.getElementById('viewer');if(v&&!v.hidden){const x=document.querySelector('#viewer .vclose,#viewer-close,#vclose');x&&x.click()}window.__S.otab='clients';window.__S.f.clf='all';window.render()});await p.waitForTimeout(400);await p.click('.abcard .cl-open[data-c=c1]');await p.waitForTimeout(500);};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await sue(p);
 ok(await p.isVisible('#cv-more'),'Sue\'s page has ＋ Another job');
 await p.click('#cv-more');await p.waitForTimeout(400);
 await p.fill('#mj-work','Garden wall');await p.fill('#mj-desc','Rebuild the front wall, 8 m');await p.selectOption('#mj-stage','quote');await p.fill('#mj-quote','4500');
 await p.selectOption('#mj-site','__new');await p.waitForTimeout(100);
 ok(await p.isVisible('#mj-addr'),'a new site at another address asks for the address');
 await p.fill('#mj-addr','7 Beach Road, Exmouth EX8 1AA');
 await p.screenshot({path:OUT+'mj-1-form.png'});
 await p.click('#f-save');await p.waitForTimeout(1500);
 const rec=await p.evaluate(()=>window.__st['todos/c1']);
 ok(rec.stage==='onsite'&&(rec.moreJobs||[]).length===1&&rec.moreJobs[0].work==='Garden wall'&&rec.moreJobs[0].stage==='quote'&&rec.moreJobs[0].quote==='4500'&&rec.moreJobs[0].site==='7 Beach Road, Exmouth EX8 1AA','saved as a second job; her first job is still On site');
 ok(await p.evaluate(()=>Object.values(window.__st).some(v=>v&&v.name==='7 Beach Road, Exmouth EX8 1AA'&&v.client==='Sue Jones')),'the new site is made, and it\'s hers');
 const jl=await p.innerText('.cvjobs');
 ok(/Garden wall/.test(jl)&&/Estimate sent/.test(jl)&&/£4,500/.test(jl),'both jobs under 🔨 Jobs, the garden wall with its own stage and estimate');
 await p.screenshot({path:OUT+'mj-2-client.png',fullPage:true});
 /* the client list */
 await p.evaluate(()=>{const x=document.querySelector('.vclose,#vclose,[aria-label="Close"]');x&&x.click();window.__S.otab='clients';window.__S.f.clf='sent';window.render()});await p.waitForTimeout(400);
 ok(await p.locator('.abcard .cl-open[data-c=c1]').count()===1&&/\+1 more job/.test(await p.innerText('#main')),'Estimate sent lists Sue, marked +1 more job');
 await p.evaluate(()=>{window.__S.f.clf='onsite';window.render()});await p.waitForTimeout(300);
 ok(await p.locator('.abcard .cl-open[data-c=c1]').count()===1,'and On site still lists her');
 /* finish the garden wall */
 await sue(p);
 await p.click('.cvjobs .abjob[data-j^="m-"]');await p.waitForTimeout(500);
 await p.click('#cj-edit');await p.waitForTimeout(400);
 await p.selectOption('#mj-stage','done');await p.click('#f-save');await p.waitForTimeout(1500);
 const r2=await p.evaluate(()=>window.__st['todos/c1']);
 ok((r2.moreJobs||[]).length===0&&(r2.pastJobs||[]).some(j=>j.work==='Garden wall'&&j.stage==='done')&&r2.stage==='onsite','Completed moves it to her earlier jobs; the loft is untouched');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h507: ${bad} failed`:'h507: all passed');await b.close();process.exit(bad?1:0);
})();
