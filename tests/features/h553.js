// Planner (new look, iPad and phone; made-up people and two made-up programmes): the Day view shows stages and bookings
// that last all day (kept in view when the hours are scrolled), opens at 07:00 on another day and has a heading per group
// of people; Who's where shows a job nobody is on by its stage name only, "Nobody booked yet", and each person's stage.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:1300},deviceScaleFactor:1.5});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true');localStorage.setItem('jeb.splash','1')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset=utf8><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fake(true)+page_src+'</body></html>'}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.goto('https://sitehq.test/');await p.waitForTimeout(3000);await p.keyboard.press('Escape');
 await p.evaluate(async()=>{const S=window.__S;await S.db.doc('sheets/sub1').set({name:'Kahn Test',role:'sub',joined:1});await S.db.doc('sheets/co1').set({name:'Lee Test',role:'company',company:'Test Roofing Ltd',joined:1});});
 await p.waitForTimeout(800);
 for(const [site,t] of [['4 Rolle Road, Exmouth','kitchen'],['12 Marine Way, Exmouth','extension']]){await p.evaluate(s=>{const o=document.getElementById('ohq');if(o)o.hidden=true;const S=window.__S;S.otab='projects';S.f.projList=false;S.f.proj=s;window.render();S.f.pjtab='programme';window.render()},site);await p.waitForTimeout(500);await p.fill('#pg-start','2026-11-16');await p.click('.pg-new[data-t='+t+']');await p.waitForTimeout(900);await p.click('#pg-save');await p.waitForTimeout(1500);}
 /* Kahn on the Rolle Road first fix; the Marine Way foundations left without anyone */
 await p.evaluate(async()=>{const S=window.__S;for(const [k,v] of Object.entries(window.__st).filter(([k,v])=>k.startsWith('plan/')&&v&&v.title)){if(/^First fix/.test(v.title)&&/Rolle/.test(v.site||v.title))await S.db.doc(k).update({people:['sub1'],from:'2026-11-18',to:'2026-11-19'});if(/^Dig and pour/.test(v.title))await S.db.doc(k).update({people:[],from:'2026-11-18',to:'2026-11-19'});}});
 await p.waitForTimeout(800);
 const mode=async m=>{await p.evaluate(m=>{const S=window.__S;S.otab='planner';S.f.pmode=m;S.f.pwday='2026-11-18';S.f.pdday='2026-11-18';S.dyDay=null;window.render()},m);await p.waitForTimeout(700);};
 await mode('day');
 const ad=await p.evaluate(()=>[...document.querySelectorAll('.dy-adchip')].map(e=>e.textContent));
 ok(ad.some(t=>/^First fix/.test(t))&&ad.some(t=>/^Dig and pour/.test(t)),'Day: the all-day stages show ('+ad.join(' | ')+')');
 /* (on 18 Nov itself that day is today, which opens at the time now instead) */
 if(await p.evaluate(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})!=='2026-11-18')
 ok(await p.evaluate(()=>document.querySelector('.dy-wrap').scrollLeft)===84,'Day: another day opens at 07:00');
 const vis=await p.evaluate(()=>{const c=document.querySelector('.dy-adchip').getBoundingClientRect(),w=document.querySelector('.dy-wrap').getBoundingClientRect();return c.left>=w.left&&c.left<w.right});
 ok(vis,'Day: the all-day stage is in view, not scrolled off to the left');
 const g=await p.evaluate(()=>[...document.querySelectorAll('.dy-grp b')].map(e=>e.textContent));
 ok(g.includes('Owner')&&g.includes('Subcontractors')&&g.includes('Other companies'),'Day: people grouped ('+g.join(', ')+')');
 await mode('where');
 const job=await p.evaluate(()=>[...document.querySelectorAll('.pl-job')].map(e=>e.textContent));
 ok(job.includes('Dig and pour foundations'),'Who\'s where: the job nobody is on shows its stage only ('+job.join(' | ')+')');
 ok(await p.getByText('Nobody booked yet').count()===1&&await p.getByText(/^0 people$/).count()===0,'Who\'s where: "Nobody booked yet", not "0 people"');
 ok(await p.evaluate(()=>[...document.querySelectorAll('.pl-person[data-w=sub1] small')].some(e=>/First fix/.test(e.textContent))),'Who\'s where: each person shows their stage');
 await p.setViewportSize({width:390,height:844});await mode('stages');
 const cut=await p.evaluate(()=>[...document.querySelectorAll('.pbs-row.pbs-stage .pbs-name')].filter(n=>n.querySelector('small')).some(n=>{const a=n.querySelector('.pbs-sn').getBoundingClientRect(),r=n.getBoundingClientRect();return a.top<r.top-1||a.bottom>r.bottom+1}));
 ok(!cut,'Jobs on a phone: a stage with people shows its name as well as who');
 await mode('day');
 const al=await p.evaluate(()=>Math.abs(document.querySelector('.dy-head .dy-corner').getBoundingClientRect().right-document.querySelector('.dy-row .dy-name').getBoundingClientRect().right));
 ok(al<2,'Day on a phone: the hours line up with the grid');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h553: ${bad} failed`:'h553: all passed');await b.close();process.exit(bad?1:0);
})();
