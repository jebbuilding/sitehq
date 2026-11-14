// Account holder set-up (made-up data, new look, iPad size): Today has "Set up your account" with three steps; Your
// company saves the company name and the account holder, then Emergency contacts opens; that saves the company's
// emergency contact, then the account holder's own details open (the same form as everyone); Finish set-up saves
// acctSetupAt and the Today card goes; Setup shows the company details once; the company card shows the
// emergency contact; People lists the account holder like everyone else, tagged Owner · account holder.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:1100},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true');localStorage.setItem('jeb.splash','1')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset=utf8><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fake(true)+page_src+'</body></html>'}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.goto('https://sitehq.test/');await p.waitForTimeout(3000);await p.keyboard.press('Escape');
 const go=async(t)=>{await p.evaluate(t=>{const o=document.getElementById('ohq');if(o)o.hidden=true;document.getElementById('viewer').hidden=true;document.getElementById('sheet').hidden=true;window.__S.otab=t;if(t==='setup')window.__S.f.stab='setup';window.render()},t);await p.waitForTimeout(500);};
 await go('today');
 ok(await p.locator('#acs-card').count()===1&&/Set up your account/.test(await p.innerText('#acs-card')),'Today: Set up your account');
 ok(await p.locator('#acs-card .acs-step').count()===3,'with three steps');
 await (await p.$('#acs-card')).screenshot({path:OUT+'acs-1-card.png'});
 await p.click('.acs-step[data-k=co]');await p.waitForTimeout(400);
 await p.fill('#acs-name','Test Builders Ltd');await p.fill('#acs-owner','Alex Test');await p.fill('#acs-address','1 Test Street, Exmouth');await p.fill('#acs-mobile','07700900100');
 await p.screenshot({path:OUT+'acs-2-company.png'});
 await p.click('#f-save');await p.waitForTimeout(1200);
 const co=()=>p.evaluate(()=>(window.__st['settings/app']||{}).company||{});
 ok((await co()).name==='Test Builders Ltd'&&(await co()).owner==='Alex Test','company and account holder saved');
 ok(await p.locator('#acs-oohName').count()===1,'then Emergency contacts opens');
 await p.fill('#acs-oohName','Alex Test');await p.fill('#acs-oohPhone','07700900101');await p.fill('#acs-firstAid','Sam Test');
 await p.screenshot({path:OUT+'acs-3-emergency.png'});
 await p.click('#f-save');await p.waitForTimeout(1200);
 ok((await co()).oohPhone==='07700900101'&&(await co()).firstAid==='Sam Test'&&(await co()).name==='Test Builders Ltd','emergency contacts saved (company kept)');
 ok(await p.locator('#dt-fullName').count()===1,'then their own details open, the same form as everyone');
 const fill=async(id,v)=>{if(await p.locator('#dt-'+id).count())await p.fill('#dt-'+id,v)};
 await fill('fullName','Alex Test');await fill('dob','1980-01-01');await fill('mobile','07700900100');await fill('address','1 Test Lane');await fill('postcode','EX8 1AA');await fill('trade','Builder');await fill('nokName','Test Person');await fill('nokRel','Partner');await fill('nokPhone','07700900998');
 await p.check('#dt-ok');await p.click('#f-save');await p.waitForTimeout(1200);
 await go('today');
 ok(await p.locator('#acs-finish').count()===1&&/3 of 3 done/.test(await p.innerText('#acs-card')),'all three done: Finish set-up');
 await p.click('#acs-finish');await p.waitForTimeout(1000);
 ok(await p.evaluate(()=>!!(window.__st['settings/app']||{}).acctSetupAt),'finished is saved');
 await go('today');
 ok(await p.locator('#acs-card').count()===0,'and the card leaves Today');
 await go('setup');
 ok(await p.locator('#acs-card').count()===0&&await p.locator('#main .cocard').count()===1&&!/Your mobile number/.test(await p.innerText('#main')),'Setup shows the company details once (no set-up card, no separate mobile number box)');
 const ct=await p.innerText('.cocard');
 ok(/Emergency contact/.test(ct)&&/07700900101/.test(ct)&&/Sam Test/.test(ct),'the company card shows the emergency contact and first aider');
 await go('people');
 const pt=await p.innerText('#main');
 ok(/Alex Test/.test(pt)&&/Owner · account holder/.test(pt),'People lists the account holder, tagged Owner · account holder');
 ok(await p.locator('#pp-me').count()===1&&await p.evaluate(()=>!document.querySelector('.pp-role[data-w="'+window.__S.me+'"]')&&!document.querySelector('.pp-avbtn[data-w="'+window.__S.me+'"]')),'with Edit my details (no trade-only buttons)');
 ok(/07700900998/.test(await p.innerText('#main table')),'and in the emergency contacts table with their next of kin');
 await p.screenshot({path:OUT+'acs-4-people.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h534: ${bad} failed`:'h534: all passed');await b.close();process.exit(bad?1:0);
})();
