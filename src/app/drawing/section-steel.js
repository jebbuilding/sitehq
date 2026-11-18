/* ================= SECTION STEEL: steel beam details drawn to real size – a cut through the beam in the wall or floor, and the beam end on its padstone ================= */
import { NP_U } from "./construction-details.js";
import { npsuPat } from "./section-buildups.js";
export { NPSS_FIRE, NPSS_SETS, npssDraw, npssExt, npssName };
/* Two pieces for sections (box shapes): k "secsteel" – a cut across the beam where it carries a wall or a floor, and
   k "secbear" – the beam end bearing on its padstone, seen from the side. Both draw at real size from the beam's type
   and size (bt / bz, as the beam schedule uses) and fit their box; Properties sets the size, the setting, fire
   protection and the padstone. Generic UK details only: the engineer's calcs and details always win. */
/* real dimensions of the universal beams on the list: depth, width, web, flange, root radius (mm) */
const NPSS_UB = {
  "127×76×13": [127, 76, 4, 7.6, 7.6],
  "152×89×16": [152.4, 88.7, 4.5, 7.7, 7.6],
  "178×102×19": [177.8, 101.2, 4.8, 7.9, 7.6],
  "203×102×23": [203.2, 101.8, 5.4, 9.3, 7.6],
  "203×133×25": [203.2, 133.2, 5.7, 7.8, 7.6],
  "203×133×30": [206.8, 133.9, 6.4, 9.6, 7.6],
  "254×102×22": [254, 101.6, 5.7, 6.8, 7.6],
  "254×102×25": [257.2, 101.9, 6, 8.4, 7.6],
  "254×102×28": [260.4, 102.2, 6.3, 10, 7.6],
  "254×146×31": [251.4, 146.1, 6, 8.6, 7.6],
  "254×146×37": [256, 146.4, 6.3, 10.9, 7.6],
  "254×146×43": [259.6, 147.3, 7.2, 12.7, 7.6],
  "305×102×25": [305.1, 101.6, 5.8, 7, 7.6],
  "305×102×28": [308.7, 101.8, 6, 8.8, 7.6],
  "305×102×33": [312.7, 102.4, 6.6, 10.8, 7.6],
  "305×127×37": [304.4, 123.4, 7.1, 10.7, 8.9],
  "305×127×42": [307.2, 124.3, 8, 12.1, 8.9],
  "305×165×40": [303.4, 165, 6, 10.2, 8.9],
  "305×165×46": [306.6, 165.7, 6.7, 11.8, 8.9],
  "356×127×33": [349, 125.4, 6, 8.5, 10.2],
  "356×171×45": [351.4, 171.1, 7, 9.7, 10.2],
  "356×171×51": [355, 171.5, 7.4, 11.5, 10.2],
  "406×140×39": [398, 141.8, 6.4, 8.6, 10.2],
  "406×178×54": [402.6, 177.7, 7.7, 10.9, 10.2],
};
/* the shape of a section: { kind: "I" | "C" | "CC", d, b, tw, tf, r, slope } */
function npssSec(bt, bz) {
  const t = bt || "UB",
    z = String(bz || "203×133×25");
  const n = z.replace(/^\s*2\s*×\s*/, "").match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)/);
  const d = n ? +n[1] : 203,
    b = n ? +n[2] : 133;
  if (t === "UB" && NPSS_UB[z]) {
    const [d2, b2, tw, tf, r] = NPSS_UB[z];
    return { kind: "I", d: d2, b: b2, tw, tf, r };
  }
  if (t === "PFC")
    return {
      kind: "C",
      d,
      b,
      tw: Math.round(d * 0.03 + 2.5),
      tf: Math.round(d * 0.045 + 3.5),
      r: 12,
    };
  if (t === "2PFC")
    return {
      kind: "CC",
      d,
      b,
      tw: Math.round(d * 0.03 + 2.5),
      tf: Math.round(d * 0.045 + 3.5),
      r: 12,
    };
  if (t === "UC")
    return {
      kind: "I",
      d,
      b,
      tw: Math.round(d * 0.04 + 0.5),
      tf: Math.round(d * 0.06 + 0.5),
      r: 10.2,
    };
  if (t === "RSJ")
    return {
      kind: "I",
      d,
      b,
      tw: Math.round(d * 0.035 + 1.5),
      tf: Math.round(d * 0.055 + 1.5),
      r: 9,
      slope: 1,
    };
  return { kind: "I", d, b, tw: Math.max(5, d * 0.028), tf: Math.max(7, d * 0.04), r: 7.6 };
}
/* the words for the section, as the beam schedule writes it */
const npssName = (o) => {
  const bt = o.bt || "UB",
    bz = o.bz || "203×133×25";
  return (
    o.sec ||
    (bt === "PFC"
      ? bz + " PFC"
      : bt === "2PFC"
        ? bz + " PFC box"
        : bt === "RSJ"
          ? bz + " RSJ"
          : bz + " " + bt)
  );
};
/* the settings for a cut through the beam */
const NPSS_SETS = [
  ["plate", "Under a cavity wall: plate welded on to carry the outer leaf"],
  ["two", "Under a cavity wall: two beams, one under each leaf, bolted together"],
  ["floor", "In a floor: joists on hangers off timber packers"],
  ["bare", "Beam on its own"],
];
const NPSS_FIRE = [
  ["board", "15 mm fire-rated board, taped and skimmed (30 min)"],
  ["paint", "Intumescent paint to the fire rating"],
  ["none", "None shown"],
];
/* the padstone's length and height from its words */
function npssPad(pad, br) {
  const p = pad || "Concrete 440×215×100";
  if (p === "None" || p === "To engineer's design") return null;
  if (/Engineering brick/.test(p))
    return { L: 440, H: 225, kind: "brick", words: "3 courses of engineering brick in 1:3 mortar" };
  if (/Steel bearing plate/.test(p))
    return {
      L: Math.max(+br || 150, 100) + 50,
      H: 15,
      kind: "steel",
      words: "15 mm steel bearing plate, bedded",
    };
  const m = p.match(/(\d+)×(\d+)×(\d+)/);
  return m
    ? {
        L: +m[1],
        H: +m[3],
        kind: "conc",
        words: `${m[1]} × ${m[2]} × ${m[3]} precast concrete padstone, bedded in mortar`,
      }
    : { L: 440, H: 100, kind: "conc", words: "precast concrete padstone, bedded in mortar" };
}
/* everything in a cut through the beam, in mm about the beam's top centre (x right towards outside, y down) */
function npssSectionParts(o) {
  const S = npssSec(o.bt, o.bz);
  const sv = o.sv || "plate",
    fp = o.fp || "board",
    cav = o.cav == null ? 100 : +o.cav,
    jd = o.jd == null ? 200 : +o.jd;
  const P = { S, sv, fp, beams: [], rects: [], notes: [], lines: [] };
  const wall = sv === "plate" || sv === "two";
  let xBlk0 = -50;
  P.beams.push({ x: 0, flip: 1 });
  if (wall) {
    /* inner leaf 100 block over the first beam, cavity, 102.5 brick outer leaf */
    const xCav = xBlk0 + 100,
      xBr0 = xCav + cav,
      xBr1 = xBr0 + 102.5;
    let brBot = S.d;
    if (sv === "two") {
      P.beams.push({ x: xBr0 + 51.25, flip: -1 });
      brBot = 0;
    }
    const pt = 10;
    if (sv === "plate") P.plate = { x0: -S.b / 2, x1: xBr1 - 10, y0: S.d, y1: S.d + pt };
    Object.assign(P, { xBlk0, xCav, xBr0, xBr1, brBot, Hw: 450, cav });
    P.under = sv === "plate" ? S.d + pt : S.d;
  } else if (sv === "floor") {
    P.under = Math.max(S.d, jd + 12.5);
    P.jd = jd;
  } else P.under = S.d;
  return P;
}
/* the extent of a piece in mm: [x0, y0, x1, y1] */
function npssExt(o) {
  if (o.k === "secbear") {
    const S = npssSec(o.bt, o.bz),
      pd = npssPad(o.pad, o.br),
      br = o.br == null ? 150 : +o.br;
    const Wp = Math.max(pd ? pd.L : 0, br) + 240;
    return [-Wp - 20, -320, 620, S.d + 10 + (pd ? pd.H : 0) + 260];
  }
  const P = npssSectionParts(o),
    S = P.S;
  if (P.sv === "floor") return [-720, -60, 720, P.under + 70];
  if (P.xBr1 != null)
    return [Math.min(-S.b / 2 - 80, P.xBlk0 - 60), -P.Hw - 20, P.xBr1 + 40, P.under + 70];
  return [-S.b / 2 - 80, -60, S.b / 2 + 80, P.under + 70];
}
/* a steel section outline about (cx, top y0), real mm scaled by k: an I with root radii, or a channel */
function npssProfile(ctx, S, cx, y0, k, dir) {
  const d = S.d * k,
    b = S.b * k,
    tw = S.tw * k,
    tf = S.tf * k,
    r = Math.min(S.r * k, (b - tw) / 4);
  const sl = S.slope ? tf * 0.35 : 0;
  ctx.beginPath();
  if (S.kind === "I") {
    const L = cx - b / 2,
      R = cx + b / 2,
      wl = cx - tw / 2,
      wr = cx + tw / 2;
    ctx.moveTo(L, y0);
    ctx.lineTo(R, y0);
    ctx.lineTo(R, y0 + tf - sl);
    ctx.lineTo(wr + r, y0 + tf + sl);
    ctx.arcTo(wr, y0 + tf + sl, wr, y0 + tf + sl + r, r);
    ctx.lineTo(wr, y0 + d - tf - sl - r);
    ctx.arcTo(wr, y0 + d - tf - sl, wr + r, y0 + d - tf - sl, r);
    ctx.lineTo(R, y0 + d - tf + sl);
    ctx.lineTo(R, y0 + d);
    ctx.lineTo(L, y0 + d);
    ctx.lineTo(L, y0 + d - tf + sl);
    ctx.lineTo(wl - r, y0 + d - tf - sl);
    ctx.arcTo(wl, y0 + d - tf - sl, wl, y0 + d - tf - sl - r, r);
    ctx.lineTo(wl, y0 + tf + sl + r);
    ctx.arcTo(wl, y0 + tf + sl, wl - r, y0 + tf + sl, r);
    ctx.lineTo(L, y0 + tf - sl);
  } else {
    /* a channel: the web at cx - dir * b/2, toes towards dir */
    const W = cx - (dir * b) / 2,
      T = cx + (dir * b) / 2,
      Wi = W + dir * tw;
    ctx.moveTo(W, y0);
    ctx.lineTo(T, y0);
    ctx.lineTo(T, y0 + tf);
    ctx.lineTo(Wi + dir * r, y0 + tf);
    ctx.arcTo(Wi, y0 + tf, Wi, y0 + tf + r, r);
    ctx.lineTo(Wi, y0 + d - tf - r);
    ctx.arcTo(Wi, y0 + d - tf, Wi + dir * r, y0 + d - tf, r);
    ctx.lineTo(T, y0 + d - tf);
    ctx.lineTo(T, y0 + d);
    ctx.lineTo(W, y0 + d);
  }
  ctx.closePath();
}
/* masonry seen from the side: courses every 75 mm, joints staggered (brick 215, block 440) */
function npssCourses(ctx, x0, y0, x1, y1, k, unit, pw, fill) {
  if (x1 <= x0 || y1 <= y0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
  ctx.fillStyle = fill;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.lineWidth = pw(0.1);
  ctx.strokeStyle = "rgba(40,40,40,0.6)";
  const ch = (unit === "block" ? 225 : 75) * k,
    cw = (unit === "block" ? 450 : 225) * k;
  ctx.beginPath();
  let row = 0;
  for (let y = y1; y > y0 - ch; y -= ch, row++) {
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    for (let x = x0 + (row % 2 ? cw / 2 : 0); x < x1; x += cw) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - ch);
    }
  }
  ctx.stroke();
  ctx.restore();
}
/* draws a piece into its box: fitted, so at real size when the box is (see npssExt) */
function npssDraw(ctx, o, x0, y0, w, h, lw) {
  const E = npssExt(o);
  const k = Math.min(w / (E[2] - E[0]), h / (E[3] - E[1]));
  if (!(k > 0)) return true;
  const ox = x0 + (w - (E[2] - E[0]) * k) / 2 - E[0] * k,
    oy = y0 + (h - (E[3] - E[1]) * k) / 2 - E[1] * k;
  const X = (mm) => ox + mm * k,
    Y = (mm) => oy + mm * k;
  /* line weights: paper mm when the page has a scale, else from the pen */
  const pw = (mmP) => (ctx.__mm ? NP_U * mmP : Math.max(lw * (mmP / 0.3), 0.3));
  const ink = ctx.strokeStyle;
  const fs = ctx.__mm ? 2.5 * NP_U : Math.max(8, Math.min(lw * 5.5, 22));
  const notes = [];
  ctx.save();
  ctx.lineJoin = "round";
  const rect = (a, b, c, d, fill, wt) => {
    const xa = Math.min(X(a), X(c)),
      ya = Math.min(Y(b), Y(d)),
      ww = Math.abs(X(c) - X(a)),
      hh = Math.abs(Y(d) - Y(b));
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(xa, ya, ww, hh);
    }
    ctx.lineWidth = pw(wt || 0.25);
    ctx.strokeStyle = ink;
    ctx.strokeRect(xa, ya, ww, hh);
  };
  const pat = (p, a, b, c, d) => {
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    npsuPat(
      ctx,
      p,
      Math.min(X(a), X(c)),
      Math.min(Y(b), Y(d)),
      Math.max(X(a), X(c)),
      Math.max(Y(b), Y(d)),
      lw,
      k,
    );
    ctx.restore();
  };
  const timber = (a, b, c, d) => {
    rect(a, b, c, d, "#dcc4b4", 0.18);
    ctx.lineWidth = pw(0.09);
    ctx.beginPath();
    ctx.moveTo(X(a), Y(b));
    ctx.lineTo(X(c), Y(d));
    ctx.moveTo(X(c), Y(b));
    ctx.lineTo(X(a), Y(d));
    ctx.stroke();
  };
  const brk = (x, ya, yb) => {
    /* a break line across a loose end */
    const z = pw(1.2),
      m = (Y(ya) + Y(yb)) / 2;
    ctx.lineWidth = pw(0.13);
    ctx.beginPath();
    ctx.moveTo(X(x), Y(ya) - pw(1.5));
    ctx.lineTo(X(x), m - z);
    ctx.lineTo(X(x) + z, m - z * 0.3);
    ctx.lineTo(X(x) - z, m + z * 0.3);
    ctx.lineTo(X(x), m + z);
    ctx.lineTo(X(x), Y(yb) + pw(1.5));
    ctx.stroke();
  };
  const brkH = (y, xa, xb) => {
    const z = pw(1.2),
      m = (X(xa) + X(xb)) / 2;
    ctx.lineWidth = pw(0.13);
    ctx.beginPath();
    ctx.moveTo(X(xa) - pw(1.5), Y(y));
    ctx.lineTo(m - z, Y(y));
    ctx.lineTo(m - z * 0.3, Y(y) - z);
    ctx.lineTo(m + z * 0.3, Y(y) + z);
    ctx.lineTo(m + z, Y(y));
    ctx.lineTo(X(xb) + pw(1.5), Y(y));
    ctx.stroke();
  };
  const steelFill = (S, cx, top, dir) => {
    npssProfile(ctx, S, X(cx), Y(top), k, dir || 1);
    ctx.fillStyle = "#59606b";
    ctx.fill();
    ctx.lineWidth = pw(0.25);
    ctx.strokeStyle = ink;
    ctx.stroke();
    if (o.fp === "paint") {
      ctx.save();
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = pw(0.5);
      ctx.setLineDash([pw(1.2), pw(0.6)]);
      ctx.stroke();
      ctx.restore();
    }
  };
  if (o.k === "secbear") {
    /* ===== the beam end on its padstone, seen from the side ===== */
    const S = npssSec(o.bt, o.bz),
      pd = npssPad(o.pad, o.br),
      br = o.br == null ? 150 : +o.br;
    const Wp = Math.max(pd ? pd.L : 0, br) + 240;
    const pack = 10,
      yPad = S.d + pack,
      yPadB = yPad + (pd ? pd.H : 0),
      yBot = yPadB + 240,
      xEnd = 600;
    /* the pier below and beside the padstone */
    npssCourses(ctx, X(-Wp), Y(yPadB), X(0), Y(yBot), k, "brick", pw, "#ead8cf");
    if (pd && pd.L < Wp)
      npssCourses(ctx, X(-Wp), Y(yPad), X(-pd.L), Y(yPadB), k, "brick", pw, "#ead8cf");
    /* the wall over, on the beam and either side of its end */
    npssCourses(ctx, X(-Wp), Y(-300), X(xEnd), Y(0), k, "brick", pw, "#ead8cf");
    npssCourses(ctx, X(-Wp), Y(0), X(-br - 10), Y(yPad), k, "brick", pw, "#ead8cf");
    rect(-Wp, -300, xEnd, 0, null, 0.13);
    rect(-Wp, 0, -br - 10, yPad, null, 0.13);
    rect(-Wp, yPadB, 0, yBot, null, 0.3);
    /* the padstone */
    if (pd) {
      if (pd.kind === "steel") rect(-pd.L, yPad, 0, yPadB, "#59606b", 0.25);
      else if (pd.kind === "brick") {
        npssCourses(ctx, X(-pd.L), Y(yPad), X(0), Y(yPadB), k, "brick", pw, "#c9a99a");
        rect(-pd.L, yPad, 0, yPadB, null, 0.3);
      } else {
        rect(-pd.L, yPad, 0, yPadB, "#e6e6e6", 0.3);
        pat("conc", -pd.L, yPad, 0, yPadB);
      }
      notes.push([X(-pd.L * 0.5), Y((yPad + yPadB) / 2), "Padstone: " + pd.words]);
    }
    /* steel packers and dry pack under the end */
    rect(-br, S.d, 0, yPad, "#9aa1aa", 0.13);
    ctx.save();
    ctx.lineWidth = pw(0.08);
    ctx.strokeStyle = ink;
    ctx.beginPath();
    for (let x = -br; x < 0; x += 6 / k + 2) {
      ctx.moveTo(X(x), Y(yPad));
      ctx.lineTo(X(Math.min(x + 8, 0)), Y(S.d));
    }
    ctx.stroke();
    ctx.restore();
    notes.push([
      X(-br * 0.6),
      Y(S.d + pack / 2),
      "Steel packers, then dry pack (1:3, semi-dry) rammed in, max. 10 mm",
    ]);
    /* the beam end, seen from the side: flanges and web */
    rect(-br, 0, xEnd, S.d, "#8a919b", 0.3);
    ctx.lineWidth = pw(0.13);
    ctx.beginPath();
    ctx.moveTo(X(-br), Y(S.tf));
    ctx.lineTo(X(xEnd), Y(S.tf));
    ctx.moveTo(X(-br), Y(S.d - S.tf));
    ctx.lineTo(X(xEnd), Y(S.d - S.tf));
    ctx.stroke();
    if (o.fp === "board") {
      rect(0, S.d, xEnd, S.d + 15, "#efe1d8", 0.18);
      notes.push([X(xEnd * 0.7), Y(S.d + 7.5), "Fire protection: " + NPSS_FIRE[0][1]]);
    } else if (o.fp === "paint")
      notes.push([X(xEnd * 0.7), Y(S.d * 0.5), "Fire protection: " + NPSS_FIRE[1][1]]);
    notes.push([X(xEnd * 0.45), Y(S.d * 0.5), npssName(o) + " – size to the engineer's calcs"]);
    notes.push([
      X(xEnd * 0.3),
      Y(-150),
      "Masonry over the beam fully bedded, cut and pinned up tight",
    ]);
    /* the opening's face and the loose ends */
    ctx.lineWidth = pw(0.3);
    ctx.beginPath();
    ctx.moveTo(X(0), Y(yPad));
    ctx.lineTo(X(0), Y(yBot));
    ctx.stroke();
    brk(xEnd, -300, S.d);
    brkH(-300, -Wp, xEnd);
    brkH(yBot, -Wp, 0);
    brk(-Wp, -300, yBot);
    /* the bearing, dimensioned */
    {
      const yd = Y(S.d + (pd ? pd.H : 0) + pack) + fs * 2.2,
        xa = X(-br),
        xb = X(0);
      ctx.lineWidth = pw(0.13);
      ctx.strokeStyle = ink;
      ctx.beginPath();
      ctx.moveTo(xa, Y(S.d) + pw(1));
      ctx.lineTo(xa, yd + pw(1.5));
      ctx.moveTo(xb, Y(yPadB) + pw(1));
      ctx.lineTo(xb, yd + pw(1.5));
      ctx.moveTo(xa - pw(1.5), yd);
      ctx.lineTo(xb + pw(1.5), yd);
      [xa, xb].forEach((x) => {
        ctx.moveTo(x - pw(1), yd + pw(1));
        ctx.lineTo(x + pw(1), yd - pw(1));
      });
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.font = `400 ${fs}px Helvetica, Arial, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(`${Math.round(br)} bearing`, (xa + xb) / 2, yd - pw(0.6));
    }
  } else {
    /* ===== a cut across the beam ===== */
    const P = npssSectionParts(o),
      S = P.S;
    if (P.xBr1 != null) {
      const Hw = P.Hw;
      /* inner leaf on the top flange, outer leaf on the plate (or its own beam) */
      rect(P.xBlk0, -Hw, P.xCav, 0, "#e4e4e4", 0.3);
      pat("block", P.xBlk0, -Hw, P.xCav, 0);
      rect(P.xBr0, -Hw, P.xBr1, P.brBot, "#e8cfc4", 0.3);
      pat("brick", P.xBr0, -Hw, P.xBr1, P.brBot);
      /* cavity: insulation board against the inner leaf down to the tray */
      const ins = Math.min(P.cav != null ? P.cav : 100, (P.xBr0 - P.xCav) * 0.5);
      const trayTop = -150,
        trayBot = P.brBot - 65;
      rect(P.xCav, -Hw, P.xCav + ins, trayTop, "#d2e3de", 0.13);
      pat("hex", P.xCav, -Hw, P.xCav + ins, trayTop);
      /* the cavity tray: up into the inner leaf, across the cavity, out through the outer leaf over the support */
      ctx.save();
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = pw(0.45);
      ctx.beginPath();
      ctx.moveTo(X(P.xCav - 50), Y(trayTop));
      ctx.lineTo(X(P.xCav), Y(trayTop));
      ctx.lineTo(X(P.xBr0), Y(trayBot));
      ctx.lineTo(X(P.xBr1 + 5), Y(trayBot));
      ctx.stroke();
      ctx.restore();
      /* a weep vent in the joint over the tray */
      rect(P.xBr0 + 20, trayBot - 65, P.xBr1, trayBot - 1, "#f8fafc", 0.13);
      notes.push([
        X((P.xBr0 + P.xBr1) / 2),
        Y(trayBot - 32),
        "Weep vents at 450 c/c, min. 2 over each opening",
      ]);
      notes.push([
        X((P.xCav + P.xBr0) / 2),
        Y((trayTop + trayBot) / 2),
        "Cavity tray with stop ends, lapped 100 mm",
      ]);
      notes.push([X((P.xBr0 + P.xBr1) / 2), Y(-Hw * 0.55), "Outer leaf: 102.5 mm brick"]);
      notes.push([
        X((P.xBlk0 + P.xCav) / 2),
        Y(-Hw * 0.7),
        "Inner leaf: 100 mm block, bedded on the top flange",
      ]);
      brkH(-Hw, P.xBlk0, P.xBr1);
    }
    if (P.sv === "floor") {
      const jd = P.jd,
        J = 700;
      /* chipboard over, joists either side on hangers off packers in the web, ceiling under */
      rect(-J, -22, J, 0, "#dcc4b4", 0.18);
      notes.push([X(-J * 0.7), Y(-11), "22 mm T&G chipboard flooring"]);
      [-1, 1].forEach((sg) => {
        const xa = sg * (S.b / 2 + 4),
          xb = sg * J;
        /* the joists run away from the beam: seen from the side */
        rect(xa, 0, xb, jd, "#e8d6c8", 0.25);
        ctx.lineWidth = pw(0.08);
        ctx.strokeStyle = ink;
        ctx.beginPath();
        for (let y = jd * 0.25; y < jd; y += jd * 0.25) {
          ctx.moveTo(X(xa), Y(y));
          ctx.lineTo(X(xb), Y(y));
        }
        ctx.stroke();
        /* the hanger: a strap down the packer face and under the joist */
        ctx.lineWidth = pw(0.35);
        ctx.beginPath();
        ctx.moveTo(X(xa - sg * 2), Y(-2));
        ctx.lineTo(X(xa - sg * 2), Y(jd + 3));
        ctx.lineTo(X(xa + sg * 75), Y(jd + 3));
        ctx.stroke();
        rect(sg * (S.b / 2 + 4), jd, xb, jd + 12.5, "#efe1d8", 0.18);
        brk(xb, -22, jd + 12.5);
      });
      notes.push([
        X(J * 0.6),
        Y(jd * 0.5),
        `Joists in hangers, ${Math.round(jd)} deep (to the calcs)`,
      ]);
      notes.push([X(S.b / 2 + 40), Y(jd + 3), "Joist hangers, nailed to the packers"]);
      notes.push([X(J * 0.7), Y(jd + 6), "12.5 mm plasterboard ceiling"]);
    }
    /* the beam(s) */
    P.beams.forEach((bm) => {
      if (S.kind === "CC") {
        const gap = 10;
        steelFill(S, bm.x - S.b / 2 - gap / 2, 0, -1);
        steelFill(S, bm.x + S.b / 2 + gap / 2, 0, 1);
      } else steelFill(S, bm.x, 0, 1);
    });
    if (P.plate) {
      rect(P.plate.x0, P.plate.y0, P.plate.x1, P.plate.y1, "#59606b", 0.25);
      notes.push([
        X((P.plate.x0 + P.plate.x1) * 0.6),
        Y(P.plate.y0 + 5),
        "10 mm plate welded to the bottom flange, to carry the outer leaf",
      ]);
    }
    /* timber packers in the web, bolted through */
    if (S.kind === "I" && P.sv !== "bare") {
      const xs = P.beams.map((bm) => bm.x);
      xs.forEach((x0b) => {
        const yA = S.tf + S.r * 0.6,
          yB = S.d - S.tf - S.r * 0.6;
        timber(x0b - S.b / 2 + 2, yA, x0b - S.tw / 2 - S.r * 0.6, yB);
        timber(x0b + S.tw / 2 + S.r * 0.6, yA, x0b + S.b / 2 - 2, yB);
      });
      /* the bolt: a centre line through the packers and webs, with washers */
      const xa = xs[0] - S.b / 2,
        xb = xs[xs.length - 1] + S.b / 2,
        ym = S.d / 2;
      ctx.save();
      ctx.strokeStyle = ink;
      ctx.lineWidth = pw(0.5);
      ctx.beginPath();
      ctx.moveTo(X(xa - 8), Y(ym));
      ctx.lineTo(X(xb + 8), Y(ym));
      ctx.stroke();
      ctx.lineWidth = pw(0.25);
      [xa - 4, xb + 4].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(X(x), Y(ym - 12));
        ctx.lineTo(X(x), Y(ym + 12));
        ctx.stroke();
      });
      ctx.restore();
      if (xs.length > 1) {
        /* spacer tube between the two beams */
        rect(xs[0] + S.tw / 2 + 2, ym - 15, xs[1] - S.tw / 2 - 2, ym + 15, "#9aa1aa", 0.13);
        notes.push([
          X((xs[0] + xs[1]) / 2),
          Y(ym - 15),
          "M16 bolts with spacer tubes at 1000 c/c (to the calcs)",
        ]);
      }
      notes.push([
        X(xs[0] - S.b / 4),
        Y(S.d * 0.3),
        "47 mm timber packers bolted through the web, M12 at 600 c/c",
      ]);
    }
    /* the steel outline again over the packers, so its shape reads */
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.lineWidth = pw(0.35);
    P.beams.forEach((bm) => {
      if (S.kind === "CC") {
        [
          [bm.x - S.b / 2 - 5, -1],
          [bm.x + S.b / 2 + 5, 1],
        ].forEach(([x, dr]) => {
          npssProfile(ctx, S, X(x), Y(0), k, dr);
          ctx.stroke();
        });
      } else {
        npssProfile(ctx, S, X(bm.x), Y(0), k, 1);
        ctx.stroke();
      }
    });
    ctx.restore();
    /* fire protection: boxed in board on the room side and underneath */
    if (P.fp === "board") {
      const xs = P.beams.map((bm) => bm.x);
      const L = xs[0] - S.b / 2 - (S.kind === "CC" ? S.b + 5 : 0),
        Rr = P.plate ? P.plate.x1 : P.xBr1 != null ? P.xBr1 : xs[xs.length - 1] + S.b / 2;
      const top = P.sv === "floor" ? P.jd + 12.5 : 0;
      if (P.sv !== "floor" || S.d > P.jd) {
        rect(L - 15, top, L, P.under, "#efe1d8", 0.18);
        rect(L - 15, P.under, Rr, P.under + 15, "#efe1d8", 0.18);
        if (P.sv === "floor")
          rect(xs[0] + S.b / 2, top, xs[0] + S.b / 2 + 15, P.under, "#efe1d8", 0.18);
        notes.push([X(L - 7.5), Y((top + P.under) / 2), "Fire protection: " + NPSS_FIRE[0][1]]);
      }
    } else if (P.fp === "paint")
      notes.push([
        X(P.beams[0].x + S.b / 2),
        Y(S.d - S.tf / 2),
        "Fire protection: " + NPSS_FIRE[1][1],
      ]);
    notes.push([
      X(P.beams[0].x + S.tw),
      Y(S.d * 0.62),
      npssName(o) + " – size to the engineer's calcs",
    ]);
  }
  ctx.restore();
  /* the notes: level leaders with open arrows to a column beside the detail */
  if (o.lab && notes.length) {
    const gap = fs * 1.35,
      right = o.lr !== 1,
      ex = right ? x0 + w + fs * 1.2 : x0 - fs * 1.2;
    const rows = notes.slice().sort((a, b) => a[1] - b[1]);
    /* each note level with what it points at where it can be, pushed down to keep them apart, then up to fit */
    const ys = [];
    rows.forEach((r2, i) => ys.push(Math.max(r2[1], i ? ys[i - 1] + gap : -1e9)));
    const over = ys.length ? ys[ys.length - 1] - (y0 + h) : 0;
    if (over > 0)
      for (let i = ys.length - 1, lim = y0 + h; i >= 0; i--, lim -= gap)
        ys[i] = Math.min(ys[i], lim);
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineWidth = pw(0.13);
    ctx.font = `400 ${fs}px Helvetica, Arial, system-ui, sans-serif`;
    ctx.textAlign = right ? "left" : "right";
    ctx.textBaseline = "middle";
    rows.forEach(([px, py, t], i) => {
      const ry = ys[i];
      const an = Math.atan2(py - ry, px - ex),
        ah = pw(1.6);
      ctx.beginPath();
      ctx.moveTo(px - ah * Math.cos(an - 0.3), py - ah * Math.sin(an - 0.3));
      ctx.lineTo(px, py);
      ctx.lineTo(px - ah * Math.cos(an + 0.3), py - ah * Math.sin(an + 0.3));
      ctx.moveTo(px, py);
      ctx.lineTo(ex, ry);
      ctx.lineTo(ex + (right ? fs * 0.6 : -fs * 0.6), ry);
      ctx.stroke();
      ctx.fillText(t, ex + (right ? fs * 0.9 : -fs * 0.9), ry);
    });
    ctx.restore();
  }
  return true;
}
