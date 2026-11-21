// CIS sign-up (made-up people): a trade's My details › CIS (status, business type, name as HMRC has it) puts them on
// CIS › Subcontractors › To verify with HMRC with their details to copy; putting in the verification takes them off it.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 const id=await p.evaluate(async()=>{const S=window.__S;const w=Object.keys(S.team||{}).find(k=>S.team[k]&&S.team[k].details)||Object.keys(S.team||{})[0];const d=Object.assign({},(S.team[w]||{}).details||{},{empType:'selfemp',utr:'1234567890',ni:'QQ123456C',cisStatus:'reg',cisBiz:'sole',cisName:'Test Trades'});await S.db.doc('sheets/'+w).update({details:d});return w});
 await p.waitForTimeout(600);
 await p.evaluate(()=>{const S=window.__S;S.otab='cis';S.f.cisv='subs';window.render()});await p.waitForTimeout(500);
 const row=p.locator(`.cis-vrow[data-id="${id}"]`);
 ok(await row.count()===1,'a trade who says they are under CIS is on To verify with HMRC');
 const t=await row.innerText();
 ok(/1234567890/.test(t)&&/QQ123456C/.test(t)&&/Test Trades/.test(t)&&/registered \(20%\)/.test(t),'with their UTR, NI number, name as HMRC has it and what they say their status is');
 await p.screenshot({path:'h632-verify.png'});
 await row.locator('.cis-vdone').click();await p.waitForTimeout(400);
 await p.fill('#cs-vdate','2026-11-20');await p.fill('#cs-vno','V1234567890');await p.click('#f-save');await p.waitForTimeout(800);
 ok(await p.locator(`.cis-vrow[data-id="${id}"]`).count()===0,'once the verification is put in they come off the list');
 ok(/V1234567890/.test(await p.innerText('#main')),'and their card shows the verification number');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h632: ${bad} failed`:'h632: all passed');await b.close();process.exit(bad?1:0);
})();
