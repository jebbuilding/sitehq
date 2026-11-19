// Site hours, simple jobs and the programme link (made-up people and sites).
// The site page's Timesheet hours / Extra work / People are buttons, with each person's hours on the job under them;
// tapping one opens Timesheets on that job (and that person) at the latest week with hours there.
// Programme: 🟢 Open the job for a simple job (no stages), ✅ Close the job, ↺ Reopen, 📊 Turn it into a full
// programme. The site's 🧱 Progress opens the programme. Writes h612*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'state hook found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
const pad=n=>String(n).padStart(2,'0');const fmt=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1180,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(400);
 const site=await p.evaluate(()=>window.__S.sites[0].name);
 /* two days and some extra work, three weeks ago, on this site only */
 const d0=new Date();d0.setDate(d0.getDate()-21);const mon=new Date(d0);mon.setDate(d0.getDate()-((d0.getDay()+6)%7));
 const days=[fmt(mon),fmt(new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()+1))];
 await p.evaluate(async([site,days])=>{const S=window.__S;
   for(const [k] of Object.entries(window.__st)) if(/^sheets\/[^/]+\/entries\//.test(k)) await S.db.doc(k).delete();
   await S.db.doc('sheets/emp1/entries/sh1').set({type:'hours',date:days[0],job:site,start:'08:00',finish:'16:30',breakMin:30,hours:8,approved:false,created:1,updated:1});
   await S.db.doc('sheets/emp1/entries/sh2').set({type:'hours',date:days[1],job:site,start:'08:00',finish:'16:30',breakMin:30,hours:8,approved:false,created:2,updated:2});
   await S.db.doc('sheets/emp1/entries/sh3').set({type:'job',kind:'extra',date:days[1],job:site,task:'Extra socket',hours:3,approved:false,created:3,updated:3});
 },[site,days]);
 await p.waitForTimeout(700);
 await p.evaluate(s=>{const S=window.__S;S.otab='projects';S.f.proj=s;S.f.projList=false;S.f.pjSite=s;S.f.pjtab='overview';S.f.range='all';window.render()},site);await p.waitForTimeout(600);
 const tots=await p.evaluate(()=>[...document.querySelectorAll('#main .shrs-tots .tot .n')].map(x=>x.innerText));
 ok(tots[0]==='16'&&tots[1]==='3','the site shows 16 timesheet hours and 3 extra work hours ('+tots.join(', ')+')');
 const row=await p.innerText('#main .shrs-row[data-w="emp1"]');
 ok(/16 h/.test(row)&&/\+ 3 h extra/.test(row)&&/2 days/.test(row),'each person\'s hours on the job are listed ('+row.replace(/\n/g,' ')+')');
 await p.screenshot({path:'h612-hours.png'});
 await p.click('#main .shrs-row[data-w="emp1"]');await p.waitForTimeout(600);
 const t=await p.evaluate(()=>{const S=window.__S;const w=S.week;return {otab:S.otab,site:S.f.fltSite,who:S.f.fltWho,wk:w.getFullYear()+'-'+String(w.getMonth()+1).padStart(2,'0')+'-'+String(w.getDate()).padStart(2,'0')}});
 ok(t.otab==='time'&&t.site===site.toLowerCase()&&t.who.join()==='emp1'&&t.wk===days[0],'tapping opens Timesheets on this job, for that person, on that week ('+JSON.stringify(t)+')');
 const card=await p.evaluate(()=>{const d=document.querySelector('details.card[data-id="emp1"]');return d?(d.open?'open ':'')+d.innerText.replace(/\s+/g,' '):''});
 ok(/^open /.test(card)&&/Extra socket/.test(card),'with their timesheet open, showing the job\'s days');
 await p.screenshot({path:'h612-time.png'});
 /* programme: simple job */
 await p.evaluate(s=>{const S=window.__S;S.f.fltSite='';S.f.fltWho=[];S.otab='projects';S.f.proj=s;S.f.pjtab='programme';window.render()},site);await p.waitForTimeout(500);
 ok(await p.isVisible('#pg-simple'),'Programme offers 🟢 Open the job for a simple job');
 await p.click('#pg-simple');await p.waitForTimeout(700);
 let pr=await p.evaluate(s=>JSON.parse(JSON.stringify((window.__S.programmes||[]).find(x=>x.site===s)||null)),site);
 ok(pr&&pr.simple&&pr.stages.length===1&&!pr.stages[0].done,'it opens the job with no stages to fill in');
 ok(/Job open since/.test(await p.innerText('#main .pg-sim')),'and shows the job open');
 await p.screenshot({path:'h612-open.png'});
 await p.click('#pg-sclose');await p.waitForTimeout(700);
 pr=await p.evaluate(s=>JSON.parse(JSON.stringify((window.__S.programmes||[]).find(x=>x.site===s))),site);
 ok(pr.stages[0].done&&pr.stages[0].actTo>=pr.start&&/Job closed/.test(await p.innerText('#main .pg-sim')),'✅ Close the job closes it today');
 const plan=await p.evaluate(s=>(window.__S.plan||[]).filter(x=>x.id&&x.id.startsWith('prg-')).length,site);
 ok(plan>=1,'it is on the planner');
 await p.click('#pg-sreopen');await p.waitForTimeout(700);
 ok(/Job open since/.test(await p.innerText('#main .pg-sim')),'↺ Reopen opens it again');
 await p.click('#pg-sfull');await p.waitForTimeout(700);
 ok(await p.locator('#main .pg-tbl').count()===1,'📊 Turn it into a full programme shows the stages table');
 /* the site's progress opens the programme */
 await p.evaluate(()=>{const S=window.__S;S.f.pjtab='overview';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('#main .jh-prog'),'the site shows its progress');
 await p.click('#main .jh-prog');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>window.__S.f.pjtab==='programme')&&await p.locator('#main .pg-tbl').count()===1,'tapping the progress opens the programme for the job');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h612: ${bad} failed`:'h612: all passed');await b.close();process.exit(bad?1:0);
})();
