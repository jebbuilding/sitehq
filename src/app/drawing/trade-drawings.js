/* ================= DRAWINGS: trades draw it out (with photos and writing), send to James to check ================= */
import { lastOf, pickField, pickVal } from "../core/fields.js";
import { $, esc, iso, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, myDoc, openSheet, showErr } from "../core/sheet.js";
import { S, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { openNotePage } from "./paving.js";
import { blobUrl, saveAsset, uploadErr } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { binFromViewer } from "../owner/deleted-items.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { markPrompt, myOpenPrompts } from "../people/reminders.js";
import { markupBlock, markupSend } from "../photos/mark-up.js";
import { myTrade, photoTile } from "../photos/photos.js";
export { SK_CAT, isSketch, newDrawing, ownerDrawing, skState, sketchStrip, sketchViewer };
const SK_CAT="Drawings & sketches";
const isSketch=p=>p&&p.kind==="sketch";
function skState(p){if(p.mine)return["none","My drawing"];if(p.fromOwner&&!p.check)return["none","Drawing from James"];if(p.check==="ok")return["ok","✓ James says it's right"];if(p.check==="change")return["change","✗ Needs changing"];if(p.check==="open")return["open","Waiting for James to check"];return["none","Drawing"]}
function newDrawing(){
  if(!S.assets){toast("You don't have permission to upload. Ask James to make you an Editor on this page.");return}
  openNotePage({title:"",onSave:r=>drawingDetails(r)});
}
function drawingDetails(r){
  const lastSite=lastOf(S.mine.photos,()=>true,"site")||lastOf(S.mine.entries,()=>true,"job");
  openSheet(`<h3 id="sheettitle">Send your drawing</h3>
    <img src="${blobUrl(r.preview)}" alt="Your drawing" style="max-height:38vh;max-width:100%;border-radius:8px;align-self:center;border:1px solid var(--line)">
    <label for="sk-title">What is it?<input id="sk-title" maxlength="80" value="${esc(r.title||"")}" placeholder="e.g. Drainage run to rear manhole"></label>
    ${pickField("sk-site","Site address",siteNames(),lastSite,"e.g. 9 Old Teignmouth Rd, Dawlish EX7 0NJ",false)}
    <label for="sk-note">Message to James (optional)<textarea id="sk-note" maxlength="400" placeholder="e.g. Is this the right fall and position for the inspection chamber?"></textarea></label>
    <label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" id="sk-ask" checked> Ask James to check it's right</label>
    ${formFoot(false,"Send to James")}`,async()=>{
      const title=$("sk-title").value.trim(); if(!title){showErr("Say what the drawing is.");return}
      $("f-save").disabled=true;
      const ask=$("sk-ask").checked, now=Date.now();
      try{await myDoc("photos",newId()).set({kind:"sketch",assetId:r.preview,pageSrc:r.src,title,site:pickVal("sk-site")||"",category:SK_CAT,caption:$("sk-note").value.trim(),takenAt:now,date:iso(new Date(now)),trade:myTrade()||"",check:ask?"open":"",created:now});
        closeForm();toast(ask?"Sent to James to check":"Drawing saved");render()}
      catch(e){showErr(uploadErr(e));$("f-save").disabled=false}},"sk-title");
}
function sketchStrip(list,owner){
  if(!list.length) return "";
  return `<div class="phgrid">${list.map(p=>photoTile(p,owner,p.who)).join("")}</div>`;
}
function sketchViewer(p,owner,who){
  const mineO=owner&&who===S.me;
  const [st,lab]=skState(p);
  const hist=(p.checks||[]).slice().reverse();
  openViewer(`<h3 style="margin:0 0 8px">${esc(p.title||"Drawing")}</h3>
    <div class="skstate sk-${st}">${esc(lab)}${p.check==="change"&&p.checkNote?`<br><b>${esc(p.checkNote)}</b>`:""}${p.check==="ok"&&p.checkNote?`<br>${esc(p.checkNote)}`:""}</div>
    <img src="${blobUrl(p.assetId)}" alt="${esc(p.title||"Drawing")}" style="max-height:70vh;width:auto;max-width:100%;margin:10px auto 0;display:block;border-radius:8px;border:1px solid var(--line);background:#fff">
    <div class="details" style="margin-top:10px">${[["Site",p.site],["Message",p.caption],["Drawn by",p.fromOwner?"James":owner?nameOf(who):(S.myProfile&&S.myProfile.name)],["Sent to",p.fromOwner&&owner&&!p.mine?nameOf(who):""],["Trade",p.trade],["Sent",stamp(p.created)],["Last changed",p.editedAt?stamp(p.editedAt):""]].filter(x=>x[1]).map(([l,v])=>`<div class="drow"><span>${esc(l)}</span><span>${esc(v)}</span></div>`).join("")}</div>
    ${hist.length?`<div class="flabel" style="margin-top:10px">${owner?"Your replies":"James's replies"}</div>${hist.map(h=>`<div class="who">${h.ok?"✓ Right":"✗ Needs changing"} · ${stamp(h.at)}${h.note?": "+esc(h.note):""}</div>`).join("")}`:""}
    ${markupBlock(p,owner)}
    ${owner&&who&&!mineO?`<div class="flabel" style="margin-top:12px">Check it</div>
      <label for="sk-reply">Message back (optional)<textarea id="sk-reply" maxlength="400" placeholder="e.g. Fall needs to be 1:40, move the chamber 500mm left."></textarea></label>
      <div class="actions"><button class="btn primary" id="sk-ok" type="button">✓ Looks right</button><button class="btn" id="sk-chg" type="button">✗ Needs changing</button><button class="btn" id="v-mark" type="button">✎ Draw on it &amp; send back</button></div>`:""}
    <div class="actions" style="margin-top:12px">${!owner||mineO?`<button class="btn primary" id="sk-edit" type="button">✎ ${mineO?"Open and change":"Change the drawing"}</button>${!owner&&p.check!=="open"?`<button class="btn" id="sk-ask2" type="button">Ask James to check</button>`:""}`:""}<button class="btn" id="v-save" type="button">Save picture</button>${!owner||mineO?`<button class="btn" id="v-del" type="button">Delete</button>`:""}</div>`);
  const path="sheets/"+(owner?who:S.me)+"/photos/"+p.id;
  if(!owner) myOpenPrompts().filter(x=>(x.form==="markup"||x.form==="sketchchk"||x.form==="sketchnew")&&x.ref===p.id).forEach(x=>markPrompt(x,"done"));
  $("v-save").onclick=()=>saveAsset(p.assetId,`${(p.title||"drawing").replace(/[^\w\s-]/g,"").trim()}.jpg`);
  $("viewer").querySelectorAll(".mk-save").forEach(b=>b.onclick=()=>saveAsset(b.dataset.a,`${(p.title||"drawing").replace(/[^\w\s-]/g,"").trim()} marked up.jpg`));
  if($("v-mark")) $("v-mark").onclick=()=>markupSend(p,who);
  const reply=async ok=>{const note=$("sk-reply").value.trim(); if(!ok&&!note){toast("Say what needs changing");$("sk-reply").focus();return}
    const checks=(p.checks||[]).concat([{ok,note,at:Date.now()}]);
    try{await S.db.doc(path).update({check:ok?"ok":"change",checkNote:note,checkedAt:Date.now(),checks});Object.assign(p,{check:ok?"ok":"change",checkNote:note,checks});
      await S.db.doc("sheets/"+who+"/signoffs/pr-"+newId()).set({type:"prompt",form:"sketchchk",ref:p.id,refLabel:(ok?"✓ ":"✗ ")+(p.title||""),note:note||(ok?"Looks right, carry on.":""),status:"open",created:Date.now()});
      toast((ok?"Told ":"Sent back to ")+nameOf(who).split(" ")[0]);render();sketchViewer(p,true,who)}catch(e){toast("Couldn't save")}};
  if($("sk-ok")) $("sk-ok").onclick=()=>reply(true);
  if($("sk-chg")) $("sk-chg").onclick=()=>reply(false);
  if($("sk-edit")) $("sk-edit").onclick=()=>{closeViewer();openNotePage({srcId:p.pageSrc,title:p.title,onSave:async r=>{
    const versions=(p.versions||[]).concat([{assetId:p.assetId,pageSrc:p.pageSrc,at:p.editedAt||p.created}]);
    try{await S.db.doc(path).update({assetId:r.preview,pageSrc:r.src,title:r.title||p.title,editedAt:Date.now(),check:mineO?"":"open",versions});Object.assign(p,{assetId:r.preview,pageSrc:r.src,title:r.title||p.title,check:mineO?"":"open",versions,editedAt:Date.now()});
      toast(mineO?"Drawing saved":"Changed and sent back to James to check");render();sketchViewer(p,owner,who)}catch(e){toast("Couldn't save")}}})};
  if($("sk-ask2")) $("sk-ask2").onclick=async()=>{try{await S.db.doc(path).update({check:"open"});p.check="open";toast("Sent to James to check");render();sketchViewer(p,false)}catch(e){toast("Couldn't save")}};
  const d=$("v-del"); if(d){if(owner){d.onclick=()=>binFromViewer({assets:[p.assetId],title:(p.caption||"Drawing")+(p.site?" · "+p.site:""),type:"image/jpeg",thumb:p.assetId},()=>{closeViewer();render()})}else{let armed=false;d.onclick=async()=>{if(!armed){armed=true;d.textContent="Tap again to delete";return}
    try{await myDoc("photos",p.id).delete();closeViewer();toast("Drawing deleted")}catch(e){toast("Couldn't delete")}}}}
}

function ownerDrawing(){
  if(!S.assets){toast("Uploads aren't available here");return}
  const ids=teamIds();
  openNotePage({title:"",onSave:r=>{
    openSheet(`<h3 id="sheettitle">Send your drawing</h3>
      <img src="${blobUrl(r.preview)}" alt="Your drawing" style="max-height:38vh;max-width:100%;border-radius:8px;align-self:center;border:1px solid var(--line)">
      <label for="od-title">What is it?<input id="od-title" maxlength="80" value="${esc(r.title||"")}" placeholder="e.g. Setting out for the extension"></label>
      ${pickField("od-site","Site address",siteNames(),"","e.g. 12 Marine Way, Exmouth",false)}
      <fieldset class="od-who"><legend>Send to</legend><label class="inl" style="font-size:15px;color:var(--ink);font-weight:600"><input type="checkbox" value="${esc(S.me)}" checked> Just keep it for me</label>${ids.map(id=>`<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" value="${esc(id)}"> ${esc(nameOf(id))}</label>`).join("")}</fieldset>
      <label for="od-note">Message (optional)<textarea id="od-note" maxlength="400" placeholder="e.g. Set the footings out like this. Check it matches the plan before digging."></textarea></label>
      ${formFoot(false,"Send drawing")}`,async()=>{
        const title=$("od-title").value.trim(); if(!title){showErr("Say what the drawing is.");return}
        const to=[...document.querySelectorAll(".od-who input:checked")].map(x=>x.value); if(!to.length){showErr("Choose who to send it to.");return}
        $("f-save").disabled=true; const note=$("od-note").value.trim(), site=pickVal("od-site")||"", now=Date.now();
        try{for(const who of to){const id=newId();
            if(who===S.me){await S.db.doc("sheets/"+who+"/photos/"+id).set({kind:"sketch",fromOwner:true,mine:true,assetId:r.preview,pageSrc:r.src,title,site,category:SK_CAT,caption:note,takenAt:now,date:iso(new Date(now)),check:"",created:now});continue}
            await S.db.doc("sheets/"+who+"/photos/"+id).set({kind:"sketch",fromOwner:true,assetId:r.preview,pageSrc:r.src,title,site,category:SK_CAT,caption:note,takenAt:now,date:iso(new Date(now)),check:"",created:now});
            await S.db.doc("sheets/"+who+"/signoffs/pr-"+newId()).set({type:"prompt",form:"sketchnew",ref:id,refLabel:title,note,status:"open",created:now})}
          closeForm();const others=to.filter(x=>x!==S.me);toast(others.length?"Sent to "+others.map(x=>nameOf(x).split(" ")[0]).join(", ")+(to.includes(S.me)?" and saved in My drawings":""):"Saved in My drawings");render()}
        catch(e){showErr(uploadErr(e));$("f-save").disabled=false}},"od-title")}});
}

