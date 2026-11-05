const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["docs/dx1"]={site:"4 Rolle Road, Exmouth",cat:"specs",title:"Kitchen spec",fileName:"kitchen.pdf",assetId:"as1",contentType:"application/pdf",uploaded:5};store["todos/c1"].portalUid="u9";';
function mk(mode){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);if(mode==='client')src=src.replace("id:async()=>${owner?'\"owner\"':'\"emp1\"'}",'id:async()=>"u9"');eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return fake}
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S={db:null','const S=window.__S={db:null').replace('const SENDTO=(()=>{','const SENDTO=window.SENDTO=(()=>{');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await ctx.route(/^https?:\/\//,r=>r.abort());
 try{let fake=mk('owner');await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 // open send dialog directly for the seeded doc
 await p.evaluate(()=>SENDTO.open({assetId:"as1",name:"kitchen.pdf",type:"application/pdf",title:"Kitchen spec",site:"4 Rolle Road, Exmouth",clientId:"c1"}));await p.waitForTimeout(400);
 console.log('trades',await p.locator('.st-t').count(),'clients',await p.locator('.st-c').count(),'client prechecked',await p.locator('.st-c:checked').count());
 await p.check('.st-t[value=emp1]');await p.fill('#st-note','Read before Monday');await p.fill('#st-email','bad address');await p.click('#f-save');await p.waitForTimeout(300);console.log('err',await p.innerText('#f-err'));await p.fill('#st-email','sue@example.com, info@ems.co.uk');await p.click('#f-save');await p.waitForTimeout(800);
 console.log('mailto',await p.evaluate(()=>location.href).then(h=>h.startsWith('mailto:')?h.slice(0,80):'none'),'dl',await p.evaluate(()=>(window.__dl||[]).length));
 const st=await p.evaluate(()=>{const s=window.__st;return {docs:Object.keys(s).filter(k=>k.startsWith('docs/')&&s[k].sentTo).map(k=>s[k]),prompts:Object.keys(s).filter(k=>k.startsWith('sheets/emp1/signoffs/pr-')).map(k=>s[k]),portal:Object.keys(s).filter(k=>k.startsWith('portal/u9/docs/')).map(k=>s[k]),audit:Object.values(s).filter(x=>x&&x.kind==='audit').map(x=>x.action)}});
 console.log(JSON.stringify(st).slice(0,600));
 const storeDump=await p.evaluate(()=>JSON.stringify(window.__st));
 // trade view with same store
 fake=mk('trade');let tsrc='<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src.replace('function detailsDone(d){return !!(d&&d.confirmedAt)}','function detailsDone(d){return true}')+'</body></html>';
 await p.setContent(tsrc.replace('const store={}, listeners=[];window.__st=store;','const store=Object.assign({},'+storeDump+'), listeners=[];window.__st=store;'));await p.waitForTimeout(2000);
 console.log('trade sees sheet',await p.locator('#sheet:not([hidden])').count(),(await p.innerText('#form').catch(()=>'')).replace(/\n/g,' | ').slice(0,200));
 const go=p.locator('#form .pr-go');if(await go.count()){await go.first().click({force:true});await p.waitForTimeout(600);console.log('fileview open',await p.locator('#fileview:not([hidden])').count(),'title',await p.innerText('#fv-title'))}
 // client view
 fake=mk('client');let csrc='<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src+'</body></html>';
 await p.setContent(csrc.replace('const store={}, listeners=[];window.__st=store;','const store=Object.assign({},'+storeDump+'), listeners=[];window.__st=store;'));await p.waitForTimeout(2200);
 console.log('client banner',(await p.innerText('#main .notice.warn:has(#pt-seen)').catch(()=>'none')).replace(/\n/g,' | ').slice(0,200),'| docs tab',await p.innerText('.ptabs button[data-v=docs]'));
 await p.click('#pt-seen');await p.waitForTimeout(600);console.log('after seen banner',await p.locator('#pt-seen').count(),'docs tab',await p.innerText('.ptabs button[data-v=docs]'));
 }catch(e){console.log('FAIL',e.message.split('\n').slice(0,4).join('|'))}
 await b.close()})();
