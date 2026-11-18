// Sign-offs still to sort, RFIs and the site diary (made-up job and client):
// 1. A go-ahead sheet on 4 Rolle Road that Sue hasn't signed shows in red at the top of the site ("still to sort",
//    waiting for Sue Jones), the site gets a ✍️ mark in the sites list, and the morning briefing says so.
// 2. ❓ RFIs: a numbered register on the site; a new RFI with a photo; the answer written in; closed off and reopened;
//    an overdue one shows on the site and in the briefing.
// 3. The site diary has a week strip with the weather, the RFI raised today, and "Still to sort".
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const SITE='4 Rolle Road, Exmouth';
const extra='store["todos/gs1"]={kind:"gosheet",signSheet:{title:"Kitchen layout go-ahead",site:"4 Rolle Road, Exmouth",at:Date.now()-3*864e5,manual:{name:"Sue Jones"}}};'+
 'store["todos/rfi-old"]={kind:"rfi",site:"4 Rolle Road, Exmouth",no:1,subject:"Drain run under the extension",question:"Where does the new drain connect?",role:"Architect",to:"Test Architects",raised:"2020-01-01",due:"2020-01-08",status:"open",files:[],created:1};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==','base64');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1180,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 const ohtml='<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>';
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:ohtml}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.goto('https://sitehq.test/');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 const site=async(tab)=>{await p.evaluate(([s,t])=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.__S.f.pjtab=t;window.render()},[SITE,tab]);await p.waitForTimeout(500);};
 /* 1. sign-offs still to sort */
 await site('overview');
 let m=await p.innerText('#main');
 ok(/1 sign-off sheet still to sort/.test(m)&&/Kitchen layout go-ahead/.test(m)&&/waiting for Sue Jones/.test(m)&&/made 3 days ago/.test(m),'the site says the go-ahead sheet is still to sort, waiting for Sue Jones');
 ok(/1 RFI waiting for an answer/.test(m)&&/1 overdue/.test(m),'and that an RFI answer is overdue');
 ok(await p.evaluate(()=>{const t=[...document.querySelectorAll(".pjtst-b")].map(b=>b.dataset.t);return t[0]==="overview"&&t[1]==="rfi";}),"the site page has tabs along the top, RFIs straight after the overview");
 ok(await p.evaluate(()=>{const b=document.querySelector(".pjtst-b[data-t=rfi]");return /RFIs/.test(b.innerText)&&/1/.test(b.querySelector(".pjtst-n").innerText);}),"the RFI tab shows how many are waiting");
 ok(await p.evaluate(()=>document.querySelector(".folders .pjtile").dataset.t==="rfi"),"the ❓ RFIs folder is the first folder on the site");
 await p.locator(".pjtst").scrollIntoViewIfNeeded();await p.screenshot({path:OUT+"rfi-tabs.png"});
 await p.locator(".sod").scrollIntoViewIfNeeded();await p.screenshot({path:OUT+'sod-site.png'});
 await p.evaluate(()=>{window.__S.f.projList=true;window.render()});await p.waitForTimeout(400);
 ok(await p.evaluate(()=>[...document.querySelectorAll('.sttile')].some(t=>/Rolle Road/.test(t.innerText)&&/Sign-off to sort/.test(t.innerText))),'the site has a ✍️ Sign-off to sort mark in the sites list');
 await p.evaluate(()=>{window.__S.otab='today';window.render()});await p.waitForTimeout(500);
 m=await p.innerText('#main');
 ok(/1 sign-off sheet still to sort \(4 Rolle Road/.test(m),'the morning briefing tells James about the sign-off sheet');
 ok(/1 RFI answer overdue/.test(m),'and the overdue RFI answer');
 /* 2. RFIs */
 await site('overview');
 await p.click('#rfi-go');await p.waitForTimeout(400);
 m=await p.innerText('#main');
 ok(/RFI-001/.test(m)&&/Drain run under the extension/.test(m)&&/Overdue/.test(m),'tapping it opens the RFI register with RFI-001 overdue');
 await p.click('#rfi-new');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>{const i=document.getElementById('rfi-pick');const s=getComputedStyle(i);return !i.hidden&&s.display!=='none'&&s.opacity==='0'}),'the file picker is an invisible overlay (opens on an iPad)');
 await p.fill('#rfi-subj','Beam B1 bearing on the party wall');await p.fill('#rfi-ref','Drawing 101 rev B');
 await p.fill('#rfi-q','The party wall is only 100 block where B1 lands. Can it take the bearing?');
 await p.fill('#rfi-sug','Suggest a 440 × 215 × 100 padstone and a pier.');
 await p.selectOption('#rfi-role','Structural engineer');await p.fill('#rfi-to','Test Engineers');await p.check('#rfi-holds');
 await p.setInputFiles('#rfi-pick',{name:'wall.png',mimeType:'image/png',buffer:PNG});await p.waitForTimeout(300);
 ok(/wall\.png/.test(await p.innerText('#rfi-picked')),'the photo is ready to add');
 await p.click('#f-save');await p.waitForTimeout(1500);
 const recs=await p.evaluate(()=>Object.entries(window.__st).filter(([k,v])=>/^todos\/rfi-/.test(k)&&v.no===2).map(([k,v])=>v));
 ok(recs.length===1&&recs[0].subject==='Beam B1 bearing on the party wall'&&recs[0].status==='open'&&recs[0].holds&&recs[0].files.length===1&&recs[0].role==='Structural engineer'&&recs[0].due>recs[0].raised,'saved owner-only as RFI-002 with the photo, open, answer due 5 working days on');
 ok(await p.isVisible('.rfi-view')&&/RFI-002/.test(await p.innerText('.rfi-view'))&&/Holding up the work/.test(await p.innerText('.rfi-view')),'it opens to send, showing it holds up the work');
 await p.screenshot({path:OUT+'rfi-view.png'});
 await p.click('#rfi-answer');await p.waitForTimeout(300);
 await p.fill('#rfa-txt','Yes – 440 × 215 × 100 padstone on a 215 pier, see SK02.');await p.click('#f-save');await p.waitForTimeout(1200);
 let r2=await p.evaluate(()=>Object.values(window.__st).find(v=>v.kind==='rfi'&&v.no===2));
 ok(r2.status==='answered'&&/padstone/.test(r2.answer)&&r2.answerBy==='Test Engineers','the answer is written in (from Test Engineers)');
 await p.click('#rfi-close');await p.waitForTimeout(800);
 r2=await p.evaluate(()=>Object.values(window.__st).find(v=>v.kind==='rfi'&&v.no===2));
 ok(r2.status==='closed'&&r2.closedAt&&/Closed off/.test(await p.innerText('.rfi-view'))&&!(await p.isVisible('#rfi-edit')),'closed off: locked, with Reopen only');
 await p.click('#rfi-reopen');await p.waitForTimeout(800);
 r2=await p.evaluate(()=>Object.values(window.__st).find(v=>v.kind==='rfi'&&v.no===2));
 ok(r2.status==='answered','Reopen puts it back to answered');
 await p.getByRole("button",{name:"Close",exact:true}).first().click();await p.waitForTimeout(300);
 await site('rfi');
 m=await p.innerText('#main');
 ok(/RFI-002/.test(m)&&/Answered/.test(m)&&/RFI-001/.test(m),'the register lists both');
 await p.screenshot({path:OUT+'rfi-register.png',clip:{x:0,y:0,width:1180,height:620}});
 /* 3. the diary */
 await site('diary');
 m=await p.innerText('#main');
 ok(await p.locator('.sdi-wd').count()===7,'the diary has a week strip of 7 days');
 ok(/Still to sort/.test(m)&&/Kitchen layout go-ahead/.test(m)&&/RFI-001/.test(m),'today lists what\'s still to sort: the sign-off sheet and the open RFI');
 ok(/RFI-002 Beam B1 bearing on the party wall/.test(m)&&/raised/.test(m),'and the RFI raised today');
 await p.locator(".sdi-week").scrollIntoViewIfNeeded();await p.screenshot({path:OUT+'diary-week.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h603: ${bad} failed`:'h603: all passed');await b.close();process.exit(bad?1:0);
})();
