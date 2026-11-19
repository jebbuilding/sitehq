// James's own time (made-up sites). Timesheets and Day work start with 🙋 My own time: + My timesheet day opens the
// day already filled in (today, usual hours) and saves it on his own sheet; his days this week are listed, each
// opening to change; 🧱 + My day work opens day work; ⏱ Check in like the trades opens his own Time page.
// Writes h613*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'state hook found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1180,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(400);
 await p.evaluate(()=>{const S=window.__S;S.week=new Date();S.otab='time';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('#main .myt-card[open]'),'Timesheets starts with 🙋 My own time, open');
 ok(await p.isVisible('#myt-h')&&await p.isVisible('#myt-j')&&await p.isVisible('#myt-ci'),'with + My timesheet day, 🧱 + My day work and ⏱ Check in');
 const before=await p.evaluate(()=>window.__S.mine.entries.length);
 await p.click('#myt-h');await p.waitForTimeout(400);
 const f=await p.evaluate(()=>({date:document.getElementById('f-date').value,start:(document.getElementById('f-start')||{}).value,finish:(document.getElementById('f-finish')||{}).value}));
 const t=new Date();const today=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
 ok(f.date===today&&f.start&&f.finish,'the day opens filled in: today, usual start and finish ('+JSON.stringify(f)+')');
 const job=await p.$('#sheet select#f-job, #sheet select[id^="f-job"]');
 if(job){const v=await p.evaluate(()=>{const s=document.querySelector('#sheet select#f-job, #sheet select[id^="f-job"]');const o=[...s.options].find(o=>o.value&&o.value!=='__other'&&!o.disabled);return o?o.value:''});if(v)await p.selectOption('#sheet select#f-job, #sheet select[id^="f-job"]',v);}
 await p.screenshot({path:'h613-day.png'});
 await p.click('#f-save');await p.waitForTimeout(900);
 const after=await p.evaluate(()=>window.__S.mine.entries.filter(e=>e.type==='hours').length);
 const errTxt=await p.evaluate(()=>{const s=document.getElementById('sheet');return s&&!s.hidden?s.innerText.slice(0,200):''});
 ok(after>=1&&await p.evaluate(()=>window.__S.mine.entries.length)>before,'saving puts the day on his own sheet'+(errTxt?' ('+errTxt.replace(/\n/g,' | ')+')':''));
 if(errTxt)await p.click('#f-cancel').catch(()=>{});
 await p.evaluate(()=>window.render());await p.waitForTimeout(400);
 ok(await p.locator('#main .myt-card .myt-row').count()>=1,'his days this week are listed in the card');
 await p.click('#main .myt-card .myt-row >> nth=0');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>{const s=document.getElementById('sheet');return !!s&&!s.hidden}),'tapping one opens it to change');
 await p.click('#f-cancel');await p.waitForTimeout(300);
 await p.screenshot({path:'h613-card.png'});
 /* day work */
 await p.click('#myt-j');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>{const s=document.getElementById('sheet');return !!s&&!s.hidden&&!!document.getElementById('f-task')}),'🧱 + My day work opens day work');
 await p.click('#f-cancel');await p.waitForTimeout(300);
 await p.evaluate(()=>{const S=window.__S;S.otab='daywork';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('#main .myt-card'),'Day work starts with 🙋 My own time too');
 /* check in like the trades */
 await p.click('#myt-ci');await p.waitForTimeout(600);
 ok(await p.evaluate(()=>window.__S.preview&&window.__S.tab==='time'),'⏱ Check in opens his own Time page, like the trades');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h613: ${bad} failed`:'h613: all passed');await b.close();process.exit(bad?1:0);
})();
