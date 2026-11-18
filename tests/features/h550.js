// Programme stages that run at the same time (made-up job at 4 Rolle Road, kitchen programme from Mon 16 Nov 2026):
// each stage after the first has ⇉ Same time as (the stage above); tapping it makes the stage start on the same day as
// the one above and keep its own days (so it finishes at a different time); tapping again puts it back to following
// on; a stage added at the end waits for whichever stage finishes last.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const SITE='4 Rolle Road, Exmouth';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:1300},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(s=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.__S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(500);
 await p.click('.pjtile[data-t=programme]');await p.waitForTimeout(400);
 await p.fill('#pg-start','2026-11-16');await p.click('.pg-new[data-t=kitchen]');await p.waitForTimeout(1200);
 const dates=()=>p.$$eval('.pg-dates',d=>d.map(x=>x.textContent.trim()));
 const from=t=>t.split(' – ')[0];
 ok(await p.locator('.pg-tbl tbody tr').nth(0).locator('.pg-par').count()===0&&await p.locator('.pg-tbl tbody tr').nth(2).locator('.pg-par').count()===1,'each stage after the first has ⇉ Same time as (the stage above)');
 let d=await dates();const before=d.slice(0,4);
 ok(from(d[2])!==from(d[1]),'to start with, stage 3 follows stage 2 ('+d[1]+' then '+d[2]+')');
 await p.locator('.pg-tbl tbody tr').nth(2).locator('.pg-par').click();await p.waitForTimeout(600);
 d=await dates();
 ok(from(d[2])===from(d[1]),'⇉ Same time as 2: stage 3 starts the same day as stage 2 ('+d[1]+' / '+d[2]+')');
 ok(await p.locator('.pg-tbl tbody tr').nth(2).locator('.pg-par[aria-pressed=true]').count()===1&&/starts \(at the same time\)/.test(await p.locator('.pg-tbl tbody tr').nth(2).locator('.pg-after option:checked').innerText()),'the button shows on, and the box says "starts (at the same time)"');
 const days=await p.locator('.pg-tbl tbody tr').nth(1).locator('.pg-days').inputValue();
 await p.locator('.pg-tbl tbody tr').nth(2).locator('.pg-days').fill(String(+days+3));await p.locator('.pg-tbl tbody tr').nth(2).locator('.pg-days').dispatchEvent('change');await p.evaluate(()=>document.activeElement&&document.activeElement.blur());await p.waitForTimeout(900);
 d=await dates();
 ok(from(d[2])===from(d[1])&&/Tue 24 Nov/.test(d[2]),'with 3 more days it still starts with stage 2 but finishes later ('+d[1]+' / '+d[2]+')');
 await p.screenshot({path:OUT+'pg-par.png'});
 await p.click('#pg-add');await p.waitForTimeout(600);
 const n=await p.locator('.pg-tbl tbody tr').count();
 const waits=await p.locator('.pg-tbl tbody tr').nth(n-1).locator('.pg-after option:checked').innerText();
 const lastName=await p.evaluate(()=>{const rows=[...document.querySelectorAll('.pg-tbl tbody tr')];return rows.length});
 ok(/finishes/.test(waits),'a stage added at the end waits for the stage that finishes last ('+waits+')');
 await p.locator('.pg-tbl tbody tr').nth(2).locator('.pg-par').click();await p.waitForTimeout(600);
 d=await dates();
 ok(from(d[2])!==from(d[1])&&await p.locator('.pg-tbl tbody tr').nth(2).locator('.pg-par[aria-pressed=true]').count()===0,'tapping it again puts stage 3 back to following stage 2');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h550: ${bad} failed`:'h550: all passed');await b.close();process.exit(bad?1:0);
})();
