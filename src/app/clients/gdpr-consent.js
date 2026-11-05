/* ===== Client GDPR / privacy consent: link to the policy + e-signature (in person or in their portal) ===== */
const GDPR_TXT="I have read and accept the privacy (GDPR) policy, and I agree to my details being kept and used to carry out my job.";
function gdprPolicy(){const ps=(S.policies||[]).filter(d=>d.assetId);const pick=(S.settings||{}).gdprPolicyId;return ps.find(d=>d.id===pick)||ps.find(d=>/gdpr|privacy|data protection/i.test((d.title||"")+" "+(d.fileName||"")))||null}
function clGdprHtml(c){const g=c.gdpr,pol=gdprPolicy(),req=c.gdprReq;
  return `<div class="card gdprcard" id="cv-gdpr"><div class="checkhead"><b>🔒 Privacy / GDPR</b>${g&&g.status==="signed"?'<span class="tag ok">✓ Accepted</span>':req?'<span class="tag day">Sent to sign</span>':'<span class="tag bad">Not signed</span>'}</div>
    ${pol?`<button type="button" class="linkbtn" id="gd-view">📄 ${esc(pol.title||"Privacy policy")}</button>`:`<div class="who">No privacy policy found. Add it in <b>Policies &amp; insurance</b> with "GDPR" or "Privacy" in the name${(S.policies||[]).some(d=>d.assetId)?", or pick one below":""}.</div>
      ${(S.policies||[]).some(d=>d.assetId)?`<select id="gd-pick" style="margin-top:6px"><option value="">Pick your privacy policy…</option>${(S.policies||[]).filter(d=>d.assetId).map(d=>`<option value="${esc(d.id)}">${esc(d.title||d.fileName||"Document")}</option>`).join("")}</select>`:`<button type="button" class="btn" id="gd-gopol" style="margin-top:6px">Go to Policies &amp; insurance</button>`}`}
    ${g&&g.status==="signed"?`<div class="who" style="margin-top:6px">Signed by <b>${esc(g.name||c.name)}</b> on ${esc(stamp(g.at))} ${g.method==="portal"?"in their portal":"in person"}${g.policy?` · policy: ${esc(g.policy)}`:""}</div>${g.sig?`<img src="${g.sig}" alt="Client signature" class="ptsig">`:""}<div class="who">🔒 Locked. Changing it needs your PIN.${(c.gdprHistory||[]).length?` Earlier signatures kept: ${c.gdprHistory.length}.`:""}</div>
      ${c.gdprPdf&&c.gdprPdf.for===g.at?`<div class="who">📄 Signed copy saved in their portal (Documents) ${esc(stamp(c.gdprPdf.at))}</div>`:""}
      <div class="actions"><button type="button" class="btn" id="gd-pdf">📄 Download record</button>${c.gdprPdf&&c.gdprPdf.for===g.at?"":`<button type="button" class="btn" id="gd-toportal">📤 Save PDF to their portal</button>`}<button type="button" class="linkbtn" id="gd-again">🔒 Sign again (PIN)</button></div>`
    :`${req?`<div class="who" style="margin-top:6px">Sent to their portal ${esc(stamp(req.at))}. <span id="gd-chk">Checking…</span></div>`:""}
      <div class="actions"><button type="button" class="btn primary" id="gd-sign">✍ Sign now on this phone</button><button type="button" class="btn" id="gd-send">📤 ${req?"Send again":"Send to their portal to sign"}</button></div>`}</div>`}
function wireClGdpr(c){const pol=gdprPolicy();
  const v=$("gd-view");if(v&&pol)v.onclick=()=>openFile(pol.assetId,pol.fileName||(pol.title||"Privacy policy")+".pdf",pol.contentType||"application/pdf");
  const gp=$("gd-gopol");if(gp)gp.onclick=()=>{closeViewer();S.otab="policies";store.set("jeb.otab","policies");render()};
  const pk=$("gd-pick");if(pk)pk.onchange=async()=>{if(!pk.value)return;try{await S.db.doc("settings/app").update({gdprPolicyId:pk.value});S.settings=Object.assign({},S.settings,{gdprPolicyId:pk.value});toast("Privacy policy set");viewClient(ptCl(c))}catch(e){toast("Couldn't save")}};
  const sg=$("gd-sign");if(sg)sg.onclick=()=>gdprSignNow(c);const ag=$("gd-again");if(ag)ag.onclick=()=>askOwnerPin("The signature is locked. Enter your PIN to let them sign again. The current signature is kept in your permanent deletion record.",async()=>{if(await auditFirst("GDPR signature unlocked to sign again",c.name,`Signed by ${(c.gdpr||{}).name||"?"}${(c.gdpr||{}).at?" on "+stamp(c.gdpr.at):""} (${(c.gdpr||{}).method||""}).`,c.gdpr||null))gdprSignNow(c,true)});
  const sd=$("gd-send");if(sd)sd.onclick=()=>gdprSend(c);
  const pd=$("gd-pdf");if(pd)pd.onclick=()=>gdprPdf(ptCl(c));const tp=$("gd-toportal");if(tp)tp.onclick=()=>{tp.disabled=true;tp.textContent="Saving…";gdprToPortal(c)};
  /* if sent to the portal, look for their answer and keep it on the client */
  if(c.gdprReq&&!(c.gdpr&&c.gdpr.status==="signed")){(async()=>{let x=null;const p=ptOf(c);
      try{if(p){const d=await S.db.doc("portal/"+p.id+"/signs/"+c.gdprReq.id).get();x=d.exists?d.data():null}else x=(ptCl(c).ptSigns||[]).find(y=>y.id===c.gdprReq.id)||null}catch(e){}
      const el=$("gd-chk");if(!x){if(el)el.textContent=p?"Not opened yet.":"They haven't joined their portal yet. It's waiting for them.";return}
      if(x.status==="signed"){try{const rec=await saveClient(Object.assign({},ptCl(c),{gdpr:{status:"signed",at:x.signedAt,name:x.signedName,sig:x.sig||"",method:"portal",policy:c.gdprReq.policy||""},notes:(ptCl(c).notes||[]).concat([{text:"Accepted the privacy (GDPR) policy in their portal",at:Date.now(),auto:true}])}));if($("cv-gdpr"))viewClient(rec);render();gdprToPortal(rec,true)}catch(e){}}
      else if(el)el.textContent=x.status==="changes"?"They didn't sign"+(x.comment?": “"+x.comment+"”":"")+".":"Waiting for them to sign."})()}}
function gdprSignNow(c,unlocked){const pol=gdprPolicy();closeViewer();
  openSheet(`<h3 id="sheettitle">🔒 Privacy policy (GDPR)</h3><div class="who">Hand the phone to ${esc(c.name)} to read and sign.</div>
    ${pol?`<button type="button" class="btn" id="gs-view" style="margin-top:8px">📄 Read the ${esc(pol.title||"privacy policy")}</button>`:`<div class="notice warn">No privacy policy has been added yet, so there's nothing to link to. Add it in Policies &amp; insurance first if you can.</div>`}
    <label class="inl ptconfirm" style="margin-top:10px"><input type="checkbox" id="gs-ok"> ${esc(GDPR_TXT)}</label>
    <label for="gs-name">Full name<input id="gs-name" maxlength="80" value="${esc(c.name||"")}"></label>
    <div><div class="checkhead"><span class="flabel" style="margin:0">Sign with your finger</span><button type="button" class="pillbtn" id="gs-clear">Clear</button></div><canvas id="gs-sig" class="sigpad" aria-label="Signature box"></canvas></div>
    ${formFoot(false,"✍ Sign and accept")}`,async()=>{const name=$("gs-name").value.trim();if(!$("gs-ok").checked){showErr("Tick the box to accept the policy.");return}if(!name){showErr("Add the full name.");return}if(!sig.drawn){showErr("Please sign in the box.");return}
      $("f-save").disabled=true;const now=Date.now();
      try{const cur=ptCl(c);if(unlocked)S.gdprUnlock=true;const prev=cur.gdpr&&cur.gdpr.status==="signed"?[cur.gdpr].concat(cur.gdprHistory||[]):(cur.gdprHistory||[]);
        const rec=await saveClient(Object.assign({},cur,{gdpr:{status:"signed",at:now,name,sig:sig.data(),method:"in person",policy:pol?(pol.title||"Privacy policy"):"",device:navigator.userAgent.slice(0,160)},gdprHistory:prev.slice(0,10),notes:(cur.notes||[]).concat([{text:unlocked?"Signed the privacy (GDPR) policy again (unlocked with PIN)":"Signed the privacy (GDPR) policy in person",at:now,auto:true}])}));S.gdprUnlock=false;
        closeForm();toast("Signed and locked. Thank you!");viewClient(rec);render();gdprToPortal(rec,true)}catch(e){S.gdprUnlock=false;showErr("Couldn't save. Check your connection.");$("f-save").disabled=false}},null);
  const sig=sigPad($("gs-sig"));$("gs-clear").onclick=()=>sig.clear();const gv=$("gs-view");if(gv&&pol)gv.onclick=()=>openFile(pol.assetId,pol.fileName||"Privacy policy.pdf",pol.contentType||"application/pdf")}
async function gdprSend(c){const pol=gdprPolicy();if(!pol){toast("Add your privacy policy in Policies & insurance first");return}
  try{const src=ptSrc(c);const id=newId();const now=Date.now();
    await src.addSign(id,{kind:"gdpr",title:"Privacy policy (GDPR)",details:"Please read our privacy policy and sign to confirm you're happy with how we keep and use your details.",docIds:[],files:[{assetId:pol.assetId,name:pol.fileName||(pol.title||"Privacy policy")+".pdf",type:pol.contentType||"application/pdf"}],statement:GDPR_TXT,status:"open",created:now});try{await src.bump()}catch(e){}
    const rec=await saveClient(Object.assign({},ptCl(c),{gdprReq:{id,at:now,policy:pol.title||"Privacy policy"}}));toast(src.linked?"Sent to their portal to sign":"Saved. They'll see it to sign when they join their portal");viewClient(rec)}catch(e){toast("Couldn't send. Check your connection.")}}
async function gdprPdf(c){if(!c.gdpr)return;if(!S.dl){toast("Downloads only work when the page is opened in claude.ai");return}
  let r;try{r=await gdprPdfBlob(c)}catch(e){toast("Couldn't load the PDF maker. Check your connection.");return}
  try{await S.dl.save({filename:r.name,data:r.blob})}catch(e){if(!(e&&e.code==="declined"))toast("Download didn't go through")}}
async function gdprToPortal(c,quiet){c=ptCl(c);if(!c.gdpr||c.gdpr.status!=="signed")return;if(!S.assets){if(!quiet)toast(uploadErr({code:"not_granted"}));return}
  try{const r=await gdprPdfBlob(c);const a=await uploadFile(r.blob,r.name);const src=ptSrc(c);const id=newId();
    await src.addDoc(id,{title:"Privacy policy (GDPR) consent: signed "+new Date(c.gdpr.at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}),fileName:r.name,assetId:a.id,contentType:"application/pdf",folder:"other",note:"Your signed privacy (GDPR) consent. Keep this for your records.",sharedAt:Date.now()});try{await src.bump()}catch(e){}
    const rec=await saveClient(Object.assign({},ptCl(c),{gdprPdf:{assetId:a.id,docId:id,at:Date.now(),for:c.gdpr.at}}));toast(src.linked?"Signed consent PDF saved to their portal":"Signed consent PDF saved. They'll see it in their portal when they join");if($("cv-gdpr"))viewClient(rec);render()}
  catch(e){if(!quiet)toast("Couldn't save the PDF to their portal. Check your connection.")}}
async function gdprPdfBlob(c){const g=c.gdpr;await loadJsPdf();
  const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4"});const W=210,M=16;let y=18;const co=coData();const clean=t=>String(t||"").replace(/[–—]/g,"-").replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[^\x09\x0A\x0D\x20-\x7E£·•°]/g,"");
  doc.setFillColor(...BRGB());doc.rect(0,0,W,6,"F");await pdfLogo(doc,W-M,10,50,22);doc.setFont("helvetica","bold");doc.setFontSize(9);doc.text(clean(co.name.toUpperCase()),M,y);y+=9;
  doc.setFontSize(17);doc.text("Privacy policy (GDPR) consent",M,y);y+=10;doc.setFont("helvetica","normal");doc.setFontSize(10.5);
  [["Client",c.name],["Address",clAddr(c)],["Policy",g.policy||"Privacy policy"],["Signed",new Date(g.at).toLocaleString("en-GB",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})],["How",g.method==="portal"?"Signed online in their client portal":"Signed in person"]].forEach(([k,v])=>{doc.setFont("helvetica","bold");doc.text(k,M,y);doc.setFont("helvetica","normal");doc.text(doc.splitTextToSize(clean(v||"-"),W-2*M-30),M+30,y);y+=7});
  y+=4;doc.setFont("helvetica","bold");doc.text("They agreed:",M,y);y+=6;doc.setFont("helvetica","normal");const ls=doc.splitTextToSize(clean(GDPR_TXT),W-2*M);doc.text(ls,M,y);y+=ls.length*5+8;
  doc.text(clean("Name: "+(g.name||c.name)),M,y);y+=6;if(g.sig){try{doc.addImage(g.sig,"PNG",M,y,70,28)}catch(e){}y+=32}doc.setDrawColor(150);doc.line(M,y,M+70,y);
  return {blob:doc.output("blob"),name:clean("GDPR consent - "+c.name).replace(/[^\w\s-]/g,"").trim()+".pdf"}}

