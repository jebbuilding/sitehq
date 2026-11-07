// Room sketch inside the drawing tool (drawing/room-sketch.js + the "roomsk" tool in drawing/paving.js; spec
// docs/specs/room-sketch.md): pick ✍️ Room sketch, draw a wobbly L-shaped room on the drawing → six straight walls
// where it was drawn; tap each wall to measure it (a chimney breast on wall A, one wall 15 mm out); once all are
// measured it is redrawn at the drawing's scale. A second room: a corner set to 100°, a wall split in two with the
// side's overall length kept. Save the drawing and check what was saved. Also the shape maths (straightening, the
// breakdown row, the gap at another corner, sides that don't add up). Writes h415-sketch.png, h415-scaled.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;')
  .replace('function rsSegs(w) {','window.rsSegs=rsSegs;window.rsGeom=rsGeom;window.rsGroups=rsGroups;window.rsStraighten=rsStraighten;\nfunction rsSegs(w) {');
if(!page_src.includes('window.rsSegs=rsSegs'))throw new Error('h415: rsSegs anchor not found');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const tool=t=>p.evaluate(t=>document.querySelector(`.np .np-t[data-t="${t}"]`).click(),t);
 /* a hand-drawn line through these screen points, with a wobble */
 const drawLine=async(pts,wob)=>{await p.mouse.move(pts[0][0],pts[0][1]);await p.mouse.down();for(let k=1;k<pts.length;k++){const [x0,y0]=pts[k-1],[x1,y1]=pts[k];for(let i=1;i<=12;i++){const t=i/12;await p.mouse.move(x0+(x1-x0)*t+Math.sin(i+k)*wob,y0+(y1-y0)*t+Math.cos(i*1.3+k)*wob);}}await p.mouse.up();await p.waitForTimeout(150);};
 const wallAt=async(x,y)=>{await p.mouse.click(x,y);await p.waitForTimeout(150);return (await p.isHidden('#sheet'))?'':await p.textContent('#sheettitle');};
 /* the room redraws in proportion as walls are measured, so look around where the wall was for the one wanted */
 const wallNear=async(x,y,want)=>{for(const r of [0,15,30,45,60,80,100])for(const [dx,dy] of [[0,0],[0,r],[0,-r],[r,0],[-r,0],[r,r],[-r,-r],[r,-r],[-r,r]]){if(!r&&dx)continue;const t=await wallAt(x+dx,y+dy);if(t===want)return t;if(t)await p.evaluate(()=>document.getElementById('f-cancel').click());}return '';};
 /* the latest room object on the drawing page, as it would be saved */
 const rooms=()=>p.evaluate(()=>window.__rooms());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{const t=document.querySelector('.tab[data-t=draw]');t.click();});await p.waitForTimeout(400);
 ok(!(await p.$('#dw-room')),'no separate Room sketch button on the Drawings tab');
 await p.click('#dw-new');await p.waitForTimeout(800);
 ok(await p.isVisible('.np .np-t[data-t=roomsk]'),'✍️ Room sketch is a tool in the drawing tool');
 /* reach the page's objects through the drawing's own save, without saving: the canvas draws them, so ask the room objects via a hook */
 await p.evaluate(()=>{window.__rooms=()=>JSON.parse(JSON.stringify(window.__npDoc?window.__npDoc.objs.filter(o=>o.t==='rsk'):[]));});
 await tool('roomsk');
 const cv=await p.$('.np .np-cv');const box=await cv.boundingBox();const X=x=>box.x+x,Y=y=>box.y+y;
 /* an L shape: 240 × 220 px with the corner cut out */
 await drawLine([[X(150),Y(160)],[X(390),Y(165)],[X(388),Y(260)],[X(280),Y(262)],[X(282),Y(380)],[X(152),Y(378)],[X(150),Y(162)]],3);
 ok(/Still to measure: A, B, C, D, E, F\./.test(await lastToast()),'drawn on the drawing: six walls A–F: '+await lastToast());
 ok(await p.isHidden('#viewer')&&await p.isVisible('.np'),'stays on the drawing (no other page)');
 await (await p.$('.np .np-stage')).screenshot({path:'h415-sketch.png'});
 /* tap each wall on the drawing and type its length; wall A gets a chimney breast */
 const mids={'Wall A':[270,163],'Wall B':[389,212],'Wall C':[334,261],'Wall D':[281,320],'Wall E':[216,379],'Wall F':[151,270]};
 let t=await wallAt(X(270),Y(163));ok(t==='Wall A','tap wall A opens its form over the drawing: '+t);
 await p.waitForTimeout(100);await p.fill('#rs-len','3250');await p.click('#rs-fadd');await p.fill('#rs-fo0','2000');await p.fill('#rs-fw0','1400');await p.fill('#rs-fd0','350');
 await p.click('#f-save');ok(/runs past the end/.test(await p.innerText('#f-err')),'a chimney breast past the end of the wall is refused');
 await p.fill('#rs-fo0','950');await p.click('#f-save');await p.waitForTimeout(150);
 const lens={'Wall B':'1500','Wall C':'1450','Wall D':'1700','Wall E':'1800','Wall F':'3215'};
 for(const w of Object.keys(lens)){t=await wallNear(X(mids[w][0]),Y(mids[w][1]),w);ok(t===w,'tapped '+w+(t!==w?' (got '+t+')':''));if(t){await p.waitForTimeout(100);await p.fill('#rs-len',lens[w]);await p.click('#f-save');await p.waitForTimeout(150);}}
 ok(/out by 15 mm/.test(await lastToast()),'all measured, 15 mm out: '+await lastToast());
 await p.waitForTimeout(300);await (await p.$('.np .np-stage')).screenshot({path:'h415-scaled.png'});
 /* a second room: a rectangle; corner 2 set to 100°, the top wall split with its overall 4,000 kept */
 await tool('roomsk');
 await drawLine([[X(560),Y(160)],[X(800),Y(160)],[X(800),Y(320)],[X(560),Y(320)],[X(560),Y(162)]],1.5);
 ok(/Still to measure: A, B, C, D\./.test(await lastToast()),'second room: four walls');
 /* the drawing's other tools carry on working with rooms on the page (a page error fails the test) */
 const n0=await p.evaluate(()=>document.querySelectorAll('.toast').length);
 await tool('line');await p.mouse.move(X(450),Y(430));await p.mouse.down();await p.mouse.move(X(520),Y(432));await p.mouse.move(X(600),Y(430));await p.mouse.up();await p.waitForTimeout(150);
 await tool('rect');await p.mouse.move(X(620),Y(400));await p.mouse.down();await p.mouse.move(X(680),Y(440));await p.mouse.move(X(700),Y(460));await p.mouse.up();await p.waitForTimeout(150);
 await tool('move');await p.mouse.click(X(650),Y(430));await p.waitForTimeout(150);
 ok(await p.isHidden('#sheet'),'with Select, tapping near things does not open a room wall\'s form');
 /* a door from the symbols, dropped on the room's top wall, sits in the wall */
 await p.evaluate(()=>{const s=document.querySelector('.np .np-shape');s.value='door';s.dispatchEvent(new Event('change'));});
 await p.mouse.click(X(640),Y(166));await p.waitForTimeout(200);
 await tool('roomsk');
 t=await wallAt(X(800),Y(240));ok(t==='Wall B','tap its wall B');await p.waitForTimeout(100);
 ok((await p.inputValue('#rs-ang'))==='90','corner 2 starts square');await p.fill('#rs-ang','100');await p.click('#f-save');await p.waitForTimeout(150);
 t=await wallAt(X(680),Y(160));ok(t==='Wall A','tap its wall A');await p.waitForTimeout(100);await p.fill('#rs-len','4000');await p.click('#f-save');await p.waitForTimeout(150);
 t=await wallAt(X(680),Y(160));await p.waitForTimeout(100);await p.evaluate(()=>document.getElementById('rs-split').click());await p.waitForTimeout(150);
 ok(/split into A and B/.test(await lastToast()),'wall A split: '+await lastToast());
 /* save the drawing and look at what was saved */
 await p.fill('.np .np-title','Front room');await p.click('.np .np-save');await p.waitForTimeout(2000);
 const saved=await p.evaluate(async()=>{const k=Object.keys(window.__st).find(k=>window.__st[k]&&window.__st[k].kind==='sketch'&&window.__st[k].pageSrc);if(!k)return null;const d=window.__st[k];const pg=JSON.parse(await window.__blobs[d.pageSrc].text());const objs=pg.pages?pg.pages[0].objs:pg.objs;const rooms=objs.filter(o=>o.t==='rsk');return {title:d.title,rooms,others:objs.filter(o=>o.t!=='rsk').map(o=>o.t),door:objs.find(o=>o.t==='shape'&&o.k==='door'),r2top:rooms[1]&&rooms[1].p[0][1]};});
 ok(saved&&saved.title==='Front room'&&saved.rooms.length===2,'the drawing saves with both rooms on it');
 ok(saved&&saved.others.includes('line')&&saved.others.includes('rect'),'the line and box drawn after the rooms are saved too: '+(saved&&saved.others.join(',')));
 ok(saved&&saved.door&&Math.abs(saved.door.a[1]-saved.door.b[1])<1&&Math.abs(saved.door.a[1]-saved.r2top)<3,'the door sits in the room\'s wall: '+JSON.stringify(saved&&saved.door&&[saved.door.a,saved.door.b,saved.r2top]));
 const r1=saved&&saved.rooms[0],r2=saved&&saved.rooms[1];
 ok(r1&&r1.room.walls.map(w=>w.len).join(',')==='3250,1500,1450,1700,1800,3215'&&r1.room.walls[0].feats.length===1,'room 1 keeps its measurements and chimney breast');
 ok(r1&&!('__hit' in r1),'tap positions are not saved with the drawing');
 ok(r2&&r2.room.walls.length===5&&r2.room.walls[0].grp&&r2.room.walls[0].gt===4000&&r2.room.walls[1].gt===4000,'room 2: split side keeps its overall 4,000');
 const ang=r2&&await p.evaluate(r=>Math.round(rsGeom(Object.assign({},r.room,{pts:r.p})).walls[2].deg),r2);
 ok(ang===100,'room 2: the corner after the split side is 100°: '+ang);
 /* the shape maths on its own */
 const m=await p.evaluate(()=>{
   const w=(len,ang)=>({len,ang,feats:[]});
   const L={pts:[[0,0],[1,0],[1,1],[0.5,1],[0.5,2],[0,2]],gapAt:3,walls:[w(3250,0),w(1500,90),w(1450,180),w(1700,90),w(1800,180),w(3215,270)]};
   const g=rsGeom(L,true),o=g.outline;let square=true;for(let i=1;i<o.length;i++){const dx=Math.abs(o[i][0]-o[i-1][0]),dy=Math.abs(o[i][1]-o[i-1][1]);if(dx>0.01&&dy>0.01)square=false;}
   const seg=rsSegs({len:3250,feats:[{k:'chimney',off:950,w:1400,d:350}]}).map(s=>(s.name||'')+' '+(s.e-s.s)).join(' · ');
   const S={pts:[[0,0],[1,0],[2,0],[2,1],[0,1]],gapAt:0,walls:[{len:2000,ang:0,grp:'g',gt:4000,feats:[]},{len:1985,ang:0,grp:'g',gt:4000,feats:[]},w(1000,90),w(3985,180),w(1000,270)]};
   const gr=rsGroups(S,rsGeom(S,true))[0];
   const step=[];for(const [x0,y0,x1,y1] of [[0,0,300,0],[300,0,300,140],[300,140,240,140],[240,140,240,200],[240,200,0,200],[0,200,0,0]])for(let i=0;i<10;i++){const t=i/10;step.push([x0+(x1-x0)*t,y0+(y1-y0)*t])}
   return {square,gap:g.gap&&Math.round(g.gap.mm),seg,gr:gr&&{bad:gr.bad,sum:gr.sum},stepWalls:(rsStraighten(step)||[]).length};});
 ok(m.square&&m.gap===15,'gap at corner 4: only square sides, out by '+m.gap+' mm');
 ok(m.seg==='alcove 950 · chimney 1400 · alcove 900','breakdown row: '+m.seg);
 ok(m.gr&&m.gr.bad&&Math.round(m.gr.sum)===3985,'a split side whose parts come to 3,985 against 4,000 is flagged');
 ok(m.stepWalls===6,'a small step in a drawn room is kept as walls: '+m.stepWalls);
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0]);bad++}
 console.log(bad?'h415: '+bad+' FAILED':'h415: all passed');
 await b.close()})();
