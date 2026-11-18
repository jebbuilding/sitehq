// Materials requests come to James and he passes them on (made-up trades Sam Test and Tom Test): Sam's request for
// blocks opens with 📤 Pass it on; the choices are trades on the team or someone else by text or email – never a
// client. Passing it to Tom puts the list in Tom's Materials & tools and notes it on Sam's request.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["sheets/emp9"]={name:"Tom Test"};store["sheets/emp1/invoices/mr1"]={kind:"materials",site:"4 Rolle Road, Exmouth",items:[{name:"100mm blocks",qty:"50",type:"material"},{name:"Breaker",qty:"1",type:"tool"}],status:"sent",sentAt:Date.now(),created:Date.now()};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='materials';window.__S.f.mst='all';window.render()});await p.waitForTimeout(500);
 await p.locator('.matc[data-m=mr1]').click();await p.waitForTimeout(400);
 ok(await p.isVisible('#mt-pass'),'Sam\'s request has 📤 Pass it on');
 await p.click('#mt-pass');await p.waitForTimeout(300);
 const opts=await p.evaluate(()=>[...document.querySelectorAll('#mp-to option')].map(o=>o.textContent));
 ok(opts.includes('Tom Test')&&opts.some(o=>/Someone else/.test(o))&&!opts.some(o=>/Sue Jones|Bob Lee/.test(o))&&!opts.includes('Sam Test'),'it goes to a trade or someone else – no clients ('+opts.join(', ')+')');
 await p.screenshot({path:OUT+'mat-1-pass.png'});
 await p.selectOption('#mp-to','emp9');await p.fill('#mp-note','Pick these up on your way in');await p.click('#f-save');await p.waitForTimeout(1000);
 const tom=await p.evaluate(()=>Object.entries(window.__st).filter(([k])=>/^sheets\/emp9\/invoices\//.test(k)).map(([k,v])=>v));
 ok(tom.length===1&&tom[0].kind==='materials'&&tom[0].fromOwner&&tom[0].items.length===2&&/Passed on from Sam Test/.test(tom[0].notes),'the list lands in Tom\'s Materials & tools');
 ok(await p.evaluate(()=>(window.__st['sheets/emp1/invoices/mr1'].passedTo||[])[0].to==='Tom Test'),'and Sam\'s request notes it was passed to Tom');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h525: ${bad} failed`:'h525: all passed');await b.close();process.exit(bad?1:0);
})();
