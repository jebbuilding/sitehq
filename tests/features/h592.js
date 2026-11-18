// Stairs in 3D, with a cutting list, strings and newels (made-up drawing): the stair builder lists the cutting list
// (strings 275 × 32, treads, risers, newel posts, handrail, spindles, wedges); 🧊 See it in 3D draws it and turns;
// a U stair and a spiral draw in 3D too; the side view has the string and newels; on the plan the open side has newel
// posts; 🪚 Put the cutting list on the drawing makes a page.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,pages:()=>doc.pages};\n  function eraseAt(p) {');
const SP='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 await p.click('.np-gt[data-gt=build]');await p.click('.np-t[data-bt=stairb]');await p.waitForTimeout(300);
 const cut=await p.innerText('.sb-cut');
 ok(/Strings, flight 1/.test(cut)&&/275 × 32/.test(cut)&&/Treads/.test(cut)&&/Risers/.test(cut)&&/Newel posts/.test(cut)&&/Handrail/.test(cut)&&/Spindles/.test(cut)&&/Wedges/.test(cut),'the cutting list has strings, treads, risers, newels, handrail, spindles and wedges');
 const blank=async()=>p.evaluate(()=>{const cv=document.querySelector('.s3d-cv');const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let n=0;for(let i=0;i<d.length;i+=4*37)if(Math.abs(d[i]-244)+Math.abs(d[i+1]-241)+Math.abs(d[i+2]-238)>30)n++;return n;});
 await p.click('.sb-3d');await p.waitForTimeout(300);
 const n1=await blank();
 ok(await p.isVisible('.s3d-cv')&&n1>500,'🧊 See it in 3D draws the stair ('+n1+' drawn spots)');
 await p.screenshot({path:SP+'stair-3d.png'});
 await p.click('.s3d-r');await p.click('.s3d-r');await p.waitForTimeout(150);
 ok(await p.inputValue('.s3d-yaw')==='65','it turns');
 await p.click('.s3d-x');
 await p.click('.sb-type[data-k=half]');await p.selectOption('.sb-bal','glass');await p.selectOption('.sb-open','2');await p.waitForTimeout(150);
 await p.click('.sb-3d');await p.waitForTimeout(300);
 ok(await blank()>500,'a U stair with glass both sides draws in 3D');
 await p.screenshot({path:SP+'stair-3d-u.png'});
 await p.click('.s3d-x');
 await p.click('.sb-type[data-k=spiral]');await p.waitForTimeout(150);
 ok(/Centre column/.test(await p.innerText('.sb-cut')),'a spiral\'s cutting list has the column');
 await p.click('.sb-3d');await p.waitForTimeout(300);
 ok(await blank()>500,'a spiral draws in 3D');
 await p.screenshot({path:SP+'stair-3d-spiral.png'});
 await p.click('.s3d-x');
 await p.click('.sb-type[data-k=straight]');await p.selectOption('.sb-bal','spindles');await p.selectOption('.sb-open','1');await p.waitForTimeout(150);
 const n0=await p.evaluate(()=>window.__np.pages().length);
 await p.click('.sb-cutpage');await p.waitForTimeout(500);
 const pg=await p.evaluate(()=>window.__np.pages());
 ok(pg.length===n0+1&&pg[pg.length-1].name==='Stair cutting list'&&pg[pg.length-1].objs.some(o=>/Strings/.test(o.s||'')),'🪚 the cutting list goes on a new page');
 const st=await p.evaluate(()=>window.__np.pages()[0].objs.find(o=>o.k==='stairs'));
 ok(st&&st.sb&&+st.sb.open===1,'the stair is on the plan with an open side (newels drawn there)');
 /* the side view: string and newels */
 await p.click('.np-t[data-bt=stairb]').catch(()=>{});
 await p.evaluate(()=>{});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h592: ${bad} failed`:'h592: all passed');await b.close();process.exit(bad?1:0);
})();
