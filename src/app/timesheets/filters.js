/* ===== Person + site filter drop-downs (Timesheets and Day work) ===== */
const fltNorm=t=>String(t||"").trim().toLowerCase();
const fltSiteOk=e=>!S.f.fltSite||fltNorm(e.job||e.site)===S.f.fltSite;
const fltWhos=()=>Array.isArray(S.f.fltWho)?S.f.fltWho:(S.f.fltWho?[S.f.fltWho]:[]);
const fltWhoOk=id=>{const w=fltWhos();return !w.length||w.includes(id)};
const fltWhoLabel=()=>{const w=fltWhos();return !w.length?"Everyone":w.length<=2?w.map(nameOf).join(", "):w.length+" people"};
function fltBar(people,sites){const ws=fltWhos(),st=S.f.fltSite||"";
  const ps=[...new Set(people)].sort((a,b)=>nameOf(a).localeCompare(nameOf(b)));ws.forEach(id=>{if(!ps.includes(id))ps.unshift(id)});
  const sm={};sites.forEach(x=>{const t=String(x||"").trim();if(t&&liveSite(t)&&!sm[fltNorm(t)])sm[fltNorm(t)]=t});if(st&&!sm[st])sm[st]=st;
  return `<div class="fltbar"><div class="fltlab"><span>👷 People</span><details class="fltdd" id="flt-who"><summary>${esc(fltWhoLabel())}</summary><div class="fltmenu">
      <label class="fltopt"><input type="checkbox" id="flt-all" ${ws.length?"":"checked"}> <b>Everyone</b></label>
      ${ps.map(id=>`<label class="fltopt"><input type="checkbox" class="flt-p" value="${esc(id)}" ${ws.includes(id)?"checked":""}> ${esc(nameOf(id))}</label>`).join("")}
      <button type="button" class="btn primary" id="flt-done">Done</button></div></details></div>
    <label for="flt-site"><span>🏠 Site</span><select id="flt-site"><option value="">All sites</option>${Object.keys(sm).sort((a,b)=>sm[a].localeCompare(sm[b])).map(k=>`<option value="${esc(k)}" ${st===k?"selected":""}>${esc(sm[k])}</option>`).join("")}</select></label>
    ${ws.length||st?`<button type="button" class="pillbtn" id="flt-clear">✕ Clear</button>`:""}</div>`}
function wireFlt(){const a=$("flt-who"),b=$("flt-site"),c=$("flt-clear");
  if(a){const all=$("flt-all"),ps=[...a.querySelectorAll(".flt-p")];const sum=a.querySelector("summary");
    const cur=()=>ps.filter(x=>x.checked).map(x=>x.value);
    const lab=()=>{const w=cur();sum.textContent=!w.length?"Everyone":w.length<=2?w.map(nameOf).join(", "):w.length+" people"};
    all.onchange=()=>{if(all.checked)ps.forEach(x=>x.checked=false);else if(!cur().length)all.checked=true;lab()};
    ps.forEach(x=>x.onchange=()=>{all.checked=!cur().length;lab()});
    const apply=()=>{const w=cur();if(JSON.stringify(w)!==JSON.stringify(fltWhos())){S.f.fltWho=w;render()}};
    a.addEventListener("toggle",()=>{if(!a.open)apply()});$("flt-done").onclick=()=>{a.open=false;apply()};
    document.addEventListener("click",function out(ev){if(!document.body.contains(a)){document.removeEventListener("click",out);return}if(a.open&&!a.contains(ev.target))a.open=false})}if(b)b.onchange=()=>{S.f.fltSite=b.value;render()};if(c)c.onclick=()=>{S.f.fltWho="";S.f.fltSite="";render()}}

