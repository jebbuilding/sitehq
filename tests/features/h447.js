// Door & window survey (made-up sizes): the four add-on boxes by the measurements (top / left / right / bottom) add
// add-ons to the list below and to the order size, and the drawing says which sides and the size with them. The new
// client form has 🪟 Door & window survey: it saves the client and opens a survey linked to them.
const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
const c=fs.readFileSync('crawl.js','utf8');const seedDef=c.slice(c.indexOf('const seed='),c.indexOf("src=src.replace('const store={}"));eval(seedDef.replace('const seed=','global.seed='));
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];window.__st=store;window.__blobs={};'+seed);
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
let bad=0;const ok=(cond,what)=>{console.log((cond?'✅ ':'❌ ')+what);if(!cond)bad++;};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:950}});ctx.setDefaultTimeout(8000);const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);bad++;});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 try{await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(true)+page_src+'</body></html>');await p.waitForTimeout(2000);await p.keyboard.press('Escape');
 /* add-ons by the measurements */
 await p.click('.tab[data-t=jobs]');await p.waitForTimeout(400);await p.click('#ws-new');await p.waitForTimeout(700);
 await p.fill('#wsx-m-sw','1220');await p.fill('#wsx-m-sh','1060');await p.waitForTimeout(200);
 const order=async()=>(await p.innerText('#wsx-calc')).replace(/\s+/g,' ');
 const before=await order();
 ok(await p.isVisible('#wsx-ao-h')&&await p.isVisible('#wsx-ao-b'),'top / left / right / bottom add-on boxes by the measurements');
 await p.fill('#wsx-ao-h','30');await p.fill('#wsx-ao-l','20');await p.fill('#wsx-ao-r','20');await p.waitForTimeout(300);
 const az=await p.$$eval('#wsx-az select[data-k=t]',s=>s.map(x=>x.value));
 ok(az.includes('Add-on – top')&&az.includes('Add-on – left side')&&az.includes('Add-on – right side'),'they appear in Add-ons & extra pieces ('+az.join(', ')+')');
 const m=/Order size (\d+) × (\d+)/.exec(before);const W=+m[1],H=+m[2];
 ok((await order()).includes(`With add-ons ${W+40} × ${H+30}`),`order size with add-ons ${W+40} × ${H+30}`);
 const sk=await p.innerHTML('#wsx-sk');
 ok(/Add-ons: top 30 · left 20 · right 20/.test(sk),'the drawing says which sides and the sizes');
 /* a 45 mm add-on profile on the head in the list below shows in the Top box as the total */
 await p.click('#wsx-az [data-act=adda]');await p.waitForTimeout(200);
 const n=(await p.$$('#wsx-az select[data-k=t]')).length;
 await p.selectOption(`#wsx-az select[data-k=t][data-i="${n-1}"]`,'Add-on profile 45mm');await p.waitForTimeout(200);
 ok(await p.inputValue('#wsx-ao-h')==='75','Top box shows the total on the head (30 + 45 = 75)');
 await p.fill('#wsx-ao-h','45');await p.waitForTimeout(200);
 ok(!(await p.$$eval('#wsx-az select[data-k=t]',s=>s.map(x=>x.value))).includes('Add-on – top')&&await p.inputValue('#wsx-ao-h')==='45','typing 45 leaves just the 45mm profile');
 await p.fill('#wsx-ao-l','0');await p.waitForTimeout(200);
 ok(!(await p.$$eval('#wsx-az select[data-k=t]',s=>s.map(x=>x.value))).includes('Add-on – left side'),'0 takes the left add-on away');
 await (await p.$('#wsx-sk')).screenshot({path:'h447-addons.png'});
 await p.evaluate(()=>{const b=[...document.querySelectorAll('.wsov button')].find(x=>/Done/.test(x.textContent));b&&b.click();});await p.waitForTimeout(500);
 /* the survey from the new client form */
 await p.evaluate(()=>document.querySelector('#tabs .tab[data-t=clients]').click());await p.waitForTimeout(500);
 await p.click('#cl-new');await p.waitForTimeout(500);
 ok(await p.isVisible('#cf-ws'),'new client form has 🪟 Door & window survey');
 await p.click('#cf-ws');await p.waitForTimeout(600);
 ok(await p.isVisible('#sheet')&&!(await p.$('.wsov')),'with no name it stays on the form');
 await p.fill('#cf-main .cfm-f','Robin');await p.fill('#cf-main .cfm-l','Testclient');await p.fill('#cf-addr','7 Example Road, Exmouth');await p.fill('#cf-phone','07700 900123');
 await p.click('#cf-ws');await p.waitForTimeout(1500);
 const saved=await p.evaluate(()=>Object.values(window.__st).some(v=>/Testclient/.test(JSON.stringify(v))));
 ok(!!saved,'the client is saved');
 ok(await p.isVisible('.wsov')&&/Robin|Testclient/.test(await p.inputValue('#wsx-j-client')),'and a survey opens for them ('+await p.inputValue('#wsx-j-client')+')');
 ok(/Linked to/.test(await p.innerText('#wsx-j-link')),'linked to the client');
 }catch(err){console.log('FAIL',String(err.message).split('\n').slice(0,6).join(' | '));bad++}
 console.log(bad?'h447: '+bad+' FAILED':'h447: all passed');
 await b.close()})();
