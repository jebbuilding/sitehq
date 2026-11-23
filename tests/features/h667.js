// Address book shows the person, Job to see shows the job (made-up clients Sue Jones and Bob Lee). James, Nov 2026: the two
// brought up the same page. From 📒 Address book: client details, contacts, keys, Jobs & work history, Delete client – not
// the stage, visit, photos or Price this job. From Job to see: the job with the client's details box at the top – not the
// address book parts. Each has a button to the other; notes and calls are on both.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(400);
 const vis=async s=>p.locator(s).first().isVisible().catch(()=>false);
 const go=async(f,id)=>{await p.evaluate(f=>{window.__S.otab='clients';window.__S.f.clf=f;window.__S.f.clq='';window.render()},f);await p.waitForTimeout(500);
   await p.locator('.cl-open[data-c="'+id+'"]').first().scrollIntoViewIfNeeded();await p.click('.cl-open[data-c="'+id+'"]');await p.waitForTimeout(700);};
 /* address book: the person */
 await go('book','c1');
 ok(await vis('#cv-edit2')&&!(await vis('#cv-enq2'))&&await vis('#cv-tojob'),'📒 Address book › Sue: ✎ Edit client details and 🔨 Open their current job at the top (no Edit enquiry)');
 ok(await vis('#ch-add')&&await vis('#cv-delete')&&await vis('#cv-more'),'her details side: Jobs & work history, her jobs, Delete client');
 ok(!(await vis('#cv-stage'))&&!(await vis('#cv-price'))&&!(await vis('#cv-site'))&&!(await vis('#cv-gosite')),'not the job: no stage, Price this job or site button');
 ok(await vis('#cv-addnote'),'notes and calls are there');
 await p.screenshot({path:'h667-person.png'});
 await p.click('#cv-tojob');await p.waitForTimeout(700);
 ok(await vis('#cv-stage')&&await vis('#cv-price')&&await vis('#cv-toper')&&!(await vis('#cv-edit2'))&&!(await vis('#cv-delete'))&&!(await vis('#ch-add')),'🔨 Open their current job switches to the job');
 await p.click('#cv-toper');await p.waitForTimeout(700);
 ok(await vis('#ch-add')&&!(await vis('#cv-stage')),'👤 Client details & past work switches back');
 await p.click('#viewer-close').catch(()=>{});await p.keyboard.press('Escape');await p.waitForTimeout(300);
 /* job to see: the job */
 await go('see','c2');
 ok(await vis('#cv-enq2')&&/Edit enquiry/.test(await p.innerText('#cv-enq2'))&&await vis('#cv-toper')&&!(await vis('#cv-edit2')),'Job to see › Bob: ✎ Edit enquiry and 👤 Client details & past work at the top (no Edit client details)');
 ok(await vis('.cldet')&&/07700 ?900222/.test(await p.innerText('.cldet')),'his name, phone and address are at the top');
 ok(await vis('#cv-stage')&&await vis('#cv-price')&&await vis('#cv-addnote')&&!(await vis('#cv-delete'))&&!(await vis('#ch-add')),'the job: stage, Price this job, notes – not the address book parts');
 await p.screenshot({path:'h667-job.png'});
 await p.click('#cv-enq2');await p.waitForTimeout(700);
 ok(/Edit enquiry/.test(await p.innerText('#sheettitle')),'✎ Edit enquiry opens the enquiry');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h667: ${bad} failed`:'h667: all passed');await b.close();process.exit(bad?1:0);
})();
