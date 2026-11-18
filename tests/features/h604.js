// Sub-folders in a site's Plans & drawings, RAMS and Specs & docs (made-up job): documents with a folder path show as
// folders to tap into, with a trail back up; + New folder makes one inside the folder you're in, kept while it's
// empty; Upload from inside a folder puts the files there.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const SITE='4 Rolle Road, Exmouth';
const extra='store["docs/dpa"]={site:"4 Rolle Road, Exmouth",cat:"plans",title:"Ground floor plan",fileName:"gf.pdf",assetId:"a31",contentType:"application/pdf",path:"Architect",uploaded:1762000000000};'+
 'store["docs/dpb"]={site:"4 Rolle Road, Exmouth",cat:"plans",title:"Beam B1 calc sketch",fileName:"b1.pdf",assetId:"a31",contentType:"application/pdf",path:"Structural/Beams",uploaded:1762000000000};'+
 'store["docs/dpc"]={site:"4 Rolle Road, Exmouth",cat:"plans",title:"Site plan",fileName:"site.pdf",assetId:"a31",contentType:"application/pdf",uploaded:1762000000000};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1180,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 const ohtml='<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>';
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:ohtml}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.goto('https://sitehq.test/');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.evaluate(s=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.__S.f.pjtab='overview';window.render();window.__S.f.pjtab='plans';window.render()},SITE);await p.waitForTimeout(500);
 const folds=async()=>p.evaluate(()=>[...document.querySelectorAll('.pjd-fold .fname')].map(x=>x.innerText));
 ok(JSON.stringify(await folds())==='["Architect","Structural"]','Plans & drawings shows the Architect and Structural folders');
 let m=await p.innerText('#main');
 ok(/Site plan/.test(m)&&!/Ground floor plan/.test(m)&&!/Beam B1/.test(m),'only the files at the top are listed; the rest are in their folders');
 await p.click('.pjd-fold[data-p="Structural"]');await p.waitForTimeout(400);
 ok(JSON.stringify(await folds())==='["Beams"]'&&/Plans & drawings/.test(await p.innerText('.pjd-crumbs')),'inside Structural: a Beams folder and a trail back up');
 await p.click('.pjd-fold[data-p="Structural/Beams"]');await p.waitForTimeout(400);
 ok(/Beam B1 calc sketch/.test(await p.innerText('#main')),'inside Beams: its drawing');
 await p.click('.pjd-go[data-p="Structural"]');await p.waitForTimeout(400);
 await p.click('.pjd-new');await p.waitForTimeout(300);
 await p.fill('#pjd-name','Calcs');await p.click('#f-save');await p.waitForTimeout(800);
 const rec=await p.evaluate(()=>Object.entries(window.__st).filter(([k])=>/^todos\/dfold-/.test(k)).map(([k,v])=>v));
 ok(rec.length===1&&rec[0].path==='Structural/Calcs'&&rec[0].cat==='plans'&&rec[0].site===SITE_JS,'+ New folder makes Structural/Calcs, kept owner-only');
 ok(/Nothing in this folder yet/.test(await p.innerText('#main'))&&/Calcs/.test(await p.innerText('.pjd-crumbs')),'it opens the new, empty folder');
 ok(await p.getAttribute('.pj-up','data-p')==='Structural/Calcs'&&/here/.test(await p.innerText('.pj-up')),'Upload here puts files in this folder');
 await p.click('.pj-up');await p.waitForTimeout(400);
 ok(await p.inputValue('#d-path')==='Structural/Calcs','the upload form is filled in with the folder');
 await p.click('#f-cancel');await p.waitForTimeout(300);
 await p.click('.pjd-go[data-p="Structural"]');await p.waitForTimeout(400);
 ok(JSON.stringify(await folds())==='["Beams","Calcs"]'&&/Empty/.test(await p.innerText('.pjd-fold[data-p="Structural/Calcs"]')),'back in Structural, Calcs is there (Empty) next to Beams');
 await p.screenshot({path:OUT+'doc-folders.png',clip:{x:0,y:0,width:1180,height:760}});
 await p.evaluate(()=>{window.__S.f.pjtab='rams';window.render()});await p.waitForTimeout(400);
 ok(await p.isVisible('.pjd-new'),'RAMS has + New folder too');
 await p.evaluate(()=>{window.__S.f.pjtab='specs';window.render()});await p.waitForTimeout(400);
 ok(await p.isVisible('.pjd-new'),'and Specs & docs');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h604: ${bad} failed`:'h604: all passed');await b.close();process.exit(bad?1:0);
})();
const SITE_JS='4 Rolle Road, Exmouth';
