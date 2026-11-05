/* ================= CHECKS ================= */
function checkCard(c0,owner,who){
  const c=ck(c0), d=defectsOf(c), K=KINDS[c.kind]||KINDS.vehicle;
  const st=c.safe===false?'<span class="tag bad">Not safe to use</span>':d.length?'<span class="tag day">Defects</span>':'<span class="tag ok">All OK</span>';
  return `<div class="entry chk" ${owner?"":`role="button" tabindex="0"`} data-c="${esc(c.id)}" data-w="${esc(who||"")}"><div class="main">
    <div class="job"><span class="tag">${K.name}</span>${st}${c.fixed?'<span class="tag ok">Fixed</span>':""}${esc(c.asset||"Not named")}${owner?` <span class="who">· ${esc(nameOf(who)+roleShort(who))}</span>`:""}</div>
    <div class="sub">${shortDay(c.date)}${c.reading?` · ${K.reading||"Reading"} ${esc(c.reading)}`:""}${d.length?` · ${esc(d.join(", "))}`:""}${c.photos&&c.photos.length?` · ${c.photos.length} photo${c.photos.length===1?"":"s"}`:""}</div>
    ${c.notes?`<div class="sub">${esc(c.notes)}</div>`:""}</div>
    ${owner&&hasProblem(c)?`<label class="inl"><input type="checkbox" class="fix" ${c.fixed?"checked":""}>Fixed</label>`:""}</div>`;
}
let checkVals={};
function openCheck(kind,c0,presetAsset){
  const c=c0?ck(c0):null, K=KINDS[kind];
  editing=c0||null; formType="check";
  checkVals=Object.assign({},c&&c.items||{});
  const last=presetAsset||lastOf(S.mine.checks.map(ck),x=>x.kind===kind,"asset");
  openSheet(`<h3 id="sheettitle">${K.name} ${K.inspect?"inspection":"check"}</h3>
    <div class="grid2"><label for="c-date">Date<input id="c-date" type="date" required value="${esc(c?c.date:iso(new Date()))}"></label>
    ${K.reading?`<label for="c-read">${K.reading}<input id="c-read" type="number" inputmode="decimal" min="0" step="any" placeholder="${kind==="digger"?"e.g. 2450":"Odometer"}" value="${esc(c?c.reading:"")}"></label>`:"<span></span>"}</div>
    ${pickField("c-asset",K.asset||(kind==="vehicle"?"Vehicle":kind==="digger"?"Digger":kind==="trailer"?"Trailer":"Machine"),[...new Set(equipOf(kind).concat(K.sites?siteNames():[]))],c?c.asset:last,K.ph)}
    <div class="checkhead"><span class="flabel" style="margin:0">Checks</span><button type="button" class="pillbtn" id="c-allok">Mark the rest OK</button></div>
    <div id="c-items">${K.items.map(([k,l])=>`<div class="citem"><span>${esc(l)}</span>
      <span class="seg" data-k="${k}"><button type="button" data-v="ok">OK</button><button type="button" data-v="defect">Defect</button><button type="button" data-v="na">N/A</button></span></div>`).join("")}</div>
    <label for="c-notes">Defects or damage (describe anything marked Defect)<textarea id="c-notes" maxlength="500">${esc(c?c.notes:"")}</textarea></label>
    ${c&&c.photos&&c.photos.length?`<div><div class="flabel">Photos already added</div><div class="thumbs">${c.photos.map(id=>`<img src="${blobUrl(id)}" alt="Defect photo">`).join("")}</div></div>`:""}
    <label for="c-photos">Photos of the defect (optional)<input id="c-photos" type="file" accept="image/*" multiple></label>
    <div><div class="flabel">Is it safe to use?</div>
      <div class="seg" id="c-safe"><button type="button" data-v="yes" aria-pressed="${c?c.safe!==false:true}">Yes</button><button type="button" data-v="no" aria-pressed="${c?c.safe===false:false}">No, don't use it</button></div></div>
    ${formFoot(!!c,"Submit check")}`,()=>saveCheck(kind),"c-asset");
  const paint=()=>$("form").querySelectorAll("#c-items .seg").forEach(sg=>sg.querySelectorAll("button").forEach(b=>{const on=checkVals[sg.dataset.k]===b.dataset.v;b.setAttribute("aria-pressed",String(on));b.classList.toggle("isdefect",on&&b.dataset.v==="defect")}));
  $("form").querySelectorAll("#c-items .seg").forEach(sg=>sg.querySelectorAll("button").forEach(b=>b.onclick=()=>{checkVals[sg.dataset.k]=b.dataset.v;paint()}));
  $("c-allok").onclick=()=>{K.items.forEach(([k])=>{if(!checkVals[k])checkVals[k]="ok"});paint()};
  $("c-safe").querySelectorAll("button").forEach(b=>b.onclick=()=>$("c-safe").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))));
  paint();
  armDelete(()=>myDoc("checks",editing.id).delete());
}
async function saveCheck(kind){
  const K=KINDS[kind];
  const missing=K.items.filter(([k])=>!checkVals[k]);
  const data={kind,date:$("c-date").value,asset:pickVal("c-asset"),reading:K.reading?$("c-read").value:"",items:Object.assign({},checkVals),
    notes:$("c-notes").value.trim(),safe:$("c-safe").querySelector('[aria-pressed="true"]').dataset.v==="yes",updated:Date.now(),fixed:false};
  if(kind==="vehicle") data.asset=data.asset.toUpperCase().startsWith(data.asset.slice(0,1).toUpperCase())?data.asset:data.asset;
  if(!data.date||!data.asset){showErr("Add the date and which "+K.name.toLowerCase()+" it is.");return}
  if(missing.length){showErr("Mark every item OK, Defect or N/A ("+missing.length+" left).");return}
  if(defectsOf(data).length&&!data.notes){showErr("Describe the defect so James knows what to fix.");return}
  const pics=[...($("c-photos").files||[])];
  if(pics.length&&!S.assets){showErr("You don't have permission to upload photos. Ask James to make you an Editor on this page.");return}
  $("f-save").disabled=true; $("f-save").textContent=pics.length?"Preparing photos…":"Submitting…";
  try{
    const files=[];
    for(const f of pics){
      const ex=readExif(await f.slice(0,262144).arrayBuffer());
      const takenAt=exifDate(ex.date)||f.lastModified||Date.now();
      try{files.push({blob:await stampPhoto(f,{site:data.asset+" – "+K.name.toLowerCase()+" defect",takenAt,lat:ex.lat??null,lon:ex.lon??null,name:S.myProfile.name}),name:"defect.jpg",field:"photos"})}
      catch(e){showErr("One photo couldn't be opened. Set your camera to save photos as JPG (\"Most Compatible\" on iPhone).");$("f-save").disabled=false;$("f-save").textContent="Submit check";return}
    }
    data.photos=editing&&editing.photos||[];
    const r=await submitJob({coll:"checks",docId:editing?editing.id:newId(),data:Object.assign({created:editing&&editing.created||Date.now()},data),files});
    S.week=monday(parse(data.date)); closeForm();
    toast(r==="queued"?"Check kept on this phone. It will send when you have signal.":hasProblem(data)?"Check submitted. James can see the defect.":"Check submitted"); render();
  }catch(err){showErr(uploadErr(err));$("f-save").disabled=false;$("f-save").textContent="Submit check"}
}

