/* ================= WALL BUILD-UPS: ready-made wall types, brick sizes, and what each needs per m² ================= */
export { WB, WB_BRICKS, wbHasBrick, wbMaterials, wbName, wbThick };
/* A plan wall (drawing tool shape k "wall" / "cavity" / "tstud") can carry `bu` (a key below) and `brk` (a brick
   size). Picking a build-up sets the wall's kind, thickness and cavity leaves in one go; the quantities take-off
   then counts bricks, blocks, ties and insulation for that build-up. Changing the wall by hand clears `bu`. */
const WB_BRICKS = {
  metric: { name: "Metric brick 215 × 102.5 × 65", L: 215, H: 65 },
  imperial: { name: "Imperial brick 9″ × 2⅞″ (228 × 73)", L: 228, H: 73 },
};
/* leaves: [material, thickness mm] from outside in; ins: insulation mm; lv: the drawing tool's cavity leaves */
const WB = {
  blk100: { name: "100 mm block wall", k: "wall", leaves: [["block", 100]] },
  blk140: { name: "140 mm block wall", k: "wall", leaves: [["block", 140]] },
  blk215: { name: "215 mm block wall (solid)", k: "wall", leaves: [["block", 215]] },
  aer100: { name: "100 mm lightweight / aerated block", k: "wall", leaves: [["lwblock", 100]] },
  brkhalf: { name: "Half-brick wall (102.5 mm)", k: "wall", leaves: [["brick", 102.5]] },
  brkone: { name: "One-brick wall (215 mm)", k: "wall", leaves: [["brick", 215]] },
  cav50: {
    name: "Cavity: brick, 50 clear + 50 PIR, 100 block",
    k: "cavity",
    lv: { a: 102.5, cav: 50, ins: 50, b: 100 },
    leaves: [
      ["brick", 102.5],
      ["block", 100],
    ],
    ins: 50,
  },
  cav100: {
    name: "Cavity: brick, 100 full-fill, 100 block",
    k: "cavity",
    lv: { a: 102.5, cav: 0, ins: 100, b: 100 },
    leaves: [
      ["brick", 102.5],
      ["block", 100],
    ],
    ins: 100,
  },
  cav150: {
    name: "Cavity: brick, 150 full-fill, 100 block",
    k: "cavity",
    lv: { a: 102.5, cav: 0, ins: 150, b: 100 },
    leaves: [
      ["brick", 102.5],
      ["block", 100],
    ],
    ins: 150,
  },
  cavrend: {
    name: "Cavity: 100 block (rendered), 100 full-fill, 100 block",
    k: "cavity",
    lv: { a: 100, cav: 0, ins: 100, b: 100 },
    leaves: [
      ["block", 100],
      ["block", 100],
    ],
    ins: 100,
  },
  tstud: { name: "Timber stud 100 × 50 + plasterboard both sides", k: "tstud", th: 125, sd: 100 },
};
const wbHasBrick = (b) => !!b && (b.leaves || []).some((l) => l[0] === "brick");
/* overall thickness mm */
function wbThick(b) {
  if (b.lv) return b.lv.a + b.lv.cav + b.lv.ins + b.lv.b;
  if (b.th) return b.th;
  return (b.leaves || []).reduce((s, l) => s + l[1], 0);
}
/* the name shown for a wall in the take-off */
function wbName(bu, brk) {
  const b = WB[bu];
  if (!b) return "";
  return b.name + (wbHasBrick(b) && brk === "imperial" ? " (imperial brick)" : "");
}
/* what area m² of this build-up needs, +5% on bricks and blocks: [[what, amount]] */
function wbMaterials(bu, brk, area, up, f2) {
  const b = WB[bu];
  if (!b || !b.leaves) return null;
  const out = [];
  const B = WB_BRICKS[brk] || WB_BRICKS.metric,
    perBrick = 1e6 / ((B.L + 10) * (B.H + 10)),
    perBlock = 1e6 / ((440 + 10) * (215 + 10));
  let mortar = 0;
  b.leaves.forEach(([m, t]) => {
    if (m === "brick") {
      const n = t > 150 ? perBrick * 2 : perBrick;
      out.push([
        `${B.name}s (${t > 150 ? "one-brick" : "half-brick"}, +5%)`,
        up(area * n * 1.05) + " bricks",
      ]);
      mortar += area * (t > 150 ? 0.05 : 0.025);
    } else {
      out.push([
        `${m === "lwblock" ? "Lightweight blocks" : "Blocks"} 440×215×${t} (+5%)`,
        up(area * perBlock * 1.05) + " blocks",
      ]);
      mortar += area * (t > 150 ? 0.04 : 0.03);
    }
  });
  if (b.k === "cavity") {
    out.push([`Wall ties (2.5 per m²)`, up(area * 2.5) + " ties"]);
    if (b.ins) out.push([`Cavity insulation ${b.ins} mm`, f2(area * 1.05) + " m²"]);
  }
  out.push([`Mortar (approx.)`, f2(mortar) + " m³"]);
  return out;
}
