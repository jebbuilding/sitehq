// Hours that don't come through (made-up people). On a trade's phone, an item that keeps failing to send no longer
// holds up the ones queued after it: they send, it stays to be tried again with what went wrong, and the phone tells
// James how many are waiting. James's Timesheets shows 📵 Not coming through: whose phone has items waiting (since
// when, and the problem) and who hasn't used the app for 3 days or more. Writes h614*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null')&&page_src.includes(DD),'test hooks found');
ok(page_src.split('const OB = { db: null, mem: [], busy: false };').length===2,'outbox hook found');
page_src=page_src.replace('const OB = { db: null, mem: [], busy: false };','const OB = { db: null, mem: [], busy: false };window.__OB=OB;').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1100,height:950}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 /* the trade's phone: a stuck item first, then a timesheet day */
 const t=await ctx.newPage();t.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await t.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src.replace(DD,'function detailsDone(d){return true}')+'</body></html>');await t.waitForTimeout(2500);await t.keyboard.press('Escape');
 const me=await t.evaluate(()=>window.__S.me);
 await t.evaluate(me=>{window.__OB.db=null;window.__OB.mem=[{qid:'stuck1',me,queued:1,coll:'photos',docId:'ph-stuck',data:{site:'x',date:'2026-11-06'},files:[{blob:null,name:'broken.jpg',field:'assetId'}]},{qid:'day2',me,queued:2,coll:'entries',docId:'ob-day2',data:{type:'hours',date:'2026-11-06',job:'12 Marine Way, Exmouth',start:'08:00',finish:'16:30',breakMin:30,hours:8,approved:false,created:2,updated:2}}];},me);
 await t.evaluate(()=>window.dispatchEvent(new Event('online')));await t.waitForTimeout(2500);
 const st=await t.evaluate(me=>({day:!!window.__st['sheets/'+me+'/entries/ob-day2'],sheet:window.__st['sheets/'+me]}),me);
 ok(st.day,'the timesheet day queued after a stuck item still sends');
 const left=await t.evaluate(()=>window.__OB.mem.map(j=>({qid:j.qid,tries:j.tries,err:j.err})));
 ok(left.length===1&&left[0].qid==='stuck1'&&left[0].tries===1&&left[0].err,'the stuck item stays, to try again, with what went wrong ('+JSON.stringify(left)+')');
 ok(st.sheet&&st.sheet.waiting===1&&st.sheet.waitingSince===1&&st.sheet.waitingErr,'the phone tells James 1 item is waiting ('+JSON.stringify({w:st.sheet&&st.sheet.waiting,e:st.sheet&&st.sheet.waitingErr})+')');
 /* James's Timesheets */
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(300);
 await p.evaluate(async()=>{const S=window.__S;const old=Date.now()-14*864e5;await S.db.doc('sheets/emp1').update({updated:old,deliveredAt:old,waiting:6,waitingSince:old,waitingErr:'timeout',waitingAt:old});});
 await p.waitForTimeout(500);
 await p.evaluate(()=>{const S=window.__S;S.otab='time';window.render()});await p.waitForTimeout(500);
 const txt=await p.evaluate(()=>{const c=document.querySelector('#main .psync-card');return c?c.innerText:''});
 ok(/Not coming through/.test(txt)&&/6 items waiting on their phone/.test(txt)&&/problem: timeout/.test(txt)&&/Last used the app/.test(txt),'James sees whose hours are stuck on their phone and when they last used the app');
 await p.screenshot({path:'h614-stuck.png',clip:{x:0,y:0,width:1100,height:700}});
 await p.evaluate(async()=>{await window.__S.db.doc('sheets/emp1').update({updated:Date.now(),waiting:0,waitingErr:'',waitingAt:Date.now()})});await p.waitForTimeout(500);
 await p.evaluate(()=>window.render());await p.waitForTimeout(300);
 ok(!(await p.locator('#main .psync-card').count()),'once everything has come through, the card goes');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h614: ${bad} failed`:'h614: all passed');await b.close();process.exit(bad?1:0);
})();
