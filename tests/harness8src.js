const { chromium } = require('playwright');
const fs=require('fs');
const page_src=fs.readFileSync('timesheets.html','utf8');
const fake=(owner)=>`<script>
(function(){
const store={}, listeners=[];
const kids=c=>Object.keys(store).filter(k=>k.startsWith(c+"/")&&k.slice(c.length+1).indexOf("/")<0);
const snapDoc=p=>({id:p.split("/").pop(),exists:p in store,data:()=>store[p]?JSON.parse(JSON.stringify(store[p])):undefined});
const fire=()=>setTimeout(()=>listeners.forEach(l=>l()),0);
function doc(p){return{id:p.split("/").pop(),get:async()=>snapDoc(p),set:async d=>{store[p]=JSON.parse(JSON.stringify(d));fire()},
 update:async d=>{store[p]=Object.assign({},store[p]||{},d);fire()},delete:async()=>{delete store[p];fire()},
 onSnapshot:(n)=>{const l=()=>n(snapDoc(p));listeners.push(l);setTimeout(l,0);return()=>{}}}}
let c=0;function collection(cp,q){q=q||{w:[],o:null,l:0};const run=()=>{let d=kids(cp).map(snapDoc);q.w.forEach(([f,op,v])=>{d=d.filter(x=>{const a=x.data()[f];return op==="=="?a===v:true})});if(q.o){const [f,dir]=q.o;d.sort((a,b)=>((a.data()[f]>b.data()[f])?1:-1)*(dir==="desc"?-1:1))}if(q.l)d=d.slice(0,q.l);return d};
 return{path:cp,doc:id=>doc(cp+"/"+(id||("x"+(c++)))),add:async d=>{const r=doc(cp+"/x"+(c++));await r.set(d);return r},
 where:(f,op,v)=>collection(cp,{...q,w:q.w.concat([[f,op,v]])}),orderBy:(f,d)=>collection(cp,{...q,o:[f,d]}),limit:n=>collection(cp,{...q,l:n}),
 get:async()=>({docs:run()}),onSnapshot:(n)=>{let alive=true;const l=()=>{if(alive)n({docs:run()})};listeners.push(l);setTimeout(l,0);return()=>{alive=false}}}}
const t=new Date(); const d=new Date(t.getFullYear(),t.getMonth(),t.getDate()); const iso=x=>x.toISOString().slice(0,10);
const today=iso(new Date(d.getTime()-d.getTimezoneOffset()*60000));
store["sites/s1"]={name:"12 Marine Way, Exmouth"}; store["equipment/e1"]={kind:"vehicle",name:"WK21 JEB – Transit"};store["equipment/e2"]={kind:"digger",name:"Kubota KX057"};
store["docs/d2"]={site:"12 Marine Way, Exmouth",cat:"rams",title:"Site RAMS",fileName:"rams.pdf",assetId:"a9",contentType:"application/pdf",size:1000,uploaded:Date.now()};
store["sheets/"+"emp1"+"/entries/j"]={type:"job",kind:"extra",date:today,job:"12 Marine Way, Exmouth",task:"Moved radiator",hours:2,created:2};
store["inductions/i1"]={site:"12 Marine Way, Exmouth",items:["I know who the site manager is.","I will wear PPE.","I will report accidents."],details:{pc:"JEB Building Services",manager:"James Bray · 07917 646970",assembly:"Front drive"},version:1,updated:Date.now()};
store["jobs/j1"]={kind:"snag",title:"Final snags",site:"12 Marine Way, Exmouth",assignees:["emp1"],assigneeNames:["Sam Test"],due:"2026-10-30",tasks:[{id:"t1",text:"Touch up landing ceiling"},{id:"t2",text:"Fit door stop in bathroom"}],status:"open",created:1};
store["settings/app"]={ownerId:"owner",ownerName:"James Bray",company:{name:"JEB Building Services",owner:"James Bray"},people:[{id:"emp1",name:"Sam Test"}],allowDm:false};store["chats/team"]={kind:"team",name:"Whole team",members:"all",lastAt:Date.now(),lastBy:"owner",lastName:"James",lastText:"Morning all"};store["msgs/team/m/a1"]={by:"owner",byName:"James Bray",text:"Morning all",at:Date.now(),site:"12 Marine Way, Exmouth"};store["docs/d1"]={site:"12 Marine Way, Exmouth",cat:"plans",title:"Ground floor plan",fileName:"plan.pdf",assetId:"a1",contentType:"application/pdf",size:204800,uploaded:Date.now()};
const E="emp1";
store["sheets/"+E]={name:"Sam Test",updated:Date.now()};
store["sheets/"+E+"/entries/a"]={type:"hours",date:today,job:"12 Marine Way, Exmouth",start:"08:00",finish:"16:30",breakMin:30,hours:8,created:1};
store["sheets/"+E+"/checks/b"]={kind:"digger",date:today,asset:"Kubota KX057",reading:"2450",items:{tracks:"defect"},notes:"Track loose",safe:true,created:1};
store["sheets/"+E+"/checks/c"]={date:today,reg:"WK21 JEB",mileage:"48000",items:{tyres:"ok"},safe:true,created:1};
store["sheets/"+E+"/photos/p"]={assetId:"a2",site:"12 Marine Way, Exmouth",takenAt:Date.now(),date:today,lat:50.62,lon:-3.405,created:Date.now()};
store["sheets/"+E+"/invoices/i"]={number:"0042",invDate:today,sentAt:Date.now(),status:"sent",amount:850,assetId:"a3",fileName:"inv.pdf",contentType:"application/pdf"};
const ns={db:{doc,collection},user:{id:async()=>${owner?'"owner"':'"emp1"'},isOwner:async()=>${owner},profiles:async()=>({}),name:async()=>'James Bray'},
 assets:{upload:async(b)=>(window.__last=b,{id:"up"+(c++),url:"",sizeBytes:b.size,contentType:b.type}),delete:async()=>{}},downloads:{save:async(r)=>{(window.__dl=window.__dl||[]).push(r);return {}}}};
window.claude={use:async n=>ns[n]||null};
})();
</script>`;
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:400,height:900}});
  // OWNER
  let p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(400);
  console.log('owner tabs',await p.$$eval('.tab',x=>x.map(t=>t.textContent)));
  await p.click('.tab[data-t="projects"]');await p.waitForTimeout(150);
  console.log('PROJ',(await p.innerText('#main')).replace(/\s+/g,' ').slice(0,700));
  await p.screenshot({path:'o-proj.png',fullPage:true});
  await p.click('#pj-dl');await p.waitForTimeout(100);
  await p.click('.tab[data-t="time"]');await p.click('#monthly');await p.click('#f-save');await p.waitForTimeout(100);
  await p.click('.tab[data-t="checks"]');await p.click('#chkdl');await p.click('#f-save');await p.waitForTimeout(100);
  const dls=await p.evaluate(()=>(window.__dl||[]).map(r=>r.filename+'\n'+String(r.data).slice(0,400)));
  dls.forEach(d=>console.log('DL>>',d));
  await p.click('.tab[data-t="plans"]');await p.waitForTimeout(100);
  console.log('OPLANS',(await p.innerText('#main')).replace(/\s+/g,' ').slice(0,400));
  console.log('owner errs',errs);
  // EMPLOYEE
  const ctx2=await b.newContext({viewport:{width:400,height:900}});
  p=await ctx2.newPage(); const e2=[]; p.on('pageerror',e=>e2.push(e.message));
  await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src+'</body></html>');await p.waitForTimeout(400);
  console.log('emp tabs',await p.$$eval('.tab',x=>x.map(t=>t.textContent)));
  await p.click('.tab[data-t="plans"]');await p.waitForTimeout(100);
  await p.click('.d-sign');await p.click('#s-ok');await p.click('#f-save');await p.waitForTimeout(300);
  console.log('EPLANS',(await p.innerText('#main')).replace(/\s+/g,' ').slice(0,300));
  // offline queue
  await ctx2.setOffline(true);
  await p.click('.tab[data-t="time"]');await p.click('#addH');await p.waitForTimeout(100);await p.click('#f-save');await p.waitForTimeout(300);
  await p.click('.tab[data-t="checks"]');await p.click('.actions [data-k="vehicle"]');await p.click('#c-allok');
  await p.click('#c-items .seg[data-k="wipers"] [data-v="defect"]');await p.fill('#c-notes','Wiper split');await p.setInputFiles('#c-photos','fixtures/test.jpg');await p.click('#f-save');await p.waitForTimeout(1200);
  console.log('OFFLINE',(await p.innerText('#main')).replace(/\s+/g,' ').slice(0,300));
  await p.screenshot({path:'e-offline.png'});
  await ctx2.setOffline(false);await p.waitForTimeout(1500);
  console.log('ONLINE',(await p.innerText('#main')).replace(/\s+/g,' ').slice(0,400));
  console.log('emp errs',e2);
  await b.close();
})();
