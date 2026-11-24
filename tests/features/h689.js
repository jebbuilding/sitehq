// Neighbours and party wall notices (made-up client Sue Jones, 4 Rolle Road; today Tue 24 Nov 2026): on her job,
// 🏘 Neighbours → + Add a neighbour (Mr and Mrs Lee, 6 Rolle Road). ✉️ Letter makes a PDF letter about the work and
// marks it sent. Party wall: a steel into the shared wall (s.3, 2 months) – the notice PDF (with the reply slip) marks it
// served today, so the work can start from 24 Jan 2027; the job starting 14 Dec is flagged ⛔. Saved on her record;
// Today lists it; with no answer after 14 days it says a surveyor is needed. Writes h689*.png / .pdf.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({viewClient,NBR});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.clock.install({time:new Date('2026-11-24T10:00:00')});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.clock.runFor(2500);await p.keyboard.press('Escape');
 await p.click('#nl-tog').catch(()=>{});await p.clock.runFor(400);
 await p.evaluate(()=>window.__T().viewClient(window.__S.clients.find(c=>c.id==='c1')));await p.clock.runFor(700);
 ok(await p.isVisible('#cv-nbr'),'Sue\'s job has 🏘 Neighbours');
 await p.click('#cv-nbr');await p.clock.runFor(500);
 await p.fill('#nbr-works','Single-storey rear extension, with a steel beam into the shared wall');
 await p.fill('#nbr-start','2026-12-14');
 await p.click('#nbr-add');await p.clock.runFor(300);
 await p.fill('.nbr-name','Mr and Mrs Lee');await p.fill('.nbr-addr','6 Rolle Road, Exmouth');
 const lastPdf=()=>p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];if(!d)return '';const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return d.filename+'\n'+s});
 await p.click('.nbr-lpdf');await p.clock.runFor(300);
 ok(/Dear Mr and Mrs Lee/.test(await p.inputValue('#nbr-ltx'))&&/14 Dec/.test(await p.inputValue('#nbr-ltx')),'✉️ Letter: the words to check first, to them by name, with the start date');
 await p.click('#nbr-lgo');await p.clock.runFor(3000);await p.waitForTimeout(500);
 let pdf=await lastPdf();
 ok(/^Letter to neighbour 6 Rolle Road Exmouth\.pdf/.test(pdf)&&/Dear Mr and Mrs Lee/.test(pdf),'the letter PDF is made');
 ok(await p.inputValue('.nbr-let')==='2026-11-24','and it\'s marked sent today');
 await p.selectOption('.nbr-pw','s3');await p.clock.runFor(300);
 ok(await p.isVisible('.nbr-npdf'),'party wall: shared wall (s.3) – 📜 Notice');
 await p.click('.nbr-npdf');await p.clock.runFor(3000);await p.waitForTimeout(500);
 pdf=await lastPdf();
 fs.writeFileSync('h689-notice.pdf',Buffer.from(pdf.slice(pdf.indexOf('\n')+1),'latin1'));
 ok(/^Party wall notice s3/.test(pdf)&&/Notice under section 3/.test(pdf)&&/Reply to the notice/.test(pdf)&&/steel beam/.test(pdf)&&/on or after Sunday,? 24 January 2027/.test(pdf)&&/dated Tuesday,? 24 November 2026/.test(pdf),'the notice PDF (start on or after 24 January 2027): section 3, the work, and a reply slip');
 ok(await p.inputValue('.nbr-srv')==='2026-11-24','served today');
 const st=await p.innerText('.nbr-st');
 ok(/Waiting for their answer – by 8 Dec|Waiting for their answer – by .*8/.test(st)&&/24 Jan/.test(st),'they answer by 8 Dec; work can start from 24 Jan 2027 ('+st.replace(/\s+/g,' ')+')');
 ok(/⛔/.test(await p.innerText('.nbr-warn')),'⛔ the job starts 14 Dec – too soon');
 await p.screenshot({path:'h689-sheet.png'});
 await p.click('#f-save');await p.clock.runFor(800);
 const rec=await p.evaluate(()=>window.__st['todos/c1']);
 ok(rec.neighbours.length===1&&rec.neighbours[0].pw==='s3'&&rec.nbStart==='2026-12-14','saved on her record');
 await p.evaluate(()=>{window.__S.otab='today';window.render()});await p.clock.runFor(500);
 ok(await p.isVisible('.nbr-today')&&/24 Jan/.test(await p.innerText('.nbr-today')),'Today: 🏘 Neighbours to sort');
 await p.clock.setFixedTime(new Date('2026-12-10T10:00:00'));await p.evaluate(()=>window.render());await p.waitForTimeout(400);
 ok(/surveyor is needed/.test(await p.innerText('.nbr-today')),'10 Dec, no answer – a surveyor is needed');
 await p.screenshot({path:'h689-today.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h689: ${bad} failed`:'h689: all passed');await b.close();process.exit(bad?1:0);
})();
