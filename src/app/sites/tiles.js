/* ===== Sites: a tile for every site first, tap one to open it ===== */
function siteTiles(sites){const mon=iso(new Date()).slice(0,7);const ents=allTeam("entries"),phs=allTeam("photos");const today=iso(new Date());
  const tile=n=>{const sr=siteRec(n)||{};const c=siteClient(n);const e=ents.filter(x=>same(x.job,n));const hm=sumH(e.filter(x=>(x.date||"").startsWith(mon)),()=>true);
    const on=e.filter(x=>x.open&&x.date===today);const last=e.reduce((a,x)=>Math.max(a,x.created||0),0);const ph=phs.filter(p=>same(p.site,n)).sort((a,b)=>(b.takenAt||0)-(a.takenAt||0))[0];const img=siteFront(n);
    return `<button type="button" class="sttile" data-s="${esc(n)}" data-q="${esc([n,c&&c.name,sr.project,c&&c.work,c&&c.postcode,c&&c.phone].filter(Boolean).join(" ").toLowerCase())}">${img?`<img src="${blobUrl(img)}" alt="" loading="lazy">`:`<span class="stini">${esc(initials(n))}</span>`}<span class="sttx"><b>${esc(n)}</b>${c?`<span class="who">👤 ${esc(c.name)}${sr.project||c.work?" · "+esc(sr.project||c.work):""}</span>`:sr.project?`<span class="who">${esc(sr.project)}</span>`:""}
      <span class="stmeta">${on.length?`<span class="tag ok">${on.length} on site now</span>`:""}<span>${hrs(hm)} h this month</span>${last>1e12?`<span class="who">· last ${esc(shortDay(iso(new Date(last))))}</span>`:""}</span></span><span class="ppchev" aria-hidden="true">›</span></button>`};
  $("main").innerHTML=`<input type="search" id="st-q" class="stsearch" placeholder="🔍 Search sites and storage: address, client, job…" aria-label="Search sites" value="${esc(S.f.stq||"")}">
    <div class="flabel" style="display:flex;justify-content:space-between;align-items:center;gap:8px">Your sites (<span id="st-n">${sites.length}</span>)<button type="button" class="pillbtn" id="st-del" style="margin-left:auto">🗑 Delete sites…</button></div><div class="stgrid">${sites.map(tile).join("")}</div><div class="nothing" id="st-none" hidden>No current sites match. Check Storage below.</div>`+storageHtml();
  $("main").querySelectorAll(".sttile").forEach(b=>b.onclick=()=>{S.f.proj=b.dataset.s;S.f.projList=false;render();window.scrollTo(0,0)});wireStorage();$("st-del").onclick=deleteSitesPicker;
  const qi=$("st-q");const filt=()=>{const q=qi.value.toLowerCase().trim();S.f.stq=qi.value;let n=0;$("main").querySelectorAll(".sttile").forEach(t=>{const ok=!q||t.dataset.q.includes(q);t.hidden=!ok;if(ok)n++});$("st-n").textContent=q?n+" of "+sites.length:sites.length;$("st-none").hidden=!q||n>0;
    let an=0;$("main").querySelectorAll(".arcrow").forEach(r=>{const ok=!q||(r.dataset.q||"").includes(q);r.hidden=!ok;if(ok)an++});const box=$("main").querySelector(".arcbox");if(box){if(q&&an)box.open=true;const sm=box.querySelector(".arcmatch");if(sm)sm.textContent=q?` · ${an} match${an===1?"":"es"}`:""}};
  qi.oninput=filt;if(qi.value)filt()}

/* delete one photo: the record and the stored file */
async function photoDelete(id,who,assetId){who=who||S.me;S.db.doc("sphotos/"+who+"/p/"+id).delete().catch(()=>{});if(S.sph)S.sph.list=(S.sph.list||[]).filter(x=>!(x.id===id&&x.who===who));
  if(who===S.me&&!ownerMode())await myDoc("photos",id).delete();else await S.db.doc("sheets/"+who+"/photos/"+id).delete();
  if(who===S.me&&S.mine.photos)S.mine.photos=S.mine.photos.filter(x=>x.id!==id);else if(S.data.photos&&S.data.photos[who])S.data.photos[who]=S.data.photos[who].filter(x=>x.id!==id);
  /* the stored file is only removed for a trade's own photo that nothing else uses (James may have shared it to a client portal) */
  if(assetId&&S.assets&&!ownerMode()&&!(S.mine.photos||[]).some(x=>x.assetId===assetId))S.assets.delete(assetId).catch(()=>{})}

