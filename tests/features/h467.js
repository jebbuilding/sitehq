// Setup › 👥 People & access (made-up team): the Setup page has the tab; nothing set = suggestions; untick Merchants and
// Receipts for Subcontractors, make Sam Test a subcontractor on only 12 Marine Way, save – the change is recorded.
// Then Sam's own app (a fresh page as the trade): no Merchants or Receipts tab, Sign in and My details still there,
// and only 12 Marine Way in their job lists. Nothing set leaves the trades' app as it was.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src0=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
const mkFake=(s)=>{eval(s.slice(s.indexOf('const fake='),s.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake;};
const fakeOwner=mkFake(src0);
const SN='const siteNames = () => {';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(SN).length===2,'test hook found once');
page_src=page_src.replace(SN,'window.__sn=()=>siteNames();'+SN);
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
ok(page_src.split(DD).length===2,'details hook found once');
const trade_src=page_src.replace(DD,'function detailsDone(d){return true}');
const SEEDSET='people:[{id:"emp1",name:"Sam Test"}],allowDm:false}';
ok(src0.split(SEEDSET).length===2,'seed settings found once');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{
 /* first, a trade with nothing set: as before */
 const t0=await ctx.newPage();await t0.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fakeOwner(false)+trade_src+'</body></html>');await t0.waitForTimeout(2000);await t0.keyboard.press('Escape');
 const tabs0=await t0.$$eval('#tabs .tab',x=>x.map(t=>t.dataset.t));
 ok(tabs0.includes('suppliers')&&tabs0.includes('receipts')&&tabs0.includes('time'),'nothing set: the trade sees what they always have ('+tabs0.length+' tabs)');
 const sites0=await t0.evaluate(()=>window.__sn());await t0.close();
 /* the owner */
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fakeOwner(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 if(await p.$('#nl-tog')){await p.click('#nl-tog');await p.waitForTimeout(300);await p.evaluate(()=>{const t=document.querySelector('#nl-tog');if(t)t.style.display='none'});}
 await p.evaluate(()=>document.querySelector('.tab[data-t=setup]').click());await p.waitForTimeout(400);
 ok(await p.isVisible('#st-tabs button[data-v=access]')&&/Working day/.test(await p.innerText('#main')),'Setup has ⚙️ Setup and 👥 People & access tabs');
 await p.click('#st-tabs button[data-v=access]');await p.waitForTimeout(300);
 ok(/What each role sees/.test(await p.innerText('#main'))&&/These are suggestions until you save/.test(await p.innerText('#main')),'what each role sees: suggestions until saved');
 ok(!(await p.isChecked('.pa-tab[data-r=agency][data-k=suppliers]'))&&await p.isChecked('.pa-tab[data-r=agency][data-k=time]')&&await p.isChecked('.pa-tab[data-r=sub][data-k=suppliers]'),'agency workers start with just what they need on site; subbies with everything');
 ok(!(await p.$('.pa-tab[data-k=signin]'))&&!(await p.$('.pa-tab[data-k=details]')),'Sign in and My details are always on (no tick box)');
 await p.uncheck('.pa-tab[data-r=sub][data-k=suppliers]');await p.uncheck('.pa-tab[data-r=sub][data-k=receipts]');
 const sam=p.locator('.pa-person',{hasText:'Sam Test'});
 await sam.locator('.pa-role').selectOption('sub');
 await sam.locator('.pa-mode button[data-v=only]').click();
 ok(await sam.locator('.pa-sites').isVisible(),'"Only these jobs" shows the jobs to tick');
 await sam.locator('.pa-site[value="12 Marine Way, Exmouth"]').check();
 await p.screenshot({path:'h467-access.png',fullPage:true});
 await p.click('#pa-save');await p.waitForTimeout(600);
 const acc=await p.evaluate(()=>window.__st['settings/app'].access);
 ok(acc&&!acc.roles.sub.tabs.includes('suppliers')&&!acc.roles.sub.tabs.includes('receipts')&&acc.roles.sub.tabs.includes('time'),'saved: subcontractors without Merchants and Receipts');
 ok(acc.people.emp1&&acc.people.emp1.role==='sub'&&JSON.stringify(acc.people.emp1.sites)==='["12 Marine Way, Exmouth"]','saved: Sam is a subcontractor on only 12 Marine Way');
 const aud=await p.evaluate(()=>Object.values(window.__st).filter(v=>v&&v.kind==='audit'&&v.action==='Access'));
 ok(aud.length===1&&/Sam Test: role Subcontractor ·/.test(aud[0].details)&&/Sam Test: only 12 Marine Way/.test(aud[0].details),'the change is recorded: '+(aud[0]&&aud[0].details));
 ok(/Changes[\s\S]*Sam Test: only 12 Marine Way/.test(await p.innerText('#main')),'and listed under Changes');
 /* a second save with one tick changed records just that */
 await p.check('.pa-tab[data-r=sub][data-k=receipts]');await p.click('#pa-save');await p.waitForTimeout(600);
 const aud2=await p.evaluate(()=>Object.values(window.__st).filter(v=>v&&v.kind==='audit'&&v.action==='Access').sort((a,b)=>b.seq-a.seq)[0]);
 ok(/Subcontractors: \+ Receipts/.test(aud2.details)&&!/Sam/.test(aud2.details),'a later change records just what changed: '+aud2.details);
 await p.uncheck('.pa-tab[data-r=sub][data-k=receipts]');await p.click('#pa-save');await p.waitForTimeout(600);
 const acc2=await p.evaluate(()=>window.__st['settings/app'].access);
 /* Sam's own app */
 const fakeTrade=mkFake(src0.replace(SEEDSET,SEEDSET.replace('allowDm:false}','allowDm:false,access:'+JSON.stringify(acc2)+'}')));
 const t=await ctx.newPage();t.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await t.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fakeTrade(false)+trade_src+'</body></html>');await t.waitForTimeout(2000);await t.keyboard.press('Escape');
 const tabs=await t.$$eval('#tabs .tab',x=>x.map(t=>t.dataset.t));
 console.log('trade tabs:',tabs.join(','));
 ok(!tabs.includes('suppliers')&&!tabs.includes('receipts'),'Sam\'s app: no Merchants or Receipts');
 ok(tabs.includes('time')&&tabs.includes('signin')&&tabs.includes('details')&&tabs.includes('chat'),'still Timesheets, Sign in, My details and Chat');
 const sites=await t.evaluate(()=>window.__sn());
 ok(sites0.length>1&&sites.length===1&&sites[0]==='12 Marine Way, Exmouth','Sam\'s job lists: only 12 Marine Way (was '+sites0.length+')');
 await t.screenshot({path:'h467-trade.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h467: ${bad} failed`:'h467: all passed');await b.close();process.exit(bad?1:0);
})();
