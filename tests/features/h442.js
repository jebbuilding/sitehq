// Jobs & clients as in the layout picture (all made-up): the live jobs down the side, the chosen job beside it – its
// client and dates, the stages (tap one to move the job on; ✎ to change them), money on the job (spent of the
// accepted estimate), the latest photos, who's on it and its paperwork; the Clients / Enquiries / Planner / More tabs.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra=`store["todos/sd-e1"]={kind:"sale",type:"estimate",number:"9",date:"2026-10-01",client:"Sue Jones",clientId:"c1",site:"4 Rolle Road, Exmouth",lines:[{d:"Loft conversion",a:20000,vc:"S20",k:"lab"}],status:"accepted"};
store["todos/rc-x1"]={kind:"acrcpt",supplier:"Jewson",date:"2026-10-20",total:1200,vat:200,cat:"mat",paid:"card",status:"done",site:"4 Rolle Road, Exmouth",created:1};`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const st=()=>p.evaluate(()=>window.__st);
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(500);
 await p.click('.nl-b[data-s=jobs]');await p.waitForTimeout(500);
 ok(await p.isVisible('.jb-tabs')&&(await p.$$('.jb-item')).length>=2,'Jobs & clients: tabs and the jobs down the side');
 await p.click('.jb-item[data-s="4 Rolle Road, Exmouth"]');await p.waitForTimeout(400);
 let m=await p.innerText('.jb-job');
 ok(/4 Rolle Road, Exmouth/.test(m)&&/Sue Jones/.test(m),'the chosen job, with its client');
 ok(/£1,000\.00\s+spent of £20,000\.00 quoted/.test(m)&&/Materials and hire £1,000\.00/.test(m),'money on the job: £1,000 spent of the £20,000 estimate');
 ok(/Groundworks/.test(m)&&/Second fix/.test(m),'the stages');
 await p.click('.jb-st[data-i="2"]');await p.waitForTimeout(500);
 const site=Object.entries(await st()).find(([k,v])=>/^sites\//.test(k)&&v&&v.name==='4 Rolle Road, Exmouth');
 ok(site&&site[1].stage===2,'tapping First fix moves the job on (stage saved on the site)');
 ok(await p.getAttribute('.jb-st[data-i="2"]','aria-pressed')==='true'&&/First fix/.test(await p.innerText('.jb-item[data-s="4 Rolle Road, Exmouth"]')),'First fix shown as the stage, in the list too');
 await p.click('#jb-sted');await p.waitForTimeout(200);await p.fill('#jb-stl','Strip out\nFirst fix\nBoarding\nDecorating');await p.click('#f-save');await p.waitForTimeout(500);
 ok((await p.$$('.jb-st')).length===4&&/Boarding/.test(await p.innerText('.jb-stages')),'stages changed for this job');
 await p.screenshot({path:'h442-jobs.png'});
 await p.click('.jb-tabs button[data-v=more]');await p.waitForTimeout(300);
 ok(/Jobs and sites/.test(await p.innerText('#main'))&&(await p.$$('.nl-row2')).length>=8,'More: everything else in Jobs & clients');
 await p.click('.jb-tabs button[data-v=jobs]');await p.waitForTimeout(300);
 await p.click('#jb-open');await p.waitForTimeout(500);
 ok(/‹ All sites/.test(await p.innerText('#main')),'Open the site page');
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h442: '+bad+' FAILED':'h442: all passed');
 await b.close()})();
