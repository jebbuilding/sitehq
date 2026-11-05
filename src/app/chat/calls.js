/* ================= CALLS FROM CHAT ================= */
import { CH } from "./chat.js";
import { esc } from "../core/helpers.js";
import { openSheet } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { nameOf, teamIds } from "../owner/owner.js";
export { intlNum, isApple, openCallSheet, phoneOf };
const intlNum=n=>{let d=String(n||"").replace(/[^\d+]/g,"");if(d.startsWith("+"))return d.slice(1);if(d.startsWith("00"))return d.slice(2);if(d.startsWith("0"))return "44"+d.slice(1);return d};
const isApple=()=>/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent||"");
function phoneOf(id){if(id===(S.settings||{}).ownerId||(S.owner&&id===S.me))return (S.settings||{}).ownerPhone||"";const d=(S.team[id]&&S.team[id].details)||{};return d.mobile||""}
function callTargets(c){
  const owner=ownerMode(); let ids=c.kind==="team"||c.members==="all"?teamIds():(Array.isArray(c.members)?c.members:[]);
  if(!owner) return [{id:"james",name:S.ownerName||"James",tel:(S.settings||{}).ownerPhone||""}];
  return ids.filter(id=>id!==S.me).map(id=>({id,name:nameOf(id),tel:phoneOf(id)}));
}
function openCallSheet(){
  const c=S.chats.find(x=>x.id===CH.open); if(!c) return;
  const list=callTargets(c), apple=isApple();
  openSheet(`<h3 id="sheettitle">Call</h3>
    <div class="who">Calls use your phone, so they work like a normal call. Video opens WhatsApp${apple?" or FaceTime":""}: tap the camera icon there to start the video call.</div>
    ${list.map(p=>`<div class="callrow"><b>${esc(p.name)}</b>${p.tel?`<span class="who">${esc(p.tel)}</span>
      <div class="callbtns"><a class="btn primary" href="tel:${esc(p.tel.replace(/\s+/g,""))}">📞 Call</a><a class="btn" href="https://wa.me/${esc(intlNum(p.tel))}" target="_blank" rel="noopener">🎥 WhatsApp video</a>${apple?`<a class="btn" href="facetime:${esc(p.tel.replace(/\s+/g,""))}">FaceTime</a>`:""}</div>`
      :`<span class="sub">${ownerMode()?"No mobile number in their details yet.":"James hasn't added his number yet."}</span>`}</div>`).join("")||'<div class="nothing">Nobody else in this chat.</div>'}
    ${ownerMode()&&!(S.settings||{}).ownerPhone?`<div class="notice warn" style="margin:0">Add your own mobile in <b>Setup</b> so trades can call you from Chat.</div>`:""}
    <div class="formactions"><span></span><button type="button" class="btn" id="f-cancel">Close</button></div>`,()=>{},null);
}

