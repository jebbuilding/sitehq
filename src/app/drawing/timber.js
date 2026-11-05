/* ===== timber layouts: floor joists, rafters, trusses (plan) and truss / cut-roof sections ===== */
import { npHexMix } from "./walls.js";
export { NP_TIMB_BOX, NP_TIMB_DEF, NP_TIMB_SIZES, npRunAxis, npTimberSym };
const NP_TIMB_BOX=new Set(["bblay","jlay","rlay","tlay","truss","cutroof"]);
const NP_TIMB_SIZES={tstud:[["100","100×50"],["150","150×50"]],jlay:[["47x150","47×150"],["47x175","47×175"],["47x200","47×200"],["47x225","47×225"]],rlay:[["47x100","47×100"],["47x125","47×125"],["47x150","47×150"],["47x175","47×175"]],cutroof:[["47x100","47×100"],["47x125","47×125"],["47x150","47×150"],["47x175","47×175"]]};
const NP_TIMB_DEF={jlay:"47x200",rlay:"47x150",cutroof:"47x150"};
function npTimberBar(ctx,a,b,th,fill){const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1,nx=-dy/L*th/2,ny=dx/L*th/2;ctx.beginPath();ctx.moveTo(a[0]+nx,a[1]+ny);ctx.lineTo(b[0]+nx,b[1]+ny);ctx.lineTo(b[0]-nx,b[1]-ny);ctx.lineTo(a[0]-nx,a[1]-ny);ctx.closePath();ctx.save();ctx.fillStyle=fill||"#f3e2c4";ctx.fill();ctx.restore();ctx.stroke()}
/* positions along a run: both ends (doubled), regular centres, extra timbers by hand */
function npRunPositions(len,sw,cc,adds,dbl){const out=[];const add=(t,k)=>{t=Math.max(sw/2,Math.min(len-sw/2,t));if(!out.some(x=>Math.abs(x.t-t)<sw*0.5))out.push({t,k})};
  add(sw/2,"end");add(len-sw/2,"end");if(dbl){add(sw*1.5,"end");add(len-sw*1.5,"end")}for(let t=sw/2+cc;t<len-sw;t+=cc)add(t,"reg");
  (adds||[]).forEach(ad=>{let best=null;out.forEach(x=>{if(!best||Math.abs(x.t-ad.t)<Math.abs(best.t-ad.t))best=x});if(!best)return;const dir=ad.t>=best.t?1:-1;for(let i=1;i<=(ad.n||1);i++)out.push({t:best.t+dir*sw*i,k:"extra"})});return out.filter(x=>x.t>=0&&x.t<=len)}
/* which way the timbers repeat: along the long side unless turned */
const npRunAxis=(o,w,h)=>{const along=w>=h;return o.turn?!along:along};
function npTimberSym(ctx,o,x0,y0,w,h,cx,cy){const lw=ctx.lineWidth,mm=ctx.__mm||0,x1=x0+w,y1=y0+h;const ln=(a,b,c,d)=>{ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke()};
  const sz=String(o.sz||NP_TIMB_DEF[o.k]||"47x150").split("x").map(Number);const tw=mm?sz[0]*mm:Math.max(Math.min(w,h)*0.025,2.5),td=mm?sz[1]*mm:Math.max(Math.min(w,h)*0.06,4);
  const lbl=(t,x,y,f)=>{ctx.save();ctx.font=`600 ${f}px system-ui,-apple-system,sans-serif`;const W=ctx.measureText(t).width;ctx.fillStyle="#fff";ctx.globalAlpha=.9;ctx.fillRect(x-W/2-f*0.3,y-f*0.7,W+f*0.6,f*1.4);ctx.globalAlpha=1;ctx.fillStyle=ctx.strokeStyle;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(t,x,y);ctx.restore()};
  const arrows=(a,b)=>{ln(a[0],a[1],b[0],b[1]);[[a,b],[b,a]].forEach(([p,q])=>{const an=Math.atan2(p[1]-q[1],p[0]-q[0]),hh=Math.max(8,lw*4);ln(p[0],p[1],p[0]-hh*Math.cos(an-0.5),p[1]-hh*Math.sin(an-0.5));ln(p[0],p[1],p[0]-hh*Math.cos(an+0.5),p[1]-hh*Math.sin(an+0.5))})};
  const fs=Math.max(8,Math.min(Math.min(w,h)*0.07,mm?160*mm:30));
  ctx.save();ctx.lineWidth=Math.max(lw*0.55,0.5);
  if(o.k==="bblay"){const rep=npRunAxis(o,w,h);const len=rep?w:h,span=rep?h:w;const bw=mm?150*mm:Math.max(Math.min(w,h)*0.03,3);const cc=mm?(o.cc||600)*mm:Math.max(len/10,bw*4);const pos=npRunPositions(len,bw,cc,o.adds,false);
      ctx.strokeRect(x0,y0,w,h);const bl=mm?215*mm:Math.max(span/14,4);const sorted=pos.slice().sort((a,b)=>a.t-b.t);
      for(let i=0;i<sorted.length-1;i++){const a=sorted[i].t+bw/2,b=sorted[i+1].t-bw/2;if(b-a<1)continue;ctx.save();ctx.fillStyle=npHexMix(ctx.strokeStyle,0.86);if(rep)ctx.fillRect(x0+a,y0,b-a,h);else ctx.fillRect(x0,y0+a,w,b-a);ctx.restore();
        ctx.save();ctx.lineWidth=Math.max(lw*0.35,0.4);for(let k=bl;k<span;k+=bl){if(rep)ln(x0+a,y0+k,x0+b,y0+k);else ln(x0+k,y0+a,x0+k,y0+b)}ctx.restore()}
      pos.forEach(x=>{ctx.save();ctx.fillStyle=x.k==="extra"?"#9ca3af":"#cbd0d6";if(rep)ctx.fillRect(x0+x.t-bw/2,y0,bw,h);else ctx.fillRect(x0,y0+x.t-bw/2,w,bw);ctx.restore();if(rep)ctx.strokeRect(x0+x.t-bw/2,y0,bw,h);else ctx.strokeRect(x0,y0+x.t-bw/2,w,bw)});
      ctx.lineWidth=lw;const sp=rep?[[cx,y0+h*0.12],[cx,y1-h*0.12]]:[[x0+w*0.12,cy],[x1-w*0.12,cy]];arrows(sp[0],sp[1]);lbl(`Beam & block floor @ ${o.cc||600} c/c`,cx,cy,fs)}
  else if(o.k==="jlay"||o.k==="tlay"){const rep=npRunAxis(o,w,h);const len=rep?w:h;const cc=mm?(o.cc||(o.k==="tlay"?600:400))*mm:Math.max(len/12,tw*4);const pos=npRunPositions(len,tw,cc,o.adds,o.k==="jlay");
      ctx.save();ctx.setLineDash([lw*3,lw*2]);ctx.strokeRect(x0,y0,w,h);ctx.restore();
      pos.forEach(x=>{const f=x.k==="extra"?"#e9c58f":"#f3e2c4";if(rep){ctx.save();ctx.fillStyle=f;ctx.fillRect(x0+x.t-tw/2,y0,tw,h);ctx.restore();ctx.strokeRect(x0+x.t-tw/2,y0,tw,h)}else{ctx.save();ctx.fillStyle=f;ctx.fillRect(x0,y0+x.t-tw/2,w,tw);ctx.restore();ctx.strokeRect(x0,y0+x.t-tw/2,w,tw)}});
      if(o.k==="tlay"){ctx.save();ctx.setLineDash([lw*5,lw*3]);if(rep){ln(x0,y0,x0+Math.min(w,h*1.2),y1);ln(x1,y0,x1-Math.min(w,h*1.2),y1)}else{ln(x0,y0,x1,y0+Math.min(h,w*1.2));ln(x0,y1,x1,y1-Math.min(h,w*1.2))}ctx.restore()}
      ctx.lineWidth=lw;const sp=rep?[[cx,y0+h*0.12],[cx,y1-h*0.12]]:[[x0+w*0.12,cy],[x1-w*0.12,cy]];arrows(sp[0],sp[1]);
      lbl(o.k==="jlay"?`${sz[0]}×${sz[1]} joists @ ${o.cc||400} c/c`:`Trusses @ ${o.cc||600} c/c`,cx,cy,fs)}
  else if(o.k==="rlay"){const along=npRunAxis(o,w,h);const len=along?w:h,span=along?h:w;const cc=mm?(o.cc||400)*mm:Math.max(len/12,tw*4);const pos=npRunPositions(len,tw,cc,o.adds,true);const rb=mm?38*mm:tw*0.8,wp=mm?100*mm:tw*2;
      ctx.strokeRect(x0,y0,w,h);
      pos.forEach(x=>{const f=x.k==="extra"?"#e9c58f":"#f3e2c4";ctx.save();ctx.fillStyle=f;if(along){ctx.fillRect(x0+x.t-tw/2,y0+wp,tw,span/2-wp-rb/2);ctx.fillRect(x0+x.t-tw/2,cy+rb/2,tw,span/2-wp-rb/2)}else{ctx.fillRect(x0+wp,y0+x.t-tw/2,span/2-wp-rb/2,tw);ctx.fillRect(cx+rb/2,y0+x.t-tw/2,span/2-wp-rb/2,tw)}ctx.restore();
        if(along){ctx.strokeRect(x0+x.t-tw/2,y0+wp,tw,span/2-wp-rb/2);ctx.strokeRect(x0+x.t-tw/2,cy+rb/2,tw,span/2-wp-rb/2)}else{ctx.strokeRect(x0+wp,y0+x.t-tw/2,span/2-wp-rb/2,tw);ctx.strokeRect(cx+rb/2,y0+x.t-tw/2,span/2-wp-rb/2,tw)}});
      ctx.save();ctx.fillStyle="#e2c79a";if(along){ctx.fillRect(x0,cy-rb/2,w,rb);ctx.fillRect(x0,y0,w,wp);ctx.fillRect(x0,y1-wp,w,wp)}else{ctx.fillRect(cx-rb/2,y0,rb,h);ctx.fillRect(x0,y0,wp,h);ctx.fillRect(x1-wp,y0,wp,h)}ctx.restore();
      if(along){ctx.strokeRect(x0,cy-rb/2,w,rb);ctx.strokeRect(x0,y0,w,wp);ctx.strokeRect(x0,y1-wp,w,wp)}else{ctx.strokeRect(cx-rb/2,y0,rb,h);ctx.strokeRect(x0,y0,wp,h);ctx.strokeRect(x1-wp,y0,wp,h)}
      lbl(`${sz[0]}×${sz[1]} rafters @ ${o.cc||400} c/c`,along?cx:x0+w*0.27,along?y0+h*0.27:cy,fs);lbl("Ridge",along?x0+w*0.12:cx,along?cy:y0+h*0.1,fs*0.8)}
  else if(o.k==="truss"){const t=o.tt||"fink";const th=mm?100*mm:Math.max(Math.min(w,h)*0.035,3);const bl=[x0,y1-th/2],br=[x1,y1-th/2];const ap=t==="mono"?[x1,y0+th/2]:[cx,y0+th/2];
      const onTop=(f)=>t==="mono"?[x0+(ap[0]-x0)*f,bl[1]+(ap[1]-bl[1])*f]:(f<=0.5?[x0+(cx-x0)*f*2,bl[1]+(ap[1]-bl[1])*f*2]:[cx+(x1-cx)*(f-0.5)*2,ap[1]+(br[1]-ap[1])*(f-0.5)*2]);
      const bars=[[bl,br],[bl,ap]];if(t==="mono")bars.push([br,ap]);else bars.push([ap,br]);
      if(t==="fink"){const b1=[x0+w/3,bl[1]],b2=[x0+2*w/3,bl[1]];bars.push([b1,onTop(0.25)],[b1,ap],[b2,ap],[b2,onTop(0.75)])}
      else if(t==="fan"){const b1=[x0+w/3,bl[1]],b2=[x0+2*w/3,bl[1]];bars.push([b1,onTop(0.17)],[b1,onTop(0.33)],[b1,ap],[b2,ap],[b2,onTop(0.67)],[b2,onTop(0.83)])}
      else if(t==="mono"){const n=3;for(let i=1;i<=n;i++){const x=x0+w*i/(n+1);const top=onTop(i/(n+1));bars.push([[x,bl[1]],top]);if(i<n){const nt=onTop((i+1)/(n+1));bars.push([[x,bl[1]],nt])}}}
      else if(t==="attic"){const pL=x0+w*0.25,pR=x0+w*0.75;const tl=onTop(0.25),tr=onTop(0.75);bars.push([[pL,bl[1]],tl],[[pR,bl[1]],tr]);const cy2=tl[1]+(ap[1]-tl[1])*0.45;const cl=[x0+(cx-x0)*((cy2-bl[1])/(ap[1]-bl[1])),cy2],cr=[x1-(x1-cx)*((cy2-bl[1])/(ap[1]-bl[1])),cy2];bars.push([cl,cr])}
      ctx.lineWidth=Math.max(lw*0.6,0.5);bars.forEach(([a,b])=>npTimberBar(ctx,a,b,th));
      const nodes=[];bars.forEach(([a,b])=>{[a,b].forEach(p=>{if(!nodes.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<th))nodes.push(p)})});ctx.save();ctx.fillStyle="#9ca3af";ctx.globalAlpha=.8;nodes.forEach(p=>ctx.fillRect(p[0]-th*0.8,p[1]-th*0.6,th*1.6,th*1.2));ctx.restore()}
  else if(o.k==="cutroof"){const rd=mm?sz[1]*mm:Math.max(Math.min(w,h)*0.05,3),wp=mm?100*mm:rd*1.2;const bl=[x0+wp/2,y1-wp],br=[x1-wp/2,y1-wp],ap=[cx,y0+rd];
      ctx.save();ctx.fillStyle="#e2c79a";ctx.fillRect(x0,y1-wp,wp,wp*0.5);ctx.fillRect(x1-wp,y1-wp,wp,wp*0.5);ctx.restore();ctx.strokeRect(x0,y1-wp,wp,wp*0.5);ctx.strokeRect(x1-wp,y1-wp,wp,wp*0.5);
      npTimberBar(ctx,[x0,y1-wp*0.5],[x1,y1-wp*0.5],mm?100*mm:rd*0.8,"#f3e2c4");npTimberBar(ctx,bl,ap,rd);npTimberBar(ctx,br,ap,rd);
      const ch=y1-wp-(y1-wp-ap[1])*0.62;const fx=f=>[bl[0]+(ap[0]-bl[0])*f,bl[1]+(ap[1]-bl[1])*f];const cyl=ch,fL=(bl[1]-cyl)/(bl[1]-ap[1]);const cl=fx(fL),cr=[x1-(cl[0]-x0),cyl];npTimberBar(ctx,[cl[0]+rd*0.5,cyl+rd*0.4],[cr[0]-rd*0.5,cyl+rd*0.4],mm?47*mm:rd*0.5,"#f3e2c4");
      ctx.save();ctx.fillStyle="#e2c79a";const rbw=mm?38*mm:rd*0.4;ctx.fillRect(cx-rbw/2,ap[1]-rd*0.6,rbw,rd*1.6);ctx.restore();ctx.strokeRect(cx-rbw/2,ap[1]-rd*0.6,rbw,rd*1.6);
      [0.45].forEach(f=>{[fx(f),[x1-(fx(f)[0]-x0),fx(f)[1]]].forEach(p=>{const ps=mm?150*mm:rd*1.4;const an=Math.atan2(ap[1]-bl[1],ap[0]-bl[0]);ctx.save();ctx.translate(p[0],p[1]);ctx.rotate(p[0]<cx?an:-an);ctx.fillStyle="#e2c79a";ctx.fillRect(-ps*0.35,rd*0.5,ps*0.7,ps);ctx.strokeRect(-ps*0.35,rd*0.5,ps*0.7,ps);ctx.restore()})});
      lbl(`${sz[0]}×${sz[1]} rafters`,x0+w*0.28,y0+h*0.42,fs*0.9);lbl("Collar",cx,cyl-fs,fs*0.8);lbl("Ceiling joists",cx,y1-wp*0.5-fs*1.2,fs*0.8)}
  ctx.restore()}

