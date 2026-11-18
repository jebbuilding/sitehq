// Health & safety tidy (made-up job at 4 Rolle Road): the page no longer has a separate Risk assessments & method
// statements card; the 📝 Make RAMS for a site card has the RAMS box for the site picked – the RAMS the job's hazards
// need with one-tap Make, and + RAMS that isn't on the list – and making them files them in that site's RAMS;
// ✍ Fill it in myself comes back to Health & safety with the same site still picked.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const SITE='4 Rolle Road, Exmouth';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:1300},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true');localStorage.setItem('jeb.splash','1')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});if(u.startsWith('https://sitehq.test/'))return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset=utf8><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fake(true)+page_src+'</body></html>'});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.goto('https://sitehq.test/');await p.waitForTimeout(3000);await p.keyboard.press('Escape');
 await p.evaluate(async s=>{const o=document.getElementById('ohq');if(o)o.hidden=true;const S=window.__S;await S.db.doc('todos/cdm-test').set({kind:'cdm',site:s,cd:{risks:{exc:1}},updated:Date.now()});S.otab='hs';window.render()},SITE);await p.waitForTimeout(400);await p.waitForTimeout(600);
 const t=await p.innerText('#main');
 ok(!/Risk assessments & method statements/.test(t)&&await p.locator('#ra-new').count()===0,'Health & safety has no separate Risk assessments & method statements card');
 await p.selectOption('#hs-site',SITE);await p.waitForTimeout(400);
 const box=await p.innerText('#hs-rabox');
 ok(/RAMS for these hazards/.test(box)&&/Excavations, foundations and drainage/.test(box)&&/RAMS that isn't on the list/.test(box),'the Make RAMS card has the RAMS box for the site picked (excavations to make, and + RAMS that isn\'t on the list)');
 ok(await p.locator('#hs-mk').count()===1&&/Make from saved RAMS/.test(await p.innerText('#hs-mk')),'the Make from saved RAMS button is still there');
 await p.screenshot({path:OUT+'hs-rams.png'});
 await p.click('#hs-mkra');await p.waitForTimeout(4000);
 ok(await p.evaluate(s=>Object.values(window.__st).some(v=>v&&v.cat==='rams'&&v.site===s&&v.cdmKey==='exc'),SITE),'Make files the excavations RAMS in '+SITE+' › RAMS');
 await p.click('#hs-raown1');await p.waitForTimeout(500);
 await p.fill('#ra-act','Laying a patio');await p.fill('.rh','Manual handling of slabs');await p.fill('.rc','Two-person lifts; slab trolley');
 await p.click('#f-save');await p.waitForTimeout(5000);
 ok(await p.evaluate(()=>window.__S.otab==='hs')&&await p.inputValue('#hs-site')===SITE,'after ✍ Fill it in myself and Save, Health & safety is back with the same site picked');
 ok(await p.evaluate(s=>Object.values(window.__st).some(v=>v&&v.cat==='rams'&&v.site===s&&/Laying a patio/.test(v.title||'')),SITE),'and that RAMS is filed in the site\'s RAMS');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h544: ${bad} failed`:'h544: all passed');await b.close();process.exit(bad?1:0);
})();
