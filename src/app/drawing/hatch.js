/* ================= HATCH: standard section hatching for areas (brick, block, concrete, insulation, hardcore, earth…) ================= */
export { NP_HATCH, npHatch, npHatchable };
/* A box, circle, room or closed shape in the drawing tool can carry `hatch` (a key below). The pattern is drawn
   clipped to the shape at a fixed size on paper (as on a printed drawing), whatever the scale. */
const NP_HATCH = {
  brick: "Brickwork",
  block: "Blockwork",
  concrete: "Concrete",
  insul: "Insulation",
  hardcore: "Hardcore",
  earth: "Earth / ground",
  timber: "Timber (cut)",
  sand: "Sand / screed",
};
const npHatchable = (o) =>
  !!o &&
  (o.t === "rect" ||
    o.t === "circle" ||
    o.t === "room" ||
    (o.t === "stroke" && o.p && o.p.length > 2));
/* the shape's outline as a path, and its bounding box */
function npHatchShape(o) {
  if (o.t === "room" || o.t === "stroke") {
    const p = o.p,
      xs = p.map((q) => q[0]),
      ys = p.map((q) => q[1]);
    return {
      box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
      path: (ctx) => {
        ctx.beginPath();
        p.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
        ctx.closePath();
      },
    };
  }
  const x0 = Math.min(o.a[0], o.b[0]),
    y0 = Math.min(o.a[1], o.b[1]),
    x1 = Math.max(o.a[0], o.b[0]),
    y1 = Math.max(o.a[1], o.b[1]);
  return {
    box: [x0, y0, x1, y1],
    path: (ctx) => {
      ctx.beginPath();
      if (o.t === "circle")
        ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, 0, 0, 7);
      else ctx.rect(x0, y0, x1 - x0, y1 - y0);
    },
  };
}
/* draw o's hatch; u = drawing units per mm of paper */
function npHatch(ctx, o, u) {
  if (!o.hatch || !NP_HATCH[o.hatch] || !npHatchable(o)) return;
  const { box, path } = npHatchShape(o),
    [x0, y0, x1, y1] = box,
    w = x1 - x0,
    h = y1 - y0;
  if (!(w > 0 && h > 0)) return;
  ctx.save();
  path(ctx);
  ctx.clip();
  ctx.setLineDash([]);
  ctx.strokeStyle = o.c || "#111111";
  ctx.fillStyle = o.c || "#111111";
  ctx.lineWidth = Math.max(0.18 * u, 0.5 / (ctx.__s || 1));
  ctx.globalAlpha = 0.8;
  /* lines at an angle every `gap` mm on paper, across the whole box */
  const lines = (deg, gap, dash) => {
    const r = (deg * Math.PI) / 180,
      dx = Math.cos(r),
      dy = Math.sin(r),
      nx = -dy,
      ny = dx,
      cx = (x0 + x1) / 2,
      cy = (y0 + y1) / 2,
      R = Math.hypot(w, h) / 2 + 1,
      g = gap * u;
    ctx.beginPath();
    for (let t = -R; t <= R; t += g) {
      const px = cx + nx * t,
        py = cy + ny * t;
      if (dash) {
        for (let s = -R; s < R; s += dash[0] * u + dash[1] * u) {
          ctx.moveTo(px + dx * s, py + dy * s);
          ctx.lineTo(px + dx * (s + dash[0] * u), py + dy * (s + dash[0] * u));
        }
      } else {
        ctx.moveTo(px - dx * R, py - dy * R);
        ctx.lineTo(px + dx * R, py + dy * R);
      }
    }
    ctx.stroke();
  };
  /* a steady scatter (the same every time the drawing is shown) */
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const scatter = (every, fn) => {
    const g = every * u;
    for (let y = y0; y < y1 + g; y += g)
      for (let x = x0; x < x1 + g; x += g) fn(x + rnd() * g, y + rnd() * g);
  };
  switch (o.hatch) {
    case "brick":
      lines(-45, 1.6);
      break;
    case "block":
      lines(-45, 3);
      lines(45, 3);
      break;
    case "concrete":
      scatter(2.2, (x, y) => {
        ctx.beginPath();
        if (rnd() < 0.4) {
          const s = 0.7 * u;
          ctx.moveTo(x, y - s);
          ctx.lineTo(x + s, y + s * 0.7);
          ctx.lineTo(x - s, y + s * 0.7);
          ctx.closePath();
          ctx.stroke();
        } else {
          ctx.arc(x, y, 0.22 * u, 0, 7);
          ctx.fill();
        }
      });
      break;
    case "insul": {
      const a = 1.2 * u;
      ctx.beginPath();
      for (let y = y0 + a; y < y1 + a * 2; y += a * 2) {
        ctx.moveTo(x0, y);
        for (let x = x0; x <= x1 + a; x += a)
          ctx.lineTo(x, y + (Math.round((x - x0) / a) % 2 ? -a : a) * 0.8);
      }
      ctx.stroke();
      break;
    }
    case "hardcore":
      scatter(3, (x, y) => {
        const n = 5,
          s = (0.6 + rnd() * 0.8) * u;
        ctx.beginPath();
        for (let k = 0; k < n; k++) {
          const an = (k / n) * Math.PI * 2 + rnd() * 0.6,
            rr = s * (0.7 + rnd() * 0.5);
          if (k) ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr);
          else ctx.moveTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr);
        }
        ctx.closePath();
        ctx.stroke();
      });
      break;
    case "earth":
      lines(-45, 1.2, [2.5, 2]);
      lines(45, 3.5, [1, 4]);
      break;
    case "timber":
      lines(-45, 2.2);
      lines(45, 6);
      break;
    case "sand":
      scatter(0.9, (x, y) => {
        ctx.beginPath();
        ctx.arc(x, y, 0.15 * u, 0, 7);
        ctx.fill();
      });
      break;
  }
  ctx.restore();
}
