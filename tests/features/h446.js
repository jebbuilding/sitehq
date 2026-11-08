// Door & window survey pictures: every ready-made design (windows, doors, bays, garage doors, roof windows) drawn as
// the small picture to pick from and as the PDF picture with sizes, in a few frame colours. Checks each one draws a
// frame you can see (a filled frame and sash, glass) and writes h446-<kind>.png to look at.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const ANCHOR='  return {\n    broch: () => BROCH,';
let page_src=fs.readFileSync(process.env.H446PAGE||'timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(ANCHOR).length===2,'test hook anchor found once');
page_src=page_src.replace(ANCHOR,`  window.__dwsAll=(kind,cols)=>PRE[kind].map((p,i)=>cols.map((col,ci)=>{const t=blank(kind);t.gap=0;t.cill=kind==="window"?t.cill:"No cill";applyPreset(t,kind,i);if(col)t.out=col;const vh=kind==="bay"?110:92;
    return {name:p[0],thumb:'<svg viewBox="0 0 120 '+vh+'" width="150">'+draw(t,120,vh,6,ci?{...PC}:CV,{dims:false,col:t.out})+'</svg>',big:ci===0?'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 '+(kind==="bay"?330:300)+'" width="300"><rect width="360" height="330" fill="#fff"/>'+draw(t,360,kind==="bay"?330:300,14,PC,{fs:12,col:t.out})+'</svg>':''};}));\n`+ANCHOR);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1400,height:900}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(1500);await p.keyboard.press('Escape');
 for(const kind of ['window','door','bay','garage','roof']){
  const rows=await p.evaluate((k)=>window.__dwsAll(k,['','Anthracite grey (RAL 7016)','Golden oak']),kind);
  ok(rows.length>0&&rows.every(r=>r.every(x=>x.thumb.length>200)),`${kind}: ${rows.length} designs draw`);
  const html=`<div style="font:12px Arial;background:#f3efea;padding:10px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px;width:1380px">${rows.slice(0,process.env.H446N?+process.env.H446N:999).map(r=>`<div style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:6px;display:flex;gap:6px;align-items:center"><div style="width:110px"><b>${r[0].name}</b></div>${r.map(x=>x.thumb).join('')}${r[0].big}</div>`).join('')}</div>`;
  const q=await ctx.newPage();await q.setContent('<!doctype html><html><head><meta charset=utf8><style>body{margin:0;--wsglass:#d9e7f0;--wsframe:#3b3532;--wsdim:#b42318;--wsaddon:#f1dcbf;--wssoft:#f7f4f1;--surface:#fff;--ink:#1d1a19}</style></head><body>'+html+'</body></html>');
  await (await q.$('body>div')).screenshot({path:`h446-${kind}.png`});await q.close();
 }
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h446: '+bad+' FAILED':'h446: all passed');
 await b.close()})();
