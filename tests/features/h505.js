// JEB first, SiteHQ small (James's choice from his Stranix logo set): the app opens on a screen with the company's
// square and name big in the middle and "SiteHQ by STRANIX" small at the bottom, which goes once the app has drawn its
// first page. On an iPad or computer the side menu starts with the company (JEB / Building Services) and ends with the
// small SiteHQ by Stranix credit – for James, a trade and a client; on a phone there's no credit squeezed into the bar.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(DD).length===2,'details hook found');
function mk(mode){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed+'store["todos/c1"].portalUid="u9";');if(mode==='client')src=src.replace("id:async()=>${owner?'\"owner\"':'\"emp1\"'}",'id:async()=>"u9"');eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake(mode==='owner');}
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
async function open(b,mode,vp,keys){const html='<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+mk(mode)+page_src.replace(DD,'function detailsDone(d){return true}')+'</body></html>';
 const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(k=>{try{for(const x of k)localStorage.setItem(x,'true');localStorage.setItem('jeb.instLater','true')}catch(e){}},keys);
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await p.goto('https://sitehq.test/');return p;}
(async()=>{const b=await chromium.launch();
 try{
 /* the opening screen on a phone */
 const p=await open(b,'owner',{width:390,height:844},['jeb.splash','jeb.newlook']);
 await p.waitForTimeout(250);
 ok(await p.isVisible('#ohq'),'the app opens on the opening screen');
 const t=await p.innerText('#ohq');
 ok(/JEB/.test(await p.innerText('#ohq-tile'))&&/JEB Building Services/.test(t),'the company first: its JEB square and name, big');
 ok(/SiteHQ\s*by\s*STRANIX/.test(t.replace(/\n/g,' ')),'"SiteHQ by STRANIX" small at the bottom');
 const sz=await p.evaluate(()=>[parseFloat(getComputedStyle(document.getElementById('ohq-name')).fontSize),parseFloat(getComputedStyle(document.querySelector('.ohq-sq')).fontSize)]);
 ok(sz[0]>=30&&sz[1]<=16,'JEB big ('+sz[0]+'px), SiteHQ small ('+sz[1]+'px)');
 await p.screenshot({path:OUT+'brand-1-opening.png'});
 await p.waitForTimeout(3000);
 ok(await p.locator('#ohq').count()===0,'it goes once the app has opened');
 ok(await p.locator('#nlbar .nl-by').isHidden(),'on a phone the bar has no credit squeezed in');
 ok(await p.evaluate(()=>localStorage.getItem('jeb.ohqCo'))==='"JEB Building Services"','the company is remembered for next time');
 /* the side menu on a computer, for James */
 const q=await open(b,'owner',{width:1280,height:800},['jeb.newlook']);await q.waitForTimeout(2500);await q.keyboard.press('Escape');
 ok(await q.locator('#ohq').count()===0,'tests skip the opening screen unless asked');
 const br=await q.innerText('#nlbar .nl-brand');
 ok(/JEB/.test(br)&&/Building Services/.test(br)&&!/SiteHQ/.test(br),'the side menu starts with the company: JEB / Building Services ('+br.replace(/\n/g,' | ')+')');
 ok(await q.isVisible('#nlbar .nl-by')&&/SiteHQ\s*by\s*STRANIX/.test((await q.innerText('#nlbar .nl-by')).replace(/\n/g,' ')),'and ends with SiteHQ by Stranix, small');
 const yb=await q.evaluate(()=>{const r=document.querySelector('#nlbar .nl-by').getBoundingClientRect();return [r.bottom,innerHeight]});
 ok(yb[1]-yb[0]<40,'the credit sits at the foot of the menu');
 await q.screenshot({path:OUT+'brand-2-owner.png'});
 /* a trade on an iPad */
 const r=await open(b,'trade',{width:1180,height:820},['jeb.tradelook']);await r.waitForTimeout(2500);await r.keyboard.press('Escape');
 ok(/JEB/.test(await r.innerText('#tlbar .nl-brand'))&&await r.isVisible('#tlbar .nl-by'),'a trade\'s iPad: JEB at the top, SiteHQ by Stranix at the foot');
 await r.screenshot({path:OUT+'brand-3-trade-ipad.png'});
 /* a client on a computer */
 const s=await open(b,'client',{width:1280,height:800},['jeb.clientlook']);await s.waitForTimeout(2500);await s.keyboard.press('Escape');
 ok(/JEB/.test(await s.innerText('#clbar .nl-brand'))&&await s.isVisible('#clbar .nl-by'),'a client\'s portal: the same');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h505: ${bad} failed`:'h505: all passed');await b.close();process.exit(bad?1:0);
})();
