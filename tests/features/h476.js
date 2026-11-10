// Setup › 🏡 Client portal (made-up client Sue Jones): beside People & access, a tab to choose what clients see in their
// portal – for everyone, or one client differently. James turns Drawing off for everyone and Messages off for Sue only;
// it is saved (with a record of the change) and Sue's portal no longer has those tabs.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/c1"].portalUid="u9";';
let page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
function mk(mode,storeDump){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra+(storeDump?'Object.assign(store,'+storeDump+');':''));if(mode==='client')src=src.replace("id:async()=>${owner?'\"owner\"':'\"emp1\"'}",'id:async()=>"u9"');eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake(mode==='owner');}
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:1000}});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());
 const page=async(mode,dump)=>{const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',mode,e.message);bad++;});await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+mk(mode,dump)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');return p;};
 try{
 /* before: Sue sees every part */
 const q0=await page('client');
 const t0=await q0.$$eval('.ptabs button',bs=>bs.map(b=>b.dataset.v).join(' '));console.log('before:',t0);
 ok(/draw/.test(t0)&&/chat/.test(t0),'Sue\'s portal starts with Drawing and Messages');
 /* James sets it */
 const p=await page('owner');
 await p.evaluate(()=>{window.__S.otab='setup';window.render()});await p.waitForTimeout(400);
 ok(await p.isVisible('#st-tabs button[data-v=portal]'),'Setup has a 🏡 Client portal tab beside People & access');
 await p.click('#st-tabs button[data-v=portal]');await p.waitForTimeout(400);
 const head=await p.innerText('.pa-tbl thead');
 ok(/Everyone/i.test(head)&&/Sue Jones/i.test(head),'a column for everyone and one for Sue');
 ok(await p.locator('.pv-on[data-w=""]').count()===9,'9 parts of the portal to choose from');
 await p.uncheck('.pv-on[data-k=draw][data-w=""]');
 ok(!(await p.isChecked('.pv-on[data-k=draw][data-w=u9]')),'turning one off for everyone turns it off for Sue too');
 await p.uncheck('.pv-on[data-k=chat][data-w=u9]');
 await p.click('#pv-save');await p.waitForTimeout(700);
 const pa=await p.evaluate(()=>window.__st['settings/app'].portalAccess);console.log(JSON.stringify(pa));
 ok(pa&&pa.tabs.draw===false&&pa.clients.u9&&pa.clients.u9.chat===false&&!('draw' in pa.clients.u9),'saved: Drawing off for everyone, Messages off for Sue');
 const au=await p.evaluate(()=>Object.values(window.__st).filter(v=>v&&v.kind==='audit'&&v.action==='Portal access').map(v=>v.details));
 ok(au.length===1&&/Everyone: − Drawing/.test(au[0])&&/Sue Jones: − Messages/.test(au[0]),'the change is recorded: '+au[0]);
 /* Sue's portal now */
 const q=await page('client',await p.evaluate(()=>JSON.stringify(window.__st)));
 /* the shared settings reach Sue's app (the fake backend re-seeds settings/app, so pass them on through her app's db) */
 await q.evaluate(pa=>window.__S.db.doc('settings/app').update({portalAccess:pa}),pa);await q.waitForTimeout(500);
 const t=await q.$$eval('.ptabs button',bs=>bs.map(b=>b.dataset.v).join(' '));console.log('after:',t);
 ok(!/draw/.test(t)&&!/chat/.test(t)&&/home/.test(t)&&/docs/.test(t),'Sue\'s portal no longer has Drawing or Messages; the rest stays');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h476: ${bad} failed`:'h476: all passed');await b.close();process.exit(bad?1:0);
})();
