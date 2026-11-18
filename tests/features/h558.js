// Time off types (new look, all made-up): Book holiday or time off offers Holiday, Unpaid holiday, Sick leave,
// Maternity leave, Paternity leave, Bereavement leave, Appointment and Other. Booking maternity leave for Sam puts
// "Sam Test – maternity leave" on the planner and doesn't come off his holiday days; bereavement leave added on his
// holiday page shows under "Other time off"; only Holiday counts as taken.
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
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(500);
 await p.evaluate(async()=>{const S=window.__S;const h={start:'01-01',days:28,bankIn:false,people:{emp1:20}};await S.db.doc('settings/app').update({holidays:h});S.settings=Object.assign({},S.settings,{holidays:h});S.otab='planner';S.f.pmode='hol';window.render()});await p.waitForTimeout(600);
 const before=await p.innerText('.hol-row[data-w=emp1]');
 await p.click('#ht-book');await p.waitForTimeout(400);
 const types=await p.evaluate(()=>[...document.querySelectorAll('#lv-type button')].map(b=>b.textContent));
 ok(['Holiday','Unpaid holiday','Sick leave','Maternity leave','Paternity leave','Bereavement leave'].every(t=>types.includes(t)),'the types to book: '+types.join(', '));
 await p.selectOption('#lv-who','emp1');await p.click('#lv-type button[data-v=maternity]');
 await p.fill('#lv-from',(y+1)+'-01-04');await p.fill('#lv-to',(y+1)+'-06-25');await p.click('#f-save');await p.waitForTimeout(800);
 const s=await st();const m=Object.entries(s).find(([k,v])=>k.startsWith('plan/leave-')&&v&&/maternity/.test(v.title||''));
 ok(m&&m[1].title==='Sam Test – maternity leave','maternity leave is on the planner as "Sam Test – maternity leave"');
 const rec=Object.values(s).find(v=>v&&v.type==='leave'&&v.leaveType==='maternity');
 ok(rec&&rec.status==='approved','and saved as maternity leave');
 ok(/Maternity leave/.test(await p.innerText('.ht-page')),'the Holidays tab lists it under holidays and time off booked');
 /* bereavement leave added on his page, this year */
 await p.click('.hol-row[data-w=emp1]');await p.waitForTimeout(400);
 await p.click('#hp-add');await p.waitForTimeout(300);await p.click('#hp-type button[data-v=bereavement]');
 await p.fill('#hp-from',y+'-02-02');await p.fill('#hp-to',y+'-02-04');await p.click('#f-save');await p.waitForTimeout(800);
 const page=await p.innerText('#form');
 ok(/Other time off \(not taken off their holidays\): Bereavement leave 3 days/.test(page),'his page shows the bereavement leave under Other time off');
 ok(/taken\s*0|0\s*taken/.test(await p.evaluate(()=>[...document.querySelectorAll('#form .hol-boxes>div')].map(d=>d.querySelector('b').textContent+' '+d.querySelector('span').textContent).join(' | '))),'and none of it comes off his holiday days');
 ok(Object.values(await st()).some(v=>v&&v.title==='Sam Test – bereavement leave'),'the planner says "Sam Test – bereavement leave"');
 await p.click('#f-cancel');await p.waitForTimeout(300);
 ok((await p.innerText('.hol-row[data-w=emp1]')).replace(/\s+/g,' ')===before.replace(/\s+/g,' '),'his holiday figures are unchanged');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h558: ${bad} failed`:'h558: all passed');await b.close();process.exit(bad?1:0);
})();
