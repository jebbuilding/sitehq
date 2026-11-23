// Waste transfer note emails (made-up people and addresses): Section B (the person the waste is collected from) has an Email box
// – filled from the client, or typed for someone else – not printed on the note. 📤 Send offers "✉️ Email <them>" with it,
// and a separate "📥 Send my copy to <the office address from Company details>"; sending my copy is noted on the note.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const HOOK='function render() {';
let page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split(HOOK).length===2,'render hook found once');
page_src=page_src.replace('const S = {\n  db: null','const S=window.__S={db:null').replace(HOOK,'window.render=render;window.__T=()=>({WTN});'+HOOK);
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1200}});ctx.setDefaultTimeout(8000);
 await ctx.route(/^https?:\/\//,r=>{if(r.request().url().includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});r.abort()});
 const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 try{
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 await p.evaluate(()=>{window.__mail=[];const o=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(/^mailto:/.test(this.href)){window.__mail.push(this.href);return}return o.call(this)}});
 await p.evaluate(()=>window.__T().WTN.open());await p.waitForTimeout(600);
 /* a client: the email comes from her record */
 await p.selectOption('#wt-B-cl','c1');await p.dispatchEvent('#wt-B-cl','change');await p.waitForTimeout(500);
 ok(await p.isVisible('#wt-B-email')&&await p.inputValue('#wt-B-email')==='sue@example.com','Section B has an Email box, filled from the client (sue@example.com)');
 /* someone else: typed */
 await p.click('[data-party=B][data-role=other]');await p.waitForTimeout(400);
 ok(await p.isVisible('#wt-B-email')&&await p.inputValue('#wt-B-email')==='','"Someone else" has an empty Email box to type in');
 await p.fill('#wt-B-name','Pat Builder');await p.fill('#wt-B-email','pat@example.com');await p.dispatchEvent('#wt-B-email','change');
 await p.click('#wt-save');await p.waitForTimeout(800);
 const rec=Object.values(await p.evaluate(()=>window.__st)).find(v=>v&&v.kind==='wtn');
 ok(rec&&rec.B&&rec.B.email==='pat@example.com','the email is saved on the note');
 await p.click('#wt-pdf');await p.waitForTimeout(3500);
 const pdf=await p.evaluate(async()=>{const d=(window.__dl||[]).slice(-1)[0];if(!d)return '';const b=new Uint8Array(await d.data.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return s});
 ok(pdf&&!/pat@example\.com/.test(pdf),'the email isn\'t printed on the note');
 await p.click('#pdfbar-x').catch(()=>{});await p.waitForTimeout(300);
 /* no office address yet */
 await p.click('#wt-send');await p.waitForTimeout(600);
 ok(await p.locator('[data-how=mail][data-to="pat@example.com"]:not([disabled])').count()===1,'📤 Send: ✉️ Email Pat Builder (pat@example.com)');
 ok(await p.locator('[data-how=mine]').count()===0&&/Send my copy of waste transfer notes to/.test(await p.innerText('.dimbox')),'with no office address yet, it says where to add one');
 await p.click('.wt-x');
 /* with the office address */
 await p.evaluate(async()=>{const S=window.__S;const company=Object.assign({},S.settings.company,{wtnCopyTo:'office@example.com'});await S.db.doc('settings/app').update({company});S.settings=Object.assign({},S.settings,{company});});
 await p.click('#wt-send');await p.waitForTimeout(600);
 ok(await p.isVisible('[data-how=mine]')&&/office@example\.com/.test(await p.innerText('[data-how=mine]')),'a separate 📥 Send my copy to office@example.com');
 await p.screenshot({path:'h662-send.png'});
 await p.click('[data-how=mine]');await p.waitForTimeout(600);
 const m=await p.evaluate(()=>window.__mail.slice(-1)[0]||'');
 ok(/^mailto:office%40example\.com/.test(m)&&/Pat%20Builder/.test(m),'it emails the office, with who it was collected from');
 const rec2=Object.values(await p.evaluate(()=>window.__st)).find(v=>v&&v.kind==='wtn');
 ok((rec2.sent||[]).some(x=>x.to==='office@example.com'&&x.how==='my copy'),'and notes that my copy was sent');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h662: ${bad} failed`:'h662: all passed');await b.close();process.exit(bad?1:0);
})();
