// Which privacy policy (made-up policies): with an older Privacy notice and a newer Data protection policy, the newer is
// used; Policy used on the client's privacy box and in the enquiry form chooses another, and that one opens from then on.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({openClientForm,viewClient,saveClient});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(400);
 await p.evaluate(async()=>{const S=window.__S;
   await S.db.doc('docs/polold').set({cat:'policy',title:'Privacy notice 2019',fileName:'Privacy notice.pdf',assetId:'a-old',contentType:'application/pdf',created:1000});
   await S.db.doc('docs/polnew').set({cat:'policy',title:'Data protection policy',fileName:'Data protection.pdf',assetId:'a-new',contentType:'application/pdf',created:Date.now()});
   await S.db.doc('docs/polhs').set({cat:'policy',title:'Health and safety policy',fileName:'HS.pdf',assetId:'a-hs',contentType:'application/pdf',created:5});});
 await p.waitForTimeout(800);
 await p.evaluate(()=>window.__T().viewClient(window.__S.clients.find(c=>c.id==='c2')));await p.waitForTimeout(700);
 ok(/Data protection policy/.test(await p.innerText('#gd-view')),'with two privacy policies, the newer one is used: '+(await p.innerText('#gd-view')));
 ok(await p.isVisible('#gd-pick')&&await p.inputValue('#gd-pick')==='polnew','Policy used shows it, and lets you choose');
 await p.selectOption('#gd-pick','polold');await p.waitForTimeout(900);
 ok(/Privacy notice 2019/.test(await p.innerText('#gd-view')),'choosing the other one uses it');
 const st=await p.evaluate(()=>window.__st['settings/app'].gdprPolicyId);
 ok(st==='polold','and it is kept');
 await p.click('#viewer-close').catch(()=>{});await p.keyboard.press('Escape');await p.waitForTimeout(300);
 await p.evaluate(()=>window.__T().openClientForm(window.__S.clients.find(c=>c.id==='c2'),'enquiry'));await p.waitForTimeout(700);
 ok(await p.inputValue('#gdf-pick')==='polold'&&/Privacy notice 2019/.test(await p.innerText('#gdf-view')),'the enquiry form uses the chosen one too');
 await p.selectOption('#gdf-pick','polnew');await p.waitForTimeout(900);
 ok(/Data protection policy/.test(await p.innerText('#gdf-view')),'and can change it there');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h679: ${bad} failed`:'h679: all passed');await b.close();process.exit(bad?1:0);
})();
