// Different hours (all made-up): Sam signs in at 07:55 (paid from 08:00, the usual start). At lunch he taps
// ⏱ Started early or working through lunch?, ticks worked through lunch – it will not log it without a reason. He
// signs out at 16:30; James sees it and approves, and the 30 min lunch is no longer taken off (8.5 h).
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
function mk(){const src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake;}
const page_src=fs.readFileSync('timesheets.html','utf8').replace('function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}','function detailsDone(d){return true}');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:950}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 try{
 const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
 /* Sam signs in at 07:55 – paid from 08:00 */
 await p.clock.install({time:new Date('2026-11-10T07:55:00')});
 const fake=mk();
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src+'</body></html>');await p.clock.runFor(2500);await p.keyboard.press('Escape');
 await p.click('.tab[data-t=time]').catch(()=>{});await p.clock.runFor(400);
 await p.evaluate(()=>{const i=document.querySelector('#ci-site input, #ci-site select, input#ci-site, select#ci-site');if(i){i.value='12 Marine Way, Exmouth';i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));}});
 await p.click('.ci-in');await p.clock.runFor(600);
 ok(await p.isVisible('.ci-diff'),'signed in: ⏱ Started early or working through lunch? is there');
 /* 12:40 – he's working through lunch */
 await p.clock.setFixedTime(new Date('2026-11-10T12:40:00'));await p.clock.runFor(200);
 await p.click('.ci-diff');await p.clock.runFor(300);
 ok(await p.isVisible('#otm-lu')&&await p.isVisible('#otm-e')&&await p.isVisible('#otm-l'),'choices: started early, finished late, worked through lunch');
 await p.screenshot({path:OUT+'otm-1-diff.png'});
 await p.check('#otm-lu');await p.click('#f-save');await p.clock.runFor(200);
 ok(/Say what it was for/.test(await p.innerText('#f-err')),'no reason – it won\'t log it');
 await p.fill('#otm-why','Steel beam delivery came at lunch');await p.click('#f-save');await p.clock.runFor(800);
 ok(/Overtime sent to James/.test(await lastToast()),await lastToast());
 /* 16:30 – signs out */
 await p.clock.setFixedTime(new Date('2026-11-10T16:30:00'));await p.clock.runFor(200);
 await p.click('.ci-out');await p.clock.runFor(400);if(await p.isVisible('.ci-out'))await p.click('.ci-out');await p.clock.runFor(800);
 if(await p.isVisible('#f-cancel'))await p.click('#f-cancel');
 const st=await p.evaluate(()=>window.__st);
 const k=Object.keys(st).find(x=>/^sheets\/emp1\/entries\//.test(x)&&st[x].ot);
 const e=st[k];
 ok(e&&!e.open&&e.start==='08:00'&&e.actualIn==='07:55'&&e.finish==='16:30'&&e.ot.lunch===30&&e.ot.why==='Steel beam delivery came at lunch'&&e.ot.status==='asked','logged: in 07:55, paid 08:00–16:30, worked through 30 min lunch – reason kept');
 /* James approves */
 const dump=JSON.stringify(st);
 const p2=await ctx.newPage();p2.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p2.clock.install({time:new Date('2026-11-10T18:00:00')});
 const fake2=mk();
 await p2.setContent(('<!doctype html><html><head><meta charset=utf8></head><body>'+fake2(true)+page_src+'</body></html>').replace('const store={}, listeners=[];window.__st=store;','const store=Object.assign({},'+dump+'), listeners=[];window.__st=store;'));await p2.clock.runFor(2500);await p2.keyboard.press('Escape');
 await p2.click('.tab[data-t=time]');await p2.clock.runFor(500);
 await p2.evaluate(()=>document.querySelectorAll('details.card[data-id=emp1]').forEach(d=>d.open=true));await p2.clock.runFor(300);
 const mt=await p2.innerText('#main');
 ok(await p2.isVisible('.otm-ok')&&/worked through lunch/.test(mt)&&/Steel beam/.test(mt),'James sees "worked through lunch – Steel beam delivery…" with ✓ Pay overtime');
 await p2.click('.otm-ok');await p2.clock.runFor(600);
 const e2=(await p2.evaluate(()=>window.__st))[k];
 ok(e2.ot.status==='ok'&&e2.breakMin===0&&e2.hours===8.5,'approved: no lunch taken off, 08:00–16:30 = 8.5 h ('+e2.hours+', break '+e2.breakMin+')');
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h527: '+bad+' FAILED':'h527: all passed');
 await b.close();process.exit(bad?1:0)})();
