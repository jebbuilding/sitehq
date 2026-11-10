// QR stickers for everything (made-up yard): Vehicles & plant › 🏷 QR stickers lists the van, the digger, the breaker
// and the ladder, all ticked as none has a sticker yet. James prints just the van, large: it becomes V-001, the sheet
// is made (saved as a picture to look at), and next time the van shows as printed and isn't ticked. Then Sam, on
// 📋 Reports, taps 📷 Scan the sticker on a van or machine and holds the phone to the van's sticker (a made-up camera
// video): the Vehicle check opens with the van already picked.
const fs=require('fs');const path=require('path');const {chromium}=require('playwright');
const qrcode=require('../qrlib/package/qrcode.js');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["equipment/k1"]={kind:"machine",name:"Test Breaker"};store["equipment/k2"]={kind:"ladder",name:"Test Ladder"};';
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
function mk(owner,more){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed+extra+(more||''));eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake(owner);}
let page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(DD).length===2,'details hook found');
const trade_src=page_src.replace(DD,'function detailsDone(d){return true}');
const lib=(u)=>u.includes('qrcode-generator')?['qrlib/package/qrcode.js']:u.includes('jspdf')?['jspdfpkg/package/dist/jspdf.umd.min.js']:u.includes('jsqr')?['jsqrpkg/package/dist/jsQR.js']:null;
function y4m(text,file){const q=qrcode(0,'M');q.addData(text);q.make();const n=q.getModuleCount();const W=640,H=480,cell=Math.floor(300/(n+8));const size=cell*(n+8);const x0=(W-size)/2|0,y0=(H-size)/2|0;
 const Y=Buffer.alloc(W*H,200);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const r=Math.floor(y/cell)-4,cc=Math.floor(x/cell)-4;Y[(y0+y)*W+x0+x]=(r>=0&&cc>=0&&r<n&&cc<n&&q.isDark(r,cc))?0:255;}
 const UV=Buffer.alloc(W*H/2,128);const frame=Buffer.concat([Buffer.from('FRAME\n'),Y,UV]);
 fs.writeFileSync(file,Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`),...Array(20).fill(frame)]));}
async function newCtx(b,html){const ctx=await b.newContext({viewport:{width:1000,height:900},permissions:['camera']});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{delete window.BarcodeDetector}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.startsWith('https://sitehq.test/'))return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html});const f=lib(u);if(f)return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(f[0],'utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await p.goto('https://sitehq.test/');await p.waitForTimeout(2000);await p.keyboard.press('Escape');return p;}
(async()=>{const vid=path.resolve('h498-cam.y4m');y4m('SITEHQ V-001',vid);
 const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+vid]});
 try{
 /* James */
 const p=await newCtx(b,'<!doctype html><html><head><meta charset=utf8></head><body>'+mk(true)+page_src+'</body></html>');
 await p.evaluate(()=>{window.__S.otab='setup';window.__S.f.stab='setup';window.render()});await p.waitForTimeout(300);
 await p.click('#eqm-reg');await p.waitForTimeout(400);
 ok(await p.isVisible('#eqm-qr')&&await p.isVisible('#eqm-scan'),'Vehicles & plant has QR stickers and Scan a sticker');
 await p.click('#eqm-qr');await p.waitForTimeout(300);
 let t=await p.innerText('#sheet');
 ok(/Vans & vehicles/.test(t)&&/WK21 JEB/.test(t)&&/Diggers/.test(t)&&/Kubota/.test(t)&&/Test Breaker/.test(t)&&/Ladders/.test(t)&&/Test Ladder/.test(t),'it lists the van, the digger, the breaker and the ladder, grouped');
 ok(await p.locator('.qrs-on').count()===4&&await p.locator('.qrs-on:checked').count()===4,'all ticked, as none has a sticker yet');
 await p.click('#qrs-none');await p.check('.qrs-on[data-id=e1]');await p.selectOption('#qrs-size','large');await p.click('#f-save');await p.waitForTimeout(2500);
 const e1=await p.evaluate(()=>window.__st['equipment/e1']);
 ok(e1.tag==='V-001'&&e1.tagAt>0,'the van gets V-001 and the date its sticker was printed');
 ok(await p.evaluate(()=>!window.__st['equipment/k1'].tag),'the ones not ticked are left alone');
 const dl=await p.evaluate(async()=>{const r=(window.__dl||[]).slice(-1)[0];if(!r)return null;const b=new Uint8Array(await r.data.arrayBuffer());let s='';for(let i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return {name:r.filename,b64:btoa(s)}});
 ok(dl&&/Transit sticker\.pdf$/.test(dl.name),'the sheet is saved: '+(dl&&dl.name));
 if(dl){const pdf=Buffer.from(dl.b64,'base64');fs.writeFileSync(OUT+'h498-stickers.pdf',pdf);
  const v=await b.newPage();await v.setContent('<canvas id=c></canvas>');await v.addScriptTag({content:fs.readFileSync('pdfjspkg/package/build/pdf.min.js','utf8')});
  await v.evaluate(async([b64,w])=>{pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([w],{type:'application/javascript'}));const d=await pdfjsLib.getDocument({data:Uint8Array.from(atob(b64),c=>c.charCodeAt(0))}).promise;const pg=await d.getPage(1);const vp=pg.getViewport({scale:1.6});const c=document.getElementById('c');c.width=vp.width;c.height=vp.height/2.2;await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;},[dl.b64,fs.readFileSync('pdfjspkg/package/build/pdf.worker.min.js','utf8')]);
  await v.locator('#c').screenshot({path:OUT+'h498-stickers.png'});await v.close();}
 await p.click('#eqm-qr');await p.waitForTimeout(300);t=await p.innerText('#sheet');
 ok(/printed/.test(t)&&!(await p.isChecked('.qrs-on[data-id=e1]'))&&await p.isChecked('.qrs-on[data-id=k1]'),'next time the van shows as printed and only the rest are ticked');
 await p.click('#f-cancel');await p.waitForTimeout(200);
 /* James scans the van's sticker: its page opens */
 await p.click('#eqm-scan');await p.waitForFunction(()=>!document.querySelector('.kit-video'),null,{timeout:10000}).catch(()=>{});await p.waitForTimeout(400);
 ok(/WK21 JEB/.test(await p.innerText('body'))&&await p.locator('.kit-video').count()===0,'James scanning the van\'s sticker opens the van');
 /* Sam */
 const more='store["equipment/e1"].tag="V-001";';
 const tp=await newCtx(b,'<!doctype html><html><head><meta charset=utf8></head><body>'+mk(false)+trade_src+'</body></html>');
 await tp.evaluate(async()=>{await window.__S.db.doc('equipment/e1').update({tag:'V-001'})});await tp.waitForTimeout(300);
 await tp.evaluate(()=>{window.__S.tab='checks';window.__S.f.rcat='';window.render()});await tp.waitForTimeout(400);
 ok(await tp.isVisible('#rep-scan'),'Sam\'s Reports has 📷 Scan the sticker on a van or machine');
 await tp.click('#rep-scan');await tp.waitForSelector('#c-asset',{timeout:10000}).catch(()=>{});
 const st=await tp.innerText('#sheet').catch(()=>'');const av=await tp.evaluate(()=>document.getElementById('c-asset')&&document.getElementById('c-asset').value);
 ok(/Vehicle check/.test(st)&&av==='WK21 JEB – Transit','the Vehicle check opens with the van already picked');
 }catch(e){console.log('FAIL',e.message);bad++;}
 try{fs.unlinkSync(vid)}catch(e){}
 console.log(bad?`h498: ${bad} failed`:'h498: all passed');await b.close();process.exit(bad?1:0);
})();
