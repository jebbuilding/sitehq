// Sites › 4 Rolle Road › 📊 Programme (made-up job): start from a typical kitchen on Monday 16 Nov 2026 – the stages
// follow each other on working days (strip out Mon–Tue, first fix Wed–Thu …), each goes on the planner, and Sue's
// portal shows the programme. The strip out finishes 2 days late (Thu 19th): everything after it moves on 2 working
// days, on the planner too, and the stages show how late they are.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const SITE='4 Rolle Road, Exmouth';
const extra='store["todos/c1"].portalUid="u9";';
let page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
function mk(mode,storeDump){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra+(storeDump?'Object.assign(store,'+storeDump+');':''));if(mode==='client')src=src.replace("id:async()=>${owner?'\"owner\"':'\"emp1\"'}",'id:async()=>"u9"');eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake(mode==='owner');}
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:1000}});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());
 const page=async(mode,dump)=>{const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',mode,e.message);bad++;});await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+mk(mode,dump)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');return p;};
 try{
 const p=await page('owner');
 await p.evaluate(s=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.__S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(500);
 ok(await p.locator('.pjtile[data-t=programme]').count()===1,'the site page has a Programme tile');
 await p.click('.pjtile[data-t=programme]');await p.waitForTimeout(400);
 await p.fill('#pg-start','2026-11-16');
 await p.click('.pg-new[data-t=kitchen]');await p.waitForTimeout(1200);
 ok(await p.locator('.pg-tbl tbody tr').count()===9,'a kitchen programme with 9 stages');
 const dates=await p.$$eval('.pg-dates',d=>d.map(x=>x.textContent.trim()));console.log(dates.slice(0,4));
 ok(/Mon 16 Nov – Tue 17 Nov/.test(dates[0])&&/Wed 18 Nov – Thu 19 Nov/.test(dates[1])&&/Fri 20 Nov – Tue 24 Nov/.test(dates[2]),'the dates follow on working days (skipping the weekend)');
 const plans=()=>p.evaluate(()=>Object.entries(window.__st).filter(([k])=>/^plan\/prg-/.test(k)).map(([k,v])=>[v.title,v.from,v.to]));
 let P=await plans();
 ok(P.length===9&&P.some(x=>/^Strip out – 4 Rolle Road/.test(x[0])&&x[1]==='2026-11-16'&&x[2]==='2026-11-17'),'each stage is on the planner');
 let por=await p.evaluate(()=>window.__st['portal/u9'].programme);
 ok(por&&por.stages.length===9&&por.stages[1].from==='2026-11-18','Sue\'s portal has the programme');
 /* the strip out finishes two days late */
 await p.locator('.pg-tick').first().click();await p.waitForTimeout(300);
 await p.fill('#pg-act','2026-11-19');await p.click('#f-save');await p.waitForTimeout(1500);
 const d2=await p.$$eval('.pg-dates',d=>d.map(x=>x.textContent.trim()));console.log(d2.slice(0,3));
 ok(/Mon 16 Nov – Thu 19 Nov/.test(d2[0])&&/2 days late/.test(d2[0]),'the strip out shows its real finish, 2 days late');
 ok(/Fri 20 Nov – Mon 23 Nov/.test(d2[1])&&/2 days late/.test(d2[1]),'first fix moves on 2 working days, and says so');
 P=await plans();
 ok(P.some(x=>/^First fix/.test(x[0])&&x[1]==='2026-11-20'&&x[2]==='2026-11-23'),'the planner has the new dates');
 ok(/days later than first planned/.test(await p.innerText('.pg-top')),'the job shows it will finish later than first planned');
 /* a delay before a stage */
 await p.locator('.pg-lag').nth(3).fill('3');await p.locator('.pg-lag').nth(3).dispatchEvent('change');await p.waitForTimeout(300);
 await p.click('#pg-save');await p.waitForTimeout(1500);
 const d3=await p.$$eval('.pg-dates',d=>d.map(x=>x.textContent.trim()));console.log(d3[3]);
 ok(/^Wed 2 Dec – Fri 4 Dec/.test(d3[3]),'3 delay days push the unit fit back');
 por=await p.evaluate(()=>window.__st['portal/u9'].programme);
 /* Sue's portal */
 const q=await page('client',await p.evaluate(()=>JSON.stringify(window.__st)));
 await q.evaluate(pg=>window.__S.db.doc('portal/u9').update({programme:pg}),por);await q.waitForTimeout(400);
 await q.click('.ptabs button[data-v=cal]');await q.waitForTimeout(400);
 const t=await q.innerText('#main');
 ok(/Your job programme/.test(t)&&/✓ Strip out/.test(t)&&/First fix/.test(t),'Sue sees the programme in her Dates tab, with the strip out done');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h478: ${bad} failed`:'h478: all passed');await b.close();process.exit(bad?1:0);
})();
