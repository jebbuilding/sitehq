// Trades sign in by the phone's location (made-up trade Sam, made-up site 4 Rolle Road with a map pin): Today opens
// with a 📍 Sign in card that finds he's at 4 Rolle Road and signs him in with one tap, then shows where and since
// when with Sign out. The same card is at the top of Sites. Somewhere else (2 km away) it asks him to choose the site.
// Sign in is no longer in More; Materials & tools is "Materials & tools requests"; Forms is in More, Sites on the bar.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
const extra='store["sites/s2"].lat=50.6200;store["sites/s2"].lon=-3.4100;';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(DD).length===2,'details hook found');
const html='<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+fake(false)+page_src.replace(DD,'function detailsDone(d){return true}')+'</body></html>';
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
async function open(b,geo){const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,geolocation:geo,permissions:['geolocation']});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.tradelook','true');localStorage.setItem('jeb.instLater','true')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await p.goto('https://sitehq.test/');await p.waitForTimeout(2500);await p.keyboard.press('Escape');await p.waitForTimeout(500);return p;}
(async()=>{const b=await chromium.launch();
 try{
 const p=await open(b,{latitude:50.6203,longitude:-3.4102});
 ok(await p.locator('#tsi-card').count()===1,'Today has a 📍 Sign in card');
 const t=await p.innerText('#tsi-card');
 ok(/You're at/.test(t)&&/4 Rolle Road, Exmouth/.test(t)&&/\d+ m away/.test(t),'it finds he\'s at 4 Rolle Road from the phone\'s location ('+t.replace(/\n/g,' | ')+')');
 await p.screenshot({path:OUT+'tsi-1-today.png'});
 await p.click('#tsi-in');await p.waitForTimeout(1200);
 const si=await p.evaluate(()=>Object.entries(window.__st).filter(([k])=>/^sheets\/emp1\/entries\//.test(k)).map(([k,v])=>v));
 ok(si.length>=1&&si.some(x=>x.job==='4 Rolle Road, Exmouth'&&x.open&&x.checkIn),'one tap signs him in at 4 Rolle Road – his timesheet day starts');
 ok(/Signed in at 4 Rolle Road, Exmouth/.test(await p.innerText('#tsi-card'))&&await p.isVisible('#tsi-out'),'the card shows where he\'s signed in, with Sign out');
 await p.screenshot({path:OUT+'tsi-2-signed-in.png'});
 await p.click('#tsi-out');await p.waitForTimeout(1200);if(await p.isVisible('#f-cancel'))await p.click('#f-cancel');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>Object.entries(window.__st).filter(([k])=>/^sheets\/emp1\/entries\//.test(k)).every(([k,v])=>!v.open)),'Sign out signs him out');
 await p.click('#tlbar .tl-b[data-t=plans]');await p.waitForTimeout(800);
 ok(await p.locator('#tsi-card').count()===1&&/4 Rolle Road/.test(await p.innerText('#tsi-card')),'the same card is at the top of Sites');
 await p.screenshot({path:OUT+'tsi-3-sites.png'});
 await p.click('#tlbar .tl-b[data-t=more]');await p.waitForTimeout(400);
 const mm=await p.innerText('#main');
 ok(!/Sign in/.test(mm)&&/Materials & tools requests/.test(mm)&&/Forms/.test(mm),'More: no Sign in, "Materials & tools requests", and Forms');
 const q=await open(b,{latitude:50.6380,longitude:-3.4100});
 const t2=await q.innerText('#tsi-card');
 ok(/not at one of our sites/.test(t2)&&await q.locator('#tsi-site').count()===1,'2 km away it asks him to choose the site');
 await q.selectOption('#tsi-site','4 Rolle Road, Exmouth');await q.waitForTimeout(1200);
 ok(/Signed in at 4 Rolle Road, Exmouth/.test(await q.innerText('#tsi-card')),'choosing the site signs him in');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h504: ${bad} failed`:'h504: all passed');await b.close();process.exit(bad?1:0);
})();
