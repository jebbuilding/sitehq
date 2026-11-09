// Weather-wise planner (a made-up 10-day forecast): a concrete pour booked on a day with 91% rain, a roof strip on a
// 70% day, an indoor kitchen first fix later in the week. Today and the planner warn about both outdoor jobs, say
// why, and offer the first day the work can take; the pour can be swapped with the indoor job (both move), the roof
// strip moved. A frosty night stops a pour; no forecast, no warnings.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const pad=n=>String(n).padStart(2,'0');const isoD=x=>x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());
const D=n=>{const x=new Date();x.setHours(12,0,0,0);x.setDate(x.getDate()+n);return x;};
/* day 1 rain 91% (5 mm), day 2 rain 70%, day 3 frost (1°C), day 4 onwards dry and mild */
const days=[];for(let i=0;i<10;i++)days.push({d:isoD(D(i)),rain:i===1?91:i===2?70:5,mm:i===1?5.1:i===2?1.2:0,max:11,min:i===3?1:6,gust:20,phrase:i===1?'Rain':'Cloudy'});
const notSun=i=>D(i).getDay()!==0;
/* what the app should pick: the first day after the bad one the work can take, not a Sunday */
const firstGood=(after,ok)=>{for(let i=after+1;i<10;i++)if(notSun(i)&&ok(days[i]))return i;return -1;};
const pourOK=d=>!(d.rain>=60||d.mm>=5||d.min<=2),roofOK=d=>!(d.rain>=50||d.gust>=50);
const pourTo=firstGood(1,pourOK),roofTo=firstGood(2,roofOK);
const S='12 Marine Way, Exmouth';
const extra='store["settings/forecast"]={at:Date.now(),source:"AccuWeather",places:[{name:"Exmouth, Devon",site:"",key:"322498",days:'+JSON.stringify(days)+'}]};'+
 'store["plan/b1"]={title:"Concrete pour – footings",site:"'+S+'",from:"'+days[1].d+'",to:"'+days[1].d+'",vis:"all",people:[]};'+
 'store["plan/b2"]={title:"Kitchen first fix",site:"'+S+'",from:"'+days[pourTo].d+'",to:"'+days[pourTo].d+'",vis:"all",people:[]};'+
 'store["plan/b3"]={title:"Roof strip and felt",site:"'+S+'",from:"'+days[2].d+'",to:"'+days[2].d+'",vis:"all",people:[]};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const nm=i=>D(i).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await ctx.route(/^https?:\/\//,r=>r.abort());
 const plan=id=>p.evaluate(id=>window.__st['plan/'+id],id);
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 if(await p.$('#nl-tog')){await p.click('#nl-tog');await p.waitForTimeout(300);await p.evaluate(()=>{const t=document.querySelector('#nl-tog');if(t)t.style.display='none'});}
 ok(pourTo>3&&roofTo>2,'(test set-up: the pour can go on day '+pourTo+', the roof strip on day '+roofTo+')');
 await p.evaluate(()=>document.querySelector('#nlbar .nl-b[data-s=today]').click());await p.waitForTimeout(400);
 ok(await p.isVisible('.wp-card'),'Today: a weather card');
 const card=await p.innerText('.wp-card');
 ok(/2 bookings the weather looks wrong for/.test(card),'2 bookings the weather looks wrong for');
 ok(new RegExp('Concrete pour[\\s\\S]*'+nm(1)+': rain 91%, 5\\.1 mm').test(card),'the pour: rain 91%, 5.1 mm on '+nm(1));
 ok(new RegExp('Roof strip[\\s\\S]*'+nm(2)+': rain 70%').test(card),'the roof strip: rain 70% on '+nm(2));
 ok(!(await p.$$eval('.wp-card .wp-row b',x=>x.map(e=>e.textContent))).some(t=>/Kitchen/.test(t)),'the indoor job is not warned about');
 ok(new RegExp('Move to '+nm(pourTo)).test(card)&&new RegExp('Swap with Kitchen first fix \\('+nm(pourTo)+'\\)').test(card),'the pour: move to '+nm(pourTo)+' (frosty '+nm(3)+' skipped), or swap with the kitchen first fix that day');
 ok(new RegExp('Move to '+nm(roofTo)).test(card),'the roof strip: move to '+nm(roofTo));
 await p.screenshot({path:'h468-today.png'});
 /* the planner shows it too */
 await p.evaluate(()=>document.querySelector('.tab[data-t=planner]').click());await p.waitForTimeout(500);
 ok(await p.isVisible('#main .wp-card'),'the planner shows the warning at the top');
 /* swap the pour with the indoor job */
 await p.locator('#main .wp-row',{hasText:'Concrete pour'}).locator('.wp-swap').click();await p.waitForTimeout(600);
 const b1=await plan('b1'),b2=await plan('b2');
 ok(b1.from===days[pourTo].d&&b2.from===days[1].d,'swapped: the pour on '+nm(pourTo)+', the kitchen first fix on '+nm(1)+' (indoors, in the rain)');
 /* move the roof strip */
 await p.evaluate(()=>document.querySelector('.tab[data-t=planner]').click());await p.waitForTimeout(500);
 await p.locator('#main .wp-row',{hasText:'Roof strip'}).locator('.wp-move').click();await p.waitForTimeout(600);
 ok((await plan('b3')).from===days[roofTo].d,'the roof strip moved to '+nm(roofTo));
 await p.evaluate(()=>document.querySelector('.tab[data-t=planner]').click());await p.waitForTimeout(500);
 ok(!(await p.$('#main .wp-card')),'nothing left to warn about');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h468: ${bad} failed`:'h468: all passed');await b.close();process.exit(bad?1:0);
})();
