// James's check-in rules, end to end (made-up people and sites; usual day 08:00–16:30).
// In before 08:00 → paid from 08:00. Out at or after 16:30 → paid to 16:30. Out any earlier (even 16:20) → must say
// why, paid to when they left. Started early / finished late → they say so and why; James sees ⏱ Extra hours to
// approve on Today and Timesheets, and paying it moves their hours. Moving job: this job stops, the next starts, or
// they're in transit until they tap ✅ I've arrived. Writes h616*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes(DD)&&page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
const now=new Date();const at=(h,m)=>new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,m,0);
const pad=n=>String(n).padStart(2,'0');const today=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1000,height:950}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const t=await ctx.newPage();t.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await t.clock.setFixedTime(at(7,45));
 await t.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src.replace(DD,'function detailsDone(d){return true}')+'</body></html>');await t.waitForTimeout(2500);await t.keyboard.press('Escape');
 const sheetTxt=()=>t.evaluate(()=>{const s=document.getElementById('sheet');return s&&!s.hidden?s.innerText:''});
 const shut=async()=>{if(await sheetTxt())await t.click('#f-cancel').catch(()=>{});await t.waitForTimeout(250);};
 const clear=()=>t.evaluate(d=>{const S=window.__S;S.mine.entries=S.mine.entries.filter(e=>e.date!==d&&!e.open);S.tab='time';window.render()},today);
 const mine=()=>t.evaluate(d=>window.__S.mine.entries.filter(e=>e.date===d&&e.checkIn).map(e=>Object.assign({},e)).sort((a,b)=>(b.updated||0)-(a.updated||0)),today);
 await clear();await t.waitForTimeout(300);
 const sites=await t.evaluate(()=>[...document.querySelectorAll('#ci-site option')].map(o=>o.value).filter(v=>v&&v!=='__other'));
 const checkIn=async(h,m,s)=>{await t.clock.setFixedTime(at(h,m));await t.evaluate(()=>window.render());await t.waitForTimeout(200);await t.selectOption('#ci-site',s||sites[0]);await t.click('.ci-in');await t.waitForTimeout(700);};
 const checkOut=async(h,m)=>{await t.clock.setFixedTime(at(h,m));await t.evaluate(()=>window.render());await t.waitForTimeout(200);await t.click('.ci-out');await t.waitForTimeout(700);};
 /* in early, out 20 min before finish */
 await checkIn(7,45);await shut();
 let E=(await mine()).find(e=>e.open);
 ok(E&&E.start==='08:00'&&E.actualIn==='07:45','in at 07:45 → paid from 08:00 ('+(E&&E.start)+')');
 await checkOut(16,35);
 let txt=await sheetTxt();
 ok(!/Checking out before/.test(txt),'out at 16:35 isn\'t treated as an early finish');
 E=(await mine())[0];
 ok(E&&E.finish==='16:30'&&E.actualOut==='16:35','out at 16:35 → paid to 16:30 ('+(E&&E.finish)+')');
 ok(/Different hours today/.test(txt)&&await t.isChecked('#otm-e'),'arriving 15 min early, they\'re asked if they started early');
 await t.fill('#otm-why','Unloading the block delivery');await t.click('#f-save');await t.waitForTimeout(700);await shut();
 E=(await mine())[0];
 ok(E&&E.ot&&E.ot.status==='asked'&&E.ot.early===15&&E.ot.why,'starting early is stated, with why, and sent to James');
 /* out late, after 30 min */
 await clear();await checkIn(8,0);await shut();await checkOut(17,40);
 E=(await mine())[0];txt=await sheetTxt();
 ok(E&&E.finish==='16:30'&&/Different hours today/.test(txt)&&await t.isChecked('#otm-l'),'out at 17:40 → paid to 16:30, and asked if they finished late');
 await shut();
 /* early finish */
 await clear();await checkIn(8,0);await shut();await checkOut(16,20);
 txt=await sheetTxt();
 ok(/Checking out before/.test(txt),'out at 16:20 (just 10 minutes early) asks why they\'re finishing early');
 await t.click('#crs-early button[data-v="Finishing early for the day"]');await t.click('#f-save');await t.waitForTimeout(800);await shut();
 E=(await mine()).find(e=>e.earlyWhy);
 ok(E&&!E.open&&E.finish==='16:20'&&E.earlyWhy==='Finishing early for the day','their hours stop at 16:20, with the reason');
 /* stopped at lunch, left at 13:20: asked what time they stopped (13:00 offered), paid to 13:00 */
 await clear();await checkIn(8,0);await shut();await checkOut(13,20);
 ok(/What time did you stop working/.test(await sheetTxt())&&await t.inputValue('#crs-stop')==='13:00','out at 13:20 in the lunch break: asked what time they stopped working (13:00 filled in)');
 await t.click('#crs-early button[data-v="Finishing early for the day"]');await t.click('#f-save');await t.waitForTimeout(800);await shut();
 E=(await mine()).find(e=>e.earlyWhy&&e.actualOut==='13:20');
 ok(E&&E.finish==='13:00'&&E.actualOut==='13:20'&&E.hours===5,'paid to 13:00 (5 hours – lunch not taken), and it keeps that they left at 13:20 ('+(E&&E.finish)+', '+(E&&E.hours)+')');
 /* moving job: start at another, then transit */
 await clear();await checkIn(8,0);await shut();
 await t.clock.setFixedTime(at(10,30));await t.evaluate(()=>window.render());await t.click('.ci-move');await t.waitForTimeout(400);
 await t.click('#crs-next button[data-v^="🏗"]');await t.selectOption('#crs-site',sites[1]);await t.click('#f-save');await t.waitForTimeout(1200);await shut();
 let L=await mine();const a=L.find(e=>e.job===sites[0]&&e.moveTo),b2=L.find(e=>e.open);
 ok(a&&a.finish==='10:30'&&b2&&b2.job===sites[1]&&b2.start==='10:30'&&!b2.travel,'"start at another job": signed out of the first at 10:30, into the next at 10:30');
 await t.clock.setFixedTime(at(13,0));await t.evaluate(()=>window.render());await t.click('.ci-move');await t.waitForTimeout(400);
 await t.click('#crs-next button[data-v^="🚚"]');await t.selectOption('#crs-site',sites[0]);await t.click('#f-save');await t.waitForTimeout(1200);await shut();
 L=await mine();const tr=L.find(e=>e.open);
 ok(tr&&tr.travel&&tr.job===sites[0]&&await t.isVisible('.crs-arr'),'"travelling": in transit to the next job until ✅ I\'ve arrived');
 await t.screenshot({path:'h616-transit.png'});
 /* James */
 const o=await ctx.newPage();o.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await o.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await o.waitForTimeout(2200);await o.keyboard.press('Escape');
 await o.click('#nl-tog');await o.waitForTimeout(300);
 await o.evaluate(async([d,s])=>{await window.__S.db.doc('sheets/emp1/entries/ot1').set({type:'hours',date:d,job:s,start:'08:00',finish:'16:30',actualIn:'07:45',actualOut:'16:10',breakMin:30,hours:8,checkIn:true,approved:false,ot:{early:15,late:0,lunch:0,from:'07:45',to:'',why:'Unloading the block delivery',status:'asked',at:1},created:1,updated:1});},[today,sites[0]]);
 await o.waitForTimeout(600);
 await o.evaluate(()=>{const S=window.__S;S.otab='today';window.render()});await o.waitForTimeout(500);
 ok(/Extra hours to approve/.test(await o.innerText('#main .otm-card'))&&/Unloading the block delivery/.test(await o.innerText('#main .otm-card')),'James is told on Today: ⏱ Extra hours to approve, with why');
 await o.screenshot({path:'h616-owner.png'});
 await o.click('#main .otm-card .otm-ok');await o.waitForTimeout(800);
 const ot=await o.evaluate(()=>window.__st['sheets/emp1/entries/ot1']);
 ok(ot.ot.status==='ok'&&ot.start==='07:45'&&ot.hours===8.25,'paying it moves their start to 07:45 and their hours to 8.25 ('+ot.start+', '+ot.hours+')');
 await o.evaluate(()=>window.render());await o.waitForTimeout(300);
 ok(!(await o.locator('#main .otm-card').count()),'and it leaves the list');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h616: ${bad} failed`:'h616: all passed');await b.close();process.exit(bad?1:0);
})();
