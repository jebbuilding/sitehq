// Jobs page (new look, all made-up): the "Hide for now" tick box on the chosen job saves hold on its site; the job is
// greyed with "Hidden for now" in the list (owner still sees it), and a trade no longer gets it in their job lists,
// the planner or its documents; unticking brings it back. (The trade page sets the flag itself: the fake seeds over injected records.)
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra=`store["plan/hp1"]={type:"work",title:"Strip out",site:"4 Rolle Road, Exmouth",from:"2026-11-16",to:"2026-11-20",people:["emp1"],vis:"all",created:1};
store["plan/hp2"]={type:"work",title:"Footings",site:"12 Marine Way, Exmouth",from:"2026-11-16",to:"2026-11-20",people:["emp1"],vis:"all",created:1};
store["docs/hd1"]={name:"Rolle Road drawing",site:"4 Rolle Road, Exmouth",cat:"plans",created:1};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(500);
 await p.click('.nl-b[data-s=jobs]');await p.waitForTimeout(500);
 await p.click('.jb-item[data-s="4 Rolle Road, Exmouth"]');await p.waitForTimeout(400);
 ok(await p.isVisible('#jb-hide')&&!(await p.isChecked('#jb-hide')),'the chosen job has a "Hide for now" tick box, unticked');
 await p.check('#jb-hide');await p.waitForTimeout(600);
 const site=await p.evaluate(()=>window.__st['sites/s2']);
 ok(site&&site.hold===true&&site.holdAt>0,'ticking it saves hold on the site');
 const it=await p.innerText('.jb-item[data-s="4 Rolle Road, Exmouth"]');
 ok(/Hidden for now/.test(it)&&await p.locator('.jb-item.jb-held').count()===1,'the job stays in the owner\'s list, greyed, "Hidden for now"');
 const stored=await p.evaluate(()=>JSON.stringify(window.__st));
 /* the trade (Sam Test) with the same records */
 const p2=await ctx.newPage();p2.on('pageerror',e=>{console.log('ERR trade',e.message);bad++;});
 const trade=(st)=>p2.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false).replace('window.__st=store;','window.__st=store;Object.assign(store,'+st.replace(/<\/script/gi,'<\/script')+');')+page_src.replace('function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}','function detailsDone(d){return true}')+'</body></html>');
 await trade(stored);await p2.waitForTimeout(2200);await p2.keyboard.press('Escape');await p2.evaluate(async()=>{await window.__S.db.doc('sites/s2').update({hold:true})});await p2.waitForTimeout(600);
 const t=await p2.evaluate(()=>{const S=window.__S;return {plan:(S.plan||[]).map(x=>x.title),docs:(S.docs||[]).map(x=>x.name),opts:[...document.querySelectorAll('option')].map(o=>o.textContent).filter(x=>/Rolle|Marine/.test(x)),hold:(S.sites||[]).find(x=>x.name==='4 Rolle Road, Exmouth').hold}});
 ok(t.hold===true,'the trade\'s copy has the site marked hidden');
 ok(t.plan.includes('Footings')&&!t.plan.includes('Strip out'),'the trade\'s planner leaves out the hidden job ('+t.plan.join(', ')+')');
 ok(!t.docs.includes('Rolle Road drawing'),'and its documents');
 ok(!t.opts.some(x=>/Rolle Road/.test(x)),'and it isn\'t in their job lists ('+t.opts.join(' | ')+')');
 /* untick */
 await p.uncheck('#jb-hide');await p.waitForTimeout(600);
 ok((await p.evaluate(()=>window.__st['sites/s2'])).hold===false&&await p.locator('.jb-item.jb-held').count()===0,'unticking shows it to everyone again');
 await trade(await p.evaluate(()=>JSON.stringify(window.__st)));await p2.waitForTimeout(2200);await p2.evaluate(async()=>{await window.__S.db.doc('sites/s2').update({hold:false})});await p2.waitForTimeout(600);
 ok(await p2.evaluate(()=>(window.__S.plan||[]).some(x=>x.title==='Strip out')),'the trade gets it back');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h554: ${bad} failed`:'h554: all passed');await b.close();process.exit(bad?1:0);
})();
