// The trades' app in the new look (made-up worker Sam Test): no wall of buttons at the top; it opens on Today –
// a greeting, where he's booked, what's waiting for him (his overdue snag list) and big buttons for what he does most –
// with Today, Time, Forms, Photos and More along the bottom of a phone (down the side on an iPad). More has the rest
// in groups. Pictures for James: phone Today, More and Forms, and iPad Today.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(DD).length===2,'details hook found');
const html='<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+fake(false)+page_src.replace(DD,'function detailsDone(d){return true}')+'</body></html>';
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
async function open(b,vp){const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.tradelook','true');localStorage.setItem('jeb.instLater','true')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await p.goto('https://sitehq.test/');await p.waitForTimeout(2200);await p.keyboard.press('Escape');await p.waitForTimeout(300);return p;}
(async()=>{const b=await chromium.launch();
 try{
 const p=await open(b,{width:390,height:844});
 ok(await p.evaluate(()=>getComputedStyle(document.getElementById('tabs')).display==='none'),'no wall of buttons at the top');
 const bar=await p.evaluate(()=>[...document.querySelectorAll('#tlbar .tl-b')].map(x=>x.textContent.replace(/\d+/g,'').trim()));
 ok(JSON.stringify(bar)==='["🏠Today","⏱️Time","📋Forms","📷Photos","☰More"]','along the bottom: Today, Time, Forms, Photos, More ('+bar.join(' ')+')');
 const bb=await p.evaluate(()=>{const r=document.getElementById('tlbar').getBoundingClientRect();return [r.bottom,innerHeight]});
 ok(Math.abs(bb[0]-bb[1])<2,'the bar sits at the bottom of the phone');
 const m=await p.innerText('#main');
 ok(await p.evaluate(()=>window.__S.tab==='home')&&/Sam/.test(m)&&/Where you're working/.test(m),'it opens on Today with a hello');
 ok(/Waiting for you/.test(m)&&/1 form, job or to-do to do/.test(m)&&/1 thing to read/.test(m),'what\'s waiting for him (his snag list)');
 ok(/Do a check/.test(m)&&/Take a photo/.test(m)&&/My hours/.test(m),'big buttons for what he does most');
 await p.screenshot({path:OUT+'trade-new-1-today.png'});
 await p.click('#tlbar .tl-b[data-t=more]');await p.waitForTimeout(400);
 const mm=await p.innerText('#main');
 ok(/Work/.test(mm)&&/Day work/.test(mm)&&/Reports/.test(mm)&&/Training/.test(mm)&&/My details/.test(mm)&&!/Photos/.test(mm),'More has the rest, in groups (not the ones in the bar)');
 await p.screenshot({path:OUT+'trade-new-2-more.png'});
 await p.click('.tl-go[data-t=checks]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>window.__S.tab==='checks')&&await p.isVisible('#tlbar .tl-b[data-t=more][aria-current]'),'Reports opens from More, with More still lit');
 await p.click('#tlbar .tl-b[data-t=jobs]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>window.__S.tab==='jobs')&&/Final snags/.test(await p.innerText('#main')),'Forms shows his jobs and snags');
 await p.screenshot({path:OUT+'trade-new-3-forms.png'});
 await p.click('#tlbar .tl-b[data-t=home]');await p.waitForTimeout(300);await p.click('.nl-tile.tl-go[data-t=checks]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>window.__S.tab==='checks'),'the Do a check button opens Reports');
 const q=await open(b,{width:1180,height:820});
 const side=await q.evaluate(()=>{const r=document.getElementById('tlbar').getBoundingClientRect();return r.left===0&&r.height>700&&r.width<300});
 ok(side,'on an iPad the buttons run down the side');
 await q.screenshot({path:OUT+'trade-new-4-ipad.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h500: ${bad} failed`:'h500: all passed');await b.close();process.exit(bad?1:0);
})();
