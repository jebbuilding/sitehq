// How they found you, with your own choices (made-up client Tom Baker): 📝 New enquiry's "How they found you" has the usual
// list and ＋ Add another… at the bottom; choosing it shows a box – type "Van signwriting", Add – it's picked, saved on the
// enquiry, and on the list next time (settings/app.clientSources). Adding one already there just picks it.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:1100}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 const newEnq=async()=>{await p.evaluate(()=>{const S=window.__S;S.otab='clients';S.f.clf='all';window.render()});await p.waitForTimeout(400);await p.click('#cl-enq');await p.waitForTimeout(400);await p.click('#ne-new');await p.waitForTimeout(600);};
 await newEnq();
 const opts=await p.evaluate(()=>[...document.querySelectorAll('#cf-src option')].map(o=>o.textContent));
 ok(opts.includes('Recommendation')&&opts.includes('Google')&&opts[opts.length-1]==='＋ Add another…'&&opts[opts.length-2]==='Other','"How they found you": the usual list, Other, then ＋ Add another…');
 await p.selectOption('#cf-src','__add');await p.waitForTimeout(300);
 ok(await p.isVisible('#cf-src-new'),'choosing ＋ Add another… shows a box to type it');
 await p.fill('#cf-src-new','Van signwriting');await p.click('#cf-src-ok');await p.waitForTimeout(600);
 ok(await p.inputValue('#cf-src')==='Van signwriting'&&!(await p.isVisible('#cf-src-new')),'Add picks it');
 ok(JSON.stringify(await p.evaluate(()=>window.__st['settings/app'].clientSources))==='["Van signwriting"]','and keeps it on the list');
 await p.fill('#cf-main .cfm-f','Tom');await p.fill('#cf-main .cfm-l','Baker');await p.fill('#cf-phone','07700 900123');
 await p.click('#f-save');await p.waitForTimeout(1200);
 const tom=Object.values(await p.evaluate(()=>window.__st)).find(v=>v&&v.kind==='client'&&v.name==='Tom Baker');
 ok(tom&&tom.source==='Van signwriting','the enquiry is saved with "Van signwriting"');
 await p.keyboard.press('Escape');await p.evaluate(()=>{const v=document.querySelector('#viewer-close,.vclose');if(v)v.click()});await p.waitForTimeout(300);
 await newEnq();
 ok((await p.evaluate(()=>[...document.querySelectorAll('#cf-src option')].map(o=>o.textContent))).includes('Van signwriting'),'next time it\'s on the list');
 await p.selectOption('#cf-src','__add');await p.waitForTimeout(200);await p.fill('#cf-src-new','google');await p.click('#cf-src-ok');await p.waitForTimeout(400);
 ok(await p.inputValue('#cf-src')==='Google'&&(await p.evaluate(()=>window.__st['settings/app'].clientSources)).length===1,'typing one already there (google) just picks Google');
 await p.screenshot({path:'h659.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h659: ${bad} failed`:'h659: all passed');await b.close();process.exit(bad?1:0);
})();
