// Suppliers & brochures CSV (made-up supplier and brochure): on Merchants › Suppliers, ⬇ Download CSV saves every
// supplier with its brochure links and the brochures saved; ⬆ Upload CSV updates one (rep and a new brochure link) and adds a new one.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({MKCSV});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(400);
 await p.evaluate(async()=>{await window.__S.db.doc('todos/br-t1').set({kind:'brochure',maker:'distinction',title:'Distinction door styles 2026',assetId:'a1',at:1});});
 await p.waitForTimeout(1500);
 await p.evaluate(()=>{window.__S.otab='suppliers';window.__S.f.merTab='makers';window.render()});await p.waitForTimeout(700);
 ok(await p.isVisible('#mkcsv-dl')&&await p.isVisible('.mkcsv-up'),'Suppliers has ⬇ Download CSV and ⬆ Upload CSV');
 await p.screenshot({path:'h700-suppliers.png'});
 await p.click('#mkcsv-dl');await p.waitForTimeout(600);
 const d=await p.evaluate(()=>{const x=(window.__dl||[]).slice(-1)[0];return x?{n:x.filename,t:String(x.data)}:null});
 ok(d&&d.n==='Suppliers and brochures.csv'&&/"Name","Type","Phone"/.test(d.t)&&/Brochure links/.test(d.t),'the download has the columns, brochure links among them');
 ok(/"Distinction Doors"[^\n]*Distinction door styles 2026/.test(d.t),'Distinction Doors\' row lists the brochure saved in the app');
 await p.click('#pdfbar-x').catch(()=>{});
 const csv='"Name","Type","Rep / contact","Brochure links"\r\n"Distinction Doors","","Pat Example","2026 colours | https://example.com/colours.pdf"\r\n"Sample Bifolds Ltd","Aluminium systems","","www.example.com/bifold-brochure"\r\n';
 await p.setInputFiles('#mkcsv-in',{name:'suppliers.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await p.waitForTimeout(800);
 const t=await p.innerText('#form').catch(()=>'');
 ok(/1 new/.test(t)&&/Sample Bifolds Ltd/.test(t)&&/1 updated/.test(t)&&/Distinction Doors/.test(t)&&/Rep \/ contact/.test(t)&&/Brochure links/.test(t),'it shows what it will do first: 1 new, 1 updated (rep and brochure link)');
 await p.screenshot({path:'h700-upload.png'});
 await p.click('#f-save');await p.waitForTimeout(1500);
 const st=await p.evaluate(()=>window.__st);
 const di=Object.values(st).find(v=>v&&v.kind==='maker'&&v.key==='distinction');
 ok(di&&di.contact==='Pat Example'&&di.links.length===1&&di.links[0][1]==='https://example.com/colours.pdf','Distinction Doors: the rep and the new brochure link are kept');
 const nw=Object.values(st).find(v=>v&&v.kind==='maker'&&v.name==='Sample Bifolds Ltd');
 ok(nw&&nw.cat==='Aluminium systems'&&nw.links[0][1]==='https://www.example.com/bifold-brochure','Sample Bifolds Ltd is added, with its brochure link');
 await p.evaluate(()=>window.render());await p.waitForTimeout(500);
 ok(/Sample Bifolds Ltd/.test(await p.innerText('#main')),'and is on the Suppliers list');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h700: ${bad} failed`:'h700: all passed');await b.close();process.exit(bad?1:0);
})();
