// Overtime (all made-up): Sam checks in at 06:45 and out at 17:30 against the standard day 08:00–16:30. The usual day
// is paid; at check-out he's asked about the extra (75 min early, 60 min late), ticks both and says why. On the
// owner's timesheet it shows "Overtime asked" with ✓ Pay overtime: approving pays 06:45–17:30 less lunch.
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
 /* the trade, at 06:45 */
 await p.clock.install({time:new Date('2026-11-10T06:45:00')});
 const fake=mk();
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src+'</body></html>');await p.clock.runFor(2500);await p.keyboard.press('Escape');
 await p.click('.tab[data-t=time]').catch(()=>{});await p.clock.runFor(400);
 await p.evaluate(()=>{const i=document.querySelector('#ci-site input, #ci-site select, input#ci-site, select#ci-site');if(i){i.value='12 Marine Way, Exmouth';i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));}});
 await p.click('.ci-in');await p.clock.runFor(600);
 ok(/paid from 08:00/.test(await lastToast()),'checked in at 06:45, paid from 08:00: '+await lastToast());
 /* 17:30: check out */
 await p.clock.setFixedTime(new Date('2026-11-10T17:30:00'));await p.clock.runFor(200);
 await p.click('.ci-out');await p.clock.runFor(400);
 if(await p.isVisible('.ci-out'))await p.click('.ci-out');await p.clock.runFor(800);
 ok(await p.isVisible('#otm-why')&&/1 h 15 min before 08:00/.test(await p.innerText('#form'))&&/1 h after 16:30/.test(await p.innerText('#form')),'asked about overtime: 1 h 15 early, 1 h late');
 await p.click('#f-save');await p.clock.runFor(200);
 ok(/Say what it was for/.test(await p.innerText('#f-err')),'has to say what it was for');
 await p.fill('#otm-why','Concrete pour');await p.click('#f-save');await p.clock.runFor(800);
 ok(/Overtime sent to James/.test(await lastToast()),await lastToast());
 const st=await p.evaluate(()=>window.__st);
 const k=Object.keys(st).find(x=>/^sheets\/emp1\/entries\//.test(x)&&st[x].ot);
 const e=st[k];
 ok(e&&e.start==='08:00'&&e.finish==='16:30'&&e.ot.early===75&&e.ot.late===60&&e.ot.status==='asked'&&e.ot.why==='Concrete pour','saved: paid 08:00–16:30, overtime 75 + 60 min asked');
 ok(Object.keys(st).filter(x=>/^sheets\/emp1\/entries\//.test(x)&&st[x].date==='2026-11-10'&&st[x].checkIn).length===1,'one checked-in entry for the day (no duplicate)');
 await p.evaluate(()=>{const b=[...document.querySelectorAll('button,a')].find(x=>/^\+ Timesheet$/.test(x.textContent.trim())||/My timesheet|This month/.test(x.textContent));});
 const sub=await p.evaluate(()=>[...document.querySelectorAll('.otm-line')].map(x=>x.textContent).join('|'));
 console.log('trade lines:',sub||'(list not on this screen)');
 /* the owner approves */
 const dump=JSON.stringify(st);
 const p2=await ctx.newPage();p2.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p2.clock.install({time:new Date('2026-11-10T18:00:00')});
 const fake2=mk();
 await p2.setContent(('<!doctype html><html><head><meta charset=utf8></head><body>'+fake2(true)+page_src+'</body></html>').replace('const store={}, listeners=[];window.__st=store;','const store=Object.assign({},'+dump+'), listeners=[];window.__st=store;'));await p2.clock.runFor(2500);await p2.keyboard.press('Escape');
 await p2.click('.tab[data-t=time]');await p2.clock.runFor(500);
 await p2.evaluate(()=>document.querySelectorAll('details.card[data-id=emp1]').forEach(d=>d.open=true));await p2.clock.runFor(300);
 ok(await p2.isVisible('.otm-ok')&&/Overtime asked/.test(await p2.innerText('#main'))&&/Concrete pour/.test(await p2.innerText('#main')),'owner sees Overtime asked – Concrete pour, with ✓ Pay overtime');
 await p2.click('.otm-ok');await p2.clock.runFor(600);
 ok(/Overtime approved: 2 h 15 min added/.test(await p2.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''})),'approved');
 const e2=(await p2.evaluate(()=>window.__st))[k];
 ok(e2.start==='06:45'&&e2.finish==='17:30'&&e2.ot.status==='ok'&&e2.hours===10.25,'paid 06:45–17:30 less 30 min lunch = 10.25 h ('+e2.hours+')');
 await p2.screenshot({path:'h436-owner.png'});
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h436: '+bad+' FAILED':'h436: all passed');
 await b.close()})();
