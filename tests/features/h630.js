// Jobs & clients › More in the order James set (made-up data): Jobs and sites – Sites, Sign in, Day work, Planner,
// Photos, Health & safety, Drawings; Clients – Clients, Address book, Leads, Samples, Client portal, What clients see.
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
 await p.click('#nl-tog');await p.waitForTimeout(300);
 await p.click('.nl-b[data-s="jobs"]');await p.waitForTimeout(400);
 await p.click('.jb-tabs [data-v="more"]');await p.waitForTimeout(400);
 const rows=async h=>p.evaluate(h=>{const g=[...document.querySelectorAll('#main .nl-grp')].find(x=>x.querySelector('h2').textContent===h);return g?[...g.querySelectorAll('.nl-row2')].map(b=>b.dataset.t||b.dataset.s):[]},h);
 const js=await rows('Jobs and sites');
 ok(js.join()==='projects,signin,daywork,planner,photos,hs,draw','Jobs and sites: '+js.join());
 const cl=await rows('Clients');
 ok(cl.join()==='clients,addrbook,leads,samples,reviews,social,portal,portalset','Clients: '+cl.join());
 await p.screenshot({path:'h630-more.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h630: ${bad} failed`:'h630: all passed');await b.close();process.exit(bad?1:0);
})();
