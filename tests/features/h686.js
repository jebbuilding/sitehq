// Long-lead items (made-up job 4 Rolle Road, kitchen programme starting Mon 4 Jan 2027, today Tue 24 Nov 2026): + Kitchen
// is needed for Fit units with a 6-week lead; its order-by date is that stage's start less 6 weeks and 3 working days;
// a longer lead makes it late and Today lists it; ✓ Ordered clears it.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({LLD,pgRec,pgCalc});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1200,height:1300}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.clock.install({time:new Date('2026-11-24T10:00:00')});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.clock.runFor(2500);await p.keyboard.press('Escape');
 const SITE='4 Rolle Road, Exmouth';
 const open=async()=>{await p.evaluate(s=>{const S=window.__S;S.otab='projects';S.f.projList=false;S.f.proj=s;window.render();S.f.pjtab='programme';window.render()},SITE);await p.clock.runFor(600);};
 await open();
 await p.fill('#pg-start','2027-01-04');await p.click('.pg-new[data-t=kitchen]');await p.clock.runFor(1500);
 ok(await p.isVisible('.lld')&&await p.locator('.lld-pre').count()>=6,'the programme has 📦 Long-lead items with the usual ones to add');
 await p.locator('.lld-pre',{hasText:'Kitchen'}).click();await p.clock.runFor(1000);
 const info=await p.evaluate(s=>{const T=window.__T();const pr=T.pgRec(s);const fu=pr.stages.find(x=>/Fit units/.test(x.name));const L=window.__S.longLeads.find(x=>x.site===s).items[0];return {stage:L.stage===fu.id,from:T.pgCalc(pr)[fu.id].from,ob:T.LLD.orderBy(s,L)}},SITE);
 ok(info.stage,'+ Kitchen is needed for the Fit units stage');
 const exp=(()=>{const d=new Date(info.from+'T12:00:00');d.setDate(d.getDate()-42);let n=3;while(n>0){d.setDate(d.getDate()-1);if(d.getDay()%6)n--;}return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})();
 ok(info.ob===exp,'order by '+info.ob+': Fit units starts '+info.from+', less 6 weeks and 3 working days');
 ok(/Order by/.test(await p.innerText('.lld-row')),'the row says Order by …');
 /* a longer lead: it should have been ordered already */
 await p.locator('.lld-row .lld-k').fill('12');await p.locator('.lld-row .lld-k').dispatchEvent('change');await p.clock.runFor(1000);
 ok(/Should have been ordered by/.test(await p.innerText('.lld-row')),'12 weeks: ⚠️ should have been ordered already');
 await p.screenshot({path:'h686-programme.png'});
 await p.evaluate(()=>{window.__S.otab='today';window.render()});await p.clock.runFor(600);
 if(!(await p.isVisible('.lld-today'))){await p.click('#nl-tog').catch(()=>{});await p.clock.runFor(600);}
 ok(await p.isVisible('.lld-today')&&/Kitchen/.test(await p.innerText('.lld-today'))&&/late/.test(await p.innerText('.lld-today')),'Today: 📦 To order – Kitchen, late');
 await p.click('.lld-go');await p.clock.runFor(800);
 await p.click('.lld-row .lld-ok');await p.clock.runFor(1000);
 ok(/✓ Ordered/.test(await p.innerText('.lld-row')),'✓ Ordered marks it with today\'s date');
 ok(await p.evaluate(()=>window.__T().LLD.dueList().length===0),'and it comes off Today');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h686: ${bad} failed`:'h686: all passed');await b.close();process.exit(bad?1:0);
})();
