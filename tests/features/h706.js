// Skills & catch-ups (made-up trade Sam): Setup › 🧑‍🔧 Skills & catch-ups. The grid has the usual skills; tapping Sam's
// Plastering square twice makes him 🟢 Can do; "Who can do…? Plastering" lists him. A new skill can be added. Catch-ups:
// Sam has none, so he's Due; ＋ Catch-up saves how he's getting on, what was said and agreed and the next date (owner-only,
// todos/cu-…); his History shows it. Once catch-ups are used, Today lists anyone due.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.evaluate(()=>{const S=window.__S;S.otab='setup';S.f.stab='';window.render()});await p.waitForTimeout(400);
 await p.click('#skl-reg');await p.waitForTimeout(400);
 ok(/Plastering/i.test(await p.innerText('.skl-g'))&&/Roofing/i.test(await p.innerText('.skl-g')),'the grid has the usual skills');
 const sq='.skl-c[data-p=emp1][data-s="Plastering"]';
 await p.click(sq);await p.waitForTimeout(400);await p.click(sq);await p.waitForTimeout(400);
 ok(await p.innerText(sq)==='🟢'&&(await p.evaluate(()=>window.__st['todos/skills'].grid.emp1.Plastering))===2,'two taps: Sam 🟢 Can do plastering, saved');
 await p.selectOption('#skl-who','Plastering');await p.waitForTimeout(400);
 ok(/Sam/.test(await p.innerText('.skl-can'))&&/Can do/.test(await p.innerText('.skl-can')),'Who can do plastering: Sam');
 await p.fill('#skl-new','Lime plaster');await p.click('#skl-addb');await p.waitForTimeout(400);
 ok(/Lime plaster/i.test(await p.innerText('.skl-g')),'a new skill is added');
 const nowrap=await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
 ok(nowrap,'the grid scrolls in its own box – no sideways page scroll');
 await p.screenshot({path:'h706-skills.png'});
 await p.click('.skl-t[data-t=cu]');await p.waitForTimeout(300);
 ok(/Due/.test(await p.innerText('.skl-cu:has-text("Sam")')),'Sam has no catch-up yet – Due');
 await p.click('.skl-cn[data-p=emp1]');await p.waitForTimeout(300);
 await p.click('#cu-how [data-v="Some worries"]');await p.fill('#cu-notes','Back has been playing up.');await p.fill('#cu-agreed','Lighter work for two weeks.');
 await p.click('#f-save');await p.waitForTimeout(600);
 const cu=await p.evaluate(()=>Object.values(window.__st).find(v=>v&&v.kind==='catchup'));
 ok(cu&&cu.who==='emp1'&&cu.how==='Some worries'&&/Lighter/.test(cu.agreed)&&cu.next>cu.date,'saved: how, what was said, agreed, next date');
 ok(!/Due/.test(await p.innerText('.skl-cu:has-text("Sam")'))&&/Some worries/.test(await p.innerText('.skl-cu:has-text("Sam")')),'Sam is no longer due');
 await p.click('.skl-ch[data-p=emp1]');await p.waitForTimeout(300);
 ok(/Back has been playing up/.test(await p.innerText('.skl-hist')),'his History shows it');
 await p.click('.skl-hx');
 /* someone due: make Sam's next date in the past */
 await p.evaluate(async()=>{const k=Object.keys(window.__st).find(k=>window.__st[k]&&window.__st[k].kind==='catchup');await window.__S.db.doc(k).update({next:'2026-01-01'});const x=window.__S.catchUps.find(c=>'todos/'+c.id===k);if(x)x.next='2026-01-01';});
 await p.evaluate(()=>{window.__S.otab='today';window.render()});await p.waitForTimeout(500);
 ok(/Catch-ups due/.test(await p.innerText('.skl-today').catch(()=>''))&&/Sam/.test(await p.innerText('.skl-today').catch(()=>'')),'Today: catch-up due with Sam');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h706: ${bad} failed`:'h706: all passed');await b.close();process.exit(bad?1:0);
})();
