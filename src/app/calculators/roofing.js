/* ================= ROOFING READY RECKONER ================= */
import { calcSave, calcState, fmtN, mmM, mmMt, numv } from "./calculator.js";
import { $, esc, toast } from "../core/helpers.js";
export { calcRoof, initRoofing };
const RF_TILES=[["interlock","Concrete interlocking (e.g. Marley Modern, Redland 49)",10,345,17.5,"ridge"],["droman","Double Roman concrete",9.7,343,22.5,"ridge"],["plain","Plain tiles 265×165 (100 mm gauge)",60,100,35,"ridge"],
  ["slate500","Natural slate 500×250 (75 mm headlap)",18.8,212.5,22.5,"ridge"],["slate600","Natural slate 600×300 (75 mm headlap)",12.7,262.5,22.5,"ridge"],["custom","Other: enter your own figures",0,0,0,"ridge"]];
function rfState(){const C=calcState();if(!C.roof)C.roof={type:"gable",L:"",W:"",pmode:"deg",pitch:"35",rise:"",eaves:"300",gable:"150",sp:"400",tile:"interlock",perM2:"10",gauge:"345",waste:"10",ridgeEff:"450"};return C.roof}
function rfCalc(R){
  const L=numv(R.L)/1000,W=numv(R.W)/1000,e=numv(R.eaves)/1000,g=numv(R.gable)/1000,sp=numv(R.sp)/1000||0.4,waste=numv(R.waste)/100;
  if(!(L>0&&W>0))return null;
  const half=R.type==="mono"?W:W/2;let th;
  if(R.pmode==="rise"){const rise=numv(R.rise)/1000;if(!(rise>0))return null;th=Math.atan(rise/half)}else{const d=numv(R.pitch);if(!(d>0&&d<85))return null;th=d*Math.PI/180}
  const cos=Math.cos(th),tan=Math.tan(th),deg=th*180/Math.PI;const o={deg,rise:half*tan};
  if(R.type==="gable"){const run=half+e;o.rafter=run/cos;o.len=L+2*g;o.area=2*o.rafter*o.len;o.ridge=o.len;o.eavesLen=2*o.len;o.verge=4*o.rafter;o.rafters=2*(Math.ceil(L/sp)+1);o.hips=0}
  else if(R.type==="mono"){const run=W+e;o.rafter=run/cos;o.len=L+2*g;o.area=o.rafter*o.len;o.ridge=0;o.top=o.len;o.eavesLen=o.len;o.verge=2*o.rafter;o.rafters=Math.ceil(L/sp)+1;o.hips=0}
  else{const Lp=Math.max(L,W)+2*e,Wp=Math.min(L,W)+2*e;o.rafter=(Wp/2)/cos;o.area=(Lp*Wp)/cos;o.ridge=Lp-Wp;o.eavesLen=2*(Lp+Wp);o.verge=0;const pr=(Wp/2)*Math.SQRT2,hr=(Wp/2)*tan;o.hipLen=Math.sqrt(pr*pr+hr*hr);o.hips=4;o.rafters=2*(Math.ceil(Math.max(0,Math.max(L,W)-Math.min(L,W))/sp)+1);o.len=Lp}
  const per=numv(R.perM2),gauge=numv(R.gauge)/1000,eff=numv(R.ridgeEff)/1000||0.45;
  o.tiles=per?Math.ceil(o.area*per*(1+waste)):0;
  o.battenM=gauge?Math.ceil((o.area/gauge+(R.type==="gable"?2*o.len:o.eavesLen))*(1+waste)):0;o.battenLen=Math.ceil(o.battenM/4.8);
  o.ridgeTiles=o.ridge?Math.ceil(o.ridge/eff)+1:0;o.hipTiles=o.hips?Math.ceil(o.hips*o.hipLen/eff)+o.hips:0;
  o.membrane=o.area*1.15;o.rolls=Math.ceil(o.membrane/50);
  const T=RF_TILES.find(t=>t[0]===R.tile);o.minPitch=T&&T[4]||0;return o}
function calcRoof(){
  const R=rfState(),B=$("calcbody");const opt=(k,l)=>`<option value="${k}" ${R.type===k?"selected":""}>${l}</option>`;
  B.innerHTML=`<div class="notice">Measure the building (outside of the walls) in <b>millimetres</b>. Overhangs are added on top. Figures are a guide for ordering: always check the tile maker's data and the roof's design.</div>
    <div class="rfgrid">
      <label for="rf-type">Roof type<select id="rf-type" data-k="type">${opt("gable","Duo pitch (gable ends)")}${opt("hip","Hipped (4 sides)")}${opt("mono","Mono pitch (lean-to)")}</select></label>
      <div class="grid2"><label for="rf-L">Length along the ridge (mm)<input id="rf-L" data-k="L" inputmode="decimal" value="${esc(R.L)}" placeholder="e.g. 8500"></label><label for="rf-W">${R.type==="mono"?"Width / run (mm)":"Span, eaves to eaves (mm)"}<input id="rf-W" data-k="W" inputmode="decimal" value="${esc(R.W)}" placeholder="e.g. 6200"></label></div>
      <div class="grid2"><label for="rf-pmode">Pitch given as<select id="rf-pmode" data-k="pmode"><option value="deg" ${R.pmode==="deg"?"selected":""}>Degrees</option><option value="rise" ${R.pmode==="rise"?"selected":""}>Rise (height to ridge)</option></select></label>
        ${R.pmode==="rise"?`<label for="rf-rise">Rise (mm)<input id="rf-rise" data-k="rise" inputmode="decimal" value="${esc(R.rise)}" placeholder="e.g. 2100"></label>`:`<label for="rf-pitch">Pitch (°)<input id="rf-pitch" data-k="pitch" inputmode="decimal" value="${esc(R.pitch)}" placeholder="e.g. 35"></label>`}</div>
      <div class="grid2"><label for="rf-e">Eaves overhang (mm)<input id="rf-e" data-k="eaves" inputmode="decimal" value="${esc(R.eaves)}"></label>${R.type==="hip"?`<label for="rf-sp">Rafter centres (mm)<select id="rf-sp" data-k="sp">${["400","600"].map(v=>`<option ${R.sp===v?"selected":""}>${v}</option>`).join("")}</select></label>`:`<label for="rf-g">Verge / gable overhang (mm)<input id="rf-g" data-k="gable" inputmode="decimal" value="${esc(R.gable)}"></label>`}</div>
      ${R.type==="hip"?"":`<label for="rf-sp" style="max-width:220px">Rafter centres (mm)<select id="rf-sp" data-k="sp">${["400","600"].map(v=>`<option ${R.sp===v?"selected":""}>${v}</option>`).join("")}</select></label>`}
      <label for="rf-tile">Roof covering<select id="rf-tile" data-k="tile">${RF_TILES.map(t=>`<option value="${t[0]}" ${R.tile===t[0]?"selected":""}>${esc(t[1])}</option>`).join("")}</select></label>
      <div class="grid2"><label for="rf-per">Tiles or slates per m²<input id="rf-per" data-k="perM2" inputmode="decimal" value="${esc(R.perM2)}"></label><label for="rf-gauge">Batten gauge (mm)<input id="rf-gauge" data-k="gauge" inputmode="decimal" value="${esc(R.gauge)}"></label></div>
      <div class="grid2"><label for="rf-waste">Waste / cuts %<input id="rf-waste" data-k="waste" inputmode="decimal" value="${esc(R.waste)}"></label><label for="rf-ridge">Ridge / hip tile cover (mm each)<input id="rf-ridge" data-k="ridgeEff" inputmode="decimal" value="${esc(R.ridgeEff)}"></label></div>
      <div class="actions"><button type="button" class="pillbtn" id="rf-clear">Clear sizes</button></div>
    </div>
    <div id="rf-out" aria-live="polite"></div>`;
  const out=()=>{const o=rfCalc(R);const el=$("rf-out");if(!el)return;
    if(!o){el.innerHTML='<div class="nothing">Enter the length, span and pitch to see the figures.</div>';return}
    const card=(n,l,hi)=>`<div class="tot ${hi?"hi":""}"><div class="n">${n}</div><div class="l">${l}</div></div>`;
    el.innerHTML=`${o.minPitch&&o.deg<o.minPitch-0.01?`<div class="notice warn">⚠ ${fmtN(o.deg,1)}° is below the usual minimum pitch (${o.minPitch}°) for this covering. Check the maker's data.</div>`:""}
      <div class="flabel">The roof</div><div class="totals rftots">${card(fmtN(o.area,1)+" m²","Roof area (on the slope)",1)}${card(fmtN(o.deg,1)+"°","Pitch")}${card(mmM(o.rise),"Rise to ridge")}${card(mmM(o.rafter),"Rafter length (incl. overhang)")}
        ${o.ridge?card(mmM(o.ridge),"Ridge length"):""}${o.top?card(mmM(o.top),"Top abutment"):""}${o.hips?card(mmM(o.hipLen),"Each hip (×4)"):""}${card(mmM(o.eavesLen),"Eaves / fascia length")}${o.verge?card(mmM(o.verge),"Verge length"):""}${card(o.rafters,"Rafters approx. ("+(R.sp||400)+" mm centres)")}</div>
      <div class="flabel">To order</div><div class="totals rftots">${o.tiles?card(o.tiles.toLocaleString("en-GB"),"Tiles / slates (incl. "+fmtN(numv(R.waste),0)+"%)",1):""}${o.battenM?card(mmM(o.battenM,0),"Battens ("+o.battenLen+" × 4800 mm lengths)"):""}
        ${o.ridgeTiles?card(o.ridgeTiles,"Ridge tiles"):""}${o.hipTiles?card(o.hipTiles,"Hip tiles"):""}${card(o.rolls,"Membrane rolls (1 m × 50 m, incl. laps)")}</div>
      <div class="who">Also allow for: eaves trays or vent, dry or mortar verge, ridge system, clips and nails, lead flashings, and undercloak. Rafters exclude gable ladders, trimmers and valleys.</div>
      <div class="actions"><button type="button" class="pillbtn" id="rf-copy">📋 Copy the figures</button></div>`;
    $("rf-copy").onclick=async()=>{const t=`Roof (${R.type==="hip"?"hipped":R.type==="mono"?"mono pitch":"duo pitch"}) ${R.L} mm x ${R.W} mm @ ${fmtN(o.deg,1)}°\nRoof area ${fmtN(o.area,1)} m², rafter ${mmMt(o.rafter)}${o.ridge?", ridge "+mmMt(o.ridge):""}${o.hips?", hips 4 x "+mmMt(o.hipLen):""}\nTiles ${o.tiles}, battens ${mmMt(o.battenM,0)} (${o.battenLen} x 4800 mm), ridge tiles ${o.ridgeTiles}${o.hipTiles?", hip tiles "+o.hipTiles:""}, membrane ${o.rolls} rolls, fascia ${mmMt(o.eavesLen)}`;
      try{await navigator.clipboard.writeText(t);toast("Copied")}catch(e){toast("Couldn't copy here")}}};
  B.querySelectorAll("[data-k]").forEach(el=>{const k=el.dataset.k;const ev=el.tagName==="SELECT"?"change":"input";
    el.addEventListener(ev,()=>{R[k]=el.value;
      if(k==="tile"){const T=RF_TILES.find(t=>t[0]===el.value);if(T&&T[0]!=="custom"){R.perM2=String(T[2]);R.gauge=String(T[3])}}
      calcSave();if(el.tagName==="SELECT"){calcRoof();return}out()})});
  $("rf-clear").onclick=()=>{R.L="";R.W="";R.rise="";calcSave();calcRoof();const f=$("rf-L");if(f)f.focus()};
  out();
}

/* Runs once when the app starts, called from core/boot.js. Nothing else in this file runs at load. */
function initRoofing(){
{const tf=document.querySelector(".topfabs");if(tf)window.addEventListener("scroll",()=>tf.classList.toggle("mini",window.scrollY>90),{passive:true})}
}
