/* ================= CUPBOARD 3D: a 3D picture of a fitted cupboard or wardrobe for the client, in their colours ================= */
import { ptOwnerSign } from "../clients/portal-calendar.js";
import { ptOf, ptSrc } from "../clients/portal.js";
import { esc, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { cba3Model } from "./cupboard-alcove.js";
import {
  CB_BAYS,
  CB_DOORS,
  cbBayDoor,
  cbHAt,
  cbPlan,
  cbSlopeOn,
  cbSlopeW,
} from "./cupboard-maker.js";
import { cb3ExtFaces, cbs3Model, cbsIs } from "./cupboard-shapes.js";
import { uploadFile } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { jfSave } from "../sales/job-file.js";
export { CB3_COLS, cb3Draw, cb3LookFor, cb3Model, cb3Open, shadeHex };
/* From the sizes on a cupboard page (🗄️ Cupboards): the carcass, plinth, back, divisions, shelves, rails, drawers and
   doors are built as boxes in millimetres and drawn in perspective with light and shade on a canvas – no outside
   library. Turn it with the slider and open the doors to see inside. Change the door type (hinged, pairs, sliding,
   none), door style (plain, shaker, glass, mirror), handles and the colours of the doors and the carcass. Save the
   picture, or a one-page PDF for the client with the logo, the views and the finishes. The look chosen is kept
   with the page. It's an illustration: real finishes vary. */
const CB3_COLS = [
  ["#f4f4f1", "Brilliant white"],
  ["#efe6d2", "Cream"],
  ["#d9d6cf", "Light grey"],
  ["#b9ad9a", "Stone"],
  ["#9aa88f", "Sage green"],
  ["#8d9fb0", "Dusty blue"],
  ["#2f3d55", "Navy"],
  ["#3b3e42", "Anthracite"],
  ["#1f1f1f", "Black"],
  ["#c9a477", "Light oak"],
  ["#6b4a33", "Walnut"],
];
const CB3_STYLES = [
  ["slab", "Plain"],
  ["shaker", "Shaker"],
  ["glass", "Glass"],
  ["mirror", "Mirror"],
];
const CB3_HANDLES = [
  ["bar", "Bar – steel"],
  ["black", "Bar – black"],
  ["knob", "Knob"],
  ["none", "None (push to open)"],
  ["gola", "Gola channel"],
];
const cb3ColName = (c) => (CB3_COLS.find((x) => x[0] === c) || [c, c])[1];
/* --- the model: boxes in mm. x along the front, y up from the floor, z out from the wall --- */
function cb3Model(sp, look, open) {
  const P = cbPlan(sp);
  const t = sp.t,
    W = sp.W,
    H = sp.H,
    D = sp.D,
    PL = sp.plinth || 0,
    bt = sp.bt || 0;
  const car = look.carcass,
    doorC = look.door;
  const inside = shadeHex(car, 0.93);
  const steel = "#b8bcc1";
  const out = [];
  const box = (x0, y0, z0, x1, y1, z1, c, o) =>
    out.push(Object.assign({ b: [x0, y0, z0, x1, y1, z1], c }, o || {}));
  /* carcass */
  box(0, 0, 0, t, H, D, car);
  box(W - t, 0, 0, W, H, D, car);
  box(t, H - t, 0, W - t, H, D, car);
  box(t, PL, 0, W - t, PL + t, D, car);
  if (PL) box(t, 0, 20, W - t, PL, D - 60, shadeHex(car, 0.8));
  if (bt) box(t, PL + t, 0, W - t, H - t, bt, inside, { inner: 1 });
  const bx = [];
  let x = t;
  P.ws.forEach((w, i) => {
    bx.push([x, x + w]);
    x += w;
    if (i < P.n - 1) {
      box(x, PL + t, bt, x + t, H - t, D, car, { inner: 1 });
      x += t;
    }
  });
  /* inside each bay: drawers, shelves, fixed shelves, rails – from the bay's layout (cupboard-maker.js) */
  const dep0 = bt,
    dep1 = D - (look.type === "sliding" ? 90 : 25);
  const shelfC = look.shelf || car;
  const dT = P.dt || t;
  /* a bay with doors over it hides its inside; open bays, desks and open middles always show */
  const perBay0 = look.type === (sp.doors || "hinged") && look.type !== "sliding";
  const shut = (b) =>
    !sp.openUnit &&
    b.k !== "desk" &&
    b.k !== "basewall" &&
    (look.type === "sliding" ||
      ((look.type === "hinged" || look.type === "pairs") &&
        (!perBay0 || cbBayDoor(sp, b) !== "none")));
  P.bays.forEach((b, i) => {
    const [x0, x1] = bx[i];
    const L = b.L;
    const inn = shut(b) ? 1 : 0;
    const front = b.k === "desk";
    L.drawers.forEach((d) => {
      const z1 = front ? D : dep1;
      box(x0 + 2, d.y + 2, z1 - dT, x1 - 2, d.y + d.h - 2, z1, doorC, {
        inner: front ? 0 : inn,
        top: front ? 0.5 : 0,
      });
      if (look.handle !== "none")
        box(
          (x0 + x1) / 2 - 50,
          d.y + d.h / 2 - 6,
          z1,
          (x0 + x1) / 2 + 50,
          d.y + d.h / 2 + 6,
          z1 + 18,
          look.handle === "black" ? "#222222" : steel,
          {
            inner: front ? 0 : inn,
            top: front ? 1 : 0,
          },
        );
    });
    const shelf = (y, full) =>
      box(x0, y - P.sht / 2, dep0, x1, y + P.sht / 2, full ? D : dep1 - 10, shelfC, {
        inner: full ? 0 : inn,
        top: full ? 0.5 : 0,
      });
    L.shelves.forEach((y) => shelf(y));
    L.fixed.forEach((f) => shelf(f.y, front && /Desk/.test(f.part)));
    L.rails.forEach((y) =>
      box(x0 + 4, y - 9, (D - 20) / 2 - 8, x1 - 4, y + 9, (D - 20) / 2 + 8, steel, { inner: inn }),
    );
    /* the lights, warm and glowing */
    const lt = sp.lightType || (b.led ? "strip" : "");
    if (lt && (b.led || sp.lightAll)) {
      const glow = "#ffe7a3";
      if (lt === "puck")
        (x1 - x0 > 700 ? [0.3, 0.7] : [0.5]).forEach((f) => {
          const cx = x0 + (x1 - x0) * f;
          box(cx - 30, P.iT - 8, D / 2 - 30, cx + 30, P.iT, D / 2 + 30, glow, { inner: inn });
        });
      else if (lt === "profile")
        [x0 + 2, x1 - 14].forEach((xx) =>
          box(xx, P.iB + 20, D - 60, xx + 12, P.iT - 20, D - 40, glow, { inner: inn }),
        );
      else if (lt === "rail" && L.rails.length)
        L.rails.forEach((y) =>
          box(x0 + 6, y - 11, (D - 20) / 2 - 10, x1 - 6, y - 7, (D - 20) / 2 + 10, glow, {
            inner: inn,
          }),
        );
      else box(x0 + 10, P.iT - 10, D - 80, x1 - 10, P.iT, D - 50, glow, { inner: inn });
    }
  });
  /* doors */
  const gap = 3,
    dy0 = PL + 1.5,
    dy1 = H - 1.5;
  const th = dT;
  const handle = (hx, cy, z, rot, ya, yb) => {
    if (look.handle === "none") return;
    /* gola: a finger channel down the door edge */
    if (look.handle === "gola") {
      box(hx - 12, ya, z - 3, hx + 12, yb, z + 1, "#7d8288", { rot, top: 1 });
      return;
    }
    const c = look.handle === "black" ? "#222222" : steel;
    const len = yb - ya > 1200 ? 320 : 160;
    if (look.handle === "knob")
      box(hx - 14, cy - 14, z, hx + 14, cy + 14, z + 28, c, { rot, top: 1 });
    else box(hx - 7, cy - len / 2, z + 8, hx + 7, cy + len / 2, z + 26, c, { rot, top: 1 });
  };
  /* a door leaf from x0 to x1 and ya to yb at the front (z D..D+th), turned about its hinge by `rot` */
  const leaf = (x0, x1, z0, rot, hingeL, st, ya, yb) => {
    ya = ya == null ? dy0 : ya;
    yb = yb == null ? dy1 : yb;
    const style = st || look.style;
    const z1 = z0 + th;
    const fc = style === "mirror" ? "#cfd8dc" : doorC;
    if (style === "glass") {
      const f = 70;
      box(x0, ya, z0, x0 + f, yb, z1, fc, { rot, top: 0.5 });
      box(x1 - f, ya, z0, x1, yb, z1, fc, { rot, top: 0.5 });
      box(x0 + f, yb - f, z0, x1 - f, yb, z1, fc, { rot, top: 0.5 });
      box(x0 + f, ya, z0, x1 - f, ya + f, z1, fc, { rot, top: 0.5 });
      box(x0 + f, ya + f, z0 + th / 2 - 2, x1 - f, yb - f, z0 + th / 2 + 2, "#bcd6dd", {
        rot,
        glass: 1,
      });
    } else {
      box(x0, ya, z0, x1, yb, z1, fc, { rot, top: 0.5, mirror: style === "mirror" ? 1 : 0 });
      if (style === "shaker") {
        const f = Math.min(70, (yb - ya) / 4),
          zf = z1,
          zz = z1 + 5;
        box(x0, ya, zf, x0 + f, yb, zz, fc, { rot, top: 0.5 });
        box(x1 - f, ya, zf, x1, yb, zz, fc, { rot, top: 0.5 });
        box(x0 + f, yb - f, zf, x1 - f, yb, zz, fc, { rot, top: 0.5 });
        box(x0 + f, ya, zf, x1 - f, ya + f, zz, fc, { rot, top: 0.5 });
        const mid = ya + (yb - ya) * 0.55;
        if (yb - ya > 1400)
          box(x0 + f, mid - f / 2, zf, x1 - f, mid + f / 2, zz, fc, { rot, top: 0.5 });
      }
    }
    const hx = hingeL ? x1 - 45 : x0 + 45;
    const hy =
      yb - ya > 1200 ? Math.min(1050, (ya + yb) / 2) : ya > 1500 ? ya + 110 : (ya + yb) / 2;
    handle(hx, hy, z1 + (style === "shaker" ? 5 : 0), rot, ya, yb);
  };
  const type = look.type;
  /* each bay's own doors, unless a different door type was picked here */
  const perBay = type === (sp.doors || "hinged") && type !== "sliding";
  if (sp.openUnit) {
    /* an open unit in a shape (shelves, cubbies) never gets doors */
  } else if (type === "hinged" || type === "pairs") {
    bx.forEach(([x0, x1], i) => {
      const b = P.bays[i];
      const bd = perBay ? cbBayDoor(sp, b) : type;
      if (bd === "none") return;
      const a = x0 - t / 2 + gap / 2,
        b2 = x1 + t / 2 - gap / 2;
      const L0 = i === 0 ? 0 + gap / 2 : a,
        L1 = i === bx.length - 1 ? W - gap / 2 : b2;
      b.L.zones.forEach((z) => {
        const ya = z.y0 + 1.5,
          yb = z.y1 - 1.5;
        const leaves =
          bd === "pairs"
            ? [
                [L0, (L0 + L1) / 2 - gap / 2, true],
                [(L0 + L1) / 2 + gap / 2, L1, false],
              ]
            : [[L0, L1, i % 2 === 0]];
        leaves.forEach(([u0, u1, hl]) => {
          const rot = open ? { px: hl ? u0 : u1, pz: D, a: hl ? -1.75 : 1.75 } : null;
          leaf(
            u0,
            u1,
            D,
            rot,
            hl,
            bd === "glass" ? "glass" : bd === "mirror" ? "mirror" : null,
            ya,
            yb,
          );
        });
      });
    });
  } else if (type === "sliding") {
    const np = Math.max(2, Math.min(4, P.n));
    const span = (W - 2 * t) / np;
    for (let k = 0; k < np; k++) {
      const front = k % 2 === 0;
      let u0 = t + k * span - (k ? 20 : 0),
        u1 = t + (k + 1) * span + (k < np - 1 ? 20 : 0);
      if (open && front) {
        const sh = k < np - 1 ? span - 40 : -(span - 40);
        u0 += sh;
        u1 += sh;
      }
      const z0 = D - 70 + (front ? 35 : 0);
      leaf(u0, u1, z0, null, k % 2 === 1);
    }
    box(t, H - t - 30, D - 75, W - t, H - t, D - 2, "#9a9ea3");
  }
  /* fillers, end panels and cornice */
  const fL = +sp.fillL || 0,
    fR = +sp.fillR || 0,
    eL = sp.endL ? t : 0,
    eR = sp.endR ? t : 0,
    cH = +sp.cornice || 0,
    fT = +sp.fillT || 0;
  if (eL) box(-eL, 0, 0, 0, H, D + t, doorC);
  if (eR) box(W, 0, 0, W + eR, H, D + t, doorC);
  if (fL) box(-eL - fL, 0, D - 20, -eL, H + cH + fT, D + t, doorC);
  if (fR) box(W + eR, 0, D - 20, W + eR + fR, H + cH + fT, D + t, doorC);
  if (fT) box(-eL - fL, H, D - 20, W + eR + fR, H + fT, D + t, doorC);
  if (cH) box(-eL - fL, H + fT, 0, W + eR + fR, H + fT + cH, D + t + 10, doorC);
  /* a face frame on the front */
  const FF = P.ff;
  if (FF) {
    const z0 = D - 2,
      z1 = D + 2;
    box(0, PL, z0, FF.w, cbHAt(sp, 0), z1, doorC, { top: 1 });
    box(W - FF.w, PL, z0, W, cbHAt(sp, W), z1, doorC, { top: 1 });
    box(FF.w, PL, z0, W - FF.w, PL + FF.r, z1, doorC, { top: 1 });
    if (!cbSlopeOn(sp)) box(FF.w, H - FF.r, z0, W - FF.w, H, z1, doorC, { top: 1 });
    for (let i = 1; i < P.n; i++) {
      const xc = P.bx0[i] - t / 2;
      box(xc - FF.m / 2, PL, z0, xc + FF.m / 2, cbHAt(sp, xc), z1, doorC, { top: 1 });
    }
  }
  /* a sloping ceiling: every part is cut to the slope – sliced across so each slice stops under it (doors keep their
     hinge turn) – and a raking top board runs along it */
  if (cbSlopeOn(sp)) {
    const cutOut = [];
    out.forEach((o) => {
      if (!o.b) return cutOut.push(o);
      const [x0, y0, z0, x1, y1, z1] = o.b;
      if (y1 <= Math.min(cbHAt(sp, x0), cbHAt(sp, x1)) + 0.5) return cutOut.push(o);
      const k = Math.max(1, Math.min(24, Math.ceil((x1 - x0) / 40)));
      for (let i = 0; i < k; i++) {
        const xa = x0 + ((x1 - x0) * i) / k,
          xb = x0 + ((x1 - x0) * (i + 1)) / k;
        const top = Math.min(y1, cbHAt(sp, xa), cbHAt(sp, xb));
        if (top > y0 + 1)
          cutOut.push(Object.assign({}, o, { b: [xa, y0, z0, xb, top, z1], slice: k > 1 ? 1 : 0 }));
      }
    });
    out.length = 0;
    out.push(...cutOut);
    const sw = cbSlopeW(sp),
      lo = +sp.slopeLow;
    const xs = sp.slope === "L" ? [0, sw] : [W - sw, W];
    const ys = xs.map((x) => cbHAt(sp, x));
    out.push({
      ext: {
        pts: [
          [xs[0], ys[0] - t],
          [xs[1], ys[1] - t],
          [xs[1], ys[1]],
          [xs[0], ys[0]],
        ],
        z0: 0,
        z1: D,
      },
      c: car,
    });
    void lo;
  }
  return out;
}
function shadeHex(hex, k) {
  const n = parseInt(String(hex).slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * k)),
    g = Math.min(255, Math.round(((n >> 8) & 255) * k)),
    b = Math.min(255, Math.round((n & 255) * k));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
/* --- drawing it --- */
function cb3Draw(cv, sp, look, open, yaw) {
  const g = cv.getContext("2d");
  const Wc = cv.width,
    Hc = cv.height;
  const W = sp.W,
    H = sp.H,
    D = sp.D;
  const boxes = (cbsIs(sp) ? cbs3Model : sp.kind && sp.kind !== "full" ? cba3Model : cb3Model)(
    sp,
    look,
    open,
  ).filter(
    (o) =>
      !o.inner ||
      open ||
      look.style === "glass" ||
      look.type === "none" ||
      (sp.bays || []).some((b) => b.door === "glass" || b.door === "none"),
  );
  /* camera: eye 1.6 m up, in front, turned by yaw */
  const tgt = [W / 2, H * 0.48, D / 2];
  const R = 1.7 * Math.max(W, H) + D * 2;
  const cam = [tgt[0] + R * Math.sin(yaw), 1600 + H * 0.15, tgt[2] + R * Math.cos(yaw)];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const nrm = (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  const f = nrm(sub(tgt, cam)),
    r = nrm(cross(f, [0, 1, 0])),
    u = cross(r, f);
  const proj0 = (p) => {
    const v = sub(p, cam);
    const z = dot(v, f);
    return [dot(v, r) / z, dot(v, u) / z, z];
  };
  /* faces of every box */
  const faces = [];
  const FI = [
    [0, 1, 3, 2],
    [4, 6, 7, 5],
    [0, 4, 5, 1],
    [2, 3, 7, 6],
    [0, 2, 6, 4],
    [1, 5, 7, 3],
  ];
  const L = nrm([-0.45, 0.75, 0.6]);
  boxes.forEach((o) => {
    const xq = o.ext || o.extZ ? cb3ExtFaces(o) : null;
    let pts = [];
    if (xq) xq.forEach((q) => q.forEach((p) => pts.push(p)));
    else {
      const [x0, y0, z0, x1, y1, z1] = o.b;
      for (const X of [x0, x1])
        for (const Y of [y0, y1]) for (const Z of [z0, z1]) pts.push([X, Y, Z]);
    }
    if (o.rot) {
      const c = Math.cos(o.rot.a),
        s = Math.sin(o.rot.a);
      pts = pts.map(([X, Y, Z]) => {
        const dx = X - o.rot.px,
          dz = Z - o.rot.pz;
        return [o.rot.px + dx * c + dz * s, Y, o.rot.pz - dx * s + dz * c];
      });
    }
    const ctr = pts.reduce(
      (a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length],
      [0, 0, 0],
    );
    (xq || FI.map((ix) => ix.map((i) => pts[i]))).forEach((q) => {
      let n = nrm(cross(sub(q[1], q[0]), sub(q[2], q[0])));
      const fc = q.reduce(
        (a, p) => [a[0] + p[0] / q.length, a[1] + p[1] / q.length, a[2] + p[2] / q.length],
        [0, 0, 0],
      );
      if (dot(n, sub(fc, ctr)) < 0) n = [-n[0], -n[1], -n[2]];
      if (dot(n, sub(cam, fc)) <= 0) return;
      const lit = 0.58 + 0.42 * Math.max(0, dot(n, L));
      faces.push({
        q,
        d: Math.hypot(...sub(fc, cam)),
        col: shadeHex(o.c, lit),
        glass: o.glass,
        mirror: o.mirror,
        top: o.top || 0,
        slice: o.slice || 0,
        n,
      });
    });
  });
  /* fit to the canvas */
  let mnx = Infinity,
    mxx = -Infinity,
    mny = Infinity,
    mxy = -Infinity;
  const room = [
    [-500, 0, D + 500],
    [W + 500, 0, D + 500],
    [-500, H + 150, 0],
    [W + 500, H + 150, 0],
  ];
  faces
    .flatMap((fa) => fa.q)
    .concat(room)
    .forEach((p) => {
      const [x, y] = proj0(p);
      mnx = Math.min(mnx, x);
      mxx = Math.max(mxx, x);
      mny = Math.min(mny, y);
      mxy = Math.max(mxy, y);
    });
  const k = Math.min((Wc * 0.92) / (mxx - mnx), (Hc * 0.92) / (mxy - mny));
  const ox = Wc / 2 - ((mnx + mxx) / 2) * k,
    oy = Hc / 2 + ((mny + mxy) / 2) * k;
  const P2 = (p) => {
    const [x, y] = proj0(p);
    return [ox + x * k, oy - y * k];
  };
  const poly = (pts, fill, stroke, alpha) => {
    g.beginPath();
    pts.forEach((p, i) => {
      const [x, y] = P2(p);
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    g.closePath();
    g.globalAlpha = alpha == null ? 1 : alpha;
    g.fillStyle = fill;
    g.fill();
    g.globalAlpha = 1;
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = 0.8;
      g.stroke();
    }
  };
  /* the room: wall and floor, and a soft shadow */
  g.fillStyle = look.wall || "#ece9e4";
  g.fillRect(0, 0, Wc, Hc);
  poly(
    [
      [-1500, 0, 0],
      [W + 1500, 0, 0],
      [W + 1500, H + 1500, 0],
      [-1500, H + 1500, 0],
    ],
    look.wall || "#ece9e4",
  );
  poly(
    [
      [-1500, 0, 0],
      [W + 1500, 0, 0],
      [W + 1500, 0, D + 1500],
      [-1500, 0, D + 1500],
    ],
    look.floor || "#cdbfa9",
  );
  poly(
    [
      [-60, 0, 0],
      [W + 60, 0, 0],
      [W + 140, 0, D + 140],
      [-140, 0, D + 140],
    ],
    "#000000",
    null,
    0.12,
  );
  faces.sort((a, b) => a.top - b.top || b.d - a.d);
  faces.forEach((fa) => {
    if (fa.glass) poly(fa.q, fa.col, "rgba(0,0,0,.25)", 0.35);
    else if (fa.mirror && fa.n[2] > 0.5) {
      const [a0, a1] = [P2(fa.q[0]), P2(fa.q[2])];
      const gr = g.createLinearGradient(a0[0], a0[1], a1[0], a1[1]);
      gr.addColorStop(0, "#e8eef0");
      gr.addColorStop(0.45, "#b9c6cb");
      gr.addColorStop(0.55, "#dfe7ea");
      gr.addColorStop(1, "#a9b6bb");
      poly(fa.q, gr, "rgba(0,0,0,.35)");
    } else poly(fa.q, fa.col, fa.slice ? fa.col : "rgba(0,0,0,.28)");
  });
}
/* --- the screen --- */
/* the look the 3D view starts with: what was picked in the cupboard form, then any changes made in the 3D view */
function cb3LookFor(sp, look0) {
  return Object.assign(
    {
      type: sp.doors && sp.doors !== "none" ? sp.doors : "hinged",
      style: sp.slideMirror && sp.doors === "sliding" ? "mirror" : "slab",
      door: sp.colDoor || "#f4f4f1",
      carcass: sp.colCar || "#f4f4f1",
      handle: sp.handle || "bar",
      top: sp.colTop || "#c9a477",
      shelf: sp.colTop || "",
    },
    look0 || {},
  );
}
function cb3Open(sp, look0, onLook, meta) {
  meta = meta || {};
  const look = cb3LookFor(sp, look0);
  let open = false,
    yaw = -0.45;
  const d = document.createElement("div");
  d.className = "cb3";
  const sw = (id, v) =>
    `<div class="cb3-sw" id="${id}" role="group">${CB3_COLS.map(([c, n]) => `<button type="button" data-c="${c}" title="${esc(n)}" aria-label="${esc(n)}" aria-pressed="${c === v}" style="background:${c}"></button>`).join("")}</div>`;
  d.innerHTML = `<div class="cb3-top"><b>🎨 ${esc(sp.name || "Cupboard")} – 3D view</b><button type="button" class="btn" id="cb3-x">Close</button></div>
    <div class="cb3-body"><div class="cb3-pic"><canvas id="cb3-cv" width="1400" height="1000" aria-label="3D picture of the cupboard"></canvas>
      <label class="cb3-turn">Turn it<input id="cb3-yaw" type="range" min="-70" max="70" value="${Math.round((yaw * 180) / Math.PI)}"></label></div>
    <div class="cb3-side">
      <div class="seg" id="cb3-open"><button type="button" data-v="0" aria-pressed="true">Doors shut</button><button type="button" data-v="1" aria-pressed="false">Doors open</button></div>
      <label for="cb3-type">Doors<select id="cb3-type">${CB_DOORS.map(([k, l]) => `<option value="${k}"${k === look.type ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      <label for="cb3-style">Door style<select id="cb3-style">${CB3_STYLES.map(([k, l]) => `<option value="${k}"${k === look.style ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      <label for="cb3-hd">Handles<select id="cb3-hd">${CB3_HANDLES.map(([k, l]) => `<option value="${k}"${k === look.handle ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      <div class="flabel">Door colour <span class="who" id="cb3-dn">${esc(cb3ColName(look.door))}</span></div>${sw("cb3-door", look.door)}
      <div class="flabel">Inside / carcass colour <span class="who" id="cb3-cn">${esc(cb3ColName(look.carcass))}</span></div>${sw("cb3-car", look.carcass)}
      <div class="flabel">${sp.kind && sp.kind !== "full" ? "Top and shelves colour" : "Shelves colour"} <span class="who" id="cb3-tn">${esc(cb3ColName(look.shelf || (sp.kind && sp.kind !== "full" ? look.top : look.carcass) || "#c9a477"))}</span></div>${sw("cb3-top", look.shelf || (sp.kind && sp.kind !== "full" ? look.top : look.carcass) || "#c9a477")}
      <div class="actions"><button type="button" class="btn" id="cb3-png">🖼️ Save picture</button><button type="button" class="btn primary" id="cb3-pdf">📄 PDF for the client</button><button type="button" class="btn" id="cb3-sign">✍️ Client sign-off</button></div>
      <div class="who">An illustration from your sizes – real colours and finishes vary.</div>
    </div></div>`;
  document.body.appendChild(d);
  const cv = d.querySelector("#cb3-cv");
  const q = (id) => d.querySelector("#" + id);
  const draw = () => {
    cb3Draw(cv, sp, look, open, yaw);
    if (onLook) onLook(Object.assign({}, look));
  };
  q("cb3-x").onclick = () => d.remove();
  q("cb3-yaw").oninput = () => {
    yaw = (+q("cb3-yaw").value * Math.PI) / 180;
    cb3Draw(cv, sp, look, open, yaw);
  };
  q("cb3-open")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          open = b.dataset.v === "1";
          q("cb3-open")
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          draw();
        }),
    );
  q("cb3-type").onchange = () => ((look.type = q("cb3-type").value), draw());
  q("cb3-style").onchange = () => ((look.style = q("cb3-style").value), draw());
  q("cb3-hd").onchange = () => ((look.handle = q("cb3-hd").value), draw());
  [
    ["cb3-door", "door", "cb3-dn"],
    ["cb3-car", "carcass", "cb3-cn"],
    ["cb3-top", "top", "cb3-tn"],
  ]
    .filter(([id]) => q(id))
    .forEach(([id, key, lab]) =>
      q(id)
        .querySelectorAll("button")
        .forEach(
          (b) =>
            (b.onclick = () => {
              look[key] = b.dataset.c;
              if (key === "top") look.shelf = b.dataset.c;
              q(id)
                .querySelectorAll("button")
                .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
              q(lab).textContent = cb3ColName(b.dataset.c);
              draw();
            }),
        ),
    );
  q("cb3-png").onclick = () =>
    cv.toBlob(async (b) => {
      try {
        await S.dl.save({ filename: (sp.name || "Cupboard") + " 3D.png", data: b });
      } catch (e) {
        toast("Couldn't save the picture");
      }
    }, "image/png");
  q("cb3-pdf").onclick = () => cb3Pdf(sp, look, yaw, meta);
  q("cb3-sign").onclick = () => cb3SignOff(sp, look, yaw, meta);
  draw();
  return d;
}
/* one page for the client: the cupboard shut and open, its sizes and the finishes */
async function cb3PdfBlob(sp, look, yaw, meta) {
  meta = meta || {};
  {
    await loadJsPdf();
    const pic = (open, w, h) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      cb3Draw(c, sp, look, open, yaw);
      return c.toDataURL("image/jpeg", 0.9);
    };
    const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    const [r, g, b] = BRGB();
    await pdfLogo(doc, 282, 10, 50, 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(r, g, b);
    doc.text(sp.name || "Your new cupboard", 15, 20);
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    doc.text(coData().name || "", 15, 27);
    doc.addImage(pic(false, 1400, 1000), "JPEG", 15, 34, 168, 120);
    doc.addImage(pic(true, 1000, 714), "JPEG", 190, 34, 92, 66);
    doc.setFontSize(9);
    doc.text("With the doors open", 190, 104);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    let y = 114;
    const row = (k, v) => {
      doc.setFont("helvetica", "bold");
      doc.text(k, 190, y);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(String(v), 57);
      doc.text(lines, 225, y);
      y += 5 * lines.length + 1;
    };
    row("Size", `${sp.W} wide × ${sp.H} high × ${sp.D} deep (mm)`);
    row(
      "Doors",
      (CB_DOORS.find((x) => x[0] === look.type) || ["", ""])[1].replace(/ –.*/, "") +
        ", " +
        (CB3_STYLES.find((x) => x[0] === look.style) || ["", ""])[1].toLowerCase(),
    );
    row("Door colour", look.style === "mirror" ? "Mirror" : cb3ColName(look.door));
    row("Inside", cb3ColName(look.carcass));
    row("Handles", (CB3_HANDLES.find((x) => x[0] === look.handle) || ["", ""])[1]);
    row(
      "Inside layout",
      cbPlan(sp)
        .bays.map((bb) => (CB_BAYS.find((x) => x[0] === bb.k) || ["", ""])[1].replace(/,.*/, ""))
        .join(" · ")
        .slice(0, 160),
    );
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(
      "Illustration from the measured sizes. Colours on screen and in print vary from the real finish – samples on request.",
      15,
      162,
    );
    /* client approval, for signing on paper (or it's signed in the portal) */
    doc.setDrawColor(150, 150, 150);
    doc.setTextColor(0, 0, 0);
    doc.rect(15, 168, 165, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Client approval", 18, 174);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      "I'm happy with the design, sizes and finishes shown and want it made as shown.",
      18,
      179,
    );
    [
      ["Name", 18],
      ["Signed", 75],
      ["Date", 135],
    ].forEach(([l, x]) => {
      doc.text(l, x, 193);
      doc.line(x + 11, 193, x + (l === "Date" ? 42 : 52), 193);
    });
    /* the corner box, as on the drawings */
    const bx = 187,
      bw = 95;
    let by = 160;
    if (meta.status) {
      doc.setFillColor(r, g, b);
      doc.rect(bx, by - 6, bw, 6, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(String(meta.status).toUpperCase(), bx + bw / 2, by - 2, { align: "center" });
    }
    doc.setDrawColor(60, 60, 60);
    doc.rect(bx, by, bw, 38);
    doc.setFillColor(r, g, b);
    doc.rect(bx, by, bw, 1.2, "F");
    doc.setTextColor(r, g, b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(String(coData().name || "").toUpperCase(), bx + 2, by + 4.5);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(
      doc.splitTextToSize("Joinery – " + (sp.name || "Cupboard") + " (3D view)", bw - 4)[0],
      bx + 2,
      by + 9,
    );
    const cell = (lab, val, x, y, w) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.setTextColor(120, 120, 120);
      doc.text(lab, x + 1.5, y + 2.8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(17, 17, 17);
      doc.text(doc.splitTextToSize(String(val || "—"), w - 3)[0], x + 1.5, y + 6.6);
    };
    const r1 = by + 11,
      r2 = r1 + 9,
      r3 = r2 + 9;
    doc.setDrawColor(150, 150, 150);
    [r1, r2, r3].forEach((y2) => doc.line(bx, y2, bx + bw, y2));
    cell("CLIENT", [meta.client, meta.clientAddr].filter(Boolean).join(" · "), bx, r1, bw);
    const c3 = bw / 3;
    doc.line(bx + c3, r2, bx + c3, r3);
    doc.line(bx + 2 * c3, r2, bx + 2 * c3, r3);
    cell("SCALE", "3D – not to scale", bx, r2, c3);
    cell(
      "DATE",
      new Date(meta.date ? meta.date + "T12:00:00" : Date.now()).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      bx + c3,
      r2,
      c3,
    );
    cell("REV", meta.rev, bx + 2 * c3, r2, c3);
    doc.line(bx + bw / 2, r3, bx + bw / 2, by + 38);
    cell("SHEET", meta.sheet || "3D view", bx, r3, bw / 2);
    cell("DRAWN BY", meta.by, bx + bw / 2, r3, bw / 2);
    doc.setFontSize(7);
    doc.setTextColor(110, 110, 110);
    doc.text(
      [coData().name, coData().phone, coData().email].filter(Boolean).join("  ·  "),
      15,
      204,
    );
    return doc.output("blob");
  }
}
const cb3FileName = (sp) =>
  (sp.name || "Cupboard").replace(/[\\/:*?"<>|]+/g, "") + " – 3D for the client.pdf";
async function cb3Pdf(sp, look, yaw, meta) {
  try {
    const blob = await cb3PdfBlob(sp, look, yaw, meta);
    await S.dl.save({ filename: cb3FileName(sp), data: blob });
  } catch (e) {
    toast("Couldn't make the PDF");
  }
}
/* the client signs it off: in their portal, or here on this device; a copy goes in their job file */
function cb3SignOff(sp, look, yaw, meta) {
  const clients = (S.clients || [])
    .slice()
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  if (!clients.length) return toast("Add the client first (Clients), then send it for sign-off");
  const pre = meta.clientId || "";
  const box = document.createElement("div");
  box.className = "dimask cb3-sg";
  box.innerHTML = `<form class="dimbox"><b>✍️ Client sign-off</b>
    <div class="who">The 3D PDF with the sizes, finishes and the drawing details goes to the client to sign: "I'm happy with the design, sizes and finishes shown and want it made as shown."</div>
    <label for="cb3-cl">Client<select id="cb3-cl">${pre ? "" : '<option value="">Choose the client…</option>'}${clients.map((c) => `<option value="${esc(c.id)}"${c.id === pre ? " selected" : ""}>${esc(c.name)}${c.work ? " – " + esc(c.work) : ""}</option>`).join("")}</select></label>
    <label class="tick"><input type="checkbox" id="cb3-jf" checked> <span>Keep a copy in their job file (Plans & drawings)</span></label>
    <div class="dimbtns"><button type="button" class="btn" id="cb3-sgx">Cancel</button><button type="button" class="btn" id="cb3-here">✍️ Sign here now</button><button type="submit" class="btn primary" id="cb3-send">📤 Send to their portal</button></div></form>`;
  document.body.appendChild(box);
  const q = (id) => box.querySelector("#" + id);
  q("cb3-sgx").onclick = () => box.remove();
  const go = async (here) => {
    const c = clients.find((x) => x.id === q("cb3-cl").value);
    if (!c) return toast("Choose the client");
    q("cb3-send").disabled = q("cb3-here").disabled = true;
    toast("Making the PDF…");
    try {
      const blob = await cb3PdfBlob(
        sp,
        look,
        yaw,
        Object.assign({}, meta, { client: meta.client || c.name }),
      );
      const fn = cb3FileName(sp);
      const a = await uploadFile(new File([blob], fn, { type: "application/pdf" }), fn);
      if (q("cb3-jf").checked) {
        const j = (S.jobFiles || []).find((x) => x.clientId === c.id) || {
          clientId: c.id,
          estId: "",
          client: c.name,
          title: c.work || "",
          site: c.site || "",
          items: [],
        };
        await jfSave(
          Object.assign({}, j, {
            items: (j.items || []).concat([
              {
                id: newId(),
                assetId: a.id,
                name: fn,
                type: "application/pdf",
                folder: "plans",
                added: Date.now(),
              },
            ]),
          }),
        );
      }
      const src = ptSrc(c);
      const docId = newId(),
        signId = newId();
      const d0 = {
        title: fn.replace(/\.pdf$/, ""),
        fileName: fn,
        assetId: a.id,
        contentType: "application/pdf",
        folder: "designs",
        note: "",
        sharedAt: Date.now(),
      };
      await src.addDoc(docId, d0);
      const x = {
        kind: "design",
        title: (sp.name || "Cupboard") + " – design and finishes",
        details:
          "Please look at the 3D view, sizes and finishes, then sign if you're happy for it to be made as shown.",
        docIds: [docId],
        status: "open",
        created: Date.now(),
      };
      await src.addSign(signId, x);
      await src.bump();
      box.remove();
      if (here) document.querySelectorAll(".cb3").forEach((v) => v.remove());
      if (here)
        ptOwnerSign(c, ptOf(c), Object.assign({ id: signId }, x), [
          Object.assign({ id: docId }, d0),
        ]);
      else
        toast(
          src.linked
            ? `Sent to ${c.name}'s portal to sign`
            : `Saved for ${c.name}: they'll see it to sign when they join the portal`,
        );
    } catch (e) {
      q("cb3-send").disabled = q("cb3-here").disabled = false;
      toast("Couldn't send it. Check your connection.");
    }
  };
  box.querySelector("form").onsubmit = (ev) => {
    ev.preventDefault();
    go(false);
  };
  q("cb3-here").onclick = () => go(true);
}
