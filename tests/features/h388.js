const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const T=new Date();const pad=n=>String(n).padStart(2,'0');const today=T.getFullYear()+'-'+pad(T.getMonth()+1)+'-'+pad(T.getDate());
const extra=`store["sheets/emp1/signins/s1"]={site:"12 Marine Way, Exmouth",date:"${today}",in:"07:40",out:"",open:true,inAt:1,by:"self",created:1};`;
function mk(){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed+extra);eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return fake}
const page_src=fs.readFileSync('timesheets.html','utf8').replace('function detailsDone(d){return !!(d&&d.confirmedAt)}','function detailsDone(d){return true}').replace('const S={db:null','const S=window.__S={db:null');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);let p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await ctx.route(/^https?:\/\//,r=>r.abort());
 try{
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+mk()(true)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 await p.click('.tab[data-t=signin]');await p.waitForTimeout(1500);console.log('owner edit buttons',await p.locator('.sb-ed').count());
 await p.locator('.sb-ed[data-src=signin]').first().click();await p.waitForSelector('#se-in');await p.fill('#se-in','07:55');await p.fill('#se-out','15:30');await p.evaluate(()=>document.getElementById('form').requestSubmit());await p.waitForTimeout(700);
 console.log('owner edited',JSON.stringify(await p.evaluate(()=>{const x=window.__st['sheets/emp1/signins/s1'];return {in:x.in,out:x.out,open:x.open,editedBy:x.editedBy}})));
 await p.click('.tab[data-t=people]');await p.waitForTimeout(500);console.log('people photo pickers',await p.locator('.pp-avpick').count());
 console.log('file viewer print btn',await p.locator('#fv-print').count());
 // trade
 p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));p.setDefaultTimeout(8000);
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+mk()(false)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 await p.click('.tab[data-t=signin]');await p.waitForTimeout(600);const closeSheet=async()=>{if(await p.evaluate(()=>!document.getElementById('sheet').hidden)){await p.click('#f-cancel').catch(()=>{});await p.waitForTimeout(300)}};await closeSheet();console.log('trade edit buttons',await p.locator('.si-ed').count());
 await p.evaluate(()=>{const S=window.__S;let v=S.tab;window.__tl=[];Object.defineProperty(S,'tab',{get:()=>v,set:x=>{window.__tl.push(x+' <- '+(new Error().stack.split('\n').slice(2,5).map(l=>l.trim().slice(0,90)).join(' | ')));v=x},configurable:true})});await closeSheet();await p.locator('.si-ed[data-src=s]').first().click();await p.waitForSelector('#se-in');await p.fill('#se-in','07:45');await p.evaluate(()=>document.getElementById('form').requestSubmit());await p.waitForTimeout(700);
 console.log('tab log',await p.evaluate(()=>JSON.stringify(window.__tl)));console.log('trade edited in',await p.evaluate(()=>window.__st['sheets/emp1/signins/s1'].in),'h1',await p.innerText('#h1'),'sheet',await p.evaluate(()=>!document.getElementById('sheet').hidden),'mine',await p.evaluate(()=>JSON.stringify(window.__S.mine.signins)));
 await closeSheet();await p.locator('.si-ed[data-src=s]').first().click();await p.waitForSelector('#f-del');await p.click('#f-del');await p.click('#f-del');await p.waitForTimeout(700);
 console.log('trade deleted',!(await p.evaluate(()=>'sheets/emp1/signins/s1' in window.__st)));
 }catch(e){console.log('FAIL',e.message.split('\n').slice(0,4).join('|'))}
 await b.close()})();
