/* ================= JOIN ROOMS: the rubber on a shared line takes out just that line ================= */
export { npJoinAt };
/* James (Nov 2026): "when I create a box and then add another small box on the side of it, when I use the rubber it
   should only get rid of the line in the middle to create one room". npJoinAt(objs, p, tol) looks for two things
   whose lines lie on top of each other under the rubber – boxes (not turned), rooms and straight lines. If it finds
   them it takes the shared part out of both and gives back the new list of things: two rooms (or a room and a box)
   become one room with the joined outline; two boxes become one outline of lines grouped together, looking as they
   did; anything else keeps what is left of its lines. Nothing shared under the rubber → null (rub out as before). */
const npjOk = (o) =>
  o &&
  !o.lk &&
  ((o.t === "rect" && !o.r && !o.vp && o.a && o.b) ||
    (o.t === "room" && !o.pave && o.p && o.p.length > 2) ||
    (o.t === "line" && !o.bend && o.a && o.b));
/* the straight lines a thing is made of */
function npjEdges(o) {
  if (o.t === "line") return [[o.a, o.b]];
  const P =
    o.t === "room"
      ? o.p
      : (() => {
          const x0 = Math.min(o.a[0], o.b[0]),
            x1 = Math.max(o.a[0], o.b[0]),
            y0 = Math.min(o.a[1], o.b[1]),
            y1 = Math.max(o.a[1], o.b[1]);
          return [
            [x0, y0],
            [x1, y0],
            [x1, y1],
            [x0, y1],
          ];
        })();
  return P.map((q, i) => [q, P[(i + 1) % P.length]]);
}
const npjLen = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
function npjDist(p, a, b) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const l = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
/* how far along a→b the point lies, and how far off the line */
function npjAlong(p, a, b) {
  const L = npjLen(a, b) || 1,
    ux = (b[0] - a[0]) / L,
    uy = (b[1] - a[1]) / L;
  const dx = p[0] - a[0],
    dy = p[1] - a[1];
  return [dx * ux + dy * uy, Math.abs(dx * uy - dy * ux)];
}
/* the part of line e that lies on top of line f (as distances along e), or null */
function npjOverlap(e, f, tol) {
  const L = npjLen(e[0], e[1]);
  if (L < tol) return null;
  const [t1, d1] = npjAlong(f[0], e[0], e[1]),
    [t2, d2] = npjAlong(f[1], e[0], e[1]);
  if (d1 > tol || d2 > tol) return null;
  const lo = Math.max(0, Math.min(t1, t2)),
    hi = Math.min(L, Math.max(t1, t2));
  return hi - lo > tol ? [lo, hi] : null;
}
const npjPt = (e, t) => {
  const L = npjLen(e[0], e[1]) || 1;
  return [e[0][0] + ((e[1][0] - e[0][0]) * t) / L, e[0][1] + ((e[1][1] - e[0][1]) * t) / L];
};
/* what is left of a line once the cut parts are taken out */
function npjPieces(e, cuts, tol) {
  const L = npjLen(e[0], e[1]);
  const cs = cuts.slice().sort((a, b) => a[0] - b[0]);
  const out = [];
  let at = 0;
  cs.forEach(([lo, hi]) => {
    if (lo - at > tol) out.push([npjPt(e, at), npjPt(e, lo)]);
    at = Math.max(at, hi);
  });
  if (L - at > tol) out.push([npjPt(e, at), npjPt(e, L)]);
  return out;
}
/* join the pieces end to end into one closed outline (corners only), or null if they don't make one */
function npjLoop(pieces, tol) {
  if (pieces.length < 3) return null;
  const near = (a, b) => npjLen(a, b) <= tol;
  const left = pieces.slice(1);
  const pts = [pieces[0][0], pieces[0][1]];
  while (left.length) {
    const end = pts[pts.length - 1];
    const k = left.findIndex((s) => near(s[0], end) || near(s[1], end));
    if (k < 0) return null;
    const s = left.splice(k, 1)[0];
    pts.push(near(s[0], end) ? s[1] : s[0]);
  }
  if (!near(pts[pts.length - 1], pts[0])) return null;
  pts.pop();
  /* drop points in the middle of a straight run */
  const P = pts.filter((q, i) => {
    const a = pts[(i - 1 + pts.length) % pts.length],
      b = pts[(i + 1) % pts.length];
    return npjAlong(q, a, b)[1] > tol * 0.25 || npjLen(a, b) < tol;
  });
  return P.length > 2 ? P : null;
}
const npjArea = (P) =>
  Math.abs(
    P.reduce((s, q, i) => s + q[0] * P[(i + 1) % P.length][1] - P[(i + 1) % P.length][0] * q[1], 0),
  ) / 2;
/* a line looking like the thing it came from */
function npjLine(o, s, gid) {
  const l = { t: "line", a: s[0], b: s[1], c: o.c, w: o.w };
  ["ls", "ly", "lw"].forEach((k) => o[k] != null && (l[k] = o[k]));
  if (gid) l.gid = gid;
  return l;
}
function npJoinAt(objs, p, tol, skip) {
  /* the lines under the rubber, newest first */
  const under = [];
  for (let i = objs.length - 1; i >= 0; i--) {
    const o = objs[i];
    if (!npjOk(o) || (skip && skip(o))) continue;
    npjEdges(o).forEach((e) => {
      if (npjDist(p, e[0], e[1]) <= tol) under.push({ i, e });
    });
  }
  let pair = null;
  for (const u of under) {
    const v = under.find((w) => w.i !== u.i && npjOverlap(u.e, w.e, tol));
    if (v) {
      pair = [u.i, v.i];
      break;
    }
  }
  if (!pair) return null;
  const [ia, ib] = pair;
  const A = objs[ia],
    B = objs[ib];
  /* take every shared part out of both */
  const EA = npjEdges(A).map((e) => ({ e, cuts: [] })),
    EB = npjEdges(B).map((e) => ({ e, cuts: [] }));
  let any = false;
  EA.forEach((a) =>
    EB.forEach((b) => {
      const ov = npjOverlap(a.e, b.e, tol);
      if (!ov) return;
      any = true;
      a.cuts.push(ov);
      const q1 = npjAlong(npjPt(a.e, ov[0]), b.e[0], b.e[1])[0],
        q2 = npjAlong(npjPt(a.e, ov[1]), b.e[0], b.e[1])[0];
      b.cuts.push([Math.min(q1, q2), Math.max(q1, q2)]);
    }),
  );
  if (!any) return null;
  const PA = [].concat(...EA.map((x) => npjPieces(x.e, x.cuts, tol / 2))),
    PB = [].concat(...EB.map((x) => npjPieces(x.e, x.cuts, tol / 2)));
  const closed = (o) => o.t === "rect" || o.t === "room";
  let made = null;
  if (closed(A) && closed(B)) {
    const P = npjLoop(PA.concat(PB), tol);
    if (P) {
      const rooms = [A, B].filter((o) => o.t === "room");
      if (rooms.length) {
        const big = rooms.sort((x, y) => npjArea(y.p) - npjArea(x.p))[0];
        made = [Object.assign(JSON.parse(JSON.stringify(big)), { p: P })];
      } else {
        const big =
          npjArea(npjEdges(A).map((e) => e[0])) >= npjArea(npjEdges(B).map((e) => e[0])) ? A : B;
        const gid = "g" + Date.now().toString(36);
        made = P.map((q, i) => npjLine(big, [q, P[(i + 1) % P.length]], gid));
      }
    }
  }
  if (!made) {
    const keep = (o, ps) =>
      o.t === "line"
        ? ps.map((s) => Object.assign(JSON.parse(JSON.stringify(o)), { a: s[0], b: s[1] }))
        : ps.map((s) => npjLine(o, s, o.gid));
    made = keep(B, PB).concat(keep(A, PA));
  }
  const lo = Math.min(ia, ib);
  const out = objs.filter((o, j) => j !== ia && j !== ib);
  out.splice(lo, 0, ...made);
  return out;
}
