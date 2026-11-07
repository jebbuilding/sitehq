// New symbols: solar panels, battery, inverter, EV charger, bee brick, bat / bird / swift boxes, roof plan ridge / hip /
// valley lines and roof section timbers (collar, strut, ceiling joist): each is in the shape list, places without errors
// and is saved; Symbols… has Energy and Roof plan groups. Writes h420.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 const box=await (await p.$('.np .np-cv')).boundingBox();const X=x=>box.x+x,Y=y=>box.y+y;
 const boxes=['solarpv','battery','inverter','evcharger','beebrick','batbox','birdbox','swiftbox'],lines=['ridgel','hipl','valleyl'],sect=['collar','strut','cjoist'];
 const opts=await p.$$eval('.np .np-shape option',x=>x.map(o=>o.value));
 ok(boxes.concat(lines).every(k=>opts.includes(k)),'all 11 plan ones are in the shape list');
 let i=0;
 for(const k of boxes){await p.evaluate(k=>{const s=document.querySelector('.np .np-shape');s.value=k;s.dispatchEvent(new Event('change'));},k);const x=200+(i%4)*170,y=180+Math.floor(i/4)*170;await p.mouse.click(X(x),Y(y));await p.waitForTimeout(120);i++;}
 i=0;
 const drawL=async(k,y)=>{await p.evaluate(k=>{const s=document.querySelector('.np .np-shape');s.value=k;s.dispatchEvent(new Event('change'));},k);await p.mouse.move(X(200),Y(y));await p.mouse.down();await p.mouse.move(X(400),Y(y+1));await p.mouse.move(X(600),Y(y+2));await p.mouse.up();await p.waitForTimeout(120);};
 for(const k of lines){await drawL(k,500+i*55);i++;}
 /* the roof section timbers are in the elevation / section list */
 await p.evaluate(()=>document.querySelector('.np .np-view').click());await p.waitForTimeout(200);
 const opts2=await p.$$eval('.np .np-shape option',x=>x.map(o=>o.value));ok(sect.every(k=>opts2.includes(k)),'collar tie, strut and ceiling joist are in the section list');
 i=0;for(const k of sect){await drawL(k,500+i*55);await p.mouse.move(X(700),Y(500+i*55));i++;}
 await p.screenshot({path:'h420.png'});
 /* Symbols… groups */
 await p.evaluate(()=>{const b=document.querySelector('.np .np-libbtn');b&&b.click();});await p.waitForTimeout(300);
 const lib=await p.evaluate(()=>{const l=document.querySelector('.np .np-lib');return l?l.innerText:'';});
 ok(/Energy & wildlife/.test(lib)&&/Section: roof/.test(lib),'Symbols… (section view) has Energy & wildlife and Section: roof groups');
 await p.evaluate(()=>{const l=document.querySelector('.np .np-lib');l&&l.remove();});
 await p.fill('.np .np-title','Symbols');await p.click('.np .np-save');await p.waitForTimeout(2000);
 const ks=await p.evaluate(async()=>{const k=Object.keys(window.__st).find(k=>window.__st[k]&&window.__st[k].kind==='sketch'&&window.__st[k].pageSrc);const d=window.__st[k];const pg=JSON.parse(await window.__blobs[d.pageSrc].text());return (pg.pages?pg.pages[0].objs:pg.objs).filter(o=>o.t==='shape').map(o=>o.k);});
 const miss=boxes.concat(lines,sect).filter(k=>!ks.includes(k));
 ok(!miss.length,'all placed and saved'+(miss.length?' – missing: '+miss.join(','):''));
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0]);bad++}
 console.log(bad?'h420: '+bad+' FAILED':'h420: all passed');
 await b.close()})();
