/* ================= ASK CLAUDE (helper in the top corner) ================= */
import { $, esc, nowHM, toast } from "./helpers.js";
import { S, ownerMode, siteNames } from "./state.js";
import { EMP_TABS, OWN_TABS, curTab, empTabs } from "./tabs-week.js";
import { myTrade } from "../photos/photos.js";
import { WE, WS } from "../timesheets/working-day.js";
export { aiClose, startAi };
const AI={sample:null,turns:[],busy:false,ctl:null};
const TAB_HELP={signin:"sign in and out of site (the site sign-in book; timesheet check-ins fill it automatically)",time:"check in and out of site, add timesheet days and job time",chat:"team, group, direct and site chats; phone button to call",planner:"key dates, holiday requests, week/month/year views",jobs:"job sheets, snag lists and to-dos to tick off with photos",checks:"Reports: vehicle, digger, trailer, machinery checks, scaffold/excavation/ladder inspections, accident and near-miss reports",photos:"take or add site photos, stamped with address, GPS, date, weather, trade",materials:"ask for materials or tools for a job",suppliers:"supplier phone numbers and account details",receipts:"fuel and material receipts",invoices:"self-employed invoices",plans:"Sites tab: each site has Plans & drawings, RAMS to read and sign, Specs & docs, the site induction and the site chat",training:"toolbox talks, training, cards and certificates",policies:"company policies and insurance to read",calc:"area m², volume m³, materials needed, normal calculator",details:"personal details, next of kin, personal documents (licence, passport)",todo:"James's private to-do list",projects:"each site's page: photos, documents, key dates, site chat",people:"everyone's details, documents, leavers",setup:"sites, vehicles and plant, dates, working day, backup",me:"fill in forms as yourself"};
function aiRules(){
  const owner=ownerMode(); const tabs=(owner?OWN_TABS:empTabs()).map(([k,l])=>`- ${l}: ${TAB_HELP[k]||""}`).join("\n");
  const name=owner?(S.ownerName||"James Bray"):((S.myProfile&&S.myProfile.name)||"a trade");
  const trade=myTrade();
  return `You are Claude, an AI assistant built into "SiteHQ", the site management app used by JEB Building Services, a building company in Exmouth, Devon, UK, run by James Bray.
You are talking to ${name}${owner?" (James, the owner)":`, one of the trades${trade?" ("+trade+")":""}`}. Today is ${new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}, ${nowHM()}. They are on the "${((owner?OWN_TABS:EMP_TABS).find(t=>t[0]===curTab())||[,"Time"])[1]}" tab.
Paid day: ${WS()}–${WE()}, the 10am break is paid, the 1pm half hour is unpaid.
Sites in the app: ${siteNames().slice(0,40).join("; ")||"none yet"}.

Tabs in their app:
${tabs}

How to answer:
- Plain, friendly UK English for someone on a building site, usually on a phone. Keep it short. Use short numbered steps for "how do I".
- You can't see or change anything in the app (no records, timesheets or other people's details). Tell them which tab and button to use.
- Help with building questions too: quantities and maths (show the working), materials, methods, UK Building Regs basics, toolbox talk notes, wording for messages, RAMS outlines.
- For anything safety-critical, structural, gas, electrics, asbestos, or tax/legal, give general guidance only and say to check with James or a qualified person. In an emergency tell them to call 999 first.
- Never invent company rules; if you don't know how JEB does something, say to ask James.`;
}
function aiMd(t){let h=esc(t);h=h.replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");
  return h.split(/\n/).map(l=>/^\s*[-•*]\s+/.test(l)?`<div class="ai-li">• ${l.replace(/^\s*[-•*]\s+/,"")}</div>`:/^\s*\d+[.)]\s+/.test(l)?`<div class="ai-li">${l}</div>`:l?`<div>${l}</div>`:`<div class="ai-gap"></div>`).join("")}
function aiLoad(){try{const t=JSON.parse(localStorage.getItem("jeb.ai")||"[]");if(Array.isArray(t))AI.turns=t.slice(-30)}catch(e){}}
function aiSave(){try{localStorage.setItem("jeb.ai",JSON.stringify(AI.turns.slice(-30)))}catch(e){}}
function aiDraw(streamText){
  const box=$("ai-msgs"); if(!box) return;
  const sugg=ownerMode()?["How do I change a trade's timesheet?","How many blocks for a 6 m × 2.4 m wall?","Write a toolbox talk on working at height","How do I back up the app?"]:["How do I check in to site?","How do I report a near miss?","Concrete for a 5 m × 0.6 m × 225 mm trench?","How do I add my driving licence?"];
  box.innerHTML=(AI.turns.length?AI.turns.map(t=>`<div class="ai-m ${t.role==="user"?"me":"bot"}">${t.role==="user"?esc(t.content).replace(/\n/g,"<br>"):aiMd(t.content)}</div>`).join(""):
    `<div class="ai-hello"><b>Hi${ownerMode()?" James":S.myProfile&&S.myProfile.name?" "+esc(S.myProfile.name.split(" ")[0]):""}.</b> Ask me how to do something in the app, or anything about the job: quantities, materials, methods, wording a message.<div class="ai-sugg">${sugg.map(s=>`<button type="button" class="pillbtn ai-s">${esc(s)}</button>`).join("")}</div></div>`)
    +(streamText!=null?`<div class="ai-m bot">${streamText?aiMd(streamText):'<span class="ai-think">Thinking…</span>'}</div>`:"");
  box.querySelectorAll(".ai-s").forEach(b=>b.onclick=()=>{$("ai-in").value=b.textContent;aiSend()});
  box.scrollTop=box.scrollHeight;
}
function aiOpen(){
  const p=$("aipanel"); p.hidden=false; document.body.classList.add("ai-on"); aiDraw(); setTimeout(()=>$("ai-in").focus(),50);
}
function aiClose(){$("aipanel").hidden=true;document.body.classList.remove("ai-on")}
async function aiSend(){
  const inp=$("ai-in"); const q=inp.value.trim(); if(!q||AI.busy) return;
  if(!AI.sample){toast("Claude isn't available on this device");return}
  inp.value=""; inp.style.height="auto"; AI.turns.push({role:"user",content:q}); aiSave();
  AI.busy=true; $("ai-send").hidden=true; $("ai-stop").hidden=false; aiDraw("");
  const recent=AI.turns.slice(-12); while(recent.length&&recent[0].role!=="user") recent.shift();
  const input=recent.map((t,i)=>i===0?{role:"user",content:aiRules()+"\n\n---\n\n"+t.content}:t);
  AI.ctl=new AbortController(); let last="";
  try{const r=await AI.sample(input,{cache:false,signal:AI.ctl.signal,onText:({text})=>{last=text;aiDraw(text)}});
    AI.turns.push({role:"assistant",content:(r.text||last)+(r.truncated?"\n\n(Cut short. Ask me to carry on.)":"")})}
  catch(e){const msg=e&&e.code==="cancelled"?"":e&&e.code==="not_granted"?"You said no to letting this app use Claude. To change that, open the page's permissions in Claude and allow it.":e&&e.code==="rate_limited"?"Too many questions at once. Wait a minute and try again.":e&&(e.code==="sampling_disabled"||e.code==="capability_disabled")?"Claude has been turned off for this app.":e&&e.code==="refused"?"Sorry, I can't help with that one.":"Something went wrong. Check your signal and try again.";
    const kept=(e&&e.text)||last; if(kept||msg) AI.turns.push({role:"assistant",content:(kept?kept+"\n\n":"")+(msg||"(Stopped.)")})}
  finally{AI.busy=false;AI.ctl=null;aiSave();aiDraw();$("ai-send").hidden=false;$("ai-stop").hidden=true}
}
async function startAi(){
  try{AI.sample=await window.claude.use("sample")}catch(e){AI.sample=null}
  if(!AI.sample) return;
  aiLoad();
  $("aibtn").hidden=false;
  $("aibtn").onclick=aiOpen; $("ai-close").onclick=aiClose; $("ai-send").onclick=aiSend; $("ai-stop").onclick=()=>AI.ctl&&AI.ctl.abort();
  $("ai-clear").onclick=()=>{AI.turns=[];aiSave();aiDraw()};
  const inp=$("ai-in"); inp.addEventListener("input",()=>{inp.style.height="auto";inp.style.height=Math.min(140,inp.scrollHeight)+"px"});
  inp.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();aiSend()}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("aipanel").hidden)aiClose()});
}

