/* ===== elevation and section symbols ===== */
function npElevSym(ctx,o,x0,y0,w,h,cx,cy){const lw=ctx.lineWidth,mm=ctx.__mm||0,c=ctx.strokeStyle;const ln=(a,b,cc,d)=>{ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(cc,d);ctx.stroke()};const thin=f=>{ctx.lineWidth=Math.max(lw*(f||0.5),0.5)};const full=()=>{ctx.lineWidth=lw};
  const clip=fn=>{ctx.save();ctx.beginPath();ctx.rect(x0,y0,w,h);ctx.clip();fn();ctx.restore()};const mmu=v=>mm?v*mm:0;
  const glaze=(x,y,ww,hh)=>{ctx.strokeRect(x,y,ww,hh);ctx.save();thin(0.4);ln(x+ww*0.15,y+hh*0.25,x+ww*0.35,y+hh*0.08);ln(x+ww*0.2,y+hh*0.45,x+ww*0.55,y+hh*0.12);ctx.restore()};
  switch(o.k){
    case "ewin":{ctx.strokeRect(x0,y0,w,h);const f=Math.min(w,h)*0.06;thin(0.7);ctx.strokeRect(x0+f,y0+f,w-2*f,h-2*f);const tr=y0+f+(h-2*f)*0.3;ln(x0+f,tr,x0+w-f,tr);ln(cx,tr,cx,y0+h-f);full();
      glaze(x0+f*1.6,y0+f*1.6,w/2-f*2.2,tr-y0-f*2.6);glaze(cx+f*0.6,y0+f*1.6,w/2-f*2.2,tr-y0-f*2.6);glaze(x0+f*1.6,tr+f*0.6,w/2-f*2.2,y0+h-tr-f*2.2);glaze(cx+f*0.6,tr+f*0.6,w/2-f*2.2,y0+h-tr-f*2.2);
      ctx.lineWidth=lw*1.3;ln(x0-w*0.04,y0+h+lw,x0+w*1.04,y0+h+lw);break}
    case "edoor":{ctx.strokeRect(x0,y0,w,h);const f=w*0.06;thin(0.7);ctx.strokeRect(x0+f,y0+f,w-2*f,h-f);full();glaze(x0+w*0.2,y0+h*0.1,w*0.6,h*0.3);thin(0.6);ctx.strokeRect(x0+w*0.2,y0+h*0.5,w*0.6,h*0.15);ctx.strokeRect(x0+w*0.2,y0+h*0.72,w*0.6,h*0.18);full();
      ctx.beginPath();ctx.arc(x0+w*0.84,y0+h*0.55,Math.max(lw,w*0.025),0,7);ctx.fill();break}
    case "efrench":{ctx.strokeRect(x0,y0,w,h);ln(cx,y0,cx,y0+h);const f=w*0.05;glaze(x0+f,y0+f,w/2-2*f,h*0.82);glaze(cx+f,y0+f,w/2-2*f,h*0.82);[cx-w*0.04,cx+w*0.04].forEach(x=>{ctx.beginPath();ctx.arc(x,y0+h*0.5,Math.max(lw,w*0.012),0,7);ctx.fill()});break}
    case "ebifold":{ctx.strokeRect(x0,y0,w,h);const n=4;for(let i=1;i<n;i++)ln(x0+w*i/n,y0,x0+w*i/n,y0+h);const f=w*0.02;for(let i=0;i<n;i++)glaze(x0+w*i/n+f,y0+f*2,w/n-2*f,h*0.88);
      ctx.save();thin(0.5);ctx.setLineDash([lw*3,lw*3]);for(let i=0;i<n;i+=2){ln(x0+w*i/n,y0,x0+w*(i+1)/n,y0+h/2);ln(x0+w*(i+1)/n,y0+h/2,x0+w*i/n,y0+h)}ctx.restore();break}
    case "egarage":{ctx.strokeRect(x0,y0,w,h);const n=Math.max(4,Math.round(h/(mmu(500)||h/5)));thin(0.6);for(let i=1;i<n;i++)ln(x0,y0+h*i/n,x0+w,y0+h*i/n);full();ctx.strokeRect(cx-w*0.06,y0+h*0.86,w*0.12,h*0.04);break}
    case "eroof":case "elean":{const pts=o.k==="eroof"?[[x0,y0+h],[cx,y0],[x0+w,y0+h]]:[[x0,y0+h],[x0,y0],[x0+w,y0+h]];ctx.save();ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.clip();
      thin(0.45);const cs=mmu(100)||Math.max(h/12,6);for(let y=y0+h-cs;y>y0;y-=cs)ln(x0,y,x0+w,y);ctx.restore();ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.stroke();
      ctx.lineWidth=lw*1.4;ln(x0-w*0.02,y0+h,x0+w*1.02,y0+h);break}
    case "ebrick":case "etile":{ctx.strokeRect(x0,y0,w,h);clip(()=>{thin(0.4);const ch=o.k==="ebrick"?(mmu(75)||Math.max(h/16,5)):(mmu(100)||Math.max(h/12,6)),bl=o.k==="ebrick"?(mmu(225)||ch*3):(mmu(265)||ch*2.6);let r=0;
      for(let y=y0+h;y>y0;y-=ch,r++){ln(x0,y,x0+w,y);const off=r%2?bl/2:0;for(let x=x0+off;x<x0+w;x+=bl)ln(x,y,x,y-ch)}});break}
    case "erender":{ctx.strokeRect(x0,y0,w,h);clip(()=>{const st=mmu(40)||Math.max(Math.min(w,h)/30,4);let k=0;for(let y=y0+st/2;y<y0+h;y+=st,k++)for(let x=x0+(k%2?st/2:st/4);x<x0+w;x+=st){ctx.beginPath();ctx.arc(x,y,Math.max(lw*0.35,0.4),0,7);ctx.fill()}});break}
    case "eclad":{ctx.strokeRect(x0,y0,w,h);clip(()=>{thin(0.5);const st=mmu(150)||Math.max(h/14,6);for(let y=y0+h-st;y>y0;y-=st)ln(x0,y,x0+w,y)});break}
    case "econc":{ctx.strokeRect(x0,y0,w,h);clip(()=>{const st=Math.max(Math.min(w,h)/6,mmu(40)||6);let k=0;for(let y=y0+st/2;y<y0+h;y+=st,k++)for(let x=x0+(k%2?st/2:st/5);x<x0+w;x+=st){ctx.beginPath();ctx.arc(x,y,Math.max(lw*0.35,0.4),0,7);ctx.fill();
        if((k+Math.round(x))%3===0){thin(0.4);const r=st*0.18;ctx.beginPath();ctx.moveTo(x+st*0.3,y-r);ctx.lineTo(x+st*0.3+r,y+r);ctx.lineTo(x+st*0.3-r,y+r);ctx.closePath();ctx.stroke();full()}}});break}
    case "einsul":{ctx.fillStyle="#fff1a8";ctx.fillRect(x0,y0,w,h);ctx.fillStyle=c;ctx.strokeRect(x0,y0,w,h);clip(()=>{const v=w>=h;if(v)npPattern(ctx,"insul",x0,x0+w,y0,y0+h,lw,c);else{ctx.save();ctx.translate(x0,y0+h);ctx.rotate(-Math.PI/2);npPattern(ctx,"insul",0,h,0,w,lw,c);ctx.restore()}});break}
    case "ehard":{ctx.strokeRect(x0,y0,w,h);clip(()=>{thin(0.45);const st=mmu(50)||Math.max(Math.min(w,h)/5,6);for(let x=x0-h;x<x0+w+h;x+=st){ln(x,y0+h,x+h,y0);ln(x+st/2,y0,x+st/2+h,y0+h)}});break}
    case "elevel":{const m=Math.min(w,h);ctx.beginPath();ctx.moveTo(x0,y0+h);ctx.lineTo(x0+w,y0+h);ctx.stroke();const tw=m*0.5;ctx.beginPath();ctx.moveTo(x0+tw*0.2,y0+h-tw*0.9);ctx.lineTo(x0+tw*1.0,y0+h-tw*0.9);ctx.lineTo(x0+tw*0.6,y0+h);ctx.closePath();ctx.stroke();
      npLbl(ctx,o.s||"FFL ±0.000",x0+tw*1.2+(w-tw*1.2)/2,y0+h-tw*0.55,Math.min(h*0.42,(w-tw*1.2)/7));break}
    case "edp":{const v=h>=w;if(v){ln(x0,y0,x0,y0+h);ln(x0+w,y0,x0+w,y0+h);thin(0.6);const st=mmu(1500)||Math.max(h/4,20);for(let y=y0+st/2;y<y0+h;y+=st)ctx.strokeRect(x0-w*0.15,y,w*1.3,Math.max(w*0.25,lw*2));full();ln(x0,y0+h,x0+w*1.6,y0+h)}else{ln(x0,y0,x0+w,y0);ln(x0,y0+h,x0+w,y0+h)}break}
    case "eroofl":{ctx.strokeRect(x0,y0,w,h);const f=Math.min(w,h)*0.08;glaze(x0+f,y0+f,w-2*f,h-2*f);ctx.lineWidth=lw*1.3;ln(x0-f*0.5,y0-f*0.3,x0+w+f*0.5,y0-f*0.3);break}}}
function npElevLine(ctx,o,P,ln,L,lw){switch(o.k){
  case "eground":{ctx.save();ctx.lineWidth=lw*1.6;ln(P(0,0),P(L,0));ctx.restore();const st=Math.max(lw*6,14),d=Math.max(lw*5,12);ctx.save();ctx.lineWidth=Math.max(lw*0.5,0.5);for(let t=st/2;t<L;t+=st)ln(P(t,0),P(Math.max(0,t-d*0.7),-d));ctx.restore();return true}
  case "edpc":{ctx.save();ctx.setLineDash([lw*5,lw*3]);ln(P(0,0),P(L,0));ctx.restore();const m=P(L/2,Math.max(10,lw*4));npLbl(ctx,"DPC",m[0],m[1],Math.max(12,lw*4));return true}
  case "egutter":{ln(P(0,0),P(L,0));const r=Math.max(lw*2.5,6);ctx.beginPath();const a=P(0,0),b=P(L,0);ctx.save();ctx.lineWidth=Math.max(lw*0.6,0.6);ln(P(0,-r),P(L,-r));ctx.restore();ln(a,P(0,-r));ln(b,P(L,-r));return true}}
  return false}

