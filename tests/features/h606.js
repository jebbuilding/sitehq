// Never checked out (made-up trades): a trade checked in on an earlier day and never checked out. Timesheets shows them
// at the top with Set finish and Go to that week; Set finish puts the hours in. A person with nothing this week shows their
// last timesheet day. Quick edit shows a never-checked-out line and saving a finish closes it. The trade can check in
// today while an old day is still open.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1180,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 const ohtml='<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>';
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true');localStorage.setItem('jeb.splash','1')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:ohtml}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.goto('https://sitehq.test/');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 /* two weeks ago: emp1 checked in and never out; also a second never-closed day for the quick edit */
 const D=await p.evaluate(async()=>{const S=window.__S;const f=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const t=new Date();const a=new Date(t);a.setDate(t.getDate()-14);while(a.getDay()!==4)a.setDate(a.getDate()-1);const b2=new Date(a);b2.setDate(a.getDate()-1);
  const ent=(date,id)=>S.db.doc('sheets/emp1/entries/'+id).set({type:'hours',date,job:'4 Rolle Road, Exmouth',start:'08:00',actualIn:'07:52',finish:'',breakMin:0,hours:0,open:true,checkIn:true,inAt:Date.now(),notes:'',approved:false,created:Date.now(),updated:Date.now()});
  await ent(f(a),'nco1');await ent(f(b2),'nco2');
  for(const k of Object.keys(window.__st).filter(k=>/^sheets\/emp1\/entries\//.test(k)&&!/nco\d$/.test(k))){const e=window.__st[k];if(e&&e.date>=f(new Date(t.getTime()-6*864e5)))await S.db.doc(k).delete();}
  return {a:f(a),b:f(b2)};});
 await p.waitForTimeout(800);
 await p.evaluate(()=>{const S=window.__S;S.otab='time';S.week=(()=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d})();window.render()});await p.waitForTimeout(600);
 const card=await p.innerText('.nco-card').catch(()=>'');
 ok(/Never checked out \(2\)/.test(card)&&/in at 07:52/.test(card),'Timesheets starts with the two days never checked out ('+card.replace(/\n/g,' | ').slice(0,200)+')');
 await p.screenshot({path:OUT+'nco-1.png',clip:{x:0,y:0,width:1180,height:620}});
 const empNothing=await p.evaluate(()=>{const d=document.querySelector('details.card[data-id="emp1"]');if(!d)return '';d.open=true;return d.innerText});
 ok(/Last timesheet:/.test(empNothing),'with nothing this week, their card says when their last timesheet was');
 /* Set finish on the newest one */
 await p.click(`.nco-fin[data-e="nco1"]`);await p.waitForTimeout(400);
 ok(await p.isVisible('#sp-fin'),'Set finish opens the finish time');
 await p.fill('#sp-fin','16:30');await p.click('#f-save');await p.waitForTimeout(800);
 const e1=await p.evaluate(()=>window.__st['sheets/emp1/entries/nco1']);
 ok(e1&&!e1.open&&e1.finish==='16:30'&&e1.hours>7,'the day is closed with its hours ('+(e1&&e1.hours)+' h)');
 ok(/Never checked out \(1\)/.test(await p.innerText('.nco-card')),'one left on the list');
 /* Go to that week, then Quick edit fixes the other one */
 await p.click('.nco-wk');await p.waitForTimeout(600);
 ok(await p.evaluate(d=>{const w=window.__S.week;const f=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');return f(w)<=d},D.b),'Go to that week moves to the week it was');
 await p.evaluate(()=>{const d=document.querySelector('details.card[data-id="emp1"]');if(d)d.open=true});await p.waitForTimeout(200);
 await p.click('details.card[data-id="emp1"] .qw-open');await p.waitForTimeout(500);
 ok(await p.locator('#form .qw-nco').count()===1,'Quick edit shows the line that was never checked out');
 const row=p.locator('#form .qw-row',{has:p.locator('.qw-nco')});
 await row.locator('.qw-f').fill('16:00');await p.click('#f-save');await p.waitForTimeout(900);
 const e2=await p.evaluate(()=>window.__st['sheets/emp1/entries/nco2']);
 ok(e2&&e2.open===false&&e2.finish==='16:00'&&e2.hours>0,'saving the week closes it with its hours');
 ok(await p.locator('.nco-card').count()===0,'nothing left never checked out');
 /* the trade side (a new page as the trade): an old day open doesn't stop checking in today */
 const p2=await ctx.newPage();p2.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p2.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src.replace('function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}','function detailsDone(d){return true}')+'</body></html>');await p2.waitForTimeout(2500);await p2.keyboard.press('Escape');
 await p2.evaluate(async d=>{await window.__S.db.doc('sheets/emp1/entries/old1').set({type:'hours',date:d,job:'4 Rolle Road, Exmouth',start:'08:00',finish:'',breakMin:0,hours:0,open:true,checkIn:true,notes:'',approved:false,created:1,updated:1});},D.a);
 await p2.waitForTimeout(500);await p2.click('.tab[data-t=time]').catch(()=>{});await p2.evaluate(()=>{window.__S.tab='time';window.render()});await p2.waitForTimeout(600);
 const m=await p2.innerText('#main');
 ok(/You didn't check out on/.test(m)&&await p2.isVisible('.ci-fix')&&await p2.isVisible('.ci-in'),'the trade is asked to set the old finish and can still check in today ('+m.slice(0,160).replace(/\n/g,' | ')+')');
 await p2.screenshot({path:OUT+'nco-2.png',clip:{x:0,y:0,width:1180,height:620}});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h606: ${bad} failed`:'h606: all passed');await b.close();process.exit(bad?1:0);
})();
