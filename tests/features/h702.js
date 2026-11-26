// Tools register, the trades' side and the tax year (made-up trade Sam, made-up tools). James gives Sam a combi drill and
// an SDS drill in the register; Sam's copy of his tools arrives on his sheet. On Sam's Today (new look) "🧰 Your tools (2)"
// lists them with ✓ Got it / ✗ Not got it; he says he hasn't got the SDS and sends it. James's register shows when Sam
// confirmed and flags the SDS, and Today says "Sam … says they haven't got it". 🧾 Bought this tax year: a tool bought
// this tax year is in this year's list (PDF and CSV of what was paid), one bought before 6 April is in last year's.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const mk=(extra)=>{let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
 eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));return fake;};
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;window.__T=()=>({TLR});function render() {').replace('function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}','function detailsDone(d){return true}');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
const J=(o)=>JSON.stringify(o).replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${');
async function open(b,extra,owner){const f=mk(extra);const html='<!doctype html><html><head><meta charset=utf8></head><body>'+f(!!owner)+page_src+'</body></html>';
 const ctx=await b.newContext({viewport:{width:390,height:844}});ctx.setDefaultTimeout(8000);
 await ctx.addInitScript(()=>{try{localStorage.setItem('jeb.tradelook','true');localStorage.setItem('jeb.instLater','true')}catch(e){}});
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.startsWith('https://sitehq.test/'))return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html});if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.goto('https://sitehq.test/');await p.waitForTimeout(2200);await p.keyboard.press('Escape');await p.waitForTimeout(300);
 return p;}
(async()=>{const b=await chromium.launch();
 try{
 const ty=(()=>{const d=new Date();const y=d.getMonth()>3||(d.getMonth()===3&&d.getDate()>=6)?d.getFullYear():d.getFullYear()-1;return y;})();
 const tools='store["todos/tl-a"]={kind:"tool",name:"Combi drill",cat:"battery",make:"Makita",model:"DHP486",serial:"MK-1",who:"emp1",paid:"249.99",bought:"'+ty+'-05-02",from:"Example Tools",photos:[],receipts:[]};'
  +'store["todos/tl-b"]={kind:"tool",name:"SDS drill",cat:"v110",make:"Hilti",model:"TE 30",serial:"HI-2",who:"emp1",paid:"420",bought:"'+ty+'-04-01",photos:[],receipts:[]};';
 const own=await open(b,tools,true);
 await own.evaluate(()=>window.__T().TLR.syncNow());await own.waitForTimeout(400);
 const held=await own.evaluate(()=>window.__st['sheets/emp1/signoffs/tools-held']);
 ok(held&&held.type==='toolsheld'&&held.items.length===2&&held.items.some(x=>x.serial==='HI-2'),'Sam\'s copy of his 2 tools is on his sheet');
 /* Sam */
 const tr=await open(b,'store["sheets/emp1/signoffs/tools-held"]='+J(held)+';',false);
 await tr.evaluate(()=>{window.__S.tab='home';window.render()});await tr.waitForTimeout(400);
 const card=await tr.innerText('#tlr-tcard').catch(()=>'');
 ok(/Your tools \(2\)/.test(card)&&/HI-2/.test(card)&&/Got it/.test(card),'Sam\'s Today: 🧰 Your tools (2) with Got it / Not got it');
 await tr.screenshot({path:'h702-trade.png',fullPage:true});
 await tr.click('#tlr-tcard .tlr-yn button[data-k=tl-b][data-v=no]');
 await tr.click('#tlr-tok');await tr.waitForTimeout(800);
 const okd=await tr.evaluate(()=>window.__st['sheets/emp1/signoffs/tools-ok']);
 ok(okd&&okd.stamp===held.stamp&&JSON.stringify(okd.missing)==='["tl-b"]','sent: everything there except the SDS drill');
 ok(/checked/.test(await tr.innerText('#main'))&&!(await tr.$('#tlr-tok')),'his card now says checked, folded away');
 /* James */
 await own.evaluate(async(d)=>{await window.__S.db.doc('sheets/emp1/signoffs/tools-ok').set(d)},okd);await own.waitForTimeout(600);
 await own.evaluate(()=>window.__T().TLR.open({g:'who'}));await own.waitForTimeout(400);
 const v=await own.innerText('#viewer');
 ok(/✓ confirmed/.test(v)&&/1 not got/.test(v)&&/hasn't got it/.test(v),'register: Sam ✓ confirmed, 1 not got, the SDS flagged');
 await own.evaluate(()=>{window.__S.otab='today';window.render()});await own.waitForTimeout(500);
 ok(/says they haven't got it/.test(await own.innerText('.tlr-today').catch(()=>'')),'James\'s Today: the SDS drill – Sam says they haven\'t got it');
 /* tax year */
 await own.evaluate(()=>window.__T().TLR.open());await own.waitForTimeout(300);
 await own.click('#tlr-tax');await own.waitForTimeout(300);
 const rows=await own.$$eval('.tlr-ty',x=>x.map(e=>e.innerText));
 ok(/1 tool · £249\.99 paid/.test(rows[0]||'')&&/1 tool · £420\.00 paid/.test(rows[1]||''),'tax years: '+rows.map(r=>r.split('\n')[0]+' '+r.split('\n')[1]).join(' | '));
 await own.click('.tlr-tyc >> nth=0');await own.waitForTimeout(400);
 const csv=await own.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];return d?{fn:d.filename,t:typeof d.data==='string'?d.data:await d.data.text()}:null});
 ok(csv&&/tax year\.csv$/.test(csv.fn)&&/Combi drill/.test(csv.t)&&!/SDS drill/.test(csv.t),'CSV for this tax year: '+(csv&&csv.fn));
 await own.click('.tlr-typ >> nth=0');await own.waitForTimeout(300);
 ok(/For your accountant/.test(await own.innerText('.dimbox')),'the PDF is for the accountant');
 await own.click('#tlr-go');await own.waitForTimeout(2500);
 const dl=await own.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return {fn:d.filename,s}});
 fs.writeFileSync('h702.pdf',Buffer.from(dl.s,'latin1'));
 ok(/tax year\.pdf$/.test(dl.fn)&&/Total paid/.test(dl.s)&&/MK-1/.test(dl.s)&&!/HI-2/.test(dl.s),'PDF: '+dl.fn+' with the total paid');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h702: ${bad} failed`:'h702: all passed');await b.close();process.exit(bad?1:0);
})();
