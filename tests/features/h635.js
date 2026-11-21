// Paying a CIS subbie from the bank (made-up figures): a CIS trade's £1,000 invoice (£200 materials, 20%) is paid as
// £840 – the £1,000 less £160 CIS tax. The £840 bank payment is matched to the invoice and sorted as Subcontractors.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const pad=n=>String(n).padStart(2,'0');const isoD=x=>x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());
const D=isoD(new Date(Date.now()-3*864e5));const M=D.slice(0,7);
const extra='store["todos/atx-a1-'+M+'"]={kind:"acctx",acc:"a1",month:"'+M+'",tx:[{id:"t9",date:"'+D+'",desc:"Payment to subbie",amt:-840}]};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.includes('function cisPayAfter(')&&page_src.includes('async function atpMatchBank('),'test hooks found');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {').replace('function cisPayAfter(','window.cisPayAfter=cisPayAfter;function cisPayAfter(').replace('async function atpMatchBank(','window.atpMatchBank=atpMatchBank;async function atpMatchBank(');
(async()=>{const b=await chromium.launch();
 try{
 const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2200);await p.keyboard.press('Escape');
 const w=await p.evaluate(async d=>{const S=window.__S;const w=Object.keys(S.team||{})[0];const det=Object.assign({},(S.team[w]||{}).details||{},{empType:'cis',utr:'1234567890'});await S.db.doc('sheets/'+w).update({details:det});await S.db.doc('sheets/'+w+'/invoices/ci1').set({number:'C-1',amount:1000,mat:200,vat:0,cis:true,status:'paid',paidOn:d,paidAt:Date.now(),sentAt:Date.now(),fileName:'x.pdf',contentType:'application/pdf'});return w},D);
 await p.waitForTimeout(800);
 ok(await p.evaluate(w=>window.cisPayAfter(w,1000,0,200),w)===840,'a £1,000 invoice with £200 materials is paid as £840 after 20% CIS tax');
 const n=await p.evaluate(()=>window.atpMatchBank());
 const t=await p.evaluate(m=>(window.__st['todos/atx-a1-'+m].tx||[]).find(x=>x.id==='t9'),M);
 ok(n===1&&t&&t.link&&t.link.t==='trade'&&t.link.id==='ci1'&&t.cat==='subs','the £840 bank payment is matched to that invoice and sorted as Subcontractors');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h635: ${bad} failed`:'h635: all passed');await b.close();process.exit(bad?1:0);
})();
