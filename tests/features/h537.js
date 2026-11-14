// Company documents (made-up firm "Acme Build Ltd", run by Pat Jones, new look, iPad size): Policies & insurance starts
// with a 📋 Company documents checklist of 10 things a building firm is asked for, all Missing; ✍ Make it for me on the
// health and safety policy writes a PDF from the company details (Acme's name, Pat as responsible, the emergency
// contact and first aiders) and files it in Company policies as must-read with a review date; it then shows ✓ Made by
// the app; making it again leaves one copy; an employer's liability certificate uploaded against its line is filed in
// Insurance; a trade is asked to read the policy.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const src0=src;
src=src.replace('ownerName:"James Bray",company:{name:"JEB Building Services",owner:"James Bray"}','ownerName:"Pat Jones",company:{name:"Acme Build Ltd",owner:"Pat Jones",mobile:"07700900500",oohName:"Pat Jones",oohPhone:"07700900501",firstAid:"Sam Test"}');
if(src===src0)throw new Error('company seed patch did not match');
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed).replace(/WK21 JEB/g,'AB21 CDE').replace(/"James"/g,'"Pat"');
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const route=(ctx,owner)=>ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});if(u.startsWith('https://sitehq.test/'))return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset=utf8><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fake(owner)+page_src.replace(owner?'@@':'function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}',owner?'@@':'function detailsDone(d){return true}')+'</body></html>'});r.abort()});
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1024,height:1300},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true');localStorage.setItem('jeb.splash','1')}catch(e){}});
 await route(ctx,true);
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.goto('https://sitehq.test/');await p.waitForTimeout(3000);await p.keyboard.press('Escape');
 const go=async()=>{await p.evaluate(()=>{const o=document.getElementById('ohq');if(o)o.hidden=true;document.getElementById('sheet').hidden=true;window.__S.otab='policies';window.__S.f.polf='';window.render()});await p.waitForTimeout(500);};
 await go();
 ok(await p.locator('.cdx-card .cdx-row').count()===10,'Policies & insurance has the 📋 Company documents checklist (10 lines)');
 ok(/10 of 10 still to add/.test(await p.innerText('.cdx-card summary')),'all still to add');
 await p.evaluate(()=>{document.querySelector('.cdx-card').open=true});
 await (await p.$('.cdx-card')).screenshot({path:OUT+'cdx-1-list.png'});
 await p.click('.cdx-row[data-k=hs] .cdx-make');await p.waitForTimeout(3000);
 const docs=()=>p.evaluate(()=>Object.entries(window.__st).filter(([k,v])=>k.startsWith('docs/')&&v&&v.need).map(([k,v])=>Object.assign({path:k},v)));
 let d=(await docs()).filter(x=>x.need==='hs');
 ok(d.length===1&&d[0].made&&d[0].cat==='policy'&&d[0].mustRead&&/^\d{4}-\d\d-\d\d$/.test(d[0].reviewBy),'Make it for me files a must-read health and safety policy in Company policies, with a review date');
 const txt=await p.evaluate(async(id)=>{const bl=window.__blobs[id];if(!bl)return '';const u=new Uint8Array(await bl.arrayBuffer());let s='';for(let i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return s},d[0]&&d[0].assetId);
 ok(/%PDF/.test(txt)&&/ACME BUILD LTD/.test(txt)&&/Health and safety policy/.test(txt),'it is a PDF headed with the company name');
 ok(/Pat Jones has overall responsibility/.test(txt.replace(/\)\s*Tj[\s\S]*?\(/g,' ')) || (/Pat Jones/.test(txt)&&/overall responsibility/.test(txt)),'Pat (the account holder) is named as responsible');
 ok(/07700900501/.test(txt)&&/Sam Test/.test(txt),'with the emergency contact and first aider from Company details');
 ok(!/James|JEB|Devon/.test(txt),'and nothing about James, JEB or Devon');
 fs.writeFileSync(OUT+'cdx-hs.pdf',Buffer.from(txt,'binary'));
 await go();
 ok(/Made by the app/.test(await p.innerText('.cdx-row[data-k=hs]'))&&/9 of 10 still to add/.test(await p.innerText('.cdx-card summary')),'the line now says ✓ Made by the app (9 still to add)');
 await p.click('.cdx-row[data-k=hs] .cdx-make');await p.waitForTimeout(3000);
 d=(await docs()).filter(x=>x.need==='hs');
 ok(d.length===1,'making it again leaves one copy ('+d.length+')');
 await go();
 await p.click('.cdx-row[data-k=el] .cdx-up');await p.waitForTimeout(400);
 await p.setInputFiles('#cdx-file',{name:'EL certificate.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 test')});
 await p.fill('#cdx-ins','Test Insurance Co');await p.fill('#cdx-exp','2027-06-30');
 await p.click('#f-save');await p.waitForTimeout(1200);
 const el=(await docs()).filter(x=>x.need==='el');
 ok(el.length===1&&el[0].cat==='insurance'&&el[0].expires==='2027-06-30'&&el[0].insurer==='Test Insurance Co','an employer\'s liability certificate uploaded on its line is filed in Insurance with its end date');
 await go();
 ok(/Uploaded/.test(await p.innerText('.cdx-row[data-k=el]')),'and its line says ✓ Uploaded');
 await p.evaluate(()=>{document.querySelector('.cdx-card').open=true});
 await (await p.$('.cdx-card')).screenshot({path:OUT+'cdx-2-after.png'});
 /* a trade is asked to read it, and doesn't see the checklist */
 const ctx2=await b.newContext({viewport:{width:1024,height:900}});ctx2.setDefaultTimeout(8000);await route(ctx2,false);
 const t=await ctx2.newPage();t.on('pageerror',e=>{console.log('ERR trade',e.message);bad++;});
 await t.goto('https://sitehq.test/');await t.waitForTimeout(2500);await t.keyboard.press('Escape');
 const hsDoc=(await docs()).find(x=>x.need==='hs');await t.evaluate(async(d)=>{const id=d.path.slice(5);delete d.path;await window.__S.db.doc('docs/'+id).set(d)},hsDoc);await t.waitForTimeout(500);await t.evaluate(()=>{window.__S.tab='policies';window.render()});await t.waitForTimeout(500);
 const tt=await t.innerText('#main');
 ok(await t.locator('.cdx-card').count()===0&&/Please read/.test(tt),'a trade is asked to read it, and has no checklist');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h537: ${bad} failed`:'h537: all passed');await b.close();process.exit(bad?1:0);
})();
