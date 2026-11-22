// A steel beam's sheet (made-up drawing): a beam drawn 3000 mm clear; Properties › Open the beam sheet; pick
// 203×133×25 UB and 150 / 200 bearings – the cut length (3350), weight (about 84 kg) and that it needs lifting kit;
// props worked out for the ceiling height; a padstone too narrow for the flange warns; fire board quantities; the
// order for the supplier has the size, grade and cut length; ticking "calcs approved" dates it and shows where the
// beam has got to; Save keeps it all on the beam. The schedule shows where each beam has got to, opens its sheet,
// and 📦 Order all the steel puts every beam in one order. 📐 Draw the beam detail makes a new page.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},pick:(i)=>{sel=i;draw();fineOpen();},u:(mm)=>toUnits(mm),pages:()=>doc.pages,sched:()=>schedDlg("bm")};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true,site:'4 Rolle Road, Exmouth'})});await p.waitForTimeout(1200);
 await p.evaluate(()=>{const u=window.__np.u;window.__np.set([{t:'shape',k:'beam',a:[200,300],b:[200+u(3000),300],c:'#111',w:3,mark:'B1'},{t:'shape',k:'beam',a:[200,500],b:[200+u(2000),500],c:'#111',w:3,mark:'B2',sec:'152×89×16 UB'}]);window.__np.pick(0);});await p.waitForTimeout(300);
 ok(await p.isVisible('.nfst-sheet'),'a beam\'s Properties has Open the beam sheet');
 await p.click('.nfst-sheet');await p.waitForTimeout(300);
 ok(await p.isVisible('.bmsheet'),'the beam sheet opens');
 await p.selectOption('.bm-sec-s','203×133×25 UB');await p.fill('.bm-ba','150');await p.fill('.bm-bb','200');await p.waitForTimeout(200);
 const len=await p.innerText('.bm-len');
 ok(/Cut length 3350 mm/.test(len)&&/about 84 kg/.test(len),'cut length and weight ('+len.replace(/\n/g,' ')+')');
 ok(/Lifting kit|material lift|gin wheel/i.test(await p.innerText('.bm-lift')),'84 kg says lifting kit');
 ok(/\d+ props \(No\. \d\)/.test(await p.innerText('.bm-props')),'props worked out ('+(await p.innerText('.bm-props')).split('\n')[0]+')');
 await p.selectOption('.bm-pad','Concrete 440×100×100');await p.waitForTimeout(150);
 ok(/longer than the padstone is deep/.test(await p.innerText('.bm-padinfo')),'a padstone too short for the bearing warns');
 await p.selectOption('.bm-pad','Concrete 440×215×100');await p.selectOption('.bm-fire','board');await p.waitForTimeout(150);
 ok(/sheets? 2400 × 1200/.test(await p.innerText('.bm-fireinfo')),'fire board quantities');
 await p.selectOption('.bm-grade','S355');await p.waitForTimeout(150);
 const ord=await p.innerText('.bm-order');
 ok(/203×133×25 UB, grade S355, cut length 3350 mm/.test(ord)&&/4 Rolle Road/.test(ord),'the order has size, grade, cut length and the site');
 await p.check('.bm-tick[data-k=calcs]');await p.waitForTimeout(150);
 ok(/Engineer's calcs approved/.test(await p.innerText('.bm-stage')),'ticking calcs approved shows where it has got to');
 await p.evaluate(()=>document.querySelector('.bmsheet .bm-ticks').scrollIntoView({block:'center'}));await p.screenshot({path:'beam-sheet.png'});await p.evaluate(()=>document.querySelector('.bmsheet .bm-sec').scrollIntoView({block:'start'}));await p.screenshot({path:'beam-sheet-top.png'});
 await p.click('.bmsheet [type=submit]');await p.waitForTimeout(300);
 const o=await p.evaluate(()=>window.__np.get()[0]);
 ok(o.sec==='203×133×25 UB'&&o.bearA===150&&o.bearB===200&&o.fire==='board'&&o.ord.grade==='S355'&&o.bc.calcs>0,'Save keeps it all on the beam');
 /* the schedule */
 await p.click('.nfx').catch(()=>{});await p.evaluate(()=>window.__np.sched());await p.waitForTimeout(300);
 const rows=await p.evaluate(()=>[...document.querySelectorAll('.qtybox tbody tr')].map(r=>r.innerText));
 ok(rows.some(r=>/Engineer's calcs approved/.test(r))&&rows.some(r=>/Not started/.test(r)),'the schedule shows where each beam has got to');
 await p.click('.sc-order');await p.waitForTimeout(300);
 const all=await p.innerText('.bmsheet .bm-order');
 ok(/B1: 1 × 203×133×25 UB/.test(all)&&/B2: 1 × 152×89×16 UB/.test(all),'📦 Order all puts every beam in one order');
 await p.click('.bmsheet .bm-x');await p.waitForTimeout(200);
 await p.click('.sc-sheet[data-i="0"]');await p.waitForTimeout(300);
 ok(await p.isVisible('.bmsheet .bm-detail'),'📋 Sheet opens the beam\'s sheet from the schedule');
 const n0=await p.evaluate(()=>window.__np.pages().length);
 await p.click('.bm-detail');await p.waitForTimeout(500);
 const pages=await p.evaluate(()=>window.__np.pages().map(x=>x.name));
 ok(pages.length===n0+1&&/B1 detail/.test(pages[pages.length-1]),'📐 Draw the beam detail makes a new page ('+pages[pages.length-1]+')');
 await p.screenshot({path:'beam-detail.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h588: ${bad} failed`:'h588: all passed');await b.close();process.exit(bad?1:0);
})();
