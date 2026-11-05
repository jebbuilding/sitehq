/* ===== DXF export: draws the page through a recording canvas, so everything (walls, symbols, text, dimensions) comes out as CAD lines and text in real mm ===== */
import { NP_U } from "./construction-details.js";
import { NP_SCX, setNpScx } from "./paving.js";
import { npDrawAll } from "./walls.js";
export { npDxf };
function npDxf(doc,pg,visObjs,drawObj,layerOf){const base=doc.baseScale||0,U=NP_U;const ents=[];const lays=new Set(["0"]);let curLayer="0";
  const aci=col=>{const h=String(col||"#000").replace("#","");if(!/^[0-9a-f]{6}$/i.test(h))return 7;const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);const P=[[1,255,0,0],[2,255,255,0],[3,0,255,0],[4,0,255,255],[5,0,0,255],[6,255,0,255],[7,0,0,0],[8,128,128,128],[30,255,127,0],[9,192,192,192]];let best=7,bd=1e9;P.forEach(([n,R,G,B])=>{const d=(R-r)**2+(G-g)**2+(B-b)**2;if(d<bd){bd=d;best=n}});return best};
  const real=(x,y,ctx)=>{let X=x,Y=y;const vo=ctx.__vpo;if(vo&&NP_SCX&&base){X=vo[0]+(x-vo[0])*NP_SCX/base;Y=vo[1]+(y-vo[1])*NP_SCX/base}const f=base?base/U:1/U;return [X*f,-Y*f]};
  const num=v=>(Math.round(v*1000)/1000).toString();
  const line=(p,q,ctx)=>{const a=real(p[0],p[1],ctx),b=real(q[0],q[1],ctx);if(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-4)return;ents.push(`0\nLINE\n8\n${curLayer}\n62\n${aci(ctx.strokeStyle)}\n10\n${num(a[0])}\n20\n${num(a[1])}\n30\n0\n11\n${num(b[0])}\n21\n${num(b[1])}\n31\n0`)};
  const R={__mm:base?U/base:0,__s:1,__vpo:null,lineWidth:1,strokeStyle:"#000",fillStyle:"#000",globalAlpha:1,font:"10px sans-serif",textAlign:"start",textBaseline:"alphabetic",lineCap:"butt",lineJoin:"miter"};
  let M=[1,0,0,1,0,0];const st=[];let path=[],cur=null,start=null;
  const tp=(x,y)=>[M[0]*x+M[2]*y+M[4],M[1]*x+M[3]*y+M[5]];const mul=(n)=>{const [a,b,c,d,e,f]=M;M=[a*n[0]+c*n[1],b*n[0]+d*n[1],a*n[2]+c*n[3],b*n[2]+d*n[3],a*n[4]+c*n[5]+e,b*n[4]+d*n[5]+f]};
  const sub=()=>{if(cur&&cur.length>1)path.push(cur);cur=null};
  const arcPts=(cx,cy,rx,ry,rot,a0,a1,ccw)=>{let d=a1-a0;if(ccw){if(d>0)d-=Math.PI*2}else{if(d<0)d+=Math.PI*2}if(Math.abs(a1-a0)>=Math.PI*2-1e-9)d=ccw?-Math.PI*2:Math.PI*2;const n=Math.max(8,Math.ceil(Math.abs(d)/(Math.PI/18)));const out=[];for(let i=0;i<=n;i++){const t=a0+d*i/n,x=rx*Math.cos(t),y=ry*Math.sin(t);out.push(tp(cx+x*Math.cos(rot)-y*Math.sin(rot),cy+x*Math.sin(rot)+y*Math.cos(rot)))}return out};
  const lighter=c=>{const m=String(c||"").match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);if(m){if(m[4]!=null&&+m[4]<0.6)return true;return (0.299*m[1]+0.587*m[2]+0.114*m[3])>110}if(/^#?f{3}$/i.test(String(c)))return true;const h=String(c||"").replace("#","");if(!/^[0-9a-f]{6}$/i.test(h))return false;const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return (0.299*r+0.587*g+0.114*b)>110};
  const emit=(fill)=>{sub();if(fill&&(lighter(R.fillStyle)||R.globalAlpha<0.6)){path=[];return}const cs=R.strokeStyle;if(fill)R.strokeStyle=R.fillStyle;path.forEach(pl=>{for(let i=1;i<pl.length;i++)line(pl[i-1],pl[i],R)});if(fill)R.strokeStyle=cs};
  Object.assign(R,{save(){st.push([M.slice(),R.strokeStyle,R.fillStyle,R.lineWidth,R.font,R.textAlign,R.textBaseline,R.globalAlpha])},restore(){const v=st.pop();if(v)[M,R.strokeStyle,R.fillStyle,R.lineWidth,R.font,R.textAlign,R.textBaseline,R.globalAlpha]=v},
    translate(x,y){mul([1,0,0,1,x,y])},rotate(a){const c=Math.cos(a),s2=Math.sin(a);mul([c,s2,-s2,c,0,0])},scale(x,y){mul([x,0,0,y,0,0])},transform(a,b,c,d,e,f){mul([a,b,c,d,e,f])},setTransform(a,b,c,d,e,f){M=typeof a==="object"?[a.a,a.b,a.c,a.d,a.e,a.f]:[a,b,c,d,e,f]},getTransform(){return {a:M[0],b:M[1],c:M[2],d:M[3],e:M[4],f:M[5]}},
    beginPath(){path=[];cur=null},moveTo(x,y){sub();cur=[tp(x,y)];start=cur[0]},lineTo(x,y){if(!cur){cur=[tp(x,y)];start=cur[0];return}cur.push(tp(x,y))},closePath(){if(cur&&start){cur.push(start.slice())}},
    arc(x,y,r,a0,a1,ccw){const pts=arcPts(x,y,r,r,0,a0,a1,ccw);if(cur)cur.push(...pts);else{cur=pts;start=pts[0]}},ellipse(x,y,rx,ry,rot,a0,a1,ccw){const pts=arcPts(x,y,rx,ry,rot,a0,a1,ccw);if(cur)cur.push(...pts);else{cur=pts;start=pts[0]}},
    quadraticCurveTo(cx,cy,x,y){const p0=cur&&cur.length?cur[cur.length-1]:tp(cx,cy);const inv=null;const P1=tp(cx,cy),P2=tp(x,y);if(!cur)cur=[p0];for(let i=1;i<=10;i++){const t=i/10;cur.push([(1-t)**2*p0[0]+2*(1-t)*t*P1[0]+t*t*P2[0],(1-t)**2*p0[1]+2*(1-t)*t*P1[1]+t*t*P2[1]])}},
    bezierCurveTo(c1x,c1y,c2x,c2y,x,y){const p0=cur&&cur.length?cur[cur.length-1]:tp(c1x,c1y);const A=tp(c1x,c1y),B=tp(c2x,c2y),C=tp(x,y);if(!cur)cur=[p0];for(let i=1;i<=12;i++){const t=i/12,u=1-t;cur.push([u*u*u*p0[0]+3*u*u*t*A[0]+3*u*t*t*B[0]+t*t*t*C[0],u*u*u*p0[1]+3*u*u*t*A[1]+3*u*t*t*B[1]+t*t*t*C[1]])}},
    rect(x,y,w,h){sub();const pl=[tp(x,y),tp(x+w,y),tp(x+w,y+h),tp(x,y+h),tp(x,y)];path.push(pl)},roundRect(x,y,w,h){R.rect(x,y,w,h)},
    stroke(){emit(false)},fill(){emit(true)},strokeRect(x,y,w,h){const sp=path;path=[];R.rect(x,y,w,h);emit(false);path=sp},fillRect(x,y,w,h){const sp=path;path=[];R.rect(x,y,w,h);emit(true);path=sp},clearRect(){},clip(){},setLineDash(){},getLineDash(){return []},drawImage(){},createPattern(){return null},
    measureText(t){const px=parseFloat((String(R.font).match(/([\d.]+)px/)||[])[1])||10;return {width:String(t).length*px*0.55}},
    fillText(t,x,y){t=String(t||"").replace(/[\r\n]+/g," ");if(!t.trim())return;const px=parseFloat((String(R.font).match(/([\d.]+)px/)||[])[1])||10;const sc=Math.hypot(M[0],M[1]);const P=tp(x,y);const a=real(P[0],P[1],R);const f=base?base/U:1/U;const vf=(R.__vpo&&NP_SCX&&base)?NP_SCX/base:1;const hgt=px*sc*f*vf*0.72;
      const rot=-Math.atan2(M[1],M[0])*180/Math.PI;const hj=R.textAlign==="center"?1:(R.textAlign==="right"||R.textAlign==="end")?2:0;const vj=R.textBaseline==="middle"?2:R.textBaseline==="top"?3:R.textBaseline==="bottom"?1:0;
      ents.push(`0\nTEXT\n8\n${curLayer}\n62\n${aci(R.fillStyle)}\n10\n${num(a[0])}\n20\n${num(a[1])}\n30\n0\n40\n${num(Math.max(hgt,0.1))}\n1\n${t.replace(/[^\x20-\x7E£°×]/g,"")}\n50\n${num(rot)}${hj||vj?`\n72\n${hj}\n11\n${num(a[0])}\n21\n${num(a[1])}\n31\n0\n73\n${vj}`:""}`)},strokeText(t,x,y){R.fillText(t,x,y)}});
  const objs=visObjs(doc.pages[pg].objs||doc.objs);const keep=NP_SCX;setNpScx(0);
  const lname=o=>String(layerOf(o)||"0").replace(/[^A-Za-z0-9_-]/g,"_").toUpperCase();
  try{curLayer="WALLS";lays.add(curLayer);npDrawAll(R,objs,(c,o)=>{const pl=curLayer;curLayer=lname(o);lays.add(curLayer);try{drawObj(c,o)}catch(e){}curLayer=pl})}finally{setNpScx(keep)}
  const head=`0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n0\nENDSEC`;
  const tables=`0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n${lays.size}\n${[...lays].map(l=>`0\nLAYER\n2\n${l}\n70\n0\n62\n7\n6\nCONTINUOUS`).join("\n")}\n0\nENDTAB\n0\nENDSEC`;
  return head+"\n"+tables+"\n0\nSECTION\n2\nENTITIES\n"+ents.join("\n")+"\n0\nENDSEC\n0\nEOF\n"}
