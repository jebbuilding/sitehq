// What the client sees, decided by James (made-up job and client): on 4 Rolle Road's 📊 Programme he unticks "Client
// sees" on the strip out – it still goes on the planner for the trades, but Sue's portal programme leaves it out. On
// Setup › 🏡 Client portal he ticks which policies every client can open (Test Health & Safety Policy yes, Test
// Insurance Certificate no) – saved on each policy, and noted in the changes.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const SITE='4 Rolle Road, Exmouth';
const extra='store["todos/c1"].portalUid="u9";store["portal/u9"]={name:"Test Client"};'+
 'store["docs/pol1"]={cat:"policy",title:"Test Health & Safety Policy",fileName:"hs.pdf",assetId:"a21",contentType:"application/pdf",size:1000,uploaded:1};'+
 'store["docs/pol2"]={cat:"insurance",title:"Test Insurance Certificate",fileName:"ins.pdf",assetId:"a22",contentType:"application/pdf",size:1000,uploaded:1,clientVisible:true};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:1000}});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 /* the programme, with the strip out kept from the client */
 await p.evaluate(s=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.__S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(500);
 await p.click('.pjtile[data-t=programme]');await p.waitForTimeout(400);
 await p.fill('#pg-start','2026-11-16');await p.click('.pg-new[data-t=kitchen]');await p.waitForTimeout(1200);
 ok(await p.locator('.pg-cl').count()===9&&await p.locator('.pg-cl:checked').count()===9,'each stage has a "Client sees" tick, all ticked to start with');
 await p.check('#pg-client');await p.locator('.pg-cl').first().uncheck();await p.click('#pg-save');await p.waitForTimeout(1500);
 const por=await p.evaluate(()=>window.__st['portal/u9'].programme);
 ok(por&&por.stages.length===8&&!por.stages.some(s=>/Strip out/.test(s.name)),'Sue\'s portal programme leaves out the strip out');
 const pl=await p.evaluate(()=>Object.values(window.__st).filter(v=>v&&v.progId&&/^Strip out/.test(v.title||'')).length);
 ok(pl===1,'the strip out is still on the planner for the trades');
 ok(/🔒 No/.test(await p.innerText('.pg-tbl')),'the stage shows 🔒 No under Client sees');
 /* policies */
 await p.evaluate(()=>{window.__S.otab='setup';window.__S.f.stab='portal';window.render()});await p.waitForTimeout(400);
 const t=await p.innerText('#main');
 ok(/Policies clients can see/.test(t)&&/Test Health & Safety Policy/.test(t)&&/Test Insurance Certificate/.test(t),'Setup › Client portal lists the policies');
 ok(!(await p.isChecked('.pv-pol[data-id=pol1]'))&&await p.isChecked('.pv-pol[data-id=pol2]'),'ticked as they are now (the insurance certificate already shown)');
 await p.check('.pv-pol[data-id=pol1]');await p.uncheck('.pv-pol[data-id=pol2]');await p.click('#pv-save');await p.waitForTimeout(1000);
 const v=await p.evaluate(()=>[window.__st['docs/pol1'].clientVisible,window.__st['docs/pol2'].clientVisible]);
 ok(v[0]===true&&v[1]===false,'saved on each policy: the H&S policy shown, the insurance certificate hidden');
 ok(/Policies: \+ Test Health & Safety Policy/.test(await p.innerText('#main')),'the change is noted');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h501: ${bad} failed`:'h501: all passed');await b.close();process.exit(bad?1:0);
})();
