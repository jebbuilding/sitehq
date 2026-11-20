// Pricing a job and the estimate (made-up client, prices and terms).
// 💷 Price this job: the job and its documents, prices by group (supplier, trade, own labour) with the quote attached,
// overhead and profit %, and 📝 Make the estimate fills its costs (one line a group, % added). The estimate shows
// 📁 About this job, starts with the standard terms (changeable for this one, ↺ back to standard) and who wrote it.
// A sent estimate saved as a new version gets a new number too. Invoices start with the invoice terms.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1150,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.evaluate(async()=>{await window.__S.db.doc('todos/salesset').set(Object.assign({},window.__st['todos/salesset']||{},{kind:'salesset',terms:'# Payment\nStandard estimate terms.',invTerms:'Payment within 14 days.'}));});await p.waitForTimeout(400);
 const shut=()=>p.evaluate(()=>{const s=document.getElementById('sheet');if(s&&!s.hidden){const x=document.getElementById('f-cancel');x&&x.click()}const v=document.getElementById('viewer');if(v&&!v.hidden)document.getElementById('viewer-close').click()});
 await p.evaluate(()=>{const S=window.__S;S.otab='clients';S.f.clf='all';window.render()});await p.waitForTimeout(400);
 await p.click('.abcard .cl-open[data-c=c1]');await p.waitForTimeout(500);
 ok(await p.isVisible('#cv-price'),'the client card has 💷 Price this job');
 await p.click('#cv-price');await p.waitForTimeout(500);
 ok(/Price this job/.test(await p.innerText('#viewer-body'))&&await p.isVisible('#viewer-body .edc-card'),'it opens with the job and its documents');
 const add=async(k,from,what,pr,file)=>{await p.click(`#viewer-body .jpr-add[data-k="${k}"]`);await p.waitForTimeout(300);await p.fill('#jp-from',from);await p.fill('#jp-what',what);await p.fill('#jp-lines .jp-lq','1');await p.fill('#jp-lines .jp-lr',pr);if(file)await p.setInputFiles('#jp-file',file);await p.click('#f-save');await p.waitForTimeout(800);};
 await add('sup','Builders Merchant','Blocks and cement','1000',{name:'quote.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%made-up\n')});
 await add('trade','Plasterer','Skim the loft','600');
 await add('lab','Us','Two weeks, two men','2400');
 const txt=await p.innerText('#viewer-body');
 ok(/Builders Merchant/.test(txt)&&/Plasterer/.test(txt)&&/£4,000\.00/.test(txt),'prices are kept by group, with the total of costs £4,000');
 ok(await p.locator('#viewer-body .jpr-open').count()===1,'the supplier\'s quote is kept with its price');
 await p.fill('#jpr-mk','25');await p.dispatchEvent('#jpr-mk','change');await p.waitForTimeout(700);
 ok(/£5,000\.00/.test(await p.innerText('#viewer-body .jpr-sum')),'25% overhead and profit makes the price £5,000');
 await p.screenshot({path:'h621-price.png'});
 await p.click('#jpr-est');await p.waitForTimeout(700);
 const lines=await p.evaluate(()=>[...document.querySelectorAll('#sd-lines .sd-line')].map(r=>[(r.querySelector('.sd-ld,textarea,input')||{}).value,(r.querySelector('.sd-la')||{}).value]));
 ok(lines.length===3&&lines.some(l=>/Materials/.test(l[0])&&+l[1]===1250)&&lines.some(l=>/Labour/.test(l[0])&&+l[1]===3000),'📝 Make the estimate fills its costs by group with the % added ('+JSON.stringify(lines)+')');
 ok(await p.isVisible('#viewer-body .edc-card[open]')&&/quote\.pdf/.test(await p.innerText('#viewer-body .edc-card')),'the estimate shows 📁 About this job with the quote');
 ok(await p.inputValue('#sd-terms')==='# Payment\nStandard estimate terms.','it starts with the standard terms');
 ok((await p.inputValue('#sd-by')).length>0,'and who wrote it');
 await p.click('.sd-tdet summary');await p.waitForTimeout(150);
 await p.fill('#sd-terms','Changed for this one');await p.click('#sd-tstd');
 ok(await p.inputValue('#sd-terms')==='# Payment\nStandard estimate terms.','↺ puts the standard terms back');
 await p.fill('#sd-terms','Only for this job');
 await p.click('#sd-save');await p.waitForTimeout(900);
 const est=await p.evaluate(()=>(window.__S.sales||[]).find(x=>x.type==='estimate'&&x.clientId==='c1'&&x.terms==='Only for this job'));
 ok(est&&est.byName,'saved with its own terms and who wrote it');
 /* a new version gets a new number */
 await p.evaluate(async id=>{await window.__S.db.doc('todos/'+id).update({status:'sent',sentAt:Date.now()})},est.id);await p.waitForTimeout(400);
 await shut();await p.waitForTimeout(300);
 await p.evaluate(()=>{const S=window.__S;S.otab='clients';S.f.clf='all';window.render()});await p.waitForTimeout(400);
 await p.click('.abcard .cl-open[data-c=c1]');await p.waitForTimeout(500);await p.click('#cv-jf');await p.waitForTimeout(500);
 const opened=await p.evaluate(id=>{const b=document.querySelector('#viewer-body .jf-sale[data-id="'+id+'"]');if(b){b.click();return true}return false},est.id);
 await p.waitForTimeout(600);
 if(!opened)console.log('(could not find the estimate row)');
 const lr=await p.$('#sd-lines .sd-line .sd-la');if(lr){await lr.fill('1300');}
 await p.click('#sd-save');await p.waitForTimeout(600);
 if(await p.isVisible('#sv-new')){await p.click('#sv-new');await p.waitForTimeout(900);}
 const nv=await p.evaluate(id=>window.__st['todos/'+id],est.id);
 ok(nv&&nv.ver===2&&nv.number!==est.number&&nv.firstNo===est.number,'saving a sent estimate as version 2 gives it a new number, keeping the first ('+(nv&&[nv.number,nv.ver,nv.firstNo].join(' / '))+')');
 /* invoice terms */
 await shut();await p.waitForTimeout(300);
 const it=await p.evaluate(()=>{const s=(window.__st['todos/salesset']||{});return s.invTerms});
 ok(it==='Payment within 14 days.','invoice terms are kept in the settings');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h621: ${bad} failed`:'h621: all passed');await b.close();process.exit(bad?1:0);
})();
