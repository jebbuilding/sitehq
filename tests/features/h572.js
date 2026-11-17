// The drawing screen on an iPad (made-up drawing), both ways round, with a touch screen: nothing wider than the screen,
// every tool button big enough for a finger (44 px), the ✨ Smart pen works with a finger (real touch events), the
// number pad fits on screen, and Properties fits on screen.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},view:()=>[s,ox,oy],pick:(i)=>{sel=i;draw();fineOpen();}};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();
 for(const [W,H,way] of [[1024,768,'landscape'],[768,1024,'portrait']]){
 const ctx=await b.newContext({viewport:{width:W,height:H},hasTouch:true,isMobile:true,deviceScaleFactor:2,userAgent:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 const wide=await p.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.querySelector('.np').scrollWidth)-innerWidth);
 ok(wide<=0,way+': nothing wider than the screen');
 for(const g of ['easy','draw','edit','measure']){
  await p.tap('.np-gt[data-gt='+g+']');await p.waitForTimeout(150);
  const small=await p.evaluate(()=>[...document.querySelectorAll('.np-bar button,.np-bar label.np-t')].filter(x=>x.offsetParent).filter(x=>{const r=x.getBoundingClientRect();return r.width<43.5||r.height<43.5;}).map(x=>(x.title||x.textContent).trim().slice(0,20)+' '+Math.round(x.getBoundingClientRect().width)+'×'+Math.round(x.getBoundingClientRect().height)));
  ok(!small.length,way+' · '+g+': every button big enough for a finger'+(small.length?' – too small: '+small.join(', '):''));
 }
 /* a finger draws a rough box with the Smart pen */
 await p.tap('.np-gt[data-gt=easy]');await p.tap('.np-t[data-t=smart]');
 const bb=await p.locator('.np-cv').boundingBox();const [s,ox,oy]=await p.evaluate(()=>window.__np.view());
 const at=(x,y)=>[bb.x+ox+x*s,bb.y+oy+y*s];
 const pts=[];const corner=[[200,200],[450,196],[454,380],[198,384],[202,203]];
 for(let i=1;i<corner.length;i++)for(let k=0;k<12;k++){const a=corner[i-1],c2=corner[i];pts.push(at(a[0]+(c2[0]-a[0])*k/12+(Math.random()-.5)*3,a[1]+(c2[1]-a[1])*k/12+(Math.random()-.5)*3));}
 pts.push(at(...corner[corner.length-1]));
 const cdp=await ctx.newCDPSession(p);
 const tp=(q)=>[{x:q[0],y:q[1],id:1,radiusX:8,radiusY:8,force:0.5}];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:tp(pts[0])});
 for(const q of pts.slice(1))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:tp(q)});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(400);
 const o=await p.evaluate(()=>window.__np.get());
 ok(o.length===1&&o[0].t==='rect',way+': a finger drawing a rough box with the Smart pen gets a box ('+o.map(x=>x.t).join(',')+')');
 /* the number pad fits */
 await p.tap('.np-t[data-t=line]');
 const A=at(200,450),B2=at(350,450);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:tp(A)});
 for(let k=1;k<=8;k++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:tp([A[0]+(B2[0]-A[0])*k/8,A[1]])});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(400);
 ok(!(await p.isVisible('.nlb-pad')),way+': the number pad stays shut until asked for');
 await p.click('.nlb-morebtn');await p.click('.nlb-padb');await p.waitForTimeout(200);
 ok(await p.isVisible('.nlb-pad'),way+': ⋯ then 🔢 opens it');
 const lb=await p.locator('.np-lenbar').boundingBox();
 ok(lb&&lb.x>=0&&lb.x+lb.width<=W+0.5&&lb.y+lb.height<=H,way+': the length bar and its number pad fit on the screen');
 /* Properties fits */
 await p.evaluate(()=>window.__np.pick(window.__np.get().length-1));await p.waitForTimeout(300);
 const fbb=await p.locator('.np-finebox').boundingBox();
 ok(fbb&&fbb.x>=0&&fbb.x+fbb.width<=W+0.5,way+': Properties fits across the screen');
 await p.screenshot({path:'C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/ipad-'+way+'.png'});
 }catch(e){console.log('FAIL',way,e.message);bad++;}
 await ctx.close();}
 console.log(bad?`h572: ${bad} failed`:'h572: all passed');await b.close();process.exit(bad?1:0);
})();
