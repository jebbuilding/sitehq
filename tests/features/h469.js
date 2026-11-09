// The job story for the client (made-up client Sue Jones, 4 Rolle Road): an accepted estimate (£10,000 + VAT),
// a signed £450 + VAT variation, an invoice sent with £3,000 paid, a stage signed off in the portal and two progress
// photos shared. The owner's app copies just Sue's money to her portal record; Sue's 📖 Job story shows the price
// agreed (£12,540 with the extra), invoiced, paid and left to pay, stages signed off, and a timeline newest first
// with the photos, the sign-offs, the invoice and the payment.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const SITE='4 Rolle Road, Exmouth';
const extra='store["todos/c1"].portalUid="u9";'+
 'store["todos/sd-e1"]={kind:"sale",type:"estimate",number:"3001",date:"2026-10-01",client:"Sue Jones",clientId:"c1",site:"'+SITE+'",status:"accepted",lines:[{d:"Loft conversion",a:10000,vc:"S20",k:"lab"}],payments:[]};'+
 'store["todos/sd-i1"]={kind:"sale",type:"invoice",number:"41",date:"2026-10-20",client:"Sue Jones",clientId:"c1",site:"'+SITE+'",title:"Stage 1",status:"sent",lines:[{d:"Stage 1",a:4000,vc:"S20",k:"lab"}],payments:[{amt:3000,date:"2026-10-27",note:"Bank"}]};'+
 'store["todos/sd-i0"]={kind:"sale",type:"invoice",number:"42",date:"2026-11-01",client:"Sue Jones",clientId:"c1",site:"'+SITE+'",title:"Draft",status:"draft",lines:[{d:"Not sent",a:999,vc:"S20",k:"lab"}],payments:[]};'+
 'store["todos/var-1"]={kind:"variation",number:"V1",site:"'+SITE+'",title:"Extra velux",amt:450,vc:"S20",status:"signed",sign:{name:"Sue Jones",at:1},created:1};'+
 'store["portal/u9/signs/s1"]={kind:"stage",title:"Floor joists in",status:"signed",signedName:"Sue Jones",signedAt:Date.parse("2026-10-24T12:00:00Z"),created:1};'+
 'store["portal/u9/docs/p1"]={title:"Joists",fileName:"joists.png",assetId:"ph1",contentType:"image/png",folder:"photos",sharedAt:Date.parse("2026-10-23T12:00:00Z")};'+
 'store["portal/u9/docs/p2"]={title:"Velux opening",fileName:"velux.png",assetId:"ph2",contentType:"image/png",folder:"photos",sharedAt:Date.parse("2026-10-23T15:00:00Z")};';
const HOOK='async function stSync() {';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2,'test hook found once');
page_src=page_src.replace(HOOK,'window.__stSync=()=>stSync();'+HOOK);
function mk(mode,storeDump){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra+(storeDump?'Object.assign(store,'+storeDump+');':''));if(mode==='client')src=src.replace("id:async()=>${owner?'\"owner\"':'\"emp1\"'}",'id:async()=>"u9"');eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake(mode==='owner');}
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await ctx.route(/^https?:\/\//,r=>r.abort());
 try{
 /* the owner's app copies Sue's money to her portal */
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+mk('owner')+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>window.__stSync());await p.waitForTimeout(400);
 const m=await p.evaluate(()=>window.__st['portal/u9'].money);
 console.log(JSON.stringify(m));
 ok(m&&m.price===12540&&m.variations===1,'price agreed: £12,000 estimate + £540 variation = £12,540');
 ok(m.invoiced===4800&&m.paid===3000&&m.invoices.length===1&&m.invoices[0].no.includes('41'),'invoiced £4,800 (the draft left out), paid £3,000');
 ok(m.left===9540,'left to pay £9,540');
 ok(!JSON.stringify(m).includes('999')&&!('profit' in m)&&!('cost' in m),'only her own invoice figures: no drafts, costs or profit');
 const storeDump=await p.evaluate(()=>JSON.stringify(window.__st));
 /* Sue's own portal */
 const q=await ctx.newPage();q.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await q.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+mk('client',storeDump)+page_src+'</body></html>');await q.waitForTimeout(2200);await q.keyboard.press('Escape');
 ok(await q.isVisible('.ptabs button[data-v=story]'),'Sue\'s portal has a 📖 Job story tab');
 await q.click('.ptabs button[data-v=story]');await q.waitForTimeout(400);
 const sum=await q.innerText('.st-sum');
 ok(/Price agreed\s*£12,540\.00\s*including 1 extra agreed/.test(sum),'summary: price agreed £12,540 including 1 extra');
 ok(/Invoiced\s*£4,800\.00/.test(sum)&&/Paid\s*£3,000\.00/.test(sum)&&/Left to pay\s*£9,540\.00/.test(sum),'invoiced, paid and left to pay');
 ok(/Stages signed off\s*1/.test(sum),'1 stage signed off');
 const line=await q.innerText('.st-line');
 const days=await q.$$eval('.st-line .st-date',x=>x.map(e=>e.textContent));
 console.log(days.join(' | '));
 ok(/27 October/.test(days[0])&&/20 October/.test(days[days.length-1]),'timeline newest first: the payment (27 Oct) down to the invoice (20 Oct)');
 ok(/Payment received: £3,000\.00/.test(line)&&/Invoice .*41 – Stage 1: £4,800\.00/.test(line),'the payment and the invoice are there');
 ok(/Stage signed off: Floor joists in/.test(line),'the signed-off stage is there');
 ok(/2 progress photos/.test(line)&&(await q.$$('.st-line .st-ph img')).length===2,'the two progress photos of 23 Oct, together');
 await q.screenshot({path:'h469-story.png',fullPage:true});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h469: ${bad} failed`:'h469: all passed');await b.close();process.exit(bad?1:0);
})();
