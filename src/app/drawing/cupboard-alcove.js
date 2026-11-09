/* ================= CUPBOARD ALCOVE: alcove units, base cupboards and shelves – drawing, cutting list and 3D ================= */
import { cb3Model, shadeHex } from "./cupboard-3d.js";
import { cbPlan } from "./cupboard-maker.js";
export { CBA_KINDS, cba3Model, cbaDraw, cbaHasBase, cbaPlan };
/* Besides the full-height wardrobe: an alcove unit (a cupboard at the bottom with a top on it, shelves above), a base
   cupboard only, or shelves only. The base is a small cupboard (bays, doors, shelves or drawers inside, plinth, back)
   with a top (thickness and front overhang); the shelves are floating (on battens fixed to the three walls) or in a
   frame (two sides and a top); spaced evenly or at the heights given. Alcove widths are wall to wall: the base and
   frame are made narrower by the scribe allowance each side and scribed to fit; tops and floating shelves are cut
   to the full width and scribed. Sizes in mm. */
const CBA_KINDS = [
  ["full", "Wardrobe / full-height cupboard"],
  ["alcove", "Alcove unit – cupboard at the bottom, shelves above"],
  ["base", "Base cupboard only (e.g. under a window)"],
  ["shelves", "Shelves only"],
];
const cbaHasBase = (sp) => sp.kind === "alcove" || sp.kind === "base";
const cbaHasShelves = (sp) => sp.kind === "alcove" || sp.kind === "shelves";
/* the base cupboard as a small cupboard of its own (so the wardrobe maths does it) */
function cbaBaseSpec(sp) {
  const sc = +sp.scribe || 0;
  return Object.assign({}, sp, {
    kind: "full",
    W: sp.W - 2 * sc,
    H: Math.max(200, (+sp.baseH || 800) - (+sp.topT || 0)),
    D: +sp.D || 400,
  });
}
/* where the shelves go (heights of their undersides from the floor) */
function cbaShelfYs(sp) {
  if (!cbaHasShelves(sp)) return [];
  const n = Math.max(0, Math.min(12, +sp.shelfN || 0));
  if (!n) return [];
  const y0 = cbaHasBase(sp) ? +sp.baseH || 800 : +sp.shelfFrom || 300;
  const th = +sp.shelfT || 25;
  const gaps = String(sp.shelfGaps || "")
    .split(/[ ,]+/)
    .map(Number)
    .filter((x) => x > 0);
  const ys = [];
  if (gaps.length) {
    let y = y0;
    for (let i = 0; i < n; i++) {
      y += gaps[Math.min(i, gaps.length - 1)];
      ys.push(y);
      y += th;
    }
  } else {
    const span = (+sp.H || 2400) - y0 - th;
    for (let i = 1; i <= n; i++) ys.push(Math.round(y0 + (span * i) / n));
  }
  return ys.filter((y) => y + th <= (+sp.H || 2400) + 1);
}
/* every board to cut */
function cbaPlan(sp) {
  const cut = [];
  const add = (part, qty, l, w, th, note) => {
    const ex = cut.find(
      (c) => c.part === part && c.l === Math.round(l) && c.w === Math.round(w) && c.th === th,
    );
    if (ex) ex.qty += qty;
    else cut.push({ part, qty, l: Math.round(l), w: Math.round(w), th, note: note || "" });
  };
  let ws = [Math.max(100, sp.W - 2 * (+sp.scribe || 0))];
  if (cbaHasBase(sp)) {
    const b = cbaBaseSpec(sp);
    const P = cbPlan(b);
    ws = P.ws;
    P.cut
      .filter((c) => c.part !== "Top")
      .forEach((c) => add("Base – " + c.part.toLowerCase(), c.qty, c.l, c.w, c.th, c.note));
    if (+sp.topT)
      add(
        "Top",
        1,
        sp.W,
        b.D + (+sp.topOver || 0),
        +sp.topT,
        (+sp.scribe ? "scribed to the walls; " : "") + "front overhang " + (+sp.topOver || 0),
      );
  }
  const ys = cbaShelfYs(sp);
  if (ys.length) {
    const th = +sp.shelfT || 25,
      sd = +sp.shelfD || 250;
    if (sp.shelfStyle === "framed") {
      const iw = sp.W - 2 * (+sp.scribe || 0);
      const y0 = cbaHasBase(sp) ? +sp.baseH || 800 : 0;
      add("Shelf unit side", 2, sp.H - y0, sd, sp.t, "scribe to the walls");
      add("Shelf unit top", 1, iw - 2 * sp.t, sd, sp.t);
      add("Shelf", ys.length, iw - 2 * sp.t, sd - 10, th, "on shelf pins or housed");
    } else {
      add("Shelf", ys.length, sp.W, sd, th, "floating, scribed to the walls");
      add("Batten (back wall)", ys.length, sp.W - 20, 0, 0, "25 × 38 mm, plugged and screwed");
      add("Batten (side walls)", ys.length * 2, sd - 30, 0, 0, "25 × 38 mm");
    }
  }
  return { cut, ws, n: ws.length, ys, bays: cbaHasBase(sp) ? cbPlan(cbaBaseSpec(sp)).bays : [] };
}
/* the drawing: front, side section and plan, dimensioned, with the cutting list */
function cbaDraw(sp, api) {
  const { U, mkDim, dimSize, pwFor, doc } = api;
  const P = cbaPlan(sp);
  const col = "#111111",
    lw = pwFor(5),
    thin = pwFor(2);
  const objs = [];
  const rect = (x, y, w, h, o) =>
    objs.push(Object.assign({ t: "rect", a: [x, y], b: [x + w, y + h], c: col, w: lw }, o || {}));
  const line = (x1, y1, x2, y2, o) =>
    objs.push(Object.assign({ t: "line", a: [x1, y1], b: [x2, y2], c: col, w: thin }, o || {}));
  const text = (x, y, s, k) =>
    objs.push({ t: "text", x, y, s, c: "#333333", size: Math.round(18 * (k || 0.9)), ly: "notes" });
  const Z = 18;
  const gapX = Math.max(U(500), Z * 6 + dimSize() * 3),
    top = Math.max(U(300), Z * 4 + dimSize() * 2.6);
  const W = U(sp.W),
    H = U(sp.H),
    sc = U(+sp.scribe || 0),
    T = U(sp.t);
  const hasB = cbaHasBase(sp),
    bD = U(+sp.D || 400),
    bH = hasB ? U(+sp.baseH || 800) : 0,
    tT = hasB ? U(+sp.topT || 0) : 0,
    tO = hasB ? U(+sp.topOver || 0) : 0,
    sD = U(+sp.shelfD || 250),
    sT = U(+sp.shelfT || 25),
    PL = U(sp.plinth || 0);
  const depth = Math.max(hasB ? bD + tO : 0, cbaHasShelves(sp) ? sD : 0);
  const x1 = Math.max(Z * 9 + U(200), (doc.w - (W + depth + gapX + U(800))) / 2);
  const wallW = U(200),
    rise = U(150); /* the walls run a little above the top shelf */
  const y1 = top + rise + Z,
    fl = y1 + H; /* the floor line */
  const hatch = (wx, wy, ww, wh) => {
    rect(wx, wy, ww, wh, { w: thin });
    const n = Math.max(4, Math.round(wh / (ww * 1.2)));
    for (let k = 0; k < n; k++)
      line(wx, wy + (k * wh) / n, wx + ww, wy + ((k + 1) * wh) / n, { w: pwFor(1) });
  };
  /* --- front --- */
  text(x1, y1 - rise - Z * 0.6, "FRONT", 1.1);
  hatch(x1 - wallW, y1 - rise, wallW, H + rise);
  hatch(x1 + W, y1 - rise, wallW, H + rise);
  line(x1 - wallW, fl, x1 + W + wallW, fl, { w: lw });
  if (hasB) {
    const bx = x1 + sc,
      bw = W - 2 * sc,
      by = fl - bH + tT;
    rect(bx, by, bw, bH - tT);
    if (PL) line(bx, fl - PL, bx + bw, fl - PL, { w: thin });
    rect(x1, fl - bH, W, tT, { fill: "#d9c7a6" });
    /* doors, with the hinge side shown */
    const dTop = by + U(1.5),
      dBot = fl - PL - U(1.5);
    let xx = bx;
    P.ws.forEach((w, i) => {
      const dw = U(w) + (i === 0 ? T : T / 2) + (i === P.ws.length - 1 ? T : T / 2);
      const leaves = sp.doors === "pairs" ? 2 : sp.doors === "hinged" ? 1 : 0;
      for (let k = 0; k < leaves; k++) {
        const lw2 = dw / leaves,
          lx = xx + k * lw2;
        rect(lx + U(1.5), dTop, lw2 - U(3), dBot - dTop, { w: thin });
        const hl = leaves === 2 ? k === 0 : i % 2 === 0;
        const hx = hl ? lx + U(1.5) : lx + lw2 - U(1.5),
          ox = hl ? lx + lw2 - U(1.5) : lx + U(1.5);
        line(ox, dTop, hx, (dTop + dBot) / 2, { dash: 1 });
        line(ox, dBot, hx, (dTop + dBot) / 2, { dash: 1 });
      }
      xx += dw;
    });
    objs.push(mkDim([x1 + W + wallW, fl - bH], [x1 + W + wallW, fl], -dimSize() * 2.2));
  }
  const ys = P.ys.map((y) => U(y));
  ys.forEach((yy) => {
    if (sp.shelfStyle === "framed")
      rect(x1 + sc + T, fl - yy - sT, W - 2 * sc - 2 * T, sT, { w: thin, fill: "#e6e6e6" });
    else rect(x1, fl - yy - sT, W, sT, { w: thin, fill: "#e6e6e6" });
  });
  if (sp.shelfStyle === "framed" && ys.length) {
    const fy = hasB ? fl - bH : fl;
    rect(x1 + sc, y1, T, fy - y1, { w: thin });
    rect(x1 + W - sc - T, y1, T, fy - y1, { w: thin });
    rect(x1 + sc, y1, W - 2 * sc, T, { w: thin });
  }
  /* each shelf's height from the floor (to its top), written beside it, clear of the wall */
  P.ys.forEach((y, i) =>
    text(
      x1 - wallW - Z * 7.5,
      fl - ys[i] - sT + Z * 0.3,
      "Shelf " + (i + 1) + ": " + (y + (+sp.shelfT || 25)),
      0.8,
    ),
  );
  if (hasB) text(x1 - wallW - Z * 7.5, fl - bH + Z * 0.3, "Top: " + sp.baseH, 0.8);
  objs.push(mkDim([x1, fl], [x1 + W, fl], dimSize() * 2.2));
  if (!hasB && !ys.length)
    objs.push(mkDim([x1 + W + wallW, y1], [x1 + W + wallW, fl], -dimSize() * 2.2));
  /* --- side section: the back wall on the left, the room on the right --- */
  const x3 = x1 + W + gapX + wallW * 2;
  text(x3 - wallW, y1 - rise - Z * 0.6, "SIDE SECTION", 1.1);
  hatch(x3 - wallW, y1 - rise, wallW, H + rise);
  line(x3 - wallW, fl, x3 + depth + U(300), fl, { w: lw });
  if (hasB) {
    const cb = fl - bH + tT; /* top of the carcass */
    rect(x3, cb, bD - T, fl - PL - cb); /* the carcass */
    rect(x3 + bD - T, cb + U(1.5), T, fl - PL - cb - U(3), { w: thin }); /* a door, shut */
    if (PL) rect(x3, fl - PL, bD - U(60), PL, { w: thin }); /* the plinth, set back */
    rect(x3, fl - bH, bD + tO, tT, { fill: "#d9c7a6" }); /* the top, with its overhang */
    objs.push(mkDim([x3, fl], [x3 + bD, fl], dimSize() * 2.2));
  }
  ys.forEach((yy) => {
    rect(x3, fl - yy - sT, sD, sT, { w: thin, fill: "#e6e6e6" });
    if (sp.shelfStyle !== "framed")
      rect(x3, fl - yy, U(25), U(38), { w: thin }); /* the batten under it */
  });
  if (ys.length)
    text(x3 + sD + Z * 0.6, fl - ys[0] - sT + Z * 0.3, "Shelves " + sp.shelfD + " deep", 0.8);
  objs.push(mkDim([x3 + depth + U(250), y1], [x3 + depth + U(250), fl], -dimSize() * 2.2));
  /* --- plan --- */
  const y4 = fl + Z * 4 + dimSize() * 3;
  text(x1 - Z * 4.5, y4 + Z, "PLAN", 1.1);
  line(x1 - U(200), y4, x1 + W + U(200), y4, { w: lw });
  line(x1, y4, x1, y4 + depth + U(100), { w: lw });
  line(x1 + W, y4, x1 + W, y4 + depth + U(100), { w: lw });
  if (hasB) rect(x1, y4, W, bD + tO, { w: thin });
  if (ys.length) rect(x1, y4, W, sD, { w: thin, dash: 1 });
  objs.push(mkDim([x1 + W, y4], [x1 + W, y4 + (hasB ? bD + tO : sD)], -dimSize() * 2.4));
  /* --- title and cutting list --- */
  const yt = y4 + depth + U(100) + Z * 3;
  const kind = (CBA_KINDS.find((k) => k[0] === sp.kind) || ["", ""])[1].replace(/ –.*/, "");
  text(
    x1,
    yt,
    `${sp.name || "Cupboard"} – ${kind}: ${sp.W} wide (wall to wall) × ${sp.H} high.${hasB ? ` Base ${sp.baseH} high × ${sp.D} deep, top ${sp.topT} mm, overhang ${sp.topOver || 0}.` : ""}${ys.length ? ` ${ys.length} shelves ${sp.shelfD} deep × ${sp.shelfT} mm, ${sp.shelfStyle === "framed" ? "in a frame" : "floating on battens"}.` : ""}${+sp.scribe ? ` Scribe ${sp.scribe} mm each side.` : ""}`,
    1,
  );
  let yy = yt + Z * 2;
  text(x1, yy, "CUTTING LIST (length × width × thickness, mm)", 1);
  const half = P.cut.length > 9 ? Math.ceil(P.cut.length / 2) : P.cut.length;
  const y0c = yy;
  P.cut.forEach((c, i) => {
    yy = y0c + ((i % half) + 1) * Z * 1.25;
    text(
      x1 + (i >= half ? Z * 34 : 0),
      yy,
      `${c.qty} × ${c.part}${c.th ? `: ${c.l} × ${c.w} × ${c.th}${c.mat ? " – " + c.mat : ""}` : c.l ? `: ${c.l} long` : ""}${c.note ? "  (" + c.note + ")" : ""}`,
      0.85,
    );
  });
  objs.forEach((o) => Object.keys(o).forEach((k) => o[k] === undefined && delete o[k]));
  return { objs, cut: P.cut };
}
/* the 3D model: the alcove walls, the base (as a small cupboard), its top and the shelves */
function cba3Model(sp, look, open) {
  const out = [];
  const sc = +sp.scribe || 0;
  const wallC = shadeHex(look.wall || "#ece9e4", 0.92);
  const depth = Math.max(
    cbaHasBase(sp) ? (+sp.D || 400) + (+sp.topOver || 0) : 0,
    +sp.shelfD || 250,
  );
  /* the chimney breast and the side wall: full height, as deep as the alcove */
  out.push({ b: [-300, 0, -10, 0, sp.H + 500, depth + 60], c: wallC });
  out.push({ b: [sp.W, 0, -10, sp.W + 300, sp.H + 500, depth + 60], c: wallC });
  if (cbaHasBase(sp)) {
    const b = cbaBaseSpec(sp);
    cb3Model(b, look, open).forEach((o) => {
      const bb = o.b.slice();
      bb[0] += sc;
      bb[3] += sc;
      const rot = o.rot ? Object.assign({}, o.rot, { px: o.rot.px + sc }) : o.rot;
      out.push(Object.assign({}, o, { b: bb, rot }));
    });
    if (+sp.topT)
      out.push({
        b: [0, b.H, 0, sp.W, b.H + +sp.topT, b.D + (+sp.topOver || 0)],
        c: look.top || look.carcass,
      });
  }
  const th = +sp.shelfT || 25,
    sd = +sp.shelfD || 250;
  const ys = cbaShelfYs(sp);
  if (sp.shelfStyle === "framed" && ys.length) {
    const y0 = cbaHasBase(sp) ? +sp.baseH || 800 : 0;
    out.push({ b: [sc, y0, 0, sc + sp.t, sp.H, sd], c: look.carcass });
    out.push({ b: [sp.W - sc - sp.t, y0, 0, sp.W - sc, sp.H, sd], c: look.carcass });
    out.push({ b: [sc, sp.H - sp.t, 0, sp.W - sc, sp.H, sd], c: look.carcass });
    ys.forEach((y) =>
      out.push({
        b: [sc + sp.t, y, 0, sp.W - sc - sp.t, y + th, sd - 10],
        c: look.top || look.carcass,
      }),
    );
  } else
    ys.forEach((y) => out.push({ b: [0, y, 0, sp.W, y + th, sd], c: look.top || look.carcass }));
  return out;
}
