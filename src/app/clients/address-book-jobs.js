/* ================= ADDRESS BOOK JOBS: every enquiry / job a client has had, and one page per job with everything from that time ================= */
const CJOBS=(()=>{
const tsOf=x=>x?(typeof x==="number"?x:Date.parse(x)||0):0;
function jobsOf(c){const P=(c.pastJobs||[]).slice().sort((a,b)=>(a.at||0)-(b.at||0));const out=[];let prevEnd=0;
  P.forEach((j,i)=>{const start=j.startAt||prevEnd||0;out.push(Object.assign({},j,{key:"p"+i,start,end:j.at||Date.now(),past:true}));prevEnd=j.at||prevEnd});
  if(c.stage!=="contact"||c.work||c.desc||c.quote)out.push({key:"cur",work:c.work||"",desc:c.desc||"",budget:c.budget||"",timescale:c.timescale||"",planning:c.planning||"",quote:c.quote||"",stage:c.stage,source:c.source||"",site:c.site||"",start:c.enqAt||prevEnd||0,end:Infinity,cur:true,at:c.enqAt||c.created});
  return out.reverse()}
const inW=(t,j)=>{t=tsOf(t);return t>=j.start&&t<j.end};
const jobTitle=j=>(j.work||"Enquiry")+(j.desc?" – "+String(j.desc).split("\n")[0].slice(0,60):"");
const jobWhen=j=>{const a=j.start?new Date(j.start):null,b=j.cur?null:new Date(j.end);const f=d=>d.toLocaleDateString("en-GB",{month:"short",year:"numeric"});return a&&j.start>0?f(a)+(b?(f(a)!==f(b)?" – "+f(b):""):" – now"):b?"to "+f(b):""};
/* the short lines under each person in the address book */
function rowJobs(c){const L=jobsOf(c);if(!L.length)return "";
  return `<div class="abjobs">${L.slice(0,4).map(j=>`<button type="button" class="abjob" data-c="${esc(c.id)}" data-j="${esc(j.key)}"><span>🔨 <b>${esc(j.work||"Enquiry")}</b>${j.desc?` <span class="who">${esc(String(j.desc).split("\n")[0].slice(0,50))}</span>`:""}</span><span class="who">${esc([jobWhen(j),j.cur?clStage(j.stage):j.stage==="lost"?"Rejected":j.stage==="done"?"Completed":clStage(j.stage),j.quote?gbp(+j.quote):""].filter(Boolean).join(" · "))} ›</span></button>`).join("")}${L.length>4?`<button type="button" class="linkbtn cl-open" data-c="${esc(c.id)}">+ ${L.length-4} more</button>`:""}</div>`}
function gather(c,j){const g={};
  g.notes=(c.notes||[]).filter(n=>!n.auto&&inW(n.at,j));g.auto=(c.notes||[]).filter(n=>n.auto&&inW(n.at,j));
  g.media=(c.media||[]).filter(m=>inW(m.at,j));g.docs=(c.docs||[]).filter(d=>inW(d.at,j));
  g.surveys=(typeof DWS!=="undefined"&&DWS.recs?DWS.recs():[]).filter(r=>r.clientId===c.id&&inW(r.created||r.at||r.updated,j));
  g.plans=clPlans(c).filter(p=>inW(p.from+"T12:00",j));
  g.samples=[];(S.samples||[]).forEach(s=>(s.log||[]).forEach(l=>{if(l.client===c.id&&l.t==="out"&&inW(l.at,j))g.samples.push({s,l})}));
  g.signs=[];(c.ptSigns||[]).forEach(x=>{if(inW(x.sentAt||x.created||x.at,j))g.signs.push({title:x.title,status:x.status,at:x.sentAt||x.created||x.at})});
  (S.mine.photos||[]).concat(S.gosheets||[]).forEach(p=>{const s=p.signSheet;if(s&&s.client===c.id&&inW(s.at,j))g.signs.push({title:s.title,status:"sheet",at:s.at,p})});
  return g}
function view(c,key){const j=jobsOf(c).find(x=>x.key===key);if(!j){viewClient(c);return}const g=gather(c,j);const addr=[String(c.address||"").replace(/\s*\n\s*/g,", "),c.postcode].filter(Boolean).join(", ");
  const sec=(t,n,body)=>n?`<div class="flabel" style="margin-top:12px">${t} (${n})</div>${body}`:"";
  const kv=[["Type of work",j.work],["Stage",j.cur?clStage(j.stage):j.stage==="done"?"Completed":j.stage==="lost"?"Rejected":clStage(j.stage)],["When",jobWhen(j)],["Estimate",j.quote?gbp(+j.quote):""],["Budget",j.budget],["Wanted by",j.timescale],["Planning",j.planning],["How they found you",j.source],["Site",j.site]].filter(x=>x[1]);
  openViewer(`<span class="tag">🔨 Job</span><h3 style="font-family:var(--f-display);font-size:24px;margin:6px 0 2px;color:var(--accent)">${esc(j.work||"Enquiry")}</h3>
    <div class="who">👤 <button type="button" class="linkbtn" id="cj-cl">${esc(c.name)}</button>${addr?" · 📍 "+esc(addr):""}${c.phone?` · <a href="tel:${esc(String(c.phone).replace(/\s+/g,""))}">${esc(c.phone)}</a>`:""}</div>
    <div class="details" style="margin-top:10px">${kv.map(([l,v])=>`<div class="drow"><span>${esc(l)}</span><span>${esc(v)}</span></div>`).join("")}</div>
    ${j.desc?`<div class="flabel" style="margin-top:12px">What they wanted</div><div class="talkbody pnotes">${esc(j.desc)}</div>`:""}
    ${sec("📝 Notes and calls",g.notes.length,g.notes.slice().reverse().map(n=>`<div class="talkbody" style="margin:4px 0"><span class="who">${esc(stamp(n.at))}</span><br>${esc(n.text)}</div>`).join(""))}
    ${sec("📷 Photos, videos &amp; sketches",g.media.length,`<div class="cjgrid">${g.media.map(m=>`<button type="button" class="cjm" data-id="${esc(m.id)}" data-k="${esc(m.kind||"photo")}">${m.kind==="video"?`<span class="cjv">🎥</span>`:m.kind==="voice"?`<span class="cjv">🎤</span>`:`<img src="${blobUrl(m.preview||m.id)}" alt="" loading="lazy">`}${m.note?`<span>${esc(m.note)}</span>`:""}</button>`).join("")}</div>`)}
    ${sec("📄 Documents",g.docs.length,g.docs.map(d=>`<button type="button" class="incrow cj-doc" data-a="${esc(d.assetId)}" data-n="${esc(d.name||"Document")}" data-t="${esc(d.type||"application/pdf")}"><span>📄 ${esc(d.name||"Document")}</span><span>›</span></button>`).join(""))}
    ${sec("🪟 Door &amp; window surveys",g.surveys.length,g.surveys.map(r=>`<button type="button" class="incrow cj-ws" data-id="${esc(r.id)}"><span>🪟 ${esc(r.title||r.name||"Survey")}<br><span class="who">${(r.items||[]).length} openings · ${esc(stamp(r.created||r.at||r.updated))}</span></span><span>›</span></button>`).join(""))}
    ${sec("✍️ Sign-offs",g.signs.length,g.signs.map(s=>`<div class="dwsrow"><span>✍️ ${esc(s.title||"Sign-off")}</span><span class="who">${s.status==="signed"?"✅ signed":s.status==="sheet"?"sheet":"waiting"} · ${esc(shortDay(iso(new Date(s.at))))}</span></div>`).join(""))}
    ${sec("📅 Visits &amp; planner",g.plans.length,g.plans.map(p=>`<div class="dwsrow"><span>📅 ${esc(p.title)}</span><span class="who">${esc(shortDay(p.from))}${p.time?" "+esc(p.time):""}</span></div>`).join(""))}
    ${sec("🎨 Samples lent",g.samples.length,g.samples.map(({s,l})=>`<div class="dwsrow"><span>🎨 ${esc(s.name)}</span><span class="who">${esc(shortDay(iso(new Date(l.at))))}${s.out&&s.out.client===c.id&&s.out.at===l.at?" · still out":" · returned"}</span></div>`).join(""))}
    ${sec("🕒 History",g.auto.length,`<div class="who">${g.auto.map(n=>esc(stamp(n.at)+" · "+n.text)).join("<br>")}</div>`)}
    ${!g.notes.length&&!g.media.length&&!g.docs.length&&!g.surveys.length&&!g.signs.length?`<div class="nothing" style="margin-top:12px">Nothing else was added during this job.</div>`:""}
    <div class="actions" style="margin-top:14px"><button type="button" class="btn" id="cj-open">👤 Open ${esc(c.name)}'s full record</button>${j.cur?`<button type="button" class="btn" id="cj-edit">✎ Edit this enquiry</button>`:""}</div>`);
  const back=()=>view((S.clients||[]).find(x=>x.id===c.id)||c,key);
  $("cj-cl").onclick=$("cj-open").onclick=()=>viewClient(c);if($("cj-edit"))$("cj-edit").onclick=()=>{closeViewer();openClientForm(c,"enquiry")};
  document.querySelectorAll(".cj-doc").forEach(b=>b.onclick=()=>openFile(b.dataset.a,b.dataset.n,b.dataset.t));
  document.querySelectorAll(".cjm").forEach(b=>b.onclick=()=>{const k=b.dataset.k;openFile(b.dataset.id,k==="video"?"Video.mp4":k==="voice"?"Voice note.m4a":"Photo.jpg",k==="video"?"video/mp4":k==="voice"?"audio/mp4":"image/jpeg")});
  document.querySelectorAll(".cj-ws").forEach(b=>b.onclick=()=>{closeViewer();try{DWS.open(DWS.recs().find(r=>r.id===b.dataset.id))}catch(e){toast("Open it from Forms")}})}
return {jobsOf,rowJobs,view};
})();
