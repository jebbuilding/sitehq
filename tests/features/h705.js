// If I'm off (made-up people and jobs): Today asks James to fill it in; Setup › 🆘 If I'm off lists the live job (a client
// on site), the team and a merchant with its account number. ✎ Fill in my part: who's in charge and their phone, an
// accountant to ring, wages, keys and where passwords are kept (no box for the passwords themselves). Saved owner-only
// (todos/offpack) with when it was checked, and Today stops asking. 📄 Make the PDF has all of it. Writes h705*.png/.pdf.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/cx1"]={kind:"client",name:"Pat Example",stage:"onsite",address:"9 Sample Lane, Exmouth",phone:"07000 000111"};store["todos/cx2"]={kind:"client",name:"Lee Lost",stage:"lost"};store["todos/cx3"]={kind:"client",name:"Kim Enquiry",stage:"enquiry"};'
 +'store["todos/mx1"]={kind:"supplier",name:"Example Builders Merchant",loc:"Exeter",phone:"01392 000000",accountNo:"ACC-42"};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='today';window.render()});await p.waitForTimeout(500);
 ok(/If I'm off/.test(await p.innerText('.off-today').catch(()=>'')),'Today asks to fill in If I\'m off');
 await p.evaluate(()=>{const S=window.__S;S.otab='setup';S.f.stab='';window.render()});await p.waitForTimeout(400);
 await p.click('#off-reg');await p.waitForTimeout(400);
 let v=await p.innerText('#viewer');
 ok(/Pat Example/.test(v)&&/9 Sample Lane/.test(v)&&!/Lee Lost|Kim Enquiry/.test(v),'live jobs: just the client on site');
 ok(/ACC-42/.test(v)&&/The team/i.test(v),'the merchant with its account number, and the team');
 await p.click('#off-edit');await p.waitForTimeout(300);
 ok(!(await p.$('#sheet input[type=password]'))&&/Never put the passwords themselves/.test(await p.innerText('#sheet')),'no box for passwords – just where they\'re kept');
 await p.fill('#off-dep','Alex Example');await p.fill('#off-depp','07000 000222');
 await p.fill('.off-pn >> nth=0','Example Accounts Ltd');await p.fill('.off-pp >> nth=0','01395 000333');
 await p.fill('#off-wages','Every Friday by bank transfer.');await p.fill('#off-keys','Spare van keys in the key safe.');await p.fill('#off-passwords','In the password manager – Alex has emergency access.');
 await p.screenshot({path:'h705-form.png',fullPage:true});
 await p.click('#f-save');await p.waitForTimeout(600);
 const r=await p.evaluate(()=>window.__st['todos/offpack']);
 ok(r&&r.deputy==='Alex Example'&&r.people.length===1&&r.people[0].role==='Accountant'&&r.checkedAt>0&&/Friday/.test(r.wages),'saved owner-only with when it was checked');
 v=await p.innerText('#viewer');
 ok(/Alex Example/.test(v)&&/Example Accounts Ltd/.test(v)&&/Last checked/.test(v),'the page shows who\'s in charge, the accountant, last checked');
 await p.click('#off-pdf');await p.waitForTimeout(2500);
 const dl=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return {fn:d.filename,s}});
 fs.writeFileSync('h705.pdf',Buffer.from(dl.s,'latin1'));
 ok(/If I'm off/.test(dl.fn)&&/Alex Example/.test(dl.s)&&/Pat Example/.test(dl.s)&&/ACC-42/.test(dl.s)&&/key safe/.test(dl.s),'PDF: '+dl.fn);
 await p.evaluate(()=>{window.__S.otab='today';window.render()});await p.waitForTimeout(500);
 ok(!(await p.$('.off-today')),'Today stops asking');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h705: ${bad} failed`:'h705: all passed');await b.close();process.exit(bad?1:0);
})();
