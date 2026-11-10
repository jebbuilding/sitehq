// Setup › 🧰 Tools & plant – who has what (made-up kit: a breaker with its PAT test due in 10 days, and a ladder): both
// start in the yard; the breaker is booked out to Sam at 4 Rolle Road and shows there, flagged for its PAT test; a
// sheet of QR stickers is made and each gets a number (T-001, T-002); searching T-001 finds the breaker; it comes back in.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const day=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const extra='store["equipment/k1"]={kind:"machine",name:"Test Breaker",dates:{pat:"'+day(10)+'"}};store["equipment/k2"]={kind:"ladder",name:"Test Ladder"};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('qrcode-generator'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('qrlib/package/qrcode.js','utf8')});if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='setup';window.__S.f.stab='setup';window.render()});await p.waitForTimeout(400);
 ok(await p.isVisible('#kit-reg'),'Setup has Tools & plant: who has what');
 await p.click('#kit-reg');await p.waitForTimeout(400);
 let t=await p.innerText('#viewer-body');
 ok(/In the yard \(3\)/.test(t)&&/Test Breaker/.test(t)&&/Test Ladder/.test(t),'they all start in the yard');
 ok(/PAT test \/ inspection due/.test(t),'the breaker is flagged for its PAT test');
 await p.locator('.kit-row:has-text("Test Breaker") .kit-out').click();await p.waitForTimeout(300);
 await p.selectOption('#kit-who','emp1');await p.selectOption('#kit-site','4 Rolle Road, Exmouth');await p.click('#f-save');await p.waitForTimeout(700);
 const o=await p.evaluate(()=>window.__st['equipment/k1'].out);
 ok(o&&o.who==='emp1'&&o.site==='4 Rolle Road, Exmouth','booked out to Sam at 4 Rolle Road');
 t=await p.innerText('#viewer-body');
 ok(/Sam Test · 4 Rolle Road, Exmouth \(1\)/.test(t)&&/In the yard \(2\)/.test(t),'it shows with Sam on site, the rest still in the yard');
 await p.click('#kit-qr');await p.waitForTimeout(2500);
 const tags=await p.evaluate(()=>Object.entries(window.__st).filter(([k,v])=>k.startsWith('equipment/')&&v.tag).map(([k,v])=>v.tag).sort());console.log(tags);
 ok(tags.length===3&&tags[0]==='T-001'&&tags[2]==='T-003','each gets a sticker number');
 ok(await p.evaluate(()=>(window.__dl||[]).some(x=>x.filename==='Tool stickers.pdf'&&x.data.size>2000)),'a sheet of QR stickers is made');
 const bt=await p.evaluate(()=>window.__st['equipment/k1'].tag);
 await p.evaluate(()=>{document.getElementById('viewer-close').click();window.__S.otab='setup';window.render()});await p.waitForTimeout(300);await p.click('#kit-reg');await p.waitForTimeout(300);
 await p.fill('#kit-q',bt);await p.waitForTimeout(700);
 t=await p.innerText('#viewer-body');
 ok(/Test Breaker/.test(t)&&!/Test Ladder/.test(t),'searching its number finds it');
 await p.click('.kit-in');await p.waitForTimeout(700);
 ok(await p.evaluate(()=>window.__st['equipment/k1'].out)===null,'back in the yard');
 ok(await p.evaluate(()=>window.__st['equipment/k1'].kitLog.length)===2,'both moves are kept on its record');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h488: ${bad} failed`:'h488: all passed');await b.close();process.exit(bad?1:0);
})();
