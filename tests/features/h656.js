// Tip runs for the new waste rules (made-up firm numbers, tip and van): Sam starts a 🚛 tip run from Reports – job, van,
// two wastes (plasterboard flagged not hazardous; asbestos shows HAZARDOUS), about how much, the tip from Setup. Saving shows
// "For the transfer station" with everything the site records for digital waste tracking: carrier number and tier,
// vehicle, producer and job, EWC codes, hazardous or not, the site's permit. ✅ Tipped adds the weighbridge weight, the
// ticket photo and the waste tracking ID. James sees it in 🚛 Tip runs, downloads the year's spreadsheet, and Today warns
// that the waste carrier permit is needed (registration renewing in 2 months, no permit yet).
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const HOOK='function render() {';
const DD='function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2,'render hook found once');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace(DD,'function detailsDone(d){return true}').replace(HOOK,'window.render=render;window.__T=()=>({TIPRUN,WTN,closeViewer});'+HOOK);
const exp=(()=>{const d=new Date(Date.now()+60*864e5);return d.toISOString().slice(0,10)})();
const extra='store["todos/wtn-t1"]={kind:"wtn",v:2,ref:"WTN-261101-01",created:1,updated:1,A:{lines:[{desc:"Plasterboard",code:"17 08 02"}],cont:{Skip:true},qty:""},B:{role:"us",clientId:"",company:"JEB Building Services",is:{}},C:{role:"site",company:"Anytown Waste Ltd",is:{}},D:{date:"'+new Date().toISOString().slice(0,10)+'",siteId:"ws1",addr:"",broker:{}},sigs:{},sent:[]};';
const SET=async(p)=>{await p.evaluate(async e=>{const S=window.__S;const company=Object.assign({},(S.settings||{}).company||{},{wasteCarrier:"CBDU999999",wasteTier:"Upper tier",wasteExpiry:e});const wasteSites=[{id:"ws1",name:"Town tip",company:"Anytown Waste Ltd",addr:"Unit 4, Business Park",postcode:"AB1 2CD",permitNo:"EPR/AB1234CD"}];await S.db.doc("settings/app").update({company,wasteSites});S.settings=Object.assign({},S.settings,{company,wasteSites});},exp);await p.waitForTimeout(300);};
function mk(owner,dump){let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra+(dump?'Object.assign(store,'+dump+');':''));eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return global.fake(owner);}
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:1100}});ctx.setDefaultTimeout(8000);await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const open=async(owner,dump)=>{const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+mk(owner,dump)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');await SET(p);return p;};
 try{
 /* Sam */
 const t=await open(false);
 await t.evaluate(()=>{const S=window.__S;S.tab='checks';S.f.rcat='';window.render()});await t.waitForTimeout(400);
 ok(await t.isVisible('#rep-tip'),'Reports has 🚛 Tip runs');
 await t.click('#rep-tip');await t.waitForTimeout(400);
 await t.click('#tpr-new');await t.waitForTimeout(400);
 await t.selectOption('#tpr-site','4 Rolle Road, Exmouth');await t.fill('#tpr-veh','wk21 jeb');
 await t.selectOption('.tpr-code[data-i="0"]','17 08 02');await t.fill('.tpr-est[data-i="0"]','0.8');
 await t.click('#tpr-addl');await t.waitForTimeout(200);
 await t.selectOption('.tpr-code[data-i="1"]','17 06 05*');await t.waitForTimeout(200);
 ok(/HAZARDOUS/.test(await t.innerText('#tpr-lines')),'asbestos shows HAZARDOUS');
 await t.selectOption('.tpr-code[data-i="1"]','__other');await t.waitForTimeout(200);
 ok(await t.isVisible('.tpr-oc[data-i="1"]')&&await t.isVisible('.tpr-od[data-i="1"]'),'"Other code" lets you type the code and what it is');
 await t.fill('.tpr-oc[data-i="1"]','17 06 03*');await t.fill('.tpr-od[data-i="1"]','Other insulation (hazardous)');
 await t.selectOption('#tpr-to','ws1');await t.selectOption('#tpr-site','4 Rolle Road, Exmouth');await t.fill('#tpr-veh','wk21 jeb');
 await t.click('#f-save');await t.waitForTimeout(1200);
 let st0=await t.evaluate(()=>window.__st);
 let r0=Object.entries(st0).find(([k,v])=>/^sheets\/emp1\/signoffs\//.test(k)&&v.type==='tiprun');
 ok(r0&&r0[1].lines.length===2&&r0[1].lines[1].code==='17 06 03*'&&r0[1].lines[1].desc==='Other insulation (hazardous)'&&r0[1].lines[1].haz===true,'two wastes saved, the typed code too (hazardous, from the *)');
 ok(r0&&r0[1].sic==='41202','the producer\'s SIC code is on it');
 const g0=await t.innerText('#viewer-body');
 ok(/41202/.test(g0)&&/17 06 03\*/.test(g0),'and on the gate screen, with the typed code');
 await t.evaluate(k=>{delete window.__st[k];window.__T().closeViewer()},r0[0]);
 await t.evaluate(()=>{const S=window.__S;S.tab='checks';S.f.rcat='';window.render()});await t.waitForTimeout(300);
 await t.click('#rep-tip');await t.waitForTimeout(300);await t.click('#tpr-new');await t.waitForTimeout(300);
 await t.selectOption('#tpr-site','4 Rolle Road, Exmouth');await t.fill('#tpr-veh','wk21 jeb');
 await t.selectOption('.tpr-code[data-i="0"]','17 08 02');await t.fill('.tpr-est[data-i="0"]','0.8');await t.click('#tpr-addl');await t.waitForTimeout(200);
 await t.click('.tpr-rm[data-i="1"]');await t.waitForTimeout(200);
 await t.click('#f-save');await t.waitForTimeout(300);
 ok(/where it's going/.test(await t.innerText('#f-err')),'it asks where it\'s going');
 await t.selectOption('#tpr-to','ws1');
 await t.screenshot({path:'h656-new.png',fullPage:true});
 await t.click('#f-save');await t.waitForTimeout(1200);
 const g=await t.innerText('#viewer-body').catch(()=>'');
 ok(/For the transfer station/.test(g),'saving shows "For the transfer station"');
 ok(/CBDU999999/.test(g)&&/Upper tier/.test(g),'with the carrier number and tier');
 ok(/WK21 JEB/.test(g)&&/Sam Test/.test(g),'the vehicle (in capitals) and the driver');
 ok(/17 08 02/.test(g)&&/Plasterboard/i.test(g)&&/Not hazardous/.test(g)&&/about 0.8 t/.test(g),'the waste code, what it is, not hazardous, about 0.8 t');
 ok(/4 Rolle Road/.test(g)&&/EPR\/AB1234CD/.test(g),'the job it came from and the site\'s permit');
 await t.screenshot({path:'h656-gate.png'});
 let st=await t.evaluate(()=>window.__st);
 let rec=Object.entries(st).find(([k,v])=>/^sheets\/emp1\/signoffs\//.test(k)&&v.type==='tiprun');
 ok(rec&&rec[1].status==='onway'&&rec[1].lines[0].code==='17 08 02'&&rec[1].toPermit==='EPR/AB1234CD','saved on Sam\'s phone record as on its way');
 await t.click('#tpr-done');await t.waitForTimeout(400);
 await t.click('#f-save');await t.waitForTimeout(300);
 ok(/weight or a photo/.test(await t.innerText('#f-err')),'Tipped needs the weight or the ticket');
 await t.fill('#tpr-wt','0.74');await t.fill('#tpr-wtid','WTID-0001-TEST');await t.setInputFiles('#tpr-tkin','fixtures/test.jpg');
 await t.click('#f-save');await t.waitForTimeout(2500);
 st=await t.evaluate(()=>window.__st);
 rec=Object.entries(st).find(([k,v])=>/^sheets\/emp1\/signoffs\//.test(k)&&v.type==='tiprun');
 ok(rec&&rec[1].status==='tipped'&&rec[1].weight==='0.74'&&rec[1].actual===true&&rec[1].wtid==='WTID-0001-TEST'&&!!rec[1].ticket,'tipped: 0.74 t from the weighbridge, the ticket photo and the tracking ID');
 /* the PDF */
 await t.evaluate(r=>window.__T().TIPRUN.gate(Object.assign({id:r[0].split('/').pop(),who:'emp1'},r[1])),rec);await t.waitForTimeout(400);
 await t.click('#tpr-pdf');await t.waitForTimeout(3000);
 const pdf=await t.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];if(!d)return null;const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return [d.filename,btoa(s)]});
 ok(pdf&&/^Waste movement TR-\d{6}-\w{4} 4 Rolle Road Exmouth\.pdf$/.test(pdf[0]),'📄 PDF: '+(pdf&&pdf[0]));
 if(pdf)fs.writeFileSync('h656-movement.pdf',Buffer.from(pdf[1],'base64'));
 ok(!!pdf&&Buffer.from(pdf[1],'base64').length>5000,'the PDF is made ('+(pdf?Buffer.from(pdf[1],'base64').length:0)+' bytes; look at h656-movement.pdf)');
 /* James */
 const p=await open(true,JSON.stringify({[rec[0]]:rec[1]}));
 await p.evaluate(()=>{const S=window.__S;S.otab='today';window.render()});await p.waitForTimeout(400);
 ok(await p.isVisible('#tpr-permit')&&/permit needed by/.test(await p.innerText('#tpr-permit')),'Today: the waste carrier permit is needed by the renewal date');
 await p.evaluate(()=>window.__T().TIPRUN.view());await p.waitForTimeout(400);
 const lt=await p.innerText('#viewer-body');
 ok(/4 Rolle Road/.test(lt)&&/WK21 JEB/.test(lt)&&/0.74 t/.test(lt)&&/WTID-0001-TEST/.test(lt),'🚛 Tip runs lists Sam\'s load: job, van, weight, tracking ID');
 await p.click('#tpr-csv');await p.waitForTimeout(600);
 const csv=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];return d?[d.filename,await d.data.text()]:null});
 ok(csv&&/^Tip runs \d{4}\.csv$/.test(csv[0])&&/17 08 02/.test(csv[1])&&/WK21 JEB/.test(csv[1])&&/WTID-0001-TEST/.test(csv[1])&&/Weighbridge/.test(csv[1]),'⬇ Spreadsheet: the year\'s loads with codes, van, weight and tracking ID');
 await p.evaluate(()=>{const S=window.__S;S.settings.company.wastePermit='EPR/XY9999ZZ';S.otab='today';window.render()});await p.waitForTimeout(400);
 ok(!(await p.isVisible('#tpr-permit')),'once the permit number is in, the warning goes');
 /* the waste transfer note */
 await p.evaluate(()=>window.__T().TIPRUN.edit(null,{}));await p.waitForTimeout(400);
 await p.selectOption('#tpr-site','4 Rolle Road, Exmouth');await p.dispatchEvent('#tpr-site','change');await p.selectOption('#tpr-to','ws1');await p.dispatchEvent('#tpr-to','change');await p.waitForTimeout(200);
 ok(await p.inputValue('#tpr-wtn')==='wtn-t1','James\'s tip run suggests the transfer note for that tip (WTN-261101-01)');
 await p.fill('#tpr-veh','AB21 CDE');await p.click('#f-save');await p.waitForTimeout(1200);
 ok(/WTN-261101-01/.test(await p.innerText('#viewer-body')),'the gate screen shows the note it\'s under');
 ok(/EX8 2AB/.test(await p.innerText('#viewer-body')),'and the producer postcode (from the client)');
 await p.evaluate(()=>{const T=window.__T();T.WTN.open(T.WTN.recs().find(n=>n.id==='wtn-t1'))});await p.waitForTimeout(600);
 const wt=await p.innerText('body');
 ok(/Tip runs under this note \(1\)/.test(wt)&&/AB21 CDE/.test(wt),'the transfer note lists its tip run');
 ok(await p.isVisible('#tpr-fromwtn'),'and has 🚛 Start a tip run under this note');
 await p.click('#tpr-fromwtn');await p.waitForTimeout(500);
 ok(await p.inputValue('#tpr-wtn')==='wtn-t1'&&await p.inputValue('#tpr-to')==='ws1'&&await p.inputValue('.tpr-code[data-i="0"]')==='17 08 02','starting one from the note fills in the note, the tip and the waste');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h656: ${bad} failed`:'h656: all passed');await b.close();process.exit(bad?1:0);
})();
