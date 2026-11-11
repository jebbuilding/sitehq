// The trades' app in the new look (made-up worker Sam Test): no wall of buttons at the top; it opens on Today –
// a greeting, where he's booked, what's waiting for him (his overdue snag list) and big buttons for what he does most –
// with Today, Time, Forms, Photos and More along the bottom of a phone (down the side on an iPad). More has the rest
// in groups. Pictures for James: phone Today, More and Forms, and iPad Today.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(DD).length===2,'details hook found');
const html='<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+fake(false)+page_src.replace(DD,'function detailsDone(d){return true}')+'</body></html>';
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
async function open(b,vp){const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.tradelook','true');localStorage.setItem('jeb.instLater','true')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await p.goto('https://sitehq.test/');await p.waitForTimeout(2200);await p.keyboard.press('Escape');await p.waitForTimeout(300);return p;}
(async()=>{const b=await chromium.launch();
 try{
 const p=await open(b,{width:390,height:844});
 ok(await p.evaluate(()=>getComputedStyle(document.getElementById('tabs')).display==='none'),'no wall of buttons at the top');
 const bar=await p.evaluate(()=>[...document.querySelectorAll('#tlbar .tl-b')].map(x=>x.textContent.replace(/\d+/g,'').trim()));
 ok(JSON.stringify(bar)==='["🏠Today","🗓️Planner","🏗️Sites","📷Photos","☰More"]','along the bottom: Today, Planner, Sites, Photos, More – no Time ('+bar.join(' ')+')');
 const bb=await p.evaluate(()=>{const r=document.getElementById('tlbar').getBoundingClientRect();return [r.bottom,innerHeight]});
 ok(Math.abs(bb[0]-bb[1])<2,'the bar sits at the bottom of the phone');
 const m=await p.innerText('#main');
 ok(await p.evaluate(()=>window.__S.tab==='home')&&/Sam/.test(m)&&/Your dates/.test(m)&&!/My hours|timesheet/i.test(m),'it opens on Today with a hello and his dates – nothing about timesheets');
 ok(/Waiting for you/.test(m)&&/1 form, job or to-do to do/.test(m)&&/1 thing to read/.test(m),'what\'s waiting for him (his snag list)');
 ok(/Take a photo/.test(m)&&/Forms/.test(m),'big buttons for what he does most');
 ok(await p.locator('.nl-tile[data-t=checks],.nl-tile[data-t=__scan]').count()===0,'with no stickers on the vans yet, there\'s no Do a check button (Reports is out of the trades\' app)');
 /* booked tomorrow at 4 Rolle Road, the van has its sticker, and Sam is made a foreman */
 await p.evaluate(async()=>{const d=new Date();d.setDate(d.getDate()+1);const t=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  await window.__S.db.doc('plan/h500').set({from:t,to:t,type:'work',title:'Second fix',site:'4 Rolle Road, Exmouth',people:['emp1'],vis:'people'});
  await window.__S.db.doc('equipment/e1').update({tag:'V-001'});await window.__S.db.doc('sheets/emp1').update({foreman:true});});
 await p.waitForTimeout(500);await p.evaluate(()=>{window.__S.tab='home';window.render()});await p.waitForTimeout(300);
 const m2=await p.innerText('#main');
 ok(/Tomorrow\n4 Rolle Road, Exmouth\nSecond fix/.test(m2),'his dates from the planner: tomorrow at 4 Rolle Road, second fix');
 ok(await p.locator('.nl-tile[data-t=__scan]').count()===1&&/Opens the camera/.test(m2),'with a sticker on the van, Do a check goes straight to the camera');
 ok(await p.locator('.nl-tile[data-t=foreman]').count()===1,'a foreman gets his Foreman page on Today');
 await p.screenshot({path:OUT+'trade-new-1-today.png'});
 await p.click('#tlbar .tl-b[data-t=more]');await p.waitForTimeout(400);
 const mm=await p.innerText('#main');
 ok(/Policies/.test(mm)&&/My details/.test(mm)&&/Forms/.test(mm)&&/Training/.test(mm)&&!/Photos|Day work|My reports/.test(mm),'More has the rest (Forms, Training and the others) – without Day work or Reports');
 await p.screenshot({path:OUT+'trade-new-2-more.png'});
 await p.click('.tl-go[data-t=policies]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>window.__S.tab==='policies')&&await p.isVisible('#tlbar .tl-b[data-t=more][aria-current]'),'Policies opens from More, with More still lit');
 await p.click('#tlbar .tl-b[data-t=more]');await p.waitForTimeout(300);await p.click('.tl-go[data-t=jobs]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>window.__S.tab==='jobs')&&/Final snags/.test(await p.innerText('#main')),'Forms shows his jobs and snags');
 await p.screenshot({path:OUT+'trade-new-3-forms.png'});
 await p.click('#tlbar .tl-b[data-t=home]');await p.waitForTimeout(300);await p.click('.nl-tile.tl-go[data-t=__scan]');await p.waitForTimeout(800);
 ok(/Point at the sticker|Couldn.t open the camera|Type the number/.test(await p.innerText('body')),'the Do a check button opens the sticker scanner');
 await p.evaluate(()=>{const s=document.querySelector('.kit-stop');if(s)s.click()});
 /* timesheets are out of reach: a stored Time tab goes back to Today */
 await p.evaluate(()=>{window.__S.tab='time';window.render()});await p.waitForTimeout(300);
 ok(await p.evaluate(()=>window.__S.tab==='home'),'Time can\'t be opened – it goes back to Today');
 const q=await open(b,{width:1180,height:820});
 const side=await q.evaluate(()=>{const r=document.getElementById('tlbar').getBoundingClientRect();return r.left===0&&r.height>700&&r.width<300});
 ok(side,'on an iPad the buttons run down the side');
 await q.screenshot({path:OUT+'trade-new-4-ipad.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h500: ${bad} failed`:'h500: all passed');await b.close();process.exit(bad?1:0);
})();
