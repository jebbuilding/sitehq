/* ================= WHO'S ON SITE NOW (roll call) ================= */
import { $, esc, iso, stamp } from "../core/helpers.js";
import { S } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { SIGNIN } from "./sign-in-book.js";
export { onSiteNow, openRollCall };
function onSiteNow(){
  const today=iso(new Date()); const rows=[];
  teamIds().concat(S.owner&&S.mine.entries.length?[S.me]:[]).forEach(id=>((id===S.me?S.mine.entries:S.data.entries[id])||[]).filter(e=>e.open&&e.date===today).forEach(e=>rows.push(Object.assign({who:id},e))));
  try{SIGNIN.openToday().forEach(r=>{if(!rows.some(x=>x.who===r.who))rows.push(r)})}catch(e){}
  return rows;
}
function openRollCall(){
  S.roll=S.roll||{}; const rows=onSiteNow(); const by={}; rows.forEach(r=>{(by[r.job||"No site"]=by[r.job||"No site"]||[]).push(r)});
  const draw=()=>{const n=rows.filter(r=>S.roll[r.who]).length;
    openViewer(`<h3 style="font-family:var(--f-display);margin:0">On site now</h3><div class="who">${rows.length} checked in · ${stamp(Date.now())}</div>
      ${rows.length?`<div class="notice" style="margin-top:8px">For a fire or emergency roll call, tick each person as they're accounted for. <b>${n} of ${rows.length}</b> accounted for.</div>`:""}
      ${Object.keys(by).sort().map(site=>`<div class="flabel" style="margin-top:12px;font-size:15px">${esc(site)} · ${by[site].length}</div>${by[site].map(r=>{const d=(S.team[r.who]&&S.team[r.who].details)||(r.phone?{mobile:r.phone}:{});
        return `<div class="citem rollrow"><label class="inl" style="font-size:16px;color:var(--ink);font-weight:600"><input type="checkbox" class="rc" data-w="${esc(r.who)}" ${S.roll[r.who]?"checked":""}> ${esc(nameOf(r.who))}</label>
        <span style="display:flex;gap:8px;align-items:center"><span class="who">in ${esc(r.actualIn||r.start)}</span>${d.mobile?`<a class="pillbtn" href="tel:${esc(d.mobile.replace(/\s+/g,""))}">Call</a>`:""}</span></div>`}).join("")}`).join("")||'<div class="empty"><strong>Nobody is checked in right now</strong>People show here when they tap Check in on site.</div>'}
      ${rows.length?`<div class="actions" style="margin-top:12px"><button class="pillbtn" id="rc-reset" type="button">Clear ticks</button></div>`:""}`);
    $("viewer").querySelectorAll(".rc").forEach(c=>c.onchange=()=>{S.roll[c.dataset.w]=c.checked;draw()});
    if($("rc-reset")) $("rc-reset").onclick=()=>{S.roll={};draw()}};
  draw();
}

