// Leads on a map (made-up planning applications). Leads › 🗺️ Map shows the leads the filters show, coloured by
// not written to / hot / saved / letter sent; Letters sent and Not written to filter the pins; a pin's card ticks it for
// a letter. Writes h620*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
const now=new Date();const ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1150,height:950}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.evaluate(async()=>{const S=window.__S;const co=Object.assign({},(S.settings||{}).company||{},{lat:52.5,lon:-1.9});await S.db.doc('settings/app').update({company:co});S.settings=Object.assign({},S.settings,{company:co});});
 await p.evaluate(async ym=>{const S=window.__S;const col='data/users/'+S.me+'/leads/apps/';
  await S.db.doc(col+'m1').set({address:'1 Map Street, Northtown',council:'Northtown',month:ym,category:'single',status:'Pending',postcode:'NT1 1AA',lat:52.55,lon:-1.9,ref:'N/1',town:'Northtown',desc:'Single-storey rear extension'});
  await S.db.doc(col+'m2').set({address:'2 Map Road, Northtown',council:'Northtown',month:ym,category:'loft',status:'Pending',postcode:'NT2 2BB',lat:52.5,lon:-1.95,ref:'N/2',sent:true,sentDate:ym+'-03',letter:'homeowner',desc:'Dormer loft'});
  await S.db.doc(col+'m3').set({address:'3 Map Lane, Northtown',council:'Northtown',month:ym,category:'two',status:'Pending',postcode:'NT3 3CC',lat:52.45,lon:-1.85,ref:'N/3',saved:true,desc:'Two-storey side'});},ym);
 await p.evaluate(()=>{const S=window.__S;S.otab='leads';window.render()});await p.waitForTimeout(800);await p.evaluate(()=>window.render());await p.waitForTimeout(400);
 ok(await p.isVisible('#ld-map'),'Leads has 🗺️ Map');
 await p.click('#ld-map');await p.waitForTimeout(800);
 const pins=()=>p.evaluate(()=>[...document.querySelectorAll('#sm-map .sm-pin')].map(x=>x.className.replace('sm-pin','').trim()));
 let pc=await pins();
 ok(pc.length===3&&pc.some(x=>/ldsent/.test(x))&&pc.some(x=>/ldsaved/.test(x))&&pc.some(x=>/ldnew/.test(x)),'all three leads are pins, coloured by sent / saved / not written to ('+pc.join(', ')+')');
 await p.waitForTimeout(800);
 const bk=await p.evaluate(()=>({plain:document.getElementById('sm-map').classList.contains('sm-plain'),home:!!document.querySelector('#sm-map .sm-home'),rings:document.querySelectorAll('#sm-map .sm-ring').length,towns:[...document.querySelectorAll('#sm-map .sm-town')].map(x=>x.innerText)}));
 ok(bk.plain&&bk.home&&bk.rings>=1&&bk.towns.includes('Northtown'),'with no map pictures it still draws your base, distance rings and the towns ('+JSON.stringify(bk)+')');
 await p.screenshot({path:'h620-map.png'});
 await p.click('#sm-f button[data-v="sent"]');await p.waitForTimeout(400);
 pc=await pins();ok(pc.length===1&&/ldsent/.test(pc[0]),'Letters sent shows only the one written to');
 await p.click('#sm-f button[data-v="notsent"]');await p.waitForTimeout(400);
 pc=await pins();ok(pc.length===2&&!pc.some(x=>/ldsent/.test(x)),'Not written to shows the other two');
 await p.click('#sm-map .sm-pin.ldnew');await p.waitForTimeout(300);
 const card=await p.innerText('#sm-card');
 ok(/1 Map Street/.test(card)&&/Single-storey rear extension/.test(card),'tapping a pin shows the lead');
 await p.click('#sm-card .ld-mpick');await p.waitForTimeout(200);
 ok(/Ticked for a letter/.test(await p.innerText('#sm-card')),'and ✉️ Tick for a letter ticks it');
 await p.evaluate(()=>document.getElementById('viewer-close').click());await p.waitForTimeout(300);await p.evaluate(()=>window.render());await p.waitForTimeout(300);
 ok(/Download 1 letter/.test(await p.innerText('#ld-letters')),'back on Leads it is ticked, ready for the letter');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h620: ${bad} failed`:'h620: all passed');await b.close();process.exit(bad?1:0);
})();
