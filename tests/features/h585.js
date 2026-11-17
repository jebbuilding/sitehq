// Moving things fine or fast from how the finger moves (made-up drawing): a box dragged quickly 200 px moves the same
// as the finger; dragged slowly 200 px it moves much less (fine placing), no setting changed. And My forms opens on
// My timesheet, not wherever was used last (it had been opening on Chat).
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('function startPreview() {','window.startPreview=startPreview;function startPreview() {')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},view:()=>[s,ox,oy]};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* My forms opens on My timesheet even when Chat was the last trades' page */
 await p.evaluate(()=>{window.__S.tab='chat';window.startPreview();});await p.waitForTimeout(400);
 ok(await p.evaluate(()=>window.__S.tab)==='time','My forms opens on My timesheet');
 await p.evaluate(()=>{window.__S.preview=false;window.render();});await p.waitForTimeout(300);
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 const scr=async(x,y)=>{const bb=await p.locator('.np-cv').boundingBox();const [s,ox,oy]=await p.evaluate(()=>window.__np.view());return [bb.x+ox+x*s,bb.y+oy+y*s,s];};
 const box=()=>p.evaluate(()=>window.__np.set([{t:'rect',a:[300,300],b:[400,380],c:'#111',w:3}]));
 await p.click('.np-gt[data-gt=edit]');await p.click('.np-t[data-t=move]');
 /* quick: 200 px in 5 quick steps */
 await box();let [x,y,s]=await scr(350,340);await p.mouse.move(x,y);await p.mouse.down();for(let k=1;k<=5;k++){await p.mouse.move(x+k*40,y);await p.waitForTimeout(8);}await p.mouse.up();await p.waitForTimeout(200);
 let o=await p.evaluate(()=>window.__np.get()[0]);const fast=(o.a[0]-300)*s;
 ok(fast>170,'a quick drag keeps up with the finger ('+Math.round(fast)+' of 200 px)');
 /* slow: 200 px in 100 small steps, 30 ms apart */
 await box();[x,y,s]=await scr(350,340);await p.mouse.move(x,y);await p.mouse.down();for(let k=1;k<=100;k++){await p.mouse.move(x+k*2,y);await p.waitForTimeout(30);}await p.mouse.up();await p.waitForTimeout(200);
 o=await p.evaluate(()=>window.__np.get()[0]);const slow=(o.a[0]-300)*s;
 ok(slow>20&&slow<110,'a slow drag moves it much less, for fine placing ('+Math.round(slow)+' of 200 px)');
 ok(!(await p.evaluate(()=>document.querySelector('.nfslowc')&&document.querySelector('.nfslowc').checked)),'without 🐢 Slow drag turned on');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h585: ${bad} failed`:'h585: all passed');await b.close();process.exit(bad?1:0);
})();
