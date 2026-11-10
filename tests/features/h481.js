// Review requests (made-up client Sue Jones, loft conversion): moving her to Completed offers to thank her and ask for a
// Google review. The first time, James pastes his review link (kept in Company details after); the message has it, and
// WhatsApp opens to Sue's number with it. It's noted on her record that a review was asked for.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const HOOK='function viewClient(c) {';ok(page_src.split(HOOK).length===2,'hook found once');
page_src=page_src.replace(HOOK,'window.__vc=(id)=>viewClient((window.__S.clients||[]).find(x=>x.id===id));'+HOOK);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__links=[];HTMLAnchorElement.prototype.click=function(){window.__links.push(this.href)};});
 await p.evaluate(()=>window.__vc('c1'));await p.waitForTimeout(500);
 await p.click('.clstep[data-s=done]');await p.waitForTimeout(300);
 ok(await p.isChecked('#cm-review'),'moving to Completed offers to ask for a review (ticked)');
 await p.click('#f-save');await p.waitForTimeout(1200);
 ok(await p.isVisible('#rq-url'),'the first time, it asks for the Google review link');
 await p.fill('#rq-url','https://g.page/r/TESTLINK/review');await p.waitForTimeout(100);
 const msg=await p.inputValue('#rq-msg');console.log(msg.split('\n').slice(0,3).join(' | '));
 ok(/^Hi Sue,/.test(msg)&&/loft conversion/.test(msg)&&msg.includes('https://g.page/r/TESTLINK/review'),'the thank-you message is written, with the link');
 await p.click('.rq-acts button[data-v=wa]');await p.waitForTimeout(800);
 const L=await p.evaluate(()=>window.__links);
 ok(L.some(x=>/^https:\/\/wa\.me\/447700900111\?text=Hi%20Sue/.test(x)),'WhatsApp opens to Sue with the message');
 const st=await p.evaluate(()=>[window.__st['todos/c1'].reviewAskedAt,window.__st['settings/app'].company&&window.__st['settings/app'].company.reviewUrl]);
 ok(st[0]>0,'it is noted that a review was asked for');
 ok(st[1]==='https://g.page/r/TESTLINK/review','the link is kept in Company details for next time');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h481: ${bad} failed`:'h481: all passed');await b.close();process.exit(bad?1:0);
})();
