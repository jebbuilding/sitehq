// The letterhead on all documents (made-up firm "Acme Build Ltd" with a made-up letterhead – a coloured top and foot
// brought in as pictures): the app-made health and safety policy, RAMS, toolbox talk, site induction record and
// accident report are all printed on it (its top and foot on every page, the writing between), and with Setup ›
// My letterhead › "Put it on all documents too" unticked they go back to their own coloured bar.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const src0=src;
src=src.replace('ownerName:"James Bray",company:{name:"JEB Building Services",owner:"James Bray"}','ownerName:"Pat Jones",company:{name:"Acme Build Ltd",owner:"Pat Jones",mobile:"07700900500",oohName:"Pat Jones",oohPhone:"07700900501",firstAid:"Sam Test"}');
if(src===src0)throw new Error('company seed patch did not match');
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed).replace(/WK21 JEB/g,'AB21 CDE').replace(/"James"/g,'"Pat"');
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {')
 .replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;')
 .replace('const CDOCS = (() => {','const CDOCS = (window.CDOCS = (() => {').replace('  return { cardHtml, wire, makeIt, NEEDS };\n})();','  return { cardHtml, wire, makeIt, NEEDS };\n})());');
for(const n of ['raPdf','talkPdf','pdfRecord','incidentPdf']){const a='async function '+n+'(';if(page_src.split(a).length!==2)throw new Error('no '+n);page_src=page_src.replace(a,'window.'+n+'='+n+';'+a);}
if(!/window\.CDOCS = /.test(page_src))throw new Error('CDOCS patch did not match');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* a made-up letterhead: a teal top 40 mm tall and a teal foot from 277 mm, as brought in from a PDF */
 await p.evaluate(async()=>{
  const pic=(h,label)=>new Promise(res=>{const c=document.createElement('canvas');c.width=840;c.height=h*4;const g=c.getContext('2d');g.fillStyle='#ffffff';g.fillRect(0,0,c.width,c.height);g.fillStyle='#0f766e';g.fillRect(0,c.height-10,c.width,10);g.font='bold 40px sans-serif';g.fillText(label,40,60);c.toBlob(res,'image/png');});
  window.__blobs.lhtop=await pic(40,'ACME BUILD LTD – TEST LETTERHEAD');window.__blobs.lhbot=await pic(20,'Acme Build Ltd · 1 Test Street · VAT 000 0000 00');
  const cur=(await window.__S.db.doc('todos/salesset').get()).data()||{};
  await window.__S.db.doc('todos/salesset').set(Object.assign({},cur,{kind:'salesset',lhTop:{id:'lhtop',h:40},lhBot:{id:'lhbot',y:277,h:20}}));
 });
 await p.waitForTimeout(600);
 const site='4 Rolle Road, Exmouth';
 const imgs=(s)=>(s.match(/\/Subtype \/Image/g)||[]).length;
 const grab=async(fn,arg)=>{const n0=await p.evaluate(()=>(window.__dl||[]).length);await p.evaluate(fn,arg);await p.waitForTimeout(1500);
  return p.evaluate(async(n0)=>{const d=(window.__dl||[])[n0];if(!d)return null;const u=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return {name:d.filename,s}},n0);};
 const MAKERS=[
  ['RAMS',(site)=>window.raPdf({id:'r1',title:'Loft conversion',site,created:Date.now(),steps:[],hazards:[],rows:[],items:[],ppe:[],sigs:[]})],
  ['Toolbox talk',(site)=>window.talkPdf({id:'t1',title:'Working at height',site,body:'Use the scaffold.',created:Date.now(),sigs:[],people:[]})],
  ['Site induction record',(site)=>window.pdfRecord({id:'i1',site,who:'emp1',name:'Sam Test',at:Date.now(),answers:{},details:{},ticks:{},sig:''})],
  ['Accident report',(site)=>window.incidentPdf({id:'a1',site,date:new Date().toISOString().slice(0,10),time:'10:00',kind:'accident',who:'Sam Test',what:'Cut finger',created:Date.now()},[['What happened','Cut finger']])],
 ];
 for(const [name,fn] of MAKERS){const r=await grab(fn,site);
  if(!r){ok(false,name+': made a PDF');continue;}
  fs.writeFileSync(OUT+'lh-'+name.replace(/\W+/g,'-')+'.pdf',Buffer.from(r.s,'binary'));
  ok(imgs(r.s)>=2,name+': printed on the letterhead (its top and foot pictures)');}
 /* the app-made policy, on the letterhead too */
 await p.evaluate(()=>window.CDOCS.makeIt('hs'));await p.waitForTimeout(3000);
 const pol=await p.evaluate(async()=>{const d=Object.values(window.__st).find(v=>v&&v.need==='hs');if(!d)return '';const u=new Uint8Array(await window.__blobs[d.assetId].arrayBuffer());let s='';for(let i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return s});
 fs.writeFileSync(OUT+'lh-policy.pdf',Buffer.from(pol,'binary'));
 const pages=(pol.match(/\/Type \/Page[^s]/g)||[]).length;
 ok(imgs(pol)>=2&&/Health and safety policy/.test(pol),'the health and safety policy the app writes is on the letterhead ('+pages+' pages)');
 /* the switch in Setup › My letterhead */
 await p.evaluate(()=>{window.__S.otab='setup';window.__S.f.stab='setup';window.render()});await p.waitForTimeout(500);
 ok(await p.locator('#lh-all').isChecked(),'Setup › My letterhead: "Put it on all documents too" is ticked to start');
 await p.click('#lh-all');await p.waitForTimeout(800);
 const off=await grab(MAKERS[0][1],site);
 ok(off&&imgs(off.s)===0,'unticked, the RAMS goes back to its own coloured bar (no letterhead)');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h538: ${bad} failed`:'h538: all passed');await b.close();process.exit(bad?1:0);
})();
