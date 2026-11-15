// A client's property – services and access (made-up client Sue Jones): the client form has 🏠 Property – services and
// access after Keys & alarm with stop cock, water meter, gas, fuse boards (single or three phase, + Add another fuse
// board), electric meter, boiler, water tank, parking, skip/grab/materials, hazards and other notes; saved, they are on
// the client record and on Sue's page.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
if(page_src.split('function openClientForm(c, mode) {').length!==2)throw new Error('openClientForm');
page_src=page_src.replace('function openClientForm(c, mode) {','window.openClientForm=openClientForm;function openClientForm(c, mode) {').replace('function viewClient(c) {','window.viewClient=viewClient;function viewClient(c) {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const OUT='C:/Users/User/AppData/Local/Temp/claude/0ed65cd00fdfb1af/120f37e9-4146-4eb8-8b83-81c031ff52be/scratchpad/';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:1300},deviceScaleFactor:2});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{const c=(window.__S.clients||[]).find(x=>x.id==='c1');window.openClientForm(c)});await p.waitForTimeout(500);
 const sheet=await p.innerText('#sheet');
 ok(/Property – services and access/.test(sheet)&&sheet.indexOf('Keys & alarm')<sheet.indexOf('Property – services'),'the client form has 🏠 Property – services and access after Keys & alarm');
 for(const [k,v] of [['stopcock','Under the kitchen sink'],['waterMeter','Pavement, front left'],['gas','Meter box on the side wall'],['elecMeter','Under the stairs'],['boiler','Combi in the loft'],['tank','None'],['parking','Drive for one van'],['skip','Front drive, left side'],['hazards','Steep drive'],['notes','Ring before arriving']])await p.fill('#pr-'+k,v);
 await p.fill('.pr-bwhere','Garage');await p.selectOption('.pr-bphase','Three phase');
 await p.click('#pr-badd');await p.waitForTimeout(200);
 ok(await p.locator('.pr-board').count()===2,'+ Add another fuse board adds a second');
 await p.locator('.pr-bwhere').nth(1).fill('Annexe');
 await (await p.$('#sheet')).screenshot({path:OUT+'prop-form.png'});
 await p.click('#f-save');await p.waitForTimeout(1200);
 const pr=await p.evaluate(()=>(window.__st['todos/c1']||{}).prop||{});
 ok(pr.stopcock==='Under the kitchen sink'&&pr.skip==='Front drive, left side'&&pr.hazards==='Steep drive','saved on the client record');
 ok(JSON.stringify(pr.boards)===JSON.stringify([{where:'Garage',phase:'Three phase'},{where:'Annexe',phase:'Single phase'}]),'with both fuse boards and their type');
 await p.evaluate(()=>{document.getElementById('sheet').hidden=true;window.viewClient(Object.assign({id:'c1'},window.__st['todos/c1']))});await p.waitForTimeout(600);
 const v=await p.innerText('.pr-card');
 ok(/Water stop cock/.test(v)&&/Fuse board 1/.test(v)&&/Garage · Three phase/.test(v)&&/Steep drive/.test(v),'and shown on Sue\'s page');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h549: ${bad} failed`:'h549: all passed');await b.close();process.exit(bad?1:0);
})();
