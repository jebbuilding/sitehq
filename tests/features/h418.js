// Search (owner/search.js): the 🔍 Search button in the header (old and new look) and the box on Today; finds
// clients, sites, people etc. from what is loaded; a result opens its page; nonsense finds nothing. Writes h418.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* names from the test data, to search for */
 const names=await p.evaluate(()=>{const st=window.__st;const v=Object.keys(st).map(k=>[k,st[k]]);const cl=v.find(([k,d])=>/^todos\//.test(k)&&d&&d.kind==='client'&&d.name);const tm=v.find(([k,d])=>/^sheets\/[^/]+$/.test(k)&&d&&d.name);return {client:cl&&cl[1].name,person:tm&&tm[1].name};});
 ok(names.client,'test data has a client: '+names.client);
 ok(await p.isVisible('#sr-btn'),'🔍 Search in the header (old look)');
 await p.click('#sr-btn');await p.waitForTimeout(200);
 ok(await p.isVisible('#sr-q'),'search opens with a box to type in');
 const word=names.client.split(/\s+/).pop().slice(0,4);
 await p.fill('#sr-q',word.toLowerCase());await p.waitForTimeout(150);
 const rows=await p.$$eval('#sr-list .sr-row',x=>x.map(r=>r.innerText.split('\n')[0]));
 ok(rows.includes(names.client),'typing "'+word.toLowerCase()+'" finds '+names.client+': '+rows.slice(0,5).join(' | '));
 ok((await p.innerText('#sr-list')).includes('Clients'),'results are grouped (Clients, Sites, People…)');
 await p.screenshot({path:'h418.png'});
 await p.fill('#sr-q','zzqx nothing');await p.waitForTimeout(100);ok(/Nothing found/.test(await p.innerText('#sr-list')),'nonsense finds nothing');
 await p.fill('#sr-q',names.client);await p.waitForTimeout(100);
 await p.evaluate(n=>[...document.querySelectorAll('#sr-list .sr-row')].find(r=>r.innerText.startsWith(n)).click(),names.client);await p.waitForTimeout(300);
 ok(!(await p.isHidden('#viewer'))&&(await p.innerText('#viewer-body')).includes(names.client),'a client result opens that client');
 await p.click('#viewer-close');await p.waitForTimeout(150);
 if(names.person){await p.click('#sr-btn');await p.fill('#sr-q',names.person.split(' ')[0]);await p.waitForTimeout(150);ok((await p.innerText('#sr-list')).includes('People'),'finds people: '+names.person.split(' ')[0]);await p.click('#viewer-close');}
 /* the new look: the box on Today */
 await p.click('#nl-tog');await p.waitForTimeout(300);
 ok(await p.isVisible('#nl-search'),'search box on Today');
 await p.click('#nl-search');await p.waitForTimeout(200);ok(await p.isVisible('#sr-q'),'Today\'s box opens search');
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0]);bad++}
 console.log(bad?'h418: '+bad+' FAILED':'h418: all passed');
 await b.close()})();
