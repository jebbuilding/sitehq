// Tools & plant › 📷 Scan a sticker in a browser that can't read QR codes itself (like Safari on the iPad): the camera
// (a made-up video of sticker "SITEHQ T-002" held up) is read by the small QR reader the app loads, and the list jumps
// to that tool. A QR code that isn't one of ours says so and keeps looking.
const fs=require('fs');const path=require('path');const {chromium}=require('playwright');
const qrcode=require('../qrlib/package/qrcode.js');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["equipment/k1"]={kind:"machine",name:"Test Breaker",tag:"T-001"};store["equipment/k2"]={kind:"ladder",name:"Test Ladder",tag:"T-002"};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
/* a camera video (y4m, grey): the QR code for text, black on white, in the middle of the picture */
function y4m(text,file){const q=qrcode(0,'M');q.addData(text);q.make();const n=q.getModuleCount();const W=640,H=480,cell=Math.floor(300/(n+8));const size=cell*(n+8);const x0=(W-size)/2|0,y0=(H-size)/2|0;
 const Y=Buffer.alloc(W*H,200);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const r=Math.floor(y/cell)-4,cc=Math.floor(x/cell)-4;Y[(y0+y)*W+x0+x]=(r>=0&&cc>=0&&r<n&&cc<n&&q.isDark(r,cc))?0:255;}
 const UV=Buffer.alloc(W*H/2,128);const frame=Buffer.concat([Buffer.from('FRAME\n'),Y,UV]);
 fs.writeFileSync(file,Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`),...Array(20).fill(frame)]));}
async function run(text){
 const vid=path.resolve('h497-cam.y4m');y4m(text,vid);
 const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+vid]});
 const ctx=await b.newContext({viewport:{width:1000,height:900},permissions:['camera']});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{delete window.BarcodeDetector}catch(e){}});
 const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>';
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.startsWith('https://sitehq.test/'))return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html});if(u.includes('jsqr'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jsqrpkg/package/dist/jsQR.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.goto('https://sitehq.test/');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 ok(await p.evaluate(()=>!('BarcodeDetector' in window)),'this browser has no QR reader of its own');
 await p.evaluate(()=>{window.__S.otab='setup';window.__S.f.stab='setup';window.render()});await p.waitForTimeout(300);
 await p.click('#kit-reg');await p.waitForTimeout(400);ok(await p.evaluate(()=>isSecureContext&&!!navigator.mediaDevices),'the page can use the camera');await p.click('#kit-scan');
 return {b,p};}
(async()=>{try{
 let {b,p}=await run('SITEHQ T-002');
 await p.waitForFunction(()=>!document.querySelector('.kit-video'),null,{timeout:10000}).catch(()=>{});
 ok(await p.evaluate(()=>!!window.jsQR),'the small QR reader was loaded');
 ok(await p.locator('.kit-video').count()===0,'the camera closes once the sticker is read');
 const q=await p.inputValue('#kit-q').catch(()=>'');const t=await p.innerText('#viewer-body');
 ok(q==='T-002'&&/Test Ladder/.test(t)&&!/Test Breaker/.test(t),'it jumps to T-002, the ladder');
 await b.close();
 ({b,p}=await run('https://example.com/not-ours'));await p.waitForTimeout(3000);
 ok(await p.locator('.kit-video').count()===1&&/not one of our tool stickers/.test(await p.innerText('.kit-hint')),'a QR code that isn\'t ours: it says so and keeps looking');
 await p.click('.kit-stop');await p.waitForTimeout(200);ok(await p.locator('.kit-video').count()===0,'Cancel closes the camera');
 await b.close();
 }catch(e){console.log('FAIL',e.message);bad++;}
 try{fs.unlinkSync('h497-cam.y4m')}catch(e){}
 console.log(bad?`h497: ${bad} failed`:'h497: all passed');process.exit(bad?1:0);
})();
