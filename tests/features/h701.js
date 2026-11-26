// Tools register (made-up tools): ＋ Add a tool with a photo, an image receipt, make, model, serial number, what it cost
// and who has it and which van; a 240V tool asks for its PAT test, and one due soon is on Today. Group by who has it and
// by van; the machines from Tools & plant are in it too. Tick one group and make the PDF with the receipts – it has the
// serial numbers, values and the total. ⬇ CSV has every column. Marking the person as left lists the tools to get back;
// the van shows its tools. Writes h701*.png / .pdf.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+'store["equipment/m9"]={kind:"machine",name:"Stihl cut-off saw",tag:"T-009"};');
src=src.replace('upload:async(b)=>(window.__last=b,','upload:async(b)=>(window.__last=b,window.__blobs["up"+c]=b,');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
let page_src=fs.readFileSync('timesheets.html','utf8');
ok(page_src.includes('const S = {\n  db: null'),'test hooks found');
page_src=page_src.replace('const blobUrl = (id) => "/_blob/" + id;','const blobUrl=id=>window.__blobs[id]?URL.createObjectURL(window.__blobs[id]):"/_blob/"+id;').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({TLR,VNS,openLeaver});function render() {');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:430,height:900}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 await p.click('#nl-tog').catch(()=>{});await p.waitForTimeout(300);
 const jpg=async(col)=>Buffer.from((await p.evaluate((col)=>{const c=document.createElement('canvas');c.width=240;c.height=180;const g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,240,180);g.fillStyle='#000';g.fillRect(40,60,160,50);return c.toDataURL('image/jpeg',0.8)},col)).split(',')[1],'base64');
 const van=await p.evaluate(()=>(window.__S.equipment||[]).find(e=>e.kind==='vehicle'));
 ok(!!van,'there is a van to put tools on: '+(van&&van.name));
 /* from Setup */
 await p.evaluate(()=>{const S=window.__S;S.otab='setup';S.f.stab='';window.render()});await p.waitForTimeout(400);
 await p.click('#tlr-reg');await p.waitForTimeout(400);
 ok(/Tools register/.test(await p.innerText('#viewer'))&&/Stihl cut-off saw/.test(await p.innerText('#viewer')),'Setup › 🗃 Tools register opens, with the Tools & plant machine in it');
 const add=async(o)=>{
  await p.click('#tlr-add');await p.waitForTimeout(300);
  await p.fill('#tlr-name',o.name);await p.selectOption('#tlr-cat',o.cat);await p.waitForTimeout(200);
  await p.fill('#tlr-make',o.make);await p.fill('#tlr-model',o.model);await p.fill('#tlr-serial',o.serial);
  await p.fill('#tlr-bought','2026-03-14');await p.fill('#tlr-from','Example Tool Supplies');await p.fill('#tlr-paid',o.paid);
  ok(!!(await p.$('#tlr-pat'))===!!o.pat,o.pat?'a 240V tool asks for its PAT test':'a battery tool has no PAT test box');
  if(o.pat)await p.fill('#tlr-pat',o.pat);
  if(o.who)await p.selectOption('#tlr-who',o.who);if(o.van)await p.selectOption('#tlr-van',o.van);
  await p.setInputFiles('.tlr-pfile',{name:'tool.jpg',mimeType:'image/jpeg',buffer:await jpg('#c33')});await p.waitForTimeout(300);
  await p.setInputFiles('.tlr-rfile',{name:'receipt.jpg',mimeType:'image/jpeg',buffer:await jpg('#eee')});await p.waitForTimeout(300);
  if(o.shot)await p.screenshot({path:'h701-form.png',fullPage:true});
  await p.click('.tlr-form button[type=submit]');await p.waitForSelector('.tlr-form',{state:'detached'});await p.waitForTimeout(300);
 };
 await add({name:'Combi drill',cat:'battery',make:'Makita',model:'DHP486',serial:'MK-48612',paid:'249.99',who:'emp1',van:van.id,shot:true});
 const soon=new Date(Date.now()+5*864e5).toISOString().slice(0,10);
 await add({name:'Mitre saw',cat:'mains',make:'DeWalt',model:'DWS780',serial:'DW-78001',paid:'599',pat:soon,van:van.id});
 const recs=await p.evaluate(()=>Object.values(window.__st).filter(v=>v&&v.kind==='tool'));
 const d1=recs.find(r=>r.name==='Combi drill');
 ok(recs.length===2&&d1&&d1.serial==='MK-48612'&&d1.photos.length===1&&d1.receipts.length===1&&d1.who==='emp1'&&d1.van===van.id&&d1.log.length===1,'saved with photo, receipt, serial, who has it, van and a history line');
 ok((recs.find(r=>r.name==='Mitre saw')||{}).pat===soon,'the 240V saw keeps its PAT test date');
 const v=await p.innerText('#viewer');
 {const m=v.match(/(\d+) tools · worth £848\.99 to replace · (\d+) with no value yet/);
 ok(m&&+m[1]-+m[2]===2,'top line: '+(m?m[0]:v.slice(0,160)));}
 await p.screenshot({path:'h701-list.png',fullPage:true});
 await p.click('.tlr-g[data-g=van]');await p.waitForTimeout(300);
 const gh=await p.$$eval('.tlr-gh span',x=>x.map(e=>e.textContent));
 ok(gh.some(t=>t.includes(van.name)&&t.includes('(2)')&&t.includes('£848.99')),'By van: '+gh.join(' | '));
 /* tick the van's group and make the PDF with receipts */
 await p.click('.tlr-gsel >> nth=0');await p.waitForTimeout(300);
 ok(/PDF of 2 ticked/.test(await p.innerText('#tlr-pdf')),'ticking the group: PDF of 2 ticked');
 await p.click('#tlr-pdf');await p.waitForTimeout(300);
 ok(await p.isChecked('#tlr-wr'),'it offers the receipts');
 await p.click('#tlr-go');await p.waitForTimeout(3000);
 const dl=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];if(!d)return null;const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return {fn:d.filename,s}});
 ok(dl&&/Tools register/.test(dl.fn),'PDF saved: '+(dl&&dl.fn));
 if(dl){fs.writeFileSync('h701.pdf',Buffer.from(dl.s,'latin1'));
  const pages=(dl.s.match(/\/Type \/Page[^s]/g)||[]).length;
  ok(/MK-48612/.test(dl.s)&&/DW-78001/.test(dl.s)&&/848\.99/.test(dl.s)&&!/Stihl/.test(dl.s),'PDF has the serial numbers, the total, and only the ticked ones');
  ok(pages>=3&&(dl.s.match(/\/Subtype \/Image/g)||[]).length>=2,'photos in the list and the receipts after it ('+pages+' pages)');}
 /* CSV */
 await p.click('#tlr-csv');await p.waitForTimeout(500);
 const csv=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];return d?{fn:d.filename,t:typeof d.data==='string'?d.data:await d.data.text()}:null});
 ok(csv&&/Tools register\.csv/.test(csv.fn)&&/Serial number/.test(csv.t)&&/MK-48612/.test(csv.t)&&/249\.99/.test(csv.t),'⬇ CSV with serial numbers and prices');
 /* the machine from Tools & plant: add its value */
 await p.click('.tlr-g[data-g=cat]');await p.waitForTimeout(300);
 await p.click('.tlr-open:has-text("Stihl cut-off saw")');await p.waitForTimeout(300);
 ok(/book it out there/.test(await p.innerText('.tlr-form'))&&!(await p.$('#tlr-who')),'the Tools & plant saw says who has it comes from booking it out');
 await p.fill('#tlr-serial','ST-1234');await p.fill('#tlr-value','780');await p.click('.tlr-form button[type=submit]');await p.waitForTimeout(800);
 const st=await p.evaluate(()=>Object.values(window.__st).find(v=>v&&v.kind==='tool'&&v.eq==='m9'));
 ok(st&&st.value==='780'&&st.serial==='ST-1234'&&!('who' in st),'its value and serial are kept with it, linked to the machine');
 ok((await p.locator('.tlr-open:has-text("Stihl cut-off saw")').count())===1,'and it is still listed once');
 await p.evaluate(()=>window.__T().TLR.open({g:'who'}));await p.waitForTimeout(300);
 await p.click('.tlr-open:has-text("Combi drill")');await p.waitForTimeout(300);
 await p.click('.tlr-one');await p.waitForTimeout(300);await p.click('#tlr-go');await p.waitForTimeout(2000);
 ok(/Tool Combi drill/.test(await p.evaluate(()=>(window.__dl||[]).slice(-1)[0].filename)),'📄 PDF of this one');
 await p.click('.tlr-c');await p.waitForTimeout(200);
 /* ties */
 await p.evaluate(()=>{window.__S.otab='today';window.render()});await p.waitForTimeout(500);
 ok(/Tools to see to/.test(await p.innerText('#main'))&&/Mitre saw/.test(await p.innerText('.tlr-today'))&&/PAT test due/.test(await p.innerText('.tlr-today')),'Today: the mitre saw\'s PAT test is due');
 await p.evaluate((v)=>window.__T().VNS.open(v),van.id);await p.waitForTimeout(400);
 ok(/From the tools register \(2\)/i.test(await p.innerText('#viewer'))&&/Combi drill/.test(await p.innerText('#viewer')),'📦 What\'s on each van shows the van\'s register tools');
 await p.evaluate(()=>window.__T().openLeaver('emp1'));await p.waitForTimeout(400);
 ok(/Tools to get back \(1\)/.test(await p.innerText('#sheet'))&&/MK-48612/.test(await p.innerText('#sheet')),'marking them as left lists the tools to get back, with the serial number');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h701: ${bad} failed`:'h701: all passed');await b.close();process.exit(bad?1:0);
})();
