/* SiteHQ – QR site sign-in (JEB Building Services)
   A public page for each site: induction (first visit / when it changes), sign in, sign out.
   Records go into this Google Sheet. Sites are sent here from SiteHQ. */
const SHEETS={Sites:["id","name","address","version","data","expiryMonths","autoOut","active","updated"],
  People:["mobile","name","company","siteId","version","inductedAt","lastVisit"],
  Register:["id","siteId","site","name","company","mobile","in","out","how","inducted"]};
const ss=()=>SpreadsheetApp.getActive();
function sh(n){let s=ss().getSheetByName(n);if(!s){s=ss().insertSheet(n);s.appendRow(SHEETS[n]);s.setFrozenRows(1);s.getRange(1,1,1,SHEETS[n].length).setFontWeight("bold")}return s}
function rows(n){const s=sh(n),v=s.getDataRange().getValues(),h=v.shift();return v.map((r,i)=>{const o={_row:i+2};h.forEach((k,j)=>o[k]=r[j]);return o})}
function put(n,o,row){const s=sh(n);const vals=[SHEETS[n].map(k=>o[k]===undefined?"":o[k])];if(row)s.getRange(row,1,1,vals[0].length).setValues(vals);else s.appendRow(vals[0])}
const normMob=m=>String(m||"").replace(/[^\d+]/g,"").replace(/^\+44/,"0").replace(/^44(7\d{9})$/,"0$1");
const props=()=>PropertiesService.getScriptProperties();

/* ---- run once: Extensions › Apps Script › choose "setup" › Run ---- */
function setup(){Object.keys(SHEETS).forEach(sh);
  if(!props().getProperty("ADMIN_KEY"))props().setProperty("ADMIN_KEY",Utilities.getUuid().replace(/-/g,"").slice(0,20));
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==="autoSignOut").forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("autoSignOut").timeBased().everyHours(1).create();
  const k=props().getProperty("ADMIN_KEY");Logger.log("Your SiteHQ key: "+k);try{SpreadsheetApp.getUi().alert("Set up done.\n\nYour SiteHQ key is:\n"+k+"\n\nNext: Deploy › New deployment › Web app (Execute as: Me, Who has access: Anyone), then paste the web app link and this key into SiteHQ › Setup › QR site sign-in.")}catch(e){}}
function onOpen(){SpreadsheetApp.getUi().createMenu("SiteHQ").addItem("Set up / show my key","setup").addItem("Sign everyone out now","signOutAll").addToUi()}

/* ---- web page and SiteHQ links ---- */
function doGet(e){const p=(e&&e.parameter)||{};
  if(p.setup||p.export){if(p.key!==props().getProperty("ADMIN_KEY"))return msg("That key isn't right. Check it in SiteHQ › Setup › QR site sign-in.");return p.setup?adminSetup(p.setup):adminExport(+p.since||0)}
  const t=HtmlService.createTemplateFromFile("Page");t.siteId=String(p.site||"");
  return t.evaluate().setTitle("Site sign-in").addMetaTag("viewport","width=device-width, initial-scale=1").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)}
function msg(t){return HtmlService.createHtmlOutput('<meta name="viewport" content="width=device-width,initial-scale=1"><div style="font:17px system-ui;padding:28px;max-width:520px;margin:auto">'+t+'</div>').setTitle("SiteHQ")}
function adminSetup(b64){const s=JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(b64)).getDataAsString());
  const L=rows("Sites");const ex=L.find(r=>r.id===s.id);
  put("Sites",{id:s.id,name:s.name,address:s.address||"",version:s.version||1,data:JSON.stringify({details:s.details||[],items:s.items||[],company:s.company||"",phone:s.phone||""}),expiryMonths:s.expiryMonths||0,autoOut:s.autoOut||"19:00",active:s.active===false?"no":"yes",updated:new Date()},ex&&ex._row);
  return msg("✅ <b>"+esc(s.name)+"</b> is set up for QR sign-in (induction version "+(s.version||1)+").<br><br>You can close this tab and go back to SiteHQ.")}
function adminExport(since){const R=rows("Register").filter(r=>{const t=r.in?new Date(r.in).getTime():0;const o=r.out?new Date(r.out).getTime():0;return Math.max(t,o)>=since});
  const out=R.map(r=>({id:r.id,siteId:r.siteId,site:r.site,name:r.name,company:r.company,mobile:String(r.mobile).replace(/^'/,""),in:r.in?new Date(r.in).getTime():0,out:r.out?new Date(r.out).getTime():0,how:r.how,inducted:r.inducted}));
  const txt=JSON.stringify({sitehq:"qr",at:Date.now(),rows:out});
  return HtmlService.createHtmlOutput('<meta name="viewport" content="width=device-width,initial-scale=1"><div style="font:16px system-ui;padding:20px;max-width:640px;margin:auto"><h2>QR sign-ins for SiteHQ</h2><p>'+out.length+' records. Tap <b>Copy</b>, then in SiteHQ › Sign-in book tap <b>Import QR sign-ins</b> and paste.</p><button id="c" style="font-size:18px;padding:12px 20px">Copy</button> <span id="m"></span><textarea id="t" style="width:100%;height:220px;margin-top:12px">'+esc(txt)+'</textarea></div><script>document.getElementById("c").onclick=function(){var t=document.getElementById("t");t.select();try{navigator.clipboard.writeText(t.value).then(function(){document.getElementById("m").textContent="Copied ✓"},function(){document.execCommand("copy");document.getElementById("m").textContent="Copied ✓"})}catch(e){document.execCommand("copy");document.getElementById("m").textContent="Copied ✓"}}</script>').setTitle("SiteHQ export")}
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* ---- called from the page ---- */
function siteOf(id){const s=rows("Sites").find(r=>String(r.id)===String(id)&&r.active!=="no");if(!s)return null;let d={};try{d=JSON.parse(s.data||"{}")}catch(e){}return {id:s.id,name:s.name,address:s.address,version:+s.version||1,expiryMonths:+s.expiryMonths||0,details:d.details||[],items:d.items||[],company:d.company||"",phone:d.phone||""}}
function onSiteNow(id){const today=new Date();today.setHours(0,0,0,0);return rows("Register").filter(r=>String(r.siteId)===String(id)&&!r.out&&r.in&&new Date(r.in)>=today).map(r=>({id:r.id,name:r.name,company:r.company,in:Utilities.formatDate(new Date(r.in),"Europe/London","HH:mm")}))}
function getSite(id){const s=siteOf(id);if(!s)return null;return Object.assign(s,{onSite:onSiteNow(id)})}
function checkPerson(siteId,mobile){const m=normMob(mobile);if(!m)return {known:false};const s=siteOf(siteId);if(!s)return {error:"site"};
  const p=rows("People").filter(r=>normMob(r.mobile)===m);const here=p.find(r=>String(r.siteId)===String(siteId));const any=p[p.length-1];
  let need=!here,changed=false,expired=false;
  if(here){if((+here.version||1)<s.version){need=true;changed=true}
    if(!need&&s.expiryMonths>0&&here.lastVisit){const lim=new Date();lim.setMonth(lim.getMonth()-s.expiryMonths);if(new Date(here.lastVisit)<lim){need=true;expired=true}}}
  const open=onSiteNow(siteId).find(r=>normMob((rows("Register").find(x=>x.id===r.id)||{}).mobile)===m);
  return {known:!!any,name:any?any.name:"",company:any?any.company:"",needInduction:need,changed,expired,openId:open?open.id:""}}
function signIn(f){const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{const s=siteOf(f.siteId);if(!s)throw new Error("This site isn't set up");const m=normMob(f.mobile);if(!f.name||!m)throw new Error("Add your name and mobile number");
    const now=new Date();const P=rows("People");const here=P.find(r=>normMob(r.mobile)===m&&String(r.siteId)===String(s.id));
    if(f.inducted){put("People",{mobile:"'"+m,name:f.name,company:f.company||"",siteId:s.id,version:s.version,inductedAt:now,lastVisit:now},here&&here._row)}
    else{const c=checkPerson(s.id,m);if(c.needInduction)throw new Error("Please do the induction first");put("People",Object.assign({},here,{mobile:"'"+m,name:f.name,company:f.company||here.company||"",lastVisit:now}),here._row)}
    const open=onSiteNow(s.id).find(r=>normMob((rows("Register").find(x=>x.id===r.id)||{}).mobile)===m);if(open)return {ok:true,id:open.id,already:true,time:open.in};
    const id="qr-"+Utilities.getUuid().slice(0,12);put("Register",{id,siteId:s.id,site:s.name,name:f.name,company:f.company||"",mobile:"'"+m,in:now,out:"",how:"",inducted:f.inducted?"v"+s.version:""});
    return {ok:true,id,time:Utilities.formatDate(now,"Europe/London","HH:mm")}}finally{lock.releaseLock()}}
function signOut(id){const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{const r=rows("Register").find(x=>x.id===id);if(!r)throw new Error("Couldn't find that sign-in");if(r.out)return {ok:true};const now=new Date();r.out=now;r.how="signed out";put("Register",r,r._row);return {ok:true,time:Utilities.formatDate(now,"Europe/London","HH:mm"),name:r.name}}finally{lock.releaseLock()}}

/* ---- tidy up: anyone still signed in after the site's sign-out time is signed out automatically ---- */
function autoSignOut(){const now=new Date();const S=rows("Sites");rows("Register").filter(r=>r.in&&!r.out).forEach(r=>{const s=S.find(x=>String(x.id)===String(r.siteId));const hm=String((s&&s.autoOut)||"19:00").split(":");
  const cut=new Date(r.in);cut.setHours(+hm[0]||19,+hm[1]||0,0,0);if(now>=cut){r.out=cut;r.how="auto (didn't sign out)";put("Register",r,r._row)}})}
function signOutAll(){const now=new Date();rows("Register").filter(r=>r.in&&!r.out).forEach(r=>{r.out=now;r.how="signed out by office";put("Register",r,r._row)})}
