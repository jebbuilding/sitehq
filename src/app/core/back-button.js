/* ===== phone / browser Back button: steps back through the app (closes the top pop-up, then the open page, then the previous tab) ===== */
(function(){const vis=id=>{const e=document.getElementById(id);return !!(e&&!e.hidden)};
  const sig=()=>{try{const f=S.f||{};return JSON.stringify([document.querySelectorAll(".dimask").length,!!document.querySelector(".np"),vis("markup"),vis("fileview"),vis("sheet"),vis("chatwin"),vis("viewer"),vis("aipanel"),
    curTab(),(typeof PT!=="undefined"&&PT&&PT.tab)||"",f.projList===false?f.proj:"",f.pjtab||"",f.folder||"",f.stab||"",f.dwperson||"",!!S.preview])}catch(e){return ""}};
  let stack=[],ignore=0,tabHist=[],lastTab=null,busy=false;
  const back=()=>{const masks=[...document.querySelectorAll(".dimask")];if(masks.length){const d=masks[masks.length-1];const b=[...d.querySelectorAll("button")].find(x=>/^(cancel|close|✕|no|not now|done)\b/i.test(x.textContent.trim())||/(^|\s)(nlx|pinx|apx|apx2|npx2|npx3|npix|ofx|qx|lyx|dimx)(\s|$)/.test(x.className));if(b)b.click();else d.remove();return}
    if(document.querySelector(".np")){const c=document.querySelector(".np .np-cancel");if(c){c.click();if(document.querySelector(".np"))toast("Press Back again to leave without saving, or tap Save")}return}
    if(vis("markup")){const c=document.getElementById("mk-cancel");if(c)c.click();return}
    if(vis("fileview")){try{closeFile()}catch(e){}return}
    if(vis("sheet")){closeForm();return}
    if(vis("chatwin")){try{closeChat()}catch(e){}return}
    if(vis("aipanel")){try{aiClose()}catch(e){}return}
    if(vis("viewer")){closeViewer();render();return}
    const f=S.f||{};
    if(curTab()==="projects"&&f.projList===false){if(f.pjtab&&f.pjtab!=="overview"){f.pjtab="overview"}else{f.projList=true}render();window.scrollTo(0,0);return}
    if(f.stab){f.stab="";render();return}
    if(f.folder){f.folder="";render();return}
    if(f.dwperson){f.dwperson="";render();return}
    if(S.preview){S.preview=false;render();return}
    if(tabHist.length){const t=tabHist.pop();lastTab=t;if(ownerMode()){S.otab=t;store.set("jeb.otab",t)}else{S.tab=t;store.set("jeb.tab",t)}busy=true;render();busy=false;window.scrollTo(0,0)}};
  const tick=()=>{const s2=sig();if(!s2)return;let t=null;try{t=curTab()}catch(e){}if(lastTab!=null&&t!==lastTab&&!busy){tabHist.push(lastTab);if(tabHist.length>30)tabHist.shift()}lastTab=t;
    if(!stack.length){stack=[s2];try{history.replaceState({jeb:1},"")}catch(e){}return}
    const top=stack[stack.length-1];if(s2===top)return;
    if(stack.length>1&&s2===stack[stack.length-2]){stack.pop();ignore++;try{history.back()}catch(e){ignore--}return}
    stack.push(s2);if(stack.length>60)stack.shift();try{history.pushState({jeb:stack.length},"")}catch(e){}};
  window.addEventListener("popstate",()=>{if(ignore>0){ignore--;return}const before=sig();stack.pop();back();setTimeout(()=>{const now=sig();if(now===before){/* nothing closed (e.g. "Discard?" asked): stay put */try{history.pushState({jeb:stack.length+1},"")}catch(e){}stack.push(now)}else{stack[stack.length-1]=now;if(!stack.length)stack=[now]}},60)});
  setInterval(tick,250)})();
