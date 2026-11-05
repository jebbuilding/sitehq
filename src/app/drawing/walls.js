/* ===== walls that join themselves: mitred corners, T-junctions, layered cavity walls, doors and windows cut into walls ===== */
const NP_LIN={pb12:["Plasterboard 12.5mm",12.5,0,"pb"],pb15:["Plasterboard 15mm",15,0,"pb"],pbmr:["Moisture resistant plasterboard 12.5mm",12.5,0,"pb"],pbfr:["Fire board 15mm",15,0,"pb"],pbsnd:["Sound board 15mm",15,0,"pb"],
 dd12:["Plasterboard 12.5mm on dot & dab",12.5,12,"dd"],dd15:["Plasterboard 15mm on dot & dab",15,12,"dd"],ddins38:["Insulated plasterboard 37.5mm on dot & dab",37.5,12,"dd"],ddins52:["Insulated plasterboard 52.5mm on dot & dab",52.5,12,"dd"],ddins62:["Insulated plasterboard 62.5mm on dot & dab",62.5,12,"dd"],
 bat25pb:["Battens 25×38 + plasterboard 12.5mm",12.5,25,"bat"],bat50pb:["Battens 25×50 + plasterboard 12.5mm",12.5,25,"bat"],bat47pb:["Battens 47×50 + plasterboard 12.5mm",12.5,47,"bat"],bat25:["Battens 25×38 only",0,25,"batonly"],bat47:["Battens 47×50 only",0,47,"batonly"],
 ply9:["Plywood 9mm",9,0,"ply"],ply12:["Plywood 12mm",12,0,"ply"],ply18:["Plywood 18mm",18,0,"ply"],osb9:["OSB3 9mm",9,0,"osb"],osb11:["OSB3 11mm",11,0,"osb"],osb18:["OSB3 18mm",18,0,"osb"],
 cem12:["Cement board 12mm",12,0,"pb"],tile:["Tile backer board 12mm",12,0,"pb"]};
const NP_LINOPTS=()=>`<option value="">None</option>`+Object.entries(NP_LIN).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join("");
const NP_WALLK=new Set(["wall","dline","stud","cavity","tstud"]);
const npIsWall=o=>!!o&&o.t==="shape"&&NP_WALLK.has(o.k)&&o.a&&o.b;
const NP_OPENK=new Set(["door","door2","sdoor","bifold","opening"]);
function npWallT(o,lw){return o.th||(o.k==="tstud"?Math.max(16,lw*6):o.k==="cavity"?Math.max(36,lw*14):o.k==="dline"?Math.max(20,lw*6):o.k==="stud"?Math.max(16,lw*6):Math.max(12,lw*5))}
/* layers across the wall, first one on the left of the drawing direction: [share, style] */
const NP_WALL_LAYERS={tstud:[[1,"white"]],wall:[[1,"solid"]],dline:[[1,"white"]],stud:[[1,"stud"]],cavity:[[100,"block"],[100,"insul"],[50,"cavity"],[100,"block"]]};
const npHexMix=(c,k)=>{const h=String(c||"#111111").replace("#","");const n=h.length===3?h.split("").map(x=>x+x).join(""):h.padEnd(6,"0");const v=[0,2,4].map(i=>parseInt(n.slice(i,i+2),16)||0);return "#"+v.map(x=>Math.round(x+(255-x)*k).toString(16).padStart(2,"0")).join("")};
function npWallInfo(objs,lw0){
  const W=objs.filter(npIsWall).map(o=>{const lw=Math.max(o.w||6,0.8);const dx=o.b[0]-o.a[0],dy=o.b[1]-o.a[1],L=Math.hypot(dx,dy)||1,u=[dx/L,dy/L],n=[-u[1],u[0]],T=npWallT(o,lw);
    let ly=(o.k==="cavity"&&o.lv?[[o.lv.a,"block"],[o.lv.ins,"insul"],[o.lv.cav,"cavity"],[o.lv.b,"block"]].filter(x=>x[0]>0):NP_WALL_LAYERS[o.k]||[[1,"solid"]]).slice();if(o.fl)ly=ly.reverse();const tot=ly.reduce((a,x)=>a+x[0],0);const bs=[T/2];ly.forEach(x=>bs.push(bs[bs.length-1]-T*x[0]/tot));
    return {o,lw,L,u,n,T,ly,bs,end:{a:{kind:"free",t:bs.map(()=>0)},b:{kind:"free",t:bs.map(()=>L)}},gaps:{top:[],bot:[]},cuts:[],tees:[]}});
  const cr=(p,q)=>p[0]*q[1]-p[1]*q[0],dt=(p,q)=>p[0]*q[0]+p[1]*q[1];
  W.forEach((w,i)=>{["a","b"].forEach(E=>{const P=w.o[E],vOut=E==="a"?w.u:[-w.u[0],-w.u[1]],nOut=E==="a"?w.n:[-w.n[0],-w.n[1]];
    const parts=[];W.forEach((x,j)=>{if(j===i)return;const tol=Math.max(2,Math.min(w.T,x.T)*0.5);["a","b"].forEach(F=>{if(Math.hypot(x.o[F][0]-P[0],x.o[F][1]-P[1])<=tol)parts.push([x,F])})});
    const toParam=t=>E==="a"?t:w.L-t;
    if(parts.length===1){const [x,F]=parts[0];const vx=F==="a"?x.u:[-x.u[0],-x.u[1]];const d=dt(vOut,vx);
      if(d<-0.995){w.end[E]={kind:"join",t:w.bs.map(()=>toParam(0)),step:Math.abs(w.T-x.T)>0.5?x.T:0};return}
      /* corner: outer face meets outer face and inner meets inner, so walls of different thickness still mitre cleanly */
      const den=cr(w.u,x.u);if(Math.abs(den)<0.05)return;const side=Math.sign(dt(vx,w.n))||1,sideX=Math.sign(dt(vOut,x.n))||1;
      const ts=w.bs.map(sv=>{const rel=sv*side/(w.T/2);const sx=rel*(x.T/2)*sideX;const rhs=[x.o.a[0]+x.n[0]*sx-w.o.a[0]-w.n[0]*sv,x.o.a[1]+x.n[1]*sx-w.o.a[1]-w.n[1]*sv];let t=cr(rhs,x.u)/den;const lim=Math.max(w.T,x.T)*4;const t0=toParam(0);return Math.max(t0-lim,Math.min(t0+lim,t))});
      w.end[E]={kind:"join",side,t:ts};return}
    if(parts.length>1){/* three or four walls at one point: the thickest straight pair runs through, the others butt into it */
      const all=[[w,E]].concat(parts);const dirOf=([y,G])=>G==="a"?y.u:[-y.u[0],-y.u[1]];let pair=null,pt=-1;
      for(let m=0;m<all.length;m++)for(let k=m+1;k<all.length;k++){if(dt(dirOf(all[m]),dirOf(all[k]))<-0.98){const th=(all[m][0].T+all[k][0].T)+1e-3*(all[m][0].L+all[k][0].L)+1e-6*Math.abs(all[m][0].u[0]);if(th>pt){pt=th;pair=[all[m],all[k]]}}}
      if(!pair){w.end[E]={kind:"join",t:w.bs.map(()=>toParam(0))};return}
      if(pair.some(([y])=>y===w)){w.end[E]={kind:"join",t:w.bs.map(()=>toParam(0))};return}
      const A=pair[0][0];const un=dt(w.u,A.n);if(Math.abs(un)<0.2){w.end[E]={kind:"join",t:w.bs.map(()=>toParam(0))};return}
      const other=w.o[E==="a"?"b":"a"];const sg=Math.sign(dt([other[0]-A.o.a[0],other[1]-A.o.a[1]],A.n))||1;const f=sg*A.T/2;
      const ts=w.bs.map(sv=>{const base=[w.o.a[0]+w.n[0]*sv-A.o.a[0],w.o.a[1]+w.n[1]*sv-A.o.a[1]];return (f-dt(base,A.n))/un});w.end[E]={kind:"tee",t:ts};
      const ptsW=[0,w.bs.length-1].map(k=>[w.o.a[0]+w.u[0]*ts[k]+w.n[0]*w.bs[k],w.o.a[1]+w.u[1]*ts[k]+w.n[1]*w.bs[k]]);
      pair.forEach(([Y])=>{const sgY=Math.sign(dt([other[0]-Y.o.a[0],other[1]-Y.o.a[1]],Y.n))||1;const pr=ptsW.map(p=>dt([p[0]-Y.o.a[0],p[1]-Y.o.a[1]],Y.u));Y.gaps[sgY>0?"top":"bot"].push([Math.min(...pr),Math.max(...pr)]);Y.tees.push([Math.min(...pr),Math.max(...pr),sgY])});return}
    /* T: this end sits on another wall's line */
    for(const x of W){if(x===w)continue;const rel=[P[0]-x.o.a[0],P[1]-x.o.a[1]];const tx=dt(rel,x.u),dn=dt(rel,x.n);const tol=Math.max(2,Math.min(w.T,x.T)*0.5);
      if(tx<=tol||tx>=x.L-tol||Math.abs(dn)>x.T/2+tol)continue;const un=dt(w.u,x.n);if(Math.abs(un)<0.2)continue;
      const other=w.o[E==="a"?"b":"a"];let sg=Math.sign(dn);if(Math.abs(dn)<1e-6)sg=Math.sign(dt([other[0]-x.o.a[0],other[1]-x.o.a[1]],x.n))||1;const f=sg*x.T/2;
      const ts=w.bs.map(s=>{const base=[w.o.a[0]+w.n[0]*s-x.o.a[0],w.o.a[1]+w.n[1]*s-x.o.a[1]];return (f-dt(base,x.n))/un});
      w.end[E]={kind:"tee",t:ts};const pts=[0,w.bs.length-1].map(k=>[w.o.a[0]+w.u[0]*ts[k]+w.n[0]*w.bs[k],w.o.a[1]+w.u[1]*ts[k]+w.n[1]*w.bs[k]]).map(p=>dt([p[0]-x.o.a[0],p[1]-x.o.a[1]],x.u));
      x.gaps[sg>0?"top":"bot"].push([Math.min(...pts),Math.max(...pts)]);x.tees.push([Math.min(...pts),Math.max(...pts),sg]);return}})});
  /* walls that cross each other part-way along: clear the lines inside the crossing so it reads as one junction */
  for(let i=0;i<W.length;i++)for(let j=i+1;j<W.length;j++){const w=W[i],x=W[j];const den=cr(w.u,x.u);if(Math.abs(den)<0.2)continue;const rel=[x.o.a[0]-w.o.a[0],x.o.a[1]-w.o.a[1]];const tw=cr(rel,x.u)/den,tx=cr(rel,w.u)/den;
    const mw=x.T/2+2,mx=w.T/2+2;if(tw<=mw||tw>=w.L-mw||tx<=mx||tx>=x.L-mx)continue;
    [[w,x],[x,w]].forEach(([A,B])=>{const dd=cr(A.u,B.u);A.bs.forEach((sv,k)=>{const r=B.bs.map(sb=>{const rhs=[B.o.a[0]+B.n[0]*sb-A.o.a[0]-A.n[0]*sv,B.o.a[1]+B.n[1]*sb-A.o.a[1]-A.n[1]*sv];return cr(rhs,B.u)/dd});(A.xg=A.xg||{})[k]=(A.xg[k]||[]).concat([[Math.min(...r),Math.max(...r)]])})})}
  return W}
/* doors, openings and windows that sit on a wall cut it */
function npWallCuts(W,objs){const att=new Set();objs.forEach(o=>{if(!o||o.t!=="shape")return;let p1,p2;
    if(NP_OPENK.has(o.k)&&o.a&&o.b){p1=o.a;p2=o.b}
    else if(o.k==="window"&&o.a&&o.b){const x0=Math.min(o.a[0],o.b[0]),y0=Math.min(o.a[1],o.b[1]),w=Math.abs(o.b[0]-o.a[0]),h=Math.abs(o.b[1]-o.a[1]),c=[x0+w/2,y0+h/2],r=o.r||0,L=Math.max(w,h)/2,d=w>=h?[Math.cos(r),Math.sin(r)]:[-Math.sin(r),Math.cos(r)];p1=[c[0]-d[0]*L,c[1]-d[1]*L];p2=[c[0]+d[0]*L,c[1]+d[1]*L]}
    else return;
    for(const w of W){const f=p=>[(p[0]-w.o.a[0])*w.u[0]+(p[1]-w.o.a[1])*w.u[1],(p[0]-w.o.a[0])*w.n[0]+(p[1]-w.o.a[1])*w.n[1]];const A=f(p1),B=f(p2);const tol=w.T/2+Math.max(4,w.lw*2);
      if(Math.abs(A[1])>tol||Math.abs(B[1])>tol)continue;const t1=Math.max(0,Math.min(A[0],B[0])),t2=Math.min(w.L,Math.max(A[0],B[0]));if(t2-t1<w.T*0.3)continue;
      w.cuts.push({t1,t2,win:o.k==="window",o});att.add(o);break}});return att}
function npPattern(ctx,style,x0,x1,y0,y1,lw,col){ctx.save();ctx.lineWidth=Math.max(lw*0.45,0.5);ctx.strokeStyle=col;const H=Math.abs(y1-y0);
  if(style==="insul"){const step=Math.max(H*0.9,4);ctx.beginPath();let up=true;ctx.moveTo(x0,y1);for(let x=x0;x<=x1+step;x+=step/2){ctx.lineTo(Math.min(x,x1),up?y0:y1);up=!up}ctx.stroke()}
  else if(style==="stud"){const st=Math.max(H*1.6,10);ctx.beginPath();for(let x=x0+st/2;x<x1;x+=st){ctx.moveTo(x,y0);ctx.lineTo(Math.min(x+st/2,x1),y1)}ctx.stroke()}
  ctx.restore()}
function npDrawWalls(ctx,W){const fillOf=(st,c,o)=>o&&o.fill&&(st==="solid"||st==="white"||st==="block")?o.fill:st==="solid"?npHexMix(c,0.7):st==="block"?npHexMix(c,0.82):st==="insul"?"#fff1a8":"#ffffff";
  W.forEach(w=>{const o=w.o,an=Math.atan2(w.u[1],w.u[0]);ctx.save();ctx.translate(o.a[0],o.a[1]);ctx.rotate(an);const c=o.c||"#111";const tA=w.end.a.t,tB=w.end.b.t;
    /* layers */
    w.ly.forEach((ly,k)=>{const s0=w.bs[k],s1=w.bs[k+1];ctx.beginPath();ctx.moveTo(tA[k],s0);ctx.lineTo(tB[k],s0);ctx.lineTo(tB[k+1],s1);ctx.lineTo(tA[k+1],s1);ctx.closePath();ctx.fillStyle=fillOf(ly[1],c,o);ctx.fill();
      if(ly[1]==="insul"||ly[1]==="stud"){ctx.save();ctx.clip();npPattern(ctx,ly[1],Math.min(tA[k],tA[k+1]),Math.max(tB[k],tB[k+1]),Math.min(s0,s1),Math.max(s0,s1),w.lw,c);ctx.restore()}});
    ctx.restore()});
  W.forEach(w=>{const o=w.o,an=Math.atan2(w.u[1],w.u[0]);ctx.save();ctx.translate(o.a[0],o.a[1]);ctx.rotate(an);ctx.strokeStyle=o.c||"#111";ctx.lineCap="square";ctx.lineJoin="miter";const tA=w.end.a.t,tB=w.end.b.t,nb=w.bs.length;
    const segs=(t1,t2,gaps)=>{let out=[[Math.min(t1,t2),Math.max(t1,t2)]];gaps.forEach(([g1,g2])=>{out=out.flatMap(([p,q])=>g2<=p||g1>=q?[[p,q]]:[[p,Math.min(q,g1)],[Math.max(p,g2),q]].filter(([x,y])=>y-x>0.5))});return out};
    const cutG=w.cuts.map(x=>[x.t1,x.t2]);
    for(let k=0;k<nb;k++){const outer=k===0||k===nb-1;ctx.lineWidth=outer?w.lw:Math.max(w.lw*0.55,0.6);const g=cutG.concat(k===0?w.gaps.top:k===nb-1?w.gaps.bot:[],(w.xg&&w.xg[k])||[]);
      segs(tA[k],tB[k],g).forEach(([p,q])=>{ctx.beginPath();ctx.moveTo(p,w.bs[k]);ctx.lineTo(q,w.bs[k]);ctx.stroke()})}
    ctx.lineWidth=w.lw;["a","b"].forEach(E=>{const st=w.end[E].step;if(st&&w.T>st){const t=E==="a"?0:w.L;[[w.bs[0],st/2],[w.bs[nb-1],-st/2]].forEach(([s0,s1])=>{ctx.beginPath();ctx.moveTo(t,s0);ctx.lineTo(t,s1);ctx.stroke()})}if(w.end[E].kind!=="free")return;const t=E==="a"?0:w.L;ctx.beginPath();ctx.moveTo(t,w.bs[0]);ctx.lineTo(t,w.bs[nb-1]);ctx.stroke()});
    /* openings: clear the wall and draw the reveals; windows get glass lines */
    w.cuts.forEach(x=>{ctx.fillStyle="#fff";ctx.fillRect(x.t1+w.lw*0.5,-w.T/2-w.lw,x.t2-x.t1-w.lw,w.T+w.lw*2);ctx.lineWidth=w.lw;[x.t1,x.t2].forEach(t=>{ctx.beginPath();ctx.moveTo(t,w.bs[0]);ctx.lineTo(t,w.bs[nb-1]);ctx.stroke()});
      if(x.win){ctx.lineWidth=Math.max(w.lw*0.6,0.6);[w.bs[0],w.bs[nb-1]].forEach(s=>{ctx.beginPath();ctx.moveTo(x.t1,s);ctx.lineTo(x.t2,s);ctx.stroke()});const gl=Math.max(w.T*0.06,w.lw);[-gl,gl].forEach(s=>{ctx.beginPath();ctx.moveTo(x.t1,s);ctx.lineTo(x.t2,s);ctx.stroke()})}});
    if(o.k==="tstud")npDrawStuds(ctx,w);
    ctx.restore()})}
/* timber stud wall: studs at 400 or 600 centres, doubled at corners and either side of openings, backing studs where another wall joins, plus any extra timbers added by hand */
function npStudList(w,mmPerU){const o=w.o,mm=mmPerU||0;const sw=mm?50*mm:Math.max(w.T*0.4,4);const cc=mm?(o.cc||400)*mm:Math.max(w.T*2.4,sw*4);
  const t0=Math.max(...w.end.a.t),t1=Math.min(...w.end.b.t);const L0=Math.min(...w.end.a.t),L1=Math.max(...w.end.b.t);
  const out=[];const add=(t,kind)=>{t=Math.max(L0+sw/2,Math.min(L1-sw/2,t));if(!out.some(x=>Math.abs(x.t-t)<sw*0.5))out.push({t,kind})};
  const inCut=t=>w.cuts.some(c=>t>c.t1-sw*0.4&&t<c.t2+sw*0.4);
  add(t0+sw/2,"end");add(t1-sw/2,"end");
  const cs=o.corner||"3stud",ts=o.tee||"3stud";const flats=[];
  [["a",t0,1],["b",t1,-1]].forEach(([E,te,dir])=>{if(w.end[E].kind==="free")return;if(cs==="cal")flats.push({t:te+dir*(sw+w.T/2),len:w.T,side:w.end[E].side||1,kind:"flat"});else if(cs==="blk"){flats.push({t:te+dir*sw*1.5,len:sw*0.9,side:0,kind:"block"});add(te+dir*sw*2.5,"corner")}else add(te+dir*sw*1.5,"corner")});
  for(let t=t0+sw/2+cc;t<t1-sw;t+=cc){if(!inCut(t))add(t,"stud")}
  w.cuts.forEach(c=>{add(c.t1-sw/2,"king");add(c.t1-sw*1.5,"king");add(c.t2+sw/2,"king");add(c.t2+sw*1.5,"king")});
  w.tees.forEach(([a,b,sg])=>{if(ts==="ladder"){flats.push({t:(a+b)/2,len:(b-a)+sw*4,side:sg,kind:"ladder"});return}add(a-sw/2,"back");add(b+sw/2,"back");if(ts==="backer")flats.push({t:(a+b)/2,len:(b-a)+sw*2,side:sg,kind:"flat"})});
  (o.adds||[]).forEach(ad=>{let best=null;out.forEach(x=>{if(!best||Math.abs(x.t-ad.t)<Math.abs(best.t-ad.t))best=x});if(!best)return;const dir=ad.t>=best.t?1:-1;for(let i=1;i<=(ad.n||1);i++)out.push({t:best.t+dir*sw*i,kind:"extra"})});
  return {sw,list:out.filter(x=>x.t>=L0&&x.t<=L1),flats}}
function npDrawStuds(ctx,w){const {sw,list,flats}=npStudList(w,ctx.__mm);const T=w.T,top=w.bs[0],bot=w.bs[w.bs.length-1];ctx.save();ctx.lineWidth=Math.max(w.lw*0.5,0.5);
  list.forEach(x=>{const a=x.t-sw/2;ctx.fillStyle=x.kind==="extra"?"#e9c58f":"#f3e2c4";ctx.fillRect(a,bot,sw,top-bot);ctx.strokeRect(a,bot,sw,top-bot);ctx.beginPath();ctx.moveTo(a,bot);ctx.lineTo(a+sw,top);ctx.moveTo(a+sw,bot);ctx.lineTo(a,top);ctx.stroke()});
  (flats||[]).forEach(f=>{const th=f.kind==="ladder"?sw*0.6:f.kind==="block"?sw*0.9:Math.min(sw,(top-bot)*0.5);const y=f.side>0?top-th:f.side<0?bot:(top+bot)/2-th/2;const a=f.t-f.len/2;ctx.save();if(f.kind==="ladder")ctx.setLineDash([sw*0.4,sw*0.3]);ctx.fillStyle="#e9c58f";ctx.fillRect(a,y,f.len,th);ctx.strokeRect(a,y,f.len,th);ctx.restore();
    if(f.kind!=="ladder"){ctx.beginPath();ctx.moveTo(a,y);ctx.lineTo(a+f.len,y+th);ctx.moveTo(a+f.len,y);ctx.lineTo(a,y+th);ctx.stroke()}});ctx.restore()}
/* draw a page's objects: walls are drawn together so their corners join */
function npDrawAll(ctx,objs,drawObj,extra){const all=extra?objs.concat([extra]):objs;ctx.__objs=all;const W=npWallInfo(all);const att=W.length?npWallCuts(W,all):new Set();let done=false;
  const group=()=>{if(done)return;done=true;npDrawWalls(ctx,W);if(drawObj.__lin)all.forEach(o=>{if(o.lin&&npIsWall(o))drawObj.__lin(ctx,o)});all.forEach(o=>{if(att.has(o)&&o.k!=="window")drawObj(ctx,o)});if(drawObj.__mark)all.forEach(o=>{if(att.has(o)&&o.k==="window"&&o.mark)drawObj.__mark(ctx,o)})};
  all.forEach(o=>{if(npIsWall(o)||att.has(o)){group();return}drawObj(ctx,o)})}
