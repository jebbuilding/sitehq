/* ================= CONTACTS (WhatsApp-style): search, then chat / call / video ================= */
function contactList(){const owner=ownerMode();const out=[];
  if(owner){teamIds().forEach(id=>{const d=(S.team[id]&&S.team[id].details)||{};out.push({key:"t:"+id,id,name:nameOf(id),sub:[EMP_TYPES[empTypeOf(id)]||"",d.trade||""].filter(Boolean).join(" · "),tel:phoneOf(id),kind:"trade"})});
    (S.clients||[]).filter(c=>c.stage!=="lost").forEach(c=>out.push({key:"c:"+c.id,c,name:c.name,sub:"Client · "+clStage(c.stage)+(clAddr(c)?" · "+clAddr(c):""),tel:c.phone||"",kind:"client",photo:c.frontPhoto||""}))}
  else{out.push({key:"o",id:(S.settings||{}).ownerId||"",name:S.ownerName||"James",sub:"Boss",tel:(S.settings||{}).ownerPhone||"",kind:"owner"});
    if((S.settings||{}).allowDm)chatPeople().filter(p=>p.id!==S.me&&p.id!==(S.settings||{}).ownerId).forEach(p=>out.push({key:"t:"+p.id,id:p.id,name:p.name,sub:"Team",tel:"",kind:"trade"}))}
  return out.sort((a,b)=>(a.kind==="owner"?-1:0)-(b.kind==="owner"?-1:0)||a.name.localeCompare(b.name))}
function contactsHtml(){const q=(S.f.ctq||"").toLowerCase();const all=contactList();const list=all.filter(x=>!q||(x.name+" "+x.sub+" "+x.tel).toLowerCase().includes(q));const apple=isApple();
  const row=x=>{const tel=String(x.tel||"").replace(/\s+/g,"");const av=x.kind==="client"?(x.photo?`<img class="pav" src="${blobUrl(x.photo)}" alt="" style="width:46px;height:46px">`:`<span class="pav pavi" style="width:46px;height:46px;font-size:17px">🏡</span>`):x.id?avatarHtml(x.id,46,x.name):`<span class="pav pavi" style="width:46px;height:46px;font-size:17px">${esc(initials(x.name))}</span>`;
    return `<div class="ctrow" data-s="${esc((x.name+" "+x.sub+" "+x.tel).toLowerCase())}">${av}<div class="ctmain"><b>${esc(x.name)}</b><span class="who">${esc(x.sub)}</span>${tel?"":`<span class="who" style="color:var(--danger)">No phone number saved</span>`}</div>
      <div class="ctbtns"><button type="button" class="ctb ct-chat" data-k="${esc(x.key)}" aria-label="Message ${esc(x.name)}" title="Message">💬</button>
      ${tel?`<a class="ctb" href="tel:${esc(tel)}" aria-label="Call ${esc(x.name)}" title="Call">📞</a><button type="button" class="ctb ct-vid" data-k="${esc(x.key)}" aria-label="Video call ${esc(x.name)}" title="Video call">🎥</button>`:""}</div></div>`};
  return `<input type="search" id="ct-q" class="ctsearch" placeholder="🔍 Search ${ownerMode()?"trades and clients":"contacts"}" value="${esc(S.f.ctq||"")}" aria-label="Search contacts">
    ${all.length?`<div class="ctlist">${all.map(row).join("")}</div><div class="nothing" id="ct-none" hidden>Nobody matches that.</div>`:`<div class="nothing">No contacts yet.</div>`}
    <div class="who" style="margin-top:10px">📞 uses your phone for a normal call. 🎥 opens ${apple?"FaceTime or ":""}WhatsApp for a video call.</div>`}
function wireContacts(){const inp=$("ct-q");const flt=()=>{const q=(S.f.ctq||"").toLowerCase().trim();let n=0;$("main").querySelectorAll(".ctrow").forEach(r=>{const ok=!q||r.dataset.s.includes(q);r.hidden=!ok;if(ok)n++});const nm=$("ct-none");if(nm)nm.hidden=n>0};
  if(inp)inp.oninput=e=>{S.f.ctq=e.target.value;flt()};
  flt();wireContactButtons()}
function wireChatSearch(){const inp=$("chq");if(!inp)return;const run=()=>{const q=inp.value.toLowerCase().trim();S.f.chq=inp.value;let n=0;
    $("main").querySelectorAll(".chatlist .chatrow").forEach(r=>{const ok=!q||(r.dataset.s||"").includes(q);r.hidden=!ok;if(ok)n++});
    const pp=$("chq-people");let m=0;if(pp){pp.hidden=!q;pp.querySelectorAll(".ctrow").forEach(r=>{const ok=!!q&&r.dataset.s.includes(q);r.hidden=!ok;if(ok)m++});if(!m)pp.hidden=true;const cn=pp.querySelector("#ct-none");if(cn)cn.hidden=true}
    const none=$("chq-none");if(none)none.hidden=!q||n+m>0};
  inp.value=S.f.chq||"";inp.oninput=run;run()}
function wireContactButtons(){const find=k=>contactList().find(x=>x.key===k);
  $("main").querySelectorAll(".ct-chat").forEach(b=>b.onclick=()=>{const x=find(b.dataset.k);if(!x)return;if(x.kind==="client")openClientChat(x.c);else if(x.id)openDM(x.id);else toast("Can't start that chat yet")});
  $("main").querySelectorAll(".ct-vid").forEach(b=>b.onclick=()=>{const x=find(b.dataset.k);if(!x)return;const tel=String(x.tel).replace(/\s+/g,"");const apple=isApple();
    openSheet(`<h3 id="sheettitle">🎥 Video call ${esc(x.name)}</h3><div class="who">Pick how to video call. ${apple?"FaceTime starts the video straight away. ":""}WhatsApp opens your chat with them: tap the camera icon at the top to start the video.</div>
      <div class="plgrid">${apple?`<a class="btn primary" href="facetime:${esc(tel)}">📹 FaceTime</a>`:""}<a class="btn ${apple?"":"primary"}" href="https://wa.me/${esc(intlNum(tel))}" target="_blank" rel="noopener">🟢 WhatsApp</a></div>
      <div class="formactions"><span></span><button type="button" class="btn" id="f-cancel">Close</button></div>`,()=>{},null)})}

/* photos already stored in the app that the person may add to a drawing */
function appPhotoChoices(){const out=[],seen=new Set();const add=(id,label,at)=>{if(!id||seen.has(id))return;seen.add(id);out.push({id,label,at:at||0})};
  if(S.client){(PT.docs||[]).filter(d=>isImg(d.contentType)).forEach(d=>add(d.assetId,d.title||"From James",d.sharedAt));return out.sort((a,b)=>b.at-a.at)}
  const own=ownerMode();const ph=own?allTeam("photos"):(S.mine.photos||[]);
  ph.filter(p=>p.assetId&&!isSketch(p)).forEach(p=>add(p.assetId,[p.site||"",p.category&&p.category!=="Other photos"?p.category:"",p.date?shortDay(p.date):""].filter(Boolean).join(" · "),p.takenAt));
  if(own){(S.clients||[]).forEach(c=>{if(c.frontPhoto)add(c.frontPhoto,c.name+" · front of house",c.updated);(c.media||[]).filter(m=>m.kind==="photo").forEach(m=>add(m.id,c.name+(m.note?" · "+m.note:""),m.at))})}
  (S.docs||[]).filter(d=>isImg(d.contentType)&&d.assetId).forEach(d=>add(d.assetId,(d.site||"General")+" · "+(d.title||""),d.created));
  (S.mine.signoffs||[]).filter(x=>x.type==="sitejob"&&!x.hidden).forEach(x=>{if(x.photo)add(x.photo,x.site+" · front",0);(x.photos||[]).filter(m=>m.kind==="photo").forEach(m=>add(m.id,x.site,0))});
  return out.sort((a,b)=>b.at-a.at).slice(0,300)}

