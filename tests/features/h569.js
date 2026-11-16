// Quantities → a draft estimate (made-up drawing): a drawing with cavity walls on it, 🧮 Quantities, 📝 Make a draft
// estimate – a draft estimate is saved with a "Materials from …" section and each material as a quantity line to price.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},scale:()=>doc.scale};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'Rear extension',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 await p.evaluate(()=>window.__np.set([{t:'shape',k:'cavity',a:[100,100],b:[400,100],c:'#111',w:3,th:20},{t:'shape',k:'cavity',a:[400,100],b:[400,300],c:'#111',w:3,th:20},{t:'shape',k:'cavity',a:[400,300],b:[100,300],c:'#111',w:3,th:20}]));await p.waitForTimeout(700);
 ok(/Walls [\d.]+ m/.test(await p.innerText('.np-livq')),'the running total shows the wall length ('+await p.innerText('.np-livq')+')');
 await p.click('.np-livq');await p.waitForTimeout(400);
 ok(await p.isVisible('.qtybox'),'tapping it opens 🧮 Quantities');
 ok(await p.isVisible('.qest'),'Quantities has 📝 Make a draft estimate');
 await p.click('.qest');await p.waitForTimeout(800);
 const est=await p.evaluate(()=>Object.values(window.__st).filter(v=>v&&v.kind==='sale'&&v.type==='estimate'&&v.lines&&v.lines[0]&&/Materials from Rear extension/.test(v.lines[0].d||'')));
 ok(est.length===1&&est[0].status==='draft','a draft estimate is saved');
 const ls=est[0]?est[0].lines.slice(1):[];
 ok(ls.length>0&&ls.every(l=>l.k==='mat')&&ls.some(l=>l.m==='q'&&l.q>0),'each material is a line with its quantity, ready to price ('+ls.length+' lines, e.g. '+(ls[0]&&ls[0].d+' '+ls[0].q+' '+ls[0].u)+')');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h569: ${bad} failed`:'h569: all passed');await b.close();process.exit(bad?1:0);
})();
