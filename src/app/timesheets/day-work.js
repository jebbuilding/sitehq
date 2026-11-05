/* ================= DAY WORK (chargeable hours you bill to clients) ================= */
const dwRate=id=>{const r=S.dwRates||{};const p=(r.per||{})[id];return +(p!=null&&p!==""?p:r.def||0)||0};
const isDW=e=>e&&e.type==="job"&&e.kind==="extra";
function dwTradeSheet(ym,ents){const [Y,M]=ym.split("-").map(Number);const name=new Date(Y,M-1,1).toLocaleDateString("en-GB",{month:"long",year:"numeric"});
  const list=ents.filter(isDW).sort((a,b)=>a.date.localeCompare(b.date));const tot=sumH(list,()=>true);const bySite={};list.forEach(e=>{const k=e.job||"No site";bySite[k]=(bySite[k]||0)+(+e.hours||0)});
  return `<div class="tspaper"><div class="tshead"><button type="button" class="iconbtn ts-prev" aria-label="Previous month">‹</button><div><b>Day work sheet</b><span>${esc(name)} · ${esc(myName())}</span></div><button type="button" class="iconbtn ts-next" aria-label="Next month">›</button></div>
    <div class="who" style="margin-bottom:6px">Chargeable hours only: extra work James bills to the client. Add with <b>🧱 + Add day work</b> (or + Day work / job time on Timesheets) and choose 🧱 Yes.</div>
    ${list.length?`<div class="tswrap"><table class="tstable"><thead><tr><th>Date</th><th>Site · what you did</th><th class="num">Hrs</th></tr></thead><tbody>${list.map(e=>`<tr class="dwt-row tsrow" data-id="${esc(e.id)}"><td class="tsd"><b>${parse(e.date).getDate()}</b><span>${parse(e.date).toLocaleDateString("en-GB",{weekday:"short"})}</span></td><td class="tssite"><b>${esc(e.job||"No site")}</b><br>${esc(e.task||"")}${e.mats?`<br><span class="who">Materials: ${esc(e.mats)}</span>`:""}${(e.photos||[]).length?`<br><span class="who">📷 ${e.photos.length} photo${e.photos.length===1?"":"s"}</span>`:""}${e.billed?' <span class="tag ok">Billed</span>':e.approved?' <span class="tsok">✓</span>':""}</td><td class="num"><b>${hrs(e.hours)}</b></td></tr>`).join("")}</tbody></table></div>`
      :`<div class="nothing">No day work this month.</div>`}
    <div class="tstots"><div><span>Day work hours</span><b>${hrs(tot)}</b></div>${Object.entries(bySite).map(([k,v])=>`<div><span>${esc(k)}</span><b>${hrs(v)}</b></div>`).join("")}</div></div>`}
function dwAll(){const out=[];teamPlusMe().forEach(id=>personEntries(id).filter(isDW).forEach(e=>out.push(Object.assign({who:id},e))));
  (S.dwLines||[]).forEach(l=>out.push(Object.assign({who:"",line:true,type:"line"},l)));return out}
function dayworkView(){const f=S.f.dwf||"open";const all0=dwAll();const r=S.dwRates||{};const fw=fltWhos().length;
  const all=all0.filter(e=>fltSiteOk(e)&&(!fw||(e.line?false:fltWhoOk(e.who))));
  const gb="site";const per=S.f.dwp||"month";const mode=S.f.dwmode||"job";const pid=mode==="person"?S.f.dwperson:"";
  const list=all.filter(e=>(f==="all"||(f==="open"?!e.billed:!!e.billed))&&(!pid||e.who===pid));const groups={};
  const tradeOf=id=>{const d=(S.team[id]&&S.team[id].details)||{};return (d.trade||"").trim()||EMP_TYPES[empTypeOf(id)]||"Trade not set"};
  const keyOf=e=>gb==="person"?(e.line?"Materials & other charges":nameOf(e.who)):gb==="trade"?(e.line?"Materials & other charges":tradeOf(e.who)):gb==="day"?(e.date||""):gb==="month"?(e.date||"").slice(0,7):gb==="year"?(e.date||"").slice(0,4):(e.job||e.site||"No site").trim();
  const labelOf=k=>gb==="day"?(k?parse(k).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"No date"):gb==="month"?(k?new Date(+k.slice(0,4),+k.slice(5,7)-1,1).toLocaleDateString("en-GB",{month:"long",year:"numeric"}):"No date"):k||"—";
  list.forEach(e=>{const k=keyOf(e);(groups[k]=groups[k]||[]).push(e)});
  const money=e=>e.line?(+e.qty||0)*(+e.rate||0):(+e.hours||0)*dwRate(e.who);
  const keys=Object.keys(groups).sort((a,b)=>["day","month","year"].includes(gb)?b.localeCompare(a):a.localeCompare(b));
  const grandH=sumH(list.filter(e=>!e.line),()=>true),grandM=list.reduce((a,e)=>a+money(e),0);
  $("main").innerHTML=`<div class="notice">🧱 <b>Day work</b> is chargeable time: anything trades log as <b>day work / extra to be billed</b>. Check it, add materials, then make a day work sheet for the client or mark it as billed.</div>
    <div class="actions"><button type="button" class="btn primary" id="dw-add">+ Add day work</button><button type="button" class="btn" id="dw-rates">🧱 Rates: ${r.def?gbp(+r.def)+"/h":"not set"}${Object.keys(r.per||{}).length?" (+ personal rates)":""}</button></div>
    ${fltBar([...teamPlusMe(),...all0.filter(e=>!e.line).map(e=>e.who)],all0.map(e=>e.job||e.site))}
    <div class="seg" id="dw-f">${[["open","To bill"],["billed","Billed"],["all","All"]].map(([k,l])=>`<button type="button" data-v="${k}" aria-pressed="${f===k}">${l}</button>`).join("")}</div>
    <div class="seg" id="dw-mode" style="margin-top:8px"><button type="button" data-v="job" aria-pressed="${mode==="job"}">🏠 By job</button><button type="button" data-v="person" aria-pressed="${mode==="person"}">👷 By trade / person</button></div>
    ${mode==="person"&&!pid?(()=>{const ppl=[...new Set(all.filter(e=>!e.line).map(e=>e.who))];const money0=e=>(+e.hours||0)*dwRate(e.who);
      return `<div class="dwppl">${ppl.sort((a,b)=>nameOf(a).localeCompare(nameOf(b))).map(id=>{const mine=all.filter(e=>e.who===id);const open=mine.filter(e=>!e.billed);const d=(S.team[id]&&S.team[id].details)||{};
        return `<button type="button" class="dwpt" data-w="${esc(id)}">${avatarHtml(id,48)}<span class="dwptm"><b>${esc(nameOf(id))}</b><span class="who">${esc([d.trade||"",EMP_TYPES[empTypeOf(id)]||""].filter(Boolean).join(" · ")||"Trade not set")}</span>
          <span class="dwptf"><span>To bill <b>${hrs(sumH(open,()=>true))} h · ${gbp(open.reduce((a,e)=>a+money0(e),0))}</b></span><span>All time <b>${hrs(sumH(mine,()=>true))} h</b></span><span>${[...new Set(mine.map(e=>e.job))].length} job${[...new Set(mine.map(e=>e.job))].length===1?"":"s"}</span></span></span><span class="ppchev">›</span></button>`}).join("")||'<div class="empty"><strong>No day work yet</strong>When trades log day work, they appear here.</div>'}</div>`})():""}
    ${pid?`<div class="dwphead"><button type="button" class="btn" id="dw-back">‹ All trades</button>${avatarHtml(pid,40)}<div><b>${esc(nameOf(pid))}</b><div class="who">${esc(((S.team[pid]&&S.team[pid].details)||{}).trade||EMP_TYPES[empTypeOf(pid)]||"")} · rate ${gbp(dwRate(pid))}/h</div></div></div>`:""}
    ${mode==="person"&&!pid?"":`<div class="flabel" style="margin-top:8px">Each job is split by person, then by</div>`}
    <div class="seg" id="dw-p" ${mode==="person"&&!pid?"hidden":""}>${[["day","Day"],["month","Month"],["year","Year"]].map(([k,l])=>`<button type="button" data-v="${k}" aria-pressed="${per===k}">${l}</button>`).join("")}</div>
    ${mode==="person"&&!pid?"":keys.length?`<div class="card dwsum"><div class="tswrap"><table class="tstable"><thead><tr><th>${esc({site:"Job / site",person:"Person",trade:"Trade",day:"Day",month:"Month",year:"Year"}[gb])}</th><th class="num">Hours</th><th class="num">£</th></tr></thead><tbody>
      ${keys.map(k=>`<tr class="dwsumrow" data-s="${esc(k)}"><td>${esc(labelOf(k))}</td><td class="num">${hrs(sumH(groups[k].filter(e=>!e.line),()=>true))}</td><td class="num"><b>${gbp(groups[k].reduce((a,e)=>a+money(e),0))}</b></td></tr>`).join("")}
      <tr class="tswk"><td>Total</td><td class="num">${hrs(grandH)}</td><td class="num">${gbp(grandM)}</td></tr></tbody></table></div></div>`:""}
    ${mode==="person"&&!pid?"":keys.length?keys.map(k=>{const g=groups[k].sort((a,b)=>(a.date||"").localeCompare(b.date||""));const sr=gb==="site"?siteRec(k):null;const c=gb==="site"?siteClient(k):null;const tH=sumH(g.filter(e=>!e.line),()=>true),tM=g.reduce((a,e)=>a+money(e),0);
      return `<div class="card dwcard" data-s="${esc(k)}" id="dwc-${esc(k).replace(/[^\w-]/g,"_")}"><div class="dwhead"><div><b>${esc(labelOf(k))}</b><div class="who">${c?"👤 "+esc(c.name)+" · ":""}${hrs(tH)} h · <b>${gbp(tM)}</b>${r.def?"":" (set your rate)"}</div></div><label class="inl"><input type="checkbox" class="dw-all" checked> All</label></div>
        <div class="tswrap"><table class="tstable dwtable"><thead><tr><th></th><th>Day</th><th>What</th><th class="num">Hrs</th><th class="num">£</th></tr></thead><tbody>
        ${(()=>{const perKey=e=>e.line?"zz":e.who;const people={};g.forEach(e=>{(people[perKey(e)]=people[perKey(e)]||[]).push(e)});
          const pk=e=>per==="day"?(e.date||""):per==="month"?(e.date||"").slice(0,7):(e.date||"").slice(0,4);
          const pl=k=>!k?"No date":per==="day"?parse(k).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"}):per==="month"?new Date(+k.slice(0,4),+k.slice(5,7)-1,1).toLocaleDateString("en-GB",{month:"long",year:"numeric"}):k;
          const ln=e=>`<tr><td><input type="checkbox" class="dw-pick" data-k="${esc((e.line?"l:":"e:")+(e._src||e.who||"")+":"+e.id)}" checked></td><td class="dwd">${e.date?parse(e.date).getDate()+"<br><span>"+esc(parse(e.date).toLocaleDateString("en-GB",{month:"short"}))+"</span>":""}</td>
          <td>${gb!=="site"?`<span class="mtag">${esc(e.job||e.site||"No site")}</span> `:""}${gb==="site"||gb==="year"||gb==="month"?"":""}${e.line?`<b>${esc(e.desc||"Line")}</b> <span class="who">(added by you)</span> <button type="button" class="linkdanger dw-ldel" data-id="${esc(e.id)}">Remove</button>`:`${esc(e.task||"")}${e.mats?`<br><span class="who">Materials: ${esc(e.mats)}</span>`:""}${e.notes?`<br><span class="who">${esc(e.notes)}</span>`:""}${(e.photos||[]).length?`<div class="dwph">${e.photos.map(id=>`<button type="button" class="dwphb" data-a="${esc(id)}"><img src="${blobUrl(id)}" alt="Photo" loading="lazy"></button>`).join("")}</div>`:""}`}${e.billed?` <span class="tag ok">Billed${e.billed.ref?" · "+esc(e.billed.ref):""}</span>`:""}</td>
          <td class="num">${e.line?esc(String(e.qty||""))+(e.unit?" "+esc(e.unit):""):hrs(e.hours)}</td><td class="num">${gbp(money(e))}</td></tr>`;
          return Object.keys(people).sort((a,b)=>a==="zz"?1:b==="zz"?-1:nameOf(a).localeCompare(nameOf(b))).map(w=>{const pe=people[w];const ps={};pe.forEach(e=>{(ps[pk(e)]=ps[pk(e)]||[]).push(e)});
            return `<tr class="dwph"><td></td><td colspan="2">${w==="zz"?"🧱 Materials &amp; other charges":"👷 "+esc(nameOf(w))}</td><td class="num">${w==="zz"?"":hrs(sumH(pe,()=>true))}</td><td class="num">${gbp(pe.reduce((a,e)=>a+money(e),0))}</td></tr>`+
              Object.keys(ps).sort().map(q=>`<tr class="dwqh"><td></td><td colspan="2">${esc(pl(q))}</td><td class="num">${w==="zz"?"":hrs(sumH(ps[q],()=>true))}</td><td class="num">${gbp(ps[q].reduce((a,e)=>a+money(e),0))}</td></tr>`+ps[q].sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(ln).join("")).join("")}).join("")})()}</tbody></table></div>
        <div class="actions">${gb==="site"?`<button type="button" class="pillbtn dw-line">+ Add materials / other charge</button>`:""}<button type="button" class="btn primary dw-pdf">📄 Day work sheet (PDF)</button><button type="button" class="btn dw-xls">📊 Spreadsheet</button>${f!=="billed"?`<button type="button" class="btn dw-bill">✓ Mark as billed</button>`:`<button type="button" class="btn dw-unbill">Undo billed</button>`}<button type="button" class="btn delbtn dw-del">🗑 Delete ticked</button></div></div>`}).join("")
      :`<div class="empty"><strong>${f==="billed"?"Nothing billed yet":"No day work to bill"}</strong>When trades log day work, it appears here grouped by site.</div>`}`;
  wireFlt();$("dw-f").querySelectorAll("button").forEach(b=>b.onclick=()=>{S.f.dwf=b.dataset.v;render()});
  $("dw-p").querySelectorAll("button").forEach(b=>b.onclick=()=>{S.f.dwp=b.dataset.v;render()});
  $("dw-mode").querySelectorAll("button").forEach(b=>b.onclick=()=>{S.f.dwmode=b.dataset.v;S.f.dwperson="";render()});
  $("main").querySelectorAll(".dwpt").forEach(b=>b.onclick=()=>{S.f.dwperson=b.dataset.w;render();window.scrollTo(0,0)});
  if($("dw-back"))$("dw-back").onclick=()=>{S.f.dwperson="";render()};
  $("main").querySelectorAll(".dwsumrow").forEach(r=>r.onclick=()=>{const el=document.getElementById("dwc-"+r.dataset.s.replace(/[^\w-]/g,"_"));if(el)el.scrollIntoView({behavior:"smooth",block:"start"})});
  $("dw-rates").onclick=dwEditRates;$("main").querySelectorAll(".dwphb").forEach(b=>b.onclick=()=>openFile(b.dataset.a,"photo.jpg","image/jpeg"));$("dw-add").onclick=()=>pickPersonFor("job");
  const picked=card=>{const ks=[...card.querySelectorAll(".dw-pick:checked")].map(x=>x.dataset.k);const g=groups[card.dataset.s]||[];return g.filter(e=>ks.includes((e.line?"l:":"e:")+(e._src||e.who||"")+":"+e.id))};
  $("main").querySelectorAll(".dwcard").forEach(card=>{const site=card.dataset.s;
    card.querySelector(".dw-all").onchange=e=>card.querySelectorAll(".dw-pick").forEach(x=>x.checked=e.target.checked);
    const ln=card.querySelector(".dw-line");if(ln)ln.onclick=()=>dwAddLine(site);
    card.querySelectorAll(".dw-ldel").forEach(b=>b.onclick=async()=>{if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Tap again";return}try{await S.db.doc("todos/"+b.dataset.id).delete();S.dwLines=(S.dwLines||[]).filter(x=>x.id!==b.dataset.id);render()}catch(e){toast("Couldn't remove")}});
    card.querySelector(".dw-pdf").onclick=()=>{const p=picked(card);if(!p.length){toast("Tick at least one line");return}dwPdf(labelOf(site),p,money,gb!=="site")};
    card.querySelector(".dw-xls").onclick=()=>{const p=picked(card);if(!p.length){toast("Tick at least one line");return}dwXlsPick(labelOf(site),p,money,pid)};
    const bl=card.querySelector(".dw-bill");if(bl)bl.onclick=()=>{const p=picked(card);if(!p.length){toast("Tick at least one line");return}dwMarkBilled(p,true)};
    const ub=card.querySelector(".dw-unbill");if(ub)ub.onclick=()=>{const p=picked(card);if(!p.length){toast("Tick at least one line");return}dwMarkBilled(p,false)};
    const dl=card.querySelector(".dw-del");dl.onclick=()=>{const p=picked(card);if(!p.length){toast("Tick the lines to delete");return}
      askOwnerPin(`Enter your PIN to delete ${p.length} day work line${p.length===1?"":"s"} from ${labelOf(site)}. This can't be undone.`,async()=>{if(!await auditFirst("Day work lines deleted",labelOf(site),`${p.length} line${p.length===1?"":"s"}`,p.map(e=>Object.assign({},e,{_src:undefined}))))return;let n=0;
        for(const e of p){try{if(e.line){await S.db.doc("todos/"+e.id).delete();S.dwLines=(S.dwLines||[]).filter(x=>x.id!==e.id)}else{const w=e._src||e.who;await S.db.doc("sheets/"+w+"/entries/"+e.id).delete();if(w===S.me)S.mine.entries=S.mine.entries.filter(x=>x.id!==e.id);else if(S.data.entries[w])S.data.entries[w]=S.data.entries[w].filter(x=>x.id!==e.id)}n++}catch(err){}}
        toast(n===p.length?`${n} deleted`:`${n} of ${p.length} deleted. Check your connection.`);render()})}})}
function dwEditRates(){const r=S.dwRates||{};const ids=teamIds();
  openSheet(`<h3 id="sheettitle">🧱 Day work rates</h3><div class="who">Only you can see these. Used to work out the £ on day work sheets.</div>
    <label for="dr-def">Standard hourly rate £<input id="dr-def" inputmode="decimal" value="${esc(r.def||"")}" placeholder="e.g. 35"></label>
    <div class="flabel">Different rate for someone? (leave blank to use the standard rate)</div>
    ${ids.map(id=>`<label class="drrow"><span>${esc(nameOf(id))} <span class="who">${esc(EMP_TYPES[empTypeOf(id)]||"")}</span></span><input class="dr-p" data-w="${esc(id)}" inputmode="decimal" value="${esc((r.per||{})[id]!=null?(r.per||{})[id]:"")}" placeholder="${esc(r.def||"")}"></label>`).join("")}
    ${formFoot(false,"Save rates")}`,async()=>{const per={};document.querySelectorAll(".dr-p").forEach(x=>{const v=x.value.trim().replace(/[£\s]/g,"");if(v!=="")per[x.dataset.w]=+v});
      const d={kind:"dwrates",def:+$("dr-def").value.replace(/[£\s]/g,"")||0,per,updated:Date.now()};try{await S.db.doc("todos/dwrates").set(d);S.dwRates=Object.assign({id:"dwrates"},d);closeForm();toast("Rates saved");render()}catch(e){showErr("Couldn't save")}},"dr-def")}
function dwAddLine(site){openSheet(`<h3 id="sheettitle">Add to ${esc(site)}</h3><div class="who">Materials, plant hire, skip or any other charge for this day work.</div>
    <label for="dl-desc">What is it?<input id="dl-desc" maxlength="140" required placeholder="e.g. 22mm copper pipe and fittings"></label>
    <div class="grid2"><label for="dl-qty">Quantity<input id="dl-qty" inputmode="decimal" value="1"></label><label for="dl-unit">Unit (optional)<input id="dl-unit" maxlength="20" placeholder="e.g. lengths, days"></label></div>
    <div class="grid2"><label for="dl-rate">Price each £<input id="dl-rate" inputmode="decimal" placeholder="e.g. 45"></label><label for="dl-date">Date<input id="dl-date" type="date" value="${iso(new Date())}"></label></div>
    ${formFoot(false,"Add")}`,async()=>{const desc=$("dl-desc").value.trim();if(!desc){showErr("Say what it is");return}
      const d={kind:"dwline",site,job:site,desc,qty:+$("dl-qty").value||1,unit:$("dl-unit").value.trim(),rate:+$("dl-rate").value.replace(/[£\s]/g,"")||0,date:$("dl-date").value,created:Date.now()};const id="dwl-"+newId();
      try{await S.db.doc("todos/"+id).set(d);S.dwLines=(S.dwLines||[]).concat([Object.assign({id},d)]);closeForm();toast("Added");render()}catch(e){showErr("Couldn't save")}},"dl-desc")}
async function dwMarkBilled(items,on){let ref="";if(on){ref=(window.prompt?"":"");}
  const go=async ref=>{let n=0;for(const e of items){try{const v=on?{at:Date.now(),ref}:null;if(e.line)await S.db.doc("todos/"+e.id).update({billed:v});else await S.db.doc("sheets/"+(e._src||e.who)+"/entries/"+e.id).update({billed:v,approved:on?true:e.approved});n++}catch(x){}}
    toast(on?`Marked ${n} as billed`:`${n} moved back to To bill`);render()};
  if(!on){go("");return}
  openSheet(`<h3 id="sheettitle">Mark ${items.length} line${items.length===1?"":"s"} as billed</h3><label for="mb-ref">Invoice number (optional)<input id="mb-ref" maxlength="40" placeholder="e.g. INV-0123"></label>${formFoot(false,"Mark as billed")}`,async()=>{const r=$("mb-ref").value.trim();closeForm();await go(r)},"mb-ref")}
async function dwPdf(site,items,money,showSite){if(!S.dl){toast("Downloads only work when the page is opened in claude.ai");return}toast("Making the PDF…");
  try{await loadJsPdf()}catch(e){toast("Couldn't load the PDF maker. Check your connection.");return}
  const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4"});const W=210,M=14;let y=18;const co=coData();const c=showSite?null:siteClient(site);
  const clean=t=>String(t||"").replace(/[–—]/g,"-").replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[^\x09\x0A\x0D\x20-\x7E£·•°]/g,"");
  doc.setFillColor(...BRGB());doc.rect(0,0,W,6,"F");await pdfLogo(doc,W-M,10,50,22);
  doc.setFont("helvetica","bold");doc.setFontSize(9);doc.text(clean(co.name.toUpperCase()),M,y);y+=8;doc.setFontSize(18);doc.text("Day work sheet",M,y);y+=7;
  doc.setFontSize(11);doc.text(clean(site),M,y);y+=5;doc.setFont("helvetica","normal");doc.setFontSize(9.5);if(c){doc.text(clean("Client: "+c.name+(clAddr(c)?", "+clAddr(c):"")),M,y);y+=5}
  doc.text(clean("Printed "+new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})),M,y);y+=8;
  const cols=[M,M+22,M+120,M+150];doc.setFillColor(240,234,234);doc.rect(M,y-4.5,W-2*M,7,"F");doc.setFont("helvetica","bold");doc.text("Date",cols[0]+1,y);doc.text("Description",cols[1],y);doc.text("Hrs/Qty",cols[2],y);doc.text("Amount",W-M-1,y,{align:"right"});y+=6;doc.setFont("helvetica","normal");
  let tot=0,th=0;items.slice().sort((a,b)=>(a.date||"").localeCompare(b.date||"")).forEach(e=>{const desc=(showSite?(e.job||e.site||"No site")+" - ":"")+(e.line?e.desc+(e.unit?" ("+e.qty+" "+e.unit+" @ "+gbp(e.rate)+")":" (@ "+gbp(e.rate)+")"):nameOf(e.who)+": "+(e.task||"")+(e.mats?" - materials: "+e.mats:""));
    const lines=doc.splitTextToSize(clean(desc),94);if(y+lines.length*4.4>275){doc.addPage();y=18}const m=money(e);tot+=m;if(!e.line)th+=+e.hours||0;
    doc.text(clean(shortDay(e.date||"")),cols[0]+1,y);lines.forEach((l,i)=>doc.text(l,cols[1],y+i*4.4));doc.text(clean(e.line?String(e.qty):hrs(e.hours)),cols[2],y);doc.text(clean(gbp(m)),W-M-1,y,{align:"right"});y+=lines.length*4.4+2;doc.setDrawColor(225);doc.line(M,y-2.5,W-M,y-2.5)});
  y+=3;doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text(clean("Labour hours: "+hrs(th)),M,y);doc.text(clean("Total: "+gbp(tot)+" (plus VAT if applicable)"),W-M-1,y,{align:"right"});y+=16;
  doc.setFont("helvetica","normal");doc.setFontSize(9.5);doc.text("Client signature: ____________________________     Date: ______________",M,y);
  const fn=clean(site).replace(/[^\w\s-]/g,"").trim()+" day work "+iso(new Date())+".pdf";try{await S.dl.save({filename:fn,data:doc.output("blob")})}catch(e){if(!(e&&e.code==="declined"))toast("Download didn't go through")}}
async function dwSendSign(site,items,money){const c=siteClient(site);if(!c)return;const tot=items.reduce((a,e)=>a+money(e),0);
  const details=items.slice().sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(e=>`${shortDay(e.date||"")}: ${e.line?e.desc+" ("+e.qty+(e.unit?" "+e.unit:"")+")":nameOf(e.who)+", "+(e.task||"")+" ("+hrs(e.hours)+" h)"} – ${gbp(money(e))}`).join("\n");
  openSheet(`<h3 id="sheettitle">✍ Send day work to ${esc(c.name)}</h3><div class="who">They'll see this in their portal under Sign-offs and can sign to agree it.</div>
    <label for="ds-t">Title<input id="ds-t" maxlength="100" value="${esc("Day work: "+site+" ("+new Date().toLocaleDateString("en-GB",{month:"long",year:"numeric"})+")")}"></label>
    <label for="ds-d">Details<textarea id="ds-d" style="min-height:140px">${esc(details)}</textarea></label><label for="ds-a">Total £<input id="ds-a" inputmode="decimal" value="${tot.toFixed(2)}"></label>
    ${formFoot(false,"Send to sign")}`,async()=>{$("f-save").disabled=true;try{const src=ptSrc(c);await src.addSign(newId(),{kind:"variation",title:$("ds-t").value.trim()||"Day work",details:$("ds-d").value.trim(),amount:$("ds-a").value.replace(/[£,\s]/g,""),vat:"",statement:"I agree this day work and the cost shown.",docIds:[],status:"open",created:Date.now()});await src.bump();
      closeForm();toast(src.linked?"Sent to "+c.name+" to sign":"Ready for "+c.name+" to sign when they join")}catch(e){showErr("Couldn't send. Check your connection.");$("f-save").disabled=false}},"ds-t")}

/* owner: pick who an entry is for, then open the right form */
function pickPersonFor(type){const ids=teamIds();
  openSheet(`<h3 id="sheettitle">${type==="job"?"🧱 Add day work":"📅 Add a timesheet day"}: who is it for?</h3>
    <div class="seg pplgrp" id="pp-who"><button type="button" data-v="${esc(S.me)}">🙋 Me (${esc(S.ownerName||"James")})</button>${Object.entries(EMP_TYPES).concat([["","Not set yet"]]).map(([r,l])=>{const xs=ids.filter(id=>(EMP_TYPES[empTypeOf(id)]?empTypeOf(id):"")===r);return xs.length?`<span class="pplh">${esc(l)}</span>`+xs.map(id=>`<button type="button" data-v="${esc(id)}">${esc(nameOf(id))}</button>`).join(""):""}).join("")}</div>
    <div class="formactions"><span></span><button type="button" class="btn" id="f-cancel">Cancel</button></div>`,()=>{},null);
  $("pp-who").querySelectorAll("button").forEach(b=>b.onclick=()=>{const w=b.dataset.v;closeForm();openEntry(type,null,w===S.me?null:w)})}

/* trade (and owner's "My forms"): own day work sheet with their details */
function myDayworkView(){const today=iso(new Date());if(!S.f.tsm)S.f.tsm=today.slice(0,7);const ym=S.f.tsm;const d=myDetails()||{};
  const ents=S.mine.entries.filter(e=>(e.date||"").slice(0,7)===ym&&!e.forName);
  $("main").innerHTML=`<div class="card ppcard"><div class="pphead">${avatarHtml(S.me,60,myName())}<div style="flex:1"><b style="font-size:17px">${esc(myName())}</b>
      <div class="who">${esc([EMP_TYPES[d.empType]||"",d.trade||""].filter(Boolean).join(" · ")||"Add your trade in your details")}</div>${d.mobile?`<div class="who">📞 ${esc(d.mobile)}</div>`:""}${d.company?`<div class="who">🏢 ${esc(d.company)}</div>`:""}</div>
      <button type="button" class="pillbtn" id="mdw-det">✎ My details</button></div></div>
    <div class="actions"><button class="btn primary" id="mdw-add" type="button">🧱 + Add day work</button></div>`+dwTradeSheet(ym,ents);
  $("mdw-add").onclick=()=>openEntry("job");$("mdw-det").onclick=()=>openDetails();
  const mv=n=>{const [y,m]=S.f.tsm.split("-").map(Number);const dd=new Date(y,m-1+n,1);S.f.tsm=dd.getFullYear()+"-"+String(dd.getMonth()+1).padStart(2,"0");render()};
  const q=c=>$("main").querySelector(c);if(q(".ts-prev"))q(".ts-prev").onclick=()=>mv(-1);if(q(".ts-next"))q(".ts-next").onclick=()=>mv(1);
  $("main").querySelectorAll(".dwt-row").forEach(r=>r.onclick=()=>{const e=S.mine.entries.find(x=>x.id===r.dataset.id);if(!e)return;if(e.billed||(e.approved&&!ownerMode()&&!S.preview)){toast("This has been approved or billed. Ask James if it needs changing.");return}openEntry("job",e)})}

