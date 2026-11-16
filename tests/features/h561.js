// Ready for another firm (all made-up): Leads shows the councils the firm's own leads come from (here "Northtown" and
// "Southvale", nowhere near Devon), not a built-in Devon list; tapping one hides its leads; distances are measured
// from the company's own place (Company details lat/lon); the sites map's starting place comes from there too; and
// the "Areas you work in" example is general.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {').replace('function coHome() {','window.coHome=coHome;function coHome() {').replace('function smOpen() {','window.smOpen=smOpen;window.__SM=()=>SM;function smOpen() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const ym=new Date().toISOString().slice(0,7);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(async(ym)=>{const S=window.__S;const co=Object.assign({},(S.settings||{}).company||{},{lat:52.48,lon:-1.9,workArea:''});await S.db.doc('settings/app').update({company:co});S.settings=Object.assign({},S.settings,{company:co});
  const col='data/users/'+S.me+'/leads/apps/';
  await S.db.doc(col+'a1').set({address:'1 Test Street, Northtown',council:'Northtown',month:ym,category:'single',status:'Pending',postcode:'NT1 1AA',lat:52.55,lon:-1.9,ref:'N/1'});
  await S.db.doc(col+'a2').set({address:'2 Test Road, Southvale',council:'Southvale',month:ym,category:'loft',status:'Pending',postcode:'SV2 2BB',lat:52.3,lon:-1.9,ref:'S/2'});},ym);
 const h=await p.evaluate(()=>window.coHome());
 ok(h&&h[0]===52.48&&h[1]===-1.9,'the company\'s own place comes from Company details ('+h+')');
 await p.evaluate(()=>{const S=window.__S;S.preview=false;S.otab='leads';window.render()});await p.waitForTimeout(800);
 await p.evaluate(()=>window.render());await p.waitForTimeout(500);
 const cs=await p.evaluate(()=>[...document.querySelectorAll('.ld-c')].map(b=>b.textContent));
 ok(cs.join()==='Northtown,Southvale','the councils are the ones the leads come from: '+cs.join(', '));
 const page=await p.innerText('#main');
 ok(!/East Devon|Teignbridge|Exeter/.test(page),'nothing about Devon councils');
 ok(/1 Test Street/.test(page)&&/2 Test Road/.test(page),'both leads show');
 const mi=await p.innerText('.ld-card:has-text("1 Test Street") .meta');
 ok(/\b5\b/.test(mi),'its distance is from the company\'s own place: '+mi.replace(/\s+/g,' '));
 await p.click('.ld-c[data-c=Southvale]');await p.waitForTimeout(400);
 const after=await p.innerText('#main');
 ok(/1 Test Street/.test(after)&&!/2 Test Road/.test(after)&&await p.getAttribute('.ld-c[data-c=Southvale]','aria-pressed')==='false','tapping Southvale hides its leads');
 await p.click('.ld-c[data-c=Northtown]');await p.waitForTimeout(400);
 ok(await p.getAttribute('.ld-c[data-c=Northtown]','aria-pressed')==='true','the last council showing stays on');
 await p.click('.ld-c[data-c=Southvale]');await p.waitForTimeout(400);
 ok(/2 Test Road/.test(await p.innerText('#main')),'tapping it again brings its leads back');
 /* the sites map with no site pinned yet: over the company's place, not Exmouth */
 await p.evaluate(()=>{const S=window.__S;S.sites.forEach(x=>{delete x.lat;delete x.lon});window.smOpen()});await p.waitForTimeout(800);
 const sm=await p.evaluate(()=>{const M=window.__SM();const lat=(n)=>{const y=M.y/(256*2**M.z);return Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI};return [M.z,+lat().toFixed(1)]});
 ok(sm[0]===10&&Math.abs(sm[1]-52.5)<0.5,'the sites map starts over the company’s own place (zoom '+sm[0]+', lat '+sm[1]+')');
 await p.evaluate(()=>{const c=document.getElementById('viewer-close')||[...document.querySelectorAll('#viewer button')].find(b=>/close/i.test(b.textContent));if(c)c.click();});await p.waitForTimeout(400);
 /* Company details: the example is general */
 await p.evaluate(()=>{const S=window.__S;S.otab='setup';S.f.stab='company';window.render()});await p.waitForTimeout(400);if(await p.locator('#co-edit').count())await p.click('#co-edit');await p.waitForTimeout(400);const ph=await p.getAttribute('#co-workArea','placeholder');
 ok(ph&&!/Devon|Exeter|Teignbridge/.test(ph),'the "Areas you work in" example is general ('+ph+')');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h561: ${bad} failed`:'h561: all passed');await b.close();process.exit(bad?1:0);
})();
