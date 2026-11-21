// Where everyone lives (made-up people and places): Employees › 🗺️ Map of where everyone lives – a pin for each person
// from their home postcode, with the jobs or merchants; tapping a person shows how far they are from head office, their
// nearest job and merchant, and 🚗 Route.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra=`store["sites/sm1"]={name:"5 Map Lane, Exmouth",lat:50.62,lon:-3.41};
store["todos/sup-t1"]={kind:"supplier",name:"Test Timber",address:"1 Yard Road, Exeter EX2 7AA"};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('api.postcodes.io/postcodes/')){const pc=decodeURIComponent(u.split('/postcodes/')[1]);const ll=/EX2/.test(pc)?[50.70,-3.50]:[50.63,-3.38];return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({result:{latitude:ll[0],longitude:ll[1]}})})}r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(async()=>{const S=window.__S;const w=Object.keys(S.team||{})[0];const d=Object.assign({},(S.team[w]||{}).details||{},{postcode:'EX8 1AA',trade:'Carpenter'});await S.db.doc('sheets/'+w).update({details:d});const co=Object.assign({},(S.settings||{}).company||{},{lat:50.62,lon:-3.40});await S.db.doc('settings/app').update({company:co})});
 await p.waitForTimeout(600);
 await p.evaluate(()=>{const S=window.__S;S.otab='people';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('#pp-map'),'Employees has 🗺️ Map of where everyone lives');
 await p.click('#pp-map');await p.waitForTimeout(1500);
 ok(await p.locator('.sm-pin.emp').count()>=1,'a pin where each person lives');
 ok(await p.locator('.sm-pin.live').count()>=1,'with the live jobs');
 await p.click('#sm-f button[data-v="mers"]');await p.waitForTimeout(300);
 ok(await p.locator('.sm-pin.mer').count()===1&&await p.locator('.sm-pin.live').count()===0,'or the merchants instead');
 await p.click('#sm-f button[data-v="all"]');await p.waitForTimeout(300);
 await p.locator('.sm-pin.emp').first().click();await p.waitForTimeout(300);
 const card=await p.innerText('#sm-card');console.log(card.replace(/\n+/g,' | '));
 ok(/Head office/.test(card)&&/Nearest job/.test(card)&&/Nearest merchant: Test Timber/.test(card),'tapping a person: head office, nearest job and merchant');
 ok(await p.locator('#sm-card a',{hasText:'Route'}).count()===1,'with 🚗 Route');
 await p.screenshot({path:'h643-team.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h643: ${bad} failed`:'h643: all passed');await b.close();process.exit(bad?1:0);
})();
