/* ===== DICTATION: a 🎤 Speak button under every notes box; talk and it types for you (uses the phone's own speech recognition) ===== */
const DICT={SR:window.SpeechRecognition||window.webkitSpeechRecognition||null,cur:null};
function dictClean(t){return String(t||"").replace(/\s*\b(full stop|period)\b\s*/gi,". ").replace(/\s*\bcomma\b\s*/gi,", ").replace(/\s*\bquestion mark\b\s*/gi,"? ").replace(/\s*\bexclamation mark\b\s*/gi,"! ").replace(/\s*\bnew line\b\s*/gi,"\n").replace(/\s*\bnew paragraph\b\s*/gi,"\n\n").replace(/[ \t]+([.,?!])/g,"$1").replace(/([.!?]\s+|^\s*|\n\s*)([a-z])/g,(m,a,b)=>a+b.toUpperCase()).replace(/[ \t]{2,}/g," ")}
function dictStop(){const d=DICT.cur;if(!d)return;d.want=false;try{d.rec.stop()}catch(e){}d.btn.classList.remove("on");d.btn.innerHTML=d.label;d.btn.setAttribute("aria-pressed","false");DICT.cur=null}
function dictStart(el,btn){if(DICT.cur){const same=DICT.cur.el===el;dictStop();if(same)return}
  if(!DICT.SR){toast("This browser can't do speech to text. Tap the microphone key on your phone's keyboard instead.");return}
  const rec=new DICT.SR();rec.lang="en-GB";rec.continuous=true;rec.interimResults=true;rec.maxAlternatives=1;
  const d={el,btn,rec,want:true,label:btn.innerHTML,base:"",finals:""};DICT.cur=d;
  const base=el.value;d.base=base&&!/\s$/.test(base)?base+(/[.!?]$/.test(base.trim())?" ":" "):base;
  const put=(interim)=>{const max=+el.getAttribute("maxlength")||0;let v=d.base+dictClean(d.finals)+(interim?dictClean(interim):"");if(max&&v.length>max)v=v.slice(0,max);el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}));try{el.scrollTop=el.scrollHeight}catch(e){}};
  rec.onresult=e=>{let fin="",inter="";for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];if(r.isFinal)fin+=r[0].transcript+" ";else inter+=r[0].transcript}if(fin)d.finals+=fin;put(inter)};
  rec.onerror=e=>{if(e.error==="not-allowed"||e.error==="service-not-allowed"){toast("Microphone not allowed. Allow the microphone for this page, or use the keyboard's microphone key.");dictStop()}else if(e.error==="no-speech"){}else if(e.error!=="aborted"){toast("Speech to text stopped: "+e.error);dictStop()}};
  rec.onend=()=>{if(DICT.cur===d&&d.want){try{rec.start()}catch(e){dictStop()}}else if(DICT.cur===d)dictStop()};
  btn.classList.add("on");btn.innerHTML=btn.classList.contains("mini")?"⏹":"⏹ Stop · listening…";btn.setAttribute("aria-pressed","true");
  try{rec.start();if(!store.get("jeb.dicttip")){store.set("jeb.dicttip",1);toast("Speak clearly. Say “full stop”, “comma” or “new line” for punctuation. Tap Stop when you're done.")}}catch(e){toast("Couldn't start listening. Try again.");dictStop()}
  el.addEventListener("blur",()=>{},{once:true})}
function dictEnhance(root){(root||document).querySelectorAll('textarea:not([data-nodict]):not([data-dict]),.np-text input:not([data-dict])').forEach(el=>{el.dataset.dict="1";if(el.closest(".np")&&!el.closest(".np-text"))return;
  const mini=!!el.closest(".crow")||!!el.closest(".np-text");const b=document.createElement("button");b.type="button";b.className=mini?"iconbtn dictbtn mini":"dictbtn";b.innerHTML=mini?"🎤":"🎤 Speak";b.setAttribute("aria-pressed","false");b.title="Speak and it types for you";b.onclick=e=>{e.preventDefault();e.stopPropagation();dictStart(el,b)};
  if(mini){el.insertAdjacentElement("beforebegin",b);return}const lab=el.closest("label");if(lab&&lab.lastElementChild===el)lab.appendChild(b);else el.insertAdjacentElement("afterend",b)})}
try{new MutationObserver(ms=>{let hit=false;for(const m of ms)if(m.addedNodes&&m.addedNodes.length){hit=true;break}if(hit){clearTimeout(window.__dictT);window.__dictT=setTimeout(()=>dictEnhance(document),60)}}).observe(document.body,{childList:true,subtree:true});setTimeout(()=>dictEnhance(document),500)}catch(e){}
document.addEventListener("click",e=>{if(DICT.cur&&!e.target.closest(".dictbtn")&&e.target!==DICT.cur.el&&(e.target.closest("button,[type=submit]")))dictStop()},true);
function askOwnerPin(msg,ok){if(!ownerMode()){toast("Only James can unlock this");return}
  const d=document.createElement("div");d.className="dimask";d.style.zIndex="80";
  d.innerHTML=`<form class="dimbox"><b>🔒 Enter your PIN</b><div class="who" style="margin:4px 0 8px">${esc(msg)}</div><input type="password" inputmode="numeric" autocomplete="off" maxlength="12" class="pinin" aria-label="PIN" style="font-size:22px;letter-spacing:6px;text-align:center"><div class="err pinerr" hidden></div>
    <div class="dimbtns"><button type="button" class="btn pinx">Cancel</button><button type="submit" class="btn primary">Unlock</button></div></form>`;
  document.body.appendChild(d);const inp=d.querySelector(".pinin");setTimeout(()=>inp.focus(),30);d.querySelector(".pinx").onclick=()=>d.remove();d.addEventListener("click",e=>{if(e.target===d)d.remove()});d.addEventListener("keydown",e=>{if(e.key==="Escape")d.remove()});
  d.querySelector("form").onsubmit=async e=>{e.preventDefault();const er=d.querySelector(".pinerr");if(Date.now()<pinLockUntil){er.hidden=false;er.textContent="Too many tries. Wait a minute.";return}
    if(await pinOk(inp.value)){pinFails=0;d.remove();ok()}else{pinFails++;if(pinFails>=5){pinLockUntil=Date.now()+60000;pinFails=0}er.hidden=false;er.textContent="Wrong PIN";inp.value="";inp.focus()}}}

