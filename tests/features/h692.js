// Referrals (made-up clients): a new enquiry for Tom Baker came from a Recommendation – the form asks who, and Sue
// Jones (already a client) is picked. Tom's job is won; Today says 🤝 Say thank you; the note to Sue is filled in, a
// £50 voucher noted, Mark as thanked. Sue's page lists Tom; 🤝 Referrals shows Sue: 1 sent, 1 won. Writes h692*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({viewClient,RFL,closeViewer});function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#nl-tog').catch(()=>{});await p.waitForTimeout(300);
 await p.evaluate(()=>{const S=window.__S;S.otab='clients';S.f.clf='all';window.render()});await p.waitForTimeout(400);await p.click('#cl-enq');await p.waitForTimeout(400);await p.click('#ne-new');await p.waitForTimeout(600);
 ok(!(await p.isVisible('#cf-refby')),'"Who recommended them?" stays hidden until it\'s a Recommendation');
 await p.selectOption('#cf-src','Recommendation');await p.waitForTimeout(200);
 ok(await p.isVisible('#cf-refby'),'choosing Recommendation asks who recommended them');
 await p.fill('#cf-refby','Sue Jones');
 await p.fill('#cf-main .cfm-f','Tom');await p.fill('#cf-main .cfm-l','Baker');await p.fill('#cf-phone','07700 900123');
 await p.selectOption('#cf-stage','won');
 await p.screenshot({path:'h692-form.png'});
 await p.click('#f-save');await p.waitForTimeout(1200);
 let tom=Object.entries(await p.evaluate(()=>window.__st)).find(([k,v])=>v&&v.kind==='client'&&v.name==='Tom Baker');
 ok(tom&&tom[1].refBy&&tom[1].refBy.clientId==='c1','saved: recommended by Sue Jones (her client record)');
 await p.keyboard.press('Escape');await p.evaluate(()=>window.__T().closeViewer());await p.waitForTimeout(200);
 await p.evaluate(()=>{window.__S.otab='today';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('.rfl-today')&&/Sue Jones/.test(await p.innerText('.rfl-today'))&&/recommended Tom Baker/.test(await p.innerText('.rfl-today')),'Today: 🤝 Say thank you – Sue Jones recommended Tom Baker');
 await p.click('.rfl-tgo');await p.waitForTimeout(400);
 const tx=await p.inputValue('#rfl-tx');
 ok(/^Hi Sue/.test(tx)&&/recommending us to Tom Baker/.test(tx)&&await p.isVisible('#rfl-em'),'the thank-you note is written, with ✉️ Email it (Sue\'s email is saved)');
 await p.fill('#rfl-gift','£50 restaurant voucher');
 await p.screenshot({path:'h692-thanks.png'});
 await p.click('#f-save');await p.waitForTimeout(900);
 tom=Object.entries(await p.evaluate(()=>window.__st)).find(([k,v])=>v&&v.kind==='client'&&v.name==='Tom Baker');
 ok(tom[1].refThanked&&tom[1].refThanked.gift==='£50 restaurant voucher'&&!(await p.isVisible('.rfl-today')),'marked as thanked with the gift; gone from Today');
 await p.evaluate(()=>window.__T().viewClient(window.__S.clients.find(c=>c.id==='c1')));await p.waitForTimeout(600);
 ok(/recommended you to 1 person/.test(await p.innerText('.rfl-card'))&&/Tom Baker/.test(await p.innerText('.rfl-card')),'Sue\'s page: she\'s recommended you to 1 person – Tom Baker');
 await p.evaluate(()=>window.__T().RFL.open());await p.waitForTimeout(400);
 ok(/1 sent · 1 won/.test(await p.innerText('.rfl')),'🤝 Referrals: Sue – 1 sent, 1 won');
 await p.screenshot({path:'h692-list.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h692: ${bad} failed`:'h692: all passed');await b.close();process.exit(bad?1:0);
})();
