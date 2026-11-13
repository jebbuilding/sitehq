// Taking information down with no signal (made-up client Sue Jones and job at 4 Rolle Road): with the phone offline,
// James adds a note to Sue, adds a to-do and signs off a stage – each is kept on the phone ("No signal – saved on this
// phone") and nothing is lost; when the signal comes back they all send.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const SITE='4 Rolle Road, Exmouth';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>'}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 const toasts=[];await p.exposeFunction('__toastSeen',t=>toasts.push(t));
 try{await p.goto('https://sitehq.test/');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 await p.evaluate(()=>{new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.classList&&n.classList.contains('toast'))window.__toastSeen(n.textContent)}))).observe(document.body,{childList:true})});
 await ctx.setOffline(true);await p.waitForTimeout(300);
 /* a note on Sue */
 await p.evaluate(()=>{window.__S.otab='clients';window.__S.f.clf='all';window.render()});await p.waitForTimeout(400);
 await p.click('.abcard .cl-open[data-c=c1]');await p.waitForTimeout(500);
 await p.fill('#cv-note','Rang her – wants the skip moved');await p.click('#cv-addnote');await p.waitForTimeout(800);
 ok(toasts.some(t=>/No signal – saved on this phone/.test(t)),'a client note with no signal: "saved on this phone"');
 ok(await p.evaluate(()=>!(window.__st['todos/c1'].notes||[]).some(n=>/skip moved/.test(n.text))),'not sent yet');
 /* a to-do */
 await p.evaluate(()=>{document.getElementById('viewer').hidden=true;window.__S.otab='todo';window.render()});await p.waitForTimeout(400);
 if(await p.locator('#td-text').count()){await p.fill('#td-text','Order skip for Rolle Road');await p.press('#td-text','Enter');await p.waitForTimeout(800);}
 /* a stage */
 await p.evaluate(s=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.__S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(500);
 await p.click('.pjtile[data-t=stages]');await p.waitForTimeout(400);await p.click('.stg-row[data-i="0"]');await p.waitForTimeout(300);await p.click('#f-save');await p.waitForTimeout(800);
 const q=await p.evaluate(()=>(window.__S.outbox||[]).map(j=>j.label));
 ok(q.some(l=>/Client: Sue Jones/.test(l))&&q.some(l=>/To-do/.test(l))&&q.some(l=>/Stage sign-off/.test(l)),'all three are waiting on the phone ('+q.join(' | ')+')');
 /* signal back */
 await ctx.setOffline(false);await p.evaluate(()=>window.dispatchEvent(new Event('online')));await p.waitForTimeout(2500);
 const st=await p.evaluate(()=>window.__st);
 ok((st['todos/c1'].notes||[]).some(n=>/skip moved/.test(n.text)),'signal back: Sue\'s note is sent');
 ok(Object.values(st).some(v=>v&&v.text==='Order skip for Rolle Road'),'the to-do is sent');
 ok(st['sites/s2'].stageDone&&Object.keys(st['sites/s2'].stageDone).length===1,'the stage sign-off is sent');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h526: ${bad} failed`:'h526: all passed');await b.close();process.exit(bad?1:0);
})();
