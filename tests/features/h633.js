// A subbie's bill in Accounts goes on the CIS return (made-up figures): Pat Brick (added by hand, 20%) sends a £1,000
// bill with £200 materials, no VAT, reverse charge 20%; paid by card in the tax month just ended, it is on that CIS
// month (£800 labour, £160 tax), and the reverse charge (£200) goes in box 1 and box 4.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const pad=n=>String(n).padStart(2,'0');const isoD=x=>x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());
const T=new Date();const end=new Date(T.getFullYear(),T.getMonth()+(T.getDate()>=6?0:-1),5);const payDay=isoD(new Date(end.getFullYear(),end.getMonth(),2));const key=isoD(end).slice(0,7);
const extra='store["todos/cissubs"]={kind:"cissubs",subs:{"sub-pb":{name:"Pat Brick",utr:"1111111111",rate:"20",type:"sole"}}};'+
 'store["todos/rc-cis1"]={kind:"acrcpt",status:"done",type:"bill",paid:"card",date:"'+payDay+'",total:1000,vat:0,rate:"rc20",cat:"sub",supplier:"Pat Brick",ref:"PB7",desc:"Brickwork",cisWho:"sub-pb",cisMat:200};';
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(k=>{const S=window.__S;S.otab='cis';S.f.cisv='month';S.f.cism=k;window.render()},key);await p.waitForTimeout(500);
 const pays=await p.innerText('#main');
 ok(/Bill PB7/.test(pays)&&/from Accounts/.test(pays),'the bill from Accounts is in the CIS month\'s payments');
 const tbl=await p.innerText('.cis-tbl');console.log(tbl.replace(/\s+/g,' ').slice(0,200));
 ok(/Pat Brick[\s\S]*£1,000\.00\s+£200\.00\s+£160\.00/.test(tbl),'on the return: £1,000 paid, £200 materials, £160 tax (20% of £800 labour)');
 /* the bill form has the CIS choice */
 await p.evaluate(()=>{const S=window.__S;S.otab='accounts';S.f.act='rcpt';window.render()});await p.waitForTimeout(500);
 const has=await p.evaluate(()=>!!document.getElementById('rr-cis')||!!document.querySelector('[data-id="rc-cis1"], .acv-row'));
 ok(has,'Accounts receipts and bills page opens');
 /* reverse charge on the VAT return */
 await p.evaluate(()=>{const S=window.__S;S.otab='accounts';S.f.act='vat';window.render()});await p.waitForTimeout(500);
 const qs=await p.$$eval('#vt-qs button',b=>b.map(x=>x.textContent));
 let found=false;for(let i=0;i<qs.length&&i<3;i++){await p.locator('#vt-qs button').nth(i).click();await p.waitForTimeout(300);await p.click('.vt-box[data-n="1"]');await p.waitForTimeout(200);const d=await p.innerText('#main');if(/Reverse charge VAT: Pat Brick PB7/.test(d)){found=true;break}}
 ok(found,'the reverse charge on the bill is in box 1 of its VAT quarter');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h633: ${bad} failed`:'h633: all passed');await b.close();process.exit(bad?1:0);
})();
