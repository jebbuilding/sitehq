// My numbers (made-up numbers): Setup › 🔢 My numbers shows the company and VAT numbers from Company details and the van's
// registration and insurance from its details, each with 📋 Copy. ✎ Change adds a UTR and an FMB number and an extra
// number with its own name; they're saved owner-only (todos/mynumbers) and shown in their groups. 📋 Copy all copies them
// all as one message.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.grantPermissions(['clipboard-read','clipboard-write']);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.evaluate(async()=>{const S=window.__S;await S.db.doc('settings/app').update({company:Object.assign({},(S.settings||{}).company||{},{companyNo:'01234567',vatNo:'GB 000 0000 00',extra:[{label:'Gas Safe',value:'GS-555'}]})});
  const v=(S.equipment||[]).find(e=>e.kind==='vehicle');await S.db.doc('equipment/'+v.id).update({info:Object.assign({},v.info||{},{reg:'AB12 CDE',insurer:'Example Insurance',policy:'POL-123'})});});await p.waitForTimeout(500);
 await p.evaluate(()=>{const S=window.__S;S.otab='setup';S.f.stab='';window.render()});await p.waitForTimeout(400);
 await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{window.__clip=t},readText:async()=>window.__clip}}));
 await p.click('#num-reg');await p.waitForTimeout(400);
 let v=await p.innerText('#viewer');
 ok(/01234567/.test(v)&&/GB 000 0000 00/.test(v)&&/from Company details/.test(v)&&/GS-555/.test(v),'company and VAT numbers and the extra rows from Company details');
 ok(/AB12 CDE/.test(v)&&/POL-123/.test(v),'the van\'s registration and insurance policy');
 await p.click('#num-edit');await p.waitForTimeout(300);
 ok(!/password/i.test((await p.innerText('#sheet')).replace(/No passwords here/,'')),'no place for passwords');
 await p.fill('#num-utrCo','1234567890');await p.fill('#num-fmb','FMB-0001');
 await p.click('#num-exadd');await p.fill('.num-exl >> nth=0','Gas meter serial');await p.fill('.num-exv >> nth=0','G4-998877');
 await p.click('#f-save');await p.waitForTimeout(600);
 const r=await p.evaluate(()=>window.__st['todos/mynumbers']);
 ok(r&&r.kind==='mynumbers'&&r.vals.utrCo==='1234567890'&&r.vals.fmb==='FMB-0001'&&r.extra[0].label==='Gas meter serial','saved owner-only in todos/mynumbers');
 v=await p.innerText('#viewer');
 ok(/Tax & HMRC/i.test(v)&&/Company UTR/.test(v)&&/Memberships/i.test(v)&&/FMB-0001/.test(v)&&/G4-998877/.test(v),'shown in their groups');
 await p.screenshot({path:'h704.png',fullPage:true});
 await p.locator('.num-row',{hasText:'FMB-0001'}).locator('.num-cp').click();await p.waitForTimeout(300);
 ok(await p.evaluate(()=>window.__clip)==='FMB-0001','📋 Copy copies just that number');
 await p.click('#num-all');await p.waitForTimeout(300);
 const all=await p.evaluate(()=>window.__clip);
 ok(/Company number: 01234567/.test(all)&&/Company UTR: 1234567890/.test(all)&&/Memberships/.test(all),'📋 Copy all: one message with everything');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h704: ${bad} failed`:'h704: all passed');await b.close();process.exit(bad?1:0);
})();
