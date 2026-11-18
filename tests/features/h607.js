// Site inductions (made-up people and sites): People › Site inductions has 📤 Send an induction, 📱 Induct someone on
// this device and + Set up an induction; a "Needed" square sends it to that person (a reminder that opens the induction),
// and then shows "Sent". The site's induction card has 📤 Send to someone. A trade checking in to a site whose induction
// they haven't signed gets it opened straight away.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1180,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.newlook','true');localStorage.setItem('jeb.instLater','true');localStorage.setItem('jeb.splash','1')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 const inds=await p.evaluate(()=>window.__S.inductions.map(i=>i.site));
 ok(inds.length>0,'a made-up site has an induction ('+inds.join(', ')+')');
 /* someone has worked on that site without signing */
 await p.evaluate(async s=>{const t=new Date();const d=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');await window.__S.db.doc('sheets/emp1/entries/ind-w1').set({type:'hours',date:d,job:s,start:'08:00',finish:'16:30',breakMin:30,hours:8,notes:'',approved:false,created:1,updated:1});},inds[0]);
 await p.waitForTimeout(600);
 await p.evaluate(()=>{const S=window.__S;S.otab='inductions';S.f.imsite='';window.render()});await p.waitForTimeout(500);
 ok(await p.isVisible('#isd-send')&&await p.isVisible('#isd-dev')&&await p.isVisible('#isd-new'),'Site inductions has Send, Induct on this device and Set up');
 const need=p.locator('.im-c.need.im-send').first();
 ok(await need.count()===1,'a Needed square is a button to send it');
 await need.click();await p.waitForTimeout(400);
 ok(/Send a site induction/.test(await p.innerText('#sheet')),'it opens Send a site induction');
 const pressed=await p.evaluate(()=>[...document.querySelectorAll('#isd-who [aria-pressed="true"]')].map(b=>b.dataset.v));
 ok(pressed.length===1,'that person is already ticked ('+pressed.join(',')+')');
 await p.fill('#isd-note','Before you start please');
 await p.screenshot({path:OUT+'isd-1.png'});
 await p.click('#f-save');await p.waitForTimeout(800);
 const pr=await p.evaluate(()=>Object.entries(window.__st).filter(([k,v])=>/\/signoffs\/pr-/.test(k)&&v.form==='induction').map(([k,v])=>({k,v})));
 ok(pr.length===1&&pr[0].v.status==='open'&&pr[0].v.ref&&pr[0].v.note==='Before you start please'&&pr[0].k.startsWith('sheets/'+pressed[0]+'/'),'a reminder to do that induction is sent to them');
 ok(await p.locator('.im-c.sent').count()>=1,'the square now shows Sent');
 await p.screenshot({path:OUT+'isd-2.png',clip:{x:0,y:0,width:1180,height:640}});
 /* Set up: offers sites without one */
 await p.click('#isd-new');await p.waitForTimeout(300);
 const opts=await p.evaluate(()=>[...document.querySelectorAll('#isd-site option')].map(o=>o.value));
 ok(!opts.includes(inds[0])&&opts.length>0,'+ Set up offers the sites that have no induction');
 await p.click('#f-cancel');await p.waitForTimeout(300);
 /* the site's own card */
 await p.evaluate(s=>{const S=window.__S;S.otab='projects';S.f.proj=s;S.f.projList=false;S.f.pjtab='overview';window.render()},inds[0]);await p.waitForTimeout(500);
 const sendBtns=await p.locator('.ind-send').count();
 if(!sendBtns){for(const t of ['induction','safety','overview']){await p.evaluate(t=>{window.__S.f.pjtab=t;window.render()},t);await p.waitForTimeout(300);if(await p.locator('.ind-send').count())break;}}
 ok(await p.locator('.ind-send').count()===1,'the site\'s induction card has 📤 Send to someone');
 /* the trade checks in there for the first time */
 const p2=await ctx.newPage();p2.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p2.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src.replace('function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}','function detailsDone(d){return true}')+'</body></html>');await p2.waitForTimeout(2500);await p2.keyboard.press('Escape');
 await p2.evaluate(()=>{window.__S.tab='time';window.render()});await p2.waitForTimeout(500);
 const site=inds[0];
 await p2.evaluate(s=>{const i=document.querySelector('#ci-site input, #ci-site select, input#ci-site, select#ci-site');if(i){i.value=s;i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));}},site);
 await p2.click('.ci-in');await p2.waitForTimeout(1000);
 const v=await p2.evaluate(()=>{const v=document.getElementById('sheet');return v&&!v.hidden?v.innerText:''});
 ok(/induction/i.test(v),'checking in for the first time opens the site induction ('+v.slice(0,80).replace(/\n/g,' | ')+')');
 await p2.screenshot({path:OUT+'isd-3.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h607: ${bad} failed`:'h607: all passed');await b.close();process.exit(bad?1:0);
})();
