/* ================= MATERIAL CALCULATOR (owner sets rates, anyone works out quantities) ================= */
import { calcSave, calcState, fmtN, numv } from "./calculator.js";
import { $, esc, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
import { UNITS } from "../purchasing/materials-receipts.js";
export { calcMat, looseSave };
const MC_BASIS={m2:"m²",m3:"m³",m:"metre run"};
const MC_CONT=["m","m²","m³","litres","kg","tonnes","days hire","weeks hire"];
const MC_EXAMPLES=[
  {name:"Half-brick wall (example: check the figures)",basis:"m2",waste:5,items:[{name:"Bricks",per:60,unit:"each"}]},
  {name:"100 mm blockwork (example: check the figures)",basis:"m2",waste:5,items:[{name:"Blocks 440×215",per:10,unit:"each"}]},
  {name:"Plasterboard ceiling (example: check the figures)",basis:"m2",waste:10,items:[{name:"Plasterboard 2400×1200",per:0.35,unit:"sheets"}]}];
const mcLists=()=>((S.matcalc&&S.matcalc.lists)||[]).map(l=>l.basis in MC_BASIS?l:Object.assign({},l,{basis:"m2"}));
function mcQty(amount,it,waste){const p=numv(it.per);const raw=(it.mode==="covers"?(p?amount/p:0):amount*p)*(1+numv(waste)/100);if(!raw)return 0;return MC_CONT.includes(it.unit)?Math.ceil(raw*100-1e-9)/100:Math.ceil(raw-1e-9)}
function calcMat(){
  const C=calcState(), B=$("calcbody"), lists=mcLists(), owner=ownerMode();
  if(!lists.some(l=>l.id===C.mcList)) C.mcList=lists[0]?lists[0].id:"";
  const L=lists.find(l=>l.id===C.mcList);
  if(!C.ms) C.ms={l:"",w:"",d:"",n:""};
  if(!lists.length){B.innerHTML=`<div class="empty"><strong>No materials set up yet</strong>${owner?`Add each material and how much is used per m² or m³. Then anyone can type in the sizes and see how much they need.<br><button class="btn primary" id="mc-new" type="button" style="margin-top:10px">+ Add a material</button> <button class="btn" id="mc-ex" type="button" style="margin-top:10px">Start with 3 examples</button>`:"James hasn't set any up yet."}</div>`;}
  else B.innerHTML=`<div class="mcsimple">
      <div><div class="flabel">Sizes</div><div class="cdims">
        <label>Length (mm)<input id="ms-l" inputmode="decimal" value="${esc(C.ms.l)}" placeholder="e.g. 6000"></label><span class="cx">×</span>
        <label>Width (mm)<input id="ms-w" inputmode="decimal" value="${esc(C.ms.w)}" placeholder="e.g. 2400"></label><span class="cx">×</span>
        <label>Depth (mm)<input id="ms-d" inputmode="decimal" value="${esc(C.ms.d)}" placeholder="if needed"></label></div>
        <div class="who" id="ms-sum"></div>
        <button type="button" class="btn ms-clear" id="ms-clear">Clear numbers</button></div>
      <label for="mc-list">Material<select id="mc-list">${lists.map(l=>`<option value="${esc(l.id)}" ${l.id===C.mcList?"selected":""}>${esc(l.name)}</option>`).join("")}</select></label>
      <div><div class="flabel">Quantity needed</div><div class="ctotal" id="mc-out" aria-live="polite"></div></div>
      ${owner?`<div class="actions"><button class="pillbtn" id="mc-edit" type="button">Edit this material</button><button class="pillbtn" id="mc-new" type="button">+ Add a material</button></div>`:""}</div>`;
  const out=()=>{if(!L)return;const l=numv(C.ms.l)/1000,w=numv(C.ms.w)/1000,d=numv(C.ms.d)/1000;const area=l*w,vol=area*d;
    $("ms-sum").textContent=area?`= ${fmtN(area,2)} m²`+(vol?` · ${fmtN(vol,3)} m³`:""):"";
    const amt={m2:area,m3:vol,m:l}[L.basis]||0;
    const miss=L.basis==="m3"&&area&&!d?"Put in the depth in mm to work this one out.":L.basis==="m2"&&l&&!w?"Put in the width or height.":!amt?"Put in the sizes above.":"";
    $("mc-out").innerHTML=miss?`<div class="who" style="font-size:15px">${miss}</div>`:L.items.map(it=>{const cnt=it.unit==="each"||(it.unit==="m²"&&L.basis!=="m3");return `<div class="mcq"><b>${fmtN(mcQty(amt,cnt?Object.assign({},it,{unit:"each"}):it,L.waste),2)}${cnt?"":" "+esc(it.unit)}</b><span>${esc(it.name)}${it.mode==="covers"?` · each covers ${esc(String(it.per))} ${esc(MC_BASIS[L.basis])}`:` · ${esc(String(it.per))} per ${esc(MC_BASIS[L.basis])}`}</span></div>`}).join("")+`<div class="who">Worked out from ${fmtN(amt,3)} ${esc(MC_BASIS[L.basis])}${numv(L.waste)?", including "+numv(L.waste)+"% waste":""}${L.note?". "+esc(L.note):""}</div>`;calcSave()};
  if($("ms-clear")) $("ms-clear").onclick=()=>{C.ms={l:"",w:"",d:"",n:""};calcSave();calcMat();const f=$("ms-l");if(f)f.focus()};
  [["ms-l","l"],["ms-w","w"],["ms-d","d"],["ms-n","n"]].forEach(([id,k])=>{if($(id))$(id).oninput=e=>{C.ms[k]=e.target.value;out()}});
  if($("mc-list")) $("mc-list").onchange=e=>{C.mcList=e.target.value;calcSave();e.target.blur();calcMat()};
  if($("mc-new")) $("mc-new").onclick=()=>openMcEditor(null);
  if($("mc-edit")) $("mc-edit").onclick=()=>openMcEditor(L);
  if($("mc-ex")) $("mc-ex").onclick=async()=>{try{await mcSave(MC_EXAMPLES.map(x=>Object.assign({id:newId()},x)));toast("Examples added. Edit them to match your own figures.")}catch(e){toast("Couldn't save")}};
  out();
}
async function mcSave(lists){await S.db.doc("settings/matcalc").set({lists,loose:((S.matcalc||{}).loose)||[],updated:Date.now()})}
async function looseSave(loose){await S.db.doc("settings/matcalc").set({lists:((S.matcalc||{}).lists)||[],loose,updated:Date.now()});S.matcalc=Object.assign({},S.matcalc,{loose})}
function openMcEditor(L){
  const d=L?JSON.parse(JSON.stringify(L)):{id:newId(),name:"",basis:"m2",waste:5,note:"",items:[{name:"",per:"",unit:"each"}]};
  const row=(it,i)=>`<div class="mcedit2" data-i="${i}"><input class="mce-n" value="${esc(it.name)}" placeholder="Material, e.g. Concrete blocks" maxlength="60" aria-label="Material">
    <div class="mce-line"><select class="mce-m" aria-label="How it's worked out"><option value="per" ${it.mode!=="covers"?"selected":""}>How many per ${esc(MC_BASIS[d.basis]||"m²")}</option><option value="covers" ${it.mode==="covers"?"selected":""}>Each one covers (${esc(MC_BASIS[d.basis]||"m²")})</option></select>
    <input class="mce-p" inputmode="decimal" value="${esc(String(it.per))}" placeholder="e.g. 10" aria-label="Number">
    <select class="mce-u" aria-label="Counted in"><option value="each" ${!it.unit||it.unit==="each"||(it.unit==="m²"&&d.basis!=="m3")?"selected":""}>items</option>${UNITS.filter(u=>u!=="each").map(u=>`<option ${u===it.unit&&!(u==="m²"&&d.basis!=="m3")?"selected":""}>${u}</option>`).join("")}</select>
    <button type="button" class="linkdanger mce-x" aria-label="Remove">✕</button></div></div>`;
  openSheet(`<h3 id="sheettitle">${L?"Edit material list":"New material list"}</h3>
    <label for="mce-name">Name of the work<input id="mce-name" required maxlength="80" value="${esc(d.name)}" placeholder="e.g. 100 mm blockwork"></label>
    <div class="grid2"><label for="mce-basis">Worked out per<select id="mce-basis">${[["m2","Square metre (m²): length × width"],["m3","Cubic metre (m³): length × width × depth"],["m","Metre run: length only"]].map(([k,v])=>`<option value="${k}" ${(d.basis in MC_BASIS?d.basis:"m2")===k?"selected":""}>${v}</option>`).join("")}</select></label>
    <label for="mce-waste">Extra for waste %<input id="mce-waste" inputmode="decimal" value="${esc(String(d.waste??0))}"></label></div>
    <div><div class="flabel">Materials, worked out per <span id="mce-per">${esc(MC_BASIS[d.basis])}</span></div><div class="who">Two ways: <b>How many per m²</b>, e.g. concrete blocks, 10 per m², so 2 m × 1 m = 20 blocks. Or <b>Each one covers</b>, e.g. a chipboard sheet covers 1.44 m², so 20 m² = 14 sheets. Leave "items" to count them, or choose sheets, bags, m³ and so on.</div><div id="mce-rows">${d.items.map(row).join("")}</div>
      <button type="button" class="pillbtn" id="mce-add" style="margin-top:8px">+ Add material</button></div>
    <label for="mce-note">Note shown with the list (optional)<input id="mce-note" maxlength="160" value="${esc(d.note||"")}" placeholder="e.g. Allows for 10 mm joints"></label>
    ${formFoot(!!L,"Save list")}`,async()=>{
      const items=[...$("mce-rows").querySelectorAll(".mcedit2")].map(r=>({name:r.querySelector(".mce-n").value.trim(),mode:r.querySelector(".mce-m").value,per:numv(r.querySelector(".mce-p").value),unit:r.querySelector(".mce-u").value})).filter(x=>x.name);
      const name=$("mce-name").value.trim(); if(!name){showErr("Give the list a name.");return}
      if(!items.length){showErr("Add at least one material.");return}
      const bad=items.find(x=>!(x.per>0)); if(bad){showErr(`Put the amount for ${bad.name}.`);return}
      const nd={id:d.id,name,basis:$("mce-basis").value,waste:numv($("mce-waste").value),note:$("mce-note").value.trim(),items};
      const lists=mcLists().filter(x=>x.id!==d.id); const at=mcLists().findIndex(x=>x.id===d.id); if(at>=0)lists.splice(at,0,nd);else lists.push(nd);
      $("f-save").disabled=true;
      try{await mcSave(lists);calcState().mcList=nd.id;calcSave();closeForm();toast("List saved");render()}catch(e){showErr("Couldn't save. Check your connection.");$("f-save").disabled=false}
    },"mce-name");
  const wire=()=>$("mce-rows").querySelectorAll(".mce-x").forEach(b=>b.onclick=()=>{if($("mce-rows").children.length>1)b.closest(".mcedit2").remove()});
  $("mce-add").onclick=()=>{$("mce-rows").insertAdjacentHTML("beforeend",row({name:"",per:"",unit:"each",mode:"per"},Date.now()));wire();const ns=$("mce-rows").querySelectorAll(".mce-n");ns[ns.length-1].focus()};
  $("mce-basis").onchange=e=>{const u=MC_BASIS[e.target.value];$("mce-per").textContent=u;$("mce-rows").querySelectorAll(".mce-m").forEach(sel=>{sel.options[0].textContent="How many per "+u;sel.options[1].textContent="Each one covers ("+u+")"})}; wire();
  if(L) armDelete(async()=>{await mcSave(mcLists().filter(x=>x.id!==L.id));setTimeout(render,0)});
}
