const fs=require('fs');const {chromium}=require('playwright');
const base=fs.readFileSync('crawl.js','utf8');const seed=base.slice(base.indexOf('const seed=`')+12,base.indexOf('`;\nsrc=src.replace'));
const H=fs.readFileSync('harness8src.js','utf8');const seed2=seed.replace(',linked:true,clientId:"c1",site:"4 Rolle Road, Exmouth",project:"Loft conversion",linkedAt:1','');
function build(owner,uid,dump){let src=H.replace('const store={}, listeners=[];','const store={}, listeners=[];'+seed2);
  if(dump)src=src.replace('const ns={','Object.assign(store,'+JSON.stringify(dump)+');const ns={');
  if(uid)src=src.replace(`id:async()=>\${owner?'"owner"':'"emp1"'}`,`id:async()=>"${uid}"`);
  const f=eval('('+src.slice(src.indexOf('const fake=')+11,src.indexOf('(async()=>{\n  const b=await chromium.launch();')).trim().replace(/;$/,'')+')');return f(owner)}
let page_src=fs.readFileSync('timesheets.html','utf8');{const i=page_src.lastIndexOf('})();');page_src=page_src.slice(0,i)+'window.__T={viewClient,openEntry,openPersonMonth,openClientChat,S,render};\n'+page_src.slice(i)}const trade_src=page_src.replace('function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}','function detailsDone(d){return true}');
const R=[];const ok=(name,cond,info)=>{R.push((cond?'✅ ':'❌ ')+name+(info?'  — '+info:''))};
(async()=>{const b=await chromium.launch();
 const mk=async(html,src)=>{const ctx=await b.newContext({viewport:{width:390,height:1000}});ctx.setDefaultTimeout(3000);await ctx.route(/^https?:\/\//,r=>r.abort());const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.dismiss());
   await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+html+src+'</body></html>');await p.waitForTimeout(1500);await p.keyboard.press('Escape');return p};
 const st=p=>p.evaluate(()=>JSON.parse(JSON.stringify(window.__store)));
 const tab=async(p,t)=>{for(let i=0;i<2;i++){await p.keyboard.press('Escape');for(const q of ['#viewer-close','#f-cancel','#chat-back']){const e=await p.$(q);if(e&&await e.isVisible())await e.click().catch(()=>{})}}await p.click(`#tabs .tab[data-t="${t}"]`);await p.waitForTimeout(250)};
 const txt=async p=>(await p.innerText('#main')).replace(/\s+/g,' ');
 // ===== OWNER =====
 const o=await mk(build(true),page_src);
 try{
 // 1. accept Bob -> site + sitejob + planner
 await o.evaluate(()=>__T.viewClient(__T.S.clients.find(c=>c.id==="c2")));await o.waitForTimeout(300);await o.click('.clstep[data-s=won]');await o.waitForTimeout(300);
 await o.fill('#cm-d','2026-11-09').catch(()=>{});const cs=await o.$('#cm-site');if(cs)await cs.check();await o.click('#f-save');await o.waitForTimeout(2000);
 let s=await st(o);const bobSite=Object.entries(s).find(([k,v])=>k.startsWith('sites/')&&/Bob/.test(v.client||v.name||''));
 ok('Clients → accepting a job makes a site',!!bobSite,bobSite&&bobSite[1].name);
 const bobSJ=Object.entries(s).find(([k,v])=>v&&v.kind==='sitejob'&&bobSite&&v.site===bobSite[1].name);ok('Clients → site gets job details from client',!!bobSJ,bobSJ&&JSON.stringify(bobSJ[1].job).slice(0,120));
 ok('Clients → job goes into the planner',Object.entries(s).some(([k,v])=>/^plan/.test(k)&&/Bob|Extension/.test((v.title||'')+(v.contact||''))),'');
 ok('Clients → stage now Accepted',s['todos/c2'].stage==='won');
 // Sites tab shows Bob site
 await tab(o,'projects');const sel=await o.$$eval('#main select option',x=>x.map(t=>t.textContent));ok('Sites tab lists the new site',sel.some(t=>/Bob|Extension/.test(t))||(await txt(o)).includes(bobSite?bobSite[1].name:'zzz'),sel.join(' / ').slice(0,150));
 // 2. Sue (joined portal u9) on site -> sitejob to client + trade
 await o.evaluate(()=>__T.viewClient(__T.S.clients.find(c=>c.id==="c1")));await o.waitForTimeout(300);await o.click('.clstep[data-s=onsite]');await o.waitForTimeout(300);const cs2=await o.$('#cm-site');if(cs2)await cs2.check();await o.click('#f-save');await o.waitForTimeout(2500);
 s=await st(o);const sueSJ=Object.entries(s).find(([k,v])=>v&&v.kind==='sitejob'&&/Rolle/.test(v.site));ok('Sue on site → job details created for her site',!!sueSJ,sueSJ&&sueSJ[1].vis);
 ok('Job details copied to client portal',!!(s['portal/u9']&&s['portal/u9'].siteJob),s['portal/u9']&&s['portal/u9'].siteJob?Object.keys(s['portal/u9'].siteJob).join(','):'none');
 const trSJ=Object.keys(s).filter(k=>k.startsWith('sheets/emp1/signoffs/sj-'));ok('Job details copied to trade (Sam)',trSJ.length>0,trSJ.join(', '));
 // 3. day work by owner for Sam with photo
 await o.evaluate(()=>__T.openEntry("job",null,"emp1"));await o.waitForTimeout(300);await o.selectOption('#f-job','4 Rolle Road, Exmouth').catch(()=>{});await o.fill('#f-task','Fitted extra joist');await o.fill('#f-hrs','2.5').catch(()=>{});
 await o.setInputFiles('#f-ph','fixtures/test.jpg').catch(e=>console.log('ph',e.message));await o.click('#f-save');await o.waitForTimeout(2000);
 s=await st(o);const dwE=Object.entries(s).find(([k,v])=>k.startsWith('sheets/emp1/entries/')&&v.task==='Fitted extra joist');ok('Owner adds day work for a trade',!!dwE,dwE&&`${dwE[1].hours}h kind=${dwE[1].kind} photos=${(dwE[1].photos||[]).length}`);
 const dwPh=Object.entries(s).filter(([k,v])=>/\/photos\//.test(k)&&/Day work/i.test(v.cat||v.category||''));ok('Day work photo saved to site photos',dwPh.length>0,dwPh.map(x=>x[0]).join(','));
 await tab(o,'daywork');let t=await txt(o);ok('Day work tab shows it',t.includes('Fitted extra joist'));
 await tab(o,'photos');t=await txt(o);ok('Photos tab shows Day work photo',/Day work/.test(t),t.slice(0,0));
 // 4. leave -> planner + timesheet
 await tab(o,'planner');t=await txt(o);ok('Planner shows Sam time-off request',/Holiday|time off|Time-off/i.test(t));
 if(await o.$('#pb-reqline')){await o.click('#pb-reqline');await o.waitForTimeout(400)}const ap=o.locator('#main button, #viewer-body button',{hasText:/^✓? ?Approve/});const apn=await ap.count();if(apn){await ap.first().click();await o.waitForTimeout(400);await o.click('#f-save');await o.waitForTimeout(800)}
 s=await st(o);ok('Approving leave updates it',s['sheets/emp1/signoffs/l1'].status==='approved','buttons found '+apn+', status '+s['sheets/emp1/signoffs/l1'].status);
 await o.evaluate(()=>__T.openPersonMonth("emp1"));await o.waitForTimeout(400);await o.click('#viewer-body .ts-next').catch(()=>{});await o.waitForTimeout(300);t=(await o.innerText('#viewer-body')).replace(/\s+/g,' ');ok('Leave shows on Sam month timesheet (Nov)',/Holiday|🌴|off/i.test(t),t.match(/.{30}(Holiday|🌴).{20}/)?.[0]);await o.keyboard.press('Escape');
 // 5. invoice stages
 await tab(o,'invoices');const inv=o.locator('#main .entry, #main .invrow, #main button',{hasText:/0042/});if(await inv.count()){await inv.first().click();await o.waitForTimeout(400);const nx=o.locator('#viewer-body button, #form button',{hasText:/Received/});if(await nx.count()){await nx.first().click();await o.waitForTimeout(800)}}
 s=await st(o);ok('Invoice moves to next stage',(s['sheets/emp1/invoices/i'].status||'')!=='sent','status '+s['sheets/emp1/invoices/i'].status);await o.keyboard.press('Escape');
 // 6. client chat
 await o.evaluate(()=>__T.openClientChat(__T.S.clients.find(c=>c.id==="c1")));await o.waitForTimeout(600);await o.fill('#cm-text','Hello Sue');await o.click('#cm-send');await o.waitForTimeout(800);await o.click('#chat-back').catch(()=>{});
 s=await st(o);const cc=Object.entries(s).find(([k,v])=>k.startsWith('chats/')&&v.kind==='client'&&/c1|Sue/.test(JSON.stringify(v)));ok('Chat to client created',!!cc,cc&&cc[0]+' members '+JSON.stringify(cc[1].members));
 const cm=Object.entries(s).find(([k,v])=>k.startsWith('msgs/')&&v.text==='Hello Sue');ok('Message saved',!!cm);
 // 7. todo to trade
 await o.evaluate(()=>{__T.S.otab="jobs";__T.render()});await o.waitForTimeout(300);
 // 8. share doc to client portal: check portal tab count
 await tab(o,'portal');t=await txt(o);ok('Client portal tab lists Sue',/Sue/.test(t));
 // 9. Day work filter + spreadsheet
 await tab(o,'daywork');ok('Day work filter bar present',!!await o.$('#flt-who'));
 // 10. timesheets owner people card
 await tab(o,'time');t=await txt(o);ok('Timesheets lists Sam',/Sam Test/.test(t));
 }catch(e){ok('owner flow crashed',false,e.message.split('\n')[0])}
 ok('Owner page errors',!o.errs.length,o.errs.join(' | ').slice(0,300));
 const dump=await st(o);fs.writeFileSync('flowdump.json',JSON.stringify(dump));
 // ===== TRADE =====
 const tp=await mk(build(false,null,dump),trade_src);
 try{
 await tab(tp,'plans');let t=await txt(tp);ok('Trade Sites tab shows Rolle Road job',/Rolle/.test(t),t.slice(0,120));
 const tiles=await tp.$$eval('#main button',x=>x.map(b=>b.textContent.trim().replace(/\s+/g,' ')).filter(Boolean).slice(0,25));
 const jt=tp.locator('#main button',{hasText:/Rolle/});if(await jt.count()){await jt.first().click();await tp.waitForTimeout(400)}
 t=(await tp.innerText('body')).replace(/\s+/g,' ');ok('Trade sees client name/phone on job',/Sue Jones/.test(t)&&/07700900111/.test(t),'');
 await tp.keyboard.press('Escape');await tp.click('#viewer-close').catch(()=>{});
 await tab(tp,'mydw');t=await txt(tp);ok('Trade Day work tab shows James-added day work',/Fitted extra joist/.test(t));
 await tab(tp,'time');t=await txt(tp);ok('Trade timesheet loads',t.length>100);
 await tab(tp,'chat');t=await txt(tp);ok('Trade chat does NOT show client chat',!/Sue/.test(t));
 await tab(tp,'invoices');t=await txt(tp);ok('Trade sees invoice stage',/0042/.test(t)&&/Received|received/.test(t),t.match(/.{0,40}0042.{0,60}/)?.[0]);
 await tab(tp,'planner');t=await txt(tp);ok('Trade planner shows approved holiday',/Holiday|time off/i.test(t));
 }catch(e){ok('trade flow crashed',false,e.message.split('\n')[0])}
 ok('Trade page errors',!tp.errs.length,tp.errs.join(' | ').slice(0,300));
 // ===== CLIENT =====
 const cp=await mk(build(false,'u9',dump),page_src);
 try{let t=await txt(cp);ok('Client portal opens for Sue',/Sue|Home/.test(t),t.slice(0,100));
 ok('Client sees job details',/Rolle|Loft/.test(t));
 await cp.click('.ptabs button[data-v=chat]');await cp.waitForTimeout(400);t=(await cp.innerText('body')).replace(/\s+/g,' ');ok('Client sees Hello Sue message',/Hello Sue/.test(t));
 for(const k of ['photos','docs','draw','cal','signs','about']){const bt=await cp.$(`.ptabs button[data-v=${k}]`);if(!bt)continue;await bt.click();await cp.waitForTimeout(200)}
 ok('Client cannot see trades tabs',!(await cp.$('#tabs .tab[data-t=time]')));
 }catch(e){ok('client flow crashed',false,e.message.split('\n')[0])}
 ok('Client page errors',!cp.errs.length,cp.errs.join(' | ').slice(0,300));
 console.log(R.join('\n'));await b.close()})();
