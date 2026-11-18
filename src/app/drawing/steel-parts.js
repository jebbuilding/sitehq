/* ================= STEEL PARTS: beam types and sizes, post and column types for drawings ================= */
export { NP_BEAM_TYPES, NP_COL_TYPES, npBeamLabel, npBeamOf, npBeamSecs, npColDraw, npColMm };
/* James (Nov 2026): "in RSJ I need to pick the type of beam and size it is and be able to put different types of
   posts or columns in". A beam on a drawing keeps its type (o.bt) and size (o.sec, the words shown on the drawing
   and in the beam schedule); a post or column keeps its type (o.ct) and size (o.cs) and is drawn the way that kind
   of post is usually shown on a plan. Weights (kg per metre) are the usual published figures for UK sections, for
   the steel total only – the engineer's calcs always win. Timber, glulam, LVL and concrete count no steel. */
const NP_BEAM_TYPES = [
  [
    "UB",
    "Steel beam (UB)",
    [
      ["127×76×13", 13],
      ["152×89×16", 16],
      ["178×102×19", 19],
      ["203×102×23", 23.1],
      ["203×133×25", 25.1],
      ["203×133×30", 30],
      ["254×102×22", 22],
      ["254×102×25", 25.2],
      ["254×102×28", 28.3],
      ["254×146×31", 31.1],
      ["254×146×37", 37],
      ["254×146×43", 43],
      ["305×102×25", 24.8],
      ["305×102×28", 28.2],
      ["305×102×33", 32.8],
      ["305×127×37", 37],
      ["305×127×42", 41.9],
      ["305×165×40", 40.3],
      ["305×165×46", 46.1],
      ["356×127×33", 33.1],
      ["356×171×45", 45],
      ["356×171×51", 51],
      ["406×140×39", 39],
      ["406×178×54", 54.1],
    ],
  ],
  [
    "UC",
    "Steel column used as a beam (UC)",
    [
      ["152×152×23", 23],
      ["152×152×30", 30],
      ["152×152×37", 37],
      ["203×203×46", 46.1],
      ["203×203×52", 52],
      ["203×203×60", 60],
      ["254×254×73", 73.1],
    ],
  ],
  [
    "RSJ",
    "RSJ (joist, sloping flanges)",
    [
      ["102×44×7", 7.5],
      ["127×76×13", 13],
      ["152×127×37", 37.3],
      ["203×152×52", 52.3],
      ["254×203×82", 81.9],
    ],
  ],
  [
    "PFC",
    "Steel channel (PFC)",
    [
      ["100×50", 10.2],
      ["125×65", 14.8],
      ["150×75", 17.9],
      ["150×90", 23.9],
      ["180×75", 20.3],
      ["180×90", 26.1],
      ["200×75", 23.4],
      ["200×90", 29.7],
      ["230×75", 25.7],
      ["230×90", 32.2],
      ["260×75", 27.6],
      ["260×90", 34.8],
      ["300×90", 41.4],
    ],
  ],
  [
    "2PFC",
    "Box beam (2 channels bolted)",
    [
      ["2 × 150×75", 35.8],
      ["2 × 180×75", 40.6],
      ["2 × 200×90", 59.4],
      ["2 × 230×90", 64.4],
    ],
  ],
  [
    "SHS",
    "Box section (SHS)",
    [
      ["100×100×5", 14.7],
      ["100×100×6.3", 18.2],
      ["120×120×6.3", 22.3],
      ["150×150×6.3", 28.1],
      ["150×150×8", 35.4],
    ],
  ],
  [
    "RHS",
    "Box section (RHS)",
    [
      ["120×80×6.3", 18.2],
      ["150×100×6.3", 23.9],
      ["200×100×6.3", 28.1],
      ["200×100×8", 35.4],
      ["250×150×8", 48.0],
    ],
  ],
  [
    "Flitch",
    "Flitch beam (timber + steel plate)",
    [
      ["2 × 47×200 + 10 plate", 15.7],
      ["2 × 47×225 + 10 plate", 17.7],
      ["2 × 75×225 + 12 plate", 21.2],
    ],
  ],
  [
    "Glulam",
    "Glulam",
    [
      ["90×225", 0],
      ["90×270", 0],
      ["115×270", 0],
      ["115×315", 0],
      ["140×360", 0],
    ],
  ],
  [
    "LVL",
    "LVL (laminated timber)",
    [
      ["45×200", 0],
      ["45×240", 0],
      ["2 × 45×240", 0],
      ["2 × 45×300", 0],
    ],
  ],
  [
    "C24",
    "Timber (C24)",
    [
      ["47×150", 0],
      ["47×175", 0],
      ["47×200", 0],
      ["47×225", 0],
      ["2 × 47×200", 0],
      ["2 × 47×225", 0],
      ["3 × 47×225", 0],
      ["75×225", 0],
    ],
  ],
  [
    "Lintel",
    "Steel lintel",
    [
      ["Cavity wall, standard", 0],
      ["Cavity wall, heavy", 0],
      ["Solid wall", 0],
      ["Box lintel", 0],
    ],
  ],
  [
    "Conc",
    "Concrete lintel",
    [
      ["100×65", 0],
      ["100×140", 0],
      ["100×215", 0],
      ["140×215", 0],
    ],
  ],
  ["Eng", "To engineer's design", [["See engineer's calcs", 0]]],
];
/* the words shown for a size of a type, e.g. "203×133×25 UB", "47×200 C24", "Steel lintel – solid wall" */
function npBeamLabel(t, size) {
  const T = NP_BEAM_TYPES.find((x) => x[0] === t);
  if (!T) return size || "";
  if (t === "Eng") return "To engineer's design";
  if (t === "Lintel") return "Steel lintel – " + size.charAt(0).toLowerCase() + size.slice(1);
  if (t === "Conc") return size + " concrete lintel";
  if (t === "2PFC") return size + " PFC box";
  if (t === "Flitch") return size + " flitch";
  return size + " " + t;
}
/* every size of every type, as [words, kg per metre] – the beam schedule's list */
const npBeamSecs = () =>
  [].concat(...NP_BEAM_TYPES.map(([t, , L]) => L.map(([z, kg]) => [npBeamLabel(t, z), kg])));
/* which type and size some words are (for beams drawn before types existed) */
function npBeamOf(sec) {
  for (const [t, , L] of NP_BEAM_TYPES)
    for (const [z] of L) if (npBeamLabel(t, z) === sec) return [t, z];
  const old = {
    "Box beam (2 × PFC, see engineer)": "2PFC",
    "Flitch beam (see engineer)": "Flitch",
    "Glulam (see engineer)": "Glulam",
    "To engineer's design": "Eng",
  }[sec];
  return old ? [old, ""] : ["", ""];
}
const NP_COL_TYPES = [
  [
    "uc",
    "Steel column (UC)",
    ["152×152×23", "152×152×30", "152×152×37", "203×203×46", "203×203×52"],
  ],
  [
    "shs",
    "Steel box post (SHS)",
    ["80×80×5", "90×90×5", "100×100×5", "100×100×6.3", "120×120×6.3", "150×150×6.3"],
  ],
  ["chs", "Round steel post (CHS)", ["76×3.2", "89×3.2", "114×3.6", "140×5"]],
  ["timber", "Timber post", ["100×100", "125×125", "150×150", "200×200"]],
  ["oak", "Oak post", ["150×150", "200×200", "250×250"]],
  ["brick", "Brick pier", ["215×215", "327×327", "440×440", "440×215"]],
  ["block", "Block pier", ["440×215", "440×440"]],
  ["conc", "Concrete column", ["200×200", "250×250", "300×300"]],
  ["prop", "Adjustable steel prop (temporary)", ["Size 0", "Size 1", "Size 2", "Size 3", "Size 4"]],
];
/* how big a post is on plan (mm), from its size words */
function npColMm(ct, cs) {
  if (ct === "prop") return [150, 150];
  const m = String(cs || "").match(/^(\d+(?:\.\d+)?)(?:×(\d+(?:\.\d+)?))?/);
  if (!m) return null;
  const a = +m[1];
  if (ct === "chs") return [a, a];
  const b = ct === "uc" || ct === "shs" || !m[2] ? a : +m[2];
  return [a, ct === "uc" ? Math.round(a * 1.0) : b];
}
const npColLabel = (ct, cs) => {
  const T = NP_COL_TYPES.find((x) => x[0] === ct);
  if (!T) return "";
  const short = {
    uc: "UC",
    shs: "SHS",
    chs: "CHS",
    timber: "timber",
    oak: "oak",
    brick: "brick pier",
    block: "block pier",
    conc: "concrete",
    prop: "prop",
  }[ct];
  return ct === "prop"
    ? "Prop " + String(cs || "").replace("Size ", "No. ")
    : (cs ? cs + " " : "") + short;
};
/* a post or column drawn on plan the usual way for its type; returns false when it has no type (drawn as before) */
function npColDraw(ctx, o, x0, y0, w, h, cx, cy) {
  const ct = o.ct;
  if (!ct) return false;
  const lw = ctx.lineWidth,
    m = Math.min(w, h),
    x1 = x0 + w,
    y1 = y0 + h;
  const ln = (a, b, c, d) => {
    ctx.beginPath();
    ctx.moveTo(a, b);
    ctx.lineTo(c, d);
    ctx.stroke();
  };
  const hatch = (step, both) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, w, h);
    ctx.clip();
    ctx.lineWidth = Math.max(lw * 0.45, 0.5);
    for (let x = x0 - h; x < x1; x += step) ln(x, y1, x + h, y0);
    if (both) for (let x = x0; x < x1 + h; x += step) ln(x, y1, x - h, y0);
    ctx.restore();
  };
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle;
  if (ct === "uc") {
    /* an H: two flanges and the web */
    const tf = Math.max(m * 0.12, lw),
      tw = Math.max(m * 0.08, lw * 0.8);
    ctx.fillRect(x0, y0, w, tf);
    ctx.fillRect(x0, y1 - tf, w, tf);
    ctx.fillRect(cx - tw / 2, y0, tw, h);
  } else if (ct === "shs") {
    const t = Math.max(m * 0.1, lw);
    ctx.beginPath();
    ctx.rect(x0, y0, w, h);
    ctx.rect(x0 + t, y0 + t, w - 2 * t, h - 2 * t);
    ctx.fill("evenodd");
  } else if (ct === "chs") {
    const r = m / 2,
      t = Math.max(m * 0.1, lw);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 7);
    ctx.arc(cx, cy, Math.max(0.5, r - t), 0, 7, true);
    ctx.fill();
  } else if (ct === "timber" || ct === "oak") {
    ctx.strokeRect(x0, y0, w, h);
    ln(x0, y0, x1, y1);
    ln(x1, y0, x0, y1);
    if (ct === "oak") ctx.strokeRect(x0 + m * 0.15, y0 + m * 0.15, w - m * 0.3, h - m * 0.3);
  } else if (ct === "brick" || ct === "block") {
    ctx.strokeRect(x0, y0, w, h);
    hatch(Math.max(m / (ct === "brick" ? 7 : 4), lw * 2), ct === "block");
  } else if (ct === "conc") {
    ctx.strokeRect(x0, y0, w, h);
    const st = Math.max(m / 6, lw * 2);
    for (let y = y0 + st / 2, r = 0; y < y1; y += st, r++)
      for (let x = x0 + st / 2 + (r % 2 ? st / 2 : 0); x < x1; x += st) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(lw * 0.5, 0.6), 0, 7);
        ctx.fill();
      }
  } else if (ct === "prop") {
    ctx.setLineDash([lw * 2, lw * 2]);
    ctx.beginPath();
    ctx.arc(cx, cy, m / 2, 0, 7);
    ctx.stroke();
    ctx.setLineDash([]);
    ln(cx - m / 2, cy, cx + m / 2, cy);
    ln(cx, cy - m / 2, cx, cy + m / 2);
  }
  ctx.restore();
  /* its size under it */
  const t = npColLabel(ct, o.cs);
  if (t) {
    const fs = Math.max(16, Math.min(m * 0.45, 26));
    ctx.save();
    ctx.font = `600 ${fs}px system-ui,-apple-system,sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(t, cx, y1 + fs * 0.3);
    ctx.restore();
  }
  return true;
}
