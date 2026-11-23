// James's own time (made-up data). Time put down as 📋 Office / paperwork (or another not-a-site choice) stays on the timesheet
// and doesn't make a site on Sites (James, Nov 2026). 📊 Recent weeks lists James with the trades ("I should be within that too").
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({projectSites});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 const ok2=await p.evaluate(async()=>{const S=window.__S;const d=new Date();const f=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
   await S.db.doc('sheets/owner/entries/o1').set({type:'hours',date:f(d),job:'Office / paperwork',start:'08:00',finish:'12:00',breakMin:0,hours:4,notes:'',created:1,updated:1});
   await S.db.doc('sheets/emp1/entries/o2').set({type:'hours',date:f(d),job:'Pricing & quoting',start:'08:00',finish:'10:00',breakMin:0,hours:2,notes:'',created:1,updated:1});return 1});
 await p.waitForTimeout(800);
 const mine=await p.evaluate(()=>(window.__S.mine.entries||[]).some(e=>e.job==='Office / paperwork'));
 ok(mine,'James has 4 hours of Office / paperwork on his timesheet today');
 const sites=await p.evaluate(()=>window.__T().projectSites());
 ok(!sites.includes('Office / paperwork')&&!sites.includes('Pricing & quoting')&&sites.includes('4 Rolle Road, Exmouth'),'Sites has the real sites but not Office / paperwork or Pricing & quoting ('+sites.join(', ')+')');
 await p.evaluate(()=>{const S=window.__S;S.otab='time';const n=new Date();n.setHours(0,0,0,0);n.setDate(n.getDate()-((n.getDay()+6)%7));S.week=n;window.render()});await p.waitForTimeout(700);
 const rows=await p.evaluate(()=>[...document.querySelectorAll('.aw-card tbody tr')].map(r=>r.innerText.replace(/\s+/g,' ').trim()));
 ok(rows.some(t=>/^James/.test(t)&&/\b4\b/.test(t)),'📊 Recent weeks has a row for James with his 4 hours ('+rows.join(' / ')+')');
 await p.screenshot({path:'h666-weeks.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h666: ${bad} failed`:'h666: all passed');await b.close();process.exit(bad?1:0);
})();
