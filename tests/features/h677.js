// Learning from past jobs (made-up jobs): two finished programmes where Plaster and make good was planned at 3 days and
// took 5 and 6; on a new kitchen programme its row says it took 5.5 days on average – more than you've put; 📈 How long
// stages really take lists it worst first.
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
 const ctx=await b.newContext({viewport:{width:1200,height:1300}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.evaluate(async()=>{const S=window.__S;
   const mk=(id,site,from,to,days)=>S.db.doc('todos/'+id).set({kind:'programme',site,start:from,updated:1,stages:[{id:'s1',name:'Plaster and make good',days,after:'',link:'',lag:0,done:true,actFrom:from,actTo:to},{id:'s2',name:'Fit units',days:3,after:'s1',link:'end',lag:0,done:true,actFrom:'2026-10-12',actTo:'2026-10-14'}]});
   await mk('prog-old-1','Old Job One, Exmouth','2026-09-07','2026-09-11',3);
   await mk('prog-old-2','Old Job Two, Exmouth','2026-10-05','2026-10-12',3);});
 await p.waitForTimeout(800);
 await p.evaluate(s=>{const S=window.__S;S.otab='projects';S.f.projList=false;S.f.proj=s;window.render();S.f.pjtab='programme';window.render()},'4 Rolle Road, Exmouth');await p.waitForTimeout(600);
 await p.fill('#pg-start','2026-11-16');await p.click('.pg-new[data-t=kitchen]');await p.waitForTimeout(1200);
 const row=p.locator('.pg-tbl tbody tr',{hasText:''}).filter({has:p.locator('.pg-name[value="Plaster and make good"]')});
 const h=await row.locator('.sth-hint').innerText().catch(()=>'');
 ok(/Took 5\.5 days on average \(last 2 jobs\)/.test(h)&&/more than you've put/.test(h),'Plaster and make good: '+h);
 const h2=await p.locator('.pg-tbl tbody tr').filter({has:p.locator('.pg-name[value="Fit units"]')}).locator('.sth-hint').innerText().catch(()=>'');
 ok(/Took 3 days/.test(h2)&&!/more than/.test(h2),'Fit units took what was planned: '+h2);
 await p.screenshot({path:'h677-programme.png'});
 await p.click('#pg-hist');await p.waitForTimeout(600);
 const rows=await p.$$eval('.sth-tbl tbody tr',x=>x.map(r=>r.innerText.replace(/\s+/g,' ')));
 ok(rows.length===2&&/^Plaster and make good/.test(rows[0])&&/\+2\.5 days/.test(rows[0]),'📈 How long stages really take: worst first – '+rows[0]);
 await p.screenshot({path:'h677-report.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h677: ${bad} failed`:'h677: all passed');await b.close();process.exit(bad?1:0);
})();
