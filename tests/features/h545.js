// RAMS linked together (made-up job at 4 Rolle Road; Sam Test, a made-up trade, has filled in a risk assessment for
// plastering there): opened by the owner, it says it isn't in the site's RAMS yet with 📂 File it; Mark as reviewed
// files it in 4 Rolle Road › RAMS; the site's RAMS tab then lists it with 📋 Edit / brief, which opens the risk
// assessment, now saying where it's filed.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const SITE='4 Rolle Road, Exmouth';
const RA={type:'ra',activity:'Plastering ceilings',site:SITE,preparedBy:'Sam Test',date:'2026-11-14',atRisk:['Operatives'],ppe:['Hard hat','Safety boots'],permit:'None',rows:[{h:'Working from hop-ups',who:'Operatives',l:2,s:2,c:'Use proper hop-ups with rails',res:'Low'}],method:{prep:'Clear the room',seq:'Board, scrim, skim',checks:'Check the hop-ups',finish:'Clean up'},briefed:[],created:Date.now()};
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+'store["sheets/emp1/signoffs/ra-t1"]='+JSON.stringify(RA)+';');
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
if(page_src.split('function viewRa(r, owner) {').length!==2)throw new Error('viewRa');
page_src=page_src.replace('function viewRa(r, owner) {','window.viewRa=viewRa;function viewRa(r, owner) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:1100},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 const openRa=()=>p.evaluate(()=>{const r=((window.__S.data.signoffs||{}).emp1||[]).find(x=>x.id==='ra-t1');window.viewRa(Object.assign({who:'emp1'},r),true);return !!r});
 ok(await openRa(),'Sam\'s risk assessment is there for the owner');await p.waitForTimeout(400);
 let v=await p.innerText('#viewer-body');
 ok(/Not in 4 Rolle Road, Exmouth › RAMS yet/.test(v)&&await p.locator('#rv-file').count()===1,'it says it isn\'t in the site\'s RAMS yet, with 📂 File it');
 await p.screenshot({path:OUT+'ralink-1.png'});
 await p.click('#rv-review');await p.waitForTimeout(4000);
 const doc=await p.evaluate(()=>Object.values(window.__st).find(v=>v&&v.cat==='rams'&&v.raId==='ra-t1'));
 ok(doc&&doc.site===SITE&&/Plastering ceilings/.test(doc.title),'Mark as reviewed files it in '+SITE+' › RAMS');
 await p.evaluate(s=>{document.getElementById('viewer').hidden=true;const S=window.__S;S.otab='projects';S.f.projList=false;S.f.proj=s;window.render();S.f.pjtab='rams';window.render()},SITE);await p.waitForTimeout(600);
 const row=p.locator('.doc',{hasText:'Plastering ceilings'});
 ok(await row.count()===1&&await row.locator('.d-ra').count()===1,'the site\'s RAMS tab lists it with 📋 Edit / brief');
 await row.locator('.d-ra').click();await p.waitForTimeout(500);
 v=await p.innerText('#viewer-body');
 ok(/Plastering ceilings/i.test(v)&&/Filed in/.test(v),'which opens the risk assessment, now saying where it\'s filed');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h545: ${bad} failed`:'h545: all passed');await b.close();process.exit(bad?1:0);
})();
