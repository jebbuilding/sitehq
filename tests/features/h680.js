// Site diary keeps the day (made-up site 4 Rolle Road): the day's weather is written into the diary by itself (and kept
// once the forecast moves on), and forms done on the site that day – here an accident report and a risk assessment –
// are listed with who did them, on the page and in the diary PDF.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({sdiKeepWeather});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1100,height:1200}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 const today=await p.evaluate(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')});
 await p.evaluate(async(t)=>{const S=window.__S;S.wxFc={places:[{name:'Exmouth',site:'4 Rolle Road, Exmouth',days:[{d:t,phrase:'Heavy rain',max:9,rain:90,gust:20}]}]};
   await S.db.doc('sheets/emp1/signoffs/inc1').set({type:'incident',site:'4 Rolle Road, Exmouth',date:t,kind:'Slip on wet scaffold board',created:Date.now()});
   await S.db.doc('sheets/emp1/signoffs/ra1').set({type:'ra',site:'4 Rolle Road, Exmouth',date:t,title:'Working at height',created:Date.now()});
   await window.__T().sdiKeepWeather();},today);
 await p.waitForTimeout(800);
 const rec=await p.evaluate(t=>window.__st['todos/sdi-4-rolle-road-exmouth-'+t],today);
 ok(rec&&/Heavy rain, 9°C, rain 90%/.test(rec.weather)&&rec.kind==='sitediary','the day\'s weather is written into the diary by itself: '+(rec&&rec.weather));
 /* the forecast moves on: the kept weather stays */
 await p.evaluate(()=>{window.__S.wxFc=null;});
 await p.evaluate(s=>{const S=window.__S;S.otab='projects';S.f.projList=false;S.f.proj=s;window.render();S.f.pjtab='diary';window.render()},'4 Rolle Road, Exmouth');await p.waitForTimeout(800);
 const t=await p.innerText('.sdi');
 ok(/Heavy rain, 9°C/.test(t),'the diary page shows it, even with no forecast now');
 ok(/Forms, checks and sign-offs/.test(t)&&/Accident \/ incident report: Slip on wet scaffold board/.test(t)&&/Risk assessment: Working at height/.test(t)&&/Sam Test/.test(t),'forms done that day are listed, with who did them');
 await p.screenshot({path:'h680-diary.png'});
 await p.click('#sdi-pdf');await p.waitForTimeout(800);
 const btn=await p.$('.dimbox button, #sheet button[data-v], .sdi-pw');
 if(await p.isVisible('#f-save'))await p.click('#f-save');
 await p.waitForTimeout(4000);
 const pdf=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];if(!d)return '';const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return s});
 ok(/Forms, checks and sign-offs/.test(pdf)&&/Slip on wet scaffold board/.test(pdf)&&/Heavy rain/.test(pdf),'and in the diary PDF');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h680: ${bad} failed`:'h680: all passed');await b.close();process.exit(bad?1:0);
})();
