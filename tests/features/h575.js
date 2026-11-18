// Timesheet hours stay linked to their job (made-up data). 1) Sam's hours on "4 Rolle Road, Exmouth" count on that
// job's costs; the job's address is changed in Setup to "4 Rolle Rd, Exmouth" – the job keeps the old address and its
// hours still count. 2) Hours typed as "12 marine way exmouth." and "Somewhere Else" count on no job: Timesheets shows
// "⚠ Hours booked to … names that aren't your jobs", the first already pointing at 12 Marine Way; Move puts those
// hours on that job (its costs now see them, marked edited by the owner); Leave it hides the other.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra=`store["sheets/emp1/entries/lk1"]={type:"hours",date:"2026-11-03",job:"4 Rolle Road, Exmouth",start:"08:00",finish:"16:00",breakMin:30,hours:7.5,created:1,updated:1};
store["sheets/emp1/entries/lk2"]={type:"hours",date:"2026-11-04",job:"12 marine way exmouth.",start:"08:00",finish:"12:00",breakMin:0,hours:4,created:1,updated:1};
store["sheets/emp1/entries/lk3"]={type:"hours",date:"2026-11-05",job:"12 Marine Wy Exmouth",start:"08:00",finish:"11:00",breakMin:0,hours:3,created:1,updated:1};
store["sheets/emp1/entries/lk4"]={type:"hours",date:"2026-11-06",job:"Somewhere Else",start:"08:00",finish:"10:00",breakMin:0,hours:2,created:1,updated:1};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {').replace('function jcData(site) {','window.jcData=jcData;function jcData(site) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 const labH=(site)=>p.evaluate((s)=>window.jcData(s).items.filter(i=>i.kind==='lab'&&i.who==='emp1').reduce((a,i)=>a+i.hours,0),site);
 const marine=await p.evaluate(()=>window.__S.sites.find(x=>/marine/i.test(x.name)).name);
 const rolle0=await labH('4 Rolle Road, Exmouth');
 ok(rolle0>=7.5,'Sam\'s hours count on 4 Rolle Road ('+rolle0+' h)');
 /* change the job's address in Setup */
 await p.evaluate(()=>{window.__S.otab='setup';window.render();});await p.waitForTimeout(500);
 await p.evaluate(()=>{const x=window.__S.sites.find(s=>/Rolle/.test(s.name));document.querySelector('.editsite[data-id="'+x.id+'"]').click();});await p.waitForTimeout(400);
 await p.fill('#sd-name','4 Rolle Rd, Exmouth');await p.click('#f-save');await p.waitForTimeout(800);
 const site=await p.evaluate(()=>window.__S.sites.find(s=>/Rolle/.test(s.name)));
 ok(site.name==='4 Rolle Rd, Exmouth'&&(site.aka||[]).includes('4 Rolle Road, Exmouth'),'the job keeps its old address ('+JSON.stringify(site.aka)+')');
 const rolle1=await labH('4 Rolle Rd, Exmouth');
 ok(rolle1===rolle0,'its hours still count after the address change ('+rolle1+' h)');
 /* stray names */
 await p.evaluate(()=>{const S=window.__S;S.week=new Date(2026,10,2);S.otab='time';window.render();});await p.waitForTimeout(600);
 ok(await p.isVisible('.shcard'),'Timesheets shows the hours booked to names that aren\'t jobs');
 const rows=await p.evaluate(()=>[...document.querySelectorAll('.shcard .shrow')].map(r=>({t:r.querySelector('.shwhat').innerText,to:r.querySelector('.sh-to').value})));
 ok(rows.length===3,'three stray names listed ('+rows.map(r=>r.t.split('\n')[0]).join(' | ')+')');
 const m1=rows.findIndex(r=>/marine way exmouth\./i.test(r.t));
 ok(m1>=0&&rows[m1].to===marine&&/Looks like/.test(rows[m1].t),'"12 marine way exmouth." already points at '+marine);
 const m2=rows.findIndex(r=>/Marine Wy/i.test(r.t));
 ok(m2>=0&&rows[m2].to===marine,'"12 Marine Wy Exmouth" too (Wy is close enough)');
 const before=await labH(marine);
 await p.click('.shcard .sh-move[data-k="'+m1+'"]');await p.waitForTimeout(600);
 const st=await p.evaluate(()=>window.__st['sheets/emp1/entries/lk2']);
 ok(st.job===marine&&st.editedBy,'Move puts those hours on '+marine+', marked edited by the owner');
 const after=await labH(marine);
 ok(after===before+4,'the job\'s costs now count them ('+before+' → '+after+' h)');
 const se=await p.evaluate(()=>[...document.querySelectorAll('.shcard .shrow')].findIndex(r=>/Somewhere Else/.test(r.innerText)));
 await p.click('.shcard .sh-keep[data-k="'+se+'"]');await p.waitForTimeout(500);
 ok(!(await p.evaluate(()=>[...document.querySelectorAll('.shcard .shrow')].some(r=>/Somewhere Else/.test(r.innerText)))),'Leave it hides "Somewhere Else"');
 await p.evaluate(()=>document.querySelector('.shcard')&&document.querySelector('.shcard').scrollIntoView());
 await p.screenshot({path:'C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/ts-stray.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h575: ${bad} failed`:'h575: all passed');await b.close();process.exit(bad?1:0);
})();
