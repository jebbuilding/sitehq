// Merchants CSV (made-up merchants): ⬇ Download CSV saves every merchant, one row each; ⬆ Upload CSV with a changed
// phone for one and a new merchant shows 1 new and 1 updated, then adds and updates them – empty boxes leave what's there.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({MCSV});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(400);
 await p.evaluate(async()=>{await window.__S.db.doc('todos/sup-t1').set({kind:'supplier',name:'Example Timber',loc:'Exeter',cat:'Timber',accountNo:'AC-100',phone:'01392 000000',vis:'all',people:[],branches:[{name:'Exmouth',address:'1 Yard Lane',phone:'01395 000000',email:'',notes:''}],created:1,updated:1});});
 await p.waitForTimeout(500);
 await p.evaluate(()=>{window.__S.otab='suppliers';window.__S.f.merTab='mer';window.render()});await p.waitForTimeout(700);
 ok(await p.isVisible('#mcsv-dl')&&await p.isVisible('.mcsv-up'),'Merchants has ⬇ Download CSV and ⬆ Upload CSV');
 await p.screenshot({path:'h674-merchants.png'});
 await p.click('#mcsv-dl');await p.waitForTimeout(600);
 const d=await p.evaluate(()=>{const x=(window.__dl||[]).slice(-1)[0];return x?{n:x.filename,t:String(x.data)}:null});
 ok(d&&d.n==='Merchants.csv'&&/"Name","Type","Branch"/.test(d.t)&&/"Example Timber","Timber","Exeter"/.test(d.t)&&/Exmouth – 1 Yard Lane – 01395 000000/.test(d.t),'the download has a row for each merchant, with its other branches');
 await p.click('#pdfbar-x').catch(()=>{});
 /* upload: Example Timber's phone changed (other boxes empty), and a new merchant */
 const csv='"Name","Branch","Phone","Type","Email","Who sees it"\r\n"Example Timber","Exeter","01392 111111","","",""\r\n"Sample Plumbing Supplies","Exmouth","01395 222222","Plumbing and heating","trade@example.com","Only me"\r\n';
 await p.setInputFiles('#mcsv-in',{name:'merchants.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await p.waitForTimeout(800);
 const t=await p.innerText('#form').catch(()=>'');
 ok(/1 new/.test(t)&&/Sample Plumbing Supplies/.test(t)&&/1 updated/.test(t)&&/Example Timber/.test(t)&&/Phone/.test(t),'it shows what it will do first: 1 new, 1 updated (phone)');
 await p.screenshot({path:'h674-upload.png'});
 await p.click('#f-save');await p.waitForTimeout(1500);
 const st=await p.evaluate(()=>window.__st);
 const t1=st['todos/sup-t1'];
 ok(t1.phone==='01392 111111'&&t1.accountNo==='AC-100'&&t1.cat==='Timber'&&t1.branches.length===1,'Example Timber: the new phone, the rest as it was');
 const nw=Object.values(st).find(v=>v&&v.kind==='supplier'&&v.name==='Sample Plumbing Supplies');
 ok(nw&&nw.loc==='Exmouth'&&nw.cat==='Plumbing and heating'&&nw.email==='trade@example.com'&&nw.vis==='me','Sample Plumbing Supplies is added, only for me');
 ok(/Sample Plumbing Supplies/.test(await p.innerText('#main')),'and is on the Merchants list');
 /* a sheet without names */
 await p.setInputFiles('#mcsv-in',{name:'bad.csv',mimeType:'text/csv',buffer:Buffer.from('"Phone"\r\n"01392"\r\n')});await p.waitForTimeout(600);
 ok(!(await p.isVisible('#form'))||!/Upload merchants/.test(await p.innerText('#form').catch(()=>'')),'a sheet with no Name column changes nothing');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h674: ${bad} failed`:'h674: all passed');await b.close();process.exit(bad?1:0);
})();
