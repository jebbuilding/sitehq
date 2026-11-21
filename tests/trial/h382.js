const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},hasTouch:true});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 console.log('tab label',await p.innerText('.tab[data-t=jobs]'));
 await p.click('.tab[data-t=setup]');await p.waitForTimeout(500);await p.click('#co-wsites');await p.waitForTimeout(400);await p.click('#wsv-add');await p.waitForTimeout(400);
 await p.fill('#ws-name','EMS Hill Barton');await p.fill('#ws-company','EMS Waste Services Ltd');await p.fill('#ws-addr','Hill Barton Business Park, Sidmouth Road, Clyst St Mary, Exeter');await p.fill('#ws-postcode','ex5 1dr');await p.fill('#ws-email','info@emswasteservices.co.uk');await p.fill('#ws-permitNo','EPR/XX1234YY');await p.fill('#ws-permitBy','Environment Agency');await p.fill('#ws-carrierNo','CBDU000001');await p.selectOption('#ws-carrierKind','Carrier');
 await p.click('#f-save');await p.waitForTimeout(600);console.log('sites',(await p.innerText('.wtl')).replace(/\n/g,' | ').slice(0,160),'| stored',await p.evaluate(()=>(window.__st['settings/app'].wasteSites||[]).length));
 await p.click('#viewer-close');await p.waitForTimeout(300);await p.click('.tab[data-t=jobs]');await p.waitForTimeout(400);console.log('h1',await p.innerText('#h1'));await p.click('#wt-new');await p.waitForTimeout(500);
 await p.click('[data-party=B][data-role=us]');await p.waitForTimeout(300);await p.selectOption('#wt-D-site',{index:1});await p.waitForTimeout(400);
 console.log('C',await p.inputValue('#wt-C-company'),'| D1',await p.inputValue('#wt-D-addr'),await p.inputValue('#wt-D-postcode'));
 await p.click('#wt-save');await p.waitForTimeout(500);console.log('sv',await p.innerText('#wt-sv'),'saved doc',await p.evaluate(()=>Object.values(window.__st).some(x=>x&&x.kind==='wtn'&&x.C&&x.D.siteId)));
 await p.click('#viewer-close');await p.waitForTimeout(400);console.log('row del btn',await p.locator('.wt-rowdel').count());await p.locator('.wt-rowdel').first().click();await p.waitForTimeout(300);await p.click('.wd-yes');await p.waitForTimeout(500);console.log('after delete rows',await p.locator('.wt-open').count(),'bin',await p.evaluate(()=>Object.keys(window.__st).filter(k=>k.startsWith('todos/bin-')).length));
 }catch(e){console.log('FAIL',e.message.split('\n').slice(0,4).join('|'))}
 await b.close()})();
