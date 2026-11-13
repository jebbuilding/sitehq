// Stages signed off, with a record (made-up job at 4 Rolle Road): the site has a ✅ Stages tile. ✎ Change the stages
// offers templates (Kitchen picked), and the list can be edited and saved as James's own template. Tapping "Strip out"
// signs it off with a date, who and a note; the record keeps it; "Not done after all" takes the tick off but the record
// still shows both. In Jobs, tapping a stage opens the same sign-off.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const SITE='4 Rolle Road, Exmouth';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(s=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.__S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(500);
 ok(await p.locator('.pjtile[data-t=stages]').count()===1,'the site has a ✅ Stages tile');
 await p.click('.pjtile[data-t=stages]');await p.waitForTimeout(400);
 await p.click('#stg-edit');await p.waitForTimeout(300);
 const tpls=await p.evaluate(()=>[...document.querySelectorAll('#stg-tpl option')].map(o=>o.textContent));
 ok(['Basic','Extension','Loft conversion','Kitchen','Bathroom','New build','Renovation'].every(t=>tpls.includes(t)),'templates to start from: '+tpls.slice(1).join(', '));
 await p.selectOption('#stg-tpl',{label:'Kitchen'});await p.waitForTimeout(100);
 ok(/^Strip out\n/.test(await p.inputValue('#stg-lines')),'picking Kitchen fills in its stages, which can be changed');
 await p.fill('#stg-lines',(await p.inputValue('#stg-lines'))+'\nClient walk-round');
 await p.fill('#stg-tname','My kitchen');await p.click('#f-save');await p.waitForTimeout(1200);
 const sr=await p.evaluate(()=>window.__st['sites/s2']);
 ok(sr.stages[0]==='Strip out'&&sr.stages[sr.stages.length-1]==='Client walk-round','the job\'s stages are saved, with the one he added');
 ok(await p.evaluate(()=>Object.values(window.__st).some(v=>v&&v.kind==='stagetpl'&&v.name==='My kitchen'&&v.stages.includes('Client walk-round'))),'and kept as his own template "My kitchen"');
 await p.click('.stg-row[data-i="0"]');await p.waitForTimeout(300);
 await p.fill('#stg-note','Kitchen out, skip collected');await p.click('#f-save');await p.waitForTimeout(1000);
 const s2=await p.evaluate(()=>window.__st['sites/s2']);
 ok(s2.stageDone['Strip out']&&s2.stageDone['Strip out'].note==='Kitchen out, skip collected'&&s2.stage===0,'Strip out is signed off, with the note, and the job moves on');
 const t=await p.innerText('#main');
 ok(/1 of \d+ stages signed off/.test(t)&&/Signed off/.test(t)&&/Record \(1\)/.test(t),'the page shows 1 signed off, and the record');
 await p.screenshot({path:OUT+'stg-1-site.png'});
 await p.click('.stg-row[data-i="0"]');await p.waitForTimeout(300);await p.check('#stg-undo');await p.click('#f-save');await p.waitForTimeout(1000);
 const s3=await p.evaluate(()=>window.__st['sites/s2']);
 ok(!s3.stageDone['Strip out']&&s3.stageLog.length===2&&s3.stageLog[1].act==='undone','"Not done after all" takes the tick off; the record keeps both');
 /* Jobs */
 await p.evaluate(s=>{window.__S.f.jbSel=s;window.__S.f.jbt='jobs'},SITE);await p.click('#nl-tog');await p.waitForTimeout(400);await p.click('.nl-b[data-s=jobs]');await p.waitForTimeout(600);
 if(await p.locator('.jb-st').count()){await p.locator('.jb-st').first().click();await p.waitForTimeout(300);ok(/Sign off Strip out/.test(await p.innerText('#sheet')),'in Jobs, tapping a stage opens the same sign-off');}
 else ok(false,'Jobs shows the stages');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h522: ${bad} failed`:'h522: all passed');await b.close();process.exit(bad?1:0);
})();
