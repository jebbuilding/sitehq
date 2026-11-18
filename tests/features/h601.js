// Changing text already on a drawing (James: "i cant go back and change a text box writing"): with the Text tool, tapping
// existing text opens it in the writing box with its words and look, and Save changes it (no second text is added);
// with Select, a quick double tap does the same, and the ✏️ Change words button on the bar under it too.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},desel:()=>{sel=null;draw();},scr:(x,y)=>{const r=cv.getBoundingClientRect();return [r.left+ox+x*s,r.top+oy+y*s];}};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A3',orient:'land',pro:true})});await p.waitForTimeout(1200);
 await p.evaluate(()=>{const N=window.__np;N.set([{t:'text',x:400,y:300,s:'Kitchen',c:'#111111',size:30}]);N.desel();});
 const q=await p.evaluate(()=>window.__np.scr(430,300));
 // the Text tool on existing text
 await p.evaluate(()=>document.querySelector('.np .np-t[data-t=text]').click());await p.waitForTimeout(200);
 await p.mouse.click(q[0],q[1]);await p.waitForTimeout(300);
 ok(await p.isVisible('.np-text')&&await p.inputValue('.np-ttx')==='Kitchen','tapping existing text with the Text tool opens it with its words');
 ok((await p.textContent('.np-text [type=submit]')).trim()==='Save','the button says Save');
 await p.fill('.np-ttx','Kitchen / diner');await p.evaluate(()=>document.querySelector('.np-text .np-tst[data-k=b]').click());await p.click('.np-text [type=submit]');await p.waitForTimeout(300);
 let o=await p.evaluate(()=>window.__np.get());
 ok(o.length===1&&o[0].s==='Kitchen / diner'&&o[0].wt===800,'Save changes the words (and bold) – no second text added');
 ok((await p.textContent('.np-text [type=submit]')).trim()==='Add','the box is back to adding new text afterwards');
 // Select: double tap
 await p.evaluate(()=>document.querySelector('.np .np-t[data-t=move]').click());await p.waitForTimeout(200);
 await p.mouse.click(q[0],q[1]);await p.waitForTimeout(500);
 ok(!(await p.isVisible('.np-text')),'one tap with Select just selects it (so it can be dragged)');
 await p.mouse.click(q[0],q[1]);await p.waitForTimeout(100);await p.mouse.click(q[0],q[1]);await p.waitForTimeout(300);
 ok(await p.isVisible('.np-text')&&await p.inputValue('.np-ttx')==='Kitchen / diner','a quick double tap opens it to change');
 await p.click('.np-tcancel');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>window.__np.get()[0].s)==='Kitchen / diner','✕ Cancel leaves it as it was');
 // the ✏️ button
 ok(await p.isVisible('.np-sb[data-a=dnum]')&&/Change words/.test(await p.textContent('.np-sb[data-a=dnum]')),'the bar under selected text has ✏️ Change words');
 await p.click('.np-sb[data-a=dnum]');await p.waitForTimeout(300);
 await p.fill('.np-ttx','Utility');await p.click('.np-text [type=submit]');await p.waitForTimeout(300);
 o=await p.evaluate(()=>window.__np.get());
 ok(o.length===1&&o[0].s==='Utility','✏️ Change words changes it');
 // new text still works
 await p.evaluate(()=>{document.querySelector('.np .np-t[data-t=text]').click();window.__np.desel();});await p.waitForTimeout(200);
 const q2=await p.evaluate(()=>window.__np.scr(700,500));await p.mouse.click(q2[0],q2[1]);await p.waitForTimeout(300);
 ok(await p.inputValue('.np-ttx')==='','tapping an empty spot still starts new text');
 await p.fill('.np-ttx','Hall');await p.click('.np-text [type=submit]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>window.__np.get().length)===2,'and adds it');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h601: ${bad} failed`:'h601: all passed');await b.close();process.exit(bad?1:0);
})();
