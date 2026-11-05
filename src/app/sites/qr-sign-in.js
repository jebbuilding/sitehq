/* ================= QR SITE SIGN-IN: a public page (the user's own Google Sheet + script) for induction and sign in / out by QR code ================= */
const QRSITE=(()=>{
const cfg=()=>(S.qrCfg||{});
const sid=site=>{const s=(S.sites||[]).find(x=>same(x.name,site));return String(s&&s.id||site).replace(/[^\w-]/g,"").slice(0,40)||"site"};
const recOf=site=>(S.qrSites||[]).find(x=>same(x.site,site));
let qrP=null;function loadQr(){if(window.qrcode)return Promise.resolve();if(qrP)return qrP;qrP=new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";s.onload=res;s.onerror=()=>{qrP=null;rej(new Error("load"))};document.head.appendChild(s)});return qrP}
const linkFor=site=>{const u=String(cfg().url||"").trim();return u?u+(u.includes("?")?"&":"?")+"site="+encodeURIComponent(sid(site)):""};
async function qrOf(text){await loadQr();const q=window.qrcode(0,"M");q.addData(text);q.make();return q}
/* ---- Setup › QR site sign-in ---- */
function setupView(){const c=cfg();openSheet(`<h3 id="sheettitle">📱 QR site sign-in</h3>
  <div class="who">A QR code on each site office door. Anyone scans it with their phone camera – no app, no login – does the site induction the first time, then signs in and out with their name, company and mobile. Records go into <b>your own Google Sheet</b>, and you import them into the Sign-in book.</div>
  <details class="pmdet" ${c.url?"":"open"}><summary><b>One-off setup (about 10 minutes, on a computer)</b></summary><ol style="padding-left:20px;margin:6px 0">
    <li>Go to <b>sheets.google.com</b> and start a blank sheet. Name it “SiteHQ sign-in”.</li>
    <li>Menu <b>Extensions › Apps Script</b>. Delete what's there and paste in <b>Code.gs</b> (button below).</li>
    <li>Click <b>+</b> beside Files › <b>HTML</b>, name it <b>Page</b> (exactly), and paste in <b>Page.html</b>.</li>
    <li>Click 💾 Save. Choose <b>setup</b> in the function box at the top and click <b>Run</b>. Allow access when Google asks (it's your own script). A box shows your <b>key</b> – copy it.</li>
    <li><b>Deploy › New deployment</b> › ⚙ <b>Web app</b>. Execute as: <b>Me</b>. Who has access: <b>Anyone</b>. Deploy, then copy the <b>Web app URL</b>.</li>
    <li>Paste the URL and key below and Save.</li></ol>
    <div class="who">The two files (Code.gs and Page.html) were sent to you in your chat with Claude.</div></details>
  <label for="qs-url">Web app URL<input id="qs-url" value="${esc(c.url||"")}" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off"></label>
  <label for="qs-key">Your key<input id="qs-key" value="${esc(c.key||"")}" autocomplete="off"></label>
  ${c.url?`<div class="actions"><a class="btn" href="${esc(c.url)}" target="_blank" rel="noopener">Test the link ↗</a></div>`:""}
  ${formFoot(false,"Save")}`,async()=>{const url=$("qs-url").value.trim(),key=$("qs-key").value.trim();if(url&&!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)){showErr("That should be the Web app URL, starting https://script.google.com/");return}
    $("f-save").disabled=true;try{const d=Object.assign({},cfg(),{kind:"qrcfg",url,key,updated:Date.now()});delete d.id;await S.db.doc("todos/qrcfg").set(d);S.qrCfg=d;closeForm();toast("Saved")}catch(e){showErr("Couldn't save.");$("f-save").disabled=false}},"qs-url");
}
/* ---- per site ---- */
function cardHtml(site){const r=recOf(site),ind=indFor(site);const stale=r&&ind&&(r.version||0)<(ind.version||1);
  return `<div class="card qrcard${r?"":" todo"}"><div class="cardbody" style="border:0"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><div><b>📱 QR sign-in for this site</b><div class="who">${r?`Live since ${esc(shortDay(iso(new Date(r.at))))}${stale?' · <b style="color:var(--danger)">induction changed – send it again</b>':""}`:"Put a QR code on the site office: visitors do the induction once, then sign in and out on their own phone."}</div></div>
    <button type="button" class="btn ${r&&!stale?"":"primary"} qr-go" data-site="${esc(site)}">${r?"Poster / update":"Set up QR sign-in"}</button></div></div></div>`}
function open(site){const c=cfg();const ind=indFor(site);
  if(!c.url||!c.key){toast("First set up QR sign-in in Setup");setupView();return}
  if(!ind){toast("Set up the site induction first – that's what visitors read");openIndEditor(site);return}
  const r=recOf(site)||{};const s=(S.sites||[]).find(x=>same(x.name,site))||{};
  openSheet(`<h3 id="sheettitle">📱 QR sign-in – ${esc(site)}</h3>
    <div class="who">Visitors read this site's induction (version ${ind.version||1}) the first time, and again whenever you tick “everyone must re-read” when editing it.</div>
    <div class="grid2"><label for="qq-out">Sign everyone out automatically at<input id="qq-out" type="time" value="${esc(r.autoOut||"19:00")}"></label>
      <label for="qq-exp">Redo the induction if not here for<select id="qq-exp">${[[0,"Never"],[3,"3 months"],[6,"6 months"],[12,"12 months"]].map(([v,l])=>`<option value="${v}" ${+r.expiryMonths===v?"selected":""}>${l}</option>`).join("")}</select></label></div>
    <div class="flabel">1. Send this site to your sign-in sheet</div><div class="who">Opens a tab that says “set up” – then come back here. Do this again after changing the induction.</div>
    <button type="button" class="btn primary" id="qq-send">🔗 Send ${esc(site)} to the sign-in sheet</button>
    <div class="flabel">2. Print the poster for the site office</div><div id="qq-prev" style="display:flex;justify-content:center;padding:8px;background:#fff;border-radius:10px">Making the QR code…</div>
    <div class="actions"><button type="button" class="btn" id="qq-pdf">🖨 Poster PDF</button><button type="button" class="btn" id="qq-copy">📋 Copy the link</button><a class="btn" href="${esc(linkFor(site))}" target="_blank" rel="noopener">Open it ↗</a></div>
    ${formFoot(false,"Done")}`,()=>closeForm());
  qrOf(linkFor(site)).then(q=>{$("qq-prev").innerHTML=q.createSvgTag({cellSize:5,margin:2})}).catch(()=>{$("qq-prev").textContent="Couldn't make the QR code – check your signal."});
  $("qq-copy").onclick=async()=>{try{await navigator.clipboard.writeText(linkFor(site));toast("Link copied")}catch(e){toast(linkFor(site))}};
  $("qq-send").onclick=async()=>{const det=IND_DETAILS.map(([k,l])=>[l,(ind.details||{})[k]||""]).filter(x=>x[1]);const co=coData();
    const payload={id:sid(site),name:site,address:s.address||site,version:ind.version||1,details:det,items:ind.items||[],company:co.name||"",phone:(ind.details||{}).manager||co.mobile||"",expiryMonths:+$("qq-exp").value,autoOut:$("qq-out").value||"19:00",active:true};
    const b64=btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
    const u=c.url+(c.url.includes("?")?"&":"?")+"key="+encodeURIComponent(c.key)+"&setup="+b64;const w=window.open(u,"_blank","noopener");if(!w){const a=document.createElement("a");a.href=u;a.target="_blank";a.rel="noopener";document.body.appendChild(a);a.click();a.remove()}
    try{const d={kind:"qrsite",site,siteId:sid(site),version:ind.version||1,autoOut:payload.autoOut,expiryMonths:payload.expiryMonths,at:r.at||Date.now(),sent:Date.now()};await S.db.doc("todos/qr-"+sid(site)).set(d);S.qrSites=(S.qrSites||[]).filter(x=>!same(x.site,site)).concat([Object.assign({id:"qr-"+sid(site)},d)])}catch(e){}
    toast("Sent – check the new tab says “set up”")};
  $("qq-pdf").onclick=e=>poster(site,e.currentTarget)}
async function poster(site,btn){const lab=btn.textContent;btn.disabled=true;btn.textContent="Making the poster…";
  try{const q=await qrOf(linkFor(site));await loadJsPdf();const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4"});const W=210,H=297,co=coData(),BR=BRGB();
    doc.setFillColor(...BR);doc.rect(0,0,W,30,"F");doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(30);doc.text("SITE SIGN-IN",W/2,20,{align:"center"});
    try{await pdfLogo(doc,W-14,36,40,18)}catch(e){}
    doc.setTextColor(25,22,21);doc.setFontSize(20);doc.text(doc.splitTextToSize(site,W-40),W/2,52,{align:"center"});
    doc.setFont("helvetica","normal");doc.setFontSize(14);doc.text("Scan with your phone camera to sign IN and OUT",W/2,66,{align:"center"});
    const n=q.getModuleCount(),size=140,cell=size/n,x0=(W-size)/2,y0=74;doc.setFillColor(255,255,255);doc.rect(x0-6,y0-6,size+12,size+12,"F");doc.setFillColor(0,0,0);
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))doc.rect(x0+c*cell,y0+r*cell,cell+0.05,cell+0.05,"F");
    let y=y0+size+16;doc.setFont("helvetica","bold");doc.setFontSize(15);
    ["1.  First time here? Read the site induction and tick to confirm.","2.  Sign in with your name, company and mobile.","3.  Scan again when you leave and tap Sign out."].forEach(t=>{doc.text(t,24,y);y+=9});
    doc.setFont("helvetica","normal");doc.setFontSize(11);doc.setTextColor(90,80,80);y+=4;doc.text("Everyone on site must sign in – it's how we know who's here in an emergency.",W/2,y,{align:"center"});y+=6;
    doc.text(`${co.name||""}${co.mobile?" · Site manager "+co.mobile:""}`,W/2,y,{align:"center"});
    doc.setFillColor(...BR);doc.rect(0,H-8,W,8,"F");
    const blob=doc.output("blob");const fn="QR sign-in poster - "+site+".pdf";window.__lastPoster=blob;if(S.dl){try{await S.dl.save({filename:fn,data:blob})}catch(e){pdfShow(blob,fn)}}else pdfShow(blob,fn)}catch(e){toast("Couldn't make the poster – check your signal")}
  btn.disabled=false;btn.textContent=lab}
/* ---- bring the sign-ins into the Sign-in book ---- */
function importDlg(){const c=cfg();if(!c.url){setupView();return}const since=Math.max(0,(c.lastImport||0)-36e5);
  const ex=c.url+(c.url.includes("?")?"&":"?")+"key="+encodeURIComponent(c.key)+"&export=1&since="+since;
  openSheet(`<h3 id="sheettitle">⬇ Import QR sign-ins</h3><div class="who">1. Open your sign-in sheet's export page and tap <b>Copy</b>. 2. Paste it here and tap Import. Anyone already imported is just updated (e.g. their sign-out time).</div>
    <div class="actions"><a class="btn primary" href="${esc(ex)}" target="_blank" rel="noopener">1. Open the export page ↗</a></div>
    <label for="qi-t">2. Paste here<textarea id="qi-t" style="min-height:100px" placeholder='{"sitehq":"qr",…}'></textarea></label>
    ${formFoot(false,"Import")}`,async()=>{let j;try{j=JSON.parse($("qi-t").value.trim())}catch(e){showErr("That doesn't look right – copy it again from the export page.");return}if(!j||j.sitehq!=="qr"||!Array.isArray(j.rows)){showErr("That isn't a SiteHQ QR export.");return}
      $("f-save").disabled=true;let n=0;
      try{for(const r of j.rows){if(!r.id||!r.in)continue;const site=((S.qrSites||[]).find(x=>x.siteId===String(r.siteId))||{}).site||r.site;const din=new Date(r.in),dout=r.out?new Date(r.out):null;const hm=d=>String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
          await S.db.doc("sheets/"+S.me+"/signins/"+r.id).set({site,date:iso(din),in:hm(din),out:dout?hm(dout):"",open:!dout,inAt:+din,guest:{name:r.name||"Visitor",company:r.company||"",phone:r.mobile||""},by:"owner",byName:"QR sign-in",qr:true,qrHow:r.how||"",inducted:r.inducted||"",created:+din});n++}
        const d=Object.assign({},cfg(),{kind:"qrcfg",lastImport:j.at||Date.now()});delete d.id;await S.db.doc("todos/qrcfg").set(d);S.qrCfg=d;closeForm();toast(n+" QR sign-in"+(n===1?"":"s")+" imported");render()}
      catch(e){showErr("Couldn't save. Check your connection.");$("f-save").disabled=false}})}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest(".qr-go");if(b){e.preventDefault();open(b.dataset.site)}});
return {setupView,cardHtml,open,importDlg,sid};
})();
