// Weekly update to the client (made-up Sue Jones, 4 Rolle Road, Friday 27 Nov 2026): the programme stage finished this
// week, the next one starting, the diary note and this week's photo; Today on a Friday lists her; 📤 Send puts the PDF in
// her portal's Photos, emails the words, and notes the week as sent.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;').replace('function render() {','window.render=render;window.__T=()=>({WKU});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.clock.install({time:new Date('2026-11-27T15:00:00')});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.clock.runFor(2500);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__mail=[];const o=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(/^mailto:/.test(this.href)){window.__mail.push(this.href);return}return o.call(this)}});
 const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=60;const g=c.getContext('2d');g.fillStyle='#996633';g.fillRect(0,0,80,60);return c.toDataURL('image/jpeg')});
 await p.evaluate(async(png)=>{const S=window.__S;const r=await fetch(png);window.__blobs.ph1=await r.blob();
   await S.db.doc('todos/prog-4-rolle-road-exmouth').set({kind:'programme',site:'4 Rolle Road, Exmouth',start:'2026-11-16',updated:1,stages:[{id:'a',name:'Steels and floor joists',days:4,after:'',link:'',lag:0,done:true,actFrom:'2026-11-20',actTo:'2026-11-25'},{id:'b',name:'Dormer and roof',days:8,after:'a',link:'end',lag:0}]});
   await S.db.doc('todos/sdi-4-rolle-road-exmouth-2026-11-25').set({kind:'sitediary',site:'4 Rolle Road, Exmouth',date:'2026-11-25',note:'Steel beam in and signed off by building control.',updated:1});
   await S.db.doc('sheets/emp1/photos/ph1').set({site:'4 Rolle Road, Exmouth',date:'2026-11-26',assetId:'ph1',contentType:'image/jpeg',takenAt:new Date('2026-11-26T10:00:00').getTime(),created:1});},png);
 await p.clock.runFor(1500);
 ok(await p.evaluate(()=>window.__T().WKU.due().some(c=>c.id==='c1')),'on a Friday, Sue is on the list of updates to send');
 await p.click('#nl-tog');await p.clock.runFor(800);
 ok(await p.isVisible('.wku-today')&&/Sue Jones/.test(await p.innerText('.wku-today')),'Today shows 📰 Weekly updates to send – Sue Jones');
 await p.click('.wku-go');await p.clock.runFor(800);
 const t=await p.inputValue('#wku-t');
 ok(/Hello Sue/.test(t)&&/Done this week:\n• Steels and floor joists/.test(t)&&/Steel beam in and signed off/.test(t)&&/Coming up next week:\n• Dormer and roof/.test(t),'the draft: what was done, the diary note, what\'s next');
 ok(await p.locator('.wku-p[aria-pressed=true]').count()===1,'this week\'s photo is ticked to go in');
 await p.screenshot({path:'h685-update.png'});
 await p.click('#f-save');await p.clock.runFor(5000);
 const st=await p.evaluate(()=>window.__st['todos/c1']);
 ok((st.ptDocs||[]).some(d=>/Weekly update – week of/.test(d.title)&&d.folder==='photos'),'📤 the update PDF is in her portal\'s Photos');
 ok((st.updates||[]).some(u=>u.wk==='2026-11-23'),'the week is noted as sent');
 const m=await p.evaluate(()=>window.__mail.slice(-1)[0]||'');
 ok(/^mailto:sue%40example\.com/.test(m)&&/Steels%20and%20floor%20joists/.test(m),'and the words are emailed to her');
 ok(!(await p.evaluate(()=>window.__T().WKU.due().some(c=>c.id==='c1'))),'and she drops off the Friday list');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h685: ${bad} failed`:'h685: all passed');await b.close();process.exit(bad?1:0);
})();
