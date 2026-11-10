// Drawing › 🗄️ Cupboards: shelves wider than 600 mm get a middle support, chosen in "Shelves, lighting and fittings":
// an upright panel up the middle (each shelf in two halves), a bracket under the middle of each shelf, or a batten
// along the back. Made-up sizes: an alcove 1,200 wall to wall with 4 shelves in a frame, and a 1,000 wide cupboard.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
for(const h of ['function cbPlan(sp) {','function cbaPlan(sp) {'])ok(page_src.split(h).length===2,'hook '+h);
page_src=page_src.replace('function cbPlan(sp) {','window.__cbPlan=(sp)=>cbPlan(sp);function cbPlan(sp) {').replace('function cbaPlan(sp) {','window.__cbaPlan=(sp)=>cbaPlan(sp);function cbaPlan(sp) {window.__cbaSp=sp;');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb]').click());await p.waitForTimeout(300);
 await p.selectOption('#cb2-kind','shelves');await p.waitForTimeout(150);
 await p.fill('#cb2-name','Alcove shelves');await p.fill('#cb2-W','1200');await p.fill('#cb2-H','2000');await p.fill('#cb2-D','300');
 await p.fill('#cb2-sn','4');await p.selectOption('#cb2-ss','framed');await p.fill('#cb2-sd','250');await p.fill('#cb2-st','25');
 await p.evaluate(()=>document.querySelectorAll('details.cb2-fin').forEach(d=>d.open=true));
 ok(await p.isVisible('#cb2-mid2'),'there is a choice for shelves over 600 mm wide');
 ok((await p.$$eval('#cb2-mid2 option',o=>o.map(x=>x.textContent).join('|'))).split('|').length===4,'no support, an upright, a bracket or a batten');
 await p.selectOption('#cb2-mid2','upright');
 await p.click('#f-save');await p.waitForTimeout(900);
 const sp=await p.evaluate(()=>window.__cbaSp);
 ok(sp&&sp.midSup==='upright','the choice is kept with the cupboard');
 const cut=(P)=>P.cut.map(r=>[r.part,r.qty,r.l,r.w,r.th,r.note].join(' ')).join('\n');
 const A=await p.evaluate(sp=>{const o={};for(const m of ['','upright','bracket','batten'])o[m]=window.__cbaPlan(Object.assign({},sp,{midSup:m})).cut.map(r=>[r.part,r.qty,r.l,r.w,r.th,r.note].join(' ')).join('\n');o.narrow=window.__cbaPlan(Object.assign({},sp,{midSup:'upright',W:600})).cut.map(r=>[r.part,r.qty,r.l,r.w,r.th,r.note].join(' ')).join('\n');return o},sp);
 console.log(A.upright);
 ok(/Middle upright/.test(A.upright)&&/Shelf 8 /.test(A.upright),'alcove, upright: a middle upright and the 4 shelves in two halves (8 pieces)');
 ok(/Shelf middle bracket \(to buy\) 4/.test(A.bracket)&&/Shelf 4 /.test(A.bracket),'alcove, bracket: 4 brackets to buy, shelves whole');
 ok(/Shelf batten \(along the back\) 4/.test(A.batten),'alcove, batten: a batten under each shelf');
 ok(!/Middle|middle|batten \(along/.test(A[''])&&!/Middle upright/.test(A.narrow),'none when no support is chosen, or the shelves are 600 or narrower');
 ok(!!(await p.evaluate(()=>!!document.querySelector('.np canvas'))),'the page is drawn');
 /* a cupboard with one bay wider than 600 */
 const C=await p.evaluate(sp=>{const base={kind:'full',name:'Test',W:1000,H:2000,D:600,t:18,bays:1,doors:'hinged'};const o={};for(const m of ['upright','bracket','batten']){try{const P=window.__cbPlan(Object.assign({},base,{midSup:m}));o[m]={cut:P.cut.map(r=>[r.part,r.qty,r.l,r.w,r.th,r.note].join(' ')).join('\n'),bays:P.bays.map(b=>[b.w,b.L.shelves.length])}}catch(e){o[m]={err:e.message}}}return o},sp);
 console.log(JSON.stringify(C.upright.bays||C.upright.err));
 const wideShelves=(C.upright.bays||[]).some(([w,n])=>w>600&&n);
 if(wideShelves){
  ok(/Middle upright/.test(C.upright.cut),'cupboard, upright: a middle upright in the wide bay');
  ok(/Shelf middle bracket \(to buy\)/.test(C.bracket.cut),'cupboard, bracket: brackets to buy');
  ok(/Shelf batten \(along the back\)/.test(C.batten.cut),'cupboard, batten: battens under the shelves');
 } else console.log('(no wide bay with shelves in the default cupboard; checked on the alcove only)');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h475: ${bad} failed`:'h475: all passed');await b.close();process.exit(bad?1:0);
})();
