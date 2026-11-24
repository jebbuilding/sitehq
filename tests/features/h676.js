// 🪵 Woods on Forms (made-up sample): the common timbers and sheet materials grouped with a colour guide and their
// usual uses; search; tapping one shows it big with 📋 Copy; 📷 Add a sample photo keeps a photo of real wood.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;').replace('function render() {','window.render=render;window.__T=()=>({GLO});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(400);
 await p.evaluate(()=>{window.__S.otab='jobs';window.render()});await p.waitForTimeout(600);
 ok(await p.isVisible('#wood-lib'),'Forms has 🪵 Woods');
 await p.click('#wood-lib');await p.waitForTimeout(500);
 const n=await p.locator('.wds-sw').count();
 ok(n>=35&&/Hardwoods/.test(await p.innerText('.glc-box'))&&/Sheet materials/.test(await p.innerText('.glc-box')),'it lists '+n+' timbers and sheets in groups');
 await p.screenshot({path:'h676-woods.png'});
 await p.fill('.wds-q','cladding');await p.waitForTimeout(300);
 const c=await p.$$eval('.wds-sw b',x=>x.map(e=>e.textContent));
 ok(c.includes('Siberian larch')&&c.includes('Western red cedar')&&!c.includes('MDF'),'searching cladding finds the cladding timbers: '+c.join(', '));
 await p.locator('.wds-sw',{hasText:'Siberian larch'}).click();await p.waitForTimeout(400);
 ok(/Siberian larch/.test(await p.innerText('.glc-big'))&&await p.isVisible('.wds-cp'),'tapping one shows it big with 📋 Copy');
 await p.click('.wds-more');await p.waitForTimeout(400);
 const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=60;const g=c.getContext('2d');g.fillStyle='#a0703c';g.fillRect(0,0,80,60);return c.toDataURL('image/png').split(',')[1]});
 await p.setInputFiles('.wds-file',{name:'oak.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await p.waitForTimeout(500);
 await p.fill('#wds-nm','Oak, light oak stain');await p.fill('#wds-nt','2 coats hardwax oil');
 await p.click('form.dimbox button[type=submit]');await p.waitForTimeout(1500);
 const sm=Object.values(await p.evaluate(()=>window.__st)).find(v=>v&&v.kind==='woodsample');
 ok(sm&&sm.name==='Oak, light oak stain'&&sm.assetId&&await p.locator('.wds-sp').count()===1,'📷 Add a sample photo keeps it, at the top under My wood samples');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h676: ${bad} failed`:'h676: all passed');await b.close();process.exit(bad?1:0);
})();
