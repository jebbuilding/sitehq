// Check-in reasons and moving job (made-up people and sites). A trade checking in after their usual start is asked
// why (paid from when they checked in); 🚚 Stop here / move to another job ends this job now and starts the next –
// travelling (✅ I've arrived records when they get there) or starting there now; checking out before their usual
// finish is asked why. James sees the reasons and moves on the timesheet. Writes h609*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes(DD)&&page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
const pad=n=>String(n).padStart(2,'0');const now=new Date();
const at=(h,m)=>new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,m,0);
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1000,height:950}});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true');localStorage.setItem('jeb.splash','1')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.clock.setFixedTime(at(9,30));
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src.replace(DD,'function detailsDone(d){return true}')+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 const closeSheet=async()=>{if(await p.evaluate(()=>{const s=document.getElementById('sheet');return s&&!s.hidden}))await p.click('#f-cancel').catch(()=>{});await p.waitForTimeout(250);};
 await p.evaluate(()=>{const S=window.__S;S.tab='time';const t=new Date(),td=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');S.mine.entries=S.mine.entries.filter(e=>!e.open&&e.date!==td);window.render()});await p.waitForTimeout(500);
 const D=await p.evaluate(()=>{const s=document.querySelector('.checkin .who');return s?s.innerText:''});
 const sites=await p.evaluate(()=>[...document.querySelectorAll('#ci-site option')].map(o=>o.value).filter(v=>v&&v!=='__other'));
 ok(sites.length>=2,'there are sites to choose ('+sites.length+')');
 await p.selectOption('#ci-site',sites[0]);
 /* 09:30: late */
 await p.click('.ci-in');await p.waitForTimeout(400);
 ok(/Checking in after/.test(await p.innerText('#sheet')),'checking in after the usual start asks why ('+D.slice(0,40)+')');
 await p.click('#crs-late button[data-v="Late to work"]');await p.fill('#crs-ln','Traffic on the A376');
 await p.screenshot({path:'h609-late.png'});
 await p.click('#f-save');await p.waitForTimeout(800);await closeSheet();
 let E=await p.evaluate(()=>window.__S.mine.entries.filter(e=>e.type==='hours'&&e.checkIn).map(e=>Object.assign({},e)));
 const e1=E.find(e=>e.open);
 ok(e1&&e1.start==='09:30'&&e1.lateWhy==='Late to work – Traffic on the A376','checked in, paid from 09:30, with the reason ('+(e1&&e1.start)+', '+(e1&&e1.lateWhy)+')');
 /* 11:00: move to another job, travelling */
 await p.clock.setFixedTime(at(11,0));await p.evaluate(()=>window.render());await p.waitForTimeout(300);
 ok(await p.isVisible('.ci-move'),'the check-in card has 🚚 Stop here / move to another job');
 await p.click('.ci-move');await p.waitForTimeout(400);
 const opts=await p.evaluate(()=>[...document.querySelectorAll('#crs-site option')].map(o=>o.value).filter(v=>v&&v!=='__other'));
 ok(!opts.includes(sites[0])&&opts.includes(sites[1]),'it offers the other jobs');
 await p.click('#crs-next button[data-v^="🚚"]');await p.selectOption('#crs-site',sites[1]);
 await p.screenshot({path:'h609-move.png'});
 await p.click('#f-save');await p.waitForTimeout(1200);await closeSheet();
 E=await p.evaluate(()=>window.__S.mine.entries.filter(e=>e.type==='hours'&&e.checkIn).map(e=>Object.assign({},e)));
 const a=E.find(e=>e.id===e1.id),b2=E.find(e=>e.open);
 ok(a&&!a.open&&a.finish==='11:00'&&a.moveTo===sites[1]&&a.moveWhy==='travel','the first job stops at 11:00, marked as left to travel');
 ok(b2&&b2.job===sites[1]&&b2.start==='11:00'&&b2.travel&&b2.fromJob===sites[0]&&!b2.lateWhy,'the next job starts at 11:00, travelling from the first');
 ok(await p.isVisible('.crs-arr'),'it shows ✅ I\'ve arrived');
 await p.clock.setFixedTime(at(11,40));await p.click('.crs-arr');await p.waitForTimeout(600);
 const arr=await p.evaluate(()=>(window.__S.mine.entries.find(e=>e.open)||{}).arrivedAt);
 ok(arr==='11:40','arriving records 11:40 ('+arr+')');
 await p.screenshot({path:'h609-arrived.png'});
 /* 15:00: early finish */
 await p.clock.setFixedTime(at(15,0));await p.evaluate(()=>window.render());await p.waitForTimeout(300);
 await p.click('.ci-out');await p.waitForTimeout(400);
 ok(/Checking out before/.test(await p.innerText('#sheet'))&&await p.isVisible('#sheet .crs-tomove'),'checking out early asks why, or offers to move job');
 await p.click('#crs-early button[data-v="Finishing early for the day"]');
 await p.click('#f-save');await p.waitForTimeout(900);await closeSheet();
 const b3=await p.evaluate(id=>Object.assign({},window.__S.mine.entries.find(e=>e.id===id)),b2.id);
 ok(!b3.open&&b3.finish==='15:00'&&b3.earlyWhy==='Finishing early for the day','checked out at 15:00 with the reason');
 /* on time: no question */
 await p.clock.setFixedTime(at(7,50));
 await p.evaluate(()=>{const S=window.__S;S.mine.entries=S.mine.entries.filter(e=>!e.checkIn);window.render()});await p.waitForTimeout(400);
 await p.selectOption('#ci-site',sites[0]);await p.click('.ci-in');await p.waitForTimeout(600);
 ok(!/Checking in after/.test(await p.evaluate(()=>{const s=document.getElementById('sheet');return s&&!s.hidden?s.innerText:''})),'checking in before the usual start asks nothing');
 /* James sees the reasons on the timesheet */
 const o=await ctx.newPage();o.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await o.clock.setFixedTime(at(16,0));
 await o.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await o.waitForTimeout(2200);await o.keyboard.press('Escape');
 const d=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
 await o.evaluate(async([d,s0,s1])=>{const S=window.__S;
  await S.db.doc('sheets/emp1/entries/crs1').set({type:'hours',date:d,job:s0,start:'09:30',finish:'11:00',breakMin:0,hours:1.5,checkIn:true,lateWhy:'Late to work',moveTo:s1,moveWhy:'travel',approved:false,created:1,updated:1});
  await S.db.doc('sheets/emp1/entries/crs2').set({type:'hours',date:d,job:s1,start:'11:00',finish:'15:00',breakMin:30,hours:3.5,checkIn:true,travel:true,moved:true,fromJob:s0,arrivedAt:'11:40',earlyWhy:'Finishing early for the day',approved:false,created:2,updated:2});
  S.otab='time';S.open.add('emp1');window.render();},[d,sites[0],sites[1]]);
 await o.waitForTimeout(700);
 const why=await o.evaluate(()=>[...document.querySelectorAll('details.card[data-id="emp1"] .crs-why')].map(x=>x.innerText).join(' | '));
 ok(/Late in: Late to work/.test(why)&&/Left to travel to/.test(why)&&/Travelled from .*arrived 11:40/.test(why)&&/Left early: Finishing early for the day/.test(why),'James sees the reasons and moves ('+why+')');
 await o.screenshot({path:'h609-owner.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h609: ${bad} failed`:'h609: all passed');await b.close();process.exit(bad?1:0);
})();
