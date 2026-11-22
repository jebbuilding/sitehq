// Rubber on the line between two boxes (made-up drawing): a big box with a small box on its side; rubbing the line
// in the middle takes out just that line – the rest of both outlines stays, joined into one room (grouped lines);
// rubbing a line nobody shares still rubs the whole thing out; two Room shapes side by side become one room.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('async function openNotePage(','window.openNotePage=openNotePage;async function openNotePage(')
 .replace('  function eraseAt(p) {','  window.__np={get:()=>doc.objs,set:(a)=>{setObjs(a);draw();},view:()=>[s,ox,oy]};\n  function eraseAt(p) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1180,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.openNotePage({title:'',size:'A4',orient:'land',pro:true})});await p.waitForTimeout(1200);
 const at=async(x,y)=>{const bb=await p.locator('.np-cv').boundingBox();const [s,ox,oy]=await p.evaluate(()=>window.__np.view());return [bb.x+ox+x*s,bb.y+oy+y*s];};
 const rub=async(x,y)=>{await p.click('.np-t[data-t=erase]');const [cx,cy]=await at(x,y);await p.mouse.click(cx,cy);await p.waitForTimeout(300);};
 await p.evaluate(()=>window.__np.set([{t:'rect',a:[100,100],b:[400,300],c:'#111',w:3},{t:'rect',a:[400,150],b:[500,250],c:'#111',w:3},{t:'rect',a:[600,100],b:[700,200],c:'#111',w:3}]));
 await rub(400,200);
 let o=await p.evaluate(()=>window.__np.get());
 const lines=o.filter(x=>x.t==='line');
 ok(lines.length===8&&o.filter(x=>x.t==='rect').length===1,'the two boxes become one outline of 8 lines (the third box is left alone)');
 const onMid=lines.some(l=>l.a[0]===400&&l.b[0]===400&&Math.min(l.a[1],l.b[1])<240&&Math.max(l.a[1],l.b[1])>160);
 ok(!onMid,'the line in the middle is gone');
 ok(lines.filter(l=>l.a[0]===400&&l.b[0]===400).length===2,'the big box keeps its side above and below the small box');
 ok(lines.every(l=>l.gid&&l.gid===lines[0].gid),'the outline is grouped so it moves as one');
 /* a line nobody shares: the whole box goes, as before */
 await rub(700,150);
 o=await p.evaluate(()=>window.__np.get());
 ok(!o.some(x=>x.t==='rect'),'rubbing a box nobody joins still rubs out the whole box');
 /* two rooms side by side → one room, area added up */
 await p.evaluate(()=>window.__np.set([{t:'room',p:[[100,100],[300,100],[300,300],[100,300]],name:'Kitchen',c:'#2f5fb3',w:2},{t:'room',p:[[300,100],[450,100],[450,300],[300,300]],name:'Utility',c:'#2f5fb3',w:2}]));
 await rub(300,200);
 o=await p.evaluate(()=>window.__np.get());
 ok(o.length===1&&o[0].t==='room'&&o[0].p.length===4&&o[0].name==='Kitchen','two rooms become one room ('+(o[0]&&o[0].name)+', '+(o[0]&&o[0].p.length)+' corners)');
 await p.evaluate(()=>window.__np.set([{t:'rect',a:[100,100],b:[400,300],c:'#111',w:3},{t:'rect',a:[400,150],b:[500,250],c:'#111',w:3}]));
 await rub(400,200);await p.mouse.move(10,10);
 await p.screenshot({path:'np-join.png'});
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h566: ${bad} failed`:'h566: all passed');await b.close();process.exit(bad?1:0);
})();
