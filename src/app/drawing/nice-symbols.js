/* ================= NICE SYMBOLS: sanitaryware and landscaping drawn more like the real thing ================= */
import { npCanopy } from "./paving-draw.js";
export { NP_BATHNICE, NP_NICE, npBath, npNice };
const NP_NICE = new Set(["tree", "shrub", "conifer"]);
/* nicer sanitaryware: white bodies, light-grey inner bowls, taps and wastes */
const NP_BATHNICE = new Set([
  "wc",
  "basin",
  "bath",
  "shower",
  "sink",
  "bidet",
  "vanity",
  "quadrant",
  "walkin",
  "cornerbath",
  "towel",
]);
function npBath(ctx, o, x0, y0, w, h, cx, cy) {
  const lw = ctx.lineWidth,
    c = ctx.strokeStyle,
    x1 = x0 + w,
    y1 = y0 + h,
    m = Math.min(w, h);
  const IN = "#e8eef4",
    BODY = "#ffffff";
  const thin = (f) => {
    ctx.lineWidth = Math.max(lw * (f || 0.5), 0.5);
  };
  const full = () => {
    ctx.lineWidth = lw;
  };
  const rr = (x, y, ww, hh, r, fill) => {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, ww, hh, Math.max(0, Math.min(r, ww / 2, hh / 2)));
    else ctx.rect(x, y, ww, hh);
    if (fill) {
      ctx.save();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.restore();
    }
    ctx.stroke();
  };
  const el = (x, y, rx, ry, fill) => {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(rx, 0.5), Math.max(ry, 0.5), 0, 0, 7);
    if (fill) {
      ctx.save();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.restore();
    }
    ctx.stroke();
  };
  const dot = (x, y, r, fill) => {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(r, 0.4), 0, 7);
    ctx.save();
    ctx.fillStyle = fill || BODY;
    ctx.fill();
    ctx.restore();
    ctx.stroke();
  };
  const waste = (x, y, r) => {
    thin(0.5);
    dot(x, y, r, "#cbd5e1");
    ctx.beginPath();
    ctx.moveTo(x - r * 0.6, y);
    ctx.lineTo(x + r * 0.6, y);
    ctx.moveTo(x, y - r * 0.6);
    ctx.lineTo(x, y + r * 0.6);
    ctx.stroke();
    full();
  };
  const tap = (x, y, r) => {
    thin(0.55);
    dot(x, y, r, "#e2e8f0");
    full();
  };
  switch (o.k) {
    case "wc": {
      const ch = h * 0.24;
      rr(x0 + w * 0.04, y0, w * 0.92, ch, m * 0.06, BODY);
      thin(0.5);
      dot(cx, y0 + ch * 0.5, m * 0.05, "#e2e8f0");
      full();
      ctx.beginPath();
      ctx.moveTo(x0 + w * 0.12, y0 + ch);
      ctx.bezierCurveTo(x0 + w * 0.02, y0 + h * 0.62, x0 + w * 0.2, y1, cx, y1);
      ctx.bezierCurveTo(x1 - w * 0.2, y1, x1 - w * 0.02, y0 + h * 0.62, x1 - w * 0.12, y0 + ch);
      ctx.closePath();
      ctx.save();
      ctx.fillStyle = BODY;
      ctx.fill();
      ctx.restore();
      ctx.stroke();
      thin(0.55);
      el(cx, y0 + h * 0.6, w * 0.27, h * 0.27, IN);
      full();
      break;
    }
    case "bidet":
      rr(x0, y0, w, h * 0.12, m * 0.04, BODY);
      ctx.beginPath();
      ctx.ellipse(cx, y0 + h * 0.56, w * 0.47, h * 0.44, 0, 0, 7);
      ctx.save();
      ctx.fillStyle = BODY;
      ctx.fill();
      ctx.restore();
      ctx.stroke();
      thin(0.55);
      el(cx, y0 + h * 0.58, w * 0.3, h * 0.3, IN);
      full();
      tap(cx, y0 + h * 0.2, m * 0.05);
      waste(cx, y0 + h * 0.6, m * 0.04);
      break;
    case "basin":
      rr(x0, y0, w, h, m * 0.18, BODY);
      thin(0.55);
      el(cx, cy + h * 0.06, w * 0.36, h * 0.32, IN);
      full();
      tap(cx, y0 + h * 0.13, m * 0.07);
      waste(cx, cy + h * 0.1, m * 0.05);
      break;
    case "vanity":
      rr(x0, y0, w, h, m * 0.06, BODY);
      thin(0.55);
      [0.27, 0.73].forEach((f) => {
        el(x0 + w * f, cy + h * 0.06, w * 0.17, h * 0.3, IN);
        tap(x0 + w * f, y0 + h * 0.12, m * 0.06);
        waste(x0 + w * f, cy + h * 0.1, m * 0.045);
      });
      full();
      break;
    case "bath": {
      rr(x0, y0, w, h, m * 0.12, BODY);
      const p = m * 0.1;
      thin(0.55);
      ctx.beginPath();
      const ix = x0 + p,
        iy = y0 + p,
        iw = w - 2 * p,
        ih = h - 2 * p;
      ctx.moveTo(ix + iw * 0.12, iy);
      ctx.lineTo(ix + iw - ih * 0.5, iy);
      ctx.arc(ix + iw - ih * 0.5, iy + ih / 2, ih / 2, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(ix + iw * 0.12, iy + ih);
      ctx.quadraticCurveTo(ix, iy + ih, ix, iy + ih * 0.75);
      ctx.lineTo(ix, iy + ih * 0.25);
      ctx.quadraticCurveTo(ix, iy, ix + iw * 0.12, iy);
      ctx.closePath();
      ctx.save();
      ctx.fillStyle = IN;
      ctx.fill();
      ctx.restore();
      ctx.stroke();
      full();
      tap(x0 + p * 0.55, cy - h * 0.12, m * 0.05);
      tap(x0 + p * 0.55, cy + h * 0.12, m * 0.05);
      waste(x0 + p + iw * 0.1, cy, m * 0.05);
      break;
    }
    case "cornerbath":
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y0);
      ctx.lineTo(x1, y0 + h * 0.35);
      ctx.quadraticCurveTo(x1 - w * 0.05, y1 - h * 0.05, x0 + w * 0.35, y1);
      ctx.lineTo(x0, y1);
      ctx.closePath();
      ctx.save();
      ctx.fillStyle = BODY;
      ctx.fill();
      ctx.restore();
      ctx.stroke();
      thin(0.55);
      ctx.beginPath();
      ctx.moveTo(x0 + w * 0.1, y0 + h * 0.1);
      ctx.lineTo(x1 - w * 0.1, y0 + h * 0.1);
      ctx.quadraticCurveTo(x1 - w * 0.2, y1 - h * 0.2, x0 + w * 0.1, y1 - h * 0.1);
      ctx.closePath();
      ctx.save();
      ctx.fillStyle = IN;
      ctx.fill();
      ctx.restore();
      ctx.stroke();
      full();
      waste(x0 + w * 0.25, y0 + h * 0.25, m * 0.035);
      tap(x0 + w * 0.06, y0 + h * 0.06, m * 0.03);
      break;
    case "shower": {
      rr(x0, y0, w, h, m * 0.04, BODY);
      const p = m * 0.07;
      thin(0.5);
      rr(x0 + p, y0 + p, w - 2 * p, h - 2 * p, m * 0.03, IN);
      ctx.save();
      ctx.strokeStyle = "#94a3b8";
      [
        [x0 + p, y0 + p],
        [x1 - p, y0 + p],
        [x1 - p, y1 - p],
        [x0 + p, y1 - p],
      ].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(cx, cy);
        ctx.stroke();
      });
      ctx.restore();
      full();
      waste(cx, cy, m * 0.06);
      thin(0.6);
      dot(x0 + p * 2.2, y0 + p * 2.2, m * 0.07, "#e2e8f0");
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.arc(
          x0 + p * 2.2 + Math.cos(a) * m * 0.035,
          y0 + p * 2.2 + Math.sin(a) * m * 0.035,
          Math.max(m * 0.008, 0.3),
          0,
          7,
        );
        ctx.stroke();
      }
      full();
      break;
    }
    case "quadrant": {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y0);
      ctx.ellipse(x0, y0, w, h, 0, 0, Math.PI / 2);
      ctx.closePath();
      ctx.save();
      ctx.fillStyle = IN;
      ctx.fill();
      ctx.restore();
      ctx.stroke();
      ctx.save();
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = lw * 1.8;
      ctx.beginPath();
      ctx.ellipse(x0, y0, w * 0.97, h * 0.97, 0, 0.05, Math.PI / 2 - 0.05);
      ctx.stroke();
      ctx.restore();
      waste(x0 + w * 0.32, y0 + h * 0.32, m * 0.05);
      break;
    }
    case "walkin": {
      rr(x0, y0, w, h, m * 0.03, IN);
      ctx.save();
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = lw * 2.2;
      ctx.beginPath();
      ctx.moveTo(x0 + w * 0.6, y1);
      ctx.lineTo(x0 + w * 0.6, y0 + h * 0.25);
      ctx.stroke();
      ctx.restore();
      thin(0.5);
      ctx.beginPath();
      ctx.moveTo(x0 + w * 0.05, cy);
      ctx.lineTo(x0 + w * 0.5, cy);
      ctx.stroke();
      full();
      waste(x0 + w * 0.28, cy, m * 0.05);
      break;
    }
    case "sink": {
      rr(x0, y0, w, h, m * 0.06, BODY);
      const bw = w * 0.46;
      thin(0.55);
      rr(x0 + w * 0.05, y0 + h * 0.14, bw, h * 0.72, m * 0.12, IN);
      ctx.save();
      ctx.strokeStyle = "#94a3b8";
      for (let i = 1; i < 6; i++) {
        const x = x0 + w * 0.55 + (w * 0.4 * i) / 6;
        ctx.beginPath();
        ctx.moveTo(x, y0 + h * 0.2);
        ctx.lineTo(x, y1 - h * 0.2);
        ctx.stroke();
      }
      ctx.restore();
      full();
      waste(x0 + w * 0.05 + bw / 2, y0 + h * 0.5, m * 0.06);
      tap(x0 + w * 0.05 + bw / 2, y0 + h * 0.07, m * 0.05);
      break;
    }
    case "towel": {
      rr(x0, y0, w, h, m * 0.3, BODY);
      thin(0.5);
      for (let x = x0 + w * 0.08; x < x1 - w * 0.05; x += w / 12) {
        ctx.beginPath();
        ctx.moveTo(x, y0 + h * 0.2);
        ctx.lineTo(x, y1 - h * 0.2);
        ctx.stroke();
      }
      full();
      break;
    }
  }
}
function npNice(ctx, o, x0, y0, w, h, cx, cy) {
  const lw = ctx.lineWidth,
    c = ctx.strokeStyle === "#111" || ctx.strokeStyle === "#111111" ? "#3f3f3f" : ctx.strokeStyle;
  const seed = o.a[0] * 31 + o.a[1] * 17;
  if (o.k === "tree") {
    npCanopy(ctx, cx, cy, w / 2, h / 2, seed, lw, c, "#dfe9d6");
    ctx.save();
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(lw * 0.45, 0.5);
    [0.09, 0.05].forEach((f) => {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(w, h) * f, 0, 7);
      ctx.stroke();
    });
    ctx.restore();
  } else if (o.k === "shrub") {
    npCanopy(ctx, cx, cy, w / 2, h / 2, seed, lw, c, "#cfe1c2");
    ctx.save();
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(Math.min(w, h) * 0.03, 0.8), 0, 7);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.save();
    const n = 16;
    ctx.beginPath();
    for (let i = 0; i <= n * 2; i++) {
      const a = (i * Math.PI) / n,
        r = i % 2 ? 0.32 : 0.5;
      ctx.lineTo(cx + Math.cos(a) * w * r, cy + Math.sin(a) * h * r);
    }
    ctx.closePath();
    ctx.fillStyle = "#cbdcc0";
    ctx.fill();
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(lw * 0.5, 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(w, h) * 0.05, 0, 7);
    ctx.stroke();
    ctx.restore();
  }
}
