// Courses (new look, all made-up): the planner's tab is now "🌴 Holidays & leave"; "🎓 Book someone on a course" there
// (and in the ⋯ menu) books Sam and the owner on a course with its details – saved as a planner entry of type course,
// listed on the tab as "🎓 Course: …", shown under "🎓 On a course" in Who's where, and tapping it shows the details
// (run by, where, booking ref, what to bring, cost) with Edit opening the course form again.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const nx=new Date();nx.setDate(nx.getDate()+7+((8-nx.getDay())%7));const mon=nx.toISOString().slice(0,10);const tue=new Date(nx.getTime()+864e5).toISOString().slice(0,10);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 const st=()=>p.evaluate(()=>window.__st);
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(500);
 await p.evaluate(()=>{const S=window.__S;S.otab='planner';S.f.pmode='hol';window.render()});await p.waitForTimeout(600);
 ok((await p.innerText('#pb-mode button[data-v=hol]')).includes('Holidays & leave'),'the tab is called "Holidays & leave"');
 await p.click('#ht-course');await p.waitForTimeout(400);
 ok(/Book someone on a course/.test(await p.innerText('#sheettitle')),'"Book someone on a course" opens the course form');
 await p.fill('#crs-name','SMSTS');await p.check('.crs-who[value=emp1]');await p.check('.crs-who[value="'+await p.evaluate(()=>window.__S.me)+'"]');
 await p.fill('#crs-from',mon);await p.fill('#crs-to',tue);await p.fill('#crs-t0','08:30');await p.fill('#crs-t1','16:30');
 await p.fill('#crs-prov','Test Training Ltd');await p.fill('#crs-where','Unit 1, Test Park');await p.fill('#crs-ref','BK-123');await p.fill('#crs-cost','495');await p.fill('#crs-bring','Photo ID');
 await p.click('#f-save');await p.waitForTimeout(800);
 const e=Object.entries(await st()).find(([k,v])=>k.startsWith('plan/crs-')&&v&&v.title==='SMSTS');
 ok(e&&e[1].type==='course'&&e[1].people.includes('emp1')&&e[1].people.length===2&&e[1].from===mon&&e[1].to===tue&&e[1].time==='08:30','saved on the planner as a course, Sam and the owner on it');
 ok(e&&e[1].course.provider==='Test Training Ltd'&&e[1].course.where==='Unit 1, Test Park'&&e[1].course.ref==='BK-123'&&e[1].course.cost===495&&e[1].course.bring==='Photo ID','with the course\'s details');
 const id=e[0].slice(5);
 ok(/🎓 Course: SMSTS/.test(await p.innerText('.ht-row[data-p="'+id+'"]')),'listed on the tab as "🎓 Course: SMSTS"');
 await p.click('.ht-row[data-p="'+id+'"]');await p.waitForTimeout(500);
 const v=await p.innerText('#viewer');
 ok(/SMSTS/i.test(v)&&/Test Training Ltd/.test(v)&&/Unit 1, Test Park/.test(v)&&/BK-123/.test(v)&&/Photo ID/.test(v)&&/£495/.test(v),'tapping it shows the details');
 await p.click('#pd-edit');await p.waitForTimeout(400);
 ok(await p.inputValue('#crs-name')==='SMSTS'&&await p.inputValue('#crs-ref')==='BK-123','Edit opens the course form with its details');
 await p.click('#f-cancel');await p.waitForTimeout(300);
 /* Who's where that Monday */
 await p.evaluate(m=>{const S=window.__S;S.f.pmode='where';S.f.pwday=m;window.render()},mon);await p.waitForTimeout(600);
 const w=await p.innerText('.pl-where');
 ok(/🎓 On a course/.test(w)&&/Sam Test/.test(w),'Who\'s where shows them "On a course"');
 /* the ⋯ menu has it too */
 await p.click('#pb-menu');await p.waitForTimeout(300);
 ok(await p.locator('.pb-menu button[data-k=course]').count()===1,'the planner\'s ⋯ menu has "Book someone on a course"');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h559: ${bad} failed`:'h559: all passed');await b.close();process.exit(bad?1:0);
})();
