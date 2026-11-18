// Upload an address book (made-up people): an Outlook-style CSV with First Name / Last Name / E-mail Address / Mobile
// Phone / Home Street / Home City / Home Postal Code. Clients › 📥 Upload an address book (CSV) finds 3 people, leaves out
// Sue Jones (already there – same email) and adds the other 2 as address-book contacts with their details.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const CSV='\uFEFFFirst Name,Last Name,E-mail Address,Mobile Phone,Home Street,Home City,Home Postal Code\r\n'+
 'Test,Person,test.person@example.com,07700 900333,"1 Test Street, Flat 2",Exmouth,ex8 1aa\r\n'+
 'Sue,Jones,sue@example.com,07700900111,4 Rolle Road,Exmouth,EX8 2AB\r\n'+
 'Another,Example,,07700 900444,,,\r\n';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='clients';window.__S.f.clf='all';window.render()});await p.waitForTimeout(400);
 ok(await p.locator('#cl-imp').count()===1,'Clients has 📥 Upload an address book (CSV)');
 ok(await p.evaluate(()=>{const s=getComputedStyle(document.getElementById('cl-imp'));return s.display!=='none'&&s.opacity==='0'}),'the file picker is an overlay (opens on an iPad)');
 const before=await p.evaluate(()=>window.__S.clients.length);
 await p.setInputFiles('#cl-imp',{name:'contacts.csv',mimeType:'text/csv',buffer:Buffer.from(CSV)});await p.waitForTimeout(600);
 const t=await p.innerText('#sheet');
 ok(/3 people in contacts\.csv/.test(t)&&/2 will be added/.test(t)&&/1 already there/.test(t),'it finds 3 people, 2 to add, Sue already there');
 await p.screenshot({path:OUT+'imp-1-preview.png'});
 await p.click('#f-save');await p.waitForTimeout(1500);
 const cl=await p.evaluate(()=>window.__S.clients);
 ok(cl.length===before+2,'2 added');
 const tp=cl.find(x=>x.email==='test.person@example.com');
 ok(tp&&tp.name==='Test Person'&&tp.phone==='07700 900333'&&tp.address==='1 Test Street, Flat 2, Exmouth'&&tp.postcode==='EX8 1AA'&&tp.stage==='contact'&&tp.source==='Imported','with name, phone, email, address and postcode, in the address book');
 ok(cl.some(x=>x.name==='Another Example'&&x.phone==='07700 900444'),'someone with only a phone is added too');
 ok(cl.filter(x=>x.email==='sue@example.com').length===1,'Sue isn\'t added twice');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h513: ${bad} failed`:'h513: all passed');await b.close();process.exit(bad?1:0);
})();
