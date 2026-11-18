/* ================= FIND ROOMS: the spaces walls close off become rooms with their area ================= */
export { npFindRooms };
/* James (Nov 2026): "rooms that name themselves". npFindRooms(walls, minArea) lays the walls on a fine grid, colours
   in everything that can be reached from outside, and what's left closed off by walls are the rooms – each traced
   round its edge into an outline (squared where it is nearly square). walls: [{a, b, T}] (T = thickness), all in
   drawing units; minArea: the smallest room worth having, in square units. Gives [[x, y], ...] outlines. */
function npfrDistSeg(p, a, b) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const l = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function npFindRooms(walls, minArea) {
  if (walls.length < 3) return [];
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity,
    tMin = Infinity;
  walls.forEach((w) => {
    [w.a, w.b].forEach((p) => {
      x0 = Math.min(x0, p[0]);
      y0 = Math.min(y0, p[1]);
      x1 = Math.max(x1, p[0]);
      y1 = Math.max(y1, p[1]);
    });
    tMin = Math.min(tMin, w.T);
  });
  const span = Math.max(x1 - x0, y1 - y0);
  /* cells small enough to see the thinnest wall, but no more than about 400 across */
  const cs = Math.max(span / 400, Math.min(tMin / 2.5, span / 60));
  const pad = Math.max(...walls.map((w) => w.T)) + cs * 2;
  x0 -= pad;
  y0 -= pad;
  x1 += pad;
  y1 += pad;
  const nx = Math.ceil((x1 - x0) / cs),
    ny = Math.ceil((y1 - y0) / cs);
  /* 1 wall, 2 outside, 0 inside a room (for now) */
  const g = new Uint8Array(nx * ny);
  walls.forEach((w) => {
    const r = w.T / 2 + cs * 0.5;
    const i0 = Math.max(0, Math.floor((Math.min(w.a[0], w.b[0]) - r - x0) / cs)),
      i1 = Math.min(nx - 1, Math.ceil((Math.max(w.a[0], w.b[0]) + r - x0) / cs)),
      j0 = Math.max(0, Math.floor((Math.min(w.a[1], w.b[1]) - r - y0) / cs)),
      j1 = Math.min(ny - 1, Math.ceil((Math.max(w.a[1], w.b[1]) + r - y0) / cs));
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++)
        if (
          npfrDistSeg([x0 + (i + 0.5) * cs, y0 + (j + 0.5) * cs], w.a, w.b) <=
          w.T / 2 + cs * 0.35
        )
          g[j * nx + i] = 1;
  });
  /* colour in from the edge: outside */
  const fill = (start, val) => {
    const st = [start];
    const cells = [];
    g[start] = val;
    while (st.length) {
      const k = st.pop();
      cells.push(k);
      const i = k % nx,
        j = (k - i) / nx;
      [
        [i - 1, j],
        [i + 1, j],
        [i, j - 1],
        [i, j + 1],
      ].forEach(([a, b]) => {
        if (a < 0 || b < 0 || a >= nx || b >= ny) return;
        const q = b * nx + a;
        if (g[q] === 0) {
          g[q] = val;
          st.push(q);
        }
      });
    }
    return cells;
  };
  fill(0, 2);
  /* what's left: rooms */
  const out = [];
  let id = 3;
  for (let k = 0; k < nx * ny; k++) {
    if (g[k] !== 0) continue;
    const cells = fill(k, id);
    if (cells.length * cs * cs >= minArea) {
      const P = npfrTrace(g, nx, ny, id);
      if (P && P.length > 2) out.push(P.map(([i, j]) => [x0 + i * cs, y0 + j * cs]));
    }
    id = id === 255 ? 3 : id + 1;
  }
  return out;
}
/* the outline of the cells marked v: edges between them and the rest, joined into the longest loop, corners only */
function npfrTrace(g, nx, ny, v) {
  const at = (i, j) => i >= 0 && j >= 0 && i < nx && j < ny && g[j * nx + i] === v;
  const next = new Map();
  const add = (a, b) => next.set(a[0] + "," + a[1], b);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      if (!at(i, j)) continue;
      /* clockwise round each cell's open sides */
      if (!at(i, j - 1)) add([i, j], [i + 1, j]);
      if (!at(i + 1, j)) add([i + 1, j], [i + 1, j + 1]);
      if (!at(i, j + 1)) add([i + 1, j + 1], [i, j + 1]);
      if (!at(i - 1, j)) add([i, j + 1], [i, j]);
    }
  const seen = new Set();
  let best = null;
  next.forEach((b0, k0) => {
    if (seen.has(k0)) return;
    const loop = [];
    let k = k0;
    while (!seen.has(k) && next.has(k)) {
      seen.add(k);
      const [i, j] = k.split(",").map(Number);
      loop.push([i, j]);
      const n = next.get(k);
      k = n[0] + "," + n[1];
    }
    if (!best || loop.length > best.length) best = loop;
  });
  if (!best) return null;
  /* keep only the corners: drop points in a straight run, and the little steps a grid leaves (under 2 cells) */
  let P = best.filter((p, i) => {
    const a = best[(i - 1 + best.length) % best.length],
      b = best[(i + 1) % best.length];
    return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0;
  });
  /* the little steps a grid leaves on a sloping or squared wall (under 1.5 cells) go: the loop is split at the two
     points furthest apart and each half kept to its corners (Ramer–Douglas–Peucker) */
  if (P.length > 4) {
    let i0 = 0,
      i1 = 0,
      dm = -1;
    P.forEach((p, i) =>
      P.forEach((q, j) => {
        const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
        if (d > dm) {
          dm = d;
          i0 = i;
          i1 = j;
        }
      }),
    );
    if (i1 < i0) [i0, i1] = [i1, i0];
    const rdp = (Q) => {
      if (Q.length < 3) return Q;
      let k = 0,
        d0 = 0;
      for (let i = 1; i < Q.length - 1; i++) {
        const d = npfrDistSeg(Q[i], Q[0], Q[Q.length - 1]);
        if (d > d0) {
          d0 = d;
          k = i;
        }
      }
      return d0 <= 1.5
        ? [Q[0], Q[Q.length - 1]]
        : rdp(Q.slice(0, k + 1))
            .slice(0, -1)
            .concat(rdp(Q.slice(k)));
    };
    const h1 = rdp(P.slice(i0, i1 + 1)),
      h2 = rdp(P.slice(i1).concat(P.slice(0, i0 + 1)));
    P = h1.slice(0, -1).concat(h2.slice(0, -1));
  }
  return P;
}
