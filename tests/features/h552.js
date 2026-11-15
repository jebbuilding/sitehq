// Planner (new look, iPad size; made-up Kahn Test as a subcontractor and Lee Test from another company): the Board
// groups people under Owner, Subcontractors and Other companies; the Jobs view has a heading line per job and a line per
// stage under it with its own name (the site not repeated), and tapping a job folds its stages away.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:1300},deviceScaleFactor:1.5});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true');localStorage.setItem('jeb.splash','1')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset=utf8><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fake(true)+page_src+'</body></html>'}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.goto('https://sitehq.test/');await p.waitForTimeout(3000);await p.keyboard.press('Escape');
 await p.evaluate(async()=>{const S=window.__S;await S.db.doc('sheets/sub1').set({name:'Kahn Test',role:'sub',joined:1});await S.db.doc('sheets/co1').set({name:'Lee Test',role:'company',company:'Test Roofing Ltd',joined:1});});
 await p.waitForTimeout(800);
 const mode=async m=>{await p.evaluate(m=>{const o=document.getElementById('ohq');if(o)o.hidden=true;const S=window.__S;S.otab='planner';S.f.pmode=m;window.render()},m);await p.waitForTimeout(600);};
 await mode('board');
 const groups=await p.evaluate(()=>[...document.querySelectorAll('.pb-grp b')].map(e=>e.textContent));
 ok(groups.includes('Owner')&&groups.includes('Subcontractors')&&groups.includes('Other companies'),'the Board groups people: '+groups.join(', '));
 const order=await p.evaluate(()=>[...document.querySelectorAll('.pb-grid .pb-grp, .pb-grid .pb-name[data-w]')].map(e=>e.classList.contains('pb-grp')?'#'+e.querySelector('b').textContent:e.dataset.w).join(' '));
 ok(/#Subcontractors sub1/.test(order)&&/#Other companies co1/.test(order),'each person sits under their group ('+order+')');
 /* two made-up programmes, then the Jobs view */
 for(const [site,t] of [['4 Rolle Road, Exmouth','kitchen'],['12 Marine Way, Exmouth','extension']]){await p.evaluate(s=>{const S=window.__S;S.otab='projects';S.f.projList=false;S.f.proj=s;window.render();S.f.pjtab='programme';window.render()},site);await p.waitForTimeout(500);await p.fill('#pg-start','2026-11-16');await p.click('.pg-new[data-t='+t+']');await p.waitForTimeout(900);await p.click('#pg-save');await p.waitForTimeout(1500);}
 await mode('stages');
 const heads=await p.locator('.pbs-row.pbs-site').count(),stages=await p.locator('.pbs-row.pbs-stage').count();
 ok(heads===2&&stages>=15,'Jobs: a heading line per job ('+heads+') and a line per stage ('+stages+')');
 const names=await p.evaluate(()=>[...document.querySelectorAll('.pbs-sn')].map(e=>e.textContent));
 ok(names.includes('Plaster')&&names.includes('Fit units')&&!names.some(n=>/Marine Way|Rolle Road/.test(n)),'each stage shows its own name, without the site repeated');
 await p.locator('.pbs-fold').first().click();await p.waitForTimeout(500);
 ok(await p.locator('.pbs-row.pbs-stage').count()<stages&&await p.locator('.pbs-fold[aria-expanded=false]').count()===1,'tapping a job folds its stages away');
 await p.locator('.pbs-fold[aria-expanded=false]').click();await p.waitForTimeout(500);
 ok(await p.locator('.pbs-row.pbs-stage').count()===stages,'and tapping again opens them');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h552: ${bad} failed`:'h552: all passed');await b.close();process.exit(bad?1:0);
})();
