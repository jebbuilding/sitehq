const fs=require('fs');const {chromium}=require('playwright');
const mode=process.argv[2]||'owner';const only=process.argv[3]||'';
// SITEHQ_URL=http://127.0.0.1:<port> crawls the app served there at /owner, /trade or /client (the app on its own
// backend: scripts/test-backend.mjs) instead of the page with the fake platform built below. Nothing else changes.
const base=(process.env.SITEHQ_URL||'').replace(/\/$/,'');
let src=fs.readFileSync('harness8src.js','utf8');
const seed=`window.__store=store;
store["todos/c1"]={kind:"client",name:"Sue Jones",phone:"07700900111",email:"sue@example.com",address:"4 Rolle Road",postcode:"EX8 2AB",work:"Loft conversion",stage:"won",portalCode:"ABC123",notes:[],created:1,site:"4 Rolle Road, Exmouth"};
store["todos/c2"]={kind:"client",name:"Bob Lee",phone:"07700900222",work:"Extension",stage:"enquiry",notes:[],created:2};
store["sites/s2"]={name:"4 Rolle Road, Exmouth",client:"c1"};
store["todos/t1"]={kind:"todo",text:"Order skip",done:false,created:3};
store["todos/dwrates"]={kind:"dwrates",def:40,per:{}};
store["sheets/emp1/signoffs/mkc-ews"]={type:"makercopy",key:"ews",name:"Exeter Window Store",cat:"Window & door systems",phone:"01392 444335",website:"www.exeterwindowstore.co.uk",links:[["Brochures","https://exeterwindowstore.co.uk/brochures/"]],brochures:[{title:"Range guide",assetId:"img1",contentType:"image/png"}],stamp:"x",updated:1};
store["sheets/emp1/signoffs/l1"]={type:"leave",status:"pending",from:"2026-11-10",to:"2026-11-11",leaveType:"holiday",created:4};
store["sheets/emp1/entries/dw2"]={type:"job",kind:"extra",date:"2026-10-28",job:"4 Rolle Road, Exmouth",task:"Extra noggins",hours:3,created:5};
store["portal/u9"]={name:"Sue Jones",code:"ABC123",linked:true,clientId:"c1",site:"4 Rolle Road, Exmouth",project:"Loft conversion",linkedAt:1};
`;
src=src.replace('const store={}, listeners=[];','const store={}, listeners=[];'+seed);
if(mode==='client'){src=src.replace("id:async()=>${owner?'\"owner\"':'\"emp1\"'}",'id:async()=>"u9"')}
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
let page_src=fs.readFileSync('timesheets.html','utf8');
if(mode==='trade')page_src=page_src.replace('function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}','function detailsDone(d){return true}');
const SKIP=/delete|remove|sign out|log out|reset|restore|wipe|undo|clear all|fill in forms as me|team view|leave the|tap again|stop \(|disconnect|archive|⬇ backup|backup|^×$|^✕$/i;
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});ctx.setDefaultTimeout(1500);
 await ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(base&&u.startsWith(base+'/'))return r.continue();if(u.includes('jspdf'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('jspdfpkg/package/dist/jspdf.umd.min.js','utf8')});if(u.includes('xlsx'))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('xlsxpkg/package/dist/xlsx.full.min.js','utf8')});return r.abort()});
 const p=await ctx.newPage();let cur='load';const errs=[];
 p.on('pageerror',e=>errs.push(cur+' :: '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|ERR_FAILED|net::/.test(m.text()))errs.push(cur+' :: console '+m.text().slice(0,200))});p.on('dialog',d=>d.dismiss().catch(()=>{}));
 if(base)await p.goto(base+'/'+mode);else await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(mode==='owner')+page_src+'</body></html>');await p.waitForTimeout(1500);await p.keyboard.press('Escape');
 const closeAll=async()=>{for(let k=0;k<3;k++){await p.keyboard.press('Escape').catch(()=>{});for(const s of ['.np-cancel','#f-cancel','#viewer-close','#chat-back','#fv-close','#mk-cancel','#pv-exit']){const el=await p.$(s);if(el&&await el.isVisible().catch(()=>false))await el.click({timeout:800}).catch(()=>{})}}};
 const isClient=mode==='client';
 const tabs=isClient?await p.$$eval('.ptabs button',x=>x.map(t=>[t.dataset.v,t.textContent.trim()])):await p.$$eval('#tabs .tab',x=>x.map(t=>[t.dataset.t,t.textContent.trim()]).filter(t=>t[0]!=='me'&&t[0]!=='__back'));
 console.log(mode,'tabs:',tabs.map(t=>t[1]).join(' | '));
 const goTab=async t=>{if(isClient){await p.click(`.ptabs button[data-v="${t}"]`)}else await p.click(`#tabs .tab[data-t="${t}"]`);await p.waitForTimeout(150);await p.evaluate(()=>document.querySelectorAll('#main details:not(.fltdd)').forEach(d=>d.open=true))};
 const report={};
 for(const [t,label] of tabs){if(only&&t!==only)continue;cur=label;const e0=errs.length;
   try{await goTab(t)}catch(e){errs.push(label+' :: cannot open tab '+e.message.replace(/\s+/g,' ').slice(0,250));await p.screenshot({path:'crawl-block.png'});continue}
   const txt=(await p.innerText('#main')).replace(/\s+/g,' ');
   const names=await p.$$eval('#main button, #main a.btn, #main summary',x=>x.filter(b=>b.offsetParent).map(b=>b.textContent.trim().replace(/\s+/g,' ').slice(0,40)));
   let clicked=0,saved=0;const n=Math.min(names.length,45);
   for(let i=0;i<n;i++){
     await closeAll();try{await goTab(t)}catch(e){}
     const btns=await p.$$('#main button, #main a.btn, #main summary');const vis=[];for(const x of btns){if(await x.isVisible().catch(()=>false))vis.push(x)}
     const el=vis[i];if(!el)continue;const nm=(await el.innerText().catch(()=>'')).trim().replace(/\s+/g,' ').slice(0,40);
     if(SKIP.test(nm)||/^(tel|mailto|https?|sms|facetime|whatsapp)/.test(await el.getAttribute('href')||''))continue;
     cur=label+' > '+nm;
     try{await el.click({timeout:1200});clicked++}catch(e){continue}
     await p.waitForTimeout(250);
     if(await p.isVisible('#sheet')){const fs_=await p.$('#f-save');if(fs_&&await fs_.isVisible()){cur=label+' > '+nm+' > Save';await fs_.click({timeout:800}).catch(()=>{});saved++;await p.waitForTimeout(250)}}
   }
   await closeAll();cur=label;
   report[label]={chars:txt.length,buttons:names.length,clicked,saved,errors:errs.length-e0,preview:txt.slice(0,110)};
 }
 for(const k in report)console.log(k.padEnd(24),JSON.stringify(report[k]));
 const uniq=[...new Set(errs)];console.log('\nERRORS ('+uniq.length+')');uniq.forEach(e=>console.log(' -',e.slice(0,300)));
 await b.close()})();
