// Doors, survey windows, the wrap-up email and iPad pickers (made-up data). Sliding and bi-fold doors draw their
// panels / leaves (a bi-fold always an even number of leaves); a window on Sue Jones's job picks "W1" from her door &
// window survey in Properties and takes its mark, its frame width and how it opens (hinge right); the week wrap-up has
// ✉️ Email it to me, an email with the wrap-up written in; and no file picker anywhere is hidden (iPads won't open
// hidden ones), the client page's camera picker having its own name.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('const DWS = (() => {','const DWS = window.__DWS = (() => {').replace('function wuOpen() {','window.wuOpen=wuOpen;function wuOpen() {')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);a.forEach(seatOnWall);draw();},pick:(i)=>{sel=i;draw();fineOpen();},u:(mm)=>toUnits(mm),mm:(u)=>realMm(u)};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{
 /* no hidden file pickers in the page */
 const hiddenPickers=(page_src.match(/<input[^>]*type="file"[^>]*>/g)||[]).filter(t=>/\shidden[\s>]/.test(t));
 ok(!hiddenPickers.length,'no file picker is hidden ('+hiddenPickers.length+')');
 ok(/id="cl-cam"/.test(page_src)&&(page_src.match(/id="cm-cam"/g)||[]).length===1,'the client page\'s camera picker has its own name');
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* a survey for Sue Jones with W1, side hung, hinge right */
 const W1=await p.evaluate(()=>{const D=window.__DWS;const o=D._blank('window');o.ref='W1';o.name='Side hung, hinge right';o.loc='Kitchen';window.__S.winSurveys=[{id:'ws1',kind:'winsurvey',clientId:'c1',items:[o],updated:1}];return D.sizeOf(o).W;});
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true,site:'4 Rolle Road, Exmouth'})});await p.waitForTimeout(1200);
 await p.evaluate(()=>{const u=window.__np.u;const W=(a,b2)=>({t:'shape',k:'cavity',a,b:b2,c:'#111111',w:3,th:u(300)});const x0=150,y0=250,L=u(6000),D=u(3000);
  window.__np.set([W([x0,y0],[x0+L,y0]),W([x0+L,y0],[x0+L,y0+D]),W([x0+L,y0+D],[x0,y0+D]),W([x0,y0+D],[x0,y0]),{t:'shape',k:'window',a:[x0+u(1000),y0-u(150)],b:[x0+u(2000),y0+u(150)],c:'#111111',w:3},
  {t:'shape',k:'sdoor',a:[x0+u(500),y0+D],b:[x0+u(2900),y0+D],c:'#111111',w:3},{t:'shape',k:'bifold',a:[x0+u(3200),y0+D],b:[x0+u(5600),y0+D],c:'#111111',w:3}]);});
 const wi=await p.evaluate(()=>window.__np.get().findIndex(o=>o.k==='window'));
 await p.evaluate((i)=>window.__np.pick(i),wi);await p.waitForTimeout(300);
 ok(await p.isVisible('.nfsvrow'),'a window on Sue\'s job offers her survey\'s openings');
 await p.selectOption('.nfsv','W1');await p.waitForTimeout(300);
 const w=await p.evaluate((i)=>window.__np.get()[i],wi);
 const wmm=await p.evaluate((w)=>window.__np.mm(Math.max(Math.abs(w.b[0]-w.a[0]),Math.abs(w.b[1]-w.a[1]))),w);
 ok(w.mark==='W1'&&w.wo==='sr','it becomes W1, side hung, hinge right');
 ok(Math.abs(wmm-W1)<2,'its width is the survey\'s frame width ('+Math.round(wmm)+' / '+W1+' mm)');
 await p.click('.nfx');await p.waitForTimeout(200);
 /* the wrap-up email */
 await p.keyboard.press('Escape');
 await p.evaluate(()=>window.wuOpen());await p.waitForTimeout(400);
 const href=await p.getAttribute('#wu-mail','href');
 ok(/^mailto:/.test(href)&&/subject=Week%20wrap-up/.test(href)&&/body=.*Hours%20this%20week/.test(href),'✉️ Email it to me makes an email with the wrap-up in it');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h581: ${bad} failed`:'h581: all passed');await b.close();process.exit(bad?1:0);
})();
