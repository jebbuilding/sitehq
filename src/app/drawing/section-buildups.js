/* ================= SECTION BUILD-UPS: walls, roofs and floors drawn layer by layer at real thickness, with tags and a specification ================= */
import { NP_U } from "./construction-details.js";
export {
  NPSU_LIB,
  NPSU_MATS,
  npsuCode,
  npsuDraw,
  npsuIsMem,
  npsuLayers,
  npsuSpec,
  npsuTie,
  npsuTotal,
};
/* A build-up is a line shape (k "secbu") carrying its layers: bu = [{m: material, t: mm, n: words}], bn = name,
   bc = tag code (EW01, RF01…), fl = layers on the other side, lab = label every layer, notag = no tag.
   Membranes have no thickness and are drawn as coloured lines (orange breather, pink vapour control, purple DPM,
   blue DPC, green insect mesh). Generic UK build-ups only: the drawer checks U-values and Building Regulations. */
const NPSU_MATS = {
  brick: ["Facing brick", "#e9b8a2", "brick"],
  block: ["Concrete block", "#d9d9d9", "block"],
  conc: ["Concrete", "#e5e7eb", "conc"],
  bblock: ["Beam & block", "#d1d5db", "bblock"],
  screed: ["Screed", "#eeeeee", "dots"],
  render: ["Render", "#f1f1f1", "dots"],
  rboard: ["Render carrier board", "#d1d5db", "dash"],
  plaster: ["Plaster", "#ffffff", "dots"],
  pb: ["Plasterboard", "#ffffff", "pb"],
  pir: ["PIR insulation board", "#fde68a", "pir"],
  pirb: ["PIR insulation between timbers", "#fde68a", "pirb"],
  wool: ["Mineral wool insulation", "#fff3c4", "wool"],
  studins: ["Mineral wool between timbers", "#fff3c4", "woolb"],
  acoustic: ["Acoustic insulation", "#e0f2fe", "acoustic"],
  xps: ["XPS insulation", "#bfdbfe", "xps"],
  timber: ["Timber", "#f3e2c4", "grain"],
  osb: ["OSB / plywood", "#e8c98f", "dash"],
  chip: ["Chipboard flooring", "#e8c98f", "dots"],
  clad: ["Timber cladding", "#d6a76c", "clad"],
  batten: ["Battens", "", "batten"],
  cbatt: ["Battens (continuous)", "#f3e2c4", "grain"],
  slate: ["Slates", "#4b5563", "slate"],
  tile: ["Roof tiles", "#b45309", "slate"],
  epdm: ["Roof membrane (EPDM / single ply)", "#111827", ""],
  grp: ["GRP roof covering", "#374151", ""],
  finish: ["Floor finish", "#c4b5a5", ""],
  sand: ["Sand blinding", "#fef3c7", "dots"],
  hardcore: ["Hardcore", "#f3f4f6", "stones"],
  cavity: ["Clear cavity", "", ""],
  void: ["Void", "", ""],
  /* membranes: no thickness */
  breather: ["Breather membrane", "#ea580c", "m-dash"],
  vcl: ["Vapour control layer", "#db2777", "m-dash"],
  dpm: ["DPM", "#7c3aed", "m-dashdot"],
  dpc: ["DPC", "#2563eb", "m-dash"],
  mesh: ["Insect mesh", "#16a34a", "m-line"],
  lead: ["Lead flashing", "#065f46", "m-thick"],
  poly: ["Separating layer (polythene)", "#db2777", "m-dashdot"],
};
const npsuIsMem = (m) => /^m-/.test((NPSU_MATS[m] || [])[2] || "");
/* [key, name, code prefix, group, layers [material, mm, words]] – layers from the line outwards */
const NPSU_LIB = [
  [
    "cavbrick",
    "Cavity wall: brick outer leaf, partial fill",
    "EW",
    "Walls",
    [
      ["plaster", 13, "13 mm plaster"],
      ["block", 100, "100 mm dense / lightweight block inner leaf"],
      ["pir", 100, "100 mm PIR partial fill cavity board"],
      ["cavity", 50, "50 mm clear cavity"],
      ["brick", 102, "102.5 mm facing brick outer leaf"],
    ],
  ],
  [
    "cavrender",
    "Cavity wall: rendered block, full fill",
    "EW",
    "Walls",
    [
      ["pb", 13, "12.5 mm plasterboard on dabs"],
      ["void", 15, "dab zone"],
      ["block", 100, "100 mm block inner leaf"],
      ["wool", 150, "150 mm full fill mineral wool cavity batts"],
      ["block", 100, "100 mm block outer leaf"],
      ["render", 20, "20 mm render on mesh beads"],
    ],
  ],
  [
    "tfclad",
    "Timber frame wall: timber cladding",
    "EW",
    "Walls",
    [
      ["pb", 13, "12.5 mm plasterboard, taped and filled"],
      ["cbatt", 25, "25 × 38 battens forming service void"],
      ["vcl", 0, "vapour control layer, joints taped"],
      ["studins", 140, "140 mm mineral wool between 47 × 140 C24 studs at 600 c/c"],
      ["osb", 9, "9 mm OSB3 sheathing"],
      ["breather", 0, "breather membrane"],
      ["cbatt", 25, "25 × 50 treated battens forming vented cavity, insect mesh top and bottom"],
      ["clad", 22, "22 mm timber cladding"],
    ],
  ],
  [
    "tfrender",
    "Timber frame wall: render on carrier board",
    "EW",
    "Walls",
    [
      ["pb", 13, "12.5 mm plasterboard"],
      ["vcl", 0, "vapour control layer"],
      ["studins", 140, "140 mm mineral wool between 47 × 140 C24 studs at 600 c/c"],
      ["osb", 9, "9 mm OSB3 sheathing"],
      ["breather", 0, "breather membrane"],
      ["cbatt", 25, "25 mm treated battens forming drained cavity"],
      ["rboard", 12, "12 mm render carrier board"],
      ["render", 10, "10 mm through-coloured render system"],
    ],
  ],
  [
    "solidiwi",
    "Solid wall with insulated plasterboard",
    "EW",
    "Walls",
    [
      ["pb", 13, "12.5 mm plasterboard"],
      ["pir", 38, "37.5 mm PIR (insulated plasterboard)"],
      ["cbatt", 25, "25 × 50 treated battens"],
      ["brick", 215, "215 mm existing solid brick wall"],
    ],
  ],
  [
    "partition",
    "Stud partition (acoustic)",
    "IW",
    "Walls",
    [
      ["pb", 13, "12.5 mm sound plasterboard"],
      ["acoustic", 75, "75 mm acoustic insulation between 47 × 75 studs at 600 c/c"],
      ["pb", 13, "12.5 mm sound plasterboard"],
    ],
  ],
  [
    "slatewarm",
    "Pitched roof: slates, warm (insulation at rafters)",
    "RF",
    "Roofs",
    [
      ["pb", 13, "12.5 mm plasterboard"],
      ["cbatt", 25, "25 mm battens forming service void"],
      ["vcl", 0, "vapour control layer"],
      ["pir", 50, "50 mm PIR under rafters"],
      ["pirb", 100, "100 mm PIR between 47 × 150 rafters, 50 mm air gap above"],
      ["void", 50, "50 mm ventilated gap"],
      ["breather", 0, "vapour permeable underlay"],
      ["batten", 25, "25 × 50 treated slate battens"],
      ["slate", 10, "natural slates to suit pitch and exposure"],
    ],
  ],
  [
    "tilecold",
    "Pitched roof: tiles, cold (loft insulated at ceiling)",
    "RF",
    "Roofs",
    [
      ["void", 150, "47 × 150 C24 rafters at 400 c/c, ventilated loft"],
      ["breather", 0, "breather membrane"],
      ["batten", 25, "25 × 50 treated tile battens"],
      ["tile", 15, "concrete interlocking tiles"],
    ],
  ],
  [
    "flatwarm",
    "Flat roof: warm deck, single ply / EPDM",
    "RF",
    "Roofs",
    [
      ["pb", 13, "12.5 mm plasterboard"],
      ["void", 200, "47 × 200 C24 joists at 400 c/c"],
      ["osb", 18, "18 mm OSB3 deck"],
      ["vcl", 0, "vapour control layer"],
      ["pir", 120, "120 mm PIR flat roof board"],
      ["epdm", 2, "EPDM / single ply membrane, fully bonded"],
    ],
  ],
  [
    "flatgrp",
    "Flat roof: warm deck, GRP",
    "RF",
    "Roofs",
    [
      ["pb", 13, "12.5 mm plasterboard"],
      ["void", 200, "47 × 200 C24 joists at 400 c/c"],
      ["osb", 18, "18 mm OSB3 deck"],
      ["vcl", 0, "vapour control layer"],
      ["pir", 120, "120 mm PIR flat roof board"],
      ["osb", 18, "18 mm OSB3 top deck"],
      ["grp", 3, "GRP laminate with top coat"],
    ],
  ],
  [
    "loftquilt",
    "Loft ceiling: quilt over and between joists",
    "RF",
    "Roofs",
    [
      ["pb", 13, "12.5 mm plasterboard"],
      ["vcl", 0, "vapour control layer"],
      ["studins", 100, "100 mm loft quilt between ceiling joists"],
      ["wool", 170, "170 mm loft quilt across the joists"],
    ],
  ],
  [
    "upfloor",
    "Upper floor: timber joists",
    "FF",
    "Floors",
    [
      ["pb", 15, "15 mm fire-rated plasterboard"],
      ["acoustic", 100, "100 mm acoustic quilt between joists"],
      ["void", 120, "47 × 220 C24 joists at 400 c/c"],
      ["chip", 22, "22 mm T&G chipboard flooring, glued and screwed"],
    ],
  ],
  [
    "garfloor",
    "Floor over garage: insulated",
    "FF",
    "Floors",
    [
      ["pb", 15, "15 mm fire-rated plasterboard (30 min)"],
      ["void", 70, "joist zone"],
      ["pirb", 150, "150 mm PIR between 47 × 220 joists"],
      ["chip", 22, "22 mm T&G chipboard flooring"],
    ],
  ],
  [
    "gslab",
    "Ground floor: slab, insulation under screed",
    "GF",
    "Ground floors",
    [
      ["hardcore", 150, "150 mm compacted hardcore"],
      ["sand", 25, "25 mm sand blinding"],
      ["conc", 100, "100 mm concrete slab"],
      ["dpm", 0, "1200 gauge DPM, lapped with DPC"],
      ["pir", 100, "100 mm PIR floor insulation, 25 mm upstands at edges"],
      ["poly", 0, "separating layer"],
      ["screed", 65, "65 mm sand / cement screed"],
      ["finish", 10, "floor finish"],
    ],
  ],
  [
    "gbb",
    "Ground floor: beam & block, insulation under screed",
    "GF",
    "Ground floors",
    [
      ["void", 150, "150 mm ventilated void"],
      ["bblock", 150, "150 mm precast beam & block floor"],
      ["dpm", 0, "DPM"],
      ["pir", 100, "100 mm PIR floor insulation"],
      ["poly", 0, "separating layer"],
      ["screed", 65, "65 mm screed"],
    ],
  ],
  [
    "gtimber",
    "Ground floor: suspended timber",
    "GF",
    "Ground floors",
    [
      ["conc", 100, "100 mm oversite concrete on DPM"],
      ["void", 150, "150 mm ventilated void"],
      ["studins", 150, "150 mm mineral wool on netting between 47 × 175 joists"],
      ["chip", 22, "22 mm T&G chipboard flooring"],
    ],
  ],
];
const npsuLayers = (key) => {
  const b = NPSU_LIB.find((x) => x[0] === key) || NPSU_LIB[0];
  return b[4].map(([m, t, n]) => ({ m, t, n }));
};
const npsuTotal = (bu) => (bu || []).reduce((a, l) => a + (npsuIsMem(l.m) ? 0 : +l.t || 0), 0);
const npsuWords = (l) =>
  l.n || (npsuIsMem(l.m) ? "" : (+l.t || 0) + " mm ") + (NPSU_MATS[l.m] || [l.m])[0];
/* the next free code for a prefix, or the code already used for the same build-up */
function npsuCode(objs, prefix, bu, bn) {
  const sig = JSON.stringify([bn, bu]);
  const same = objs.find((o) => o.k === "secbu" && o.bc && JSON.stringify([o.bn, o.bu]) === sig);
  if (same) return same.bc;
  const used = new Set(objs.filter((o) => o.k === "secbu" && o.bc).map((o) => o.bc));
  for (let i = 1; i < 100; i++) {
    const c = prefix + String(i).padStart(2, "0");
    if (!used.has(c)) return c;
  }
  return prefix + "99";
}
/* the fill pattern for one layer, in the band's own frame: x along, y across (y0 < y1) */
function npsuPat(ctx, pat, x0, y0, x1, y1, lw, k) {
  const w = x1 - x0,
    h = y1 - y0;
  if (h <= 0 || w <= 0) return;
  const thin = Math.max(lw * 0.45, 0.4);
  const ln = (a, b, c, d) => {
    ctx.beginPath();
    ctx.moveTo(a, b);
    ctx.lineTo(c, d);
    ctx.stroke();
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  ctx.lineWidth = thin;
  const hatch = (st) => {
    for (let t = -h; t < w + h; t += st) ln(x0 + t, y1, x0 + t + h, y0);
  };
  const dots = (st) => {
    let r = 0;
    for (let y = y0 + st / 2; y < y1; y += st, r++)
      for (let x = x0 + (r % 2 ? st / 2 : 0); x < x1; x += st) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(thin * 0.6, 0.35), 0, 7);
        ctx.fill();
      }
  };
  const zig = (st) => {
    ctx.beginPath();
    for (let x = x0, i = 0; x <= x1 + st; x += st / 2, i++) {
      const y = i % 2 ? y0 + h * 0.08 : y1 - h * 0.08;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  };
  const loops = (st) => {
    ctx.beginPath();
    for (let x = x0; x < x1; x += st) {
      ctx.moveTo(x, y1 - h * 0.12);
      ctx.bezierCurveTo(
        x - st * 0.35,
        y0 - h * 0.05,
        x + st * 1.35,
        y0 - h * 0.05,
        x + st,
        y1 - h * 0.12,
      );
    }
    ctx.stroke();
  };
  const between = () => {
    ctx.save();
    ctx.setLineDash([lw * 4, lw * 2.5]);
    ctx.lineWidth = Math.max(lw * 0.7, 0.5);
    ln(x0, y0 + thin, x1, y0 + thin);
    ln(x0, y1 - thin, x1, y1 - thin);
    ctx.restore();
  };
  const st = Math.max(lw * 2.2, 2);
  switch (pat) {
    case "brick":
      hatch(Math.max(k * 22, lw * 1.8));
      break;
    case "block":
      hatch(Math.max(k * 45, lw * 3));
      break;
    case "bblock": {
      hatch(Math.max(k * 45, lw * 3));
      const bw = Math.max(k * 155, 6);
      for (let x = x0; x < x1; x += Math.max(k * 600, 20)) {
        ctx.save();
        ctx.fillStyle = "#9ca3af";
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x + bw, y1);
        ctx.lineTo(x + bw * 0.75, y0);
        ctx.lineTo(x + bw * 0.25, y0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case "conc": {
      dots(Math.max(k * 18, st));
      const tr = Math.max(k * 12, lw * 1.5);
      let r = 0;
      for (let y = y0 + tr * 2; y < y1 - tr; y += tr * 4, r++)
        for (let x = x0 + (r % 2 ? tr * 3 : tr); x < x1; x += tr * 6) {
          ctx.beginPath();
          ctx.moveTo(x, y - tr);
          ctx.lineTo(x + tr, y + tr * 0.7);
          ctx.lineTo(x - tr, y + tr * 0.7);
          ctx.closePath();
          ctx.stroke();
        }
      break;
    }
    case "dots":
      dots(Math.max(k * 8, st));
      break;
    case "pb":
      dots(Math.max(k * 20, st * 2));
      break;
    case "pir":
    case "pirb":
      zig(Math.max(h * 0.9, st * 2));
      ln(x0, y0 + thin, x1, y0 + thin);
      ln(x0, y1 - thin, x1, y1 - thin);
      if (pat === "pirb") between();
      break;
    case "wool":
    case "woolb":
      loops(Math.max(h * 0.55, st * 2));
      if (pat === "woolb") between();
      break;
    case "acoustic":
      ctx.strokeStyle = "#2563eb";
      zig(Math.max(h * 0.35, st));
      break;
    case "xps":
      ctx.strokeStyle = "#1d4ed8";
      zig(Math.max(h * 0.6, st * 2));
      break;
    case "grain":
      for (let y = y0 + h / 3; y < y1; y += h / 3) {
        ctx.beginPath();
        for (let x = x0; x <= x1; x += Math.max(h, 4)) {
          const yy = y + Math.sin(x / Math.max(h, 4)) * h * 0.06;
          x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      break;
    case "dash":
      for (let y = y0 + h * 0.5, r = 0; r < 1; r++)
        for (let x = x0 + h; x < x1; x += h * 3) ln(x, y, x + h * 1.2, y);
      break;
    case "clad":
      for (let x = x0; x < x1; x += Math.max(k * 150, 6)) ln(x, y0, x, y1);
      ln(x0, y0 + h * 0.5, x1, y0 + h * 0.5);
      break;
    case "slate":
      for (let x = x0; x < x1; x += Math.max(k * 250, 8)) ln(x, y1, x + Math.max(k * 60, 3), y0);
      break;
    case "batten": {
      const bw = Math.max(k * 50, 3),
        gap = Math.max(k * 300, 12);
      ctx.save();
      ctx.fillStyle = "#f3e2c4";
      for (let x = x0 + gap / 2; x < x1 - bw; x += gap) {
        ctx.fillRect(x, y0, bw, h);
        ctx.strokeRect(x, y0, bw, h);
      }
      ctx.restore();
      break;
    }
    case "stones": {
      const r0 = Math.max(k * 25, 2);
      let i = 0;
      for (let y = y0 + r0; y < y1; y += r0 * 2.2)
        for (let x = x0 + ((i++ % 3) * r0) / 1.5; x < x1; x += r0 * 2.6) {
          ctx.beginPath();
          ctx.ellipse(x, y, r0 * 0.9, r0 * 0.6, (i % 5) * 0.6, 0, 7);
          ctx.stroke();
        }
      break;
    }
  }
  ctx.restore();
}
/* draws the build-up along a line: P(t, off) maps along / across to the page */
function npsuDraw(ctx, o, P, L, lw) {
  const bu = o.bu && o.bu.length ? o.bu : npsuLayers("cavbrick");
  const k = ctx.__mm || 0.12;
  const O = P(0, 0),
    X = P(1, 0),
    Y = P(0, 1);
  const side = o.fl ? -1 : 1;
  const ink = ctx.strokeStyle;
  const poly = NPSU_JOIN.get(o);
  const E = poly ? npsuTotal(bu) * k * 3 + L * 0.5 : 0,
    t0 = -E,
    t1 = L + E;
  ctx.save();
  if (poly) {
    ctx.beginPath();
    poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.clip();
  }
  ctx.transform(X[0] - O[0], X[1] - O[1], (Y[0] - O[0]) * side, (Y[1] - O[1]) * side, O[0], O[1]);
  /* in this frame layers stack from y = 0 upwards to y = -total */
  let y = 0;
  const mids = [];
  bu.forEach((l) => {
    const M = NPSU_MATS[l.m] || ["", "", ""];
    if (npsuIsMem(l.m)) {
      ctx.save();
      ctx.strokeStyle = M[1];
      ctx.lineWidth = Math.max(lw * (M[2] === "m-thick" ? 1.6 : 0.9), 0.6);
      if (M[2] === "m-dash") ctx.setLineDash([lw * 5, lw * 3]);
      if (M[2] === "m-dashdot") ctx.setLineDash([lw * 6, lw * 2, lw * 1.2, lw * 2]);
      ctx.beginPath();
      ctx.moveTo(t0, y);
      ctx.lineTo(t1, y);
      ctx.stroke();
      ctx.restore();
      mids.push(y);
      return;
    }
    const t = Math.max(+l.t || 0, 0) * k;
    if (!t) return;
    const y0 = y - t;
    if (M[1]) {
      ctx.save();
      ctx.fillStyle = M[1];
      ctx.fillRect(t0, y0, t1 - t0, t);
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    npsuPat(ctx, M[2], t0, y0, t1, y, lw, k);
    ctx.restore();
    ctx.save();
    ctx.lineWidth = Math.max(lw * 0.6, 0.5);
    ctx.beginPath();
    ctx.moveTo(t0, y0);
    ctx.lineTo(t1, y0);
    ctx.stroke();
    ctx.restore();
    mids.push(y0 + t / 2);
    y = y0;
  });
  const total = -y;
  if (!poly) {
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(L, 0);
    ctx.moveTo(0, -total);
    ctx.lineTo(L, -total);
    ctx.stroke();
    ctx.lineWidth = Math.max(lw * 0.6, 0.5);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -total);
    ctx.moveTo(L, 0);
    ctx.lineTo(L, -total);
    ctx.stroke();
  }
  ctx.restore();
  if (poly) {
    /* the joined outline: faces at full pen, the joint lines a little lighter */
    ctx.save();
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    ctx.lineTo(poly[1][0], poly[1][1]);
    ctx.moveTo(poly[2][0], poly[2][1]);
    ctx.lineTo(poly[3][0], poly[3][1]);
    ctx.stroke();
    ctx.lineWidth = Math.max(lw * 0.6, 0.5);
    ctx.beginPath();
    ctx.moveTo(poly[1][0], poly[1][1]);
    ctx.lineTo(poly[2][0], poly[2][1]);
    ctx.moveTo(poly[3][0], poly[3][1]);
    ctx.lineTo(poly[0][0], poly[0][1]);
    ctx.stroke();
    ctx.restore();
  }
  /* page point for (along, up-from-line) in the build-up's own frame */
  const Q = (t, up) => P(t, -up * side);
  const fs = ctx.__mm ? 2.8 * NP_U : Math.max(8, Math.min(lw * 5.5, 22));
  const txt = (s, x, y2, al, bold) => {
    ctx.save();
    ctx.fillStyle = ink;
    ctx.font = `${bold ? 800 : 500} ${bold ? fs * 1.05 : fs * 0.9}px system-ui,-apple-system,sans-serif`;
    ctx.textAlign = al;
    ctx.textBaseline = "middle";
    ctx.fillText(s, x, y2);
    ctx.restore();
  };
  /* the tag: a code in a box, just off the outer face, with a leader */
  if (o.bc && !o.notag) {
    const a = Q(L * (o.lab ? 0.88 : 0.5), total * 0.5),
      b = Q(L * (o.lab ? 0.88 : 0.5), total + fs * 2.6);
    ctx.save();
    ctx.lineWidth = Math.max(lw * 0.6, 0.5);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.font = `800 ${fs}px system-ui,-apple-system,sans-serif`;
    const tw = ctx.measureText(o.bc).width + fs * 0.8;
    ctx.fillStyle = "#e8f1fb";
    ctx.fillRect(b[0] - tw / 2, b[1] - fs * 0.75, tw, fs * 1.5);
    ctx.strokeStyle = "#1f4e8c";
    ctx.lineWidth = Math.max(lw * 0.8, 0.6);
    ctx.strokeRect(b[0] - tw / 2, b[1] - fs * 0.75, tw, fs * 1.5);
    ctx.restore();
    txt(o.bc, b[0], b[1], "center", true);
  }
  /* every layer labelled: leaders from each layer to a stacked list beyond the outer face */
  if (o.lab) {
    const rows = bu.map((l, i) => [npsuWords(l), mids[i]]).filter((r) => r[1] != null);
    const n = rows.length,
      gap = fs * 1.35;
    const base = Q(0, total),
      dir = Q(0, total + 1);
    const nx = dir[0] - base[0];
    /* a wall: level leaders straight out to a column; a floor or roof: stepped leaders, innermost highest */
    const vertical = Math.abs(nx) > 0.7,
      right = vertical ? nx > 0 : true;
    const at = vertical ? Math.max(0, L * 0.5 - ((n - 1) * gap) / 2) : L * 0.12;
    ctx.save();
    ctx.lineWidth = Math.max(lw * 0.5, 0.45);
    rows.forEach(([s2, m], i) => {
      const p = Q(at + i * (vertical ? gap : fs * 0.9), -m);
      const e = vertical
        ? Q(at + i * gap, total + fs * 2)
        : Q(at + i * fs * 0.9, total + fs * (1.5 + (n - 1 - i) * 1.35));
      ctx.beginPath();
      ctx.arc(p[0], p[1], Math.max(lw * 0.9, 1.2), 0, 7);
      ctx.fillStyle = ink;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(e[0], e[1]);
      ctx.lineTo(e[0] + (right ? fs * 0.6 : -fs * 0.6), e[1]);
      ctx.stroke();
      txt(s2, e[0] + (right ? fs * 0.9 : -fs * 0.9), e[1], right ? "left" : "right");
    });
    ctx.restore();
  }
  return true;
}
/* how build-ups tie together: worked out before each drawing pass, kept off the saved drawing */
const NPSU_JOIN = new WeakMap();
const npsuX = (p, d, q, e) => {
  const den = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den;
  return [p[0] + d[0] * t, p[1] + d[1] * t];
};
/* a build-up's frame on the page: a (start), u (along), w (towards its layers), L (length), T (thickness, page units) */
function npsuFrame(o, k) {
  const L = Math.hypot(o.b[0] - o.a[0], o.b[1] - o.a[1]) || 1;
  const u = [(o.b[0] - o.a[0]) / L, (o.b[1] - o.a[1]) / L];
  const n = [-u[1], u[0]];
  const w = o.fl ? n : [-n[0], -n[1]];
  return {
    o,
    a: o.a,
    b: o.b,
    u,
    w,
    L,
    T: npsuTotal(o.bu && o.bu.length ? o.bu : npsuLayers("cavbrick")) * k,
  };
}
/* corners are mitred; an end that runs into another build-up stops at its face */
function npsuTie(objs, k) {
  const F = objs
    .filter((o) => o && o.t === "shape" && o.k === "secbu" && o.a && o.b)
    .map((o) => npsuFrame(o, k || 0.12));
  F.forEach((f) => NPSU_JOIN.delete(f.o));
  if (F.length < 2) return;
  const cuts = new Map();
  const end = (f, e) => (e ? f.b : f.a);
  const off = (p, w, d) => [p[0] + w[0] * d, p[1] + w[1] * d];
  const cross = (f, g) => f.u[0] * g.u[1] - f.u[1] * g.u[0];
  /* corners: two ends close together, not in line */
  F.forEach((f, i) =>
    F.forEach((g, j) => {
      if (j <= i || Math.abs(cross(f, g)) < 0.15) return;
      [0, 1].forEach((ef) =>
        [0, 1].forEach((eg) => {
          if (cuts.get(i + ":" + ef) || cuts.get(j + ":" + eg)) return;
          const p = end(f, ef),
            q = end(g, eg);
          const tol = Math.max(f.T, g.T) * 1.2 + 6;
          if (Math.hypot(p[0] - q[0], p[1] - q[1]) > tol) return;
          const X = npsuX(f.a, f.u, g.a, g.u),
            Y = npsuX(off(f.a, f.w, f.T), f.u, off(g.a, g.w, g.T), g.u);
          if (!X || !Y || Math.hypot(X[0] - p[0], X[1] - p[1]) > tol * 3) return;
          const c = { p: X, d: [Y[0] - X[0], Y[1] - X[1]] };
          if (Math.hypot(c.d[0], c.d[1]) < 1e-6) return;
          cuts.set(i + ":" + ef, c);
          cuts.set(j + ":" + eg, c);
        }),
      );
    }),
  );
  /* ends that butt into another build-up: stop at its nearer face */
  F.forEach((f, i) =>
    [0, 1].forEach((ef) => {
      if (cuts.get(i + ":" + ef)) return;
      const p = end(f, ef),
        far = end(f, 1 - ef);
      let best = null;
      F.forEach((g, j) => {
        if (j === i || Math.abs(cross(f, g)) < 0.15) return;
        const tol = Math.max(f.T, 6);
        const rel = [p[0] - g.a[0], p[1] - g.a[1]];
        const t = rel[0] * g.u[0] + rel[1] * g.u[1],
          d = rel[0] * g.w[0] + rel[1] * g.w[1];
        if (t < -2 || t > g.L + 2 || d < -tol - f.T || d > g.T + tol + f.T) return;
        const rf = [far[0] - g.a[0], far[1] - g.a[1]];
        const df = rf[0] * g.w[0] + rf[1] * g.w[1];
        const face = df < g.T / 2 ? 0 : g.T;
        const gap = Math.abs(d - face);
        if (!best || gap < best.gap) best = { gap, c: { p: off(g.a, g.w, face), d: g.u } };
      });
      if (best) cuts.set(i + ":" + ef, best.c);
    }),
  );
  F.forEach((f, i) => {
    const ca = cuts.get(i + ":0"),
      cb = cuts.get(i + ":1");
    if (!ca && !cb) return;
    const inA = f.a,
      outA = off(f.a, f.w, f.T),
      inB = f.b,
      outB = off(f.b, f.w, f.T);
    const at = (c, line0) => (c ? npsuX(line0, f.u, c.p, c.d) : null);
    const I0 = at(ca, inA) || inA,
      O0 = at(ca, outA) || outA,
      I1 = at(cb, inA) || inB,
      O1 = at(cb, outA) || outB;
    NPSU_JOIN.set(f.o, [I0, I1, O1, O0]);
  });
}
/* the written specification for every build-up on a drawing: [[code, name, [lines]]] */
function npsuSpec(objs) {
  const seen = new Map();
  objs
    .filter((o) => o.k === "secbu" && o.bu)
    .forEach((o) => {
      const c = o.bc || "–";
      if (!seen.has(c))
        seen.set(c, [
          c,
          o.bn || "Build-up",
          o.bu.slice().reverse().map(npsuWords),
          npsuTotal(o.bu),
        ]);
    });
  return [...seen.values()].sort((a, b) => a[0].localeCompare(b[0]));
}
