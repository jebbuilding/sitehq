/* ================= SECTION BUILD-UPS: walls, roofs and floors drawn layer by layer at real thickness, with tags and a specification ================= */
import { NP_U } from "./construction-details.js";
export {
  NPSU_LIB,
  NPSU_MATS,
  npsuAcross,
  npsuCode,
  npsuDraw,
  npsuIsMem,
  npsuLayers,
  npsuPat,
  npsuSpec,
  npsuTie,
  npsuTotal,
};
/* A build-up is a line shape (k "secbu") carrying its layers: bu = [{m: material, t: mm, n: words}], bn = name,
   bc = tag code (EW01, RF01…), fl = layers on the other side, lab = label every layer, notag = no tag.
   Membranes have no thickness and are drawn as coloured lines (orange breather, pink vapour control, purple DPM,
   blue DPC, green insect mesh). Generic UK build-ups only: the drawer checks U-values and Building Regulations. */
const NPSU_MATS = {
  brick: ["Facing brick", "#e8cfc4", "brick"],
  block: ["Concrete block", "#e4e4e4", "block"],
  conc: ["Concrete", "#e6e6e6", "conc"],
  bblock: ["Beam & block", "#dadada", "bblock"],
  screed: ["Screed", "#eeeeee", "dots"],
  render: ["Render", "#f1f0ee", "dots"],
  rboard: ["Render carrier board", "#dddddd", "dash"],
  plaster: ["Plaster", "#f6f1ec", ""],
  pb: ["Plasterboard", "#efe1d8", ""],
  pir: ["PIR insulation board", "#d2e3de", "hex"],
  pirb: ["PIR insulation between timbers", "#d2e3de", "hexb"],
  wool: ["Mineral wool insulation", "#e4dfc5", "hex"],
  studins: ["Mineral wool between timbers", "#e4dfc5", "hexb"],
  acoustic: ["Acoustic insulation", "#d9e6f2", "wave"],
  xps: ["XPS insulation", "#c9daf0", "hex"],
  timber: ["Timber", "#dcc4b4", "grain"],
  osb: ["OSB / plywood", "#e3cba9", "dash"],
  chip: ["Chipboard flooring", "#dcc4b4", ""],
  clad: ["Timber cladding", "#d9bfa8", "clad"],
  batten: ["Battens", "", "batten"],
  cbatt: ["Battens (continuous)", "#dcc4b4", ""],
  slate: ["Slates", "#7b8794", "slate"],
  tile: ["Roof tiles", "#b98b6e", "slate"],
  epdm: ["Roof membrane (EPDM / single ply)", "#2b2b2b", ""],
  grp: ["GRP roof covering", "#4b5563", ""],
  finish: ["Floor finish", "#cbb9a6", ""],
  sand: ["Sand blinding", "#f4ead2", "dots"],
  hardcore: ["Hardcore", "#f0f0f0", "stones"],
  cavity: ["Clear cavity", "", ""],
  void: ["Void", "", ""],
  /* membranes: no thickness */
  breather: ["Breather membrane", "#f08a24", "m-dash"],
  vcl: ["Vapour control layer", "#e8458b", "m-dash"],
  dpm: ["DPM", "#8b5cf6", "m-dashdot"],
  dpc: ["DPC", "#2563eb", "m-dash"],
  mesh: ["Insect mesh", "#15803d", "m-line"],
  lead: ["Lead flashing", "#0f766e", "m-thick"],
  poly: ["Separating layer (polythene)", "#e8458b", "m-dashdot"],
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
/* line weights in paper millimetres, as a drawing office would set them; lw (the pen) when the page has no scale */
const npsuPw = (ctx, lw, mmP) => (ctx.__mm ? NP_U * mmP : Math.max(lw * (mmP / 0.3), 0.3));
/* the fill pattern for one layer, in the band's own frame: x along, y across (y0 < y1); hatching is sized to the
   paper so it reads the same at 1:5 or 1:50 */
function npsuPat(ctx, pat, x0, y0, x1, y1, lw, k) {
  const w = x1 - x0,
    h = y1 - y0;
  if (h <= 0 || w <= 0 || !pat) return;
  const pm = (mmP) => npsuPw(ctx, lw, mmP);
  const ln = (a, b, c, d) => {
    ctx.moveTo(a, b);
    ctx.lineTo(c, d);
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  ctx.strokeStyle = "rgba(40,40,40,0.55)";
  ctx.fillStyle = "rgba(40,40,40,0.55)";
  ctx.lineWidth = pm(0.08);
  const hatch = (st) => {
    ctx.beginPath();
    for (let t = -h; t < w + h; t += st) ln(x0 + t, y1, x0 + t + h, y0);
    ctx.stroke();
  };
  const dots = (st) => {
    let r = 0;
    ctx.beginPath();
    for (let y = y0 + st / 2; y < y1; y += st, r++)
      for (let x = x0 + (r % 2 ? st / 2 : 0); x < x1; x += st) {
        ctx.moveTo(x + pm(0.07), y);
        ctx.arc(x, y, pm(0.07), 0, 7);
      }
    ctx.fill();
  };
  /* honeycomb: the usual insulation hatch */
  const hex = () => {
    let r = pm(0.55);
    while (((w / (r * 1.73)) * h) / (r * 1.5) > 9000) r *= 1.5;
    const hw = r * 0.866;
    ctx.beginPath();
    for (let j = 0, y = y0 - r; y < y1 + r; j++, y += r * 1.5)
      for (let x = x0 - hw * 2 + (j % 2 ? hw : 0); x < x1 + hw; x += hw * 2) {
        ctx.moveTo(x - hw, y + r / 2);
        ctx.lineTo(x - hw, y - r / 2);
        ctx.lineTo(x, y - r);
        ctx.lineTo(x + hw, y - r / 2);
      }
    ctx.stroke();
  };
  const between = () => {
    /* the timbers behind: fine dashed lines at the faces of the zone */
    ctx.save();
    ctx.strokeStyle = "rgba(40,40,40,0.8)";
    ctx.lineWidth = pm(0.1);
    ctx.setLineDash([pm(1.6), pm(0.9)]);
    ctx.beginPath();
    ln(x0, y0 + h * 0.5, x1, y0 + h * 0.5);
    ctx.stroke();
    ctx.restore();
  };
  switch (pat) {
    case "brick":
      hatch(pm(0.9));
      break;
    case "block":
      hatch(pm(1.8));
      break;
    case "bblock": {
      hatch(pm(1.8));
      const bw = Math.max(k * 155, pm(3));
      ctx.fillStyle = "#c9c9c9";
      ctx.strokeStyle = "rgba(40,40,40,0.8)";
      ctx.lineWidth = pm(0.13);
      for (let x = x0; x < x1; x += Math.max(k * 600, pm(10))) {
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x + bw, y1);
        ctx.lineTo(x + bw * 0.72, y0);
        ctx.lineTo(x + bw * 0.28, y0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case "conc": {
      dots(pm(0.8));
      const tr = pm(0.45);
      let r = 0;
      ctx.beginPath();
      for (let y = y0 + tr * 3; y < y1 - tr; y += tr * 5, r++)
        for (let x = x0 + (r % 2 ? tr * 4 : tr); x < x1; x += tr * 8) {
          ctx.moveTo(x, y - tr);
          ctx.lineTo(x + tr, y + tr * 0.7);
          ctx.lineTo(x - tr, y + tr * 0.7);
          ctx.closePath();
        }
      ctx.stroke();
      break;
    }
    case "dots":
      dots(pm(0.6));
      break;
    case "hex":
      hex();
      break;
    case "hexb":
      hex();
      between();
      break;
    case "wave": {
      ctx.strokeStyle = "rgba(37,99,235,0.7)";
      const st = pm(1.2);
      ctx.beginPath();
      for (let x = x0, i = 0; x <= x1 + st; x += st / 2, i++) {
        const yy = i % 2 ? y0 + h * 0.15 : y1 - h * 0.15;
        i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
      }
      ctx.stroke();
      break;
    }
    case "grain": {
      ctx.beginPath();
      for (let y = y0 + h / 3; y < y1 - h * 0.1; y += h / 3)
        for (let x = x0; x <= x1; x += pm(2)) {
          const yy = y + Math.sin(x / pm(2)) * h * 0.04;
          x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
        }
      ctx.stroke();
      break;
    }
    case "dash": {
      ctx.beginPath();
      for (let x = x0 + pm(1); x < x1; x += pm(3)) ln(x, y0 + h * 0.5, x + pm(1.4), y0 + h * 0.5);
      ctx.stroke();
      break;
    }
    case "clad": {
      ctx.beginPath();
      for (let x = x0; x < x1; x += Math.max(k * 150, pm(3))) ln(x, y0, x, y1);
      ctx.stroke();
      break;
    }
    case "slate": {
      /* overlapping slates: thin plates laid at a slight angle */
      const gauge = Math.max(k * 230, pm(2.5));
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.strokeStyle = "rgba(30,30,30,0.85)";
      ctx.lineWidth = pm(0.1);
      ctx.beginPath();
      for (let x = x0 - gauge * 2; x < x1; x += gauge) {
        ctx.moveTo(x, y1);
        ctx.lineTo(x + gauge * 2.1, y0);
      }
      ctx.stroke();
      break;
    }
    case "batten": {
      const bw = Math.max(k * 50, pm(0.8)),
        gap = Math.max(k * 300, pm(4));
      ctx.fillStyle = "#dcc4b4";
      ctx.strokeStyle = "rgba(30,30,30,0.85)";
      ctx.lineWidth = pm(0.1);
      for (let x = x0 + gap / 2; x < x1 - bw; x += gap) {
        ctx.fillRect(x, y0, bw, h);
        ctx.beginPath();
        ctx.rect(x, y0, bw, h);
        ln(x, y0, x + bw, y1);
        ln(x + bw, y0, x, y1);
        ctx.stroke();
      }
      break;
    }
    case "stones": {
      const r0 = Math.max(k * 25, pm(0.7));
      let i = 0;
      ctx.beginPath();
      for (let y = y0 + r0; y < y1; y += r0 * 2.2)
        for (let x = x0 + ((i++ % 3) * r0) / 1.5; x < x1; x += r0 * 2.6) {
          ctx.moveTo(x + r0 * 0.9, y);
          ctx.ellipse(x, y, r0 * 0.9, r0 * 0.6, (i % 5) * 0.6, 0, 7);
        }
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}
/* the layers that make up a timber zone (rafters, joists or studs with or without insulation between) */
const npsuIsZone = (l) =>
  ["pirb", "studins", "void", "timber"].includes(l.m) || /between/i.test(l.n || "");
/* timber size and centres from the words, e.g. "47 × 220 C24 joists at 400 c/c" */
function npsuTimbers(layers) {
  for (const l of layers) {
    const m = /(\d{2,3})\s*[×x]\s*(\d{2,3})/.exec(l.n || "");
    if (m) {
      const c = /at\s*(\d{3})\s*c\/c/i.exec(l.n || "");
      return { b: +m[1], d: +m[2], cc: c ? +c[1] : 400 };
    }
  }
  return { b: 47, d: 0, cc: 400 };
}
/* floors are cut across their joists unless set otherwise; walls and roofs run along their studs and rafters */
const npsuAcross = (o) =>
  o.ta == null ? /^(FF|GF)/.test(o.bc || "") || /floor|ceiling/i.test(o.bn || "") : !!o.ta;
/* draws the build-up along a line: P(t, off) maps along / across to the page */
function npsuDraw(ctx, o, P, L, lw) {
  const bu = o.bu && o.bu.length ? o.bu : npsuLayers("cavbrick");
  const k = ctx.__mm || 0.12;
  const O = P(0, 0),
    X = P(1, 0),
    Y = P(0, 1);
  const side = o.fl ? -1 : 1;
  const ink = ctx.strokeStyle;
  const pw = (mmP) => npsuPw(ctx, lw, mmP);
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
  /* at the eaves the ceiling lining (everything under the rafter zone) stops at the wall's inside face */
  const ev = poly && NPSU_EAVES.get(o);
  const ti = ev ? (ev.xi - O[0]) / (X[0] - O[0] || 1e-9) : 0;
  let lining = !!ev,
    tl = 0;
  const zoneOf = [];
  /* over a foundation the plaster stops at the floor and an outside finish (render) at the DPC */
  const fdn = poly && NPSU_FOUND.get(o);
  bu.forEach((l, li) => {
    if (lining && ["pirb", "studins", "void", "timber", "wool"].includes(l.m)) lining = false;
    let tA = lining ? (ev.er ? t0 : ti) : t0,
      tB = lining ? (ev.er ? ti : t1) : t1;
    const yc = fdn ? fdn.cut[li] : null;
    if (yc != null) {
      const dy = X[1] - O[1] || -1e-9,
        tc = (yc - O[1]) / dy;
      if (dy < 0) tA = Math.max(tA, tc);
      else tB = Math.min(tB, tc);
    }
    const M = NPSU_MATS[l.m] || ["", "", ""];
    if (npsuIsMem(l.m)) {
      ctx.save();
      ctx.strokeStyle = M[1];
      ctx.lineWidth = pw(M[2] === "m-thick" ? 0.6 : 0.4);
      if (M[2] === "m-dash") ctx.setLineDash([pw(2.4), pw(1.2)]);
      if (M[2] === "m-dashdot") ctx.setLineDash([pw(3), pw(0.9), pw(0.5), pw(0.9)]);
      ctx.beginPath();
      ctx.moveTo(tA, y);
      ctx.lineTo(tB, y);
      ctx.stroke();
      ctx.restore();
      mids.push(y);
      return;
    }
    const t = Math.max(+l.t || 0, 0) * k;
    if (!t) {
      mids.push(null);
      return;
    }
    if (lining) tl += t;
    const y0 = y - t;
    if (M[1]) {
      ctx.save();
      ctx.fillStyle = M[1];
      ctx.fillRect(tA, y0, tB - tA, t);
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    npsuPat(ctx, M[2], tA, y0, tB, y, lw, k);
    zoneOf.push([npsuIsZone(l), y0, y, tA, tB, l]);
    ctx.restore();
    ctx.save();
    ctx.lineWidth = pw(0.13);
    ctx.beginPath();
    ctx.moveTo(tA, y0);
    ctx.lineTo(tB, y0);
    ctx.stroke();
    ctx.restore();
    mids.push(y0 + t / 2);
    y = y0;
  });
  const total = -y;
  if (npsuAcross(o)) {
    /* group the zone layers that lie together, and draw each timber once through the group */
    const groups = [];
    zoneOf.forEach((z) => {
      const g = groups[groups.length - 1];
      if (z[0] && g && g.open && Math.abs(g.yTop - z[2]) < 1e-6) {
        g.yTop = z[1];
        g.ls.push(z[5]);
        g.tA = Math.max(g.tA, z[3]);
        g.tB = Math.min(g.tB, z[4]);
      } else if (z[0])
        groups.push({ open: true, yTop: z[1], yBot: z[2], tA: z[3], tB: z[4], ls: [z[5]] });
      else if (g) g.open = false;
    });
    groups.forEach((g) => {
      const tm = npsuTimbers(g.ls);
      const bw = tm.b * k,
        cc = Math.max(tm.cc * k, bw * 2);
      ctx.save();
      ctx.fillStyle = "#dcc4b4";
      ctx.strokeStyle = ink;
      for (let x = Math.ceil((g.tA - bw) / cc) * cc + cc / 2 - bw / 2; x < g.tB; x += cc) {
        ctx.fillRect(x, g.yTop, bw, g.yBot - g.yTop);
        ctx.lineWidth = pw(0.18);
        ctx.strokeRect(x, g.yTop, bw, g.yBot - g.yTop);
        ctx.lineWidth = pw(0.09);
        ctx.beginPath();
        ctx.moveTo(x, g.yTop);
        ctx.lineTo(x + bw, g.yBot);
        ctx.moveTo(x + bw, g.yTop);
        ctx.lineTo(x, g.yBot);
        ctx.stroke();
      }
      ctx.restore();
    });
  }
  const free = poly ? poly.free || [false, false] : [true, true];
  if (!poly) {
    ctx.lineWidth = pw(0.3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(L, 0);
    ctx.moveTo(0, -total);
    ctx.lineTo(L, -total);
    ctx.stroke();
  }
  ctx.restore();
  if (poly) {
    /* the joined outline: faces at full pen, the joint lines a little lighter */
    ctx.save();
    ctx.lineWidth = pw(0.3);
    ctx.beginPath();
    const evo = NPSU_EAVES.get(o),
      fdF = NPSU_FOUND.get(o);
    if (evo) {
      const u = [X[0] - O[0], X[1] - O[1]],
        w = [-(Y[0] - O[0]) * side, -(Y[1] - O[1]) * side];
      const Iw = npsuX(poly[0], u, [evo.xi, 0], [0, 1]) || poly[0];
      const inner = evo.er ? poly[0] : poly[1];
      ctx.moveTo(inner[0], inner[1]);
      ctx.lineTo(Iw[0], Iw[1]);
      /* the rafter zone's underside, out to the plumb cut */
      const Lz = npsuLiningDepth(bu) * k;
      const A2 = [Iw[0] + w[0] * Lz, Iw[1] + w[1] * Lz];
      const Pz = npsuX(A2, u, [evo.xp, 0], [0, 1]);
      if (Pz) {
        ctx.moveTo(A2[0], A2[1]);
        ctx.lineTo(Pz[0], Pz[1]);
      }
    } else {
      const ed = npsuFace(poly[0], poly[1], fdF ? (fdF.lineInner ? fdF.yIn : fdF.yOut) : null);
      if (ed) {
        ctx.moveTo(ed[0][0], ed[0][1]);
        ctx.lineTo(ed[1][0], ed[1][1]);
      }
    }
    const ed2 = npsuFace(poly[2], poly[3], fdF ? (fdF.lineInner ? fdF.yOut : fdF.yIn) : null);
    if (ed2) {
      ctx.moveTo(ed2[0][0], ed2[0][1]);
      ctx.lineTo(ed2[1][0], ed2[1][1]);
    }
    ctx.stroke();
    ctx.lineWidth = pw(0.18);
    ctx.beginPath();
    const eend = evo ? (evo.er ? 1 : 0) : -1;
    if (eend !== 1 && !free[1]) {
      ctx.moveTo(poly[1][0], poly[1][1]);
      ctx.lineTo(poly[2][0], poly[2][1]);
    }
    if (eend !== 0 && !free[0]) {
      ctx.moveTo(poly[3][0], poly[3][1]);
      ctx.lineTo(poly[0][0], poly[0][1]);
    }
    if (evo) {
      /* the plumb cut, from the rafter zone's underside to the top */
      const top = eend ? poly[2] : poly[3];
      const u = [X[0] - O[0], X[1] - O[1]],
        w = [-(Y[0] - O[0]) * side, -(Y[1] - O[1]) * side];
      const Lz = npsuLiningDepth(bu) * k,
        bot = eend ? poly[1] : poly[0];
      const Pz = npsuX([bot[0] + w[0] * Lz, bot[1] + w[1] * Lz], u, [evo.xp, 0], [0, 1]) || bot;
      ctx.moveTo(Pz[0], Pz[1]);
      ctx.lineTo(top[0], top[1]);
    }
    ctx.stroke();
    ctx.restore();
    const ev = NPSU_EAVES.get(o);
    if (ev) npsuEaves(ctx, ev, ev.er ? [poly[1], poly[2]] : [poly[0], poly[3]], lw);
    const fd = NPSU_FOUND.get(o);
    if (fd) npsuFound(ctx, fd, lw, o.lab);
    const us = NPSU_UPST.get(o);
    if (us) {
      ctx.save();
      ctx.fillStyle = NPSU_MATS.pir[1];
      ctx.fillRect(us.x0, us.y0, us.x1 - us.x0, us.y1 - us.y0);
      ctx.strokeStyle = ink;
      npsuPat(ctx, "hex", us.x0, us.y0, us.x1, us.y1, lw, k);
      ctx.lineWidth = pw(0.13);
      ctx.strokeRect(us.x0, us.y0, us.x1 - us.x0, us.y1 - us.y0);
      ctx.restore();
    }
  }
  /* page point for (along, up-from-line) in the build-up's own frame */
  const Q = (t, up) => P(t, -up * side);
  /* a loose end is broken off with a break line, as on a drawing that shows only part of something */
  [0, 1].forEach((e) => {
    if (!free[e]) return;
    const t = e ? L : 0,
      ext = pw(1.5),
      z = Math.min(pw(1.2), total * 0.25 + pw(0.4));
    const pts = [
      Q(t, -ext),
      Q(t, total * 0.42),
      Q(t + z, total * 0.47),
      Q(t - z, total * 0.53),
      Q(t, total * 0.58),
      Q(t, total + ext),
    ];
    ctx.save();
    ctx.lineWidth = pw(0.13);
    ctx.beginPath();
    pts.forEach((q2, i) => (i ? ctx.lineTo(q2[0], q2[1]) : ctx.moveTo(q2[0], q2[1])));
    ctx.stroke();
    ctx.restore();
  });
  const fs = ctx.__mm ? 2.5 * NP_U : Math.max(8, Math.min(lw * 5.5, 22));
  const txt = (s, x, y2, al, bold) => {
    ctx.save();
    ctx.fillStyle = ink;
    ctx.font = `${bold ? 700 : 400} ${bold ? fs * 1.05 : fs}px Helvetica, Arial, system-ui, sans-serif`;
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
    ctx.lineWidth = pw(0.13);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.font = `700 ${fs}px Helvetica, Arial, system-ui, sans-serif`;
    const tw = ctx.measureText(o.bc).width + fs * 0.8;
    ctx.fillStyle = "#e8f1fb";
    ctx.fillRect(b[0] - tw / 2, b[1] - fs * 0.75, tw, fs * 1.5);
    ctx.strokeStyle = "#1f4e8c";
    ctx.lineWidth = pw(0.25);
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
    ctx.lineWidth = pw(0.13);
    rows.forEach(([s2, m], i) => {
      const p = Q(at + i * (vertical ? gap : fs * 0.9), -m);
      const e = vertical
        ? Q(at + i * gap, total + fs * 2)
        : Q(at + i * fs * 0.9, total + fs * (1.5 + (n - 1 - i) * 1.35));
      /* an open arrowhead on the layer */
      const an = Math.atan2(p[1] - e[1], p[0] - e[0]),
        ah = pw(1.6);
      ctx.beginPath();
      ctx.moveTo(p[0] - ah * Math.cos(an - 0.3), p[1] - ah * Math.sin(an - 0.3));
      ctx.lineTo(p[0], p[1]);
      ctx.lineTo(p[0] - ah * Math.cos(an + 0.3), p[1] - ah * Math.sin(an + 0.3));
      ctx.stroke();
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
/* a pitched roof's eaves where it runs past a wall: { er (which end), xp (plumb cut), xo / xi (wall outer / inner face), sgn (outwards), lp, ld (roof underside), k } */
const NPSU_EAVES = new WeakMap();
/* a masonry wall's foundation where it stands on a ground floor: { type, xi, xo, sgn, yDPC, yGL, yTop (wall foot),
   yBot, width, depth, gl, k, spans [{m, x0, x1}] } – and the floor's edge insulation upstand { x0, x1, y0, y1 } */
const NPSU_FOUND = new WeakMap();
const NPSU_UPST = new WeakMap();
const npsuMasonry = (m) => m === "block" || m === "brick";
/* the part of a face from A to B that lies above the level yc (page y grows downwards); the whole face when yc is null */
function npsuFace(A, B, yc) {
  if (yc == null) return [A, B];
  const lo = A[1] > B[1] ? A : B,
    hi = lo === A ? B : A;
  if (hi[1] >= yc) return null;
  if (lo[1] <= yc) return [hi, lo];
  const t = (yc - hi[1]) / (lo[1] - hi[1]);
  return [hi, [hi[0] + (lo[0] - hi[0]) * t, yc]];
}
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
  F.forEach((f) => {
    NPSU_JOIN.delete(f.o);
    NPSU_EAVES.delete(f.o);
    NPSU_FOUND.delete(f.o);
    NPSU_UPST.delete(f.o);
  });
  if (F.length < 2) return;
  const cuts = new Map();
  const end = (f, e) => (e ? f.b : f.a);
  const off = (p, w, d) => [p[0] + w[0] * d, p[1] + w[1] * d];
  const cross = (f, g) => f.u[0] * g.u[1] - f.u[1] * g.u[0];
  /* foundations: an upright masonry wall standing on a ground floor carries on down past the floor to its
     foundation, and the floor stops at the wall's inside face */
  const kk0 = k || 0.12;
  const isGF = (h) =>
    Math.abs(h.u[1]) < 0.2 && (/^GF/.test(h.o.bc || "") || /ground floor/i.test(h.o.bn || ""));
  F.forEach((W, wi) => {
    if (Math.abs(W.u[0]) >= 0.2 || W.o.fd === "none") return;
    const wbu = W.o.bu && W.o.bu.length ? W.o.bu : npsuLayers("cavbrick");
    if (!wbu.some((l) => npsuMasonry(l.m))) return;
    const ew = W.a[1] > W.b[1] ? 0 : 1;
    const p = end(W, ew);
    F.forEach((G, gi) => {
      if (gi === wi || !isGF(G) || cuts.get(wi + ":" + ew)) return;
      const rel = [p[0] - G.a[0], p[1] - G.a[1]];
      const t = rel[0] * G.u[0] + rel[1] * G.u[1],
        d = rel[0] * G.w[0] + rel[1] * G.w[1];
      const tol = Math.max(W.T, 6);
      if (t < -tol - W.T || t > G.L + tol + W.T || d < -tol || d > G.T + tol) return;
      const wx = [W.a[0], W.a[0] + W.w[0] * W.T];
      const gc = (G.a[0] + G.b[0]) / 2,
        wc = (wx[0] + wx[1]) / 2;
      const sgn = gc < wc ? 1 : -1;
      const xi = sgn > 0 ? Math.min(...wx) : Math.max(...wx),
        xo = sgn > 0 ? Math.max(...wx) : Math.min(...wx);
      /* the floor's levels: DPM, insulation, screed and top */
      const gbu = G.o.bu && G.o.bu.length ? G.o.bu : [];
      const yl = (G.a[1] + G.b[1]) / 2,
        yAt = (mm) => yl + G.w[1] * mm * kk0;
      let cum = 0,
        dpm = null,
        struct = null,
        pirB = null,
        pirT = null,
        scr = null;
      gbu.forEach((l) => {
        const th = npsuIsMem(l.m) ? 0 : +l.t || 0;
        if (l.m === "dpm" && dpm == null) dpm = cum;
        if (l.m === "conc" || l.m === "bblock") struct = cum + th;
        if (l.m === "pir" && pirB == null) {
          pirB = cum;
          pirT = cum + th;
        }
        if (l.m === "screed") scr = cum + th;
        cum += th;
      });
      const yDPC = dpm != null ? yAt(dpm) : struct != null ? yAt(struct) : yAt(cum) + 150 * kk0;
      const gl = W.o.gl == null ? 150 : +W.o.gl,
        depth = W.o.fdd == null ? 1000 : +W.o.fdd,
        width = W.o.fdw == null ? 600 : +W.o.fdw,
        type = W.o.fd === "strip" ? "strip" : "trench";
      const yGL = yDPC + gl * kk0,
        yBot = yGL + Math.max(depth, 450) * kk0;
      const yTop =
        type === "trench" ? Math.min(yGL + 150 * kk0, yBot - 150 * kk0) : yBot - 225 * kk0;
      /* the wall's layers across the page */
      let c2 = 0;
      const spans = [];
      wbu.forEach((l) => {
        const th = npsuIsMem(l.m) ? 0 : +l.t || 0;
        if (th) {
          const xa = W.a[0] + W.w[0] * c2 * kk0,
            xb = W.a[0] + W.w[0] * (c2 + th) * kk0;
          spans.push({ m: l.m, x0: Math.min(xa, xb), x1: Math.max(xa, xb) });
        }
        c2 += th;
      });
      cuts.set(wi + ":" + ew, { p: [0, yTop], d: [1, 0] });
      /* finishes: layers inside the inner leaf stop at the floor, outside the outer leaf at the DPC */
      const lineInner = Math.abs(W.a[0] - xi) < 1e-6;
      const mIdx = wbu.map((l, i) => (npsuMasonry(l.m) ? i : -1)).filter((i) => i >= 0);
      const yFin = yAt(cum);
      const cut = wbu.map((l, i) =>
        i < mIdx[0]
          ? lineInner
            ? yFin
            : yDPC
          : i > mIdx[mIdx.length - 1]
            ? lineInner
              ? yDPC
              : yFin
            : null,
      );
      const hasThick = (a, b) => wbu.slice(a, b).some((l) => !npsuIsMem(l.m) && +l.t > 0);
      const lineHas = hasThick(0, mIdx[0]),
        farHas = hasThick(mIdx[mIdx.length - 1] + 1, wbu.length);
      const innerHas = lineInner ? lineHas : farHas,
        outerHas = lineInner ? farHas : lineHas;
      const mSp = spans.filter((sp) => npsuMasonry(sp.m));
      const xm =
        sgn > 0 ? Math.min(...mSp.map((sp) => sp.x0)) : Math.max(...mSp.map((sp) => sp.x1));
      const xmo =
        sgn > 0 ? Math.max(...mSp.map((sp) => sp.x1)) : Math.min(...mSp.map((sp) => sp.x0));
      const xs = innerHas ? xm : xi;
      const eg = (G.a[0] - xi) * sgn > (G.b[0] - xi) * sgn ? 0 : 1;
      if (!cuts.get(gi + ":" + eg) && (end(G, eg)[0] - xi) * sgn > -W.T - 6)
        cuts.set(gi + ":" + eg, { p: [xs, 0], d: [0, 1] });
      if (pirT != null)
        NPSU_UPST.set(G.o, {
          x0: Math.min(xs, xs - sgn * 25 * kk0),
          x1: Math.max(xs, xs - sgn * 25 * kk0),
          y0: Math.min(yAt(pirT), yAt(scr != null ? scr : cum)),
          y1: Math.max(yAt(pirT), yAt(scr != null ? scr : cum)),
        });
      NPSU_FOUND.set(W.o, {
        type,
        xi,
        xo,
        sgn,
        yDPC,
        yGL,
        yTop,
        yBot,
        width,
        depth,
        gl,
        k: kk0,
        spans,
        cut,
        lineInner,
        yIn: innerHas ? yFin : null,
        yOut: outerHas ? yDPC : null,
        xm,
        xmo,
      });
    });
  });
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
          /* a sloping roof meeting the head of an upright wall: eaves, unless the overhang is set to 0 */
          const up = (h) => Math.abs(h.u[0]) < 0.2,
            slope = (h) => Math.abs(h.u[0]) >= 0.2 && Math.abs(h.u[1]) >= 0.2;
          const pair =
            up(f) && slope(g)
              ? [f, ef, i, g, eg, j]
              : up(g) && slope(f)
                ? [g, eg, j, f, ef, i]
                : null;
          if (pair && pair[3].o.eo !== 0) {
            const [W, ew, wi, R, er, ri] = pair;
            const kk = k || 0.12;
            const ov = (pair[3].o.eo == null ? 300 : +pair[3].o.eo) * kk;
            const wx = [W.a[0], W.a[0] + W.w[0] * W.T];
            const rfar = end(R, 1 - er);
            const sgn = rfar[0] > (wx[0] + wx[1]) / 2 ? -1 : 1;
            const xo = sgn > 0 ? Math.max(...wx) : Math.min(...wx),
              xi = sgn > 0 ? Math.min(...wx) : Math.max(...wx);
            const xp = xo + sgn * ov;
            /* the wall stops at the roof's underside: the face of the roof nearer the wall's foot */
            const wfoot = end(W, 1 - ew);
            const df = (wfoot[0] - R.a[0]) * R.w[0] + (wfoot[1] - R.a[1]) * R.w[1];
            const lp = off(R.a, R.w, df < R.T / 2 ? npsuLiningDepth(R.o.bu || []) * kk : R.T);
            cuts.set(wi + ":" + ew, { p: lp, d: R.u });
            cuts.set(ri + ":" + er, { p: [xp, 0], d: [0, 1] });
            NPSU_EAVES.set(R.o, { er, xp, xo, xi, sgn, lp, ld: R.u, k: kk });
            return;
          }
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
    const pl = [I0, I1, O1, O0];
    pl.free = [!ca, !cb];
    NPSU_JOIN.set(f.o, pl);
  });
}
/* the foundation under a masonry wall: ground level outside, the concrete trench fill (or strip), lean-mix
   concrete in the cavity to 225 mm below the DPC, and the DPC in each leaf; notes when the wall is labelled */
function npsuFound(ctx, f, lw, lab) {
  const { type, xi, xo, sgn, yDPC, yGL, yTop, yBot, width, depth, gl, k, spans } = f;
  const pw = (mmP) => npsuPw(ctx, lw, mmP);
  const ink = ctx.strokeStyle;
  ctx.save();
  /* the ground outside: a line at ground level with a band of earth hatching under it */
  const gLen = Math.min(600 * k, pw(30)),
    gx0 = Math.min(xo, xo + sgn * gLen),
    gx1 = Math.max(xo, xo + sgn * gLen),
    band = pw(2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(gx0, yGL, gx1 - gx0, band);
  ctx.clip();
  ctx.strokeStyle = "rgba(60,45,30,0.7)";
  ctx.lineWidth = pw(0.1);
  ctx.beginPath();
  for (let x = gx0 - band; x < gx1 + band; x += pw(1)) {
    ctx.moveTo(x, yGL + band);
    ctx.lineTo(x + band, yGL);
  }
  ctx.stroke();
  ctx.restore();
  ctx.lineWidth = pw(0.3);
  ctx.beginPath();
  ctx.moveTo(gx0, yGL);
  ctx.lineTo(gx1, yGL);
  ctx.stroke();
  /* the foundation concrete, centred on the wall */
  const xc = (xi + xo) / 2,
    fx0 = xc - (width * k) / 2,
    fx1 = xc + (width * k) / 2,
    fTop = type === "trench" ? yTop : yBot - 225 * k;
  ctx.fillStyle = NPSU_MATS.conc[1];
  ctx.fillRect(fx0, fTop, fx1 - fx0, yBot - fTop);
  ctx.strokeStyle = ink;
  npsuPat(ctx, "conc", fx0, fTop, fx1, yBot, lw, k);
  ctx.lineWidth = pw(0.3);
  ctx.strokeRect(fx0, fTop, fx1 - fx0, yBot - fTop);
  /* the cavity: the layers between the two masonry leaves, filled with lean-mix below ground */
  const mi = spans.map((sp, i) => (npsuMasonry(sp.m) ? i : -1)).filter((i) => i >= 0);
  const yCF = yDPC + 225 * k;
  let cav = null;
  if (mi.length >= 2 && mi[mi.length - 1] - mi[0] > 1) {
    const inner = spans.slice(mi[0] + 1, mi[mi.length - 1]);
    cav = [Math.min(...inner.map((x) => x.x0)), Math.max(...inner.map((x) => x.x1))];
    if (yTop > yCF) {
      ctx.fillStyle = "#dedede";
      ctx.fillRect(cav[0], yCF, cav[1] - cav[0], yTop - yCF);
      npsuPat(ctx, "conc", cav[0], yCF, cav[1], yTop, lw, k);
      ctx.lineWidth = pw(0.13);
      ctx.strokeRect(cav[0], yCF, cav[1] - cav[0], yTop - yCF);
    }
  }
  /* the masonry faces below where the plaster and render stop */
  ctx.lineWidth = pw(0.3);
  ctx.beginPath();
  if (f.yIn != null) {
    ctx.moveTo(f.xm, f.yIn);
    ctx.lineTo(f.xm, yTop);
  }
  if (f.yOut != null) {
    ctx.moveTo(f.xmo, f.yOut);
    ctx.lineTo(f.xmo, yTop);
  }
  ctx.stroke();
  /* the DPC: a bold blue dashed line through each masonry leaf */
  ctx.save();
  ctx.strokeStyle = NPSU_MATS.dpc[1];
  ctx.lineWidth = pw(0.45);
  ctx.setLineDash([pw(2.4), pw(1.2)]);
  ctx.beginPath();
  mi.forEach((i) => {
    ctx.moveTo(spans[i].x0, yDPC);
    ctx.lineTo(spans[i].x1, yDPC);
  });
  ctx.stroke();
  ctx.restore();
  if (lab) {
    const fs = ctx.__mm ? 2.5 * NP_U : Math.max(8, Math.min(lw * 5.5, 22)),
      gap = fs * 1.35;
    const outer = mi.length ? spans[mi[sgn > 0 ? mi.length - 1 : 0]] : null;
    const rows = [
      outer && [
        (outer.x0 + outer.x1) / 2,
        yDPC,
        `DPC min. ${Math.round(gl)} mm above ground, lapped with the floor DPM`,
      ],
      [xo + sgn * gLen * 0.7, yGL, "Ground level"],
      cav &&
        yTop > yCF && [
          (cav[0] + cav[1]) / 2,
          (yCF + yTop) / 2,
          "Cavity filled with lean-mix concrete to 225 mm below DPC",
        ],
      [
        xc,
        (fTop + yBot) / 2,
        type === "trench"
          ? `Concrete trench fill, ${Math.round(width)} wide, min. ${Math.round(depth)} below ground`
          : `${Math.round(width)} × 225 concrete strip, min. ${Math.round(depth)} below ground`,
      ],
    ].filter(Boolean);
    const ex = xo + sgn * (gLen + fs * 0.8);
    let last = -1e9;
    ctx.lineWidth = pw(0.13);
    ctx.fillStyle = ink;
    ctx.font = `400 ${fs}px Helvetica, Arial, system-ui, sans-serif`;
    ctx.textAlign = sgn > 0 ? "left" : "right";
    ctx.textBaseline = "middle";
    rows.forEach(([px, py, t]) => {
      const ry = Math.max(py, last + gap);
      last = ry;
      const an = Math.atan2(py - ry, px - ex),
        ah = pw(1.6);
      ctx.beginPath();
      ctx.moveTo(px - ah * Math.cos(an - 0.3), py - ah * Math.sin(an - 0.3));
      ctx.lineTo(px, py);
      ctx.lineTo(px - ah * Math.cos(an + 0.3), py - ah * Math.sin(an + 0.3));
      ctx.moveTo(px, py);
      ctx.lineTo(ex, ry);
      ctx.lineTo(ex + sgn * fs * 0.6, ry);
      ctx.stroke();
      ctx.fillText(t, ex + sgn * fs * 0.9, ry);
    });
    if (type === "trench" || type === "strip") {
      ctx.fillStyle = "#555555";
      ctx.fillText(
        "Depth and width to Building Control's approval on site",
        ex + sgn * fs * 0.9,
        last + gap,
      );
    }
  }
  ctx.restore();
}
/* how deep the ceiling lining is (mm): the layers under the rafter zone */
function npsuLiningDepth(bu) {
  let d = 0;
  for (const l of bu) {
    if (["pirb", "studins", "void", "timber", "wool"].includes(l.m)) break;
    if (!npsuIsMem(l.m)) d += +l.t || 0;
  }
  return d;
}
/* the eaves: wall plate on the wall head, fascia on the plumb cut, soffit back to the wall, gutter,
   over-fascia vent – drawn at real sizes (k = page units per mm) */
function npsuEaves(ctx, e, ends, lw) {
  const { xp, xo, xi, sgn, lp, ld, k } = e;
  const ys = ends.map((p) => p[1]);
  const yTop = Math.min(...ys),
    yLow = Math.max(...ys);
  const R = (x0, y0, x1, y1, fill) => {
    const x = Math.min(x0, x1),
      y = Math.min(y0, y1),
      w = Math.abs(x1 - x0),
      h = Math.abs(y1 - y0);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
    }
    ctx.strokeRect(x, y, w, h);
  };
  const cross = (x0, y0, x1, y1) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.moveTo(x0, y1);
    ctx.lineTo(x1, y0);
    ctx.stroke();
  };
  const under = (x) => lp[1] + (ld[1] * (x - lp[0])) / (ld[0] || 1e-9);
  ctx.save();
  ctx.lineWidth = npsuPw(ctx, lw, 0.18);
  /* fascia: 22 thick, from just under the covering down past the underside */
  const fT = 22 * k,
    fTop = yTop + (yLow - yTop) * 0.35,
    fBot = yLow + 60 * k;
  R(xp, fTop, xp + sgn * fT, fBot, "#dcc4b4");
  /* soffit: 12 board back to the wall at the bottom of the fascia */
  R(xo, fBot - 12 * k, xp, fBot, "#dcc4b4");
  /* soffit vent gap: dashed, 10 mm from the wall */
  ctx.save();
  ctx.setLineDash([npsuPw(ctx, lw, 0.8), npsuPw(ctx, lw, 0.6)]);
  ctx.beginPath();
  ctx.moveTo(xo + sgn * 15 * k, fBot - 6 * k);
  ctx.lineTo(xo + sgn * 40 * k, fBot - 6 * k);
  ctx.stroke();
  ctx.restore();
  /* over-fascia vent on top of the fascia */
  R(xp, fTop - 10 * k, xp + sgn * fT, fTop, "#374151");
  /* half-round gutter on brackets off the fascia */
  const gr = 57 * k,
    gx = xp + sgn * (fT + gr + 5 * k),
    gy = fTop + 25 * k;
  ctx.beginPath();
  ctx.arc(gx, gy, gr, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle = "#c7cbd1";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(xp + sgn * fT, gy);
  ctx.lineTo(gx + sgn * gr, gy);
  ctx.stroke();
  /* wall plate: 100 × 50 on the wall head, under the roof */
  const wx0 = xi + sgn * 10 * k,
    wx1 = wx0 + sgn * 100 * k,
    wTop = Math.max(under(wx0), under(wx1));
  ctx.lineWidth = npsuPw(ctx, lw, 0.13);
  R(wx0, wTop, wx1, wTop + 50 * k, "#dcc4b4");
  cross(wx0, wTop, wx1, wTop + 50 * k);
  ctx.restore();
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
  /* foundations under the walls, one entry for each kind */
  let n = 0;
  const fds = new Map();
  objs.forEach((o) => {
    const f = o.k === "secbu" && NPSU_FOUND.get(o);
    if (!f) return;
    const key = [f.type, f.width, f.depth, f.gl].join();
    if (fds.has(key)) return;
    fds.set(key, [
      "FD" + String(++n).padStart(2, "0"),
      f.type === "trench" ? "Foundation: concrete trench fill" : "Foundation: concrete strip",
      [
        f.type === "trench"
          ? `Concrete trench fill ${Math.round(f.width)} wide, min. ${Math.round(f.depth)} below ground`
          : `${Math.round(f.width)} × 225 concrete strip, min. ${Math.round(f.depth)} below ground`,
        "Depth and width to Building Control's approval on site",
        "Dense concrete blockwork / frost-resistant brick below DPC",
        "Cavity filled with lean-mix concrete to 225 mm below DPC",
        `DPC min. ${Math.round(f.gl)} mm above ground, lapped with floor DPM`,
      ],
      null,
    ]);
  });
  return [...seen.values()].sort((a, b) => a[0].localeCompare(b[0])).concat([...fds.values()]);
}
