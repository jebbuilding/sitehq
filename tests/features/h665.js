// Trades' sign-ins record their hours (made-up trade Sam, made-up site 4 Rolle Road, Tue 24 Nov 2026). James, Nov 2026:
// "Kahn is on site but it's not recording his timesheets". In the new look a plain sign-in book entry (made before the
// fix) showed him on site with no hours. Now: signing out of a plain sign-in writes the day's hours on his timesheet;
// the 📍 Sign in page checks him in on his timesheet (no timesheet words in the new look); James signing a trade out
// writes their hours too. Someone set to "sign in only" still gets no timesheet.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
const SI='store["sheets/emp1/signins/si1"]={site:"4 Rolle Road, Exmouth",date:"2026-11-24",in:"07:40",out:"",open:true,inAt:1,by:"self",created:1};';
const mk=(extra)=>{let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed+extra);
 eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return fake;};
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__SI=()=>SIGNIN;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(DD).length===2,'details hook found');
async function open(b,extra,owner,time,so){const f=mk(extra);const html='<!doctype html><html><head><meta charset=utf8></head><body>'+f(!!owner)+page_src.replace(DD,'function detailsDone(d){return true}')+'</body></html>';
 const ctx=await b.newContext({viewport:{width:390,height:844}});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.tradelook','true');localStorage.setItem('jeb.instLater','true')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>r.request().url().startsWith('https://sitehq.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}):r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.clock.install({time:new Date('2026-11-24T'+(time||'16:35')+':00')});
 await p.goto('https://sitehq.test/');await p.clock.runFor(2500);await p.keyboard.press('Escape');await p.clock.runFor(500);
 /* the test data gives him a day today already: take it off */
 await p.evaluate(async()=>{for(const k of Object.keys(window.__st))if(k.startsWith('sheets/emp1/entries/')&&window.__st[k]&&window.__st[k].type==='hours')await window.__S.db.doc(k).delete();});
 if(so)await p.evaluate(async()=>{await window.__S.db.doc('sheets/emp1').update({signInOnly:true});});await p.clock.runFor(800);return p;}
const hoursOf=(p,who)=>p.evaluate(w=>Object.entries(window.__st).filter(([k,v])=>v&&k.startsWith('sheets/'+w+'/entries/')&&v.type==='hours'&&v.date==='2026-11-24').map(([k,v])=>v),who);
(async()=>{const b=await chromium.launch();
 try{
 /* 1. a plain sign-in from before: Sign out writes his hours */
 let p=await open(b,SI);
 ok(/Signed in at 4 Rolle Road/.test(await p.innerText('#tsi-card')),'Sam shows signed in at 4 Rolle Road (a plain sign-in book entry)');
 ok((await hoursOf(p,'emp1')).length===0,'no hours on his timesheet yet');
 await p.click('#tsi-out');await p.clock.runFor(1500);if(await p.isVisible('#f-cancel'))await p.click('#f-cancel');
 let h=await hoursOf(p,'emp1');
 ok(h.length===1&&h[0].job==='4 Rolle Road, Exmouth'&&h[0].actualIn==='07:40'&&h[0].actualOut==='16:35'&&h[0].hours>7&&!h[0].open,'Sign out writes the day on his timesheet ('+(h[0]?h[0].start+'–'+h[0].finish+', '+h[0].hours+' h':'none')+')');
 await p.close();
 /* 2. the 📍 Sign in page checks him in on his timesheet */
 p=await open(b,'',false,'07:55');
 await p.evaluate(()=>{window.__S.tab='signin';window.render()});await p.clock.runFor(500);
 const t=await p.innerText('#main');
 ok(await p.isVisible('#si-in')&&/Sign in now/.test(await p.innerText('#si-in'))&&!/timesheet/i.test(t),'the Sign in page: "Sign in now", no timesheet words in the new look');
 await p.evaluate(()=>{const i=document.querySelector('#ci-site');if(i){i.value='4 Rolle Road, Exmouth';i.dispatchEvent(new Event('change',{bubbles:true}))}});
 const sel=await p.locator('#main select').first();if(await sel.count())await sel.selectOption({label:'4 Rolle Road, Exmouth'}).catch(()=>{});
 await p.click('#si-in');await p.clock.runFor(1500);
 h=await hoursOf(p,'emp1');
 ok(h.some(x=>x.open&&x.checkIn&&x.job==='4 Rolle Road, Exmouth'),'Sign in now starts his timesheet day');
 await p.close();
 /* 3. James signs a trade out from the sign-in book: their hours are written */
 p=await open(b,SI,true);
 const r=await p.evaluate(async()=>{if(!window.__S.data.signins||!window.__S.data.signins.emp1)return "no signins "+Object.keys(window.__S.data.signins||{});const x=(window.__S.data.signins||{}).emp1.find(y=>y.id==='si1');await window.__SI().signOut(x,'emp1');return 1}).catch(e=>e.message);
 h=await hoursOf(p,'emp1');
 ok(r===1&&h.length===1&&h[0].hours>7,'James signing Sam out writes his hours too');
 await p.close();
 /* 4. sign in only: no timesheet */
 p=await open(b,SI,false,'16:35',true);
 await p.evaluate(()=>{window.__S.tab='signin';window.render()});await p.clock.runFor(500);
 if(await p.isVisible('#si-out'))await p.click('#si-out');await p.clock.runFor(1500);
 ok((await hoursOf(p,'emp1')).length===0,'someone set to "sign in only" still gets no timesheet');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h665: ${bad} failed`:'h665: all passed');await b.close();process.exit(bad?1:0);
})();
