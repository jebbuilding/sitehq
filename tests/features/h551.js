// Who fills in the CDM documents (made-up job at 4 Rolle Road; Sam Test is made a Manager and has a saved signature):
// the CDM form has "Filled in and signed by" with the account holder and Sam; picking Sam and making the Building
// Regulations duty holder appointments puts Sam's name and signature on "Signed for them by", the "Principal
// contractor" line itself has no signature or date, and "duty holder" is two words. A manager's My details has
// ✍️ My signature.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='';src0=src0.replace('store["settings/app"]={ownerId:"owner",','store["settings/app"]={access:{office:{people:{emp1:"manager"}}},ownerId:"owner",');
const mk=()=>{let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
 src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
 let fake;eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','fake='));return fake;};
const fake=mk();
let page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
/* the made-up signature picture is served from memory */
page_src=page_src.replace('async function getFileBlob(','window.__gfb=1;async function getFileBlob(');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const SITE='4 Rolle Road, Exmouth';
const OUT='';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:1100}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* Sam's signature picture */
 await p.evaluate(async()=>{const cv=document.createElement('canvas');cv.width=300;cv.height=80;const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,300,80);g.strokeStyle='#000';g.lineWidth=4;g.beginPath();g.moveTo(10,60);g.bezierCurveTo(80,0,150,90,290,20);g.stroke();window.__blobs.sigm=await new Promise(r=>cv.toBlob(r,'image/png'));});
 await p.evaluate(async()=>{await window.__S.db.doc('sheets/emp1').update({sigId:'sigm'})});await p.waitForTimeout(300);
 await p.evaluate(()=>{const o=window.fetch;window.fetch=(u,...a)=>{const m=String(u).match(/_blob\/(\w+)/);if(m&&window.__blobs[m[1]])return Promise.resolve(new Response(window.__blobs[m[1]]));return o(u,...a)}});
 await p.evaluate(()=>document.querySelector('.tab[data-t=hs]').click());await p.waitForTimeout(500);
 await p.selectOption('#hs-cdmsite',SITE);await p.click('#hs-cdm');await p.waitForTimeout(600);
 const by=p.locator('.cdf[data-k=filledBy]');
 const opts=await by.locator('option').allInnerTexts();
 ok(opts.length===2&&/Sam Test/.test(opts[1]),'Filled in and signed by: the account holder or Sam (a manager) ('+opts.join(', ')+')');
 await by.selectOption('emp1');await by.dispatchEvent('change');await p.waitForTimeout(300);
 await p.click('#cdm-none');await p.waitForTimeout(200);
 await p.check('.cdd[data-k=brappoint]');await p.check('#cdm-dl');
 await p.click('#f-save');await p.waitForTimeout(5000);
 const pdf=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];if(!d)return '';const u=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return s});
 fs.writeFileSync(OUT+'brappoint.pdf',Buffer.from(pdf,'binary'));
 ok(/%PDF/.test(pdf)&&/duty holder appointments/.test(pdf)&&!/dutyholder/.test(pdf),'the Building Regulations duty holder appointments – "duty holder" in two words');
 ok(/Signed for them by/.test(pdf)&&/\(Sam Test\)/.test(pdf),'"Signed for them by" is Sam');
 ok((pdf.match(/\/Subtype \/Image/g)||[]).length>=1,'with Sam\'s signature on it');
 ok((pdf.match(/\(Signature\) Tj/g)||[]).length===3,'signature lines for the client, Sam and the principal designer only – not the principal contractor line ('+(pdf.match(/\(Signature\) Tj/g)||[]).length+')');
 /* a manager's My details has the signature card */
 const p2=await ctx.newPage();p2.on('pageerror',e=>{console.log('ERR trade',e.message);bad++;});
 await p2.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src.replace('function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}','function detailsDone(d){return true}')+'</body></html>');await p2.waitForTimeout(2000);await p2.keyboard.press('Escape');
 await p2.evaluate(()=>{window.__S.tab='details';window.render()});await p2.waitForTimeout(500);
 ok(await p2.locator('#sg-draw').count()===1&&/forms you fill in/.test(await p2.innerText('.sg-card')),'a manager\'s My details has ✍️ My signature for the forms they fill in');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h551: ${bad} failed`:'h551: all passed');await b.close();process.exit(bad?1:0);
})();
