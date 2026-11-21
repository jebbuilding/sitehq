// Who's nearest and rings on the sites map (made-up people and places): pick a trade – their home postcode goes on the
// map, the nearest jobs are listed with miles, a rough drive time and 🚗 Route; a job's card says how far they are.
// ⭕ Rings: 3 and 7 miles from your base, saved; Hide rings takes them off.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra=`store["sites/sm1"]={name:"5 Map Lane, Exmouth",lat:50.62,lon:-3.41};
store["sites/sm3"]={name:"Hill Farm, Honiton",lat:50.80,lon:-3.19};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1100}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('api.postcodes.io/postcodes/'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({result:{latitude:50.63,longitude:-3.38}})});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 const w=await p.evaluate(async()=>{const S=window.__S;const w=Object.keys(S.team||{})[0];const d=Object.assign({},(S.team[w]||{}).details||{},{postcode:'EX8 1AA',trade:'Carpenter'});await S.db.doc('sheets/'+w).update({details:d});const co=Object.assign({},(S.settings||{}).company||{},{lat:50.62,lon:-3.40});await S.db.doc('settings/app').update({company:co});return w});
 await p.waitForTimeout(600);
 await p.click('#tabs .tab[data-t=projects]');await p.waitForTimeout(400);await p.click('#st-map');await p.waitForTimeout(600);
 ok(await p.isVisible('#smp-who'),"the map has 🧭 Who's nearest");
 await p.selectOption('#smp-who','p:'+w);await p.waitForTimeout(800);
 const near=await p.innerText('#smp-list');console.log(near.replace(/\n+/g,' | '));
 ok(/Nearest jobs to/.test(near)&&/5 Map Lane[\s\S]*mi[\s\S]*min/.test(near),'the nearest jobs are listed with miles and minutes');
 ok(near.indexOf('5 Map Lane')<near.indexOf('Hill Farm'),'nearest first');
 ok(/origin=EX8%201AA/.test(await p.getAttribute('#smp-list a.pillbtn','href')||''),'🚗 Route goes from their postcode');
 ok(await p.locator('.smp-pin').count()===1,'they are on the map');
 await p.click('.sm-pin');await p.waitForTimeout(300);
 ok(/away/.test(await p.innerText('#sm-card'))&&await p.locator('.smp-line').count()===1,'a job\'s card says how far they are, with a line to them');
 await p.click('#smp-rings');await p.waitForTimeout(300);await p.fill('#smp-ri','7, 3');await p.click('#f-save');await p.waitForTimeout(600);
 const st=await p.evaluate(()=>Object.values(window.__st).find(v=>v&&v.mapRings));
 ok(st&&st.mapRings.join()==='3,7','rings saved as 3 and 7 miles');
 await p.click('#sm-fit');await p.waitForTimeout(300);
 const rl=await p.$$eval('.sm-ring i',x=>x.map(i=>i.textContent));console.log(rl);
 ok(rl.includes('3 mi')||rl.includes('7 mi'),'the rings show on the map');
 await p.screenshot({path:'h640-map.png'});
 await p.click('#smp-rtog');await p.waitForTimeout(200);
 ok(await p.locator('.sm-ring').count()===0,'Hide rings takes them off');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h640: ${bad} failed`:'h640: all passed');await b.close();process.exit(bad?1:0);
})();
