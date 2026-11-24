// Door & window survey progress (made-up client Sue Jones): 📋 Progress with a step for each (sent, followed up,
// changes asked, accepted, rejected, ordered, fitted, completed) and a follow up date; the PDF says the drawings are
// from the outside and the arrows show which way they open; ✍ Send to client puts the PDF in a sign-off sheet; her
// 'ask for changes' with what she wants is written on the survey, and her signature marks it accepted.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({DWS,ptOf});function render() {').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 const sue=()=>p.evaluate(()=>window.__S.clients.find(c=>c.id==='c1'));
 await p.evaluate(async()=>window.__T().DWS.open(null,{client:window.__S.clients.find(c=>c.id==='c1')}));await p.waitForTimeout(1500);
 ok(await p.isVisible('#wsx-track'),'the survey has 📋 Progress');
 const steps=await p.$$eval('.wst-st',x=>x.map(b=>b.textContent));
 ok(['Sent to client','Followed up','Changes asked','Accepted','Rejected','Ordered','Fitted','Completed'].every(s=>steps.some(t=>t.includes(s))),'with a step for each: '+steps.join(' / '));
 ok(await p.isVisible('#wst-fol'),'and a follow up date');
 /* the PDF: how to read the drawings */
 await p.click('#wsx-pdf');await p.waitForTimeout(600);
 await p.click('[data-m=order]');await p.waitForTimeout(5000);
 const pdf=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];if(!d)return '';const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return s});
 fs.writeFileSync('h673-survey.pdf',Buffer.from(pdf,'latin1'));
 ok(/viewed from the outside looking in/.test(pdf)&&/arrows show the direction each window or door opens/.test(pdf),'the PDF says the drawings are from the outside and the arrows show which way they open');
 await p.click('#pdfbar-x').catch(()=>{});await p.waitForTimeout(300);
 /* a step by hand */
 await p.click('.wst-st[data-k=follow]');await p.waitForTimeout(300);
 await p.fill('#wst-nt','Rang Sue – looking at it this weekend');await p.click('.dimbox button[type=submit]');await p.waitForTimeout(800);
 const rec=()=>p.evaluate(()=>(window.__S.winSurveys||[]).find(r=>r.clientId==='c1'));
 let r=await rec();
 ok(r&&(r.track||[]).some(x=>x.k==='follow'&&/weekend/.test(x.note)),'📞 Followed up is noted with the note');
 ok(/Followed up/.test(await p.innerText('#wsx-track')),'and listed in Progress');
 /* send to approve */
 await p.evaluate(()=>{const r=(window.__S.winSurveys||[]).find(x=>x.clientId==='c1');if(r&&r.lastPdf)window.__blobs[r.lastPdf.assetId]=window.__last;});
 await p.click('#wst-ask');await p.waitForTimeout(3000);
 ok(await p.isVisible('#pa-title')&&/can be ordered/.test(await p.inputValue('#pa-stmt')),'✍ Send to client opens a sign-off sheet for Sue, with the survey PDF');
 await p.click('#f-save');await p.waitForTimeout(2500);
 r=await rec();
 ok(r.signReq&&r.signReq.id&&(r.track||[]).some(x=>x.k==='sent')&&r.followOn,'sent: noted as 📤 Sent to client, with a follow up date ('+r.followOn+')');
 /* Sue asks for changes in her portal */
 const ok1=await p.evaluate(async([id,st,com])=>{const S=window.__S;const c=S.clients.find(x=>x.id==='c1');const pt=window.__T().ptOf(c);const d={status:st,comment:com,signedName:'Sue Jones',signedAt:Date.now()};if(pt){await S.db.doc('portal/'+pt.id+'/signs/'+id).update(d);return 'portal'}const L=(c.ptSigns||[]).map(x=>x.id===id?Object.assign({},x,d):x);await S.db.doc('todos/c1').update({ptSigns:L});return 'client'},[r.signReq.id,'changes','Please make W2 wider and white handles']);
 ok(!!ok1,'(her answer is kept: '+ok1+')');
 await p.click('#wsx-close').catch(()=>{});await p.waitForTimeout(800);
 await p.evaluate(()=>{window.__S.otab='jobs';window.render()});await p.waitForTimeout(2500);
 r=await rec();
 ok((r.track||[]).some(x=>x.k==='changes'&&/W2 wider/.test(x.note)),'her changes are written on the survey: ✏️ Changes asked – "Please make W2 wider…"');
 ok(/Changes asked/.test(await p.innerText('#ws-jl')),'and the survey shows ✏️ Changes asked in the list');
 /* then she signs */
 await p.evaluate(async([id,st,com])=>{const S=window.__S;const c=S.clients.find(x=>x.id==='c1');const pt=window.__T().ptOf(c);const d={status:st,comment:com,signedName:'Sue Jones',signedAt:Date.now()+5};if(pt){await S.db.doc('portal/'+pt.id+'/signs/'+id).update(d);return 'portal'}const L=(c.ptSigns||[]).map(x=>x.id===id?Object.assign({},x,d):x);await S.db.doc('todos/c1').update({ptSigns:L});return 'client'},[r.signReq.id,'signed','']);
 await p.evaluate(()=>window.render());await p.waitForTimeout(2500);
 r=await rec();
 ok((r.track||[]).some(x=>x.k==='accepted')&&r.signReq.done&&!r.followOn,'when she signs: ✅ Accepted, and no more follow up');
 await p.screenshot({path:'h673-list.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h673: ${bad} failed`:'h673: all passed');await b.close();process.exit(bad?1:0);
})();
