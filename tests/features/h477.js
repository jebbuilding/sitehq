// Vehicles & plant (made-up Van 1, reg AB12 CDE, driven by Sam): its MOT is due in 20 days, its service in 200. The
// planner shows "1 to book in"; the register lists both, soonest first. James books the MOT in for a garage – it goes
// on the planner and the reminder says it's booked. Then he marks it done: it goes in the van's history and the next
// MOT moves on 12 months.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const day=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const MOT=day(20),SVC=day(200),BOOK=day(14);
const extra='store["equipment/v1"]={kind:"vehicle",name:"Van 1",assignee:"emp1",info:{reg:"AB12 CDE"},dates:{mot:"'+MOT+'",service:"'+SVC+'"}};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='planner';window.render()});await p.waitForTimeout(600);
 ok(await p.isVisible('#eqm-open')&&/1 to book in/.test(await p.innerText('#eqm-open')),'the planner shows 1 to book in');
 await p.click('#eqm-open');await p.waitForTimeout(400);
 const rows=await p.$$eval('.eqm-row',r=>r.map(x=>x.innerText.replace(/\s+/g,' ')));console.log(rows);
 ok(rows.length===2&&/Van 1 · MOT/.test(rows[0])&&/Due in 20 days – book it in/.test(rows[0])&&/AB12 CDE/.test(rows[0])&&/Service/.test(rows[1]),'the register lists the MOT first (due in 20 days) then the service');
 await p.locator('.eqm-book').first().click();await p.waitForTimeout(300);
 await p.fill('#eqm-date',BOOK);await p.fill('#eqm-where','Test Garage Exmouth');await p.click('#f-save');await p.waitForTimeout(700);
 const plan=await p.evaluate(()=>window.__st['plan/eqb-v1-mot']);console.log(JSON.stringify(plan));
 ok(plan&&plan.type==='vehicle'&&plan.from&&/Van 1 – MOT \(Test Garage Exmouth\)/.test(plan.title)&&plan.people[0]==='emp1','it goes on the planner, for Sam too');
 const eq=await p.evaluate(()=>window.__st['equipment/v1']);
 ok(eq.booked&&eq.booked.mot&&eq.booked.mot.where==='Test Garage Exmouth','the van shows it booked');
 ok(/Booked/.test(await p.innerText('.eqm-row')),'the register says booked');
 /* done */
 await p.locator('.eqm-done').first().click();await p.waitForTimeout(300);
 ok(await p.inputValue('#eqd-by')==='Test Garage Exmouth'&&await p.inputValue('#eqd-every')==='12','done: the garage and 12 months filled in');
 await p.fill('#eqd-cost','54.85');await p.fill('#eqd-miles','61234');await p.click('#f-save');await p.waitForTimeout(700);
 const eq2=await p.evaluate(()=>window.__st['equipment/v1']);console.log(JSON.stringify(eq2).slice(0,400));
 const y=+MOT.slice(0,4)+1;
 ok(eq2.log&&eq2.log.length===1&&eq2.log[0].cost==='54.85'&&eq2.log[0].miles==='61234'&&/MOT – pass/.test(eq2.log[0].what),'it goes in the van\'s history with the cost and mileage');
 ok(eq2.dates.mot===y+MOT.slice(4)&&!(eq2.booked||{}).mot,'the next MOT is a year on, and the booking is cleared');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h477: ${bad} failed`:'h477: all passed');await b.close();process.exit(bad?1:0);
})();
