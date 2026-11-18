// The length bar, small and simple (made-up drawing): drawing a line shows it as a small tag first; tapped, just its
// length and angle (no number pad); – shrinks it to a small "📏 … mm · …°" tag that keeps up as the length is typed; tapping the tag brings it back.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={view:()=>[s,ox,oy]};\n  function eraseAt(p) {');
const SP='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:768},hasTouch:true});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 const scr=async(x,y)=>{const bb=await p.locator('.np-cv').boundingBox();const [s,ox,oy]=await p.evaluate(()=>window.__np.view());return [bb.x+ox+x*s,bb.y+oy+y*s];};
 await p.click('.np-gt[data-gt=draw]');await p.click('.np-t[data-t=line]');
 const A=await scr(200,500),B=await scr(420,500);await p.mouse.move(A[0],A[1]);await p.mouse.down();await p.mouse.move(B[0],B[1],{steps:6});await p.mouse.up();await p.waitForTimeout(300);
 ok(await p.isVisible('.nlb-sum')&&!(await p.isVisible('.nlb-l')),'it starts as a small tag');
 await p.click('.nlb-sum');await p.waitForTimeout(100);
 ok(await p.isVisible('.nlb-l')&&await p.isVisible('.nlb-a')&&!(await p.isVisible('.nlb-pad'))&&!(await p.isVisible('.nlb-dir')),'just the length and angle show');
 const bh=(await p.locator('.np-lenbar').boundingBox()).height;
 ok(bh<70,'the bar is one small row ('+Math.round(bh)+' px high)');
 await p.screenshot({path:SP+'lenbar-1.png',clip:await (async()=>{const r=await p.locator('.np-lenbar').boundingBox();return {x:Math.max(0,r.x-10),y:Math.max(0,r.y-10),width:r.width+20,height:r.height+20};})()});
 await p.click('.nlb-min');await p.waitForTimeout(150);
 ok(await p.isVisible('.nlb-sum')&&!(await p.isVisible('.nlb-l'))&&/📏 \d+ mm · \d+(\.\d+)?°/.test(await p.innerText('.nlb-sum')),'– makes it a small tag ('+await p.innerText('.nlb-sum')+')');
 const tw=(await p.locator('.np-lenbar').boundingBox()).width;
 ok(tw<220,'the tag is small ('+Math.round(tw)+' px wide)');
 await p.screenshot({path:SP+'lenbar-2.png',clip:await (async()=>{const r=await p.locator('.np-lenbar').boundingBox();return {x:Math.max(0,r.x-10),y:Math.max(0,r.y-10),width:r.width+20,height:r.height+20};})()});
 await p.click('.nlb-sum');await p.waitForTimeout(150);
 ok(await p.isVisible('.nlb-l'),'tapping the tag brings the length and angle back');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h584: ${bad} failed`:'h584: all passed');await b.close();process.exit(bad?1:0);
})();
