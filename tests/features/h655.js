// Job photos: filter and choose what the client sees (made-up client Sue Jones, 4 Rolle Road; photos by Sam and James).
// Sites › 4 Rolle Road › Photos: filters by date (from/to), taken by, stage and "Sue sees"; the one photo already in Sue's
// portal has 👁. 👁 Choose what Sue sees: tap one on and the shared one off, Save – her portal then has just the new one
// (the photo stays in the job). Sue's portal 📷 Photos shows only what James chose.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const HOOK='function render() {';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2,'render hook found once');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace(HOOK,'window.render=render;'+HOOK);
const SITE='4 Rolle Road, Exmouth';
const ph=(who,id,date,cat,asset)=>`store["sheets/${who}/photos/${id}"]={assetId:"${asset}",site:"${SITE}",date:"${date}",takenAt:Date.parse("${date}T10:00:00Z"),category:"${cat}",caption:"",created:1};`;
const extra='store["todos/c1"].portalUid="u9";'+
 ph('emp1','r1','2026-10-01','Groundworks','a-r1')+ph('emp1','r2','2026-10-20','First fix','a-r2')+ph('owner','r3','2026-11-10','First fix','a-r3')+ph('emp1','r4','2026-11-15','Second fix','a-r4')+
 'store["portal/u9/docs/s1"]={title:"Footings",fileName:"photo.jpg",assetId:"a-r1",contentType:"image/jpeg",folder:"photos",sharedAt:1};'+
 'store["portal/u9/docs/d1"]={title:"Drawing",fileName:"plan.pdf",assetId:"a-pdf",contentType:"application/pdf",folder:"drawings",sharedAt:1};';
function mk(mode,dump){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra+(dump?'Object.keys(store).filter(k=>k.startsWith("portal/u9/docs/")).forEach(k=>delete store[k]);Object.assign(store,'+dump+');':''));if(mode==='client')src=src.replace("id:async()=>${owner?'\"owner\"':'\"emp1\"'}",'id:async()=>"u9"');eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake(mode==='owner');}
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1200}});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());
 const open=async(mode,dump)=>{const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+mk(mode,dump)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');return p;};
 try{
 const p=await open('owner');
 await p.evaluate(s=>{const S=window.__S;S.otab='projects';S.f.projList=false;S.f.proj=s;S.f.pjtab='photos';S.f.range='all';window.render()},SITE);await p.waitForTimeout(500);await p.click('.pjtst-b[data-t=photos]');await p.waitForTimeout(1200);
 ok(await p.isVisible('#jph-from')&&await p.isVisible('#jph-who')&&await p.isVisible('#jph-stage')&&await p.isVisible('#jph-cl'),'the job\'s Photos has filters: dates, taken by, stage, what Sue sees');
 ok(/Sue can see 1 of 4 photos/.test(await p.innerText('#main')),'it says Sue can see 1 of the 4 photos');
 const n=async()=>p.locator('#main .phgrid .ph').count();
 await p.selectOption('#jph-who','emp1');await p.waitForTimeout(400);
 ok(await n()===3,'Taken by Sam: 3 photos');
 await p.selectOption('#jph-stage','First fix');await p.waitForTimeout(400);
 ok(await n()===1,'and First fix: 1 photo');
 await p.click('#jph-clear');await p.waitForTimeout(400);
 await p.fill('#jph-from','2026-10-15');await p.dispatchEvent('#jph-from','change');await p.waitForTimeout(300);
 await p.fill('#jph-to','2026-11-12');await p.dispatchEvent('#jph-to','change');await p.waitForTimeout(400);
 ok(await n()===2,'15 Oct to 12 Nov: 2 photos');
 await p.click('#jph-clear');await p.waitForTimeout(300);
 await p.selectOption('#jph-cl','yes');await p.waitForTimeout(400);
 ok(await n()===1&&await p.locator('#main .ph[data-a="a-r1"] .jph-eye').count()===1,'Ones Sue can see: the footings photo, with 👁');
 await p.click('#jph-clear');await p.waitForTimeout(300);
 await p.screenshot({path:'h655-filters.png'});
 /* choose */
 await p.click('#jph-pick');await p.waitForTimeout(400);
 ok(await p.locator('.jph-pk').count()===4&&await p.locator('.jph-pk[aria-pressed=true]').count()===1,'choosing: all 4 photos, the shared one ticked');
 await p.click('.jph-pk[data-a="a-r1"]');await p.click('.jph-pk[data-a="a-r3"]');
 await p.screenshot({path:'h655-choose.png'});
 await p.click('#jph-save');await p.waitForTimeout(1500);
 const st=await p.evaluate(()=>window.__st);
 const docs=Object.entries(st).filter(([k])=>k.startsWith('portal/u9/docs/')).map(([,v])=>v);
 ok(docs.some(d=>d.assetId==='a-r3'&&d.folder==='photos'&&d.photoId==='r3')&&!docs.some(d=>d.assetId==='a-r1'),'saved: the new photo is in her portal, the footings one taken off');
 ok(docs.some(d=>d.assetId==='a-pdf'),'her drawing in the portal is left alone');
 ok(!!st['sheets/emp1/photos/r1'],'the photo taken off is still in the job');
 ok(/Sue can see 1 of 4 photos/.test(await p.innerText('#main')),'the page now counts what she can see again');
 /* Sue */
 const dump=JSON.stringify(Object.fromEntries(Object.entries(st).filter(([k])=>k.startsWith('portal/u9/docs/'))));
 const q=await open('client',dump);
 await q.click('.ptabs button[data-v=photos]');await q.waitForTimeout(500);
 const imgs=await q.evaluate(()=>[...document.querySelectorAll('.pt-doc img')].length);
 ok(imgs===1,'Sue\'s 📷 Photos shows just the one James chose ('+imgs+')');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h655: ${bad} failed`:'h655: all passed');await b.close();process.exit(bad?1:0);
})();
