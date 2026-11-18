// The job name at the top of each site's page (made-up job at 4 Rolle Road, new look, iPad size): with no name the top
// shows the address and a "✎ Name this job" button; naming it there saves sites/s2.jobName, and the top then shows the
// name big with the address small and "✎ Change name"; the Sites card shows the name too.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const SITE='4 Rolle Road, Exmouth';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true');localStorage.setItem('jeb.splash','1')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset=utf8><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fake(true)+page_src+'</body></html>'}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.goto('https://sitehq.test/');await p.waitForTimeout(3000);await p.keyboard.press('Escape');
 const open=async()=>{await p.evaluate(s=>{const o=document.getElementById('ohq');if(o)o.hidden=true;document.getElementById('viewer').hidden=true;window.__S.otab='projects';window.__S.f.projList=false;window.__S.f.proj=s;window.__S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(600);};
 await open();
 const bar=async()=>(await p.innerText('.ss-namebar')).replace(/\s+/g,' ').trim();
 ok(/^📍 4 Rolle Road, Exmouth No job name yet ✎ Name this job$/.test(await bar()),'top of the site page: address and ✎ Name this job ('+await bar()+')');
 ok(await p.evaluate(()=>{const n=document.querySelector('.ss-namebar'),m=document.getElementById('main');return !!n&&m.contains(n)&&[...m.querySelectorAll('*')].find(e=>e.offsetHeight>0&&e.textContent.trim())&&n.getBoundingClientRect().top<=document.querySelector('#main .sitesum').getBoundingClientRect().top}),'it sits above the job details');
 await p.screenshot({path:OUT+'nm-1-before.png'});
 await p.click('#ss-name');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>document.activeElement&&document.activeElement.id==='ss-nm'),'the name box opens ready to type');
 await p.fill('#ss-nm','  Jones   kitchen extension ');await p.click('#f-save');await p.waitForTimeout(800);
 ok(await p.evaluate(()=>window.__st['sites/s2'].jobName==='Jones kitchen extension'),'the name is saved on the site (extra spaces tidied)');
 ok(/^🔨 Jones kitchen extension 📍 4 Rolle Road, Exmouth ✎ Change name$/.test(await bar()),'top now: the name big, the address small, ✎ Change name ('+await bar()+')');
 ok((await p.innerText('#main .sitesum')).split('Jones kitchen extension').length===1,'the name isn\'t repeated in the job details card');
 await p.screenshot({path:OUT+'nm-2-named.png'});
 await p.evaluate(()=>{window.__S.f.projList=true;window.render()});await p.waitForTimeout(500);
 ok(/Jones kitchen extension/.test(await p.innerText('.sttile[data-s="'+SITE+'"]')),'the Sites card shows the name');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h531: ${bad} failed`:'h531: all passed');await b.close();process.exit(bad?1:0);
})();
