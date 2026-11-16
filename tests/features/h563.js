// Resizing a photo on a note page (iPad and desktop, made-up photo): after Add photo, dragging its bottom-right corner
// makes it smaller, so does dragging its top-left corner (the bottom-right stays put), on an iPad by finger too; and the
// ➖ Smaller / ➕ Bigger buttons in the selection bar make it a fifth smaller / a quarter bigger.
const fs=require('fs');const {chromium,devices}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .split('    toast("Drag to move, corner to resize");').join('    window.__np={o:()=>doc.objs[doc.objs.length-1],v:()=>({s,ox,oy,r:cv.getBoundingClientRect()})};toast("Drag to move, corner to resize");');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();
 for(const dev of ['desk','ipad']){
 const ctx=await b.newContext(dev==='ipad'?{...devices['iPad Pro 11']}:{viewport:{width:1180,height:820}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'port',pro:true})});await p.waitForTimeout(1200);
 await p.setInputFiles('.np-photo input','fixtures/test.jpg');await p.waitForTimeout(1500);
 const box=()=>p.evaluate(()=>{const o=window.__np.o();return {x:o.x,y:o.y,w:o.w,h:o.h}});
 const scr=async(cx,cy)=>p.evaluate(([cx,cy])=>{const o=window.__np.o(),v=window.__np.v();return [v.r.left+v.ox+(o.x+o.w*cx)*v.s,v.r.top+v.oy+(o.y+o.h*cy)*v.s]},[cx,cy]);
 const cdp=dev==='ipad'?await ctx.newCDPSession(p):null;
 const drag=async([x,y],dx,dy)=>{if(cdp){const t=(type,a,b2)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:a,y:b2}]});await t('touchStart',x,y);for(let i=1;i<=10;i++){await t('touchMove',x+dx*i/10,y+dy*i/10);await p.waitForTimeout(15);}await t('touchEnd');}else{await p.mouse.move(x,y);await p.mouse.down();for(let i=1;i<=10;i++)await p.mouse.move(x+dx*i/10,y+dy*i/10);await p.mouse.up();}await p.waitForTimeout(400);};
 const b0=await box();
 await drag(await scr(1,1),-120,-120);
 const b1=await box();
 ok(b1.w<b0.w-20&&Math.abs(b1.x-b0.x)<0.5&&Math.abs(b1.w/b1.h-b0.w/b0.h)<0.01,dev+': dragging the bottom-right corner makes it smaller, same shape ('+Math.round(b0.w)+' → '+Math.round(b1.w)+')');
 await drag(await scr(0,0),40,40);
 const b2=await box();
 ok(b2.w<b1.w-20&&Math.abs(b2.x+b2.w-(b1.x+b1.w))<0.5&&Math.abs(b2.y+b2.h-(b1.y+b1.h))<0.5,dev+': dragging the top-left corner makes it smaller, the opposite corner stays ('+Math.round(b1.w)+' → '+Math.round(b2.w)+')');
 ok(await p.isVisible('.np-sb[data-a=smaller]')&&await p.isVisible('.np-sb[data-a=bigger]'),dev+': a selected photo has ➖ Smaller and ➕ Bigger');
 await p.click('.np-sb[data-a=smaller]');await p.waitForTimeout(300);
 const b3=await box();ok(Math.abs(b3.w-b2.w*0.8)<0.5,dev+': Smaller makes it a fifth smaller');
 await p.click('.np-sb[data-a=bigger]');await p.waitForTimeout(300);
 const b4=await box();ok(Math.abs(b4.w-b3.w*1.25)<0.5,dev+': Bigger makes it a quarter bigger');
 if(dev==='ipad')await p.screenshot({path:'C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/np-resize.png'});
 }catch(e){console.log('FAIL',dev,e.message);bad++;}
 await ctx.close();}
 console.log(bad?`h563: ${bad} failed`:'h563: all passed');await b.close();process.exit(bad?1:0);
})();
