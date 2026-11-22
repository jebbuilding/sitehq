// Text boxes on a note page (made-up text): the Text tool opens a box with room for several lines – Enter makes a new
// line, Add puts it on the page – with Bold, Italic, Left / Centre / Right and a size; the text keeps its lines and
// look. Selected later, Properties lets you change the words (still several lines), Bold, Italic, the line-up and
// A− / A+ for its size.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('    doc.objs.push(o);\n    textAt = null;','    doc.objs.push(o);window.__npObjs=()=>doc.objs;window.__npSel=(i)=>{sel=i;draw();};\n    textAt = null;');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'port',pro:true})});await p.waitForTimeout(1200);
 const bb=await p.locator('.np-cv').boundingBox();
 await p.click('.np-t[data-t=text]');await p.mouse.click(bb.x+300,bb.y+300);await p.waitForTimeout(300);
 ok(await p.evaluate(()=>document.querySelector('.np-text .np-ttx').tagName)==='TEXTAREA','the text box has room for several lines');
 await p.locator('.np-text .np-ttx').click();
 await p.keyboard.type('Kitchen');await p.keyboard.press('Enter');await p.keyboard.type('Back wall');
 ok(await p.isVisible('.np-text'),'Enter makes a new line (the box stays open)');
 await p.click('.np-text .np-tst[data-k=b]');await p.click('.np-text .np-tst[data-k=al][data-v=c]');await p.selectOption('.np-text .np-tsz','1.5');
 await p.click('.np-text [type=submit]');await p.waitForTimeout(400);
 let o=await p.evaluate(()=>{const a=window.__npObjs();return a[a.length-1]});
 ok(o&&o.t==='text'&&o.s==='Kitchen\nBack wall','the text keeps its two lines');
 ok(o.wt===800&&o.al==='c'&&!o.it,'bold and centred');
 const size1=o.size;
 /* select it and change it in Properties */
 await p.evaluate(()=>window.__npSel(window.__npObjs().length-1));await p.waitForTimeout(300);
 await p.click('.np-sb[data-a=fine]');await p.waitForTimeout(400);
 ok(await p.isVisible('.nftxrow .nftx')&&await p.evaluate(()=>document.querySelector('.nftxrow .nftx').tagName)==='TEXTAREA','Properties shows the words in a box with room for several lines');
 ok(await p.getAttribute('.nftst[data-k=b]','aria-pressed')==='true'&&await p.getAttribute('.nftst[data-k=al][data-v=c]','aria-pressed')==='true','it shows Bold and Centre are on');
 await p.click('.nftst[data-k=i]');await p.click('.nftst[data-k=al][data-v=r]');await p.click('.nftst[data-k=sz][data-v="1.25"]');await p.waitForTimeout(300);
 o=await p.evaluate(()=>{const a=window.__npObjs();return a[a.length-1]});
 ok(o.it===true&&o.al==='r'&&o.size>size1,'Italic, Right and A+ change it ('+size1+' → '+o.size+')');
 await p.fill('.nftxrow .nftx','Kitchen\nBack wall\nRemove units');await p.click('.nftxrow [type=submit]');await p.waitForTimeout(300);
 o=await p.evaluate(()=>{const a=window.__npObjs();return a[a.length-1]});
 ok(o.s.split('\n').length===3,'the words can be changed, with a third line');
 await p.screenshot({path:'np-text.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h565: ${bad} failed`:'h565: all passed');await b.close();process.exit(bad?1:0);
})();
