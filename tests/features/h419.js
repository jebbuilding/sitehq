// Room sketch → real walls: a measured room becomes the drawing tool's own walls (here a 300 mm cavity wall) round
// its inside face, with its measurements kept as dimensions; the button waits until every wall is measured.
// Writes h419-walls.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const wallAt=async(x,y)=>{await p.mouse.click(x,y);await p.waitForTimeout(150);return (await p.isHidden('#sheet'))?'':await p.textContent('#sheettitle');};
 const wallNear=async(x,y,want)=>{for(const r of [0,15,30,45,60,80,100,130])for(const [dx,dy] of [[0,0],[0,r],[0,-r],[r,0],[-r,0]]){if(!r&&dx)continue;const t=await wallAt(x+dx,y+dy);if(t===want)return t;if(t)await p.evaluate(()=>document.getElementById('f-cancel').click());}return '';};
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 await p.evaluate(()=>document.querySelector('.np .np-t[data-t=roomsk]').click());
 const box=await (await p.$('.np .np-cv')).boundingBox();const X=x=>box.x+x,Y=y=>box.y+y;
 const pts=[[300,200],[700,200],[700,500],[300,500],[300,202]];await p.mouse.move(X(pts[0][0]),Y(pts[0][1]));await p.mouse.down();for(let k=1;k<pts.length;k++)for(let i=1;i<=12;i++){const t=i/12;await p.mouse.move(X(pts[k-1][0]+(pts[k][0]-pts[k-1][0])*t),Y(pts[k-1][1]+(pts[k][1]-pts[k-1][1])*t));}await p.mouse.up();await p.waitForTimeout(200);
 /* before every wall is measured the button is there but can't be used */
 let t=await wallNear(X(500),Y(200),'Wall A');await p.waitForTimeout(100);ok(await p.isDisabled('#rs-walls'),'"Turn into real walls" waits until every wall is measured');await p.fill('#rs-len','4000');await p.click('#f-save');await p.waitForTimeout(120);
 for(const [w,x,y,l] of [['Wall B',700,350,'3000'],['Wall C',500,500,'4000'],['Wall D',300,350,'3000']]){t=await wallNear(X(x),Y(y),w);ok(t===w,'tapped '+w);if(t){await p.waitForTimeout(100);await p.fill('#rs-len',l);await p.click('#f-save');await p.waitForTimeout(150);}}
 /* find wall A again (the room has redrawn at 1:50) and turn it into a cavity wall */
 let hit='';for(let y=120;y<560&&!hit;y+=10)for(let x=250;x<760&&!hit;x+=40){const tt=await wallAt(X(x),Y(y));if(tt==='Wall A')hit=tt;else if(tt)await p.evaluate(()=>document.getElementById('f-cancel').click());}
 ok(hit==='Wall A','found wall A after it redrew to scale');await p.waitForTimeout(100);
 await p.selectOption('#rs-wth',{label:'Cavity wall (300 mm: block, 100 cavity, brick)'});await p.click('#rs-walls');await p.waitForTimeout(300);
 ok(/turned into 4 walls/.test(await p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''})),'room turned into 4 walls');
 await (await p.$('.np .np-stage')).screenshot({path:'h419-walls.png'});
 /* build-ups: select a wall and pick "Cavity: brick, 100 full-fill, 100 block" with imperial bricks */
 await p.evaluate(()=>document.querySelector('.np .np-t[data-t=move]').click());
 /* from the middle of the room straight up, so the first thing tapped is the top wall, not a dimension */
 let sel=false;for(let y=350;y>100&&!sel;y-=6){const x=500;await p.mouse.click(X(x),Y(y));sel=await p.evaluate(()=>{const f=document.querySelector('.np [data-a="fine"]');if(!f||!f.offsetParent)return false;f.click();const r=document.querySelector('.np .nfburow');if(r&&!r.hidden&&r.offsetParent)return true;f.click();return false;});}
 ok(sel,'selecting a wall shows the Build-up choice');
 await p.selectOption('.np .nfbu','cav100');await p.waitForTimeout(150);
 ok(await p.isVisible('.np .nfbrk'),'a brick build-up offers the brick size');
 await p.selectOption('.np .nfbrk','imperial');await p.waitForTimeout(150);
 await p.evaluate(()=>document.querySelector('.np .np-qty').click());await p.waitForTimeout(400);
 const q=await p.evaluate(()=>{const d=[...document.querySelectorAll('.np .dimask')].pop();return d?d.innerText:'';});
 ok(/Cavity: brick, 100 full-fill, 100 block \(imperial brick\)/.test(q),'take-off lists the wall by its build-up');
 ok(/Imperial brick[^\n]*half-brick[^\n]*\d+ bricks/.test(q)&&/Blocks 440×215×100[^\n]*\d+ blocks/.test(q)&&/Wall ties/.test(q)&&/Cavity insulation 100 mm/.test(q),'take-off counts imperial bricks, blocks, ties and 100 mm insulation');
 const cav=q.match(/Blocks for cavity walls/);ok(!!cav,'the other three walls are still counted as plain cavity walls');
 await p.evaluate(()=>{const d=[...document.querySelectorAll('.np .dimask')].pop();d&&d.remove();});
 await p.fill('.np .np-title','Walls');await p.click('.np .np-save');await p.waitForTimeout(2000);
 const sv=await p.evaluate(async()=>{const k=Object.keys(window.__st).find(k=>window.__st[k]&&window.__st[k].kind==='sketch'&&window.__st[k].pageSrc);const d=window.__st[k];const pg=JSON.parse(await window.__blobs[d.pageSrc].text());return pg.pages?pg.pages[0].objs:pg.objs;});
 const walls=sv.filter(o=>o.t==='shape'&&o.k==='cavity'),dims=sv.filter(o=>o.t==='dim');
 ok(!sv.some(o=>o.t==='rsk')&&walls.length===4,'saved as 4 cavity walls, no sketch left: '+walls.length);
 ok(walls.filter(w=>Math.abs(w.th-30)<0.01).length===3&&walls.filter(w=>Math.abs(w.th-30.25)<0.01).length===1,'walls 300 mm at 1:50 (30 units), the one with the build-up 302.5 mm: '+walls.map(w=>w.th).join(','));
 /* centre lines of opposite walls are 4,000 + 300 mm apart, i.e. the inside of the room is still 4,000 */
 const xs=walls.flatMap(w=>[w.a[0],w.b[0]]),span=Math.max(...xs)-Math.min(...xs);
 ok(Math.abs(span-430)<0.5,'the inside of the room stays 4,000 mm: centre lines '+(span/5*50)+' mm apart');
 ok(dims.map(d=>d.s).sort().join('|')==='3,000|3,000|4,000|4,000','its measurements stay as dimensions: '+dims.map(d=>d.s).join(', '));
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0]);bad++}
 console.log(bad?'h419: '+bad+' FAILED':'h419: all passed');
 await b.close()})();
