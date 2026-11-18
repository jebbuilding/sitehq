// The owner by name, like everyone else (new look, made-up data): on his planner the owner is "James Bray" / "James",
// never "You", "Me" or "(you)" – the Board (under "Owner"), the Day view, Who's where, the course form and the
// Holidays & leave list.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const nx=new Date();nx.setDate(nx.getDate()+7+((8-nx.getDay())%7));const mon=nx.toISOString().slice(0,10);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.click('#nl-tog');await p.waitForTimeout(500);
 const me=await p.evaluate(()=>window.__S.me);
 const nm=await p.evaluate(()=>{const S=window.__S;return (S.myProfile&&S.myProfile.name)||'James Bray'});
 await p.evaluate(async([me,m])=>{await window.__S.db.doc('plan/own1').set({type:'holiday',title:'James – off',from:m,to:m,people:[me],vis:'all',created:1});},[me,mon]);
 const mode=async(m)=>{await p.evaluate(([m,d])=>{const S=window.__S;S.otab='planner';S.f.pmode=m;S.f.pdmode='day';S.f.pdday=d;S.f.pwday=d;window.render()},[m,mon]);await p.waitForTimeout(600);};
 await mode('board');
 const bn=await p.innerText('.pb-name[data-w="'+me+'"]');
 ok(bn.trim().endsWith(nm.split(' ')[0])&&!/\bMe\b/.test(bn),'Board: "'+bn.trim().replace(/\s+/g,' ')+'", not "Me"');
 const g=await p.evaluate(()=>[...document.querySelectorAll('.pb-grp b')].map(e=>e.textContent));
 ok(g.includes('Owner')&&!g.includes('You'),'Board: the group is "Owner" ('+g.join(', ')+')');
 await mode('day');
 const dn=await p.evaluate(()=>[...document.querySelectorAll('.dy-row .dy-name')].map(e=>e.childNodes[0].textContent.trim()));
 ok(dn.includes(nm)&&!dn.some(x=>/you/i.test(x)),'Day view: "'+nm+'", no "(you)"');
 await mode('where');
 const wn=await p.evaluate(m=>[...document.querySelectorAll('.pl-person[data-w="'+m+'"] b')].map(e=>e.textContent),me);
 ok(wn.length&&wn.every(x=>x===nm),'Who\'s where: "'+wn.join(', ')+'"');
 await mode('hol');
 ok(/James|Bray/.test(await p.innerText('.ht-row[data-p=own1]'))&&!/\bYou\b/.test(await p.innerText('.ht-row[data-p=own1]')),'Holidays & leave: listed by name');
 await p.click('#ht-course');await p.waitForTimeout(400);
 ok((await p.innerText('.crs-ppl')).includes(nm)&&!/\bYou\b/.test(await p.innerText('.crs-ppl')),'the course form lists "'+nm+'"');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h560: ${bad} failed`:'h560: all passed');await b.close();process.exit(bad?1:0);
})();
