/* ================= NOTEBOOK PAGE (OneNote-style): big zoomable page, pen tools, photos you can move and resize ================= */
/* pop-up box asking for a measurement; calls done(text) or done(null) */
function askLabel(host,title,cur,done){const old=host.querySelector(".dimask");if(old)old.remove();const d=document.createElement("div");d.className="dimask";
  d.innerHTML=`<form class="dimbox"><b>✎ ${esc(title)}</b><input maxlength="60" value="${esc(cur||"")}" aria-label="${esc(title)}"><div class="dimbtns"><button type="button" class="btn dim-skip">Cancel</button><button type="submit" class="btn primary">OK</button></div></form>`;
  host.appendChild(d);const inp=d.querySelector("input");setTimeout(()=>{inp.focus();inp.select()},30);const close=v=>{d.remove();done(v)};d.querySelector(".dim-skip").onclick=()=>close(null);d.querySelector("form").onsubmit=e=>{e.preventDefault();close(inp.value.trim())}}
function askMeasure(host,cur,done){const old=host.querySelector(".dimask");if(old)old.remove();const d=document.createElement("div");d.className="dimask";
  d.innerHTML=`<form class="dimbox"><b>📏 Measurement</b><div class="dimrow"><input inputmode="decimal" maxlength="20" placeholder="e.g. 2400" aria-label="Measurement" value="${esc(String(cur||"").replace(/\s*(mm|m)$/i,""))}">
    <div class="seg dimu"><button type="button" data-u="mm" aria-pressed="${!/\d\s*m$/i.test(cur||"")}">mm</button><button type="button" data-u="m" aria-pressed="${/\d\s*m$/i.test(cur||"")}">m</button></div></div>
    <div class="dimbtns"><button type="button" class="btn dim-skip">No size</button><button type="submit" class="btn primary">Add</button></div></form>`;
  host.appendChild(d);const inp=d.querySelector("input");setTimeout(()=>inp.focus(),30);let u=/\d\s*m$/i.test(cur||"")?"m":"mm";
  d.querySelectorAll(".dimu button").forEach(b=>b.onclick=()=>{u=b.dataset.u;d.querySelectorAll(".dimu button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));inp.focus()});
  const close=v=>{d.remove();done(v)};d.querySelector(".dim-skip").onclick=()=>close("");
  d.querySelector("form").onsubmit=e=>{e.preventDefault();const t=inp.value.trim();close(!t?"":/^\d+([.,]\d+)?$/.test(t)?t+" "+u:t)}}
/* dimension line: ticks + arrows at each end, measurement written along the line */
function drawDim(ctx,a,b,col,w,label,big,tk){const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy);if(L<1)return;const ux=dx/L,uy=dy/L,nx=-uy,ny=ux;
  ctx.save();ctx.strokeStyle=ctx.fillStyle=col;ctx.lineWidth=w;ctx.lineCap="round";const t=Math.max(10,w*3.5),h=Math.max(12,w*4);
  ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
  if(tk){const k=Math.max(t,h*0.8);[a,b].forEach(p=>{ctx.beginPath();ctx.moveTo(p[0]-(ux-nx)*k*0.6,p[1]-(uy-ny)*k*0.6);ctx.lineTo(p[0]+(ux-nx)*k*0.6,p[1]+(uy-ny)*k*0.6);ctx.stroke();ctx.beginPath();ctx.arc(p[0],p[1],w*0.9,0,7);ctx.fill()})}
  else [[a,1],[b,-1]].forEach(([p,d])=>{ctx.beginPath();ctx.moveTo(p[0]+nx*t,p[1]+ny*t);ctx.lineTo(p[0]-nx*t,p[1]-ny*t);ctx.stroke();
    ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(p[0]+d*ux*h+nx*h*.4,p[1]+d*uy*h+ny*h*.4);ctx.lineTo(p[0]+d*ux*h-nx*h*.4,p[1]+d*uy*h-ny*h*.4);ctx.closePath();ctx.fill()});
  if(label){let ang=Math.atan2(dy,dx);if(ang>Math.PI/2-1e-3)ang-=Math.PI;if(ang<-Math.PI/2)ang+=Math.PI;const fs=big||Math.max(22,w*5);ctx.font=`700 ${fs}px system-ui, -apple-system, sans-serif`;
    const tw=ctx.measureText(label).width,pd=fs*.3;ctx.translate((a[0]+b[0])/2,(a[1]+b[1])/2);ctx.rotate(ang);const up=-(fs*.6+pd+w);/* text sits just above the line, never on it */ctx.fillStyle="rgba(255,255,255,.85)";ctx.fillRect(-tw/2-pd*.6,up-fs*.5-pd*.3,tw+pd*1.2,fs+pd*.4);
    ctx.fillStyle=col;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(label,0,up)}
  ctx.restore()}
