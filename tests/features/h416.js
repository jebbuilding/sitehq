// New look (owner/today.js): the "✨ New look" switch, the Today screen, the five-section bar on a phone and the
// side menu on a big screen; section pages open the same tabs as the old tab row; "Old look" puts it all back.
// Writes h416-phone-today.png, h416-phone-jobs.png, h416-desktop.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();
 for(const [w,h,tag] of [[390,900,'phone'],[1280,900,'desktop']]){
 const ctx=await b.newContext({viewport:{width:w,height:h}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 ok(await p.isVisible('#tabs'),tag+': old look by default, tab row showing');
 ok((await p.innerText('#nl-tog')).includes('New look'),tag+': "New look" switch in the header');
 await p.click('#nl-tog');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>document.body.classList.contains('nl-on')),tag+': new look on');
 ok(!(await p.isVisible('#tabs'))&&await p.isVisible('#nlbar'),tag+': tab row hidden, section bar showing');
 ok((await p.$$('#nlbar .nl-b')).length===5,tag+': five sections: '+(await p.$$eval('#nlbar .nl-b',x=>x.map(b=>b.innerText.trim()).join(' | '))));
 ok((await p.textContent('#h1'))==='Today'&&await p.isVisible('.nl-today'),tag+': opens on Today');
 ok(/On site now/.test(await p.innerText('.nl-today')),tag+': Today shows who is on site');
 const bar=await p.$eval('#nlbar',e=>{const r=e.getBoundingClientRect();return {top:r.top,left:r.left,w:r.width,h:r.height}});
 if(tag==='phone')ok(bar.top>800&&bar.w>=380,'phone: bar along the bottom '+JSON.stringify(bar));
 else ok(bar.left===0&&bar.w<=240&&bar.h>=800,'desktop: menu down the left '+JSON.stringify(bar));
 await p.screenshot({path:'h416-'+tag+'-today.png'});
 await p.click('#nlbar .nl-b[data-s=jobs]');await p.waitForTimeout(200);
 ok((await p.textContent('#h1'))==='Jobs & clients',tag+': Jobs section page');
 const tiles=await p.$$eval('.nl-sec .nl-tile',x=>x.map(t=>t.dataset.t));ok(tiles.includes('draw')&&tiles.includes('clients'),tag+': section lists its tabs: '+tiles.join(','));
 if(tag==='phone')await p.screenshot({path:'h416-phone-jobs.png'});
 await p.click('.nl-sec .nl-tile[data-t=draw]');await p.waitForTimeout(300);
 ok((await p.textContent('#h1'))==='Drawings'&&await p.isVisible('#dw-new'),tag+': opens Drawings like the old tab did');
 ok(await p.getAttribute('#nlbar .nl-b[data-s=jobs]','aria-current')==='page',tag+': bar still shows Jobs');
 await p.click('#nlbar .nl-b[data-s=setup]');await p.waitForTimeout(300);ok(await p.evaluate(()=>{const t=document.querySelector('#tabs .tab[aria-selected=true]');return t&&t.dataset.t==='setup'}),tag+': Setup opens straight away');
 await p.click('#nl-tog');await p.waitForTimeout(300);
 ok(await p.isVisible('#tabs')&&!(await p.isVisible('#nlbar')),tag+': "Old look" puts the tab row back');
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0]);bad++}
 await ctx.close();}
 /* a real phone or computer (not a test browser) gets the new look without pressing anything, opening on Today */
 for(const [w,want] of [[390,true],[1280,true]]){
 const ctx=await b.newContext({viewport:{width:w,height:900}});ctx.setDefaultTimeout(8000);await ctx.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 const on=await p.evaluate(()=>document.body.classList.contains('nl-on'));
 ok(on===want&&(!want||(await p.textContent('#h1'))==='Today'),w+' px wide: '+(want?'new look, opening on Today':'old look until switched'));
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0]);bad++}
 await ctx.close();}
 console.log(bad?'h416: '+bad+' FAILED':'h416: all passed');
 await b.close()})();
