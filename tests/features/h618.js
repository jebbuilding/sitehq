// Quick enquiry diary, and the job's short description (made-up clients and sites).
// ⚡ Quick enquiry shows your diary for the visit day, warns of anything at the same time, and ‹ › looks at other
// days; a job name can be given there. A site's ✎ Name this job takes a short description that shows under the name;
// adding a site in Setup goes straight to naming it. Writes h618*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
const pad=n=>String(n).padStart(2,'0');const fmt=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const tm=(()=>{const d=new Date();d.setDate(d.getDate()+1);return fmt(d)})();
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(300);
 /* something already in the diary tomorrow at 10:30 */
 await p.evaluate(async d=>{await window.__S.db.doc('planprivate/vd1').set({title:'Visit: Mr Example (porch)',type:'meeting',from:d,to:d,time:'10:30',endTime:'11:30',created:1})},tm);
 await p.waitForTimeout(500);
 await p.evaluate(()=>{const S=window.__S;S.otab='clients';window.render()});await p.waitForTimeout(500);
 await p.click('#cl-quick');await p.waitForTimeout(500);
 let dia=await p.innerText('#qe-diary');
 ok(/Your diary/.test(dia)&&/Mr Example/.test(dia),'the quick enquiry shows the diary for the visit day');
 ok(/same time/.test(dia),'10:00 for an hour clashes with the 10:30 visit, and it says so');
 await p.screenshot({path:'h618-diary.png'});
 await p.fill('#qe-t','14:00');await p.dispatchEvent('#qe-t','change');await p.waitForTimeout(200);
 ok(/Nothing at that time/.test(await p.innerText('#qe-diary')),'moving it to 14:00 clears the warning');
 await p.click('#qe-diary .vd-day >> nth=1');await p.waitForTimeout(200);
 ok(await p.inputValue('#qe-d')!==tm&&!/Mr Example/.test(await p.innerText('#qe-diary')),'› looks at the next day and picks it');
 await p.fill('#qe-name','Mrs Testcase');await p.fill('#qe-jn','Testcase garden room');await p.fill('#qe-what','Garden room with power\nSaw the van');
 await p.click('#f-save');await p.waitForTimeout(800);
 const cl=await p.evaluate(()=>(window.__S.clients||[]).find(x=>x.name==='Mrs Testcase'));
 ok(cl&&cl.jobName==='Testcase garden room'&&/Garden room with power/.test(cl.desc),'the job name and description are kept with the enquiry');
 /* naming a site with a description */
 await p.evaluate(()=>{const s=document.getElementById('sheet');if(s&&!s.hidden){const x=document.getElementById('f-cancel');if(x)x.click()}const v=document.getElementById('viewer');if(v&&!v.hidden)document.getElementById('viewer-close').click();document.querySelectorAll('.dimask').forEach(d=>d.remove())});await p.waitForTimeout(300);
 const site=await p.evaluate(()=>window.__S.sites[0].name);
 await p.evaluate(s=>{const S=window.__S;S.otab='projects';S.f.proj=s;S.f.projList=false;S.f.pjSite=s;S.f.pjtab='overview';window.render()},site);await p.waitForTimeout(400);
 await p.click('#ss-name');await p.waitForTimeout(300);
 await p.fill('#ss-nm','Marine Way loft');await p.fill('#ss-ds','Dormer loft conversion with en-suite');await p.click('#f-save');await p.waitForTimeout(700);
 ok(/Dormer loft conversion with en-suite/.test(await p.innerText('#main .ss-namebar')),'the short description shows under the job name');
 /* Setup: a new site goes straight to naming it */
 await p.evaluate(()=>{const S=window.__S;S.otab='setup';S.f.stab='setup';S.open.add('__sites');window.render()});await p.waitForTimeout(400);
 await p.fill('#add-sites','9 New Street, Exmouth');await p.evaluate(()=>document.querySelector('.addform[data-k="sites"]').requestSubmit());await p.waitForTimeout(900);
 ok(await p.isVisible('#ss-ds'),'adding a site in Setup asks for its job name and description');
 await p.fill('#ss-nm','New Street bathroom');await p.fill('#ss-ds','Full bathroom refit');await p.click('#f-save');await p.waitForTimeout(700);
 const ns=await p.evaluate(()=>Object.values(window.__st).find(v=>v&&v.name==='9 New Street, Exmouth'));
 ok(ns&&ns.jobName==='New Street bathroom'&&ns.jobDesc==='Full bathroom refit','saved on the new site');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h618: ${bad} failed`:'h618: all passed');await b.close();process.exit(bad?1:0);
})();
