/* ================= VIEWER ================= */
import { $ } from "./helpers.js";
import { S } from "./state.js";
import { enhanceAddrs } from "../sites/maps-pins.js";
export { closeViewer, initViewer, openViewer };
function openViewer(html){S.openJob=null;$("viewer-body").innerHTML=html;$("viewer").hidden=false;try{enhanceAddrs($("viewer-body"))}catch(e){}}
function closeViewer(){S.openJob=null;$("viewer").style.zIndex="";$("viewer").hidden=true;$("viewer-body").innerHTML=""}

/* Runs once when the app starts, called from core/boot.js. Nothing else in this file runs at load. */
function initViewer(){
$("viewer-close").onclick=closeViewer;
}
