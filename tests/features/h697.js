// Site diary weather and saving (made-up site 4 Rolle Road with a map pin; a made-up forecast stands in for
// Open-Meteo): with no forecast sent from anywhere, James's app fetches it itself for his base and the site, keeps it
// in settings/weather and settings/forecast, and the site diary shows today's weather. The note saves by itself a
// moment after typing (✓ Saved) – there's no Save button to forget.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+'store["todos/c1"].lat=50.62;store["todos/c1"].lon=-3.41;');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({OWX});function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const SITE='4 Rolle Road, Exmouth';
const pad=n=>String(n).padStart(2,'0');const d0=new Date();const day=k=>{const d=new Date(d0.getFullYear(),d0.getMonth(),d0.getDate()+k);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
let asked=[];
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();
  if(u.includes('api.open-meteo.com')){asked.push(u);const n=new URL(u).searchParams.get('latitude').split(',').length;
   const one={current:{temperature_2m:9.4,weather_code:61,wind_speed_10m:24},daily:{time:[0,1,2,3,4,5,6,7,8,9].map(day),weather_code:[61,3,0,0,80,80,3,3,0,0],temperature_2m_max:[10,11,12,12,9,9,10,11,12,12],temperature_2m_min:[4,5,5,3,2,2,4,5,6,6],precipitation_probability_max:[80,20,5,5,60,60,30,20,5,5],precipitation_sum:[6,0,0,0,3,3,0,0,0,0],wind_gusts_10m_max:[45,30,20,20,50,50,30,25,20,20]}};
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(n>1?Array(n).fill(one):one)});}
  r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog').catch(()=>{});
 await p.evaluate(()=>window.__T().OWX.tick(true));await p.waitForTimeout(800);
 const st=await p.evaluate(()=>({w:window.__st['settings/weather'],f:window.__st['settings/forecast']}));
 ok(asked.length===1&&/latitude=[\d.,-]+,50\.620/.test(asked[0]),'it asks for the weather for the base and the site (by its map pin)');
 ok(st.f&&st.f.src==='open-meteo'&&st.f.places.some(x=>x.site===SITE&&x.days.length===10),'10 days of forecast kept for the site');
 ok(st.w&&st.w.places.some(x=>x.temp===9.4&&x.wind===15&&x.icon===12),'the weather now kept too (9.4°C, wind 15 mph, rain)');
 ok(/Rain/.test(await p.innerText('#nowbar'))||/9°C/.test(await p.innerText('#nowbar')),'the date bar shows it: '+(await p.innerText('#nowbar')).replace(/\s+/g,' ').slice(0,80));
 /* the site diary */
 await p.evaluate(s=>{const S=window.__S;S.otab='projects';S.f.proj=s;S.f.projList=false;S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(500);
 await p.click('.pjtile[data-t=diary]');await p.waitForTimeout(500);
 const t=await p.innerText('.sdi');
 ok(/Rain, 10°C, rain 80%/.test(t),'the site diary shows today\'s weather: '+(t.match(/🌤[^\n]*/)||[''])[0]);
 ok(!(await p.isVisible('#sdi-save'))&&/saves by itself/.test(t),'no Save button – it says the note saves by itself');
 await p.fill('#sdi-note','Wet morning, roofers stood down till 11.');await p.waitForTimeout(2200);
 const rec=await p.evaluate(s=>Object.entries(window.__st).find(([k,v])=>/^todos\/sdi-/.test(k)&&v.note),SITE);
 ok(rec&&rec[1].note==='Wet morning, roofers stood down till 11.'&&/Rain/.test(rec[1].weather),'the note saved itself (with the day\'s weather)');
 ok(/✓ Saved/.test(await p.innerText('#sdi-st')),'and says ✓ Saved');
 await p.screenshot({path:'h697-diary.png'});
 /* a fresh forecast from elsewhere is left alone */
 asked=[];await p.evaluate(()=>{window.__S.wxFc={at:Date.now(),places:[]};});await p.evaluate(()=>window.__T().OWX.tick());await p.waitForTimeout(500);
 ok(asked.length===0,'when a fresh forecast has come from elsewhere, it doesn\'t fetch again');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h697: ${bad} failed`:'h697: all passed');await b.close();process.exit(bad?1:0);
})();
