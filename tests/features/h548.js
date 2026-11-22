// Welfare unit notices with the site's location and references (made-up job at 4 Rolle Road, made-up what3words and
// map position, no planning or Building Control ref yet): the Site details page has what3words, latitude and
// longitude, grid reference, planning application ref and Building Control ref – the two refs not filled in get a line
// to write on; Emergency procedures adds the grid ref and lat/long under what3words; Emergency numbers starts with the
// site and its what3words, grid ref and lat/long.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='';
const SITE='4 Rolle Road, Exmouth';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:1100}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=hs]').click());await p.waitForTimeout(500);
 await p.selectOption('#hs-cdmsite',SITE);await p.click('#hs-cdm');await p.waitForTimeout(600);
 const set=async(k,v)=>{await p.fill(`.cdf[data-k=${k}]`,v);await p.locator(`.cdf[data-k=${k}]`).dispatchEvent('change');};
 await set('w3w','test.made.up');await set('latlon','50.6200, -3.4000');await set('planning','');await set('bcRef','');
 await p.click('#cdm-none');await p.waitForTimeout(300);
 await p.check('.cdd[data-k=welfarepack]');await p.check('#cdm-dl');
 await p.click('#f-save');await p.waitForTimeout(5000);
 const pdf=await p.evaluate(async()=>{const d=(window.__dl||[]).find(x=>/Welfare/.test(x.filename));if(!d)return '';const u=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return s});
 fs.writeFileSync(OUT+'welfare.pdf',Buffer.from(pdf,'binary'));
 ok(/%PDF/.test(pdf),'the welfare unit notices are made');
 ok(/what3words/.test(pdf)&&/test\.made\.up/.test(pdf)&&/Lat, long \\\(decimal\\\)/.test(pdf)&&/Grid reference/.test(pdf),'Site details: what3words, lat/long and grid reference');
 ok(/Planning application ref/.test(pdf)&&/Building Control ref/.test(pdf)&&/________________________/.test(pdf),'with planning and Building Control refs – a line to write on when not filled in');
 ok(/GRID REF:/.test(pdf)&&/LAT, LONG:  50\.62/.test(pdf),'Emergency procedures: grid ref and lat/long under the location');
 ok(/THIS SITE: /.test(pdf)&&/Grid ref /.test(pdf),'Emergency numbers start with the site and where it is');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h548: ${bad} failed`:'h548: all passed');await b.close();process.exit(bad?1:0);
})();
