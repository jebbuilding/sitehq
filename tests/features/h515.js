// Employed → self-employed in one step (made-up trade Sam Test): on People his card has "Works for us as" with the same
// choices as his details (Employed (PAYE), Self-employed (CIS)…). Choosing Self-employed (CIS) saves both his details and
// where he's listed, and says where he's gone (Subcontractors); he's listed there; choosing Employed puts him back.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const openSam=async p=>{await p.evaluate(()=>{const d=document.querySelector('details[data-id="__pemp1"]');if(d)d.open=true});await p.waitForTimeout(200);};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='people';window.__S.f.prole='';window.render()});await p.waitForTimeout(500);await openSam(p);
 const opts=await p.evaluate(()=>[...document.querySelectorAll('#pp-role-emp1 option')].map(o=>o.textContent));
 ok(opts.includes('Employed (PAYE)')&&opts.includes('Self-employed (CIS)')&&opts.includes('Self-employed (not CIS)'),'his card has "Works for us as" with the same choices as his details ('+opts.join(', ')+')');
 await p.locator('#pp-role-emp1').scrollIntoViewIfNeeded();await p.screenshot({path:OUT+'emp-1-works-as.png'});
 await p.selectOption('#pp-role-emp1','cis');await p.waitForTimeout(800);
 const r=await p.evaluate(()=>window.__st['sheets/emp1']);
 ok(r.role==='sub'&&r.details&&r.details.empType==='cis','one choice saves both his details (Self-employed CIS) and where he\'s listed');
 ok(/Sam Test is now Self-employed \(CIS\).*Subcontractors/.test(await p.innerText('body')),'it says where he\'s gone: Subcontractors');
 await p.evaluate(()=>{window.__S.f.prole='sub';window.render()});await p.waitForTimeout(400);
 ok(await p.locator('details[data-id="__pemp1"]').count()===1,'he\'s listed under Subcontractors');
 await openSam(p);await p.selectOption('#pp-role-emp1','employed');await p.waitForTimeout(800);
 const r2=await p.evaluate(()=>window.__st['sheets/emp1']);
 ok(r2.role==='employee'&&r2.details.empType==='employed','and back to Employed (PAYE) in one step');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h515: ${bad} failed`:'h515: all passed');await b.close();process.exit(bad?1:0);
})();
