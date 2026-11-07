/* ================= ROOM SKETCH: draw a room by hand, straighten it, measure it, make it to scale ================= */
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { NP_U } from "./construction-details.js";
import { blobUrl, uploadErr, uploadFile } from "../files/files.js";
import { coData } from "../owner/company-details.js";
import { pdfLogo } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
export {
  openRoomSketch,
  roomPdfFile,
  rsBestScale,
  rsDrawInDrawing,
  rsEditInDrawing,
  rsFromStroke,
  rsHitDrawing,
  rsRoomOf,
  rsStatus,
  rsWallsAsShapes,
  rsWallsFromRoom,
};
/* Spec: docs/specs/room-sketch.md. The room is kept as JSON (an asset, `roomSrc` on the drawing): the sketch corners
   (screen units, only the shape matters), one entry per wall (typed length in mm + chimney breasts etc.), and the
   paper/scale used by "Make to scale". Real sizes only ever come from what is typed. */
const RS_PAPER = {
  A4: [297, 210],
  A3: [420, 297],
  A2: [594, 420],
  A1: [841, 594],
  A0: [1189, 841],
};
const RS_SCALES = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
const RS_KINDS = {
  chimney: "Chimney breast",
  boxing: "Boxing",
  pier: "Pier",
  alcove: "Alcove (goes into the wall)",
};
const RS_SHORT = { chimney: "chimney", boxing: "boxing", pier: "pier", alcove: "alcove" };
const RS_INK = "#1c1a1a",
  RS_RED = "#c2410c",
  RS_BRAND = "#7F191D",
  RS_MUTED = "#5f5757";
/* paper text height in mm, and the room left round a drawing for its two rows of measurements */
const RS_TXT = 2.8;
const rsAllow = (txt) => 5.2 * txt + 2 * txt;

const rsFmt = (mm) => Math.round(mm).toLocaleString("en-GB");
const rsLetter = (i) => (i < 26 ? String.fromCharCode(65 + i) : "W" + (i + 1));
const rsLen = (v) => Math.hypot(v[0], v[1]);
const rsNorm = (v) => {
  const l = rsLen(v) || 1;
  return [v[0] / l, v[1] / l];
};
const rsAdd = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const rsSub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const rsCross = (a, b) => a[0] * b[1] - a[1] * b[0];
/* text stays the right way up */
const rsUpright = (a) =>
  a > Math.PI / 2 + 1e-6 ? a - Math.PI : a <= -Math.PI / 2 + 1e-6 ? a + Math.PI : a;

/* nearest 90°, or 45° when it is clearly meant (more than 25° off square) */
function rsSnap(deg) {
  const a = ((deg % 360) + 360) % 360;
  const n90 = Math.round(a / 90) * 90;
  if (Math.abs(a - n90) <= 25) return n90 % 360;
  return (Math.round(a / 45) * 45) % 360;
}
/* a wall's direction in degrees (screen: clockwise from pointing right), snapped */
const rsAngOf = (a, b) => rsSnap((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI);
const rsU = (deg) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
/* each wall keeps its own direction, so a corner can be set to any angle; older sketches get theirs from the corners */
function rsWallAngs(room) {
  const P = room.pts || [];
  (room.walls || []).forEach((w, i) => {
    if (typeof w.ang !== "number") w.ang = rsAngOf(P[i], P[(i + 1) % P.length]);
  });
}
/* the angle inside the room at the corner where wall p ends and wall i starts */
function rsCornerDeg(up, ui, sg) {
  const turn = (Math.atan2(rsCross(up, ui), up[0] * ui[0] + up[1] * ui[1]) * 180) / Math.PI;
  return (((180 - turn * sg) % 360) + 360) % 360;
}

function rsRdp(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const a = pts[0],
    b = pts[pts.length - 1],
    ab = rsSub(b, a),
    L = rsLen(ab);
  let best = -1,
    bi = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = L ? Math.abs(rsCross(ab, rsSub(pts[i], a))) / L : rsLen(rsSub(pts[i], a));
    if (d > best) {
      best = d;
      bi = i;
    }
  }
  if (best <= eps) return [a, b];
  return rsRdp(pts.slice(0, bi + 1), eps)
    .slice(0, -1)
    .concat(rsRdp(pts.slice(bi), eps));
}

/* a hand-drawn line round a room → the corners of straight walls with square (or 45°) corners, or null */
function rsStraighten(raw) {
  if (!raw || raw.length < 6) return null;
  const xs = raw.map((p) => p[0]),
    ys = raw.map((p) => p[1]);
  const D = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  if (D < 40) return null;
  let p = rsRdp(raw, D * 0.022);
  if (p.length > 3 && rsLen(rsSub(p[0], p[p.length - 1])) < D * 0.2) p = p.slice(0, -1);
  if (p.length < 3) return null;
  /* turn the room so its longest wall lies square to the screen */
  let li = 0,
    ll = 0;
  p.forEach((q, i) => {
    const l = rsLen(rsSub(p[(i + 1) % p.length], q));
    if (l > ll) {
      ll = l;
      li = i;
    }
  });
  const th = Math.atan2(p[(li + 1) % p.length][1] - p[li][1], p[(li + 1) % p.length][0] - p[li][0]);
  const thd = (th * 180) / Math.PI;
  const rot = -(((((thd % 90) + 90 + 45) % 90) - 45) * Math.PI) / 180;
  const c = [xs.reduce((a, x) => a + x, 0) / xs.length, ys.reduce((a, y) => a + y, 0) / ys.length];
  const cs = Math.cos(rot),
    sn = Math.sin(rot);
  p = p.map((q) => {
    const d = rsSub(q, c);
    return [c[0] + d[0] * cs - d[1] * sn, c[1] + d[0] * sn + d[1] * cs];
  });
  let E = p.map((a, i) => {
    const b = p[(i + 1) % p.length],
      l = rsLen(rsSub(b, a));
    return {
      ang: rsSnap((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI),
      l,
      m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
      a,
      b,
    };
  });
  const per = E.reduce((s, e) => s + e.l, 0);
  const merge = () => {
    let again = true;
    while (again && E.length > 1) {
      again = false;
      for (let i = 0; i < E.length; i++) {
        const j = (i + 1) % E.length;
        if (i !== j && E[i].ang === E[j].ang) {
          const x = E[i],
            y = E[j],
            l = x.l + y.l || 1;
          E[i] = {
            ang: x.ang,
            l: x.l + y.l,
            m: [(x.m[0] * x.l + y.m[0] * y.l) / l, (x.m[1] * x.l + y.m[1] * y.l) / l],
            a: x.a,
            b: y.b,
          };
          E.splice(j, 1);
          again = true;
          break;
        }
      }
    }
  };
  merge();
  for (;;) {
    if (E.length <= 3) break;
    let si = -1;
    E.forEach((e, i) => {
      if (e.l < per * 0.035 && (si < 0 || e.l < E[si].l)) si = i;
    });
    if (si < 0) break;
    E.splice(si, 1);
    merge();
  }
  if (E.length < 3) return null;
  const dir = (e) => [Math.cos((e.ang * Math.PI) / 180), Math.sin((e.ang * Math.PI) / 180)];
  const out = E.map((cur, i) => {
    const prev = E[(i - 1 + E.length) % E.length],
      up = dir(prev),
      uc = dir(cur),
      cr = rsCross(up, uc);
    if (Math.abs(cr) < 1e-6) return [(prev.b[0] + cur.a[0]) / 2, (prev.b[1] + cur.a[1]) / 2];
    const t = rsCross(rsSub(cur.m, prev.m), uc) / cr;
    return rsAdd(prev.m, up, t);
  });
  if (out.some((q) => rsLen(rsSub(q, c)) > D * 3)) return null;
  return out;
}

function rsInside(pt, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a[1] > pt[1] !== b[1] > pt[1] &&
      pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      ins = !ins;
  }
  return ins;
}

/* The room's shape, walls laid end to end along their directions. Once every wall is measured (and always for a
   scale drawing) the lengths are the typed mm and any mismatch shows as a gap. Before that it is a sketch: measured
   walls in proportion to each other, the others as drawn, and two unmeasured walls stretch to close the room up. */
function rsGeom(room, force) {
  const P = room.pts || [],
    n = P.length,
    walls = room.walls || [];
  const vec = n >= 3 && (force || walls.every((w) => w.len > 0));
  const U = P.map((a, i) =>
    walls[i] && typeof walls[i].ang === "number"
      ? rsU(walls[i].ang)
      : rsU(rsAngOf(a, P[(i + 1) % n])),
  );
  let A = [],
    B = [],
    gap = null,
    kS = 0;
  if (!vec && n >= 3) {
    const sk = P.map((a, i) => rsLen(rsSub(P[(i + 1) % n], a)));
    const ratios = walls
      .map((w, i) => (w.len > 0 ? sk[i] / w.len : 0))
      .filter((x) => x > 0)
      .sort((x, y) => x - y);
    kS = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 0;
    const L = sk.map((s, i) => (walls[i] && walls[i].len > 0 ? walls[i].len * kS : s));
    let E = [0, 0];
    L.forEach((l, i) => (E = rsAdd(E, U[i], l)));
    let okClose = rsLen(E) < 1e-6;
    if (!okClose) {
      let bp = null,
        bc = 0;
      for (let p = 0; p < n; p++)
        for (let q = p + 1; q < n; q++) {
          if (walls[p].len > 0 || walls[q].len > 0) continue;
          const cr = Math.abs(rsCross(U[p], U[q]));
          if (cr > bc + 1e-9) {
            bc = cr;
            bp = [p, q];
          }
        }
      if (bp && bc > 0.05) {
        const [p, q] = bp,
          cr = rsCross(U[p], U[q]),
          dp = rsCross([-E[0], -E[1]], U[q]) / cr,
          dq = rsCross(U[p], [-E[0], -E[1]]) / cr;
        if (L[p] + dp > sk[p] * 0.1 && L[q] + dq > sk[q] * 0.1) {
          L[p] += dp;
          L[q] += dq;
          okClose = true;
        }
      }
    }
    if (okClose) {
      let cur = P[0];
      for (let i = 0; i < n; i++) {
        A[i] = cur;
        cur = rsAdd(cur, U[i], L[i]);
        B[i] = cur;
      }
    } else {
      A = P.slice();
      B = P.map((a, i) => P[(i + 1) % n]);
    }
  }
  if (vec) {
    const k = Math.min(Math.max(0, room.gapAt | 0), n - 1);
    let cur = [0, 0];
    const start = cur;
    for (let j = 0; j < n; j++) {
      const i = (k + j) % n;
      A[i] = cur;
      cur = rsAdd(cur, U[i], walls[i].len || 0);
      B[i] = cur;
    }
    const mm = rsLen(rsSub(cur, start));
    if (mm > 0.5) gap = { a: cur, b: start, mm, at: k };
  }
  /* which side is inside: test beside the longest wall */
  let li = 0;
  A.forEach((a, i) => {
    if (rsLen(rsSub(B[i], a)) > rsLen(rsSub(B[li], A[li]))) li = i;
  });
  const base = A.slice();
  const ul = rsNorm(rsSub(B[li], A[li])),
    nl = [-ul[1], ul[0]],
    Ll = rsLen(rsSub(B[li], A[li]));
  const mid = [(A[li][0] + B[li][0]) / 2, (A[li][1] + B[li][1]) / 2];
  const sg = rsInside(rsAdd(mid, nl, Ll * 0.02 + 0.01), base) ? 1 : -1;
  const W = A.map((a, i) => {
    const b = B[i],
      Lg = rsLen(rsSub(b, a)),
      u = Lg > 1e-9 ? rsNorm(rsSub(b, a)) : U[i],
      inw = [-u[1] * sg, u[0] * sg],
      w = walls[i] || {},
      len = w.len > 0 ? w.len : null,
      /* chimney breasts etc. on a wall not measured yet are drawn at the sketch scale (or the drawing's) */
      r = vec ? 1 : len ? Lg / len : kS || room.estR || 0,
      feats = r ? (w.feats || []).slice().sort((x, y) => x.off - y.off) : [];
    return { i, a, b, u, inw, Lg, len, r, feats };
  });
  /* the outline runs from the corner that takes up any gap, so the gap is the one open side */
  const outline = [],
    k0 = gap ? gap.at : 0;
  for (let j = 0; j < W.length; j++) {
    const w = W[(k0 + j) % W.length];
    outline.push(w.a);
    w.feats.forEach((f) => {
      const dd = f.d * (f.k === "alcove" ? -1 : 1) * w.r;
      const p1 = rsAdd(w.a, w.u, f.off * w.r),
        p4 = rsAdd(w.a, w.u, (f.off + f.w) * w.r);
      outline.push(p1, rsAdd(p1, w.inw, dd), rsAdd(p4, w.inw, dd), p4);
    });
  }
  if (gap) outline.push(gap.a);
  /* the angle inside each corner (corner i is where wall i starts) */
  W.forEach((w, i) => (w.deg = rsCornerDeg(U[(i - 1 + n) % n], U[i], sg)));
  return { walls: W, outline, gap, vec, sg, U };
}

/* a wall's breakdown row: alcove 950 · chimney 1,400 · alcove 900 */
function rsSegs(w) {
  const out = [];
  let pos = 0;
  w.feats.forEach((f, j) => {
    if (f.off > pos + 0.5) out.push({ s: pos, e: f.off, gap: true, j });
    out.push({ s: f.off, e: f.off + f.w, name: RS_SHORT[f.k] || "" });
    pos = f.off + f.w;
  });
  if (w.len > pos + 0.5) out.push({ s: pos, e: w.len, gap: true, j: w.feats.length });
  out.forEach((g, i) => {
    if (!g.gap) return;
    const nb = [out[i - 1], out[i + 1]].filter(Boolean);
    if (nb.some((x) => x.name === "chimney")) g.name = "alcove";
  });
  return out;
}

/* Sides made of several walls (a wall split with "Split into two walls"): the walls share a `grp`, and `gt` is the
   overall length typed for the side. `sum` is what the parts add up to along the side (a step across it adds
   nothing), once every part is measured; `bad` = the parts don't match the overall. */
function rsGroups(room, G) {
  const walls = room.walls || [],
    n = walls.length,
    out = [];
  walls.forEach((w, i) => {
    if (!w.grp) return;
    const prev = walls[(i - 1 + n) % n];
    if (prev.grp === w.grp && n > 1) return;
    const idx = [i];
    for (let j = (i + 1) % n; j !== i && walls[j].grp === w.grp; j = (j + 1) % n) idx.push(j);
    if (idx.length < 2) return;
    const u0 = G.U[idx[0]];
    const sum = idx.every((k) => walls[k].len > 0)
      ? idx.reduce((s, k) => s + walls[k].len * (G.U[k][0] * u0[0] + G.U[k][1] * u0[1]), 0)
      : null;
    const gt = w.gt > 0 ? w.gt : null;
    out.push({
      idx,
      gt,
      sum,
      bad: gt != null && sum != null && Math.abs(gt - sum) > 0.5,
      name: rsLetter(idx[0]) + "–" + rsLetter(idx[idx.length - 1]),
    });
  });
  return out;
}

/* drawing "pens": the same picture on screen (canvas) and in the PDF (jsPDF), in sheet units */
function rsCanvasPen(ctx, ox, oy, k) {
  const X = (p) => [ox + p[0] * k, oy + p[1] * k];
  const path = (pts, close) => {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const q = X(p);
      if (i) ctx.lineTo(q[0], q[1]);
      else ctx.moveTo(q[0], q[1]);
    });
    if (close) ctx.closePath();
  };
  return {
    px: X,
    line(a, b, o = {}) {
      ctx.save();
      ctx.strokeStyle = o.c || RS_INK;
      ctx.lineWidth = (o.w || 0.25) * k;
      ctx.setLineDash(o.dash ? o.dash.map((d) => d * k) : []);
      path([a, b]);
      ctx.stroke();
      ctx.restore();
    },
    poly(pts, o = {}) {
      if (pts.length < 2) return;
      ctx.save();
      path(pts, o.close);
      if (o.fill) {
        ctx.fillStyle = o.fill;
        ctx.fill();
      }
      if (o.stroke) {
        ctx.strokeStyle = o.stroke;
        ctx.lineWidth = (o.w || 0.25) * k;
        ctx.lineJoin = "round";
        ctx.stroke();
      }
      ctx.restore();
    },
    rect(x, y, w, h, o = {}) {
      this.poly(
        [
          [x, y],
          [x + w, y],
          [x + w, y + h],
          [x, y + h],
        ],
        Object.assign({ close: true }, o),
      );
    },
    circle(p, r, o = {}) {
      ctx.save();
      const q = X(p);
      ctx.beginPath();
      ctx.arc(q[0], q[1], r * k, 0, Math.PI * 2);
      if (o.fill) {
        ctx.fillStyle = o.fill;
        ctx.fill();
      }
      if (o.stroke) {
        ctx.strokeStyle = o.stroke;
        ctx.lineWidth = (o.w || 0.25) * k;
        ctx.stroke();
      }
      ctx.restore();
    },
    text(s, p, o = {}) {
      ctx.save();
      const q = X(p);
      ctx.translate(q[0], q[1]);
      ctx.rotate(o.ang || 0);
      ctx.font = `${o.bold ? 700 : 500} ${(o.size || 3) * k}px Barlow, system-ui, sans-serif`;
      ctx.fillStyle = o.c || RS_INK;
      ctx.textAlign = o.align || "center";
      ctx.textBaseline = "middle";
      ctx.fillText(s, 0, 0);
      ctx.restore();
    },
  };
}
function rsPdfPen(doc) {
  const col = (h) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const style = (o) => {
    if (o.fill) doc.setFillColor(...col(o.fill));
    if (o.stroke) {
      doc.setDrawColor(...col(o.stroke));
      doc.setLineWidth(o.w || 0.25);
    }
    return o.fill && o.stroke ? "FD" : o.fill ? "F" : "S";
  };
  return {
    px: (p) => p,
    line(a, b, o = {}) {
      doc.setDrawColor(...col(o.c || RS_INK));
      doc.setLineWidth(o.w || 0.25);
      if (o.dash) doc.setLineDashPattern(o.dash, 0);
      doc.line(a[0], a[1], b[0], b[1]);
      if (o.dash) doc.setLineDashPattern([], 0);
    },
    poly(pts, o = {}) {
      if (pts.length < 2) return;
      const d = [];
      for (let i = 1; i < pts.length; i++)
        d.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
      const st = style(o);
      doc.lines(d, pts[0][0], pts[0][1], [1, 1], st, !!o.close);
    },
    rect(x, y, w, h, o = {}) {
      doc.rect(x, y, w, h, style(o));
    },
    circle(p, r, o = {}) {
      doc.circle(p[0], p[1], r, style(o));
    },
    text(s, p, o = {}) {
      doc.setFont("helvetica", o.bold ? "bold" : "normal");
      doc.setFontSize((o.size || 3) * 2.835);
      doc.setTextColor(...col(o.c || RS_INK));
      const w = doc.getTextWidth(s),
        a = o.ang || 0,
        sh = o.align === "left" ? 0 : o.align === "right" ? w : w / 2;
      doc.text(s, p[0] - Math.cos(a) * sh, p[1] - Math.sin(a) * sh, {
        angle: (-a * 180) / Math.PI,
        baseline: "middle",
      });
    },
  };
}

/* one measurement: extension lines, a dimension line with builder's ticks, the figure on the outside */
function rsDim(pen, A, B, out, off, label, txt, c) {
  if (pen.dim) return pen.dim(A, B, out, off, label, txt, c);
  const u = rsNorm(rsSub(B, A)),
    A2 = rsAdd(A, out, off),
    B2 = rsAdd(B, out, off),
    lw = 0.08 * txt;
  pen.line(rsAdd(A, out, 0.4 * txt), rsAdd(A, out, off + 0.45 * txt), { c, w: lw });
  pen.line(rsAdd(B, out, 0.4 * txt), rsAdd(B, out, off + 0.45 * txt), { c, w: lw });
  pen.line(A2, B2, { c, w: lw });
  const v = rsNorm(rsAdd(u, out));
  [A2, B2].forEach((P) =>
    pen.line(rsAdd(P, v, -0.45 * txt), rsAdd(P, v, 0.45 * txt), { c, w: 0.14 * txt }),
  );
  const mid = [(A2[0] + B2[0]) / 2, (A2[1] + B2[1]) / 2];
  pen.text(label, rsAdd(mid, out, 0.75 * txt), {
    size: txt * 0.95,
    ang: rsUpright(Math.atan2(u[1], u[0])),
    c,
  });
}

function rsScaleBar(pen, right, y, g, kf) {
  const steps = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
  let Lr = steps[0];
  steps.forEach((s) => {
    if (s * g <= 60 * kf) Lr = s;
  });
  const len = Lr * g,
    x0 = right - len;
  for (let i = 0; i < 4; i++)
    pen.rect(x0 + (i * len) / 4, y - 1.1 * kf, len / 4, 2.2 * kf, {
      fill: i % 2 ? "#ffffff" : RS_INK,
      stroke: RS_INK,
      w: 0.2 * kf,
    });
  pen.text("0", [x0, y - 3.4 * kf], { size: 2.4 * kf });
  pen.text(Lr >= 1000 ? Lr / 1000 + " m" : Lr + " mm", [x0 + len, y - 3.4 * kf], {
    size: 2.4 * kf,
  });
}

/* Draws the room onto a sheet. sh: W,H (sheet units), frame (border + title block, paper mm × kf), fit (fit to the
   space; else true scale 1:sh.scale), txt (text height), lw (wall line), screen (corner numbers), fixT (keep the
   placement while a corner is dragged). Returns the placement for tapping. */
function rsRender(pen, room, sh) {
  const G = rsGeom(room, room.mode === "scale");
  const txt = sh.txt,
    d1 = 2.6 * txt,
    d2 = 5.2 * txt,
    kf = sh.kf || 1;
  const m = sh.frame ? 10 * kf : 1.2 * txt,
    tb = sh.frame ? 24 * kf : 0;
  const x0 = m,
    y0 = m + (!sh.frame && room.mode !== "scale" ? 1.6 * txt : 0),
    x1 = sh.W - m,
    y1 = sh.H - m - tb;
  const all = G.outline.concat(G.gap ? [G.gap.b] : []);
  if (!all.length) return { G, T: (p) => p, g: 1, t: [0, 0] };
  const bx0 = Math.min(...all.map((p) => p[0])),
    bx1 = Math.max(...all.map((p) => p[0])),
    by0 = Math.min(...all.map((p) => p[1])),
    by1 = Math.max(...all.map((p) => p[1]));
  let g, t;
  if (sh.fixT) {
    g = sh.fixT.g;
    t = sh.fixT.t;
  } else {
    if (sh.fit) {
      const A = rsAllow(txt);
      g = Math.min(
        (x1 - x0 - 2 * A) / Math.max(bx1 - bx0, 1e-6),
        (y1 - y0 - 2 * A) / Math.max(by1 - by0, 1e-6),
      );
      if (!(g > 0)) g = 1e-6;
    } else g = kf / sh.scale;
    t = [(x0 + x1) / 2 - (g * (bx0 + bx1)) / 2, (y0 + y1) / 2 - (g * (by0 + by1)) / 2];
  }
  const T = (p) => [t[0] + g * p[0], t[1] + g * p[1]];
  const O = G.outline.map(T);
  pen.poly(O, { fill: "#f6eeee", close: true });
  pen.poly(O, { stroke: RS_INK, w: sh.lw, close: !G.gap });
  G.walls.forEach((w, i) => {
    const A = T(w.a),
      B = T(w.b),
      out = [-w.inw[0], -w.inw[1]],
      mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    pen.text(rsLetter(i), rsAdd(mid, w.inw, 1.9 * txt), {
      size: txt * 1.1,
      bold: true,
      c: RS_BRAND,
    });
    rsDim(
      pen,
      A,
      B,
      out,
      w.feats.length ? d2 : d1,
      w.len ? rsFmt(w.len) : "?",
      txt,
      w.len ? RS_INK : RS_RED,
    );
    if (w.feats.length) {
      const k = g * w.r,
        at = (mm) => rsAdd(A, w.u, mm * k);
      rsSegs(w).forEach((s) => {
        /* words only when they fit over the segment (text is roughly half as wide per letter as it is tall) */
        const num = rsFmt(s.e - s.s),
          full = (s.name ? s.name + " " : "") + num,
          room2 = (s.e - s.s) * k;
        rsDim(
          pen,
          at(s.s),
          at(s.e),
          out,
          d1,
          full.length * 0.5 * txt < room2 * 0.9 ? full : num,
          txt,
          RS_MUTED,
        );
      });
      w.feats.forEach((f) => {
        const dd = f.d * (f.k === "alcove" ? -1 : 1) * k;
        const p1 = at(f.off),
          p2 = rsAdd(p1, w.inw, dd);
        const q = rsAdd([(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2], w.u, -0.9 * txt);
        pen.text(rsFmt(f.d), q, {
          size: txt * 0.85,
          ang: rsUpright(Math.atan2(w.inw[1], w.inw[0])),
          c: RS_MUTED,
        });
      });
    }
  });
  /* a side made of several walls keeps its overall measurement, on a row outside the parts */
  rsGroups(room, G).forEach((gr) => {
    const fw = G.walls[gr.idx[0]],
      lw = G.walls[gr.idx[gr.idx.length - 1]],
      A = T(fw.a),
      u = fw.u,
      out = [-fw.inw[0], -fw.inw[1]],
      E = T(lw.b),
      Bp = rsAdd(A, u, (E[0] - A[0]) * u[0] + (E[1] - A[1]) * u[1]);
    let ext = 0;
    gr.idx.forEach((k) => {
      const q = rsSub(T(G.walls[k].b), A);
      ext = Math.max(ext, q[0] * out[0] + q[1] * out[1]);
    });
    const off = (gr.idx.some((k) => G.walls[k].feats.length) ? d2 : d1) + 2.6 * txt;
    const label =
      gr.sum != null
        ? gr.bad
          ? `${rsFmt(gr.gt)} – parts add up to ${rsFmt(gr.sum)}`
          : rsFmt(gr.sum)
        : gr.gt
          ? rsFmt(gr.gt)
          : "?";
    rsDim(
      pen,
      rsAdd(A, out, ext),
      rsAdd(Bp, out, ext),
      out,
      off,
      label,
      txt,
      gr.bad || label === "?" ? RS_RED : RS_INK,
    );
  });
  if (G.gap) {
    const a = T(G.gap.a),
      b = T(G.gap.b);
    pen.line(a, b, { c: RS_RED, w: sh.lw * 0.7, dash: [txt * 0.5, txt * 0.35] });
    /* inside the room, clear of the measurements round the outside */
    const wa = G.walls[G.gap.at],
      wp = G.walls[(G.gap.at - 1 + G.walls.length) % G.walls.length],
      into = rsNorm(rsAdd(wa.inw, wp.inw));
    pen.text(
      "out by " + rsFmt(G.gap.mm) + " mm",
      rsAdd([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], into, 3.4 * txt),
      {
        size: txt,
        bold: true,
        c: RS_RED,
      },
    );
  }
  /* corners that aren't square say their angle */
  G.walls.forEach((w, i) => {
    const d = w.deg;
    if ([90, 180, 270].some((x) => Math.abs(d - x) < 0.5)) return;
    const prev = G.walls[(i - 1 + G.walls.length) % G.walls.length];
    pen.text(
      Math.round(d * 10) / 10 + "°",
      rsAdd(T(w.a), rsNorm(rsAdd(w.inw, prev.inw)), 3.3 * txt),
      {
        size: txt * 0.9,
        bold: true,
        c: RS_BRAND,
      },
    );
  });
  if (sh.screen)
    G.walls.forEach((w, i) => {
      const prev = G.walls[(i - 1 + G.walls.length) % G.walls.length];
      const P = T(w.a);
      pen.circle(P, 0.42 * txt, { fill: "#ffffff", stroke: RS_BRAND, w: 0.12 * txt });
      pen.text(String(i + 1), rsAdd(P, rsNorm(rsAdd(w.inw, prev.inw)), 1.5 * txt), {
        size: txt * 0.8,
        c: RS_MUTED,
      });
    });
  if (!sh.frame && room.mode !== "scale" && !sh.inDrawing)
    pen.text("NOT TO SCALE", [m, m + 0.6 * txt], {
      size: txt * 1.05,
      bold: true,
      c: RS_RED,
      align: "left",
    });
  if (sh.frame) {
    const W = sh.W,
      H = sh.H,
      top = H - m - tb;
    pen.rect(m, m, W - 2 * m, H - 2 * m, { stroke: RS_INK, w: 0.35 * kf });
    pen.line([m, top], [W - m, top], { w: 0.35 * kf });
    pen.text(sh.company || "", [m + 4 * kf, top + 6 * kf], {
      size: 3.6 * kf,
      bold: true,
      align: "left",
    });
    pen.text(sh.title || "Room sketch", [m + 4 * kf, top + 12 * kf], {
      size: 3.2 * kf,
      align: "left",
    });
    pen.text([sh.site, sh.date].filter(Boolean).join("  ·  "), [m + 4 * kf, top + 18 * kf], {
      size: 2.6 * kf,
      c: RS_MUTED,
      align: "left",
    });
    pen.text(sh.note || "", [W - m - 44 * kf, top + 6 * kf], {
      size: 3.6 * kf,
      bold: true,
      c: sh.fit ? RS_RED : RS_INK,
      align: "right",
    });
    if (!sh.fit) rsScaleBar(pen, W - m - 44 * kf, H - m - 6 * kf, g, kf);
    if (sh.fit && room.mode !== "scale")
      pen.text("NOT TO SCALE", [m + 4 * kf, m + 7 * kf], {
        size: 5 * kf,
        bold: true,
        c: RS_RED,
        align: "left",
      });
  }
  return { G, T, g, t };
}

const rsDims = (paper, orient) => {
  const [L, S2] = RS_PAPER[paper] || RS_PAPER.A4;
  return orient === "port" ? [S2, L] : [L, S2];
};
function rsBox(room) {
  const G = rsGeom(room, true),
    all = G.outline.concat(G.gap ? [G.gap.b] : []);
  if (!all.length) return [0, 0];
  return [
    Math.max(...all.map((p) => p[0])) - Math.min(...all.map((p) => p[0])),
    Math.max(...all.map((p) => p[1])) - Math.min(...all.map((p) => p[1])),
  ];
}
function rsFits(room, paper, orient, s) {
  const [W, H] = rsDims(paper, orient),
    A = rsAllow(RS_TXT),
    [bw, bh] = rsBox(room);
  return bw / s <= W - 20 - 2 * A && bh / s <= H - 20 - 24 - 2 * A;
}
const rsBest = (room, paper, orient) => RS_SCALES.find((s) => rsFits(room, paper, orient, s)) || 0;
const rsEffScale = (room) =>
  room.scale === "fit" ? rsBest(room, room.paper, room.orient) : +room.scale || 0;
function rsFitMsg(t) {
  const best = rsBest(t, t.paper, t.orient);
  if (t.scale === "fit")
    return best
      ? `Best fit on ${t.paper}: 1:${best}`
      : `Too big for ${t.paper} even at 1:500. Try a bigger paper size.`;
  const s = +t.scale;
  if (rsFits(t, t.paper, t.orient, s)) return `Fits on ${t.paper} at 1:${s}`;
  const alt = Object.keys(RS_PAPER).find((p) => rsFits(t, p, t.orient, s));
  const tries = [alt, best ? "1:" + best : ""].filter(Boolean);
  return `Too big for ${t.paper} at 1:${s}.` + (tries.length ? ` Try ${tries.join(" or ")}.` : "");
}

/* the sheet for a PDF or saved picture: "full" = the chosen paper at true scale (or A4 for a sketch), "a4" = a reduced site copy */
function rsSheet(room, variant) {
  const base = {
    frame: true,
    kf: 1,
    txt: RS_TXT,
    lw: 0.6,
    company: coData().name || "",
    title: room.title || "Room sketch",
    site: room.site || "",
    date: new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  };
  const s = rsEffScale(room);
  if (room.mode === "scale" && s && variant !== "a4") {
    const [W, H] = rsDims(room.paper, room.orient);
    return Object.assign(base, {
      W,
      H,
      fit: false,
      scale: s,
      note: `Scale 1:${s} @ ${room.paper}`,
    });
  }
  const [W, H] = rsDims("A4", room.mode === "scale" ? room.orient : "land");
  return Object.assign(base, {
    W,
    H,
    fit: true,
    note:
      room.mode === "scale" ? `Reduced from ${room.paper} 1:${s} – NOT TO SCALE` : "NOT TO SCALE",
  });
}
async function rsPdfBlob(room, variant) {
  await loadJsPdf();
  const sh = rsSheet(room, variant);
  const doc = new window.jspdf.jsPDF({
    unit: "mm",
    format: [sh.W, sh.H],
    orientation: sh.W > sh.H ? "landscape" : "portrait",
  });
  rsRender(rsPdfPen(doc), room, sh);
  try {
    await pdfLogo(doc, sh.W - 14, sh.H - 32, 28, 16);
  } catch (e) {}
  return doc.output("blob");
}
function rsPreviewBlob(room) {
  const sh = rsSheet(room, "full"),
    k = 1600 / sh.W,
    cv = document.createElement("canvas");
  cv.width = 1600;
  cv.height = Math.round(sh.H * k);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cv.width, cv.height);
  rsRender(rsCanvasPen(ctx, 0, 0, k), room, sh);
  return new Promise((res) => cv.toBlob((b) => res(b), "image/jpeg", 0.9));
}
/* a saved room sketch as a PDF file (for sign-offs, the site's plans, sending) */
async function roomPdfFile(p) {
  const room = await (await fetch(blobUrl(p.roomSrc))).json();
  const nm = (p.title || "Room sketch").replace(/[^\w\s-]/g, "").trim() || "Room sketch";
  return new File([await rsPdfBlob(room, "full")], nm + ".pdf", { type: "application/pdf" });
}

/* opts: srcId (saved room JSON), title, site, onSave({preview, src, title, site, room:true}) */
async function openRoomSketch(opts) {
  opts = opts || {};
  let saved = null;
  if (opts.srcId) {
    try {
      saved = await (await fetch(blobUrl(opts.srcId))).json();
    } catch (e) {
      toast("Couldn't open that room sketch. Check your connection.");
      return;
    }
  }
  const room = Object.assign(
    {
      v: 1,
      title: "",
      site: "",
      mode: "sketch",
      pts: null,
      walls: [],
      gapAt: 0,
      paper: "A4",
      orient: "land",
      scale: "fit",
    },
    saved || {},
  );
  if (opts.title && !room.title) room.title = opts.title;
  if (opts.site && !room.site) room.site = opts.site;
  if (room.pts) rsWallAngs(room);
  let drawing = !room.pts,
    stroke = null,
    drag = null,
    down = null,
    last = null,
    armed = 0;
  openViewer(`<div class="rs-wrap">
    <h3 style="margin:0 0 6px">📐 Room sketch</h3>
    <label for="rs-title">Name<input id="rs-title" maxlength="80" value="${esc(room.title)}" placeholder="e.g. Front room, 14 Orchard Close"></label>
    <div class="rs-bar">
      <button type="button" class="btn" id="rs-redraw">✏️ Draw again</button>
      <button type="button" class="btn primary" id="rs-scale">📐 Make to scale</button>
      <button type="button" class="btn" id="rs-paper" hidden>Paper &amp; scale</button>
      <button type="button" class="btn" id="rs-pdf">📄 PDF</button>
      <button type="button" class="btn primary" id="rs-save">Save</button>
    </div>
    <div class="rs-msg" id="rs-msg" role="status"></div>
    <div class="rs-stage" id="rs-stage"><canvas id="rs-cv" class="rs-cv" aria-label="Room sketch. Draw the room with your finger or pen, then tap a wall to measure it."></canvas></div>
  </div>`);
  const cv = $("rs-cv");
  const evPt = (e) => {
    const r = cv.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  function msg() {
    const el = $("rs-msg");
    if (!el) return;
    if (drawing)
      el.textContent = room.pts
        ? "Draw the room again in one go. Your old sketch comes back if you tap Cancel."
        : "Draw the room in one go with your finger or pen, ending back where you started. The walls straighten when you lift off.";
    else if (room.mode === "scale") {
      const s = rsEffScale(room);
      el.textContent = s
        ? `Scale 1:${s} on ${room.paper} ${room.orient === "port" ? "portrait" : "landscape"}. Tap a wall to change a measurement.`
        : rsFitMsg(room);
    } else {
      const miss = room.walls.map((w, i) => (w.len ? "" : rsLetter(i))).filter(Boolean);
      const G = last && last.G;
      el.textContent = miss.length
        ? `Tap a wall to type its length or add a chimney breast. Still to measure: ${miss.join(", ")}.`
        : G && G.gap
          ? `Your measurements are out by ${rsFmt(G.gap.mm)} mm (shown in red). Make to scale lets you choose which corner takes it up.`
          : "All walls measured. Tap 📐 Make to scale for a drawing you can measure with a ruler.";
    }
    /* a side whose parts don't add up to its overall length is flagged first */
    if (!drawing && last) {
      const bad = rsGroups(room, last.G).filter((g) => g.bad);
      if (bad.length)
        el.textContent =
          bad
            .map(
              (g) =>
                `⚠️ Side ${g.name} doesn't add up: the parts come to ${rsFmt(g.sum)} mm but the overall is ${rsFmt(g.gt)} mm (out by ${rsFmt(Math.abs(g.gt - g.sum))} mm).`,
            )
            .join(" ") +
          " " +
          el.textContent;
    }
  }
  function paint(fixT) {
    const st = $("rs-stage");
    if (!st || !cv.isConnected) return;
    const cw = Math.max(280, st.clientWidth),
      ch = Math.round(Math.max(320, Math.min(window.innerHeight - 250, cw * 0.8))),
      dpr = window.devicePixelRatio || 1;
    cv.style.width = cw + "px";
    cv.style.height = ch + "px";
    cv.width = Math.round(cw * dpr);
    cv.height = Math.round(ch * dpr);
    const ctx = cv.getContext("2d");
    st.classList.toggle("rs-paperview", !drawing && room.mode === "scale");
    ctx.fillStyle = !drawing && room.mode === "scale" ? "#e9e4e4" : "#ffffff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    last = null;
    if (!drawing && room.pts) {
      if (room.mode === "scale" && rsEffScale(room)) {
        const sh = Object.assign(rsSheet(room, "full"), { screen: true });
        const k = Math.min((cw - 24) / sh.W, (ch - 24) / sh.H);
        const pen = rsCanvasPen(
          ctx,
          ((cw - sh.W * k) / 2) * dpr,
          ((ch - sh.H * k) / 2) * dpr,
          k * dpr,
        );
        pen.rect(0, 0, sh.W, sh.H, { fill: "#ffffff" });
        sh.txt = Math.max(RS_TXT, 11 / k);
        last = Object.assign(rsRender(pen, room, sh), { pen });
      } else {
        const pen = rsCanvasPen(ctx, 0, 0, dpr);
        last = Object.assign(
          rsRender(pen, room, { W: cw, H: ch, fit: true, txt: 13, lw: 3, screen: true, fixT }),
          { pen },
        );
      }
    }
    if (stroke && stroke.length > 1) {
      const pen = rsCanvasPen(ctx, 0, 0, dpr);
      pen.poly(stroke, { stroke: RS_RED, w: 3 });
    }
    const sc = $("rs-scale");
    if (sc) {
      sc.textContent = room.mode === "scale" ? "✏️ Back to sketch" : "📐 Make to scale";
      sc.disabled = drawing || !room.pts;
      $("rs-paper").hidden = room.mode !== "scale" || drawing;
      $("rs-redraw").textContent =
        drawing && room.pts ? "Cancel" : armed ? "Tap again to clear it" : "✏️ Draw again";
    }
    msg();
  }
  const nearWall = (p) => {
    if (!last) return -1;
    let best = -1,
      bd = 26;
    last.G.walls.forEach((w, i) => {
      const a = last.pen.px(last.T(w.a)).map((v) => v / (window.devicePixelRatio || 1)),
        b = last.pen.px(last.T(w.b)).map((v) => v / (window.devicePixelRatio || 1)),
        ab = rsSub(b, a),
        L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1,
        t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2)),
        d = rsLen(rsSub(p, rsAdd(a, ab, t)));
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };
  cv.onpointerdown = (e) => {
    try {
      cv.setPointerCapture(e.pointerId);
    } catch (er) {}
    const p = evPt(e);
    down = { p, moved: 0 };
    if (drawing) {
      stroke = [p];
      return;
    }
    if (last && room.mode !== "scale" && !last.G.vec) {
      const ci = last.G.walls.findIndex((w) => rsLen(rsSub(last.T(w.a), p)) < 22);
      if (ci >= 0) {
        /* drag from where the corners are drawn now */
        room.pts = last.G.walls.map((w) => w.a.slice());
        drag = { i: ci, fixT: { g: last.g, t: last.t } };
      }
    }
  };
  cv.onpointermove = (e) => {
    if (!down) return;
    const p = evPt(e);
    down.moved = Math.max(down.moved, rsLen(rsSub(p, down.p)));
    if (stroke) {
      stroke.push(p);
      paint();
    } else if (drag && down.moved > 6) {
      const P = room.pts,
        i = drag.i,
        n = P.length;
      P[i] = [(p[0] - drag.fixT.t[0]) / drag.fixT.g, (p[1] - drag.fixT.t[1]) / drag.fixT.g];
      /* the two walls at that corner take their new directions (squared up again) */
      room.walls[(i - 1 + n) % n].ang = rsAngOf(P[(i - 1 + n) % n], P[i]);
      room.walls[i].ang = rsAngOf(P[i], P[(i + 1) % n]);
      paint(drag.fixT);
    }
  };
  cv.onpointerup = cv.onpointercancel = (e) => {
    const was = down;
    down = null;
    if (stroke) {
      const pts = rsStraighten(stroke);
      stroke = null;
      if (pts) {
        room.pts = pts;
        room.walls = pts.map((a, i) => ({
          len: null,
          feats: [],
          ang: rsAngOf(a, pts[(i + 1) % pts.length]),
        }));
        room.gapAt = 0;
        room.mode = "sketch";
        drawing = false;
      } else if (e.type === "pointerup")
        toast("Draw the whole room in one line, ending back where you started.");
      paint();
      return;
    }
    if (drag) {
      const moved = was && was.moved > 6;
      drag = null;
      if (moved) {
        paint();
        return;
      }
    }
    if (e.type === "pointerup" && was && was.moved < 10) {
      const wi = nearWall(was.p);
      if (wi >= 0) rsWallForm(room, wi, paint);
    }
  };
  function rsScaleSheet() {
    const miss = room.walls.map((w, i) => (w.len ? "" : rsLetter(i))).filter(Boolean);
    if (miss.length) {
      toast(
        `Measure wall${miss.length > 1 ? "s" : ""} ${miss.join(", ")} first. Tap a wall to type its length.`,
      );
      return;
    }
    const G = rsGeom(room, true);
    const tmp = () => ({
      pts: room.pts,
      walls: room.walls,
      paper: $("rs-pp").value,
      orient: $("rs-po").value,
      scale: $("rs-ps").value,
      gapAt: $("rs-gap") ? +$("rs-gap").value : room.gapAt,
    });
    openSheet(
      `<h3 id="sheettitle">Make to scale</h3>
      <div class="who">Redraws the room exactly from your measurements, with a scale bar so a print can be measured with a ruler.</div>
      <label for="rs-pp">Paper size<select id="rs-pp">${Object.keys(RS_PAPER)
        .map((p) => `<option${p === room.paper ? " selected" : ""}>${p}</option>`)
        .join("")}</select></label>
      <label for="rs-po">Paper way round<select id="rs-po"><option value="land"${room.orient !== "port" ? " selected" : ""}>Landscape</option><option value="port"${room.orient === "port" ? " selected" : ""}>Portrait</option></select></label>
      <label for="rs-ps">Scale<select id="rs-ps"><option value="fit"${room.scale === "fit" ? " selected" : ""}>Best fit</option>${RS_SCALES.map(
        (s) =>
          `<option value="${s}"${String(room.scale) === String(s) ? " selected" : ""}>1:${s}</option>`,
      ).join("")}</select></label>
      ${
        G.gap
          ? `<div class="notice warn">Your measurements are out by <b>${rsFmt(G.gap.mm)} mm</b>. The drawing shows the gap in red at the corner you choose, so nothing is hidden.</div>
      <label for="rs-gap">Which corner takes up the difference?<select id="rs-gap">${room.walls
        .map(
          (w, i) =>
            `<option value="${i}"${i === room.gapAt ? " selected" : ""}>Corner ${i + 1}</option>`,
        )
        .join("")}</select></label>`
          : ""
      }
      <div class="notice" id="rs-fit"></div>
      ${formFoot(false, "Make to scale")}`,
      () => {
        const t = tmp(),
          s = t.scale === "fit" ? rsBest(t, t.paper, t.orient) : +t.scale;
        if (!s || !rsFits(t, t.paper, t.orient, s)) return showErr(rsFitMsg(t));
        Object.assign(room, {
          paper: t.paper,
          orient: t.orient,
          scale: t.scale,
          gapAt: t.gapAt,
          mode: "scale",
        });
        closeForm();
        paint();
      },
    );
    const upd = () => ($("rs-fit").textContent = rsFitMsg(tmp()));
    ["rs-pp", "rs-po", "rs-ps", "rs-gap"].forEach((id) => {
      if ($(id)) $(id).onchange = upd;
    });
    upd();
  }
  async function rsPdf(variant) {
    room.title = $("rs-title").value.trim();
    try {
      const blob = await rsPdfBlob(room, variant);
      const nm = (room.title || "Room sketch").replace(/[^\w\s-]/g, "").trim() || "Room sketch";
      await S.dl.save({
        filename: nm + (variant === "a4" ? " (A4 copy)" : "") + ".pdf",
        data: blob,
      });
    } catch (e) {
      toast("Couldn't make the PDF. Check your connection and try again.");
    }
  }
  $("rs-redraw").onclick = () => {
    if (drawing) {
      if (room.pts) {
        drawing = false;
        paint();
      }
      return;
    }
    if (!armed) {
      armed = setTimeout(() => {
        armed = 0;
        paint();
      }, 4000);
      paint();
      return;
    }
    clearTimeout(armed);
    armed = 0;
    drawing = true;
    paint();
  };
  $("rs-scale").onclick = () => {
    if (room.mode === "scale") {
      room.mode = "sketch";
      paint();
    } else rsScaleSheet();
  };
  $("rs-paper").onclick = rsScaleSheet;
  $("rs-pdf").onclick = () => {
    if (!room.pts) return toast("Draw the room first.");
    if (room.mode === "scale" && room.paper !== "A4") {
      openSheet(
        `<h3 id="sheettitle">PDF</h3>
        <fieldset><legend>Which copy?</legend>
        <label class="inl"><input type="radio" name="rs-pv" value="full" checked> Full size ${esc(room.paper)} at 1:${rsEffScale(room)}, for a print shop or plotter</label>
        <label class="inl"><input type="radio" name="rs-pv" value="a4"> On A4 for site (reduced, so not to scale)</label></fieldset>
        ${formFoot(false, "Make PDF")}`,
        () => {
          const v = (document.querySelector("input[name=rs-pv]:checked") || {}).value || "full";
          closeForm();
          rsPdf(v);
        },
      );
      return;
    }
    rsPdf("full");
  };
  $("rs-save").onclick = async () => {
    if (!room.pts) return toast("Draw the room first.");
    room.title = $("rs-title").value.trim();
    const b = $("rs-save");
    b.disabled = true;
    try {
      const img = await rsPreviewBlob(room);
      const a1 = await uploadFile(img, "room-sketch.jpg");
      const a2 = await uploadFile(
        new Blob([JSON.stringify(room)], { type: "application/json" }),
        "room-sketch.json",
      );
      await (opts.onSave || (() => {}))({
        preview: a1.id,
        src: a2.id,
        title: room.title,
        site: room.site || "",
        room: true,
      });
    } catch (e) {
      toast(uploadErr(e));
    }
    if (b.isConnected) b.disabled = false;
  };
  const onResize = () => {
    if (!cv.isConnected) return window.removeEventListener("resize", onResize);
    paint();
  };
  window.addEventListener("resize", onResize);
  paint();
}

/* the form for one wall (tap a wall): length, corner angle, overall length of a split side, chimney breasts etc.,
   split / remove a corner. Changes `room` in place, then calls paint(). Used by the room sketch page and the drawing tool. */
function rsWallForm(room, i, paint, onDelete, toPts, onWalls) {
  /* the corners as the sketch keeps them (the drawing tool passes its own, in page units) */
  const corners = toPts || ((r) => rsGeom(r).walls.map((x) => x.a.slice()));
  const w = room.walls[i],
    n = room.walls.length,
    G0 = rsGeom(room, room.mode === "scale"),
    curDeg = G0.walls[i].deg,
    grp = rsGroups(room, G0).find((g) => g.idx.includes(i));
  let feats = (w.feats || []).map((f) => Object.assign({}, f));
  const num = (id) => {
    const v = parseFloat(($(id) || {}).value);
    return isFinite(v) ? v : null;
  };
  const collect = () => {
    feats = [...document.querySelectorAll("#rs-feats .rs-feat")].map((row) => {
      const j = row.dataset.j;
      return {
        k: $("rs-fk" + j).value,
        off: num("rs-fo" + j),
        w: num("rs-fw" + j),
        d: num("rs-fd" + j),
      };
    });
  };
  const rows = () => {
    $("rs-feats").innerHTML = feats
      .map(
        (f, j) => `<div class="rs-feat" data-j="${j}">
      <label for="rs-fk${j}">What<select id="rs-fk${j}">${Object.keys(RS_KINDS)
        .map((k) => `<option value="${k}"${k === f.k ? " selected" : ""}>${RS_KINDS[k]}</option>`)
        .join("")}</select></label>
      <label for="rs-fo${j}">From the start of the wall (mm)<input id="rs-fo${j}" type="number" inputmode="numeric" min="0" step="1" value="${f.off ?? ""}" placeholder="e.g. 950"></label>
      <div class="rs-two"><label for="rs-fw${j}">Width (mm)<input id="rs-fw${j}" type="number" inputmode="numeric" min="1" step="1" value="${f.w ?? ""}" placeholder="e.g. 1400"></label>
      <label for="rs-fd${j}">Depth (mm)<input id="rs-fd${j}" type="number" inputmode="numeric" min="1" step="1" value="${f.d ?? ""}" placeholder="e.g. 350"></label></div>
      <button type="button" class="linkdanger rs-frm" data-j="${j}">Remove this one</button></div>`,
      )
      .join("");
    document.querySelectorAll("#rs-feats .rs-frm").forEach(
      (b) =>
        (b.onclick = () => {
          collect();
          feats.splice(+b.dataset.j, 1);
          rows();
        }),
    );
  };
  openSheet(
    `<h3 id="sheettitle">Wall ${rsLetter(i)}</h3>
    <div class="who">From corner ${i + 1} to corner ${((i + 1) % n) + 1}.</div>
    <label for="rs-len">Length (mm)<input id="rs-len" type="number" inputmode="numeric" min="1" max="100000" step="1" value="${w.len || ""}" placeholder="e.g. 3250"></label>
    <label for="rs-ang">Angle at corner ${i + 1}, inside the room (degrees)<input id="rs-ang" type="number" inputmode="decimal" min="1" max="359" step="0.5" value="${Math.round(curDeg * 10) / 10}"></label>
    <div class="who">90 is square. Change it if the corner isn't, e.g. 95 or 135. The rest of the room turns to match.</div>
    ${
      grp
        ? `<label for="rs-gt">Overall length of side ${grp.name} (mm)<input id="rs-gt" type="number" inputmode="numeric" min="1" max="100000" step="1" value="${grp.gt || ""}" placeholder="the whole side, end to end"></label>
    <div class="who">If the parts don't add up to this, the drawing shows it in red.</div>`
        : ""
    }
    <div class="flabel">Chimney breasts, boxings, piers and alcoves</div>
    <div id="rs-feats"></div>
    <button type="button" class="btn" id="rs-fadd">＋ Add a chimney breast, boxing, pier or alcove</button>
    <div class="flabel">Walls</div>
    <div class="rs-bar">
      <button type="button" class="btn" id="rs-split">➕ Split into two walls</button>
      ${n > 3 ? `<button type="button" class="btn" id="rs-join">Remove corner ${i + 1}</button>` : ""}
    </div>
    <div class="who">Split adds a corner halfway along, for a step or a nib. The overall length of the side is kept.</div>
    ${
      onWalls
        ? `<div class="flabel">Turn into real walls</div>
    <div class="who">Swaps the sketch for proper walls drawn round the inside of the room, with their measurements, so doors and windows cut in and the wall tools, schedules and quantities all work. ${room.walls.every((x) => x.len > 0) ? "" : "<b>Measure every wall first.</b>"}</div>
    <label for="rs-wth">Wall<select id="rs-wth">${RS_WALLS.map((x, k) => `<option value="${k}">${x[0]}</option>`).join("")}</select></label>
    <div class="rs-bar"><button type="button" class="btn" id="rs-walls"${room.walls.every((x) => x.len > 0) ? "" : " disabled"}>🧱 Turn into real walls</button></div>`
        : ""
    }
    ${onDelete ? `<div class="rs-bar"><button type="button" class="linkdanger" id="rs-del">Delete the whole room</button></div>` : ""}
    ${formFoot(false, "Save")}`,
    () => {
      collect();
      const len = num("rs-len");
      if (len != null && !(len > 0)) return showErr("The length must be more than 0 mm.");
      if (feats.length && !len && !room.estR) return showErr("Type the wall's full length first.");
      for (const f of feats) {
        const nm = RS_KINDS[f.k] || "It";
        if (f.off == null || f.off < 0)
          return showErr(`${nm}: type how far it is from the start of the wall.`);
        if (!(f.w > 0) || !(f.d > 0)) return showErr(`${nm}: type its width and depth.`);
        if (len && f.off + f.w > len + 0.5)
          return showErr(`${nm}: it runs past the end of the wall (${rsFmt(len)} mm).`);
      }
      const sorted = feats.slice().sort((a, b) => a.off - b.off);
      for (let j = 1; j < sorted.length; j++)
        if (sorted[j].off < sorted[j - 1].off + sorted[j - 1].w - 0.5)
          return showErr("Two of them overlap. Check the distances from the start of the wall.");
      const deg = num("rs-ang");
      if (deg == null || !(deg > 0 && deg < 360))
        return showErr("The angle must be between 1 and 359 degrees.");
      const gt = grp ? num("rs-gt") : null;
      if (grp && gt != null && !(gt > 0))
        return showErr("The overall length must be more than 0 mm.");
      w.len = len || null;
      w.feats = sorted;
      if (grp) grp.idx.forEach((k) => (room.walls[k].gt = gt || null));
      if (Math.abs(deg - curDeg) > 0.01) {
        /* turn this wall and the ones after it, up to the corner where the room closes (which takes up the change) */
        const delta = (curDeg - deg) * G0.sg,
          c = Math.min(Math.max(0, room.gapAt | 0), n - 1);
        let j = i;
        do {
          room.walls[j].ang = (((room.walls[j].ang + delta) % 360) + 360) % 360;
          j = (j + 1) % n;
        } while (i !== c && j !== c && j !== i);
        /* the sketch's corners follow, so dragging carries on from the new shape */
        room.pts = corners(room);
      }
      closeForm();
      paint();
    },
    "rs-len",
  );
  rows();
  if (onWalls && $("rs-walls"))
    $("rs-walls").onclick = () => {
      const wt = RS_WALLS[+$("rs-wth").value] || RS_WALLS[0];
      closeForm();
      onWalls(wt[1], wt[2]);
    };
  if (onDelete && $("rs-del"))
    $("rs-del").onclick = () => {
      closeForm();
      onDelete();
    };
  $("rs-fadd").onclick = () => {
    collect();
    feats.push({ k: "chimney", off: null, w: null, d: null });
    rows();
  };
  /* split this wall in two: a new corner halfway along; a measured length becomes the side's overall length */
  $("rs-split").onclick = () => {
    if ((w.feats || []).length)
      return showErr("Take the chimney breasts etc. off this wall first, then split it.");
    const P = corners(room),
      a = P[i],
      b = P[(i + 1) % n];
    P.splice(i + 1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    if (!w.grp) {
      w.grp = "g" + Date.now().toString(36);
      w.gt = w.len || null;
    }
    room.walls.splice(i + 1, 0, { len: null, feats: [], ang: w.ang, grp: w.grp, gt: w.gt });
    w.len = null;
    room.pts = P;
    if (room.gapAt > i) room.gapAt++;
    closeForm();
    paint();
    toast(`Wall split into ${rsLetter(i)} and ${rsLetter(i + 1)}. Tap each one to measure it.`);
  };
  /* remove the corner at the start of this wall: it and the wall before become one */
  if ($("rs-join"))
    $("rs-join").onclick = () => {
      const pi = (i - 1 + n) % n,
        pw = room.walls[pi];
      if ((w.feats || []).length || (pw.feats || []).length)
        return showErr("Take the chimney breasts etc. off these two walls first.");
      const G = rsGeom(room),
        P = corners(room),
        straight = Math.abs(G.walls[i].deg - 180) < 0.5;
      pw.len = straight && pw.len > 0 && w.len > 0 ? pw.len + w.len : null;
      P.splice(i, 1);
      room.walls.splice(i, 1);
      const m = room.walls.length,
        np = i === 0 ? m - 1 : pi;
      pw.ang = rsAngOf(P[np], P[(np + 1) % m]);
      /* a side left with one wall is just a wall again */
      if (pw.grp && !room.walls.some((x, k) => x !== pw && x.grp === pw.grp)) {
        if (!pw.len && pw.gt) pw.len = pw.gt;
        delete pw.grp;
        delete pw.gt;
      }
      room.pts = P;
      if (room.gapAt >= i && room.gapAt > 0) room.gapAt--;
      room.gapAt = Math.min(room.gapAt, m - 1);
      closeForm();
      paint();
    };
}

/* ===== the room sketch inside the drawing tool (drawing/paving.js, tool "roomsk") =====
   The room is one object on the page, { t: "rsk", p: corners (page units), room: { walls, gapAt } }: drawn straight
   onto the drawing, tapped wall by wall to measure it. Until every wall is measured it is drawn as sketched and
   marked NOT TO SCALE; once it is, it is redrawn exactly from the measurements at the drawing's scale. */
function rsFromStroke(pts0) {
  const pts = rsStraighten(pts0);
  if (!pts) return null;
  return {
    t: "rsk",
    p: pts,
    room: {
      v: 1,
      gapAt: 0,
      walls: pts.map((a, i) => ({
        len: null,
        feats: [],
        ang: rsAngOf(a, pts[(i + 1) % pts.length]),
      })),
    },
  };
}
/* the room as the sketch code sees it; its walls array is the object's own, so changes to walls stay on it */
/* (with doc: estR = page units per mm at the drawing's scale, so walls not measured yet can still take a chimney breast) */
const rsRoomOf = (o, doc) =>
  Object.assign({ mode: "sketch" }, o.room, {
    pts: o.p,
    estR: doc && doc.scale > 0 ? NP_U / doc.scale : 0,
  });
/* what to tell James about this room now */
function rsStatus(room) {
  const G = rsGeom(room),
    miss = room.walls.map((w, i) => (w.len ? "" : rsLetter(i))).filter(Boolean);
  const bad = rsGroups(room, G)
    .filter((g) => g.bad)
    .map(
      (g) =>
        `⚠️ Side ${g.name} doesn't add up: the parts come to ${rsFmt(g.sum)} mm but the overall is ${rsFmt(g.gt)} mm (out by ${rsFmt(Math.abs(g.gt - g.sum))} mm). `,
    )
    .join("");
  return (
    bad +
    (miss.length
      ? `Tap each wall to type its length. Still to measure: ${miss.join(", ")}.`
      : G.gap
        ? `All walls measured, but they're out by ${rsFmt(G.gap.mm)} mm (shown in red).`
        : "All walls measured: the room is now drawn to scale.")
  );
}
/* how a room object is placed on the page: page = t + g × (sketch units, or mm once every wall is measured) */
function rsXf(o, doc) {
  const room = rsRoomOf(o, doc),
    all = room.walls.every((w) => w.len > 0);
  if (!all) return { r: room, g: 1, t: [0, 0], all };
  const r = Object.assign({}, room, { mode: "scale" }),
    G = rsGeom(r, true),
    k = Math.min(Math.max(0, room.gapAt | 0), room.walls.length - 1);
  let g;
  if (doc.scale > 0) g = NP_U / doc.scale;
  else {
    const sk = o.p.reduce((s, a, i) => s + rsLen(rsSub(o.p[(i + 1) % o.p.length], a)), 0),
      mm = room.walls.reduce((s, w) => s + w.len, 0);
    g = mm ? sk / mm : 1;
  }
  return { r, g, t: rsSub(o.p[k], [G.walls[k].a[0] * g, G.walls[k].a[1] * g]), all };
}
function rsDrawInDrawing(ctx, o, doc) {
  const { r, g, t, all } = rsXf(o, doc);
  const txt = RS_TXT * NP_U,
    pen = rsCanvasPen(ctx, 0, 0, 1);
  const res = rsRender(pen, r, {
    W: doc.w,
    H: doc.h,
    frame: false,
    fit: false,
    inDrawing: true,
    fixT: { g, t },
    kf: NP_U,
    scale: doc.scale || 1,
    txt,
    lw: 0.6 * NP_U,
  });
  if (!all || !(doc.scale > 0)) {
    const O = res.G.outline.map(res.T);
    pen.text(
      "NOT TO SCALE",
      [Math.min(...O.map((q) => q[0])), Math.min(...O.map((q) => q[1])) - 6.2 * txt],
      {
        size: txt,
        bold: true,
        c: RS_RED,
        align: "left",
      },
    );
  }
  /* where each wall is on the page, for tapping (not saved with the drawing) */
  Object.defineProperty(o, "__hit", {
    value: res.G.walls.map((w) => [res.T(w.a), res.T(w.b)]),
    writable: true,
    configurable: true,
    enumerable: false,
  });
}
/* the room wall nearest p (page units) within tol, from the rooms on this page: { o, i } or null */
function rsHitDrawing(objs, p, tol) {
  let best = null,
    bd = tol;
  (objs || []).forEach((o) => {
    if (!o || o.t !== "rsk" || !o.__hit) return;
    o.__hit.forEach(([a, b], i) => {
      const ab = rsSub(b, a),
        L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1,
        k = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2)),
        d = rsLen(rsSub(p, rsAdd(a, ab, k)));
      if (d < bd) {
        bd = d;
        best = { o, i };
      }
    });
  });
  return best;
}
/* open wall i's form over the drawing; done(status) after a change, onDelete() to remove the room */
function rsEditInDrawing(o, i, done, onDelete, doc, onWalls) {
  const room = rsRoomOf(o, doc),
    xf = rsXf(o, doc);
  /* measured corners are in mm: put them back on the page where the room is drawn now */
  const toPts = (r) => {
    const G = rsGeom(r);
    return G.vec ? G.walls.map((w) => rsAdd(xf.t, w.a, xf.g)) : G.walls.map((w) => w.a.slice());
  };
  rsWallForm(
    room,
    i,
    () => {
      o.p = room.pts;
      o.room.walls = room.walls;
      o.room.gapAt = room.gapAt;
      done(rsStatus(room));
    },
    onDelete,
    toPts,
    onWalls,
  );
}
/* the walls of the room sketches on a page as the drawing tool's own wall shapes (not saved; for doors and windows
   to sit in): one per wall face as drawn now, a typical 100 mm wall thick at the drawing's scale */
function rsWallsAsShapes(objs) {
  const out = [];
  (objs || []).forEach((o) => {
    if (o && o.t === "rsk" && o.__hit)
      o.__hit.forEach(([a, b]) => out.push({ t: "shape", k: "wall", a, b, w: 2, th: 10 }));
  });
  return out;
}
/* the largest of these scales (smallest number) at which every fully measured room sketch on the page fits paper
   w × h mm with room for its measurements and the title block; null if there is no measured room, 0 if none fit */
function rsBestScale(objs, w, h, scales) {
  const rooms = (objs || []).filter(
    (o) => o && o.t === "rsk" && o.room.walls.every((x) => x.len > 0),
  );
  if (!rooms.length) return null;
  let bw = 0,
    bh = 0;
  rooms.forEach((o) => {
    const [a, b] = rsBox(Object.assign({}, o.room, { pts: o.p }));
    bw = Math.max(bw, a);
    bh = Math.max(bh, b);
  });
  const A = rsAllow(RS_TXT);
  return (
    scales
      .slice()
      .sort((x, y) => x - y)
      .find((s) => bw / s + 2 * A <= w - 20 && bh / s + 2 * A <= h - 20 - 40) || 0
  );
}
/* wall build-ups offered when a room becomes real walls: [name, thickness mm, drawing tool wall kind] */
const RS_WALLS = [
  ["100 mm block (internal)", 100, "wall"],
  ["140 mm block", 140, "wall"],
  ["215 mm block", 215, "wall"],
  ["Brick, half (102.5 mm)", 102.5, "wall"],
  ["Cavity wall (300 mm: block, 100 cavity, brick)", 300, "cavity"],
  ["Timber stud (100 mm + boards)", 125, "tstud"],
];
/* a measured room as real walls round its inside face (page units): the wall centre lines (the room outline moved
   out by half the thickness, corners mitred) and its measurements as the drawing tool's own dimensions */
function rsWallsFromRoom(o, doc, thMm) {
  const { r, g, t } = rsXf(o, doc),
    dims = [],
    txt = RS_TXT * NP_U;
  const pen = {
    px: (p) => p,
    line() {},
    poly() {},
    rect() {},
    circle() {},
    text() {},
    dim(A, B, out, off, label, tx, c) {
      const L = rsLen(rsSub(B, A)) || 1,
        n = [-(B[1] - A[1]) / L, (B[0] - A[0]) / L],
        sg = out[0] * n[0] + out[1] * n[1] >= 0 ? 1 : -1;
      dims.push({
        t: "dim",
        a: A,
        b: B,
        off: off * sg,
        s: label,
        c: "#111111",
        w: 1.5,
        size: Math.round(tx * 0.95),
      });
    },
  };
  const th = doc.scale > 0 ? (thMm * NP_U) / doc.scale : thMm * g;
  /* the measurements sit outside the new walls */
  const res = rsRender(pen, r, {
    W: doc.w,
    H: doc.h,
    frame: false,
    fit: false,
    inDrawing: true,
    fixT: { g, t },
    kf: NP_U,
    scale: doc.scale || 1,
    txt: txt,
    lw: 3,
  });
  dims.forEach((d) => (d.off += (d.off >= 0 ? 1 : -1) * th));
  const O = res.G.outline.map(res.T).filter((q, k, A) => !k || rsLen(rsSub(q, A[k - 1])) > 1e-6);
  const n = O.length;
  if (n < 3) return { walls: [], dims };
  /* which way is outside, from the middle of the longest side */
  let li = 0;
  O.forEach((q, k) => {
    if (rsLen(rsSub(O[(k + 1) % n], q)) > rsLen(rsSub(O[(li + 1) % n], O[li]))) li = k;
  });
  const ul = rsNorm(rsSub(O[(li + 1) % n], O[li])),
    nl = [-ul[1], ul[0]],
    m = [(O[li][0] + O[(li + 1) % n][0]) / 2, (O[li][1] + O[(li + 1) % n][1]) / 2],
    out = rsInside(rsAdd(m, nl, 0.5), O) ? -1 : 1;
  const sideOff = (k) => {
    const u = rsNorm(rsSub(O[(k + 1) % n], O[k])),
      nn = [-u[1] * out, u[0] * out];
    return { a: rsAdd(O[k], nn, th / 2), u };
  };
  const S = O.map((q, k) => sideOff(k));
  const C = O.map((q, k) => {
    const p = S[(k - 1 + n) % n],
      c = S[k],
      cr = rsCross(p.u, c.u);
    if (Math.abs(cr) < 1e-9) return c.a;
    return rsAdd(p.a, p.u, rsCross(rsSub(c.a, p.a), c.u) / cr);
  });
  return { walls: C.map((a, k) => ({ a, b: C[(k + 1) % n] })), dims };
}
