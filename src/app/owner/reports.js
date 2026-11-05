/* ================= OWNER: REPORTS ================= */
function openMonthly(){
  openSheet(`<h3 id="sheettitle">Monthly report by site</h3>
    <label for="m-month">Month<input id="m-month" type="month" required value="${iso(new Date()).slice(0,7)}"></label>
    <div class="who">One row per site and employee, with timesheet, extra work and tracked task hours.</div>
    ${formFoot(false,"Download (CSV)")}`,()=>{
      const m=$("m-month").value; if(!m){showErr("Choose a month.");return}
      const ents=allTeam("entries").filter(e=>e.date&&e.date.slice(0,7)===m);
      const key={}; ents.forEach(e=>{const k=(e.job||"No site given")+"\u0000"+e.who;(key[k]=key[k]||{site:e.job||"No site given",who:e.who,ts:0,x:0,t:0,days:new Set()});
        const r=key[k]; if(e.type==="hours"){r.ts+=+e.hours||0;r.days.add(e.date)} else if(e.kind==="extra") r.x+=+e.hours||0; else r.t+=+e.hours||0});
      const list=Object.values(key).sort((a,b)=>a.site.localeCompare(b.site)||nameOf(a.who).localeCompare(nameOf(b.who)));
      if(!list.length){showErr("Nothing logged in that month.");return}
      const rows=[["Site","Employee","Days on site","Timesheet hours","Extra work hours","Tracked task hours"]];
      let cur=null, sub=null;
      const flush=()=>{if(sub)rows.push([cur+" total","","",sub.ts,sub.x,sub.t])};
      list.forEach(r=>{if(r.site!==cur){flush();cur=r.site;sub={ts:0,x:0,t:0}}sub.ts+=r.ts;sub.x+=r.x;sub.t+=r.t;rows.push([r.site,nameOf(r.who),r.days.size,r.ts,r.x,r.t])});
      flush();
      rows.push(["All sites","","",list.reduce((a,r)=>a+r.ts,0),list.reduce((a,r)=>a+r.x,0),list.reduce((a,r)=>a+r.t,0)]);
      const label=new Date(m+"-01T12:00:00").toLocaleDateString("en-GB",{month:"long",year:"numeric"});
      csvSave(`Hours by site - ${label}.csv`,rows); closeForm();
    },"m-month");
}
function openCheckHistory(){
  const all=allTeam("checks").map(c=>Object.assign(ck(c),{who:c.who}));
  const assets=[...new Set(all.map(c=>c.kind+"\u0000"+c.asset))].map(k=>k.split("\u0000")).sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1]));
  openSheet(`<h3 id="sheettitle">Download check history</h3>
    <label for="h-asset">Vehicle, digger or machine<select id="h-asset"><option value="">Everything</option>${assets.map(([k,n])=>`<option value="${esc(k+"\u0000"+n)}">${esc(KINDS[k].name+": "+n)}</option>`).join("")}</select></label>
    <div class="grid2"><label for="h-from">From<input id="h-from" type="date" value="${iso(addDays(new Date(),-90))}"></label>
    <label for="h-to">To<input id="h-to" type="date" value="${iso(new Date())}"></label></div>
    <div class="who">Every check, with who did it, the result, each item marked Defect or N/A, notes and whether it was fixed. Keep this for insurance, HSE or hire companies.</div>
    ${formFoot(false,"Download (CSV)")}`,()=>{
      const sel=$("h-asset").value, from=$("h-from").value||"0000", to=$("h-to").value||"9999";
      const list=all.filter(c=>(!sel||c.kind+"\u0000"+c.asset===sel)&&c.date>=from&&c.date<=to).sort((a,b)=>a.date.localeCompare(b.date));
      if(!list.length){showErr("No checks in that period.");return}
      const rows=[["Date","Type","Vehicle / machine","Checked by","Reading","Result","Safe to use","Defects","Marked N/A","Notes","Defect photos","Fixed"]];
      list.forEach(c=>{const K=KINDS[c.kind]||KINDS.vehicle;const na=K.items.filter(([k])=>c.items&&c.items[k]==="na").map(([,l])=>l.split(":")[0]);
        rows.push([c.date,K.name,c.asset,nameOf(c.who),c.reading?`${K.reading||""} ${c.reading}`.trim():"",hasProblem(c)?"Defects":"All OK",c.safe===false?"No":"Yes",defectsOf(c).join("; "),na.join("; "),c.notes||"",(c.photos||[]).length,hasProblem(c)?(c.fixed?"Yes":"No"):""])});
      const nm=sel?sel.split("\u0000")[1].replace(/[^\w\s-]/g,"").trim():"All equipment";
      csvSave(`Check history - ${nm} - ${from} to ${to}.csv`,rows); closeForm();
    },"h-asset");
}

