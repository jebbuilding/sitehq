// QR stickers on James's square labels (45 × 45 mm, 20 on an A4 sheet, 4 across, 5 down), made-up yard: the sheet
// picture shows 20 spaces; he taps the first three as already used, so the four stickers fill spaces 4–7; he moves
// the print 1 mm right and 0.5 mm up. The PDF has each sticker's number in the middle of its space (moved by the
// nudge), the choice is remembered, and a lining-up sheet can be printed on plain paper.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["equipment/k1"]={kind:"machine",name:"Test Breaker"};store["equipment/k2"]={kind:"ladder",name:"Test Ladder"};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const lib=(u)=>u.includes('qrcode-generator')?'qrlib/package/qrcode.js':u.includes('jspdf')?'jspdfpkg/package/dist/jspdf.umd.min.js':null;
/* the text on page 1 of a PDF with where it sits, in mm from the top-left */
async function pdfText(b,b64,png){const v=await b.newPage();await v.setContent('<canvas id=c></canvas>');await v.addScriptTag({content:fs.readFileSync('pdfjspkg/package/build/pdf.min.js','utf8')});
 const items=await v.evaluate(async([b64,w,png])=>{pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([w],{type:'application/javascript'}));const d=await pdfjsLib.getDocument({data:Uint8Array.from(atob(b64),c=>c.charCodeAt(0))}).promise;const pg=await d.getPage(1);const tc=await pg.getTextContent();const H=pg.view[3];const mm=72/25.4;
  if(png){const vp=pg.getViewport({scale:1.3});const c=document.getElementById('c');c.width=vp.width;c.height=vp.height;await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;}
  return tc.items.map(t=>({s:t.str,x:(t.transform[4]+t.width/2)/mm,y:(H-t.transform[5])/mm}));},[b64,fs.readFileSync('pdfjspkg/package/build/pdf.worker.min.js','utf8'),!!png]);
 if(png)await v.locator('#c').screenshot({path:png});await v.close();return items;}
const lastDl=(p)=>p.evaluate(async()=>{const r=(window.__dl||[]).slice(-1)[0];if(!r)return null;const b=new Uint8Array(await r.data.arrayBuffer());let s='';for(let i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return {name:r.filename,b64:btoa(s)}});
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:1100}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{const f=lib(r.request().url());if(f)return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(f,'utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='setup';window.__S.f.stab='setup';window.render()});await p.waitForTimeout(300);
 await p.click('#kit-reg');await p.waitForTimeout(300);await p.click('#kit-qr');await p.waitForTimeout(400);
 ok(await p.inputValue('#qrs-size')==='square','the square 45 mm labels, 20 on a sheet, are picked to start with');
 ok(await p.locator('.qrs-cell').count()===20,'the sheet picture has 20 spaces');
 ok(await p.locator('.qrs-cell.qrs-fill').count()===4,'the 4 stickers fill the first 4 spaces');
 for(const k of [0,1,2])await p.click(`.qrs-cell[data-k="${k}"]`);
 const fill=await p.evaluate(()=>[...document.querySelectorAll('.qrs-cell.qrs-fill')].map(x=>+x.dataset.k));
 ok(await p.locator('.qrs-cell.qrs-used').count()===3&&JSON.stringify(fill)==='[3,4,5,6]','tapping the first three marks them used; the stickers move to spaces 4–7');
 await p.click('.qrs-line summary');await p.fill('#qrs-dx','1');await p.fill('#qrs-dy','-0.5');
 await p.locator('#sheet').screenshot({path:OUT+'h499-choose.png'});
 await p.click('#qrs-test');await p.waitForTimeout(1500);
 const t=await lastDl(p);ok(t&&/lining-up sheet/.test(t.name),'a lining-up sheet is made');
 if(t){const it=await pdfText(b,t.b64,OUT+'h499-lineup.png');const one=it.find(x=>x.s==='1');ok(one&&Math.abs(one.x-(10.5+22.5+1))<0.8,'its first box is where the first label is, moved 1 mm right ('+(one&&one.x.toFixed(1))+' mm)');}
 await p.click('#f-save');await p.waitForTimeout(2500);
 const d=await lastDl(p);ok(d&&d.name==='QR stickers.pdf','the sticker sheet is made');
 if(d){fs.writeFileSync(OUT+'h499-stickers.pdf',Buffer.from(d.b64,'base64'));const it=await pdfText(b,d.b64,OUT+'h499-stickers.png');
  const tags=it.filter(x=>/^[TV]-\d{3}$/.test(x.s));console.log(tags.map(x=>x.s+'@'+x.x.toFixed(1)+','+x.y.toFixed(1)).join(' '));
  const space=(x,y)=>{const col=Math.round((x-1-10.5-22.5)/48),row=Math.floor((y+0.5-30)/48);return row*4+col;};
  ok(tags.length===4&&JSON.stringify(tags.map(x=>space(x.x,x.y)).sort())==='[3,4,5,6]','each number is printed in spaces 4–7 of the sheet');
  ok(tags.every(x=>Math.abs(((x.x-1-10.5-22.5)/48)-Math.round((x.x-1-10.5-22.5)/48))<0.02),'centred across each label, with the 1 mm nudge');}
 const qrs=await p.evaluate(()=>window.__st['settings/app'].qrs);ok(qrs&&qrs.size==='square'&&qrs.dx===1&&qrs.dy===-0.5,'the label sheet and the nudge are remembered');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h499: ${bad} failed`:'h499: all passed');await b.close();process.exit(bad?1:0);
})();
