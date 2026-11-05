const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const extra='store["todos/c1"].portalUid="u9";store["sheets/owner/photos/dr1"]={kind:"sketch",assetId:"img1",title:"Kitchen layout",site:"4 Rolle Road, Exmouth",category:"Drawings & sketches",takenAt:1,date:"2026-11-04",mine:true,created:1};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>{const id="up"+Math.random().toString(36).slice(2);window.__blobs[id]=b;return {id,url:"",sizeBytes:b.size,contentType:b.type}},_x:async(b)=>(window.__last=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const img=fs.readFileSync('fixtures/ld1.png').toString('base64');
const page_src=fs.readFileSync('timesheets.html','utf8')
  .replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>{if(!window.__blobs[id]&&id==="img1"){const b=atob(window.__IMG);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);window.__blobs.img1=new Blob([u],{type:"image/png"})}return window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id};')
  .replace('function openPersonMonth(','window.openPersonMonth=openPersonMonth;function openPersonMonth(').replace('function render() {','window.render=render;function render() {').replace('function drawOpen(p) {','window.drawOpen=drawOpen;function drawOpen(p) {').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('async function ptSignPdf(','window.ptSignPdf=ptSignPdf;async function ptSignPdf(').replace('async function openFile(id, name, type) {','window.openFile=openFile;async function openFile(id, name, type) {');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:900,height:1000}});ctx.setDefaultTimeout(10000);const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 try{
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body><script>window.__IMG="'+img+'";</script>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2500);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__S.otab='samples';window.render()});await p.waitForTimeout(400);console.log('empty',await p.isVisible('.empty'));
 await p.click('#sm-setup');await p.waitForSelector('#ss-add');
 for(const [n,cat] of [['Oak worktop offcut','Worktops'],['Anthracite composite door','Doors'],['Sage shaker door','Kitchen doors']]){await p.click('#ss-add');await p.waitForSelector('#sx-name');await p.fill('#sx-name',n);await p.selectOption('#sx-cat',cat);if(n.startsWith('Oak'))await p.setInputFiles('#sx-pin','fixtures/ld1.png'),await p.waitForTimeout(1200);await p.evaluate(()=>document.getElementById('form').requestSubmit());await p.waitForTimeout(700)}
 console.log('in setup',await p.locator('.ss-ed').count());await p.keyboard.press('Escape');await p.waitForTimeout(300);await p.evaluate(()=>{const v=document.getElementById('viewer');if(v&&!v.hidden){const b=document.getElementById('viewer-close')||document.querySelector('#viewer .vclose');if(b)b.click()}});
 await p.evaluate(()=>{window.__S.otab='samples';window.render()});await p.waitForTimeout(400);console.log('rows',await p.locator('.smrow').count());
 await p.locator('.smrow').nth(0).click({position:{x:120,y:12}});await p.locator('.smrow').nth(1).click({position:{x:120,y:12}});console.log('checked',await p.locator('.sm-t:checked').count());console.log('bar',await p.isVisible('#sm-bar'),await p.innerText('#sm-n'));
 await p.click('#sm-out');await p.waitForSelector('#sb-cl');await p.selectOption('#sb-cl','c1');await p.evaluate(()=>document.getElementById('form').requestSubmit());await p.waitForTimeout(1200);
 console.log('out tags',await p.locator('.smrow.smout').count(),await p.locator('.smrow.smout .tag').first().innerText());
 await p.locator('.sm-one').first().click().catch(()=>{});await p.waitForTimeout(800);
 console.log('filters',await p.locator('#sm-f button').allInnerTexts());
 await p.evaluate(()=>{window.__S.otab='clients';window.__S.f.clf='all';window.__S.f.clq='';window.render()});await p.waitForTimeout(400);console.log('cl btns',await p.evaluate(()=>{const b=document.querySelector('.cl-open[data-c=c1]');const n=document.querySelectorAll('.cl-open').length;if(b)b.click();return n+' '+!!b}));await p.waitForTimeout(600);console.log('viewer',await p.evaluate(()=>!document.getElementById('viewer').hidden&&document.getElementById('viewer-body').innerText.slice(0,60)));
 console.log('client block',await p.evaluate(()=>{const f=[...document.querySelectorAll('.flabel')].find(x=>/Samples with/.test(x.textContent));return f&&f.textContent}),'| back-in btns',await p.locator('.cs-in').count());
 if(await p.locator('.cs-in').count()){await p.locator('.cs-in').first().click();await p.waitForTimeout(800)}
 console.log('log',await p.evaluate(()=>JSON.stringify(window.__S.samples.map(x=>x.name+':'+(x.out?'out':'in')+':'+(x.log||[]).map(l=>l.t).join('')))));
 }catch(e){console.log('FAIL',String(e.message).split('\n')[0])}
 await b.close()})();
