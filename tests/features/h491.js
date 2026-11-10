// Holidays (made-up employee Sam): 28 days a year including the 8 bank holidays in 2026. Sam has taken 3–7 Aug (5 days),
// has 21–24 Dec booked (4 days – Christmas and the 28th are bank holidays), and has asked for 29–31 Dec (3 days, not
// answered yet). Sam's planner shows 🌴 My holidays: 28 a year, 5 taken, 4 booked, 3 waiting, 11 left, with the list
// and the bank holidays. James's planner shows the same for Sam, and the settings set the year and allowances.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["sheets/emp1/signoffs/hl1"]={type:"leave",leaveType:"holiday",from:"2026-08-03",to:"2026-08-07",status:"approved",created:1};'+
 'store["sheets/emp1/signoffs/hl2"]={type:"leave",leaveType:"holiday",from:"2026-12-21",to:"2026-12-28",status:"approved",created:2};'+
 'store["sheets/emp1/signoffs/hl3"]={type:"leave",leaveType:"holiday",from:"2026-12-29",to:"2026-12-31",status:"open",created:3};';
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
let page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(DD).length===2,'details hook found');
const trade_src=page_src.replace(DD,'function detailsDone(d){return true}');
function mk(owner){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake(owner);}
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:1000}});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());
 try{
 /* Sam */
 const t=await ctx.newPage();t.on('pageerror',e=>{console.log('ERR trade',e.message);bad++;});
 await t.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+mk(false)+trade_src+'</body></html>');await t.waitForTimeout(2200);await t.keyboard.press('Escape');
 /* Sam is an employee on the usual 28 days (set through the app's own records) */
 await t.evaluate(async()=>{await window.__S.db.doc('settings/app').update({holidays:{start:'01-01',days:28,bankIn:true,people:{emp1:28}}});});await t.waitForTimeout(300);
 await t.evaluate(()=>{const b=document.querySelector('.tab[data-t=planner]');if(b)b.click();else{window.__S.tab='planner';window.render();}});await t.waitForTimeout(600);
 ok(await t.locator('.hol-card').count()===1,'Sam\'s planner has 🌴 My holidays');
 await t.evaluate(()=>{const d=document.querySelector('.hol-card');d.open=true;});await t.waitForTimeout(200);
 const tx=await t.innerText('.hol-card');console.log(tx.replace(/\n+/g,' | ').slice(0,400));
 const box=await t.$$eval('.hol-boxes>div',x=>x.map(d=>d.innerText.replace(/\s+/g,' ')));console.log(box);
 ok(box.join(',')==='28 a year,5 taken,4 booked,5 waiting,11 left','28 a year, 5 taken, 4 booked, 5 waiting (3 days at Christmas and 2 already asked for), 11 left');
 ok(/8 bank holidays come out of the 28/.test(tx),'it says the 8 bank holidays come out of the 28');
 ok(/Mon 3 Aug – Fri 7 Aug\s*5 days · taken/.test(tx)&&/Mon 21 Dec – Mon 28 Dec\s*4 days · booked/.test(tx)&&/3 days · waiting for an answer/.test(tx),'each holiday is listed: taken, booked, waiting');
 /* James */
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR owner',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+mk(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.evaluate(async()=>{await window.__S.db.doc('settings/app').update({holidays:{start:'01-01',days:28,bankIn:true,people:{emp1:28}}});});await p.waitForTimeout(300);
 await p.evaluate(()=>{window.__S.otab='planner';window.render()});await p.waitForTimeout(600);
 await p.evaluate(()=>{const d=document.querySelector('.hol-card');if(d)d.open=true;});await p.waitForTimeout(200);
 const ot=await p.innerText('.hol-card');console.log(ot.replace(/\n+/g,' | ').slice(0,300));
 ok(/Sam Test/.test(ot)&&/5 taken · 4 booked · 5 waiting · 11 left/.test(ot),'James sees Sam\'s figures');
 await p.click('#hol-set');await p.waitForTimeout(300);
 await p.fill('.hol-pv[data-w=emp1]','30');await p.click('#f-save');await p.waitForTimeout(600);
 const h=await p.evaluate(()=>window.__S.settings.holidays);
 ok(h.people.emp1===30,'James can give Sam a different allowance');
 ok(/30 a year/.test(await p.innerText('.hol-card'))&&/13 left/.test(await p.innerText('.hol-card')),'and it shows straight away (13 left)');
 /* the team page */
 await p.evaluate(()=>{window.__S.otab='people';window.render()});await p.waitForTimeout(600);
 const tt=await p.innerText('.hol-team');console.log(tt.split(String.fromCharCode(10)).join(' | ').slice(0,400));
 ok(/Holiday requests/.test(tt)&&await p.locator('.hol-team .lv-yes').count()>=1,'the team page has the holiday requests with Approve');
 ok(/Sam Test has 13 days left in that holiday year before this/.test(tt),'with how many days Sam has left');
 ok(await p.locator('.hol-card').count()===1,'and everyone\'s holiday figures');
 await p.locator('.hol-team .lv-yes').first().click();await p.waitForTimeout(300);await p.click('#f-save');await p.waitForTimeout(700);
 const st=await p.evaluate(()=>Object.entries(window.__st).filter(([k,v])=>k.startsWith('sheets/emp1/signoffs/')&&v.type==='leave').map(([k,v])=>v.status));console.log(st);
 ok(st.filter(x=>x==='approved').length===3,'approving it from the team page works');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h491: ${bad} failed`:'h491: all passed');await b.close();process.exit(bad?1:0);
})();
