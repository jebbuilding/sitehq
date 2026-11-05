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
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src.replace('function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}','function detailsDone(d){return true}')+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.waitForTimeout(500);await p.click('.tab[data-t=planner]');await p.waitForTimeout(700);await p.evaluate(()=>document.querySelector('.pb-top').scrollIntoView());await p.screenshot({path:'pb5.png'});console.log('daysheet',(await p.innerText('.pb-ds')).replace(/\n/g,' | ').slice(0,300));
 }catch(e){console.log('FAIL',e.message.split('\n').slice(0,4).join('|'))}
 await b.close()})();
