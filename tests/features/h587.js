// The Properties box (made-up drawing): it opens on the left; dragged by its top bar it moves and stays put next
// time it opens; – folds it to just its title bar and ▢ opens it out again.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={set:(a)=>{setObjs(a);draw();},pick:(i)=>{sel=i;draw();fineOpen();}};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 await p.evaluate(()=>{window.__np.set([{t:'line',a:[300,300],b:[600,300],c:'#111',w:3}]);window.__np.pick(0);});await p.waitForTimeout(300);
 const st=await p.locator('.np-stage').boundingBox();
 let fbb=await p.locator('.np-finebox').boundingBox();
 ok(fbb.x-st.x<30&&fbb.y-st.y<30,'Properties opens on the left ('+Math.round(fbb.x-st.x)+', '+Math.round(fbb.y-st.y)+')');
 const h=await p.locator('.np-finebox .nfhead b').boundingBox();
 await p.mouse.move(h.x+10,h.y+5);await p.mouse.down();await p.mouse.move(h.x+410,h.y+105,{steps:8});await p.mouse.up();await p.waitForTimeout(200);
 const fb2=await p.locator('.np-finebox').boundingBox();
 ok(fb2.x-fbb.x>350&&fb2.y-fbb.y>80,'dragging its top bar moves it');
 await p.click('.np-finebox .nfx');await p.waitForTimeout(200);await p.evaluate(()=>window.__np.pick(0));await p.waitForTimeout(300);
 const fb3=await p.locator('.np-finebox').boundingBox();
 ok(Math.abs(fb3.x-fb2.x)<2&&Math.abs(fb3.y-fb2.y)<2,'it opens where it was left');
 await p.click('.np-finebox .nfmin');await p.waitForTimeout(200);
 const small=(await p.locator('.np-finebox').boundingBox()).height;
 ok(small<70&&!(await p.isVisible('.np-finebox .nfcolrow')),'– folds it to its title bar ('+Math.round(small)+' px)');
 await p.screenshot({path:'C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/props-small.png'});
 await p.click('.np-finebox .nfmin');await p.waitForTimeout(200);
 ok(await p.isVisible('.np-finebox .nfcolrow'),'▢ opens it out again');
 await p.screenshot({path:'C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/props-moved.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h587: ${bad} failed`:'h587: all passed');await b.close();process.exit(bad?1:0);
})();
