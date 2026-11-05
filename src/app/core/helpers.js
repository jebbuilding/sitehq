/* ================= HELPERS: page lookups, dates, money and hours formatting, toast, working-day times, local storage ================= */
const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,"0");
const iso=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parse=s=>{const[y,m,d]=String(s||"1970-01-01").split("-").map(Number);return new Date(y,m-1,d)};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const monday=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());return addDays(x,-((x.getDay()+6)%7))};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const hrs=n=>(Math.round((+n||0)*100)/100).toFixed(2).replace(/\.00$/,"").replace(/(\.\d)0$/,"$1");
const gbp=n=>"£"+(+n).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});
const dayLabel=d=>d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"short"});
const shortDay=s=>parse(s).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
const stamp=t=>new Date(t).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
const fsize=b=>b>1048576?(b/1048576).toFixed(1)+" MB":Math.max(1,Math.round(b/1024))+" KB";
function toast(t){const el=document.createElement("div");el.className="toast";el.textContent=t;document.body.appendChild(el);setTimeout(()=>el.remove(),2800)}
const toMin=t=>{const [h,m]=String(t||"0:0").split(":").map(Number);return h*60+(m||0)};
const nowHM=()=>{const d=new Date();return pad(d.getHours())+":"+pad(d.getMinutes())};
const WS=()=>S.settings.workStart||"08:00", WE=()=>S.settings.workEnd||"16:30";
const fmt12=t=>{const m=toMin(t);let h=Math.floor(m/60);const mm=pad(m%60);return (h>12?h-12:h)+":"+mm+(h>=12?"pm":"am")};
function lunchBreak(start,finish,D){if(!start||!finish)return 0;const a=toMin(start),b=toMin(finish);const la=toMin((D&&D.la)||"13:00"),lm=D&&D.lm!=null?+D.lm:30;return Math.max(0,Math.min(b,la+lm)-Math.max(a,la))}
/* each person's usual day: their own start, finish and lunch, or your standard day if they haven't set one */
function dayFor(id){const t=(id&&id===S.me?S.myProfile:(S.team||{})[id])||{};const d=t.day||{};return {s:d.start||WS(),e:d.finish||WE(),la:d.lunchAt||"13:00",lm:d.lunchMin!=null?+d.lunchMin:30,own:!!(t.day&&(t.day.start||t.day.finish||t.day.lunchAt||t.day.lunchMin!=null))}}
const dayLine=D=>`${fmt12(D.s)}–${fmt12(D.e)}${D.lm?` · ${D.lm} min unpaid lunch at ${fmt12(D.la)}`:" · no unpaid lunch"}`;
function openMyDay(id){const D=dayFor(id);const mine=id===S.me;
  openSheet(`<h3 id="sheettitle">⏰ ${mine?"My usual working day":esc(nameOf(id))+"'s usual working day"}</h3>
    <div class="who">${mine?"Fills in your start, finish and lunch each day, and sets the times you're paid from when you check in and out. You can still change any single day by hand. James can see and change this too.":"Their check-in, check-out and new days use these times. They can see and change it too. Leave it on the standard day if they work your normal hours."}</div>
    <div class="grid2"><label for="md-s">Start<input id="md-s" type="time" value="${esc(D.s)}"></label><label for="md-e">Finish<input id="md-e" type="time" value="${esc(D.e)}"></label></div>
    <div class="grid2"><label for="md-la">Unpaid lunch starts<input id="md-la" type="time" value="${esc(D.la)}"></label><label for="md-lm">Lunch length<select id="md-lm">${[0,15,20,30,45,60].map(m=>`<option value="${m}" ${D.lm===m?"selected":""}>${m?m+" min":"No unpaid lunch"}</option>`).join("")}</select></label></div>
    <div class="who">Standard day: ${esc(dayLine({s:WS(),e:WE(),la:"13:00",lm:30}))}.</div>
    <div class="actions">${D.own?`<button type="button" class="btn" id="md-reset">Use the standard day</button>`:""}</div>
    ${formFoot(false,"Save")}`,async()=>{const st=$("md-s").value,fi=$("md-e").value;if(!st||!fi||toMin(fi)<=toMin(st)){showErr("The finish must be after the start.");return}
      const day={start:st,finish:fi,lunchAt:$("md-la").value||"13:00",lunchMin:+$("md-lm").value,by:mine?"self":"owner",at:Date.now()};
      try{await S.db.doc("sheets/"+id).update({day});if(mine)S.myProfile=Object.assign({},S.myProfile||{},{day});else S.team[id]=Object.assign({},S.team[id]||{},{day});closeForm();toast("Working day saved");render()}catch(e){showErr("Couldn't save. Check your connection.")}},null);
  if($("md-reset"))$("md-reset").onclick=async()=>{try{await S.db.doc("sheets/"+id).update({day:null});if(mine)S.myProfile=Object.assign({},S.myProfile||{},{day:null});else S.team[id]=Object.assign({},S.team[id]||{},{day:null});closeForm();toast("Back to the standard day");render()}catch(e){toast("Couldn't save")}}}
function calcHours(start,finish,brk){
  if(!start||!finish) return 0;
  const [a,b]=start.split(":").map(Number),[c,d]=finish.split(":").map(Number);
  let m=(c*60+d)-(a*60+b); if(m<0) m+=1440;
  return Math.max(0,(m-(+brk||0))/60);
}
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

