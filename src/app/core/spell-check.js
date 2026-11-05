/* ================= SPELL CHECK on every typing box (phone's own UK English checker) ================= */
(function(){try{document.documentElement.lang="en-GB"}catch(e){}
  const NO=/code|pin|postcode|reg|acc|number|no$|ni$|utr|cscs|vat|sort|iban|ref|gauge|pc$|tel|phone|email|url|web|lat|lon|loc|qty|amt|amount|price|rise|going|pitch|width|depth|height|^ms-|^ag-|^pb-|^tm-|^st-|^fl-|^rf-|^cs-/i;
  const fix=el=>{if(el.dataset.sp)return;el.dataset.sp="1";const t=(el.getAttribute("type")||"text").toLowerCase();
    if(el.tagName==="TEXTAREA"||(t==="text"||t==="search")&&!NO.test(el.id||"")&&!NO.test(el.className||"")&&el.getAttribute("inputmode")!=="decimal"&&el.getAttribute("inputmode")!=="numeric"){
      el.setAttribute("spellcheck","true");el.setAttribute("autocorrect","on");if(!el.hasAttribute("autocapitalize"))el.setAttribute("autocapitalize","sentences");el.setAttribute("lang","en-GB")}
    else{el.setAttribute("spellcheck","false")}};
  const scan=root=>{if(!root||!root.querySelectorAll)return;if(root.matches&&root.matches("input,textarea"))fix(root);root.querySelectorAll("input,textarea").forEach(fix)};
  scan(document.body);new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(scan))).observe(document.body,{childList:true,subtree:true})})();

