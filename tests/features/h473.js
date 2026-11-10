// Sites › a site › 📸 Snag (made-up job at 4 Rolle Road): a photo, what's wrong in a few words, the trade picked from
// the words (an electrician for a socket), a pin on the site's drawing – it lands on that trade's snag list with the
// photo and where it is; more snags for the same trade join the same list; 🗺 Snags on drawings shows the pin.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const SITE='4 Rolle Road, Exmouth';
const extra='store["docs/dq1"]={site:"'+SITE+'",cat:"plans",title:"First floor plan",fileName:"ff.png",assetId:"img1",contentType:"image/png",size:2000,uploaded:1};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const img=fs.readFileSync('fixtures/ld1.png').toString('base64');
const page_src=fs.readFileSync('timesheets.html','utf8')
  .replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>{if(!window.__blobs[id]&&id==="img1"){const b=atob(window.__IMG);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);window.__blobs.img1=new Blob([u],{type:"image/png"})}return window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id};')
  .replace('function render() {','window.render=render;function render() {').replace('const S = {\n  db: null','const S=window.__S={db:null');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:1100}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body><script>window.__IMG="'+img+'";</script>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* Sam is the electrician */
 await p.evaluate(async()=>{const t=window.__S.team.emp1||{};await window.__S.db.doc('sheets/emp1').update({details:Object.assign({},t.details||{},{trade:'Electrician'})});});await p.waitForTimeout(300);
 await p.evaluate(s=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.__S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(600);
 ok(await p.locator('#sq-new').count()===1,'the site page has a Snag button');
 await p.click('#sq-new');await p.waitForTimeout(300);
 await p.setInputFiles('#sq-file','fixtures/ld1.png');await p.waitForTimeout(300);
 ok(await p.isVisible('#sq-prev'),'the photo shows');
 await p.fill('#sq-text','socket by the back door not working.');await p.waitForTimeout(200);
 ok(await p.getAttribute('.sq-p[data-v=emp1]','aria-pressed')==='true'&&/Picked/.test(await p.innerText('#sq-guess')),'the electrician is picked from the words');
 await p.selectOption('#sq-dwg','doc:dq1');await p.waitForTimeout(600);
 const box=await p.locator('#sq-dwgimg').boundingBox();
 ok(box&&box.width>20,'the drawing shows');
 await p.locator('#sq-dwgimg').click({position:{x:box.width*0.25,y:box.height*0.5}});await p.waitForTimeout(200);
 ok(await p.isVisible('#sq-dot'),'tapping the drawing drops a pin');
 await p.click('#f-save');await p.waitForTimeout(1200);
 const jobs=()=>p.evaluate(()=>Object.entries(window.__st).filter(([k,v])=>/^jobs\//.test(k)&&v.kind==='snag'&&v.site==='4 Rolle Road, Exmouth').map(([k,v])=>({k,assignees:v.assignees,tasks:v.tasks})));
 let J=await jobs();console.log(JSON.stringify(J).slice(0,400));
 const sam=J.find(j=>(j.assignees||[])[0]==='emp1');
 ok(sam&&sam.tasks.length===1&&sam.tasks[0].text==='Socket by the back door not working','the snag is written and goes on Sam’s snag list');
 ok(sam&&sam.tasks[0].refPhoto&&sam.tasks[0].pin&&sam.tasks[0].pin.dwg==='doc:dq1'&&Math.abs(sam.tasks[0].pin.x-0.25)<0.05,'with the photo and the pin on the drawing');
 /* a second electrical snag joins the same list; a tiling one with nobody picked goes on its own */
 await p.click('#sq-new');await p.waitForTimeout(300);await p.fill('#sq-text','Light switch in the hall is loose');await p.waitForTimeout(150);await p.click('#f-save');await p.waitForTimeout(1000);
 await p.click('#sq-new');await p.waitForTimeout(300);await p.fill('#sq-text','grout missing in the shower');await p.waitForTimeout(150);
 ok(await p.getAttribute('.sq-p[data-v=""]','aria-pressed')==='true','no tiler on the team, so nobody is picked');
 await p.click('#f-save');await p.waitForTimeout(1000);
 J=await jobs();
 ok(J.find(j=>(j.assignees||[])[0]==='emp1').tasks.length===2,'the second electrical snag joins Sam’s list');
 ok(J.some(j=>!(j.assignees||[]).length&&j.tasks.length===1&&/Grout missing/.test(j.tasks[0].text)),'the tiling snag is kept, not sent to anyone yet');
 /* the map */
 await p.evaluate(()=>{window.__S.f.pjtab='jobs';window.render()});await p.waitForTimeout(500);
 await p.click('#sq-map');await p.waitForTimeout(800);
 ok(await p.locator('.sq-num').count()===1&&/Socket by the back door/.test(await p.innerText('.sq-key')),'Snags on drawings shows the pinned snag as a numbered dot');
 await p.click('.sq-num');await p.waitForTimeout(500);
 const vt=await p.innerText('#viewer-body');
 ok(/On the drawing: First floor plan/.test(vt)&&/Show on the drawing/.test(vt),'its snag list says which drawing it is on');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h473: ${bad} failed`:'h473: all passed');await b.close();process.exit(bad?1:0);
})();
