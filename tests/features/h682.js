// Quote watch (made-up estimates and merchant): a sent estimate 3 days from running out says so, one that ran out 10 days
// ago says so, and the list has a warning at the top; bringing a merchant's price list in again with dearer prices notes
// the rise, and estimates still waiting that were priced before it say prices have gone up (list and inside).
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({plSave,sdEdit});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1100,height:1100}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.evaluate(async()=>{const S=window.__S;const f=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');const ago=n=>{const d=new Date();d.setDate(d.getDate()-n);return f(d)};
   const old=Date.now()-5*864e5;
   await S.db.doc('todos/salesset').set({kind:'salesset',head:'Test Builders'});
   await S.db.doc('todos/sd-a').set({kind:'sale',type:'estimate',number:'10',client:'Sue Jones',date:ago(27),validDays:30,status:'sent',lines:[{d:'Works',a:1000,vc:'S20',k:'lab'}],created:old,updated:old});
   await S.db.doc('todos/sd-b').set({kind:'sale',type:'estimate',number:'11',client:'Bob Lee',date:ago(40),validDays:30,status:'sent',lines:[{d:'Works',a:2000,vc:'S20',k:'lab'}],created:old,updated:old});
   await S.db.doc('todos/sd-c').set({kind:'sale',type:'estimate',number:'12',client:'Pat Test',date:ago(2),validDays:30,status:'draft',lines:[{d:'Works',a:500,vc:'S20',k:'mat'}],created:old,updated:old});
   await S.db.doc('todos/sup-t1').set({kind:'supplier',name:'Example Timber',vis:'all',people:[],created:1,updated:1});
   await S.db.doc('todos/pl-sup-t1').set({kind:'pricelist',sup:'sup-t1',items:[{n:'Blocks 440x215',u:'each',p:1.5},{n:'Sand',u:'bag',p:40}],updated:old});});
 await p.waitForTimeout(800);
 /* the merchant's new price list: blocks up 10%, sand the same */
 await p.evaluate(async()=>{await window.__T().plSave('sup-t1',[{n:'Blocks 440x215',u:'each',p:1.65},{n:'Sand',u:'bag',p:40}]);});
 await p.waitForTimeout(800);
 const pl=await p.evaluate(()=>window.__st['todos/pl-sup-t1']);
 ok(pl.rises&&pl.rises.length===1&&pl.rises[0].n===1&&pl.rises[0].avg===10,'bringing the list in again notes 1 price up 10%');
 await p.evaluate(()=>{window.__S.otab='sales';window.render()});await p.waitForTimeout(500);
 await p.click('#sd-tabs [data-v=est]');await p.waitForTimeout(600);
 const top=await p.innerText('.qtw-note');
 ok(/1 running out this week/.test(top)&&/EST-10 Sue Jones/.test(top),'the list says EST-10 Sue Jones runs out this week');
 ok(/1 ran out/.test(top)&&/EST-11 Bob Lee/.test(top),'and EST-11 Bob Lee ran out');
 ok(/Prices have gone up/.test(top)&&/EST-12 Pat Test/.test(top),'and prices have gone up since they were priced');
 const rows=await p.$$eval('.sd-row',x=>x.map(r=>r.innerText.replace(/\s+/g,' ')));
 ok(rows.some(r=>/EST-10/.test(r)&&/Runs out in 3 days/.test(r)),'EST-10: ⏳ Runs out in 3 days');
 ok(rows.some(r=>/EST-11/.test(r)&&/Ran out 10 days ago/.test(r)),'EST-11: ⌛ Ran out 10 days ago');
 await p.screenshot({path:'h682-list.png'});
 await p.click('.sd-row >> text=EST-12');await p.waitForTimeout(600);
 ok(/Example Timber put up 1 price, 10% on average/.test(await p.innerText('.sd-ed')),'inside the estimate: Example Timber put up 1 price, 10% on average');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h682: ${bad} failed`:'h682: all passed');await b.close();process.exit(bad?1:0);
})();
