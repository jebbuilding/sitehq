// Drawing › 🏘️ Elevations & 3D (made-up plan): a 4 × 3 m room at 1:50 with a door in the front (bottom) wall and a
// window in the back (top) wall. The 3D view stands the walls up in brick with a gable roof and turns round. Then, two
// storeys with a 35° gable roof, sash windows and brick: "Draw the elevations" makes four pages – front, back, left
// and right – the front with the door and an upstairs window over it, the back with the window on both floors, the
// gable roof face-on at the front and as a triangle at the sides, and brick courses; a hipped roof gives a triangle
// end with no gable wall; a flat roof a parapet band.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const HOOK='  let lenObj = null;';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2,'test hook found once');
page_src=page_src.replace(HOOK,HOOK+'window.__np=()=>doc;window.__goPage=(i)=>goPage(i);');
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('three'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('threepkg/package/build/three.min.js','utf8')});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 await p.evaluate(()=>{const d=window.__np();const u=v=>v/d.scale*5;const x0=200,y0=200,W=u(4000),H=u(3000);const w=(a,b)=>({t:'shape',k:'wall',a,b,c:'#111111',w:2,th:u(100)});
  d.objs.push(w([x0,y0],[x0+W,y0]),w([x0+W,y0],[x0+W,y0+H]),w([x0+W,y0+H],[x0,y0+H]),w([x0,y0+H],[x0,y0]));
  d.objs.push({t:'shape',k:'door',a:[x0+u(1500),y0+H],b:[x0+u(2400),y0+H],c:'#111111',w:2});
  d.objs.push({t:'shape',k:'window',a:[x0+u(1000),y0-u(50)],b:[x0+u(2200),y0+u(50)],c:'#111111',w:2});});
 const menu=async()=>{await p.evaluate(()=>document.querySelector('.np [data-bt=elev3d]').click());await p.waitForTimeout(300);};
 ok(await p.locator('.np [data-bt=elev3d]').count()===1,'the drawing has 🏘️ Elevations & 3D');
 await menu();
 const m=await p.innerText('.el-box');
 ok(/4 walls, 2 doors and windows, walls 2400 mm a storey/.test(m),'it finds the 4 walls, the door and the window');
 ok(await p.inputValue('#el-roof')==='gable'&&await p.inputValue('#el-pitch')==='35'&&await p.inputValue('#el-fin')==='brick','it starts with a 35° gable roof in brick');
 /* the 3D view: lit, textured, on a lawn under a sky */
 await p.click('.el-3d');await p.waitForTimeout(3500);
 ok(await p.isVisible('#hr-cv'),'the 3D view opens');
 const shot=async(name)=>{const du=await p.evaluate(()=>document.getElementById('hr-cv').toDataURL('image/png'));fs.writeFileSync(OUT+name,Buffer.from(du.split(',')[1],'base64'));return du;};
 await shot('h490-3d.png');
 const ink=await p.evaluate(async()=>{const src=document.getElementById('hr-cv');const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const x=c.getContext('2d');x.drawImage(src,0,0);const d=x.getImageData(0,0,c.width,c.height).data;let sky=0,grass=0,brick=0,slate=0;for(let i=0;i<d.length;i+=16){const r=d[i],g=d[i+1],b=d[i+2];if(b>170&&b>r+25&&g>120)sky++;else if(g>r+15&&g>b+15)grass++;else if(r>g+30&&r>b+40)brick++;else if(r<170&&b-r>6&&b-r<50&&g>=r-6&&g<=b+6)slate++;}return {sky,grass,brick,slate,n:d.length/16}});
 console.log(JSON.stringify(ink));
 ok(ink.sky>ink.n*0.05&&ink.grass>ink.n*0.03,'a sky and a lawn');
 ok(ink.brick>ink.n*0.02,'brick walls');
 ok(ink.slate>ink.n*0.01,'a slate roof');
 await p.evaluate(()=>{const c=document.getElementById('hr-cv');const r=c.getBoundingClientRect();const ev=(t,x)=>c.dispatchEvent(new PointerEvent(t,{clientX:x,clientY:r.top+100,pointerId:1,bubbles:true}));ev('pointerdown',r.left+200);ev('pointermove',r.left+420);ev('pointerup',r.left+420);});
 await p.waitForTimeout(300);await shot('h490-3d-turned.png');
 await p.click('#hr-save');await p.waitForTimeout(600);
 ok(await p.evaluate(()=>(window.__dl||[]).some(x=>x.filename==='3D view.png'&&x.data.size>20000)),'it turns, and the picture can be saved');
 await p.click('#hr-vid');await p.waitForTimeout(17000);
 const vid=await p.evaluate(()=>(window.__dl||[]).filter(x=>/3D fly-round.(webm|mp4)$/.test(x.filename)).map(x=>[x.filename,x.data.size]));console.log(JSON.stringify(vid));
 ok(vid.length===1&&vid[0][1]>50000,'a fly-round video is made, to send');
 await p.click('#hr-x');await p.waitForTimeout(200);
 /* two storeys, sash windows */
 await menu();
 await p.selectOption('#el-st','2');await p.selectOption('#el-win','sash');
 await p.selectOption('#el-roof','hip');await p.selectOption('#el-cover','red');await p.selectOption('#el-fin','render');await p.click('.el-3d');await p.waitForTimeout(3500);
 const du2=await p.evaluate(()=>document.getElementById('hr-cv').toDataURL('image/png'));fs.writeFileSync(OUT+'h490-3d-2.png',Buffer.from(du2.split(',')[1],'base64'));
 await p.click('#hr-x');await p.waitForTimeout(200);await menu();await p.selectOption('#el-roof','gable');await p.selectOption('#el-fin','brick');await p.click('.el-x');await p.waitForTimeout(200);
 await menu();
 ok(await p.inputValue('#el-st')==='2','the settings are kept with the drawing');
 await p.click('.el-all');await p.waitForTimeout(900);
 const info=await p.evaluate(()=>window.__np().pages.filter(x=>/elevation/.test(x.name)).map(x=>({n:x.name,doors:x.objs.filter(o=>o.t==='rect'&&o.fill==='#f3f4f6').length,wins:x.objs.filter(o=>o.t==='rect'&&o.fill==='#dbeafe').length,strokes:x.objs.filter(o=>o.t==='stroke').length,lines:x.objs.filter(o=>o.t==='line').length,txt:(x.objs.find(o=>o.t==='text'&&/elevation, from the plan/.test(o.s))||{}).s||''})));
 console.log(JSON.stringify(info.map(x=>[x.n,x.doors,x.wins,x.strokes,x.lines])));
 const P=(n)=>info.find(x=>x.n===n)||{};
 ok(info.length===4,'four elevation pages');
 ok(P('Front elevation').doors===1&&P('Front elevation').wins===1,'front: the door, and an upstairs window over it');
 ok(P('Back elevation').wins===2&&P('Back elevation').doors===0,'back: the window on both floors');
 ok(P('Front elevation').strokes===1&&P('Left side elevation').strokes===1&&P('Left side elevation').lines>P('Front elevation').lines-20,'the roof: face-on at the front, the gable end (its wall and verges) at the side');
 ok(P('Front elevation').lines>40,'brick courses and tile lines are drawn');
 ok(/2 storeys/.test(P('Front elevation').txt)&&/gable roof at 35°/.test(P('Front elevation').txt)&&/brickwork/.test(P('Front elevation').txt),'the note says 2 storeys, a 35° gable roof, brickwork');
 /* hipped and flat */
 await p.evaluate(()=>window.__goPage(0));await p.waitForTimeout(300);
 await menu();await p.selectOption('#el-roof','hip');await p.click('.el-all');await p.waitForTimeout(800);
 const hip=await p.evaluate(()=>{const pg=window.__np().pages.filter(x=>x.name==='Left side elevation').pop();return pg.objs.filter(o=>o.t==='stroke').length});
 ok(hip===1,'hipped: the side shows the hip, with no gable wall');
 await p.evaluate(()=>window.__goPage(0));await p.waitForTimeout(300);
 await menu();await p.selectOption('#el-roof','flat');await p.click('.el-all');await p.waitForTimeout(800);
 const flat=await p.evaluate(()=>{const pg=window.__np().pages.filter(x=>x.name==='Front elevation').pop();return (pg.objs.find(o=>o.t==='text'&&/flat roof/.test(o.s))||{}).s||''});
 ok(/flat roof/.test(flat),'flat: a flat roof with its parapet');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h490: ${bad} failed`:'h490: all passed');await b.close();process.exit(bad?1:0);
})();
