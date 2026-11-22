// RAMS that isn't on the list, from the CDM page (made-up job at 4 Rolle Road; Claude is a stand-in that answers
// with a made-up RAMS): the RAMS box has "+ RAMS that isn't on the list" with ✍ Fill it in myself and ✨ Claude writes
// it. Fill it in myself opens a blank RAMS form for the site; once saved it is filed in the site's RAMS as a PDF and the
// CDM page opens again. Claude writes it asks what the work is, sends that to Claude, and opens the RAMS form filled in
// with Claude's hazards, controls, PPE, permit and method to check; saved, it's filed the same way.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
/* a stand-in Claude that answers with a made-up RAMS */
const DRAFT={activity:"Fitting a new staircase",atRisk:["Operatives","Client and family"],plant:"Circular saw, drill, props",coshh:"Wood glue",ppe:["Hard hat","Safety boots","Gloves","Eye protection","Spacesuit"],training:"CSCS; carpenter NVQ",permit:"None",rows:[{h:"Fall through the open stairwell",who:"Operatives",l:2,s:3,c:"Guard rails round the opening until the stairs are fixed",res:"Low"},{h:"Residents using the stairs during fitting",who:"Client and family",l:2,s:2,c:"Agree another route; barrier and signs",res:"Low"}],method:{prep:"Agree access with the client; prop the trimmers.",seq:"Remove the old flight, fix the strings, fit treads and risers, fit the balustrade.",checks:"Check the guard rails each morning.",finish:"Clear up and hand over."}};
src=src.replace('downloads:{save:','sample:Object.assign(async()=>({text:""}),{json:async(p,o)=>{window.__asked=p;return '+JSON.stringify(DRAFT)+'}}),downloads:{save:');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='';
const SITE='4 Rolle Road, Exmouth';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:1100},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 const openCdm=async()=>{await p.evaluate(()=>{document.getElementById('sheet').hidden=true;document.querySelector('.tab[data-t=hs]').click()});await p.waitForTimeout(500);await p.selectOption('#hs-cdmsite',SITE);await p.click('#hs-cdm');await p.waitForTimeout(600);};
 const filed=()=>p.evaluate(()=>Object.values(window.__st).filter(v=>v&&v.cat==='rams'&&v.raId!==undefined&&!v.cdmKey).map(v=>v.title));
 await openCdm();
 ok(/RAMS that isn't on the list/.test(await p.innerText('#cdm-rabox'))&&await p.locator('#cdm-raown1').count()===1&&await p.locator('#cdm-raown2').count()===1,'the RAMS box has "+ RAMS that isn\'t on the list" with ✍ Fill it in myself and ✨ Claude writes it');
 await (await p.$('#cdm-rabox')).screenshot({path:OUT+'cdmra-own.png'});
 /* option 1: by hand */
 await p.click('#cdm-raown1');await p.waitForTimeout(500);
 ok(await p.locator('#ra-act').isVisible(),'Fill it in myself opens the RAMS form');
 await p.fill('#ra-act','Laying a patio');await p.fill('.rh','Manual handling of slabs');await p.fill('.rc','Two-person lifts; slab trolley');
 await p.click('#f-save');await p.waitForTimeout(5000);
 let f=await filed();
 ok(f.some(t=>/Laying a patio/.test(t)),'saved, it is filed in the site\'s RAMS as a PDF ('+f.join(', ')+')');
 ok(await p.locator('#cdm-rabox').isVisible(),'and the CDM page opens again');
 /* option 2: Claude writes it */
 await p.click('#cdm-raown2');await p.waitForTimeout(300);
 ok(await p.locator('#cdm-raw').isVisible(),'Claude writes it asks what the work is');
 await p.fill('#cdm-raw','Fitting a new staircase in an occupied house');
 await (await p.$('.cdm-raai')).screenshot({path:OUT+'cdmra-ai.png'});
 await p.click('#cdm-rago');await p.waitForTimeout(800);
 ok(/Fitting a new staircase in an occupied house/.test(await p.evaluate(()=>window.__asked||''))&&/CDM 2015/.test(await p.evaluate(()=>window.__asked||'')),'what the work is goes to Claude, asking for a CDM 2015 RAMS');
 ok(await p.inputValue('#ra-act')==='Fitting a new staircase'&&(await p.$$eval('.rh',x=>x.map(i=>i.value))).includes('Fall through the open stairwell'),'the RAMS form opens filled in with Claude\'s activity and hazards to check');
 ok(await p.$$eval('#ra-ppe [aria-pressed=true]',x=>x.map(b=>b.dataset.v).join(',')).then(v=>/Eye protection/.test(v)&&!/Spacesuit/.test(v)),'with Claude\'s PPE (anything not on the list left out)');
 ok(/Remove the old flight/.test(await p.inputValue('#ra-m2')),'and the method');
 await p.click('#f-save');await p.waitForTimeout(5000);
 f=await filed();
 ok(f.some(t=>/Fitting a new staircase/.test(t)),'saved, Claude\'s RAMS is filed in the site\'s RAMS too');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h542: ${bad} failed`:'h542: all passed');await b.close();process.exit(bad?1:0);
})();
