/* ===== permanent deletion record: every PIN-unlocked delete is written here first, chained so any change or removal shows up. The app has no way to edit or delete it. ===== */
import { $, esc, iso, stamp, toast } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { pdfShow } from "../drawing/paving.js";
import { coData } from "./company-details.js";
import { hashHex } from "./pin.js";
import { BRGB } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { myName } from "../survey/door-window-survey.js";
export { auditFirst, auditLog, auditView };
const AUDIT_FIELDS=e=>[e.seq,e.at,e.by,e.action,e.title,e.details,e.snap,e.prev].join("|");
async function auditLog(action,title,details,snap){const L=(S.audit||[]).slice().sort((a,b)=>(a.seq||0)-(b.seq||0));const last=L[L.length-1];const seq=(last?last.seq:0)+1;
  let sj="null";try{sj=JSON.stringify(snap==null?null:snap)}catch(e){}
  if(sj.length>700000)sj=sj.replace(/"data:image\/[^"]{2000,}"/g,m=>`"[image too large to keep: ${Math.round(m.length/1024)} KB]"`);
  const e={kind:"audit",seq,at:Date.now(),by:myName()||"Owner",device:String(navigator.userAgent||"").slice(0,120),action,title:String(title||"").slice(0,200),details:String(details||"").slice(0,2000),snap:sj,prev:last?last.hash:"start"};
  e.hash=await hashHex(AUDIT_FIELDS(e));const id="audit-"+String(seq).padStart(6,"0")+"-"+Math.random().toString(36).slice(2,7);
  await S.db.doc("todos/"+id).set(e);S.audit=(S.audit||[]).concat([Object.assign({id},e)]);return e}
/* write the record first; if that fails, stop so nothing is deleted without being recorded */
async function auditFirst(action,title,details,snap){try{await auditLog(action,title,details,snap);return true}catch(e){toast("Couldn't write to the deletion record, so nothing was deleted. Check your connection.");return false}}
async function auditVerify(L){let prev="start";for(let i=0;i<L.length;i++){const e=L[i];if(e.seq!==i+1)return {ok:false,at:e.seq,why:`entry ${i+1} is missing`};if(e.prev!==prev)return {ok:false,at:e.seq,why:"the entry before this one has been changed or removed"};if((await hashHex(AUDIT_FIELDS(e)))!==e.hash)return {ok:false,at:e.seq,why:"this entry has been changed"};prev=e.hash}return {ok:true}}
async function auditView(){if(!ownerMode())return;const L=(S.audit||[]).slice().sort((a,b)=>(a.seq||0)-(b.seq||0));const v=await auditVerify(L);
  const imgs=o=>{const out=[];const walk=x=>{if(typeof x==="string"){if(/^data:image\//.test(x))out.push(x)}else if(x&&typeof x==="object")Object.values(x).forEach(walk)};walk(o);return out};
  const pretty=sj=>{let o=null;try{o=JSON.parse(sj)}catch(e){return esc(sj)}const strip=x=>{if(typeof x==="string")return /^data:image\//.test(x)?"[signature / image shown above]":x;if(Array.isArray(x))return x.map(strip);if(x&&typeof x==="object"){const r={};Object.entries(x).forEach(([k,val])=>r[k]=strip(val));return r}return x};
    const im=imgs(o);return (im.length?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">${im.slice(0,12).map(u=>`<img src="${esc(u)}" alt="Signature or image that was deleted" style="max-width:220px;max-height:90px;background:#fff;border:1px solid var(--line);border-radius:6px">`).join("")}</div>`:"")+`<pre style="white-space:pre-wrap;word-break:break-word;font-size:12px;max-height:320px;overflow:auto;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px">${esc(JSON.stringify(strip(o),null,2))}</pre>`};
  openViewer(`<span class="tag">🔒 Permanent</span><h3 style="font-family:var(--f-display);font-size:24px;margin:6px 0 8px;color:var(--accent)">🧾 Deletion record</h3>
    <div class="who">Every time your PIN is used to delete or unlock something (signed sign-offs, signatures, timesheets, day work, clients, sites), the details are saved here first. There's no button anywhere in the app to change or remove this record. Each entry is chained to the one before, so if anything were altered or taken out by another route it would show below.</div>
    <div class="notice ${v.ok?"":"warn"}" style="margin-top:10px">${v.ok?`✓ Record intact: ${L.length} entr${L.length===1?"y":"ies"}, nothing changed or removed.`:`⚠ Problem at entry ${v.at}: ${esc(v.why)}.`}</div>
    ${L.length?`<div class="actions" style="margin-top:8px"><button type="button" class="btn" id="au-pdf">📄 Download as PDF</button></div>`:""}
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">${L.slice().reverse().map(e=>`<details class="card" style="padding:10px 12px"><summary style="cursor:pointer"><b>#${e.seq} · ${esc(e.action)}</b><br><span class="who">${esc(stamp(e.at))} · by ${esc(e.by)} · ${esc(e.title)}</span></summary><div style="margin-top:6px">${esc(e.details)}</div>${pretty(e.snap)}<div class="who" style="font-family:var(--f-mono);font-size:11px;word-break:break-all">Check code ${esc(String(e.hash||"").slice(0,16))}…</div></details>`).join("")||'<div class="nothing">Nothing deleted with your PIN yet.</div>'}</div>`);
  const pb=$("au-pdf");if(pb)pb.onclick=async()=>{try{await loadJsPdf()}catch(e){toast("Couldn't load the PDF maker");return}const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4"});const W=210,M=14;let y=16;const clean=t=>String(t||"").replace(/[–—]/g,"-").replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/×/g,"x").replace(/[^\x09\x0A\x0D\x20-\x7E£·°]/g,"");
    const need=h=>{if(y+h>284){doc.addPage();y=16}};const tx=(t,sz,st,col)=>{doc.setFont("helvetica",st||"normal");doc.setFontSize(sz);doc.setTextColor(...(col||[20,20,20]));doc.splitTextToSize(clean(t),W-2*M).forEach(l=>{need(sz*0.45);doc.text(l,M,y);y+=sz*0.42});y+=1.5};
    doc.setFillColor(...BRGB());doc.rect(0,0,W,5,"F");tx(coData().name.toUpperCase(),9,"bold",BRGB());tx("Deletion record",17,"bold");tx(`Printed ${stamp(Date.now())} · ${L.length} entries · ${v.ok?"record intact":"PROBLEM at entry "+v.at+": "+v.why}`,9,"normal",[110,100,100]);y+=2;
    for(const e of L){need(20);doc.setDrawColor(200);doc.line(M,y,W-M,y);y+=4;tx(`#${e.seq}  ${e.action}`,11,"bold");tx(`${stamp(e.at)} · by ${e.by} · ${e.title}`,9,"normal",[90,85,85]);tx(e.details,9);let o=null;try{o=JSON.parse(e.snap)}catch(x){}
      for(const u of imgs(o).slice(0,6)){try{need(24);doc.addImage(u,/^data:image\/png/.test(u)?"PNG":"JPEG",M,y,50,20);y+=22}catch(x){}}
      const flat=[];const walk=(x,p)=>{if(x&&typeof x==="object"&&!Array.isArray(x))Object.entries(x).forEach(([k,val])=>walk(val,p?p+"."+k:k));else if(Array.isArray(x))x.forEach((val,i)=>walk(val,p+"["+i+"]"));else if(!(typeof x==="string"&&/^data:image\//.test(x)))flat.push(p+": "+x)};walk(o,"");tx(flat.slice(0,80).join("\n"),7.5,"normal",[60,55,55]);tx("Check code "+e.hash,7,"normal",[140,130,130])}
    const fn=`Deletion record - ${iso(new Date())}.pdf`,blob=doc.output("blob");if(S.dl){try{await S.dl.save({filename:fn,data:blob});toast("PDF saved")}catch(x){if(!(x&&x.code==="declined"))pdfShow(blob,fn)}}else pdfShow(blob,fn)}}
