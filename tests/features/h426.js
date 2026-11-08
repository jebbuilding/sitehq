// Planner overhaul (owner): the board comes first with one week control, time-off requests as one line, clashes
// flagged (someone on two sites the same day), jobs with nothing booked below the grid, Who's where day view, copy last
// week into this week, send the week to the team, and no "Requested 1 Jan 1970".
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const D=new Date();const pad=n=>String(n).padStart(2,'0');const isoD=x=>x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());const mon=new Date(D);mon.setDate(D.getDate()-((D.getDay()+6)%7));const dd=k=>{const x=new Date(mon);x.setDate(mon.getDate()+k);return isoD(x)};
const extra=`store["plan/p1"]={title:"Blockwork to DPC",type:"work",from:"${dd(0)}",to:"${dd(2)}",time:"08:00",site:"12 Marine Way, Exmouth",people:["emp1"],vis:"all",created:1};
store["plan/p3"]={title:"Skip delivery",type:"work",from:"${dd(1)}",to:"${dd(1)}",time:"07:30",site:"4 Rolle Road, Exmouth",people:["emp1"],vis:"all",created:1};
store["plan/p5"]={title:"Plastering",type:"work",from:"${dd(-7)}",to:"${dd(-6)}",site:"9 Long Lane, Exmouth",people:["emp1"],vis:"all",created:1};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await ctx.route(/^https?:\/\//,r=>r.abort());
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#tabs .tab[data-t=planner]');await p.waitForTimeout(500);
 ok(await p.isVisible('.pb-grid, .pb-wrap'),'the board shows first');
 ok(await p.isHidden('#weekbar'),'one week control (the board\'s own)');
 const main=await p.innerText('#main');
 ok(/clash/i.test(main)&&/2 jobs/.test(main),'clash flagged: on 2 jobs the same day');
 ok(await p.$$eval('.pb-clashc',x=>x.length)>=1,'the clash square is outlined');
 ok(!/1 Jan 1970/.test(main),'no "Requested 1 Jan 1970"');
 /* Who's where */
 await p.click('#pb-mode button[data-v=where]');await p.waitForTimeout(300);
 {const back=Math.round((new Date(isoD(D))-new Date(dd(1)))/864e5);for(let i=0;i<back;i++){await p.click('#pl-wprev');await p.waitForTimeout(120);}for(let i=0;i>back;i--){await p.click('#pl-wnext');await p.waitForTimeout(120);}}
 const wh=await p.innerText('.pl-where');
 ok(/12 Marine Way/.test(wh)&&/4 Rolle Road/.test(wh),'Who\'s where: each site that day');
 ok(await p.$$eval('.pl-site',x=>x.length)===2,'two site cards');
 const h1=await p.innerText('.pl-wnav b');await p.click('#pl-wnext');await p.waitForTimeout(200);
 ok(await p.innerText('.pl-wnav b')!==h1,'next day moves on');
 /* copy last week */
 await p.click('#pb-mode button[data-v=board]');await p.waitForTimeout(300);
 await p.click('#pb-menu');await p.click('.pb-menu button[data-k=copy]');await p.waitForTimeout(200);
 await p.click('#f-save');await p.waitForTimeout(400);
 ok(/Copied 1 booking/.test(await lastToast()),'copy last week: '+await lastToast());
 const copied=await p.evaluate(d=>Object.entries(window.__st).filter(([k,v])=>k.startsWith('plan/')&&v.title==='Plastering'&&v.from===d).length,dd(0));
 ok(copied===1,'Plastering copied a week on');
 await p.click('#pb-menu');await p.click('.pb-menu button[data-k=copy]');await p.waitForTimeout(200);await p.click('#f-save');await p.waitForTimeout(400);
 ok(/already/.test(await lastToast()),'copying again adds nothing twice');
 /* send the week */
 await p.click('#pb-menu');await p.click('.pb-menu button[data-k=send]');await p.waitForTimeout(200);
 ok(await p.$$eval('.pl-sendto',x=>x.length)>=1,'a tick box per person with their week');
 await p.click('#f-save');await p.waitForTimeout(400);
 const msg=await p.evaluate(()=>Object.entries(window.__st).find(([k,v])=>/^sheets\/emp1\/signoffs\/pr-pl/.test(k)));
 ok(msg&&msg[1].form==='plan'&&/Marine/.test(msg[1].note),'emp1 gets their week as a message: '+(msg&&msg[1].note));
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0]);bad++}
 console.log(bad?'h426: '+bad+' FAILED':'h426: all passed');
 await b.close()})();
