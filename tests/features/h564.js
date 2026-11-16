// Quick edit a week (owner, all made-up): Sam has Monday 8–4 on 4 Rolle Road and Wednesday 8–5. On Timesheets, his card
// has ✎ Quick edit this week – one line per day; change Monday's finish to 17:00, fill Tuesday in, "Fill the empty
// weekdays like the first day" fills Thursday and Friday (not the weekend), take Wednesday out, tick them all approved,
// Save – the week is saved in one go, each changed line marked as edited by the owner, Wednesday gone.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra=`store["sheets/emp1/entries/qw1"]={type:"hours",date:"2026-11-02",job:"4 Rolle Road, Exmouth",start:"08:00",finish:"16:00",breakMin:30,hours:7.5,created:1,updated:1};
store["sheets/emp1/entries/qw3"]={type:"hours",date:"2026-11-04",job:"4 Rolle Road, Exmouth",start:"08:00",finish:"17:00",breakMin:30,hours:8.5,created:1,updated:1};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{const S=window.__S;S.week=new Date(2026,10,2);S.otab='time';S.open.add('emp1');window.render()});await p.waitForTimeout(600);
 ok(await p.locator('.qw-open[data-w=emp1]').count()===1,'Sam\'s card has ✎ Quick edit this week');
 await p.click('.qw-open[data-w=emp1]');await p.waitForTimeout(400);
 const days=await p.evaluate(()=>[...document.querySelectorAll('#form .qw-row')].map(r=>r.dataset.d));
 ok(days.length===7&&days[0]==='2026-11-02'&&days[6]==='2026-11-08','a line for each day of the week');
 ok(/16 h/.test(await p.innerText('#qw-tot')),'the week\'s hours add up ('+await p.innerText('#qw-tot')+')');
 const row=d=>'#form .qw-row[data-d="'+d+'"]';
 await p.fill(row('2026-11-02')+' .qw-f','17:00');
 ok(/8\.5/.test(await p.innerText(row('2026-11-02')+' .qw-h')),'changing the finish works the hours out (8.5)');
 await p.selectOption(row('2026-11-03')+' .qw-site','4 Rolle Road, Exmouth');await p.fill(row('2026-11-03')+' .qw-s','07:30');await p.fill(row('2026-11-03')+' .qw-f','15:30');
 await p.click(row('2026-11-04')+' .qw-del');
 ok(await p.locator(row('2026-11-04')+'.qw-gone').count()===1,'🗑 takes Wednesday out (until Save)');
 await p.click('#qw-fill');await p.waitForTimeout(200);
 ok(await p.inputValue(row('2026-11-05')+' .qw-s')==='08:00'&&await p.inputValue(row('2026-11-06')+' .qw-f')==='17:00'&&await p.inputValue(row('2026-11-07')+' .qw-s')==='','Fill fills Thursday and Friday like Monday, not the weekend');
 await p.click('#qw-all');
 await p.click('#f-save');await p.waitForTimeout(800);
 const s=await p.evaluate(()=>window.__st);
 const mine=Object.entries(s).filter(([k,v])=>k.startsWith('sheets/emp1/entries/')&&v&&v.type==='hours'&&v.date>='2026-11-02'&&v.date<='2026-11-08');
 const by=d=>mine.filter(([k,v])=>v.date===d).map(([k,v])=>v);
 ok(by('2026-11-02')[0].finish==='17:00'&&by('2026-11-02')[0].hours===8.5&&by('2026-11-02')[0].editedBy&&by('2026-11-02')[0].approved===true,'Monday saved: 17:00, 8.5 h, approved, marked as edited by the owner');
 ok(by('2026-11-03').length===1&&by('2026-11-03')[0].start==='07:30'&&by('2026-11-03')[0].hours===8,'Tuesday added (7:30–3:30, no break, 8 h)');
 ok(by('2026-11-04').length===0,'Wednesday taken out');
 ok(by('2026-11-05').length===1&&by('2026-11-06').length===1&&!by('2026-11-07').length,'Thursday and Friday added, the weekend left empty');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h564: ${bad} failed`:'h564: all passed');await b.close();process.exit(bad?1:0);
})();
