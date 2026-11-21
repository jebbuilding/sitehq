// Site inductions (made-up): Site inductions has 📋 Your standard induction – a point added there is in every new site's
// induction; a trade signing in by location at a site with an induction they haven't done is taken into it first, and
// once it's signed they're signed in.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
const extra='store["sites/s2"].lat=50.6200;store["sites/s2"].lon=-3.4100;store["inductions/indt1"]={site:"4 Rolle Road, Exmouth",items:["I know the site rules."],details:{manager:"Test Manager"},version:1,created:1};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const html='<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+fake(false)+page_src.replace(DD,'function detailsDone(d){return true}')+'</body></html>';
(async()=>{const b=await chromium.launch();
 try{
 /* owner: the standard induction */
 const ctx0=await b.newContext({viewport:{width:1100,height:1000}});ctx0.setDefaultTimeout(8000);await ctx0.route(/^https?:\/\//,r=>r.abort());
 const o=await ctx0.newPage();o.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await o.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await o.waitForTimeout(2200);await o.keyboard.press('Escape');
 await o.evaluate(()=>{const S=window.__S;S.otab='inductions';window.render()});await o.waitForTimeout(500);
 ok(await o.isVisible('#ist-edit'),'Site inductions has 📋 Your standard induction');
 await o.click('#ist-edit');await o.waitForTimeout(300);
 await o.fill('#ist-items',(await o.inputValue('#ist-items'))+'\nI will not use the client\'s kitchen.');await o.click('#f-save');await o.waitForTimeout(600);
 ok(await o.evaluate(()=>Object.values(window.__st).some(v=>v&&v.indStd&&v.indStd.items.some(x=>/client's kitchen/.test(x)))),'saved for the firm');
 await o.evaluate(async()=>{await window.__S.db.doc('sites/tpl1').set({name:'9 Template Lane, Exmouth'})});await o.waitForTimeout(500);
 await o.click('.ist-sites summary');await o.waitForTimeout(200);
 const setup=o.locator('.ist-site[data-s="9 Template Lane, Exmouth"]');
 ok(await setup.count()===1,'each site\'s induction can be changed or set up from here');
 await setup.click();await o.waitForTimeout(400);
 ok(/client's kitchen/.test(await o.inputValue('#id-items')),'a new site\'s induction starts with the firm\'s standard points');
 /* trade: signing in at a new site */
 const ctx=await b.newContext({viewport:{width:390,height:844},geolocation:{latitude:50.6203,longitude:-3.4102},permissions:['geolocation']});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.tradelook','true');localStorage.setItem('jeb.instLater','true')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await p.goto('https://sitehq.test/');await p.waitForTimeout(2500);await p.keyboard.press('Escape');await p.waitForTimeout(500);
 await p.click('#tsi-in');await p.waitForTimeout(800);
 ok(await p.locator('#in-items').count()===1,'signing in at a site he has not been inducted on opens its induction first');
 const before=await p.evaluate(()=>Object.entries(window.__st).filter(([k,v])=>/^sheets\/emp1\/entries\//.test(k)&&v.open).length);
 ok(before===0,'not signed in yet');
 await p.screenshot({path:'h642-ind.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h642: ${bad} failed`:'h642: all passed');await b.close();process.exit(bad?1:0);
})();
