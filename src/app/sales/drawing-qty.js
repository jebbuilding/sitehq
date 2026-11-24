/* ================= DRAWING QUANTITIES: take the quantities off a saved drawing into a price – floors, walls, skirting, doors ================= */
import { esc, iso, shortDay, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { NP_U } from "../drawing/construction-details.js";
import { NP_PAVE } from "../drawing/paving-draw.js";
import { npPolyArea, npPolyPerim } from "../drawing/plan-geometry.js";
import { isSketch } from "../drawing/trade-drawings.js";
import { NP_OPENK, npIsWall } from "../drawing/walls.js";
import { blobUrl } from "../files/files.js";
import { siteLabel } from "../sites/job-details.js";
import { dlgEsc } from "../survey/glass-colours.js";
export { DQT };
/* James (Nov 2026, "quantities straight from your drawings"): in + Add a price (💷 Price this job), 📐 From a drawing
   lists the drawings; picking one reads its rooms (each closed room's floor area and the length round it), its walls
   and its doors and windows – at the drawing's scale – and offers each as a line: floor m², ceiling m², skirting m,
   wall area m² (the length round × the wall height, less the doors and windows), the total run of new walls, how many
   doors and windows, paved areas. Tick the ones wanted and they become lines (how many and the unit filled, the rate
   left to fill). A drawing with no scale set can't give real sizes, and says so. */
const DQT = (() => {
  async function load(p) {
    const r = await fetch(blobUrl(p.pageSrc));
    if (!r.ok) throw new Error("fetch");
    return r.json();
  }
  const r2 = (n) => Math.round(n * 100) / 100;
  /* everything measurable on a drawing, in metres: { rooms:[{name, area, perim}], wallRun, doors, windows, paving:[{name, area}] } */
  function measure(doc) {
    if (!doc || !doc.scale) return null;
    const mmPer = doc.scale / NP_U;
    const m = (u) => (u * mmPer) / 1000;
    const m2 = (a) => (a * mmPer * mmPer) / 1e6;
    const objs = doc.objs || [];
    const rooms = objs
      .filter((o) => o.t === "room" && !o.pave && o.p && o.p.length > 2)
      .map((o, i) => ({
        name: o.name || "Room " + (i + 1),
        area: r2(m2(npPolyArea(o.p))),
        perim: r2(m(npPolyPerim(o.p))),
      }));
    const paving = objs
      .filter((o) => o.t === "room" && o.pave && o.p && o.p.length > 2)
      .map((o, i) => ({
        name: o.name || (NP_PAVE[o.pave] || ["Paving"])[0] || "Paved area " + (i + 1),
        area: r2(m2(npPolyArea(o.p))),
      }));
    const walls = objs.filter((o) => npIsWall(o) && o.st !== "demo");
    const wallRun = r2(
      walls.reduce((a, o) => a + m(Math.hypot(o.b[0] - o.a[0], o.b[1] - o.a[1])), 0),
    );
    const opens = objs.filter(
      (o) => o.t === "shape" && o.a && o.b && (NP_OPENK.has(o.k) || o.k === "window"),
    );
    const doors = opens.filter((o) => o.k !== "window");
    const windows = opens.filter((o) => o.k === "window");
    const wid = (o) => m(Math.hypot(o.b[0] - o.a[0], o.b[1] - o.a[1]));
    return {
      rooms,
      paving,
      wallRun,
      doors: doors.length,
      windows: windows.length,
      doorW: doors.reduce((a, o) => a + wid(o), 0),
      winW: windows.reduce((a, o) => a + wid(o), 0),
    };
  }
  /* the lines it can offer: [{ d, q, u }] */
  function lines(M, H) {
    const out = [];
    const tot = (f) => r2(M.rooms.reduce((a, r) => a + f(r), 0));
    M.rooms.forEach((r) => {
      out.push({ d: r.name + " – floor", q: r.area, u: "m²" });
      out.push({ d: r.name + " – ceiling", q: r.area, u: "m²" });
      out.push({ d: r.name + " – skirting", q: r.perim, u: "m" });
      out.push({ d: r.name + " – walls (" + H + " m high)", q: r2(r.perim * H), u: "m²" });
    });
    if (M.rooms.length > 1) {
      out.push({ d: "All floors", q: tot((r) => r.area), u: "m²" });
      out.push({ d: "All skirting", q: tot((r) => r.perim), u: "m" });
      /* wall faces less the doors (2.0 high) and windows (1.2 high) */
      const net = tot((r) => r.perim * H) - (M.doorW * 2.0 * 2 + M.winW * 1.2);
      out.push({
        d: "All wall faces, less doors and windows (" + H + " m high)",
        q: r2(Math.max(0, net)),
        u: "m²",
      });
    }
    if (M.wallRun) out.push({ d: "Walls on the drawing – total length", q: M.wallRun, u: "m" });
    if (M.doors) out.push({ d: "Doors", q: M.doors, u: "no." });
    if (M.windows) out.push({ d: "Windows", q: M.windows, u: "no." });
    M.paving.forEach((p) => out.push({ d: p.name + " – area", q: p.area, u: "m²" }));
    return out.filter((l) => l.q > 0);
  }
  /* 📐 From a drawing: onAdd(lines) */
  function pick(onAdd) {
    const L = (S.mine.photos || [])
      .filter((p) => isSketch(p) && p.pageSrc)
      .sort((a, b) => (b.editedAt || b.created || 0) - (a.editedAt || a.created || 0));
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "140";
    if (!L.length) {
      toast("No saved drawings yet – draw the plan in ✏️ Drawings first");
      return;
    }
    d.innerHTML = `<div class="dimbox dqt-box" role="dialog" aria-label="Quantities from a drawing"><b>📐 Quantities from a drawing</b><div class="who">Pick the drawing. Its rooms, walls, doors and windows are measured at its scale.</div>
      <div class="dqt-list">${L.map((p) => `<button type="button" class="incrow dqt-dw" data-id="${esc(p.id)}"><span class="attic" aria-hidden="true">✏️</span><span><b>${esc(p.title || "Drawing")}</b><br><span class="who">${esc([p.site ? siteLabel(p.site) : "", p.editedAt || p.created ? shortDay(iso(new Date(p.editedAt || p.created))) : ""].filter(Boolean).join(" · "))}</span></span></button>`).join("")}</div>
      <div class="dimbtns"><button type="button" class="btn dqt-x">Cancel</button></div></div>`;
    document.body.appendChild(d);
    dlgEsc(d);
    d.querySelector(".dqt-x").onclick = () => d.remove();
    d.querySelectorAll(".dqt-dw").forEach(
      (b) =>
        (b.onclick = async () => {
          const p = L.find((x) => x.id === b.dataset.id);
          b.disabled = true;
          let doc = null;
          try {
            doc = await load(p);
          } catch (e) {
            b.disabled = false;
            return toast("Couldn't open that drawing – check your connection");
          }
          const M = measure(doc);
          if (!M) {
            b.disabled = false;
            return toast(
              "That drawing has no scale set (📐 Paper in the drawing), so it can't give real sizes",
            );
          }
          choose(d, p, M, onAdd);
        }),
    );
  }
  function choose(d, p, M, onAdd) {
    let H = 2.4;
    const draw = () => {
      const ls = lines(M, H);
      d.innerHTML = `<div class="dimbox dqt-box" role="dialog" aria-label="Quantities"><b>📐 ${esc(p.title || "Drawing")}</b>
        ${M.rooms.length ? "" : '<div class="notice warn">No rooms marked on it – in the drawing, use Find rooms (the walls need to meet all the way round) to get floor and wall areas.</div>'}
        <label class="dqt-h">Wall height (m)<input type="number" inputmode="decimal" step="0.05" min="1" max="10" id="dqt-h" value="${H}"></label>
        <div class="who">Tick what to add. The rate is left for you to fill in.</div>
        <div class="dqt-list">${ls.map((l, i) => `<label class="inl dqt-l"><input type="checkbox" data-i="${i}"> <span>${esc(l.d)}</span><b>${l.q} ${esc(l.u)}</b></label>`).join("") || '<div class="who">Nothing to measure on this drawing.</div>'}</div>
        <div class="dimbtns"><button type="button" class="btn dqt-x">Cancel</button><button type="button" class="btn primary dqt-add">Add the ticked ones</button></div></div>`;
      d.querySelector(".dqt-x").onclick = () => d.remove();
      d.querySelector("#dqt-h").onchange = (e) => {
        const v = +e.target.value;
        if (v > 0) {
          const on = [...d.querySelectorAll(".dqt-l input:checked")].map((x) => +x.dataset.i);
          H = v;
          /* after the box has finished losing focus, or the redraw trips over it */
          setTimeout(() => {
            draw();
            on.forEach((i) => {
              const x = d.querySelector(`.dqt-l input[data-i="${i}"]`);
              if (x) x.checked = true;
            });
          }, 0);
        }
      };
      d.querySelector(".dqt-add").onclick = () => {
        const picked = [...d.querySelectorAll(".dqt-l input:checked")].map((x) => ls[+x.dataset.i]);
        if (!picked.length) return toast("Tick at least one");
        d.remove();
        onAdd(picked.map((l) => ({ d: l.d, q: l.q, u: l.u, r: "" })));
        toast(
          picked.length +
            " line" +
            (picked.length === 1 ? "" : "s") +
            " added from the drawing – put the rates in",
        );
      };
    };
    draw();
  }
  return { pick, measure, lines };
})();
