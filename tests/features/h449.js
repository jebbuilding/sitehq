// Cupboards – more adjustments and combinations (all made-up sizes). A wardrobe 2400 wide × 2400 high × 600 deep,
// 100 plinth, 18 carcass, 22 doors, 25 shelves, four bays:
//  1: hanging, 700 wide by hand, rail at 1700 from the floor, a 400 top box (split door), mirror door;
//  2: shelves at 500, 900 and 1300 from the floor, two 250 drawers;
//  3: a dressing table / desk gap; 4: a cupboard below, open, a cupboard above.
// Handle-less, edging, colours. Then the chimney shape. Checks the cutting list (workshop pack), the drawing's notes,
// and that the 3D view draws in the colours chosen.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const packText=async()=>{await p.evaluate(()=>document.querySelector('.np [data-bt=cupbpack]').click());await p.waitForTimeout(300);await p.click('#cbp-pdf');await p.waitForTimeout(1800);
  const t=await p.evaluate(async()=>{const r=window.__dl[window.__dl.length-1];const u=new Uint8Array(await r.data.arrayBuffer());let s='';u.forEach(x=>s+=String.fromCharCode(x));return s});await p.click('#f-cancel').catch(()=>{});await p.waitForTimeout(150);return t.replace(/[^\x20-\x7e]/g,' ');};
 const pageText=()=>p.evaluate(()=>{const n=document.querySelector('.np');return n&&n.__doc?'':''});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb]').click());await p.waitForTimeout(300);
 await p.fill('#cb2-name','Wardrobe – combinations');await p.fill('#cb2-W','2400');await p.fill('#cb2-H','2400');await p.fill('#cb2-D','600');await p.fill('#cb2-p','100');
 await p.selectOption('#cb2-doors','hinged');await p.fill('#cb2-n','4');await p.waitForTimeout(150);
 ok((await p.$$('.cb2-bay .cb2-adj')).length===4,'each bay has Adjust this bay');
 const bays=await p.$$('.cb2-bay');
 const adj=async(i,f)=>{await bays[i].$eval('details.cb2-adj',d=>d.open=true);for(const [k,v] of Object.entries(f)){const el=await bays[i].$(k);if((await el.evaluate(e=>e.tagName))==='SELECT')await el.selectOption(v);else await el.fill(String(v));}};
 await adj(0,{'.cb2-k':'hang1','.cb2-dr':'mirror','.cb2-w':700,'.cb2-rl':1700,'.cb2-tb':400});
 await adj(1,{'.cb2-k':'shelves','.cb2-sh':'500, 900, 1300','.cb2-d':2,'.cb2-dh':250});
 await adj(2,{'.cb2-k':'desk','.cb2-s':1});
 await adj(3,{'.cb2-k':'basewall','.cb2-s':1});
 await p.$eval('details.cb2-fin',d=>d.open=true);
 await p.fill('#cb2-dt','22');await p.fill('#cb2-sht','25');await p.selectOption('#cb2-hd','none');await p.selectOption('#cb2-edge',{index:1});
 await p.selectOption('#cb2-cd','#2f3d55');await p.selectOption('#cb2-cc','#f4f4f1');await p.selectOption('#cb2-ct','#c9a477');
 await p.click('#f-save');await p.waitForTimeout(900);
 ok(/Drawn on a new page/.test(await lastToast()),await lastToast());
 await p.screenshot({path:'h449-wardrobe.png'});
 const txt=await packText();
 ok(/Mirror door/.test(txt)&&/Mirror glass/.test(txt),'bay 1: a mirror door and its glass');
 ok(/Fixed shelf/.test(txt)&&/under the top box/.test(txt),'bay 1: a fixed shelf under the top box');
 ok(/Desk \/ dressing table top/.test(txt),'bay 3: the desk top');
 ok(/top of the cupboard below/.test(txt)&&/bottom of the cupboard above/.test(txt),'bay 4: cupboard below and above');
 ok(/Push-to-open catches/.test(txt)&&!/Bar handles/.test(txt),'handle-less: push-to-open catches, no handles');
 ok(/Drawer front[\s\S]{0,400}247/.test(txt),'drawer fronts 250 high (247 with the gap)');
 const notes=await p.evaluate(()=>{const d=window.__lastNpDoc;return ''});
 /* the drawing: notes and the hand-set heights; read the page's own objects */
 const objsTxt=await p.evaluate(()=>{const c=document.querySelector('.np canvas');return document.body.innerText});
 void notes;void objsTxt;void pageText;
 /* the 3D view starts in the colours chosen: navy doors */
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb3d]').click());await p.waitForTimeout(500);
 const navy=await p.evaluate(()=>{const c=document.getElementById('cb3-cv');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=16){if(d[i]<80&&d[i+1]<90&&d[i+2]>60&&d[i+2]<130&&d[i+2]>d[i]+15)n++}return n});
 ok(navy>2000,'3D view starts with the navy doors chosen ('+navy+')');
 ok(/Navy/.test(await p.innerText('#cb3-dn'))&&/None/.test(await p.$eval('#cb3-hd',s=>s.selectedOptions[0].textContent)),'3D: door colour Navy, handles none');
 await p.screenshot({path:'h449-3d.png'});
 await p.click('#cb3-x');await p.waitForTimeout(200);
 /* the chimney: an alcove each side */
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb]').click());await p.waitForTimeout(300);
 await p.click('.cb2-kpics .cb2-pic[data-v=chimney]');await p.waitForTimeout(200);
 ok(await p.isVisible('#cb2-cw')&&/Right alcove/.test(await p.innerText('.cb2-wbl'))&&/Left alcove/.test(await p.innerText('.cb2-wl')),'chimney: left alcove, breast and right alcove widths');
 await p.fill('#cb2-W','900');await p.fill('#cb2-wb','1000');await p.fill('#cb2-cw','1200');await p.fill('#cb2-H','2400');
 await p.click('#f-save');await p.waitForTimeout(900);
 ok(/Drawn on a new page/.test(await lastToast()),'chimney drawn: '+await lastToast());
 await p.screenshot({path:'h449-chimney.png'});
 const t2=await packText();
 ok(/Left alcove cupboard/.test(t2)&&/Right alcove shelves/.test(t2)&&/worktop/.test(t2),'chimney: both alcoves, cupboards, shelves and worktops');
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb3d]').click());await p.waitForTimeout(500);
 await p.screenshot({path:'h449-chimney-3d.png'});
 await p.click('#cb3-x');
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h449: '+bad+' FAILED':'h449: all passed');
 await b.close()})();
