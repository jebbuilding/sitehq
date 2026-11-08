// Map of all sites (all made-up): Sites › 🗺️ Map of all sites shows a pin for each site with a location – a live
// job (red), a finished one (grey) and an enquiry (blue); the filters show one kind; tapping a pin shows the site
// and its client with Open the site (which opens the site page) and Directions.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra=`store["sites/sm1"]={name:"5 Map Lane, Exmouth",lat:50.62,lon:-3.41};
store["sites/sm2"]={name:"Old Mill, Topsham",lat:50.68,lon:-3.465,archived:true};
store["todos/cm1"]={kind:"client",name:"Mrs Map Test",stage:"enquiry",work:"Garden room",lat:50.70,lon:-3.53,created:1};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#tabs .tab[data-t=projects]');await p.waitForTimeout(400);
 ok(await p.isVisible('#st-map'),'Sites has 🗺️ Map of all sites');
 await p.click('#st-map');await p.waitForTimeout(600);
 const pins=async(cls)=>p.locator('.sm-pin'+(cls?'.'+cls:'')).count();
 ok(await pins()===await pins('live')&&await pins('live')>=1&&await p.getAttribute('#sm-f button[data-v=live]','aria-pressed')==='true','opens on Live jobs');
 await p.click('#sm-f button[data-v=all]');await p.waitForTimeout(200);
 ok(await pins('live')>=1&&await pins('done')===1&&await pins('enq')===1,'pins: live job (red), finished (grey), enquiry (blue)');
 await p.click('#sm-f button[data-v=enq]');await p.waitForTimeout(200);
 ok(await pins()===1&&await pins('enq')===1,'Enquiries shows just the enquiry');
 await p.click('#sm-f button[data-v=all]');await p.waitForTimeout(200);
 const z0=await p.evaluate(()=>[...document.querySelectorAll('.sm-tiles img')][0].src.split('/')[3]);
 await p.click('#sm-in');await p.waitForTimeout(100);
 const z1=await p.evaluate(()=>[...document.querySelectorAll('.sm-tiles img')][0].src.split('/')[3]);
 ok(+z1===+z0+1,'+ zooms in ('+z0+' → '+z1+')');
 await p.click('#sm-fit');await p.waitForTimeout(100);
 const box=await (await p.$('#sm-map')).boundingBox();
 const before=await p.evaluate(()=>document.querySelector('.sm-pin.done').style.left);
 await p.mouse.move(box.x+200,box.y+300);await p.mouse.down();await p.mouse.move(box.x+260,box.y+330,{steps:5});await p.mouse.up();
 const after=await p.evaluate(()=>document.querySelector('.sm-pin.done').style.left);
 ok(parseInt(after)-parseInt(before)===60,'dragging moves the map ('+before+' → '+after+')');
 await p.screenshot({path:'h438-map.png'});
 await p.click('.sm-pin.live[aria-label^="5 Map Lane"]');await p.waitForTimeout(200);
 ok(/5 Map Lane, Exmouth/.test(await p.innerText('#sm-card'))&&/Live job/.test(await p.innerText('#sm-card'))&&/Directions/.test(await p.innerText('#sm-card')),'tapping a pin shows the site, Open the site and Directions');
 await p.click('#sm-go');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>!!document.querySelector('#viewer[hidden]'))&&/5 Map Lane, Exmouth/.test(await p.innerText('#main')),'Open the site goes to the site page');
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h438: '+bad+' FAILED':'h438: all passed');
 await b.close()})();
