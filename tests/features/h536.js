// Health & safety PDFs for another company (made-up firm "Acme Build Ltd", run by Pat Jones): the RAMS, a toolbox
// talk, a site induction record, an accident report, the waste transfer note's starting council and examples – each
// PDF's heading is Acme's name and nothing in them says James, JEB or Devon.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const src0=src;
src=src.replace('ownerName:"James Bray",company:{name:"JEB Building Services",owner:"James Bray"}','ownerName:"Pat Jones",company:{name:"Acme Build Ltd",owner:"Pat Jones",mobile:"07700900500",oohName:"Pat Jones",oohPhone:"07700900500"}');
if(src===src0)throw new Error('company seed patch did not match');
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed).replace(/WK21 JEB/g,'AB21 CDE').replace(/"James"/g,'"Pat"');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const EXPOSE=['raPdf','talkPdf','pdfRecord','incidentPdf'];
let page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
for(const n of EXPOSE){const a='async function '+n+'(';if(page_src.split(a).length!==2)throw new Error('no '+n);page_src=page_src.replace(a,'window.'+n+'='+n+';'+a);}
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 const site='4 Rolle Road, Exmouth';
 const make=async(name,fn)=>{
  const n0=await p.evaluate(()=>(window.__dl||[]).length);
  const err=await p.evaluate(fn,site).catch(e=>'ERR '+e.message);
  await p.waitForTimeout(1500);
  const txt=await p.evaluate(async(n0)=>{const d=(window.__dl||[])[n0];if(!d)return null;const buf=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<buf.length;i++)s+=String.fromCharCode(buf[i]);return d.filename+'\n'+s;},n0);
  if(!txt){ok(false,name+': made a PDF'+(err?' ('+err+')':''));return;}
  const raw=txt.replace(/\\\)/g,')');
  ok(/Acme/i.test(raw),name+': has Acme\'s name ('+txt.split('\n')[0]+')');
  ok(!/James|\bJEB\b|Bray|Devon/i.test(raw),name+': says nothing about James, JEB or Devon');
 };
 await make('RAMS',(site)=>window.raPdf({id:'r1',title:'Loft conversion',site,created:Date.now(),steps:[],hazards:[],rows:[],items:[],ppe:[],sigs:[]}));
 await make('Toolbox talk',(site)=>window.talkPdf({id:'t1',title:'Working at height',site,body:'Use the scaffold.',created:Date.now(),sigs:[],people:[]}));
 await make('Site induction record',(site)=>window.pdfRecord({id:'i1',site,who:'emp1',name:'Sam Test',at:Date.now(),answers:{},details:{},ticks:{},sig:''}));
 await make('Accident report',(site)=>window.incidentPdf({id:'a1',site,date:new Date().toISOString().slice(0,10),time:'10:00',kind:'accident',who:'Sam Test',what:'Cut finger',created:Date.now()},[['What happened','Cut finger']]));
 /* the waste transfer note starts with no council and has no Devon list or real waste firm as examples */
 const wsrc=fs.readFileSync('../src/app/safety/waste-transfer-note.js','utf8');
 ok(!/council: "EDDC"/.test(wsrc)&&!/East Devon District Council/.test(wsrc)&&!/EMS Hill Barton|EMS Waste Services/.test(wsrc),'waste transfer note: no built-in council, Devon list or real waste firm');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h536: ${bad} failed`:'h536: all passed');await b.close();process.exit(bad?1:0);
})();
