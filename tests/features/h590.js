// The stair builder (made-up drawing): 🪜 Stair builder in the Build tab; a straight private stair, 2600 floor to
// floor, gets 14 risers of 186 and its checks pass; glass panels show how many and the glass note; a riser too many
// shows the rise and keeps checking; external steel switches to grating treads and a utility stair; spiral asks the
// diameter; "Put it on the plan" draws the stair symbol sized to its footprint and keeps the design; Properties
// opens it again in the builder; 📐 Draw the side view makes a new page.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,pick:(i)=>{sel=i;draw();fineOpen();},mm:(u)=>realMm(u),pages:()=>doc.pages};\n  function eraseAt(p) {');
const SP='';
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true,site:'4 Rolle Road, Exmouth'})});await p.waitForTimeout(1200);
 await p.click('.np-gt[data-gt=build]');await p.click('.np-t[data-bt=stairb]');await p.waitForTimeout(300);
 ok(await p.isVisible('.sbuild'),'🪜 Stair builder opens');
 ok(await p.locator('.sbuild .sb-type').count()===9,'nine kinds of stair to pick from');
 await p.fill('.sb-ftf','2600');await p.waitForTimeout(150);
 ok(/14<\/b> risers of <b>186 mm/.test(await p.innerHTML('.sb-fig')),'2600 floor to floor: 14 risers of 186 ('+(await p.innerText('.sb-fig')).replace(/\n/g,' ')+')');
 ok(!(await p.locator('.sb-bad').count()),'its Part K checks pass');
 await p.selectOption('.sb-bal','glass');await p.waitForTimeout(150);
 ok(await p.isVisible('.sb-gfix')&&/Glass panels/.test(await p.innerText('.sb-q'))&&/toughened/.test(await p.innerText('.sb-gnote')),'glass: how it is fixed, how many panels, and which glass');
 await p.click('.sb-n[data-d="-1"]');await p.click('.sb-n[data-d="-1"]');await p.waitForTimeout(150);
 ok(await p.locator('.sb-bad').count()>0,'two risers fewer: the rise goes over and it says so');
 await p.click('.sb-best');await p.waitForTimeout(150);
 await p.click('.sb-type[data-k=ext]');await p.waitForTimeout(150);
 ok(await p.inputValue('.sb-tread')==='grating'&&await p.inputValue('.sb-use')==='utility','external steel: grating treads, a utility stair');
 await p.click('.sb-type[data-k=spiral]');await p.waitForTimeout(150);
 ok(await p.isVisible('.sb-dia'),'spiral asks the diameter');
 await p.click('.sb-type[data-k=straight]');await p.selectOption('.sb-use','private');await p.selectOption('.sb-tread','oak');await p.selectOption('.sb-bal','glass');await p.waitForTimeout(150);
 ok(/Oak/.test(await p.innerText('.sb-order'))&&/14 risers/.test(await p.innerText('.sb-order')),'the order has the stair, steps and oak treads');
 await p.screenshot({path:SP+'stair-builder.png'});
 await p.click('.sbuild [type=submit]');await p.waitForTimeout(400);
 const o=await p.evaluate(()=>{const a=window.__np.get();return a[a.length-1];});
 const len=await p.evaluate((o)=>window.__np.mm(Math.abs(o.b[0]-o.a[0])),o);
 ok(o.k==='stairs'&&o.n===14&&o.sb&&o.sb.bal==='glass'&&Math.abs(len-13*249)<30,'on the plan: a straight stair, 14 risers, its design kept, '+Math.round(len)+' mm long');
 await p.evaluate(()=>{const a=window.__np.get();window.__np.pick(a.length-1);});await p.waitForTimeout(300);
 await p.click('.nfs-build');await p.waitForTimeout(300);
 ok(await p.isVisible('.sbuild')&&await p.inputValue('.sb-bal')==='glass','Properties opens it again in the builder, as it was');
 const n0=await p.evaluate(()=>window.__np.pages().length);
 await p.click('.sb-side');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>window.__np.pages().length)===n0+1,'📐 Draw the side view makes a new page');
 ok(await p.evaluate(()=>{const pg=window.__np.pages();const o=pg[pg.length-1].objs;return o.some(q=>/String 275/.test(q.s||''))&&o.filter(q=>q.t==='rect'&&q.fill).length>=2;}),'the side view shows the string and the newels');
 await p.screenshot({path:SP+'stair-side.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h590: ${bad} failed`:'h590: all passed');await b.close();process.exit(bad?1:0);
})();
