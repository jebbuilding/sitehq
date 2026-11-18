/* ================= PAVING DRAW: patio and drive materials drawn at real size, paths round a building, tree canopies ================= */
import { npPolyArea, npPolyCentroid, npPolyPerim } from "./plan-geometry.js";
import { npHexMix } from "./walls.js";
export { NP_PAVE, npCanopy, npPaveDraw, npStripPoly };
const NP_PAVE = {
  slabs: ["Paving slabs 600×600", "#e7e5e4", "grid", 600, 600, 0],
  sandstone: ["Sandstone 600×900 (random)", "#ead9bd", "grid", 900, 600, 0.33],
  porcelain: ["Porcelain 900×600", "#dedede", "grid", 900, 600, 0.5],
  block: ["Block paving 200×100", "#c98a7c", "grid", 200, 100, 0.5],
  herring: ["Block paving, herringbone", "#c98a7c", "herring", 200, 100, 0],
  setts: ["Granite setts 100×100", "#bdbdbd", "grid", 100, 100, 0.5],
  tarmac: ["Tarmac", "#7a7a7a", "stip", 0, 0, 0],
  gravel: ["Gravel", "#ece0c4", "stip", 0, 0, 0],
  resin: ["Resin bound", "#dcbc93", "stip", 0, 0, 0],
  concrete: ["Concrete", "#dad7d3", "stip", 0, 0, 0],
  decking: ["Decking (145 boards)", "#c9a072", "boards", 145, 0, 0],
  turf: ["Lawn / turf", "#d3e6c4", "turf", 0, 0, 0],
  bark: ["Bark / mulch", "#9b7653", "stip", 0, 0, 0],
  planting: ["Planting bed", "#c7ddb5", "plant", 0, 0, 0],
};
function npPaveDraw(ctx, o, mmU) {
  const p = o.p;
  if (!p || p.length < 3) return;
  const M = NP_PAVE[o.pave] || NP_PAVE.slabs;
  const lw = Math.max(o.w || 1.5, 0.6 / (ctx.__s || 1));
  let x0 = 1e9,
    y0 = 1e9,
    x1 = -1e9,
    y1 = -1e9;
  p.forEach((q) => {
    x0 = Math.min(x0, q[0]);
    y0 = Math.min(y0, q[1]);
    x1 = Math.max(x1, q[0]);
    y1 = Math.max(y1, q[1]);
  });
  const cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2,
    Rr = Math.hypot(x1 - x0, y1 - y0) / 2 + 2;
  const u = mmU || Math.min(x1 - x0, y1 - y0) / 4000;
  const an = Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]);
  ctx.save();
  ctx.beginPath();
  p.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
  ctx.closePath();
  ctx.fillStyle = M[1];
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = npHexMix("#000000", 0.45);
  ctx.lineWidth = Math.max(lw * 0.35, 0.35 / (ctx.__s || 1));
  const L = (a, b, c, d) => {
    ctx.beginPath();
    ctx.moveTo(a, b);
    ctx.lineTo(c, d);
    ctx.stroke();
  };
  let sd = (Math.floor(Math.abs(x0 * 7 + y0 * 13)) % 9973) + 1;
  const rnd = () => {
    sd = (sd * 16807) % 2147483647;
    return sd / 2147483647;
  };
  ctx.translate(cx, cy);
  ctx.rotate(an);
  if (M[2] === "grid") {
    const W = Math.max(M[3] * u, 2),
      H = Math.max(M[4] * u, 1.5);
    let r = 0;
    for (let y = -Rr; y < Rr; y += H, r++) {
      L(-Rr, y, Rr, y);
      const off = ((r * M[5]) % 1) * W;
      for (let x = -Rr + off; x < Rr; x += W) L(x, y, x, y + H);
    }
  } else if (M[2] === "herring") {
    const A = Math.max(M[3] * u, 2),
      B2 = Math.max(M[4] * u, 1);
    ctx.rotate(Math.PI / 4);
    for (let y = -Rr * 1.5; y < Rr * 1.5; y += B2 * 2)
      for (let x = -Rr * 1.5; x < Rr * 1.5; x += A + B2) {
        const xx = x + ((y / (B2 * 2)) % 2 ? B2 : 0);
        ctx.strokeRect(xx, y, A, B2);
        ctx.strokeRect(xx + A, y - A + B2, B2, A);
      }
  } else if (M[2] === "boards") {
    const W = Math.max(M[3] * u, 1.5);
    for (let y = -Rr; y < Rr; y += W) L(-Rr, y, Rr, y);
    let k = 0;
    for (let y = -Rr; y < Rr; y += W, k++)
      for (let x = -Rr + ((k * 0.37) % 1) * W * 20; x < Rr; x += W * 25) L(x, y, x, y + W);
  } else if (M[2] === "stip" || M[2] === "turf" || M[2] === "plant") {
    ctx.fillStyle =
      o.pave === "tarmac"
        ? "#5a5a5a"
        : o.pave === "gravel"
          ? "#8a7a5a"
          : o.pave === "concrete"
            ? "#9a9590"
            : o.pave === "bark"
              ? "#5b4330"
              : o.pave === "resin"
                ? "#a6835a"
                : "#6f9a5a";
    const area = (x1 - x0) * (y1 - y0);
    const n = Math.min(
      2500,
      Math.round(
        area / Math.max((M[2] === "turf" ? 1200 : o.pave === "gravel" ? 140 : 260) * u * u, 4),
      ),
    );
    const dr = Math.max(u * (o.pave === "gravel" ? 28 : 15), 0.5);
    for (let i = 0; i < n; i++) {
      const x = (rnd() - 0.5) * Rr * 2,
        y = (rnd() - 0.5) * Rr * 2;
      if (M[2] === "turf") {
        L(x, y, x - dr * 2, y - dr * 5);
        L(x, y, x + dr * 1.5, y - dr * 5);
      } else if (M[2] === "plant") {
        if (i % 6 === 0) {
          ctx.beginPath();
          ctx.arc(x, y, dr * 14, 0, 7);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.arc(x, y, dr * (o.pave === "gravel" ? 0.6 + rnd() * 0.8 : 1), 0, 7);
        if (o.pave === "concrete" && i % 5 === 0) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + dr * 3, y + dr * 2);
          ctx.lineTo(x - dr, y + dr * 3);
          ctx.closePath();
          ctx.stroke();
        } else ctx.fill();
      }
    }
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = o.c || "#444";
  ctx.lineWidth = lw;
  ctx.beginPath();
  p.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
  ctx.closePath();
  ctx.stroke();
  if (o.showLab !== false) {
    const area0 = npPolyArea(p),
      per0 = npPolyPerim(p),
      thick = per0 ? (2 * area0) / per0 : 20;
    const fs = Math.max(6, Math.min(o.size || 20, thick * 0.9));
    const c0 = npPolyCentroid(p);
    const A = mmU ? npPolyArea(p) / (mmU * mmU) / 1e6 : 0;
    const t1 = o.name || M[0],
      t2 = A ? (Math.round(A * 10) / 10).toFixed(1) + " m²" : "";
    ctx.font = `600 ${fs * 0.75}px system-ui,sans-serif`;
    const tw = Math.max(ctx.measureText(t1).width, ctx.measureText(t2).width);
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.fillRect(
      c0[0] - tw / 2 - fs * 0.3,
      c0[1] - fs * (t2 ? 0.9 : 0.55),
      tw + fs * 0.6,
      fs * (t2 ? 1.8 : 1.1),
    );
    ctx.fillStyle = "#222";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t1, c0[0], c0[1] - (t2 ? fs * 0.4 : 0));
    if (t2) {
      ctx.font = `500 ${fs * 0.65}px system-ui,sans-serif`;
      ctx.fillText(t2, c0[0], c0[1] + fs * 0.45);
    }
  }
  ctx.restore();
}
/* path / band along a run of points, to one side: makes the outline of a path round a building */
function npStripPoly(pts, W, side) {
  const n = pts.length;
  if (n < 2) return null;
  const off = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)],
      b = pts[i],
      c = pts[Math.min(n - 1, i + 1)];
    const d1 = i > 0 ? [b[0] - a[0], b[1] - a[1]] : [c[0] - b[0], c[1] - b[1]],
      d2 = i < n - 1 ? [c[0] - b[0], c[1] - b[1]] : d1;
    const l1 = Math.hypot(...d1) || 1,
      l2 = Math.hypot(...d2) || 1;
    const n1 = [(-d1[1] / l1) * side, (d1[0] / l1) * side],
      n2 = [(-d2[1] / l2) * side, (d2[0] / l2) * side];
    let m = [n1[0] + n2[0], n1[1] + n2[1]];
    const ml = Math.hypot(...m) || 1;
    m = [m[0] / ml, m[1] / ml];
    const k = Math.min(4, 1 / Math.max(0.25, m[0] * n1[0] + m[1] * n1[1]));
    off.push([b[0] + m[0] * W * k, b[1] + m[1] * W * k]);
  }
  return pts.map((q) => q.slice()).concat(off.reverse());
}
/* nicer landscaping: soft tree canopies, shrubs, lawn */
function npCanopy(ctx, cx, cy, rx, ry, seed, lw, c, fill) {
  let sd = (Math.floor(Math.abs(seed)) % 9973) + 1;
  const rnd = () => {
    sd = (sd * 16807) % 2147483647;
    return sd / 2147483647;
  };
  const N = Math.max(18, Math.round((rx + ry) / Math.max(lw * 2.2, 1.5)));
  const pts = [];
  const ph = rnd() * 6,
    ph2 = rnd() * 6;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const k =
      0.9 + 0.06 * Math.sin(a * 3 + ph) + 0.04 * Math.sin(a * 7 + ph2) + 0.03 * (rnd() - 0.5);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  ctx.save();
  ctx.beginPath();
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % N];
    const mx = (p[0] + q[0]) / 2,
      my = (p[1] + q[1]) / 2;
    const ox = mx - cx,
      oy = my - cy,
      ol = Math.hypot(ox, oy) || 1;
    const bump = Math.hypot(q[0] - p[0], q[1] - p[1]) * (0.35 + rnd() * 0.35);
    if (i === 0) ctx.moveTo(p[0], p[1]);
    ctx.quadraticCurveTo(mx + (ox / ol) * bump, my + (oy / ol) * bump, q[0], q[1]);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = c;
  ctx.lineWidth = Math.max(lw * 0.55, 0.5);
  ctx.stroke();
  ctx.lineWidth = Math.max(lw * 0.35, 0.4);
  for (let j = 0; j < 5; j++) {
    const a = rnd() * Math.PI * 2,
      r = 0.35 + rnd() * 0.4;
    const x = cx + Math.cos(a) * rx * r,
      y = cy + Math.sin(a) * ry * r,
      s2 = Math.min(rx, ry) * 0.08;
    ctx.beginPath();
    ctx.arc(x, y, s2, a, a + Math.PI * 1.3);
    ctx.stroke();
  }
  ctx.restore();
}
