// The old copy, chasing missing hours, and closing the week (made-up people and sites).
// 1. On the old claude.ai copy a trade sees only "SiteHQ has moved" with a link to the website; James gets a banner.
// 2. James's Today and Timesheets show ⏰ No hours for the last working day; 📨 Remind sends a reminder that opens the
//    trade's timesheet on that day; the trade's Time page asks for the missing day itself.
// 3. ✅ Close the week: approve everything, hourly rate typed once, CIS taken off at 20%, day work to bill by job,
//    🔒 Close the week keeps a record. Writes h615*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
const OLD='const smvIsOld = () => /(^|\\.)claude(usercontent)?\\.(ai|com)$/i.test(location.hostname || "");';
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null')&&page_src.includes(DD)&&page_src.split(OLD).length===2,'test hooks found');
page_src=page_src.replace(OLD,'const smvIsOld = () => window.__old === true;').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
const pad=n=>String(n).padStart(2,'0');const fmt=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const lastDay=(()=>{const d=new Date();d.setDate(d.getDate()-1);while(d.getDay()===0||d.getDay()===6)d.setDate(d.getDate()-1);return fmt(d)})();
const before=(()=>{const d=new Date(lastDay+'T12:00');d.setDate(d.getDate()-1);while(d.getDay()===0||d.getDay()===6)d.setDate(d.getDate()-1);return fmt(d)})();
const page=async(ctx,owner,old)=>{const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+(old?'<script>window.__old=true</script>':'')+fake(owner)+(owner?page_src:page_src.replace(DD,'function detailsDone(d){return true}'))+'</body></html>');await p.waitForTimeout(2300);await p.keyboard.press('Escape');return p;};
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1150,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 /* 1. the old copy */
 const ot=await page(ctx,false,true);
 const mv=await ot.evaluate(()=>{const m=document.querySelector('#main .smv-box');const a=m&&m.querySelector('a.smv-go');return {txt:m?m.innerText:'',href:a?a.href:'',tabs:document.getElementById('tabs').hidden}});
 ok(/SiteHQ has moved/.test(mv.txt)&&/sitehq\.jevul\.com/.test(mv.href)&&mv.tabs,'a trade on the old copy only sees "SiteHQ has moved" and the link');
 await ot.screenshot({path:'h615-moved.png'});await ot.close();
 const oo=await page(ctx,true,true);
 ok(!(await oo.locator('#smv-bar').count())&&await oo.isVisible('#main .smv-box')===false,'James on the old copy sees it as normal, with no banner');await oo.close();
 /* 2. missing hours: emp1 worked the day before, not the last working day */
 const p=await page(ctx,true,false);
 await p.click('#nl-tog');await p.waitForTimeout(300);
 const site=await p.evaluate(()=>window.__S.sites[0].name);
 await p.evaluate(async([site,before])=>{const S=window.__S;
   for(const [k] of Object.entries(window.__st)) if(/^sheets\/[^/]+\/entries\//.test(k)) await S.db.doc(k).delete();
   for(const [k,v] of Object.entries(window.__st)) if(/^sheets\/[^/]+\/signoffs\//.test(k)&&v.type==='prompt') await S.db.doc(k).delete();
   await S.db.doc('sheets/emp1/entries/ch1').set({type:'hours',date:before,job:site,start:'08:00',finish:'16:30',breakMin:30,hours:8,approved:false,created:1,updated:1});
 },[site,before]);
 await p.waitForTimeout(600);
 await p.evaluate(()=>{const S=window.__S;S.otab='today';window.render()});await p.waitForTimeout(500);
 const card=await p.evaluate(()=>{const c=document.querySelector('#main .chs-card');return c?c.innerText:''});
 ok(/No hours for/.test(card)&&/Sam Test/.test(card),'Today shows ⏰ No hours for the last working day, with who');
 await p.screenshot({path:'h615-missing.png'});
 await p.click('#main .chs-all');await p.waitForTimeout(800);
 const pr=await p.evaluate(d=>Object.entries(window.__st).filter(([k,v])=>k.startsWith('sheets/emp1/signoffs/pr-')&&v.form==='timesheet'&&v.ref===d&&v.status==='open').length,lastDay);
 ok(pr===1,'📨 Remind them all sends one reminder for that day');
 await p.evaluate(()=>window.render());await p.waitForTimeout(300);
 ok(/Reminded/.test(await p.innerText('#main .chs-card')),'and shows them as reminded (not sent twice)');
 await p.evaluate(()=>{const S=window.__S;S.otab='time';S.week=new Date();window.render()});await p.waitForTimeout(400);
 ok(await p.locator('#main .chs-card').count()===1,'Timesheets shows it too');
 /* the trade */
 const t=await page(ctx,false,false);
 await t.evaluate(async([site,before])=>{const S=window.__S;S.mine.entries=[{id:'ch1',type:'hours',date:before,job:site,start:'08:00',finish:'16:30',hours:8}];S.tab='time';window.render()},[site,before]);await t.waitForTimeout(400);
 ok(await t.isVisible('#main .chs-put[data-d="'+lastDay+'"]'),'the trade\'s Time page asks for the missing day');
 await t.click('#main .chs-put[data-d="'+lastDay+'"]');await t.waitForTimeout(400);
 ok(await t.evaluate(d=>document.getElementById('f-date')&&document.getElementById('f-date').value===d,lastDay),'and opens the timesheet on that day');
 await t.close();
 /* 3. close the week: emp1 is a CIS subcontractor with two days and some day work this week */
 const mon=await p.evaluate(()=>{const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7)-14);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')});
 await p.evaluate(async([site,mon])=>{const S=window.__S;const st=window.__st['sheets/emp1']||{};
   await S.db.doc('sheets/emp1').update({details:Object.assign({},st.details||{},{empType:'cis'})});
   const d2=new Date(mon+'T12:00');d2.setDate(d2.getDate()+1);const tue=d2.getFullYear()+'-'+String(d2.getMonth()+1).padStart(2,'0')+'-'+String(d2.getDate()).padStart(2,'0');
   await S.db.doc('sheets/emp1/entries/wc1').set({type:'hours',date:mon,job:site,start:'08:00',finish:'16:30',breakMin:30,hours:8,approved:false,created:5,updated:5});
   await S.db.doc('sheets/emp1/entries/wc2').set({type:'hours',date:tue,job:site,start:'08:00',finish:'16:30',breakMin:30,hours:8,approved:false,created:6,updated:6});
   await S.db.doc('sheets/emp1/entries/wc3').set({type:'job',kind:'extra',date:tue,job:site,task:'Move radiator',hours:2,approved:false,created:7,updated:7});
   S.week=new Date(mon+'T00:00');S.otab='time';window.render();},[site,mon]);
 await p.waitForTimeout(700);
 await p.click('#wkc-open');await p.waitForTimeout(500);
 ok(/Close the week/.test(await p.innerText('#viewer-body'))&&await p.isVisible('#wkc-appr'),'✅ Close the week opens, with Approve everything');
 await p.click('#wkc-appr');await p.waitForTimeout(1500);
 const appr=await p.evaluate(()=>['wc1','wc2','wc3'].every(k=>window.__st['sheets/emp1/entries/'+k].approved));
 ok(appr,'Approve everything approves the week');
 await p.fill('#viewer-body .wkc-rate[data-w="emp1"]','20');await p.press('#viewer-body .wkc-rate[data-w="emp1"]','Tab');await p.waitForTimeout(600);
 const row=await p.evaluate(()=>{const tr=[...document.querySelectorAll('#viewer-body .wkc-tbl tbody tr')].find(r=>/Sam Test/.test(r.innerText));return tr?tr.innerText.replace(/\s+/g,' '):''});
 ok(/320\.00/.test(row)&&/64\.00/.test(row)&&/256\.00/.test(row)&&/20%/.test(row),'16 h × £20 = £320, CIS 20% £64 off, pay £256 ('+row+')');
 ok(await p.evaluate(()=>window.__st['todos/payrates']&&window.__st['todos/payrates'].per.emp1===20),'the rate is kept for next week');
 ok(await p.locator('#viewer-body .wkc-job').count()===1&&/2 h day work/.test(await p.innerText('#viewer-body .wkc-job')),'day work to bill is listed by job');
 await p.screenshot({path:'h615-close.png'});
 await p.click('#wkc-close');await p.waitForTimeout(700);
 const rec=await p.evaluate(m=>window.__st['todos/wkclose-'+m],mon);
 ok(rec&&rec.kind==='weekclose'&&rec.rows[0].net===256,'🔒 Close the week keeps a record of what was paid');
 await p.click('#viewer-body .wkc-job');await p.waitForTimeout(500);
 ok(await p.evaluate(s=>window.__S.otab==='daywork'&&window.__S.f.fltSite===s.toLowerCase(),site),'tapping the job opens its day work');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h615: ${bad} failed`:'h615: all passed');await b.close();process.exit(bad?1:0);
})();
