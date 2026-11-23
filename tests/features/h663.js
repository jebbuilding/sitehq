// Removing programme stages one by one (made-up job at 4 Rolle Road, kitchen programme): each ✕ takes the stage off
// straight away and a "Changes not saved yet" bar with 💾 Save shows. Something else changing in the database (which
// reloads the saved records) must not bring removed stages back (James, Nov 2026). Undo changes puts them back; Save
// keeps them gone, and the planner loses their entries.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const SITE='4 Rolle Road, Exmouth';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:1300}});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(s=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.__S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(500);
 await p.click('.pjtile[data-t=programme]');await p.waitForTimeout(400);
 await p.fill('#pg-start','2026-11-16');await p.click('.pg-new[data-t=kitchen]');await p.waitForTimeout(1200);
 const rows=()=>p.locator('.pg-tbl tbody tr').count();
 const planN=()=>p.evaluate(()=>Object.keys(window.__st).filter(k=>/^plan\/prg-/.test(k)&&window.__st[k]).length);
 ok(await rows()===9&&await planN()===9&&!(await p.isVisible('.pg-unsaved')),'a saved kitchen programme: 9 stages, 9 on the planner, no "not saved" bar');
 /* something else changes in todos – the saved records reload */
 const poke=async()=>{await p.evaluate(()=>window.__S.db.doc('todos/poke'+Date.now()).set({kind:'note',text:'x',at:Date.now()}));await p.waitForTimeout(800);};
 for(let i=0;i<3;i++){await p.locator('.pg-x').first().click();await p.waitForTimeout(400);await poke();}
 ok(await rows()===6,'three stages removed one by one stay removed while other records change ('+(await rows())+' left)');
 ok(await p.isVisible('.pg-unsaved')&&await p.isVisible('#pg-save2'),'a "Changes not saved yet" bar with 💾 Save shows');
 await p.screenshot({path:'h663-unsaved.png'});
 await p.click('#pg-undo');await p.waitForTimeout(500);
 ok(await rows()===9&&!(await p.isVisible('.pg-unsaved')),'Undo changes puts them back');
 while(await rows()>2){await p.locator('.pg-x').first().click();await p.waitForTimeout(300);}
 await poke();
 ok(await rows()===2,'removing all but two, still two after another change');
 await p.click('#pg-save2');await p.waitForTimeout(1500);
 ok(!(await p.isVisible('.pg-unsaved')),'Saved: the bar goes');
 await poke();
 const rec=await p.evaluate(()=>Object.entries(window.__st).find(([k,v])=>/^todos\/prog-/.test(k)&&v)[1]);
 ok(rec.stages.length===2&&await rows()===2,'the saved programme has 2 stages, and the page still shows 2');
 ok(await planN()===2,'the planner has just the 2 stages');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h663: ${bad} failed`:'h663: all passed');await b.close();process.exit(bad?1:0);
})();
