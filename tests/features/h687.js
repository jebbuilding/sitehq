// Callbacks after the job (made-up client Sue Jones, portal u9): she reports a sticking back door in her portal; James sees
// it on Today and her page, books it in for Sam (on the planner) and marks it fixed; she taps ✓ It's sorted and it's
// signed off with her name, with the history kept.
// a signed £450 + VAT variation, an invoice sent with £3,000 paid, a stage signed off in the portal and two progress
// photos shared. The owner's app copies just Sue's money to her portal record; Sue's 📖 Job story shows the price
// agreed (£12,540 with the extra), invoiced, paid and left to pay, stages signed off, and a timeline newest first
// with the photos, the sign-offs, the invoice and the payment.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const SITE='4 Rolle Road, Exmouth';
const extra='store["todos/c1"].portalUid="u9";';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
function mk(mode,storeDump){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra+(storeDump?'Object.assign(store,'+storeDump.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${')+');':''));if(mode==='client')src=src.replace("id:async()=>${owner?'\"owner\"':'\"emp1\"'}",'id:async()=>"u9"');eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake(mode==='owner');}
const open=async(b,mode,dump)=>{const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});p.on('dialog',d=>d.accept('still sticks'));
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+mk(mode,dump)+page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({viewClient});function render() {')+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');return p;};
const cbks=(p)=>p.evaluate(()=>Object.entries(window.__st).filter(([k,v])=>v&&/^portal\/u9\/callbacks\//.test(k)).map(([k,v])=>v));
(async()=>{const b=await chromium.launch();
 try{
 let q=await open(b,'client');
 ok(await q.isVisible('#cbk-new'),'Sue\'s portal home has 🔧 Something not right? – Report a problem');
 await q.click('#cbk-new');await q.waitForTimeout(400);
 await q.fill('#cbk-tx','The back door sticks when it rains');await q.fill('#cbk-rm','Kitchen');await q.selectOption('#cbk-u','soon');
 await q.click('#f-save');await q.waitForTimeout(1200);
 let L=await cbks(q);
 ok(L.length===1&&L[0].status==='new'&&L[0].room==='Kitchen','it\'s sent and kept in her portal');
 ok(/Reported/.test(await q.innerText('.cbk-pt')),'she sees it as Reported');
 let dump=await q.evaluate(()=>JSON.stringify(window.__st));await q.context().close();
 /* James */
 let p=await open(b,'owner',dump);
 await p.click('#nl-tog').catch(()=>{});await p.waitForTimeout(3500);
 await p.evaluate(()=>{window.__S.otab='today';window.render()});await p.waitForTimeout(600);
 ok(await p.isVisible('.cbk-today')&&/back door sticks/.test(await p.innerText('.cbk-today')),'Today: 🔧 Callbacks to sort – Sue Jones, the back door');
 await p.click('.cbk-go');await p.waitForTimeout(800);
 ok(await p.isVisible('.cbk-it')&&/back door sticks/.test(await p.innerText('.cbk-it')),'her page lists the callback');
 await p.click('.cbk-book');await p.waitForTimeout(500);
 await p.selectOption('#cbk-who','emp1');await p.click('#f-save');await p.waitForTimeout(1200);
 const plan=await p.evaluate(()=>Object.entries(window.__st).find(([k,v])=>v&&/^plan\/cbk-/.test(k)));
 ok(plan&&plan[1].people.includes('emp1')&&/Callback: Sue Jones/.test(plan[1].title),'📅 Book it in puts it on Sam\'s planner');
 await p.click('.cbk-fix');await p.waitForTimeout(1000);
 L=await cbks(p);
 ok(L[0].status==='fixed'&&L[0].log.length===3,'✓ Fixed asks her to check (booked and fixed in its history)');
 dump=await p.evaluate(()=>JSON.stringify(window.__st));await p.context().close();
 /* Sue checks it */
 q=await open(b,'client',dump);
 ok(await q.isVisible('.cbk-ok'),'her portal asks: is it sorted?');
 await q.screenshot({path:'h687-portal.png'});
 await q.click('.cbk-ok');await q.waitForTimeout(1000);
 L=await cbks(q);
 ok(L[0].status==='done'&&/Signed off as sorted by Sue Jones/.test(L[0].log.slice(-1)[0].t),'✓ It\'s sorted signs it off with her name');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h687: ${bad} failed`:'h687: all passed');await b.close();process.exit(bad?1:0);
})();
