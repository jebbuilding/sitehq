// Client portal off unless James turns it on (made-up clients): Bob Lee (never invited) shows "Client portal: off for
// this job" with a button to turn it on; turning it on saves it, notes it, and shows the usual portal buttons. Sue Jones,
// who already has a portal, is still on.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+'store["todos/c1"].portalUid="u9";delete store["todos/c2"].portalCode;');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const open=async(p,id)=>{await p.evaluate(()=>{document.getElementById('viewer').hidden=true;window.__S.otab='clients';window.__S.f.clf='all';window.render()});await p.waitForTimeout(400);await p.click('.abcard .cl-open[data-c='+id+']');await p.waitForTimeout(500);};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await open(p,'c2');
 ok(/Client portal: off for this job/.test(await p.innerText('.ptblock'))&&await p.isVisible('#pt-on')&&await p.locator('#pt-manage').count()===0,'Bob\'s portal is off – a button to turn it on, nothing shared');
 await p.locator('.ptblock').scrollIntoViewIfNeeded();await p.screenshot({path:OUT+'pt-1-off.png'});
 await p.click('#pt-on');await p.waitForTimeout(1000);
 const r=await p.evaluate(()=>window.__st['todos/c2']);
 ok(r.portalOn===true&&(r.notes||[]).some(n=>/portal turned on/i.test(n.text)),'turning it on is saved and noted');
 ok(await p.isVisible('#pt-manage')&&!/off for this job/.test(await p.innerText('.ptblock')),'the usual portal buttons show');
 await open(p,'c1');
 ok(await p.isVisible('#pt-manage'),'Sue, who already has a portal, is still on');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h520: ${bad} failed`:'h520: all passed');await b.close();process.exit(bad?1:0);
})();
