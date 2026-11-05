/* ===== Day work spreadsheet (.xlsx, falls back to .csv) ===== */
let xlsxP=null;
function loadXlsx(){if(window.XLSX)return Promise.resolve();if(xlsxP)return xlsxP;xlsxP=new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";s.onload=res;s.onerror=()=>{xlsxP=null;rej(new Error("load"))};document.head.appendChild(s)});return xlsxP}
function dwXlsPick(site,items,money,pre){const ppl=[...new Set(items.filter(e=>!e.line).map(e=>e.who))].sort((a,b)=>nameOf(a).localeCompare(nameOf(b)));const hasLines=items.some(e=>e.line);
  const tot=w=>{const g=items.filter(e=>!e.line&&e.who===w);return `${hrs(sumH(g,()=>true))} h · ${gbp(g.reduce((a,e)=>a+money(e),0))}`};
  openSheet(`<h3 id="sheettitle">📊 Spreadsheet · ${esc(site)}</h3><div class="who">Downloads the ticked lines as an Excel spreadsheet. Pick who to include.</div>
    <div class="xlsopts">
      <label class="xlsopt"><input type="radio" name="xls-who" value="" ${pre&&ppl.includes(pre)?"":"checked"}><span><b>👥 Everyone on this job</b><span class="who">${ppl.length} ${ppl.length===1?"person":"people"} · ${hrs(sumH(items.filter(e=>!e.line),()=>true))} h · ${gbp(items.reduce((a,e)=>a+money(e),0))}${hasLines?" incl. materials":""}</span></span></label>
      ${ppl.map(w=>`<label class="xlsopt"><input type="radio" name="xls-who" value="${esc(w)}" ${pre===w?"checked":""}>${avatarHtml(w,32)}<span><b>${esc(nameOf(w))}</b><span class="who">${esc(tot(w))}</span></span></label>`).join("")}
    </div>
    ${hasLines?`<label class="inl" style="margin-top:8px"><input type="checkbox" id="xls-mats" checked> Include materials &amp; other charges</label>`:""}
    ${formFoot(false,"⬇ Download spreadsheet")}`,async()=>{const w=(document.querySelector('input[name="xls-who"]:checked')||{}).value||"";const mats=$("xls-mats")?$("xls-mats").checked:false;
      const list=items.filter(e=>e.line?mats:(!w||e.who===w));if(!list.length){showErr("Nothing to put in it");return}closeForm();await dwXls(site,list,money,w)},null)}
async function dwXls(site,items,money,who){if(!S.dl){toast("Downloads only work when the page is opened in claude.ai");return}
  const tradeOf=id=>{const d=(S.team[id]&&S.team[id].details)||{};return (d.trade||"").trim()||EMP_TYPES[empTypeOf(id)]||""};
  const sorted=items.slice().sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.line?1:0)-(b.line?1:0)||nameOf(a.who).localeCompare(nameOf(b.who)));
  const head=["Date","Day","Person","Trade","Job / site","What was done","Materials used","Notes","Hours / Qty","Unit","Rate £","Amount £","Status","Invoice ref"];
  const rows=sorted.map(e=>{const d=e.date?parse(e.date):null;return [d?d.toLocaleDateString("en-GB"):"",d?d.toLocaleDateString("en-GB",{weekday:"short"}):"",e.line?"Materials / other":nameOf(e.who),e.line?"":tradeOf(e.who),e.job||e.site||"",e.line?(e.desc||""):(e.task||""),e.line?"":(e.mats||""),e.line?"":(e.notes||""),e.line?(+e.qty||0):(+e.hours||0),e.line?(e.unit||""):"hours",e.line?(+e.rate||0):dwRate(e.who),Math.round(money(e)*100)/100,e.billed?"Billed":e.approved?"Approved":"To bill",e.billed&&e.billed.ref||""]});
  const labH=sorted.filter(e=>!e.line).reduce((a,e)=>a+(+e.hours||0),0),labM=sorted.filter(e=>!e.line).reduce((a,e)=>a+money(e),0),matM=sorted.filter(e=>e.line).reduce((a,e)=>a+money(e),0);
  const r2=n=>Math.round(n*100)/100;
  const totals=[[],["","","","","","Labour total","","",r2(labH),"hours","",r2(labM)]].concat(matM?[["","","","","","Materials & other charges","","","","","",r2(matM)]]:[]).concat([["","","","","","TOTAL (plus VAT if applicable)","","","","","",r2(labM+matM)]]);
  const ppl=[...new Set(sorted.filter(e=>!e.line).map(e=>e.who))];
  const summary=[["Person","Trade","Hours","Rate £","Amount £"]].concat(ppl.map(w=>{const g=sorted.filter(e=>!e.line&&e.who===w);const h=g.reduce((a,e)=>a+(+e.hours||0),0);return [nameOf(w),tradeOf(w),r2(h),dwRate(w),r2(g.reduce((a,e)=>a+money(e),0))]})).concat(matM?[["Materials & other charges","","","",r2(matM)]]:[]).concat([["Total","",r2(labH),"",r2(labM+matM)]]);
  const co=coData();const c=siteClient(site);
  const top=[[co.name+" · Day work"],["Job / site",site],...(c?[["Client",c.name+(clAddr(c)?", "+clAddr(c):"")]]:[]),["Who",who?nameOf(who):"Everyone on this job"],["Made",new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})],[]];
  const base=(site+" day work"+(who?" - "+nameOf(who):"")+" "+iso(new Date())).replace(/[^\w\s.-]/g,"").replace(/\s+/g," ").trim();
  toast("Making the spreadsheet…");
  try{await loadXlsx()}catch(e){csvSave(base+".csv",top.concat([head],rows,totals));return}
  try{const X=window.XLSX;const wb=X.utils.book_new();
    const ws=X.utils.aoa_to_sheet(top.concat([head],rows,totals));ws["!cols"]=[11,6,18,14,22,40,24,24,10,8,9,11,10,12].map(w=>({wch:w}));
    const hr=top.length;for(let r=hr+1;r<hr+1+rows.length+totals.length;r++){["K","L"].forEach(col=>{const cl=ws[col+(r+1)];if(cl&&typeof cl.v==="number")cl.z="£#,##0.00"})}
    ws["!autofilter"]={ref:X.utils.encode_range({s:{r:hr,c:0},e:{r:hr+rows.length,c:head.length-1}})};
    X.utils.book_append_sheet(wb,ws,"Day work");
    if(!who||matM){const s2=X.utils.aoa_to_sheet(summary);s2["!cols"]=[{wch:26},{wch:16},{wch:8},{wch:8},{wch:12}];for(let r=2;r<=summary.length;r++)["D","E"].forEach(col=>{const cl=s2[col+r];if(cl&&typeof cl.v==="number")cl.z="£#,##0.00"});X.utils.book_append_sheet(wb,s2,"Summary")}
    const out=X.write(wb,{bookType:"xlsx",type:"array"});
    await S.dl.save({filename:base+".xlsx",data:new Blob([out],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})})}
  catch(e){if(!(e&&e.code==="declined"))toast("Download didn't go through")}}

