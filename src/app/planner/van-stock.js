/* ================= VANS: what's on each van – its tools and its stock, and a restock list ================= */
import { $, esc, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { newId } from "../files/outbox.js";
import { TLR } from "./tool-register.js";
import { dlgEsc } from "../survey/glass-colours.js";
export { VNS };
/* James (Nov 2026, "what's on each van"): 🚐 Vehicles & plant › 📦 What's on each van. Pick a van: 🧰 the tools on it
   (from 🧰 Tools & plant – put one on, take it off back to the yard; the tools list then says which van it's on) and
   📦 its stock – the things it should carry (screws, foam, silicone…) with how many it has and how many it should have;
   − / + as they're used. 🛒 Restock list: everything below what it should be, on every van, to copy into an order or a
   message, and ✓ Restocked fills them back up. Today shows how many things need restocking. Stock is owner-only:
   todos/vs-{van id} (kind "vanstock": { van, items: [{ id, what, have, want }] }); a tool on a van is out.van on its
   equipment record. */
const VNS = (() => {
  const PRE = [
    ["Wood screws (boxes)", 4],
    ["Wall plugs (boxes)", 2],
    ["Frame fixings (boxes)", 2],
    ["Silicone (white)", 4],
    ["Expanding foam", 3],
    ["Grab adhesive", 4],
    ["Decorator's caulk", 4],
    ["Sandpaper (packs)", 2],
    ["Cable ties (packs)", 1],
    ["Gloves (pairs)", 6],
    ["Dust masks (FFP3)", 10],
    ["Rubble sacks", 20],
  ];
  const vans = () =>
    (S.equipment || [])
      .filter((e) => e.kind === "vehicle")
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const recId = (v) => "vs-" + v;
  const recOf = (v) => (S.vanStocks || []).find((x) => x.id === recId(v)) || { van: v, items: [] };
  const vanName = (v) => ((S.equipment || []).find((x) => x.id === v) || {}).name || "a van";
  const toolsOn = (v) =>
    (S.equipment || [])
      .filter((e) => e.out && e.out.van === v)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  async function save(v, items) {
    const rec = { kind: "vanstock", van: v, items, updated: Date.now() };
    await S.db.doc("todos/" + recId(v)).set(rec);
    S.vanStocks = (S.vanStocks || [])
      .filter((x) => x.id !== recId(v))
      .concat([Object.assign({ id: recId(v) }, rec)]);
  }
  function lowList() {
    const out = [];
    vans().forEach((v) =>
      recOf(v.id).items.forEach((it) => {
        if (it.what && (+it.have || 0) < (+it.want || 0))
          out.push({ v, it, need: (+it.want || 0) - (+it.have || 0) });
      }),
    );
    return out;
  }
  let cur = "";
  function open(v) {
    const V = vans();
    if (!V.length) {
      toast("Add your vans in 🚐 Vehicles & plant first");
      return;
    }
    cur = v || cur || V[0].id;
    if (!V.some((x) => x.id === cur)) cur = V[0].id;
    const items = recOf(cur).items;
    const tools = toolsOn(cur);
    const spare = (S.equipment || [])
      .filter(
        (e) => ["machine", "ladder", "trailer"].includes(e.kind) && !(e.out && e.out.van === cur),
      )
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    const low = lowList();
    openViewer(`<div class="vns"><div class="vhead"><b>📦 What's on each van</b></div>
      <div class="seg vns-vans" role="group" aria-label="Van">${V.map((x) => `<button type="button" class="vns-v" data-v="${esc(x.id)}" aria-pressed="${x.id === cur}">🚐 ${esc(x.name || "Van")}</button>`).join("")}</div>
      <button type="button" class="btn${low.length ? " primary" : ""}" id="vns-low">🛒 Restock list${low.length ? " (" + low.length + ")" : ""}</button>
      <div class="flabel">🧰 Tools on this van (${tools.length})</div>
      ${tools.map((e) => `<div class="vns-row"><span><b>${esc(e.name)}</b> ${e.tag ? `<span class="tag">${esc(e.tag)}</span>` : ""}</span><button type="button" class="pillbtn vns-off" data-id="${esc(e.id)}">Take off</button></div>`).join("") || '<div class="who">No tools on it yet.</div>'}
      ${TLR.vanHtml(cur)}
      ${spare.length ? `<label class="vns-put">Put a tool on<select id="vns-tool"><option value="">Choose a tool…</option>${spare.map((e) => `<option value="${esc(e.id)}">${esc(e.name)}${e.out && e.out.van ? " (on " + esc(vanName(e.out.van)) + ")" : e.out && (e.out.who || e.out.site) ? " (out)" : ""}</option>`).join("")}</select></label>` : ""}
      <div class="flabel">📦 Stock</div>
      <div class="who">How many it has, and how many it should carry. Tap − as things are used.</div>
      ${items
        .map((it) => {
          const lo = (+it.have || 0) < (+it.want || 0);
          return `<div class="vns-st${lo ? " vns-lo" : ""}" data-id="${esc(it.id)}"><input class="vns-w" maxlength="60" value="${esc(it.what || "")}" aria-label="What"><span class="vns-n"><button type="button" class="pillbtn vns-m" aria-label="One fewer">−</button><b class="vns-h">${+it.have || 0}</b><button type="button" class="pillbtn vns-p" aria-label="One more">+</button></span><label class="vns-wl">Should have<input class="vns-want" type="number" inputmode="numeric" min="0" max="999" value="${+it.want || 0}"></label><button type="button" class="linkdanger vns-x" aria-label="Take off ${esc(it.what || "")}">✕</button></div>`;
        })
        .join("")}
      <div class="vns-add">${PRE.filter(([w]) => !items.some((x) => x.what === w))
        .map(
          ([w, k]) =>
            `<button type="button" class="pillbtn vns-pre" data-w="${esc(w)}" data-k="${k}">+ ${esc(w)}</button>`,
        )
        .join(
          "",
        )}<button type="button" class="pillbtn vns-pre" data-w="" data-k="1">+ Something else</button></div></div>`);
    wire();
  }
  function wire() {
    const box = document.querySelector(".vns");
    if (!box) return;
    const upd = async (fn) => {
      const L = recOf(cur).items.map((x) => Object.assign({}, x));
      fn(L);
      try {
        await save(cur, L);
      } catch (e) {
        toast("Couldn't save");
      }
      open(cur);
    };
    box.querySelectorAll(".vns-v").forEach((b) => (b.onclick = () => open(b.dataset.v)));
    $("vns-low").onclick = restock;
    box
      .querySelectorAll(".vns-pre")
      .forEach(
        (b) =>
          (b.onclick = () =>
            upd((L) =>
              L.push({ id: newId(), what: b.dataset.w, have: +b.dataset.k, want: +b.dataset.k }),
            )),
      );
    box.querySelectorAll(".vns-st").forEach((r) => {
      const id = r.dataset.id;
      const set = (fn) => upd((L) => L.forEach((x) => x.id === id && fn(x)));
      r.querySelector(".vns-w").onchange = (e) => set((x) => (x.what = e.target.value.trim()));
      r.querySelector(".vns-want").onchange = (e) =>
        set((x) => (x.want = Math.max(0, +e.target.value || 0)));
      r.querySelector(".vns-m").onclick = () =>
        set((x) => (x.have = Math.max(0, (+x.have || 0) - 1)));
      r.querySelector(".vns-p").onclick = () => set((x) => (x.have = (+x.have || 0) + 1));
      r.querySelector(".vns-x").onclick = (e) => {
        const b = e.currentTarget;
        if (b.dataset.armed !== "1") {
          b.dataset.armed = "1";
          b.textContent = "Sure?";
          return;
        }
        upd((L) =>
          L.splice(
            L.findIndex((x) => x.id === id),
            1,
          ),
        );
      };
    });
    const moveTool = async (e, out, act, msg) => {
      const up = {
        out,
        kitLog: (e.kitLog || [])
          .concat([Object.assign({ at: Date.now(), act }, out && out.van ? { van: out.van } : {})])
          .slice(-100),
      };
      try {
        await S.db.doc("equipment/" + e.id).update(up);
        Object.assign(e, up);
        toast(msg);
      } catch (er) {
        toast("Couldn't save");
      }
      open(cur);
    };
    if ($("vns-tool"))
      $("vns-tool").onchange = (ev) => {
        const e = (S.equipment || []).find((x) => x.id === ev.target.value);
        if (e)
          moveTool(
            e,
            { van: cur, who: "", site: "", at: Date.now(), note: "" },
            "out",
            e.name + " is on " + vanName(cur),
          );
      };
    box.querySelectorAll(".vns-off").forEach(
      (b) =>
        (b.onclick = () => {
          const e = (S.equipment || []).find((x) => x.id === b.dataset.id);
          if (e) moveTool(e, null, "in", e.name + " back in the yard");
        }),
    );
  }
  /* everything to buy, van by van – copy it, or mark it all restocked */
  function restock() {
    const L = lowList();
    const text = vans()
      .map((v) => {
        const mine = L.filter((x) => x.v.id === v.id);
        return mine.length
          ? v.name + ":\n" + mine.map((x) => `- ${x.it.what}: ${x.need}`).join("\n")
          : "";
      })
      .filter(Boolean)
      .join("\n\n");
    const d = document.createElement("div");
    d.className = "dimask";
    d.innerHTML = `<div class="dimbox vns-dlg" role="dialog" aria-label="Restock list"><b>🛒 Restock list</b>${
      L.length
        ? `<div class="who">What each van needs to be full again.</div><textarea id="vns-txt" readonly>${esc(text)}</textarea>
      <div class="actions"><button type="button" class="btn" id="vns-copy">📋 Copy</button><button type="button" class="btn primary" id="vns-done">✓ Restocked – fill them up</button></div>`
        : '<div class="who">Nothing to restock. 👍</div>'
    }<div class="actions"><button type="button" class="btn" id="vns-close">Close</button></div></div>`;
    document.body.appendChild(d);
    dlgEsc(d);
    $("vns-close").onclick = () => d.remove();
    if ($("vns-copy"))
      $("vns-copy").onclick = async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast("Copied – paste it into your order or a message");
        } catch (e) {
          $("vns-txt").select();
          toast("Select and copy it");
        }
      };
    if ($("vns-done"))
      $("vns-done").onclick = async () => {
        try {
          for (const v of vans()) {
            const items = recOf(v.id).items;
            if (!items.some((it) => (+it.have || 0) < (+it.want || 0))) continue;
            await save(
              v.id,
              items.map((it) =>
                Object.assign({}, it, { have: Math.max(+it.have || 0, +it.want || 0) }),
              ),
            );
          }
          toast("All the vans are full again");
        } catch (e) {
          toast("Couldn't save");
        }
        d.remove();
        if (document.querySelector(".vns")) open(cur);
      };
  }
  function todayCard() {
    if (!S.owner) return "";
    const n = lowList().length;
    if (!n) return "";
    return `<div class="card vns-today"><div class="cardbody"><button type="button" class="incrow" id="vns-today"><span><b>🛒 ${n} thing${n === 1 ? "" : "s"} to restock on the vans</b><br><span class="who">Tap for the restock list</span></span><span>›</span></button></div></div>`;
  }
  function wireToday() {
    if ($("vns-today")) $("vns-today").onclick = restock;
  }
  return { open, restock, lowList, todayCard, wireToday, vanName };
})();
