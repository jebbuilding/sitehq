/* ================= CUPBOARD PICS: small pictures to pick what you're making and the doors ================= */
import { $, esc } from "../core/helpers.js";
export { CBP_DOOR, CBP_KIND, cbpPicker };
/* Line drawings (inline SVG, drawn in the text colour so they work in dark mode) for each choice in the cupboard
   form. Tapping one picks it in the form's own list (which stays for screen readers and keyboards). */
const CBP_W =
  'stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round"';
const cbpWalls = `<path d="M4 6v52M60 6v52" stroke-width="5" stroke="currentColor" opacity=".25"/><path d="M2 58h60" ${CBP_W}/>`;
const CBP_KIND = {
  full: `<rect x="12" y="6" width="40" height="50" ${CBP_W}/><path d="M32 8v44M12 52h40" ${CBP_W}/><path d="M28 30v4M36 30v4" ${CBP_W}/>`,
  alcove: `${cbpWalls}<path d="M7 16h50M7 26h50M7 36h50" ${CBP_W}/><rect x="9" y="40" width="46" height="4" ${CBP_W}/><rect x="10" y="44" width="44" height="13" ${CBP_W}/><path d="M32 45v11" ${CBP_W}/>`,
  base: `<rect x="6" y="26" width="52" height="5" ${CBP_W}/><rect x="8" y="31" width="48" height="25" ${CBP_W}/><path d="M32 33v20M8 52h48M28 40v4M36 40v4" ${CBP_W}/>`,
  shelves: `${cbpWalls}<path d="M7 14h50M7 25h50M7 36h50M7 47h50" ${CBP_W}/>`,
  corner: `<path d="M6 10h30v44H6zM36 22h22v32H36z" ${CBP_W}/><path d="M21 12v40M47 24v28" ${CBP_W}/>`,
  stairs: `<path d="M6 56V40l14-8 14-8 14-8 10-6v38z" ${CBP_W}/><path d="M24 54V32M42 54V22" ${CBP_W}/>`,
  eaves: `<path d="M6 56V40L58 12v44z" ${CBP_W}/><path d="M24 54V31M42 54V22" ${CBP_W}/>`,
  bridge: `<rect x="6" y="8" width="14" height="48" ${CBP_W}/><rect x="44" y="8" width="14" height="48" ${CBP_W}/><rect x="20" y="8" width="24" height="14" ${CBP_W}/><path d="M22 40h20v12H22z" ${CBP_W} opacity=".4"/>`,
  window: `<rect x="6" y="8" width="12" height="48" ${CBP_W}/><rect x="46" y="8" width="12" height="48" ${CBP_W}/><rect x="18" y="38" width="28" height="18" ${CBP_W}/><rect x="22" y="12" width="20" height="20" ${CBP_W} opacity=".4"/><path d="M32 12v20M22 22h20" ${CBP_W} opacity=".4"/>`,
  seat: `<rect x="6" y="34" width="52" height="22" ${CBP_W}/><rect x="6" y="28" width="52" height="6" rx="2" ${CBP_W}/><path d="M24 36v18M40 36v18" ${CBP_W}/><rect x="16" y="6" width="32" height="18" ${CBP_W} opacity=".4"/>`,
  bench: `<rect x="6" y="6" width="52" height="16" ${CBP_W}/><path d="M23 6v16M40 6v16" ${CBP_W}/><path d="M14 28v4M26 28v4M38 28v4M50 28v4" ${CBP_W}/><rect x="6" y="40" width="52" height="4" ${CBP_W}/><path d="M6 44v12M58 44v12M6 50h52" ${CBP_W}/>`,
  tv: `<rect x="4" y="8" width="14" height="48" ${CBP_W}/><rect x="46" y="8" width="14" height="48" ${CBP_W}/><rect x="18" y="44" width="28" height="12" ${CBP_W}/><rect x="21" y="18" width="22" height="14" rx="1" ${CBP_W} opacity=".5"/><path d="M4 22h14M4 34h14M46 22h14M46 34h14" ${CBP_W}/>`,
};
const CBP_DOOR = {
  hinged: `<rect x="10" y="6" width="44" height="52" ${CBP_W}/><path d="M32 6v52" ${CBP_W}/><path d="M10 6l22 26M10 58l22-26" ${CBP_W} stroke-dasharray="3 3" opacity=".6"/>`,
  pairs: `<rect x="10" y="6" width="44" height="52" ${CBP_W}/><path d="M21 6v52M32 6v52M43 6v52" ${CBP_W}/><path d="M28 30v4M36 30v4" ${CBP_W}/>`,
  sliding: `<rect x="8" y="6" width="48" height="52" ${CBP_W}/><rect x="10" y="9" width="26" height="46" ${CBP_W}/><rect x="28" y="12" width="26" height="43" ${CBP_W} opacity=".55"/><path d="M14 4h36" ${CBP_W}/>`,
  glass: `<rect x="14" y="6" width="36" height="52" ${CBP_W}/><rect x="20" y="12" width="24" height="40" ${CBP_W} opacity=".5"/><path d="M32 12v40M20 25h24M20 39h24" ${CBP_W} opacity=".5"/>`,
  none: `<rect x="10" y="6" width="44" height="52" ${CBP_W}/><path d="M10 20h44M10 33h44M10 46h44" ${CBP_W}/>`,
};
/* short names under the door pictures */
const CBP_DOORNAME = {
  hinged: "One door per bay",
  pairs: "Pairs of doors",
  sliding: "Sliding doors",
  glass: "Glazed",
  none: "Open – no doors",
};
const cbpSvg = (body) =>
  `<svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">${body}</svg>`;
/* a row of pictures that drives a <select> */
function cbpPicker(sel, pics, cls) {
  const s = $(sel);
  if (!s) return;
  const box = document.createElement("div");
  box.className = "cb2-pics " + (cls || "");
  box.setAttribute("role", "radiogroup");
  box.setAttribute(
    "aria-label",
    s.closest("label") ? s.closest("label").firstChild.textContent.trim() : "Choose",
  );
  [...s.options].forEach((o) => {
    if (!pics[o.value]) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cb2-pic";
    b.dataset.v = o.value;
    b.setAttribute("role", "radio");
    b.innerHTML =
      cbpSvg(pics[o.value]) +
      `<span>${esc((pics === CBP_DOOR && CBP_DOORNAME[o.value]) || o.textContent.replace(/ –.*/, ""))}</span>`;
    b.onclick = () => {
      s.value = o.value;
      s.dispatchEvent(new Event("change", { bubbles: true }));
      sync();
    };
    box.appendChild(b);
  });
  const sync = () =>
    box
      .querySelectorAll(".cb2-pic")
      .forEach((b) => b.setAttribute("aria-checked", String(b.dataset.v === s.value)));
  s.addEventListener("change", sync);
  s.closest("label").after(box);
  s.closest("label").classList.add("cb2-picsel");
  sync();
}
