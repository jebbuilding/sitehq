// Retaining wall section symbols: in Symbols… › Elevation & section › Foundations & ground there are three (blockwork
// with its footing and drainage, sleepers on posts, gabions); a search for "retaining" finds them with the plan ones;
// each places without errors and is saved. Writes h450.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 const KS=['rwsBlock','rwsSleeper','rwsGabion'];
 await p.evaluate(()=>document.querySelector('.np .np-view').click());await p.waitForTimeout(200);
 await p.evaluate(()=>{const b=document.querySelector('.np .np-libbtn');b&&b.click();});await p.waitForTimeout(300);
 const grp=await p.evaluate(()=>{const b=[...document.querySelectorAll('.np .np-lib button')].find(x=>x.textContent.trim()==='Foundations & ground');b&&b.click();return !!b});
 await p.waitForTimeout(200);
 const lib=await p.evaluate(()=>document.querySelector('.np .np-lib').innerText);
 ok(grp&&/Retaining wall section: blockwork/.test(lib)&&/sleepers on posts/.test(lib)&&/gabion/.test(lib),'Foundations & ground shows the three retaining wall sections');
 await p.fill('.np .np-lib input[type=search]','retaining');await p.waitForTimeout(300);
 const found=await p.evaluate(()=>[...document.querySelectorAll('.np .np-lib button')].filter(b=>/retaining/i.test(b.textContent)&&b.offsetParent).length);
 ok(found>=5,'searching "retaining" finds the sections and the plan symbols ('+found+')');
 await p.evaluate(()=>{const l=document.querySelector('.np .np-lib');l&&l.remove();});
 const box=await (await p.$('.np .np-cv')).boundingBox();
 let i=0;
 const LB=['blockwork, footing','sleepers on posts','gabion baskets'];
 for(const k of KS){await p.evaluate(()=>{const b=document.querySelector('.np .np-libbtn');b&&b.click();});await p.waitForTimeout(250);await p.fill('.np .np-lib input[type=search]','retaining wall section');await p.waitForTimeout(250);
  const hit=await p.evaluate(t=>{const b=[...document.querySelectorAll('.np .np-lib button')].find(x=>x.offsetParent&&x.textContent.includes(t));b&&b.click();return !!b},LB[i]);if(!hit)console.log('not found',LB[i]);await p.waitForTimeout(250);
  await p.mouse.move(box.x+60+i*380,box.y+150);await p.mouse.down();await p.mouse.move(box.x+200+i*380,box.y+300);await p.mouse.move(box.x+400+i*380,box.y+480);await p.mouse.up();await p.waitForTimeout(150);i++;}
 await p.screenshot({path:'h450.png'});
 await p.fill('.np .np-title','Retaining sections');await p.click('.np .np-save');await p.waitForTimeout(2000);
 const ks=await p.evaluate(async()=>{const k=Object.keys(window.__st).find(k=>window.__st[k]&&window.__st[k].kind==='sketch'&&window.__st[k].pageSrc);const d=window.__st[k];const pg=JSON.parse(await window.__blobs[d.pageSrc].text());return (pg.pages?pg.pages[0].objs:pg.objs).filter(o=>o.t==='shape').map(o=>o.k)});
 ok(KS.every(k=>ks.includes(k)),'all three placed and saved');
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0]);bad++}
 console.log(bad?'h450: '+bad+' FAILED':'h450: all passed');
 await b.close()})();
