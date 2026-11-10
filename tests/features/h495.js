// Team › 🏢 Companies & subcontractors (made-up): James adds "Test Scaffolding Ltd" (scaffolding, CIS 20%, public
// liability running out in 10 days, the certificate attached); it's listed as working for us now with the insurance
// flagged, and shows in Today's "coming up". Sam (self-employed, on the app) fills in "Your business" in My details –
// trading name, insurance that ran out last week – and shows in the list with the insurance flagged; James can open
// Sam's details from there.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const day=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
let page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(DD).length===2,'details hook found');
const trade_src=page_src.replace(DD,'function detailsDone(d){return true}');
function mk(owner,dump){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+(dump?'Object.assign(store,'+dump+');':''));src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake(owner);}
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());
 try{
 /* Sam fills in "Your business" on the app */
 const t=await ctx.newPage();t.on('pageerror',e=>{console.log('ERR trade',e.message);bad++;});
 await t.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+mk(false)+trade_src+'</body></html>');await t.waitForTimeout(2200);await t.keyboard.press('Escape');
 await t.evaluate(()=>{window.__S.tab='details';window.render()});await t.waitForTimeout(500);await t.click('#dt-edit');await t.waitForTimeout(400);
 ok(await t.locator('#dt-tradingName').count()===1&&await t.locator('#dt-plExpiry').count()===1,'My details has a "Your business" section');
 /* the rest of his details, if they aren't there yet */
 for(const [k,v] of [['dt-dob','1990-05-01'],['dt-mobile','07700 900111'],['dt-address','1 Test Street'],['dt-postcode','EX8 1AA'],['dt-trade','Electrician'],['dt-nokName','Test Kin'],['dt-nokRel','Partner'],['dt-nokPhone','07700 900333']]){if(!(await t.inputValue('#'+k)))await t.fill('#'+k,v);}
 await t.selectOption('#dt-empType','selfemp');
 await t.fill('#dt-tradingName','Sam Test Electrical');await t.fill('#dt-plInsurer','Test Insurance Co');await t.fill('#dt-plCover','£2,000,000'); await t.evaluate(d=>{document.getElementById('dt-plExpiry').value=d},day(-7));
 await t.fill('#dt-accred','NICEIC approved contractor');
 await t.check('#dt-ok');await t.click('#f-save');await t.waitForTimeout(800);
 const sd=await t.evaluate(()=>window.__st['sheets/emp1']&&window.__st['sheets/emp1'].details);
 ok(sd&&sd.tradingName==='Sam Test Electrical'&&sd.plInsurer==='Test Insurance Co'&&sd.empType==='selfemp','Sam\'s business details are saved on his record');
 /* James */
 const dump=await t.evaluate(()=>JSON.stringify({'sheets/emp1':window.__st['sheets/emp1']}));
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR owner',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+mk(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.evaluate(async(d)=>{await window.__S.db.doc('sheets/emp1').update({details:JSON.parse(d)['sheets/emp1'].details});},dump);await p.waitForTimeout(400);
 await p.evaluate(()=>{window.__S.otab='people';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('#pp-cmp'),'the team page has 🏢 Companies & subcontractors');
 await p.click('#pp-cmp');await p.waitForTimeout(400);
 await p.click('#cmp-add');await p.waitForTimeout(300);
 await p.fill('#cmp-name','Test Scaffolding Ltd');await p.fill('#cmp-trades','Scaffolding');await p.fill('#cmp-contact','Dave Test');await p.fill('#cmp-phone','07700 900222');
 await p.selectOption('#cmp-cis','net20');await p.fill('#cmp-plInsurer','Test Underwriters');
 await p.selectOption('#cmp-dk','pl');await p.evaluate(d=>{document.getElementById('cmp-dx').value=d},day(10));
 await p.setInputFiles('#cmp-file','fixtures/ld1.png');await p.waitForTimeout(800);
 ok(await p.inputValue('#cmp-plExpiry')===day(10),'the certificate\'s date fills in when the insurance runs out');
 await p.click('#f-save');await p.waitForTimeout(800);
 const fm=await p.evaluate(()=>Object.values(window.__st).find(v=>v&&v.kind==='firm'));
 ok(fm&&fm.name==='Test Scaffolding Ltd'&&fm.cis==='net20'&&fm.docs.length===1&&fm.docs[0].kind==='pl'&&fm.status==='now','the company is saved with its certificate');
 const v=await p.innerText('#viewer-body');console.log(v.split('\n').slice(0,14).join(' | '));
 ok(/Test Scaffolding Ltd/.test(v)&&/Working for us now/.test(v)&&/Insurance runs out/.test(v),'listed as working for us now, insurance flagged');
 ok(/Sam Test Electrical/.test(v)&&/Insurance ran out/.test(v),'Sam is listed by his trading name with his insurance flagged');
 ok(/2 with insurance that has run out or runs out within 30 days/.test(v),'a warning at the top');
 await p.locator('.cmp-person:has-text("Sam Test Electrical")').click();await p.waitForTimeout(300);
 const pd=await p.innerText('.cmp-box');
 ok(/Test Insurance Co/.test(pd)&&/NICEIC/.test(pd)&&/keep these up to date themselves/.test(pd),'James sees Sam\'s business details');
 await p.click('.cmp-x');await p.waitForTimeout(300);
 await p.click('#cmp-f button[data-v=not]');await p.waitForTimeout(300);
 const nv=await p.innerText('#viewer-body');
 ok(!/Test Scaffolding Ltd/.test(nv),'"Not at the moment" leaves out those working for us now');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h495: ${bad} failed`:'h495: all passed');await b.close();process.exit(bad?1:0);
})();
