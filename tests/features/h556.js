// Holidays (new look, all made-up): tap a person in 🌴 Holidays for their page – add a holiday they've already had
// (past dates; it goes on the planner and counts as taken), change it, an adjustment for days not in the app and
// their days a year (saved in settings), and delete one (gone from the planner too). The Holidays tab opens it too.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const y=new Date().getFullYear();
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 const st=()=>p.evaluate(()=>window.__st);
 const leaves=async()=>Object.entries(await st()).filter(([k,v])=>k.startsWith('sheets/emp1/signoffs/')&&v&&v.type==='leave'&&v.reply==='Put in by James');
 const boxes=()=>p.evaluate(()=>[...document.querySelectorAll('#form .hol-boxes>div')].map(d=>d.querySelector('span').textContent+'='+d.querySelector('b').textContent).join(' '));
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(500);
 await p.evaluate(async()=>{const S=window.__S;const h={start:'01-01',days:28,bankIn:false,people:{emp1:20}};await S.db.doc('settings/app').update({holidays:h});S.settings=Object.assign({},S.settings,{holidays:h});S.otab='planner';S.f.pmode='hol';window.render()});await p.waitForTimeout(600);
 ok(await p.locator('.hol-row[data-w=emp1]').count()===1,'Sam is listed in the allowances, tappable');
 await p.click('.hol-row[data-w=emp1]');await p.waitForTimeout(400);
 ok(/Sam Test – holidays/.test(await p.innerText('#sheettitle')),'tapping opens Sam\'s holiday page');
 const b0=await boxes();ok(/a year=20/.test(b0),'their figures ('+b0+')');
 /* add a holiday they've already had (Mon 2 – Wed 4 Feb this year) */
 await p.click('#hp-add');await p.waitForTimeout(300);
 await p.fill('#hp-from',y+'-02-02');await p.fill('#hp-to',y+'-02-04');await p.fill('#hp-lnote','Forgot to put it in');
 await p.click('#f-save');await p.waitForTimeout(700);
 let L=await leaves();
 ok(L.length===1&&L[0][1].from===y+'-02-02'&&L[0][1].status==='approved','the past holiday is saved as approved');
 const pid='plan/leave-'+L[0][0].split('/').pop();
 ok((await st())[pid]&&(await st())[pid].from===y+'-02-02'&&(await st())[pid].type==='holiday','and it\'s on the planner');
 const b1=await boxes();ok(b1!==b0&&/Forgot to put it in/.test(await p.innerText('#form')),'back on their page, with it listed and counted ('+b1+')');
 /* change it to one day */
 await p.click('.hp-row[data-l="'+L[0][0].split('/').pop()+'"] .hp-ed');await p.waitForTimeout(300);
 ok(await p.inputValue('#hp-from')===y+'-02-02','Change opens it with its dates');
 await p.fill('#hp-to',y+'-02-02');await p.click('#f-save');await p.waitForTimeout(700);
 L=await leaves();
 ok(L[0][1].to===y+'-02-02'&&(await st())[pid].to===y+'-02-02','the change is saved, the planner follows');
 /* an adjustment and their days a year */
 await p.fill('#hp-adj','2.5');await p.fill('#hp-note','Days before the app');await p.fill('#hp-allow','22');await p.click('#f-save');await p.waitForTimeout(700);
 const h=(await st())['settings/app'].holidays;
 ok(h.adj&&h.adj.emp1&&h.adj.emp1[y+'-01-01'].days===2.5&&h.people.emp1===22,'adjustment and days a year saved');
 await p.click('.hol-row[data-w=emp1]');await p.waitForTimeout(400);
 const b2=await boxes();ok(/a year=22/.test(b2)&&/taken=(3½|[4-9])/.test(b2),'figures include the adjustment ('+b2+')');
 /* delete */
 await p.click('.hp-row[data-l="'+L[0][0].split('/').pop()+'"] .hp-del');await p.waitForTimeout(200);
 ok(/Tap again/.test(await p.innerText('.hp-row[data-l="'+L[0][0].split('/').pop()+'"] .hp-del')),'Delete asks for a second tap');
 await p.click('.hp-row[data-l="'+L[0][0].split('/').pop()+'"] .hp-del');await p.waitForTimeout(700);
 ok((await leaves()).length===0&&!(await st())[pid],'deleted, and gone from the planner');
 await p.click('#f-cancel');await p.waitForTimeout(300);
 /* the Holidays tab: a booked holiday opens the person's page */
 await p.evaluate(async(y)=>{await window.__S.db.doc('sheets/emp1/signoffs/leave-zz').set({type:'leave',leaveType:'holiday',from:(y+1)+'-01-05',to:(y+1)+'-01-06',status:'approved',created:1});await window.__S.db.doc('plan/leave-leave-zz').set({type:'holiday',title:'Sam Test – off',from:(y+1)+'-01-05',to:(y+1)+'-01-06',people:['emp1'],vis:'all',leaveId:'leave-zz',created:1});window.render()},y);await p.waitForTimeout(600);
 await p.click('.ht-row[data-p="leave-leave-zz"]');await p.waitForTimeout(400);
 ok(/Sam Test – holidays/.test(await p.innerText('#sheettitle'))&&await p.locator('.hp-row[data-l="leave-zz"]').count()===1,'a holiday on the Holidays tab opens Sam\'s page for that holiday year');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h556: ${bad} failed`:'h556: all passed');await b.close();process.exit(bad?1:0);
})();
