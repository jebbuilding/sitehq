/* ===== paving & driveways: an area drawn corner by corner, filled with the material at real size ===== */
import { appPhotoChoices } from "../chat/contacts.js";
import { clAddr } from "../clients/stages-planner.js";
import { pickField, pickVal, wirePicks } from "../core/fields.js";
import { esc, iso, parse, toast } from "../core/helpers.js";
import { S, ownerMode, siteNames } from "../core/state.js";
import { NP_BLD_BOX, NP_LIB } from "./components.js";
import {
  NP_COLS,
  NP_DET_BOX,
  NP_ELEV_BOX,
  NP_LINE,
  NP_MORECOLS,
  NP_SCALES,
  NP_SHAPES,
  NP_SIZES,
  NP_SYM,
  NP_U,
  drawShape,
  npKeyEntries,
  npLbl,
  npStairN,
  npSymLabel,
  npUnit,
} from "./construction-details.js";
import { npDxf } from "./dxf-export.js";
import { askLabel, askMeasure, drawDim } from "./notebook.js";
import {
  rsBestScale,
  rsDrawInDrawing,
  rsEditInDrawing,
  rsFromStroke,
  rsHitDrawing,
  rsRoomOf,
  rsStatus,
  rsWallsAsShapes,
} from "./room-sketch.js";
import { NP_ANNO_BOX, NP_TEXTSYM } from "./symbols-annotation.js";
import { NP_DES_BOX, npScallop } from "./symbols-design.js";
import { NP_BASIC, NP_XLAB, NP_XREAL, NP_XSHAPES } from "./symbols-more.js";
import { NP_TIMB_BOX, NP_TIMB_DEF, NP_TIMB_SIZES, npRunAxis } from "./timber.js";
import {
  NP_LIN,
  NP_LINOPTS,
  NP_OPENK,
  NP_WALLK,
  npDrawAll,
  npHexMix,
  npIsWall,
  npWallT,
} from "./walls.js";
import { blobUrl, uploadErr, uploadFile } from "../files/files.js";
import { loadPdfJs } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { printBlob } from "../files/print.js";
import { coData } from "../owner/company-details.js";
import { brandHex, loadImage, logoId } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { shrinkImage } from "../safety/training.js";
import { siteClient } from "../sites/summary.js";
import { DWS, myName, siteFilePicker } from "../survey/door-window-survey.js";
export {
  NP_BATHNICE,
  NP_NICE,
  NP_REAL,
  NP_SCX,
  initPaving,
  npBath,
  npCanopy,
  npNice,
  openNotePage,
  pdfShow,
  setNpScx,
};
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
/* when a download can't be saved, show the PDF in the app so it can still be viewed, printed or shared */
function pdfShow(blob, fn) {
  const u = URL.createObjectURL(blob);
  const d = document.createElement("div");
  d.className = "dimask";
  d.style.zIndex = "120";
  d.innerHTML = `<div class="dimbox" style="max-width:min(96vw,900px);width:96vw"><b>📄 ${esc(fn)}</b><div class="who">The download didn't go through, so here it is to view. Use the buttons to try saving again.</div><iframe src="${u}" style="width:100%;height:65vh;border:1px solid #ccc;border-radius:8px;background:#fff"></iframe><div class="dimbtns"><button type="button" class="btn pdfs-print">🖨 Print</button><a class="btn" href="${u}" download="${esc(fn)}">⬇ Download</a><button type="button" class="btn pdfs-again">Try saving again</button><button type="button" class="btn primary pdfs-x">Close</button></div></div>`;
  document.body.appendChild(d);
  d.querySelector(".pdfs-x").onclick = () => {
    d.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
  };
  d.querySelector(".pdfs-print").onclick = () => printBlob(blob, fn);
  d.querySelector(".pdfs-again").onclick = async () => {
    try {
      await S.dl.save({ filename: fn, data: blob });
      toast("PDF saved");
      d.remove();
    } catch (e) {
      toast("Still couldn't save it here. Use ⬇ Download");
    }
  };
}
/* curved lines: bend = how far the middle bows out, as a share of the length */
function npBendCp(o) {
  const mx = (o.a[0] + o.b[0]) / 2,
    my = (o.a[1] + o.b[1]) / 2,
    dx = o.b[0] - o.a[0],
    dy = o.b[1] - o.a[1],
    L = Math.hypot(dx, dy) || 1;
  return [mx - (dy / L) * o.bend * L, my + (dx / L) * o.bend * L];
}
function npBendApex(o) {
  const cp = npBendCp(o),
    mx = (o.a[0] + o.b[0]) / 2,
    my = (o.a[1] + o.b[1]) / 2;
  return [(mx + cp[0]) / 2, (my + cp[1]) / 2];
}
/* scaled areas: a frame on the page with its own scale (e.g. a 1:10 detail next to a 1:50 plan). NP_SCX is the scale in use right now */
let NP_SCX = 0;
function setNpScx(v) {
  NP_SCX = v;
}
const npDims = (size, orient) => {
  const [L, Sh] = NP_SIZES[size] || NP_SIZES.A3;
  return orient === "port" ? [Sh * NP_U, L * NP_U] : [L * NP_U, Sh * NP_U];
};
const npLineShape = (o) => o && o.t === "shape" && (NP_LINE.has(o.k) || o.k === "door");
const npBoxy = (o) =>
  o && (["rect", "circle", "text", "img"].includes(o.t) || (o.t === "shape" && !npLineShape(o)));
/* real sizes in mm for tap-to-place when a scale is set: [width, height] (line types: [length]) */
const NP_REAL = {
  ewCav: [1200, 2700],
  ewBrick: [1200, 2700],
  ewSolid: [1000, 2700],
  ewStud: [700, 2500],
  ewBlock: [3000, 2700],
  ewBrk: [3000, 2700],
  fdnsec: [1500, 2000],
  bblay: [4800, 4000],
  sdT3: [800, 700],
  sdTlad: [800, 700],
  sdTbk: [800, 700],
  sdL3: [500, 500],
  sdLcal: [500, 500],
  sdLblk: [500, 500],
  sfPlain: [2400, 2400],
  sfDoor: [2400, 2400],
  sfWin: [2400, 2400],
  sfBrace: [2400, 2400],
  sfBlock: [2400, 2400],
  sfPlat: [2400, 5200],
  shFull: [100, 600],
  shIns: [150, 600],
  shVert: [100, 600],
  shSingle: [100, 600],
  gfSlab: [1800, 1600],
  gfBB: [1800, 1600],
  gfTimber: [1800, 1600],
  jhanger: [600, 400],
  jtrim: [3600, 3600],
  jstrap: [1500, 900],
  jlay: [4000, 3600],
  rlay: [6000, 4000],
  tlay: [8000, 4000],
  truss: [8000, 2600],
  cutroof: [6000, 2600],
  tstud: [3000],
  eframe: [3600, 2400],
  legend: [4000, 3000],
  stairsu: [2000, 2700],
  roofhip: [8000, 6000],
  roofgable: [8000, 6000],
  fall: [2000],
  re: [300, 300],
  ic: [600, 450],
  soakaway: [1500, 1500],
  rwp: [150, 150],
  aav: [150, 150],
  foul: [4000],
  storm: [4000],
  fan: [250, 250],
  fspur: [150, 90],
  ckr: [150, 90],
  olight: [250, 250],
  dlight: [150, 150],
  heat: [150, 150],
  coal: [150, 150],
  tvp: [150, 90],
  stat: [120, 120],
  towel: [500, 100],
  rafter: [3000],
  joistl: [3000],
  rooftile: [3000],
  batfelt: [3000],
  lead: [600],
  pboard: [2400],
  wplate: [100, 50],
  ridgeb: [32, 175],
  purlin: [75, 225],
  eaves: [450, 300],
  flatroof: [2000, 400],
  fdn: [600, 1000],
  trenchfill: [600, 1000],
  bblock: [2400, 225],
  gslab: [2400, 550],
  tfloor: [2400, 250],
  screed: [2400, 75],
  lintel: [1500, 215],
  ctray: [1200],
  weep: [65, 75],
  wtie: [250, 40],
  closer: [50, 215],
  renderl: [2400],
  cladsec: [2400],
  evclad: [3000, 2400],
  epanel: [3600, 2400],
  etilehang: [3000, 1500],
  estone: [3000, 1500],
  esoldier: [3000, 215],
  airbrick: [215, 140],
  secmark: [700, 1100],
  tagbox: [700, 320],
  tagcirc: [420, 420],
  viewtitle: [4500, 700],
  scalebar: [5200, 700],
  joists: [4000, 3000],
  ibeam: [150, 300],
  timber: [50, 150],
  padstone: [440, 215],
  egroundfill: [8000, 1500],
  hidden: [3000],
  centre: [6000],
  breather: [3000],
  dpcl: [3000],
  dpm: [3000],
  vcl: [3000],
  rooflight: [780, 980],
  lantern: [1500, 3000],
  stairsl: [2600, 2600],
  spiral: [1600, 1600],
  column: [300, 300],
  chimney: [600, 450],
  dbed: [1500, 2000],
  sbed: [900, 1900],
  sofa: [2000, 900],
  table: [1800, 1500],
  wardrobe: [1200, 600],
  island: [2400, 1300],
  desk: [1400, 1100],
  patio: [3600, 3000],
  blockpave: [5000, 3000],
  decking: [3000, 3000],
  lawn: [6000, 4000],
  gravel: [3000, 2000],
  planting: [3000, 1200],
  shrub: [1000, 1000],
  hedge: [4000],
  path: [4000],
  gsteps: [1200, 900],
  retwall: [4000],
  gate: [1000],
  pond: [2500, 1800],
  shed: [2400, 1800],
  elecpoint: [500, 500],
  stopcock: [400, 400],
  gaspoint: [500, 500],
  canteen: [4880, 2440],
  dryroom: [3600, 2440],
  fireassembly: [1200, 1200],
  fireext: [500, 500],
  firepoint: [1000, 1000],
  uelec: [5000],
  heras: [10500],
  herasgate: [3500],
  ch8: [4000],
  uwater: [5000],
  ugas: [5000],
  portaloo: [1100, 1100],
  container: [6058, 2438],
  siteoffice: [4880, 2440],
  sauna: [2000, 2000],
  studio: [5000, 3500],
  gardenroom: [4000, 3000],
  gardenoffice: [3000, 2400],
  car: [4500, 1900],
  parking: [2400, 4800],
  bins: [1600, 800],
  elant: [1500, 700],
  echim: [700, 1400],
  estairs: [2600, 2600],
  efence: [1830, 1800],
  egate: [1000, 1200],
  ehedge: [3000, 1500],
  etree: [3500, 5000],
  eperson: [500, 1750],
  cavity: [3000],
  eground: [6000],
  edpc: [6000],
  egutter: [3000],
  ewin: [1200, 1050],
  edoor: [900, 2100],
  efrench: [1500, 2100],
  ebifold: [2400, 2100],
  egarage: [2400, 2135],
  eroofl: [780, 1180],
  eroof: [6000, 2500],
  elean: [3000, 1000],
  edp: [68, 3000],
  ebrick: [3000, 2400],
  erender: [3000, 2400],
  eclad: [3000, 2400],
  etile: [3000, 1500],
  einsul: [1000, 100],
  econc: [600, 225],
  ehard: [1000, 150],
  elevel: [1200, 350],
  door: [838],
  door2: [1500],
  sdoor: [1800],
  bifold: [2400],
  opening: [900],
  wall: [3000],
  dline: [3000],
  stud: [3000],
  beam: [3000],
  pipe: [3000],
  fence: [3000],
  window: [1200, 100],
  stairs: [2600, 900],
  wc: [400, 700],
  basin: [550, 450],
  bath: [1700, 700],
  shower: [900, 900],
  sink: [1000, 500],
  hob: [600, 600],
  units: [1800, 600],
  fridge: [600, 600],
  wm: [600, 600],
  rad: [1000, 100],
  boiler: [450, 350],
  cyl: [500, 500],
  socket: [150, 90],
  switch: [100, 100],
  light: [300, 300],
  smoke: [150, 150],
  cu: [400, 250],
  mh: [600, 450],
  gully: [300, 300],
  svp: [110, 110],
  tap: [100, 100],
  tree: [3000, 3000],
};
const NP_TYPES = [
  "Sketch",
  "Site visit notes",
  "Existing floor plan",
  "Proposed floor plan",
  "Existing and proposed plan",
  "Site / location plan",
  "Elevations",
  "Section",
  "Roof plan",
  "Foundation plan",
  "Electrical layout",
  "Plumbing and heating layout",
  "Drainage layout",
  "Kitchen layout",
  "Bathroom layout",
  "Structural / steel details",
  "Detail drawing",
  "Setting out",
  "As built",
];
const NP_LAYERS = [
  ["walls", "🧱 Walls & structure"],
  ["openings", "🚪 Doors & windows"],
  ["struct", "🪵 Timber & floors"],
  ["elec", "⚡ Electrics"],
  ["heat", "🔥 Heating & ventilation"],
  ["drain", "💧 Drainage & plumbing"],
  ["fittings", "🛁 Kitchen, bathroom & furniture"],
  ["land", "🌳 Landscaping"],
  ["elev", "🏡 Elevation & section"],
  ["rooms", "⬠ Rooms"],
  ["dims", "📏 Dimensions"],
  ["notes", "📝 Notes & text"],
  ["imports", "📥 Imported drawings & photos"],
  ["general", "✏️ Lines & sketching"],
];
let NP_KLAY = null;

function npLayerOf(o) {
  if (o.ly) return o.ly;
  if (o.t === "dim" || o.t === "ang") return "dims";
  if (o.t === "room") return "rooms";
  if (o.t === "img") return "imports";
  if (o.t === "text" || o.t === "arrow") return "notes";
  if (o.t !== "shape") return "general";
  if (!NP_KLAY) {
    NP_KLAY = {};
    const m = {
      "Walls & structure": "walls",
      "Stairs": "walls",
      "Doors & windows": "openings",
      "Kitchen & bathroom": "fittings",
      "Furniture": "fittings",
      "Electrics": "elec",
      "Heating & ventilation": "heat",
      "Drainage": "drain",
      "Drainage & water": "drain",
      "Floors": "struct",
      "Timber framing": "struct",
      "Stud wall connections": "struct",
      "Roof plan": "struct",
      "Landscaping": "land",
      "Notes & details": "notes",
      "Shapes": "general",
      "Site set-up": "land",
      "Site plant & equipment": "land",
      "Fire safety": "elec",
      "Accessibility & lifts": "fittings",
      "Garden buildings": "land",
      "Foundations": "struct",
      "Bridges, poles & cables": "elec",
      "Outside lights, gates & CCTV": "elec",
      "Survey & existing site": "land",
      "Services": "elec",
      "Construction phase": "land",
      "External works": "land",
    };
    NP_LIB.forEach(([v, c, ks]) =>
      ks.forEach((k) => {
        if (!NP_KLAY[k]) NP_KLAY[k] = v === "elev" ? "elev" : m[c] || "general";
      }),
    );
  }
  return NP_KLAY[o.k] || "general";
}
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
async function openNotePage(opts) {
  opts = opts || {};
  let doc = null;
  if (opts.srcId) {
    try {
      doc = await (await fetch(blobUrl(opts.srcId))).json();
    } catch (e) {
      toast("Couldn't open that page. Check your connection.");
      return;
    }
  }
  if (opts.json) doc = JSON.parse(JSON.stringify(opts.json));
  if (!doc) {
    const sz = opts.size || "A3",
      orn = opts.orient || "land";
    const [w, h] = npDims(sz, orn);
    doc = {
      v: 2,
      size: sz,
      orient: orn,
      scale: 50,
      w,
      h,
      paper: opts.paper || "plain",
      site: opts.site || "",
      pages: [{ name: "Page 1", objs: [] }],
    };
  }
  if (!doc.pages) doc.pages = [{ name: "Page 1", objs: doc.objs || [] }];
  if (!doc.size) doc.size = "custom";
  if (doc.scale == null) doc.scale = 0;
  NP_SCX = 0;
  {
    let _s = doc.scale;
    Object.defineProperty(doc, "scale", {
      get: () => NP_SCX || _s,
      set: (v) => {
        _s = v;
      },
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(doc, "toJSON", {
      value: function () {
        const o = Object.assign({}, this);
        o.scale = _s;
        return o;
      },
      enumerable: false,
      configurable: true,
    });
    Object.defineProperty(doc, "baseScale", {
      get: () => _s,
      enumerable: false,
      configurable: true,
    });
  }
  const vpOf = (o) => o && o.t === "rect" && o.vp;
  const vpBoxAt = (p) => {
    if (!p) return null;
    let best = null,
      ba = Infinity;
    for (const o of doc.objs) {
      if (!vpOf(o)) continue;
      const x0 = Math.min(o.a[0], o.b[0]),
        x1 = Math.max(o.a[0], o.b[0]),
        y0 = Math.min(o.a[1], o.b[1]),
        y1 = Math.max(o.a[1], o.b[1]);
      if (p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1) {
        const ar = (x1 - x0) * (y1 - y0);
        if (ar < ba) {
          ba = ar;
          best = o;
        }
      }
    }
    return best;
  };
  const vpScaleAt = (p) => {
    if (!p) return 0;
    let best = null,
      ba = Infinity;
    for (const o of doc.objs) {
      if (!vpOf(o)) continue;
      const x0 = Math.min(o.a[0], o.b[0]),
        x1 = Math.max(o.a[0], o.b[0]),
        y0 = Math.min(o.a[1], o.b[1]),
        y1 = Math.max(o.a[1], o.b[1]);
      if (p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1) {
        const ar = (x1 - x0) * (y1 - y0);
        if (ar < ba) {
          ba = ar;
          best = o;
        }
      }
    }
    return best ? +best.vp : 0;
  };
  const vpAnchor = (o) =>
    o.t === "img" || o.t === "text"
      ? [o.x, o.y]
      : o.a && o.b && o.t !== "dim"
        ? [(o.a[0] + o.b[0]) / 2, (o.a[1] + o.b[1]) / 2]
        : o.a
          ? o.a
          : o.p
            ? o.p[0]
            : o.v || null;
  const vpScaleFor = (o) => (vpOf(o) ? 0 : vpScaleAt(vpAnchor(o)));
  const vpKids = (v) => {
    const x0 = Math.min(v.a[0], v.b[0]),
      x1 = Math.max(v.a[0], v.b[0]),
      y0 = Math.min(v.a[1], v.b[1]),
      y1 = Math.max(v.a[1], v.b[1]);
    return doc.objs
      .map((o, j) => [o, j])
      .filter(
        ([o]) =>
          o !== v &&
          !vpOf(o) &&
          ((p) => p && p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1)(vpAnchor(o)),
      );
  };
  if (!doc.info)
    doc.info = { date: iso(new Date()), rev: "", by: myName(), show: doc.size !== "custom" };
  if (opts.noTitleBox) doc.info.show = false;
  if (opts.client && doc.info.client == null) doc.info.client = opts.client;
  if (opts.clientAddr && doc.info.clientAddr == null) doc.info.clientAddr = opts.clientAddr;
  if (opts.pageType && doc.pages[0] && !doc.pages[0].type && !doc.pages[0].objs.length) {
    doc.pages[0].type = opts.pageType;
    if (/^Page \d+$/.test(doc.pages[0].name || "")) doc.pages[0].name = opts.pageType;
  }
  if (
    !opts.srcId &&
    !opts.json &&
    Array.isArray(opts.headLines) &&
    opts.headLines.length &&
    doc.pages[0] &&
    !doc.pages[0].objs.length
  ) {
    const U = NP_U;
    let y = 16 * U;
    const sz = 4.2 * U;
    const wrapL = (t, n) => {
      const out = [];
      String(t)
        .split(/\n+/)
        .forEach((par) => {
          let cur = "";
          par.split(/\s+/).forEach((wd) => {
            if ((cur + " " + wd).trim().length > n) {
              if (cur) out.push(cur);
              cur = wd;
            } else cur = (cur + " " + wd).trim();
          });
          if (cur) out.push(cur);
        });
      return out.join("\n");
    };
    opts.headLines
      .filter((l) => l && l[1])
      .forEach(([lab, val], k) => {
        wrapL(val, doc.w / U > 250 ? 110 : 70)
          .split(/\n+/)
          .forEach((ln, j) => {
            doc.pages[0].objs.push({
              t: "text",
              x: 14 * U,
              y,
              s: (j ? "" : lab + ": ") + ln,
              c: k === 0 ? "#111111" : "#333333",
              size: Math.round(k === 0 ? sz * 1.25 : sz),
              ly: "notes",
            });
            y += (k === 0 ? 7.5 : 6) * U;
          });
      });
    doc.pages[0].objs.push({
      t: "line",
      a: [14 * U, y + 1.5 * U],
      b: [doc.w - 14 * U, y + 1.5 * U],
      c: "#999999",
      w: 0.35 * U,
      ly: "notes",
    });
  }
  let pg = 0;
  doc.objs = doc.pages[0].objs;
  const sized = () => doc.size !== "custom";
  const imgs = {},
    locals = {};
  let lc = 0;
  const loadImg = (src) => {
    if (imgs[src]) return imgs[src];
    const im = new Image();
    im.onload = () => draw();
    im.src = src.startsWith("local:") ? locals[src].url : blobUrl(src);
    imgs[src] = im;
    return im;
  };
  const ov = document.createElement("div");
  ov.className = "np";
  if (opts.z) ov.style.zIndex = opts.z;
  ov.setAttribute("role", "dialog");
  ov.setAttribute("aria-modal", "true");
  ov.setAttribute("aria-label", "Drawing");
  ov.innerHTML = `<div class="np-top"><button type="button" class="btn np-cancel">Cancel</button><input class="np-title" maxlength="80" placeholder="Drawing title, e.g. Ground floor layout" value="${esc(opts.title || doc.title || "")}" aria-label="Drawing title"><button type="button" class="btn np-info" title="Drawing details: what it is, job, date, scale">🏷<span class="npl"> Details</span></button><button type="button" class="btn np-pdf" title="Download as PDF">📄<span class="npl"> PDF</span></button>${opts.pro ? `<button type="button" class="btn np-dxf" title="Download for AutoCAD / CAD (DXF, real sizes in mm)">📐<span class="npl"> DXF</span></button>` : ""}${opts.canSend ? `<button type="button" class="btn np-send" title="Save and send to a trade or client">📤<span class="npl"> Send</span></button>` : ""}<button type="button" class="btn primary np-save">Save</button></div>
    <div class="np-bar" role="toolbar" aria-label="Tools" data-g="${(() => {
      try {
        return localStorage.getItem("np.grp") || "draw";
      } catch (e) {
        return "draw";
      }
    })()}"><div class="np-gtabs" role="tablist">${[
      ["draw", "✏️ Draw"],
      ["edit", "✂️ Edit"],
      ["measure", "📏 Measure"],
      ["insert", "📥 Insert"],
      ["style", "🎨 Style"],
      ["page", "📄 Page"],
    ]
      .concat(opts.pro ? [["build", "🏗 Build"]] : [])
      .map(([k, l]) => `<button type="button" class="np-gt" data-gt="${k}">${l}</button>`)
      .join(
        "",
      )}</div><button type="button" class="np-t np-moretools" aria-label="Show all tools" aria-expanded="true" hidden>☰<small>Tools</small></button>
      ${[
        ["pen", "✎", "Pen"],
        ["hl", "🖍", "Highlighter"],
        ["erase", "⌫", "Rubber"],
        ["line", "／", "Line"],
        ["curve", "◠", "Curve"],
        ["dim", "↔", "Measure line"],
        ["dimc", "⟷", "Chain dimensions"],
        ["dima", "∠", "Angle"],
        ["room", "⬠", "Room"],
        ["pave", "▦", "Patio / drive"],
        ["pstrip", "⫴", "Path round building"],
        ["pwall", "🧱", "Wall run (tap corners)"],
        ["trim", "✂", "Trim"],
        ["extend", "⟶", "Extend"],
        ["corner", "⌐", "Corner"],
        ["rect", "▭", "Box"],
        ["circle", "◯", "Circle"],
        ["arrow", "➜", "Arrow"],
        ["text", "T", "Text"],
        ["move", "✋", "Select / move"],
        ["box", "⬚", "Pick several"],
      ]
        .map(
          ([k, i, l]) =>
            `<button type="button" class="np-t" data-t="${k}" ${{ pen: "draw", hl: "draw", erase: "draw edit", line: "draw", curve: "draw", pave: "draw insert", pstrip: "draw insert", dim: "measure", dimc: "measure", dima: "measure", room: "draw measure", pwall: "draw", trim: "edit", extend: "edit", corner: "edit", rect: "draw", circle: "draw", arrow: "draw", text: "draw", box: "edit" }[k] ? `data-g="${{ pen: "draw", hl: "draw", erase: "draw edit", line: "draw", curve: "draw", pave: "draw insert", pstrip: "draw insert", dim: "measure", dimc: "measure", dima: "measure", room: "draw measure", pwall: "draw", trim: "edit", extend: "edit", corner: "edit", rect: "draw", circle: "draw", arrow: "draw", text: "draw", box: "edit" }[k]}"` : ""} aria-pressed="${k === "pen"}" title="${l}" aria-label="${l}">${i}<small>${l.split(" ")[0]}</small></button>`,
        )
        .join("")}
      <button type="button" class="np-t np-view" data-g="${opts.pro ? "none" : "draw insert"}" title="Switch symbols between plan (looking down) and elevation (looking at the front)" aria-label="Plan or elevation symbols">🏠<small>Plan</small></button>
      <select class="np-shape" data-g="${opts.pro ? "none" : "draw insert"}" aria-label="More shapes"></select>${opts.pro ? `<button type="button" class="np-libbtn" data-g="draw insert" aria-label="Symbols library">📚 <span>Symbols…</span></button>` : ""}
      <button type="button" class="np-t np-snap" data-g="page edit" aria-pressed="true" title="Snap to grid and line ends" aria-label="Snap to grid">🧲<small>Snap</small></button>
      <button type="button" class="np-t np-setup" data-g="page" title="Paper size, scale and background" aria-label="Paper size and scale">📐<small>Paper</small></button>
      <button type="button" class="np-t" data-t="roomsk" data-g="draw measure" title="Room sketch: draw the room in one line, it straightens the walls, then tap each wall to type its length" aria-label="Room sketch">✍️<small>Room sketch</small></button>
      ${opts.pro ? `<button type="button" class="np-t" data-t="vp" data-g="page insert" title="Draw a frame with its own scale, e.g. a 1:10 detail next to a 1:50 plan" aria-label="Scaled area">🔍<small>Scaled area</small></button>` : ""}
      <label class="np-t np-photo" data-g="insert" title="Take or upload photos" aria-label="Take or upload photos">📷<small>Add photo</small><input type="file" accept="image/*" multiple hidden></label>
      <button type="button" class="np-t np-apppic" data-g="insert" title="Photos already in the app" aria-label="Photos already in the app">🖼<small>App photos</small></button><button type="button" class="np-t np-import" data-g="insert" title="Bring in a drawing or plan at its own scale" aria-label="Import a drawing">📥<small>Import drawing</small></button>${opts.pro ? `<button type="button" class="np-t np-qty" data-g="measure" title="Areas, lengths and materials from this drawing" aria-label="Quantities">🧮<small>Quantities</small></button><button type="button" class="np-t np-layers" data-g="page" title="Show, hide or lock groups of things, and show another floor underneath" aria-label="Layers and floors">🗂<small>Layers</small></button>` : ""}${
        opts.pro
          ? `<span class="np-build" style="display:contents">${[
              ["beam", "🔩", "Steel beam"],
              ["dimall", "📏", "Dimension walls"],
              ["num", "🔢", "Number"],
              ["sched", "📋", "Schedules"],
              ["grid", "#️⃣", "Grid lines"],
              ["elev", "🏠", "Elevation"],
              ["check", "✅", "Check"],
              ["rev", "🔖", "Status & revisions"],
            ]
              .concat(ownerMode() ? [["tpl", "📑", "Templates"]] : [])
              .map(
                ([k, i, l]) =>
                  `<button type="button" class="np-t" data-g="build" data-bt="${k}" aria-label="${l}">${i}<small>${l}</small></button>`,
              )
              .join("")}</span>`
          : ""
      }
      <span class="np-sep"></span>
      ${NP_COLS.map((c, i) => `<button type="button" class="np-c" data-g="style" data-c="${c}" style="background:${c}" aria-label="Colour ${i + 1}" aria-pressed="${i === 0}"></button>`).join("")}<button type="button" class="np-c np-cmore" data-g="style" aria-label="More colours" title="More colours">🎨</button>
      <span class="np-ws" data-g="style" role="group" aria-label="Line thickness">${[
        [2, "Extra fine"],
        [4, "Fine"],
        [6, "Medium"],
        [12, "Thick"],
        [24, "Marker"],
      ]
        .map(
          ([v, l]) =>
            `<button type="button" class="np-wb" data-w="${v}" aria-pressed="${v === 2}" aria-label="${l}" title="${l}"><i style="height:${Math.max(1.5, v / 2.4)}px"></i></button>`,
        )
        .join("")}</span>
      <span class="np-sep"></span>
      <button type="button" class="np-t np-clear" data-g="edit page" title="Clear this page and start again" aria-label="Start again">🗑<small>Start again</small></button><button type="button" class="np-t np-undo" title="Undo" aria-label="Undo">↶<small>Undo</small></button><button type="button" class="np-t np-redo" title="Redo" aria-label="Redo">↷<small>Redo</small></button>
      <button type="button" class="np-t np-zo" data-g="page" aria-label="Zoom out">−<small>Zoom</small></button><button type="button" class="np-t np-zi" data-g="page" aria-label="Zoom in">+<small>Zoom</small></button><button type="button" class="np-t np-fit" aria-label="Fit page">⤢<small>Fit</small></button>
      <button type="button" class="np-t np-more" data-g="page" title="Make the page longer" aria-label="Make the page longer" hidden>⬇<small>Longer</small></button></div>
    <div class="np-pages" role="tablist" aria-label="Pages"></div>
    <div class="np-stage"><canvas class="np-cv"></canvas><form class="np-lenbar" hidden><span>Length</span><input class="nlb-l" type="number" inputmode="decimal" step="any"><span class="nlb-u">mm</span><span>Angle</span><input class="nlb-a" type="number" inputmode="decimal" step="any" style="width:70px"><span>°</span><button type="submit" class="btn primary">Set</button><button type="button" class="btn nlb-x">✕</button></form><div class="np-chainbar" hidden><span class="np-chaintxt"></span><select class="np-pwk" hidden><option value="wall">Solid wall</option><option value="cavity">Cavity wall</option><option value="tstud">Timber stud wall</option><option value="stud">Stud wall</option><option value="dline">Wall (double line)</option><option value="line">Plain line</option></select><span class="np-pvbox" hidden><select class="np-pvm" aria-label="Material">${Object.entries(
      NP_PAVE,
    )
      .map(([k, v]) => `<option value="${k}">${v[0]}</option>`)
      .join(
        "",
      )}</select><label class="np-pvwl">Width<input class="np-pvw" inputmode="numeric" value="900" style="width:70px"> mm</label><button type="button" class="btn np-pvside">⇄ Other side</button><button type="button" class="btn np-pvnew">↺ Start somewhere else</button></span><form class="np-pwlen" hidden><input class="np-pwl" inputmode="decimal" placeholder="Length mm" aria-label="Next wall length in mm"><span class="np-pwdirs">${[
      ["r", "→"],
      ["d", "↓"],
      ["l", "←"],
      ["u", "↑"],
    ]
      .map(
        ([k, i]) =>
          `<button type="button" class="btn np-pwd" data-d="${k}" title="Add the wall this way">${i}</button>`,
      )
      .join(
        "",
      )}</span><input class="np-pwa" inputmode="decimal" placeholder="or angle °" aria-label="Angle in degrees" style="width:84px"><button type="submit" class="btn primary">Add</button></form><button type="button" class="btn np-pwclose" hidden>⟲ Close it up</button><button type="button" class="btn primary np-chainok">✓ Finish</button><button type="button" class="btn np-chainx">Cancel</button></div>
      <div class="np-selbar" hidden><button type="button" class="np-sb" data-a="rot">⟳<small>Turn 90°</small></button><button type="button" class="np-sb" data-a="turnby">∠<small>Turn by…</small></button><button type="button" class="np-sb" data-a="flip">⇋<small>Flip</small></button><button type="button" class="np-sb" data-a="crop" hidden>✂<small>Crop</small></button><button type="button" class="np-sb" data-a="dup">⧉<small>Copy</small></button><button type="button" class="np-sb np-fine" data-a="fine">⚙<small>Properties</small></button><button type="button" class="np-sb" data-a="fill">🪣<small>Fill</small></button><button type="button" class="np-sb" data-a="front">⬆<small>To front</small></button><button type="button" class="np-sb" data-a="offset" hidden>⇉<small>Offset</small></button><button type="button" class="np-sb" data-a="autodim" hidden>📏<small>Dimension it</small></button><button type="button" class="np-sb" data-a="dstyle" hidden>⟋<small>Ticks</small></button><button type="button" class="np-sb" data-a="lock">🔒<small>Lock</small></button><button type="button" class="np-sb np-sbdel" data-a="del">🗑<small>Delete</small></button></div>
      <div class="np-selbar np-mbar" hidden><span class="np-mcount"></span><button type="button" class="np-mb" data-m="copy">⧉<small>Copy</small></button><button type="button" class="np-mb" data-m="rot">⟳<small>Turn 90°</small></button><button type="button" class="np-mb" data-m="mirh">⇋<small>Mirror</small></button><button type="button" class="np-mb" data-m="mirv">⇅<small>Mirror ↕</small></button><button type="button" class="np-mb" data-m="align">⫷<small>Align</small></button><button type="button" class="np-mb" data-m="group">🔗<small>Group</small></button><button type="button" class="np-mb" data-m="lock">🔒<small>Lock</small></button><button type="button" class="np-mb np-sbdel" data-m="del">🗑<small>Delete</small></button><button type="button" class="np-mb" data-m="done">✓<small>Done</small></button></div>
      <div class="np-finebox" hidden><div class="nfrow"><b>⚙ <span class="nfwhatis">Properties</span></b><button type="button" class="nfx" aria-label="Close">✕</button></div>
        <div class="nfprops"><div class="nfrow nfcolrow"><span class="nfl">Colour</span>${NP_COLS.map((c) => `<button type="button" class="np-c nfcol" data-c="${c}" style="background:${c}" aria-label="Colour"></button>`).join("")}</div>
          <div class="nfrow nfwrow"><span class="nfl">Thickness</span><div class="seg nfseg nfw">${[
            [2, "Hairline"],
            [4, "Fine"],
            [6, "Medium"],
            [12, "Thick"],
            [24, "Marker"],
          ]
            .map(([v, l]) => `<button type="button" data-v="${v}">${l}</button>`)
            .join("")}</div></div>
          <div class="nfrow nflsrow"><span class="nfl">Line</span><div class="seg nfseg nfls"><button type="button" data-v="">━ Solid</button><button type="button" data-v="dash">╍ Dashed</button><button type="button" data-v="dot">┈ Dotted</button><button type="button" data-v="dashdot">─·─ Centre</button><button type="button" data-v="long">— — Long dash</button><button type="button" data-v="dashdotdot">─··─ Dash dot dot</button><button type="button" data-v="fine">⋯ Fine dots</button><button type="button" data-v="heavy">▬ ▬ Heavy dash</button></div></div>
          <div class="nfrow nfwkrow"><span class="nfl">Wall type</span><select class="nfwk"><option value="wall">Solid wall</option><option value="cavity">Cavity wall</option><option value="tstud">Timber stud wall</option><option value="stud">Stud wall</option><option value="dline">Wall (double line)</option></select><input class="nfwth" inputmode="numeric" style="width:70px" aria-label="Wall thickness mm"><span class="who">mm</span></div>
          <div class="nfrow nflinrow" style="flex-wrap:wrap"><span class="nfl">Linings</span><label style="flex:1 1 220px;display:flex;flex-direction:column;gap:3px;font-size:12px">Side 1<select class="nflin" data-s="1" style="min-height:40px;height:auto;font-size:14px;padding:6px 8px;width:100%;line-height:1.3">${NP_LINOPTS()}</select></label><label style="flex:1 1 220px;display:flex;flex-direction:column;gap:3px;font-size:12px">Side 2<select class="nflin" data-s="2" style="min-height:40px;height:auto;font-size:14px;padding:6px 8px;width:100%;line-height:1.3">${NP_LINOPTS()}</select></label><button type="button" class="nfb nflinsw">⇄ Swap sides</button></div>
          <div class="nfrow nfcallrow"><span class="nfl">Pointer</span><select class="nfc-lead"><option value="none">No arrow</option><option value="arrow">➜ Arrow</option><option value="dot">● Dot</option><option value="line">— Line</option></select><select class="nfc-box"><option value="">No box</option><option value="box">▭ Box</option><option value="round">▢ Rounded</option><option value="cloud">☁ Cloud</option><option value="under">_ Underline</option></select></div>
          <div class="nfrow nfbendrow"><span class="nfl">Curve</span><input type="range" class="nfbend" min="-100" max="100" step="1" style="flex:1"><button type="button" class="nfb nfbend0">Straight</button></div>
          <form class="nfrow nftxrow"><span class="nfl">Text</span><input class="nftx" style="flex:1;min-width:120px"><input class="nftxs" inputmode="numeric" style="width:56px" aria-label="Text size"><button type="submit" class="btn primary">Set</button></form>
          <div class="nfrow nflyrow"><span class="nfl">Layer</span><select class="nfly">${NP_LAYERS.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div>
          <div class="nfrow nflvrow" style="flex-wrap:wrap"><span class="nfl">Leaves (mm)</span><label class="nflv" data-f="a">Outer leaf<select data-f="a">${[75, 90, 100, 140, 150, 190, 215].map((v) => `<option>${v}</option>`).join("")}</select></label><label class="nflv" data-f="cav">Cavity<select data-f="cav">${[0, 25, 50, 75, 100, 125, 150].map((v) => `<option>${v}</option>`).join("")}</select></label><label class="nflv" data-f="ins">Insulation<select data-f="ins">${[0, 50, 75, 90, 100, 125, 150].map((v) => `<option>${v}</option>`).join("")}</select></label><label class="nflv" data-f="b">Inner leaf<select data-f="b">${[75, 90, 100, 140, 150, 190, 215].map((v) => `<option>${v}</option>`).join("")}</select></label></div>
          <div class="nfrow nfunrow" style="flex-wrap:wrap"><span class="nfl">Bricks / blocks</span><label class="nflv">Type<select class="nfun-p"><option value="block">Block 440×215</option><option value="block140">Block 440×140</option><option value="bigblock">Large block 620×215</option><option value="brick">Brick 215×65</option></select></label><label class="nflv">Length<input class="nfun-L" inputmode="numeric" style="width:70px"></label><label class="nflv">Height<input class="nfun-H" inputmode="numeric" style="width:70px"></label><label class="nflv">Joint<input class="nfun-J" inputmode="numeric" style="width:56px"></label></div>
          <div class="nfrow nffdrow" style="flex-wrap:wrap"><span class="nfl">Footing (mm)</span><label class="nflv">Width<input class="nffd-w" inputmode="numeric" style="width:70px"></label><label class="nflv">Thickness<input class="nffd-d" inputmode="numeric" style="width:70px"></label><label class="nflv">Ground to underside<input class="nffd-dep" inputmode="numeric" style="width:80px"></label></div>
          <div class="nfrow nfpvrow"><span class="nfl">Material</span><select class="nfpv">${Object.entries(
            NP_PAVE,
          )
            .map(([k, v]) => `<option value="${k}">${v[0]}</option>`)
            .join("")}</select></div>
          <div class="nfrow nfphrow"><span class="nfl">Supply</span><div class="seg nfseg nfph"><button type="button" data-v="cu">Single phase</button><button type="button" data-v="cu3">Three phase</button></div></div>
          <div class="nfrow nfvprow"><span class="nfl">Scaled area</span><button type="button" class="nfb nfa-vp">🔍 Scale &amp; name</button></div>
          <div class="nfrow nfacts"><button type="button" class="nfb nfa-lock">🔒 Lock</button><button type="button" class="nfb nfa-dim">📏 Dimension it</button><button type="button" class="nfb nfa-std">↺ Standard size</button><button type="button" class="nfb nfa-dup">⧉ Copy</button><button type="button" class="nfb nfa-del" style="color:#ff8a8a">🗑 Delete</button></div></div>
        <div class="nfstudw" hidden><div class="nfrow"><span class="nfl">Timber</span><div class="seg nfseg nfsd"><button type="button" data-v="100">100×50</button><button type="button" data-v="150">150×50</button></div></div>
          <div class="nfrow"><span class="nfl">Centres</span><div class="seg nfseg nfcc"><button type="button" data-v="400">400 mm</button><button type="button" data-v="600">600 mm</button></div></div>
          <div class="nfrow nfcorner" hidden><span class="nfl">Corners</span><div class="seg nfseg"><button type="button" data-v="3stud">3-stud</button><button type="button" data-v="cal">California</button><button type="button" data-v="blk">Blocked</button></div></div>
          <div class="nfrow nftee" hidden><span class="nfl">Walls meeting</span><div class="seg nfseg"><button type="button" data-v="3stud">3-stud</button><button type="button" data-v="ladder">Ladder</button><button type="button" data-v="backer">Backer</button></div></div>
          <div class="nfrow nftt" hidden><span class="nfl">Truss</span><div class="seg nfseg"><button type="button" data-v="fink">Fink (W)</button><button type="button" data-v="fan">Fan</button><button type="button" data-v="mono">Mono</button><button type="button" data-v="attic">Attic (room in roof)</button></div></div>
          <div class="nfrow nfdirn" hidden><span class="nfl">Direction</span><button type="button" class="nfb nfturnb">⇄ Turn the timbers</button></div>
          <div class="nfrow"><span class="nfl">Extra</span><button type="button" class="nfb nfaddt">➕ Add timber</button><button type="button" class="nfb nfclrt">Clear extras</button></div><div class="who nftinfo"></div></div>
        <div class="nfstairs" hidden><div class="nfrow"><span class="nfl">Steps</span><button type="button" class="nfb nfst" data-d="-1" aria-label="One step fewer">−</button><b class="nfstn" style="min-width:34px;text-align:center"></b><button type="button" class="nfb nfst" data-d="1" aria-label="One step more">+</button><button type="button" class="nfb nfsdir">⇅ Up / down</button></div>
          <form class="nfrow nfrise"><span class="nfl">Floor to floor</span><input class="nfrisev" inputmode="numeric" style="width:80px" aria-label="Floor to floor height in mm"><span class="nfu2">mm</span><button type="submit" class="btn primary">Set</button><button type="button" class="btn nfsauto">Best steps</button></form><div class="who nfsinfo"></div></div>
        <div class="nfrow nfwhat"><span class="nfl">Adjust</span><div class="seg nfseg"><button type="button" data-w="all" aria-pressed="true">Whole item</button><button type="button" data-w="a" aria-pressed="false">● Start</button><button type="button" data-w="b" aria-pressed="false">● End</button></div></div>
        <div class="nfrow"><span class="nfl">Move</span><button type="button" class="nfb" data-m="-1,0" aria-label="Left">◀</button><button type="button" class="nfb" data-m="0,-1" aria-label="Up">▲</button><button type="button" class="nfb" data-m="0,1" aria-label="Down">▼</button><button type="button" class="nfb" data-m="1,0" aria-label="Right">▶</button><select class="nfstep" aria-label="Step"></select></div>
        <div class="nfrow nfturn"><span class="nfl">Turn</span><button type="button" class="nfb" data-r="-15">↺15°</button><button type="button" class="nfb" data-r="-1">↺1°</button><button type="button" class="nfb" data-r="-0.1">↺0.1°</button><button type="button" class="nfb" data-r="0.1">↻0.1°</button><button type="button" class="nfb" data-r="1">↻1°</button><button type="button" class="nfb" data-r="15">↻15°</button></div>
        <form class="nfrow nfang"><span class="nfl">Angle</span><input class="nfangv" inputmode="decimal" aria-label="Angle in degrees" style="width:70px"><span class="nfdeg">°</span><button type="submit" class="btn primary nfaset">Set</button></form>
        <div class="nfrow"><label class="inl nfslow" style="color:#fff;font-size:13px"><input type="checkbox" class="nfslowc"> 🐢 Slow drag: your finger moves things 5× slower and snapping is off, for tiny moves</label></div>
        <form class="nfrow nfsize"><span class="nfl nflab">Length</span><input class="nfa" inputmode="decimal" aria-label="Length"><span class="nfx2">×</span><input class="nfb2" inputmode="decimal" aria-label="Height"><span class="nfu"></span><button type="submit" class="btn primary nfset">Set</button></form>
        <div class="who nfhint"></div></div></div>
    <form class="np-text" hidden><input maxlength="200" placeholder="Type your text…" aria-label="Text"><select class="np-tlead" aria-label="Arrow"><option value="none">No arrow</option><option value="arrow">➜ Arrow to where I tapped</option><option value="dot">● Dot pointer</option><option value="line">— Line pointer</option></select><select class="np-tbox" aria-label="Box"><option value="">No box</option><option value="box">▭ Box</option><option value="round">▢ Rounded box</option><option value="cloud">☁ Cloud</option><option value="under">_ Underline</option></select><button class="btn primary" type="submit">Add</button><button class="btn np-tcancel" type="button">✕ Cancel</button></form>
    <div class="np-status"></div>`;
  if (!opts.render) {
    document.body.appendChild(ov);
    document.body.style.overflow = "hidden";
  }
  const q = (sel) => ov.querySelector(sel),
    cv = q(".np-cv"),
    g = cv.getContext("2d"),
    stage = q(".np-stage");
  const lyOff = (o) => {
    const L = doc.layers && doc.layers[npLayerOf(o)];
    return !!(L && (L.hide || L.lock));
  };
  const lyHid = (o) => {
    const L = doc.layers && doc.layers[npLayerOf(o)];
    return !!(L && L.hide);
  };
  const visObjs = (a) => (doc.layers ? a.filter((o) => !lyHid(o)) : a);
  const msel = new Set();
  let chain = [],
    dimTk = (() => {
      try {
        return localStorage.getItem("np.dimtk") === "1";
      } catch (e) {
        return false;
      }
    })();
  let lastStud = { sd: 100, cc: 400 },
    addTimber = false;
  let fineNow = false,
    slowDrag = (() => {
      try {
        return localStorage.getItem("np.slow") === "1";
      } catch (e) {
        return false;
      }
    })(),
    fineWhat = "all",
    shapeKind = "tri",
    dimAsk = null,
    tool = "pen",
    col = NP_COLS[0],
    wid = 2,
    s = 1,
    ox = 0,
    oy = 0,
    cur = null,
    sel = null,
    drag = null,
    undo = [],
    redo = [],
    dirty = false,
    textAt = null,
    snapOn = true,
    live = null;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const snap = () => {
    undo.push(JSON.stringify(doc.objs));
    if (undo.length > 60) undo.shift();
    redo = [];
    dirty = true;
  };
  const setObjs = (a) => {
    doc.objs = a;
    doc.pages[pg].objs = a;
    msel.clear();
  };
  const fit = () => {
    fitMode = 0;
    const r = stage.getBoundingClientRect();
    s = Math.min(r.width / doc.w, sized() ? (r.height - 16) / doc.h : 9, 2);
    ox = (r.width - doc.w * s) / 2;
    oy = sized() ? Math.max(8, (r.height - doc.h * s) / 2) : 8;
    draw();
  };
  let fitMode = 0;
  const fitDrawn = () => {
    const cb = contentBox();
    if (!cb || cb[2] < 4 || cb[3] < 4) {
      fit();
      return;
    }
    fitMode = 1;
    const r = stage.getBoundingClientRect();
    const pad = Math.max(24, Math.min(r.width, r.height) * 0.08);
    s = Math.max(
      0.04,
      Math.min(4, Math.min((r.width - 2 * pad) / cb[2], (r.height - 2 * pad) / cb[3])),
    );
    ox = (r.width - cb[2] * s) / 2 - cb[0] * s;
    oy = (r.height - cb[3] * s) / 2 - cb[1] * s;
    draw();
    toast("Zoomed to what's drawn. Tap Fit again for the whole page.");
  };
  const size = () => {
    const r = stage.getBoundingClientRect();
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    cv.style.width = r.width + "px";
    cv.style.height = r.height + "px";
    draw();
  };
  const toPage = (cx, cy) => {
    const r = cv.getBoundingClientRect();
    return [(cx - r.left - ox) / s, (cy - r.top - oy) / s];
  };
  /* real size helpers */
  const realMm = (u) => (u / NP_U) * doc.scale;
  const toUnits = (mm) => (mm / doc.scale) * NP_U;
  const pwFor = (w) =>
    sized() ? { 2: 1.5, 4: 2.5, 6: 4, 12: 7, 24: 14 }[w] || 2 : Math.round((w / 2 / s) * 10) / 10;
  /* snapping */
  const gridStep = () => {
    for (const g of [1, 2, 5, 10, 25, 50]) if (g * s >= 12) return g;
    return 50;
  };
  let snappedObj = false;
  /* CAD-style object snaps: ends, corners, centres, intersections, middles, perpendicular, along a line, then lining up with other points, then the grid */
  let snapMark = null;
  function snapPt(p, opt) {
    snappedObj = false;
    snapMark = null;
    if (!snapOn || fineNow) return p;
    opt = opt || {};
    const tol = 16 / s;
    const cands = [];
    const add = (pt, k, w, r) => {
      const d = Math.hypot(pt[0] - p[0], pt[1] - p[1]);
      if (d <= (r || tol)) cands.push({ p: [pt[0], pt[1]], k, sc: d * w });
    };
    const segs = [];
    doc.objs.forEach((o, i) => {
      if (i === opt.skip || (opt.skipSet && opt.skipSet.has(i)) || (doc.layers && lyHid(o))) return;
      const b = bbox(o);
      const pad = Math.max(tol * 2, npIsWall(o) ? npWallT(o, o.w || 6) : 0);
      if (
        p[0] < b[0] - pad ||
        p[0] > b[0] + b[2] + pad ||
        p[1] < b[1] - pad ||
        p[1] > b[1] + b[3] + pad
      )
        return;
      const wall = npIsWall(o),
        tw = wall ? Math.max(tol, npWallT(o, o.w || 6) * 0.6) : tol;
      if (o.t === "room") {
        o.p.forEach((q) => add(q, "end", 0.8));
        o.p.forEach((q, k) => segs.push([q, o.p[(k + 1) % o.p.length]]));
        return;
      }
      /* a room sketch: snap to its corners and along its walls as they are drawn now */
      if (o.t === "rsk") {
        (o.__hit || []).forEach(([a, b]) => {
          add(a, "end", 0.8);
          segs.push([a, b]);
        });
        return;
      }
      if (o.a && o.b && !npBoxy(o) && o.t !== "rect" && o.t !== "circle") {
        add(o.a, "end", 0.8, tw);
        add(o.b, "end", 0.8, tw);
        if (o.t !== "ang") add([(o.a[0] + o.b[0]) / 2, (o.a[1] + o.b[1]) / 2], "mid", 1.1);
        segs.push([o.a, o.b, wall ? o : null]);
        return;
      }
      if (o.t === "rect" || o.t === "circle" || npBoxy(o)) {
        const [x, y, w, h] = baseBox(o),
          c = [x + w / 2, y + h / 2],
          r = o.r || 0;
        add(c, "cen", 0.85);
        if (o.t !== "circle" && o.t !== "text") {
          const cs = [
            [x, y],
            [x + w, y],
            [x + w, y + h],
            [x, y + h],
          ].map((q) => rot(q, c, r));
          cs.forEach((q) => add(q, "end", 0.9));
          cs.forEach((q, k) => {
            const q2 = cs[(k + 1) % 4];
            add([(q[0] + q2[0]) / 2, (q[1] + q2[1]) / 2], "mid", 1.15);
            if (o.t === "rect") segs.push([q, q2]);
          });
        }
      }
    });
    /* intersections of nearby lines and wall centre lines */
    for (let i = 0; i < segs.length; i++)
      for (let j = i + 1; j < segs.length; j++) {
        const [a1, b1] = segs[i],
          [a2, b2] = segs[j];
        const d1 = [b1[0] - a1[0], b1[1] - a1[1]],
          d2 = [b2[0] - a2[0], b2[1] - a2[1]];
        const den = d1[0] * d2[1] - d1[1] * d2[0];
        if (Math.abs(den) < 1e-9) continue;
        const r = [a2[0] - a1[0], a2[1] - a1[1]];
        const t = (r[0] * d2[1] - r[1] * d2[0]) / den,
          u = (r[0] * d1[1] - r[1] * d1[0]) / den;
        if (t < -0.001 || t > 1.001 || u < -0.001 || u > 1.001) continue;
        add([a1[0] + d1[0] * t, a1[1] + d1[1] * t], "int", 0.75);
      }
    /* perpendicular from where this line started, and the nearest point along a line or wall */
    segs.forEach(([a, b, wo]) => {
      const dx = b[0] - a[0],
        dy = b[1] - a[1],
        L2 = dx * dx + dy * dy || 1;
      if (opt.from) {
        const t = ((opt.from[0] - a[0]) * dx + (opt.from[1] - a[1]) * dy) / L2;
        if (t > 0 && t < 1) add([a[0] + dx * t, a[1] + dy * t], "perp", 0.95);
      }
      const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2;
      if (t <= 0 || t >= 1) return;
      const f = [a[0] + dx * t, a[1] + dy * t];
      if (wo) {
        const T = npWallT(wo, wo.w || 6);
        const d = Math.hypot(p[0] - f[0], p[1] - f[1]);
        if (d <= Math.max(T / 2, tol * 0.6)) cands.push({ p: f, k: "on", sc: d * 1.3 });
      } else add(f, "on", 1.5, tol * 0.7);
    });
    if (cands.length) {
      cands.sort((x, y) => x.sc - y.sc);
      const c = cands[0];
      snappedObj = true;
      snapMark = { p: c.p, k: c.k };
      return c.p;
    }
    /* line up with the ends of other things (dotted guides), otherwise the grid */
    const G = gridStep();
    let gx = Math.round(p[0] / G) * G,
      gy = Math.round(p[1] / G) * G;
    let ax = null,
      ay = null,
      bx = tol * 0.6,
      by = tol * 0.6;
    doc.objs.forEach((o, i) => {
      if (i === opt.skip) return;
      const pts = o.t === "room" ? o.p : o.a && o.b && !npBoxy(o) ? [o.a, o.b] : [];
      pts.forEach((q) => {
        const dx = Math.abs(q[0] - p[0]),
          dy = Math.abs(q[1] - p[1]);
        if (dx < bx) {
          bx = dx;
          ax = q;
        }
        if (dy < by) {
          by = dy;
          ay = q;
        }
      });
    });
    if (opt.noGrid) {
      gx = p[0];
      gy = p[1];
    }
    if (ax || ay) {
      const out = [ax ? ax[0] : gx, ay ? ay[1] : gy];
      snapMark = { p: out, k: "guide", gx: ax, gy: ay };
      return out;
    }
    return [gx, gy];
  }
  /* make wall ends meet exactly: an end close to another wall's end or middle line is moved onto it; cavity walls are turned so the leaves line up */
  function weldWall(o) {
    if (!npIsWall(o)) return;
    const T = npWallT(o, o.w || 6);
    ["a", "b"].forEach((E) => {
      const P = o[E];
      let best = null,
        bd = Infinity,
        pf = null;
      doc.objs.forEach((x) => {
        if (x === o || !npIsWall(x)) return;
        const tol = Math.max(T, npWallT(x, x.w || 6)) * 0.6;
        ["a", "b"].forEach((F) => {
          const d = Math.hypot(x[F][0] - P[0], x[F][1] - P[1]);
          if (d <= tol && d < bd) {
            bd = d;
            best = x[F].slice();
            pf = [x, F];
          }
        });
      });
      if (best) {
        o[E] = best;
        return;
      }
      doc.objs.forEach((x) => {
        if (x === o || !npIsWall(x)) return;
        const dx = x.b[0] - x.a[0],
          dy = x.b[1] - x.a[1],
          L2 = dx * dx + dy * dy || 1;
        const t = ((P[0] - x.a[0]) * dx + (P[1] - x.a[1]) * dy) / L2;
        if (t <= 0.02 || t >= 0.98) return;
        const f = [x.a[0] + dx * t, x.a[1] + dy * t];
        const d = Math.hypot(P[0] - f[0], P[1] - f[1]);
        if (d <= npWallT(x, x.w || 6) / 2 + T * 0.3 && d < bd) {
          bd = d;
          best = f;
        }
      });
      if (best) o[E] = [Math.round(best[0] * 100) / 100, Math.round(best[1] * 100) / 100];
    });
  }
  /* cavity walls that join: turn each one so the outer leaf faces away from the middle of the building */
  function orientCavity(o) {
    if (!o || o.k !== "cavity") return;
    const comp = new Set([o]);
    let grow = true;
    while (grow) {
      grow = false;
      doc.objs.forEach((x) => {
        if (comp.has(x) || !npIsWall(x) || x.k !== "cavity") return;
        if (
          [...comp].some(
            (y) =>
              ["a", "b"].some((E) =>
                ["a", "b"].some((F) => Math.hypot(x[E][0] - y[F][0], x[E][1] - y[F][1]) < 1),
              ) ||
              (() => {
                for (const E of ["a", "b"]) {
                  const P = x[E],
                    dx = y.b[0] - y.a[0],
                    dy = y.b[1] - y.a[1],
                    L2 = dx * dx + dy * dy || 1,
                    t = ((P[0] - y.a[0]) * dx + (P[1] - y.a[1]) * dy) / L2;
                  if (
                    t > 0 &&
                    t < 1 &&
                    Math.hypot(P[0] - y.a[0] - dx * t, P[1] - y.a[1] - dy * t) < 1
                  )
                    return true;
                }
                return false;
              })(),
          )
        ) {
          comp.add(x);
          grow = true;
        }
      });
    }
    if (comp.size < 2) return;
    let cx = 0,
      cy = 0,
      n = 0;
    comp.forEach((x) => {
      cx += x.a[0] + x.b[0];
      cy += x.a[1] + x.b[1];
      n += 2;
    });
    cx /= n;
    cy /= n;
    comp.forEach((x) => {
      const dx = x.b[0] - x.a[0],
        dy = x.b[1] - x.a[1],
        L = Math.hypot(dx, dy) || 1,
        nx = -dy / L,
        ny = dx / L,
        mx = (x.a[0] + x.b[0]) / 2,
        my = (x.a[1] + x.b[1]) / 2;
      x.fl = (cx - mx) * nx + (cy - my) * ny < 0;
    });
  }
  /* doors, openings and windows dropped near a wall sit in it properly */
  const NP_BACKWALL = new Set([
    "units",
    "sink",
    "hob",
    "fridge",
    "wm",
    "wc",
    "basin",
    "bath",
    "shower",
    "towel",
    "socket",
    "fspur",
    "ckr",
    "tvp",
    "cu",
    "rad",
    "boiler",
    "dbed",
    "sbed",
    "sofa",
    "wardrobe",
    "desk",
  ]);
  /* kitchen units, toilets, basins, radiators, sockets, beds… dropped near a wall turn to face the room and sit tight against the wall */
  function seatFitting(o) {
    if (!snapOn || !o || o.t !== "shape" || !NP_BACKWALL.has(o.k) || !o.a || !o.b) return false;
    const w0 = Math.abs(o.b[0] - o.a[0]),
      h0 = Math.abs(o.b[1] - o.a[1]);
    const c = [(o.a[0] + o.b[0]) / 2, (o.a[1] + o.b[1]) / 2];
    let best = null,
      bd = Infinity;
    /* the walls of a room sketch count too, so doors, windows and units sit against them */
    doc.objs.concat(rsWallsAsShapes(doc.objs)).forEach((x) => {
      if (!npIsWall(x)) return;
      const dx = x.b[0] - x.a[0],
        dy = x.b[1] - x.a[1],
        L = Math.hypot(dx, dy) || 1,
        u = [dx / L, dy / L],
        n = [-u[1], u[0]];
      const t = (c[0] - x.a[0]) * u[0] + (c[1] - x.a[1]) * u[1];
      if (t < 0 || t > L) return;
      const dn = (c[0] - x.a[0]) * n[0] + (c[1] - x.a[1]) * n[1];
      const T = npWallT(x, x.w || 6);
      const gap = Math.abs(dn) - T / 2 - Math.min(w0, h0) / 2;
      const lim = Math.max(30 / s, doc.scale ? toUnits(400) : 30);
      if (gap > lim || Math.abs(dn) < T / 2) return;
      if (gap < bd) {
        bd = gap;
        best = { x, u, n, t, dn, T };
      }
    });
    if (!best) return false;
    const { x, u, n, t, dn, T } = best;
    const sg = Math.sign(dn) || 1,
      nIn = [n[0] * sg, n[1] * sg]; /* local "back" (top edge) faces the wall */
    const depth = h0;
    const foot = [x.a[0] + u[0] * t, x.a[1] + u[1] * t];
    const cc = [foot[0] + nIn[0] * (T / 2 + depth / 2), foot[1] + nIn[1] * (T / 2 + depth / 2)];
    let r = Math.atan2(-nIn[0], nIn[1]);
    r = ((r % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (Math.abs(r) < 1e-6 || Math.abs(r - 2 * Math.PI) < 1e-6) r = 0;
    o.a = [cc[0] - w0 / 2, cc[1] - h0 / 2];
    o.b = [cc[0] + w0 / 2, cc[1] + h0 / 2];
    o.r = r;
    if (!o.r) delete o.r;
    return true;
  }
  function seatOnWall(o) {
    if (!o || o.t !== "shape") return;
    if (seatFitting(o)) return;
    const isOpen = NP_OPENK.has(o.k),
      isWin = o.k === "window";
    if (!isOpen && !isWin) return;
    let p1,
      p2,
      thick = 0;
    if (isOpen) {
      p1 = o.a;
      p2 = o.b;
    } else {
      const x0 = Math.min(o.a[0], o.b[0]),
        y0 = Math.min(o.a[1], o.b[1]),
        w = Math.abs(o.b[0] - o.a[0]),
        h = Math.abs(o.b[1] - o.a[1]),
        c = [x0 + w / 2, y0 + h / 2],
        r = o.r || 0,
        L = Math.max(w, h) / 2,
        d = w >= h ? [Math.cos(r), Math.sin(r)] : [-Math.sin(r), Math.cos(r)];
      p1 = [c[0] - d[0] * L, c[1] - d[1] * L];
      p2 = [c[0] + d[0] * L, c[1] + d[1] * L];
      thick = Math.min(w, h);
    }
    let best = null,
      bd = Infinity;
    /* the walls of a room sketch count too, so doors, windows and units sit against them */
    doc.objs.concat(rsWallsAsShapes(doc.objs)).forEach((x) => {
      if (!npIsWall(x)) return;
      const dx = x.b[0] - x.a[0],
        dy = x.b[1] - x.a[1],
        L = Math.hypot(dx, dy) || 1,
        u = [dx / L, dy / L],
        n = [-u[1], u[0]];
      const f = (P) => [
        (P[0] - x.a[0]) * u[0] + (P[1] - x.a[1]) * u[1],
        (P[0] - x.a[0]) * n[0] + (P[1] - x.a[1]) * n[1],
      ];
      const A = f(p1),
        B = f(p2);
      const T = npWallT(x, x.w || 6);
      const par =
        Math.abs((p2[0] - p1[0]) * n[0] + (p2[1] - p1[1]) * n[1]) /
        (Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1);
      if (par > 0.25) return;
      const off = Math.abs((A[1] + B[1]) / 2);
      if (off > T / 2 + thick / 2 + Math.max(12, T * 0.5)) return;
      const mid = (A[0] + B[0]) / 2;
      if (mid < 0 || mid > L) return;
      if (off < bd) {
        bd = off;
        best = { x, u, A, B, T, L };
      }
    });
    if (!best) return;
    const { x, u, A, B, T, L } = best;
    let t1 = Math.max(0, Math.min(A[0], B[0])),
      t2 = Math.min(L, Math.max(A[0], B[0]));
    const P = (t) => [x.a[0] + u[0] * t, x.a[1] + u[1] * t];
    if (isOpen) {
      const fw = A[0] <= B[0];
      o.a = P(fw ? t1 : t2);
      o.b = P(fw ? t2 : t1);
    } else {
      const c = P((t1 + t2) / 2),
        len = t2 - t1,
        an = Math.atan2(u[1], u[0]);
      o.a = [c[0] - len / 2, c[1] - T / 2];
      o.b = [c[0] + len / 2, c[1] + T / 2];
      o.r = Math.abs(an) < 1e-6 ? 0 : an;
    }
  }
  function orthoB(a, b) {
    if (!snapOn || fineNow) return b;
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const an = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI) % 90;
    if (an < 6 || an > 84) {
      return Math.abs(dx) > Math.abs(dy) ? [b[0], a[1]] : [a[0], b[1]];
    }
    return b;
  }
  function paper(ctx, W, H, x0, y0, x1, y1) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    const p = doc.paper || "plain";
    if (p === "plain") return;
    const st = p === "grid" ? 50 : 60;
    ctx.lineWidth = 1 / (ctx.__s || 1);
    if (p === "grid") {
      for (let x = Math.max(st, Math.floor(x0 / st) * st); x < Math.min(W, x1); x += st) {
        ctx.strokeStyle = x % 250 === 0 ? "#c9d4e0" : "#e3e9f0";
        ctx.beginPath();
        ctx.moveTo(x, Math.max(0, y0));
        ctx.lineTo(x, Math.min(H, y1));
        ctx.stroke();
      }
    }
    for (let y = Math.max(st, Math.floor(y0 / st) * st); y < Math.min(H, y1); y += st) {
      ctx.strokeStyle = p === "grid" && y % 250 === 0 ? "#c9d4e0" : "#e3e9f0";
      ctx.beginPath();
      ctx.moveTo(Math.max(0, x0), y);
      ctx.lineTo(Math.min(W, x1), y);
      ctx.stroke();
    }
    if (p === "lined") {
      ctx.strokeStyle = "#f3b4b4";
      ctx.beginPath();
      ctx.moveTo(140, 0);
      ctx.lineTo(140, H);
      ctx.stroke();
    }
  }
  function baseBox(o) {
    if (o.t === "img") return [o.x, o.y, o.w, o.h];
    if (o.t === "text") {
      g.font = `600 ${o.size}px system-ui`;
      const ls = String(o.s).split("\n");
      return [
        o.x,
        o.y,
        Math.max(...ls.map((l) => g.measureText(l).width)),
        ls.length * o.size * 1.25,
      ];
    }
    const pts =
      o.t === "stroke" || o.t === "room"
        ? o.p
        : o.t === "rsk"
          ? o.__hit
            ? o.__hit.map((h) => h[0])
            : o.p
          : o.t === "ang"
            ? [o.a, o.b, o.v]
            : o.t === "dim" && o.off
              ? (() => {
                  const n = dimN(o);
                  return [
                    o.a,
                    o.b,
                    [o.a[0] + n[0] * o.off, o.a[1] + n[1] * o.off],
                    [o.b[0] + n[0] * o.off, o.b[1] + n[1] * o.off],
                  ];
                })()
              : [o.a, o.b];
    const xs = pts.map((p) => p[0]),
      ys = pts.map((p) => p[1]);
    const m = (o.w || 6) / 2;
    return [
      Math.min(...xs) - m,
      Math.min(...ys) - m,
      Math.max(...xs) - Math.min(...xs) + 2 * m,
      Math.max(...ys) - Math.min(...ys) + 2 * m,
    ];
  }
  const ctr = (o) => {
    const [x, y, w, h] = baseBox(o);
    return [x + w / 2, y + h / 2];
  };
  const rot = (p, c, a) => {
    const co = Math.cos(a),
      si = Math.sin(a),
      dx = p[0] - c[0],
      dy = p[1] - c[1];
    return [c[0] + dx * co - dy * si, c[1] + dx * si + dy * co];
  };
  function bbox(o) {
    const b = baseBox(o);
    if (!(npBoxy(o) && o.r)) return b;
    const c = [b[0] + b[2] / 2, b[1] + b[3] / 2];
    const cs = [
      [b[0], b[1]],
      [b[0] + b[2], b[1]],
      [b[0], b[1] + b[3]],
      [b[0] + b[2], b[1] + b[3]],
    ].map((p) => rot(p, c, o.r));
    const xs = cs.map((p) => p[0]),
      ys = cs.map((p) => p[1]);
    return [
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
    ];
  }
  function drawObj(ctx, o) {
    const vb = vpOf(o) ? null : vpBoxAt(vpAnchor(o));
    const vs = vb ? +vb.vp : 0;
    const pv = ctx.__vpo;
    ctx.__vpo = vb ? [Math.min(vb.a[0], vb.b[0]), Math.min(vb.a[1], vb.b[1])] : null;
    if (vs === NP_SCX) {
      try {
        return drawObjM(ctx, o);
      } finally {
        ctx.__vpo = pv;
      }
    }
    const px = NP_SCX,
      pm = ctx.__mm;
    NP_SCX = vs;
    if (pm || vs) ctx.__mm = doc.scale ? NP_U / doc.scale : 0;
    try {
      return drawObjM(ctx, o);
    } finally {
      NP_SCX = px;
      ctx.__mm = pm;
      ctx.__vpo = pv;
    }
  }
  function drawVp(ctx, o) {
    const x0 = Math.min(o.a[0], o.b[0]),
      y0 = Math.min(o.a[1], o.b[1]),
      w = Math.abs(o.b[0] - o.a[0]),
      h = Math.abs(o.b[1] - o.a[1]);
    ctx.save();
    ctx.strokeStyle = o.c || "#2f5fb3";
    ctx.fillStyle = o.c || "#2f5fb3";
    ctx.lineWidth = Math.max(o.w || 1.5, 0.6 / (ctx.__s || 1));
    if (!o.vph) {
      ctx.setLineDash([ctx.lineWidth * 6, ctx.lineWidth * 4]);
      ctx.strokeRect(x0, y0, w, h);
      ctx.setLineDash([]);
    }
    const t = (o.vpn ? o.vpn.toUpperCase() + "  " : "") + "1:" + o.vp,
      f = Math.max(9, Math.min(26, Math.max(w, h) * 0.035));
    ctx.font = `700 ${f}px system-ui,-apple-system,sans-serif`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const tw = ctx.measureText(t).width;
    ctx.fillText(t, x0, y0 + h + f * 0.35);
    ctx.lineWidth = Math.max(f * 0.08, 0.6);
    ctx.beginPath();
    ctx.moveTo(x0, y0 + h + f * 1.45);
    ctx.lineTo(x0 + tw, y0 + h + f * 1.45);
    ctx.stroke();
    ctx.restore();
  }
  function drawObj0(ctx, o) {
    if (vpOf(o)) {
      drawVp(ctx, o);
      return;
    }
    if (o.t === "rsk") {
      rsDrawInDrawing(ctx, o, doc);
      return;
    }
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = o.c || "#111";
    ctx.lineWidth = Math.max(o.w || 6, 0.8 / (ctx.__s || 1));
    ctx.lineCap = ctx.lineJoin = "round";
    if (o.ls) {
      const L = ctx.lineWidth;
      ctx.setLineDash(
        o.ls === "dash"
          ? [L * 5, L * 3]
          : o.ls === "dot"
            ? [L * 0.1, L * 2.4]
            : o.ls === "long"
              ? [L * 12, L * 4]
              : o.ls === "dashdotdot"
                ? [L * 9, L * 2.2, L * 1.2, L * 2.2, L * 1.2, L * 2.2]
                : o.ls === "fine"
                  ? [L * 0.1, L * 1.5]
                  : o.ls === "heavy"
                    ? [L * 4, L * 2.5]
                    : [L * 8, L * 2.5, L * 1.5, L * 2.5],
      );
      if (o.ls === "heavy") ctx.lineWidth = L * 1.8;
    }
    if (npBoxy(o) && (o.r || o.fl)) {
      const c = ctr(o);
      ctx.translate(c[0], c[1]);
      if (o.r) ctx.rotate(o.r);
      if (o.fl) ctx.scale(-1, 1);
      ctx.translate(-c[0], -c[1]);
    } else if (npLineShape(o) && o.fl) {
      const an = Math.atan2(o.b[1] - o.a[1], o.b[0] - o.a[0]);
      ctx.translate(o.a[0], o.a[1]);
      ctx.rotate(an);
      ctx.scale(1, -1);
      ctx.rotate(-an);
      ctx.translate(-o.a[0], -o.a[1]);
    }
    if (o.fill && o.t !== "img" && o.t !== "room") {
      ctx.save();
      ctx.fillStyle = o.fill;
      ctx.globalAlpha = o.fa >= 0.99 ? 1 : o.fa || 0.35;
      const x0 = Math.min(o.a ? o.a[0] : o.x, o.b ? o.b[0] : o.x),
        y0 = Math.min(o.a ? o.a[1] : o.y, o.b ? o.b[1] : o.y);
      if (
        o.t === "circle" ||
        (o.t === "shape" &&
          [
            "fillcirc",
            "spiral",
            "cyl",
            "light",
            "smoke",
            "gully",
            "svp",
            "tap",
            "re",
            "rwp",
            "aav",
            "heat",
            "coal",
            "stat",
            "dlight",
            "tagcirc",
          ].includes(o.k))
      ) {
        ctx.beginPath();
        ctx.ellipse(
          (o.a[0] + o.b[0]) / 2,
          (o.a[1] + o.b[1]) / 2,
          Math.abs(o.b[0] - o.a[0]) / 2,
          Math.abs(o.b[1] - o.a[1]) / 2,
          0,
          0,
          7,
        );
        ctx.fill();
      } else if (
        o.t === "shape" &&
        ["tri", "rtri", "diamond", "hex", "star", "eroof", "elean"].includes(o.k)
      ) {
        const X0 = x0,
          Y0 = y0,
          X1 = Math.max(o.a[0], o.b[0]),
          Y1 = Math.max(o.a[1], o.b[1]),
          w = X1 - X0,
          h = Y1 - Y0,
          cx = (X0 + X1) / 2,
          cy = (Y0 + Y1) / 2;
        const P = {
          tri: [
            [cx, Y0],
            [X1, Y1],
            [X0, Y1],
          ],
          eroof: [
            [cx, Y0],
            [X1, Y1],
            [X0, Y1],
          ],
          rtri: [
            [o.a[0], o.a[1]],
            [o.a[0], o.b[1]],
            [o.b[0], o.b[1]],
          ],
          elean: [
            [X0, Y1],
            [X0, Y0],
            [X1, Y1],
          ],
          diamond: [
            [cx, Y0],
            [X1, cy],
            [cx, Y1],
            [X0, cy],
          ],
          hex: Array.from({ length: 6 }, (_, i) => [
            cx + (w / 2) * Math.cos((Math.PI / 3) * i),
            cy + (h / 2) * Math.sin((Math.PI / 3) * i),
          ]),
          star: Array.from({ length: 10 }, (_, i) => {
            const r = i % 2 ? 0.42 : 1,
              an = -Math.PI / 2 + (Math.PI / 5) * i;
            return [cx + (w / 2) * r * Math.cos(an), cy + (h / 2) * r * Math.sin(an)];
          }),
        }[o.k];
        ctx.beginPath();
        P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.fill();
      } else if (o.t === "rect" || (npBoxy(o) && o.a)) {
        ctx.fillRect(x0, y0, Math.abs(o.b[0] - o.a[0]), Math.abs(o.b[1] - o.a[1]));
      } else if (o.t === "stroke" && o.p && o.p.length > 2) {
        ctx.beginPath();
        o.p.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.fill();
      } else if (o.t === "text") {
        const lines = String(o.s).split("\n");
        ctx.font = `600 ${o.size}px system-ui, -apple-system, sans-serif`;
        const tw = Math.max(...lines.map((l) => ctx.measureText(l).width));
        ctx.fillRect(
          o.x - o.size * 0.2,
          o.y - o.size * 0.15,
          tw + o.size * 0.4,
          lines.length * o.size * 1.25 + o.size * 0.1,
        );
      }
      ctx.restore();
    }
    if (o.t === "stroke") {
      if (o.hl) {
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = (o.w || 6) * 3;
        ctx.lineCap = "butt";
      }
      const p = o.p;
      ctx.beginPath();
      ctx.moveTo(p[0][0], p[0][1]);
      if (p.length === 1) ctx.lineTo(p[0][0] + 0.1, p[0][1]);
      for (let i = 1; i < p.length - 1; i++) {
        const mx = (p[i][0] + p[i + 1][0]) / 2,
          my = (p[i][1] + p[i + 1][1]) / 2;
        ctx.quadraticCurveTo(p[i][0], p[i][1], mx, my);
      }
      if (p.length > 1) ctx.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
      ctx.stroke();
    } else if (o.t === "line") {
      ctx.beginPath();
      ctx.moveTo(o.a[0], o.a[1]);
      if (o.bend) {
        const cp = npBendCp(o);
        ctx.quadraticCurveTo(cp[0], cp[1], o.b[0], o.b[1]);
      } else ctx.lineTo(o.b[0], o.b[1]);
      ctx.stroke();
    } else if (o.t === "dim") {
      const lab = o.auto && doc.scale ? dimAutoLab(o) : o.s || "";
      if (o.off) {
        const n = dimN(o),
          A = [o.a[0] + n[0] * o.off, o.a[1] + n[1] * o.off],
          B = [o.b[0] + n[0] * o.off, o.b[1] + n[1] * o.off],
          sg = Math.sign(o.off),
          gp = Math.min(Math.abs(o.off) * 0.25, (o.size || 20) * 0.4),
          ex = (o.size || 20) * 0.5;
        ctx.save();
        ctx.lineWidth = Math.max((o.w || 3) * 0.6, 0.6 / (ctx.__s || 1));
        [
          [o.a, A],
          [o.b, B],
        ].forEach(([p, q2]) => {
          ctx.beginPath();
          ctx.moveTo(p[0] + n[0] * gp * sg, p[1] + n[1] * gp * sg);
          ctx.lineTo(q2[0] + n[0] * ex * sg, q2[1] + n[1] * ex * sg);
          ctx.stroke();
        });
        ctx.restore();
        drawDim(ctx, A, B, o.c || "#111", o.w || 3, lab, o.size, o.tk);
      } else drawDim(ctx, o.a, o.b, o.c || "#111", o.w || 3, lab, o.size, o.tk);
    } else if (o.t === "room" && o.pave) {
      npPaveDraw(ctx, o, doc.scale ? NP_U / doc.scale : 0);
    } else if (o.t === "room") {
      const p = o.p;
      if (p.length > 2) {
        ctx.save();
        ctx.beginPath();
        p.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
        ctx.closePath();
        ctx.fillStyle = o.fill || "#2f5fb3";
        ctx.globalAlpha = o.fill ? o.fa || 0.25 : 0.08;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = o.c || "#2f5fb3";
        ctx.lineWidth = Math.max((o.w || 2) * 0.6, 0.6 / (ctx.__s || 1));
        ctx.setLineDash([(o.size || 20) * 0.4, (o.size || 20) * 0.25]);
        ctx.stroke();
        ctx.restore();
        const c = npPolyCentroid(p),
          fs = o.size || 20,
          mm = doc.scale ? NP_U / doc.scale : 0;
        const lines = [o.name || "Room"];
        if (mm) {
          const A = npPolyArea(p) / (mm * mm) / 1e6,
            P = npPolyPerim(p) / mm / 1000;
          lines.push((Math.round(A * 100) / 100).toFixed(2) + " m²");
          if (o.showP !== false)
            lines.push("Perimeter " + (Math.round(P * 100) / 100).toFixed(2) + " m");
        }
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        lines.forEach((t, i) => {
          const f = i ? fs * 0.75 : fs;
          ctx.font = `${i ? 500 : 700} ${f}px system-ui,-apple-system,sans-serif`;
          ctx.fillStyle = i ? "#334155" : o.c || "#1e3a8a";
          ctx.fillText(t, c[0], c[1] + (i - (lines.length - 1) / 2) * fs * 1.15);
        });
        ctx.restore();
      }
    } else if (o.t === "ang") {
      const a1 = Math.atan2(o.a[1] - o.v[1], o.a[0] - o.v[0]),
        a2 = Math.atan2(o.b[1] - o.v[1], o.b[0] - o.v[0]);
      let d = a2 - a1;
      while (d <= -Math.PI) d += 2 * Math.PI;
      while (d > Math.PI) d -= 2 * Math.PI;
      const R =
        Math.min(
          Math.hypot(o.a[0] - o.v[0], o.a[1] - o.v[1]),
          Math.hypot(o.b[0] - o.v[0], o.b[1] - o.v[1]),
        ) * 0.6;
      ctx.lineWidth = o.w || 3;
      ctx.beginPath();
      ctx.moveTo(o.a[0], o.a[1]);
      ctx.lineTo(o.v[0], o.v[1]);
      ctx.lineTo(o.b[0], o.b[1]);
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(o.v[0], o.v[1], R, a1, a1 + d, d < 0);
      ctx.stroke();
      const am = a1 + d / 2,
        fs = o.size || 22,
        deg = Math.abs((d * 180) / Math.PI);
      const t = Math.round(deg * 10) / 10 + "°";
      ctx.font = `700 ${fs}px system-ui,-apple-system,sans-serif`;
      const tx = o.v[0] + Math.cos(am) * (R + fs * 0.9),
        ty = o.v[1] + Math.sin(am) * (R + fs * 0.9);
      const tw = ctx.measureText(t).width;
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.fillRect(tx - tw / 2 - 3, ty - fs * 0.6, tw + 6, fs * 1.2);
      ctx.restore();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t, tx, ty);
    } else if (o.t === "shape") {
      drawShape(ctx, o);
    } else if (o.t === "rect") {
      ctx.strokeRect(
        Math.min(o.a[0], o.b[0]),
        Math.min(o.a[1], o.b[1]),
        Math.abs(o.b[0] - o.a[0]),
        Math.abs(o.b[1] - o.a[1]),
      );
    } else if (o.t === "circle") {
      ctx.beginPath();
      ctx.ellipse(
        (o.a[0] + o.b[0]) / 2,
        (o.a[1] + o.b[1]) / 2,
        Math.abs(o.b[0] - o.a[0]) / 2 + 0.5,
        Math.abs(o.b[1] - o.a[1]) / 2 + 0.5,
        0,
        0,
        7,
      );
      ctx.stroke();
    } else if (o.t === "arrow") {
      const ang = Math.atan2(o.b[1] - o.a[1], o.b[0] - o.a[0]),
        h = (o.w || 6) * 4 + 10;
      ctx.beginPath();
      ctx.moveTo(o.a[0], o.a[1]);
      ctx.lineTo(o.b[0], o.b[1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(o.b[0], o.b[1]);
      ctx.lineTo(o.b[0] - h * Math.cos(ang - 0.45), o.b[1] - h * Math.sin(ang - 0.45));
      ctx.lineTo(o.b[0] - h * Math.cos(ang + 0.45), o.b[1] - h * Math.sin(ang + 0.45));
      ctx.closePath();
      ctx.fill();
    } else if (o.t === "text") {
      ctx.font = `600 ${o.size}px system-ui, -apple-system, sans-serif`;
      ctx.textBaseline = "top";
      const lines = String(o.s).split("\n");
      if (o.box || o.lead) {
        const tw = Math.max(...lines.map((l) => ctx.measureText(l).width)),
          pd = o.size * 0.35,
          bx = o.x - pd,
          by = o.y - pd,
          bw = tw + pd * 2,
          bh = lines.length * o.size * 1.25 - o.size * 0.25 + pd * 2;
        ctx.save();
        ctx.setLineDash([]);
        ctx.lineWidth = Math.max(o.size * 0.07, 0.6 / (ctx.__s || 1));
        if (o.box === "box" || o.box === "round" || o.box === "cloud") {
          ctx.save();
          ctx.fillStyle = "#fff";
          ctx.globalAlpha = 0.9;
          ctx.fillRect(bx, by, bw, bh);
          ctx.restore();
          ctx.beginPath();
          if (o.box === "round" && ctx.roundRect) ctx.roundRect(bx, by, bw, bh, o.size * 0.45);
          else if (o.box === "cloud") {
            npScallop(
              ctx,
              [
                [bx, by],
                [bx + bw, by],
                [bx + bw, by + bh],
                [bx, by + bh],
              ].flatMap((q, k, A) => {
                const n2 = A[(k + 1) % 4];
                const L2 = Math.hypot(n2[0] - q[0], n2[1] - q[1]),
                  m2 = Math.max(1, Math.round(L2 / (o.size * 0.9)));
                return Array.from({ length: m2 }, (_, j) => [
                  q[0] + ((n2[0] - q[0]) * j) / m2,
                  q[1] + ((n2[1] - q[1]) * j) / m2,
                ]);
              }),
              true,
            );
            ctx.beginPath();
          } else ctx.rect(bx, by, bw, bh);
          ctx.stroke();
        } else if (o.box === "under") {
          ctx.beginPath();
          ctx.moveTo(bx, by + bh);
          ctx.lineTo(bx + bw, by + bh);
          ctx.stroke();
        }
        if (o.lead && o.lead.p && o.lead.k !== "none") {
          const t = o.lead.p;
          const q = [Math.max(bx, Math.min(bx + bw, t[0])), Math.max(by, Math.min(by + bh, t[1]))];
          const e = o.box === "under" ? [t[0] < bx + bw / 2 ? bx : bx + bw, by + bh] : q;
          if (Math.hypot(e[0] - t[0], e[1] - t[1]) > o.size * 0.3) {
            ctx.beginPath();
            ctx.moveTo(e[0], e[1]);
            ctx.lineTo(t[0], t[1]);
            ctx.stroke();
            const an = Math.atan2(t[1] - e[1], t[0] - e[0]),
              hh = o.size * 0.7;
            if (o.lead.k === "arrow") {
              ctx.beginPath();
              ctx.moveTo(t[0], t[1]);
              ctx.lineTo(t[0] - hh * Math.cos(an - 0.4), t[1] - hh * Math.sin(an - 0.4));
              ctx.lineTo(t[0] - hh * Math.cos(an + 0.4), t[1] - hh * Math.sin(an + 0.4));
              ctx.closePath();
              ctx.fill();
            } else if (o.lead.k === "dot") {
              ctx.beginPath();
              ctx.arc(t[0], t[1], o.size * 0.22, 0, 7);
              ctx.fill();
            }
          }
        }
        ctx.restore();
      }
      lines.forEach((l, i) => ctx.fillText(l, o.x, o.y + i * o.size * 1.25));
    } else if (o.t === "img") {
      const im = loadImg(o.src);
      if (im.complete && im.naturalWidth) {
        const c = o.crop;
        if (c) {
          const nw = im.naturalWidth,
            nh = im.naturalHeight;
          ctx.drawImage(im, c.x * nw, c.y * nh, c.w * nw, c.h * nh, o.x, o.y, o.w, o.h);
        } else ctx.drawImage(im, o.x, o.y, o.w, o.h);
      } else {
        ctx.fillStyle = "#eee";
        ctx.fillRect(o.x, o.y, o.w, o.h);
      }
    }
    ctx.restore();
  }
  /* handles of the selected object, in page units */
  const HR = window.matchMedia && window.matchMedia("(pointer:coarse)").matches ? 16 : 13;
  function handles(o) {
    const H = [];
    if (!o) return H;
    if (npBoxy(o)) {
      const [bx, by, bw, bh] = baseBox(o),
        c = [bx + bw / 2, by + bh / 2],
        r = o.r || 0;
      if (o.a && o.b) {
        H.push({ k: "a", p: rot(o.a, c, r) }, { k: "b", p: rot(o.b, c, r) });
      } else {
        H.push({ k: "size", p: rot([bx + bw, by + bh], c, r) });
      }
      H.push({
        k: "rot",
        p: rot([c[0], by - Math.max(30 / s, 10)], c, r),
        stem: rot([c[0], by], c, r),
      });
    } else if (o.a && o.b) {
      H.push({ k: "a", p: o.a }, { k: "b", p: o.b });
      if (o.t !== "room") {
        const mx = (o.a[0] + o.b[0]) / 2,
          my = (o.a[1] + o.b[1]) / 2,
          L = Math.hypot(o.b[0] - o.a[0], o.b[1] - o.a[1]) || 1,
          nx = -(o.b[1] - o.a[1]) / L,
          ny = (o.b[0] - o.a[0]) / L,
          d =
            Math.max(40 / s, (o.th || 0) / 2 + 30 / s) *
            (o.t === "dim" ? -1 : 1) *
            (o.bend > 0 ? -1 : 1);
        H.push({ k: "lrot", p: [mx + nx * d, my + ny * d], stem: [mx, my] });
      }
      if (o.t === "dim") {
        const n = dimN(o),
          f = o.off || 0;
        H.push({
          k: "off",
          p: [
            (o.a[0] + o.b[0]) / 2 + n[0] * (f || 0) + n[0] * (o.size || 20) * 1.6,
            (o.a[1] + o.b[1]) / 2 + n[1] * (f || 0) + n[1] * (o.size || 20) * 1.6,
          ],
        });
      }
    }
    if (o.t === "line" && o.bend) H.push({ k: "bend", p: npBendApex(o) });
    if (o.t === "text" && o.lead && o.lead.p) H.push({ k: "tip", p: o.lead.p });
    if (o.t === "stroke" && o.p && o.p.length > 1) {
      const b = baseBox(o);
      H.push({ k: "lrot", p: [b[0] + b[2] / 2, b[1] - 30 / s], stem: [b[0] + b[2] / 2, b[1]] });
    }
    return H;
  }
  function drawLive() {
    if (!live) return;
    g.save();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [x, y] = [live.p[0] * s + ox, live.p[1] * s + oy];
    g.font = "700 14px system-ui,sans-serif";
    const tw = g.measureText(live.t).width;
    g.fillStyle = "rgba(17,17,17,.85)";
    g.beginPath();
    if (g.roundRect) g.roundRect(x + 14, y - 34, tw + 16, 24, 6);
    else g.rect(x + 14, y - 34, tw + 16, 24);
    g.fill();
    g.fillStyle = "#fff";
    g.textBaseline = "middle";
    g.fillText(live.t, x + 22, y - 22);
    g.restore();
  }
  function draw() {
    const k0 = NP_SCX;
    NP_SCX = 0;
    try {
      draw0();
    } finally {
      NP_SCX = k0;
    }
  }
  function draw0() {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#6b6363";
    g.fillRect(0, 0, cv.width, cv.height);
    g.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    g.__s = s;
    g.save();
    g.shadowColor = "rgba(0,0,0,.35)";
    g.shadowBlur = 14;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, doc.w, doc.h);
    g.restore();
    const [x0, y0] = [-ox / s, -oy / s],
      [x1, y1] = [(cv.width / dpr - ox) / s, (cv.height / dpr - oy) / s];
    g.save();
    g.beginPath();
    g.rect(0, 0, doc.w, doc.h);
    g.clip();
    paper(g, doc.w, doc.h, x0, y0, x1, y1);
    g.__mm = doc.scale ? NP_U / doc.scale : 0;
    {
      const gi = doc.pages[pg] && doc.pages[pg].ghost;
      if (gi != null && gi !== pg && doc.pages[gi]) {
        g.save();
        g.globalAlpha = 0.22;
        npDrawAll(g, visObjs(doc.pages[gi].objs), drawObj);
        g.restore();
      }
    }
    npDrawAll(g, visObjs(doc.objs), drawObj, cur && npIsWall(cur) ? cur : null);
    if (cur && !npIsWall(cur)) drawObj(g, cur);
    tbox(g, pg);
    g.restore();
    const so = sel != null ? doc.objs[sel] : null;
    if (so) {
      g.save();
      const b = baseBox(so);
      if (npBoxy(so)) {
        const c = [b[0] + b[2] / 2, b[1] + b[3] / 2];
        g.translate(c[0], c[1]);
        g.rotate(so.r || 0);
        g.translate(-c[0], -c[1]);
      }
      g.setLineDash([10 / s, 8 / s]);
      g.lineWidth = 2 / s;
      g.strokeStyle = "#2f5fb3";
      g.strokeRect(b[0] - 6 / s, b[1] - 6 / s, b[2] + 12 / s, b[3] + 12 / s);
      g.restore();
      g.save();
      handles(so).forEach((h) => {
        if (h.stem) {
          g.lineWidth = 2 / s;
          g.strokeStyle = "#2f5fb3";
          g.beginPath();
          g.moveTo(h.stem[0], h.stem[1]);
          g.lineTo(h.p[0], h.p[1]);
          g.stroke();
        }
        g.beginPath();
        if (h.k === "size") {
          g.fillStyle = "#2f5fb3";
          g.fillRect(h.p[0] - 11 / s, h.p[1] - 11 / s, 22 / s, 22 / s);
        } else {
          g.arc(h.p[0], h.p[1], HR / s, 0, 7);
          g.fillStyle = h.k === "rot" || h.k === "lrot" ? "#2f5fb3" : "#fff";
          g.fill();
          g.lineWidth = 3 / s;
          g.strokeStyle = "#2f5fb3";
          g.stroke();
          if (h.k === "rot" || h.k === "lrot") {
            g.save();
            g.fillStyle = "#fff";
            g.font = `700 ${16 / s}px system-ui`;
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillText("⟳", h.p[0], h.p[1] + 1 / s);
            g.restore();
          }
        }
      });
      g.restore();
    }
    if (msel.size) {
      g.save();
      g.setLineDash([8 / s, 6 / s]);
      g.lineWidth = 2 / s;
      g.strokeStyle = "#16a34a";
      let gx0 = 1e9,
        gy0 = 1e9,
        gx1 = -1e9,
        gy1 = -1e9;
      msel.forEach((j) => {
        const o = doc.objs[j];
        if (!o) return;
        const b = bbox(o);
        g.strokeRect(b[0] - 5 / s, b[1] - 5 / s, b[2] + 10 / s, b[3] + 10 / s);
        gx0 = Math.min(gx0, b[0]);
        gy0 = Math.min(gy0, b[1]);
        gx1 = Math.max(gx1, b[0] + b[2]);
        gy1 = Math.max(gy1, b[1] + b[3]);
      });
      if (msel.size > 1 && gx1 > gx0) {
        g.setLineDash([]);
        g.lineWidth = 1.5 / s;
        g.strokeStyle = "rgba(22,163,74,.6)";
        g.strokeRect(gx0 - 14 / s, gy0 - 14 / s, gx1 - gx0 + 28 / s, gy1 - gy0 + 28 / s);
      }
      g.restore();
    }
    if (snapMark && (cur || drag || chain.length)) {
      const m = snapMark,
        R = 9 / s;
      g.save();
      g.strokeStyle = "#16a34a";
      g.fillStyle = "rgba(22,163,74,.15)";
      g.lineWidth = 2.2 / s;
      if (m.k === "guide") {
        g.setLineDash([5 / s, 4 / s]);
        g.lineWidth = 1.2 / s;
        if (m.gx) {
          g.beginPath();
          g.moveTo(m.gx[0], m.gx[1]);
          g.lineTo(m.p[0], m.p[1]);
          g.stroke();
        }
        if (m.gy) {
          g.beginPath();
          g.moveTo(m.gy[0], m.gy[1]);
          g.lineTo(m.p[0], m.p[1]);
          g.stroke();
        }
        g.setLineDash([]);
      } else {
        g.beginPath();
        if (m.k === "end") {
          g.rect(m.p[0] - R, m.p[1] - R, 2 * R, 2 * R);
        } else if (m.k === "mid") {
          g.moveTo(m.p[0], m.p[1] - R);
          g.lineTo(m.p[0] + R, m.p[1] + R * 0.8);
          g.lineTo(m.p[0] - R, m.p[1] + R * 0.8);
          g.closePath();
        } else if (m.k === "cen") {
          g.arc(m.p[0], m.p[1], R, 0, 7);
        } else if (m.k === "int") {
          g.moveTo(m.p[0] - R, m.p[1] - R);
          g.lineTo(m.p[0] + R, m.p[1] + R);
          g.moveTo(m.p[0] + R, m.p[1] - R);
          g.lineTo(m.p[0] - R, m.p[1] + R);
        } else if (m.k === "perp") {
          g.moveTo(m.p[0] - R, m.p[1] + R);
          g.lineTo(m.p[0] + R, m.p[1] + R);
          g.moveTo(m.p[0], m.p[1] + R);
          g.lineTo(m.p[0], m.p[1] - R);
        } else {
          g.moveTo(m.p[0], m.p[1] - R);
          g.lineTo(m.p[0] + R, m.p[1]);
          g.lineTo(m.p[0], m.p[1] + R);
          g.lineTo(m.p[0] - R, m.p[1]);
          g.closePath();
        }
        if (m.k !== "int" && m.k !== "perp") g.fill();
        g.stroke();
        const lab = {
          end: "End",
          mid: "Middle",
          cen: "Centre",
          int: "Crossing",
          perp: "Square to",
          on: "On line",
        }[m.k];
        if (lab) {
          g.font = `700 ${11 / s}px system-ui`;
          g.fillStyle = "#16a34a";
          g.fillText(lab, m.p[0] + R * 1.4, m.p[1] + R * 2.4);
        }
      }
      g.restore();
    }
    if (drag && drag.kind === "band") {
      g.save();
      g.fillStyle = "rgba(47,95,179,.12)";
      g.strokeStyle = "#2f5fb3";
      g.lineWidth = 1.5 / s;
      g.setLineDash([6 / s, 4 / s]);
      const x = Math.min(drag.a[0], drag.b[0]),
        y = Math.min(drag.a[1], drag.b[1]),
        w = Math.abs(drag.b[0] - drag.a[0]),
        h = Math.abs(drag.b[1] - drag.a[1]);
      g.fillRect(x, y, w, h);
      g.strokeRect(x, y, w, h);
      g.restore();
    }
    if (chain.length && (tool === "pave" || tool === "pstrip")) {
      const pr =
        tool === "pstrip" && doc.scale && chain.length > 1
          ? npStripPoly(chain, toUnits(paveW), paveSide)
          : chain;
      g.save();
      g.fillStyle = "rgba(140,110,60,.18)";
      g.strokeStyle = "#8c6e3c";
      g.lineWidth = 2 / s;
      g.setLineDash([8 / s, 5 / s]);
      g.beginPath();
      pr.forEach((c2, i) => (i ? g.lineTo(c2[0], c2[1]) : g.moveTo(c2[0], c2[1])));
      if (pr.length > 2) g.closePath();
      g.fill();
      g.stroke();
      g.setLineDash([]);
      chain.forEach((c2) => {
        g.beginPath();
        g.arc(c2[0], c2[1], 6 / s, 0, 7);
        g.fillStyle = "#8c6e3c";
        g.fill();
      });
      g.restore();
    }
    if (chain.length && (tool === "dimc" || tool === "dima" || tool === "room")) {
      if (tool === "room" && chain.length > 2) {
        g.save();
        g.fillStyle = "rgba(47,95,179,.12)";
        g.beginPath();
        chain.forEach((c2, i) => (i ? g.lineTo(c2[0], c2[1]) : g.moveTo(c2[0], c2[1])));
        g.closePath();
        g.fill();
        g.restore();
      }
      g.save();
      g.strokeStyle = g.fillStyle = "#e11d2a";
      g.lineWidth = 2 / s;
      g.setLineDash([6 / s, 4 / s]);
      g.beginPath();
      chain.forEach((c2, i) => (i ? g.lineTo(c2[0], c2[1]) : g.moveTo(c2[0], c2[1])));
      g.stroke();
      g.setLineDash([]);
      chain.forEach((c2) => {
        g.beginPath();
        g.arc(c2[0], c2[1], 7 / s, 0, 7);
        g.fill();
      });
      g.restore();
    }
    drawLive();
    {
      const mb = q(".np-mbar");
      mb.hidden = !msel.size;
      if (msel.size) {
        const objs = [...msel].map((j) => doc.objs[j]).filter(Boolean);
        const grouped = objs.length > 1 && objs.every((o) => o.gid && o.gid === objs[0].gid);
        const locked = objs.every((o) => o.lk);
        q(".np-mcount").textContent = msel.size + " picked";
        const gb = mb.querySelector('[data-m="group"]');
        gb.innerHTML = grouped ? "⛓<small>Ungroup</small>" : "🔗<small>Group</small>";
        gb.hidden = objs.length < 2;
        mb.querySelector('[data-m="align"]').hidden = objs.length < 2;
        mb.querySelector('[data-m="lock"]').innerHTML = locked
          ? "🔓<small>Unlock</small>"
          : "🔒<small>Lock</small>";
        mb.querySelectorAll(
          '[data-m="copy"],[data-m="rot"],[data-m="mirh"],[data-m="mirv"],[data-m="align"],[data-m="del"]',
        ).forEach((b) => {
          if (locked) b.hidden = true;
          else if (b.dataset.m !== "align") b.hidden = false;
        });
      }
    }
    q(".np-selbar:not(.np-mbar)").hidden = !so || msel.size > 0;
    if (so) {
      const lk = !!so.lk;
      q('.np-sb[data-a="lock"]').innerHTML = lk
        ? "🔓<small>Unlock</small>"
        : "🔒<small>Lock</small>";
      ov.querySelectorAll(".np-selbar:not(.np-mbar) .np-sb").forEach((b) => {
        if (b.dataset.a !== "lock") b.classList.toggle("lkhide", lk);
      });
    }
    if (!so && q(".np-finebox")) q(".np-finebox").hidden = true;
    else if (so && q(".np-finebox") && !q(".np-finebox").hidden && !drag)
      setTimeout(() => {
        try {
          fineFill();
        } catch (e) {}
      }, 0);
    if (so && !so.lk) {
      q('.np-sb[data-a="flip"]').hidden = !(so.t === "shape" || so.t === "img");
      {
        const ad = q('.np-sb[data-a="autodim"]');
        ad.hidden = ["text", "stroke", "dim", "ang", "arrow"].includes(so.t) || vpOf(so);
        ad.innerHTML = hasDims(so)
          ? "📏<small>Take dims off</small>"
          : "📏<small>Dimension it</small>";
      }
      q('.np-sb[data-a="offset"]').hidden = !(
        (so.a && so.b && !npBoxy(so) && so.t !== "dim" && so.t !== "ang") ||
        so.t === "rect" ||
        so.t === "room"
      );
      const ds = q('.np-sb[data-a="dstyle"]');
      ds.hidden = so.t !== "dim";
      if (so.t === "dim") ds.innerHTML = so.tk ? "➤<small>Arrows</small>" : "⟋<small>Ticks</small>";
      q('.np-sb[data-a="crop"]').hidden = so.t !== "img";
    }
    status();
  }
  function status() {
    const sc = doc.scale ? `1:${doc.scale}` : "Not to scale";
    const sz = sized()
      ? `${doc.size} ${doc.orient === "port" ? "portrait" : "landscape"}`
      : "Long page";
    q(".np-status").innerHTML =
      `<span>${esc(sz)} · ${esc(sc)}${doc.scale && doc.paper === "grid" ? ` · 1 square = ${esc(npFmtLen(realMm(50)))}` : ""}${snapOn ? " · 🧲 snap on" : ""}</span><span class="np-hint2">${tool === "move" ? "Tap something to select it. Drag to move, white dots to resize, ⟳ to turn." : "Two fingers to zoom and move around."}</span>`;
  }
  function hit(pt) {
    const tol = (HR + 2) / s;
    for (let i = doc.objs.length - 1; i >= 0; i--) {
      const o = doc.objs[i];
      if (doc.layers && lyOff(o)) continue;
      /* a room sketch is picked up (to move it) by a wall or from inside it; its walls are edited with its own tool */
      if (o.t === "rsk") {
        const H = o.__hit || [];
        if (
          H.length > 2 &&
          npInPoly(
            pt,
            H.map((h) => h[0]),
          )
        )
          return i;
        if (H.some(([a, b]) => distSeg(pt, a, b) < tol)) return i;
        continue;
      }
      if (npBoxy(o)) {
        const b = baseBox(o);
        const c = [b[0] + b[2] / 2, b[1] + b[3] / 2];
        const lp = o.r ? rot(pt, c, -o.r) : pt;
        if (
          lp[0] >= b[0] - tol &&
          lp[0] <= b[0] + b[2] + tol &&
          lp[1] >= b[1] - tol &&
          lp[1] <= b[1] + b[3] + tol
        )
          return i;
        continue;
      }
      const [bx, by, bw, bh] = bbox(o);
      if (
        pt[0] < bx - tol * 2 ||
        pt[0] > bx + bw + tol * 2 ||
        pt[1] < by - tol * 2 ||
        pt[1] > by + bh + tol * 2
      )
        continue;
      if (o.t === "room") {
        if (npInPoly(pt, o.p)) return i;
        const pp = o.p.concat([o.p[0]]);
        for (let k = 1; k < pp.length; k++) if (distSeg(pt, pp[k - 1], pp[k]) < tol) return i;
        continue;
      }
      const segs =
        o.t === "stroke"
          ? o.p
          : o.t === "ang"
            ? [o.a, o.v, o.b]
            : o.t === "dim" && o.off
              ? (() => {
                  const n = dimN(o);
                  return [
                    [o.a[0] + n[0] * o.off, o.a[1] + n[1] * o.off],
                    [o.b[0] + n[0] * o.off, o.b[1] + n[1] * o.off],
                  ];
                })()
              : [o.a, o.b];
      if (segs.length === 1) return i;
      const extra = npLineShape(o)
        ? Math.max(
            12,
            (o.th || 0) / 2,
            Math.hypot(o.b[0] - o.a[0], o.b[1] - o.a[1]) *
              (o.k === "door" || o.k === "door2" ? 0.5 : 0.08),
          )
        : 0;
      for (let k = 1; k < segs.length; k++) {
        if (distSeg(pt, segs[k - 1], segs[k]) < (o.w || 6) / 2 + tol + extra) return i;
      }
    }
    return null;
  }
  function distSeg(p, a, b) {
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const l = dx * dx + dy * dy || 1;
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }
  const lenOf = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  /* dimensions stay stuck to the thing they measure */
  const attOf = (o) =>
    vpOf(o)
      ? vpKids(o).map(([d, j]) => [j, JSON.parse(JSON.stringify(d))])
      : o && o.dimg
        ? doc.objs
            .map((d, j) => [d, j])
            .filter(([d]) => d !== o && d.of === o.dimg)
            .map(([d, j]) => [j, JSON.parse(JSON.stringify(d))])
        : [];
  function attachDim(d) {
    if (!d || d.t !== "dim") return;
    const tol = 14 / s;
    let best = null;
    doc.objs.forEach((o) => {
      if (o === d || o.t === "dim" || o.t === "ang" || o.t === "text") return;
      let pts = [];
      if (o.t === "room") pts = o.p.slice();
      else if (o.t === "rect" || o.t === "circle" || npBoxy(o)) {
        const [x, y, w, h] = baseBox(o),
          c = [x + w / 2, y + h / 2],
          r = o.r || 0;
        const cs = [
          [x, y],
          [x + w, y],
          [x + w, y + h],
          [x, y + h],
        ].map((q) => rot(q, c, r));
        pts = cs.concat(
          cs.map((q, k) => {
            const q2 = cs[(k + 1) % 4];
            return [(q[0] + q2[0]) / 2, (q[1] + q2[1]) / 2];
          }),
        );
      } else if (o.a && o.b) {
        pts = [o.a, o.b, [(o.a[0] + o.b[0]) / 2, (o.a[1] + o.b[1]) / 2]];
        if (npIsWall(o) && o.th) {
          const n = dimN(o),
            t = o.th / 2;
          [o.a, o.b].forEach((q) => {
            pts.push([q[0] + n[0] * t, q[1] + n[1] * t], [q[0] - n[0] * t, q[1] - n[1] * t]);
          });
        }
      }
      const near = (q) => pts.some((z) => Math.hypot(z[0] - q[0], z[1] - q[1]) <= tol);
      if (near(d.a) && near(d.b)) best = o;
    });
    if (best) {
      best.dimg =
        best.dimg || "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      d.of = best.dimg;
    }
  }
  function dimN(o) {
    const dx = o.b[0] - o.a[0],
      dy = o.b[1] - o.a[1],
      L = Math.hypot(dx, dy) || 1;
    return [-dy / L, dx / L];
  }
  const dimAutoLab = (o) => Math.round(realMm(lenOf(o.a, o.b)) / 5) * 5 + " mm";
  function liveFor(o) {
    if (!doc.scale || !o) return null;
    if (["line", "dim", "arrow"].includes(o.t) || npLineShape(o))
      return { p: o.b, t: npFmtLen(realMm(lenOf(o.a, o.b))) };
    if (o.t === "rect" || o.t === "circle" || o.t === "shape")
      return {
        p: o.b,
        t:
          npFmtLen(realMm(Math.abs(o.b[0] - o.a[0]))) +
          " × " +
          npFmtLen(realMm(Math.abs(o.b[1] - o.a[1]))),
      };
    return null;
  }
  const ptrs = new Map();
  let pinch = null;
  cv.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    cv.setPointerCapture(e.pointerId);
    if (!lb.hidden) {
      lb.hidden = true;
      lenObj = null;
    }
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2) {
      cur = null;
      drag = null;
      live = null;
      const [a, b] = [...ptrs.values()];
      pinch = {
        d: Math.hypot(a[0] - b[0], a[1] - b[1]),
        mx: (a[0] + b[0]) / 2,
        my: (a[1] + b[1]) / 2,
        s,
        ox,
        oy,
      };
      draw();
      return;
    }
    if (ptrs.size > 2) return;
    downXY = [e.clientX, e.clientY];
    const p = toPage(e.clientX, e.clientY);
    NP_SCX = tool === "vp" ? 0 : vpScaleAt(p);
    /* room sketch: with its tool picked, tapping one of its walls opens that wall's measurements
       (other tools work on the drawing as usual, so a door on a room wall can still be picked up and moved) */
    if (tool === "roomsk") {
      const hit = rsHitDrawing(doc.objs, p, 14 / s);
      if (hit) {
        ptrs.delete(e.pointerId);
        snap();
        rsEditInDrawing(
          hit.o,
          hit.i,
          (msg) => {
            draw();
            toast(msg);
          },
          () => {
            const k = doc.objs.indexOf(hit.o);
            if (k >= 0) doc.objs.splice(k, 1);
            draw();
          },
          doc,
        );
        return;
      }
    }
    if (tool === "curve") {
      sel = null;
      msel.clear();
      const sp = snapPt(p);
      cur = { t: "line", a: sp, b: sp, c: col, w: pwFor(wid), bend: 0.35 };
      draw();
      return;
    }
    if (tool === "vp") {
      sel = null;
      msel.clear();
      const sp = snapPt(p);
      cur = { t: "rect", a: sp, b: sp, c: "#2f5fb3", w: pwFor(2), vp: 10, vpn: "" };
      draw();
      return;
    }
    if (tool === "pwall") {
      let sp = snapPt(p, chain.length ? { from: chain[chain.length - 1] } : {});
      if (chain.length && !snappedObj) sp = orthoB(chain[chain.length - 1], sp);
      if (chain.length) {
        if (lenOf(sp, chain[chain.length - 1]) < 4 / s) return;
        addRun(chain[chain.length - 1], sp);
      }
      chain.push(sp);
      chainUI();
      draw();
      return;
    }
    if (tool === "trim" || tool === "extend") {
      const i = hit(p);
      if (i == null || !isSegObj(doc.objs[i])) {
        toast(
          tool === "trim"
            ? "Tap the bit of a line or wall you want to cut away"
            : "Tap near the end of a line or wall you want to stretch",
        );
        return;
      }
      tool === "trim" ? trimAt(i, p) : extendAt(i, p);
      return;
    }
    if (tool === "corner") {
      const i = hit(p);
      if (i == null || !isSegObj(doc.objs[i])) {
        toast("Tap a line or wall");
        return;
      }
      if (chain.cornerI == null) {
        chain.cornerI = i;
        chain.cornerP = p;
        sel = i;
        draw();
        toast("Now tap the other line or wall");
        return;
      }
      const i0 = chain.cornerI,
        p0 = chain.cornerP;
      chain.cornerI = null;
      sel = null;
      if (i0 === i) {
        toast("Pick a different one");
        return;
      }
      cornerJoin(i0, p0, i, p);
      return;
    }
    if (tool === "pave" || tool === "pstrip") {
      let sp = snapPt(p);
      if (chain.length && snapOn && !snappedObj) sp = orthoB(chain[chain.length - 1], sp);
      if (tool === "pave" && chain.length > 2 && lenOf(sp, chain[0]) < 20 / s) {
        finishPave();
        return;
      }
      if (chain.length && lenOf(sp, chain[chain.length - 1]) < 4 / s) return;
      chain.push(sp);
      chainUI();
      draw();
      return;
    }
    if (tool === "room") {
      let sp = snapPt(p);
      if (chain.length && snapOn) sp = orthoB(chain[chain.length - 1], sp);
      if (chain.length > 2 && lenOf(sp, chain[0]) < 20 / s) {
        finishRoom();
        return;
      }
      chain.push(sp);
      chainUI();
      draw();
      return;
    }
    if (tool === "dimc" || tool === "dima") {
      let sp = snapPt(p);
      if (tool === "dimc") {
        if (chain.length === 1) sp = orthoB(chain[0], sp);
        else if (chain.length >= 2) {
          const u0 = [chain[1][0] - chain[0][0], chain[1][1] - chain[0][1]],
            L = Math.hypot(u0[0], u0[1]) || 1,
            u = [u0[0] / L, u0[1] / L];
          const t = (sp[0] - chain[0][0]) * u[0] + (sp[1] - chain[0][1]) * u[1];
          sp = [chain[0][0] + u[0] * t, chain[0][1] + u[1] * t];
        }
        chain.push(sp);
        chainUI();
        draw();
        return;
      }
      chain.push(sp);
      if (chain.length === 3) {
        snap();
        const [v, a1, b1] = chain;
        doc.objs.push({
          t: "ang",
          v,
          a: a1,
          b: b1,
          c: "#e11d2a",
          w: Math.max(pwFor(wid), sized() ? 2 : pwFor(wid)),
          size: sized() ? Math.max(14, Math.round(Math.min(40, 22 / s))) : Math.round(26 / s),
        });
        chain = [];
        toast("Angle added");
      } else
        toast(
          chain.length === 1
            ? "Now tap a point along the first line"
            : "Now tap a point along the second line",
        );
      chainUI();
      draw();
      return;
    }
    if (tool === "text") {
      textAt = snapOn ? snapPt(p) : p;
      const f = q(".np-text");
      f.hidden = false;
      f.querySelector("input").value = "";
      f.querySelector("input").focus();
      return;
    }
    if (tool === "move" && addTimber && sel != null && isStudW(doc.objs[sel])) {
      const o = doc.objs[sel];
      let t;
      if (o.k === "tstud") {
        const dx = o.b[0] - o.a[0],
          dy = o.b[1] - o.a[1],
          L = Math.hypot(dx, dy) || 1;
        t = ((p[0] - o.a[0]) * dx + (p[1] - o.a[1]) * dy) / L;
        const off = Math.abs(((p[0] - o.a[0]) * -dy + (p[1] - o.a[1]) * dx) / L);
        if (off > npWallT(o, o.w || 6) * 2 + 20 / s) {
          toast("Tap on the stud wall, or tap Done");
        } else {
          snap();
          const sw = doc.scale ? toUnits(50) : npWallT(o, o.w || 6) * 0.4;
          const ex = (o.adds || []).find((a) => Math.abs(a.t - t) < sw * 1.2);
          if (ex) ex.n = (ex.n || 1) + 1;
          else (o.adds = o.adds || []).push({ t, n: 1 });
          dirty = true;
          draw();
          const ex2 = (o.adds || []).reduce((a, x) => a + (x.n || 1), 0);
          toast(ex2 + " extra timber" + (ex2 === 1 ? "" : "s"));
          return;
        }
      } else {
        const x0 = Math.min(o.a[0], o.b[0]),
          y0 = Math.min(o.a[1], o.b[1]),
          bw = Math.abs(o.b[0] - o.a[0]),
          bh = Math.abs(o.b[1] - o.a[1]);
        const c0 = [x0 + bw / 2, y0 + bh / 2];
        const lp = o.r ? rot(p, c0, -o.r) : p;
        t = o.k === "eframe" ? lp[0] - x0 : npRunAxis(o, bw, bh) ? lp[0] - x0 : lp[1] - y0;
        snap();
        const sw = doc.scale ? toUnits(50) : 8;
        const ex = (o.adds || []).find((a) => Math.abs(a.t - t) < sw * 1.2);
        if (ex) ex.n = (ex.n || 1) + 1;
        else (o.adds = o.adds || []).push({ t, n: 1 });
        dirty = true;
        draw();
        fineFill();
        return;
      }
    }
    const inGrp = () => {
      if (!msel.size) return false;
      const js = [...msel].filter((j) => doc.objs[j]);
      if (!js.length || js.every((j) => doc.objs[j].lk)) return false;
      const [x0, y0, x1, y1] = grpBox(js),
        pd2 = 14 / s;
      return p[0] >= x0 - pd2 && p[0] <= x1 + pd2 && p[1] >= y0 - pd2 && p[1] <= y1 + pd2;
    };
    if (
      (tool === "box" || tool === "move") &&
      msel.size &&
      inGrp() &&
      (hit(p) == null || msel.has(hit(p)))
    ) {
      snap();
      drag = {
        kind: "mmove",
        start: p,
        orig: (() => {
          const js = new Set([...msel].filter((j) => !doc.objs[j].lk));
          [...js].forEach((j) => attOf(doc.objs[j]).forEach(([k]) => js.add(k)));
          return [...js].map((j) => [j, JSON.parse(JSON.stringify(doc.objs[j]))]);
        })(),
        pd: p,
        hp: p,
      };
      draw();
      return;
    }
    if (tool === "box") {
      sel = null;
      const i = hit(p);
      if (i != null && msel.has(i) && !doc.objs[i].lk) {
        snap();
        drag = {
          kind: "mmove",
          start: p,
          orig: (() => {
            const js = new Set(msel);
            [...msel].forEach((j) => attOf(doc.objs[j]).forEach(([k]) => js.add(k)));
            return [...js].map((j) => [j, JSON.parse(JSON.stringify(doc.objs[j]))]);
          })(),
          pd: p,
          hp: p,
        };
        draw();
        return;
      }
      if (i != null) {
        const gid = doc.objs[i].gid;
        const js = gid
          ? doc.objs.map((o, j) => (o.gid === gid ? j : -1)).filter((j) => j >= 0)
          : [i];
        const on = msel.has(i);
        js.forEach((j) => (on ? msel.delete(j) : msel.add(j)));
        draw();
        return;
      }
      drag = { kind: "band", a: p, b: p };
      draw();
      return;
    }
    if (tool === "move") {
      const so = sel != null ? doc.objs[sel] : null;
      if (so && !so.lk) {
        const bxy = npBoxy(so) || so.t === "rect" || so.t === "circle";
        const bb0 = bbox(so);
        const R = bxy ? Math.max(12 / s, Math.min(30 / s, Math.min(bb0[2], bb0[3]) * 0.3)) : 30 / s;
        const h = handles(so)
          .map((h) => [h, Math.hypot(p[0] - h.p[0], p[1] - h.p[1])])
          .filter((x) => x[1] < (x[0].k === "rot" || x[0].k === "lrot" ? Math.max(R, 18 / s) : R))
          .sort((x, y) => x[1] - y[1])
          .map((x) => x[0])[0];
        if (h) {
          snap();
          const o0 = JSON.parse(JSON.stringify(so));
          if (h.k === "rot") {
            drag = { kind: "rot", i: sel, c: ctr(so), pd: p, hp: p };
            return;
          }
          if (h.k === "lrot") {
            const c0 = so.a && so.b ? [(so.a[0] + so.b[0]) / 2, (so.a[1] + so.b[1]) / 2] : ctr(so);
            drag = {
              kind: "lrot",
              i: sel,
              c: c0,
              o: o0,
              a0: Math.atan2(p[1] - c0[1], p[0] - c0[0]),
              pd: p,
              hp: p,
            };
            return;
          }
          if (h.k === "off") {
            drag = { kind: "off", i: sel, pd: p, hp: p };
            return;
          }
          if (h.k === "bend") {
            drag = { kind: "bend", i: sel, pd: p, hp: p };
            return;
          }
          if (h.k === "tip") {
            drag = { kind: "tip", i: sel, pd: p, hp: p };
            return;
          }
          if (h.k === "size") {
            const b = baseBox(so);
            drag = { kind: "resize", i: sel, start: p, o: o0, bw: b[2], bh: b[3], pd: p, hp: p };
            return;
          }
          drag = { kind: "end", i: sel, which: h.k, o: o0, c: ctr(so), pd: p, hp: h.p.slice() };
          return;
        }
      }
      let i = hit(p);
      if (i == null && so && !so.lk) {
        const b = bbox(so),
          pd2 = 10 / s;
        if (
          p[0] >= b[0] - pd2 &&
          p[0] <= b[0] + b[2] + pd2 &&
          p[1] >= b[1] - pd2 &&
          p[1] <= b[1] + b[3] + pd2
        )
          i = sel;
      }
      if (i != null && i === sel && doc.objs[i].t === "shape" && doc.objs[i].k === "legend") {
        editKey(doc.objs[i]);
        return;
      }
      if (i != null && i === sel && doc.objs[i].t === "shape" && NP_TEXTSYM[doc.objs[i].k]) {
        const o = doc.objs[i];
        askLabel(ov, NP_TEXTSYM[o.k][0], o.s || NP_TEXTSYM[o.k][1], (v) => {
          if (v !== null) {
            snap();
            o.s = v;
            dirty = true;
          }
          draw();
        });
        return;
      }
      if (i != null && i === sel && doc.objs[i].t === "room" && !doc.objs[i].pave) {
        roomDlg(doc.objs[i], false);
        return;
      }
      if (i != null && i === sel && vpOf(doc.objs[i]) && !doc.objs[i].lk && e.detail >= 2) {
        vpDlg(doc.objs[i], false);
        return;
      }
      if (i != null && i === sel && doc.objs[i].t === "dim") {
        const o = doc.objs[i];
        const cur0 = o.auto && doc.scale ? dimAutoLab(o) : o.s || "";
        askMeasure(ov, cur0, (v) => {
          if (v !== null) {
            snap();
            o.s = v;
            if (doc.scale && v === dimAutoLab(o)) o.auto = true;
            else delete o.auto;
            dirty = true;
          }
          draw();
        });
        return;
      }
      if (i != null && doc.objs[i].lk) {
        msel.clear();
        sel = i;
        drag = null;
        draw();
        toast("🔒 Locked. Tap 🔓 Unlock to change it");
        return;
      }
      if (i != null && doc.objs[i].gid) {
        const gid = doc.objs[i].gid;
        msel.clear();
        doc.objs.forEach((o, j) => {
          if (o.gid === gid) msel.add(j);
        });
        sel = null;
        snap();
        drag = {
          kind: "mmove",
          start: p,
          orig: (() => {
            const js = new Set(msel);
            [...msel].forEach((j) => attOf(doc.objs[j]).forEach(([k]) => js.add(k)));
            return [...js].map((j) => [j, JSON.parse(JSON.stringify(doc.objs[j]))]);
          })(),
          pd: p,
          hp: p,
        };
        draw();
        return;
      }
      if (i != null) {
        msel.clear();
        sel = i;
        snap();
        drag = {
          kind: "move",
          i,
          start: p,
          o: JSON.parse(JSON.stringify(doc.objs[i])),
          pd: p,
          hp: p,
          att: attOf(doc.objs[i]),
        };
        draw();
        return;
      }
      sel = null;
      msel.clear();
      drag = { kind: "pan", sx: e.clientX, sy: e.clientY, ox, oy };
      draw();
      return;
    }
    if (tool === "erase") {
      snap();
      drag = { kind: "erase" };
      eraseAt(p);
      return;
    }
    sel = null;
    const pw = pwFor(wid);
    const sp = tool === "pen" || tool === "hl" || tool === "roomsk" ? p : snapPt(p);
    cur =
      tool === "roomsk"
        ? { t: "stroke", p: [p], c: "#c2410c", w: pw, rsk: true }
        : tool === "pen" || tool === "hl"
          ? { t: "stroke", p: [p], c: col, w: pw, hl: tool === "hl" }
          : Object.assign(
              {
                t: tool,
                a: sp,
                b: sp,
                c: tool === "dim" ? "#e11d2a" : col,
                w: tool === "dim" ? Math.max(pw, sized() ? 2 : pw) : pw,
              },
              tool === "shape" ? { k: shapeKind } : {},
            );
    if (
      cur.t === "shape" &&
      doc.scale &&
      ["wall", "dline", "stud", "cavity", "tstud"].includes(shapeKind)
    )
      cur.th = Math.max(
        6,
        toUnits(shapeKind === "cavity" ? 350 : shapeKind === "tstud" ? lastStud.sd || 100 : 100),
      );
    if (cur.t === "shape" && shapeKind === "tstud") {
      cur.sd = lastStud.sd || 100;
      cur.cc = lastStud.cc || 400;
      if (lastStud.corner) cur.corner = lastStud.corner;
      if (lastStud.tee) cur.tee = lastStud.tee;
    }
    draw();
  });
  cv.addEventListener("pointermove", (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]),
        mx = (a[0] + b[0]) / 2,
        my = (a[1] + b[1]) / 2;
      const r = cv.getBoundingClientRect();
      const ns = Math.max(0.04, Math.min(4, (pinch.s * d) / pinch.d));
      const px = (pinch.mx - r.left - pinch.ox) / pinch.s,
        py = (pinch.my - r.top - pinch.oy) / pinch.s;
      s = ns;
      ox = mx - r.left - px * ns;
      oy = my - r.top - py * ns;
      draw();
      return;
    }
    if (drag && NP_MOVEK.has(drag.kind) && !drag.go) {
      if (
        Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]) <
        (e.pointerType === "touch" ? 12 : 6)
      )
        return;
      drag.go = true;
    }
    let p = toPage(e.clientX, e.clientY);
    fineNow = !!(slowDrag && drag && drag.pd && drag.kind !== "pan" && drag.kind !== "erase");
    if (fineNow) {
      const k = 0.2;
      p = [drag.hp[0] + (p[0] - drag.pd[0]) * k, drag.hp[1] + (p[1] - drag.pd[1]) * k];
    }
    if (drag) {
      if (drag.kind === "pan") {
        ox = drag.ox + (e.clientX - drag.sx);
        oy = drag.oy + (e.clientY - drag.sy);
        draw();
        return;
      }
      if (drag.kind === "erase") {
        eraseAt(p);
        return;
      }
      if (drag.kind === "band") {
        drag.b = p;
        draw();
        return;
      }
      if (drag.kind === "bend") {
        const o = doc.objs[drag.i];
        if (o) {
          const mx = (o.a[0] + o.b[0]) / 2,
            my = (o.a[1] + o.b[1]) / 2,
            dx = o.b[0] - o.a[0],
            dy = o.b[1] - o.a[1],
            L = Math.hypot(dx, dy) || 1;
          const d = (p[0] - mx) * (-dy / L) + (p[1] - my) * (dx / L);
          o.bend = Math.max(-1.5, Math.min(1.5, (d * 2) / L));
          if (Math.abs(o.bend) < 0.01) o.bend = 0.0001;
        }
        draw();
        return;
      }
      if (drag.kind === "tip") {
        const o = doc.objs[drag.i];
        if (o && o.lead) o.lead.p = snapPt(p);
        draw();
        return;
      }
      if (drag.kind === "mmove") {
        let dx = p[0] - drag.start[0],
          dy = p[1] - drag.start[1];
        const f = drag.orig[0][1];
        const anc = f.a || (f.p ? f.p[0] : [f.x, f.y]);
        if (snapOn && anc) {
          const sp = snapPt([anc[0] + dx, anc[1] + dy], {
            skip: drag.orig[0][0],
            skipSet: new Set(drag.orig.map((x) => x[0])),
            noGrid: true,
          });
          dx = sp[0] - anc[0];
          dy = sp[1] - anc[1];
        }
        drag.orig.forEach(([j, o0]) => {
          const o = JSON.parse(JSON.stringify(o0));
          moveObj(o, dx, dy);
          doc.objs[j] = o;
        });
        doc.pages[pg].objs = doc.objs;
        draw();
        return;
      }
      const o = doc.objs[drag.i];
      if (!o) {
        drag = null;
        return;
      }
      if (drag.kind === "lrot") {
        let a = Math.atan2(p[1] - drag.c[1], p[0] - drag.c[0]) - drag.a0;
        const st = ((snapOn ? 5 : 1) * Math.PI) / 180;
        a = Math.round(a / st) * st;
        const R = (q) => rot(q, drag.c, a);
        if (drag.o.a) o.a = R(drag.o.a);
        if (drag.o.b) o.b = R(drag.o.b);
        if (drag.o.v) o.v = R(drag.o.v);
        if (drag.o.p) o.p = drag.o.p.map(R);
        if (!drag.att) drag.att = attOf(o);
        drag.att.forEach(([j, d0]) => {
          const d = doc.objs[j];
          if (d) {
            d.a = R(d0.a);
            d.b = R(d0.b);
          }
        });
        let deg = Math.round(
          (Math.atan2(
            -((o.b || o.a || [0, 0])[1] - (o.a || [0, 0])[1]),
            (o.b || o.a || [0, 0])[0] - (o.a || [0, 0])[0],
          ) *
            180) /
            Math.PI,
        );
        if (deg < 0) deg += 360;
        live = { p, t: (o.a && o.b ? deg : Math.round((a * 180) / Math.PI)) + "°" };
        draw();
        return;
      }
      if (drag.kind === "off") {
        const n = dimN(o);
        const m = [(o.a[0] + o.b[0]) / 2, (o.a[1] + o.b[1]) / 2];
        let f = (p[0] - m[0]) * n[0] + (p[1] - m[1]) * n[1] - (o.size || 20) * 1.6;
        if (Math.abs(f) < (o.size || 20) * 0.6) f = 0;
        if (snapOn && doc.scale) {
          const st = toUnits(100);
          f = Math.round(f / st) * st;
        }
        o.off = f || undefined;
        if (!o.off) delete o.off;
        draw();
        return;
      }
      if (drag.kind === "rot") {
        let a = Math.atan2(p[1] - drag.c[1], p[0] - drag.c[0]) + Math.PI / 2;
        const st = snapOn ? Math.PI / 36 : Math.PI / 180;
        a = Math.round(a / st) * st;
        o.r = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (Math.abs(o.r) < 1e-6 || Math.abs(o.r - 2 * Math.PI) < 1e-6) o.r = 0;
        live = { p, t: Math.round((o.r * 180) / Math.PI) + "°" };
        draw();
        return;
      }
      if (drag.kind === "end") {
        if (npBoxy(o) && drag.o.r) {
          const c0 = drag.c,
            r = drag.o.r;
          const other = drag.which === "a" ? "b" : "a";
          const f = drag.o[other];
          const lp = rot(snapOn ? p : p, c0, -r);
          const cm = [(f[0] + lp[0]) / 2, (f[1] + lp[1]) / 2];
          const cw = rot(cm, c0, r);
          o[other] = [cw[0] + (f[0] - cm[0]), cw[1] + (f[1] - cm[1])];
          o[drag.which] = [cw[0] + (lp[0] - cm[0]), cw[1] + (lp[1] - cm[1])];
        } else {
          let np = snapPt(p, { skip: drag.i });
          if (!npBoxy(o)) {
            const other = drag.which === "a" ? o.b : o.a;
            np = orthoB(other, np);
          }
          o[drag.which] = np;
        }
        live = liveFor(o) && { p, t: liveFor(o).t };
        draw();
        return;
      }
      const dx0 = p[0] - drag.start[0],
        dy0 = p[1] - drag.start[1];
      if (drag.kind === "move") {
        let dx = dx0,
          dy = dy0;
        const anc = drag.o.a || (drag.o.p ? drag.o.p[0] : [drag.o.x, drag.o.y]);
        if (snapOn) {
          const sp = snapPt([anc[0] + dx0, anc[1] + dy0], {
            skip: drag.i,
            skipSet: new Set((drag.att || []).map((x) => x[0])),
            noGrid: true,
          });
          dx = sp[0] - anc[0];
          dy = sp[1] - anc[1];
        }
        if (o.t === "img" || o.t === "text") {
          o.x = drag.o.x + dx;
          o.y = drag.o.y + dy;
        } else if (o.t === "stroke" || o.t === "rsk") {
          /* (a room sketch moves by all its corners) */
          o.p = drag.o.p.map((q) => [q[0] + dx, q[1] + dy]);
        } else {
          o.a = [drag.o.a[0] + dx, drag.o.a[1] + dy];
          o.b = [drag.o.b[0] + dx, drag.o.b[1] + dy];
          if (drag.o.v) o.v = [drag.o.v[0] + dx, drag.o.v[1] + dy];
        }
        (drag.att || []).forEach(([j, d0]) => {
          if (!doc.objs[j]) return;
          const d = JSON.parse(JSON.stringify(d0));
          moveObj(d, dx, dy);
          doc.objs[j] = d;
        });
      }
      if (drag.kind === "resize") {
        const r = drag.o.r || 0;
        const ld = rot([dx0, dy0], [0, 0], -r);
        if (o.t === "img") {
          const nw = Math.max(40, drag.o.w + ld[0]);
          o.w = nw;
          o.h = (nw * drag.o.h) / drag.o.w;
        } else if (o.t === "text") {
          o.size = Math.max(8, Math.round((drag.o.size * (drag.bh + ld[1])) / drag.bh));
        }
        if (r) {
          const c0 = [drag.o.x + drag.bw / 2, drag.o.y + drag.bh / 2];
          const nb = baseBox(o);
          const cl = [nb[0] + nb[2] / 2, nb[1] + nb[3] / 2];
          const tl = rot([drag.o.x, drag.o.y], c0, r);
          const tl2 = rot([nb[0], nb[1]], cl, r);
          o.x += tl[0] - tl2[0];
          o.y += tl[1] - tl2[1];
        }
      }
      draw();
      return;
    }
    if (!cur) return;
    if (cur.t === "stroke") {
      const l = cur.p[cur.p.length - 1];
      if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 1.5 / s) cur.p.push(p);
    } else {
      let b = snapPt(p, { from: cur.a });
      if (!snappedObj && (["line", "dim", "arrow"].includes(cur.t) || npLineShape(cur)))
        b = orthoB(cur.a, b);
      cur.b = b;
      live = liveFor(cur);
    }
    draw();
  });
  const end = (e) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 0) snapMark = null;
    if (cur && ptrs.size === 0) {
      live = null;
      /* room sketch: the hand-drawn line becomes a room with straight walls, where it was drawn */
      if (cur.rsk) {
        const o = rsFromStroke(cur.p);
        cur = null;
        if (!o) {
          toast("Draw the whole room in one line, ending back where you started.");
          draw();
          return;
        }
        snap();
        doc.objs.push(o);
        draw();
        toast(rsStatus(rsRoomOf(o, doc)));
        return;
      }
      if (cur.t === "dim" && Math.hypot(cur.b[0] - cur.a[0], cur.b[1] - cur.a[1]) < 8 / s) {
        cur = null;
        draw();
        return;
      }
      if (
        ["line", "arrow", "rect", "circle"].includes(cur.t) &&
        Math.hypot(cur.b[0] - cur.a[0], cur.b[1] - cur.a[1]) < 4 / s
      ) {
        cur = null;
        draw();
        return;
      }
      if (cur.t === "shape" && Math.hypot(cur.b[0] - cur.a[0], cur.b[1] - cur.a[1]) < 10 / s) {
        const k = cur.k;
        const R = NP_REAL[k];
        const isL = NP_LINE.has(k) || k === "door";
        if (doc.scale && R) {
          if (isL) {
            cur.b = [cur.a[0] + toUnits(R[0]), cur.a[1]];
          } else {
            const w = Math.max(18, toUnits(R[0])),
              h = Math.max(k === "rad" || k === "window" ? 6 : 18, toUnits(R[1]));
            cur.a = [cur.a[0] - w / 2, cur.a[1] - h / 2];
            cur.b = [cur.a[0] + w, cur.a[1] + h];
          }
        } else if (
          (NP_ELEV_BOX.has(k) ||
            NP_DES_BOX.has(k) ||
            NP_ANNO_BOX.has(k) ||
            NP_BLD_BOX.has(k) ||
            NP_TIMB_BOX.has(k) ||
            NP_DET_BOX.has(k) ||
            k === "legend" ||
            k === "eframe") &&
          R
        ) {
          const D = Math.min(200, Math.max(60, (140 * R[0]) / 1500)) / s;
          let hh = (D * R[1]) / R[0];
          hh = Math.max(10 / s, Math.min(hh, D * 3));
          const ww = hh === D * 3 ? (hh * R[0]) / R[1] : D;
          cur.a = [cur.a[0] - ww / 2, cur.a[1] - hh / 2];
          cur.b = [cur.a[0] + ww, cur.a[1] + hh];
        } else {
          const D =
            (isL || k === "window"
              ? 140
              : k === "units" || k === "rad"
                ? 160
                : k === "bath"
                  ? 150
                  : k === "stairs"
                    ? 200
                    : ["socket", "switch", "light", "smoke", "gully", "svp", "tap"].includes(k)
                      ? 44
                      : 90) / s;
          if (isL) cur.b = [cur.a[0] + D, cur.a[1]];
          else {
            const hh =
              k === "units"
                ? D * 0.38
                : k === "rad"
                  ? D * 0.15
                  : k === "bath"
                    ? D * 0.47
                    : k === "stairs"
                      ? D * 0.45
                      : k === "window"
                        ? D * 0.12
                        : k === "wc"
                          ? D * 1.25
                          : D;
            cur.a = [cur.a[0] - D / 2, cur.a[1] - hh / 2];
            cur.b = [cur.a[0] + D, cur.a[1] + hh];
          }
        }
      }
      snap();
      if (cur.t === "stroke")
        cur.p = cur.p.map((q) => [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]);
      if (cur.t === "dim")
        cur.size = sized() ? Math.max(14, Math.round(Math.min(40, 22 / s))) : Math.round(26 / s);
      if (cur.t === "shape" && (cur.k === "ewBlock" || cur.k === "ewBrk")) blockSnap(cur);
      if (cur.t === "shape" && npBoxy(cur)) {
        const now = Date.now(),
          lp = lastPlace;
        if (
          lp &&
          lp.k === cur.k &&
          now - lp.at < 600 &&
          Math.hypot(lp.x - cur.a[0], lp.y - cur.a[1]) < 30 / s
        ) {
          cur = null;
          draw();
          return;
        }
        lastPlace = { k: cur.k, at: now, x: cur.a[0], y: cur.a[1] };
      }
      doc.objs.push(cur);
      if (cur.t === "shape" && npBoxy(cur) && !isStair(cur) && cur.k !== "legend") {
        const ni = doc.objs.length - 1;
        setTimeout(() => {
          setTool("move");
          sel = ni;
          draw();
        }, 0);
      }
      if (vpOf(cur)) {
        const vo = cur;
        setTimeout(() => vpDlg(vo, true), 80);
      } else if (npIsWall(cur)) {
        weldWall(cur);
        orientCavity(cur);
      } else seatOnWall(cur);
      if (
        cur.t === "line" ||
        cur.t === "arrow" ||
        (npLineShape(cur) && !NP_OPENK.has(cur.k) && cur.k !== "door")
      )
        showLenBar(cur);
      if (
        cur.t === "shape" &&
        (cur.k === "tstud" || cur.k === "eframe") &&
        opts.pro &&
        !S.tstudTip
      ) {
        S.tstudTip = 1;
        toast(
          "Select the stud wall and tap 🎯 Fine-tune to change timber size, centres or add extra timbers",
        );
      }
      if (isStair(cur) && opts.pro) {
        const ii = doc.objs.length - 1;
        setTimeout(() => {
          tool = "move";
          ov.querySelectorAll(".np-t[data-t]").forEach((x) =>
            x.setAttribute("aria-pressed", String(x.dataset.t === "move")),
          );
          sel = ii;
          fineOpen();
          draw();
          toast("Adjust the steps, direction and floor height here");
        }, 50);
      }
      if (cur.t === "shape" && cur.k === "legend")
        toast("Key added. It lists the symbols you use. Select it and tap it again to change it.");
      if (cur.t === "shape" && NP_TEXTSYM[cur.k]) {
        const o = cur;
        askLabel(ov, NP_TEXTSYM[o.k][0], o.s || NP_TEXTSYM[o.k][1], (v) => {
          if (v) o.s = v;
          dirty = true;
          draw();
        });
      }
      if (cur.t === "dim") {
        attachDim(cur);
        const o = cur;
        const pre = doc.scale ? String(Math.round(realMm(lenOf(o.a, o.b)) / 5) * 5) : "";
        if (dimTk) o.tk = 1;
        askMeasure(ov, pre, (v) => {
          if (v) o.s = v;
          if (doc.scale && v === pre + " mm") o.auto = true;
          else delete o.auto;
          dirty = true;
          draw();
        });
      }
      cur = null;
      draw();
    }
    if (ptrs.size === 0 && drag && drag.kind === "band") {
      const x0 = Math.min(drag.a[0], drag.b[0]),
        y0 = Math.min(drag.a[1], drag.b[1]),
        x1 = Math.max(drag.a[0], drag.b[0]),
        y1 = Math.max(drag.a[1], drag.b[1]);
      if (x1 - x0 > 4 / s || y1 - y0 > 4 / s) {
        let n = 0;
        doc.objs.forEach((o, j) => {
          if (doc.layers && lyOff(o)) return;
          const b = bbox(o);
          const cx = b[0] + b[2] / 2,
            cy = b[1] + b[3] / 2;
          if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) {
            msel.add(j);
            n++;
            if (o.gid)
              doc.objs.forEach((o2, k) => {
                if (o2.gid === o.gid) msel.add(k);
              });
          }
        });
        if (!n) toast("Nothing inside that box. Drag a box round the things you want");
      } else {
        msel.clear();
      }
      drag = null;
      draw();
      return;
    }
    if (ptrs.size === 0) {
      fineNow = false;
      if (drag && NP_MOVEK.has(drag.kind) && !drag.go) {
        if (undo.length) undo.pop();
        drag = null;
      }
      if (drag && drag.kind !== "pan" && drag.kind !== "erase") {
        dirty = true;
        const dobj = doc.objs[drag.i];
        if (
          dobj &&
          (dobj.k === "ewBlock" || dobj.k === "ewBrk") &&
          (drag.kind === "resize" || drag.kind === "end")
        ) {
          blockSnap(dobj);
          draw();
        }
        if (
          dobj &&
          npIsWall(dobj) &&
          (drag.kind === "end" || drag.kind === "move" || drag.kind === "lrot")
        ) {
          weldWall(dobj);
          orientCavity(dobj);
          draw();
        } else if (dobj && drag.kind === "move") {
          seatOnWall(dobj);
          draw();
        }
      }
      drag = null;
      if (live) {
        live = null;
        draw();
      }
    }
  };
  cv.addEventListener("pointerup", end);
  cv.addEventListener("pointercancel", end);
  cv.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        const ns = Math.max(0.04, Math.min(4, s * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
        const px = (e.clientX - r.left - ox) / s,
          py = (e.clientY - r.top - oy) / s;
        s = ns;
        ox = e.clientX - r.left - px * s;
        oy = e.clientY - r.top - py * s;
      } else {
        ox -= e.deltaX;
        oy -= e.deltaY;
      }
      draw();
    },
    { passive: false },
  );
  function eraseAt(p) {
    const i = hit(p);
    if (i != null && doc.objs[i].lk) {
      return;
    }
    if (i != null && doc.objs[i].t !== "img") {
      doc.objs.splice(i, 1);
      sel = null;
      draw();
    }
  }
  const contentBox = () => {
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9,
      n = 0;
    doc.objs.forEach((o) => {
      try {
        const b = bbox(o);
        if (!isFinite(b[0])) return;
        x0 = Math.min(x0, b[0]);
        y0 = Math.min(y0, b[1]);
        x1 = Math.max(x1, b[0] + b[2]);
        y1 = Math.max(y1, b[1] + b[3]);
        n++;
      } catch (e) {}
    });
    return n ? [x0, y0, x1 - x0, y1 - y0] : null;
  };
  const zoom = (f) => {
    const r = stage.getBoundingClientRect();
    let cx = r.width / 2,
      cy = r.height / 2;
    const so = sel != null ? doc.objs[sel] : null;
    const cb = so ? bbox(so) : contentBox();
    if (cb) {
      const px0 = cb[0] * s + ox + (cb[2] * s) / 2,
        py0 = cb[1] * s + oy + (cb[3] * s) / 2;
      const vis = px0 > 0 && px0 < r.width && py0 > 0 && py0 < r.height;
      if (so || !vis || f > 1) {
        cx = Math.max(0, Math.min(r.width, px0));
        cy = Math.max(0, Math.min(r.height, py0));
      }
    }
    const px = (cx - ox) / s,
      py = (cy - oy) / s;
    s = Math.max(0.04, Math.min(4, s * f));
    ox = cx - px * s;
    oy = cy - py * s;
    draw();
  };
  /* bring whatever is selected into view (used after Check › Show, schedules, numbering) */
  const reveal = () => {
    const so = sel != null ? doc.objs[sel] : null;
    if (!so) return;
    const r = stage.getBoundingClientRect(),
      b = bbox(so);
    const cx = b[0] + b[2] / 2,
      cy = b[1] + b[3] / 2;
    const sx = cx * s + ox,
      sy = cy * s + oy;
    const m = Math.min(r.width, r.height) * 0.3;
    if (sx < m || sx > r.width - m || sy < m || sy > r.height - m) {
      ox = r.width / 2 - cx * s;
      oy = r.height / 2 - cy * s;
      draw();
    }
  };
  const bar = q(".np-bar");
  const collapse = () => {};
  const setGrp = (g) => {
    bar.dataset.g = g;
    bar
      .querySelectorAll(".np-gt")
      .forEach((b) => b.setAttribute("aria-selected", String(b.dataset.gt === g)));
    try {
      localStorage.setItem("np.grp", g);
    } catch (e) {}
    requestAnimationFrame(size);
  };
  bar.querySelectorAll(".np-gt").forEach((b) => (b.onclick = () => setGrp(b.dataset.gt)));
  setGrp(bar.dataset.g || "draw");
  q(".np-moretools").onclick = () => {
    const c = bar.classList.toggle("compact");
    q(".np-moretools").setAttribute("aria-expanded", String(!c));
    requestAnimationFrame(size);
  };
  ov.querySelectorAll(".np-c,.np-wb").forEach((b) =>
    b.addEventListener("click", () => setTimeout(collapse, 150)),
  );
  q(".np-shape").addEventListener("change", () => setTimeout(collapse, 150));
  ov.querySelectorAll(".np-t[data-t]").forEach((b) =>
    b.addEventListener("click", () => setTimeout(collapse, 150)),
  );
  /* plan (looking down) or elevation (looking at the face) symbols */
  {
    const vb0 = q(".np-view");
    if (vb0) vb0.hidden = true;
    if (opts.pro) q(".np-shape").hidden = true;
  }
  let viewMode = !opts.pro
    ? "plan"
    : /elevation|section/i.test((doc.pages[pg] || {}).type || opts.pageType || "")
      ? "elev"
      : "plan";
  const fillShapes = () => {
    const sh = q(".np-shape");
    const cur = sh.value;
    const basic = !opts.pro && !ownerMode();
    const list = NP_SHAPES.filter(
      (x) => opts.pro || (basic ? NP_BASIC.has(x[0]) : !x[3] && !/^(Elevation|Section)/.test(x[2])),
    );
    const gs = [...new Set(list.map((x) => x[2]))].filter((g) =>
      viewMode === "elev"
        ? /^(Elevation|Section)/.test(g) || g === "Shapes" || g === "Notes, tags & details"
        : !/^(Elevation|Section)/.test(g),
    );
    sh.innerHTML =
      `<option value="">⬠ ${viewMode === "elev" ? "Elevation &amp; section symbols…" : "More shapes &amp; symbols…"}</option>` +
      gs
        .map(
          (g) =>
            `<optgroup label="${esc(g)}">${list
              .filter((x) => x[2] === g)
              .map(([k, l]) => `<option value="${k}">${l}</option>`)
              .join("")}</optgroup>`,
        )
        .join("");
    if ([...sh.options].some((o) => o.value === cur)) sh.value = cur;
    const vb = q(".np-view");
    vb.innerHTML = viewMode === "elev" ? "🏡<small>Elevation</small>" : "🏠<small>Plan</small>";
    vb.setAttribute("aria-pressed", String(viewMode === "elev"));
  };
  fillShapes();
  q(".np-view").onclick = () => {
    viewMode = viewMode === "elev" ? "plan" : "elev";
    fillShapes();
    toast(
      viewMode === "elev"
        ? "Elevation symbols: windows, doors, roofs, brick, render, levels… (as you look at the front)"
        : "Plan symbols: walls, doors, windows, kitchen, bathroom… (looking down from above)",
    );
  };
  function vpDlg(o, isNew) {
    const d = document.createElement("div");
    d.className = "dimask";
    d.innerHTML = `<div class="dimbox"><b>🔍 ${isNew ? "New scaled area" : "Scaled area"}</b><div class="who">Everything drawn inside this frame uses its own scale: symbols drop in at real size, and measurements and lengths read at this scale. The rest of the page stays at ${doc.baseScale ? "1:" + doc.baseScale : "no scale"}.</div>
      <label>Scale<select class="vps">${NP_SCALES.filter(Boolean)
        .concat([1, 2])
        .sort((a, b) => a - b)
        .map((v) => `<option value="${v}" ${+o.vp === v ? "selected" : ""}>1:${v}</option>`)
        .join("")}</select></label>
      <label>Name (optional)<input class="vpn" maxlength="40" value="${esc(o.vpn || "")}" placeholder="e.g. Detail A, Site plan, Section B-B"></label>
      <label class="tick"><input type="checkbox" class="vph" ${o.vph ? "checked" : ""}> <span>Hide the frame line (keep just the title)</span></label>
      ${!isNew && vpKids(o).length ? `<label class="tick"><input type="checkbox" class="vpk" checked> <span>Keep real sizes: resize what's inside to suit the new scale</span></label>` : ""}
      <div class="dimbtns">${isNew ? '<button type="button" class="btn sax">Remove it</button>' : '<button type="button" class="btn sax">Cancel</button>'}<button type="button" class="btn primary sago">OK</button></div></div>`;
    ov.appendChild(d);
    d.querySelector(".sax").onclick = () => {
      d.remove();
      if (isNew) {
        const i = doc.objs.indexOf(o);
        if (i >= 0) {
          doc.objs.splice(i, 1);
          sel = null;
          draw();
        }
      }
    };
    d.querySelector(".sago").onclick = () => {
      const nv = +d.querySelector(".vps").value,
        old = +o.vp;
      snap();
      if (!isNew && nv !== old && d.querySelector(".vpk") && d.querySelector(".vpk").checked) {
        const f = old / nv,
          c0 = [Math.min(o.a[0], o.b[0]), Math.min(o.a[1], o.b[1])];
        const sc = (pt) => [c0[0] + (pt[0] - c0[0]) * f, c0[1] + (pt[1] - c0[1]) * f];
        vpKids(o).forEach(([k]) => {
          if (k.a) k.a = sc(k.a);
          if (k.b) k.b = sc(k.b);
          if (k.v) k.v = sc(k.v);
          if (k.p) k.p = k.p.map(sc);
          if (k.x != null) {
            const q2 = sc([k.x, k.y]);
            k.x = q2[0];
            k.y = q2[1];
            if (k.w && k.t === "img") {
              k.w *= f;
              k.h *= f;
            }
          }
          if (k.th) k.th *= f;
          if (k.off) k.off *= f;
          if (k.size && k.t === "text") k.size *= f;
        });
        o.b = [
          c0[0] + (Math.max(o.a[0], o.b[0]) - c0[0]) * f,
          c0[1] + (Math.max(o.a[1], o.b[1]) - c0[1]) * f,
        ];
        o.a = c0;
      }
      o.vp = nv;
      o.vpn = d.querySelector(".vpn").value.trim();
      if (d.querySelector(".vph").checked) o.vph = 1;
      else delete o.vph;
      dirty = true;
      d.remove();
      sel = doc.objs.indexOf(o);
      if (isNew) setTool("move");
      draw();
      toast(isNew ? "Scaled area at 1:" + nv + ". Draw inside it" : "Saved");
    };
  }
  const setTool = (t) => {
    tool = t;
    chain = [];
    setTimeout(() => {
      try {
        chainUI();
      } catch (e) {}
    }, 0);
    if (t === "pwall") toast("Tap each corner. Pick the wall type on the bar at the top");
    if (t === "trim")
      toast("Tap the part of a line or wall to cut away, back to where something crosses it");
    if (t === "extend")
      toast("Tap near the end of a line or wall to stretch it to the next thing it meets");
    if (t === "corner") toast("Tap two lines or walls to make them meet in a corner");
    if (t === "pave")
      toast(
        "Tap round the corners of the patio or drive. Choose the material on the bar at the top",
      );
    if (t === "pstrip") {
      toast(
        "Tap along the building corners. The path is drawn to one side at the width you set. ⇄ swaps sides",
      );
      if (lastStripEnd) {
        chain = [lastStripEnd.slice()];
      }
    }
    if (t === "vp")
      toast(
        "Drag a frame on the page. Then choose its scale. Anything you draw inside it uses that scale",
      );
    if (t === "roomsk")
      toast(
        "Draw the room in one line, ending back where you started. Then tap each wall to type its length.",
      );
    const sh = q(".np-shape");
    if (t !== "shape") {
      sh.value = "";
      sh.classList.remove("on");
      const lb = q(".np-libbtn");
      if (lb) {
        lb.classList.remove("on");
        lb.querySelector("span").textContent = "Symbols…";
      }
    }
    ov.querySelectorAll(".np-t[data-t]").forEach((x) =>
      x.setAttribute("aria-pressed", String(x.dataset.t === t)),
    );
    if (t !== "move") sel = null;
    draw();
  };
  ov.querySelectorAll(".np-t[data-t]").forEach((b) => (b.onclick = () => setTool(b.dataset.t)));
  /* colour picker pop-up: line colour or block fill colour */
  function colourPop(mode, o) {
    const old = ov.querySelector(".np-colpop");
    if (old) old.remove();
    const d = document.createElement("div");
    d.className = "np-colpop";
    const cur = mode === "fill" ? (o && o.fill) || "" : col;
    const recent = doc.cols || [];
    d.innerHTML = `<div class="ncrow"><b>${mode === "fill" ? "🪣 Block colour" : "🎨 Line colour"}</b><button type="button" class="ncx" aria-label="Close">✕</button></div>
      ${mode === "fill" ? `<div class="seg ncop"><button type="button" data-a="0.35" aria-pressed="${!(o && o.fa >= 0.99)}">See-through</button><button type="button" data-a="1" aria-pressed="${!!(o && o.fa >= 0.99)}">Solid</button></div>` : ""}
      <div class="ncgrid">${mode === "fill" ? `<button type="button" class="ncs ncnone" data-c="" aria-label="No fill">✕</button>` : ""}${[...new Set(NP_MOREC_ALL().concat(recent))].map((c) => `<button type="button" class="ncs" data-c="${c}" style="background:${c}" aria-pressed="${String(c).toLowerCase() === String(cur).toLowerCase()}" aria-label="${c}"></button>`).join("")}</div>
      <label class="ncown">Your own colour <input type="color" value="${/^#[0-9a-f]{6}$/i.test(cur) ? cur : "#7f191d"}"></label>`;
    ov.appendChild(d);
    let fa = o && o.fa >= 0.99 ? 1 : 0.35;
    const apply = (c) => {
      if (c && !NP_MOREC_ALL().includes(c)) {
        doc.cols = [c].concat((doc.cols || []).filter((x) => x !== c)).slice(0, 8);
      }
      if (mode === "fill") {
        if (!o) return;
        snap();
        if (c) {
          o.fill = c;
          o.fa = fa;
        } else {
          delete o.fill;
          delete o.fa;
        }
        dirty = true;
        draw();
      } else {
        col = c;
        ov.querySelectorAll(".np-c[data-c]").forEach((x) =>
          x.setAttribute("aria-pressed", String(x.dataset.c === c)),
        );
        if (sel != null && doc.objs[sel] && doc.objs[sel].t !== "img") {
          snap();
          doc.objs[sel].c = c;
          dirty = true;
          draw();
        }
      }
      d.querySelectorAll(".ncs").forEach((x) =>
        x.setAttribute("aria-pressed", String(x.dataset.c === c)),
      );
    };
    d.querySelector(".ncx").onclick = () => d.remove();
    d.querySelectorAll(".ncs").forEach(
      (b) =>
        (b.onclick = () => {
          apply(b.dataset.c);
          if (mode !== "fill") d.remove();
        }),
    );
    d.querySelectorAll(".ncop button").forEach(
      (b) =>
        (b.onclick = () => {
          fa = +b.dataset.a;
          d.querySelectorAll(".ncop button").forEach((x) =>
            x.setAttribute("aria-pressed", String(x === b)),
          );
          if (o && o.fill) {
            snap();
            o.fa = fa;
            dirty = true;
            draw();
          }
        }),
    );
    d.querySelector("input[type=color]").onchange = (e) => apply(e.target.value);
  }
  const NP_MOREC_ALL = () => NP_MORECOLS;
  q(".np-cmore").onclick = () => colourPop("line");
  ov.querySelectorAll(".np-c[data-c]").forEach(
    (b) =>
      (b.onclick = () => {
        col = b.dataset.c;
        ov.querySelectorAll(".np-c").forEach((x) =>
          x.setAttribute("aria-pressed", String(x === b)),
        );
        if (sel != null && doc.objs[sel] && doc.objs[sel].t !== "img") {
          snap();
          doc.objs[sel].c = col;
          draw();
        }
      }),
  );
  /* edit the key: rename, hide or add your own lines */
  function editKey(o) {
    const old = ov.querySelector(".np-keyed");
    if (old) old.remove();
    const d = document.createElement("div");
    d.className = "np-keyed dimask";
    const ents = npKeyEntries(doc.objs, o).filter((e) => !e.custom);
    const extra = JSON.parse(JSON.stringify(o.extra || []));
    const nm = ents.map((e) => e.label),
      onv = ents.map((e) => !(o.hide || []).includes(e.id));
    let title = o.s || "Key";
    const draw2 = () => {
      d.innerHTML = `<form class="dimbox" style="max-height:80vh;overflow:auto;width:min(460px,94vw)"><b>🗂 Key</b><label>Title<input class="kt" maxlength="40" value="${esc(title)}"></label>
      <div class="who">Ticked lines show in the key. Change any wording.</div>${ents.map((e, i) => `<div class="kerow"><input type="checkbox" class="kon" data-i="${i}" ${onv[i] ? "checked" : ""} aria-label="Show"><input class="kname" data-i="${i}" maxlength="120" value="${esc(nm[i])}"></div>`).join("") || '<div class="who">Nothing on the page yet.</div>'}
      <div class="flabel" style="margin-top:6px">Your own lines</div>${extra.map((x, i) => `<div class="kerow"><input type="color" class="xc" data-i="${i}" value="${esc(x.c || "#e11d2a")}"><input class="xl" data-i="${i}" maxlength="60" value="${esc(x.label || "")}" placeholder="e.g. Construction to match existing"><button type="button" class="linkdanger xd" data-i="${i}">✕</button></div>`).join("")}
      <button type="button" class="btn xadd" style="align-self:flex-start">+ Add a colour line</button>
      <div class="dimbtns"><button type="button" class="btn kcancel">Cancel</button><button type="submit" class="btn primary">Save</button></div></form>`;
      const sync = () => {
        d.querySelectorAll(".xc").forEach((x) => (extra[+x.dataset.i].c = x.value));
        d.querySelectorAll(".xl").forEach((x) => (extra[+x.dataset.i].label = x.value));
        d.querySelectorAll(".kname").forEach((x) => (nm[+x.dataset.i] = x.value));
        d.querySelectorAll(".kon").forEach((x) => (onv[+x.dataset.i] = x.checked));
        title = d.querySelector(".kt").value;
      };
      d.querySelector(".xadd").onclick = () => {
        sync();
        extra.push({ c: "#e11d2a", label: "", fa: 0.5 });
        draw2();
      };
      d.querySelectorAll(".xd").forEach(
        (b) =>
          (b.onclick = () => {
            sync();
            extra.splice(+b.dataset.i, 1);
            draw2();
          }),
      );
      d.querySelector(".kcancel").onclick = () => d.remove();
      d.querySelector("form").onsubmit = (e) => {
        e.preventDefault();
        sync();
        snap();
        o.s = d.querySelector(".kt").value.trim() || "Key";
        o.hide = ents
          .filter((x, i) => !d.querySelector(`.kon[data-i="${i}"]`).checked)
          .map((x) => x.id);
        o.names = {};
        ents.forEach((x, i) => {
          const v = d.querySelector(`.kname[data-i="${i}"]`).value.trim();
          if (v && v !== (x.kind ? npSymLabel(x.kind) : "Coloured area")) o.names[x.id] = v;
        });
        o.extra = extra.filter((x) => x.label || x.c);
        dirty = true;
        d.remove();
        draw();
      };
    };
    draw2();
    ov.appendChild(d);
  }
  /* symbols library panel */
  const libLabel = (k) => (NP_SHAPES.find((x) => x[0] === k) || [, k])[1].replace(/^\S+\s/, "");
  const pickShape = (v) => {
    shapeKind = v;
    tool = "shape";
    ov.querySelectorAll(".np-t[data-t]").forEach((x) => x.setAttribute("aria-pressed", "false"));
    const lb = q(".np-libbtn");
    if (lb) {
      lb.classList.add("on");
      lb.querySelector("span").textContent = libLabel(v);
    }
    sel = null;
    draw();
    toast(
      (doc.scale && NP_REAL[v]
        ? "Tap to place at real size, or drag to size the "
        : "Tap to place, or drag to size the ") + libLabel(v).toLowerCase(),
    );
  };
  let libCat = null;
  const prevCache = {};
  const prevOf = (k) => {
    if (prevCache[k]) return prevCache[k];
    const W = 120,
      H = 84,
      cv2 = document.createElement("canvas");
    cv2.width = W * 2;
    cv2.height = H * 2;
    const c2 = cv2.getContext("2d");
    c2.scale(2, 2);
    c2.fillStyle = "#fff";
    c2.fillRect(0, 0, W, H);
    c2.strokeStyle = c2.fillStyle = "#1f1a1a";
    c2.lineWidth = 1.3;
    c2.lineCap = c2.lineJoin = "round";
    c2.__mm = 0;
    c2.__s = 1;
    const isL = NP_LINE.has(k) || k === "door";
    let o;
    if (isL) {
      o = {
        t: "shape",
        k,
        a: k === "door" ? [38, 64] : [10, H / 2],
        b: k === "door" ? [86, 64] : [W - 10, H / 2],
        c: "#1f1a1a",
        w: 1.3,
      };
      if (NP_WALLK.has(k)) o.th = k === "cavity" ? 22 : 12;
    } else {
      const R = NP_REAL[k];
      let bw = W - 20,
        bh = H - 16;
      if (R && R[1]) {
        const r = R[1] / R[0];
        if (r > bh / bw) {
          bw = bh / r;
        } else bh = bw * r;
      }
      bw = Math.max(bw, 14);
      bh = Math.max(bh, 8);
      o = {
        t: "shape",
        k,
        a: [(W - bw) / 2, (H - bh) / 2],
        b: [(W + bw) / 2, (H + bh) / 2],
        c: "#1f1a1a",
        w: 1.3,
      };
    }
    try {
      c2.fillStyle = "#1f1a1a";
      drawShape(c2, o);
    } catch (e) {}
    prevCache[k] = cv2.toDataURL();
    return prevCache[k];
  };
  function openLib() {
    const old = ov.querySelector(".np-lib");
    if (old) {
      old.remove();
      return;
    }
    const d = document.createElement("div");
    d.className = "np-lib";
    ov.appendChild(d);
    let q2 = "";
    const cats = () => NP_LIB.filter((c) => c[0] === "both" || c[0] === viewMode);
    if (!libCat || !cats().some((c) => c[1] === libCat)) libCat = cats()[0][1];
    const render = () => {
      const cs = cats();
      const items = q2
        ? NP_LIB.flatMap((c) => c[2]).filter(
            (k, i, a) => a.indexOf(k) === i && libLabel(k).toLowerCase().includes(q2),
          )
        : (cs.find((c) => c[1] === libCat) || cs[0])[2];
      d.innerHTML = `<div class="nlhead"><b>📚 Symbols</b><div class="seg nlview"><button type="button" data-v="plan" aria-pressed="${viewMode === "plan"}">🏠 Plan</button><button type="button" data-v="elev" aria-pressed="${viewMode === "elev"}">🏡 Elevation &amp; section</button></div><button type="button" class="nlx" aria-label="Close">✕</button></div>
        <input type="search" class="nlq" placeholder="🔍 Search all symbols, e.g. stairs, lintel, socket" value="${esc(q2)}">
        ${q2 ? "" : `<div class="nlcats">${cs.map((c) => `<button type="button" class="nlcat" aria-pressed="${c[1] === libCat}" data-c="${esc(c[1])}">${esc(c[1])}</button>`).join("")}</div>`}
        <div class="nlgrid">${
          items
            .filter((k) => NP_SHAPES.some((x) => x[0] === k))
            .map(
              (k) =>
                `<button type="button" class="nlitem${k === shapeKind && tool === "shape" ? " on" : ""}" data-k="${k}"><img src="${prevOf(k)}" alt=""><span>${esc(libLabel(k))}</span></button>`,
            )
            .join("") ||
          '<div class="who" style="padding:10px;color:#ccc">Nothing matches that.</div>'
        }</div>`;
      d.querySelector(".nlx").onclick = () => d.remove();
      d.querySelectorAll(".nlview button").forEach(
        (b) =>
          (b.onclick = () => {
            viewMode = b.dataset.v;
            libCat = null;
            const cs2 = cats();
            libCat = cs2[0][1];
            render();
          }),
      );
      d.querySelectorAll(".nlcat").forEach(
        (b) =>
          (b.onclick = () => {
            libCat = b.dataset.c;
            render();
          }),
      );
      d.querySelectorAll(".nlitem").forEach(
        (b) =>
          (b.onclick = () => {
            pickShape(b.dataset.k);
            d.remove();
            setTimeout(collapse, 150);
          }),
      );
      const qi = d.querySelector(".nlq");
      qi.oninput = () => {
        q2 = qi.value.trim().toLowerCase();
        const pos = qi.selectionStart;
        render();
        const n = d.querySelector(".nlq");
        n.focus();
        try {
          n.setSelectionRange(pos, pos);
        } catch (e) {}
      };
    };
    render();
  }
  if (q(".np-libbtn")) q(".np-libbtn").onclick = openLib;
  q(".np-shape").onchange = (e) => {
    const v = e.target.value;
    if (!v) return;
    shapeKind = v;
    tool = "shape";
    ov.querySelectorAll(".np-t[data-t]").forEach((x) => x.setAttribute("aria-pressed", "false"));
    e.target.classList.add("on");
    sel = null;
    draw();
    toast(
      (NP_SYM.has(v) || NP_LINE.has(v) || v === "door" || v === "window"
        ? doc.scale && NP_REAL[v]
          ? "Tap to place at real size, or drag to size the "
          : "Tap to place, or drag to size the "
        : "Drag on the page to draw the ") +
        (NP_SHAPES.find((x) => x[0] === v) || [, "shape"])[1].replace(/^\S+\s/, "").toLowerCase(),
    );
  };
  ov.querySelectorAll(".np-wb").forEach(
    (b) =>
      (b.onclick = () => {
        wid = +b.dataset.w;
        ov.querySelectorAll(".np-wb").forEach((x) =>
          x.setAttribute("aria-pressed", String(x === b)),
        );
        if (sel != null && doc.objs[sel] && doc.objs[sel].w && doc.objs[sel].t !== "img") {
          snap();
          doc.objs[sel].w = pwFor(wid);
          draw();
          toast("Thickness changed");
        }
      }),
  );
  q(".np-clear").onclick = () => {
    if (!doc.objs.length) {
      toast("This page is already empty");
      return;
    }
    const d = document.createElement("div");
    d.className = "dimask";
    d.innerHTML = `<div class="dimbox"><b>🗑 Start again?</b><div class="who">Clears everything on ${esc(doc.pages[pg].name || "this page")}${doc.pages.length > 1 ? " (other pages are kept)" : ""}. You can tap ↶ Undo straight after if you change your mind.</div><div class="dimbtns"><button type="button" class="btn sax">Cancel</button><button type="button" class="btn danger sago">Clear page</button></div></div>`;
    ov.appendChild(d);
    d.querySelector(".sax").onclick = () => d.remove();
    d.querySelector(".sago").onclick = () => {
      d.remove();
      snap();
      setObjs([]);
      sel = null;
      chain = [];
      dirty = true;
      draw();
      toast("Page cleared. ↶ Undo brings it back");
    };
  };
  q(".np-undo").onclick = () => {
    if (!undo.length) return;
    msel.clear();
    redo.push(JSON.stringify(doc.objs));
    setObjs(JSON.parse(undo.pop()));
    sel = null;
    dirty = true;
    draw();
  };
  q(".np-redo").onclick = () => {
    if (!redo.length) return;
    msel.clear();
    undo.push(JSON.stringify(doc.objs));
    setObjs(JSON.parse(redo.pop()));
    sel = null;
    dirty = true;
    draw();
  };
  q(".np-zi").onclick = () => zoom(1.25);
  q(".np-zo").onclick = () => zoom(0.8);
  q(".np-fit").onclick = () => {
    if (fitMode === 0 && contentBox()) fitDrawn();
    else fit();
  };
  q(".np-snap").onclick = () => {
    snapOn = !snapOn;
    q(".np-snap").setAttribute("aria-pressed", String(snapOn));
    toast(
      snapOn
        ? "Snap on: lines lock to the grid, line ends and straight angles"
        : "Snap off: draw freely",
    );
    draw();
  };
  q(".np-more").hidden = sized();
  q(".np-more").onclick = () => {
    doc.h += 1400;
    dirty = true;
    const r = stage.getBoundingClientRect();
    oy = Math.min(oy, r.height - doc.h * s + 200);
    draw();
    toast("Page made longer");
  };
  /* selection bar */
  ov.querySelectorAll(".np-sb").forEach(
    (b) =>
      (b.onclick = () => {
        if (sel == null || !doc.objs[sel]) return;
        const o = doc.objs[sel];
        const a = b.dataset.a;
        snap();
        if (a === "del") {
          doc.objs.splice(sel, 1);
          sel = null;
        } else if (a === "rot") {
          if (npBoxy(o)) {
            o.r = ((o.r || 0) + Math.PI / 2) % (2 * Math.PI);
            if (Math.abs(o.r) < 1e-6) o.r = 0;
          } else if (o.a && o.b) {
            const c = [(o.a[0] + o.b[0]) / 2, (o.a[1] + o.b[1]) / 2];
            o.a = rot(o.a, c, Math.PI / 2);
            o.b = rot(o.b, c, Math.PI / 2);
          } else if (o.p) {
            const b2 = baseBox(o),
              c = [b2[0] + b2[2] / 2, b2[1] + b2[3] / 2];
            o.p = o.p.map((pt) => rot(pt, c, Math.PI / 2));
          }
        } else if (a === "flip") {
          o.fl = !o.fl;
        } else if (a === "crop") {
          undo.pop();
          recropImg(o);
          return;
        } else if (a === "turnby") {
          undo.pop();
          askLabel(ov, "Turn it by how many degrees? (minus turns the other way)", "45", (v) => {
            const d = parseFloat(String(v || "").replace(",", "."));
            if (!isFinite(d) || !d) return;
            snap();
            turnObj(o, -d);
            if (npIsWall(o)) {
              weldWall(o);
              orientCavity(o);
            }
            dirty = true;
            draw();
            toast("Turned " + d + "°");
          });
          return;
        } else if (a === "dstyle") {
          o.tk = o.tk ? undefined : 1;
          if (!o.tk) delete o.tk;
          dimTk = !!o.tk;
          try {
            localStorage.setItem("np.dimtk", dimTk ? "1" : "0");
          } catch (e) {}
        } else if (a === "autodim") {
          undo.pop();
          autoDim(o);
          return;
        } else if (a === "offset") {
          undo.pop();
          offsetDlg(o);
          return;
        } else if (a === "lock") {
          o.lk = !o.lk;
          if (!o.lk) delete o.lk;
          toast(
            o.lk
              ? "🔒 Locked: it can't be moved, changed or rubbed out until you unlock it"
              : "🔓 Unlocked",
          );
        } else if (a === "dup") {
          const c = JSON.parse(JSON.stringify(o));
          const d = snapOn ? 50 : 30 / s;
          if (c.a) {
            c.a = [c.a[0] + d, c.a[1] + d];
            c.b = [c.b[0] + d, c.b[1] + d];
          }
          if (c.p) c.p = c.p.map((pt) => [pt[0] + d, pt[1] + d]);
          if (c.x != null) {
            c.x += d;
            c.y += d;
          }
          doc.objs.push(c);
          sel = doc.objs.length - 1;
          toast("Copied. Drag it where you want it.");
        } else if (a === "front") {
          doc.objs.splice(sel, 1);
          doc.objs.push(o);
          sel = doc.objs.length - 1;
        } else if (a === "fine") {
          undo.pop();
          fineOpen();
          return;
        } else if (a === "fill") {
          undo.pop();
          if (o.t === "img") {
            toast("Photos can't be filled");
            return;
          }
          if (
            npIsWall(o) ||
            npBoxy(o) ||
            o.t === "rect" ||
            o.t === "circle" ||
            o.t === "stroke" ||
            o.t === "text" ||
            o.t === "room"
          )
            colourPop("fill", o);
          else toast("Lines can't be filled. Draw a box or shape to colour an area.");
          return;
        }
        draw();
      }),
  );

  /* ===== fine-tune panel for the selected item: nudge, turn by degrees, exact length/size ===== */
  const fb = q(".np-finebox");
  function moveObj(o, dx, dy) {
    if (o.v) o.v = [o.v[0] + dx, o.v[1] + dy];
    if (o.lead && o.lead.p && !o.__keepTip) o.lead.p = [o.lead.p[0] + dx, o.lead.p[1] + dy];
    if (o.t === "img" || o.t === "text") {
      o.x += dx;
      o.y += dy;
    } else if (o.p) {
      o.p = o.p.map((pt) => [pt[0] + dx, pt[1] + dy]);
    } else if (o.a) {
      o.a = [o.a[0] + dx, o.a[1] + dy];
      o.b = [o.b[0] + dx, o.b[1] + dy];
    }
  }

  /* 🗂 layers: show / hide / lock groups of things, move things between layers, see another floor underneath */
  q(".np-layers") &&
    (q(".np-layers").onclick = () => {
      const d = document.createElement("div");
      d.className = "dimask";
      ov.appendChild(d);
      const render = () => {
        doc.layers = doc.layers || {};
        const cnt = {};
        doc.pages.forEach((p2, pi) =>
          (pi === pg ? doc.objs : p2.objs).forEach((o) => {
            const k = npLayerOf(o);
            cnt[k] = (cnt[k] || 0) + 1;
          }),
        );
        const so = sel != null ? doc.objs[sel] : null;
        const picked = msel.size
          ? [...msel].map((j) => doc.objs[j]).filter(Boolean)
          : so
            ? [so]
            : [];
        d.innerHTML = `<div class="dimbox lybox"><b>🗂 Layers</b><div class="who">Hide a layer to work on the rest; lock it so you can't move it by accident. Hidden layers are left off the PDF.</div>
        <div class="lylist">${
          NP_LAYERS.filter(
            ([k]) => cnt[k] || (doc.layers[k] && (doc.layers[k].hide || doc.layers[k].lock)),
          )
            .map(([k, l]) => {
              const L = doc.layers[k] || {};
              return `<div class="lyrow"><span>${l} <span class="who">${cnt[k] || 0}</span></span><button type="button" class="pillbtn lyh" data-k="${k}" aria-pressed="${!L.hide}">${L.hide ? "🚫 Hidden" : "👁 Showing"}</button><button type="button" class="pillbtn lyl" data-k="${k}" aria-pressed="${!!L.lock}">${L.lock ? "🔒 Locked" : "🔓 Free"}</button></div>`;
            })
            .join("") || '<div class="who">Nothing drawn yet.</div>'
        }</div>
        ${picked.length ? `<label>Move ${picked.length === 1 ? "the selected item" : picked.length + " picked items"} to layer<select class="lymv"><option value="">Choose…</option>${NP_LAYERS.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label>` : ""}
        <div class="flabel" style="margin-top:6px">🏢 Floors</div><div class="who">Use pages for floors (rename them Ground floor, First floor… from the ⋯ on the page tab). Show another floor faintly underneath to line walls and stairs up. It isn't printed.</div>
        <label>Show underneath this page<select class="lygh"><option value="">Nothing</option>${doc.pages.map((p2, i) => (i === pg ? "" : `<option value="${i}" ${doc.pages[pg].ghost === i ? "selected" : ""}>${esc(p2.name || "Page " + (i + 1))}</option>`)).join("")}</select></label>
        <div class="dimbtns"><button type="button" class="btn lyall">Show & unlock all</button><button type="button" class="btn primary lyx">Done</button></div></div>`;
        d.querySelector(".lyx").onclick = () => {
          d.remove();
          draw();
        };
        d.querySelector(".lyall").onclick = () => {
          doc.layers = {};
          dirty = true;
          render();
          draw();
        };
        d.querySelectorAll(".lyh").forEach(
          (b) =>
            (b.onclick = () => {
              const k = b.dataset.k;
              const L = (doc.layers[k] = doc.layers[k] || {});
              L.hide = !L.hide;
              if (L.hide) {
                sel = null;
                msel.clear();
              }
              dirty = true;
              render();
              draw();
            }),
        );
        d.querySelectorAll(".lyl").forEach(
          (b) =>
            (b.onclick = () => {
              const k = b.dataset.k;
              const L = (doc.layers[k] = doc.layers[k] || {});
              L.lock = !L.lock;
              if (L.lock) {
                sel = null;
                msel.clear();
              }
              dirty = true;
              render();
              draw();
            }),
        );
        const mv = d.querySelector(".lymv");
        if (mv)
          mv.onchange = () => {
            if (!mv.value) return;
            snap();
            picked.forEach((o) => (o.ly = mv.value));
            dirty = true;
            toast("Moved to " + NP_LAYERS.find((x) => x[0] === mv.value)[1]);
            render();
            draw();
          };
        d.querySelector(".lygh").onchange = (e) => {
          const v = e.target.value;
          if (v === "") delete doc.pages[pg].ghost;
          else doc.pages[pg].ghost = +v;
          dirty = true;
          draw();
        };
      };
      render();
    });
  /* rooms: tap the corners, get the floor area and perimeter; 🧮 quantities for the whole drawing */
  function roomDlg(o, isNew) {
    const d = document.createElement("div");
    d.className = "dimask";
    d.innerHTML = `<form class="dimbox"><b>⬠ Room</b><label>Name<input class="rmn" maxlength="40" value="${esc(o.name || "")}" placeholder="e.g. Kitchen, Bed 1"></label><label>Ceiling height (mm)<input class="rmh" type="number" inputmode="numeric" value="${o.ht || doc.wallH || 2400}"></label>
      <label class="inl"><input type="checkbox" class="rmp" ${o.showP !== false ? "checked" : ""}> Show perimeter on the drawing</label><div class="dimbtns">${isNew ? "" : `<button type="button" class="btn rmdel" style="color:#c2410c">Delete</button>`}<button type="submit" class="btn primary">${isNew ? "Add room" : "Save"}</button></div></form>`;
    ov.appendChild(d);
    setTimeout(() => d.querySelector(".rmn").focus(), 30);
    const rd = d.querySelector(".rmdel");
    if (rd)
      rd.onclick = () => {
        d.remove();
        snap();
        const i = doc.objs.indexOf(o);
        if (i >= 0) doc.objs.splice(i, 1);
        sel = null;
        dirty = true;
        draw();
      };
    d.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      if (!isNew) snap();
      o.name = d.querySelector(".rmn").value.trim() || "Room";
      const h = +d.querySelector(".rmh").value;
      if (h > 0) o.ht = h;
      if (d.querySelector(".rmp").checked) delete o.showP;
      else o.showP = false;
      d.remove();
      dirty = true;
      draw();
    };
  }
  let paveMat = (() => {
      try {
        return localStorage.getItem("np.pave") || "slabs";
      } catch (e) {
        return "slabs";
      }
    })(),
    paveW = 900,
    paveSide = 1,
    lastStripEnd = null;
  function finishPave() {
    const isStrip = tool === "pstrip";
    if (chain.length < (isStrip ? 2 : 3)) {
      toast(isStrip ? "Tap at least two points along the building" : "Tap at least three corners");
      return;
    }
    let poly = chain.slice();
    if (isStrip) {
      if (!doc.scale) {
        toast("Set a scale in 📐 Paper first so the path is the right width");
        return;
      }
      poly = npStripPoly(chain, toUnits(paveW), paveSide);
      lastStripEnd = chain[chain.length - 1].slice();
    }
    snap();
    const o = {
      t: "room",
      pave: paveMat,
      p: poly,
      c: "#444444",
      w: 1.4,
      size: sized() ? Math.max(16, Math.round(Math.min(40, 22 / s))) : Math.round(26 / s),
      ly: "land",
    };
    doc.objs.unshift(o);
    const A = doc.scale ? npPolyArea(poly) / (NP_U / doc.scale) ** 2 / 1e6 : 0;
    chain = isStrip && lastStripEnd ? [lastStripEnd.slice()] : [];
    chainUI();
    dirty = true;
    draw();
    toast(
      (NP_PAVE[paveMat] || [""])[0] +
        (A ? " · " + A.toFixed(1) + " m²" : "") +
        (isStrip
          ? ". Keep tapping to carry on from the end of it, or tap ↺ Start somewhere else"
          : ""),
    );
  }
  function finishRoom() {
    if (chain.length < 3) return;
    snap();
    const o = {
      t: "room",
      p: chain.slice(),
      c: "#1e3a8a",
      w: 2,
      size: sized() ? Math.max(16, Math.round(Math.min(44, 24 / s))) : Math.round(28 / s),
      name: "Room " + (doc.objs.filter((x) => x.t === "room").length + 1),
    };
    doc.objs.unshift(o);
    chain = [];
    chainUI();
    dirty = true;
    draw();
    if (!doc.scale) toast("Set a scale in 📐 Paper to see the area");
    roomDlg(o, true);
  }
  const QTY_WALL = {
    wall: "Solid wall (100 block)",
    dline: "Wall (double line)",
    cavity: "Cavity wall (block / cavity / insulation / block)",
    stud: "Stud wall",
    tstud: "Timber stud wall",
  };
  function qtyCalc(H) {
    const keepSc = NP_SCX;
    const mm = (u) => (doc.scale ? (u / NP_U) * doc.scale : 0);
    const lins = {},
      beams = [],
      rooms = [],
      walls = {},
      open = { door: 0, win: 0 },
      sym = {};
    let openArea = {};
    doc.pages.forEach((pgx, pi) => {
      const objs = pi === pg ? doc.objs : pgx.objs;
      objs.forEach((o) => {
        NP_SCX = pi === pg ? vpScaleFor(o) : 0;
        if (vpOf(o)) return;
        if (o.t === "shape" && o.k === "beam" && o.a && o.b) {
          const span = Math.round(mm(lenOf(o.a, o.b)) / 5) * 5,
            bear = +o.bear || 150;
          beams.push({
            mark: o.mark || "",
            sec: o.sec || "section to be confirmed",
            len: span + 2 * bear,
            kg: (secKg(o.sec || "") * (span + 2 * bear)) / 1000,
            pad: o.pad || "Concrete 440×215×100",
          });
        }
        if (o.t === "room" && o.pave && o.p && o.p.length > 2) {
          const A = npPolyArea(o.p.map((q) => [mm(q[0]), mm(q[1])])) / 1e6;
          const lab = (NP_PAVE[o.pave] || [o.pave])[0];
          sym["Paving: " + lab + " (m²)"] =
            Math.round(((sym["Paving: " + lab + " (m²)"] || 0) + A) * 10) / 10;
        } else if (o.t === "room" && o.p && o.p.length > 2) {
          const A = npPolyArea(o.p.map((q) => [mm(q[0]), mm(q[1])])) / 1e6,
            P = npPolyPerim(o.p.map((q) => [mm(q[0]), mm(q[1])])) / 1000,
            h = (o.ht || H) / 1000;
          rooms.push({
            n: o.name || "Room",
            pg: pgx.name || "Page " + (pi + 1),
            A,
            P,
            wall: P * h,
            vol: A * h,
          });
        } else if (o.t === "shape" && QTY_WALL[o.k]) {
          const L = mm(lenOf(o.a, o.b)) / 1000;
          if (o.lin)
            Object.values(o.lin).forEach((k) => {
              const D = NP_LIN[k];
              if (!D) return;
              lins[k] = lins[k] || { A: 0, L: 0 };
              lins[k].A += (L * H) / 1000;
              lins[k].L += L;
            });
          walls[o.k] = walls[o.k] || { L: 0, n: 0, cc: o.cc || 400, sd: o.sd || 100 };
          walls[o.k].L += L;
          walls[o.k].n++;
        } else if (o.t === "shape") {
          const lab = libLabel(o.k).replace(/^[^A-Za-z0-9]+\s*/, "");
          sym[lab] = (sym[lab] || 0) + 1;
          if (NP_LINE.has(o.k) || o.k === "door") {
            const w = mm(lenOf(o.a, o.b)) / 1000;
            if (/door|bifold|opening/.test(o.k)) {
              openArea[o.k] = (openArea[o.k] || 0) + w * 2.1;
            } else if (o.k === "window") {
              openArea.window = (openArea.window || 0) + w * 1.05;
            }
          }
        }
      });
    });
    NP_SCX = keepSc;
    const opn = Object.values(openArea).reduce((a, b) => a + b, 0);
    return { rooms, walls, sym, opn, beams, lins };
  }
  q(".np-qty") &&
    (q(".np-qty").onclick = () => {
      if (!doc.scale) {
        toast("Set a scale in 📐 Paper first, so it can work out real sizes");
        return;
      }
      let H = doc.wallH || 2400;
      const d = document.createElement("div");
      d.className = "dimask";
      ov.appendChild(d);
      const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2),
        up = (v) => Math.ceil(v);
      const render = () => {
        const r = qtyCalc(H);
        const wl = Object.entries(r.walls);
        const rows = [];
        const totA = r.rooms.reduce((a, x) => a + x.A, 0);
        let mat = [];
        let gross = 0;
        wl.forEach(([k, w]) => {
          const area = (w.L * H) / 1000;
          gross += area;
        });
        const net = Math.max(0, gross - r.opn);
        const share = (k) => {
          const w = r.walls[k];
          const area = (w.L * H) / 1000;
          return gross ? Math.max(0, area - (r.opn * area) / gross) : 0;
        };
        wl.forEach(([k, w]) => {
          const a = share(k);
          if (k === "cavity") {
            mat.push(
              [
                `Blocks for cavity walls (2 leaves, 440×215, +5%)`,
                up(a * 2 * 10 * 1.05) + " blocks",
              ],
              [`Cavity insulation (100 mm)`, f2(a * 1.05) + " m²"],
              [`Wall ties (2.5 per m²)`, up(a * 2.5) + " ties"],
              [`Mortar (approx. 0.03 m³ per m² of block leaf)`, f2(a * 2 * 0.03) + " m³"],
            );
          } else if (k === "wall" || k === "dline") {
            mat.push(
              [
                `Blocks for ${QTY_WALL[k].toLowerCase()} (440×215, +5%)`,
                up(a * 10 * 1.05) + " blocks",
              ],
              [`Mortar (approx.)`, f2(a * 0.03) + " m³"],
            );
          } else {
            const cc = (w.cc || 400) / 1000;
            const studs = up(w.L / cc) + w.n * 2;
            const sheets = up(((a * 2) / 2.88) * 1.1);
            mat.push(
              [
                `Studs ${w.sd || 100}×50 @ ${w.cc || 400} c/c (${(H / 1000).toFixed(1)} m lengths, incl. ends)`,
                studs + " studs",
              ],
              [`Head & sole plates`, f2(w.L * 2 * 1.1) + " m"],
              [`Noggins (one row)`, f2(w.L * 1.1) + " m"],
              [`Plasterboard 2400×1200 (both sides, +10%)`, sheets + " sheets"],
              [`Insulation in stud walls`, f2(a * 1.05) + " m²"],
            );
          }
        });
        {
          const mw = wl
            .filter(([k]) => ["wall", "cavity", "dline"].includes(k))
            .reduce((a, [k, w]) => a + w.L, 0);
          if (mw > 0) {
            const fw = doc.fdnW || 600,
              fd = doc.fdnD || 225;
            mat.push([
              `Strip footing concrete (${f2(mw)} m of masonry wall × ${fw} wide × ${fd} deep, +10%)`,
              f2(((mw * fw * fd) / 1e6) * 1.1) + " m³",
            ]);
          }
          if (r.walls.cavity)
            mat.push([
              `Or facing bricks for the outer leaf instead of blocks (60 per m², +5%)`,
              up(share("cavity") * 60 * 1.05) + " bricks",
            ]);
          Object.entries(r.lins || {}).forEach(([k, v]) => {
            const [lab, bd, gap, sty] = NP_LIN[k];
            const a = v.A;
            if (bd) {
              const isWood = sty === "ply" || sty === "osb";
              mat.push([
                `${sty === "bat" ? lab.replace(/^Battens [^+]+\+ p/, "P") + " on battens" : lab} (${f2(a)} m², ${isWood ? "2440×1220" : "2400×1200"} sheets, +10%)`,
                up((a / (isWood ? 2.977 : 2.88)) * 1.1) + " sheets",
              ]);
            }
            if (sty === "dd")
              mat.push([
                `Dot & dab adhesive for ${f2(a)} m² (roughly one 25 kg bag per 3 m², check the bag)`,
                up(a / 3) + " bags",
              ]);
            if (sty === "bat" || sty === "batonly") {
              const m2 = (v.L / 0.4 + 1) * (H / 1000) + v.L * 2;
              mat.push([
                `${lab.match(/Battens [0-9×]+/)[0]} at 400 centres plus top and bottom (+10%)`,
                f2(m2 * 1.1) + " m",
              ]);
            }
          });
          r.beams.forEach((b) =>
            mat.push([
              `Steel beam ${b.mark ? b.mark + " " : ""}${b.sec}, ${b.len} mm long incl. bearings`,
              b.kg ? Math.round(b.kg) + " kg" : "size TBC",
            ]),
          );
          {
            const pads = r.beams.filter((b) => b.pad !== "None").length * 2;
            if (pads) mat.push(["Padstones (one each end)", pads + " no."]);
          }
        }
        d.innerHTML = `<div class="dimbox qtybox"><b>🧮 Quantities (all pages)</b><div class="who">Worked out from what's drawn at 1:${doc.scale}. They're estimates to check before ordering.</div>
        <label class="inl">Wall height <input type="number" class="qh" value="${H}" style="width:100px"> mm</label><label class="inl">Strip footing <input type="number" class="qfw" value="${doc.fdnW || 600}" style="width:80px"> wide × <input type="number" class="qfd" value="${doc.fdnD || 225}" style="width:80px"> deep (mm)</label>
        <div class="flabel">Rooms</div>${r.rooms.length ? `<div class="tablewrap"><table><thead><tr><th>Room</th><th class="num">Floor m²</th><th class="num">Perimeter m</th><th class="num">Wall m²</th><th class="num">Volume m³</th></tr></thead><tbody>${r.rooms.map((x) => `<tr><td>${esc(x.n)}${doc.pages.length > 1 ? ` <span class="who">${esc(x.pg)}</span>` : ""}</td><td class="num">${f2(x.A)}</td><td class="num">${f2(x.P)}</td><td class="num">${f2(x.wall)}</td><td class="num">${f2(x.vol)}</td></tr>`).join("")}<tr><td><b>Total</b></td><td class="num"><b>${f2(totA)}</b></td><td></td><td class="num"><b>${f2(r.rooms.reduce((a, x) => a + x.wall, 0))}</b></td><td class="num"><b>${f2(r.rooms.reduce((a, x) => a + x.vol, 0))}</b></td></tr></tbody></table></div>` : `<div class="who">No rooms yet. Use the ⬠ Room tool and tap the corners of each room.</div>`}
        <div class="flabel">Walls</div>${wl.length ? `<div class="tablewrap"><table><thead><tr><th>Wall type</th><th class="num">Length m</th><th class="num">Area m²</th></tr></thead><tbody>${wl.map(([k, w]) => `<tr><td>${esc(QTY_WALL[k])}</td><td class="num">${f2(w.L)}</td><td class="num">${f2((w.L * H) / 1000)}</td></tr>`).join("")}<tr><td>Less doors & windows (approx.)</td><td></td><td class="num">−${f2(r.opn)}</td></tr><tr><td><b>Net wall area</b></td><td></td><td class="num"><b>${f2(net)}</b></td></tr></tbody></table></div>` : `<div class="who">No walls drawn.</div>`}
        ${mat.length ? `<div class="flabel">Materials (estimate)</div><div class="tablewrap"><table><tbody>${mat.map(([a, b]) => `<tr><td>${esc(a)}</td><td class="num"><b>${esc(b)}</b></td></tr>`).join("")}</tbody></table></div>` : ""}
        ${
          Object.keys(r.sym).length
            ? `<div class="flabel">Symbols counted</div><div class="tablewrap"><table><tbody>${Object.entries(
                r.sym,
              )
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([a, b]) => `<tr><td>${esc(a)}</td><td class="num">${b}</td></tr>`)
                .join("")}</tbody></table></div>`
            : ""
        }
        <div class="dimbtns"><button type="button" class="btn qcopy">📋 Copy as text</button><button type="button" class="btn primary qx">Close</button></div></div>`;
        d.querySelector(".qx").onclick = () => d.remove();
        d.querySelectorAll(".qfw,.qfd").forEach(
          (i) =>
            (i.onchange = () => {
              doc.fdnW = +d.querySelector(".qfw").value || 600;
              doc.fdnD = +d.querySelector(".qfd").value || 225;
              dirty = true;
              render();
            }),
        );
        const qh = d.querySelector(".qh");
        qh.onchange = () => {
          const v = +qh.value;
          if (v > 0) {
            H = v;
            doc.wallH = v;
            dirty = true;
            render();
          }
        };
        d.querySelector(".qcopy").onclick = () => {
          const t = [...d.querySelectorAll(".flabel, tr")]
            .map((e) =>
              e.tagName === "TR"
                ? [...e.children]
                    .map((c) => c.textContent.trim())
                    .filter(Boolean)
                    .join("\t")
                : "\n" + e.textContent.toUpperCase(),
            )
            .join("\n");
          try {
            navigator.clipboard.writeText(t).then(
              () => toast("Copied"),
              () => toast("Couldn't copy on this phone"),
            );
          } catch (e) {
            toast("Couldn't copy on this phone");
          }
        };
      };
      render();
    });

  /* ===== BUILD TOOLS (ideas from Tekla): steel beams, auto dimensions, numbering, schedules, grids, elevations, checks, templates ===== */
  const BEAM_SECS = [
    ["127×76×13 UB", 13],
    ["152×89×16 UB", 16],
    ["178×102×19 UB", 19],
    ["203×102×23 UB", 23],
    ["203×133×25 UB", 25],
    ["203×133×30 UB", 30],
    ["254×102×22 UB", 22],
    ["254×102×28 UB", 28],
    ["254×146×31 UB", 31],
    ["254×146×37 UB", 37],
    ["305×102×25 UB", 25],
    ["305×127×37 UB", 37],
    ["305×165×40 UB", 40],
    ["356×171×45 UB", 45],
    ["152×152×23 UC", 23],
    ["152×152×30 UC", 30],
    ["152×152×37 UC", 37],
    ["203×203×46 UC", 46],
    ["203×203×52 UC", 52],
    ["150×75 PFC", 17.9],
    ["180×75 PFC", 20.3],
    ["200×90 PFC", 29.7],
    ["230×90 PFC", 32.2],
    ["100×100×5 SHS", 14.7],
    ["150×150×6.3 SHS", 28.1],
    ["150×100×6.3 RHS", 23.9],
    ["200×100×6.3 RHS", 28.1],
    ["Box beam (2 × PFC, see engineer)", 0],
    ["Flitch beam (see engineer)", 0],
    ["Glulam (see engineer)", 0],
    ["To engineer's design", 0],
  ];
  const BEAM_PADS = [
    "None",
    "Concrete 440×215×100",
    "Concrete 440×215×140",
    "Concrete 440×100×100",
    "Engineering brick (3 courses)",
    "Steel bearing plate",
    "To engineer's design",
  ];
  const secKg = (s) => (BEAM_SECS.find((x) => x[0] === s) || [0, 0])[1];
  const isOpening = (o) =>
    o && o.t === "shape" && (o.k === "window" || NP_OPENK.has(o.k)) && o.a && o.b;
  const isDoorK = (o) => o && o.t === "shape" && NP_OPENK.has(o.k) && o.k !== "opening";
  const isBeam = (o) => o && o.t === "shape" && o.k === "beam" && o.a && o.b;
  function openEnds(o) {
    if (NP_OPENK.has(o.k)) return [o.a, o.b];
    const x0 = Math.min(o.a[0], o.b[0]),
      y0 = Math.min(o.a[1], o.b[1]),
      w = Math.abs(o.b[0] - o.a[0]),
      h = Math.abs(o.b[1] - o.a[1]),
      c = [x0 + w / 2, y0 + h / 2],
      r = o.r || 0,
      L = Math.max(w, h) / 2,
      d = w >= h ? [Math.cos(r), Math.sin(r)] : [-Math.sin(r), Math.cos(r)];
    return [
      [c[0] - d[0] * L, c[1] - d[1] * L],
      [c[0] + d[0] * L, c[1] + d[1] * L],
    ];
  }
  const openW = (o) => Math.round(realMm(lenOf(...openEnds(o))));
  function wallOf(o, objs) {
    const [p1, p2] = openEnds(o);
    let best = null,
      bd = Infinity;
    (objs || doc.objs).forEach((x) => {
      if (!npIsWall(x)) return;
      const dx = x.b[0] - x.a[0],
        dy = x.b[1] - x.a[1],
        L = Math.hypot(dx, dy) || 1,
        u = [dx / L, dy / L],
        n = [-u[1], u[0]];
      const f = (P) => [
        (P[0] - x.a[0]) * u[0] + (P[1] - x.a[1]) * u[1],
        (P[0] - x.a[0]) * n[0] + (P[1] - x.a[1]) * n[1],
      ];
      const A = f(p1),
        B = f(p2),
        T = npWallT(x, x.w || 6);
      const off = Math.abs((A[1] + B[1]) / 2);
      if (off > T / 2 + Math.max(12, T * 0.6)) return;
      const mid = (A[0] + B[0]) / 2;
      if (mid < -2 || mid > L + 2) return;
      if (off < bd) {
        bd = off;
        best = { w: x, t1: Math.min(A[0], B[0]), t2: Math.max(A[0], B[0]), L, u, n, T };
      }
    });
    return best;
  }
  /* numbered tags (W1, D1, B1) drawn beside the item */
  function markTag(ctx, o) {
    let c,
      nrm = [0, -1],
      th = 0;
    if (o.a && o.b && (NP_OPENK.has(o.k) || o.k === "beam")) {
      c = [(o.a[0] + o.b[0]) / 2, (o.a[1] + o.b[1]) / 2];
      const L = lenOf(o.a, o.b) || 1;
      nrm = [(o.b[1] - o.a[1]) / L, -(o.b[0] - o.a[0]) / L];
      if (nrm[1] > 0 || (Math.abs(nrm[1]) < 1e-6 && nrm[0] > 0)) nrm = [-nrm[0], -nrm[1]];
    } else {
      const b = baseBox(o);
      c = [b[0] + b[2] / 2, b[1] + b[3] / 2];
      const r = o.r || 0;
      nrm = [Math.sin(r), -Math.cos(r)];
      if (nrm[1] > 0) nrm = [-nrm[0], -nrm[1]];
      th = Math.min(b[2], b[3]) / 2;
    }
    if (o.k !== "beam") {
      try {
        const rw = wallOf(o);
        if (rw) {
          nrm = [-rw.u[1], rw.u[0]];
          th = rw.T / 2;
        }
      } catch (e) {}
    }
    const R = Math.max(7, dimSize() * 0.62),
      d = th + R * 2.2 + (o.k === "beam" ? R * 1.4 : 0),
      x = c[0] + nrm[0] * d,
      y = c[1] + nrm[1] * d;
    ctx.save();
    ctx.setLineDash([]);
    ctx.font = `700 ${R * 1.15}px system-ui,-apple-system,sans-serif`;
    const tw = Math.max(R * 1.6, ctx.measureText(o.mark).width + R * 0.9);
    const colr = o.k === "beam" ? "#b45309" : "#1d4ed8";
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = colr;
    ctx.lineWidth = Math.max(1, R * 0.12);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - tw / 2, y - R * 0.8, tw, R * 1.6, R * 0.8);
    else ctx.rect(x - tw / 2, y - R * 0.8, tw, R * 1.6);
    ctx.fill();
    ctx.stroke();
    npLbl(Object.assign(ctx, { fillStyle: colr }), o.mark, x, y + R * 0.04, R * 1.15);
    ctx.restore();
  }
  drawObj.__lin = (ctx, w) => {
    if (doc.layers && lyHid(w)) return;
    const L = lenOf(w.a, w.b);
    if (!L) return;
    const u = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L],
      n = [-u[1], u[0]],
      T = npWallT(w, w.w || 6);
    const U = (v) => (doc.scale ? toUnits(v) : v * 0.25);
    const tol = Math.max(3, T * 0.6);
    const linT = (x, side) => {
      const D = NP_LIN[(x.lin || {})[side]];
      return D ? U(D[2]) + Math.max(U(D[1]), D[1] ? 1.2 : 0) : 0;
    };
    /* at a corner, the lining stops at the other wall's face when that wall is on this side, or runs on to close the corner when it isn't */
    const endAdj = (pt, awayDir, sg) => {
      let cut = 0;
      for (const x of doc.objs) {
        if (x === w || !npIsWall(x)) continue;
        const Lx = lenOf(x.a, x.b) || 1,
          ux = [(x.b[0] - x.a[0]) / Lx, (x.b[1] - x.a[1]) / Lx];
        if (Math.abs(ux[0] * u[0] + ux[1] * u[1]) > 0.9) continue;
        let hit = null;
        if (lenOf(x.a, pt) < tol) hit = [ux[0], ux[1]];
        else if (lenOf(x.b, pt) < tol) hit = [-ux[0], -ux[1]];
        else {
          const d = [pt[0] - x.a[0], pt[1] - x.a[1]],
            tt = d[0] * ux[0] + d[1] * ux[1],
            off = Math.abs(d[0] * ux[1] - d[1] * ux[0]);
          if (tt > -tol && tt < Lx + tol && off < npWallT(x, x.w || 6) / 2 + tol) {
            const sideOfX =
              ((w.a[0] + w.b[0]) / 2 - x.a[0]) * -ux[1] + ((w.a[1] + w.b[1]) / 2 - x.a[1]) * ux[0];
            return { cut: npWallT(x, x.w || 6) / 2 + linT(x, sideOfX > 0 ? 1 : 2) };
          }
        }
        if (!hit) continue;
        const Tx = npWallT(x, x.w || 6);
        const onSide = (hit[0] * n[0] + hit[1] * n[1]) * sg > 0;
        const xn = [-ux[0], -ux[1]];
        const sideOfX =
          ((w.a[0] + w.b[0]) / 2 - x.a[0]) * -ux[1] + ((w.a[1] + w.b[1]) / 2 - x.a[1]) * ux[0];
        const xs = sideOfX > 0 ? 1 : 2;
        if (onSide) cut = Math.max(cut, Tx / 2 + linT(x, xs));
        else cut = Math.min(cut, -(Tx / 2 + linT(x, xs === 1 ? 2 : 1)));
      }
      return { cut };
    };
    const wL = L;
    [
      [1, 1],
      [2, -1],
    ].forEach(([k, sg]) => {
      const D = NP_LIN[w.lin[k]];
      if (!D) return;
      const [, bd, gap, sty] = D;
      const o0 = T / 2 + U(gap),
        o1 = o0 + Math.max(U(bd), bd ? 1.2 : 0);
      const ea = endAdj(w.a, [-u[0], -u[1]], sg),
        eb = endAdj(w.b, u, sg);
      const t0 = ea.cut,
        t1 = wL - eb.cut;
      if (t1 - t0 < 2) return;
      const P = (t, off) => [
        w.a[0] + u[0] * (t0 + t) + n[0] * off * sg,
        w.a[1] + u[1] * (t0 + t) + n[1] * off * sg,
      ];
      {
        const Lq = t1 - t0;
        Object.defineProperty(P, "L", { value: Lq });
      }
      const L = P.L;
      ctx.save();
      ctx.setLineDash([]);
      ctx.lineWidth = Math.max(0.6, (w.w || 2) * 0.35);
      ctx.strokeStyle = "#444";
      const quad = (t0, t1, a, b, fill) => {
        ctx.beginPath();
        const p1 = P(t0, a),
          p2 = P(t1, a),
          p3 = P(t1, b),
          p4 = P(t0, b);
        ctx.moveTo(...p1);
        ctx.lineTo(...p2);
        ctx.lineTo(...p3);
        ctx.lineTo(...p4);
        ctx.closePath();
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        ctx.stroke();
      };
      if (sty === "bat" || sty === "batonly") {
        const step = U(400),
          bw = U(38);
        for (let t = 0; t <= L - bw; t += step)
          quad(t, Math.min(L, t + bw), T / 2, T / 2 + U(gap), "#c8a06a");
        if (L % step > bw) quad(L - bw, L, T / 2, T / 2 + U(gap), "#c8a06a");
      }
      if (sty === "dd") {
        ctx.fillStyle = "#888";
        const r = Math.max(0.8, U(gap) * 0.35),
          step = Math.max(r * 6, U(300));
        for (let t = step / 2; t < L; t += step) {
          const c = P(t, T / 2 + U(gap) / 2);
          ctx.beginPath();
          ctx.arc(c[0], c[1], r, 0, 7);
          ctx.fill();
        }
      }
      if (bd) {
        const col =
          { pb: "#f3f1ec", dd: "#f3f1ec", bat: "#f3f1ec", ply: "#e8cc95", osb: "#d8b26e" }[sty] ||
          "#eee";
        quad(0, L, o0, o1, col);
        if (sty === "ply" || sty === "osb") {
          ctx.save();
          ctx.beginPath();
          const p1 = P(0, o0),
            p2 = P(L, o0),
            p3 = P(L, o1),
            p4 = P(0, o1);
          ctx.moveTo(...p1);
          ctx.lineTo(...p2);
          ctx.lineTo(...p3);
          ctx.lineTo(...p4);
          ctx.closePath();
          ctx.clip();
          ctx.lineWidth *= 0.6;
          ctx.strokeStyle = sty === "ply" ? "#9a7438" : "#8a6a30";
          const hgt = o1 - o0,
            step = Math.max(hgt * 1.6, 2);
          if (sty === "ply")
            for (let t = 0; t < L + hgt; t += step) {
              ctx.beginPath();
              ctx.moveTo(...P(t, o0));
              ctx.lineTo(...P(t - hgt, o1));
              ctx.stroke();
            }
          else {
            ctx.fillStyle = "#8a6a30";
            for (let t = step / 2; t < L; t += step / 1.3) {
              const c = P(t, o0 + hgt * (0.3 + 0.4 * ((t * 7) % 1)));
              ctx.beginPath();
              ctx.arc(c[0], c[1], Math.max(0.4, hgt * 0.12), 0, 7);
              ctx.fill();
            }
          }
          ctx.restore();
        }
      }
      ctx.restore();
    });
  };
  drawObj.__mark = (ctx, o) => {
    if (doc.layers && lyHid(o)) return;
    try {
      markTag(ctx, o);
    } catch (e) {}
  };
  function drawObjM(ctx, o) {
    const r = drawObj0(ctx, o);
    if (o && o.mark && o.t === "shape" && !(doc.layers && lyHid(o)))
      try {
        markTag(ctx, o);
      } catch (e) {}
    return r;
  }
  function numberAll(renum) {
    snap();
    const objs = doc.objs;
    const groups = {
      W: objs.filter((o) => isOpening(o) && o.k === "window"),
      D: objs.filter((o) => isDoorK(o)),
      B: objs.filter(isBeam),
    };
    let n = 0;
    Object.entries(groups).forEach(([P, list]) => {
      const used = new Set(renum ? [] : list.map((o) => o.mark).filter(Boolean));
      const cx = (o) => {
        const b = bbox(o);
        return [b[0] + b[2] / 2, b[1] + b[3] / 2];
      };
      const todo = list
        .filter((o) => renum || !o.mark)
        .sort((a, b) => {
          const A = cx(a),
            B = cx(b);
          return Math.abs(A[1] - B[1]) > 40 ? A[1] - B[1] : A[0] - B[0];
        });
      let k = 1;
      todo.forEach((o) => {
        while (used.has(P + k)) k++;
        o.mark = P + k;
        used.add(P + k);
        n++;
      });
    });
    dirty = true;
    draw();
    toast(n ? `Numbered ${n} item${n === 1 ? "" : "s"}` : "Everything already has a number");
  }
  /* dimension every wall: running dimensions to each door and window, then the overall length */
  function dimAllWalls(remove) {
    if (remove) {
      snap();
      const n0 = doc.objs.length;
      doc.objs.forEach((o) => {
        if (npIsWall(o) && o.dimg && o.dimAll) delete o.dimg;
      });
      setObjs(doc.objs.filter((d) => !(d.t === "dim" && d.allW)));
      dirty = true;
      draw();
      toast(n0 - doc.objs.length + " wall dimensions taken off");
      return;
    }
    if (!doc.scale) {
      toast("Set a scale in 📐 Paper first, so it knows the real sizes");
      return;
    }
    snap();
    const sz = dimSize();
    let made = 0,
      walls = 0;
    const WL = doc.objs.filter(npIsWall);
    let bx0 = 1e9,
      by0 = 1e9,
      bx1 = -1e9,
      by1 = -1e9;
    WL.forEach((w) =>
      [w.a, w.b].forEach((p) => {
        bx0 = Math.min(bx0, p[0]);
        by0 = Math.min(by0, p[1]);
        bx1 = Math.max(bx1, p[0]);
        by1 = Math.max(by1, p[1]);
      }),
    );
    const edge = (p) => {
      const t = toUnits(60);
      return (
        Math.abs(p[0] - bx0) < t ||
        Math.abs(p[0] - bx1) < t ||
        Math.abs(p[1] - by0) < t ||
        Math.abs(p[1] - by1) < t
      );
    };
    WL.forEach((w) => {
      if (hasDims(w)) return;
      const L = lenOf(w.a, w.b);
      if (realMm(L) < 200) return;
      const ext =
        edge(w.a) &&
        edge(w.b) &&
        (Math.abs(w.a[0] - w.b[0]) < toUnits(60) || Math.abs(w.a[1] - w.b[1]) < toUnits(60)) &&
        (Math.abs(w.a[0] - w.b[0]) < toUnits(60)
          ? Math.abs(w.a[0] - bx0) < toUnits(60) || Math.abs(w.a[0] - bx1) < toUnits(60)
          : Math.abs(w.a[1] - by0) < toUnits(60) || Math.abs(w.a[1] - by1) < toUnits(60));
      const u = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L];
      const P = (t) => [w.a[0] + u[0] * t, w.a[1] + u[1] * t];
      const ts = [0, L];
      doc.objs.forEach((o) => {
        if (!isOpening(o)) return;
        const r = wallOf(o);
        if (r && r.w === w) {
          ts.push(Math.max(0, r.t1), Math.min(L, r.t2));
        }
      });
      const T = [...new Set(ts.map((t) => Math.round(t * 100) / 100))]
        .sort((a, b) => a - b)
        .filter((t, i, a) => i === 0 || t - a[i - 1] > 0.5);
      w.dimg = w.dimg || "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      w.dimAll = 1;
      const base = -((w.th || npWallT(w, w.w || 6)) / 2 + sz * 1.8);
      if (!ext && T.length <= 2) {
        delete w.dimg;
        delete w.dimAll;
        return;
      }
      /* exterior walls: dimensions go outside the building; interior walls: along the wall, chain only */
      let sgn = 1;
      if (ext) {
        const n = dimN(w),
          mid = [(w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2],
          c = [(bx0 + bx1) / 2, (by0 + by1) / 2];
        sgn = (mid[0] - c[0]) * n[0] + (mid[1] - c[1]) * n[1] > 0 ? -1 : 1;
      }
      const b2 = ext ? base * sgn : base - sz * 2.6;
      if (T.length > 2)
        for (let i = 0; i < T.length - 1; i++) {
          const d = mkDim(P(T[i]), P(T[i + 1]), b2, {
            size: Math.round(sz * 0.72),
            auto: undefined,
            s: String(Math.round(realMm(T[i + 1] - T[i]) / 5) * 5),
          });
          d.of = w.dimg;
          d.allW = 1;
          doc.objs.push(d);
          made++;
        }
      if (ext) {
        const d = mkDim(w.a.slice(), w.b.slice(), T.length > 2 ? b2 - sz * 2.4 * sgn : b2);
        d.of = w.dimg;
        d.allW = 1;
        doc.objs.push(d);
        made++;
      }
      walls++;
    });
    dirty = true;
    draw();
    toast(
      walls
        ? `Dimensioned ${walls} wall${walls === 1 ? "" : "s"} (${made} dimensions). Drag a dimension's round handle to move it to the other side.`
        : "No walls without dimensions on this page",
    );
  }
  /* steel beams */
  const beamRows = () =>
    doc.objs.filter(isBeam).map((o) => {
      const span = Math.round(realMm(lenOf(o.a, o.b)) / 5) * 5,
        bear = +o.bear || 150,
        len = span + 2 * bear,
        kg = (secKg(o.sec || "") * len) / 1000;
      return {
        o,
        mark: o.mark || "",
        sec: o.sec || "",
        span,
        bear,
        len,
        kg,
        pad: o.pad || "Concrete 440×215×100",
      };
    });
  /* door & window survey items for this job, to check sizes against */
  const jobClient = () => {
    const s = doc.site || opts.site;
    return s && ownerMode() ? siteClient(s) : null;
  };
  const surveyItems = () => {
    try {
      const c = jobClient();
      return c ? DWS.itemsFor(c.id) : [];
    } catch (e) {
      return [];
    }
  };
  function schedDlg(tab) {
    const d = document.createElement("div");
    d.className = "dimask";
    ov.appendChild(d);
    let t = tab || "dw";
    const render = () => {
      const ops = doc.objs.filter(isOpening),
        bms = beamRows(),
        sv = surveyItems();
      const svOf = (m) => sv.find((x) => x.ref === m);
      const dw = ops
        .map((o) => {
          const w = openW(o),
            r = wallOf(o),
            s = o.mark && svOf(o.mark),
            sz = s ? DWS.sizeOf(s) : null;
          return {
            o,
            mark: o.mark || "–",
            what: o.k === "window" ? "Window" : libLabel(o.k).replace(/^[^A-Za-z]+/, ""),
            w,
            wall: r ? Math.round(realMm(r.T)) : 0,
            sv: sz ? sz.W : null,
          };
        })
        .sort((a, b) => a.mark.localeCompare(b.mark, undefined, { numeric: true }));
      d.innerHTML = `<div class="dimbox qtybox" style="max-width:720px"><b>📋 Schedules</b><div class="seg" style="margin:8px 0"><button type="button" data-t="dw" aria-pressed="${t === "dw"}">🪟 Doors &amp; windows (${ops.length})</button><button type="button" data-t="bm" aria-pressed="${t === "bm"}">🔩 Steel beams (${bms.length})</button></div>
       ${
         t === "dw"
           ? ops.length
             ? `<div class="who">Widths are as drawn at 1:${doc.scale || "?"}${sv.length ? ". The survey column is the frame width from this client's door &amp; window survey." : ""}</div><div class="tablewrap"><table><thead><tr><th>No.</th><th>Item</th><th class="num">Drawn width</th><th class="num">Wall</th>${sv.length ? '<th class="num">Survey</th>' : ""}</tr></thead><tbody>${dw.map((r) => `<tr><td><b>${esc(r.mark)}</b></td><td>${esc(r.what)}</td><td class="num">${r.w}</td><td class="num">${r.wall || "–"}</td>${sv.length ? `<td class="num">${r.sv == null ? "–" : r.sv + (Math.abs(r.sv - r.w) > 25 ? ' <span style="color:#c2410c">⚠</span>' : " ✓")}</td>` : ""}</tr>`).join("")}</tbody></table></div>
        <div class="dimbtns" style="flex-wrap:wrap"><button type="button" class="btn sc-num">🔢 Number them</button><button type="button" class="btn sc-put">📝 Put on drawing</button>${ownerMode() ? `<button type="button" class="btn primary sc-dws">🪟 Start a door &amp; window survey from these</button>` : ""}</div>`
             : `<div class="nothing">No doors or windows on this page yet.</div>`
           : bms.length
             ? `<div class="who">Pick the section from the engineer's calcs. Overall length = clear span + bearing at each end.</div><div class="tablewrap"><table><thead><tr><th>No.</th><th>Section</th><th class="num">Span</th><th class="num">Bearing</th><th class="num">Length</th><th>Padstones</th><th class="num">kg</th></tr></thead><tbody>${bms.map((r, i) => `<tr><td><b>${esc(r.mark || "–")}</b></td><td><select class="sc-sec" data-i="${i}" style="min-width:150px"><option value="">Choose…</option>${BEAM_SECS.map(([s]) => `<option${s === r.sec ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></td><td class="num">${r.span}</td><td class="num"><input class="sc-bear" data-i="${i}" inputmode="numeric" value="${r.bear}" style="width:64px"></td><td class="num"><b>${r.len}</b></td><td><select class="sc-pad" data-i="${i}">${BEAM_PADS.map((p) => `<option${p === r.pad ? " selected" : ""}>${esc(p)}</option>`).join("")}</select></td><td class="num">${r.kg ? Math.round(r.kg) : "–"}</td></tr>`).join("")}<tr><td colspan="6"><b>Total steel</b></td><td class="num"><b>${Math.round(bms.reduce((a, r) => a + r.kg, 0))}</b></td></tr></tbody></table></div>
        <div class="dimbtns" style="flex-wrap:wrap"><button type="button" class="btn sc-num">🔢 Number them</button><button type="button" class="btn sc-put">📝 Put on drawing</button><button type="button" class="btn sc-copy">📋 Copy</button></div>`
             : `<div class="nothing">No steel beams yet. Use 🔩 Steel beam in 🏗 Build, then draw it from bearing to bearing.</div>`
       }
       <div class="dimbtns"><button type="button" class="btn primary sc-x">Close</button></div></div>`;
      d.querySelectorAll(".seg button").forEach(
        (b) =>
          (b.onclick = () => {
            t = b.dataset.t;
            render();
          }),
      );
      d.querySelector(".sc-x").onclick = () => d.remove();
      const num = d.querySelector(".sc-num");
      if (num)
        num.onclick = () => {
          numberAll(false);
          render();
        };
      d.querySelectorAll(".sc-sec,.sc-pad").forEach(
        (s) =>
          (s.onchange = () => {
            const o = bms[+s.dataset.i].o;
            snap();
            if (s.classList.contains("sc-sec")) o.sec = s.value;
            else o.pad = s.value;
            dirty = true;
            draw();
            render();
          }),
      );
      d.querySelectorAll(".sc-bear").forEach(
        (s) =>
          (s.onchange = () => {
            const o = bms[+s.dataset.i].o;
            snap();
            o.bear = Math.max(0, +s.value || 0);
            dirty = true;
            render();
          }),
      );
      const lines = () =>
        t === "dw"
          ? [
              "DOOR & WINDOW SCHEDULE",
              "No.   Item             Width   Wall",
              ...dw.map(
                (r) =>
                  `${r.mark.padEnd(5)} ${r.what.slice(0, 16).padEnd(16)} ${String(r.w).padStart(6)}  ${String(r.wall || "-").padStart(5)}`,
              ),
            ]
          : [
              "STEEL BEAM SCHEDULE",
              "No.  Section              Length  Bearing  Padstones",
              ...bms.map(
                (r) =>
                  `${(r.mark || "-").padEnd(4)} ${(r.sec || "TBC").slice(0, 20).padEnd(20)} ${String(r.len).padStart(6)}  ${String(r.bear).padStart(5)}    ${r.pad}`,
              ),
              `Total steel approx. ${Math.round(bms.reduce((a, r) => a + r.kg, 0))} kg`,
            ];
      const put = d.querySelector(".sc-put");
      if (put)
        put.onclick = () => {
          const sz = Math.round(Math.max(10, dimSize() * 0.9));
          const rows =
            t === "dw"
              ? [
                  ["No.", "Item", "Width", "Wall"],
                  ...dw.map((r) => [r.mark, r.what, String(r.w), String(r.wall || "–")]),
                ]
              : [
                  ["No.", "Section", "Length", "Bearing", "Padstones", "kg"],
                  ...bms.map((r) => [
                    r.mark || "–",
                    r.sec || "TBC",
                    String(r.len),
                    String(r.bear),
                    r.pad,
                    r.kg ? String(Math.round(r.kg)) : "–",
                  ]),
                  [
                    "",
                    "Total steel",
                    "",
                    "",
                    "",
                    String(Math.round(bms.reduce((a2, r) => a2 + r.kg, 0))),
                  ],
                ];
          snap();
          g.font = `600 ${sz}px system-ui`;
          const x0 = doc.w * 0.05,
            y0 = doc.h * 0.66;
          const title = t === "dw" ? "DOOR & WINDOW SCHEDULE" : "STEEL BEAM SCHEDULE";
          const gid = "sch" + Date.now().toString(36);
          const add = [
            {
              t: "text",
              x: x0,
              y: y0,
              s: title,
              c: "#111111",
              size: Math.round(sz * 1.2),
              ly: "notes",
              gid: gid,
            },
          ];
          let x = x0;
          rows[0].forEach((_, ci) => {
            const col2 = rows.map((r) => r[ci]);
            const w = Math.max(...col2.map((v) => g.measureText(v).width));
            add.push({
              t: "text",
              x,
              y: y0 + sz * 1.9,
              s: col2.join("\n"),
              c: "#111111",
              size: sz,
              ly: "notes",
              gid: gid,
            });
            x += w + sz * 1.6;
          });
          doc.objs.push(...add);
          dirty = true;
          draw();
          d.remove();
          toast("Schedule added at the top left. Drag it where you want it.");
        };
      const cp = d.querySelector(".sc-copy");
      if (cp)
        cp.onclick = () => {
          try {
            navigator.clipboard.writeText(lines().join("\n")).then(
              () => toast("Copied"),
              () => toast("Couldn't copy on this phone"),
            );
          } catch (e) {
            toast("Couldn't copy on this phone");
          }
        };
      const dws = d.querySelector(".sc-dws");
      if (dws)
        dws.onclick = () => {
          if (!dw.length) return;
          const c = jobClient();
          const list = dw.map((r) => ({
            ref: r.mark === "–" ? "" : r.mark,
            kind: r.o.k === "window" ? "window" : "door",
            k: r.o.k,
            width: r.w,
            rev: r.wall,
            loc: (doc.pages[pg] || {}).name || "",
          }));
          d.remove();
          ov.style.visibility = "hidden";
          DWS.open(null, {
            client: c || null,
            items: list,
            back: () => {
              ov.style.visibility = "";
              document.body.style.overflow = "hidden";
            },
          });
        };
    };
    render();
  }
  /* grid lines */
  function gridDlg() {
    const d = document.createElement("div");
    d.className = "dimask";
    ov.appendChild(d);
    d.innerHTML = `<form class="dimbox npsetup"><b>#️⃣ Grid lines</b><div class="who">Lettered lines across, numbered lines down, with the spacings dimensioned. Type the spacings in mm with a comma between them.</div>
      <label>Spacings left to right (A, B, C…)<input class="gd-x" value="3600, 3600" inputmode="decimal"></label><label>Spacings top to bottom (1, 2, 3…)<input class="gd-y" value="4200" inputmode="decimal"></label>
      <div class="dimbtns"><button type="button" class="btn gdx">Cancel</button><button type="submit" class="btn primary">Add grid</button></div></form>`;
    d.querySelector(".gdx").onclick = () => d.remove();
    d.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      if (!doc.scale) {
        toast("Set a scale in 📐 Paper first");
        return;
      }
      const nums = (s) =>
        s
          .split(/[,\s]+/)
          .map(Number)
          .filter((v) => v > 0);
      const xs = nums(d.querySelector(".gd-x").value),
        ys = nums(d.querySelector(".gd-y").value);
      const W = toUnits(xs.reduce((a, b) => a + b, 0)),
        H = toUnits(ys.reduce((a, b) => a + b, 0));
      const m = Math.max(14, dimSize() * 1.6),
        ext = toUnits(900) + m;
      const wls = doc.objs.filter(npIsWall);
      let x0 = Math.max(m * 2, (doc.w - W) / 2),
        y0 = Math.max(m * 2, (doc.h - H) / 2);
      if (wls.length) {
        x0 = Math.min(...wls.flatMap((w) => [w.a[0], w.b[0]]));
        y0 = Math.min(...wls.flatMap((w) => [w.a[1], w.b[1]]));
      }
      snap();
      const add = [];
      let x = x0;
      const L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
      [0, ...xs].forEach((v, i) => {
        x += i ? toUnits(v) : 0;
        add.push({
          t: "shape",
          k: "grid",
          a: [x - m / 2, y0 - ext],
          b: [x + m / 2, y0 + H + ext - m],
          lab: L[i] || "A" + i,
          c: "#475569",
          w: pwFor(2),
          ly: "general",
        });
      });
      let y = y0;
      [0, ...ys].forEach((v, i) => {
        y += i ? toUnits(v) : 0;
        const len = W + ext * 2 - m,
          cx = x0 + W / 2,
          yy = y;
        add.push({
          t: "shape",
          k: "grid",
          a: [cx - m / 2, yy - len / 2],
          b: [cx + m / 2, yy + len / 2],
          r: -Math.PI / 2,
          lab: String(i + 1),
          c: "#475569",
          w: pwFor(2),
          ly: "general",
        });
      });
      let px = x0;
      xs.forEach((v) => {
        const nx = px + toUnits(v);
        add.push(mkDim([px, y0 - ext - m * 1.2], [nx, y0 - ext - m * 1.2], 0));
        px = nx;
      });
      let py = y0;
      ys.forEach((v) => {
        const ny = py + toUnits(v);
        add.push(mkDim([x0 - ext - m * 1.2, py], [x0 - ext - m * 1.2, ny], 0));
        py = ny;
      });
      add.forEach((o) => {
        Object.keys(o).forEach((k) => o[k] === undefined && delete o[k]);
        doc.objs.unshift(o);
      });
      dirty = true;
      d.remove();
      draw();
      toast("Grid added. Walls and beams snap to the grid lines' ends.");
    };
  }
  /* elevation from a wall on the plan */
  function elevFromWall() {
    const w = sel != null ? doc.objs[sel] : null;
    if (!npIsWall(w)) {
      toast("First tap ✋ Select, tap the wall you want, then tap 🏠 Elevation");
      return;
    }
    if (!doc.scale) {
      toast("Set a scale in 📐 Paper first");
      return;
    }
    const Lu = lenOf(w.a, w.b),
      Lmm = realMm(Lu),
      Hmm = doc.wallH || 2400,
      sv = surveyItems();
    const ops = doc.objs
      .filter(isOpening)
      .map((o) => ({ o, r: wallOf(o) }))
      .filter((x) => x.r && x.r.w === w);
    const objs = [],
      U = toUnits,
      x0 = Math.max(U(600), (doc.w - U(Lmm)) / 2),
      gy = doc.h * 0.72,
      col = "#111111",
      lw = pwFor(6);
    objs.push(
      { t: "rect", a: [x0, gy - U(Hmm)], b: [x0 + U(Lmm), gy], c: col, w: lw },
      { t: "line", a: [x0 - U(800), gy], b: [x0 + U(Lmm) + U(800), gy], c: col, w: pwFor(12) },
    );
    ops.forEach(({ o, r }) => {
      const t1 = realMm(r.t1),
        t2 = realMm(r.t2),
        win = o.k === "window",
        it = o.mark && sv.find((x) => x.ref === o.mark),
        sz = it ? DWS.sizeOf(it) : null;
      const h = sz ? sz.H : win ? 1050 : 2100,
        sill = win ? Math.max(0, it && it.kind === "door" ? 0 : 2100 - h) : 0;
      const a = [x0 + U(t1), gy - U(sill + h)],
        b = [x0 + U(t2), gy - U(sill)];
      objs.push({ t: "rect", a, b, c: col, w: lw });
      if (win) {
        objs.push({
          t: "line",
          a: [(a[0] + b[0]) / 2, a[1]],
          b: [(a[0] + b[0]) / 2, b[1]],
          c: col,
          w: pwFor(2),
        });
        if (sill > 0)
          objs.push({
            t: "rect",
            a: [a[0] - U(40), b[1]],
            b: [b[0] + U(40), b[1] + U(60)],
            c: col,
            w: pwFor(2),
          });
      } else
        objs.push({
          t: "line",
          a: [b[0] - U(120), (a[1] + b[1]) / 2],
          b: [b[0] - U(60), (a[1] + b[1]) / 2],
          c: col,
          w: pwFor(6),
        });
      if (o.mark)
        objs.push({
          t: "text",
          x: a[0] + U(60),
          y: a[1] + U(60),
          s: o.mark,
          c: "#1d4ed8",
          size: Math.round(dimSize() * 0.9),
          ly: "notes",
        });
      objs.push(mkDim([a[0], a[1]], [b[0], a[1]], -dimSize() * 1.4));
    });
    objs.push(
      mkDim([x0, gy], [x0 + U(Lmm), gy], dimSize() * 2.6),
      mkDim([x0, gy - U(Hmm)], [x0, gy], dimSize() * 2.6),
    );
    objs.push({
      t: "text",
      x: x0,
      y: gy + dimSize() * 5,
      s: `Elevation of ${Math.round(Lmm)} mm wall, viewed from outside. Wall height ${Hmm} mm${ops.length ? ", openings from the plan" : ""}${sv.length ? " and heights from the door & window survey" : ""}.`,
      c: "#333333",
      size: Math.round(dimSize() * 0.8),
      ly: "notes",
    });
    objs.forEach((o) => Object.keys(o).forEach((k) => o[k] === undefined && delete o[k]));
    doc.pages[pg].objs = doc.objs;
    doc.pages.push({
      name: "Elevation " + (doc.pages.filter((p) => /^Elevation/.test(p.name || "")).length + 1),
      type: "Elevation",
      objs,
    });
    dirty = true;
    goPage(doc.pages.length - 1);
    toast(
      "Elevation drawn on a new page. Change the wall height in 🧮 Quantities if it isn't 2400.",
    );
  }
  /* check the drawing for common mistakes */
  function checkDlg() {
    const iss = [],
      objs = doc.objs,
      add = (lvl, txt, o) => iss.push({ lvl, txt, i: o ? objs.indexOf(o) : -1 });
    if (!doc.scale)
      add("⚠", "No scale is set, so sizes and dimensions can't be checked. Set one in 📐 Paper.");
    else {
      const walls = objs.filter(npIsWall);
      for (let i = 0; i < walls.length; i++)
        for (let j = i + 1; j < walls.length; j++) {
          const A = walls[i],
            B = walls[j];
          const L = lenOf(A.a, A.b) || 1,
            u = [(A.b[0] - A.a[0]) / L, (A.b[1] - A.a[1]) / L],
            n = [-u[1], u[0]];
          const pr = (p) => [
            (p[0] - A.a[0]) * u[0] + (p[1] - A.a[1]) * u[1],
            (p[0] - A.a[0]) * n[0] + (p[1] - A.a[1]) * n[1],
          ];
          const p1 = pr(B.a),
            p2 = pr(B.b);
          if (
            Math.abs(p1[1]) < npWallT(A, A.w || 6) / 2 &&
            Math.abs(p2[1]) < npWallT(A, A.w || 6) / 2
          ) {
            const ov2 = Math.min(L, Math.max(p1[0], p2[0])) - Math.max(0, Math.min(p1[0], p2[0]));
            if (realMm(ov2) > 50)
              add(
                "⚠",
                `Two walls overlap for ${Math.round(realMm(ov2))} mm. One may be drawn twice.`,
                B,
              );
          }
        }
      const ops = objs.filter(isOpening);
      ops.forEach((o) => {
        const r = wallOf(o),
          nm = o.mark || (o.k === "window" ? "A window" : "A door");
        if (!r) add("⚠", `${nm} isn't sitting on a wall.`, o);
        else if (r.t1 < -2 || r.t2 > r.L + 2) add("⚠", `${nm} runs past the end of its wall.`, o);
      });
      const drs = objs.filter((o) => isDoorK(o) && (o.k === "door" || o.k === "door2"));
      for (let i = 0; i < drs.length; i++)
        for (let j = i + 1; j < drs.length; j++) {
          const a = bbox(drs[i]),
            b = bbox(drs[j]);
          const ix = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]),
            iy = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
          if (ix > 2 && iy > 2)
            add(
              "⚠",
              `Doors ${drs[i].mark || ""} and ${drs[j].mark || ""} may swing into each other.`.replace(
                /\s+/g,
                " ",
              ),
              drs[j],
            );
        }
      const marks = {};
      objs.forEach((o) => {
        if (o.mark) {
          (marks[o.mark] = marks[o.mark] || []).push(o);
        }
      });
      Object.entries(marks).forEach(([m, l]) => {
        if (l.length > 1) add("⚠", `${m} is used ${l.length} times.`, l[1]);
      });
      const un =
        ops.filter((o) => !o.mark).length + objs.filter((o) => isBeam(o) && !o.mark).length;
      if (un)
        add(
          "ℹ",
          `${un} door${un === 1 ? "" : "s"}, window${un === 1 ? "" : "s"} or beam${un === 1 ? "" : "s"} not numbered yet. Use 🔢 Number.`,
        );
      beamRows().forEach((r) => {
        const nm = r.mark || "A steel beam";
        if (!r.sec) add("⚠", `${nm} has no section size yet.`, r.o);
        if (r.bear < 100)
          add(
            "⚠",
            `${nm} has only ${r.bear} mm bearing. Check the engineer's calcs (usually 100–150 mm minimum).`,
            r.o,
          );
        if (r.pad === "None") add("ℹ", `${nm} has no padstones.`, r.o);
      });
      const sv = surveyItems();
      if (sv.length)
        ops.forEach((o) => {
          if (!o.mark) return;
          const it = sv.find((x) => x.ref === o.mark);
          if (!it) return;
          const W = DWS.sizeOf(it).W,
            w = openW(o);
          if (Math.abs(W - w) > 25)
            add("⚠", `${o.mark} is drawn ${w} mm wide but the survey says ${W} mm.`, o);
        });
    }
    const d = document.createElement("div");
    d.className = "dimask";
    ov.appendChild(d);
    d.innerHTML = `<div class="dimbox qtybox"><b>✅ Drawing check · ${esc((doc.pages[pg] || {}).name || "this page")}</b>${iss.length ? `<div class="who">${iss.filter((x) => x.lvl === "⚠").length} to look at. Tap Show to pick the item.</div><div class="tablewrap"><table><tbody>${iss.map((x, k) => `<tr><td>${x.lvl}</td><td>${esc(x.txt)}</td><td>${x.i >= 0 ? `<button type="button" class="btn ck-go" data-k="${k}">Show</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : `<div class="nothing">✓ Nothing found. Walls, openings, numbers and beams all look right.</div>`}<div class="dimbtns"><button type="button" class="btn primary ck-x">Close</button></div></div>`;
    d.querySelector(".ck-x").onclick = () => d.remove();
    d.querySelectorAll(".ck-go").forEach(
      (b) =>
        (b.onclick = () => {
          const x = iss[+b.dataset.k];
          d.remove();
          tool = "move";
          ov.querySelectorAll(".np-t[data-t]").forEach((t) =>
            t.setAttribute("aria-pressed", String(t.dataset.t === "move")),
          );
          sel = x.i;
          draw();
          reveal();
        }),
    );
  }
  /* templates: reuse paper, scale, title box and layers (and the drawing if you want) from an earlier job */
  function tplDlg() {
    const d = document.createElement("div");
    d.className = "dimask";
    ov.appendChild(d);
    const render = () => {
      const L = (S.npTpls || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      d.innerHTML = `<div class="dimbox"><b>📑 Templates</b><div class="who">Save this drawing's paper, scale, title box and layers to reuse on the next job. You can include what's drawn too, e.g. a standard extension layout.</div>
       ${L.length ? `<div class="flabel">Use a template</div>${L.map((t) => `<div class="attrow"><button type="button" class="incrow tp-use" data-id="${esc(t.id)}"><span><b>${esc(t.name)}</b><br><span class="who">${esc(t.d.size || "")} · ${t.d.scale ? "1:" + t.d.scale : "no scale"}${t.withObjs ? " · includes the drawing" : ""}</span></span></button><button type="button" class="iconbtn tp-del" data-id="${esc(t.id)}" aria-label="Delete template" style="color:var(--danger)">🗑</button></div>`).join("")}` : '<div class="nothing">No templates yet.</div>'}
       <div class="flabel">Save this drawing as a template</div><label>Template name<input class="tp-n" maxlength="60" placeholder="e.g. Single storey extension A3 1:50" value="${esc(q(".np-title").value.trim())}"></label><label class="inl" style="margin-top:6px"><input type="checkbox" class="tp-o"> Include what's drawn (photos and imports are left out)</label>
       <div class="dimbtns"><button type="button" class="btn tp-x">Close</button><button type="button" class="btn primary tp-save">Save template</button></div></div>`;
      d.querySelector(".tp-x").onclick = () => d.remove();
      d.querySelector(".tp-save").onclick = async () => {
        const name = d.querySelector(".tp-n").value.trim();
        if (!name) {
          toast("Give the template a name");
          return;
        }
        const wo = d.querySelector(".tp-o").checked;
        doc.pages[pg].objs = doc.objs;
        const keep = (o) => o.t !== "img";
        const tp = {
          kind: "nptpl",
          name,
          created: Date.now(),
          withObjs: wo,
          d: {
            size: doc.size,
            orient: doc.orient,
            scale: doc.scale,
            paper: doc.paper,
            w: doc.w,
            h: doc.h,
            wallH: doc.wallH || 0,
            layers: doc.layers || null,
            info: { show: !!(doc.info && doc.info.show), by: (doc.info || {}).by || "" },
            pages: doc.pages.map((p) => ({
              name: p.name,
              type: p.type || "",
              objs: wo ? JSON.parse(JSON.stringify(p.objs.filter(keep))) : [],
            })),
          },
        };
        const js = JSON.stringify(tp);
        if (js.length > 700000) {
          toast("That drawing is too big to save as a template. Try without the drawing.");
          return;
        }
        try {
          const id = "tpl-" + newId();
          await S.db.doc("todos/" + id).set(JSON.parse(js));
          S.npTpls = (S.npTpls || []).concat([Object.assign({ id }, tp)]);
          toast("Template saved");
          render();
        } catch (e) {
          toast("Couldn't save the template");
        }
      };
      d.querySelectorAll(".tp-del").forEach(
        (b) =>
          (b.onclick = async () => {
            if (b.dataset.armed !== "1") {
              b.dataset.armed = "1";
              b.textContent = "Sure?";
              b.style.width = "auto";
              return;
            }
            try {
              await S.db.doc("todos/" + b.dataset.id).delete();
              S.npTpls = (S.npTpls || []).filter((x) => x.id !== b.dataset.id);
              render();
            } catch (e) {
              toast("Couldn't delete");
            }
          }),
      );
      d.querySelectorAll(".tp-use").forEach(
        (b) =>
          (b.onclick = () => {
            const t = (S.npTpls || []).find((x) => x.id === b.dataset.id);
            if (!t) return;
            const empty = doc.pages.every(
              (p) => (p === doc.pages[pg] ? doc.objs : p.objs).length === 0,
            );
            const apply = (replace) => {
              snap();
              const D = t.d;
              Object.assign(doc, {
                size: D.size,
                orient: D.orient,
                scale: D.scale,
                paper: D.paper,
                w: D.w,
                h: D.h,
              });
              if (D.wallH) doc.wallH = D.wallH;
              if (D.layers) doc.layers = JSON.parse(JSON.stringify(D.layers));
              doc.info = Object.assign(doc.info || {}, D.info);
              if (t.withObjs) {
                const pages = D.pages.map((p) => ({
                  name: p.name,
                  type: p.type,
                  objs: JSON.parse(JSON.stringify(p.objs)),
                }));
                if (replace) {
                  doc.pages = pages;
                  pg = 0;
                  doc.objs = doc.pages[0].objs;
                } else {
                  doc.pages[pg].objs = doc.objs;
                  doc.pages.push(...pages);
                }
              }
              dirty = true;
              d.remove();
              size();
              fit();
              drawPages();
              draw();
              toast("Template applied: " + t.name);
            };
            if (empty || !t.withObjs) {
              apply(true);
              return;
            }
            d.innerHTML = `<div class="dimbox"><b>Use “${esc(t.name)}”</b><div class="who">This drawing already has things on it.</div><div class="dimbtns" style="flex-direction:column;align-items:stretch"><button type="button" class="btn primary tp-add">Add the template's pages after mine</button><button type="button" class="btn tp-rep" style="color:var(--danger)">Replace my drawing with the template</button><button type="button" class="btn tp-c">Cancel</button></div></div>`;
            d.querySelector(".tp-add").onclick = () => apply(false);
            d.querySelector(".tp-rep").onclick = () => apply(true);
            d.querySelector(".tp-c").onclick = () => render();
          }),
      );
    };
    render();
  }
  {
    const bb = q(".np-build");
    if (bb)
      bb.addEventListener("click", (e) => {
        const b = e.target.closest("[data-bt]");
        if (!b) return;
        const a = b.dataset.bt;
        if (a === "beam") {
          pickShape("beam");
          toast(
            "Draw the beam from one bearing to the other. Then 📋 Schedules to pick its size and padstones.",
          );
        } else if (a === "dimall") {
          const any = doc.objs.some((x) => x.t === "dim" && x.allW);
          if (!any) dimAllWalls(false);
          else {
            const d = document.createElement("div");
            d.className = "dimask";
            ov.appendChild(d);
            d.innerHTML = `<div class="dimbox"><b>📏 Wall dimensions</b><div class="dimbtns" style="flex-direction:column;align-items:stretch"><button type="button" class="btn primary da-add">Add to walls that haven't got any</button><button type="button" class="btn da-rem">Take all automatic wall dimensions off</button><button type="button" class="btn da-x">Cancel</button></div></div>`;
            d.querySelector(".da-add").onclick = () => {
              d.remove();
              dimAllWalls(false);
            };
            d.querySelector(".da-rem").onclick = () => {
              d.remove();
              dimAllWalls(true);
            };
            d.querySelector(".da-x").onclick = () => d.remove();
          }
        } else if (a === "num") {
          const any = doc.objs.some((x) => x.mark);
          if (!any) numberAll(false);
          else {
            const d = document.createElement("div");
            d.className = "dimask";
            ov.appendChild(d);
            d.innerHTML = `<div class="dimbox"><b>🔢 Numbers</b><div class="who">Windows W1, W2… doors D1, D2… steel beams B1, B2…, top to bottom, left to right.</div><div class="dimbtns" style="flex-direction:column;align-items:stretch"><button type="button" class="btn primary nm-new">Number the new ones only</button><button type="button" class="btn nm-all">Renumber everything</button><button type="button" class="btn nm-off">Take the numbers off</button><button type="button" class="btn nm-x">Cancel</button></div></div>`;
            d.querySelector(".nm-new").onclick = () => {
              d.remove();
              numberAll(false);
            };
            d.querySelector(".nm-all").onclick = () => {
              d.remove();
              numberAll(true);
            };
            d.querySelector(".nm-off").onclick = () => {
              d.remove();
              snap();
              doc.objs.forEach((o) => delete o.mark);
              dirty = true;
              draw();
            };
            d.querySelector(".nm-x").onclick = () => d.remove();
          }
        } else if (a === "sched") schedDlg();
        else if (a === "grid") gridDlg();
        else if (a === "elev") elevFromWall();
        else if (a === "check") checkDlg();
        else if (a === "tpl") tplDlg();
        else if (a === "rev") q(".np-info").click();
      });
  }

  /* type an exact length and angle straight after drawing a line or wall */
  let lenObj = null;
  const lb = q(".np-lenbar");
  function showLenBar(o) {
    if (!doc.scale || !o || !o.a || !o.b) {
      lb.hidden = true;
      return;
    }
    lenObj = o;
    const L = realMm(lenOf(o.a, o.b));
    let an = (Math.atan2(-(o.b[1] - o.a[1]), o.b[0] - o.a[0]) * 180) / Math.PI;
    if (an < 0) an += 360;
    lb.querySelector(".nlb-l").value = Math.round(L);
    lb.querySelector(".nlb-a").value = Math.round(an * 10) / 10;
    lb.hidden = false;
  }
  lb.querySelector(".nlb-x").onclick = () => {
    lb.hidden = true;
    lenObj = null;
  };
  lb.onsubmit = (e) => {
    e.preventDefault();
    const o = lenObj;
    if (!o || doc.objs.indexOf(o) < 0) {
      lb.hidden = true;
      return;
    }
    const L = parseFloat(lb.querySelector(".nlb-l").value),
      A = parseFloat(lb.querySelector(".nlb-a").value);
    if (!(L > 0)) return;
    snap();
    const r = ((A || 0) * Math.PI) / 180;
    const U = toUnits(L);
    o.b = [o.a[0] + Math.cos(r) * U, o.a[1] - Math.sin(r) * U];
    if (npIsWall(o)) {
      weldWall(o);
      orientCavity(o);
    }
    dirty = true;
    draw();
    lb.hidden = true;
    toast("Set to " + npFmtLen(L));
  };
  /* CAD drafting: wall runs, trim, extend, corner and offset */
  let pwk = "wall";
  q(".np-pwk").onchange = (e) => {
    pwk = e.target.value;
  };
  function addRun(a, b) {
    snap();
    let o;
    if (pwk === "line") o = { t: "line", a: a.slice(), b: b.slice(), c: col, w: pwFor(wid) };
    else {
      o = { t: "shape", k: pwk, a: a.slice(), b: b.slice(), c: col, w: pwFor(wid) };
      if (doc.scale)
        o.th = Math.max(
          6,
          toUnits(pwk === "cavity" ? 350 : pwk === "tstud" ? lastStud.sd || 100 : 100),
        );
      if (pwk === "tstud") {
        o.sd = lastStud.sd || 100;
        o.cc = lastStud.cc || 400;
      }
    }
    doc.objs.push(o);
    if (npIsWall(o)) {
      weldWall(o);
      orientCavity(o);
    }
    dirty = true;
  }
  q(".np-pwclose").onclick = () => {
    if (chain.length < 3) return;
    addRun(chain[chain.length - 1], chain[0]);
    chain = [];
    chainUI();
    draw();
    toast("Closed up");
  };
  const isSegObj = (o) =>
    o &&
    o.a &&
    o.b &&
    !npBoxy(o) &&
    o.t !== "dim" &&
    o.t !== "ang" &&
    o.t !== "rect" &&
    o.t !== "circle" &&
    !(o.t === "shape" && (NP_OPENK.has(o.k) || o.k === "door"));
  function allSegs(skip) {
    const out = [];
    doc.objs.forEach((o, i) => {
      if (i === skip || (doc.layers && lyHid(o))) return;
      if (o.t === "room") {
        o.p.forEach((q2, k) => out.push([q2, o.p[(k + 1) % o.p.length]]));
        return;
      }
      if (o.t === "rect" || (npBoxy(o) && o.t === "shape" && !NP_OPENK.has(o.k))) {
        if (o.t !== "rect") return;
        const [x, y, w, h] = baseBox(o),
          c = [x + w / 2, y + h / 2],
          r = o.r || 0;
        const cs = [
          [x, y],
          [x + w, y],
          [x + w, y + h],
          [x, y + h],
        ].map((q2) => rot(q2, c, r));
        cs.forEach((q2, k) => out.push([q2, cs[(k + 1) % 4]]));
        return;
      }
      if (isSegObj(o)) out.push([o.a, o.b]);
    });
    return out;
  }
  const segX = (a, b, c, d) => {
    const d1 = [b[0] - a[0], b[1] - a[1]],
      d2 = [d[0] - c[0], d[1] - c[1]];
    const den = d1[0] * d2[1] - d1[1] * d2[0];
    if (Math.abs(den) < 1e-9) return null;
    const r = [c[0] - a[0], c[1] - a[1]];
    return { t: (r[0] * d2[1] - r[1] * d2[0]) / den, u: (r[0] * d1[1] - r[1] * d1[0]) / den };
  };
  function trimAt(i, p) {
    const o = doc.objs[i];
    const d = [o.b[0] - o.a[0], o.b[1] - o.a[1]],
      L2 = d[0] * d[0] + d[1] * d[1] || 1;
    const tp = ((p[0] - o.a[0]) * d[0] + (p[1] - o.a[1]) * d[1]) / L2;
    const ts = allSegs(i)
      .map(([c, e]) => segX(o.a, o.b, c, e))
      .filter((x) => x && x.t > 0.001 && x.t < 0.999 && x.u >= -0.001 && x.u <= 1.001)
      .map((x) => x.t)
      .sort((x, y) => x - y);
    if (!ts.length) {
      toast("Nothing crosses it there. Use 🗑 Delete to remove the whole line");
      return;
    }
    let lo = 0,
      hi = 1;
    ts.forEach((t) => {
      if (t < tp) lo = t;
      else if (t > tp && hi === 1) hi = t;
    });
    const P = (t) => [o.a[0] + d[0] * t, o.a[1] + d[1] * t];
    snap();
    if (lo === 0 && hi === 1) {
      toast("Nothing crosses it");
      undo.pop();
      return;
    }
    if (lo === 0) o.a = P(hi);
    else if (hi === 1) o.b = P(lo);
    else {
      const c2 = JSON.parse(JSON.stringify(o));
      o.b = P(lo);
      c2.a = P(hi);
      delete c2.gid;
      doc.objs.push(c2);
    }
    dirty = true;
    draw();
    toast("Trimmed");
  }
  function extendAt(i, p) {
    const o = doc.objs[i];
    const endA = lenOf(p, o.a) < lenOf(p, o.b);
    const from = endA ? o.a : o.b,
      other = endA ? o.b : o.a;
    const d = [from[0] - other[0], from[1] - other[1]];
    const L = Math.hypot(d[0], d[1]) || 1;
    const u = [d[0] / L, d[1] / L];
    let best = Infinity,
      bp = null;
    allSegs(i).forEach(([c, e]) => {
      const x = segX(from, [from[0] + u[0], from[1] + u[1]], c, e);
      if (!x || x.u < -0.001 || x.u > 1.001 || x.t <= 1e-6) return;
      const wallX = npIsWall(o) ? 0 : 0;
      if (x.t < best) {
        best = x.t;
        bp = [from[0] + u[0] * x.t, from[1] + u[1] * x.t];
      }
    });
    if (!bp) {
      toast("Nothing to stretch to in that direction");
      return;
    }
    snap();
    if (endA) o.a = bp;
    else o.b = bp;
    if (npIsWall(o)) {
      weldWall(o);
      orientCavity(o);
    }
    dirty = true;
    draw();
    toast("Extended " + (doc.scale ? npFmtLen(realMm(best)) : ""));
  }
  function cornerJoin(i, p, j, q2) {
    const A = doc.objs[i],
      B = doc.objs[j];
    const x = segX(A.a, A.b, B.a, B.b);
    if (!x) {
      toast("Those two are parallel, so they can't meet");
      return;
    }
    const P = [A.a[0] + (A.b[0] - A.a[0]) * x.t, A.a[1] + (A.b[1] - A.a[1]) * x.t];
    snap();
    const keep = (o, tap) => {
      const da = lenOf(tap, o.a),
        db = lenOf(tap, o.b);
      /* keep the end the user tapped near, move the other to the corner */ const sa =
        (P[0] - o.a[0]) * (o.b[0] - o.a[0]) + (P[1] - o.a[1]) * (o.b[1] - o.a[1]);
      const tParam = sa / ((o.b[0] - o.a[0]) ** 2 + (o.b[1] - o.a[1]) ** 2 || 1);
      if (tParam <= 0) o.a = P.slice();
      else if (tParam >= 1) o.b = P.slice();
      else {
        const tTap =
          ((tap[0] - o.a[0]) * (o.b[0] - o.a[0]) + (tap[1] - o.a[1]) * (o.b[1] - o.a[1])) /
          ((o.b[0] - o.a[0]) ** 2 + (o.b[1] - o.a[1]) ** 2 || 1);
        if (tTap < tParam) o.b = P.slice();
        else o.a = P.slice();
      }
    };
    keep(A, p);
    keep(B, q2);
    [A, B].forEach((o) => {
      if (npIsWall(o)) {
        weldWall(o);
        orientCavity(o);
      }
    });
    dirty = true;
    draw();
    toast("Corner made");
  }
  function offsetDlg(o) {
    const d = document.createElement("div");
    d.className = "dimask";
    d.innerHTML = `<form class="dimbox"><b>⇉ Offset</b><div class="who">Makes a copy a set distance away, parallel to it.</div><label>Distance (${doc.scale ? "mm, real" : "mm on paper"})<input class="ofd" type="number" inputmode="decimal" value="${doc.scale ? 600 : 10}"></label>
      <div class="seg ofs"><button type="button" data-s="1" aria-pressed="true">${o.t === "rect" || o.t === "room" ? "Outside" : "Side A ↑"}</button><button type="button" data-s="-1" aria-pressed="false">${o.t === "rect" || o.t === "room" ? "Inside" : "Side B ↓"}</button></div>
      <div class="dimbtns"><button type="button" class="btn ofx">Cancel</button><button type="submit" class="btn primary">Make copy</button></div></form>`;
    ov.appendChild(d);
    let side = 1;
    d.querySelectorAll(".ofs button").forEach(
      (b) =>
        (b.onclick = () => {
          side = +b.dataset.s;
          d.querySelectorAll(".ofs button").forEach((x) =>
            x.setAttribute("aria-pressed", String(x === b)),
          );
        }),
    );
    d.querySelector(".ofx").onclick = () => d.remove();
    d.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      const v = parseFloat(d.querySelector(".ofd").value);
      if (!(v > 0)) return;
      d.remove();
      const D = doc.scale ? toUnits(v) : v * NP_U;
      snap();
      const c = JSON.parse(JSON.stringify(o));
      delete c.gid;
      delete c.lk;
      if (c.a && c.b && !npBoxy(c) && c.t !== "rect") {
        const n = dimN(c);
        c.a = [c.a[0] + n[0] * D * side, c.a[1] + n[1] * D * side];
        c.b = [c.b[0] + n[0] * D * side, c.b[1] + n[1] * D * side];
      } else if (c.t === "rect") {
        const k = D * side;
        c.a = [Math.min(o.a[0], o.b[0]) - k, Math.min(o.a[1], o.b[1]) - k];
        c.b = [Math.max(o.a[0], o.b[0]) + k, Math.max(o.a[1], o.b[1]) + k];
      } else if (c.t === "room") {
        const P = o.p,
          n = P.length;
        let ar = 0;
        for (let k = 0; k < n; k++) {
          const q2 = P[k],
            r = P[(k + 1) % n];
          ar += q2[0] * r[1] - r[0] * q2[1];
        }
        const cw = ar > 0 ? 1 : -1;
        const k = D * side * cw;
        const lines = P.map((q2, m) => {
          const r = P[(m + 1) % n];
          const dx = r[0] - q2[0],
            dy = r[1] - q2[1],
            L = Math.hypot(dx, dy) || 1;
          const nn = [dy / L, -dx / L];
          return [
            [q2[0] + nn[0] * k, q2[1] + nn[1] * k],
            [r[0] + nn[0] * k, r[1] + nn[1] * k],
          ];
        });
        c.p = lines.map((ln, m) => {
          const pv = lines[(m - 1 + n) % n];
          const x = segX(pv[0], pv[1], ln[0], ln[1]);
          return x
            ? [pv[0][0] + (pv[1][0] - pv[0][0]) * x.t, pv[0][1] + (pv[1][1] - pv[0][1]) * x.t]
            : ln[0];
        });
        c.name = (o.name || "Room") + " (offset)";
      }
      if (c.t === "room") doc.objs.unshift(c);
      else doc.objs.push(c);
      if (npIsWall(c)) {
        weldWall(c);
        orientCavity(c);
      }
      dirty = true;
      draw();
      toast("Offset copy made");
    };
  }
  /* chain dimensions, angle dimensions and "dimension it" */
  const dimSize = () =>
    sized() ? Math.max(14, Math.round(Math.min(40, 22 / s))) : Math.round(26 / s);
  const mkDim = (a, b, off, extra) =>
    Object.assign(
      {
        t: "dim",
        a,
        b,
        c: "#e11d2a",
        w: Math.max(pwFor(wid), sized() ? 2 : pwFor(wid)),
        size: dimSize(),
        s: doc.scale ? Math.round(realMm(lenOf(a, b)) / 5) * 5 + " mm" : "",
      },
      doc.scale ? { auto: true } : {},
      off ? { off } : {},
      dimTk ? { tk: 1 } : {},
      extra || {},
    );
  function chainUI() {
    const cb = q(".np-chainbar");
    {
      const pv = tool === "pave" || tool === "pstrip";
      q(".np-pvbox").hidden = !pv;
      if (pv) {
        q(".np-pvm").value = paveMat;
        q(".np-pvwl").hidden = tool !== "pstrip";
        q(".np-pvside").hidden = tool !== "pstrip";
        q(".np-pvnew").hidden = !(tool === "pstrip" && chain.length === 1 && lastStripEnd);
        q(".np-pwk").hidden = true;
        q(".np-pwclose").hidden = true;
        q(".np-pwlen").hidden = true;
        cb.hidden = false;
        q(".np-chaintxt").textContent =
          tool === "pave"
            ? chain.length < 3
              ? `Tap each corner of the patio / drive (${chain.length})`
              : `${chain.length} corners · tap the first corner or Finish`
            : !chain.length
              ? "Tap along the building edge where the path starts"
              : `Tap the next corner along the building (${chain.length} points) · then Finish`;
        q(".np-chainok").hidden = chain.length < (tool === "pave" ? 3 : 2);
        q(".np-chainok").textContent = "✓ Finish";
        return;
      }
    }
    q(".np-pwk").hidden = tool !== "pwall";
    q(".np-pwclose").hidden = !(tool === "pwall" && chain.length > 2);
    if (tool === "pwall") {
      cb.hidden = false;
      q(".np-pwlen").hidden = !(chain.length && doc.scale);
      q(".np-chaintxt").textContent = chain.length
        ? doc.scale
          ? `Tap the next corner, or type the length and tap a direction (${Math.max(0, chain.length - 1)} drawn)`
          : `Tap the next corner (${Math.max(0, chain.length - 1)} drawn)`
        : "Tap where the wall starts";
      q(".np-chainok").hidden = !chain.length;
      q(".np-chainok").textContent = "✓ Done";
      return;
    }
    q(".np-chainok").textContent = "✓ Finish";
    if (tool === "room" && chain.length) {
      cb.hidden = false;
      q(".np-chaintxt").textContent =
        chain.length < 3
          ? "Tap each corner of the room"
          : `${chain.length} corners · tap the first corner or Finish`;
      q(".np-chainok").hidden = chain.length < 3;
      return;
    }
    if (tool === "dimc" && chain.length) {
      cb.hidden = false;
      q(".np-chaintxt").textContent =
        chain.length < 2
          ? "Tap the next point along"
          : `${chain.length} points · tap more, then Finish`;
      q(".np-chainok").hidden = chain.length < 2;
    } else if (tool === "dima" && chain.length) {
      cb.hidden = false;
      q(".np-chaintxt").textContent =
        chain.length === 1 ? "Tap a point on the first line" : "Tap a point on the second line";
      q(".np-chainok").hidden = true;
    } else cb.hidden = true;
  }
  q(".np-chainx").onclick = () => {
    chain = [];
    chainUI();
    draw();
  };
  /* type the next wall's length: a direction button, or an angle (0 = right, 90 = up) */
  {
    let lastDir = 0;
    const addTyped = (an) => {
      const L = parseFloat(String(q(".np-pwl").value).replace(",", "."));
      if (!(L > 0)) {
        toast("Type the length in mm first");
        q(".np-pwl").focus();
        return;
      }
      if (!chain.length) return;
      const a = chain[chain.length - 1];
      const r = (an * Math.PI) / 180;
      const b = [a[0] + Math.cos(r) * toUnits(L), a[1] - Math.sin(r) * toUnits(L)];
      addRun(a, b);
      chain.push(b);
      lastDir = an;
      q(".np-pwl").value = "";
      q(".np-pwa").value = "";
      chainUI();
      draw();
      q(".np-pwl").focus();
      toast(L + " mm wall added");
    };
    ov.querySelectorAll(".np-pwd").forEach(
      (b) => (b.onclick = () => addTyped({ r: 0, u: 90, l: 180, d: 270 }[b.dataset.d])),
    );
    q(".np-pwlen").onsubmit = (e) => {
      e.preventDefault();
      const av = q(".np-pwa").value.trim();
      addTyped(av !== "" && isFinite(+av) ? +av : lastDir);
    };
  }
  q(".np-pvm").onchange = (e) => {
    paveMat = e.target.value;
    try {
      localStorage.setItem("np.pave", paveMat);
    } catch (x) {}
  };
  q(".np-pvw").onchange = (e) => {
    const v = +e.target.value;
    if (v > 0) {
      paveW = v;
      draw();
    }
  };
  q(".np-pvside").onclick = () => {
    paveSide = -paveSide;
    draw();
  };
  q(".np-pvnew").onclick = () => {
    chain = [];
    lastStripEnd = null;
    chainUI();
    draw();
  };
  q(".np-chainok").onclick = () => {
    if (tool === "pave" || tool === "pstrip") {
      finishPave();
      return;
    }
    if (tool === "pwall") {
      chain = [];
      chainUI();
      draw();
      return;
    }
    if (tool === "room") {
      finishRoom();
      return;
    }
    if (chain.length < 2) return;
    if (!doc.scale) toast("Tip: set a scale in 📐 Paper and dimensions measure themselves");
    snap();
    let pts = chain.slice();
    const d0 = [pts[pts.length - 1][0] - pts[0][0], pts[pts.length - 1][1] - pts[0][1]];
    if (d0[0] < -1e-6 || (Math.abs(d0[0]) < 1e-6 && d0[1] < 0)) pts.reverse();
    const gid = "g" + Date.now().toString(36);
    for (let i = 1; i < pts.length; i++) {
      if (lenOf(pts[i - 1], pts[i]) > 1) doc.objs.push(mkDim(pts[i - 1], pts[i], 0, { gid }));
    }
    if (pts.length > 2)
      doc.objs.push(mkDim(pts[0], pts[pts.length - 1], -dimSize() * 2.6, { gid }));
    chain = [];
    chainUI();
    dirty = true;
    draw();
    toast(pts.length > 2 ? "Chain and overall dimensions added (grouped)" : "Dimension added");
  };
  /* blockwork wall: height snaps to whole 225 mm courses above a 300 mm footing, length to whole half blocks */
  function blockSnap(o) {
    if (!doc.scale || !o.a || !o.b) return;
    const yb = Math.max(o.a[1], o.b[1]),
      xl = Math.min(o.a[0], o.b[0]);
    const Hm = realMm(Math.abs(o.b[1] - o.a[1])),
      Wm = realMm(Math.abs(o.b[0] - o.a[0]));
    const U2 = npUnit(o),
      CP = U2.H + U2.J,
      HB = (U2.L + U2.J) / 2;
    const F = Math.min(300, Hm * 0.25);
    const n = Math.max(1, Math.round((Hm - F) / CP));
    const H2 = F + n * CP;
    const W2 = Math.max(HB * 2, Math.round(Wm / HB) * HB);
    o.a = [xl, yb - toUnits(H2)];
    o.b = [xl + toUnits(W2), yb];
    if (!o._tip && typeof toast === "function") {
      toast(
        `${n} courses = ${Math.round(n * CP).toLocaleString("en-GB")} mm. Drag the white dot to make it taller or shorter`,
      );
    }
  }
  let lastPlace = null,
    downXY = [0, 0];
  const NP_MOVEK = new Set(["move", "mmove", "resize", "end", "rot", "lrot", "off", "bend", "tip"]);
  const hasDims = (o) => !!(o && o.dimg && doc.objs.some((d) => d.t === "dim" && d.of === o.dimg));
  function autoDim(o) {
    if (hasDims(o)) {
      snap();
      const n0 = doc.objs.length;
      setObjs(doc.objs.filter((d) => !(d.t === "dim" && d.of === o.dimg)));
      const n = n0 - doc.objs.length;
      delete o.dimg;
      sel = doc.objs.indexOf(o);
      if (sel < 0) sel = null;
      dirty = true;
      draw();
      toast(n + " dimension" + (n === 1 ? "" : "s") + " taken off");
      return;
    }
    if (!doc.scale) {
      toast("Set a scale in 📐 Paper first, so it knows the real sizes");
      return;
    }
    snap();
    const sz = dimSize(),
      add = [];
    o.dimg = o.dimg || "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    if (o.t === "circle") {
      const c = [(o.a[0] + o.b[0]) / 2, (o.a[1] + o.b[1]) / 2],
        r = Math.abs(o.b[0] - o.a[0]) / 2;
      const a = [c[0] - r, c[1]],
        b = [c[0] + r, c[1]];
      add.push(
        mkDim(a, b, 0, { auto: undefined, s: "Ø " + Math.round(realMm(2 * r) / 5) * 5 + " mm" }),
      );
    } else if (npBoxy(o)) {
      const [x, y, w, h] = baseBox(o),
        c = [x + w / 2, y + h / 2],
        r = o.r || 0;
      const TL = rot([x, y], c, r),
        TR = rot([x + w, y], c, r),
        BR = rot([x + w, y + h], c, r);
      add.push(mkDim(TL, TR, -sz * 2.2), mkDim(TR, BR, -sz * 2.2));
    } else if (o.a && o.b) {
      const off = -((o.th || o.w || 6) / 2 + sz * 2);
      add.push(mkDim(o.a.slice(), o.b.slice(), off));
      if (o.th && npIsWall(o)) {
        const n = dimN(o),
          m = [(o.a[0] + o.b[0]) / 2, (o.a[1] + o.b[1]) / 2];
        const p1 = [m[0] - (n[0] * o.th) / 2, m[1] - (n[1] * o.th) / 2],
          p2 = [m[0] + (n[0] * o.th) / 2, m[1] + (n[1] * o.th) / 2];
        add.push(mkDim(p1, p2, 0, { size: Math.round(sz * 0.8) }));
      }
    }
    add.forEach((d) => {
      Object.keys(d).forEach((k) => d[k] === undefined && delete d[k]);
      d.of = o.dimg;
      doc.objs.push(d);
    });
    dirty = true;
    draw();
    toast(
      add.length
        ? "Dimensions added. Drag the round handle on a dimension to move it out"
        : "Nothing to dimension",
    );
  }
  /* several things at once: turn, mirror, align, group, lock, copy */
  const cOf = (o) => {
    const b = baseBox(o);
    return [b[0] + b[2] / 2, b[1] + b[3] / 2];
  };
  function grpBox(js) {
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9;
    js.forEach((j) => {
      const b = bbox(doc.objs[j]);
      x0 = Math.min(x0, b[0]);
      y0 = Math.min(y0, b[1]);
      x1 = Math.max(x1, b[0] + b[2]);
      y1 = Math.max(y1, b[1] + b[3]);
    });
    return [x0, y0, x1, y1];
  }
  function turnAbout(o, gc, th) {
    if (npBoxy(o)) {
      const c = cOf(o),
        c2 = rot(c, gc, th);
      moveObj(o, c2[0] - c[0], c2[1] - c[1]);
      o.r = ((((o.r || 0) + th) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (Math.abs(o.r) < 1e-6 || Math.abs(o.r - 2 * Math.PI) < 1e-6) o.r = 0;
    } else if (o.p) o.p = o.p.map((q) => rot(q, gc, th));
    else if (o.a && o.b) {
      o.a = rot(o.a, gc, th);
      o.b = rot(o.b, gc, th);
      if (o.v) o.v = rot(o.v, gc, th);
    }
  }
  function mirAbout(o, gc, vert) {
    const m = (q) => (vert ? [q[0], 2 * gc[1] - q[1]] : [2 * gc[0] - q[0], q[1]]);
    if (npBoxy(o)) {
      const c = cOf(o),
        c2 = m(c);
      moveObj(o, c2[0] - c[0], c2[1] - c[1]);
      if (o.t !== "text") {
        o.fl = !o.fl;
        if (!o.fl) delete o.fl;
        let r = o.r || 0;
        r = vert ? Math.PI - r : -r;
        o.r = ((r % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (Math.abs(o.r) < 1e-6 || Math.abs(o.r - 2 * Math.PI) < 1e-6) o.r = 0;
        if (vert && !o.r && false) o.r = 0;
      }
    } else if (o.p) o.p = o.p.map(m);
    else if (o.a && o.b) {
      o.a = m(o.a);
      o.b = m(o.b);
      if (o.v) o.v = m(o.v);
      if (o.t === "dim" && o.off) o.off = -o.off;
      if (npLineShape(o)) {
        o.fl = !o.fl;
        if (!o.fl) delete o.fl;
      }
    }
  }
  function alignPick() {
    const d = document.createElement("div");
    d.className = "dimask";
    const opts2 = [
      ["l", "⇤ Left edges"],
      ["cx", "↔ Centres (side to side)"],
      ["r", "⇥ Right edges"],
      ["t", "⤒ Tops"],
      ["cy", "↕ Middles (up and down)"],
      ["b", "⤓ Bottoms"],
      ["dh", "⋯ Space evenly across"],
      ["dv", "⋮ Space evenly down"],
    ];
    d.innerHTML = `<div class="dimbox"><b>⫷ Line them up</b><div class="seg" style="flex-direction:column">${opts2.map(([k, l]) => `<button type="button" data-k="${k}">${l}</button>`).join("")}</div><div class="dimbtns"><button type="button" class="btn apx2">Cancel</button></div></div>`;
    ov.appendChild(d);
    d.querySelector(".apx2").onclick = () => d.remove();
    d.querySelectorAll("[data-k]").forEach(
      (b) =>
        (b.onclick = () => {
          d.remove();
          const k = b.dataset.k;
          const js = [...msel];
          if (js.length < 2) return;
          snap();
          const [x0, y0, x1, y1] = grpBox(js);
          if (k === "dh" || k === "dv") {
            const ax = k === "dh" ? 0 : 1;
            const arr = js
              .map((j) => {
                const bb = bbox(doc.objs[j]);
                return { j, c: bb[ax] + bb[ax + 2] / 2 };
              })
              .sort((a, b2) => a.c - b2.c);
            const lo = arr[0].c,
              hi = arr[arr.length - 1].c;
            arr.forEach((it, n) => {
              const t = lo + ((hi - lo) * n) / (arr.length - 1);
              moveObj(doc.objs[it.j], ax ? 0 : t - it.c, ax ? t - it.c : 0);
            });
          } else
            js.forEach((j) => {
              const o = doc.objs[j];
              const bb = bbox(o);
              let dx = 0,
                dy = 0;
              if (k === "l") dx = x0 - bb[0];
              if (k === "r") dx = x1 - (bb[0] + bb[2]);
              if (k === "cx") dx = (x0 + x1) / 2 - (bb[0] + bb[2] / 2);
              if (k === "t") dy = y0 - bb[1];
              if (k === "b") dy = y1 - (bb[1] + bb[3]);
              if (k === "cy") dy = (y0 + y1) / 2 - (bb[1] + bb[3] / 2);
              moveObj(o, dx, dy);
            });
          dirty = true;
          draw();
          toast("Lined up");
        }),
    );
  }
  ov.querySelectorAll(".np-mb").forEach(
    (b) =>
      (b.onclick = () => {
        const js = [...msel].filter((j) => doc.objs[j]);
        if (!js.length) return;
        const m = b.dataset.m;
        const objs = js.map((j) => doc.objs[j]);
        if (m === "done") {
          msel.clear();
          draw();
          return;
        }
        if (m === "align") {
          alignPick();
          return;
        }
        snap();
        const [x0, y0, x1, y1] = grpBox(js),
          gc = [(x0 + x1) / 2, (y0 + y1) / 2];
        if (m === "del") {
          const keep = doc.objs.filter((o, j) => !msel.has(j));
          setObjs(keep);
          toast(js.length + " deleted");
        } else if (m === "rot") objs.forEach((o) => turnAbout(o, gc, Math.PI / 2));
        else if (m === "mirh" || m === "mirv") objs.forEach((o) => mirAbout(o, gc, m === "mirv"));
        else if (m === "copy") {
          const d = snapOn ? 50 : 30 / s;
          const ng =
            js.length > 1 && objs.every((o) => o.gid && o.gid === objs[0].gid)
              ? "g" + Date.now().toString(36)
              : null;
          msel.clear();
          objs.forEach((o) => {
            const c = JSON.parse(JSON.stringify(o));
            moveObj(c, d, d);
            if (c.gid) c.gid = ng || undefined;
            if (!c.gid) delete c.gid;
            delete c.lk;
            doc.objs.push(c);
            msel.add(doc.objs.length - 1);
          });
          toast("Copied. Drag one of them to move them all");
        } else if (m === "group") {
          const grouped = objs.every((o) => o.gid && o.gid === objs[0].gid);
          if (grouped) {
            objs.forEach((o) => delete o.gid);
            toast("Ungrouped");
          } else {
            const gid = "g" + Date.now().toString(36);
            objs.forEach((o) => (o.gid = gid));
            toast("Grouped: tap any of them to move them together");
          }
        } else if (m === "lock") {
          const all = objs.every((o) => o.lk);
          objs.forEach((o) => {
            if (all) delete o.lk;
            else o.lk = true;
          });
          toast(all ? "🔓 Unlocked" : "🔒 Locked");
        }
        dirty = true;
        draw();
      }),
  );
  function turnObj(o, deg) {
    const r = (deg * Math.PI) / 180;
    if (npBoxy(o)) {
      o.r = ((((o.r || 0) + r) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (Math.abs(o.r) < 1e-6 || Math.abs(o.r - 2 * Math.PI) < 1e-6) o.r = 0;
    } else if (o.a && o.b) {
      const c = [(o.a[0] + o.b[0]) / 2, (o.a[1] + o.b[1]) / 2];
      o.a = rot(o.a, c, r);
      o.b = rot(o.b, c, r);
    } else if (o.p) {
      const b2 = baseBox(o),
        c = [b2[0] + b2[2] / 2, b2[1] + b2[3] / 2];
      o.p = o.p.map((pt) => rot(pt, c, r));
    }
  }
  const toReal = (u) => (doc.scale ? realMm(u) : u / NP_U);
  const fromReal = (v) => (doc.scale ? toUnits(v) : v * NP_U);
  const unitLab = () => (doc.scale ? "mm (real)" : "mm on paper");
  const isStair = (o) => o && o.t === "shape" && ["stairs", "stairsl", "stairsu"].includes(o.k);
  function stairCalc(o) {
    const b = baseBox(o),
      w = b[2],
      h = b[3];
    let run, wid;
    if (o.k === "stairs") {
      run = Math.max(w, h);
      wid = Math.min(w, h);
    } else if (o.k === "stairsl") {
      const fw = Math.min(w, h) * 0.38;
      run = w - fw + h - fw;
      wid = fw;
    } else {
      const fw = Math.min(w, h) * 0.48,
        lh = Math.min(fw, h * 0.3);
      run = (h - lh) * 2;
      wid = fw;
    }
    const n = npStairN(o, run, wid, doc.scale ? NP_U / doc.scale : 0);
    const out = { n };
    if (doc.scale) {
      const runMm = realMm(run),
        tr = o.k === "stairs" ? n - 1 : n - 2;
      out.going = runMm / Math.max(1, tr);
      out.rise = (o.rise || 2600) / n;
      out.width = realMm(wid);
    }
    return out;
  }
  const isStudW = (o) =>
    o &&
    o.t === "shape" &&
    ["tstud", "eframe", "jlay", "rlay", "tlay", "truss", "cutroof", "bblay"].includes(o.k);
  const hasCC = (o) => ["tstud", "eframe", "jlay", "rlay", "tlay", "bblay"].includes(o.k),
    hasAdds = hasCC;
  function fineFill() {
    const o = sel != null ? doc.objs[sel] : null;
    if (!o) {
      fb.hidden = true;
      return;
    }
    {
      const nm =
        o.t === "shape"
          ? libLabel(o.k)
          : {
              line: "Line",
              arrow: "Arrow",
              rect: "Box",
              circle: "Circle",
              text: "Text",
              stroke: "Pen drawing",
              dim: "Measurement",
              ang: "Angle",
              room: "Room",
              img: "Photo / drawing",
            }[o.t] || "Item";
      fb.querySelector(".nfwhatis").textContent = nm;
      const colorable = o.t !== "img";
      fb.querySelector(".nfcolrow").hidden = !colorable;
      fb.querySelectorAll(".nfcol").forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String((o.c || "#111111").toLowerCase() === b.dataset.c.toLowerCase()),
        ),
      );
      const wable = !["img", "text", "room"].includes(o.t) && !(npIsWall(o) && doc.scale);
      fb.querySelector(".nfwrow").hidden = !wable;
      const wv = [2, 4, 6, 12, 24].reduce(
        (a, v) => (Math.abs(pwFor(v) - (o.w || 0)) < Math.abs(pwFor(a) - (o.w || 0)) ? v : a),
        2,
      );
      fb.querySelectorAll(".nfw button").forEach((b) =>
        b.setAttribute("aria-pressed", String(+b.dataset.v === wv)),
      );
      const lsable =
        ["line", "arrow", "rect", "circle", "stroke"].includes(o.t) ||
        (o.t === "shape" && !npIsWall(o));
      fb.querySelector(".nflsrow").hidden = !lsable;
      fb.querySelectorAll(".nfls button").forEach((b) =>
        b.setAttribute("aria-pressed", String((o.ls || "") === b.dataset.v)),
      );
      const wall = npIsWall(o);
      fb.querySelector(".nfwkrow").hidden = !wall;
      fb.querySelector(".nflinrow").hidden = !wall;
      if (wall)
        fb.querySelectorAll(".nflin").forEach((sl) => {
          sl.value = (o.lin && o.lin[sl.dataset.s]) || "";
        });
      if (wall) {
        fb.querySelector(".nfwk").value = o.k;
        const th = fb.querySelector(".nfwth");
        th.hidden = !doc.scale;
        if (doc.scale && document.activeElement !== th)
          th.value = Math.round(realMm(npWallT(o, o.w || 6)));
      }
      const labk = o.t === "shape" && NP_XLAB.has(o.k);
      fb.querySelector(".nftxrow").hidden = o.t !== "text" && !labk;
      fb.querySelector(".nftxs").hidden = labk;
      if (o.t === "text" || labk) {
        const tx = fb.querySelector(".nftx");
        if (document.activeElement !== tx) tx.value = labk ? o.lab || "" : o.s || "";
        fb.querySelector(".nftxs").value = Math.round(o.size || 20);
      }
      fb.querySelector(".nfly").value = npLayerOf(o);
      fb.querySelector(".nfa-lock").textContent = o.lk ? "🔓 Unlock" : "🔒 Lock";
      {
        const nd = fb.querySelector(".nfa-dim");
        nd.hidden = ["text", "stroke", "dim", "ang", "arrow"].includes(o.t) || vpOf(o);
        nd.textContent = hasDims(o) ? "📏 Take dimensions off" : "📏 Dimension it";
      }
      fb.querySelector(".nfvprow").hidden = !vpOf(o);
      {
        const cuk = o.t === "shape" && (o.k === "cu" || o.k === "cu3");
        fb.querySelector(".nfphrow").hidden = !cuk;
        if (cuk)
          fb.querySelectorAll(".nfph button").forEach((b) =>
            b.setAttribute("aria-pressed", String(b.dataset.v === o.k)),
          );
      }
      fb.querySelector(".nfpvrow").hidden = !(o.t === "room" && o.pave);
      if (o.pave) fb.querySelector(".nfpv").value = o.pave;
      fb.querySelector(".nfcallrow").hidden = o.t !== "text";
      if (o.t === "text") {
        fb.querySelector(".nfc-lead").value = (o.lead && o.lead.k) || "none";
        fb.querySelector(".nfc-box").value = o.box || "";
      }
      fb.querySelector(".nfbendrow").hidden = o.t !== "line";
      if (o.t === "line") {
        const bi = fb.querySelector(".nfbend");
        if (document.activeElement !== bi) bi.value = Math.round((o.bend || 0) * 100);
      }
      fb.querySelector(".nfa-std").hidden = !(
        o.t === "shape" &&
        npBoxy(o) &&
        NP_REAL[o.k] &&
        NP_REAL[o.k][1] &&
        doc.scale
      );
      {
        const uk = o.t === "shape" && ["ewBlock", "ewBrk", "fdnsec"].includes(o.k);
        fb.querySelector(".nfunrow").hidden = !uk;
        if (uk) {
          const U2 = npUnit(o);
          fb.querySelector(".nfun-p").value = U2.p;
          [
            ["L", U2.L],
            ["H", U2.H],
            ["J", U2.J],
          ].forEach(([k2, v]) => {
            const el = fb.querySelector(".nfun-" + k2);
            if (document.activeElement !== el) el.value = v;
          });
        }
        const fk = o.t === "shape" && o.k === "fdnsec";
        fb.querySelector(".nffdrow").hidden = !fk;
        if (fk) {
          const fd = Object.assign({ w: 600, d: 225, dep: 1000 }, o.fd || {});
          [
            ["w", fd.w],
            ["d", fd.d],
            ["dep", fd.dep],
          ].forEach(([k2, v]) => {
            const el = fb.querySelector(".nffd-" + k2);
            if (document.activeElement !== el) el.value = v;
          });
        }
      }
      {
        const LVK = {
          cavity: ["a", "cav", "ins", "b"],
          ewCav: ["a", "cav", "ins", "b"],
          ewBrick: ["cav", "ins", "b"],
          ewSolid: ["a"],
          ewBlock: ["a"],
        };
        const ks = o.t === "shape" && LVK[o.k];
        const row = fb.querySelector(".nflvrow");
        row.hidden = !ks;
        if (ks) {
          const lv = Object.assign(
            { a: o.k === "ewSolid" ? 215 : 100, cav: 50, ins: 100, b: 100 },
            o.lv || {},
          );
          row.querySelectorAll(".nflv").forEach((l) => {
            l.hidden = !ks.includes(l.dataset.f);
            const sl = l.querySelector("select");
            sl.value = String(lv[l.dataset.f]);
            l.firstChild.textContent =
              o.k === "ewSolid" || o.k === "ewBlock"
                ? l.dataset.f === "a"
                  ? "Block"
                  : l.firstChild.textContent
                : { a: "Outer leaf", cav: "Cavity", ins: "Insulation", b: "Inner leaf" }[
                    l.dataset.f
                  ];
          });
        }
      }
    }
    {
      const sw = fb.querySelector(".nfstudw");
      sw.hidden = !isStudW(o);
      if (isStudW(o)) {
        const sizes = NP_TIMB_SIZES[o.k];
        const sdBox = fb.querySelector(".nfsd");
        sdBox.parentElement.hidden = !sizes;
        if (sizes) {
          const cur = o.k === "tstud" ? String(o.sd || 100) : o.sz || NP_TIMB_DEF[o.k];
          sdBox.innerHTML = sizes
            .map(
              ([v, l]) =>
                `<button type="button" data-v="${v}" aria-pressed="${v === cur}">${l}</button>`,
            )
            .join("");
          sdBox.querySelectorAll("button").forEach(
            (b) =>
              (b.onclick = () => {
                const ob = doc.objs[sel];
                if (!ob) return;
                snap();
                if (ob.k === "tstud") {
                  ob.sd = +b.dataset.v;
                  lastStud.sd = ob.sd;
                  if (doc.scale) ob.th = toUnits(ob.sd);
                } else ob.sz = b.dataset.v;
                dirty = true;
                draw();
                fineFill();
              }),
          );
        }
        fb.querySelector(".nfcc").parentElement.hidden = !hasCC(o);
        const dcc = o.k === "tlay" || o.k === "bblay" ? 600 : 400;
        fb.querySelectorAll(".nfcc button").forEach((b) =>
          b.setAttribute("aria-pressed", String(+b.dataset.v === (o.cc || dcc))),
        );
        fb.querySelector(".nftt").hidden = o.k !== "truss";
        fb.querySelector(".nfcorner").hidden = fb.querySelector(".nftee").hidden = o.k !== "tstud";
        fb.querySelectorAll(".nfcorner button").forEach((b) =>
          b.setAttribute("aria-pressed", String(b.dataset.v === (o.corner || "3stud"))),
        );
        fb.querySelectorAll(".nftee button").forEach((b) =>
          b.setAttribute("aria-pressed", String(b.dataset.v === (o.tee || "3stud"))),
        );
        fb.querySelectorAll(".nftt button").forEach((b) =>
          b.setAttribute("aria-pressed", String(b.dataset.v === (o.tt || "fink"))),
        );
        fb.querySelector(".nfdirn").hidden = !["jlay", "rlay", "tlay", "bblay"].includes(o.k);
        fb.querySelector(".nfaddt").parentElement.hidden = !hasAdds(o);
        fb.querySelector(".nfaddt").setAttribute("aria-pressed", String(addTimber));
        fb.querySelector(".nfaddt").textContent = addTimber
          ? "✓ Tap a stud to add one"
          : "➕ Add timber";
        const ex = (o.adds || []).reduce((a, x) => a + (x.n || 1), 0);
        fb.querySelector(".nftinfo").textContent =
          (ex ? ex + " extra timber" + (ex === 1 ? "" : "s") + ". " : "") +
          (o.k === "tstud"
            ? "Corners, door/window sides and joining walls get extra studs automatically."
            : o.k === "jlay"
              ? "Edge joists are doubled automatically."
              : o.k === "bblay"
                ? "Add an extra beam beside one to double up under a wall."
                : o.k === "truss"
                  ? "Pick the truss type. Drag the box to set span and height (pitch)."
                  : "") +
          (doc.scale ? "" : " Set a scale in 📐 Paper for real timber sizes.");
      }
    }
    {
      const st = fb.querySelector(".nfstairs");
      st.hidden = !isStair(o);
      if (isStair(o)) {
        const sc = stairCalc(o);
        fb.querySelector(".nfstn").textContent = sc.n;
        const ri = fb.querySelector(".nfrisev");
        if (document.activeElement !== ri) ri.value = o.rise || 2600;
        fb.querySelector(".nfrise").hidden = !doc.scale;
        const inf = fb.querySelector(".nfsinfo");
        if (doc.scale && sc.going) {
          const R = sc.rise,
            G = sc.going,
            p = (Math.atan(R / G) * 180) / Math.PI,
            two = 2 * R + G;
          const bad = [];
          if (R > 220) bad.push("rise over 220");
          if (G < 220) bad.push("going under 220");
          if (two < 550 || two > 700) bad.push("2R+G not 550–700");
          if (p > 42) bad.push("steeper than 42°");
          inf.innerHTML = `${sc.n} risers of <b>${Math.round(R)} mm</b> · going <b>${Math.round(G)} mm</b> · ${Math.round(p)}° · width ${Math.round(sc.width)} mm<br>${bad.length ? "⚠ Check: " + bad.join(", ") + " (Part K, private stair)" : "✓ Within Part K limits for a private stair"}`;
        } else
          inf.textContent = `${sc.n} steps. Set a scale in 📐 Paper to check the rise and going.`;
      }
    }
    const st = fb.querySelector(".nfstep");
    const sk = String(doc.scale || 0);
    if (st.dataset.sk !== sk) {
      st.dataset.sk = sk;
      const real = doc.scale ? [1, 5, 10, 25, 50, 100, 500] : [0.1, 0.5, 1, 5, 20];
      st.innerHTML = real
        .map(
          (mm) =>
            `<option value="${fromReal(mm)}">${doc.scale ? npFmtLen(mm) : mm + " mm"} step</option>`,
        )
        .join("");
      st.selectedIndex = doc.scale ? 2 : 2;
    }
    const ends = !!(o.a && o.b) && !npBoxy(o);
    fb.querySelector(".nfwhat").hidden = !ends;
    if (!ends) fineWhat = "all";
    fb.querySelectorAll(".nfwhat .nfseg button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.w === fineWhat)),
    );
    fb.querySelector(".nfslowc").checked = slowDrag;
    const line = o.a && o.b && !npBoxy(o),
      box = o.a && o.b && npBoxy(o);
    const f = fb.querySelector(".nfsize");
    f.hidden = !(line || box || o.t === "img");
    const A = fb.querySelector(".nfa"),
      B = fb.querySelector(".nfb2");
    fb.querySelector(".nfu").textContent = unitLab();
    if (line) {
      fb.querySelector(".nflab").textContent = "Length";
      A.value = Math.round(toReal(lenOf(o.a, o.b)));
      B.hidden = true;
      fb.querySelector(".nfx2").hidden = true;
    } else if (box || o.t === "img") {
      const b = baseBox(o);
      fb.querySelector(".nflab").textContent = "Size";
      A.value = Math.round(toReal(o.t === "img" ? o.w : Math.abs(o.b[0] - o.a[0])));
      B.value = Math.round(toReal(o.t === "img" ? o.h : Math.abs(o.b[1] - o.a[1])));
      B.hidden = false;
      fb.querySelector(".nfx2").hidden = false;
    }
    const ang = npBoxy(o)
      ? Math.round(((o.r || 0) * 180) / Math.PI)
      : o.a && o.b
        ? Math.round((Math.atan2(o.b[1] - o.a[1], o.b[0] - o.a[0]) * 180) / Math.PI)
        : null;
    const angF = npBoxy(o)
      ? ((o.r || 0) * 180) / Math.PI
      : o.a && o.b
        ? (Math.atan2(o.b[1] - o.a[1], o.b[0] - o.a[0]) * 180) / Math.PI
        : null;
    fb.querySelector(".nfang").hidden = angF == null;
    fb.querySelector(".nfturn").hidden = angF == null && !o.p;
    if (angF != null && document.activeElement !== fb.querySelector(".nfangv"))
      fb.querySelector(".nfangv").value = String(
        Math.round((((angF % 360) + 360) % 360) * 10) / 10,
      );
    fb.querySelector(".nfhint").textContent =
      (fineWhat !== "all"
        ? "The arrows move only the " + (fineWhat === "a" ? "start" : "end") + " point. "
        : "") + "Hold an arrow to keep moving. Pinch to zoom in for finer work.";
  }
  function fineOpen() {
    fb.hidden = false;
    fineFill();
  }
  fb.querySelector(".nfx").onclick = () => {
    fb.hidden = true;
    addTimber = false;
  };
  {
    const cur = () => (sel != null ? doc.objs[sel] : null);
    const upd = (fn) => {
      const o = cur();
      if (!o) return;
      snap();
      fn(o);
      dirty = true;
      draw();
      fineFill();
    };
    fb.querySelectorAll(".nfcol").forEach(
      (b) =>
        (b.onclick = () =>
          upd((o) => {
            o.c = b.dataset.c;
          })),
    );
    fb.querySelectorAll(".nfw button").forEach(
      (b) =>
        (b.onclick = () =>
          upd((o) => {
            o.w = pwFor(+b.dataset.v);
          })),
    );
    fb.querySelectorAll(".nfls button").forEach(
      (b) =>
        (b.onclick = () =>
          upd((o) => {
            if (b.dataset.v) o.ls = b.dataset.v;
            else delete o.ls;
          })),
    );
    fb.querySelectorAll(".nflin").forEach(
      (sl) =>
        (sl.onchange = () =>
          upd((o) => {
            o.lin = Object.assign({}, o.lin || {});
            if (sl.value) o.lin[sl.dataset.s] = sl.value;
            else delete o.lin[sl.dataset.s];
            if (!Object.keys(o.lin).length) delete o.lin;
          })),
    );
    fb.querySelector(".nflinsw").onclick = () =>
      upd((o) => {
        if (!o.lin) return;
        o.lin = { 1: o.lin[2], 2: o.lin[1] };
        Object.keys(o.lin).forEach((k) => {
          if (!o.lin[k]) delete o.lin[k];
        });
      });
    fb.querySelector(".nfwk").onchange = (e) =>
      upd((o) => {
        o.k = e.target.value;
        if (doc.scale)
          o.th = Math.max(
            6,
            toUnits(
              o.k === "cavity"
                ? o.lv
                  ? o.lv.a + o.lv.cav + o.lv.ins + o.lv.b
                  : 350
                : o.k === "tstud"
                  ? o.sd || 100
                  : 100,
            ),
          );
        if (o.k === "tstud") {
          o.sd = o.sd || 100;
          o.cc = o.cc || 400;
        }
        weldWall(o);
        orientCavity(o);
      });
    fb.querySelector(".nfwth").onchange = (e) => {
      const v = +e.target.value;
      if (v > 0 && doc.scale)
        upd((o) => {
          o.th = toUnits(v);
          if (o.k === "tstud") o.sd = v;
        });
    };
    fb.querySelector(".nftxrow").onsubmit = (e) => {
      e.preventDefault();
      upd((o) => {
        const t = fb.querySelector(".nftx").value;
        if (o.t === "shape") {
          o.lab = t.trim();
          if (!o.lab) delete o.lab;
          return;
        }
        if (t) o.s = t;
        const z = +fb.querySelector(".nftxs").value;
        if (z > 2) o.size = z;
      });
    };
    fb.querySelector(".nfly").onchange = (e) =>
      upd((o) => {
        o.ly = e.target.value;
      });
    fb.querySelector(".nfun-p").onchange = (e) =>
      upd((o) => {
        o.unit = { p: e.target.value };
        if (o.k === "ewBlock" || o.k === "ewBrk") blockSnap(o);
      });
    ["L", "H", "J"].forEach(
      (k2) =>
        (fb.querySelector(".nfun-" + k2).onchange = (e) => {
          const v = +e.target.value;
          if (!(v >= 0) || (k2 !== "J" && !v)) return;
          upd((o) => {
            const U2 = npUnit(o);
            o.unit = { p: U2.p, L: U2.L, H: U2.H, J: U2.J };
            o.unit[k2] = v;
            if (o.k === "ewBlock" || o.k === "ewBrk") blockSnap(o);
          });
        }),
    );
    ["w", "d", "dep"].forEach(
      (k2) =>
        (fb.querySelector(".nffd-" + k2).onchange = (e) => {
          const v = +e.target.value;
          if (!(v > 0)) return;
          upd((o) => {
            o.fd = Object.assign({ w: 600, d: 225, dep: 1000 }, o.fd || {});
            o.fd[k2] = v;
          });
        }),
    );
    fb.querySelectorAll(".nflv[data-f] select").forEach(
      (sl) =>
        (sl.onchange = () =>
          upd((o) => {
            o.lv = Object.assign(
              { a: o.k === "ewSolid" ? 215 : 100, cav: 50, ins: 100, b: 100 },
              o.lv || {},
            );
            o.lv[sl.dataset.f] = +sl.value;
            if (o.k === "cavity") {
              const t = o.lv.a + o.lv.cav + o.lv.ins + o.lv.b;
              if (doc.scale) o.th = Math.max(6, toUnits(t));
              weldWall(o);
              orientCavity(o);
              toast("Cavity wall now " + t + " mm overall");
            }
          })),
    );
    fb.querySelector(".nfa-lock").onclick = () =>
      upd((o) => {
        o.lk = !o.lk;
        if (!o.lk) delete o.lk;
      });
    fb.querySelector(".nfa-dim").onclick = () => {
      const o = cur();
      if (o) {
        autoDim(o);
        fineFill();
      }
    };
    fb.querySelector(".nfa-vp").onclick = () => {
      const o = cur();
      if (o && vpOf(o)) vpDlg(o, false);
    };
    fb.querySelectorAll(".nfph button").forEach(
      (b) =>
        (b.onclick = () =>
          upd((o) => {
            o.k = b.dataset.v;
          })),
    );
    fb.querySelector(".nfpv").onchange = (e) =>
      upd((o) => {
        o.pave = e.target.value;
        delete o.name;
      });
    fb.querySelector(".nfc-lead").onchange = (e) =>
      upd((o) => {
        const v = e.target.value;
        if (v === "none") {
          delete o.lead;
          return;
        }
        if (!o.lead) o.lead = { p: [o.x - o.size * 2, o.y + o.size * 3] };
        o.lead.k = v;
      });
    fb.querySelector(".nfc-box").onchange = (e) =>
      upd((o) => {
        if (e.target.value) o.box = e.target.value;
        else delete o.box;
      });
    fb.querySelector(".nfbend").oninput = (e) => {
      const o = cur();
      if (!o) return;
      o.bend = +e.target.value / 100 || 0;
      if (!o.bend) delete o.bend;
      dirty = true;
      draw();
    };
    fb.querySelector(".nfbend").onchange = () => {
      snap();
    };
    fb.querySelector(".nfbend0").onclick = () =>
      upd((o) => {
        delete o.bend;
      });
    fb.querySelector(".nfa-std").onclick = () =>
      upd((o) => {
        const R = NP_REAL[o.k];
        if (!R || !doc.scale) return;
        const c0 = [(o.a[0] + o.b[0]) / 2, (o.a[1] + o.b[1]) / 2],
          w = toUnits(R[0]),
          h = toUnits(R[1]);
        o.a = [c0[0] - w / 2, c0[1] - h / 2];
        o.b = [c0[0] + w / 2, c0[1] + h / 2];
        if (o.k === "ewBlock" || o.k === "ewBrk") blockSnap(o);
        toast("Back to its standard size: " + R[0] + " × " + R[1] + " mm");
      });
    fb.querySelector(".nfa-dup").onclick = () => {
      const b = q('.np-sb[data-a="dup"]');
      if (b) b.click();
    };
    fb.querySelector(".nfa-del").onclick = () => {
      const b = q('.np-sb[data-a="del"]');
      if (b) {
        b.click();
        fb.hidden = true;
      }
    };
  }
  fb.querySelectorAll(".nfcorner button").forEach(
    (b) =>
      (b.onclick = () => {
        const o = doc.objs[sel];
        if (!o || o.k !== "tstud") return;
        snap();
        doc.objs.filter((x) => x.k === "tstud").forEach((x) => (x.corner = b.dataset.v));
        lastStud.corner = b.dataset.v;
        dirty = true;
        draw();
        fineFill();
      }),
  );
  fb.querySelectorAll(".nftee button").forEach(
    (b) =>
      (b.onclick = () => {
        const o = doc.objs[sel];
        if (!o || o.k !== "tstud") return;
        snap();
        doc.objs.filter((x) => x.k === "tstud").forEach((x) => (x.tee = b.dataset.v));
        lastStud.tee = b.dataset.v;
        dirty = true;
        draw();
        fineFill();
      }),
  );
  fb.querySelectorAll(".nftt button").forEach(
    (b) =>
      (b.onclick = () => {
        const o = doc.objs[sel];
        if (!o || o.k !== "truss") return;
        snap();
        o.tt = b.dataset.v;
        dirty = true;
        draw();
        fineFill();
      }),
  );
  fb.querySelector(".nfturnb").onclick = () => {
    const o = doc.objs[sel];
    if (!isStudW(o)) return;
    snap();
    o.turn = !o.turn;
    delete o.adds;
    dirty = true;
    draw();
    fineFill();
  };
  fb.querySelectorAll(".nfcc button").forEach(
    (b) =>
      (b.onclick = () => {
        const o = doc.objs[sel];
        if (!isStudW(o)) return;
        snap();
        o.cc = +b.dataset.v;
        lastStud.cc = o.cc;
        dirty = true;
        draw();
        fineFill();
      }),
  );
  const timberChip = (on) => {
    let c = ov.querySelector(".np-tchip");
    if (!on) {
      if (c) c.remove();
      return;
    }
    if (!c) {
      c = document.createElement("div");
      c.className = "np-tchip";
      c.innerHTML = `<span>➕ Tap beside a stud to add a timber. Tap again for a triple.</span><button type="button" class="btn primary">Done</button>`;
      ov.appendChild(c);
      c.querySelector("button").onclick = () => {
        addTimber = false;
        timberChip(false);
        fineOpen();
      };
    }
  };
  fb.querySelector(".nfaddt").onclick = () => {
    addTimber = !addTimber;
    if (addTimber) {
      fb.hidden = true;
      timberChip(true);
    } else {
      timberChip(false);
      fineFill();
    }
  };
  fb.querySelector(".nfclrt").onclick = () => {
    const o = doc.objs[sel];
    if (!isStudW(o)) return;
    snap();
    delete o.adds;
    dirty = true;
    draw();
    fineFill();
  };
  fb.querySelectorAll(".nfst").forEach(
    (b) =>
      (b.onclick = () => {
        const o = doc.objs[sel];
        if (!isStair(o)) return;
        snap();
        o.n = Math.max(2, Math.min(40, stairCalc(o).n + +b.dataset.d));
        dirty = true;
        draw();
        fineFill();
      }),
  );
  fb.querySelector(".nfsdir").onclick = () => {
    const o = doc.objs[sel];
    if (!isStair(o)) return;
    snap();
    o.down = !o.down;
    dirty = true;
    draw();
    fineFill();
  };
  fb.querySelector(".nfrise").onsubmit = (e) => {
    e.preventDefault();
    const o = doc.objs[sel];
    if (!isStair(o)) return;
    const v = parseFloat(fb.querySelector(".nfrisev").value);
    if (!(v > 300 && v < 6000)) {
      toast("Type the floor to floor height in mm, e.g. 2630");
      return;
    }
    snap();
    o.rise = v;
    dirty = true;
    draw();
    fineFill();
  };
  fb.querySelector(".nfsauto").onclick = () => {
    const o = doc.objs[sel];
    if (!isStair(o)) return;
    if (!doc.scale) {
      toast("Set a scale first");
      return;
    }
    snap();
    const rise = o.rise || 2600;
    const n = Math.max(2, Math.ceil(rise / 220 - 1e-9));
    const R = rise / n;
    const G = Math.max(
      220,
      Math.ceil(R / Math.tan((41.5 * Math.PI) / 180)),
      Math.min(700 - 2 * R, Math.max(550 - 2 * R, 625 - 2 * R)),
    );
    o.n = n;
    if (o.k === "stairs") {
      const len = toUnits(G * (n - 1));
      const x0 = Math.min(o.a[0], o.b[0]),
        y0 = Math.min(o.a[1], o.b[1]),
        w = Math.abs(o.b[0] - o.a[0]),
        h = Math.abs(o.b[1] - o.a[1]);
      if (w >= h) {
        o.a = [x0, y0];
        o.b = [x0 + len, y0 + h];
      } else {
        o.a = [x0, y0 + h - len];
        o.b = [x0 + w, y0 + h];
      }
    }
    dirty = true;
    draw();
    fineFill();
    const sc = stairCalc(o);
    toast(
      o.k === "stairs"
        ? `${n} risers of ${Math.round(R)} mm, going ${Math.round(sc.going)} mm: stairs length set to ${Math.round(G * (n - 1))} mm`
        : `${n} risers of ${Math.round(R)} mm. Drag the size to get a going of ${Math.round(G)} mm or more.`,
    );
  };
  const nudge = (b, first) => {
    const o = doc.objs[sel];
    if (!o) return;
    const [mx, my] = b.dataset.m.split(",").map(Number);
    const st = +fb.querySelector(".nfstep").value || 5;
    if (first) snap();
    if (fineWhat !== "all" && o.a && o.b) {
      o[fineWhat] = [o[fineWhat][0] + mx * st, o[fineWhat][1] + my * st];
    } else moveObj(o, mx * st, my * st);
    dirty = true;
    draw();
    fineFill();
  };
  fb.querySelectorAll(".nfb[data-m]").forEach((b) => {
    let t1 = 0,
      t2 = 0;
    const stop = () => {
      clearTimeout(t1);
      clearInterval(t2);
    };
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      nudge(b, true);
      t1 = setTimeout(() => {
        t2 = setInterval(() => nudge(b, false), 70);
      }, 400);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, stop));
    b.onclick = (e) => {
      if (e.detail === 0) nudge(b, true);
    };
  });
  fb.querySelectorAll(".nfwhat .nfseg button").forEach(
    (b) =>
      (b.onclick = () => {
        fineWhat = b.dataset.w;
        fineFill();
      }),
  );
  fb.querySelector(".nfslowc").onchange = (e) => {
    slowDrag = e.target.checked;
    try {
      localStorage.setItem("np.slow", slowDrag ? "1" : "0");
    } catch (x) {}
    toast(slowDrag ? "Slow drag on: drag a point or item for tiny moves" : "Slow drag off");
  };
  fb.querySelector(".nfang").onsubmit = (e) => {
    e.preventDefault();
    const o = doc.objs[sel];
    if (!o) return;
    const v = parseFloat(fb.querySelector(".nfangv").value);
    if (!isFinite(v)) {
      toast("Type an angle");
      return;
    }
    snap();
    if (npBoxy(o)) {
      o.r = ((((v * Math.PI) / 180) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    } else if (o.a && o.b) {
      const L = lenOf(o.a, o.b),
        r = (v * Math.PI) / 180;
      const fix = fineWhat === "b" ? "b" : "a",
        mv = fix === "a" ? "b" : "a";
      o[mv] = [
        o[fix][0] + Math.cos(fix === "a" ? r : r + Math.PI) * L,
        o[fix][1] + Math.sin(fix === "a" ? r : r + Math.PI) * L,
      ];
    }
    dirty = true;
    draw();
    fineFill();
    toast("Angle set");
  };
  fb.querySelectorAll(".nfb[data-r]").forEach(
    (b) =>
      (b.onclick = () => {
        const o = doc.objs[sel];
        if (!o) return;
        snap();
        turnObj(o, +b.dataset.r);
        draw();
        fineFill();
      }),
  );
  fb.querySelector(".nfsize").onsubmit = (e) => {
    e.preventDefault();
    const o = doc.objs[sel];
    if (!o) return;
    const A = parseFloat(fb.querySelector(".nfa").value),
      B = parseFloat(fb.querySelector(".nfb2").value);
    if (!(A > 0)) {
      toast("Type a size");
      return;
    }
    snap();
    if (o.a && o.b && !npBoxy(o)) {
      const L = lenOf(o.a, o.b) || 1,
        u = fromReal(A);
      o.b = [o.a[0] + ((o.b[0] - o.a[0]) / L) * u, o.a[1] + ((o.b[1] - o.a[1]) / L) * u];
    } else if (o.t === "img") {
      const w = fromReal(A),
        h = B > 0 ? fromReal(B) : (w * o.h) / o.w;
      o.w = w;
      o.h = h;
    } else if (o.a && o.b) {
      const w = fromReal(A),
        h = B > 0 ? fromReal(B) : Math.abs(o.b[1] - o.a[1]);
      const x0 = Math.min(o.a[0], o.b[0]),
        y0 = Math.min(o.a[1], o.b[1]);
      o.a = [x0, y0];
      o.b = [x0 + w, y0 + h];
    }
    dirty = true;
    draw();
    fineFill();
    toast("Size set");
  };
  /* pages */
  function drawPages() {
    q(".np-pages").innerHTML =
      doc.pages
        .map(
          (p, i) =>
            `<button type="button" class="np-pg" role="tab" data-i="${i}" aria-selected="${i === pg}">${esc(p.name || "Page " + (i + 1))}${i === pg ? ' <span class="np-pgm" aria-label="Rename or delete page">⋯</span>' : ""}</button>`,
        )
        .join("") +
      `<button type="button" class="np-pg np-pgadd" aria-label="Add a page">+ Page</button>`;
    q(".np-pages")
      .querySelectorAll(".np-pg[data-i]")
      .forEach(
        (b) =>
          (b.onclick = (ev) => {
            const i = +b.dataset.i;
            if (i === pg) {
              if (ev.target.closest(".np-pgm")) pageMenu();
              return;
            }
            goPage(i);
          }),
      );
    q(".np-pgadd").onclick = () => {
      doc.pages.push({ name: "Page " + (doc.pages.length + 1), objs: [] });
      dirty = true;
      goPage(doc.pages.length - 1);
      toast("New page added");
    };
  }
  function goPage(i) {
    doc.pages[pg].objs = doc.objs;
    msel.clear();
    chain = [];
    pg = i;
    doc.objs = doc.pages[i].objs;
    sel = null;
    undo = [];
    redo = [];
    drawPages();
    fit();
  }
  function pageMenu() {
    const p = doc.pages[pg];
    const d = document.createElement("div");
    d.className = "dimask";
    d.innerHTML = `<form class="dimbox"><b>Page ${pg + 1}</b><label>Page name<input class="pgn" maxlength="40" value="${esc(p.name || "")}" placeholder="e.g. Ground floor"></label>
      <div class="dimbtns">${doc.pages.length > 1 ? `<button type="button" class="btn pgdel" style="color:#e11d2a">Delete page</button>` : ""}<button type="button" class="btn pgx">Cancel</button><button type="submit" class="btn primary">Save</button></div></form>`;
    ov.appendChild(d);
    const inp = d.querySelector(".pgn");
    setTimeout(() => inp.focus(), 30);
    d.querySelector(".pgx").onclick = () => d.remove();
    d.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      p.name = inp.value.trim() || "Page " + (pg + 1);
      dirty = true;
      d.remove();
      drawPages();
    };
    const del = d.querySelector(".pgdel");
    if (del)
      del.onclick = () => {
        if (del.dataset.armed !== "1") {
          del.dataset.armed = "1";
          del.textContent = "Tap again to delete";
          return;
        }
        doc.pages.splice(pg, 1);
        pg = Math.max(0, pg - 1);
        doc.objs = doc.pages[pg].objs;
        dirty = true;
        d.remove();
        undo = [];
        redo = [];
        sel = null;
        drawPages();
        fit();
      };
  }
  /* paper setup */
  q(".np-setup").onclick = () => {
    const d = document.createElement("div");
    d.className = "dimask";
    const cs = doc.size;
    d.innerHTML = `<form class="dimbox npsetup"><b>📐 Paper and scale</b>
      <label>Paper size<select class="ps-size">${Object.keys(NP_SIZES)
        .map((k) => `<option value="${k}" ${cs === k ? "selected" : ""}>${k}</option>`)
        .join(
          "",
        )}${cs === "custom" ? `<option value="custom" selected>Long page (old style)</option>` : ""}</select></label>
      <div class="seg ps-or"><button type="button" data-v="land" aria-pressed="${doc.orient !== "port"}">▭ Landscape</button><button type="button" data-v="port" aria-pressed="${doc.orient === "port"}">▯ Portrait</button></div>
      <label>Scale<select class="ps-scale">${NP_SCALES.map((v) => `<option value="${v}" ${(+doc.scale || 0) === v ? "selected" : ""}>${v ? "1:" + v : "Not to scale (sketch)"}</option>`).join("")}</select></label>
      ${rsBestScale(doc.objs, 100, 100, [1]) != null ? `<button type="button" class="pillbtn ps-fit">Best fit for the room sketch</button>` : ""}
      <div class="who ps-note"></div>
      <label>Background<select class="ps-paper">${[
        ["plain", "Plain"],
        ["grid", "Squared (grid)"],
        ["lined", "Lined"],
      ]
        .map(([v, l]) => `<option value="${v}" ${doc.paper === v ? "selected" : ""}>${l}</option>`)
        .join("")}</select></label>
      <div class="dimbtns"><button type="button" class="btn psx">Cancel</button><button type="submit" class="btn primary">Done</button></div></form>`;
    ov.appendChild(d);
    wirePicks(d);
    let orient = doc.orient || "land";
    const note = () => {
      const sc = +d.querySelector(".ps-scale").value;
      d.querySelector(".ps-note").textContent = sc
        ? `At 1:${sc}, each grid square is ${npFmtLen(10 * sc)} and 1 cm on paper = ${npFmtLen(10 * sc)}. Symbols you tap to place come out at real size.`
        : "No scale: good for quick sketches. Measure lines are typed in by hand.";
    };
    d.querySelector(".ps-scale").onchange = note;
    note();
    /* the largest scale at which the measured room sketches fit the chosen paper */
    if (d.querySelector(".ps-fit"))
      d.querySelector(".ps-fit").onclick = () => {
        const sz = d.querySelector(".ps-size").value,
          [w, h] = npDims(sz === "custom" ? "A3" : sz, orient).map((v) => v / NP_U),
          best = rsBestScale(
            doc.objs,
            w,
            h,
            NP_SCALES.filter((v) => v),
          );
        if (best) {
          d.querySelector(".ps-scale").value = String(best);
          note();
          d.querySelector(".ps-note").textContent =
            `Best fit on ${sz}: 1:${best}. ` + d.querySelector(".ps-note").textContent;
        } else
          d.querySelector(".ps-note").textContent =
            `The room is too big for ${sz} even at 1:${Math.max(...NP_SCALES)}. Try a bigger paper size.`;
      };
    d.querySelectorAll(".ps-or button").forEach(
      (b) =>
        (b.onclick = () => {
          orient = b.dataset.v;
          d.querySelectorAll(".ps-or button").forEach((x) =>
            x.setAttribute("aria-pressed", String(x === b)),
          );
        }),
    );
    d.querySelector(".psx").onclick = () => d.remove();
    d.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      const sz = d.querySelector(".ps-size").value;
      if (sz !== "custom") {
        const [w, h] = npDims(sz, orient);
        doc.w = w;
        doc.h = h;
        doc.size = sz;
        doc.orient = orient;
      }
      doc.scale = +d.querySelector(".ps-scale").value || 0;
      doc.paper = d.querySelector(".ps-paper").value;
      dirty = true;
      q(".np-more").hidden = sized();
      d.remove();
      fit();
    };
  };
  const tf = q(".np-text");
  tf.onsubmit = (e) => {
    e.preventDefault();
    const t = tf.querySelector("input").value.trim();
    tf.hidden = true;
    tf.querySelector("input").placeholder = "Type your text…";
    if (dimAsk != null) {
      const o = doc.objs[dimAsk];
      dimAsk = null;
      if (o && o.t === "dim" && t) {
        o.s = /^\d+([.,]\d+)?$/.test(t) ? t + " mm" : t;
        dirty = true;
      }
      draw();
      return;
    }
    if (!t || !textAt) return;
    snap();
    const base = (wid >= 12 ? 26 : 18) / s;
    const size = Math.round(sized() ? Math.min(60, Math.max(14, base)) : base);
    const lk = tf.querySelector(".np-tlead").value,
      bk = tf.querySelector(".np-tbox").value;
    try {
      localStorage.setItem("np.tcall", lk + "|" + bk);
    } catch (e) {}
    const o = { t: "text", x: textAt[0], y: textAt[1], s: t, c: col, size };
    if (bk) o.box = bk;
    if (lk !== "none") {
      o.lead = { p: textAt.slice(), k: lk };
      o.x = textAt[0] + size * 2.2;
      o.y = textAt[1] - size * 3.2;
    }
    doc.objs.push(o);
    textAt = null;
    draw();
    if (lk !== "none")
      toast(
        "Drag the text where you want it. The arrow stays pointing at the spot (drag its dot to move it)",
      );
  };
  try {
    const v = (localStorage.getItem("np.tcall") || "none|").split("|");
    tf.querySelector(".np-tlead").value = v[0] || "none";
    tf.querySelector(".np-tbox").value = v[1] || "";
  } catch (e) {}
  q(".np-tcancel").onclick = () => {
    tf.hidden = true;
    textAt = null;
    dimAsk = null;
    tf.querySelector("input").placeholder = "Type your text…";
  };
  tf.querySelector("input").addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      q(".np-tcancel").click();
    }
  });
  const fitImg = (im, r) => {
    let w = Math.min(doc.w * 0.8, Math.max(300, (r.width * 0.7) / s)),
      h = (w * im.naturalHeight) / im.naturalWidth;
    if (sized() && h > doc.h * 0.8) {
      h = doc.h * 0.8;
      w = (h * im.naturalWidth) / im.naturalHeight;
    }
    return [w, h];
  };
  const placeImg = async (src, im) => {
    const r = stage.getBoundingClientRect();
    let [cx, cy] = toPage(r.left + r.width / 2, r.top + r.height * 0.35);
    const [w, h] = fitImg(im, r);
    const x = Math.max(20, Math.min(doc.w - w - 20, cx - w / 2));
    let y = Math.max(20, cy);
    if (sized()) y = Math.min(y, doc.h - h - 20);
    if (!sized() && y + h > doc.h - 40) doc.h = Math.ceil((y + h + 400) / 100) * 100;
    doc.objs.push({ t: "img", x, y, w, h, src });
    setTool("move");
    sel = doc.objs.length - 1;
    draw();
  };
  q(".np-apppic").onclick = () => {
    const list = appPhotoChoices();
    const box = document.createElement("div");
    box.className = "dimask";
    box.innerHTML = `<div class="dimbox appick"><b>🖼 Pick a photo from the app</b>${list.length ? `<input type="search" class="ctsearch" placeholder="🔍 Search by site or name" aria-label="Search photos"><div class="appgrid">${list.map((p, i) => `<button type="button" class="ph apg" data-i="${i}" data-s="${esc((p.label || "").toLowerCase())}"><img src="${blobUrl(p.id)}" alt="" loading="lazy"><span class="phcap">${esc(p.label || "")}</span></button>`).join("")}</div>` : `<div class="who">No photos in the app yet. Use 📷 Add photo to take or upload one.</div>`}
      <div class="dimbtns"><button type="button" class="btn apx">Close</button></div></div>`;
    ov.appendChild(box);
    box.querySelector(".apx").onclick = () => box.remove();
    const sq = box.querySelector("input");
    if (sq)
      sq.oninput = () => {
        const q2 = sq.value.toLowerCase().trim();
        box.querySelectorAll(".apg").forEach((b) => (b.hidden = !!q2 && !b.dataset.s.includes(q2)));
      };
    box.querySelectorAll(".apg").forEach(
      (b) =>
        (b.onclick = async () => {
          const p = list[+b.dataset.i];
          box.remove();
          toast("Adding photo…");
          snap();
          const im = loadImg(p.id);
          if (!(im.complete && im.naturalWidth))
            await new Promise((r) => {
              im.onload = r;
              im.onerror = r;
              setTimeout(r, 8000);
            });
          if (!im.naturalWidth) {
            toast("That photo couldn't be loaded. Check your connection.");
            return;
          }
          await placeImg(p.id, im);
          toast("Drag to move, corner to resize");
        }),
    );
  };
  q(".np-photo input").onchange = async (e) => {
    const fs = [...e.target.files];
    e.target.value = "";
    if (!fs.length) return;
    snap();
    const r = stage.getBoundingClientRect();
    let [cx, cy] = toPage(r.left + r.width / 2, r.top + r.height * 0.35);
    for (const f of fs) {
      try {
        const b = await shrinkImage(f);
        const key = "local:" + ++lc;
        locals[key] = { blob: b, url: URL.createObjectURL(b) };
        const im = await loadImage(b);
        imgs[key] = im;
        const [w, h] = fitImg(im, r);
        const x = Math.max(20, Math.min(doc.w - w - 20, cx - w / 2));
        let y = Math.max(20, cy);
        if (sized()) y = Math.min(y, doc.h - h - 20);
        else if (y + h > doc.h - 40) doc.h = Math.ceil((y + h + 400) / 100) * 100;
        doc.objs.push({ t: "img", x, y, w, h, src: key });
        cy += h + 30;
      } catch (err) {
        toast("A photo couldn't be added");
      }
    }
    setTool("move");
    sel = doc.objs.length - 1;
    draw();
    toast("Drag to move, corner to resize");
  };

  /* 📥 import a drawing: PDF or picture from your files or the app, kept to its own scale, cropped to the part you want */
  const NP_SRC_SCALES = [
    ["1", "1:1"],
    ["5", "1:5"],
    ["10", "1:10"],
    ["20", "1:20"],
    ["25", "1:25"],
    ["50", "1:50"],
    ["100", "1:100"],
    ["200", "1:200"],
    ["250", "1:250"],
    ["500", "1:500"],
    ["1000", "1:1000"],
    ["1250", "1:1250"],
    ["2500", "1:2500"],
  ];
  function cropDlg(im, opt, done) {
    const nw = im.naturalWidth,
      nh = im.naturalHeight;
    let c = Object.assign({ x: 0, y: 0, w: 1, h: 1 }, opt.crop || {});
    let mode = "crop",
      mA = null,
      mB = null;
    const d = document.createElement("div");
    d.className = "dimask npimp";
    const isPdf = !!opt.wmm;
    d.innerHTML = `<div class="dimbox npimpbox"><b>${opt.recrop ? "✂ Crop: keep the part you want" : "📥 Import drawing"}</b>
      <div class="seg npimode"><button type="button" data-m="crop" aria-pressed="true">✂ Crop</button>${opt.recrop ? "" : `<button type="button" data-m="meas" aria-pressed="false">📏 Measure a known length</button>`}</div>
      <div class="who npihint">Drag the box (or its corners) round the part you want to keep. Everything outside the box is left off.</div>
      <canvas class="npicv"></canvas>
      ${
        opt.recrop
          ? ""
          : `<label class="npiscl">What scale is this drawn at?<select class="npisc">${isPdf ? NP_SRC_SCALES.map(([v, l]) => `<option value="${v}"${v === String(opt.guess || 50) ? " selected" : ""}>${l}${isPdf ? " (at its paper size, " + Math.round(opt.wmm) + "×" + Math.round(opt.hmm) + " mm)" : ""}</option>`).join("") : ""}<option value="m"${isPdf ? "" : " selected"}>I'll measure a known length on it</option><option value="fit">Not to scale: just fit it on the page</option></select></label>
      <div class="npimeas" hidden><span class="who npimtxt">Tap <b>📏 Measure a known length</b> above, then tap both ends of something you know (a wall or a dimension).</span><label class="inl">Length<input class="npimm" type="number" inputmode="decimal" placeholder="mm" style="width:110px"> mm</label></div>`
      }
      <div class="who npinote">${!opt.recrop && !doc.scale ? "⚠️ This drawing has no scale set, so imports will just be fitted. Set one in 📐 Paper to keep things to scale." : ""}</div>
      <div class="dimbtns"><button type="button" class="btn npix">Cancel</button>${opt.crop && (opt.crop.w < 1 || opt.crop.h < 1) ? `<button type="button" class="btn npiall">Show it all again</button>` : ""}<button type="button" class="btn primary npiok">${opt.recrop ? "Keep this part" : "Place on drawing"}</button></div></div>`;
    ov.appendChild(d);
    const cvs = d.querySelector(".npicv"),
      gg = cvs.getContext("2d");
    const W = Math.min(window.innerWidth - 56, 860),
      H = Math.min(window.innerHeight * 0.55, 640);
    const k = Math.min(W / nw, H / nh);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cvs.width = Math.round(nw * k * dpr);
    cvs.height = Math.round(nh * k * dpr);
    cvs.style.width = Math.round(nw * k) + "px";
    cvs.style.height = Math.round(nh * k) + "px";
    const paint = () => {
      gg.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
      gg.fillStyle = "#fff";
      gg.fillRect(0, 0, nw, nh);
      gg.drawImage(im, 0, 0);
      const x = c.x * nw,
        y = c.y * nh,
        w = c.w * nw,
        h = c.h * nh;
      gg.fillStyle = "rgba(20,16,17,.55)";
      gg.fillRect(0, 0, nw, y);
      gg.fillRect(0, y + h, nw, nh - y - h);
      gg.fillRect(0, y, x, h);
      gg.fillRect(x + w, y, nw - x - w, h);
      gg.strokeStyle = "#e11d2a";
      gg.lineWidth = 2.5 / k;
      gg.setLineDash([8 / k, 5 / k]);
      gg.strokeRect(x, y, w, h);
      gg.setLineDash([]);
      gg.fillStyle = "#e11d2a";
      const hs = 9 / k;
      [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h],
      ].forEach((p) => gg.fillRect(p[0] - hs, p[1] - hs, hs * 2, hs * 2));
      if (mA) {
        gg.strokeStyle = "#2f5fb3";
        gg.lineWidth = 3 / k;
        gg.beginPath();
        gg.arc(mA[0], mA[1], 7 / k, 0, 7);
        gg.stroke();
        if (mB) {
          gg.beginPath();
          gg.moveTo(mA[0], mA[1]);
          gg.lineTo(mB[0], mB[1]);
          gg.stroke();
          gg.beginPath();
          gg.arc(mB[0], mB[1], 7 / k, 0, 7);
          gg.stroke();
        }
      }
    };
    const pt = (e) => {
      const r = cvs.getBoundingClientRect();
      return [(e.clientX - r.left) / k, (e.clientY - r.top) / k];
    };
    let dr = null;
    cvs.style.touchAction = "none";
    cvs.onpointerdown = (e) => {
      e.preventDefault();
      const p = pt(e);
      if (mode === "meas") {
        if (!mA || mB) {
          mA = p;
          mB = null;
        } else {
          mB = p;
          const m = d.querySelector(".npimm");
          if (m) setTimeout(() => m.focus(), 50);
        }
        d.querySelector(".npimtxt").textContent = mB
          ? "Now type the real length between the two points."
          : "Now tap the other end.";
        paint();
        return;
      }
      const x = c.x * nw,
        y = c.y * nh,
        w = c.w * nw,
        h = c.h * nh,
        tol = 22 / k;
      const cs = [
        [x, y, "tl"],
        [x + w, y, "tr"],
        [x, y + h, "bl"],
        [x + w, y + h, "br"],
      ];
      const hit = cs.find((q) => Math.abs(q[0] - p[0]) < tol && Math.abs(q[1] - p[1]) < tol);
      if (hit) dr = { k: hit[2], st: p, c: Object.assign({}, c) };
      else if (
        !(c.w > 0.995 && c.h > 0.995) &&
        p[0] > x &&
        p[0] < x + w &&
        p[1] > y &&
        p[1] < y + h
      )
        dr = { k: "move", st: p, c: Object.assign({}, c) };
      else dr = { k: "new", st: p, c: Object.assign({}, c) };
      try {
        cvs.setPointerCapture(e.pointerId);
      } catch (_) {}
    };
    cvs.onpointermove = (e) => {
      if (!dr) return;
      const p = pt(e);
      const fx = (v) => Math.max(0, Math.min(1, v / nw)),
        fy = (v) => Math.max(0, Math.min(1, v / nh));
      let x0 = dr.c.x,
        y0 = dr.c.y,
        x1 = dr.c.x + dr.c.w,
        y1 = dr.c.y + dr.c.h;
      if (dr.k === "move") {
        const dx = (p[0] - dr.st[0]) / nw,
          dy = (p[1] - dr.st[1]) / nh;
        const nx = Math.max(0, Math.min(1 - dr.c.w, dr.c.x + dx)),
          ny = Math.max(0, Math.min(1 - dr.c.h, dr.c.y + dy));
        c = { x: nx, y: ny, w: dr.c.w, h: dr.c.h };
        paint();
        return;
      }
      if (dr.k === "new") {
        x0 = fx(Math.min(dr.st[0], p[0]));
        x1 = fx(Math.max(dr.st[0], p[0]));
        y0 = fy(Math.min(dr.st[1], p[1]));
        y1 = fy(Math.max(dr.st[1], p[1]));
      } else {
        if (dr.k[1] === "l") x0 = fx(p[0]);
        else x1 = fx(p[0]);
        if (dr.k[0] === "t") y0 = fy(p[1]);
        else y1 = fy(p[1]);
      }
      const mn = 0.02;
      if (x1 - x0 < mn || y1 - y0 < mn) {
        if (dr.k === "new") return;
      }
      c = {
        x: Math.min(x0, x1),
        y: Math.min(y0, y1),
        w: Math.max(mn, Math.abs(x1 - x0)),
        h: Math.max(mn, Math.abs(y1 - y0)),
      };
      paint();
    };
    cvs.onpointerup = cvs.onpointercancel = () => {
      dr = null;
    };
    const setMode = (m) => {
      mode = m;
      d.querySelectorAll(".npimode button").forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.m === m)),
      );
      d.querySelector(".npihint").textContent =
        m === "crop"
          ? "Drag the box (or its corners) round the part you want to keep. Everything outside the box is left off."
          : "Tap one end of something you know the length of (a wall, a dimension line), then the other end.";
      const me = d.querySelector(".npimeas");
      if (me) me.hidden = m !== "meas";
      if (m === "meas") {
        const sc = d.querySelector(".npisc");
        if (sc) sc.value = "m";
      }
    };
    d.querySelectorAll(".npimode button").forEach((b) => (b.onclick = () => setMode(b.dataset.m)));
    const sc = d.querySelector(".npisc");
    if (sc)
      sc.onchange = () => {
        if (sc.value === "m") setMode("meas");
        else {
          const me = d.querySelector(".npimeas");
          if (me) me.hidden = true;
          if (mode === "meas") setMode("crop");
        }
      };
    if (sc && sc.value === "m") {
      const me = d.querySelector(".npimeas");
      if (me) me.hidden = false;
    }
    d.querySelector(".npix").onclick = () => d.remove();
    const all = d.querySelector(".npiall");
    if (all)
      all.onclick = () => {
        c = { x: 0, y: 0, w: 1, h: 1 };
        paint();
      };
    d.querySelector(".npiok").onclick = () => {
      let mmpp = null;
      if (!opt.recrop) {
        const v = sc.value;
        if (v === "m") {
          const L = parseFloat(
            String((d.querySelector(".npimm") || {}).value || "").replace(",", "."),
          );
          if (!(mA && mB)) {
            toast("Tap both ends of a length you know first");
            setMode("meas");
            return;
          }
          if (!(L > 0)) {
            toast("Type the real length in mm");
            d.querySelector(".npimm").focus();
            return;
          }
          const px = Math.hypot(mB[0] - mA[0], mB[1] - mA[1]);
          if (px < 3) {
            toast("Tap two points further apart");
            return;
          }
          mmpp = L / px;
        } else if (v !== "fit") mmpp = (opt.wmm * +v) / nw;
      }
      d.remove();
      done({ crop: c.w > 0.999 && c.h > 0.999 ? null : c, mmpp });
    };
    paint();
  }
  const impPlace = (key, im, res) => {
    const nw = im.naturalWidth,
      nh = im.naturalHeight,
      c = res.crop || { x: 0, y: 0, w: 1, h: 1 };
    const r = stage.getBoundingClientRect();
    let u;
    if (res.mmpp && doc.scale) u = (res.mmpp * NP_U) / doc.scale;
    else {
      const [fw] = fitImg(im, r);
      u = fw / nw;
    }
    const w = c.w * nw * u,
      h = c.h * nh * u;
    const [cx, cy] = toPage(r.left + r.width / 2, r.top + r.height / 2);
    snap();
    const o = { t: "img", x: cx - w / 2, y: cy - h / 2, w, h, src: key };
    if (res.crop) o.crop = res.crop;
    if (res.mmpp) o.mmpp = res.mmpp;
    if (!sized() && o.y + h > doc.h - 40) doc.h = Math.ceil((o.y + h + 400) / 100) * 100;
    doc.objs.push(o);
    setTool("move");
    sel = doc.objs.length - 1;
    draw();
    toast(
      res.mmpp && doc.scale
        ? w > doc.w || h > doc.h
          ? "Placed to scale. It's bigger than this page: crop it, or pick bigger paper in 📐 Paper"
          : "Placed to scale. Drag to move it; ✂ Crop to trim it again"
        : "Placed. Drag to move, corner to resize",
    );
  };
  function recropImg(o) {
    const im = loadImg(o.src);
    if (!(im.complete && im.naturalWidth)) {
      toast("Still loading, try again in a moment");
      return;
    }
    cropDlg(im, { recrop: true, crop: o.crop }, (res) => {
      const nw = im.naturalWidth,
        nh = im.naturalHeight,
        oc = o.crop || { x: 0, y: 0, w: 1, h: 1 },
        nc = res.crop || { x: 0, y: 0, w: 1, h: 1 };
      const u = o.w / (oc.w * nw);
      snap();
      const W = nc.w * nw * u,
        H = nc.h * nh * u;
      let d0 = [
        (nc.x + nc.w / 2 - (oc.x + oc.w / 2)) * nw * u,
        (nc.y + nc.h / 2 - (oc.y + oc.h / 2)) * nh * u,
      ];
      if (o.fl) d0[0] = -d0[0];
      if (o.r) d0 = rot(d0, [0, 0], o.r);
      const ccx = o.x + o.w / 2 + d0[0],
        ccy = o.y + o.h / 2 + d0[1];
      o.w = W;
      o.h = H;
      o.x = ccx - W / 2;
      o.y = ccy - H / 2;
      if (res.crop) o.crop = res.crop;
      else delete o.crop;
      dirty = true;
      draw();
      toast("Cropped. The scale hasn't changed");
    });
  }
  async function impPdfPages(buf) {
    await loadPdfJs();
    const pdf = await window.pdfjsLib.getDocument({
      data: new Uint8Array(buf),
      isEvalSupported: false,
    }).promise;
    return pdf;
  }
  async function impFromBlob(blob, type, name) {
    try {
      if (/pdf/i.test(type || "") || /\.pdf$/i.test(name || "")) {
        toast("Opening the PDF…");
        const pdf = await impPdfPages(await blob.arrayBuffer());
        let n = 1;
        if (pdf.numPages > 1) {
          n = await new Promise((res) => {
            const d = document.createElement("div");
            d.className = "dimask";
            d.innerHTML = `<div class="dimbox"><b>Which page?</b><div class="seg">${Array.from({ length: Math.min(pdf.numPages, 40) }, (_, i) => `<button type="button" data-p="${i + 1}">Page ${i + 1}</button>`).join("")}</div><div class="dimbtns"><button type="button" class="btn npx2">Cancel</button></div></div>`;
            ov.appendChild(d);
            d.querySelectorAll("[data-p]").forEach(
              (b) =>
                (b.onclick = () => {
                  d.remove();
                  res(+b.dataset.p);
                }),
            );
            d.querySelector(".npx2").onclick = () => {
              d.remove();
              res(0);
            };
          });
          if (!n) return;
        }
        const pg = await pdf.getPage(n);
        const v1 = pg.getViewport({ scale: 1 });
        const sc = Math.min(4, 3600 / Math.max(v1.width, v1.height));
        const v = pg.getViewport({ scale: sc });
        const cv2 = document.createElement("canvas");
        cv2.width = Math.round(v.width);
        cv2.height = Math.round(v.height);
        const g2 = cv2.getContext("2d");
        g2.fillStyle = "#fff";
        g2.fillRect(0, 0, cv2.width, cv2.height);
        await pg.render({ canvasContext: g2, viewport: v }).promise;
        const b = await new Promise((r) => cv2.toBlob(r, "image/jpeg", 0.9));
        cv2.width = cv2.height = 1;
        const key = "local:" + ++lc;
        locals[key] = { blob: b, url: URL.createObjectURL(b) };
        const im = await loadImage(b);
        imgs[key] = im;
        const wmm = (v1.width * 25.4) / 72,
          hmm = (v1.height * 25.4) / 72;
        cropDlg(im, { wmm, hmm, guess: doc.scale || 50 }, (res) => impPlace(key, im, res));
      } else {
        const b = await shrinkImage(blob, 3600);
        const key = "local:" + ++lc;
        locals[key] = { blob: b, url: URL.createObjectURL(b) };
        const im = await loadImage(b);
        imgs[key] = im;
        cropDlg(im, {}, (res) => impPlace(key, im, res));
      }
    } catch (e) {
      toast(
        /pdf/i.test(type || "")
          ? "That PDF couldn't be opened here. It needs signal the first time."
          : "That file couldn't be opened",
      );
    }
  }
  q(".np-import").onclick = () => {
    const d = document.createElement("div");
    d.className = "dimask";
    d.innerHTML = `<div class="dimbox"><b>📥 Import a drawing</b><div class="who">Bring in a plan or drawing (PDF or picture). Tell it the scale, or measure a length you know, and it goes in at the right size for this drawing. Then crop away what you don't need.</div>
      <label class="btn primary" style="text-align:center">📁 From my files<input type="file" accept="application/pdf,.pdf,image/*" hidden></label>
      <button type="button" class="btn npiapp">🏗️ From the app (site plans & drawings)</button>
      <div class="dimbtns"><button type="button" class="btn npx3">Cancel</button></div></div>`;
    ov.appendChild(d);
    d.querySelector(".npx3").onclick = () => d.remove();
    d.querySelector("input").onchange = (e) => {
      const f = e.target.files[0];
      d.remove();
      if (f) impFromBlob(f, f.type, f.name);
    };
    d.querySelector(".npiapp").onclick = () => {
      d.remove();
      siteFilePicker(doc.site || null, [], async (items) => {
        const it = (items || []).find((x) => /pdf|image/i.test(x.contentType || ""));
        if (!it) {
          toast("Pick a PDF or a picture");
          return;
        }
        toast("Opening…");
        try {
          const b = await (await fetch(blobUrl(it.assetId))).blob();
          impFromBlob(b, it.contentType, it.fileName);
        } catch (e) {
          toast("Couldn't open that file. Check your connection.");
        }
      });
    };
  };
  /* title box drawn on the page itself (bottom right), so the preview, PDF and anyone opening it see it */
  let logoIm = null;
  try {
    logoIm = loadImg(logoId());
  } catch (e) {}
  function tbox(ctx, i) {
    if (!sized() || !doc.info || !doc.info.show) return;
    const U = NP_U,
      co = coData(),
      inf = doc.info,
      pgx = doc.pages[i] || {};
    const Wmm = doc.w / U,
      Hmm = doc.h / U;
    const M = 6,
      bw = Math.min(122, Wmm * 0.5),
      bh = 41,
      bx = (Wmm - M - bw) * U,
      by = (Hmm - M - bh) * U,
      W = bw * U;
    ctx.save();
    ctx.setLineDash([]);
    ctx.lineWidth = 0.35 * U;
    ctx.strokeStyle = "#222";
    ctx.strokeRect(M * U, M * U, doc.w - 2 * M * U, doc.h - 2 * M * U);
    ctx.fillStyle = "#fff";
    ctx.fillRect(bx, by, W, bh * U);
    ctx.strokeRect(bx, by, W, bh * U);
    ctx.fillStyle = brandHex();
    ctx.fillRect(bx, by, W, 1.6 * U);
    const fit = (t, max) => {
      t = String(t || "");
      if (ctx.measureText(t).width <= max) return t;
      while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
      return t + "…";
    };
    const txt = (t, x, y, mm, bold, col, max) => {
      ctx.font = `${bold ? 700 : 500} ${mm * U}px system-ui,-apple-system,sans-serif`;
      ctx.fillStyle = col || "#111";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(fit(t, max || W), x, y);
    };
    const lgw = 32 * U,
      lgh = 11 * U;
    if (logoIm && logoIm.complete && logoIm.naturalWidth) {
      const k = Math.min(lgw / logoIm.naturalWidth, lgh / logoIm.naturalHeight);
      const w = logoIm.naturalWidth * k,
        h = logoIm.naturalHeight * k;
      ctx.drawImage(logoIm, bx + W - 2 * U - w, by + 2.8 * U + (lgh - h) / 2, w, h);
    }
    const pad = 2.5 * U,
      tw = W - pad * 2 - 34 * U;
    /* long text: shrink to fit, then split onto two lines rather than running under the logo */
    const wrapTxt = (t, x, y, mm, minMm, bold, col, max, y2, mm2) => {
      t = String(t || "");
      const fnt = (v) => {
        ctx.font = `${bold ? 700 : 500} ${v * U}px system-ui,-apple-system,sans-serif`;
      };
      for (let v = mm; v >= minMm - 1e-6; v -= 0.2) {
        fnt(v);
        if (ctx.measureText(t).width <= max) {
          ctx.fillStyle = col;
          ctx.textBaseline = "alphabetic";
          ctx.fillText(t, x, y);
          return;
        }
      }
      fnt(mm2);
      const ws = t.split(/\s+/);
      let a = "";
      let i = 0;
      for (; i < ws.length; i++) {
        const tr = a ? a + " " + ws[i] : ws[i];
        if (ctx.measureText(tr).width > max && a) break;
        a = tr;
      }
      const b = ws.slice(i).join(" ");
      ctx.fillStyle = col;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(fit(a, max), x, y2[0]);
      if (b) ctx.fillText(fit(b, max), x, y2[1]);
    };
    txt(co.name.toUpperCase(), bx + pad, by + 6 * U, 2.6, true, brandHex(), tw);
    const head = pgx.type || q(".np-title").value.trim() || "Drawing";
    wrapTxt(
      head,
      bx + pad,
      by + 11.6 * U,
      4.2,
      3.0,
      true,
      "#111",
      tw,
      [by + 9.4 * U, by + 12.4 * U],
      2.7,
    );
    const ttl = q(".np-title").value.trim();
    if (pgx.type && ttl && ttl !== pgx.type)
      wrapTxt(
        ttl,
        bx + pad,
        by + 15.2 * U,
        2.4,
        1.8,
        false,
        "#444",
        tw,
        [by + 14.6 * U, by + 16.6 * U],
        1.7,
      );
    {
      const ct = [
        co.mobile || co.phone ? "Tel " + (co.mobile || co.phone) : "",
        co.email || "",
        co.website
          ? String(co.website)
              .replace(/^https?:\/\//, "")
              .replace(/\/$/, "")
          : "",
      ]
        .filter(Boolean)
        .join("  ·  ");
      if (ct)
        wrapTxt(
          ct,
          bx + pad,
          by + 19.2 * U,
          2.3,
          1.6,
          false,
          "#333",
          W - pad * 2,
          [by + 18.0 * U, by + 20.1 * U],
          1.6,
        );
    }
    const ln = (x1, y1, x2, y2) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    ctx.lineWidth = 0.25 * U;
    ctx.strokeStyle = "#888";
    const cell = (lab, val, x, y, w) => {
      txt(lab, x + 1.6 * U, y + 2.5 * U, 1.7, true, "#777", w - 3 * U);
      wrapTxt(
        val,
        x + 1.6 * U,
        y + 5.7 * U,
        2.7,
        2.1,
        false,
        "#111",
        w - 3 * U,
        [y + 4.4 * U, y + 6.2 * U],
        1.75,
      );
    };
    const r1 = by + 21 * U,
      r2 = r1 + 6.4 * U,
      r3 = r2 + 6.4 * U;
    ln(bx, r1, bx + W, r1);
    ln(bx, r2, bx + W, r2);
    ln(bx, r3, bx + W, r3);
    {
      const cl = (doc.site || opts.site) && ownerMode() ? siteClient(doc.site || opts.site) : null;
      const cn = inf.client != null ? inf.client : cl ? cl.name : "";
      const ca = inf.clientAddr != null ? inf.clientAddr : cl ? clAddr(cl) : "";
      cell("CLIENT", [cn, ca].filter(Boolean).join(" · ") || "—", bx, r1, W);
    }
    const c3 = W / 3;
    ln(bx + c3, r2, bx + c3, r3);
    ln(bx + 2 * c3, r2, bx + 2 * c3, r3);
    cell("SCALE", (doc.scale ? "1:" + doc.scale : "Not to scale") + " @ " + doc.size, bx, r2, c3);
    cell(
      "DATE",
      inf.date
        ? parse(inf.date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "—",
      bx + c3,
      r2,
      c3,
    );
    cell("REV", inf.rev || "—", bx + 2 * c3, r2, c3);
    const c2 = W / 2;
    ln(bx + c2, r3, bx + c2, by + bh * U);
    cell(
      "SHEET",
      `${i + 1} of ${doc.pages.length}${pgx.name && pgx.name !== pgx.type ? " · " + pgx.name : ""}`,
      bx,
      r3,
      c2,
    );
    cell("DRAWN BY", inf.by || myName(), bx + c2, r3, c2);
    if (inf.status) {
      const SC = {
        "For construction": "#15803d",
        "As built": "#334155",
        "For approval": "#b45309",
        "For comment": "#b45309",
        "Preliminary": "#64748b",
      };
      const sh = 5 * U;
      ctx.fillStyle = SC[inf.status] || brandHex();
      ctx.fillRect(bx, by - sh, W, sh);
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 0.35 * U;
      ctx.strokeRect(bx, by - sh, W, sh);
      ctx.font = `700 ${2.8 * U}px system-ui,-apple-system,sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(inf.status.toUpperCase(), bx + W / 2, by - sh / 2);
      ctx.textAlign = "left";
    }
    if ((inf.revs || []).length) {
      const rs = inf.revs.slice(-5),
        rh = 3.8 * U,
        top = by - (inf.status ? 5 * U : 0) - rh * (rs.length + 1);
      ctx.fillStyle = "#fff";
      ctx.fillRect(bx, top, W, rh * (rs.length + 1));
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 0.35 * U;
      ctx.strokeRect(bx, top, W, rh * (rs.length + 1));
      const cx1 = bx + 9 * U,
        cx2 = bx + 26 * U;
      [["REV", "DATE", "DESCRIPTION"], ...rs.map((r) => [r.r, r.date, r.note])].forEach(
        (row, k) => {
          const yy = top + rh * k + rh * 0.72,
            hd = !k,
            cl = hd ? "#777" : "#111",
            mm = hd ? 1.7 : 2.1;
          txt(row[0], bx + 1.6 * U, yy, mm, true, cl, 7 * U);
          txt(row[1], cx1, yy, mm, hd, cl, 16 * U);
          txt(row[2], cx2, yy, mm, hd, cl, W - (cx2 - bx) - 2 * U);
          if (k) {
            ctx.strokeStyle = "#ccc";
            ctx.lineWidth = 0.2 * U;
            ctx.beginPath();
            ctx.moveTo(bx, top + rh * k);
            ctx.lineTo(bx + W, top + rh * k);
            ctx.stroke();
          }
        },
      );
    }
    ctx.restore();
  }
  q(".np-title").addEventListener("input", () => draw());
  q(".np-info").onclick = () => {
    const d = document.createElement("div");
    d.className = "dimask";
    const inf = doc.info,
      pgx = doc.pages[pg];
    const known = NP_TYPES.includes(pgx.type || "");
    d.innerHTML = `<form class="dimbox npsetup"><b>🏷 Drawing details</b><div class="who">Shown in the title box on the drawing and on the PDF.</div>
      <label>What drawing is this?${doc.pages.length > 1 ? ` <span class="who">(this page: ${esc(pgx.name || "Page " + (pg + 1))})</span>` : ""}<select class="ni-type"><option value="">Choose…</option>${NP_TYPES.map((t) => `<option ${pgx.type === t ? "selected" : ""}>${esc(t)}</option>`).join("")}<option value="__other" ${pgx.type && !known ? "selected" : ""}>Other (type it in)</option></select></label>
      <input class="ni-other" maxlength="60" placeholder="e.g. Garage conversion layout" value="${esc(pgx.type && !known ? pgx.type : "")}" ${pgx.type && !known ? "" : "hidden"}>
      ${pickField("ni-job", "Job", siteNames(), doc.site || opts.site || "", "e.g. 12 Marine Way, Exmouth", false)}
      <div class="grid2"><label>Date<input type="date" class="ni-date" value="${esc(inf.date || iso(new Date()))}"></label><label>Scale<select class="ni-scale">${NP_SCALES.map((v) => `<option value="${v}" ${(+doc.scale || 0) === v ? "selected" : ""}>${v ? "1:" + v : "Not to scale"}</option>`).join("")}</select></label></div>
      ${(() => {
        const cl =
          (doc.site || opts.site) && ownerMode() ? siteClient(doc.site || opts.site) : null;
        return `<div class="grid2"><label>Client name<input class="ni-cn" maxlength="80" placeholder="Filled in from the job" value="${esc(inf.client != null ? inf.client : cl ? cl.name : "")}"></label><label>Client address<input class="ni-ca" maxlength="160" placeholder="Filled in from the job" value="${esc(inf.clientAddr != null ? inf.clientAddr : cl ? clAddr(cl) : "")}"></label></div>`;
      })()}
      <div class="grid2"><label>Revision<input class="ni-rev" maxlength="10" placeholder="e.g. A" value="${esc(inf.rev || "")}"></label><label>Drawn by<input class="ni-by" maxlength="40" value="${esc(inf.by || myName())}"></label></div>
      <label>Status<select class="ni-st">${["", "Preliminary", "For comment", "For approval", "For planning", "For building regs", "For tender", "For construction", "As built"].map((v) => `<option value="${v}" ${(inf.status || "") === v ? "selected" : ""}>${v || "No status"}</option>`).join("")}</select></label>
      ${(inf.revs || []).length ? `<div class="who" style="margin-top:6px">Revisions so far: ${inf.revs.map((r) => `<b>${esc(r.r)}</b> ${esc(r.date)} – ${esc(r.note)}`).join(" · ")}</div>` : ""}
      <label>New revision: what changed? <span class="who">(leave blank if nothing; it gets the next letter)</span><input class="ni-revnote" maxlength="80" placeholder="e.g. Kitchen window widened to 1200"></label>
      ${sized() ? `<label class="inl" style="margin-top:8px;color:var(--ink)"><input type="checkbox" class="ni-show" ${inf.show ? "checked" : ""}> Show the title box on the drawing</label>` : `<div class="who" style="margin-top:6px">Pick a paper size in 📐 Paper to show a title box on the drawing.</div>`}
      <div class="dimbtns"><button type="button" class="btn nix">Cancel</button><button type="submit" class="btn primary">Done</button></div></form>`;
    ov.appendChild(d);
    wirePicks(d);
    const ty = d.querySelector(".ni-type"),
      ot = d.querySelector(".ni-other");
    {
      const js = d.querySelector("#ni-job"),
        fill = () => {
          const v = pickVal("ni-job");
          const cl = v && ownerMode() ? siteClient(v) : null;
          const cn = d.querySelector(".ni-cn"),
            ca = d.querySelector(".ni-ca");
          if (cl) {
            cn.value = cl.name || "";
            ca.value = clAddr(cl);
          }
        };
      if (js) js.addEventListener("change", fill);
    }
    ty.onchange = () => {
      ot.hidden = ty.value !== "__other";
      if (!ot.hidden) ot.focus();
    };
    d.querySelector(".nix").onclick = () => d.remove();
    d.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      const t = ty.value === "__other" ? ot.value.trim() : ty.value;
      pgx.type = t;
      if (t && (!pgx.name || /^Page \d+$/.test(pgx.name))) pgx.name = t;
      doc.site = pickVal("ni-job");
      inf.date = d.querySelector(".ni-date").value;
      doc.scale = +d.querySelector(".ni-scale").value || 0;
      inf.rev = d.querySelector(".ni-rev").value.trim();
      {
        const cn = d.querySelector(".ni-cn").value.trim(),
          ca = d.querySelector(".ni-ca").value.trim();
        const cl = doc.site && ownerMode() ? siteClient(doc.site) : null;
        inf.client = !cn || (cl && cn === cl.name) ? null : cn;
        inf.clientAddr = !ca || (cl && ca === clAddr(cl)) ? null : ca;
        if (inf.client === null) delete inf.client;
        if (inf.clientAddr === null) delete inf.clientAddr;
      }
      inf.by = d.querySelector(".ni-by").value.trim();
      inf.status = d.querySelector(".ni-st").value;
      if (!inf.status) delete inf.status;
      {
        const rn = d.querySelector(".ni-revnote").value.trim();
        if (rn) {
          inf.revs = inf.revs || [];
          const last = inf.revs.length ? inf.revs[inf.revs.length - 1].r : "";
          const nx = last ? String.fromCharCode(Math.min(90, last.charCodeAt(0) + 1)) : "A";
          inf.revs.push({
            r: nx,
            date: new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "2-digit",
            }),
            note: rn,
          });
          inf.rev = nx;
        }
      }
      const sh = d.querySelector(".ni-show");
      if (sh) inf.show = sh.checked;
      if (!q(".np-title").value.trim() && t) q(".np-title").value = t;
      dirty = true;
      d.remove();
      drawPages();
      draw();
      if (wantSend) {
        wantSend = false;
        setTimeout(() => q(".np-send") && q(".np-send").click(), 50);
      }
    };
  };
  let wantSend = false,
    sendFlag = false;
  if (q(".np-send"))
    q(".np-send").onclick = () => {
      doc.pages[pg].objs = doc.objs;
      if (!doc.pages.some((p) => p.objs.length)) {
        toast("Draw something first");
        return;
      }
      const miss = [];
      if (!doc.pages.some((p) => p.type)) miss.push("what the drawing is");
      if (!doc.site) miss.push("the job");
      if (!q(".np-title").value.trim()) miss.push("a title");
      if (miss.length) {
        wantSend = true;
        toast("Fill in the details first: " + miss.join(", "));
        q(".np-info").click();
        return;
      }
      sendFlag = true;
      q(".np-save").click();
    };
  /* render a page to a canvas (for save + PDF) */
  async function renderPage(i, k, H) {
    const objs = i === pg ? doc.objs : doc.pages[i].objs;
    const h = H || doc.h;
    const oc = document.createElement("canvas");
    oc.width = Math.max(1, Math.round(doc.w * k));
    oc.height = Math.max(1, Math.round(h * k));
    const og = oc.getContext("2d");
    og.scale(k, k);
    og.__s = k;
    paper(og, doc.w, h, 0, 0, doc.w, h);
    og.__mm = doc.scale ? NP_U / doc.scale : 0;
    for (const o of objs) {
      if (o.t === "img") {
        const im = imgs[o.src] || loadImg(o.src);
        if (im && !(im.complete && im.naturalWidth))
          await new Promise((r) => {
            im.onload = r;
            im.onerror = r;
            setTimeout(r, 8000);
          });
      }
    }
    npDrawAll(og, visObjs(objs), drawObj);
    if (logoIm && !logoIm.complete)
      await new Promise((r) => {
        logoIm.addEventListener("load", r);
        logoIm.addEventListener("error", r);
        setTimeout(r, 4000);
      });
    tbox(og, i);
    return oc;
  }
  const close = () => {
    window.removeEventListener("resize", size);
    ov.remove();
    document.body.style.overflow = "";
    Object.values(locals).forEach((l) => URL.revokeObjectURL(l.url));
  };
  q(".np-cancel").onclick = () => {
    if (dirty && !q(".np-cancel").dataset.armed) {
      q(".np-cancel").dataset.armed = "1";
      q(".np-cancel").textContent = "Discard?";
      setTimeout(() => {
        const b = q(".np-cancel");
        if (b) {
          b.dataset.armed = "";
          b.textContent = "Cancel";
        }
      }, 3000);
      return;
    }
    close();
  };
  if (q(".np-dxf"))
    q(".np-dxf").onclick = async () => {
      if (!S.dl) {
        toast("Downloads only work when the page is opened in claude.ai");
        return;
      }
      if (!doc.baseScale && !doc.objs.some(vpOf))
        toast(
          "No scale set, so the DXF is in paper millimetres. Set a scale in 📐 Paper for real sizes",
        );
      try {
        const txt = npDxf(doc, pg, visObjs, drawObj, npLayerOf);
        const nm =
          (
            (q(".np-title").value.trim() || "Drawing") +
            (doc.pages.length > 1 ? " - " + (doc.pages[pg].name || "Page " + (pg + 1)) : "")
          )
            .replace(/[^\w\s&().-]/g, "")
            .trim() || "Drawing";
        await S.dl.save({
          filename: nm + ".dxf",
          data: new Blob([txt], { type: "application/dxf" }),
        });
        toast("DXF saved: real sizes in millimetres, one CAD layer per app layer");
      } catch (e) {
        if (!(e && e.code === "declined")) toast("Couldn't make the DXF");
      }
    };
  q(".np-pdf").onclick = async () => {
    NP_SCX = 0;
    const btn = q(".np-pdf");
    if (!S.dl) {
      toast("Downloads only work when the page is opened in claude.ai");
      return;
    }
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = "Making…";
    try {
      await loadJsPdf();
    } catch (e) {
      toast("Couldn't load the PDF maker. Check your connection.");
      btn.disabled = false;
      btn.textContent = old;
      return;
    }
    try {
      doc.pages[pg].objs = doc.objs;
      const title = q(".np-title").value.trim() || "Drawing";
      const Wmm = doc.w / NP_U,
        Hmm = doc.h / NP_U;
      const pdf = new window.jspdf.jsPDF({
        unit: "mm",
        format: [Wmm, Hmm],
        orientation: Wmm >= Hmm ? "landscape" : "portrait",
      });
      const co = coData();
      const clean = (t) =>
        String(t || "")
          .replace(/[–—]/g, "-")
          .replace(/[‘’]/g, "'")
          .replace(/[“”]/g, '"')
          .replace(/[^\x09\x0A\x0D\x20-\x7E£·•°]/g, "");
      const k = Math.min(150 / 25.4 / NP_U, 4000 / Math.max(doc.w, doc.h));
      for (let i = 0; i < doc.pages.length; i++) {
        if (i) pdf.addPage([Wmm, Hmm], Wmm >= Hmm ? "landscape" : "portrait");
        btn.textContent = `Page ${i + 1}/${doc.pages.length}…`;
        const oc = await renderPage(i, k);
        pdf.addImage(oc.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, Wmm, Hmm);
        const M = 6;
        if (!(doc.info && doc.info.show && sized())) {
          pdf.setDrawColor(40);
          pdf.setLineWidth(0.35);
          pdf.rect(M, M, Wmm - 2 * M, Hmm - 2 * M);
        }
        if (doc.scale) {
          pdf.setFontSize(6.5);
          pdf.setTextColor(110);
          pdf.text(
            clean("Check all sizes on site. Do not scale if printed at a different size."),
            M + 2,
            Hmm - M - 2,
          );
        }
      }
      const fn =
        (clean(title)
          .replace(/[^\w\s-]/g, "")
          .trim() || "Drawing") +
        " " +
        iso(new Date()) +
        ".pdf";
      const blobOut = pdf.output("blob");
      try {
        await S.dl.save({ filename: fn, data: blobOut });
        toast("PDF saved: " + fn);
      } catch (e2) {
        if (!(e2 && e2.code === "declined")) pdfShow(blobOut, fn);
      }
    } catch (e) {
      toast("Couldn't make the PDF");
    }
    btn.disabled = false;
    btn.textContent = old;
  };
  q(".np-save").onclick = async () => {
    const btn = q(".np-save");
    doc.pages[pg].objs = doc.objs;
    if (!doc.pages.some((p) => p.objs.length)) {
      toast("The drawing is empty");
      return;
    }
    if (!opts.local && !S.assets) {
      toast(uploadErr({ code: "not_granted" }));
      return;
    }
    btn.disabled = true;
    try {
      doc.title = q(".np-title").value.trim();
      const loc = opts.local
        ? []
        : doc.pages
            .flatMap((p) => p.objs)
            .filter((o) => o.t === "img" && o.src.startsWith("local:"));
      for (let i = 0; i < loc.length; i++) {
        btn.textContent = `Photos ${i + 1}/${loc.length}…`;
        const a = await uploadFile(locals[loc[i].src].blob, "page-photo.jpg");
        imgs[a.id] = imgs[loc[i].src];
        loc[i].src = a.id;
      }
      btn.textContent = "Saving…";
      /* preview: every page stacked, so whoever opens it sees the lot */
      const k = Math.min(1, 1600 / doc.w);
      const parts = [];
      for (let i = 0; i < doc.pages.length; i++) {
        let H = doc.h;
        if (!sized()) {
          let maxY = 0;
          doc.pages[i].objs.forEach((o) => {
            const b = bbox(o);
            maxY = Math.max(maxY, b[1] + b[3]);
          });
          H = Math.min(doc.h, Math.max(1400, Math.ceil((maxY + 120) / 50) * 50));
        }
        if (doc.pages.length > 1 && !doc.pages[i].objs.length) continue;
        parts.push({ i, c: await renderPage(i, k, H) });
      }
      const gap = doc.pages.length > 1 ? Math.round(70 * k) + 20 : 0;
      const PW = parts[0].c.width,
        PH = parts.reduce((a, p) => a + p.c.height + gap, 0) - (gap ? 0 : 0);
      const oc = document.createElement("canvas");
      oc.width = PW;
      oc.height = Math.min(16000, PH);
      const og = oc.getContext("2d");
      og.fillStyle = "#d9d4d4";
      og.fillRect(0, 0, oc.width, oc.height);
      let y = 0;
      parts.forEach((p) => {
        if (gap) {
          og.fillStyle = "#3a3434";
          og.font = `700 ${Math.max(14, Math.round(gap * 0.5))}px system-ui,sans-serif`;
          og.textBaseline = "middle";
          og.fillText(doc.pages[p.i].name || "Page " + (p.i + 1), 10, y + gap / 2);
          y += gap;
        }
        og.drawImage(p.c, 0, y);
        y += p.c.height;
      });
      const prev = await new Promise((res, rej) =>
        oc.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.86),
      );
      const out = Object.assign({}, doc);
      delete out.objs;
      out.objs = doc.pages[0].objs;
      if (opts.local) {
        close();
        opts.onSave &&
          opts.onSave({
            blob: prev,
            title: doc.title,
            objs: doc.pages[0].objs,
            w: doc.w,
            h: doc.h,
          });
        return;
      }
      const pa = await uploadFile(prev, "page.jpg");
      const ja = await S.assets.upload(
        new Blob([JSON.stringify(out)], { type: "application/json" }),
        { type: "application/json" },
      );
      close();
      opts.onSave &&
        opts.onSave({
          preview: pa.id,
          src: ja.id,
          title: doc.title,
          site: doc.site || "",
          send: sendFlag,
          type: (doc.pages.find((p) => p.type) || {}).type || "",
        });
    } catch (e) {
      sendFlag = false;
      btn.disabled = false;
      btn.textContent = "Save";
      toast(uploadErr(e));
    }
  };
  if (opts.render) {
    /* headless: hand back each page as a picture at print quality */
    const out = [];
    const k = Math.min(150 / 25.4 / NP_U, 3200 / Math.max(doc.w, doc.h));
    for (let i = 0; i < doc.pages.length; i++) {
      if (doc.pages.length > 1 && !doc.pages[i].objs.length) continue;
      let H = doc.h;
      if (!sized()) {
        let maxY = 0;
        doc.pages[i].objs.forEach((o) => {
          const b = bbox(o);
          maxY = Math.max(maxY, b[1] + b[3]);
        });
        H = Math.min(doc.h, Math.max(1400, Math.ceil((maxY + 120) / 50) * 50));
      }
      const oc = await renderPage(i, k, H);
      const wmm = sized() ? doc.w / NP_U : 210,
        hmm = sized() ? doc.h / NP_U : (210 * H) / doc.w;
      out.push({
        data: oc.toDataURL("image/jpeg", 0.88),
        wmm,
        hmm,
        name: doc.pages[i].name || "",
        title: doc.title || opts.title || "",
      });
    }
    return out;
  }
  window.addEventListener("resize", size);
  drawPages();
  size();
  fit();
  if (opts.addPhoto) {
    const pend = opts.addPhoto;
    (async () => {
      try {
        const b = await (await fetch(blobUrl(pend))).blob();
        const im = await loadImage(b);
        let w = doc.w - 200,
          h = (w * im.naturalHeight) / im.naturalWidth;
        if (sized() && h > doc.h - 200) {
          h = doc.h - 200;
          w = (h * im.naturalWidth) / im.naturalHeight;
        }
        doc.objs.push({ t: "img", x: 100, y: 100, w, h, src: pend });
        if (!sized() && h + 200 > doc.h) doc.h = Math.ceil((h + 600) / 100) * 100;
        draw();
      } catch (e) {}
    })();
  }
}

/* Runs once when the app starts, called from core/boot.js. Nothing else in this file runs at load. */
function initPaving() {
  NP_SHAPES.push(
    ...NP_XSHAPES,
    ["ductsup", "═ MVHR supply duct (blue)", "Heating & ventilation", "pro"],
    ["ductext", "═ MVHR extract duct (red)", "Heating & ventilation", "pro"],
    ["contour", "∿ Contour line (type the height)", "Survey & existing site", "pro"],
    ["bndry", "─·─ Site boundary", "Survey & existing site", "pro"],
    ["redline", "▬ Red line boundary", "Survey & existing site", "pro"],
    ["hedgerem", "✕ Hedge to be removed", "Survey & existing site", "pro"],
    ["fencerem", "✕ Fence to be removed", "Survey & existing site", "pro"],
    ["swale", "≈ Swale", "Drainage", "pro"],
    ["easement", "┄ Easement corridor (type the name)", "Services", "pro"],
    ["treefence", "╪ Tree protection fencing", "Construction phase", "pro"],
    ["walkway", "┅ Pedestrian walkway", "Construction phase", "pro"],
    ["lintelp", "┅ Lintel over opening (plan)", "Walls & structure", "pro"],
    ["steelub", "━ Steel beam with size (type it)", "Walls & structure", "pro"],
    ["movjoint", "‖ Movement joint", "Walls & structure", "pro"],
    ["firewall", "▧ Fire-rated wall", "Walls & structure", "pro"],
    ["kerb", "▭ Kerb (raised)", "External works", "pro"],
    ["kerbdrop", "▭ Dropped kerb", "External works", "pro"],
    ["kerbflush", "▭ Flush kerb / edging", "External works", "pro"],
    ["retweep", "▭ Retaining wall with weep holes", "External works", "pro"],
    ["gabion", "▦ Gabion wall", "External works", "pro"],
    ["secline", "A─A Section line (type the letter)", "Notes & details", "pro"],
    ["matchline", "─·─ Match line", "Notes & details", "pro"],
    ["lvlline", "─ 134.270 Level line (type the level)", "Landscaping", "pro"],
    ["embank", "╤ Top of bank / embankment", "Landscaping", "pro"],
    ["ubt", "┅ Telecoms underground cable (purple)", "Bridges, poles & cables", "pro"],
    ["fibre", "┅ Fibre optic cable (orange)", "Bridges, poles & cables", "pro"],
    ["ohl", "─·─ Overhead power line", "Bridges, poles & cables", "pro"],
    ["ohbt", "─·─ Overhead telecoms line", "Bridges, poles & cables", "pro"],
    ["landdrain", "┅ Perforated land drain", "Drainage", "pro"],
  );
  Object.assign(NP_REAL, NP_XREAL, {
    ductsup: [3000],
    ductext: [3000],
    contour: [5000],
    bndry: [5000],
    redline: [5000],
    hedgerem: [4000],
    fencerem: [4000],
    swale: [5000],
    easement: [6000],
    treefence: [5000],
    walkway: [5000],
    lintelp: [1500],
    steelub: [4000],
    movjoint: [3000],
    firewall: [3000],
    kerb: [4000],
    kerbdrop: [3000],
    kerbflush: [4000],
    retweep: [4000],
    gabion: [4000],
    secline: [6000],
    matchline: [6000],
    lvlline: [5000],
    embank: [5000],
    ubt: [5000],
    fibre: [5000],
    ohl: [10000],
    ohbt: [10000],
    landdrain: [5000],
  });
}
