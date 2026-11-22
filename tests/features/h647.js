// Evening & morning message (made-up): emp1 is on the planner for Tue 24 Nov 2026 at 8:00 at 4 Rolle Road with notes.
// Opening the app at 5:30pm on Monday pops up 🌙 Tomorrow with the time, address, Directions and notes – once only;
// at 7:30am on Tuesday it's ☀️ Today. The owner never gets it, and can turn it off in Calendar's menu.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8').replace('dayBrief:{off:true}','dayBrief:{}');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
const extra='store["plan/pdb1"]={from:"2026-11-24",to:"2026-11-24",type:"work",title:"Kitchen extension",site:"4 Rolle Road, Exmouth",people:["emp1"],time:"08:00",notes:"Key is in the safe by the back door.",vis:"people"};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const trade='<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+fake(false)+page_src.replace(DD,'function detailsDone(d){return true}')+'</body></html>';
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:420,height:900}});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());
 const at=async(when)=>{const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await p.clock.install({time:new Date(when)});await p.setContent(trade);await p.waitForTimeout(6500);return p;};
 let p=await at('2026-11-23T17:30:00');
 console.log('me:',await p.evaluate(()=>window.__S.me));
 ok(await p.locator('.dbr-box').count()===1,'at 5:30pm the trade gets a pop-up');
 const t=await p.innerText('.dbr-box').catch(()=>'');console.log(t.replace(/\n+/g,' | '));
 ok(/Tomorrow/.test(t)&&/08:00/.test(t)&&/Kitchen extension/.test(t)&&/4 Rolle Road/.test(t)&&/Key is in the safe/.test(t),'🌙 Tomorrow with the time, job, address and notes');
 ok(/destination=/.test(await p.getAttribute('.dbr-box .dbr-dir','href')||''),'🧭 Directions goes to the map');
 await p.screenshot({path:'h647-evening.png'});
 await p.click('.dbr-ok');await p.waitForTimeout(300);
 ok(await p.locator('.dbr-box').count()===0,'OK, got it closes it');
 await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await p.waitForTimeout(2500);
 ok(await p.locator('.dbr-box').count()===0,'it only shows once that evening');await p.close();
 p=await at('2026-11-24T07:30:00');
 const m=await p.innerText('.dbr-box').catch(()=>'');
 ok(/Today/.test(m)&&/Kitchen extension/.test(m),'at 7:30am the next day it\'s ☀️ Today');
 await p.click('.dbr-cal');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>window.__S.tab==='planner'),'📅 My calendar opens their Calendar');await p.close();
 /* owner: never gets it; turns it off */
 const o=await ctx.newPage();o.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await o.clock.install({time:new Date('2026-11-23T17:30:00')});
 await o.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await o.waitForTimeout(6500);await o.keyboard.press('Escape');
 ok(await o.locator('.dbr-box').count()===0,'the owner doesn\'t get it');
 await o.evaluate(()=>{const S=window.__S;S.otab='planner';window.render()});await o.waitForTimeout(500);
 await o.click('#pb-menu');await o.waitForTimeout(200);await o.click('.pb-menu button[data-k="brief"]');await o.waitForTimeout(300);
 await o.uncheck('#dbr-on');await o.click('#f-save');await o.waitForTimeout(500);
 ok(await o.evaluate(()=>window.__st['settings/app'].dayBrief.off===true),'the owner can turn it off in Calendar › menu');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h647: ${bad} failed`:'h647: all passed');await b.close();process.exit(bad?1:0);
})();
