// James's own details without CIS, working like a trade, and looking for leads when he wants (made-up data):
// Setup › My own details has ⏱️ My timesheet and 🧱 My day sheet, which open his own timesheet / day sheet like a
// trade's; his details form has no "Employed or self-employed", UTR or business section, says he's not set up for CIS,
// and saves him as the owner. Leads has 🔎 Look for new leads now, opening the weekly check's page.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='setup';window.__S.f.stab='setup';window.render()});await p.waitForTimeout(400);
 ok(await p.locator('.op-me[data-t=time]').count()===1&&await p.locator('.op-me[data-t=mydw]').count()===1,'Setup › My own details has ⏱️ My timesheet and 🧱 My day sheet');
 await p.click('#op-det');await p.waitForTimeout(400);
 const f=await p.innerText('#sheet');
 ok(await p.locator('#dt-empType').count()===0&&await p.locator('#dt-utr').count()===0&&!/Your business/.test(f),'his details form has no employment type, UTR or business section');
 ok(/not set up for CIS/.test(f),'and says he\'s not set up for CIS');
 const fill=async(id,v)=>{if(await p.locator('#dt-'+id).count())await p.fill('#dt-'+id,v)};
 await fill('fullName','James Test');await fill('dob','1980-01-01');await fill('mobile','07700900999');await fill('address','1 Test Lane');await fill('postcode','EX8 1AA');await fill('trade','Builder');await fill('nokName','Test Person');await fill('nokRel','Partner');await fill('nokPhone','07700900998');
 await p.check('#dt-ok');await p.click('#f-save');await p.waitForTimeout(1200);
 const prof=await p.evaluate(()=>(window.__S.myProfile||{}).details||{});
 ok(prof.empType==='owner'&&prof.fullName==='James Test','saved, as the owner (not CIS)');
 await p.click('#f-cancel').catch(()=>{});
 await p.evaluate(()=>{document.getElementById('sheet').hidden=true;window.__S.otab='setup';window.render()});await p.waitForTimeout(300);
 await p.click('.op-me[data-t=time]');await p.waitForTimeout(800);
 ok(await p.evaluate(()=>window.__S.preview===true&&window.__S.tab==='time'),'My timesheet opens his own timesheet, like a trade');
 await p.screenshot({path:OUT+'me-1-timesheet.png'});
 await p.evaluate(()=>{window.__S.preview=false;window.__S.otab='leads';window.render()});await p.waitForTimeout(500);
 ok(await p.locator('.ld-now a[href*="claude.ai/code/routines/"][target=_blank]').count()===1,'Leads has 🔎 Look for new leads now, opening the weekly check');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h521: ${bad} failed`:'h521: all passed');await b.close();process.exit(bad?1:0);
})();
