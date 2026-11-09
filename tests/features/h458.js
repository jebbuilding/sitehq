// Drawing undo list: draw a box, a pen line and another box, undo once, then 🕘 Steps lists every step newest first
// with its name ("Added a box", "Added a pen line"), marks where you are and what is undone; tapping the first step
// goes back two, tapping the newest comes forward again, and the names for moved, changed, removed and cleared work.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const HOOK='  let lenObj = null;';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const SN='const npStepName = ';
ok(page_src.split(HOOK).length===2&&page_src.split(SN).length===2,'test hooks found once');
page_src=page_src.replace(SN,'window.__sn=(...a)=>npStepName(...a);'+SN);
page_src=page_src.replace(HOOK,HOOK+'window.__np=()=>doc;');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const n=()=>p.evaluate(()=>window.__np().objs.length);
 const rows=()=>p.$$eval('.np-stepsbox .np-step',bs=>bs.map(b=>({k:+b.dataset.k,t:b.querySelector('.np-step-t').textContent,here:b.hasAttribute('aria-current'),undone:b.classList.contains('np-step-undone')})));
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 if(await p.$('#nl-tog')){await p.click('#nl-tog');await p.waitForTimeout(400);await p.evaluate(()=>{const t=document.querySelector('#nl-tog');if(t)t.style.display='none'});}
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 ok(await p.isVisible('.np-steps'),'a 🕘 Steps button next to Undo and Redo');
 await p.click('.np-steps');await p.waitForTimeout(200);
 ok(/Nothing to go back to yet/.test(await p.textContent('.np-stepsbox')),'before drawing, it says there is nothing to go back to');
 await p.click('.np-stepsbox .sax');await p.waitForTimeout(100);
 const bb=await p.locator('.np-cv').boundingBox();
 const drag=async(t,x1,y1,x2,y2)=>{await p.click('.np-t[data-t='+t+']');await p.mouse.move(bb.x+x1,bb.y+y1);await p.mouse.down();await p.mouse.move(bb.x+x2,bb.y+y2,{steps:8});await p.mouse.up();await p.waitForTimeout(200);};
 await drag('rect',100,250,400,500);
 await drag('pen',150,300,350,450);
 await drag('rect',500,250,700,450);
 ok(await n()===3,'three things drawn ('+await n()+')');
 await p.click('.np-undo');await p.waitForTimeout(150);
 ok(await n()===2,'Undo takes the second box off');
 await p.click('.np-steps');await p.waitForTimeout(200);
 let r=await rows();
 console.log(r.map(x=>x.k+' '+x.t+(x.here?' [here]':'')+(x.undone?' [undone]':'')).join('\n'));
 ok(r.length===4&&r[0].k===3&&r[3].k===0,'four rows, newest first, down to "as far back as it goes"');
 ok(r[0].t==='Added a box'&&r[0].undone,'the newest step is "Added a box", marked undone');
 ok(r[1].t==='Added a pen line'&&r[1].here,'"Added a pen line" is where you are');
 ok(r[2].t==='Added a box'&&r[3].t==='As far back as it goes','then the first box, then the start');
 await p.screenshot({path:'h458-steps.png'});
 await p.click('.np-stepsbox .np-step[data-k="1"]');await p.waitForTimeout(200);
 ok(await n()===1&&/Went back 1 step/.test(await lastToast()),'tapping the first box goes back to it: '+await lastToast());
 await p.click('.np-steps');await p.waitForTimeout(200);
 r=await rows();
 ok(r.find(x=>x.here).k===1&&r.filter(x=>x.undone).length===2,'now the first box is where you are, the other two undone');
 await p.click('.np-stepsbox .np-step[data-k="3"]');await p.waitForTimeout(200);
 ok(await n()===3&&/Came forward 2 steps/.test(await lastToast()),'tapping the newest comes forward again: '+await lastToast());
 await p.click('.np-redo');await p.waitForTimeout(100);ok(await n()===3,'nothing left to redo');
 await p.click('.np-undo');await p.waitForTimeout(100);ok(await n()===2,'and Undo still works after it');
 await drag('rect',800,250,950,400);
 await p.click('.np-steps');await p.waitForTimeout(200);
 r=await rows();
 ok(r.length===4&&!r.some(x=>x.undone)&&r[0].here,'drawing something new drops the undone steps');
 await p.click('.np-stepsbox .sax');
 /* the names */
 const names=await p.evaluate(()=>{
  const w={t:'shape',k:'wall',a:[0,0],b:[100,0],c:'#111111',w:2,th:12};
  const w2={...w,a:[10,10],b:[110,10]};
  const w3={...w,c:'#e11d2a'};
  const d={t:'dim',a:[0,0],b:[1,1]};
  const tx={t:'text',x:1,y:1,s:'Kitchen'};
  return [window.__sn([w],[w2]),window.__sn([w],[w3]),window.__sn([w,d],[w]),window.__sn([w,d],[]),window.__sn([],[d,d,tx]),window.__sn([w,d],[d,w])];
 });
 console.log(names.join('\n'));
 ok(names[0]==='Moved a solid wall','moved: '+names[0]);
 ok(names[1]==='Changed a solid wall','changed colour: '+names[1]);
 ok(names[2]==='Removed a measurement','removed: '+names[2]);
 ok(names[3]==='Cleared the page','cleared: '+names[3]);
 ok(names[4]==='Added 2 × measurement and a text “Kitchen”','several at once: '+names[4]);
 ok(names[5]==='Changed the order (front and back)','order: '+names[5]);
 /* on a phone the Steps button is still there */
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(400);
 ok(await p.isVisible('.np-steps'),'Steps shows on a phone-sized screen too');
 await p.click('.np-steps');await p.waitForTimeout(200);await p.screenshot({path:'h458-phone.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h458: ${bad} failed`:'h458: all passed');await b.close();process.exit(bad?1:0);
})();
