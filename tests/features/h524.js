// Stage sign-off with or without the client (made-up job at 4 Rolle Road, client Sue Jones with a portal): James signs
// off "Groundworks" himself only – no request to Sue. Then he signs off "Shell" and ticks "Also ask Sue Jones to sign it
// off": a stage sign request lands in her portal, and the stage says it's waiting; once she signs, it says she signed.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+'store["todos/c1"].portalUid="u9";');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const SITE='4 Rolle Road, Exmouth';
const signs=p=>p.evaluate(()=>Object.entries(window.__st).filter(([k])=>/^portal\/u9\/signs\//.test(k)).map(([k,v])=>Object.assign({k},v)));
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(s=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.__S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(500);await p.click('.pjtile[data-t=stages]');await p.waitForTimeout(400);
 const n0=(await signs(p)).length;
 await p.click('.stg-row[data-i="0"]');await p.waitForTimeout(300);
 ok(await p.isVisible('#stg-cl')&&!(await p.isChecked('#stg-cl')),'signing off has "Also ask Sue Jones to sign it off", unticked');
 await p.click('#f-save');await p.waitForTimeout(1000);
 ok((await signs(p)).length===n0&&await p.evaluate(()=>!!window.__st['sites/s2'].stageDone['Groundworks']),'signed off by James only – nothing sent to Sue');
 await p.click('.stg-row[data-i="1"]');await p.waitForTimeout(300);await p.check('#stg-cl');await p.fill('#stg-note','Walls up and roof on');await p.click('#f-save');await p.waitForTimeout(1200);
 const ss=(await signs(p)).filter(x=>x.kind==='stage');
 ok(ss.length===1&&/Stage finished: Shell/.test(ss[0].title)&&ss[0].status==='open','a stage sign request lands in Sue\'s portal');
 ok(/Asked .* to sign it off – waiting/.test(await p.innerText('#main')),'the stage says it\'s waiting for her');
 /* Sue signs */
 await p.evaluate(k=>{const r=window.__st[k];r.status='signed';r.signedName='Sue Jones';r.signedAt=Date.now();window.render()},ss[0].k);await p.waitForTimeout(800);
 ok(/Sue Jones signed it off/.test(await p.innerText('#main')),'once she signs, the stage says Sue Jones signed it off');
 await p.screenshot({path:OUT+'stg-2-client.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h524: ${bad} failed`:'h524: all passed');await b.close();process.exit(bad?1:0);
})();
