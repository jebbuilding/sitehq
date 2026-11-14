// Ready for another company (made-up firm "Acme Build Ltd", run by Pat Jones): every page the owner, a trade and a
// client can open, and every example in a box, says nothing about James or JEB – the wording uses the company details
// (Acme / Pat) instead; the owner is in the planner's people and the holiday allowances like everyone else.
const fs=require('fs');const {chromium}=require('playwright');
const base0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const ACME='ownerName:"Pat Jones",company:{name:"Acme Build Ltd",owner:"Pat Jones",mobile:"07700900500",town:"Anytown"}';
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const BAD=/\bJames\b|\bJEB\b|\bBray\b/;
async function crawl(b,mode){
 let src=base0.replace('ownerName:"James Bray",company:{name:"JEB Building Services",owner:"James Bray"}',ACME);
 if(src===base0)throw new Error('company seed patch did not match');
 src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed).replace(/WK21 JEB/g,'AB21 CDE').replace(/"James"/g,'"Pat"');
 if(mode==='client')src=src.replace("id:async()=>${owner?'\"owner\"':'\"emp1\"'}",'id:async()=>"u9"');
 let fake;eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','fake='));
 let page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {').replace('function openPlanEditor(p, date, copy) {','window.openPlanEditor=openPlanEditor;function openPlanEditor(p, date, copy) {');
 if(mode==='trade')page_src=page_src.replace('function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}','function detailsDone(d){return true}');
 const ctx=await b.newContext({viewport:{width:1024,height:900}});ctx.setDefaultTimeout(3000);await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',mode,e.message);bad++;});p.on('dialog',d=>d.dismiss().catch(()=>{}));
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(mode==='owner')+page_src+'</body></html>');await p.waitForTimeout(1800);await p.keyboard.press('Escape');
 const isClient=mode==='client';
 const tabs=isClient?await p.$$eval('.ptabs button',x=>x.map(t=>t.dataset.v)):await p.$$eval('#tabs .tab',x=>x.map(t=>t.dataset.t).filter(t=>t!=='me'&&t!=='__back'));
 const found=[];let acme=false;
 const look=async(where)=>{
  const t=await p.evaluate(()=>{document.querySelectorAll('#main details').forEach(d=>d.open=true);const ph=[...document.querySelectorAll('input,textarea')].map(i=>i.placeholder||'').join(' | ');return document.body.innerText+' | '+ph;});
  if(/Acme|Pat\b/.test(t))acme=true;
  const m=t.match(new RegExp('.{0,40}('+BAD.source+').{0,40}','g'));if(m)found.push(where+': '+m.slice(0,3).join(' … '));
 };
 await look('start');
 for(const t of tabs){await p.evaluate(()=>{const s=document.getElementById('sheet');if(s)s.hidden=true;const v=document.getElementById('viewer');if(v)v.hidden=true});
  if(isClient)await p.click(`.ptabs button[data-v="${t}"]`).catch(()=>{});else await p.click(`#tabs .tab[data-t="${t}"]`).catch(()=>{});
  await p.waitForTimeout(250);await look(t);}
 ok(!found.length,`${mode}: no James or JEB on any page (${tabs.length} pages)`+(found.length?'\n   '+found.slice(0,6).join('\n   '):''));
 ok(acme,`${mode}: the company's own names are used`);
 return {p,ctx};
}
(async()=>{const b=await chromium.launch();
 try{
 const {p}=await crawl(b,'owner');
 await crawl(b,'trade');
 await crawl(b,'client');
 /* the account holder is in the planner's people and the holiday allowances */
 await p.evaluate(()=>{const s=document.getElementById('sheet');if(s)s.hidden=true;window.__S.otab='people';window.__S.f.prole='';window.render()});await p.waitForTimeout(400);
 await p.click('#hol-set');await p.waitForTimeout(300);
 ok(/Pat Jones/.test(await p.innerText('#sheet')),'holiday allowances list the account holder');
 await p.click('#f-cancel');await p.waitForTimeout(200);
 const ids=await p.evaluate(()=>{const S=window.__S;return [S.me,Object.keys(S.team)]});
 await p.evaluate(()=>{window.__S.otab='planner';window.render()});await p.waitForTimeout(400);
 await p.evaluate(()=>window.openPlanEditor(null,new Date().toISOString().slice(0,10)));await p.waitForTimeout(400);
 const who=await p.$$eval('#pe-who button',x=>x.map(b=>b.textContent.trim())).catch(()=>[]);
 ok(who.some(t=>/Pat Jones/.test(t))&&who.some(t=>/Sam Test/.test(t)),'the planner can put the account holder on a job, like everyone ('+who.join(', ')+')');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h535: ${bad} failed`:'h535: all passed');await b.close();process.exit(bad?1:0);
})();
