// Holidays tied together (new look, all made-up): a holiday put straight on the planner counts in Sam's days and is
// listed on his holiday page ("Put on the planner"); changing it there makes it a proper holiday record. Tapping a
// holiday in the Day view, the 🌴 button on his monthly timesheet and "Change it" on a day off all open his holiday
// page; the People page has a button to the planner's Holidays tab.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const y=new Date().getFullYear();
/* the next Monday at least a week away, for a booked holiday */
const nx=new Date();nx.setDate(nx.getDate()+7+((8-nx.getDay())%7));const mon=nx.toISOString().slice(0,10);const tue=new Date(nx.getTime()+864e5).toISOString().slice(0,10);
const extra=`store["plan/hpo1"]={type:"holiday",title:"Holiday",from:"${y}-03-02",to:"${y}-03-03",people:["emp1"],vis:"all",created:1};
store["plan/hpo2"]={type:"holiday",title:"Holiday",from:"${mon}",to:"${tue}",people:["emp1"],vis:"all",created:1};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {').replace('function openPersonMonth(','window.openPersonMonth=openPersonMonth;function openPersonMonth(');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 const st=()=>p.evaluate(()=>window.__st);
 const title=async()=>(await p.isVisible('#sheettitle'))?await p.innerText('#sheettitle'):'';
 const close=async()=>{if(await p.isVisible('#f-cancel')){await p.click('#f-cancel');await p.waitForTimeout(300);}};
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(500);
 await p.evaluate(async()=>{const S=window.__S;const h={start:'01-01',days:28,bankIn:false,people:{emp1:20}};await S.db.doc('settings/app').update({holidays:h});S.settings=Object.assign({},S.settings,{holidays:h});S.otab='planner';S.f.pmode='hol';window.render()});await p.waitForTimeout(600);
 const row=await p.innerText('.hol-row[data-w=emp1]');
 ok(/2 taken/.test(row)&&/2 booked/.test(row),'holidays put straight on the planner count in Sam\'s days ('+row.replace(/\s+/g,' ')+')');
 await p.click('.hol-row[data-w=emp1]');await p.waitForTimeout(400);
 ok(await p.locator('.hp-row[data-l="plan:hpo1"]').count()===1&&/Put on the planner/.test(await p.innerText('.hp-row[data-l="plan:hpo1"]')),'his holiday page lists it, marked "Put on the planner"');
 await p.click('.hp-row[data-l="plan:hpo1"] .hp-ed');await p.waitForTimeout(300);
 ok(await p.inputValue('#hp-from')===y+'-03-02','Change opens it with its dates');
 await p.fill('#hp-to',y+'-03-04');await p.click('#f-save');await p.waitForTimeout(800);
 let s=await st();const L=Object.entries(s).filter(([k,v])=>k.startsWith('sheets/emp1/signoffs/')&&v&&v.type==='leave'&&v.from===y+'-03-02');
 ok(L.length===1&&L[0][1].to===y+'-03-04'&&L[0][1].status==='approved','changing it makes a proper holiday record');
 ok(!s['plan/hpo1']&&s['plan/leave-'+L[0][0].split('/').pop()],'the old planner entry is replaced by the record\'s own');
 await close();
 /* the Day view: tapping the booked holiday opens his page */
 await p.evaluate(m=>{const S=window.__S;S.f.pmode='day';S.f.pdmode='day';S.f.pdday=m;window.render()},mon);await p.waitForTimeout(600);
 await p.click('.dy-adchip[data-p=hpo2]');await p.waitForTimeout(500);
 ok(/Sam Test – holidays/.test(await title()),'tapping a holiday in the Day view opens his holiday page');
 await close();
 /* his monthly timesheet */
 await p.evaluate(()=>window.openPersonMonth('emp1'));await p.waitForTimeout(600);
 ok(await p.locator('.ts-hol').count()===1,'his monthly timesheet has a 🌴 holidays button');
 await p.click('.ts-hol');await p.waitForTimeout(400);
 ok(/Sam Test – holidays/.test(await title()),'which opens his holiday page');
 await close();
 /* People: a way to the planner's Holidays tab */
 await p.evaluate(()=>{const S=window.__S;const v=document.getElementById('viewer');if(v&&!v.hidden){const x=document.getElementById('viewer-close')||document.querySelector('#viewer .vclose');if(x)x.click();}S.otab='people';window.render()});await p.waitForTimeout(600);
 ok(await p.locator('#hol-tab').count()===1,'the People page has "Holidays booked – on the planner"');
 await p.click('#hol-tab');await p.waitForTimeout(600);
 ok(await p.evaluate(()=>window.__S.otab==='planner'&&window.__S.f.pmode==='hol')&&await p.locator('.ht-page').count()===1,'which opens the planner\'s Holidays tab');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h557: ${bad} failed`:'h557: all passed');await b.close();process.exit(bad?1:0);
})();
