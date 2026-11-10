// No signal on site (made-up): James books the Kubota out and writes a diary note at 4 Rolle Road with the phone
// offline – both are kept on the phone ("2 items waiting to send") and go in by themselves when the signal comes back.
// Then the tidy-up: Accounts' page lists VAT return, Cash flow etc. as their own rows; search finds pages ("vat",
// "mot") and the digger by name; and saving "what clients see" puts a copy in each client's own portal record.
const fs=require('fs');const {chromium}=require('playwright');
let src0=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
const SITE='4 Rolle Road, Exmouth';
const extra='store["todos/c1"]&&(store["todos/c1"].portalUid="u9");store["portal/u9"]={name:"Test Client"};';
let src=src0.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed+extra);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let page_src=fs.readFileSync('timesheets.html','utf8').replace('const S = {\n  db: null','const S=window.__S={db:null').replace('function render() {','window.render=render;function render() {');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
ok(page_src.split('function searchOpen(q0) {').length===2,'search hook found');
page_src=page_src.replace('function searchOpen(q0) {','window.__so=(q)=>searchOpen(q);function searchOpen(q0) {');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1000}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* search finds the page and the digger */
 await p.evaluate(()=>window.__so('sticker'));await p.waitForTimeout(300);
 let t=await p.innerText('#sr-list');ok(/Pages/.test(t)&&/Tools & plant/.test(t),'search "sticker" finds Tools & plant');
 await p.fill('#sr-q','Kubota');await p.waitForTimeout(200);t=await p.innerText('#sr-list');
 ok(/Vehicles, plant & tools/.test(t)&&/Kubota KX057/.test(t),'search finds the digger by name');
 await p.fill('#sr-q','mot');await p.waitForTimeout(200);t=await p.innerText('#sr-list');ok(/Vehicles & plant/.test(t),'search "mot" finds Vehicles & plant');
 await p.fill('#sr-q','sticker');await p.waitForTimeout(200);
 /* no signal */
 await ctx.setOffline(true);await p.waitForTimeout(200);
 await p.locator('.sr-row:has-text("Tools & plant")').click();await p.waitForTimeout(400);
 await p.locator('.kit-row:has-text("Kubota") .kit-out').click();await p.waitForTimeout(300);
 await p.selectOption('#kit-site',SITE);await p.click('#f-save');await p.waitForTimeout(600);
 ok(!(await p.evaluate(()=>window.__st['equipment/e2'].out)),'with no signal the booking isn\'t sent yet');
 ok(/kept on this phone/.test(await p.innerText('body')),'it says it\'s kept on the phone');
 console.log(JSON.stringify(await p.evaluate(()=>window.__S.equipment.map(e=>[e.id,e.out]))));const vb=await p.innerText("#viewer-body");console.log(vb.slice(0,300).replace(/\n+/g," | "));ok(/4 Rolle Road/.test(vb),'the list shows it out at 4 Rolle Road already');
 await p.evaluate(()=>{document.querySelector('.viewer-x, #viewer-close, .vclose')&&document.querySelector('.viewer-x, #viewer-close, .vclose').click()});
 await p.evaluate(s=>{window.__S.otab='projects';window.__S.f.proj=s;window.__S.f.projList=false;window.__S.f.pjtab='overview';window.render()},SITE);await p.waitForTimeout(500);
 await p.click('.pjtile[data-t=diary]');await p.waitForTimeout(400);
 await p.fill('#sdi-note','Test note: no signal on site today.');await p.click('#sdi-save');await p.waitForTimeout(600);
 ok(!(await p.evaluate(()=>Object.keys(window.__st).some(k=>/^todos\/sdi-/.test(k)))),'the diary note isn\'t sent yet either');
 await p.evaluate(()=>window.render());await p.waitForTimeout(300);
 const m=await p.innerText('#main');
 ok(/2 items waiting to send/.test(m)&&/Booked out: Kubota/.test(m)&&/Diary note/.test(m),'James sees 2 items waiting to send, named');
 /* signal back */
 await ctx.setOffline(false);await p.waitForTimeout(1500);
 const o=await p.evaluate(()=>window.__st['equipment/e2'].out);
 ok(o&&o.site===SITE,'with signal back the booking goes in');
 const dn=await p.evaluate(()=>Object.entries(window.__st).filter(([k])=>/^todos\/sdi-/.test(k)).map(([k,v])=>v.note));
 ok(dn.length===1&&/no signal/.test(dn[0]),'and the diary note');
 ok(!/waiting to send/.test(await p.innerText('#main')),'nothing left waiting');
 /* the Accounts page lists the pages inside it */
 await p.evaluate(()=>{window.__S.otab='sec-money';window.render()});await p.waitForTimeout(300);
 ok(await p.locator('.nl-sub[data-s=acc-vat]').count()===1&&await p.locator('.nl-sub[data-s=acc-cf]').count()===1,'Accounts lists VAT return and Cash flow');
 await p.click('.nl-sub[data-s=acc-vat]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>window.__S.otab==='accounts'&&window.__S.f.act==='vat'),'VAT return opens');
 /* what clients see: a copy in the client's portal record */
 await p.evaluate(()=>{window.__S.otab='setup';window.__S.f.stab='portal';window.render()});await p.waitForTimeout(400);
 const box=p.locator('.pv-on[data-k=photos][data-w=""]');ok(await box.count()===1,'the portal access list shows');
 await box.uncheck();await p.click('#pv-save');await p.waitForTimeout(600);
 const acc=await p.evaluate(()=>window.__st['portal/u9'].access);console.log(JSON.stringify(acc));
 ok(acc&&acc.photos===false&&acc.story===true,'the client\'s portal record has a copy: photos off, the rest on');
 }catch(e){console.log('FAIL',e.message);bad++;}
 console.log(bad?`h496: ${bad} failed`:'h496: all passed');await b.close();process.exit(bad?1:0);
})();
