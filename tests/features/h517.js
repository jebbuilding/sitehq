// Address book on its own tab, and SiteHQ by Stranix at the bottom of every page (made-up data): Jobs & clients has a
// 📒 Address book tab that opens the address book list; Clients goes back to the usual list. On a phone the small
// "SiteHQ by STRANIX" sits at the bottom of the page (for James, a trade and a client); on a computer it's at the foot
// of the side menu instead, not twice.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
function mk(mode){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed+'store["todos/c1"].portalUid="u9";');if(mode==='client')src=src.replace("id:async()=>${owner?'\"owner\"':'\"emp1\"'}",'id:async()=>"u9"');eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake(mode==='owner');}
async function open(b,mode,vp,keys){const html='<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+mk(mode)+page_src.replace(DD,'function detailsDone(d){return true}')+'</body></html>';
 const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(k=>{try{for(const x of k)localStorage.setItem(x,'true');localStorage.setItem('jeb.instLater','true')}catch(e){}},keys);
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await p.goto('https://sitehq.test/');await p.waitForTimeout(2500);await p.keyboard.press('Escape');await p.waitForTimeout(300);return p;}
const footOn=p=>p.evaluate(()=>{const f=document.querySelector('.appfoot');return !!f&&getComputedStyle(f).display!=='none'&&/SiteHQ\s*by\s*STRANIX/.test(f.innerText.replace(/\n/g,' '))});
(async()=>{const b=await chromium.launch();
 try{
 const p=await open(b,'owner',{width:390,height:844},['jeb.newlook']);
 ok(await footOn(p),'James\'s phone: SiteHQ by STRANIX at the bottom of the page');
 await p.click('#nlbar .nl-b[data-s=jobs]');await p.waitForTimeout(500);
 ok(await p.locator('.jb-tabs button[data-v=book]').count()===1,'Jobs & clients has a 📒 Address book tab');
 await p.click('.jb-tabs button[data-v=book]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>window.__S.otab==='clients'&&window.__S.f.clf==='book')&&await p.locator('.bkrow').count()>=1,'it opens the address book list');
 await p.evaluate(()=>{const f=document.querySelector('.appfoot');f&&f.scrollIntoView()});await p.screenshot({path:OUT+'foot-1-phone.png'});
 await p.click('#nlbar .nl-b[data-s=jobs]');await p.waitForTimeout(400);await p.click('.jb-tabs button[data-v=clients]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>window.__S.f.clf!=='book'),'Clients goes back to the usual list');
 const q=await open(b,'owner',{width:1280,height:800},['jeb.newlook']);
 ok(!(await footOn(q))&&await q.isVisible('#nlbar .nl-by'),'on a computer it\'s at the foot of the side menu, not twice');
 const r=await open(b,'trade',{width:390,height:844},['jeb.tradelook']);
 ok(await footOn(r),'a trade\'s phone: at the bottom of the page');
 const s=await open(b,'client',{width:390,height:844},['jeb.clientlook']);
 ok(await footOn(s),'a client\'s phone: at the bottom of the page');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h517: ${bad} failed`:'h517: all passed');await b.close();process.exit(bad?1:0);
})();
