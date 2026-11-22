// Waste transfer note to a tip, filled from Setup (made-up tip "Town tip", Anytown Waste Ltd, permit EPR/AB1234CD): James is
// handing the waste over (Section B = his firm) and picks the tip in Section D – Section C (the person receiving the waste)
// fills itself with the tip's company, address, postcode and environmental permit, as on the government form (WMC2A).
// Section C also has a "Tip / transfer site" choice with the list of tips. The PDF has the tip's details in Section C.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const HOOK='function render() {';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2,'render hook found once');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace(HOOK,'window.render=render;window.__T=()=>({WTN});'+HOOK);
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1200}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(async()=>{const S=window.__S;const wasteSites=[{id:"ws1",name:"Town tip",company:"Anytown Waste Ltd",contact:"Gate office",addr:"Unit 4, Business Park, Anytown",postcode:"AB1 2CD",permitNo:"EPR/AB1234CD",permitBy:"Environment Agency"}];await S.db.doc("settings/app").update({wasteSites});S.settings=Object.assign({},S.settings,{wasteSites});});
 await p.evaluate(()=>window.__T().WTN.open());await p.waitForTimeout(600);
 ok(await p.locator('[data-party=C][data-role=site]').count()===1,'Section C has a "Tip / transfer site" choice');
 await p.click('[data-party=B][data-role=us]');await p.waitForTimeout(400);
 ok(await p.isChecked('#wt-B-is-producer'),'with his firm in Section B, "The producer of the waste?" is ticked');
 await p.selectOption('#wt-D-site','ws1');await p.dispatchEvent('#wt-D-site','change');await p.waitForTimeout(600);
 const v=async id=>p.inputValue('#wt-C-'+id).catch(()=>'');
 ok(await v('company')==='Anytown Waste Ltd'&&await v('postcode')==='AB1 2CD','picking the tip in Section D fills Section C: Anytown Waste Ltd, AB1 2CD');
 ok(await v('permitNo')==='EPR/AB1234CD'&&await v('permitBy')==='Environment Agency'&&await p.isChecked('#wt-C-is-permit'),'with its environmental permit EPR/AB1234CD (Environment Agency), ticked');
 ok(await p.inputValue('#wt-C-ws')==='ws1','Section C shows it as the tip / transfer site');
 ok(/Unit 4, Business Park/.test(await p.inputValue('#wt-D-addr').catch(()=>'')),'and Section D has the tip\'s address');
 await p.locator('#wt-C-company').scrollIntoViewIfNeeded();await p.screenshot({path:'h657-wtn.png'});
 const n0=await p.evaluate(()=>(window.__dl||[]).length);
 await p.click('#wt-pdf');await p.waitForTimeout(3500);
 const pdf=await p.evaluate(async n0=>{const d=(window.__dl||[])[n0];if(!d)return null;const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return [d.filename,btoa(s)]},n0);
 if(pdf)fs.writeFileSync('h657-wtn.pdf',Buffer.from(pdf[1],'base64'));
 const raw=pdf?Buffer.from(pdf[1],'base64').toString('latin1'):'';
 ok(/Anytown Waste Ltd/.test(raw)&&/EPR\/AB1234CD/.test(raw),'the PDF has the tip in Section C with its permit (h657-wtn.pdf)');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h657: ${bad} failed`:'h657: all passed');await b.close();process.exit(bad?1:0);
})();
