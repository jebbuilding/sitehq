// Steel beams and posts on a drawing (made-up drawing): a beam's Properties let you pick its type (UB, UC, RSJ,
// channel, box, flitch, glulam, LVL, timber, lintel…) and then its size from that type's list – the drawing and the
// beam schedule show e.g. "203×133×25 UB"; "Other size…" takes any size typed in. A post / column picks its type
// (steel UC, box, round, timber, oak, brick or block pier, concrete, prop) and size; it is redrawn at that size with
// its size written under it.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},pick:(i)=>{sel=i;draw();fineOpen();},scale:()=>doc.scale};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>window.__np.scale())>0,'the drawing has a scale ('+await p.evaluate(()=>window.__np.scale())+')');
 await p.evaluate(()=>window.__np.set([{t:'shape',k:'beam',a:[150,200],b:[650,200],c:'#111',w:3},{t:'shape',k:'column',a:[140,190],b:[160,210],c:'#111',w:3},{t:'shape',k:'column',a:[640,190],b:[660,210],c:'#111',w:3},{t:'shape',k:'column',a:[400,400],b:[420,420],c:'#111',w:3}]));
 await p.evaluate(()=>window.__np.pick(0));await p.waitForTimeout(300);
 ok(await p.isVisible('.nfsteel')&&await p.isVisible('.nfst-padrow'),'a beam\'s Properties show Type, Size and Padstones');
 const types=await p.evaluate(()=>[...document.querySelectorAll('.nfst-t option')].map(o=>o.textContent));
 ok(types.some(t=>/UB/.test(t))&&types.some(t=>/RSJ/.test(t))&&types.some(t=>/PFC/.test(t))&&types.some(t=>/Glulam/.test(t))&&types.some(t=>/C24/.test(t)),'types include UB, RSJ, channel, glulam and timber ('+types.length+')');
 await p.selectOption('.nfst-t','UB');await p.waitForTimeout(200);
 const sizes=await p.evaluate(()=>[...document.querySelectorAll('.nfst-s option')].map(o=>o.textContent));
 ok(sizes.includes('203×133×25')&&!sizes.includes('152×152×23'),'the sizes are the UB sizes only');
 await p.selectOption('.nfst-s','203×133×25');await p.waitForTimeout(200);
 let o=await p.evaluate(()=>window.__np.get()[0]);
 ok(o.bt==='UB'&&o.bz==='203×133×25'&&o.sec==='203×133×25 UB','the beam is a 203×133×25 UB');
 ok(/25\.1 kg/.test(await p.innerText('.nfst-info')),'it says about 25.1 kg a metre');
 await p.selectOption('.nfst-s','__other');await p.fill('.nfst-x','254x146x31');await p.click('.nfst-xrow [type=submit]');await p.waitForTimeout(200);
 o=await p.evaluate(()=>window.__np.get()[0]);
 ok(o.sec==='254×146×31 UB','Other size… takes a typed size ('+o.sec+')');
 await p.selectOption('.nfst-t','RSJ');await p.selectOption('.nfst-s','127×76×13');await p.waitForTimeout(200);
 o=await p.evaluate(()=>window.__np.get()[0]);
 ok(o.sec==='127×76×13 RSJ','changed to an RSJ');
 /* posts */
 await p.evaluate(()=>window.__np.pick(1));await p.waitForTimeout(300);
 ok(await p.isVisible('.nfsteel')&&!(await p.isVisible('.nfst-padrow')),'a post\'s Properties show Type and Size');
 await p.selectOption('.nfst-t','uc');await p.selectOption('.nfst-s','203×203×46');await p.waitForTimeout(200);
 const sc=await p.evaluate(()=>window.__np.scale());
 o=await p.evaluate(()=>window.__np.get()[1]);
 const wmm=(o.b[0]-o.a[0]);
 ok(o.ct==='uc'&&o.cs==='203×203×46'&&Math.abs(((o.a[0]+o.b[0])/2)-150)<0.01,'post 1 is a 203 UC, still in the same place');
 await p.evaluate(()=>window.__np.pick(2));await p.waitForTimeout(300);
 await p.selectOption('.nfst-t','timber');await p.selectOption('.nfst-s','150×150');await p.waitForTimeout(200);
 const o2=await p.evaluate(()=>window.__np.get()[2]);
 ok(o2.ct==='timber'&&Math.abs((o2.b[0]-o2.a[0])/wmm-150/203)<0.02,'post 2 is a 150 timber post, drawn smaller than the 203 UC');
 await p.evaluate(()=>window.__np.pick(3));await p.waitForTimeout(300);
 await p.selectOption('.nfst-t','brick');await p.waitForTimeout(200);
 ok((await p.evaluate(()=>window.__np.get()[3])).ct==='brick','post 3 is a brick pier');
 await p.click('.nfx');await p.evaluate(()=>window.__np.pick(null));await p.waitForTimeout(300);
 await p.screenshot({path:'C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/np-steel.png',clip:{x:190,y:320,width:420,height:220}});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h567: ${bad} failed`:'h567: all passed');await b.close();process.exit(bad?1:0);
})();
