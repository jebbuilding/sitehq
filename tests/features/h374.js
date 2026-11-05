const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S={db:null','const S=window.__S={db:null');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},hasTouch:true});ctx.setDefaultTimeout(6000);const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 // delete a timesheet entry of emp1 and the client c1 + a plan entry via the db wrapper, as the UI would
 const r=await p.evaluate(async()=>{const st=window.__st;const before=Object.keys(st).filter(k=>k.startsWith('todos/bin-')).length;
   await window.__S.db.doc('sheets/emp1/entries/dw2').delete();await new Promise(r=>setTimeout(r,700));
   await window.__S.db.doc('todos/c1').delete();await window.__S.db.doc('sites/s2').delete();await new Promise(r=>setTimeout(r,3200));
   const bins=Object.keys(st).filter(k=>k.startsWith('todos/bin-')).map(k=>st[k]);
   return {before,n:bins.length,items:bins.map(x=>({title:x.title,sub:x.sub,type:x.type,refs:x.refs.map(r=>r.t+':'+r.path)})),c1:'todos/c1' in st,dw2:'sheets/emp1/entries/dw2' in st,sbin:window.__S.bin.length}});
 console.log(JSON.stringify(r,null,1));
 // open Setup › Deleted items and put the client back
 await p.click('.tab[data-t=setup]');await p.waitForTimeout(600);await p.click('#co-bin');await p.waitForTimeout(600);
 console.log('view',(await p.innerText('#viewer-body')).replace(/\n/g,' | ').slice(0,500));
 const rows=await p.locator('.bn-res').count();console.log('rows',rows);
 await p.locator('.bn-view').first().click();await p.waitForTimeout(300);console.log('recview',(await p.innerText('.dimbox')).replace(/\n/g,' | ').slice(0,300));await p.click('.bnv-x');
 await p.locator('.bn-res').first().click();await p.waitForTimeout(800);
 const r2=await p.evaluate(()=>{const st=window.__st;return {c1:'todos/c1' in st,s2:'sites/s2' in st,bins:Object.keys(st).filter(k=>k.startsWith('todos/bin-')).length}});console.log(JSON.stringify(r2));
 await p.screenshot({path:'bin1.png'});
 }catch(e){console.log('FAIL',e.message.split('\n').slice(0,4).join('|'))}
 await b.close()})();
