// Lone working (made-up trade Sam Test): checked in on site, Sam taps 🧍 I'm working on my own and picks "In 1 hour".
// When that time passes his screen goes red; 👍 I'm OK sets the next time. When he misses that one too, James's Today
// shows ⚠️ Not checked in with Sam's site and time, and James gets a warning. Checking out ends it. Writes h688*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
let page_src=fs.readFileSync('timesheets.html','utf8');
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.includes(DD)&&page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace(DD,'function detailsDone(d){return true}').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
function mk(owner,storeDump){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+(storeDump?'Object.assign(store,'+storeDump.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${')+');':''));eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake(owner);}
const now=new Date();const at=(h,m)=>new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,m,0);
const open=async(b,owner,time,dump)=>{const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.clock.install({time});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+mk(owner,dump)+page_src+'</body></html>');await p.clock.runFor(2500);await p.keyboard.press('Escape');return p;};
const mine=(t)=>t.evaluate(()=>window.__S.mine.entries.filter(e=>e.open).map(e=>Object.assign({},e)));
(async()=>{const b=await chromium.launch();
 try{
 let t=await open(b,false,at(8,50));
 await t.evaluate(()=>{const S=window.__S;S.mine.entries=S.mine.entries.filter(e=>!e.open);S.tab='time';window.render()});await t.clock.runFor(300);
 await t.clock.setFixedTime(at(9,0));
 const site=await t.evaluate(()=>[...document.querySelectorAll('#ci-site option')].map(o=>o.value).filter(v=>v&&v!=='__other')[0]);
 await t.selectOption('#ci-site',site);await t.click('.ci-in');await t.waitForTimeout(800);
 await t.keyboard.press('Escape');await t.click('#f-cancel').catch(()=>{});await t.waitForTimeout(300);
 ok(await t.isVisible('.lwk-start'),'on site: 🧍 I\'m working on my own');
 await t.click('.lwk-start');await t.waitForTimeout(300);
 ok(/When will you next check in/.test(await t.innerText('#sheet')),'it asks when he\'ll next check in');
 await t.click('.lwk-gap >> nth=0');await t.click('#f-save');await t.waitForTimeout(800);
 let E=(await mine(t))[0];
 ok(E&&E.alone&&E.aloneBy==='10:00','saved on his check-in: on his own, check in by 10:00');
 ok(/Check in by\s*10:00/.test(await t.innerText('.lwk-box')),'his card says check in by 10:00');
 await t.clock.setFixedTime(at(10,5));await t.evaluate(()=>window.render());await t.waitForTimeout(300);
 ok(await t.isVisible('.lwk-box.lwk-late'),'10:05 and no 👍 – his card goes red');
 await t.screenshot({path:'h688-trade.png'});
 await t.click('.lwk-ok');await t.waitForTimeout(300);await t.click('.lwk-gap >> nth=1');await t.click('#f-save');await t.waitForTimeout(800);
 E=(await mine(t))[0];
 ok(E.aloneBy==='12:05'&&E.aloneLog.length===2&&!(await t.isVisible('.lwk-box.lwk-late')),'👍 I\'m OK – next check-in 12:05, back to normal');
 const dump=await t.evaluate(()=>JSON.stringify(window.__st));await t.context().close();
 /* James, 12:20 */
 let p=await open(b,true,at(12,20),dump);
 await p.click('#nl-tog').catch(()=>{});await p.clock.runFor(3500);
 await p.evaluate(()=>{window.__S.otab='today';window.render()});await p.clock.runFor(600);
 ok(await p.isVisible('.lwk-today.lwk-late'),'Today: ⚠️ Not checked in');
 const tx=await p.innerText('.lwk-today');
 ok(/Sam Test/.test(tx)&&/was due 12:05/.test(tx),'it names Sam and the time he was due');
 await p.clock.runFor(61000);await p.waitForTimeout(300);
 const toast=await p.evaluate(()=>[...document.querySelectorAll('.lwk-alert')].map(x=>x.innerText).join(' '));
 ok(/Sam Test is working on their own and hasn't checked in/.test(toast),'James gets a warning wherever he is, which stays until he taps OK');await p.screenshot({path:'h688-alert.png'});await p.click('.lwk-seen');ok(!(await p.isVisible('.lwk-alert')),'OK clears it');
 await p.screenshot({path:'h688-today.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h688: ${bad} failed`:'h688: all passed');await b.close();process.exit(bad?1:0);
})();
