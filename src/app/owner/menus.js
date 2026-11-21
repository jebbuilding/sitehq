/* ================= MENUS: each firm names, orders and hides its own menu sections and pages ================= */
import { $, esc, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { EMP_TABS, OWN_TABS, render } from "../core/tabs-week.js";
import { NL_SECTIONS } from "./today.js";
import { TL_BAR } from "./trade-look.js";
export { mnuApply, mnuSecHidden, mnuSecRenamed, mnuTabHidden, mnuTabRenamed, mnuView };
/* James (Nov 2026): "is every part of the app customizable for another company if not lets make it that way" – he
   chose menus and tab names first. Setup › 🧭 Menus: the side menu's sections (rename, ↑ ↓ to reorder, hide – Today
   stays first and Setup can't be hidden) and every page's name, for the office and for the trades (rename, hide from
   the office menus). Saved in settings/app.menus { sec: {key: name}, order: [keys], secHide: [keys], tab: {key:
   name}, emp: {key: name}, tabHide: [keys] }, so everyone sees the firm's own names; what each trade may open is still
   set in People & access. Applied on every redraw by putting the names into the menu lists (their first names are
   kept so ↺ Back to standard puts them back). */
let mnuSig = null;
let mnuStd = null;
const mnuCfg = () =>
  Object.assign(
    { sec: {}, order: [], secHide: [], tab: {}, emp: {}, tabHide: [] },
    (S.settings || {}).menus || {},
  );
function mnuKeep() {
  if (mnuStd) return;
  mnuStd = {
    sec: NL_SECTIONS.map((x) => [x[0], x[1]]),
    own: OWN_TABS.map((x) => [x[0], x[1]]),
    emp: EMP_TABS.map((x) => [x[0], x[1]]),
    bar: TL_BAR.map((x) => [x[0], x[1]]),
  };
}
/* the firm's names and order into the menu lists */
function mnuApply() {
  const m = mnuCfg();
  const sig = JSON.stringify(m);
  if (sig === mnuSig) return;
  mnuSig = sig;
  mnuKeep();
  const plain = (t) => String(t || "").replace(/^\S+\s+/, "");
  NL_SECTIONS.forEach((x) => {
    const std = (mnuStd.sec.find((y) => y[0] === x[0]) || [0, x[1]])[1];
    x[1] = (m.sec[x[0]] || "").trim() || std;
  });
  /* the order: Today first, then the order chosen, then any not in it, as they were */
  const rank = (k) =>
    k === "today"
      ? -1
      : m.order.includes(k)
        ? m.order.indexOf(k)
        : 100 + mnuStd.sec.findIndex((y) => y[0] === k);
  NL_SECTIONS.sort((a, b) => rank(a[0]) - rank(b[0]));
  [
    [OWN_TABS, mnuStd.own, m.tab],
    [EMP_TABS, mnuStd.emp, m.emp],
  ].forEach(([L, std, names]) =>
    L.forEach((x) => {
      const s = (std.find((y) => y[0] === x[0]) || [0, x[1]])[1];
      const n = (names[x[0]] || "").trim();
      /* a new name keeps the page's picture in front unless one is typed */
      x[1] = n ? (/^\p{Extended_Pictographic}/u.test(n) ? n : s.split(" ")[0] + " " + n) : s;
    }),
  );
  TL_BAR.forEach((x) => {
    const s = (mnuStd.bar.find((y) => y[0] === x[0]) || [0, x[1]])[1];
    const n = (m.emp[x[0]] || "").trim();
    x[1] = n ? plain(/^\p{Extended_Pictographic}/u.test(n) ? n : "x " + n) : s;
  });
}
const mnuSecHidden = (k) => k !== "today" && k !== "setup" && mnuCfg().secHide.includes(k);
/* a section the firm has named: its short label is its own name too */
/* a page the firm has named itself: its own name wins over a section's own label for it */
const mnuTabRenamed = (k) => !!(mnuCfg().tab[k] || "").trim();
const mnuSecRenamed = (k) => !!(mnuCfg().sec[k] || "").trim();
const mnuTabHidden = (k) => k !== "setup" && mnuCfg().tabHide.includes(k);
async function mnuSave(m) {
  try {
    await S.db.doc("settings/app").update({ menus: m });
    S.settings = Object.assign({}, S.settings, { menus: m });
    render();
    return true;
  } catch (e) {
    toast("Couldn't save. Check your connection.");
    return false;
  }
}
function mnuView(stSeg) {
  mnuApply();
  mnuKeep();
  const m = mnuCfg();
  const std = (L, k) => (L.find((y) => y[0] === k) || [0, ""])[1];
  const secs = NL_SECTIONS.filter((x) => x[0] !== "today");
  $("main").innerHTML = `${stSeg}
    <div class="notice">🧭 <b>Menus.</b> Call the parts of the app what your firm calls them, put the menu in your own order and hide what you don't use. Everyone sees your names. What each trade can open is still set in 👥 People &amp; access.</div>
    <section class="card mnu-card"><div class="cardbody"><b>The side menu</b><div class="who">Today stays at the top.</div>
      ${secs
        .map(
          (x, i) =>
            `<div class="mnu-row" data-k="${esc(x[0])}"><button type="button" class="iconbtn mnu-up" aria-label="Move up"${i ? "" : " disabled"}>↑</button><button type="button" class="iconbtn mnu-dn" aria-label="Move down"${i < secs.length - 1 ? "" : " disabled"}>↓</button><input class="mnu-sn" maxlength="30" value="${esc(m.sec[x[0]] || "")}" placeholder="${esc(std(mnuStd.sec, x[0]))}" aria-label="Name for ${esc(std(mnuStd.sec, x[0]))}">${x[0] === "setup" ? '<span class="who">always shown</span>' : `<label class="inl"><input type="checkbox" class="mnu-sh"${m.secHide.includes(x[0]) ? " checked" : ""}> Hide</label>`}</div>`,
        )
        .join("")}</div></section>
    <section class="card mnu-card"><div class="cardbody"><b>Pages – your names</b><div class="who">Leave a box empty for the standard name. Start with an emoji to change the picture too.</div>
      ${mnuStd.own
        .map(
          ([k, l]) =>
            `<div class="mnu-row mnu-tab" data-k="${esc(k)}"><span class="mnu-std">${esc(l)}</span><input class="mnu-tn" maxlength="40" value="${esc(m.tab[k] || "")}" placeholder="${esc(l.replace(/^\S+\s+/, ""))}" aria-label="Your name for ${esc(l)}">${k === "setup" || k === "me" ? "" : `<label class="inl"><input type="checkbox" class="mnu-th"${m.tabHide.includes(k) ? " checked" : ""}> Hide</label>`}</div>`,
        )
        .join("")}</div></section>
    <section class="card mnu-card"><div class="cardbody"><b>The trades' pages – your names</b>
      ${mnuStd.emp
        .map(
          ([k, l]) =>
            `<div class="mnu-row mnu-emp" data-k="${esc(k)}"><span class="mnu-std">${esc(l)}</span><input class="mnu-en" maxlength="40" value="${esc(m.emp[k] || "")}" placeholder="${esc(l.replace(/^\S+\s+/, ""))}" aria-label="Your name for the trades' ${esc(l)}"></div>`,
        )
        .join("")}</div></section>
    <div class="actions"><button type="button" class="btn primary" id="mnu-save">Save the menus</button><button type="button" class="btn" id="mnu-std">↺ Back to the standard names and order</button></div>`;
  const read = () => {
    const out = { sec: {}, order: [], secHide: [], tab: {}, emp: {}, tabHide: [] };
    document.querySelectorAll("#main .mnu-card .mnu-row[data-k]").forEach((r) => {
      const k = r.dataset.k;
      const sn = r.querySelector(".mnu-sn"),
        tn = r.querySelector(".mnu-tn"),
        en = r.querySelector(".mnu-en");
      if (sn) {
        out.order.push(k);
        if (sn.value.trim()) out.sec[k] = sn.value.trim();
        const h = r.querySelector(".mnu-sh");
        if (h && h.checked) out.secHide.push(k);
      }
      if (tn) {
        if (tn.value.trim()) out.tab[k] = tn.value.trim();
        const h = r.querySelector(".mnu-th");
        if (h && h.checked) out.tabHide.push(k);
      }
      if (en && en.value.trim()) out.emp[k] = en.value.trim();
    });
    return out;
  };
  document.querySelectorAll("#main .mnu-up, #main .mnu-dn").forEach(
    (b) =>
      (b.onclick = () => {
        const row = b.closest(".mnu-row");
        const sib = b.classList.contains("mnu-up")
          ? row.previousElementSibling
          : row.nextElementSibling;
        if (!sib || !sib.classList.contains("mnu-row")) return;
        if (b.classList.contains("mnu-up")) sib.before(row);
        else sib.after(row);
        const rows = [...row.parentNode.querySelectorAll(".mnu-row")];
        rows.forEach((r, i) => {
          r.querySelector(".mnu-up").disabled = i === 0;
          r.querySelector(".mnu-dn").disabled = i === rows.length - 1;
        });
      }),
  );
  $("mnu-save").onclick = async () => {
    if (await mnuSave(read())) toast("Menus saved – everyone sees your names");
  };
  $("mnu-std").onclick = async () => {
    if (await mnuSave({ sec: {}, order: [], secHide: [], tab: {}, emp: {}, tabHide: [] }))
      toast("Back to the standard menus");
  };
}
