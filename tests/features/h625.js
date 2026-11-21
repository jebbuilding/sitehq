// Letterhead and terms for a firm without its own (made-up firm details). Setup › My letterhead › ✨ Make one: the
// letterhead is drawn as you type, in three layouts, and saved as the letterhead's top and foot pictures. ✨ Make my
// terms writes starting terms for estimates and invoices from a few answers. Writes h625*.png.
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
 const ctx=await b.newContext({viewport:{width:1150,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(300);
 await p.evaluate(()=>{const S=window.__S;S.otab='setup';S.f.stab='setup';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('#lhb-make')&&await p.isVisible('#tms-make'),'Setup › My letterhead offers ✨ Make one and ✨ Make my terms');
 await p.click('#lhb-make');await p.waitForTimeout(500);
 await p.fill('#lhb-name','Example Builders Ltd');await p.fill('#lhb-tag','Extensions · Lofts');await p.fill('#lhb-phone','01395 000000');await p.fill('#lhb-cono','12345678');
 const inked=await p.evaluate(()=>{const cv=document.getElementById('lhb-top');const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let n=0;for(let i=0;i<d.length;i+=16)if(d[i]<200)n++;return n});
 ok(inked>200,'the letterhead is drawn as you type ('+inked+' marks)');
 await p.click('#lhb-style button[data-v="band"]');await p.waitForTimeout(200);
 const band=await p.evaluate(()=>{const cv=document.getElementById('lhb-top');const d=cv.getContext('2d').getImageData(4,4,1,1).data;return d[0]<240||d[1]<240});
 ok(band,'the coloured band layout fills the top with the colour');
 await p.screenshot({path:'h625-letterhead.png'});
 await p.click('#f-save');await p.waitForTimeout(1200);
 const ss=await p.evaluate(()=>window.__st['todos/salesset']||{});
 ok(ss.lhTop&&ss.lhTop.id&&ss.lhTop.h===38&&ss.lhBot&&ss.lhBot.id&&ss.lhMade,'saved as the letterhead\'s top and foot');
 await p.evaluate(()=>window.render());await p.waitForTimeout(400);
 await p.click('#tms-make');await p.waitForTimeout(400);
 await p.fill('#lht-dep','15');await p.fill('#lht-days','14');await p.fill('#lht-ins','£5,000,000');
 await p.click('#f-save');await p.waitForTimeout(800);
 const t=await p.evaluate(()=>window.__st['todos/salesset']||{});
 ok(/# Paying/.test(t.terms)&&/deposit of 15%/.test(t.terms)&&/within 14 days/.test(t.terms)&&/£5,000,000/.test(t.terms)&&/14 days of accepting/.test(t.terms),'starting terms are written from the answers');
 ok(/within 14 days/.test(t.invTerms||''),'and invoice terms too');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h625: ${bad} failed`:'h625: all passed');await b.close();process.exit(bad?1:0);
})();
