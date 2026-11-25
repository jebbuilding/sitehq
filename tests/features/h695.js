// Scaffold inspections (made-up scaffold "Rear elevation scaffold"): in Setup the button says Checks (not Driver &
// checks), it asks who inspects it and how often it must be inspected, and lists what's checked as tick boxes – one
// unticked. Forms has ✅ Checks & inspections with Scaffold inspection; the form for this scaffold leaves out the
// unticked question, and won't submit until it's signed; the saved inspection has the signature and the name, shown
// when James opens it. The scaffold's Details have no reading, cost or garage. A van still says Driver & checks.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+'store["equipment/sc1"]={kind:"scaffold",name:"Rear elevation scaffold"};');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({checkDetail,closeViewer});function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog').catch(()=>{});await p.waitForTimeout(300);
 const setup=async()=>{await p.evaluate(()=>{const S=window.__S;S.otab='setup';S.f.stab='';window.render()});await p.waitForTimeout(400);await p.evaluate(()=>document.querySelectorAll('details.card').forEach(d=>d.open=true));await p.waitForTimeout(200);};
 await setup();
 ok(await p.innerText('.editsched[data-id=sc1]')==='Checks','Setup: the scaffold\'s button says Checks');
 ok(/Driver & checks/.test(await p.innerText('.editsched[data-id=e1]')),'a van still says Driver & checks');
 await p.click('.editsched[data-id=sc1]');await p.waitForTimeout(400);
 const sh=await p.innerText('#sheet');
 ok(/Who inspects it\?/.test(sh)&&/How often must it be inspected\?/.test(sh)&&!/drive|driver/i.test(sh),'it asks who inspects it and how often – nothing about driving');
 const n=await p.locator('.es-it').count();
 ok(n>=10&&/What's checked/.test(sh),'✅ What\'s checked lists the '+n+' questions as tick boxes');
 await p.uncheck('.es-it[data-k=brick]');
 await p.click('#es-freq [data-v=weekly]');await p.selectOption('#es-who','emp1');
 await p.screenshot({path:'h695-setup.png'});
 await p.click('#f-save');await p.waitForTimeout(700);
 ok(JSON.stringify(await p.evaluate(()=>window.__st['equipment/sc1'].off))==='["brick"]','unticking brick guards is kept on this scaffold');
 await p.click('.eqdates[data-id=sc1]');await p.waitForTimeout(400);
 const det=await p.innerText('#sheet');
 ok(/Inspections, changes & repairs/.test(det)&&!/Hours \/ reading|Cost £|Garage|MOT/.test(det)&&/Who did it/.test(det)&&!(await p.isVisible('#el-miles'))&&!(await p.isVisible('#el-cost')),'Details: no reading, cost, garage or MOT – just inspections and who did it');
 await p.fill('#el-what','Handover inspection by the scaffolder');await p.fill('#el-by','Exe Scaffolding');await p.click('#el-add');await p.waitForTimeout(300);
 ok(/Handover inspection/.test(await p.innerText('#el-list')),'adding to the history still works');
 await p.click('#f-cancel');await p.waitForTimeout(300);
 /* Forms */
 await p.evaluate(()=>{window.__S.otab='jobs';window.render()});await p.waitForTimeout(500);
 const btns=await p.$$eval('.ckf-go',x=>x.map(e=>e.textContent));
 ok(btns.includes('Scaffold inspection')&&btns.includes('Vehicle check'),'Forms: ✅ Checks & inspections – '+btns.join(', '));
 await p.click('.ckf-go[data-k=scaffold]');await p.waitForTimeout(400);
 const asset=await p.evaluate(()=>{const el=document.getElementById('c-asset');return el.tagName});
 if(asset==='SELECT')await p.selectOption('#c-asset','Rear elevation scaffold');else await p.fill('#c-asset','Rear elevation scaffold');
 await p.dispatchEvent('#c-asset','change');await p.waitForTimeout(300);
 const ks=await p.$$eval('#c-items .seg',x=>x.map(e=>e.dataset.k));
 ok(!ks.includes('brick')&&ks.includes('guards'),'the form for this scaffold leaves out brick guards');
 await p.click('#c-allok');
 await p.click('#f-save');await p.waitForTimeout(400);
 ok(/Sign it with your finger/.test(await p.innerText('#f-err')),'it won\'t submit until it\'s signed');
 ok(await p.inputValue('#c-signame')!=='','Checked by is filled in with their name');
 await p.locator('#c-sig').scrollIntoViewIfNeeded();await p.waitForTimeout(100);
 {const bb=await p.locator('#c-sig').boundingBox();await p.mouse.move(bb.x+20,bb.y+20);await p.mouse.down();await p.mouse.move(bb.x+120,bb.y+60);await p.mouse.move(bb.x+200,bb.y+30);await p.mouse.up();}
 await p.screenshot({path:'h695-form.png'});
 await p.click('#f-save');await p.waitForTimeout(1500);
 const chk=Object.values(await p.evaluate(()=>window.__st)).find(v=>v&&v.kind==='scaffold'&&v.asset==='Rear elevation scaffold');
 ok(chk&&/^data:image\/png/.test(chk.sig)&&chk.sigName&&chk.sigAt&&!('brick' in chk.items)&&chk.items.guards==='ok','saved with the signature and name, without the unticked question');
 await p.evaluate((c)=>window.__T().checkDetail(Object.assign({who:window.__S.me},c)),chk);await p.waitForTimeout(400);
 ok(/Signed by/.test(await p.innerText('#viewer'))&&await p.locator('#viewer img.ck-sigimg').count()===1,'opening it shows ✍️ Signed by, with the signature');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h695: ${bad} failed`:'h695: all passed');await b.close();process.exit(bad?1:0);
})();
