// Built-in check questions (made-up): Setup › Your forms › ✅ Built-in checks › Vehicle – reword a question, take one
// out and add one; the vehicle check then asks the new questions, and an old check still shows its answer to the one
// taken out.
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
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src.replace('function openCheck(','window.openCheck=openCheck;function openCheck(')+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(300);
 await p.evaluate(()=>{const S=window.__S;S.otab='setup';S.f.stab='forms';window.render()});await p.waitForTimeout(500);
 ok(await p.locator('#main .cki-row').count()>=7,'Your forms lists the built-in checks');
 await p.click('#main .cki-row[data-k="vehicle"]');await p.waitForTimeout(400);
 const n0=await p.locator('#cki-list .cki-item').count();
 await p.locator('#cki-list .cki-l').nth(0).fill('Tyres checked by our fleet sheet');
 await p.locator('#cki-list .cki-x').nth(1).click();await p.waitForTimeout(100);
 await p.click('#cki-add');await p.waitForTimeout(100);await p.locator('#cki-list .cki-l').last().fill('Tail lift working');
 await p.fill('#cki-nm','Van');
 await p.screenshot({path:'h638-edit.png'});
 await p.click('#f-save');await p.waitForTimeout(700);
 const st=await p.evaluate(()=>Object.values(window.__st).find(v=>v&&v.checkItems));
 ok(st&&st.checkItems.vehicle&&st.checkItems.vehicle.name==='Van','saved for the whole firm');
 await p.evaluate(()=>window.openCheck('vehicle'));await p.waitForTimeout(400);
 const f=await p.innerText('#sheet');
 ok(/Van check/.test(f)&&/Tyres checked by our fleet sheet/.test(f)&&/Tail lift working/.test(f)&&!/Wheel nuts secure/.test(f),'the check uses the new name and questions, without the one taken out');
 ok(await p.locator('#c-items .citem').count()===n0,'same number of questions (one out, one in)');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h638: ${bad} failed`:'h638: all passed');await b.close();process.exit(bad?1:0);
})();
