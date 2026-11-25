// Colours and wooden doors on the door & window survey (made-up survey):
// uPVC – choosing Anthracite turns the drawing (and the design pictures) anthracite; Other RAL… opens the RAL chart and
// RAL 5024 Pastel blue is drawn in that blue. Wooden door – the timber list has every timber from Woods; with an oiled
// finish the drawing is the wood's colour (European oak), painted it's the paint colour; 📐 Timber sizes change the
// frame, stiles and bottom rail on the drawing, the cill is drawn to its height with horns; the PDF lists the sizes.
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
 const fills=(sel)=>p.evaluate((sel)=>[...new Set([...document.querySelectorAll(sel+' rect')].map(r=>(r.getAttribute('fill')||'').toLowerCase()))],sel);
 /* uPVC window */
 await p.selectOption('#wsx-c-out','Anthracite grey (RAL 7016)');await p.waitForTimeout(400);
 ok((await fills('#wsx-sk')).includes('#383e42')||(await fills('#wsx-sk')).includes('#3d4247'),'uPVC: Anthracite turns the drawing anthracite');
 ok((await fills('#wsx-gallery svg')).some(x=>x==='#383e42'||x==='#3d4247'),'and the design pictures too');
 await p.selectOption('#wsx-c-out','Other RAL…');await p.waitForTimeout(500);
 ok(await p.isVisible('.glc-box'),'Other RAL… opens the RAL chart');
 await p.fill('.glc-q','5024');await p.waitForTimeout(300);await p.click('.glc-sw');await p.waitForTimeout(500);
 const hex=await p.evaluate(()=>{const t=[...document.querySelectorAll('#wsx-sk rect')].map(r=>r.getAttribute('fill'));return t});
 ok(/RAL 5024/.test(await p.inputValue('#wsx-c-out'))&&hex.some(x=>/^#/.test(x||'')&&!['#f7f7f5','#c9ccd0','#3d4247'].includes(x.toLowerCase())),'RAL 5024 Pastel blue is chosen and drawn in that colour');
 await p.screenshot({path:'h698-ral.png'});
 /* a wooden door */
 await p.click('#wsx-kind [data-v=door]');await p.waitForTimeout(400);
 await p.selectOption('#wsx-o-mat',{label:'Timber (hardwood)'});await p.waitForTimeout(400);
 ok(await p.isVisible('#wsx-tim')&&await p.isVisible('#wsx-tdim'),'a wooden door has the timber options and 📐 Timber sizes');
 const woods=await p.$$eval('#wsx-t-tspec option',x=>x.map(o=>o.textContent));
 ok(woods.includes('European oak')&&woods.includes('American black walnut')&&woods.includes('Accoya (modified wood, long guarantee)'),'the timber list has the woods from 🪵 Woods ('+woods.length+')');
 await p.selectOption('#wsx-t-tspec','European oak');await p.selectOption('#wsx-t-tfin','Clear lacquer / oil');await p.waitForTimeout(400);
 ok((await fills('#wsx-sk')).includes('#c49a6c'),'oiled European oak: the drawing is oak coloured');
 await p.locator('#wsx-sk').screenshot({path:'h698-oak.png'});
 const wide=async()=>p.evaluate(()=>{const r=[...document.querySelectorAll('#wsx-sk rect')];return r.length});
 const before=await p.evaluate(()=>document.getElementById('wsx-sk').innerHTML);
 await p.fill('#wsx-td-fr','120');await p.fill('#wsx-td-br','300');await p.waitForTimeout(400);
 const after=await p.evaluate(()=>document.getElementById('wsx-sk').innerHTML);
 ok(before!==after,'changing the frame and bottom rail sizes changes the drawing');
 await p.selectOption('#wsx-m-cill',{index:2});await p.fill('#wsx-m-cillh','60');await p.fill('#wsx-td-hn','40');await p.waitForTimeout(400);
 await p.locator('#wsx-sk').screenshot({path:'h698-oak-sizes.png'});
 await p.selectOption('#wsx-t-tfin','Factory spray painted (microporous)');await p.selectOption('#wsx-c-out','Chartwell green');await p.waitForTimeout(400);
 ok(!(await fills('#wsx-sk')).includes('#c49a6c')&&(await fills('#wsx-sk')).includes('#b3c4b3'),'painted Chartwell green: the drawing is the paint colour');
 /* the PDF */
 await p.click('#wsx-pdf');await p.waitForTimeout(600);await p.click('[data-m=order]');await p.waitForTimeout(5000);
 const pdf=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];if(!d)return '';const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return s});
 ok(/frame 120/.test(pdf)&&/bottom rail 300/.test(pdf)&&/horns 40/.test(pdf),'the PDF lists the timber sizes');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h698: ${bad} failed`:'h698: all passed');await b.close();process.exit(bad?1:0);
})();
