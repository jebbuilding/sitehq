// Drawing details › What drawing is this? (made-up drawing): the list is in groups – Plans, Elevations and sections,
// Structure and steel, Stairs, Doors windows and joinery, Services, Outside, Details – with stairs, steel and details
// in it; picking "Staircase design" keeps it for the page.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={pages:()=>doc.pages};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 await p.click('.np-info');await p.waitForTimeout(300);
 const groups=await p.evaluate(()=>[...document.querySelectorAll('.ni-type optgroup')].map(g=>g.label));
 ok(['Plans','Structure and steel','Stairs','Details'].every(g=>groups.includes(g)),'the list is in groups ('+groups.join(', ')+')');
 const opts=await p.evaluate(()=>[...document.querySelectorAll('.ni-type option')].map(o=>o.textContent));
 ok(['Staircase design','Stair side view / section','External steel stair','Spiral stair','Balustrade and handrail','Steel beam detail','Steel beam schedule','Temporary works / propping','Construction details','Fire protection details'].every(t=>opts.includes(t)),'stairs, steel and details are all there');
 await p.selectOption('.ni-type','Staircase design');await p.click('.dimask [type=submit]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>window.__np.pages()[0].type)==='Staircase design','picking Staircase design keeps it for the page');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h591: ${bad} failed`:'h591: all passed');await b.close();process.exit(bad?1:0);
})();
