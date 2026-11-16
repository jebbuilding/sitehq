/* ================= PLAN GEOMETRY: areas, perimeters, middles, inside-or-out, and lengths written in mm or m ================= */
export { npFmtLen, npInPoly, npPolyArea, npPolyCentroid, npPolyPerim };
const npPolyArea = (p) => {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[i],
      r = p[(i + 1) % p.length];
    a += q[0] * r[1] - r[0] * q[1];
  }
  return Math.abs(a) / 2;
};
const npPolyPerim = (p) => {
  let L = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[i],
      r = p[(i + 1) % p.length];
    L += Math.hypot(r[0] - q[0], r[1] - q[1]);
  }
  return L;
};
const npPolyCentroid = (p) => {
  let a = 0,
    cx = 0,
    cy = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[i],
      r = p[(i + 1) % p.length],
      f = q[0] * r[1] - r[0] * q[1];
    a += f;
    cx += (q[0] + r[0]) * f;
    cy += (q[1] + r[1]) * f;
  }
  if (Math.abs(a) < 1e-9) {
    const n = p.length;
    return [p.reduce((s2, q) => s2 + q[0], 0) / n, p.reduce((s2, q) => s2 + q[1], 0) / n];
  }
  return [cx / (3 * a), cy / (3 * a)];
};
const npInPoly = (pt, p) => {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const a = p[i],
      b = p[j];
    if (
      a[1] > pt[1] !== b[1] > pt[1] &&
      pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1] + 1e-12) + a[0]
    )
      c = !c;
  }
  return c;
};
const npFmtLen = (mm) =>
  mm >= 1000
    ? (Math.round(mm / 10) / 100).toLocaleString("en-GB") + " m"
    : Math.round(mm).toLocaleString("en-GB") + " mm";
