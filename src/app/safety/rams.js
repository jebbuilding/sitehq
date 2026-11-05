/* ================= RISK ASSESSMENTS / RAMS (from James's CDM 2015 pack, 4.1) ================= */
const RA_HAZARDS=[["Work at height (scaffold, roof, loft)","Scaffold by competent erector, inspected every 7 days; edge protection; no ladders as workplaces except short-duration"],
 ["Excavations / foundations","Services scanned; sides battered or supported; barriers; inspected each shift"],
 ["Structural alterations / temporary works","Engineer's design; props installed before removal; temporary works coordinator named"],
 ["Asbestos","Survey before work; stop work if suspected material found; licensed contractor where needed"],
 ["Silica dust (cutting, chasing)","Water suppression or on-tool extraction; FFP3 masks, face-fit tested"],
 ["Manual handling (blocks, steel, plasterboard)","Mechanical aids; team lifts; lighter blocks where possible"],
 ["Electricity","110V tools; RCD; existing circuits isolated by electrician"],
 ["Plant and vehicles (mini digger, dumper)","Trained operators; banksman; segregation; daily checks"],
 ["Fire (hot works, waste)","Hot work permit; extinguisher at point of work; 1-hour fire watch"],
 ["Occupied home / members of public","Segregation; secure site each night; briefing for residents"],
 ["Noise and vibration (HAVS)","Low-vibration tools; time limits; hearing protection"]];
const RA_WHO=["Operatives","Client and family","Neighbours","Public"];
const RA_PPE=["Hard hat","Hi-vis","Safety boots","Gloves","Eye protection","Ear protection","FFP3 dust mask","Harness"];
const RA_PERMITS=["None","Hot work","Permit to dig","Other"];
const raOf=list=>(list||[]).filter(x=>x.type==="ra");
const raScore=r=>(+r.l||0)*(+r.s||0);
const raBand=n=>!n?"":n<=2?"Low":n<=4?"Medium":"High";
function raAll(owner){return (owner?allTeam("signoffs"):S.mine.signoffs.map(x=>Object.assign({who:S.me},x))).filter(x=>x.type==="ra").sort((a,b)=>(b.created||0)-(a.created||0))}
function raBlock(owner){
  const list=raAll(owner);
  return `<div class="day"><div class="dayh"><span>Risk assessments &amp; method statements</span><span class="sum">${list.length}</span></div>
    <div class="who">One per activity, e.g. "Blockwork to first floor" or "Steel beam installation". Based on JEB's CDM 2015 RAMS template.</div>
    <div class="actions"><button class="btn primary" id="ra-new" type="button">+ New risk assessment</button></div>
    ${list.map(r=>{const hi=(r.rows||[]).some(x=>raScore(x)>=6&&x.res==="High");
      return `<button type="button" class="incrow rarow" data-r="${esc(r.id)}" data-w="${esc(r.who)}" style="border-left-color:${hi?"#c2410c":"var(--brand)"}"><span><b>${esc(r.activity)}</b>${r.reviewedAt?' <span class="tag ok">Reviewed</span>':owner?' <span class="tag day">To review</span>':""}${hi?' <span class="tag bad">High risk</span>':""}
      <br><span class="who">${esc(r.site||"")} · ${esc(r.preparedBy||nameOf(r.who))} · ${esc(shortDay(r.date))} · ${(r.rows||[]).length} hazard${(r.rows||[]).length===1?"":"s"} · ${(r.briefed||[]).length} signed</span></span><span aria-hidden="true">›</span></button>`}).join("")||'<div class="nothing">None yet.</div>'}</div>`;
}
function wireRa(owner){
  if(!$("ra-new")) return; const list=raAll(owner);
  $("ra-new").onclick=()=>openRaForm(null);
  $("main").querySelectorAll(".rarow").forEach(b=>b.onclick=()=>{const r=list.find(x=>x.id===b.dataset.r&&x.who===b.dataset.w);if(r)viewRa(r,owner)});
}
function openRaForm(base){
  const r=base?JSON.parse(JSON.stringify(base)):{rows:[],atRisk:["Operatives"],ppe:["Hard hat","Hi-vis","Safety boots","Gloves"],permit:"None",method:{prep:"",seq:"",checks:"",finish:""}};
  if(!r.rows.length) r.rows=[{h:"",who:"Operatives",l:2,s:2,c:"",res:"Low"}];
  const me=(S.myProfile&&S.myProfile.name)||S.ownerName||"";
  const tick=(id,opts,sel)=>`<div class="seg" id="${id}">${opts.map(o=>`<button type="button" data-v="${esc(o)}" aria-pressed="${(sel||[]).includes(o)}">${esc(o)}</button>`).join("")}</div>`;
  openSheet(`<h3 id="sheettitle">${base&&base.id?"Copy of risk assessment":"New risk assessment"}</h3>
    <label for="ra-act">Activity<input id="ra-act" required maxlength="120" value="${esc(r.activity||"")}" placeholder="e.g. Blockwork to first floor"></label>
    ${pickField("ra-site","Project / address",siteNames(),r.site||lastOf(S.mine.entries,()=>true,"job"),"e.g. 12 Marine Way, Exmouth")}
    <div class="grid2"><label for="ra-by">Prepared by<input id="ra-by" maxlength="80" value="${esc(me)}"></label><label for="ra-date">Date<input id="ra-date" type="date" value="${iso(new Date())}"></label></div>
    <div><div class="flabel">Persons at risk</div>${tick("ra-who",RA_WHO,r.atRisk)}</div>
    <label for="ra-plant">Plant, tools and equipment<input id="ra-plant" maxlength="300" value="${esc(r.plant||"")}" placeholder="e.g. Mixer, block splitter, scaffold"></label>
    <label for="ra-coshh">Materials / COSHH substances<input id="ra-coshh" maxlength="300" value="${esc(r.coshh||"")}" placeholder="e.g. Cement, mortar plasticiser"></label>
    <div><div class="flabel">PPE required</div>${tick("ra-ppe",RA_PPE,r.ppe)}</div>
    <label for="ra-train">Training / cards required<input id="ra-train" maxlength="200" value="${esc(r.training||"")}" placeholder="e.g. CSCS, PASMA for towers"></label>
    <div><div class="flabel">Permits needed</div><div class="seg" id="ra-permit">${RA_PERMITS.map(o=>`<button type="button" data-v="${o}" aria-pressed="${r.permit===o}">${o}</button>`).join("")}</div></div>
    <div><div class="flabel">Risk assessment</div><div class="who">Rate likelihood (L) and severity (S) from 1 (low) to 3 (high). Risk = L × S: 1–2 low, 3–4 medium, 6–9 high (do not start until reduced).</div>
      <div id="ra-rows"></div>
      <div class="actions" style="margin-top:6px"><select id="ra-lib" aria-label="Add a common hazard"><option value="">+ Add a common hazard…</option>${RA_HAZARDS.map(([h],i)=>`<option value="${i}">${esc(h)}</option>`).join("")}</select><button type="button" class="pillbtn" id="ra-addrow">+ Add your own hazard</button></div></div>
    <div><div class="flabel">Method statement (step by step)</div>
      <label for="ra-m1">Preparation and site set-up<textarea id="ra-m1" maxlength="2000">${esc(r.method.prep||"")}</textarea></label>
      <label for="ra-m2">Sequence of work<textarea id="ra-m2" maxlength="3000" style="min-height:110px">${esc(r.method.seq||"")}</textarea></label>
      <label for="ra-m3">Inspection / checks during work<textarea id="ra-m3" maxlength="2000">${esc(r.method.checks||"")}</textarea></label>
      <label for="ra-m4">Completion, clear-up and handover<textarea id="ra-m4" maxlength="2000">${esc(r.method.finish||"")}</textarea></label></div>
    <label for="ra-em">Emergency / rescue arrangements<textarea id="ra-em" maxlength="1000" placeholder="e.g. Nearest A&E: Royal Devon and Exeter, Barrack Rd. First aider: …">${esc(r.emergency||"")}</textarea></label>
    <div class="who">After saving you can get the team to sign the briefing record on your phone.</div>
    ${formFoot(false,"Save risk assessment")}`,async()=>{
      readRows();
      const d={type:"ra",activity:$("ra-act").value.trim(),site:pickVal("ra-site"),preparedBy:$("ra-by").value.trim(),date:$("ra-date").value,
        atRisk:[...$("ra-who").querySelectorAll('[aria-pressed="true"]')].map(b=>b.dataset.v),plant:$("ra-plant").value.trim(),coshh:$("ra-coshh").value.trim(),
        ppe:[...$("ra-ppe").querySelectorAll('[aria-pressed="true"]')].map(b=>b.dataset.v),training:$("ra-train").value.trim(),permit:($("ra-permit").querySelector('[aria-pressed="true"]')||{dataset:{v:"None"}}).dataset.v,
        rows:r.rows.filter(x=>x.h.trim()).map(x=>({h:x.h.trim(),who:x.who,l:+x.l,s:+x.s,c:x.c.trim(),res:x.res})),
        method:{prep:$("ra-m1").value.trim(),seq:$("ra-m2").value.trim(),checks:$("ra-m3").value.trim(),finish:$("ra-m4").value.trim()},emergency:$("ra-em").value.trim(),briefed:[],created:Date.now()};
      if(!d.activity){showErr("Say what the activity is.");return}
      if(!d.site){showErr("Choose the project or address.");return}
      if(!d.rows.length){showErr("Add at least one hazard.");return}
      const nc=d.rows.find(x=>!x.c); if(nc){showErr(`Add the control measures for "${nc.h}".`);return}
      const hi=d.rows.find(x=>x.res==="High"); if(hi&&!confirmHigh){confirmHigh=true;showErr(`"${hi.h}" is still high risk after controls. Work must not start until it's reduced. Tap Save again to save it anyway.`);return}
      $("f-save").disabled=true;
      try{const id="ra-"+newId();const rr=await submitJob({coll:"signoffs",docId:id,data:d});closeForm();toast(rr==="queued"?"Saved on this phone. It sends when you have signal.":"Risk assessment saved");render();
        if(rr!=="queued") setTimeout(()=>{const x=raAll(ownerMode()).find(y=>y.id===id);if(x)viewRa(x,ownerMode())},500)}
      catch(e){showErr("Couldn't save. Check your connection.");$("f-save").disabled=false}
    },"ra-act");
  let confirmHigh=false;
  const readRows=()=>$("ra-rows").querySelectorAll(".rarow2").forEach(el=>{const x=r.rows[+el.dataset.i];x.h=el.querySelector(".rh").value;x.who=el.querySelector(".rw").value;x.l=el.querySelector(".rl").value;x.s=el.querySelector(".rs").value;x.c=el.querySelector(".rc").value;x.res=el.querySelector(".rres").value});
  const draw=()=>{$("ra-rows").innerHTML=r.rows.map((x,i)=>{const sc=raScore(x);return `<div class="rarow2" data-i="${i}">
      <div class="rahead"><input class="rh" maxlength="120" value="${esc(x.h)}" placeholder="Hazard" aria-label="Hazard ${i+1}"><button type="button" class="linkdanger rx" aria-label="Remove hazard ${i+1}">✕</button></div>
      <div class="grid3"><label>Who could be harmed<select class="rw">${RA_WHO.concat(["Everyone on site"]).map(o=>`<option ${o===x.who?"selected":""}>${o}</option>`).join("")}</select></label>
        <label>L<select class="rl">${[1,2,3].map(n=>`<option ${+x.l===n?"selected":""}>${n}</option>`).join("")}</select></label>
        <label>S<select class="rs">${[1,2,3].map(n=>`<option ${+x.s===n?"selected":""}>${n}</option>`).join("")}</select></label></div>
      <div class="rascore r-${raBand(sc).toLowerCase()}">Risk ${sc} · ${raBand(sc)}${sc>=6?" · do not start until reduced":""}</div>
      <label>Control measures<textarea class="rc" maxlength="1000">${esc(x.c)}</textarea></label>
      <label>Residual risk (after controls)<select class="rres">${["Low","Medium","High"].map(o=>`<option ${o===x.res?"selected":""}>${o}</option>`).join("")}</select></label></div>`}).join("");
    $("ra-rows").querySelectorAll(".rarow2").forEach(el=>{const i=+el.dataset.i;
      el.querySelectorAll(".rl,.rs").forEach(s=>s.onchange=()=>{readRows();draw()});
      el.querySelector(".rx").onclick=()=>{readRows();r.rows.splice(i,1);if(!r.rows.length)r.rows.push({h:"",who:"Operatives",l:2,s:2,c:"",res:"Low"});draw()}})};
  draw();
  $("ra-lib").onchange=e=>{const i=e.target.value;if(i==="")return;readRows();const [h,c]=RA_HAZARDS[+i];const blank=r.rows.findIndex(x=>!x.h.trim()&&!x.c.trim());const row={h,who:"Operatives",l:2,s:3,c,res:"Low"};if(blank>=0)r.rows[blank]=row;else r.rows.push(row);e.target.value="";draw()};
  $("ra-addrow").onclick=()=>{readRows();r.rows.push({h:"",who:"Operatives",l:2,s:2,c:"",res:"Low"});draw();const hs=$("ra-rows").querySelectorAll(".rh");hs[hs.length-1].focus()};
  ["ra-who","ra-ppe"].forEach(g=>$(g).querySelectorAll("button").forEach(b=>b.onclick=()=>b.setAttribute("aria-pressed",String(b.getAttribute("aria-pressed")!=="true"))));
  $("ra-permit").querySelectorAll("button").forEach(b=>b.onclick=()=>$("ra-permit").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))));
}
function raPath(r){return "sheets/"+r.who+"/signoffs/"+r.id}
function viewRa(r,owner){
  const rows=[["Project / address",r.site],["Prepared by / date",[r.preparedBy,shortDay(r.date)].filter(Boolean).join(" · ")],["Reviewed by PC / date",r.reviewedAt?`${r.reviewedBy||"James Bray"} · ${stamp(r.reviewedAt)}`:"Not yet"],["Persons at risk",(r.atRisk||[]).join(", ")],["Plant, tools and equipment",r.plant],["Materials / COSHH",r.coshh],["PPE required",(r.ppe||[]).join(", ")],["Training / cards",r.training],["Permits needed",r.permit]].filter(x=>x[1]);
  const m=r.method||{};
  openViewer(`<span class="tag">Risk assessment &amp; method statement</span><h3 style="font-family:var(--f-display);font-size:22px;margin:6px 0 6px;color:var(--accent);text-transform:uppercase">${esc(r.activity)}</h3>
    <div class="details">${rows.map(([l,v])=>`<div class="drow"><span>${esc(l)}</span><span>${esc(v)}</span></div>`).join("")}</div>
    <div class="flabel" style="margin-top:12px">Risk assessment</div>
    ${(r.rows||[]).map(x=>{const sc=raScore(x);return `<div class="raview"><b>${esc(x.h)}</b><div class="who">Who: ${esc(x.who)} · L${x.l} × S${x.s} = <span class="rascore r-${raBand(sc).toLowerCase()}">${sc} ${raBand(sc)}</span> → residual <b>${esc(x.res)}</b></div><div>${esc(x.c)}</div></div>`}).join("")}
    ${[["Preparation and site set-up",m.prep],["Sequence of work",m.seq],["Inspection / checks during work",m.checks],["Completion, clear-up and handover",m.finish],["Emergency / rescue arrangements",r.emergency]].filter(x=>x[1]).map(([l,v])=>`<div class="flabel" style="margin-top:10px">${esc(l)}</div><div class="talkbody pnotes">${esc(v)}</div>`).join("")}
    <div class="flabel" style="margin-top:12px">Briefing record (${(r.briefed||[]).length})</div>
    ${(r.briefed||[]).map(b=>`<div class="citem"><span><b>${esc(b.name)}</b>${b.company?" · "+esc(b.company):""}<br><span class="who">${stamp(b.at)}</span></span><img src="${esc(b.sig)}" alt="Signature of ${esc(b.name)}" style="height:38px;background:#fff;border-radius:4px"></div>`).join("")||'<div class="nothing">Nobody has signed yet.</div>'}
    <div class="actions" style="margin-top:12px"><button class="btn primary" id="rv-brief" type="button">Brief the team and sign</button><button class="btn" id="rv-pdf" type="button">Download PDF</button><button class="btn" id="rv-copy" type="button">Use as a starting point</button>
      ${owner&&!r.reviewedAt?`<button class="btn" id="rv-review" type="button">Mark as reviewed</button>`:""}${r.who===S.me||owner?`<button class="linkdanger" id="rv-del" type="button">Delete</button>`:""}</div>`);
  $("rv-brief").onclick=()=>{closeViewer();openRaBrief(r,owner)};
  $("rv-pdf").onclick=()=>raPdf(r);
  $("rv-copy").onclick=()=>{closeViewer();const c=JSON.parse(JSON.stringify(r));delete c.id;delete c.who;c.briefed=[];c.reviewedAt=null;c.activity=c.activity;c.id="copy";openRaForm(c)};
  if($("rv-review")) $("rv-review").onclick=async()=>{try{await S.db.doc(raPath(r)).update({reviewedAt:Date.now(),reviewedBy:S.ownerName||"James Bray"});closeViewer();toast("Marked as reviewed")}catch(e){toast("Couldn't save")}};
  const del=$("rv-del"); if(del){let a=false;del.onclick=async()=>{if(!a){a=true;del.textContent="Tap again to delete";return}try{await S.db.doc(raPath(r)).delete();closeViewer();toast("Deleted");render()}catch(e){toast("Couldn't delete")}}}
}
function openRaBrief(r,owner){
  openSheet(`<h3 id="sheettitle">Briefing: ${esc(r.activity)}</h3>
    <div class="notice" style="margin:0">Go through the risk assessment and method statement with each person. Then hand them the phone to sign. After each signature the form clears for the next person.</div>
    <div class="grid2"><label for="rb-name">Name<input id="rb-name" maxlength="80" required></label><label for="rb-co">Company<input id="rb-co" maxlength="80" value="${esc(coData().name)}"></label></div>${meBtn("rb-me")}
    <label class="inl" style="font-size:15px;color:var(--ink);font-weight:500;white-space:normal"><input type="checkbox" id="rb-ok"> I have been briefed on this risk assessment and method statement, I understand it and will follow it.</label>
    <div><div class="checkhead"><span class="flabel" style="margin:0">Sign with your finger</span><button type="button" class="pillbtn" id="rb-clear">Clear</button></div><canvas id="rb-sig" class="sigpad" aria-label="Signature box"></canvas></div>
    <div class="who" id="rb-done">${(r.briefed||[]).length} signed so far.</div>
    <div class="formactions"><span></span><button type="button" class="btn" id="f-cancel">Finished</button><button type="button" class="btn primary" id="rb-save">Save signature</button></div>`,()=>{},"rb-name");
  const sig=sigPad($("rb-sig")); $("rb-clear").onclick=()=>sig.clear();
  if($("rb-me"))$("rb-me").onclick=()=>{const m=meInfo();$("rb-name").value=m.name;$("rb-co").value=m.company||coData().name};
  $("rb-save").onclick=async()=>{const name=$("rb-name").value.trim();
    if(!name){showErr("Type the person's name.");return} if(!$("rb-ok").checked){showErr("Tick the box to confirm they've been briefed.");return} if(!sig.drawn){showErr("Sign in the box.");return}
    const b={name,company:$("rb-co").value.trim(),sig:sig.data(),at:Date.now()}; r.briefed=(r.briefed||[]).concat([b]);
    $("rb-save").disabled=true;
    try{await S.db.doc(raPath(r)).update({briefed:r.briefed});toast(name+" signed");$("rb-name").value="";$("rb-ok").checked=false;sig.clear();$("rb-done").textContent=r.briefed.length+" signed so far.";$("rb-name").focus()}
    catch(e){r.briefed.pop();showErr("Couldn't save. Check your connection.")}
    $("rb-save").disabled=false};
}
async function raPdf(r){
  if(!S.dl){toast("Downloads only work when the page is opened in claude.ai");return}
  toast("Making the PDF…"); try{await loadJsPdf()}catch(e){toast("Couldn't load the PDF maker. Check your connection.");return}
  const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4"}); const W=210,M=14; let y=18;
  const clean=t=>String(t||"").replace(/[–—]/g,"-").replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/×/g,"x").replace(/[^\x09\x0A\x0D\x20-\x7E£·•°]/g,"");
  const need=h=>{if(y+h>284){doc.addPage();y=16}};
  const text=(t,size=10,style="normal",indent=0,gap=1.5)=>{doc.setFont("helvetica",style);doc.setFontSize(size);doc.splitTextToSize(clean(t),W-2*M-indent).forEach(l=>{need(size*0.45);doc.text(l,M+indent,y);y+=size*0.42});y+=gap};
  doc.setFillColor(...BRGB());doc.rect(0,0,W,6,"F");
  await pdfLogo(doc,W-M,10,50,23);
  text("JEB BUILDING SERVICES",9,"bold",0,6);text("Risk assessment & method statement",16,"bold",0,2);text(r.activity,12,"bold",0,4);
  const kv=(l,v)=>{if(!v)return;doc.setFont("helvetica","bold");doc.setFontSize(9);need(6);doc.text(clean(l),M,y);doc.setFont("helvetica","normal");doc.splitTextToSize(clean(v),W-2*M-55).forEach((ln,i)=>{if(i)need(5);doc.text(ln,M+55,y);y+=4.2});y+=1.2};
  kv("Project / address",r.site);kv("Prepared by / date",[r.preparedBy,r.date].filter(Boolean).join(" / "));kv("Reviewed by PC / date",r.reviewedAt?(r.reviewedBy||"James Bray")+" / "+stamp(r.reviewedAt):"Not yet reviewed");
  kv("Persons at risk",(r.atRisk||[]).join(", "));kv("Plant, tools and equipment",r.plant);kv("Materials / COSHH",r.coshh);kv("PPE required",(r.ppe||[]).join(", "));kv("Training / cards",r.training);kv("Permits needed",r.permit);
  y+=2;text("Risk assessment",11,"bold",0,1);text("Likelihood (L) and severity (S) 1-3. Risk = L x S: 1-2 low, 3-4 medium, 6-9 high (do not start until reduced).",8.5,"normal",0,2);
  const cols=[["Hazard",42],["Who",24],["L",7],["S",7],["Risk",14],["Control measures",68],["Residual",20]];
  const hdr=()=>{let x=M;doc.setFont("helvetica","bold");doc.setFontSize(8.5);doc.setFillColor(240,232,232);doc.rect(M,y-4,W-2*M,6,"F");cols.forEach(([c,w])=>{doc.text(c,x+1,y);x+=w});y+=4};
  need(12);hdr();
  (r.rows||[]).forEach(row=>{doc.setFont("helvetica","normal");doc.setFontSize(8.5);const sc=raScore(row);
    const cells=[row.h,row.who,String(row.l),String(row.s),sc+" "+raBand(sc),row.c,row.res];const lines=cells.map((c,i)=>doc.splitTextToSize(clean(c),cols[i][1]-2));const h=Math.max(...lines.map(l=>l.length))*3.7+2;
    if(y+h>284){doc.addPage();y=16;hdr()} let x=M;lines.forEach((l,i)=>{doc.text(l,x+1,y+2.6);x+=cols[i][1]});doc.setDrawColor(200);doc.line(M,y+h-0.5,W-M,y+h-0.5);y+=h});
  y+=4;const m=r.method||{};text("Method statement",11,"bold",0,1.5);
  [["Preparation and site set-up",m.prep],["Sequence of work",m.seq],["Inspection / checks during work",m.checks],["Completion, clear-up and handover",m.finish]].forEach(([l,v])=>{if(!v)return;text(l,9.5,"bold",0,0.5);text(v,9.5,"normal",0,2)});
  if(r.emergency){text("Emergency / rescue arrangements",9.5,"bold",0,0.5);text(r.emergency,9.5,"normal",0,2)}
  y+=2;text("Briefing record",11,"bold",0,2);
  (r.briefed||[]).forEach(b=>{need(16);doc.setFont("helvetica","normal");doc.setFontSize(9.5);doc.text(clean(b.name),M,y+5);doc.text(clean(b.company||""),M+55,y+5);doc.text(clean(stamp(b.at)),M+150,y+5);try{doc.addImage(b.sig,"PNG",M+105,y,40,13)}catch(e){}y+=15});
  if(!(r.briefed||[]).length) text("No signatures yet.",9.5);
  try{await S.dl.save({filename:`RAMS - ${clean(r.activity).replace(/[^\w\s-]/g,"").trim()} - ${r.date||iso(new Date())}.pdf`,data:doc.output("blob")})}catch(e){if(!(e&&e.code==="declined"))toast("Download didn't go through")}
}

