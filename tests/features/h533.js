// Time that isn't on a site (made-up data): James's own timesheet has "Not on a site" choices (Office / paperwork,
// Pricing & quoting, Van, tools & yard…) and "Job not a site yet" with his client Sue Jones (estimate sent, no site
// yet) in the Site or job box; checking in to Office / paperwork says "Clocked in" (not "On site"); a day added for
// Sue's job is saved with her client id; a trade doesn't get these choices (only James and managers do), and a
// trade made a Manager in Setup › People & access gets the Not on a site choices but never client names.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const seed2=seed.replace('stage:"won",portalCode','stage:"quote",portalCode').replace('created:1,site:"4 Rolle Road, Exmouth"}','created:1}');
if(seed2===seed)throw new Error('seed patch did not match');
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed2);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='setup';window.__S.f.stab='setup';window.render()});await p.waitForTimeout(400);
 await p.click('#op-det');await p.waitForTimeout(400);const fill=async(id,v)=>{if(await p.locator('#dt-'+id).count())await p.fill('#dt-'+id,v)};await fill('fullName','James Test');await fill('dob','1980-01-01');await fill('mobile','07700900999');await fill('address','1 Test Lane');await fill('postcode','EX8 1AA');await fill('trade','Builder');await fill('nokName','Test Person');await fill('nokRel','Partner');await fill('nokPhone','07700900998');await p.check('#dt-ok');await p.click('#f-save');await p.waitForTimeout(1200);await p.evaluate(()=>{document.getElementById('sheet').hidden=true;window.__S.otab='setup';window.render()});await p.waitForTimeout(300);
 await p.click('.op-me[data-t=time]');await p.waitForTimeout(800);
 const groups=await p.$$eval('#ci-site optgroup',g=>g.map(x=>x.label+': '+[...x.querySelectorAll('option')].map(o=>o.value).join(' | ')));
 ok(groups.some(g=>/^Sites:/.test(g)),'check-in box lists the sites under Sites');
 ok(groups.some(g=>/^Not on a site:.*Office \/ paperwork.*Pricing & quoting.*Van, tools & yard/.test(g)),'and Not on a site: office, quoting, van & yard…');
 ok(groups.some(g=>/^Job not a site yet:.*Sue Jones – 4 Rolle Road/.test(g)),'and Job not a site yet: Sue Jones');
 await p.selectOption('#ci-site','Office / paperwork');await p.click('.ci-in');await p.waitForTimeout(800);
 ok(/Clocked in/i.test(await p.innerText('.checkin.on'))&&!/On site/i.test(await p.innerText('.checkin.on .cistate')),'checked in to Office / paperwork says Clocked in, not On site');
 await p.screenshot({path:OUT+'nst-1-clocked.png'});
 const mine=()=>p.evaluate(()=>window.__S.mine.entries.map(e=>({job:e.job,clientId:e.clientId||'',open:!!e.open})));
 ok((await mine()).some(e=>e.job==='Office / paperwork'&&e.open),'the clock is running on Office / paperwork');
 await p.click('#addJ');await p.waitForTimeout(500);
 await p.selectOption('#f-job','Not a site yet: Sue Jones – 4 Rolle Road');await p.fill('#f-task','Measured up for the loft');await p.fill('#f-hrs','2');
 await p.screenshot({path:OUT+'nst-2-form.png'});
 await p.click('#f-save');await p.waitForTimeout(1000);
 ok((await mine()).some(e=>/Sue Jones/.test(e.job)&&e.clientId==='c1'),'time on Sue\'s job (not a site yet) is saved with her client');
 /* a trade: Not on a site, but no client names */
 const tsrc=page_src.replace('function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}','function detailsDone(d){return true}');
 if(tsrc===page_src)throw new Error('detailsDone patch did not match');
 const t=await ctx.newPage();t.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await t.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+tsrc+'</body></html>');await t.waitForTimeout(2000);await t.keyboard.press('Escape');
 await t.evaluate(()=>{window.__S.tab='time';window.render()});await t.waitForTimeout(500);
 const opts=()=>t.$$eval('#ci-site option',o=>o.map(x=>x.value));
 ok(await t.locator('#ci-site').count()===1&&!(await opts()).includes('Office / paperwork'),'a trade who is not a manager just gets the sites');
 await t.evaluate(()=>{const S=window.__S;S.settings=Object.assign({},S.settings,{access:{office:{people:{[S.me]:'manager'}}}});S.tab='time';window.render()});await t.waitForTimeout(500);
 const tg=await t.$$eval('#ci-site optgroup',g=>g.map(x=>x.label));
 ok(tg.includes('Not on a site')&&(await opts()).includes('Office / paperwork'),'a trade made a Manager gets Not on a site');
 ok(!tg.includes('Job not a site yet')&&!(await opts()).some(v=>/Sue/.test(v)),'but never client names');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h533: ${bad} failed`:'h533: all passed');await b.close();process.exit(bad?1:0);
})();
