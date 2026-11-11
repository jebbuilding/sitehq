// The client's portal in the new look (made-up client Sue Jones, 4 Rolle Road): no row of buttons at the top, but
// Home, Photos, Documents, Messages and More along the bottom of a phone (down the side on an iPad); More has Job
// story, Choices, Drawing, Dates, Sign-offs and About us; nothing from the trades' side (sign in, day work, timesheets,
// calculator, training, materials, merchants, reports). A building control certificate James shared is in Documents
// under Certificates & warranties. The address isn't shown twice on Home.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/c1"].portalUid="u9";'+
 'store["portal/u9/docs/bc-1"]={title:"Building control: Damp proof course (10 Nov)",fileName:"bc.pdf",assetId:"a41",contentType:"application/pdf",folder:"certs",note:"✓ Passed",sharedAt:1};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra).replace("id:async()=>${owner?'\"owner\"':'\"emp1\"'}",'id:async()=>"u9"');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const html='<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+fake(false)+page_src+'</body></html>';
async function open(b,vp){const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.clientlook','true');localStorage.setItem('jeb.instLater','true')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await p.goto('https://sitehq.test/');await p.waitForTimeout(2500);await p.keyboard.press('Escape');await p.waitForTimeout(300);return p;}
(async()=>{const b=await chromium.launch();
 try{
 const p=await open(b,{width:390,height:844});
 ok(await p.evaluate(()=>!!window.__S.client&&window.__S.client.linked),'Sue\'s portal opens');
 ok(await p.locator('.ptabs').count()===0,'no row of buttons at the top');
 const bar=await p.evaluate(()=>[...document.querySelectorAll('#clbar .cl-b')].map(x=>x.textContent.replace(/\d+/g,'').trim()));
 ok(JSON.stringify(bar)==='["🏠Home","📷Photos","📄Documents","💬Messages","☰More"]','along the bottom: Home, Photos, Documents, Messages, More ('+bar.join(' ')+')');
 const bb=await p.evaluate(()=>{const r=document.getElementById('clbar').getBoundingClientRect();return [r.bottom,innerHeight]});
 ok(Math.abs(bb[0]-bb[1])<2,'the bar sits at the bottom of the phone');
 const m=await p.innerText('#main');
 ok(/Hello Sue/.test(m)&&(m.match(/4 Rolle Road, Exmouth/g)||[]).length===1,'Home says hello, with the address once');
 await p.screenshot({path:OUT+'client-new-1-home.png'});
 await p.click('#clbar .cl-b[data-v=more]');await p.waitForTimeout(400);
 const mm=await p.innerText('#main');
 ok(['Job story','Choices','Drawing','Dates','Sign-offs','About us'].every(w=>mm.includes(w)),'More has Job story, Choices, Drawing, Dates, Sign-offs and About us');
 const all=await p.innerText('body');
 ok(!/Sign in|Day work|Timesheet|Calculator|Training|Materials|Merchants|Reports/i.test(all),'nothing from the trades\' side');
 await p.screenshot({path:OUT+'client-new-2-more.png'});
 await p.click('.pt-go[data-v=cal]');await p.waitForTimeout(400);
 ok(/Your job calendar/.test(await p.innerText('#main'))&&await p.isVisible('#clbar .cl-b[data-v=more][aria-current]'),'Dates opens from More, with More still lit');
 await p.click('#clbar .cl-b[data-v=docs]');await p.waitForTimeout(400);
 ok(/Certificates & warranties/.test(await p.innerText('#main')),'Documents has the Certificates & warranties folder');
 await p.click('.pt-fold[data-f=certs]');await p.waitForTimeout(400);
 ok(/Building control: Damp proof course/.test(await p.innerText('#main')),'with the building control certificate in it');
 await p.screenshot({path:OUT+'client-new-3-docs.png'});
 const q=await open(b,{width:1180,height:820});
 ok(await q.evaluate(()=>{const r=document.getElementById('clbar').getBoundingClientRect();return r.left===0&&r.height>700&&r.width<300}),'on an iPad the buttons run down the side');
 await q.screenshot({path:OUT+'client-new-4-ipad.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h503: ${bad} failed`:'h503: all passed');await b.close();process.exit(bad?1:0);
})();
