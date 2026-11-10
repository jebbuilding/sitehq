// Sites › Plans & drawings › 🔍 Compare two drawings (made-up drawings): rev A has a rectangle wall outline and a door
// line; rev B has the same outline, the door line gone and a new wall added. Compared, the new wall shows green, the
// door line red, and the outline stays grey; the changes picture can be saved.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const SITE='4 Rolle Road, Exmouth';
const extra='store["docs/dca"]={site:"'+SITE+'",cat:"plans",title:"Ground floor rev A",fileName:"a.png",assetId:"imgA",contentType:"image/png",size:2000,uploaded:1};'+
 'store["docs/dcb"]={site:"'+SITE+'",cat:"plans",title:"Ground floor rev B",fileName:"b.png",assetId:"imgB",contentType:"image/png",size:2000,uploaded:2};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8')
  .replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;')
  .replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(10000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* the two drawings, drawn in the page */
 await p.evaluate(async()=>{const mk=async(f)=>{const c=document.createElement('canvas');c.width=600;c.height=400;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,600,400);x.strokeStyle='#000';x.lineWidth=6;x.strokeRect(50,50,500,300);f(x);return await new Promise(r=>c.toBlob(r,'image/png'))};
  window.__blobs.imgA=await mk(x=>{x.beginPath();x.moveTo(100,200);x.lineTo(250,200);x.stroke();});
  window.__blobs.imgB=await mk(x=>{x.beginPath();x.moveTo(400,60);x.lineTo(400,340);x.stroke();});});
 await p.evaluate(s=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.__S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(500);await p.click('.pjtile[data-t=plans]');await p.waitForTimeout(500);
 ok(await p.isVisible('#dcm-open'),'Plans & drawings has a Compare button');
 await p.click('#dcm-open');await p.waitForTimeout(300);
 await p.selectOption('#dcm-a',{label:'Ground floor rev A'});await p.selectOption('#dcm-b',{label:'Ground floor rev B'});
 await p.click('#f-save');await p.waitForTimeout(3000);
 ok(await p.isVisible('#dcm-diff'),'the changes picture shows');
 const px=await p.evaluate(async()=>{const im=document.getElementById('dcm-diff');await im.decode();const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext('2d');x.drawImage(im,0,0);const k=c.width/600;const at=(X,Y)=>Array.from(x.getImageData(Math.round(X*k),Math.round(Y*k),1,1).data).slice(0,3);return {wallNew:at(400,200),doorGone:at(175,200),outline:at(50,200),blank:at(300,120)}});
 console.log(JSON.stringify(px));
 const green=(c)=>c[1]>120&&c[0]<80,red=(c)=>c[0]>180&&c[1]<80,grey=(c)=>c[0]<120&&Math.abs(c[0]-c[1])<10,white=(c)=>c[0]>240&&c[1]>240;
 ok(green(px.wallNew),'the new wall is green');
 ok(red(px.doorGone),'the line that has gone is red');
 ok(grey(px.outline),'the outline in both stays grey');
 ok(white(px.blank),'empty paper stays white');
 await p.click('#dcm-mode button[data-v=fade]');await p.waitForTimeout(200);
 ok(await p.isVisible('#dcm-sl'),'a slider fades between the two');
 await p.click('#dcm-save');await p.waitForTimeout(800);
 ok(await p.evaluate(()=>(window.__dl||[]).some(x=>/^Changes – Ground floor rev A to Ground floor rev B\.png$/.test(x.filename))),'the changes picture can be saved');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h487: ${bad} failed`:'h487: all passed');await b.close();process.exit(bad?1:0);
})();
