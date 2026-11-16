/* ================= SMART PEN: a rough line, box, circle or shape drawn by finger straightens itself ================= */
export { npSmartShape };
/* James (Nov 2026): "make such a killer system it rivals everything out there but still keeping it easy to use".
   The ✨ Smart pen: draw roughly, lift your finger, and npSmartShape(points, tol, snap) works out what you meant –
   a straight line (squared to level, upright or 45° when close), a box (corners squared), a circle, a run of walls
   (each part squared) or a closed shape of straight sides. Ends land on what is already drawn through snap(p).
   Gives back { objs, what } or null when it is real freehand (writing, a scribble) – that stays as you drew it. */
const npsDist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
function npsSegDist(p, a, b) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const l = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
/* the corners of a path: keep the points that stand out more than eps (Ramer–Douglas–Peucker) */
function npsCorners(P, eps) {
  if (P.length < 3) return P.slice();
  let k = 0,
    dm = 0;
  for (let i = 1; i < P.length - 1; i++) {
    const d = npsSegDist(P[i], P[0], P[P.length - 1]);
    if (d > dm) {
      dm = d;
      k = i;
    }
  }
  if (dm <= eps) return [P[0], P[P.length - 1]];
  const a = npsCorners(P.slice(0, k + 1), eps),
    b = npsCorners(P.slice(k), eps);
  return a.slice(0, -1).concat(b);
}
/* an angle close to level, upright or 45° is made exactly that */
function npsSquare(a, b, deg) {
  const L = npsDist(a, b),
    an = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const st = Math.PI / 4,
    r = Math.round(an / st) * st;
  if (Math.abs(an - r) > (deg * Math.PI) / 180) return b;
  return [a[0] + Math.cos(r) * L, a[1] + Math.sin(r) * L];
}
/* a closed run of nearly-level / nearly-upright sides made exactly square; null if it isn't that kind of shape */
function npsRectilinear(C, deg) {
  const n = C.length;
  const lim = Math.tan((deg * Math.PI) / 180);
  const o = [];
  for (let i = 0; i < n; i++) {
    const a = C[i],
      b = C[(i + 1) % n],
      dx = Math.abs(b[0] - a[0]),
      dy = Math.abs(b[1] - a[1]);
    if (dy <= dx * lim) o.push("h");
    else if (dx <= dy * lim) o.push("v");
    else return null;
  }
  /* sides going the same way one after another are one side */
  const S = [];
  for (let i = 0; i < n; i++) {
    const a = C[i],
      b = C[(i + 1) % n];
    const last = S[S.length - 1];
    if (last && last.o === o[i]) last.pts.push(b);
    else S.push({ o: o[i], pts: [a, b] });
  }
  if (S.length > 1 && S[0].o === S[S.length - 1].o) {
    const f = S.shift();
    S[S.length - 1].pts.push(...f.pts);
  }
  if (S.length < 4 || S.length % 2) return null;
  S.forEach((s) => {
    const k = s.o === "h" ? 1 : 0;
    s.v = s.pts.reduce((t, q) => t + q[k], 0) / s.pts.length;
  });
  /* each corner is where a level side meets an upright one */
  return S.map((s, i) => {
    const t = S[(i + 1) % S.length];
    return s.o === "h" ? [t.v, s.v] : [s.v, t.v];
  });
}
function npSmartShape(raw, tol, snap) {
  const P = raw.filter((q, i) => !i || npsDist(q, raw[i - 1]) > tol * 0.05);
  if (P.length < 2) return null;
  let len = 0;
  for (let i = 1; i < P.length; i++) len += npsDist(P[i - 1], P[i]);
  if (len < tol * 3) return null;
  const xs = P.map((q) => q[0]),
    ys = P.map((q) => q[1]);
  const x0 = Math.min(...xs),
    x1 = Math.max(...xs),
    y0 = Math.min(...ys),
    y1 = Math.max(...ys);
  const size = Math.hypot(x1 - x0, y1 - y0);
  const closed =
    npsDist(P[0], P[P.length - 1]) < Math.max(tol * 2.5, len * 0.12) && len > size * 1.6;
  const sn = (q) => (snap ? snap(q) : q);
  const eps = Math.max(tol * 0.8, size * 0.06);
  let C = npsCorners(P, eps);
  if (closed) {
    /* a loop: circle, box or a shape of straight sides */
    if (npsDist(C[0], C[C.length - 1]) < Math.max(tol * 2.5, len * 0.12)) C = C.slice(0, -1);
    const c = [(x0 + x1) / 2, (y0 + y1) / 2],
      rx = (x1 - x0) / 2,
      ry = (y1 - y0) / 2;
    /* how far every point is from the ellipse that fits the box round it */
    const off =
      P.reduce((t, q) => {
        const u = (q[0] - c[0]) / (rx || 1),
          v = (q[1] - c[1]) / (ry || 1);
        return t + Math.abs(Math.hypot(u, v) - 1);
      }, 0) / P.length;
    if (off < 0.09 && C.length >= 5)
      return { objs: [{ t: "circle", a: [x0, y0], b: [x1, y1] }], what: "circle" };
    if (C.length > 12 || C.length < 3) return null;
    const R = npsRectilinear(C, 14);
    if (R && R.length === 4) {
      const a = sn([Math.min(R[0][0], R[2][0]), Math.min(R[0][1], R[2][1])]),
        b = sn([Math.max(R[0][0], R[2][0]), Math.max(R[0][1], R[2][1])]);
      return { objs: [{ t: "rect", a, b }], what: "box" };
    }
    const Q = (R || C).map(sn);
    const gid = "g" + Date.now().toString(36);
    return {
      objs: Q.map((q, i) => ({ t: "line", a: q, b: Q[(i + 1) % Q.length], gid })),
      what: "shape",
    };
  }
  /* open: one straight line or a run of straight parts */
  if (C.length > 9) return null;
  /* too wiggly between corners → it's handwriting or a scribble */
  for (let i = 1; i < C.length; i++) {
    const i0 = P.indexOf(C[i - 1]),
      i1 = P.indexOf(C[i]);
    for (let j = i0; j < i1; j++) if (npsSegDist(P[j], C[i - 1], C[i]) > eps * 1.6) return null;
  }
  const Q = [sn(C[0])];
  for (let i = 1; i < C.length; i++) {
    let b = npsSquare(Q[i - 1], C[i], 8);
    if (i === C.length - 1) {
      const s2 = sn(b);
      if (b !== C[i]) {
        /* squared: the end slides along the squared line to where it snaps, so the corner stays square */
        const a = Q[i - 1],
          L = npsDist(a, b) || 1,
          u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L],
          t = (s2[0] - a[0]) * u[0] + (s2[1] - a[1]) * u[1];
        b = [a[0] + u[0] * t, a[1] + u[1] * t];
      } else b = s2;
    }
    Q.push(b);
  }
  if (Q.length === 2) return { objs: [{ t: "line", a: Q[0], b: Q[1] }], what: "line" };
  const gid = "g" + Date.now().toString(36);
  return {
    objs: Q.slice(1).map((q, i) => ({ t: "line", a: Q[i], b: q, gid })),
    what: "lines",
  };
}
