/* ===== 📝 RAMS maker: copy your existing Word RAMS to a new site, filling in the blanks ===== */
const RAMS_FIELDS=[["project","Project name"],["address","Site address"],["client","Client"],["planning","Planning / Building Control ref"],["prepared","Prepared by"],["datePrep","Date prepared"],["start","Start date"],["review","Review date"],["rev","Revision"],
  ["giveAs","Give the site to 999 as"],["w3w","what3words"],["hospital","Nearest A&E"],["manager","Site Manager"],["firstAid","First aider / first aid kit"],["fire","Fire extinguisher / assembly point"]];
const RAMS_LABEL={"project name":"project","site address":"address","client":"client","planning / building control ref":"planning","prepared by":"prepared","date prepared":"datePrep","start date":"start","review date":"review","revision":"rev","nearest a&e":"hospital","site manager":"manager","first aider / first aid kit":"firstAid","fire extinguisher / assembly point":"fire"};
const ukDate=d=>{if(!d)return "";const [y,m,dd]=String(d).split("-");return dd&&m&&y?`${dd}/${m}/${y}`:String(d)};
const ramsTemplates=()=>(S.docs||[]).filter(d=>d.cat==="rams"&&d.assetId&&/\.docx$/i.test(d.fileName||"")&&isWordId(d.assetId));
function ramsXmlText(el){return [...el.getElementsByTagName("w:t")].map(t=>t.textContent).join("")}
async function ramsOpen(doc){await loadZip();const blob=await assetBlob(doc.assetId);const zip=await window.JSZip.loadAsync(blob);return zip}
/* read the filled-in values out of a RAMS so we know what to swap */
async function ramsReadOld(doc){const zip=await ramsOpen(doc);const xml=await zip.file("word/document.xml").async("string");const dom=new DOMParser().parseFromString(xml,"application/xml");const old={};
  [...dom.getElementsByTagName("w:tr")].forEach(tr=>{const tcs=[...tr.getElementsByTagName("w:tc")];if(tcs.length<2)return;const lab=ramsXmlText(tcs[0]).trim().toLowerCase();const k=RAMS_LABEL[lab];if(k&&tcs.length===2&&old[k]==null)old[k]=ramsXmlText(tcs[1]).trim()});
  [...dom.getElementsByTagName("w:t")].forEach(t=>{const v=t.textContent;let m;if((m=v.match(/^Give the site as:\s*(.*)$/)))old.giveAs=m[1].trim();if((m=v.match(/^what3words:\s*\/*(.*)$/)))old.w3w=m[1].trim()});old.body=ramsXmlText(dom);return old}
function ramsSetCell(tc,val,dom){const ts=[...tc.getElementsByTagName("w:t")];if(!ts.length)return;ts[0].textContent=val;ts.slice(1).forEach(t=>{t.textContent=""});ts[0].setAttribute("xml:space","preserve")}
async function ramsMake(doc,nv,old,swaps){const zip=await ramsOpen(doc);const esc2=x=>String(x);
  const sw=swaps.filter(([a,b])=>a&&b!=null&&b!==""&&a!==b).sort((x,y)=>y[0].length-x[0].length);
  const textFix=v=>{let m;if((m=v.match(/^(Give the site as:\s*)/)))return m[1]+nv.giveAs;if((m=v.match(/^(what3words:\s*)/)))return nv.w3w?m[1]+"///"+nv.w3w.replace(/^\/+/,""):m[1]+"(add on site)";
    v=v.replace(/(Issued:\s*)\d{1,2}\/\d{1,2}\/\d{2,4}/,"$1"+nv.datePrep);sw.forEach(([a,b])=>{v=v.split(a).join(b)});return v};
  for(const path of Object.keys(zip.files).filter(p=>/^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(p))){const xml=await zip.file(path).async("string");const dom=new DOMParser().parseFromString(xml,"application/xml");if(dom.getElementsByTagName("parsererror").length)continue;
    if(path==="word/document.xml"){[...dom.getElementsByTagName("w:tr")].forEach(tr=>{const tcs=[...tr.getElementsByTagName("w:tc")];if(tcs.length<2)return;const lab=ramsXmlText(tcs[0]).trim().toLowerCase();
      if(tcs.length===2&&RAMS_LABEL[lab]&&nv[RAMS_LABEL[lab]]!=null){ramsSetCell(tcs[1],nv[RAMS_LABEL[lab]],dom);tcs[1].__done=1}
      else if(tcs.length>=4&&/^(prepared by|reviewed by|approved by)/.test(lab)){const nm=/^prepared/.test(lab)?nv.prepared:nv.managerName||nv.preparedName;if(nm&&ramsXmlText(tcs[1]).trim())ramsSetCell(tcs[1],nm,dom);if(ramsXmlText(tcs[3]).trim())ramsSetCell(tcs[3],nv.datePrep,dom);tcs[1].__done=tcs[3].__done=1}})}
    [...dom.getElementsByTagName("w:t")].forEach(t=>{let p=t.parentNode;while(p&&p.nodeName!=="w:tc")p=p.parentNode;if(p&&p.__done)return;const v=t.textContent;const n=textFix(v);if(n!==v){t.textContent=n;t.setAttribute("xml:space","preserve")}});
    zip.file(path,new XMLSerializer().serializeToString(dom))}
  return await zip.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"})}
function ramsMaker(site){const tpl=ramsTemplates();if(!tpl.length){toast("Upload your RAMS (Word files) to a site first. Then you can copy them to new sites here.");return}
  const bySite={};tpl.forEach(d=>{(bySite[d.site||"General"]=bySite[d.site||"General"]||[]).push(d)});const srcs=Object.keys(bySite).sort((a,b)=>bySite[b].length-bySite[a].length);
  const c=siteClient(site);const ind=indFor(site);const det=(ind&&ind.details)||{};let job={};try{const sm=sjMaster(site);job=(sm&&sm.job)||{}}catch(e){}
  const today=iso(new Date());const st=job.start||today;const rv=(()=>{const d=new Date(st+"T12:00");d.setMonth(d.getMonth()+6);return iso(d)})();
  const owner=S.ownerName||((S.settings||{}).ownerName)||"James Bray";const co=((S.settings||{}).company||{}).name||"JEB Building Services";
  let src=srcs.find(x=>!same(x,site))||srcs[0];let old={};const nv0={project:site.split(",")[0],address:(c&&clAddr(c))||site,client:c?c.name:"",planning:"",prepared:co+" - "+owner,datePrep:ukDate(today),start:ukDate(st),review:ukDate(rv),rev:"Rev 01",giveAs:(c&&clAddr(c))||site,w3w:"",hospital:det.hospital||"",manager:(det.manager||owner).split("·")[0].trim(),firstAid:[det.firstaider,det.firstaid?"first aid kit: "+det.firstaid:""].filter(Boolean).join("  —  "),fire:det.assembly?"Assembly point: "+det.assembly:""};
  openSheet(`<h3 id="sheettitle">📝 Make RAMS for ${esc(site)}</h3>
    <label>Copy from the RAMS set at<select id="rm-src">${srcs.map(x=>`<option ${x===src?"selected":""}>${esc(x)}</option>`).join("")}</select></label>
    <div class="flabel" style="display:flex;justify-content:space-between;align-items:center">Which RAMS does this job need?<span><button type="button" class="pillbtn" id="rm-all">Tick all</button> <button type="button" class="pillbtn" id="rm-none">None</button></span></div>
    <div id="rm-list" class="dsp-list"></div>
    <div class="flabel" style="margin-top:6px">Fill in the blanks</div><div class="who" id="rm-oldnote">Reading your RAMS…</div>
    <div id="rm-fields"></div>
    <details class="privbox" id="rm-swapbox"><summary>Other words to change in the text <span class="who" id="rm-swapn"></span></summary><div class="who">These names and places from the old job appear in the wording. Type what to put instead, or leave blank to keep.</div><div id="rm-swaps"></div></details>
    <label class="tick"><input type="checkbox" id="rm-dl"> <span>Also download them to this phone / computer (zip)</span></label>
    <div class="who" id="rm-prog"></div>
    ${formFoot(false,"Make RAMS")}`,()=>go(),null);
  const listFor=()=>bySite[src].slice().sort((a,b)=>(a.fileName||"").localeCompare(b.fileName||"",undefined,{numeric:true}));
  const nice=d=>(d.title||d.fileName||"").replace(/^JEB-RAMS-(\d+)_/,"$1 · ").replace(/_/g," ").replace(new RegExp("\\s*"+String(src.split(",")[0]).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\s*$","i"),"").trim();
  const drawList=()=>{$("rm-list").innerHTML=listFor().map((d,i)=>`<label class="tick dsp-row"><input type="checkbox" class="rm-c" data-i="${i}"> <span>${esc(nice(d))}</span></label>`).join("")};
  const drawFields=()=>{$("rm-fields").innerHTML=RAMS_FIELDS.map(([k,l])=>`<label>${esc(l)}${old[k]?` <span class="who" style="font-weight:400">(was: ${esc(old[k].length>60?old[k].slice(0,60)+"…":old[k])})</span>`:""}<input class="rm-f" data-k="${k}" value="${esc(nv0[k]||"")}" placeholder="${k==="w3w"?"e.g. grin.sadly.shuttered":""}"></label>`).join("")};
  const words=()=>{const ph=new Set();const sur=String(old.client||"").trim().split(/\s+/).pop();if(sur&&old.body){(old.body.match(new RegExp("[A-Z][a-z]+(?:\\s+(?:and|&)\\s+[A-Z][a-z]+)?\\s+"+sur.replace(/[^A-Za-z'-]/g,""),"g"))||[]).forEach(x=>{if(x!==old.client&&!/^(Mrs?|Ms|Miss|Dr)\s/.test(x))ph.add(x)})}
    const w=new Set();[old.project,old.client,old.address].filter(Boolean).forEach(v=>{String(v).replace(/&/g," ").split(/[\s,]+/).forEach(t=>{t=t.replace(/[^A-Za-z'-]/g,"");if(t.length>2&&/^[A-Z]/.test(t)&&!/^(Mrs?|Ms|Miss|Dr|Devon|Cornwall|Somerset|Dorset|And|The)$/i.test(t))w.add(t)})});if(old.project){w.delete(old.project);String(old.project).split(/\s+/).forEach(x=>w.delete(x))}
    return [old.project].filter(Boolean).concat([...ph],[...w])};
  const guess=t=>{if(t===old.project)return nv0.project;const parts=String(nv0.address||"").split(",").map(x=>x.trim()).filter(x=>!/^[A-Z]{1,2}\d/.test(x));const town=parts.length>2?parts[parts.length-2]:parts.length===2?parts[1]:"";
    const cn=String(nv0.client||"").replace(/^(Mrs?|Ms|Miss|Dr)\.?\s+/,"").replace(/\s*&.*$/,"").trim();const ws=cn.split(/\s+/).filter(Boolean);const first=ws[0]||"",last=ws.length>1?ws[ws.length-1]:"";
    if(/\s/.test(t)&&old.client&&t.endsWith(String(old.client).trim().split(/\s+/).pop()))return cn;
    if(old.client&&String(old.client).includes(t)){if(String(old.client).trim().endsWith(t))return last||cn;return first}
    if(old.address&&String(old.address).includes(t))return town;return ""};
  const drawSwaps=()=>{const W=words();$("rm-swaps").innerHTML=W.map(t=>`<div class="grid2" style="align-items:end"><label>Change<input class="rm-so" value="${esc(t)}"></label><label>To<input class="rm-sn" value="${esc(guess(t)||"")}" placeholder="type the new one, or leave to keep"></label></div>`).join("")+`<button type="button" class="pillbtn" id="rm-addsw">+ Another word</button>`;$("rm-swapn").textContent=W.length?`(${W.length})`:"";
    $("rm-addsw").onclick=()=>{$("rm-addsw").insertAdjacentHTML("beforebegin",`<div class="grid2" style="align-items:end"><label>Change<input class="rm-so"></label><label>To<input class="rm-sn"></label></div>`)}};
  const load=async()=>{drawList();$("rm-oldnote").textContent="Reading your RAMS…";try{old=await ramsReadOld(listFor()[0]);$("rm-oldnote").textContent="Each blank shows what the old job had. Change anything that's different."}catch(e){old={};$("rm-oldnote").textContent="Couldn't read the old RAMS (check your connection). You can still fill in the blanks."}
    ["hospital","fire","firstAid","manager"].forEach(k=>{if(!nv0[k]&&old[k])nv0[k]=old[k]});drawFields();drawSwaps()};
  $("rm-src").onchange=e=>{src=e.target.value;load()};$("rm-all").onclick=()=>document.querySelectorAll(".rm-c").forEach(x=>x.checked=true);$("rm-none").onclick=()=>document.querySelectorAll(".rm-c").forEach(x=>x.checked=false);
  load();
  const go=async()=>{const picked=[...document.querySelectorAll(".rm-c:checked")].map(x=>listFor()[+x.dataset.i]);if(!picked.length){showErr("Tick at least one RAMS.");return}
    const nv={};document.querySelectorAll(".rm-f").forEach(i=>nv[i.dataset.k]=i.value.trim());nv.managerName=nv.manager;nv.preparedName=owner;
    const swaps=[];if(old.address&&nv.address)swaps.push([old.address,nv.address]);if(old.client&&nv.client)swaps.push([old.client,nv.client]);if(old.giveAs&&nv.giveAs)swaps.push([old.giveAs,nv.giveAs]);
    const so=[...document.querySelectorAll(".rm-so")],sn=[...document.querySelectorAll(".rm-sn")];so.forEach((x,i)=>{const a=x.value.trim(),b=(sn[i]&&sn[i].value.trim())||"";if(a&&b)swaps.push([a,b])});
    $("f-save").disabled=true;let ok=0;const made=[];const oldSlug=String(old.project||src.split(",")[0]).replace(/\s+/g,"_"),newSlug=String(nv.project||site.split(",")[0]).replace(/[^\w\s-]/g,"").trim().replace(/\s+/g,"_");
    for(let i=0;i<picked.length;i++){const d=picked[i];$("rm-prog").textContent=`Making ${i+1} of ${picked.length}: ${nice(d)}…`;
      try{const blob=await ramsMake(d,nv,old,swaps);let fn=(d.fileName||"RAMS.docx");fn=oldSlug&&fn.includes(oldSlug)?fn.split(oldSlug).join(newSlug):fn.replace(/\.docx$/i,"_"+newSlug+".docx");
        const file=new File([blob],fn,{type:blob.type});const up=await uploadFile(file,fn);
        await S.db.collection("docs").add({site,path:"Rams",cat:"rams",title:fn.replace(/\.[^.]+$/,""),fileName:fn,assetId:up.id,contentType:up.contentType||file.type,size:up.sizeBytes||file.size,uploaded:Date.now(),fromRams:d.id});ok++;made.push(file)}
      catch(e){showErr(`Couldn't make ${nice(d)}. ${uploadErr(e)}`)}}
    if($("rm-dl").checked&&made.length){try{await loadZip();const z=new window.JSZip();made.forEach(f=>z.file(f.name,f));const zb=await z.generateAsync({type:"blob"});if(S.dl)await S.dl.save({filename:"RAMS "+site.split(",")[0]+".zip",data:zb})}catch(e){}}
    $("f-save").disabled=false;if(ok){closeForm();toast(`${ok} RAMS made for ${site}. They're in the RAMS folder.`);render()}};
}
