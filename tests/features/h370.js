const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const D=new Date();const pad=n=>String(n).padStart(2,'0');const isoD=x=>x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());const mon=new Date(D);mon.setDate(D.getDate()-((D.getDay()+6)%7));const dd=k=>{const x=new Date(mon);x.setDate(mon.getDate()+k);return isoD(x)};
const extra=`store["plan/p1"]={title:"Blockwork to DPC",type:"work",from:"${dd(0)}",to:"${dd(2)}",time:"08:00",endTime:"16:30",site:"12 Marine Way, Exmouth",people:["emp1"],vis:"all",notes:"Bring the laser",created:1};
store["plan/p2"]={title:"Roof on",type:"keydate",from:"${dd(3)}",to:"${dd(4)}",site:"12 Marine Way, Exmouth",people:[],vis:"all",created:1};
store["plan/p3"]={title:"Skip delivery",type:"delivery",from:"${dd(1)}",to:"${dd(1)}",time:"07:30",site:"4 Rolle Road, Exmouth",people:["emp1"],vis:"all",created:1};
store["plan/p4"]={title:"Kitchen fit",type:"work",from:"${dd(7)}",to:"${dd(11)}",site:"4 Rolle Road, Exmouth",people:["emp1"],vis:"all",created:1};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed+extra);

eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},hasTouch:true});ctx.setDefaultTimeout(6000);const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.waitForTimeout(500);await p.click('.tab[data-t=planner]');await p.waitForTimeout(700);await p.evaluate(()=>document.querySelector('.pb-top').scrollIntoView());await p.screenshot({path:'pb1.png'});
 const info=await p.evaluate(()=>({chips:[...document.querySelectorAll('.pb-chip')].map(c=>c.textContent.trim()),free:[...document.querySelectorAll('.pb-freeb')].map(c=>c.textContent),wait:[...document.querySelectorAll('.pb-waitb')].map(c=>c.textContent)}));console.log(JSON.stringify(info));
 // drag p3 chip from Tue to Wed (same person)
 const chip=await p.$('.pb-chip[data-p="p3"]');const cb=await chip.boundingBox();const target=await p.$('.pb-cell[data-w="emp1"][data-d="'+dd(2)+'"]');const tb=await target.boundingBox();
 await p.mouse.move(cb.x+cb.width/2,cb.y+cb.height/2);await p.mouse.down();await p.waitForTimeout(300);await p.mouse.move(cb.x+cb.width/2+10,cb.y+cb.height/2+5,{steps:3});await p.mouse.move(tb.x+tb.width/2,tb.y+tb.height/2,{steps:8});await p.mouse.up();await p.waitForTimeout(500);
 console.log('p3 after drag',JSON.stringify(await p.evaluate(()=>[window.__st["plan/p3"].from,window.__st["plan/p3"].people])));
 await p.click('#pb-menu');await p.waitForTimeout(200);await p.screenshot({path:'pb2.png'});await p.click('.pb-menu button[data-k=stages]');await p.waitForTimeout(500);await p.screenshot({path:'pb3.png'});
 await p.click('#pb-mode button[data-v=day]');await p.waitForTimeout(400);await p.screenshot({path:'pb4.png'});
 }catch(e){console.log('FAIL',e.message.split('\n').slice(0,4).join('|'))}
 await b.close()})();
