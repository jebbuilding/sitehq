/* ================= WEEKLY PAY SUMMARY ================= */
import { $, addDays, esc, gbp, hrs, iso, stamp, toast } from "../core/helpers.js";
import { S, weekDays } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { csvSave } from "../files/files.js";
import { nameOf, roleOf, teamPlusMe, weekEntries } from "../owner/owner.js";
import { EMP_TYPES } from "../people/employment-types.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { isInv } from "../purchasing/materials-receipts.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { sumH } from "./time.js";
export { openPaySummary };
function paySummaryRows(){
  const days=weekDays().map(iso), s=iso(S.week), f=iso(addDays(S.week,6));
  return teamPlusMe().map(id=>{const we=weekEntries(id); const det=(S.team[id]&&S.team[id].details)||{};
    const per=days.map(d=>sumH(we,e=>e.type==="hours"&&e.date===d));
    const inv=((id===S.me?S.mine.invoices:S.data.invoices&&S.data.invoices[id])||[]).filter(v=>isInv(v)&&v.sentAt&&iso(new Date(v.sentAt))>=s&&iso(new Date(v.sentAt))<=f);
    return {id,name:nameOf(id),type:EMP_TYPES[det.empType]||({sub:"Subcontractor",employee:"Employee"})[roleOf(id)]||"Not set",cis:det.empType==="cis",per,total:per.reduce((a,b)=>a+b,0),
      extra:sumH(we,e=>e.type==="job"&&e.kind==="extra"),unapproved:we.filter(e=>!e.approved).length,open:we.filter(e=>e.open).length,invN:inv.length,invT:inv.reduce((a,v)=>a+(+v.amount||0),0)}}).filter(r=>r.total||r.extra||r.invN);
}
function openPaySummary(){
  const rows=paySummaryRows(), days=weekDays();
  const wk=`${days[0].toLocaleDateString("en-GB",{day:"numeric",month:"short"})} – ${days[6].toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}`;
  const warn=rows.filter(r=>r.unapproved||r.open);
  openViewer(`<h3 style="font-family:var(--f-display);margin:0">Weekly pay summary</h3><div class="who">Week ${esc(wk)}</div>
    ${warn.length?`<div class="notice warn" style="margin-top:8px">${warn.map(r=>`${esc(r.name)}: ${r.unapproved?r.unapproved+" not approved":""}${r.unapproved&&r.open?", ":""}${r.open?"still checked in":""}`).join(" · ")}</div>`:""}
    ${rows.length?`<div class="tablewrap" style="margin-top:8px"><table class="paytbl"><thead><tr><th>Name</th>${days.map(d=>`<th class="num">${d.toLocaleDateString("en-GB",{weekday:"short"})}</th>`).join("")}<th class="num">Hours</th><th class="num">Extra work</th><th class="num">Invoiced</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td><b>${esc(r.name)}</b><div class="who">${esc(r.type)}</div></td>${r.per.map(h=>`<td class="num">${h?hrs(h):"–"}</td>`).join("")}<td class="num"><b>${hrs(r.total)}</b></td><td class="num">${r.extra?hrs(r.extra):"–"}</td><td class="num">${r.invN?gbp(r.invT)+`<div class="who">${r.invN} invoice${r.invN===1?"":"s"}</div>`:"–"}</td></tr>`).join("")}
      <tr class="paytot"><td><b>Total</b></td>${days.map((d,i)=>{const v=rows.reduce((a,r)=>a+r.per[i],0);return `<td class="num">${v?hrs(v):"–"}</td>`}).join("")}<td class="num"><b>${hrs(rows.reduce((a,r)=>a+r.total,0))}</b></td><td class="num">${hrs(rows.reduce((a,r)=>a+r.extra,0))}</td><td class="num">${gbp(rows.reduce((a,r)=>a+r.invT,0))}</td></tr></tbody></table></div>
      ${rows.some(r=>r.cis)?`<div class="who" style="margin-top:6px">CIS: deduct tax from the labour part of each CIS invoice (20% if registered, 30% if not, none if they have gross status). Materials aren't taxed.</div>`:""}
      <div class="actions" style="margin-top:12px"><button class="btn primary" id="ps-csv" type="button">Download for bookkeeper (CSV)</button><button class="btn" id="ps-pdf" type="button">Download PDF</button></div>`
      :'<div class="empty"><strong>Nothing logged this week</strong>Use the arrows at the top to pick another week.</div>'}`);
  if($("ps-csv")) $("ps-csv").onclick=()=>{const r=[["Name","Type",...days.map(d=>d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})),"Timesheet hours","Extra work hours","Invoices this week","Invoiced total","Entries not approved"]];
    rows.forEach(x=>r.push([x.name,x.type,...x.per.map(h=>h?h.toFixed(2):""),x.total.toFixed(2),x.extra.toFixed(2),x.invN,x.invT.toFixed(2),x.unapproved]));csvSave("Pay summary week of "+iso(S.week)+".csv",r)};
  if($("ps-pdf")) $("ps-pdf").onclick=()=>paySummaryPdf(rows,wk);
}
async function paySummaryPdf(rows,wk){
  if(!S.dl){toast("Downloads only work when the page is opened in claude.ai");return}
  toast("Making the PDF…"); try{await loadJsPdf()}catch(e){toast("Couldn't load the PDF maker. Check your connection.");return}
  const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4",orientation:"landscape"}); const W=297,M=14; let y=16;
  const clean=t=>String(t||"").replace(/[–—]/g,"-").replace(/[^\x09\x0A\x0D\x20-\x7E£·]/g,"");
  doc.setFillColor(...BRGB());doc.rect(0,0,W,5,"F");
  await pdfLogo(doc,W-M,9,46,21);
  doc.setFont("helvetica","bold");doc.setFontSize(9);doc.text("JEB BUILDING SERVICES",M,y);y+=8;doc.setFontSize(17);doc.text("Weekly pay summary",M,y);y+=7;doc.setFontSize(11);doc.setFont("helvetica","normal");doc.text(clean("Week "+wk),M,y);y+=12;
  const days=weekDays().map(d=>d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric"}));
  const cols=[["Name",52],["Type",40],...days.map(d=>[d,17]),["Hours",18],["Extra",17],["Invoiced",26]];
  const row=(cells,bold)=>{let x=M;doc.setFont("helvetica",bold?"bold":"normal");doc.setFontSize(9);cells.forEach((c,i)=>{const w=cols[i][1];const t=clean(c);i>1?doc.text(t,x+w-2,y,{align:"right"}):doc.text(doc.splitTextToSize(t,w-2)[0]||"",x,y);x+=w});y+=7;if(y>190){doc.addPage();y=18}};
  row(cols.map(c=>c[0]),true);doc.setDrawColor(150);doc.line(M,y-5,W-M,y-5);
  rows.forEach(r=>row([r.name,r.type,...r.per.map(h=>h?hrs(h):"-"),hrs(r.total),r.extra?hrs(r.extra):"-",r.invN?gbp(r.invT):"-"]));
  doc.line(M,y-5,W-M,y-5);
  row(["Total","",...days.map((d,i)=>{const v=rows.reduce((a,r)=>a+r.per[i],0);return v?hrs(v):"-"}),hrs(rows.reduce((a,r)=>a+r.total,0)),hrs(rows.reduce((a,r)=>a+r.extra,0)),gbp(rows.reduce((a,r)=>a+r.invT,0))],true);
  y+=4;doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.text(clean(`Made ${stamp(Date.now())}. Hours are paid timesheet hours (1pm break taken off). Extra work is from job logs marked extra.`),M,y);
  try{await S.dl.save({filename:"Pay summary week of "+iso(S.week)+".pdf",data:doc.output("blob")})}catch(e){if(!(e&&e.code==="declined"))toast("Download didn't go through")}
}

