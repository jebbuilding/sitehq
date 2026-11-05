/* ================= CLIENT RECORD → PDF ================= */
import { clientSites } from "./address-book.js";
import { clStage, saveClient } from "./clients.js";
import { pdfToPages } from "./documents.js";
import { ptCl } from "./portal.js";
import { viewClient } from "./quick-enquiry.js";
import { $, gbp, iso, shortDay, stamp, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { openNotePage, pdfShow } from "../drawing/paving.js";
import { isSketch } from "../drawing/trade-drawings.js";
import { blobUrl, uploadFile } from "../files/files.js";
import { BRGB, logoId } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { same } from "../sites/project-pages.js";
export { clientPdf };
async function clientPdf(c,btn,o){o=o||{};const dl=o.download!==false;
  if(dl&&!S.dl){toast("Downloads only work when the page is opened in claude.ai");return}
  const lab=btn&&btn.textContent; if(btn){btn.disabled=true;btn.textContent="Making the PDF…"}
  const done=()=>{if(btn){btn.disabled=false;btn.textContent=lab}};
  try{await loadJsPdf()}catch(e){toast("Couldn't load the PDF maker. Check your connection.");done();return}
  const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4"}); const W=210,M=16; let y=18;
  const clean=t=>String(t||"").replace(/[–—]/g,"-").replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/×/g,"x").replace(/²/g,"2").replace(/³/g,"3").replace(/[^\x09\x0A\x0D\x20-\x7E£·•°]/g,"");
  const need=h=>{if(y+h>282){doc.addPage();y=16}};
  const text=(t,size=10,style="normal",gap=1.5,col)=>{doc.setFont("helvetica",style);doc.setFontSize(size);doc.setTextColor(...(col||[20,20,20]));doc.splitTextToSize(clean(t),W-2*M).forEach(l=>{need(size*0.45);doc.text(l,M,y);y+=size*0.42});y+=gap;doc.setTextColor(20,20,20)};
  const head=t=>{y+=3;need(12);doc.setFillColor(...BRGB());doc.rect(M,y-4.5,W-2*M,7,"F");doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(10.5);doc.text(clean(t).toUpperCase(),M+2,y);doc.setTextColor(20,20,20);y+=7};
  const kv=(l,v)=>{if(!v)return;doc.setFont("helvetica","bold");doc.setFontSize(9.5);const ls=doc.splitTextToSize(clean(v),W-2*M-50);need(ls.length*4.4+1.5);doc.setTextColor(110,100,100);doc.text(clean(l),M,y);doc.setTextColor(20,20,20);doc.setFont("helvetica","normal");ls.forEach((ln,i)=>{doc.text(ln,M+50,y+i*4.4)});y+=ls.length*4.4+0.6;doc.setDrawColor(225);doc.line(M,y-2.6,W-M,y-2.6);y+=1.4};
  const toData=async id=>{const b=await (await fetch(blobUrl(id))).blob();const u=await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.readAsDataURL(b)});const im=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=u});return {u,w:im.naturalWidth,h:im.naturalHeight,png:/^data:image\/png/.test(u)}};
  doc.setFillColor(...BRGB());doc.rect(0,0,W,6,"F");
  try{const L=await toData(logoId());const lh=22,lw=Math.min(55,lh*L.w/L.h);doc.addImage(L.u,L.png?"PNG":"JPEG",W-M-lw,10,lw,lh)}catch(e){}
  text("JEB BUILDING SERVICES",9,"bold",5,BRGB());text("Client record",11,"normal",1,[110,100,100]);y+=4;text(c.name,20,"bold",2);
  text(clStage(c.stage)+"   ·   Printed "+stamp(Date.now()),9,"normal",4,[110,100,100]);if(y<36)y=36;
  if(c.frontPhoto){try{const F=await toData(c.frontPhoto);let w=W-2*M,h=w*F.h/F.w;if(h>95){h=95;w=h*F.w/F.h}const x=M+(W-2*M-w)/2;doc.addImage(F.u,F.png?"PNG":"JPEG",x,y,w,h);doc.setDrawColor(200);doc.rect(x,y,w,h);y+=h+4;
    doc.setFontSize(8.5);doc.setTextColor(90,80,80);doc.text(clean("Front of the property"+([c.address,c.postcode].filter(Boolean).length?": "+[c.address&&c.address.split("\n").join(", "),c.postcode].filter(Boolean).join(", "):"")),M,y);doc.setTextColor(20,20,20);y+=5}catch(e){}}
  head("Contact details");
  kv("Client",c.name);kv("Phone",c.phone);kv("Email",c.email);kv("Property address",[c.address,c.postcode].filter(Boolean).join("\n"));(c.contacts||[]).forEach((x,i)=>kv(i?" ":"Other contacts",[x.name,x.role?"("+x.role+")":"",x.phone,x.email].filter(Boolean).join("  ")));
  if(c.invAddress||c.invName)kv("Invoice address",[c.invName,c.invAddress,c.invPostcode,c.invEmail].filter(Boolean).join("\n"));
  kv("Map pin",c.lat!=null?`${(+c.lat).toFixed(6)}, ${(+c.lon).toFixed(6)}  (google.com/maps?q=${(+c.lat).toFixed(6)},${(+c.lon).toFixed(6)})`:"");
  head("The job");
  kv("Type of work",c.work);kv("Budget",c.budget);kv("When they want it done",c.timescale);kv("Planning / drawings",c.planning);kv("Quote",c.quote?gbp(+c.quote):"");kv("Stage",clStage(c.stage));kv("Follow up",c.follow?shortDay(c.follow):"");kv("Found you through",c.source);kv("Site in the app",c.site);kv("Enquiry added",c.created?stamp(c.created):"");
  if(c.desc){head("What they want done");text(c.desc,10,"normal",2)}
  const notes=(c.notes||[]).slice().sort((a,b)=>a.at-b.at);
  if(notes.length){head("Notes and calls");notes.forEach(n=>{doc.setFont("helvetica","normal");doc.setFontSize(9.5);const ls=doc.splitTextToSize(clean(n.text),W-2*M-42);need(ls.length*4.3+2);doc.setTextColor(110,100,100);doc.setFontSize(8.5);doc.text(clean(stamp(n.at)),M,y);doc.setFontSize(9.5);doc.setTextColor(...(n.auto?[110,100,100]:[20,20,20]));ls.forEach((l,i)=>doc.text(l,M+42,y+i*4.3));doc.setTextColor(20,20,20);y+=ls.length*4.3+2})}
  const jobDr=(S.mine.photos||[]).filter(p=>isSketch(p)&&p.assetId&&p.site&&clientSites(c).some(n=>same(n,p.site))).map(p=>({id:p.assetId,src:p.pageSrc||"",kind:"sketch",note:"Drawing: "+(p.title||"Drawing"),at:p.editedAt||p.created||0}));
  const all=(c.media||[]).concat(jobDr).slice().sort((a,b)=>a.at-b.at);
  /* notebook pages and drawings go in as their own full pages (at their paper size), not as pictures on a page */
  const drawPages=[];for(const m of all.filter(x=>x.src)){if(btn)btn.textContent="Adding drawings…";try{const r=await openNotePage({srcId:m.src,title:m.note&&!/^Drawing: /.test(m.note)?m.note:"",render:true});if(Array.isArray(r)&&r.length)drawPages.push({m,pages:r});else m._fallback=true}catch(e){m._fallback=true}}
  /* sketches and pages saved only as a picture (older ones) also become their own full page */
  for(const m of all.filter(x=>(x.kind==="page"||x.kind==="sketch")&&(!x.src||x._fallback))){try{const D=await toData(m.id);const land=D.w>D.h*1.1;const pw=land?297:210,ph=land?210:297,mg=8;
      let w=pw-2*mg,h=w*D.h/D.w;if(h>ph-2*mg-10){h=ph-2*mg-10;w=h*D.w/D.h}
      drawPages.push({m,pages:[{img:D,wmm:pw,hmm:ph,x:(pw-w)/2,y:mg+8,w,h,title:(m.kind==="page"?"Notebook page":"Sketch")+(m.note?": "+m.note:"")+" · "+stamp(m.at)}]});m._done=true}catch(e){}}
  drawPages.sort((a,b)=>(a.m.at||0)-(b.m.at||0));
  const docPages=[];for(const d of (c.docs||[]).filter(x=>x.inPdf!==false)){if(btn)btn.textContent="Adding documents…";
    try{if(/^image\//.test(d.type||"")){const D=await toData(d.assetId);const land=D.w>D.h*1.1;const pw=land?297:210,ph=land?210:297,mg=8;let w=pw-2*mg,h=w*D.h/D.w;if(h>ph-2*mg-10){h=ph-2*mg-10;w=h*D.w/D.h}docPages.push({d,pages:[{img:D,wmm:pw,hmm:ph,x:(pw-w)/2,y:mg+8,w,h,title:"Document: "+(d.name||"")}]})}
      else{const pp=await pdfToPages(d.assetId);docPages.push({d,pages:pp})}}catch(e){docPages.push({d,pages:[],failed:true})}}
  const ms=all.filter(x=>!(x.src&&!x._fallback)&&!x._done&&x.kind!=="video"&&x.kind!=="audio");
  if(ms.length){if(y>200){doc.addPage();y=16}head(`Photos & sketches (${ms.length})`);
    const colW=(W-2*M-6)/2;let col=0,rowH=0;
    for(let i=0;i<ms.length;i++){const m=ms[i];if(btn)btn.textContent=`Adding picture ${i+1} of ${ms.length}…`;
      let D;try{D=await toData(m.id)}catch(e){continue}
      const big=m.kind==="page"||m.kind==="sketch"; const cap=(m.kind==="page"?"Notebook page":m.kind==="sketch"?"Sketch":m.marked?"Marked-up photo":"Photo")+(m.note?": "+m.note:"")+" · "+stamp(m.at);
      if(big){if(col){y+=rowH+2;col=0;rowH=0}let w=W-2*M,h=w*D.h/D.w;const maxH=250;if(h>maxH){h=maxH;w=h*D.w/D.h}need(h+8);doc.addImage(D.u,D.png?"PNG":"JPEG",M+(W-2*M-w)/2,y,w,h);doc.setDrawColor(200);doc.rect(M+(W-2*M-w)/2,y,w,h);y+=h+3.5;doc.setFontSize(8.5);doc.setTextColor(90,80,80);doc.splitTextToSize(clean(cap),W-2*M).forEach(l=>{doc.text(l,M,y);y+=3.8});doc.setTextColor(20,20,20);y+=3;continue}
      let w=colW,h=w*D.h/D.w;if(h>95){h=95;w=h*D.w/D.h}
      const capL=doc.setFontSize(8).splitTextToSize(clean(cap),colW);const blockH=h+2+capL.length*3.5;
      if(col===0){if(y+blockH>282){doc.addPage();y=16}}
      const x=M+col*(colW+6);doc.addImage(D.u,D.png?"PNG":"JPEG",x+(colW-w)/2,y,w,h);doc.setTextColor(90,80,80);capL.forEach((l,k)=>doc.text(l,x,y+h+3.5+k*3.5));doc.setTextColor(20,20,20);
      rowH=Math.max(rowH,blockH);col++;if(col===2){y+=rowH+4;col=0;rowH=0}}
    if(col)y+=rowH+4}
  {const av=all.filter(x=>x.kind==="video"||x.kind==="audio").sort((a,b)=>(a.at||0)-(b.at||0));
   if(av.length){const nv=av.filter(x=>x.kind==="video").length,na=av.length-nv;
    head(`Videos & voice notes (${av.length})`);
    text(`Saved for this client: ${[nv?nv+" video"+(nv===1?"":"s"):"",na?na+" voice note"+(na===1?"":"s"):""].filter(Boolean).join(" and ")}. ${av.length===1?"It can't":"They can't"} be played in a PDF: open the client's page in SiteHQ to ${nv&&na?"watch or listen":nv?"watch":"listen"}.`,9,"normal");
    av.forEach(m=>text(`${m.kind==="video"?"[VIDEO]":"[VOICE NOTE]"} ${stamp(m.at)}${m.secs?" · "+(m.secs>=60?Math.floor(m.secs/60)+" min "+(m.secs%60)+" s":m.secs+" s"):""}${m.note?" · "+m.note:""}`,9.5,"normal",1))}}
  if(drawPages.length){head(`Drawings & notes (${drawPages.reduce((a,d)=>a+d.pages.length,0)} page${drawPages.reduce((a,d)=>a+d.pages.length,0)===1?"":"s"})`);drawPages.forEach(d=>text(`${d.pages[0].title||d.m.note||(d.m.kind==="page"?"Notebook page":"Drawing")}${d.pages.length>1?" ("+d.pages.length+" pages)":""} · ${stamp(d.m.at)}`,9.5,"normal",1));text("These follow at the end of this PDF, each at its own paper size.",8.5,"italic",2,[110,100,100])}
  {const allDocs=c.docs||[];const outDocs=allDocs.filter(x=>x.inPdf===false);
   if(allDocs.length){head(`Documents (${allDocs.length})`);
    const inN=docPages.filter(x=>!x.failed).length;
    text(`${allDocs.length} document${allDocs.length===1?" is":"s are"} saved for this client.${inN?` ${inN===allDocs.length?(inN===1?"It follows":"They all follow"):inN+" of them "+(inN===1?"follows":"follow")} at the end of this PDF.`:""}${outDocs.length||docPages.some(x=>x.failed)?" The others are on the client's page in SiteHQ.":""}`,9,"normal");
    docPages.forEach(x=>text(`${x.failed?"[ON CLIENT PAGE]":"[IN THIS PDF]"} ${x.d.name||"Document"}${x.failed?" - couldn't be added here, download it from the client page":x.pages.length>1?" ("+x.pages.length+" pages)":""}${x.d.at?" · "+stamp(x.d.at):""}`,9.5,"normal",1));
    outDocs.forEach(d=>text(`[ON CLIENT PAGE] ${d.name||"Document"}${d.at?" · "+stamp(d.at):""} - not added to this PDF`,9.5,"normal",1))}}
  const recPages=doc.getNumberOfPages();
  drawPages.forEach(d=>d.pages.forEach(pg=>{doc.addPage([pg.wmm,pg.hmm],pg.wmm>pg.hmm?"landscape":"portrait");
    if(pg.img){doc.setFillColor(...BRGB());doc.rect(0,0,pg.wmm,4,"F");doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(20,20,20);doc.text(clean(pg.title).slice(0,110),8,12);doc.addImage(pg.img.u,pg.img.png?"PNG":"JPEG",pg.x,pg.y+6,pg.w,pg.h);doc.setDrawColor(200);doc.rect(pg.x,pg.y+6,pg.w,pg.h)}
    else doc.addImage(pg.data,"JPEG",0,0,pg.wmm,pg.hmm)}));
  docPages.forEach(x=>x.pages.forEach(pg=>{doc.addPage([pg.wmm,pg.hmm],pg.wmm>pg.hmm?"landscape":"portrait");
    if(pg.img){doc.setFillColor(...BRGB());doc.rect(0,0,pg.wmm,4,"F");doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(20,20,20);doc.text(clean(pg.title).slice(0,110),8,12);doc.addImage(pg.img.u,pg.img.png?"PNG":"JPEG",pg.x,pg.y+6,pg.w,pg.h);doc.setDrawColor(200);doc.rect(pg.x,pg.y+6,pg.w,pg.h)}
    else doc.addImage(pg.data,"JPEG",0,0,pg.wmm,pg.hmm)}));
  const n=doc.getNumberOfPages();for(let i=1;i<=recPages;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(130,120,120);doc.text(clean(`JEB Building Services · ${c.name} · Page ${i} of ${n}`),M,292);doc.text("Confidential client information",W-M,292,{align:"right"})}
  if(btn) btn.textContent="Saving…";
  const fname=`Client - ${clean(c.name).replace(/[^\w\s&-]/g,"").trim()||"record"} - ${iso(new Date())}.pdf`;const blob=doc.output("blob");
  if(dl){try{await S.dl.save({filename:fname,data:blob});toast("PDF saved")}catch(e){if(!(e&&e.code==="declined"))pdfShow(blob,fname)}}
  /* keep a copy on the client's job so it can be opened or downloaded again later */
  if(o.keep!==false&&S.assets){try{if(btn)btn.textContent="Saving to the job…";const a=await uploadFile(blob,fname);const cur=ptCl(c);const list=[{assetId:a.id,name:fname,at:Date.now(),pages:n}].concat(cur.recordPdfs||[]).slice(0,10);
    const rec=await saveClient(Object.assign({},cur,{recordPdfs:list}));if(!dl)toast("Client PDF saved to the job");if($("cv-gdpr")&&o.reopen!==false)viewClient(rec)}catch(e){if(!dl)toast("Couldn't save the PDF to the job")}}
  done();
}

