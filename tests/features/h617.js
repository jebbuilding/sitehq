// Your own forms (made-up form and answers). Setup › 📝 Your forms: start from an example, add a question, move it,
// save. A trade sees it on 📋 Forms, fills it in (job, text, tick, choice, signature) and sends it; must-answer
// questions are checked. James sees it on Forms and on the job's page, opens it, and makes the PDF. Writes h617*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes(DD)&&page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
const JSPDF=fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1150,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:JSPDF});r.abort()});
 /* James makes a form */
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(300);
 await p.evaluate(()=>{const S=window.__S;S.otab='setup';S.f.stab='forms';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('#st-tabs button[data-v="forms"][aria-pressed="true"]')&&await p.isVisible('#cfb-new'),'Setup has 📝 Your forms, with + New form');
 await p.click('#main .cfb-sample[data-k="handover"]');await p.waitForTimeout(400);
 ok(await p.locator('#viewer-body .cfb-q').count()===8,'starting from the handover example fills in 8 questions');
 await p.click('#viewer-body .cfb-a[data-t="text"]');await p.waitForTimeout(200);
 await p.fill('#viewer-body .cfb-q:last-child .cfb-l','Keys handed to');
 await p.click('#viewer-body .cfb-q:last-child .cfb-up');await p.waitForTimeout(200);
 const order=await p.evaluate(()=>[...document.querySelectorAll('#viewer-body .cfb-l')].map(i=>i.value));
 ok(order[7]==='Keys handed to'&&order[8]==='Client signature','a new question is added and moved up one');
 await p.click('#viewer-body .cfb-q:nth-child(6) .cfb-x');await p.waitForTimeout(200);
 ok(await p.locator('#viewer-body .cfb-q').count()===8,'✕ takes a question out');
 await p.screenshot({path:'h617-builder.png'});
 await p.click('#cfb-save');await p.waitForTimeout(600);
 const tpl=await p.evaluate(()=>window.__st['settings/cforms']);
 ok(tpl&&tpl.forms.length===1&&tpl.forms[0].name==='Job handover'&&tpl.forms[0].fields.length===8&&tpl.forms[0].who.trade,'saved for everyone to use');
 /* a trade fills it in */
 const t=await ctx.newPage();t.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await t.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src.replace(DD,'function detailsDone(d){return true}')+'</body></html>');await t.waitForTimeout(2500);await t.keyboard.press('Escape');
 await t.evaluate(async tpl=>{await window.__S.db.doc('settings/cforms').set(tpl)},tpl);await t.waitForTimeout(400);
 await t.evaluate(()=>{const S=window.__S;S.tab='jobs';window.render()});await t.waitForTimeout(500);
 ok(await t.isVisible('#main .cfm-go'),'the trade sees it on 📋 Forms');
 await t.click('#main .cfm-go');await t.waitForTimeout(500);
 const F=tpl.forms[0].fields;const fid=l=>F.find(x=>x.label===l).id;
 const site=await t.evaluate(()=>{const s=document.getElementById('cq-site');const o=[...s.options].find(o=>o.value&&o.value!=='__other');return o?o.value:''});
 await t.selectOption('#cq-site',site);
 await t.fill('#cq-'+fid('Work completed'),'New kitchen fitted');
 await t.click('#f-save');await t.waitForTimeout(400);
 ok(/Answer/.test(await t.innerText('#sheet')),'must-answer questions are checked');
 await t.check('#cq-'+fid('Site left clean and tidy'));
 await t.click(`#cq-${fid('Client happy?')} button[data-v="Yes"]`);
 await t.fill('#cq-'+fid('Keys handed to'),'Mrs Example');
 const cv=await (await t.$('#cq-'+fid('Client signature'))).boundingBox();
 await t.mouse.move(cv.x+30,cv.y+80);await t.mouse.down();for(let i=1;i<12;i++)await t.mouse.move(cv.x+30+i*20,cv.y+80+(i%2?20:-20));await t.mouse.up();
 await t.screenshot({path:'h617-fill.png'});
 await t.click('#f-save');await t.waitForTimeout(1200);
 const me=await t.evaluate(()=>window.__S.me);
 const rec=await t.evaluate(me=>{const e=Object.entries(window.__st).find(([k,v])=>k.startsWith('sheets/'+me+'/signoffs/cf-'));return e?e[1]:null},me);
 ok(rec&&rec.type==='cform'&&rec.site===site&&rec.ans[fid('Work completed')]==='New kitchen fitted'&&rec.ans[fid('Client happy?')]==='Yes'&&/^data:image\/png/.test(rec.ans[fid('Client signature')]),'it is sent with the job, the answers and the signature');
 /* James sees it */
 await p.evaluate(async([rec])=>{await window.__S.db.doc('sheets/emp1/signoffs/cf-test1').set(rec)},[rec]);await p.waitForTimeout(500);
 await p.evaluate(()=>{const S=window.__S;S.otab='jobs';window.render()});await p.waitForTimeout(500);
 ok(await p.locator('#main .cfm-row').count()>=1,'James sees it on his Forms tab');
 await p.evaluate(s=>{const S=window.__S;S.otab='projects';S.f.proj=s;S.f.projList=false;S.f.pjSite=s;S.f.pjtab='overview';window.render()},site);await p.waitForTimeout(500);
 ok(await p.locator('#main .cfm-site .cfm-row').count()===1,'and on the job\'s page');
 await p.click('#main .cfm-site .cfm-row');await p.waitForTimeout(500);
 const v=await p.innerText('#viewer-body');
 ok(/Job handover/.test(v)&&/New kitchen fitted/.test(v)&&/Mrs Example/.test(v)&&await p.locator('#viewer-body .cfm-sigimg').count()===1,'opening it shows the answers and the signature');
 await p.screenshot({path:'h617-view.png'});
 await p.evaluate(()=>{window.__saved=null;const o=window.__S.dl.save;window.__S.dl.save=async x=>{window.__saved=x.filename;return o?o(x):null}});
 await p.click('#cfm-pdf');await p.waitForTimeout(2500);
 ok(/Job handover/.test(await p.evaluate(()=>window.__saved||'')),'📄 PDF makes the form as a PDF');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h617: ${bad} failed`:'h617: all passed');await b.close();process.exit(bad?1:0);
})();
