// Naming a site (made-up job at 4 Rolle Road): with no name the Sites card shows "4 Rolle Road" big and "Exmouth"
// small. In Setup › Sites, ✎ Name & details gives it a job name; from then on the name shows big with the address small
// under it, and the trade's check-in list shows the name (the address is still what's saved).
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const SITE='4 Rolle Road, Exmouth';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 const sites=async()=>{await p.evaluate(()=>{document.getElementById('viewer').hidden=true;window.__S.otab='projects';window.__S.f.projList=true;window.render()});await p.waitForTimeout(500);};
 await sites();
 let t=await p.innerText('.sttile[data-s="'+SITE+'"]');
 ok(/(^|\n)4 Rolle Road\n/.test(t.trim())&&/📍 Exmouth/.test(t),'no name yet: "4 Rolle Road" big, "Exmouth" small ('+t.replace(/\n/g,' | ')+')');
 await p.evaluate(()=>{window.__S.otab='setup';window.__S.f.stab='setup';window.render()});await p.waitForTimeout(400);
 await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));
 const btn=p.locator('.editsite').filter({hasText:/Name/}).first();
 ok(await btn.count()===1,'Setup › Sites: each site has ✎ Name & details');
 await p.evaluate(s=>{const x=window.__S.sites.find(y=>y.name===s);document.querySelector('.editsite[data-id="'+x.id+'"]').click()},SITE);await p.waitForTimeout(300);
 await p.fill('#sd-jname','Jones kitchen extension');await p.screenshot({path:OUT+'sn-1-name.png'});await p.click('#f-save');await p.waitForTimeout(800);
 ok(await p.evaluate(()=>window.__st['sites/s2'].jobName==='Jones kitchen extension'),'the name is saved on the site');
 await sites();
 t=await p.innerText('.sttile[data-s="'+SITE+'"]');
 ok(/(^|\n)Jones kitchen extension\n/.test(t.trim())&&/📍 4 Rolle Road, Exmouth/.test(t),'Sites: the name big, the address small ('+t.replace(/\n/g,' | ')+')');
 await p.screenshot({path:OUT+'sn-2-sites.png'});
 await p.fill('#st-q, input[type=search]','kitchen').catch(()=>{});
 /* trade: picker shows the name, the address is still what's saved */
 const q=await ctx.newPage();q.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 const dump=JSON.stringify(await p.evaluate(()=>window.__st));
 await q.setContent(('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(false)+page_src.replace('function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}','function detailsDone(d){return true}')+'</body></html>').replace('const store={}, listeners=[];window.__st=store;','const store=Object.assign({},'+dump+'), listeners=[];window.__st=store;'));await q.waitForTimeout(2500);await q.keyboard.press('Escape');
 await q.evaluate(()=>window.__S.db.doc('sites/s2').update({jobName:'Jones kitchen extension'}));await q.waitForTimeout(400);
 await q.click('.tab[data-t=time]').catch(()=>{});await q.waitForTimeout(400);
 const opts=await q.evaluate(()=>[...document.querySelectorAll('#ci-site option')].map(o=>o.value+'='+o.textContent));
 ok(opts.includes(SITE+'=Jones kitchen extension'),'check-in list shows "Jones kitchen extension" ('+opts.join(', ')+')');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h528: ${bad} failed`:'h528: all passed');await b.close();process.exit(bad?1:0);
})();
