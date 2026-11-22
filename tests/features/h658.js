// New enquiry for someone already in the address book (made-up client Sue Jones): their details are folded away to one line,
// with ✎ Edit / add details at the top – tapping it opens their details in the same form (name, phone, email, address…);
// a changed phone number and an added email are saved with the enquiry. With no phone or email, saving opens the details
// and says what's missing.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+'store["todos/c1"].stage="done";store["todos/c9"]={kind:"client",name:"Pat Nonumber",stage:"contact",notes:[],created:3};');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:1100}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 const start=async(name)=>{await p.evaluate(()=>{const S=window.__S;S.otab='clients';S.f.clf='all';window.render()});await p.waitForTimeout(400);
  await p.click('#cl-enq');await p.waitForTimeout(400);await p.fill('#ne-q',name);await p.waitForTimeout(300);await p.click('.ne-pick');await p.waitForTimeout(600);};
 await start('Sue');
 ok(await p.isVisible('#cf-showcon')&&!(await p.isVisible('#cf-consec')),'New enquiry for Sue: details folded away, ✎ Edit / add details at the top');
 const top=await p.evaluate(()=>{const b=document.getElementById('cf-showcon'),w=document.getElementById('cf-work');return b&&w?b.getBoundingClientRect().top<w.getBoundingClientRect().top:false});
 ok(top,'the button is above the enquiry');
 await p.click('#cf-showcon');await p.waitForTimeout(400);
 ok(await p.isVisible('#cf-consec')&&await p.isVisible('#cf-phone')&&await p.isVisible('#cf-addr'),'tapping it opens her details: phone, email, address');
 ok(/Hide their details/.test(await p.innerText('#cf-showcon')),'and the button now says ▲ Hide their details');
 await p.fill('#cf-phone','07700 900999');await p.fill('#cf-email','sue.new@example.com');
 await p.selectOption('#cf-work',{index:1});
 await p.screenshot({path:'h658-edit.png',fullPage:true});
 await p.click('#f-save');await p.waitForTimeout(1200);
 const sue=await p.evaluate(()=>window.__st['todos/c1']);
 ok(sue&&sue.phone==='07700 900999'&&sue.email==='sue.new@example.com','her new phone and email are saved with the enquiry');
 await p.evaluate(()=>{const v=document.getElementById('viewer-close')||document.querySelector('.vclose');if(v)v.click()});await p.keyboard.press('Escape');await p.waitForTimeout(300);
 /* no phone or email */
 await start('Pat');
 await p.selectOption('#cf-work',{index:1});await p.click('#f-save');await p.waitForTimeout(500);
 ok(await p.isVisible('#cf-consec')&&/phone number or email/.test(await p.innerText('#f-err')),'Pat has no phone or email: saving opens the details and says so');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h658: ${bad} failed`:'h658: all passed');await b.close();process.exit(bad?1:0);
})();
