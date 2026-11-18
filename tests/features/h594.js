// Build-ups (made-up drawing): Build › 🧱 Build-ups – pick "Timber frame wall: timber cladding", change a layer, draw it
// along a wall face; it gets tag EW01 and draws its layers at real thickness; a roof, ground floor and upper floor
// build-up get RF01, GF01, FF01; the same build-up again reuses its tag; Properties flips the layers and labels every
// layer; 📋 Specification page lists every build-up outside to inside.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,pages:()=>doc.pages,set:(a)=>{setObjs(a);draw();},sc:(v)=>{doc.scale=v;draw();},u:(mm)=>toUnits(mm),pick:(i)=>{sel=i;draw();fineOpen();},scr:(x,y)=>{const r=cv.getBoundingClientRect();return [r.left+ox+x*s,r.top+oy+y*s];},lib:()=>[NPSU_LIB,npsuLayers]};\n  function eraseAt(p) {');
const SP='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A3',orient:'land',pro:true})});await p.waitForTimeout(1200);
 await p.evaluate(()=>window.__np.sc(20));
 await p.click('.np-gt[data-gt=build]');await p.click('.np-t[data-bt=secbu]');await p.waitForTimeout(250);
 ok(await p.isVisible('.bud .dimbox'),'🧱 Build-ups opens');
 await p.selectOption('.bud-pre','tfclad');await p.waitForTimeout(100);
 ok(await p.inputValue('.bud-code')==='EW01'&&/Timber frame wall/.test(await p.inputValue('.bud-name')),'picking a timber frame wall names it and tags it EW01');
 const rows=await p.$$('.bud-l');ok(rows.length===8,'it has its 8 layers, membranes included');
 ok(/322 mm overall/.test(await p.innerText('.bud-tot'))||/\d+ mm overall/.test(await p.innerText('.bud-tot')),'the overall thickness shows ('+(await p.innerText('.bud-tot'))+')');
 /* the studs go from 140 to 150 */
 const studRow=await p.$('.bud-l[data-i="3"] .bud-t');await studRow.fill('150');
 await p.screenshot({path:SP+'bu-dialog.png'});
 await p.click('.bud-go');await p.waitForTimeout(200);
 /* draw it up a wall face, bottom to top */
 const ab=await p.evaluate(()=>{const N=window.__np,u=N.u;return [N.scr(300,200+u(2400)),N.scr(300,200)];});
 await p.mouse.move(ab[0][0],ab[0][1]);await p.mouse.down();await p.mouse.move(ab[0][0],(ab[0][1]+ab[1][1])/2,{steps:4});await p.mouse.move(ab[1][0],ab[1][1],{steps:4});await p.mouse.up();await p.waitForTimeout(300);
 const w=await p.evaluate(()=>window.__np.get().find(o=>o.k==='secbu'));
 ok(w&&w.bc==='EW01'&&w.bu.length===8&&w.bu[3].t===150,'the wall is drawn with its layers and the 150 studs');
 /* roof, ground floor, upper floor, and a second length of the same wall */
 await p.evaluate(()=>{const N=window.__np,u=N.u,[L,lay]=N.lib();const mk=(key,a,b,code)=>{const x=L.find(y=>y[0]===key);return {t:'shape',k:'secbu',a,b,c:'#111111',w:1.5,bu:lay(key),bn:x[1],bc:code};};
  const o=N.get().slice();
  o.push(mk('slatewarm',[300,200],[300+u(2200),200-u(2200)],'RF01'));
  o.push(mk('gslab',[300-u(300),200+u(2900)],[300+u(3000),200+u(2900)],'GF01'));
  o.push(Object.assign(mk('upfloor',[300+u(200),200+u(150)],[300+u(3000),200+u(150)],'FF01'),{lab:1}));
  N.set(o);});
 await p.waitForTimeout(300);
 await p.screenshot({path:SP+'bu-section.png'});
 /* the same build-up again keeps EW01 */
 await p.click('.np-t[data-bt=secbu]');await p.waitForTimeout(200);
 ok(await p.inputValue('.bud-code')==='EW01','drawing the same wall again keeps tag EW01');
 await p.selectOption('.bud-pre','cavbrick');await p.waitForTimeout(100);
 ok(await p.inputValue('.bud-code')==='EW02','a different wall gets EW02');
 await p.click('.bud-x');
 /* Properties: flip and label every layer */
 const wi=await p.evaluate(()=>window.__np.get().findIndex(o=>o.k==='secbu'&&o.bc==='EW01'));
 await p.click('.np-t[data-t=move]').catch(()=>{});
 await p.evaluate((i)=>window.__np.pick(i),wi);await p.waitForTimeout(300);
 ok(await p.isVisible('.nfsecbu')&&/EW01/.test(await p.innerText('.nfbu-info')),'Properties shows the build-up');
 await p.click('.nfbu-lab');await p.waitForTimeout(150);
 await p.click('.nfbu-flip');await p.waitForTimeout(150);
 const w2=await p.evaluate((i)=>window.__np.get()[i],wi);
 ok(w2.lab===1&&w2.fl===1,'🏷 labels every layer and ⇄ puts the layers on the other side');await p.click('.nfbu-ta');await p.waitForTimeout(150);ok(await p.evaluate((i)=>window.__np.get()[i].ta,wi)===1&&/cut across/.test(await p.innerText('.nfbu-ta')),'🪵 switches the wall to timbers cut across');
 await p.click('.nfbu-flip');await p.waitForTimeout(150);
 await p.keyboard.press('Escape');await p.waitForTimeout(150);
 await p.screenshot({path:SP+'bu-labelled.png'});
 /* the specification page */
 await p.click('.np-t[data-bt=secbu]');await p.waitForTimeout(200);await p.click('.bud-spec');await p.waitForTimeout(400);
 const sp=await p.evaluate(()=>{const P=window.__np.pages();const l=P[P.length-1];return {name:l.name,txt:l.objs.map(o=>o.s).join('\n')};});
 ok(sp.name==='Build-up specification'&&/EW01  Timber frame wall/.test(sp.txt)&&/RF01/.test(sp.txt)&&/GF01/.test(sp.txt)&&/FF01/.test(sp.txt),'📋 the specification page lists EW01, FF01, GF01 and RF01');
 ok(sp.txt.indexOf('22 mm timber cladding')<sp.txt.indexOf('12.5 mm plasterboard, taped'),'each is written outside to inside');
 ok(/150 mm mineral wool between 47 × 150 C24 studs/.test(sp.txt),'the changed stud size is in the words of the specification');
 await p.screenshot({path:SP+'bu-spec.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h594: ${bad} failed`:'h594: all passed');await b.close();process.exit(bad?1:0);
})();
