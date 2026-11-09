// Sites › a site › 📦 Send job details (made-up job at 4 Rolle Road): for someone not on the app. Tick what goes in,
// and it makes one PDF on the letterhead (with the job, access, hazards, a map link and the latest photos) or a
// spreadsheet, then saves it, or sends it by WhatsApp (the file saves and WhatsApp opens with the message ready).
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const SITE='4 Rolle Road, Exmouth';
const extra='store["sheets/owner/photos/jk1"]={kind:"photo",assetId:"img1",caption:"Rear of the house",site:"'+SITE+'",takenAt:1762300000000,date:"2026-11-04",mine:true,created:1};'+
 'store["todos/sj-jk"]={kind:"sitejob",site:"'+SITE+'",job:{work:"Loft conversion",scope:"Loft conversion with a rear dormer",access:"Key safe by the back door 4321",safety:"Dog in the house",hours:"8am to 5pm"},vis:"all",groups:[],people:[],perms:{},updated:1};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const img=fs.readFileSync('fixtures/ld1.png').toString('base64');
const page_src=fs.readFileSync('timesheets.html','utf8')
  .replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>{if(!window.__blobs[id]&&id==="img1"){const b=atob(window.__IMG);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);window.__blobs.img1=new Blob([u],{type:"image/png"})}return window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id};')
  .replace('function render() {','window.render=render;function render() {').replace('const S = {\n  db: null','const S=window.__S={db:null');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('xlsx'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('xlsxpkg/package/dist/xlsx.full.min.js','utf8')});if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body><script>window.__IMG="'+img+'";</script>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* no share sheet here (like a computer), and note the links the app opens */
 await p.evaluate(()=>{navigator.canShare=()=>false;window.__links=[];HTMLAnchorElement.prototype.click=function(){window.__links.push(this.href)};});
 await p.evaluate(s=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.__S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(600);
 ok(await p.locator('#jk-open').count()===1,'the site page has a Send job details button');
 await p.click('#jk-open');await p.waitForTimeout(300);
 const parts=await p.evaluate(()=>[...document.querySelectorAll('.jk-p')].map(b=>b.value+(b.checked?'+':'-')).join(' '));console.log(parts);
 ok(/job\+/.test(parts)&&/access\+/.test(parts)&&/safety\+/.test(parts)&&/photos-/.test(parts),'the job, access and hazards are ticked; photos are a choice');
 await p.check('.jk-p[value=photos]');await p.check('input[name=jk-how][value=save]');
 await p.fill('#jk-note','Scaffold needed to the rear from Monday');
 await p.click('#f-save');await p.waitForTimeout(3000);
 const d=await p.evaluate(()=>(window.__dl||[]).map(x=>[x.filename,x.data.size]));console.log(JSON.stringify(d));
 const last=d[d.length-1]||[];
 ok(/^Job details - 4 Rolle Road, Exmouth\.pdf$/.test(last[0]||'')&&last[1]>3000,'a PDF is made, named after the job');
 const pdf=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return s});
 fs.writeFileSync('h471-pack.pdf',Buffer.from(pdf,'latin1'));
 ok(pdf.includes('Job details')&&pdf.includes('Loft conversion with a rear dormer'),'it has the job and what is being done');
 ok(pdf.includes('Key safe by the back door 4321')&&pdf.includes('Dog in the house'),'access and hazards');
 ok(pdf.includes('Scaffold needed to the rear from Monday'),'the note');
 ok(pdf.includes('google.com/maps'),'a map link');
 ok(/\/Subtype \/Image/.test(pdf),'the photo');
 /* a spreadsheet, without the access (key codes) */
 await p.click('#jk-open');await p.waitForTimeout(300);
 await p.uncheck('.jk-p[value=access]');await p.check('input[name=jk-fmt][value=sheet]');await p.check('input[name=jk-how][value=save]');
 await p.click('#f-save');await p.waitForTimeout(3000);
 const sh=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const wb=window.XLSX.read(new Uint8Array(await r.data.arrayBuffer()),{type:'array'});return [r.filename,window.XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]])]});
 console.log(sh[0]);
 ok(/\.xlsx$/.test(sh[0]),'a spreadsheet is made');
 ok(sh[1].includes('Loft conversion with a rear dormer')&&sh[1].includes('Dog in the house'),'with the job and hazards');
 ok(!sh[1].includes('4321'),'and without the access, as it was unticked');
 /* WhatsApp, no share sheet: the file saves and WhatsApp opens to their number with the message */
 await p.click('#jk-open');await p.waitForTimeout(300);
 await p.check('input[name=jk-how][value=wa]');await p.fill('#jk-to','07700 900123');
 const n0=await p.evaluate(()=>window.__dl.length);
 await p.click('#f-save');await p.waitForTimeout(3000);
 const L=await p.evaluate(()=>window.__links);console.log(L.map(x=>x.slice(0,60)));
 ok(await p.evaluate(n=>window.__dl.length>n,n0),'the file saves');
 ok(L.some(x=>/^https:\/\/wa\.me\/447700900123\?text=.*4%20Rolle%20Road/.test(x)),'WhatsApp opens to their number with the message');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h471: ${bad} failed`:'h471: all passed');await b.close();process.exit(bad?1:0);
})();
