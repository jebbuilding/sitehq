// Planner month: all jobs, some jobs, or just the diary (made-up jobs and meetings). Two jobs on the same day are
// marked, ⚠️ when someone is booked on both, and listed under the month; 🏗 picking one job shows only it; 📅 My diary
// only shows the meetings without the jobs. Writes h622*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
const now=new Date();const ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1150,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(300);
 await p.evaluate(async ym=>{const S=window.__S;
   for(const [k] of Object.entries(window.__st)) if(/^(plan|planprivate)\//.test(k)) await S.db.doc(k).delete();
   await S.db.doc('plan/j1').set({title:'Kitchen – 12 Marine Way',type:'work',site:'12 Marine Way, Exmouth',from:ym+'-10',to:ym+'-14',people:['emp1'],vis:'all',created:1});
   await S.db.doc('plan/j2').set({title:'Loft – 4 Rolle Road',type:'work',site:'4 Rolle Road, Exmouth',from:ym+'-12',to:ym+'-13',people:['emp1'],vis:'all',created:2});
   await S.db.doc('planprivate/m1').set({title:'Visit: Mrs Example',type:'meeting',from:ym+'-20',to:ym+'-20',time:'10:00',created:3});
 },ym);
 await p.waitForTimeout(600);
 await p.evaluate(ym=>{const S=window.__S;S.otab='planner';S.f.pmode='month';S.f.pmonth=new Date(ym+'-01T00:00');S.f.pmshow='all';S.f.pmjobs=[];window.render()},ym);await p.waitForTimeout(500);
 ok(await p.isVisible('#pmf-show')&&await p.isVisible('#pmf-pick'),'the month has Everything / Jobs / My diary only and Which jobs');
 const bad12=await p.evaluate(ym=>{const c=document.querySelector('.mcell[data-d="'+ym+'-12"]');return c&&c.classList.contains('pmf-cbad')},ym);
 ok(bad12,'the 12th is marked ⚠️: both jobs, with the same person on both');
 const list=await p.innerText('#main .pmf-clashes');
 ok(/Jobs on the same days \(2\)/.test(list)&&/Sam Test/.test(list),'the clashes are listed under the month ('+list.split('\n')[0]+')');
 await p.screenshot({path:'h622-month.png'});
 await p.click('#pmf-pick');await p.waitForTimeout(300);
 await p.check('#sheet .pmf-j[data-i="0"]');await p.click('#f-save');await p.waitForTimeout(500);
 const t=await p.evaluate(()=>[...document.querySelectorAll('.mcell .mitem')].map(x=>x.innerText));
 ok(t.length&&t.some(x=>/Kitchen/.test(x))&&!t.some(x=>/Loft/.test(x))&&!(await p.locator('.mcell.pmf-cbad').count()),'picking one job shows only it, with no clashes ('+[...new Set(t)].join(', ')+')');
 await p.click('#pmf-show button[data-v="diary"]');await p.waitForTimeout(400);
 const d=await p.evaluate(()=>[...document.querySelectorAll('.mcell .mitem')].map(x=>x.innerText));
 ok(d.length===1&&/Mrs Example/.test(d[0])&&!(await p.isVisible('#pmf-pick')),'📅 My diary only shows the meeting and no jobs');
 await p.screenshot({path:'h622-diary.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h622: ${bad} failed`:'h622: all passed');await b.close();process.exit(bad?1:0);
})();
