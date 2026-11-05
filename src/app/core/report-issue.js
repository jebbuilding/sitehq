/* ================= REPORT AN ISSUE with the app ================= */
const ISS_SEV=[["stuck","I can't do my work"],["bug","Something's wrong, but I can work round it"],["idea","A suggestion"]];
const issuesAll=()=>allTeam("signoffs").filter(x=>x.type==="issue").concat(ownerMode()?[]:(S.mine.signoffs||[]).filter(x=>x.type==="issue").map(x=>Object.assign({who:S.me},x)));
function issueBadge(){const b=$("issbtn");if(!b)return;b.hidden=!S.me;const own=ownerMode();
  const n=own?issuesAll().filter(x=>x.status!=="fixed").length:0;b.querySelector(".issn").textContent=n?String(n):"";b.querySelector(".issn").hidden=!n;
  b.querySelector(".isst").textContent=own?"Issues":"Report issue"}
function tabName(k){const t=(ownerMode()?OWN_TABS:empTabs()).find(x=>x[0]===k);return t?t[1].replace(/^[^\p{L}\p{N}]+/u,""):k}
function openIssueForm(){
  const mine=(S.mine.signoffs||[]).filter(x=>x.type==="issue").sort((a,b)=>b.created-a.created);const tabs=ownerMode()?OWN_TABS:empTabs();const cur=curTab();
  openSheet(`<h3 id="sheettitle">⚠ Report a problem with the app</h3>
    <div class="who">Tell James what went wrong. It goes straight to him with your phone details so it can be fixed.</div>
    <label for="is-text">What happened?<textarea id="is-text" required maxlength="2000" style="min-height:110px" placeholder="e.g. When I tap Take photo on the Photos tab nothing happens. iPhone, Claude app."></textarea></label>
    <label for="is-where">Where in the app?<select id="is-where">${tabs.map(([k,l])=>`<option value="${k}" ${k===cur?"selected":""}>${esc(l)}</option>`).join("")}<option value="other">Somewhere else / everywhere</option></select></label>
    <fieldset class="is-sev"><legend>How bad is it?</legend>${ISS_SEV.map(([k,l],i)=>`<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="radio" name="is-sev" value="${k}" ${i===1?"checked":""}> ${esc(l)}</label>`).join("")}</fieldset>
    <label for="is-ph">Screenshots or photos (optional)<input id="is-ph" type="file" accept="image/*" multiple></label>
    <div class="who">Tip: take a screenshot of the problem first (on iPhone press the side button and volume up together), then add it here.</div>
    ${formFoot(false,ownerMode()?"Save":"Send to James")}
    ${mine.length?`<div class="flabel" style="margin-top:14px">Your reports</div>${mine.slice(0,10).map(x=>`<div class="issmine"><span class="tag ${x.status==="fixed"?"ok":""}">${x.status==="fixed"?"Fixed":x.status==="seen"?"Seen":"Sent"}</span> ${esc(String(x.text||"").slice(0,90))}<br><span class="who">${esc(stamp(x.created))}${x.reply?" · James: "+esc(x.reply):""}</span></div>`).join("")}`:""}`,async()=>{
      const text=$("is-text").value.trim();if(!text){showErr("Say what went wrong.");return}
      $("f-save").disabled=true;const now=Date.now();
      const dev=`${navigator.userAgent} · screen ${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio||1}x · ${navigator.onLine===false?"offline":"online"}`;
      const where=$("is-where").value;
      const data={type:"issue",text,where,whereLabel:where==="other"?"Somewhere else":tabName(where),sev:(document.querySelector('input[name="is-sev"]:checked')||{}).value||"bug",device:dev,name:myName(),status:"open",created:now};
      try{const files=[];for(const f of [...($("is-ph").files||[])].slice(0,6)){try{files.push({blob:await shrinkImage(f),name:"issue.jpg",field:"photos"})}catch(e){}}
        const r=await submitJob({coll:"signoffs",docId:"iss-"+newId(),data,files});closeForm();toast(r==="queued"?"Saved. It will send when you have signal.":ownerMode()?"Saved":"Sent to James. Thanks!");render()}
      catch(e){showErr(uploadErr(e));$("f-save").disabled=false}},"is-text");
}
function issueText(list){return list.map((x,i)=>`${i+1}. [${(ISS_SEV.find(s=>s[0]===x.sev)||[,""])[1]}] ${x.whereLabel||x.where||""} – reported by ${x.name||nameOf(x.who)} on ${stamp(x.created)}\n${x.text}\nDevice: ${x.device||"?"}`).join("\n\n")}
function openIssues(){
  if(!ownerMode()){openIssueForm();return}
  const f=S.f.issf||"open";const all=issuesAll().sort((a,b)=>b.created-a.created);const list=all.filter(x=>f==="all"||(f==="open"?x.status!=="fixed":x.status==="fixed"));
  openViewer(`<h3 style="margin:0 0 6px">⚠ App issues</h3>
    <div class="who">Problems your team have reported. Tap <b>Copy for Claude</b>, then paste it into your Claude chat to get them fixed.</div>
    <div class="actions"><button type="button" class="btn primary" id="iss-copy" ${list.filter(x=>x.status!=="fixed").length?"":"disabled"}>📋 Copy open issues for Claude</button><button type="button" class="btn" id="iss-new">+ Note an issue myself</button></div>
    <div class="seg" id="iss-f">${[["open","Open"],["fixed","Fixed"],["all","All"]].map(([k,l])=>`<button type="button" data-v="${k}" aria-pressed="${f===k}">${l} <span class="who">${k==="all"?all.length:k==="open"?all.filter(x=>x.status!=="fixed").length:all.filter(x=>x.status==="fixed").length}</span></button>`).join("")}</div>
    ${list.map(x=>`<div class="isscard sev-${esc(x.sev||"bug")}" data-id="${esc(x.id)}" data-w="${esc(x.who)}">
      <div><span class="tag ${x.sev==="stuck"?"bad":x.sev==="idea"?"":"day"}">${esc((ISS_SEV.find(s=>s[0]===x.sev)||[,"Problem"])[1])}</span>${x.status==="fixed"?' <span class="tag ok">Fixed</span>':x.status==="seen"?' <span class="tag">Seen</span>':""} <b>${esc(x.name||nameOf(x.who))}</b> <span class="who">· ${esc(x.whereLabel||"")} · ${esc(stamp(x.created))}</span></div>
      <div class="isstext">${esc(x.text)}</div>
      ${(x.photos||[]).length?`<div class="issph">${x.photos.map(id=>`<a href="${blobUrl(id)}" target="_blank" rel="noopener"><img src="${blobUrl(id)}" alt="Screenshot" loading="lazy"></a>`).join("")}</div>`:""}
      <details><summary class="who">Phone details</summary><div class="who" style="word-break:break-word">${esc(x.device||"")}</div></details>
      ${x.reply?`<div class="who">Your reply: ${esc(x.reply)}</div>`:""}
      <div class="actions">${x.status!=="fixed"?`<button type="button" class="pillbtn iss-fix">✓ Mark fixed</button>`:`<button type="button" class="pillbtn iss-open">Reopen</button>`}${x.who!==S.me?`<button type="button" class="pillbtn iss-reply">Reply</button>`:""}<button type="button" class="pillbtn iss-one">📋 Copy</button>${x.who===S.me?`<button type="button" class="linkdanger iss-del">Delete</button>`:""}</div></div>`).join("")||'<div class="nothing">Nothing here. 🎉</div>'}`);
  const V=$("viewer-body");const find=el=>{const c=el.closest(".isscard");return all.find(x=>x.id===c.dataset.id&&x.who===c.dataset.w)};
  const path=x=>"sheets/"+x.who+"/signoffs/"+x.id;
  const copy=async t=>{try{await navigator.clipboard.writeText(t);toast("Copied. Paste it into your Claude chat.")}catch(e){const ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand("copy")}catch(z){}ta.remove();toast(ok?"Copied. Paste it into your Claude chat.":"Couldn't copy on this phone")}};
  $("iss-copy").onclick=()=>copy("Problems reported in the SiteHQ app:\n\n"+issueText(all.filter(x=>x.status!=="fixed")));
  $("iss-new").onclick=()=>{closeViewer();openIssueForm()};
  V.querySelectorAll("#iss-f button").forEach(b=>b.onclick=()=>{S.f.issf=b.dataset.v;openIssues()});
  V.querySelectorAll(".iss-one").forEach(b=>b.onclick=()=>copy("Problem reported in the SiteHQ app:\n\n"+issueText([find(b)])));
  V.querySelectorAll(".iss-fix,.iss-open").forEach(b=>b.onclick=async()=>{const x=find(b);const st=b.classList.contains("iss-fix")?"fixed":"open";
    try{await S.db.doc(path(x)).update({status:st,fixedAt:st==="fixed"?Date.now():null});x.status=st;
      if(st==="fixed"&&x.who!==S.me)await S.db.doc("sheets/"+x.who+"/signoffs/pr-"+newId()).set({type:"prompt",form:"issuereply",ref:x.id,refLabel:String(x.text).slice(0,40),note:"Fixed: "+(x.reply||"the problem you reported has been sorted. Close and reopen the app to get the update."),status:"open",created:Date.now()});
      toast(st==="fixed"?"Marked fixed"+(x.who!==S.me?" and "+nameOf(x.who).split(" ")[0]+" has been told":""):"Reopened");render();openIssues()}catch(e){toast("Couldn't save")}});
  V.querySelectorAll(".iss-reply").forEach(b=>b.onclick=()=>{const x=find(b);closeViewer();
    openSheet(`<h3 id="sheettitle">Reply to ${esc(nameOf(x.who))}</h3><div class="who">${esc(String(x.text).slice(0,200))}</div><label for="ir-t">Message<textarea id="ir-t" maxlength="500" placeholder="e.g. Thanks, I'm getting it fixed. For now use Choose photos instead."></textarea></label>${formFoot(false,"Send")}`,async()=>{
      const t=$("ir-t").value.trim();if(!t){showErr("Write a reply");return}
      try{await S.db.doc(path(x)).update({reply:t,status:x.status==="fixed"?"fixed":"seen",repliedAt:Date.now()});await S.db.doc("sheets/"+x.who+"/signoffs/pr-"+newId()).set({type:"prompt",form:"issuereply",ref:x.id,refLabel:String(x.text).slice(0,40),note:t,status:"open",created:Date.now()});closeForm();toast("Reply sent");render();openIssues()}catch(e){showErr("Couldn't send")}},"ir-t")});
  V.querySelectorAll(".iss-del").forEach(b=>{let a=false;b.onclick=async()=>{if(!a){a=true;b.textContent="Tap again to delete";return}const x=find(b);try{await S.db.doc(path(x)).delete();render();openIssues()}catch(e){toast("Couldn't delete")}}});
  all.filter(x=>x.status==="open"&&x.who!==S.me).forEach(x=>{S.db.doc(path(x)).update({status:"seen"}).catch(()=>{})});
}

if($("issbtn"))$("issbtn").onclick=openIssues;
