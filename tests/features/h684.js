// Handover pack (made-up client Sue Jones): 📦 Handover pack on her page; the building control certificate added (a
// file), the party wall award not needed, the colours written in, a 10-year guarantee; the PDF lists what's in it and what's
// to come with the guarantee; 📤 Put it in their portal puts the PDF and the certificate in Certificates & warranties.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({viewClient});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(400);
 await p.evaluate(()=>window.__T().viewClient(window.__S.clients.find(c=>c.id==='c1')));await p.waitForTimeout(700);
 ok(await p.isVisible('#cv-hov'),'Sue\'s page has 📦 Handover pack');
 await p.click('#cv-hov');await p.waitForTimeout(600);
 const rows=await p.$$eval('.hov-it b',x=>x.map(e=>e.textContent));
 ok(rows.some(t=>/Building control/.test(t))&&rows.some(t=>/FENSA/.test(t))&&rows.some(t=>/Electrical installation/.test(t))&&rows.some(t=>/Product manuals/.test(t)),'it lists what a finished job needs ('+rows.length+' things)');
 const bc=p.locator('.hov-it[data-k=bc]');
 await bc.locator('.hov-in').setInputFiles({name:'Completion certificate.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%made up\n')});await p.waitForTimeout(1200);
 ok(/Completion certificate\.pdf/.test(await p.locator('.hov-it[data-k=bc]').innerText())&&await p.locator('.hov-it[data-k=bc] [data-v=have][aria-pressed=true]').count()===1,'adding the file marks it ✓ Got it');
 await p.locator('.hov-it[data-k=pw] [data-v=na]').click();await p.waitForTimeout(300);
 await p.locator('.hov-it[data-k=colours] .hov-note').fill('Walls: white matt. Front door: RAL 7016 anthracite.');
 await p.locator('.hov-it[data-k=colours] [data-v=have]').click();await p.waitForTimeout(300);
 ok(/2 got · 1 not needed/.test(await p.innerText('#sheet')),'it counts 2 got, 1 not needed');
 await p.screenshot({path:'h684-pack.png'});
 await p.click('#hov-pdf');await p.waitForTimeout(3500);
 const pdf=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];if(!d)return '';const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return d.filename+'\n'+s});
 fs.writeFileSync('h684-pack.pdf',Buffer.from(pdf.slice(pdf.indexOf('\n')+1),'latin1'));
 ok(/^Handover pack Sue Jones\.pdf/.test(pdf)&&/Building control completion certificate - Completion certificate\.pdf/.test(pdf)&&/still to come/.test(pdf)&&!/Party wall/.test(pdf)&&/RAL 7016/.test(pdf)&&/for 10 years/.test(pdf),'the PDF: what\'s in it, what\'s to come (not the party wall), the colours and the 10-year guarantee');
 await p.click('#pdfbar-x').catch(()=>{});
 await p.click('#hov-send');await p.waitForTimeout(3500);
 const docs=await p.evaluate(()=>{const c=window.__st['todos/c1'];return (c.ptDocs||[]).map(d=>[d.title,d.folder])});
 ok(docs.some(([t,f])=>t==='Handover pack'&&f==='certs')&&docs.some(([t,f])=>/Building control completion certificate/.test(t)&&f==='certs'),'📤 the pack and the certificate are in her portal under Certificates & warranties');
 const rec=await p.evaluate(()=>window.__st['todos/ho-c1']);
 ok(rec&&rec.sentAt&&rec.items.bc.st==='have'&&rec.items.pw.st==='na'&&/RAL 7016/.test(rec.items.colours.note),'and it\'s kept for the job');
 /* aftercare on the planner */
 const pl=Object.values(await p.evaluate(()=>window.__st)).filter(v=>v&&v.clientId==='c1'&&/check-in|Guarantee ends/.test(v.title||''));
 const done=rec.done;const add=(m)=>{const d=new Date(done+'T12:00:00');d.setMonth(d.getMonth()+m);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 ok(pl.length===3&&pl.some(x=>/6-month check-in: Sue Jones/.test(x.title)&&x.from===add(6))&&pl.some(x=>/12-month check-in/.test(x.title)&&x.from===add(12))&&pl.some(x=>/Guarantee ends/.test(x.title)&&x.from===add(120)),'aftercare on the planner: 6-month and 12-month check-ins and the day the 10-year guarantee ends');
 await p.click('#f-cancel').catch(()=>{});await p.waitForTimeout(300);await p.evaluate(()=>window.__T().viewClient(window.__S.clients.find(c=>c.id==='c1')));await p.waitForTimeout(600);await p.click('#cv-hov');await p.waitForTimeout(500);
 await p.fill('#hov-done','2026-12-01');await p.click('#f-save');await p.waitForTimeout(1500);
 const pl2=Object.values(await p.evaluate(()=>window.__st)).filter(v=>v&&v.clientId==='c1'&&/check-in|Guarantee ends/.test(v.title||''));
 ok(pl2.length===3&&pl2.some(x=>/6-month/.test(x.title)&&x.from==='2027-06-01'),'changing the finish date moves them (still 3)');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h684: ${bad} failed`:'h684: all passed');await b.close();process.exit(bad?1:0);
})();
