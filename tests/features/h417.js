// Room sketch with every drawing tool: two rooms on the page (one measured, one not), then every tool and button in
// every group of the drawing tool is pressed and used on and around them, then PDF, DXF and Save. Any page error fails.
// (This is how the Select / snapping crashes with room sketches were found.)
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__blobs={};'+seed);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:850}});ctx.setDefaultTimeout(1500);const p=await ctx.newPage();
const errs=new Map();let where='';p.on('pageerror',e=>{const k=e.message+' @ '+(e.stack||'').split('\n')[1];if(!errs.has(k))errs.set(k,where);});p.on('dialog',d=>d.dismiss());
await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
await p.evaluate(()=>document.querySelector('.tab[data-t=draw]').click());await p.waitForTimeout(300);await p.click('#dw-new');await p.waitForTimeout(800);
const box=await (await p.$('.np .np-cv')).boundingBox();const X=x=>box.x+x,Y=y=>box.y+y;
const drawRoom=async(x0,y0)=>{await p.evaluate(()=>document.querySelector('.np .np-t[data-t=roomsk]').click());const pts=[[x0,y0],[x0+240,y0+2],[x0+238,y0+160],[x0+2,y0+158],[x0,y0+2]];await p.mouse.move(X(pts[0][0]),Y(pts[0][1]));await p.mouse.down();for(let k=1;k<pts.length;k++)for(let i=1;i<=10;i++){const t=i/10;await p.mouse.move(X(pts[k-1][0]+(pts[k][0]-pts[k-1][0])*t),Y(pts[k-1][1]+(pts[k][1]-pts[k-1][1])*t));}await p.mouse.up();await p.waitForTimeout(200);};
await drawRoom(300,200);
/* a second room, fully measured, so both states are on the page */
await drawRoom(650,200);
for(const [x,y,l] of [[770,201,'4000'],[889,280,'3000'],[770,359,'4000'],[651,280,'3000']]){await p.mouse.click(X(x),Y(y));await p.waitForTimeout(150);if(!(await p.isHidden('#sheet'))){await p.fill('#rs-len',l);await p.evaluate(()=>document.getElementById('f-save').click());await p.waitForTimeout(120);}}
const groups=await p.$$eval('.np .np-gt',x=>x.map(b=>b.dataset.gt));
const destructive=/start again|cancel|delete|clear/i;
for(const g of groups){
  where='group '+g;await p.evaluate(g=>document.querySelector(`.np .np-gt[data-gt="${g}"]`).click(),g);await p.waitForTimeout(100);
  const btns=await p.$$eval('.np .np-bar .np-t, .np .np-bar button',x=>x.filter(b=>b.offsetParent).map((b,i)=>({i,t:b.dataset.t||'',txt:b.textContent.trim().slice(0,30)})));
  for(const bt of btns){ if(destructive.test(bt.txt))continue;
    where=g+' › '+bt.txt;
    await p.evaluate(i=>{const v=[...document.querySelectorAll('.np .np-bar .np-t, .np .np-bar button')].filter(b=>b.offsetParent);v[i]&&v[i].click();},bt.i).catch(()=>{});
    await p.waitForTimeout(120);
    /* tap and drag on a room wall, inside a room and on empty paper */
    for(const [x,y] of [[420,201],[420,280],[300,330],[770,201],[150,500]]){await p.mouse.move(X(x),Y(y));await p.mouse.down();await p.mouse.move(X(x+25),Y(y+18));await p.mouse.up();await p.waitForTimeout(40);}
    /* close anything that opened */
    await p.evaluate(()=>{document.querySelectorAll('.np .dimask').forEach(d=>d.remove());const c=document.getElementById('f-cancel');if(c&&!document.getElementById('sheet').hidden)c.click();});
    await p.keyboard.press('Escape');
  }
}
where='PDF';await p.evaluate(()=>document.querySelector('.np .np-pdf').click());await p.waitForTimeout(2500);
where='DXF';await p.evaluate(()=>{const d=document.querySelector('.np .np-dxf');d&&d.click()});await p.waitForTimeout(800);
where='Save';await p.evaluate(()=>document.querySelector('.np .np-save').click());await p.waitForTimeout(1500);
console.log('groups tried: '+groups.join(', '));for(const [k,v] of errs)console.log('❌ '+v+' | '+k);if(!errs.size)console.log('✅ no page errors');console.log(errs.size?'h417: '+errs.size+' FAILED':'h417: all passed');
await b.close();})();
