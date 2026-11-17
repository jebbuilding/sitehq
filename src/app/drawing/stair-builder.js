/* ================= STAIR BUILDER: a stair designed step by step – type, sizes, steps, materials, balustrade, Part K checks, quantities ================= */
export {
  NPSB_BAL,
  NPSB_GLASSFIX,
  NPSB_RAIL,
  NPSB_TREADS,
  NPSB_TYPES,
  NPSB_USE,
  npsbCalc,
  npsbOrderText,
};
/* James (Nov 2026): "I need to add a stair builder like StairBox, but I need to add external metal stairs, spiral and
   glass rail, and all types of everything with stairs". This file is the working out (drawing/paving.js shows the
   builder): the best number of steps for the floor-to-floor height, the rise and going, the pitch, the checks
   against Approved Document K for the use picked, what it needs (treads, risers, strings, newels, handrail,
   spindles or glass), and the order for the joiner or fabricator. Every figure is a guide: the stair maker, the
   engineer for steel, and building control have the last word. Sizes in mm. */
const NPSB_TYPES = [
  ["straight", "Straight", "▭"],
  ["quarter", "L-shape, quarter landing", "┗"],
  ["quarterW", "L-shape, winders", "◺"],
  ["half", "U / dog-leg, half landing", "⊓"],
  ["halfW", "U / dog-leg, winders", "◠"],
  ["spiral", "Spiral", "◎"],
  ["ext", "External steel, straight", "🏗"],
  ["extDog", "External steel, dog-leg with landing", "🏗"],
  ["loft", "Loft / space saver (alternating treads)", "⇵"],
];
/* Approved Document K limits for each use (rise max, going min, 2R+G range, steepest pitch) */
const NPSB_USE = {
  private: {
    name: "Private stair (in a house)",
    rMax: 220,
    rMin: 150,
    gMin: 220,
    two: [550, 700],
    pitch: 42,
    guard: 900,
  },
  utility: {
    name: "Utility stair (e.g. escape, external to flats)",
    rMax: 190,
    rMin: 150,
    gMin: 250,
    two: [550, 700],
    pitch: 0,
    guard: 900,
  },
  general: {
    name: "General access (public / shared building)",
    rMax: 170,
    rMin: 150,
    gMin: 250,
    two: [550, 700],
    pitch: 0,
    guard: 900,
  },
};
const NPSB_TREADS = [
  ["pine", "Softwood (pine)"],
  ["oak", "Oak"],
  ["mdf", "MDF, to be carpeted"],
  ["oakcap", "Oak cladding over the old treads"],
  ["grating", "Steel open grating (galvanised)"],
  ["chequer", "Steel chequer plate"],
  ["concrete", "Precast concrete"],
  ["glass", "Laminated glass treads"],
];
const NPSB_BAL = [
  ["spindles", "Spindles (timber)"],
  ["metal", "Metal spindles / bars"],
  ["glass", "Glass panels"],
  ["cable", "Stainless cable / wire"],
  ["panel", "Solid panel / dwarf wall"],
  ["none", "None (walls both sides, handrail only)"],
];
const NPSB_GLASSFIX = [
  ["channel", "Frameless in a base channel"],
  ["clamps", "Clamps to the string"],
  ["standoff", "Stand-off pins through the glass"],
  ["posts", "Between posts"],
];
const NPSB_RAIL = [
  ["pine", "Softwood"],
  ["oak", "Oak"],
  ["stainless", "Stainless steel"],
  ["steel", "Powder-coated steel"],
  ["none", "No top rail (glass only)"],
];
/* the steps: the number of risers whose rise and going best suit the use (2R + G nearest 620, within the limits),
   or the number asked for */
function npsbSteps(c) {
  const U = NPSB_USE[c.use] || NPSB_USE.private;
  const ftf = Math.max(300, +c.ftf || 2600);
  const fit = (n) => {
    const r = ftf / n;
    let g = +c.going > 0 ? +c.going : Math.min(300, Math.max(U.gMin, 620 - 2 * r));
    if (c.type === "loft") g = +c.going > 0 ? +c.going : 220;
    return { n, rise: r, going: g };
  };
  if (+c.n > 0) return fit(+c.n);
  let best = null;
  for (let n = Math.ceil(ftf / U.rMax); n <= Math.ceil(ftf / U.rMin) + 2; n++) {
    const f = fit(n),
      two = 2 * f.rise + f.going,
      pitch = (Math.atan(f.rise / f.going) * 180) / Math.PI;
    const okAll =
      f.rise <= U.rMax &&
      two >= U.two[0] &&
      two <= U.two[1] &&
      (!U.pitch || pitch <= U.pitch || c.type === "loft");
    const sc = Math.abs(two - 620) + (okAll ? 0 : 1000);
    if (!best || sc < best.sc) best = Object.assign(f, { sc });
  }
  return best || fit(Math.ceil(ftf / U.rMax));
}
/* everything worked out for a design */
function npsbCalc(c0) {
  const c = Object.assign(
    {
      type: "straight",
      use: "private",
      ftf: 2600,
      width: 860,
      open: 1,
      tread: "pine",
      risers: "closed",
      bal: "spindles",
      rail: "pine",
      glassFix: "channel",
      head: 0,
      dia: 1600,
      turn: 360,
    },
    c0 || {},
  );
  const U = NPSB_USE[c.use] || NPSB_USE.private;
  const { n, rise, going } = npsbSteps(c);
  const steel = c.type === "ext" || c.type === "extDog";
  const spiral = c.type === "spiral";
  const treads = n - 1;
  const pitch = (Math.atan(rise / going) * 180) / Math.PI;
  const two = 2 * rise + going;
  const W = +c.width || 860;
  /* the footprint and the flights */
  let run,
    foot,
    flights,
    newels,
    landing = 0;
  if (spiral) {
    run = 0;
    foot = [c.dia, c.dia];
    flights = [treads];
    newels = 1;
  } else if (c.type === "quarter") {
    const a = Math.ceil(treads / 2) - 1,
      b = treads - a - 1;
    flights = [a, b];
    run = (a + b) * going;
    foot = [a * going + W, b * going + W];
    newels = 3;
    landing = W;
  } else if (c.type === "quarterW") {
    const a = Math.ceil((treads - 3) / 2),
      b = treads - 3 - a;
    flights = [a + 3, b];
    run = (a + b) * going;
    foot = [a * going + W, b * going + W];
    newels = 3;
  } else if (c.type === "half" || c.type === "extDog") {
    const a = Math.ceil((treads - 1) / 2),
      b = treads - 1 - a;
    flights = [a, b];
    run = (a + b) * going;
    foot = [Math.max(a, b) * going + W, 2 * W + 100];
    newels = 4;
    landing = 2 * W + 100;
  } else if (c.type === "halfW") {
    const a = Math.ceil((treads - 6) / 2),
      b = treads - 6 - a;
    flights = [a + 3, b + 3];
    run = (a + b) * going;
    foot = [Math.max(a, b) * going + W, 2 * W + 100];
    newels = 4;
  } else {
    flights = [treads];
    run = treads * going;
    foot = [run, W];
    newels = 2;
  }
  /* how long the flights are along the slope */
  const slope = flights.reduce((s, f) => s + Math.hypot(f * going, f * rise), 0);
  const spiralSlope = spiral ? Math.hypot(Math.PI * c.dia * 0.6 * (c.turn / 360), +c.ftf) : 0;
  const railLen = Math.round(spiral ? spiralSlope : slope);
  const openSides = spiral ? 1 : Math.max(0, Math.min(2, +c.open));
  const balLen = Math.round(railLen * openSides + (landing && openSides ? landing : 0));
  const guard = steel ? 1100 : U.guard;
  /* the checks */
  const ck = [];
  const add = (ok, t) => ck.push({ ok, t });
  add(
    rise <= U.rMax && rise >= (c.type === "loft" ? 0 : U.rMin),
    `Rise ${Math.round(rise)} mm (${U.rMin}–${U.rMax} for a ${U.name.toLowerCase()})`,
  );
  if (!spiral) {
    add(going >= U.gMin && going <= 400, `Going ${Math.round(going)} mm (at least ${U.gMin})`);
    add(
      two >= U.two[0] && two <= U.two[1],
      `2 × rise + going = ${Math.round(two)} mm (${U.two[0]}–${U.two[1]})`,
    );
    if (U.pitch && c.type !== "loft")
      add(pitch <= U.pitch, `Pitch ${Math.round(pitch)}° (no steeper than ${U.pitch}°)`);
  } else
    add(
      true,
      `Spiral: the maker checks the going and walking line to BS 5395-2 – ${c.dia} mm across, turning ${c.turn}°`,
    );
  if (c.type === "loft")
    add(
      true,
      "Alternating tread stair: only to one habitable room in a loft, with handrails both sides and slip-resistant treads",
    );
  if (+c.head > 0) {
    const need = c.type === "loft" ? 1900 : 2000;
    add(
      +c.head >= need,
      `Headroom ${c.head} mm (at least ${need}${c.type === "loft" ? "; 1800 at the side in a loft conversion" : ""})`,
    );
  } else
    add(
      null,
      "Headroom: measure it – 2000 mm above the pitch line (less is allowed in a loft conversion)",
    );
  add(
    true,
    `Handrail 900–1000 mm above the pitch line${W > 1000 ? ", both sides (the stair is wider than 1 m)" : ""}`,
  );
  add(
    true,
    `Guarding ${guard} mm high on landings${steel ? " (external)" : ""}; nothing a 100 mm ball can pass through`,
  );
  if (c.risers === "open" && !steel)
    add(true, "Open risers: treads overlap at least 16 mm and the gap is under 100 mm");
  if (steel)
    add(
      true,
      "Steel: the engineer details the stringers, fixings and foundations; galvanised for outside",
    );
  /* what it needs */
  const q = [];
  q.push([`Treads (${(NPSB_TREADS.find((x) => x[0] === c.tread) || [])[1] || c.tread})`, treads]);
  if (c.risers !== "open" && !steel && !spiral) q.push(["Risers", n]);
  if (!spiral)
    q.push([
      steel ? "Steel stringers (to the engineer's section)" : "Strings",
      flights.length * 2 +
        " × about " +
        Math.round(Math.max(...flights) * Math.hypot(going, rise) + 300) +
        " mm",
    ]);
  if (spiral) q.push(["Centre column", Math.round(+c.ftf + 150) + " mm"]);
  if (!spiral && !steel) q.push(["Newel posts", newels]);
  if (c.rail !== "none")
    q.push(["Handrail", Math.round(railLen * (W > 1000 ? 2 : 1) + 200) + " mm"]);
  if (c.bal === "spindles" || c.bal === "metal")
    q.push(["Spindles (41 mm, gaps under 100)", Math.ceil(balLen / 140)]);
  if (c.bal === "glass") {
    const panels = Math.ceil(balLen / 1000);
    q.push([`Glass panels, about ${balLen ? Math.round(balLen / panels) : 0} mm wide`, panels]);
  }
  if (c.bal === "cable") q.push(["Cable runs (under 100 mm apart)", Math.ceil((guard - 100) / 90)]);
  if (landing) q.push(["Landing", `${landing} × ${W} mm`]);
  const glassNote =
    c.bal === "glass"
      ? c.glassFix === "channel" && c.rail === "none"
        ? "Frameless glass with no handrail: toughened laminated, usually 17.5 or 21.5 mm – the system maker confirms."
        : "Glass with a handrail or posts: usually 10 or 12 mm toughened (laminated where it guards a drop) – the system maker confirms."
      : "";
  return {
    c,
    n,
    rise,
    going,
    pitch,
    two,
    treads,
    run,
    foot,
    flights,
    newels,
    landing,
    railLen,
    balLen,
    guard,
    ck,
    q,
    glassNote,
    steel,
    spiral,
  };
}
/* the order for the joiner / fabricator */
function npsbOrderText(k, job) {
  const c = k.c;
  const T = (NPSB_TYPES.find((x) => x[0] === c.type) || [])[1] || c.type;
  const B = (NPSB_BAL.find((x) => x[0] === c.bal) || [])[1] || c.bal;
  return [
    `Stair${job.site ? " – " + job.site : ""}`,
    "",
    `• ${T}, ${NPSB_USE[c.use] ? NPSB_USE[c.use].name.toLowerCase() : ""}`,
    `• Floor to floor ${c.ftf} mm, width ${c.width} mm${k.spiral ? `, ${c.dia} mm diameter turning ${c.turn}°` : ""}`,
    `• ${k.n} risers of ${Math.round(k.rise)} mm${k.spiral ? "" : `, going ${Math.round(k.going)} mm, pitch ${Math.round(k.pitch)}°`}`,
    `• Treads: ${(NPSB_TREADS.find((x) => x[0] === c.tread) || [])[1] || c.tread}${k.steel || k.spiral ? "" : `, ${c.risers === "open" ? "open" : "closed"} risers`}`,
    `• Balustrade: ${B}${c.bal === "glass" ? ` – ${(NPSB_GLASSFIX.find((x) => x[0] === c.glassFix) || [])[1]}` : ""}; handrail ${(NPSB_RAIL.find((x) => x[0] === c.rail) || [])[1] || c.rail}; ${k.c.open} side${+k.c.open === 1 ? "" : "s"} open`,
    "",
    "Roughly what it needs:",
    ...k.q.map(([a, b]) => `  ${a}: ${b}`),
    k.glassNote ? "\n" + k.glassNote : "",
    "",
    `Please quote and confirm the design against Approved Document K. ${job.who || ""}`.trim(),
  ]
    .filter((x) => x !== null)
    .join("\n");
}
