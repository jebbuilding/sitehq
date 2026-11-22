// The planner checks the timesheets, labour against the price, and the week wrap-up (made-up data). Sam is booked in
// the planner on 4 Rolle Road Monday to Wednesday of last week; Monday's timesheet is on 4 Rolle Road, Tuesday's on
// 12 Marine Way, Wednesday has none. On Timesheets for that week a card lists Tuesday (timesheet says 12 Marine Way)
// and Wednesday (no timesheet); "It's fine" hides one. The week wrap-up opens from Timesheets with its sections.
// A priced job whose labour is well ahead of how far it has got warns "Labour is running ahead", and its page shows
// the labour line.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const now=new Date();const mon=new Date(now.getFullYear(),now.getMonth(),now.getDate()-((now.getDay()+6)%7)-7);
const iso=(d)=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const day=(n)=>iso(new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()+n));
const extra=`store["plan/pcw1"]={type:"work",title:"Rolle Road",site:"4 Rolle Road, Exmouth",from:"${day(0)}",to:"${day(2)}",people:["emp1"],vis:"all"};
store["sheets/emp1/entries/pc1"]={type:"hours",date:"${day(0)}",job:"4 Rolle Road, Exmouth",start:"08:00",finish:"16:00",breakMin:30,hours:7.5,created:1,updated:1};
store["sheets/emp1/entries/pc2"]={type:"hours",date:"${day(1)}",job:"12 Marine Way, Exmouth",start:"08:00",finish:"16:00",breakMin:30,hours:7.5,created:1,updated:1};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {').replace('function jbBudget(d) {','window.jbBudget=jbBudget;function jbBudget(d) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate((d)=>{const S=window.__S;S.week=new Date(d+'T00:00:00');S.otab='time';window.render();},day(0));await p.waitForTimeout(600);
 ok(await p.isVisible('.pccard'),'Timesheets shows where the planner and timesheets don\'t match');
 const rows=await p.evaluate(()=>[...document.querySelectorAll('.pccard .pcrow')].map(r=>r.innerText));
 ok(rows.length===2&&rows.some(r=>/12 Marine Way/.test(r))&&rows.some(r=>/no timesheet/.test(r))&&!rows.some(r=>/booked.*\n?.*4 Rolle Road.*timesheet says 4 Rolle/.test(r)),'Tuesday (on another job) and Wednesday (none) are listed, Monday isn\'t ('+rows.length+')');
 await p.click('.pccard .pc-ok[data-k="0"]');await p.waitForTimeout(500);
 ok(await p.locator('.pccard .pcrow').count()===1,'"It\'s fine" hides one');
 await p.click('.pccard .pc-fix');await p.waitForTimeout(400);
 ok(await p.isVisible('#form .qw-tbl'),'"Put it right" opens the person\'s week to fix');
 await p.click('#f-cancel');await p.waitForTimeout(200);
 /* the wrap-up */
 await p.click('#wu-open');await p.waitForTimeout(400);
 const secs=await p.evaluate(()=>[...document.querySelectorAll('.wu .wu-sec .wu-h b')].map(x=>x.textContent));
 ok(secs.length===7&&secs.some(s=>/Hours this week/.test(s))&&secs.some(s=>/Invoices overdue/.test(s))&&secs.some(s=>/Off in the next two weeks/.test(s)),'the week wrap-up shows its seven parts ('+secs.length+')');
 await p.screenshot({path:'wrapup.png'});
 /* labour running ahead */
 const b2=await p.evaluate(()=>window.jbBudget({cp:false,price:10000,j:{done:30},est:null,items:[{kind:'lab',cost:2000,hours:66,costRate:30}],cost:2000,invoiced:0,site:'x'}));
 ok(b2&&b2.lvl==='warn'&&/Labour is running ahead/.test(b2.msg),'labour well ahead of progress warns ('+(b2&&b2.msg)+')');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h579: ${bad} failed`:'h579: all passed');await b.close();process.exit(bad?1:0);
})();
