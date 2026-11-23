// Today's "New enquiries" button (made-up client Bob Lee, a new enquiry): tapping it opens Clients on Job to see – the new
// enquiries – not on Active site.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:1100}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 if(await p.isVisible('#nl-tog')&&/New look/.test(await p.innerText('#nl-tog')))await p.click('#nl-tog');
 await p.evaluate(()=>{const S=window.__S;S.otab='today';S.f.clf='onsite';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('.nl-tile[data-t=clients]'),'Today shows New enquiries');
 await p.click('.nl-tile[data-t=clients]');await p.waitForTimeout(600);
 const st=await p.evaluate(()=>[window.__S.otab,window.__S.f.clf]);
 ok(st[0]==='clients'&&st[1]==='see','it opens Clients on Job to see ('+st.join(', ')+')');
 ok(/Bob Lee/.test(await p.innerText('#main')),'showing the new enquiry (Bob Lee)');
 ok(!(await p.isVisible('#cl-new'))&&await p.isVisible('#cl-enq'),'Clients has 📝 New enquiry but not the details-only button');
 await p.click('.cl-tab[data-v=book]');await p.waitForTimeout(400);
 ok(await p.isVisible('#cl-new')&&/Add to address book/.test(await p.innerText('#cl-new')),'the 📒 Address book has ＋ Add to address book (no job)');
 await p.click('.cl-tab[data-v=jobs]');await p.waitForTimeout(300);
 /* the client page: ✎ Edit client details at the top as well as the bottom */
 await p.evaluate(()=>{const S=window.__S;S.f.clf='all';window.render()});await p.waitForTimeout(300);
 await p.click('text=Bob Lee');await p.waitForTimeout(700);
 const pos=await p.evaluate(()=>{const a=document.getElementById('cv-edit2'),b=document.getElementById('cv-edit'),h=document.querySelector('#viewer h3');return a&&b&&h?[Math.round(a.getBoundingClientRect().top-h.getBoundingClientRect().bottom),Math.round(b.getBoundingClientRect().top)]:null});
 ok(pos&&pos[0]<80&&pos[1]>pos[0],'the client page has ✎ Edit client details just under the name (and still at the bottom)');
 await p.click('#cv-edit2');await p.waitForTimeout(600);
 ok(/Edit client details/.test(await p.innerText('#sheettitle'))&&await p.inputValue('#cf-phone')==='07700900222','the top one opens Edit client details');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h660: ${bad} failed`:'h660: all passed');await b.close();process.exit(bad?1:0);
})();
