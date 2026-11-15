// Site QR poster with no setup (made-up job at 4 Rolle Road, QR sign-in for visitors not set up): the site's QR card
// has 📄 QR poster straight away, with Set up for visitors too beside it; the poster is a PDF saying "Working here? Scan
// with your phone camera to open SiteHQ" with the steps (Sign in to site and choose this site), and its QR code leads
// to the app (not to a visitors' page).
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
const SITE='4 Rolle Road, Exmouth';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:1100},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});
  if(u.includes('qrcode'))return r.fulfill({status:200,contentType:'application/javascript',body:'window.qrcode=function(){let t="";return {addData:x=>{t=x;window.__qrText=x},make:()=>{},getModuleCount:()=>21,isDark:(r,c)=>(r*7+c*3)%5===0}}'});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(s=>{const S=window.__S;S.qrCfg=null;S.otab='projects';S.f.projList=false;S.f.proj=s;S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(500);
 const card=p.locator('.qrcard');
 ok(await card.locator('.qr-app').count()===1&&/QR poster/.test(await card.locator('.qr-app').innerText()),'the site\'s QR card has 📄 QR poster straight away');
 ok(/Set up for visitors too/.test(await card.innerText()),'with Set up for visitors too beside it');
 await (await p.$('.qrcard')).screenshot({path:OUT+'qr-card.png'});
 await card.locator('.qr-app').click();await p.waitForTimeout(2500);
 const pdf=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];const bl=(d&&d.data)||window.__lastPoster;if(!bl)return '';const u=new Uint8Array(await bl.arrayBuffer());let s='';for(let i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return s});
 ok(/%PDF/.test(pdf)&&/Working here\? Scan with your phone camera to open SiteHQ/.test(pdf)&&/Sign in to site and choose this site/.test(pdf),'the poster PDF says scan to open SiteHQ, then Sign in to site');
 ok(/claude\.ai\/artifact\//.test(await p.evaluate(()=>window.__qrText||'')),'its QR code leads to the app');
 fs.writeFileSync(OUT+'qr-poster.pdf',Buffer.from(pdf,'binary'));
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h547: ${bad} failed`:'h547: all passed');await b.close();process.exit(bad?1:0);
})();
