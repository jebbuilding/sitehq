// Two fixes (made-up people and drawings).
// Drawing: pick the pen, a thick size and another colour, then a wall and a door. The wall and door keep their own
// standard line weight (they used to take the pen's thickness and come out as one solid line).
// Timesheets: with nothing logged this week it says so and points at the latest week with hours; 📊 Recent weeks
// shows each trade's hours for 8 weeks with a Team total, every figure a button to that week; 📚 All timesheets lists
// every week a trade has sent and opens one. Writes h608*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const HOOK='  q(".np-shape").onchange = (e) => {';
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.split(HOOK).length===2,'drawing test hook found once');
ok(page_src.includes('const S = {\n  db: null'),'state hook found');
page_src=page_src.replace(HOOK,'window.__np=()=>doc;'+HOOK).replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true');localStorage.setItem('jeb.splash','1')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 let p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* ---- drawing ---- */
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 const box=await (await p.$('.np .np-cv')).boundingBox();const X=x=>box.x+x,Y=y=>box.y+y;
 const shape=k=>p.evaluate(k=>{const s=document.querySelector('.np .np-shape');s.value=k;s.dispatchEvent(new Event('change'));},k);
 const drag=async y=>{await p.mouse.move(X(200),Y(y));await p.mouse.down();for(let i=1;i<=10;i++)await p.mouse.move(X(200+i*50),Y(y));await p.mouse.up();await p.waitForTimeout(300);await p.keyboard.press('Escape');};
 await shape('wall');await drag(200);
 await p.evaluate(()=>document.querySelector('.np .np-t[data-t="pen"]').click());await p.waitForTimeout(200);
 await p.evaluate(()=>document.querySelectorAll('.np .np-c[data-c]')[2].click());
 await p.evaluate(()=>{const w=document.querySelectorAll('.np .np-wb');w[w.length-1].click()});await p.waitForTimeout(200);
 await drag(300);
 await shape('wall');await drag(400);
 await shape('door');await p.mouse.click(X(400),Y(402));await p.waitForTimeout(400);await p.keyboard.press('Escape');
 const ob=await p.evaluate(()=>window.__np().objs.map(o=>({t:o.t,k:o.k,c:o.c,w:o.w})));
 const w1=ob.find(o=>o.k==='wall'),pen=ob.find(o=>o.t==='stroke'),w2=ob.filter(o=>o.k==='wall')[1],dr=ob.find(o=>o.k==='door');
 ok(pen&&pen.w>w1.w,'the pen line is thick ('+(pen&&pen.w)+')');
 ok(w2&&w2.w===w1.w,'a wall drawn after a thick pen keeps the standard weight ('+(w2&&w2.w)+' = '+w1.w+')');
 ok(dr&&dr.w===w1.w,'so does a door ('+(dr&&dr.w)+')');
 ok(w2&&w2.c===pen.c,'it still takes the colour picked');
 await p.screenshot({path:'h608-draw.png',clip:{x:box.x,y:box.y,width:800,height:500}});
 const p0=p;await p0.close();p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* ---- timesheets: hours three weeks ago only ---- */
 const wk=await p.evaluate(async()=>{const S=window.__S;const d=new Date();d.setDate(d.getDate()-21);const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);const f=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
   const ids=Object.keys(S.data.entries||{}).concat(Object.keys(S.team||{}));const now=new Date();const mon=new Date(now);mon.setDate(now.getDate()-((now.getDay()+6)%7));
   /* clear everyone's entries so only ours count */
   for(const [k] of Object.entries(window.__st)) if(/^sheets\/[^/]+\/entries\//.test(k)) await S.db.doc(k).delete();
   for(let i=0;i<3;i++){const x=new Date(d);x.setDate(d.getDate()+i);await S.db.doc('sheets/emp1/entries/aw'+i).set({type:'hours',date:f(x),job:'',start:'08:00',finish:'16:30',breakMin:30,hours:8,notes:'',approved:i<2,created:1,updated:1});}
   return f(d);});
 await p.waitForTimeout(700);
 await p.evaluate(()=>{const S=window.__S;S.otab='time';const n=new Date();n.setHours(0,0,0,0);n.setDate(n.getDate()-((n.getDay()+6)%7));S.week=n;window.render()});await p.waitForTimeout(600);
 ok(await p.isVisible('.aw-empty'),'an empty week says so and points at the latest week with hours');
 ok(await p.isVisible('.aw-card[open]'),'📊 Recent weeks is shown, open');
 const cells=await p.evaluate(()=>[...document.querySelectorAll('.aw-card tbody tr')].map(r=>r.innerText.replace(/\s+/g,' ')));
 ok(cells.some(t=>/\b24\b/.test(t))&&cells.some(t=>/^Team/.test(t)&&/\b24\b/.test(t)),'it shows 24 h that week for the trade and the team ('+cells.slice(-2).join(' / ')+')');
 await p.screenshot({path:'h608-weeks.png'});
 await p.click('.aw-empty .aw-go');await p.waitForTimeout(500);
 ok(await p.evaluate(wk=>{const d=window.__S.week;const f=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');return f(d)===wk},wk),'Go to that week opens that week');
 ok(await p.locator('details.card[data-id="emp1"] .aw-all').count()===1,'each trade has 📚 All timesheets');
 await p.evaluate(()=>{const S=window.__S;S.week=new Date();window.render()});await p.waitForTimeout(400);
 await p.click('.aw-card .aw-all[data-w="emp1"]');await p.waitForTimeout(400);
 const v=await p.innerText('#viewer-body');
 ok(/all timesheets/.test(v)&&/24/.test(v)&&/1 to approve/.test(v),'All timesheets lists the week, its hours and what is to approve');
 await p.screenshot({path:'h608-all.png'});
 await p.click('#viewer-body .aw-wk');await p.waitForTimeout(500);
 ok(await p.isVisible('details.card[data-id="emp1"][open]'),'Open › shows that week with their card open');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h608: ${bad} failed`:'h608: all passed');await b.close();process.exit(bad?1:0);
})();
