// Client choices (made-up client Sue Jones, 4 Rolle Road): from Sue's portal page James asks her to choose a kitchen
// worktop with a £1,000 allowance – laminate £800 or oak block £1,200 (with a photo). Sue's portal has a 🎨 Choices
// tab showing each option against her allowance; she chooses oak (£200 over). James sees her choice and one tap
// starts a variation for the £200 (£166.67 + VAT) for her to sign, and the choice is locked.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/c1"].portalUid="u9";';
const HOOK='function ptManager(c) {';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2,'test hook found once');
page_src=page_src.replace(HOOK,'window.__ptm=(id)=>ptManager((window.__S.clients||[]).find(x=>x.id===id));'+HOOK).replace('const S = {\n  db: null','const S=window.__S={db:null');
const img=fs.readFileSync('fixtures/ld1.png').toString('base64');
page_src=page_src.replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;');
function mk(mode,storeDump){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra+(storeDump?'Object.assign(store,'+storeDump+');':''));src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');if(mode==='client')src=src.replace("id:async()=>${owner?'\"owner\"':'\"emp1\"'}",'id:async()=>"u9"');eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake(mode==='owner');}
const picks=(pg)=>pg.evaluate(()=>Object.entries(window.__st).filter(([k])=>/^portal\/u9\/picks\//.test(k)).map(([k,v])=>Object.assign({k},v)));
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:900,height:1000}});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());
 const page=async(mode,dump)=>{const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',mode,e.message);bad++;});await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+mk(mode,dump)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');return p;};
 try{
 /* James asks Sue to choose */
 const p=await page('owner');
 await p.evaluate(()=>window.__ptm('c1'));await p.waitForTimeout(600);
 ok(/Choices for them to make/.test(await p.innerText('#viewer-body')),'Sue\'s portal page has a Choices section');
 await p.click('#cs-add');await p.waitForTimeout(300);
 await p.fill('#cs-title','Kitchen worktop');await p.fill('#cs-room','Kitchen');await p.fill('#cs-allow','1000');
 await p.click('#cs-addopt');await p.click('#cs-addopt');
 await p.locator('.cs-on').nth(0).fill('Laminate');await p.locator('.cs-op').nth(0).fill('800');
 await p.locator('.cs-on').nth(1).fill('Oak block');await p.locator('.cs-op').nth(1).fill('1200');
 await p.locator('.cs-fileinp').nth(1).setInputFiles('fixtures/ld1.png');await p.waitForTimeout(300);
 await p.click('#f-save');await p.waitForTimeout(1200);
 let P=await picks(p);console.log(JSON.stringify(P).slice(0,300));
 ok(P.length===1&&P[0].title==='Kitchen worktop'&&P[0].allowance===1000&&P[0].options.length===2,'the choice goes to her portal with its allowance and options');
 ok(P[0].options[1].photo&&P[0].options[1].price===1200,'the oak option has its photo and price');
 /* Sue chooses */
 const q=await page('client',await p.evaluate(()=>JSON.stringify(window.__st)));
 ok(await q.isVisible('.ptabs button[data-v=choices]')&&/1/.test(await q.innerText('.ptabs button[data-v=choices]')),'Sue\'s portal has a 🎨 Choices tab with 1 to do');
 await q.click('.ptabs button[data-v=choices]');await q.waitForTimeout(400);
 const t=await q.innerText('#main');
 ok(/Your allowance: £1,000\.00/.test(t)&&/£200\.00 under your allowance/.test(t)&&/£200\.00 over your allowance/.test(t),'each option shows against her allowance');
 await q.locator('.cs-pick').nth(1).click();await q.waitForTimeout(200);
 ok(/£200\.00 over your allowance/.test(await q.innerText('.dimbox')),'she is told it is over before choosing');
 await q.click('.cs-yes');await q.waitForTimeout(800);
 P=await picks(q);
 ok(P[0].choice&&P[0].choice.name==='Oak block'&&P[0].status==='chosen','her choice is saved');
 ok(/Your choice/.test(await q.innerText('#main'))&&await q.locator('.cs-pick').count()===1,'it shows as her choice, and she can still change it');
 /* James sees it and makes the extra */
 const r=await page('owner',await q.evaluate(()=>JSON.stringify(window.__st)));
 await r.evaluate(()=>window.__ptm('c1'));await r.waitForTimeout(600);
 const v=await r.innerText('#viewer-body');
 ok(/Oak block/.test(v)&&/£200\.00 over the £1,000\.00 allowance/.test(v),'James sees what she chose and that it is £200 over');
 await r.click('.cs-var');await r.waitForTimeout(600);
 ok(/Oak block/.test(await r.inputValue('#vr-title'))&&await r.inputValue('#vr-amt')==='166.67','a variation is started for the £200 (£166.67 + VAT)');
 P=await picks(r);
 ok(P[0].status==='locked'&&P[0].varAt,'and the choice is locked');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h474: ${bad} failed`:'h474: all passed');await b.close();process.exit(bad?1:0);
})();
