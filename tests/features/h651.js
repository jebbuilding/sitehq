// Quick notes, reminders and hire checks (made-up people and places):
// 🗒️ Quick note in + Add: a rough spoken note; ✨ Tidy it up (a pretend Claude) gives a heading, neat notes, a thing to do and spots
// the client (Sue Jones); saving keeps it in My notes, on Sue's notes and the thing to do on My to-do.
// ⏰ Reminders: a planner entry has a reminder (1 hour before by default); it pops up for James, and for a trade on an entry
// he's named on (an MOT); the entry's page shows it and 📲 puts it in the phone calendar with the same alarm.
// 🔧 Hired-in equipment: Sam checks a dumper before use (photos needed, damage already on it noted, hire firm and number);
// on the after-use check the before-use photos are shown to compare; James sees both in Reports.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const HOOK='function render() {';
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2&&page_src.split(DD).length===2,'hooks found once');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace(DD,'function detailsDone(d){return true}').replace(HOOK,'window.render=render;window.__T=()=>({qaOpen,QNOTE,openPlanEditor,openPlanDetail,visitWatch,openCheck});'+HOOK);
function mk(mode,storeDump){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+(storeDump?'Object.assign(store,'+storeDump+');':''));eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake(mode==='owner');}
const soon=(m)=>{const d=new Date(Date.now()+m*60000);const p=n=>String(n).padStart(2,'0');return {date:d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()),time:p(d.getHours())+':'+p(d.getMinutes())};};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:1000}});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());
 const open=async(html)=>{const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+html+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');return p;};
 try{
 /* ---------- 📝 quick note ---------- */
 const p=await open(mk('owner'));
 await p.evaluate(()=>{const u=window.claude.use;window.claude.use=async n=>n==='sample'?{json:async q=>{window.__q=q;return {title:'Sue – kitchen window',note:'• Move the kitchen window 300 mm to the left\n• Lintel to be checked',todo:[{text:'Ring Travis about the lintel',due:'2026-12-01'}],client:'Sue Jones',site:''}}}:u(n)});
 await p.evaluate(()=>window.__T().qaOpen());await p.waitForTimeout(300);
 ok(await p.isVisible('.qa-b[data-k=note]'),'🗒️ Quick note is in + Add');
 await p.click('.qa-b[data-k=note]');await p.waitForTimeout(400);
 ok(await p.isVisible('#qn-text')&&await p.locator('#qn-text + .dictbtn, .dictbtn').count()>0,'a big note box with 🎤 Speak');
 await p.fill('#qn-text','sue jones wants the kitchen window moved 300 to the left need to ring travis about the lintel');
 await p.click('#qn-ai');await p.waitForTimeout(600);
 ok(/300 mm to the left/.test(await p.inputValue('#qn-text'))&&await p.inputValue('#qn-title')==='Sue – kitchen window','✨ Tidy it up: a heading and neat notes');
 ok(await p.inputValue('#qn-c')==='c1','it spots the client (Sue Jones)');
 ok(await p.locator('.qn-td:checked').count()===1,'and a thing to do, ticked to go on My to-do');
 ok(/Keep every fact, number and measurement exactly/.test(await p.evaluate(()=>window.__q)),'Claude is told to keep every fact and number');
 await p.screenshot({path:'h651-note.png',fullPage:true});
 await p.click('#f-save');await p.waitForTimeout(900);
 let st=await p.evaluate(()=>window.__st);
 const qn=Object.values(st).find(v=>v&&v.kind==='qnote');
 ok(qn&&qn.clientId==='c1'&&/kitchen window/.test(qn.title),'kept in 📝 My notes');
 ok((st['todos/c1'].notes||[]).some(n=>/kitchen window/.test(n.text)),'and on Sue\'s notes');
 ok(Object.values(st).some(v=>v&&!v.kind&&v.text==='Ring Travis about the lintel'&&v.due==='2026-12-01'),'and Ring Travis on My to-do, with the date');
 /* ---------- ⏰ reminders ---------- */
 const s1=soon(40);
 await p.evaluate(d=>window.__T().openPlanEditor(null,d),s1.date);await p.waitForTimeout(400);
 ok(await p.inputValue('#pe-remind')==='60','a new planner entry has ⏰ Reminder: 1 hour before');
 await p.fill('#pe-title','Building control visit');await p.fill('#pe-from',s1.date);await p.fill('#pe-to',s1.date);await p.fill('#pe-time',s1.time);await p.uncheck('#pe-notify');
 await p.click('#f-save');await p.waitForTimeout(900);
 st=await p.evaluate(()=>window.__st);
 const pe=Object.entries(st).find(([k,v])=>/^plan\//.test(k)&&v.title==='Building control visit');
 ok(pe&&pe[1].remind===60&&pe[1].time===s1.time,'saved with the reminder');
 await p.evaluate(()=>window.__T().visitWatch());await p.waitForTimeout(300);
 ok(/Building control visit/.test(await p.innerText('.dimask[style*="130"]').catch(()=>''))&&/In about|In \d+ minutes/.test(await p.innerText('.dimask[style*="130"]').catch(()=>'')),'it pops up for James within the hour');
 await p.screenshot({path:'h651-remind.png'});
 await p.click('.vr-x');
 await p.evaluate(id=>{const S=window.__S;window.__T().openPlanDetail(Object.assign({id},window.__st['plan/'+id]))},pe[0].split('/')[1]);await p.waitForTimeout(400);
 ok(/1 hour before/.test(await p.innerText('#viewer-body')),'the entry\'s page shows ⏰ 1 hour before');
 await p.click('#pd-ics');await p.waitForTimeout(500);
 const ics=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];return d?[d.filename,await d.data.text()]:null});
 ok(ics&&/\.ics$/.test(ics[0])&&/TRIGGER:-PT60M/.test(ics[1])&&/Building control visit/.test(ics[1]),'📲 Add to my phone calendar: a calendar file with the alarm an hour before ('+(ics&&ics[0])+')');
 /* the trade, named on an MOT */
 const s2=soon(30);
 const mot='{"plan/mot1":{"from":"'+s2.date+'","to":"'+s2.date+'","time":"'+s2.time+'","title":"Transit – MOT","type":"vehicle","people":["emp1"],"vis":"all","remind":60,"created":1},"plan/other":{"from":"'+s2.date+'","to":"'+s2.date+'","time":"'+s2.time+'","title":"Not his","type":"work","people":["emp2"],"vis":"all","remind":60,"created":1}}';
 const t=await open(mk('trade',mot));
 await t.evaluate(()=>window.__T().visitWatch());await t.waitForTimeout(300);
 const pop=await t.innerText('.dimask[style*="130"]').catch(()=>'');
 ok(/Transit – MOT/.test(pop),'the trade on the MOT gets the reminder pop-up too');
 await t.click('.vr-x').catch(()=>{});
 await t.evaluate(()=>window.__T().visitWatch());await t.waitForTimeout(300);
 ok(!/Not his/.test(await t.innerText('body')),'but not for an entry he isn\'t on');
 /* ---------- 🔧 hired-in equipment ---------- */
 await t.evaluate(()=>window.__T().openCheck('hire'));await t.waitForTimeout(400);
 ok(await t.isVisible('#hic-stage')&&await t.isVisible('#hic-co')&&await t.isVisible('#hic-video'),'hire check: before/after, hire company, video');
 await t.fill('#c-asset','3 t dumper').catch(async()=>{await t.selectOption('#c-asset',{label:'Other…'}).catch(()=>{})});
 await t.fill('#hic-co','Exe Hire');await t.fill('#hic-ref','H-5521');
 await t.click('#c-allok');await t.click('#hic-pre button[data-v=yes]');
 await t.locator('#c-sig').scrollIntoViewIfNeeded();await t.waitForTimeout(100);{const bb=await t.locator('#c-sig').boundingBox();await t.mouse.move(bb.x+20,bb.y+20);await t.mouse.down();await t.mouse.move(bb.x+120,bb.y+60);await t.mouse.up();}
 await t.click('#f-save');await t.waitForTimeout(400);
 ok(/photos all round/i.test(await t.innerText('#f-err')),'it won\'t save without photos');
 await t.setInputFiles('#c-photos','fixtures/test.jpg');
 await t.click('#f-save');await t.waitForTimeout(400);
 ok(/already on it/i.test(await t.innerText('#f-err')),'"came with damage" needs saying what');
 await t.fill('#c-notes','Scrape on the left side of the skip, dent in the bonnet');
 await t.setInputFiles('#hic-video',{name:'walk.mp4',mimeType:'video/mp4',buffer:Buffer.from('not really a video')});await t.waitForTimeout(200);
 ok(/Video ready/.test(await t.innerText('#hic-vname')),'🎥 a video is ready to go with it');
 await t.locator('#hic-pre').scrollIntoViewIfNeeded();await t.screenshot({path:'h651-hire.png'});
 await t.click('#f-save');await t.waitForTimeout(2500);
 let st3=await t.evaluate(()=>window.__st);
 const hb=Object.entries(st3).find(([k,v])=>/^sheets\/emp1\/checks\//.test(k)&&v.kind==='hire');
 ok(hb&&hb[1].stage==='before'&&hb[1].hireCo==='Exe Hire'&&hb[1].hireRef==='H-5521'&&hb[1].preDamage==='yes'&&(hb[1].photos||[]).length===1&&!!hb[1].video,'before-use check saved: Exe Hire, H-5521, came damaged, 1 photo and the video');
 await t.evaluate(()=>window.__T().openCheck('hire'));await t.waitForTimeout(400);
 await t.fill('#c-asset','3 t dumper').catch(()=>{});
 await t.click('#hic-stage button[data-v=after]');await t.waitForTimeout(300);
 ok(/Before use/.test(await t.innerText('#hic-cmp'))&&await t.locator('#hic-cmp img').count()===1,'after use: the before-use photo is shown to compare');
 ok(await t.inputValue('#hic-co')==='Exe Hire','the hire firm is filled in from before');
 await t.screenshot({path:'h651-after.png',fullPage:true});
 await t.click('#f-cancel');
 /* James's Reports */
 const r=await open(mk('owner',JSON.stringify(st3)));
 await r.evaluate(()=>{const S=window.__S;S.otab='checks';S.f.rcat='';window.render()});await r.waitForTimeout(400);
 ok(/Hired-in equipment checks/.test(await r.innerText('#main')),'Reports has Hired-in equipment checks');
 await r.click('.rcat[data-r=hire]');await r.waitForTimeout(400);
 const m=await r.innerText('#main');
 ok(/3 t dumper/.test(m)&&/Before use/.test(m)&&/Came damaged/.test(m)&&/Exe Hire/.test(m),'James sees the check: before use, came damaged, Exe Hire');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h651: ${bad} failed`:'h651: all passed');await b.close();process.exit(bad?1:0);
})();
