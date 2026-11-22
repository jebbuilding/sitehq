// New enquiry with a job name and a visit (made-up): 📝 New enquiry › someone new has Job name and 📅 Book a visit – date, time, how long, the
// diary check and the phone-calendar tick, like ⚡ Quick enquiry; saving books it on the client (visit, follow-up, note)
// and in the planner with a reminder an hour before.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));

src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1100}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 const day=await p.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+3);return d.toISOString().slice(0,10)});
 await p.evaluate(()=>{const S=window.__S;S.otab='clients';S.f.clf='all';window.render()});await p.waitForTimeout(400);
 await p.click('#cl-enq');await p.waitForTimeout(400);await p.click('#ne-new');await p.waitForTimeout(600);
 ok(await p.isVisible('#cf-jn')&&await p.locator('#cf-ctype button').count()===2,'📝 New enquiry has Job name, and Domestic or commercial');
 ok(await p.isVisible('#cf-vd')&&await p.isVisible('#cf-vt')&&await p.isVisible('#cf-vlen'),'📝 New enquiry has 📅 Book a visit: date, time and how long');
 await p.fill('#cf-main .cfm-f','Tom');await p.fill('#cf-main .cfm-l','Baker').catch(()=>{});
 await p.fill('#cf-addr','9 Mill Lane, Exmouth');await p.fill('#cf-phone','07700 900123');await p.fill('#cf-jn','Baker  garden room');await p.click('#cf-ctype button[data-v=commercial]');await p.locator('#cf-jn').scrollIntoViewIfNeeded();await p.screenshot({path:'h648-type.png'});
 await p.fill('#cf-vd',day);await p.fill('#cf-vt','14:00');await p.selectOption('#cf-vlen','90');await p.waitForTimeout(400);
 ok(/\S/.test(await p.innerText('#cf-vdiary')),'it shows the diary for that day, like Quick enquiry');
 await p.uncheck('#cf-vics');
 await p.screenshot({path:'h648-enquiry.png',fullPage:true});
 await p.click('#f-save');await p.waitForTimeout(1500);
 const st=await p.evaluate(()=>window.__st);
 const cl=Object.entries(st).find(([k,v])=>v&&v.visit&&/Tom/.test(v.name||''));
 ok(cl&&cl[1].visit&&cl[1].visit.date===day&&cl[1].visit.time==='14:00'&&cl[1].visit.end==='15:30','the client has the visit booked ('+JSON.stringify(cl&&cl[1].visit)+')');
 ok(cl&&cl[1].clientType==='commercial','🏢 Commercial is saved');
 ok(cl&&cl[1].jobName==='Baker garden room','the job name is saved (Baker garden room)');
 ok(cl&&cl[1].follow===day&&(cl[1].notes||[]).some(n=>/Visit booked/.test(n.text)),'follow-up on the visit day, and a note');
 const pl=Object.entries(st).find(([k,v])=>/^plan(private)?\//.test(k)&&/^Visit: .*Tom/.test(v.title||''));
 ok(pl&&pl[1].from===day&&pl[1].time==='14:00'&&pl[1].endTime==='15:30'&&pl[1].remind===60,'it\'s in the planner with a reminder an hour before ('+(pl&&pl[0])+')');
 ok(/Visit booked/.test(await p.innerText('#viewer-body').catch(()=>'')),'the client page says Visit booked');
 await p.evaluate(()=>{const S=window.__S;S.otab='clients';window.render()});await p.waitForTimeout(400);
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h648: ${bad} failed`:'h648: all passed');await b.close();process.exit(bad?1:0);
})();
