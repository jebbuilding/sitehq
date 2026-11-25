// Door side panels, corner posts, hinges and bi-folds (made-up survey): a door with a side panel on the left gets
// + Side panel right (glass over a 600mm panel) and + Corner post, right (a 90° frame with a side panel, a "Corner post
// 90°" add-on, the overall width grows by 400 each). The drawing shows the panel under the glass and the corner; the
// schedule lists the side panels. Opens out → hinges show; opens in → they don't (viewed from outside). A 3+2 bi-fold
// has alternating hinge marks and an arrow each way with "folds out to the left / right". Writes h696*.png.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog').catch(()=>{});
 await p.evaluate(()=>{window.__S.otab='jobs';window.render()});await p.waitForTimeout(400);await p.click('#ws-new');await p.waitForTimeout(600);
 await p.click('#wsx-kind [data-v=door]');await p.waitForTimeout(400);
 const pick=async(name)=>{await p.evaluate(()=>document.getElementById('wsx-gal').open=true);await p.waitForTimeout(200);await p.locator('#wsx-gallery button:visible').filter({hasText:name}).first().click();await p.waitForTimeout(400);};
 await pick('Door + side panel (left)');
 const sw0=+await p.inputValue('#wsx-m-sw');
 ok(await p.isVisible('[data-act=spaddr]')&&await p.isVisible('[data-act=cornr]')&&await p.locator('.ws-sp').count()===1,'a door has Side panels & corner posts, with its left side panel listed');
 await p.click('[data-act=spaddr]');await p.waitForTimeout(300);
 ok(await p.locator('.ws-sp').count()===2&&+await p.inputValue('#wsx-m-sw')===sw0+400,'+ Side panel right adds one, 400 wide, and the overall width grows by 400');
 await p.selectOption('[data-spk=fill][data-spc="2"]','Glass over panel');await p.waitForTimeout(300);
 ok(await p.isVisible('[data-spk=ph][data-spc="2"]')&&await p.inputValue('[data-spk=ph][data-spc="2"]')==='600','glass over panel asks the panel height (600 to start)');
 await p.fill('[data-spk=ph][data-spc="2"]','700');await p.selectOption('[data-spk=pst][data-spc="2"]','raised');await p.waitForTimeout(300);
 await p.click('[data-act=cornr]');await p.waitForTimeout(400);
 ok(await p.locator('.ws-sp').count()===3&&/round the right corner/i.test(await p.innerText('#wsx-dz')),'+ Corner post, right adds a side panel round the corner');
 const sk=await p.innerHTML('#wsx-sk');
 ok(/90°/.test(sk)&&/PLAN/.test(sk),'the drawing shows the 90° corner, with a plan');
 await p.click('#wsx-hand [data-v="Opens out"]');await p.waitForTimeout(300);
 const hingesOut=await p.evaluate(()=>[...document.querySelectorAll('#wsx-sk rect')].length);
 await p.locator('#wsx-sk').screenshot({path:'h696-door-out.png'});
 await p.click('#wsx-hand [data-v="Opens in"]');await p.waitForTimeout(300);
 const hingesIn=await p.evaluate(()=>[...document.querySelectorAll('#wsx-sk rect')].length);
 ok(hingesOut-hingesIn===3,'opens out shows the 3 hinges; opens in hides them (viewed from outside)');
 await p.locator('#wsx-sk').screenshot({path:'h696-door-in.png'});
 /* the order PDF */
 await p.click('#wsx-pdf');await p.waitForTimeout(600);await p.click('[data-m=order]');await p.waitForTimeout(5000);
 const pdf=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];if(!d)return '';const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return s});
 fs.writeFileSync('h696-survey.pdf',Buffer.from(pdf,'latin1'));
 ok(/glass over a raised panel 700mm/.test(pdf),'the PDF lists the side panel: glass over a raised panel 700mm high');
 ok(/Corner post/.test(pdf),'and the corner post');
 await p.click('#pdfbar-x').catch(()=>{});await p.waitForTimeout(300);
 /* take the corner off again */
 await p.locator('[data-act=spdel]').nth(2).click();await p.waitForTimeout(400);
 ok(await p.locator('.ws-sp').count()===2&&!/90°/.test(await p.innerHTML('#wsx-sk'))&&+await p.inputValue('#wsx-m-sw')===sw0+400,'✕ Take it off removes the corner and its width');
 /* a bi-fold */
 await pick('Bi-fold 5 (3+2)');
 await p.click('#wsx-hand [data-v="Opens out"]');await p.waitForTimeout(300);
 const bsk=await p.innerHTML('#wsx-sk');
 ok(/folds out to the left/.test(bsk)&&/folds out to the right/.test(bsk),'a 3+2 bi-fold: arrows each way, "folds out to the left / right"');
 const marks=await p.evaluate(()=>[...document.querySelectorAll('#wsx-sk path[stroke-dasharray="2 2"]')].map(x=>x.getAttribute('d')));
 ok(marks.length===5,'a hinge mark on each of the 5 leaves');
 await p.locator('#wsx-sk').screenshot({path:'h696-bifold.png'});
 const thumbs=await p.evaluate(()=>[...document.querySelectorAll('#wsx-gallery svg')].some(s=>/folds/.test(s.innerHTML)));
 ok(!thumbs,'the little design pictures don\'t have the words on');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h696: ${bad} failed`:'h696: all passed');await b.close();process.exit(bad?1:0);
})();
