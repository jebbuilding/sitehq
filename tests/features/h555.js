// Planner (new look, all made-up): a 🌴 Holidays tab beside Who's where / Board / Day / Jobs / Month – a request
// waiting for an answer, holidays booked from today on grouped by month (tap one to see it), the ones taken this
// holiday year folded away, everyone's allowances, and Book time off; the allowances card isn't shown twice.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const d=(n)=>{const x=new Date();x.setDate(x.getDate()+n);return x.toISOString().slice(0,10);};
const extra=`store["plan/hx1"]={type:"holiday",title:"Holiday",from:"${d(20)}",to:"${d(24)}",people:["emp1"],vis:"all",created:1};
store["plan/hx2"]={type:"holiday",title:"Holiday",from:"${d(-1)}",to:"${d(1)}",people:["emp1"],vis:"people",created:1};
store["plan/hx3"]={type:"holiday",title:"Sick",from:"${d(-3)}",to:"${d(-3)}",people:["emp1"],vis:"all",created:1};
store["plan/hx4"]={type:"work",title:"Strip out",site:"4 Rolle Road, Exmouth",from:"${d(0)}",to:"${d(2)}",people:["emp1"],vis:"all",created:1};
store["sheets/emp1/signoffs/lvq1"]={type:"leave",leaveType:"holiday",from:"${d(40)}",to:"${d(40)}",status:"pending",created:1};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(500);
 await p.evaluate(()=>{const S=window.__S;S.otab='planner';S.f.pmode='board';window.render()});await p.waitForTimeout(600);
 ok(await p.locator('#pb-mode button[data-v=hol]').count()===1,'the planner has a 🌴 Holidays tab');
 await p.click('#pb-mode button[data-v=hol]');await p.waitForTimeout(600);
 ok(await p.getAttribute('#pb-mode button[data-v=hol]','aria-pressed')==='true','tapping it opens it');
 const rows=await p.evaluate(()=>[...document.querySelectorAll('.ht-page section .ht-row')].map(r=>r.dataset.p));
 ok(rows.join()==='hx2,hx1','booked from today on, in date order ('+rows.join()+'); the work booking isn\'t listed');
 ok(await p.locator('.ht-row.ht-now[data-p=hx2] .tag').innerText()==='Off now','someone off today shows "Off now"');
 ok(/Sam Test/.test(await p.innerText('.ht-row[data-p=hx1]'))&&/5 working days|[0-9] working days/.test(await p.innerText('.ht-row[data-p=hx1]')),'each shows who and how many working days');
 ok(await p.locator('.ht-page .flabel').count()>=1,'grouped under month headings');
 ok(await p.locator('.ht-past .ht-row[data-p=hx3]').count()===1&&!(await p.isVisible('.ht-past .ht-row')),'taken this holiday year, folded away');
 ok(await p.locator('.ht-page .lv[data-l=lvq1] .lv-yes').count()===1,'the request waiting for an answer is there to approve');
 ok(await p.locator('.hol-card[data-id=__holo]').count()===1,'the allowances card shows once');
 await p.click('#ht-book');await p.waitForTimeout(400);
 ok(await p.isVisible('#lv-who'),'Book time off for someone opens the booking form');
 await p.click('#f-cancel');await p.waitForTimeout(300);
 await p.click('.ht-row[data-p=hx1]');await p.waitForTimeout(400);
 ok(await p.isVisible('#viewer')||await p.isVisible('.sheet'),'tapping a holiday opens it');
 await p.setViewportSize({width:390,height:844});await p.keyboard.press('Escape');await p.waitForTimeout(300);
 await p.evaluate(()=>window.render());await p.waitForTimeout(400);
 ok(!(await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2)),'fits a phone without scrolling sideways');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h555: ${bad} failed`:'h555: all passed');await b.close();process.exit(bad?1:0);
})();
