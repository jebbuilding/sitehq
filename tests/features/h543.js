// The RAMS box on a site's RAMS tab (made-up job at 4 Rolle Road, new look, iPad size): with work at height and hot
// works saved as the job's hazards (CDM page), the site's 📄 RAMS tab shows 📝 RAMS for these hazards with both to make,
// and the + A RAMS that isn't on the list options; Make files them in the site's RAMS (they show in the list on the
// tab); ✍ Fill it in myself opens the RAMS form and, once saved, it is filed too and the RAMS tab is back.
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
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:1100},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true');localStorage.setItem('jeb.splash','1')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});if(u.startsWith('https://sitehq.test/'))return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset=utf8><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fake(true)+page_src+'</body></html>'});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.goto('https://sitehq.test/');await p.waitForTimeout(3000);await p.keyboard.press('Escape');
 const ramsTab=async()=>{await p.evaluate(s=>{const o=document.getElementById('ohq');if(o)o.hidden=true;document.getElementById('sheet').hidden=true;document.getElementById('viewer').hidden=true;const S=window.__S;S.cdmRecs=(S.cdmRecs||[]).filter(r=>r.site!==s).concat([{id:'cdm-x',kind:'cdm',site:s,cd:{risks:{wah:1,hot:1}}}]);S.otab='projects';S.f.projList=false;S.f.proj=s;window.render();S.f.pjtab='rams';window.render()},SITE);await p.waitForTimeout(600);};
 await ramsTab();
 const box=await p.innerText('#pj-rabox');
 ok(/RAMS for these hazards/.test(box)&&/Work at height/.test(box)&&/Hot works/.test(box)&&/Make these 2 RAMS/.test(box),'the site\'s RAMS tab shows the RAMS box: work at height and hot works to make');
 ok(await p.locator('#cdm-raown1').count()===1&&await p.locator('#cdm-raown2').count()===1,'with ✍ Fill it in myself and ✨ Claude writes it');
 await (await p.$('#pj-rabox')).screenshot({path:OUT+'pjra-1.png'});
 await p.click('#cdm-mkra');await p.waitForTimeout(5000);
 await ramsTab();
 const list=await p.innerText('#main');
 ok(/RAMS - Work at height/.test(list)&&/RAMS - Hot works/.test(list),'Make files them in the site\'s RAMS – they show on the tab');
 ok(/Every hazard ticked has its RAMS/.test(await p.innerText('#pj-rabox')),'and the box says they are done');
 await p.click('#cdm-raown1');await p.waitForTimeout(500);
 await p.fill('#ra-act','Laying a patio');await p.fill('.rh','Manual handling of slabs');await p.fill('.rc','Two-person lifts; slab trolley');
 await p.click('#f-save');await p.waitForTimeout(5000);
 ok(await p.evaluate(()=>window.__S.f.pjtab==='rams'&&window.__S.otab==='projects'),'after ✍ Fill it in myself and Save, the RAMS tab is back');
 await ramsTab();
 ok(/RAMS - Laying a patio/.test(await p.innerText('#main')),'with the new RAMS filed in it');
 await p.screenshot({path:OUT+'pjra-2.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h543: ${bad} failed`:'h543: all passed');await b.close();process.exit(bad?1:0);
})();
