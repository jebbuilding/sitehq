// New look: a page inside a section (Clients, under Jobs & clients) keeps a row of the section's other pages and a
// ‹ back to the section. A new client: 📝 Add a notebook page opens the notebook ON TOP of the client form (it used to
// open underneath it), saving the page brings you back to the form with the page added, and a form opened from the
// notebook itself (a cupboard) still goes over the notebook.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const onTop=(sel)=>p.evaluate((s)=>{const el=document.elementFromPoint(innerWidth/2,innerHeight/2);return !!(el&&el.closest(s));},sel);
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(500);
 /* the section row */
 await p.click('.nl-b[data-s=jobs]');await p.waitForTimeout(400);
 ok(!(await p.isVisible('#nl-crumb')),'no extra row on the Jobs & clients page itself');
 await p.evaluate(()=>document.querySelector('#tabs .tab[data-t=clients]').click());await p.waitForTimeout(500);
 ok(await p.isVisible('#nl-crumb'),'Clients shows the row of pages');
 ok(/Jobs & clients/.test(await p.innerText('.nl-cback'))&&(await p.getAttribute('.nl-cp[aria-current]','data-t'))==='clients','‹ Jobs & clients, with Clients picked');
 ok((await p.$$('.nl-cp')).length>=10,'and the section\'s other pages ('+(await p.$$('.nl-cp')).length+')');
 await p.click('.nl-cp[data-t=draw]');await p.waitForTimeout(500);
 ok((await p.getAttribute('.nl-cp[aria-current]','data-t'))==='draw'&&/Drawings/.test(await p.innerText('#h1')),'tapping Drawings in the row opens it');
 await p.click('.nl-cback');await p.waitForTimeout(500);
 ok(!(await p.isVisible('#nl-crumb'))&&/Jobs & clients/.test(await p.innerText('#h1')),'‹ goes back to Jobs & clients');
 await p.click('.nl-b[data-s=today]');await p.waitForTimeout(400);
 ok(!(await p.isVisible('#nl-crumb')),'no row on Today');
 /* the place kept for the Job Pack Estimator: Paperwork › Money, next to Estimates & invoices */
 await p.click('.nl-b[data-s=paper]');await p.waitForTimeout(400);
 ok(!!(await p.$('.nl-go[data-t=estim]'))&&/Estimating/.test(await p.innerText('.nl-go[data-t=estim]')),'Paperwork has 📐 Estimating');
 await p.click('.nl-go[data-t=estim]');await p.waitForTimeout(400);
 ok(/Estimating/.test(await p.innerText('#h1'))&&/hasn't been brought in yet/.test(await p.innerText('#main')),'it says the estimator goes here, not brought in yet');
 ok(/claude\.ai\/artifact\//.test(await p.getAttribute('#main a.btn','href')||''),'with a button to open the estimator where it is now');
 await p.click('.nl-b[data-s=today]');await p.waitForTimeout(400);
 /* the notebook from a new client */
 await p.evaluate(()=>document.querySelector('#tabs .tab[data-t=clients]').click());await p.waitForTimeout(500);
 await p.click('#cl-new');await p.waitForTimeout(500);
 await p.fill('#cf-main .cfm-f','Alex');await p.fill('#cf-main .cfm-l','Testperson');
 await p.click('#cf-sk');await p.waitForTimeout(900);
 ok(await onTop('.np'),'the notebook opens on top of the new client form');
 await p.evaluate(()=>[...document.querySelectorAll('.np button')].find(b=>b.textContent.trim()==='Save').click());await p.waitForTimeout(1200);
 ok(!(await p.$('.np'))&&await p.isVisible('#sheet')&&(await p.inputValue('#cf-main .cfm-f'))==='Alex','saving brings you back to the client form, still filled in');
 ok((await p.$$('#cf-pend .cfp')).length===1,'with the notebook page added');
 await p.click('#f-cancel');await p.waitForTimeout(300);
 /* a form opened from the notebook still goes over it */
 await p.evaluate(()=>document.querySelector('#tabs .tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb]').click());await p.waitForTimeout(400);
 ok(await onTop('.sheet'),'a cupboard form opened from the drawing goes over it');
 await p.click('#f-cancel');await p.waitForTimeout(200);
 await p.screenshot({path:'h445.png'});
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h445: '+bad+' FAILED':'h445: all passed');
 await b.close()})();
