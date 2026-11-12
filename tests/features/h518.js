// Job names (made-up site 4 Rolle Road, client Sue Jones, trade Sam Test): on the site's ✎ Edit James types the job name
// "Jones loft conversion". It shows as the job's title on the site page, on Today and in Jobs, with the address under
// it – and the trade sees the same name on his Today dates and in Sites.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const SITE='4 Rolle Road, Exmouth';
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
function mk(mode,extra){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed+(extra||''));eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake(mode==='owner');}
async function open(b,mode,vp,keys,extra){const html='<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+mk(mode,extra)+page_src.replace(DD,'function detailsDone(d){return true}')+'</body></html>';
 const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(k=>{try{for(const x of k)localStorage.setItem(x,'true');localStorage.setItem('jeb.instLater','true')}catch(e){}},keys);
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await p.goto('https://sitehq.test/');await p.waitForTimeout(2500);await p.keyboard.press('Escape');await p.waitForTimeout(300);return p;}
(async()=>{const b=await chromium.launch();
 try{
 const p=await open(b,'owner',{width:1280,height:900},['jeb.newlook']);
 await p.evaluate(s=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.__S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(600);
 await p.click('#ss-edit');await p.waitForTimeout(300);
 ok(await p.isVisible('#ss-jname'),'Job details has "Job name (everyone sees this as the job)"');
 await p.fill('#ss-jname','Jones loft conversion');await p.click('#f-save');await p.waitForTimeout(1000);
 ok(await p.evaluate(()=>window.__st['sites/s2'].jobName)==='Jones loft conversion','saved on the site');
 ok(/Jones loft conversion/.test(await p.innerText('#main')),'the site page shows the job name');
 await p.screenshot({path:OUT+'jn-1-site.png'});
 await p.evaluate(()=>{window.__S.otab='today';window.render()});await p.waitForTimeout(500);
 const today=await p.innerText('#main');
 ok(/Jones loft conversion/.test(today),'Today shows the job by its name');
 await p.evaluate(()=>{window.__S.otab='projects';window.__S.f.projList=true;window.render();window.__S.otab='jobs';window.render()});await p.waitForTimeout(300);
 /* the trade */
 const d=new Date();d.setDate(d.getDate()+1);const t=d.toISOString().slice(0,10);
 const q=await open(b,'trade',{width:390,height:844},['jeb.tradelook'],'store["sites/s2"].jobName="Jones loft conversion";store["plan/jn1"]={from:"'+t+'",to:"'+t+'",type:"work",title:"Boarding",site:"'+SITE+'",people:["emp1"],vis:"people"};');
 const th=await q.innerText('#main');
 ok(/Jones loft conversion/.test(th)&&/📍 4 Rolle Road, Exmouth/.test(th),'the trade\'s Today dates show the job name, with the address under it');
 await q.click('#tlbar .tl-b[data-t=plans]');await q.waitForTimeout(500);
 ok(/Jones loft conversion/.test(await q.innerText('#main')),'and his Sites list shows it by name');
 ok(!/Remind me in 30 days/.test(await q.innerText('body')),'the trade'+String.fromCharCode(39)+'s yellow box has no snooze buttons (those are James'+String.fromCharCode(39)+'s)');
 await q.screenshot({path:OUT+'jn-2-trade.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h518: ${bad} failed`:'h518: all passed');await b.close();process.exit(bad?1:0);
})();
