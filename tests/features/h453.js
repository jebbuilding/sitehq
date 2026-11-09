// Drawing: doors you can size and place, and handles you can see past (made-up sizes). A wall is drawn and a door
// tapped onto it: a bar asks for the door width and how far it is from the wall's end; 838 wide at 1000 from the end
// puts it exactly there. Selecting the door and dragging its middle moves it (it doesn't stretch). The end handles on
// a short thing are small see-through rings with a cross, and the one being dragged is just a cross. Writes h453*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const HOOK='  let lenObj = null;';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2,'test hook found once');
page_src=page_src.replace(HOOK,HOOK+'window.__np=()=>doc;window.__mm=(u)=>realMm(u);window.__xf=()=>[s,ox,oy];');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 const box=await (await p.$('.np .np-cv')).boundingBox();const X=x=>box.x+x,Y=y=>box.y+y;
 const tool=t=>p.evaluate(t=>document.querySelector(`.np .np-t[data-t="${t}"]`).click(),t);
 const shape=k=>p.evaluate(k=>{const s=document.querySelector('.np .np-shape');s.value=k;s.dispatchEvent(new Event('change'));},k);
 await shape('wall');await p.mouse.move(X(200),Y(300));await p.mouse.down();for(let i=1;i<=10;i++)await p.mouse.move(X(200+i*50),Y(300));await p.mouse.up();await p.waitForTimeout(300);
 await p.keyboard.press('Escape');
 await shape('door');await p.mouse.click(X(400),Y(302));await p.waitForTimeout(400);
 ok(await p.isVisible('.np-opbar'),'placing a door shows the door width bar');
 ok(await p.isVisible('.np-opbar .nob-p'),'with the distance from the wall end');
 await p.fill('.np-opbar .nob-w','838');await p.fill('.np-opbar .nob-p','1000');await p.click('.np-opbar button[type=submit]');await p.waitForTimeout(300);
 const st=await p.evaluate(()=>{const d=window.__np();const w=d.objs.find(o=>o.k==='wall'),dr=d.objs.find(o=>o.k==='door');const L=Math.hypot(dr.b[0]-dr.a[0],dr.b[1]-dr.a[1]);const t0=Math.min(dr.a[0],dr.b[0])-Math.min(w.a[0],w.b[0]);return {w:Math.round(window.__mm(L)),from:Math.round(window.__mm(t0)),y:[dr.a[1],dr.b[1],w.a[1]]}});
 ok(Math.abs(st.w-838)<=1&&Math.abs(st.from-1000)<=1&&Math.abs(st.y[0]-st.y[2])<1,'the door is 838 wide, 1000 from the wall end, in the wall ('+JSON.stringify(st)+')');
 /* select it and drag its middle: it moves along, it doesn't stretch */
 await tool('move');
 const mid=await p.evaluate(()=>{const dr=window.__np().objs.find(o=>o.k==='door');return [(dr.a[0]+dr.b[0])/2,(dr.a[1]+dr.b[1])/2]});
 const toScr=await p.evaluate(([mx,my])=>{const cv=document.querySelector('.np .np-cv');return null},mid);void toScr;
 /* tap the middle of the door where it is on screen */
 const sp=await p.evaluate(()=>{const [sc,ox,oy]=window.__xf();const dr=window.__np().objs.find(o=>o.k==='door');return [(dr.a[0]+dr.b[0])/2*sc+ox,(dr.a[1]+dr.b[1])/2*sc+oy]});
 const sx=sp[0],sy=sp[1];
 await p.mouse.click(box.x+sx,box.y+sy);await p.waitForTimeout(200);
 const selOk=await p.evaluate(()=>{const v=document.querySelector('.np-opbar');return !!v&&!v.hidden});
 ok(selOk,'tapping the door selects it and shows its bar');
 await p.screenshot({path:'h453-selected.png'});
 const before=await p.evaluate(()=>{const dr=window.__np().objs.find(o=>o.k==='door');return [dr.a.slice(),dr.b.slice()]});
 await p.mouse.move(box.x+sx,box.y+sy);await p.mouse.down();for(let i=1;i<=10;i++)await p.mouse.move(box.x+sx+i*6,box.y+sy);await p.mouse.up();await p.waitForTimeout(300);
 const after=await p.evaluate(()=>{const dr=window.__np().objs.find(o=>o.k==='door');return [dr.a.slice(),dr.b.slice()]});
 const la=Math.hypot(before[1][0]-before[0][0],before[1][1]-before[0][1]),lb=Math.hypot(after[1][0]-after[0][0],after[1][1]-after[0][1]);
 ok(Math.abs(la-lb)<0.5&&Math.abs((after[0][0]-before[0][0])-(after[1][0]-before[1][0]))<0.5&&after[0][0]!==before[0][0],'dragging its middle moves the whole door ('+(after[0][0]-before[0][0]).toFixed(1)+' along), same width');
 /* standard sizes: the door picked as a 762 internal door */
 await p.mouse.click(box.x+sx+60,box.y+sy);await p.waitForTimeout(200);
 const dm=await p.evaluate(()=>{const [sc,ox,oy]=window.__xf();const dr=window.__np().objs.find(o=>o.k==='door');return [(dr.a[0]+dr.b[0])/2*sc+ox,(dr.a[1]+dr.b[1])/2*sc+oy]});
 await p.mouse.click(box.x+dm[0],box.y+dm[1]);await p.waitForTimeout(200);
 const opts=await p.$$eval('.np-opbar .nob-std option',o=>o.map(x=>x.textContent));
 ok(opts.some(t=>t.startsWith('762 ')&&/internal/.test(t))&&opts.some(t=>/914 external/.test(t)),'doors come with standard sizes ('+opts.length+')');
 await p.selectOption('.np-opbar .nob-std',{label:opts.find(t=>t.startsWith('762 '))});await p.waitForTimeout(300);
 const w762=await p.evaluate(()=>{const dr=window.__np().objs.find(o=>o.k==='door');return Math.round(window.__mm(Math.hypot(dr.b[0]-dr.a[0],dr.b[1]-dr.a[1])))});
 ok(w762===762,'picking 762 makes the door 762 wide ('+w762+')');
 /* a window on the wall: width and where along it */
 await p.keyboard.press('Escape');
 await shape('window');await p.mouse.click(X(600),Y(300));await p.waitForTimeout(400);
 ok(await p.isVisible('.np-opbar')&&/Window/i.test(await p.innerText('.np-opbar .nob-t')),'placing a window shows its size bar');
 ok(await p.isVisible('.np-opbar .nob-p'),'with where it is along the wall');
 await p.fill('.np-opbar .nob-w','1200');await p.fill('.np-opbar .nob-p','3000');await p.click('.np-opbar button[type=submit]');await p.waitForTimeout(300);
 const wn=await p.evaluate(()=>{const d=window.__np();const w=d.objs.find(o=>o.k==='wall'),wi=d.objs.find(o=>o.k==='window');const W=Math.abs(wi.b[0]-wi.a[0]);const t0=Math.min(wi.a[0],wi.b[0])-Math.min(w.a[0],w.b[0]);return {w:Math.round(window.__mm(W)),from:Math.round(window.__mm(t0))}});
 ok(Math.abs(wn.w-1200)<=1&&Math.abs(wn.from-3000)<=1,'the window is 1200 wide, 3000 from the wall end ('+JSON.stringify(wn)+')');
 /* a bath: standard size 1700 × 750 */
 await p.keyboard.press('Escape');
 await shape('bath');await p.mouse.click(X(400),Y(600));await p.waitForTimeout(400);
 const bo=await p.$$eval('.np-opbar .nob-std option',o=>o.map(x=>x.textContent));
 ok(await p.isVisible('.np-opbar .nob-d')&&bo.some(t=>/1700 × 750/.test(t)),'a bath shows width × depth and its standard sizes');
 await p.selectOption('.np-opbar .nob-std',{label:'1700 × 750'});await p.waitForTimeout(300);
 const bs=await p.evaluate(()=>{const b=window.__np().objs.find(o=>o.k==='bath');return [Math.round(window.__mm(Math.abs(b.b[0]-b.a[0]))),Math.round(window.__mm(Math.abs(b.b[1]-b.a[1])))]});
 ok(bs[0]===1700&&bs[1]===750,'the bath is 1700 × 750 ('+bs+')');
 await p.screenshot({path:'h453-sizes.png'});
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h453: '+bad+' FAILED':'h453: all passed');
 await b.close()})();
