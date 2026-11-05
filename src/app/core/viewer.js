/* ================= VIEWER ================= */
function openViewer(html){S.openJob=null;$("viewer-body").innerHTML=html;$("viewer").hidden=false;try{enhanceAddrs($("viewer-body"))}catch(e){}}
function closeViewer(){S.openJob=null;$("viewer").style.zIndex="";$("viewer").hidden=true;$("viewer-body").innerHTML=""}
$("viewer-close").onclick=closeViewer;

