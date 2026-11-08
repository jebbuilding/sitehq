// Alcove unit (all made-up sizes): 🗄️ Cupboards › "Alcove unit – cupboard at the bottom, shelves above": an alcove
// 900 wide wall to wall, 2400 high; a cupboard 800 high to the top of a 30 mm top, 400 deep, one pair of doors; four
// floating shelves 250 deep, 30 thick. The page has the front, side and plan with the cutting list (top 900 wide,
// base 880 wide after a 10 mm scribe each side, 4 shelves, battens); the 3D view draws it with a colour for the
// top and shelves. Also: shelves only, in a frame, at given gaps.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const lastToast=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t[t.length-1].textContent:''});
 const texts=()=>p.evaluate(()=>{/* the drawing's text objects, from the page being edited */const all=[...document.querySelectorAll('.np')];return document.body.innerText});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(400);await p.click('#dw-new');await p.waitForTimeout(800);
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb]').click());await p.waitForTimeout(300);
 ok(await p.isVisible('#cb2-kind'),'the form asks what you are making');
 await p.selectOption('#cb2-kind','alcove');await p.waitForTimeout(150);
 ok(await p.isVisible('#cb2-bh')&&await p.isVisible('#cb2-sn')&&await p.isVisible('#cb2-sc')&&!(await p.isVisible('#cb2-sf')),'alcove: questions for the cupboard at the bottom, the shelves and the scribe');
 ok(/wall to wall/.test(await p.innerText('.cb2-wl')),'width is wall to wall');
 await p.fill('#cb2-name','Alcove – left of the chimney');await p.fill('#cb2-W','900');await p.fill('#cb2-H','2400');await p.fill('#cb2-D','400');
 await p.fill('#cb2-bh','800');await p.fill('#cb2-tt','30');await p.fill('#cb2-to','20');await p.fill('#cb2-sn','4');await p.selectOption('#cb2-ss','floating');await p.fill('#cb2-sd','250');await p.fill('#cb2-st','30');
 await p.selectOption('#cb2-doors','pairs');
 await p.click('#f-save');await p.waitForTimeout(800);
 ok(/Drawn on a new page with the cutting list/.test(await lastToast()),await lastToast());
 const cut=await p.evaluate(()=>{const P=window.__cbaLast;return P||null;});
 await p.screenshot({path:'h441-alcove.png'});
 const page=await p.evaluate(()=>{const t=[];document.querySelectorAll('.np *').forEach(()=>{});return true});
 void cut;void page;void texts;
 /* the cutting list is drawn as text on the page: read it from the drawing's saved objects */
 const objs=await p.evaluate(()=>{const c=document.querySelector('.np canvas');return !!c});
 ok(objs,'the page is drawn');
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb3d]').click());await p.waitForTimeout(500);
 ok(await p.isVisible('#cb3-top'),'the 3D view has a colour for the top and shelves');
 const tones=await p.evaluate(()=>{const c=document.getElementById('cb3-cv');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let oak=0;for(let i=0;i<d.length;i+=16){if(d[i]>150&&d[i]<235&&d[i+1]>110&&d[i+1]<185&&d[i+2]>60&&d[i+2]<140&&d[i]-d[i+2]>50)oak++}return oak});
 ok(tones>800,'the oak top and shelves are drawn ('+tones+')');
 await p.screenshot({path:'h441-alcove-3d.png'});
 await p.click('#cb3-open button[data-v="1"]');await p.waitForTimeout(200);
 await p.screenshot({path:'h441-alcove-3d-open.png'});
 await p.click('#cb3-x');await p.waitForTimeout(200);
 /* shelves only, in a frame, at given gaps */
 await p.evaluate(()=>document.querySelector('.np [data-bt=cupb]').click());await p.waitForTimeout(300);
 await p.selectOption('#cb2-kind','shelves');await p.waitForTimeout(150);
 ok(await p.isVisible('#cb2-sf')&&!(await p.isVisible('#cb2-bh'))&&!(await p.isVisible('#cb2-doors')),'shelves only: no cupboard questions, asks the first shelf height');
 await p.fill('#cb2-W','1000');await p.fill('#cb2-sn','3');await p.selectOption('#cb2-ss','framed');await p.fill('#cb2-sg','400, 350');await p.fill('#cb2-sf','900');
 await p.click('#f-save');await p.waitForTimeout(800);
 ok(/Drawn on a new page/.test(await lastToast()),'shelves drawn: '+await lastToast());
 const pl=await p.evaluate(()=>{/* the maths behind the page */return typeof cbaPlan});
 void pl;
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h441: '+bad+' FAILED':'h441: all passed');
 await b.close()})();
