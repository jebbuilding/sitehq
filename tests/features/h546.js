// Tick boxes to delete documents (made-up job at 4 Rolle Road with three made-up RAMS): each document on the site's RAMS
// tab has a tick box, with Select all and 🗑 Delete selected at the top; ticking two and tapping twice removes those two
// (to Deleted items) and leaves the third; Select all ticks every one.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const SITE='4 Rolle Road, Exmouth';
const extra=['Alpha','Bravo','Charlie'].map((n,i)=>`store["docs/dx${i}"]={site:${JSON.stringify(SITE)},cat:"rams",title:"RAMS - Test ${n}",fileName:"test-${n}.pdf",assetId:"ax${i}",contentType:"application/pdf",size:1000,uploaded:Date.now()};`).join('');
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:1100},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true');localStorage.setItem('jeb.splash','1')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset=utf8><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fake(true)+page_src+'</body></html>'}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.goto('https://sitehq.test/');await p.waitForTimeout(3000);await p.keyboard.press('Escape');
 const tab=async()=>{await p.evaluate(s=>{const o=document.getElementById('ohq');if(o)o.hidden=true;const S=window.__S;S.otab='projects';S.f.projList=false;S.f.proj=s;window.render();S.f.pjtab='rams';window.render()},SITE);await p.waitForTimeout(500);};
 await tab();
 const row=n=>p.locator('.doc',{hasText:'Test '+n});
 ok(await p.locator('.docpick .d-all').count()===1&&await p.locator('.docpick .d-delsel').isDisabled(),'the RAMS tab has Select all and 🗑 Delete selected (off until something is ticked)');
 ok(await row('Alpha').locator('.d-pick').count()===1&&await row('Charlie').locator('.d-pick').count()===1,'each document has a tick box');
 await row('Alpha').locator('.d-pick').check();await row('Bravo').locator('.d-pick').check();
 ok(/Delete selected \(2\)/.test(await p.innerText('.d-delsel')),'ticking two: Delete selected (2)');
 await (await p.$('#main')).screenshot({path:OUT+'docpick.png'});
 await p.click('.d-delsel');
 ok(/Tap again to delete all 2/.test(await p.innerText('.d-delsel')),'the first tap asks to tap again');
 await p.click('.d-delsel');await p.waitForTimeout(1500);
 const left=await p.evaluate(()=>['dx0','dx1','dx2'].map(k=>!!window.__st['docs/'+k]));
 ok(!left[0]&&!left[1]&&left[2],'the two ticked are removed, the third is kept');
 await tab();
 await p.locator('.docpick .d-all').check();
 ok(await p.evaluate(()=>[...document.querySelectorAll('.d-pick')].every(i=>i.checked))&&/Delete selected \(\d+\)/.test(await p.innerText('.d-delsel')),'Select all ticks every document');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h546: ${bad} failed`:'h546: all passed');await b.close();process.exit(bad?1:0);
})();
