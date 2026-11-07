/* ===== construction details: stud wall connections, framing, headers, ground floor and floor details ===== */
import { NP_BLD_BOX, NP_BLD_LINE, npBldLine, npBldSym } from "./components.js";
import { NP_BATHNICE, NP_NICE, NP_REAL, npBath, npNice } from "./paving.js";
import { NP_ANNO_BOX, NP_MEMBR, npAnnoLine, npAnnoSym, npFrame } from "./symbols-annotation.js";
import { NP_DES_BOX, npDesignLine, npDesignSym } from "./symbols-design.js";
import { npElevLine, npElevSym } from "./symbols-elevation.js";
import { NP_TIMB_BOX, npTimberSym } from "./timber.js";
import { NP_WALLK, npDrawWalls, npHexMix, npPattern, npWallInfo } from "./walls.js";
export {
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
  initConstructionDetails,
  npKeyEntries,
  npLbl,
  npStairN,
  npStairs,
  npSymLabel,
  npUnit,
};
const NP_DET_BOX = new Set([
  "sdTlad",
  "sdT3",
  "sdTbk",
  "sdL3",
  "sdLcal",
  "sdLblk",
  "sfDoor",
  "sfPlain",
  "sfPlat",
  "sfWin",
  "sfBrace",
  "sfBlock",
  "shFull",
  "shIns",
  "shVert",
  "shSingle",
  "gfSlab",
  "gfBB",
  "gfTimber",
  "jhanger",
  "jtrim",
  "jstrap",
  "ewCav",
  "ewBrick",
  "ewSolid",
  "ewStud",
  "ewBlock",
  "ewBrk",
  "fdnsec",
]);
function npDetailSym(ctx, o, x0, y0, w, h) {
  const lw = ctx.lineWidth,
    c = ctx.strokeStyle,
    x1 = x0 + w,
    y1 = y0 + h,
    m = Math.min(w, h);
  const T = "#f3e2c4",
    B = npHexMix(c, 0.82);
  const R = (x, y, ww, hh, f) => {
    if (ww < 0) {
      x += ww;
      ww = -ww;
    }
    if (hh < 0) {
      y += hh;
      hh = -hh;
    }
    ctx.save();
    ctx.fillStyle = f || T;
    ctx.fillRect(x, y, ww, hh);
    ctx.restore();
    ctx.strokeRect(x, y, ww, hh);
  };
  const X = (x, y, ww, hh, f) => {
    R(x, y, ww, hh, f);
    ctx.save();
    ctx.lineWidth = Math.max(lw * 0.5, 0.5);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + ww, y + hh);
    ctx.moveTo(x + ww, y);
    ctx.lineTo(x, y + hh);
    ctx.stroke();
    ctx.restore();
  };
  const ln = (a, b, cc, d, dash) => {
    ctx.save();
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(a, b);
    ctx.lineTo(cc, d);
    ctx.stroke();
    ctx.restore();
  };
  const ins = (x, y, ww, hh) => {
    ctx.save();
    ctx.fillStyle = "#fff1a8";
    ctx.fillRect(x, y, ww, hh);
    ctx.restore();
    ctx.strokeRect(x, y, ww, hh);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, ww, hh);
    ctx.clip();
    if (ww >= hh) npPattern(ctx, "insul", x, x + ww, y, y + hh, lw, c);
    else {
      ctx.translate(x, y + hh);
      ctx.rotate(-Math.PI / 2);
      npPattern(ctx, "insul", 0, hh, 0, ww, lw, c);
    }
    ctx.restore();
  };
  const conc = (x, y, ww, hh) => {
    ctx.strokeRect(x, y, ww, hh);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, ww, hh);
    ctx.clip();
    ctx.fillStyle = c;
    const st = Math.max(Math.min(ww, hh) / 6, 3);
    let k = 0;
    for (let yy = y + st / 2; yy < y + hh; yy += st, k++)
      for (let xx = x + (k % 2 ? st / 2 : st / 5); xx < x + ww; xx += st) {
        ctx.beginPath();
        ctx.arc(xx, yy, Math.max(lw * 0.3, 0.35), 0, 7);
        ctx.fill();
      }
    ctx.restore();
  };
  const blk = (x, y, ww, hh) => {
    R(x, y, ww, hh, B);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, ww, hh);
    ctx.clip();
    ctx.lineWidth = Math.max(lw * 0.4, 0.4);
    const st = Math.max(Math.min(ww, hh) / 4, 3);
    for (let t = -hh; t < ww + hh; t += st) {
      ctx.beginPath();
      ctx.moveTo(x + t, y);
      ctx.lineTo(x + t + hh, y + hh);
      ctx.stroke();
    }
    ctx.restore();
  };
  const hard = (x, y, ww, hh) => {
    ctx.strokeRect(x, y, ww, hh);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, ww, hh);
    ctx.clip();
    ctx.lineWidth = Math.max(lw * 0.4, 0.4);
    const st = Math.max(hh / 2, 4);
    for (let t = -hh; t < ww + hh; t += st) {
      ctx.beginPath();
      ctx.moveTo(x + t, y + hh);
      ctx.lineTo(x + t + hh, y);
      ctx.stroke();
    }
    ctx.restore();
  };
  const dpc = (xa, ya, xb, yb) => {
    ctx.save();
    ctx.strokeStyle = "#2f5fb3";
    ctx.lineWidth = lw * 1.2;
    ctx.setLineDash([lw * 4, lw * 2]);
    ctx.beginPath();
    ctx.moveTo(xa, ya);
    ctx.lineTo(xb, yb);
    ctx.stroke();
    ctx.restore();
  };
  const dpm = (pts) => {
    ctx.save();
    ctx.strokeStyle = "#7a2fb3";
    ctx.lineWidth = lw * 1.2;
    ctx.setLineDash([lw * 6, lw * 2, lw * 1.5, lw * 2]);
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    ctx.restore();
  };
  const lab = (t, x, y, f) => {
    ctx.save();
    ctx.font = `500 ${Math.max(6, f)}px system-ui,-apple-system,sans-serif`;
    ctx.fillStyle = c;
    ctx.textBaseline = "middle";
    ctx.fillText(t, x, y);
    ctx.restore();
  };
  const fs = Math.max(5, Math.min(m * 0.04, ctx.__mm ? 110 * ctx.__mm : m * 0.04));
  const s = Math.min(w, h) / 6; /* stud size in plan details */
  switch (o.k) {
    /* --- plan: where a partition meets a wall --- */
    case "sdTlad":
    case "sdT3":
    case "sdTbk": {
      const wt = s,
        mw = s * 0.5,
        py = y0 + wt;
      ln(x0, y0, x1, y0);
      ln(x0, py, x1, py);
      [x0 + w * 0.08, x1 - w * 0.08 - mw].forEach((x) => X(x, y0, mw, wt));
      const cx = x0 + w / 2,
        pw = wt;
      ln(cx - pw / 2, py, cx - pw / 2, y1);
      ln(cx + pw / 2, py, cx + pw / 2, y1);
      X(cx - pw / 2, y1 - mw, pw, mw);
      if (o.k === "sdTlad") {
        X(cx - pw * 1.6, y0 + wt * 0.15, pw * 3.2, wt * 0.35);
        X(cx - pw / 2, py, pw, mw);
      } else if (o.k === "sdT3") {
        X(cx - pw / 2 - mw, y0, mw, wt);
        X(cx + pw / 2, y0, mw, wt);
        X(cx - pw / 2, py, pw, mw);
      } else {
        X(cx - pw / 2 - mw, y0, mw, wt);
        X(cx + pw / 2, y0, mw, wt);
        X(cx - pw * 0.9, py - wt * 0.35, pw * 1.8, wt * 0.35);
        X(cx - pw / 2, py, pw, mw);
      }
      break;
    }
    /* --- plan: corners --- */
    case "sdL3":
    case "sdLcal":
    case "sdLblk": {
      const wt = Math.min(w, h) * 0.22,
        mw = wt * 0.5;
      ctx.strokeRect(x0, y0, wt, h);
      ctx.strokeRect(x0 + wt, y0, w - wt, wt);
      X(x0, y1 - mw, wt, mw);
      X(x1 - mw, y0, mw, wt);
      if (o.k === "sdL3") {
        X(x0, y0, wt, mw);
        X(x0 + wt, y0, mw, wt);
        X(x0, y0 + mw, wt, mw);
      } else if (o.k === "sdLcal") {
        X(x0, y0, wt, wt);
        X(x0 + wt, y0, mw, wt);
        X(x0 + wt * 0.5, y0 + wt, mw, wt * 1.3);
      } else {
        X(x0, y0, wt, mw);
        X(x0, y0 + mw, wt, mw);
        X(x0, y0 + mw * 2, wt, mw);
        X(x0 + wt, y0, mw, wt);
        X(x0, y0 + mw * 3, wt, mw);
      }
      break;
    }
    /* --- elevations of wall framing --- */
    case "sfDoor":
    case "sfPlain":
    case "sfWin":
    case "sfBrace":
    case "sfBlock":
    case "sfPlat": {
      const p = Math.max(h * 0.025, 2),
        st = Math.max(w * 0.025, 2);
      const frame = (fy0, fy1, kind) => {
        R(x0, fy1 - p, w, p);
        R(x0, fy0, w, p);
        R(x0, fy0 + p, w, p);
        const top = fy0 + p * 2,
          bot = fy1 - p;
        const n = Math.max(4, Math.round(w / (st * 9)));
        const xs = [];
        for (let i = 0; i <= n; i++) xs.push(x0 + ((w - st) * i) / n);
        if (kind === "sfDoor" || kind === "sfWin") {
          const ow = w * 0.36,
            ox = x0 + (w - ow) / 2,
            hd = (bot - top) * 0.12,
            oT = top + (bot - top) * 0.12,
            sill = kind === "sfWin" ? top + (bot - top) * 0.6 : bot;
          xs.filter((x) => x + st < ox - st * 2 || x > ox + ow + st * 2).forEach((x) =>
            R(x, top, st, bot - top),
          );
          R(ox - st * 2, top, st, bot - top);
          R(ox + ow + st, top, st, bot - top);
          R(ox - st, oT, st, bot - oT);
          R(ox + ow, oT, st, bot - oT);
          R(ox - st, oT - hd, ow + st * 2, hd);
          R(ox, oT, ow, p);
          for (let i = 1; i < 3; i++) R(ox + (ow * i) / 3 - st / 2, top, st, oT - hd - top);
          if (kind === "sfWin") {
            R(ox, sill, ow, p);
            for (let i = 1; i < 3; i++) R(ox + (ow * i) / 3 - st / 2, sill + p, st, bot - sill - p);
          }
        } else {
          xs.forEach((x) => R(x, top, st, bot - top));
          if (kind === "sfBlock") {
            const my = (top + bot) / 2;
            for (let i = 0; i < xs.length - 1; i++)
              R(xs[i] + st, my - p / 2, xs[i + 1] - xs[i] - st, p);
          }
          if (kind === "sfBrace") {
            ctx.save();
            ctx.lineWidth = Math.max(st * 0.8, lw);
            ctx.strokeStyle = npHexMix(c, 0.4);
            ctx.beginPath();
            ctx.moveTo(x0 + st, bot);
            ctx.lineTo(x1 - st, top);
            ctx.stroke();
            ctx.restore();
          }
        }
      };
      if (o.k === "sfPlat") {
        const mid = y0 + h * 0.5,
          fz = h * 0.07;
        frame(y0, mid - fz / 2, "plain");
        R(x0, mid - fz / 2, w, fz);
        ln(x0, mid, x1, mid);
        frame(mid + fz / 2, y1, "plain");
        lab("Floor zone", x0 + w * 0.02, mid, fs);
      } else frame(y0, y1, o.k);
      ln(x0 - w * 0.05, y1 + p, x1 + w * 0.05, y1 + p, [lw * 2, lw * 2]);
      break;
    }
    /* --- headers in section --- */
    case "shFull":
    case "shIns":
    case "shVert":
    case "shSingle": {
      const ww = w,
        pl = ww;
      X(x0, y0, ww, pl);
      X(x0, y1 - pl, ww, pl);
      ctx.strokeRect(x0, y0, ww, h);
      const hy = y0 + pl * 1.6;
      if (o.k === "shFull") {
        X(x0, hy, ww, pl * 1.2);
        X(x0, hy + pl * 1.2, ww, pl * 1.2);
      } else if (o.k === "shIns") {
        X(x0, hy, ww * 0.32, pl * 2.2);
        ins(x0 + ww * 0.32, hy, ww * 0.36, pl * 2.2);
        X(x0 + ww * 0.68, hy, ww * 0.32, pl * 2.2);
      } else if (o.k === "shVert") {
        X(x0 + ww * 0.15, hy, ww * 0.7, pl * 2.4);
      } else {
        X(x0, hy + pl * 1.2, ww, pl * 0.8);
        X(x0 + ww * 0.3, hy + pl * 2, ww * 0.4, pl * 0.8);
      }
      break;
    }
    /* --- ground floor details (section through the outside wall) --- */
    case "gfSlab":
    case "gfBB":
    case "gfTimber": {
      const gl = y0 + h * 0.55,
        fd = y0 + h * 0.82,
        lf = w * 0.08,
        cav = w * 0.05,
        inn = lf * 1.0,
        wx = x0 + w * 0.12,
        ix = wx + lf + cav;
      conc(wx - lf * 0.6, fd, lf * 3.6 + cav, h * 0.16);
      blk(wx, y0 + h * 0.1, lf, fd - y0 - h * 0.1);
      blk(ix, y0 + h * 0.1, inn, fd - y0 - h * 0.1);
      ins(wx + lf + cav * 0.1, y0 + h * 0.1, cav * 0.5, gl - h * 0.12 - y0 - h * 0.1);
      ctx.save();
      ctx.lineWidth = lw * 1.4;
      ln(x0, gl, wx, gl);
      ctx.restore();
      dpc(wx - lf * 0.05, gl - h * 0.06, wx + lf * 1.05, gl - h * 0.06);
      lab("Ground level", x0, gl + fs, fs);
      lab("DPC", x0, gl - h * 0.06, fs * 0.9);
      const fx = ix + inn,
        ff = gl - h * 0.04;
      if (o.k === "gfSlab") {
        const sc = h * 0.05,
          ih = h * 0.08,
          cn = h * 0.1,
          hc = h * 0.1;
        R(fx, ff, x1 - fx, sc, "#eeeeee");
        ins(fx, ff + sc, x1 - fx, ih);
        ins(fx - cav * 0.4, ff, cav * 0.4, sc + ih);
        dpm([
          [ix + inn * 0.2, ff - h * 0.06],
          [fx, ff - h * 0.06],
          [fx, ff + sc + ih + h * 0.01],
          [x1, ff + sc + ih + h * 0.01],
        ]);
        conc(fx, ff + sc + ih + h * 0.02, x1 - fx, cn);
        hard(fx, ff + sc + ih + cn + h * 0.02, x1 - fx, hc);
        lab("Screed", fx + w * 0.12, ff + sc / 2, fs);
        lab("Insulation", fx + w * 0.12, ff + sc + ih / 2, fs);
        lab("Concrete slab on DPM", fx + w * 0.12, ff + sc + ih + cn / 2, fs);
        lab("Hardcore", fx + w * 0.12, ff + sc + ih + cn + hc / 2, fs);
      } else if (o.k === "gfBB") {
        const bb = h * 0.08;
        const st = (x1 - fx) / 4;
        for (let i = 0; i < 4; i++) {
          const bx = fx + i * st;
          ctx.beginPath();
          ctx.moveTo(bx, ff + bb + h * 0.06);
          ctx.lineTo(bx + st * 0.22, ff + bb + h * 0.06);
          ctx.lineTo(bx + st * 0.16, ff + h * 0.06);
          ctx.lineTo(bx + st * 0.06, ff + h * 0.06);
          ctx.closePath();
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.fill();
          ctx.restore();
          ctx.stroke();
          blk(bx + st * 0.22, ff + h * 0.06, st * 0.78, bb);
        }
        ins(fx, ff, x1 - fx, h * 0.05);
        R(fx, ff - h * 0.03, x1 - fx, h * 0.03, "#eeeeee");
        ln(fx, ff + bb + h * 0.15, x1, ff + bb + h * 0.15, [lw * 3, lw * 2]);
        lab("Void (ventilated)", fx + w * 0.12, ff + bb + h * 0.11, fs);
        lab("Beam & block", fx + w * 0.12, ff + bb * 0.5 + h * 0.06, fs);
        ctx.strokeRect(wx, gl - h * 0.12, lf, h * 0.04);
        lab("Air brick", x0, gl - h * 0.1, fs * 0.9);
      } else {
        const jh = h * 0.09,
          jw = w * 0.03;
        R(fx, ff - h * 0.02, x1 - fx, h * 0.02);
        const st = (x1 - fx) / 4;
        for (let i = 0; i < 4; i++) X(fx + i * st + st * 0.3, ff, jw, jh);
        ins(fx, ff, x1 - fx, jh * 0.85);
        X(fx + st * 1.5, ff + jh, jw * 2, h * 0.03);
        blk(fx + st * 1.55, ff + jh + h * 0.03, jw * 1.6, fd - ff - jh - h * 0.03);
        conc(fx, fd - h * 0.02, x1 - fx, h * 0.06);
        lab("Joists on wall plate", fx + w * 0.2, ff + jh * 0.5, fs);
        lab("Sleeper wall", fx + st * 2.2, ff + jh + h * 0.12, fs);
        lab("Oversite concrete", fx + st * 2.3, fd + h * 0.01, fs);
        ctx.strokeRect(wx, gl - h * 0.12, lf, h * 0.04);
        lab("Air brick", x0, gl - h * 0.1, fs * 0.9);
      }
      lab(
        o.k === "gfSlab"
          ? "Ground-bearing slab"
          : o.k === "gfBB"
            ? "Beam & block floor"
            : "Suspended timber floor",
        x0,
        y0 + fs,
        fs * 1.2,
      );
      break;
    }
    /* --- floor joist details --- */
    case "jhanger": {
      const ww = w * 0.35;
      blk(x0, y0, ww, h);
      const jy = y0 + h * 0.3,
        jh = h * 0.35;
      R(x0 + ww, jy, w - ww, jh);
      ctx.save();
      ctx.strokeStyle = "#6b7280";
      ctx.lineWidth = lw * 1.6;
      ctx.beginPath();
      ctx.moveTo(x0 + ww - w * 0.04, jy - h * 0.08);
      ctx.lineTo(x0 + ww, jy - h * 0.08);
      ctx.lineTo(x0 + ww, jy + jh + h * 0.02);
      ctx.lineTo(x0 + ww + w * 0.12, jy + jh + h * 0.02);
      ctx.lineTo(x0 + ww + w * 0.12, jy + jh * 0.5);
      ctx.stroke();
      ctx.restore();
      lab("Joist hanger", x0 + ww + w * 0.15, jy + jh + h * 0.1, fs * 1.4);
      break;
    }
    case "jtrim": {
      const jw = Math.max(w * 0.02, 2),
        ox = x0 + w * 0.35,
        oy = y0 + h * 0.3,
        ow = w * 0.3,
        oh = h * 0.4;
      const st = w / 12;
      for (let x = x0; x < x1; x += st) {
        if (x > ox - jw * 3 && x < ox + ow + jw * 2) {
          R(x, y0, jw, oy - y0);
          R(x, oy + oh, jw, y1 - oy - oh);
        } else R(x, y0, jw, h);
      }
      R(ox - jw * 2, y0, jw * 2, h, "#e9c58f");
      R(ox + ow, y0, jw * 2, h, "#e9c58f");
      R(ox, oy - jw * 2, ow, jw * 2, "#e9c58f");
      R(ox, oy + oh, ow, jw * 2, "#e9c58f");
      ln(ox, oy, ox + ow, oy + oh, [lw * 3, lw * 2]);
      ln(ox + ow, oy, ox, oy + oh, [lw * 3, lw * 2]);
      lab("Trimmer & trimming joists doubled", x0, y1 + fs * 1.2, fs * 1.3);
      lab("Opening", ox + ow * 0.3, oy + oh / 2, fs * 1.3);
      break;
    }
    case "fdnsec": {
      const mm = ctx.__mm || 0;
      const U2 = npUnit(o);
      const fd = Object.assign({ w: 600, d: 225, dep: 1000 }, o.fd || {});
      const t = U2.brick ? 102.5 : (o.lv && o.lv.a) || 100;
      const k = mm || Math.min(w / (fd.w * 1.6), h / (fd.dep + 600));
      const cx2 = x0 + w / 2,
        yb = y1 - h * 0.04,
        fw = fd.w * k,
        fdd = fd.d * k,
        tw = t * k;
      const ft = yb - fdd;
      conc(cx2 - fw / 2, ft, fw, fdd);
      const gl = yb - fd.dep * k;
      const top = Math.max(y0 + h * 0.04, gl - (150 + U2.H + U2.J) * k * 2.2);
      ctx.save();
      ctx.fillStyle = npHexMix(c, U2.brick ? 0.82 : 0.92);
      ctx.fillRect(cx2 - tw / 2, top, tw, ft - top);
      ctx.restore();
      ctx.strokeRect(cx2 - tw / 2, top, tw, ft - top);
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx2 - tw / 2, top, tw, ft - top);
      ctx.clip();
      ctx.lineWidth = Math.max(lw * 0.45, 0.4);
      const cp = (U2.H + U2.J) * k;
      let n = 0;
      for (let y = ft; y > top; y -= cp, n++) ln(cx2 - tw / 2, y, cx2 + tw / 2, y);
      ctx.restore();
      ctx.save();
      ctx.lineWidth = lw * 1.4;
      ln(x0, gl, cx2 - tw / 2 - fw * 0.05, gl);
      ln(cx2 + tw / 2 + fw * 0.05, gl, x1, gl);
      ctx.restore();
      const dpy = gl - 150 * k;
      dpc(cx2 - tw / 2, dpy, cx2 + tw / 2, dpy);
      ctx.save();
      ctx.strokeStyle = c;
      ctx.lineWidth = Math.max(lw * 0.4, 0.4);
      ctx.setLineDash([lw * 2, lw * 2]);
      for (let x = x0; x < x1; x += w / 18) {
        if (x > cx2 - fw / 2 - w * 0.02 && x < cx2 + fw / 2 + w * 0.02) continue;
        ln(x, gl + h * 0.02, x + w * 0.03, gl + h * 0.06);
      }
      ctx.restore();
      const cs = Math.round((ft - gl + 150 * k) / cp);
      const sx = cx2 + fw / 2 + fs * 0.5;
      lab(
        `${U2.name} ${U2.L}×${U2.H}, ${U2.J} mm joints · ${cs} course${cs === 1 ? "" : "s"} from footing to DPC`,
        x0 + fs * 0.3,
        top - fs * 0.9,
        fs,
      );
      lab("DPC 150 above ground", sx, dpy, fs);
      lab("Ground level", sx, gl + fs * 0.9, fs);
      lab(`Concrete strip ${fd.w}×${fd.d}`, sx, ft + fdd / 2, fs);
      lab(`${fd.dep} to underside`, sx, yb - fs * 0.3, fs);
      break;
    }
    case "ewCav":
    case "ewBrick":
    case "ewSolid":
    case "ewStud":
    case "ewBlock":
    case "ewBrk": {
      const mm = ctx.__mm || 0;
      const stud = o.k === "ewStud";
      const lv = Object.assign(
        { a: o.k === "ewSolid" ? 215 : 100, cav: 50, ins: 100, b: 100 },
        o.lv || {},
      );
      const L = {
        ewCav: [
          ["rend", 20, "Render"],
          ["blk", lv.a, lv.a + " block (outer leaf)"],
          ["cav", lv.cav, lv.cav + " cavity"],
          ["ins", lv.ins, lv.ins + " insulation"],
          ["blk", lv.b, lv.b + " block (inner leaf)"],
          ["pl", 13, "Plaster"],
        ].filter((x) => x[1] > 0),
        ewBrick: [
          ["brk", 102, "102 brick (outer leaf)"],
          ["cav", lv.cav, lv.cav + " cavity"],
          ["ins", lv.ins, lv.ins + " insulation"],
          ["blk", lv.b, lv.b + " block (inner leaf)"],
          ["pl", 13, "Plaster"],
        ].filter((x) => x[1] > 0),
        ewSolid: [
          ["rend", 20, "Render"],
          ["blk", lv.a, lv.a + " solid block"],
          ["pl", 13, "Plaster"],
        ],
        ewStud: [
          ["pb", 13, "12.5 plasterboard"],
          ["stud", 100, "100×50 studs @ 400/600 with insulation"],
          ["pb", 13, "12.5 plasterboard"],
        ],
      }[o.k];
      const gl = stud ? y1 - h * 0.07 : y1 - h * 0.2,
        fdT = stud ? y1 - h * 0.07 : y1 - h * 0.11,
        top = y0;
      if (o.k === "ewBlock" || o.k === "ewBrk") {
        /* blocks or bricks at real size: course = unit height + joint, units laid half-bond */
        const U2 = npUnit(o);
        const CP = U2.H + U2.J,
          BP = U2.L + U2.J,
          JT = U2.J;
        const u = mm || (h * 0.86) / 12 / CP;
        const F = mm ? Math.min(300 * mm, h * 0.25) : h * 0.11;
        const fdT2 = y1 - F;
        const n = Math.max(1, Math.floor((fdT2 - y0 + u * 2) / (CP * u)));
        const top2 = fdT2 - n * CP * u;
        conc(x0, fdT2, w, F);
        ctx.save();
        ctx.fillStyle = npHexMix ? npHexMix(c, 0.93) : "#eee";
        ctx.fillRect(x0, top2, w, fdT2 - top2);
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0, top2, w, fdT2 - top2);
        ctx.clip();
        const jt = JT * u,
          dbl = jt > lw * 1.6;
        ctx.lineWidth = Math.max(lw * (dbl ? 0.35 : 0.45), 0.4);
        for (let r = 0; r < n; r++) {
          const yb = fdT2 - r * CP * u,
            yt = yb - CP * u;
          if (dbl) {
            ln(x0, yb - jt, x1, yb - jt);
            ln(x0, yt, x1, yt);
          } else ln(x0, yt, x1, yt);
          const off = r % 2 ? (BP * u) / 2 : 0;
          for (let x = x0 + off - BP * u; x < x1; x += BP * u) {
            if (x < x0 - jt) continue;
            if (dbl) {
              ln(x, yb - jt, x, yt);
              ln(x + jt, yb - jt, x + jt, yt);
            } else ln(x, yb, x, yt);
          }
        }
        ctx.restore();
        ctx.strokeRect(x0, top2, w, fdT2 - top2);
        const glC = Math.min(2, n - 1);
        const gl2 = fdT2 - glC * CP * u;
        ctx.save();
        ctx.lineWidth = lw * 1.4;
        ln(x0 - w * 0.03, gl2, x1 + w * 0.03, gl2);
        ctx.restore();
        const dy = Math.min(150 * u * 1.0, (gl2 - top2) * 0.5);
        dpc(x0, gl2 - dy, x1, gl2 - dy);
        const Hmm = Math.round(n * CP);
        lab("Ground level", x0 + fs * 0.4, gl2 + fs, fs);
        lab("DPC (150 min. above ground)", x0 + fs * 0.4, gl2 - dy - fs * 0.9, fs);
        lab("Concrete footing", x0 + fs * 0.4, fdT2 + F / 2, fs);
        lab(
          `${U2.brick ? "102.5 mm brickwork" : ((o.lv && o.lv.a) || 100) + " mm blockwork"}, ${U2.L}×${U2.H} ${U2.brick ? "bricks" : "blocks"}, ${U2.J} mm joints · ${n} course${n === 1 ? "" : "s"} = ${Hmm.toLocaleString("en-GB")} mm`,
          x0 + fs * 0.4,
          top2 - fs * 0.9,
          fs,
        );
        break;
      }
      const T = L.reduce((a, l) => a + l[1], 0);
      let k = mm && T * mm <= w * 0.6 ? mm : (w * 0.4) / T;
      const lx = x0 + w * 0.06;
      let x = lx;
      const xs = [];
      if (!stud) {
        const fw = T * k * 2.2;
        conc(lx + (T * k) / 2 - fw / 2, fdT, fw, y1 - fdT);
        lab("Concrete footing", lx + (T * k) / 2 + fw / 2 + fs * 0.4, (fdT + y1) / 2, fs);
      } else {
        conc(x0, fdT, w, y1 - fdT);
        lab("Floor", x0 + fs * 0.4, (fdT + y1) / 2, fs);
      }
      const plate = stud ? (mm ? 47 * mm : h * 0.02) : 0;
      L.forEach(([t, wd, nm]) => {
        const ww = wd * k;
        xs.push([x + ww / 2, nm]);
        const yt = top,
          hh = fdT - top;
        if (t === "blk") blk(x, yt, ww, hh);
        else if (t === "ins") ins(x, yt, ww, stud ? hh : gl - yt - (mm ? 150 * mm : h * 0.05));
        else if (t === "cav") {
          ctx.strokeRect(x, yt, ww, hh);
        } else if (t === "brk") {
          R(x, yt, ww, hh, "#e8b9a0");
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, yt, ww, hh);
          ctx.clip();
          ctx.lineWidth = Math.max(lw * 0.4, 0.4);
          const ch = mm ? 75 * mm : Math.max(hh / 30, 3);
          for (let y = fdT; y > yt; y -= ch) ln(x, y, x + ww, y);
          ctx.restore();
        } else if (t === "rend" || t === "pl" || t === "pb")
          R(x, yt, ww, hh, t === "pb" ? "#f4f1ea" : "#eeeeee");
        else if (t === "stud") {
          R(x, yt + plate, ww, hh - plate * 2, "#fff1a8");
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, yt + plate, ww, hh - plate * 2);
          ctx.clip();
          ctx.translate(x, yt + hh - plate);
          ctx.rotate(-Math.PI / 2);
          npPattern(ctx, "insul", 0, hh - plate * 2, 0, ww, lw, c);
          ctx.restore();
          ctx.strokeRect(x, yt + plate, ww, hh - plate * 2);
          R(x, yt, ww, plate);
          R(x, fdT - plate, ww, plate);
          const ny = yt + hh / 2 - plate / 2;
          X(x, ny, ww, plate);
          lab("Head plate", x + ww + fs * 0.4, yt + plate / 2 + fs * 0.2, fs * 0.9);
          lab("Noggin", x + ww + fs * 0.4, ny + plate / 2, fs * 0.9);
          lab("Sole plate", x + ww + fs * 0.4, fdT - plate / 2 - fs * 0.2, fs * 0.9);
        }
        x += ww;
      });
      const ex = x;
      if (o.k === "ewCav" || o.k === "ewBrick") {
        const cv = L.findIndex((l) => l[0] === "cav");
        let cx0 = lx;
        for (let i = 0; i < cv; i++) cx0 += L[i][1] * k;
        const span = (L[cv][1] + L[cv + 1][1]) * k;
        const st = mm ? 450 * mm : (gl - top) / 6;
        ctx.save();
        ctx.strokeStyle = "#4b5563";
        ctx.lineWidth = Math.max(lw * 1.1, 0.8);
        for (let y = gl - st; y > top + st * 0.3; y -= st) {
          ctx.beginPath();
          ctx.moveTo(cx0 - L[cv - 1][1] * k * 0.5, y);
          ctx.lineTo(cx0 + span + L[cv + 2][1] * k * 0.5, y);
          ctx.stroke();
        }
        ctx.restore();
        const fillTop = gl - (mm ? 150 * mm : h * 0.05);
        conc(
          cx0,
          fillTop + (mm ? 75 * mm : h * 0.02),
          L[cv][1] * k + L[cv + 1][1] * k,
          fdT - fillTop - (mm ? 75 * mm : h * 0.02),
        );
      }
      if (!stud) {
        ctx.save();
        ctx.lineWidth = lw * 1.4;
        ln(x0, gl, lx, gl);
        ln(ex, gl, x1, gl);
        ctx.restore();
        const dy = mm ? 150 * mm : h * 0.05;
        dpc(lx - k * 10, gl - dy, ex + k * 10, gl - dy);
        lab("Ground level", ex + fs * 0.4, gl + fs, fs);
        lab("DPC", ex + fs * 0.4, gl - dy, fs * 0.9);
      }
      const tx = ex + w * 0.08;
      let ty = top + fs * (stud ? 3.4 : 1.6);
      xs.forEach(([xc, nm]) => {
        if (stud && nm.includes("studs")) {
          ty += fs * 0.2;
        }
        ctx.save();
        ctx.lineWidth = Math.max(lw * 0.5, 0.4);
        ctx.beginPath();
        ctx.arc(xc, ty, Math.max(lw * 0.9, 1), 0, 7);
        ctx.fill();
        ln(xc, ty, tx - fs * 0.3, ty);
        ctx.restore();
        lab(nm, tx, ty, fs);
        ty += fs * 2.1;
      });
      if (o.k === "ewCav" || o.k === "ewBrick")
        lab("Wall ties @ 450 vertical, 900 horizontal", tx, ty, fs);
      break;
    }
    case "jstrap": {
      blk(x0, y0, w * 0.25, h);
      const st = h / 4;
      for (let i = 0; i < 4; i++) R(x0 + w * 0.25, y0 + i * st + st * 0.35, w * 0.75, st * 0.3);
      for (let i = 0; i < 3; i++)
        R(x0 + w * 0.45 + i * w * 0.16, y0 + st * 0.65, w * 0.06, st * 2.7, "#e9c58f");
      ctx.save();
      ctx.strokeStyle = "#4b5563";
      ctx.lineWidth = lw * 2.2;
      ctx.beginPath();
      ctx.moveTo(x0 + w * 0.12, y0 + st * 1.5);
      ctx.lineTo(x1 - w * 0.05, y0 + st * 1.5);
      ctx.stroke();
      ctx.restore();
      lab("Restraint strap with noggings", x0 + w * 0.3, y1 + fs * 1.2, fs * 1.3);
      break;
    }
  }
}

const NP_SHAPES = [
  ["tri", "△ Triangle", "Shapes"],
  ["rtri", "◺ Right-angle triangle", "Shapes"],
  ["diamond", "◇ Diamond", "Shapes"],
  ["hex", "⬡ Hexagon", "Shapes"],
  ["star", "☆ Star", "Shapes"],
  ["fillrect", "■ Filled box", "Shapes"],
  ["fillcirc", "● Filled circle", "Shapes"],
  ["arc", "◠ Arc", "Shapes"],
  ["cross", "✕ Cross", "Shapes"],
  ["cloud", "☁ Cloud (note area)", "Shapes"],
  ["wall", "▬ Solid wall", "Walls, doors & windows"],
  ["dline", "═ Wall (double line)", "Walls, doors & windows"],
  ["stud", "╪ Stud wall", "Walls, doors & windows"],
  [
    "cavity",
    "▥ Cavity wall (100 block, 50 cavity, 100 insulation, 100 block)",
    "Walls, doors & windows",
    "pro",
  ],
  ["tstud", "╫ Timber stud wall (studs shown)", "Walls, doors & windows", "pro"],
  ["door", "🚪 Door", "Walls, doors & windows"],
  ["door2", "🚪 Double doors", "Walls, doors & windows"],
  ["sdoor", "↔ Sliding door", "Walls, doors & windows"],
  ["bifold", "⋀ Bi-fold doors", "Walls, doors & windows"],
  ["opening", "┆ Opening (no door)", "Walls, doors & windows"],
  ["window", "🪟 Window", "Walls, doors & windows"],
  ["stairs", "▤ Stairs", "Walls, doors & windows"],
  ["beam", "─·─ Steel beam / RSJ", "Walls, doors & windows"],
  ["wc", "🚽 Toilet", "Kitchen & bathroom"],
  ["basin", "◒ Basin", "Kitchen & bathroom"],
  ["bath", "🛁 Bath", "Kitchen & bathroom"],
  ["shower", "⊠ Shower tray", "Kitchen & bathroom"],
  ["sink", "◫ Kitchen sink", "Kitchen & bathroom"],
  ["hob", "⁘ Hob / cooker", "Kitchen & bathroom"],
  ["units", "▭ Kitchen units", "Kitchen & bathroom"],
  ["fridge", "▯ Fridge", "Kitchen & bathroom"],
  ["wm", "◉ Washing machine", "Kitchen & bathroom"],
  ["rad", "♨ Radiator", "Heating & electrics"],
  ["boiler", "▣ Boiler", "Heating & electrics"],
  ["cyl", "◎ Hot water cylinder", "Heating & electrics"],
  ["socket", "⏻ Double socket", "Heating & electrics"],
  ["switch", "⊘ Light switch", "Heating & electrics"],
  ["light", "⊗ Ceiling light", "Heating & electrics"],
  ["smoke", "Ⓢ Smoke alarm", "Heating & electrics"],
  ["cu", "▤ Consumer unit (single phase)", "Heating & electrics"],
  ["mh", "⊞ Manhole / inspection chamber", "Drains & outside"],
  ["gully", "Ⓖ Gully", "Drains & outside"],
  ["svp", "Ⓟ Soil pipe (SVP)", "Drains & outside"],
  ["pipe", "⇢ Drain run (arrow = fall)", "Drains & outside"],
  ["tap", "Ⓣ Outside tap", "Drains & outside"],
  ["fence", "✕─ Fence", "Drains & outside"],
  ["tree", "🌳 Tree", "Drains & outside"],
  ["north", "⬆ North arrow", "Drains & outside"],
  ["rooflight", "◫ Roof light (flat)", "Roof lights & stairs", "pro"],
  ["lantern", "⬚ Lantern roof light", "Roof lights & stairs", "pro"],
  ["stairsl", "┗ L-shaped stairs (quarter landing)", "Roof lights & stairs", "pro"],
  ["stairsu", "⊓ U-shaped / dog-leg stairs (half landing)", "Roof lights & stairs", "pro"],
  ["spiral", "◎ Spiral stairs", "Roof lights & stairs", "pro"],
  ["column", "■ Column / post", "Roof lights & stairs", "pro"],
  ["chimney", "▨ Chimney breast / flue", "Roof lights & stairs", "pro"],
  ["dbed", "🛏 Double bed", "Furniture", "pro"],
  ["sbed", "🛏 Single bed", "Furniture", "pro"],
  ["sofa", "🛋 Sofa", "Furniture", "pro"],
  ["table", "🍽 Dining table & chairs", "Furniture", "pro"],
  ["wardrobe", "▥ Wardrobe", "Furniture", "pro"],
  ["island", "▭ Kitchen island & stools", "Furniture", "pro"],
  ["desk", "▭ Desk & chair", "Furniture", "pro"],
  ["patio", "▦ Patio / paving slabs", "Landscaping", "pro"],
  ["blockpave", "▤ Block paving / driveway", "Landscaping", "pro"],
  ["decking", "☰ Decking", "Landscaping", "pro"],
  ["lawn", "ʬ Lawn", "Landscaping", "pro"],
  ["gravel", "∴ Gravel", "Landscaping", "pro"],
  ["planting", "✿ Planting bed", "Landscaping", "pro"],
  ["shrub", "❀ Shrub / bush", "Landscaping", "pro"],
  ["hedge", "〰 Hedge", "Landscaping", "pro"],
  ["path", "═ Path", "Landscaping", "pro"],
  ["gsteps", "▤ Garden steps", "Landscaping", "pro"],
  ["retwall", "▬ Retaining wall", "Landscaping", "pro"],
  ["gate", "⌐ Gate", "Landscaping", "pro"],
  ["pond", "◌ Pond", "Landscaping", "pro"],
  ["shed", "⌂ Shed / outbuilding", "Landscaping", "pro"],
  ["portaloo", "🚻 Portaloo / site toilet", "Site set-up", "pro"],
  ["elecpoint", "⚡ Main electric point", "Site set-up", "pro"],
  ["uelec", "┅ Electric cable run (red)", "Site set-up", "pro"],
  ["stopcock", "⊗ Main water stopcock", "Drains & outside", "pro"],
  ["uwater", "┅ Mains water pipe (blue)", "Drains & outside", "pro"],
  ["gaspoint", "G Gas meter / main gas point", "Site set-up", "pro"],
  ["ugas", "┅ Gas pipe run (yellow)", "Site set-up", "pro"],
  ["canteen", "▭ Canteen / mess room", "Site set-up", "pro"],
  ["dryroom", "▭ Drying room", "Site set-up", "pro"],
  ["fireassembly", "🟩 Fire assembly point", "Site set-up", "pro"],
  ["fireext", "🧯 Fire extinguisher", "Site set-up", "pro"],
  ["firepoint", "🟥 Fire point (extinguishers & alarm)", "Site set-up", "pro"],
  ["heras", "┼ Heras fencing (3.5 m panels)", "Site set-up", "pro"],
  ["herasgate", "⌒ Heras fence gate", "Site set-up", "pro"],
  ["ch8", "▬ Chapter 8 barrier (red & white)", "Site set-up", "pro"],
  ["container", "▭ Shipping / storage container", "Site set-up", "pro"],
  ["siteoffice", "▭ Site office / welfare cabin", "Site set-up", "pro"],
  ["sauna", "♨ Sauna", "Garden buildings", "pro"],
  ["studio", "▭ Studio", "Garden buildings", "pro"],
  ["gardenroom", "▭ Garden room", "Garden buildings", "pro"],
  ["gardenoffice", "▭ Outside / garden office", "Garden buildings", "pro"],
  ["car", "🚗 Car", "Landscaping", "pro"],
  ["parking", "Ⓟ Parking bay", "Landscaping", "pro"],
  ["bins", "🗑 Bin store", "Landscaping", "pro"],
  ["roofhip", "◇ Hipped roof (plan)", "Roof plan", "pro"],
  ["roofgable", "▭ Gable roof (plan)", "Roof plan", "pro"],
  ["fall", "➝ Roof / ground fall arrow", "Roof plan", "pro"],
  ["re", "Ⓡ Rodding eye (RE)", "Drains & outside", "pro"],
  ["ic", "⊠ Inspection chamber (IC)", "Drains & outside", "pro"],
  ["soakaway", "▩ Soakaway", "Drains & outside", "pro"],
  ["rwp", "Ⓦ Rainwater pipe (RWP)", "Drains & outside", "pro"],
  ["aav", "Ⓐ Air admittance valve (AAV)", "Drains & outside", "pro"],
  ["foul", "┄ Foul water line (brown)", "Drains & outside", "pro"],
  ["storm", "┄ Storm / surface water line (blue)", "Drains & outside", "pro"],
  ["fan", "✻ Extract fan", "Heating & electrics", "pro"],
  ["fspur", "▢ Fused spur", "Heating & electrics", "pro"],
  ["ckr", "▢ Cooker switch", "Heating & electrics", "pro"],
  ["olight", "☼ Outside light", "Heating & electrics", "pro"],
  ["dlight", "◉ Downlight", "Heating & electrics", "pro"],
  ["heat", "Ⓗ Heat detector", "Heating & electrics", "pro"],
  ["coal", "Ⓒ CO alarm", "Heating & electrics", "pro"],
  ["tvp", "▢ TV point", "Heating & electrics", "pro"],
  ["stat", "Ⓣ Thermostat", "Heating & electrics", "pro"],
  ["towel", "▥ Towel rail", "Heating & electrics", "pro"],
  ["rafter", "▱ Rafter (section)", "Section: roof parts"],
  ["joistl", "▱ Joist (section, along)", "Section: roof parts"],
  ["rooftile", "⟋ Roof tiles / slates (section)", "Section: roof parts"],
  ["batfelt", "┄ Battens & felt (section)", "Section: roof parts"],
  ["lead", "━ Lead flashing", "Section: roof parts"],
  ["eframe", "╫ Stud wall framing (side view)", "Section: roof parts"],
  ["pboard", "▭ Plasterboard (section)", "Section: roof parts"],
  ["wplate", "⊠ Wall plate", "Section: roof parts"],
  ["ridgeb", "⊠ Ridge board", "Section: roof parts"],
  ["purlin", "⊠ Purlin", "Section: roof parts"],
  ["eaves", "◡ Eaves: fascia, soffit & gutter", "Section: roof parts"],
  ["flatroof", "☰ Flat roof build-up (warm deck)", "Section: roof parts"],
  ["fdn", "▨ Strip foundation with blockwork", "Section: walls, floors & foundations"],
  ["trenchfill", "▨ Trench fill foundation", "Section: walls, floors & foundations"],
  ["bblock", "⊥ Beam & block floor", "Section: walls, floors & foundations"],
  ["gslab", "☰ Ground floor slab build-up", "Section: walls, floors & foundations"],
  ["tfloor", "⊠ Suspended timber floor", "Section: walls, floors & foundations"],
  ["screed", "▒ Screed", "Section: walls, floors & foundations"],
  ["lintel", "▬ Lintel", "Section: walls, floors & foundations"],
  ["ctray", "⌐ Cavity tray", "Section: walls, floors & foundations"],
  ["weep", "▥ Weep vent", "Section: walls, floors & foundations"],
  ["wtie", "⌇ Wall tie", "Section: walls, floors & foundations"],
  ["closer", "≋ Cavity closer", "Section: walls, floors & foundations"],
  ["renderl", "▭ Render (section)", "Section: walls, floors & foundations"],
  ["cladsec", "⟋ Cladding on battens (section)", "Section: walls, floors & foundations"],
  ["evclad", "‖ Vertical cladding", "Elevation & section: materials and levels"],
  [
    "epanel",
    "▦ Panel cladding (fibre cement / composite)",
    "Elevation & section: materials and levels",
  ],
  ["etilehang", "⌒ Tile hanging", "Elevation & section: materials and levels"],
  ["estone", "▤ Stone / slate walling", "Elevation & section: materials and levels"],
  ["esoldier", "‖ Soldier course", "Elevation & section: materials and levels"],
  ["airbrick", "▦ Air brick", "Elevation & section: materials and levels"],
  ["bblay", "▤ Beam & block floor (layout)", "Timber framing", "pro"],
  ["jlay", "☰ Floor / ceiling joists (layout)", "Timber framing", "pro"],
  ["rlay", "⋀ Rafters & ridge (roof plan)", "Timber framing", "pro"],
  ["tlay", "⫼ Roof trusses (layout)", "Timber framing", "pro"],
  ["truss", "⟁ Roof truss (side view)", "Section: roof parts"],
  ["cutroof", "⌂ Cut roof: rafters, ridge, collar, purlins (section)", "Section: roof parts"],
  ["sdT3", "┳ Partition meets wall: 3-stud", "Stud wall details", "pro"],
  ["sdTlad", "┳ Partition meets wall: ladder blocking", "Stud wall details", "pro"],
  ["ewCav", "▥ Cavity wall, side on (block, cavity, insulation, block)", "Walls side on", "pro"],
  ["ewBrick", "▥ Brick & block cavity wall, side on", "Walls side on", "pro"],
  ["ewSolid", "▮ Solid block wall, side on", "Walls side on", "pro"],
  ["ewStud", "╫ Timber stud wall, side on", "Walls side on", "pro"],
  ["ewBlock", "▦ Blockwork wall face with DPC & footing", "Walls side on", "pro"],
  ["ewBrk", "▤ Brickwork wall face with DPC & footing", "Walls side on", "pro"],
  ["fdnsec", "⊥ Foundation section: footing & courses to DPC", "Foundations & ground", "pro"],
  ["sdTbk", "┳ Partition meets wall: flat backer", "Stud wall details", "pro"],
  ["sdL3", "┏ Corner: 3-stud", "Stud wall details", "pro"],
  ["sdLcal", "┏ Corner: California (stud turned flat)", "Stud wall details", "pro"],
  ["sdLblk", "┏ Corner: blocked", "Stud wall details", "pro"],
  ["sfPlain", "▥ Stud wall framing", "Stud wall details", "pro"],
  ["sfDoor", "▥ Door opening framing (king, jack, header)", "Stud wall details", "pro"],
  ["sfWin", "▥ Window opening framing (header, sill, cripples)", "Stud wall details", "pro"],
  ["sfBrace", "▥ Braced wall", "Stud wall details", "pro"],
  ["sfBlock", "▥ Wall with mid-height noggins", "Stud wall details", "pro"],
  ["sfPlat", "▥ Platform framing (two storeys)", "Stud wall details", "pro"],
  ["shFull", "▯ Header: solid built-up", "Stud wall details", "pro"],
  ["shIns", "▯ Header: insulated", "Stud wall details", "pro"],
  ["shVert", "▯ Header: on edge", "Stud wall details", "pro"],
  ["shSingle", "▯ Header: single with cripple", "Stud wall details", "pro"],
  ["gfSlab", "▙ Ground floor: slab at outside wall", "Floor details", "pro"],
  ["gfBB", "▙ Ground floor: beam & block at outside wall", "Floor details", "pro"],
  ["gfTimber", "▙ Ground floor: suspended timber", "Floor details", "pro"],
  ["jhanger", "⊐ Joist hanger", "Floor details", "pro"],
  ["jtrim", "⊞ Trimmed opening (stairs / flue)", "Floor details", "pro"],
  ["jstrap", "━ Restraint strap", "Floor details", "pro"],
  ["legend", "🗂 Key (fills itself in)", "Notes, tags & details", "pro"],
  ["secmark", "Ⓐ Section marker (A-A)", "Notes, tags & details", "pro"],
  ["tagbox", "▭ Tag in a box (e.g. EW01)", "Notes, tags & details", "pro"],
  ["tagcirc", "◯ Round tag (e.g. W01, D01)", "Notes, tags & details", "pro"],
  ["viewtitle", "▁ View title with scale", "Notes, tags & details", "pro"],
  ["scalebar", "▬ Scale bar", "Notes, tags & details", "pro"],
  ["joists", "☰ Floor / ceiling joists (span)", "Notes, tags & details", "pro"],
  ["ibeam", "Ɪ Steel beam (section)", "Notes, tags & details", "pro"],
  ["timber", "⊠ Timber (section)", "Notes, tags & details", "pro"],
  ["padstone", "▤ Padstone", "Notes, tags & details", "pro"],
  ["hidden", "┄ Dashed line (above / hidden)", "Notes, tags & details", "pro"],
  ["centre", "─·─ Centre / datum line", "Notes, tags & details", "pro"],
  ["breather", "┄ Breather membrane (orange)", "Notes, tags & details", "pro"],
  ["dpcl", "┄ DPC (blue)", "Notes, tags & details", "pro"],
  ["dpm", "─·─ DPM (purple)", "Notes, tags & details", "pro"],
  ["vcl", "─·─ Vapour control layer (pink)", "Notes, tags & details", "pro"],
  ["ewin", "🪟 Window", "Elevation: windows, doors & roof"],
  ["edoor", "🚪 Front / back door", "Elevation: windows, doors & roof"],
  ["efrench", "🚪 French / patio doors", "Elevation: windows, doors & roof"],
  ["ebifold", "⋀ Bi-fold doors", "Elevation: windows, doors & roof"],
  ["egarage", "▤ Garage door", "Elevation: windows, doors & roof"],
  ["eroofl", "◫ Roof window (Velux)", "Elevation: windows, doors & roof"],
  ["eroof", "⌂ Gable roof", "Elevation: windows, doors & roof"],
  ["elean", "◸ Lean-to roof", "Elevation: windows, doors & roof"],
  ["edp", "│ Downpipe", "Elevation: windows, doors & roof"],
  ["egutter", "◡ Gutter", "Elevation: windows, doors & roof"],
  ["elant", "⌂ Lantern roof light", "Elevation: windows, doors & roof"],
  ["echim", "▥ Chimney stack", "Elevation: windows, doors & roof"],
  ["estairs", "⌐ Stairs (side view)", "Elevation: windows, doors & roof"],
  ["efence", "▥ Fence panel", "Elevation: garden & scale"],
  ["egate", "▦ Gate", "Elevation: garden & scale"],
  ["ehedge", "〰 Hedge", "Elevation: garden & scale"],
  ["etree", "🌳 Tree", "Elevation: garden & scale"],
  ["eperson", "🧍 Person (for scale)", "Elevation: garden & scale"],
  ["egroundfill", "▁ Ground (green fill)", "Elevation: garden & scale"],
  ["ebrick", "🧱 Brickwork", "Elevation & section: materials and levels"],
  ["erender", "▒ Render", "Elevation & section: materials and levels"],
  ["eclad", "☰ Cladding", "Elevation & section: materials and levels"],
  ["etile", "⌗ Roof tiles", "Elevation & section: materials and levels"],
  ["einsul", "≋ Insulation", "Elevation & section: materials and levels"],
  ["econc", "▨ Concrete", "Elevation & section: materials and levels"],
  ["ehard", "▧ Hardcore / ground", "Elevation & section: materials and levels"],
  ["eground", "⏚ Ground line", "Elevation & section: materials and levels"],
  ["edpc", "┄ DPC line", "Elevation & section: materials and levels"],
  ["elevel", "▽ Level marker (FFL)", "Elevation & section: materials and levels"],
];
const NP_UNITS = {
  block: { name: "Blockwork", L: 440, H: 215, J: 10 },
  brick: { name: "Brickwork", L: 215, H: 65, J: 10, brick: 1 },
  block140: { name: "Blockwork", L: 440, H: 140, J: 10 },
  bigblock: { name: "Blockwork", L: 620, H: 215, J: 10 },
  dense: { name: "Blockwork", L: 440, H: 215, J: 10 },
};
function npUnit(o) {
  const def = o.k === "ewBrk" ? "brick" : "block";
  const u = o.unit || {};
  const p = NP_UNITS[u.p || def] || NP_UNITS[def];
  return {
    name: u.L ? ((u.p || def) === "brick" ? "Brickwork" : "Blockwork") : p.name,
    L: +u.L || p.L,
    H: +u.H || p.H,
    J: u.J != null && u.J !== "" ? +u.J : p.J,
    brick: (u.p || def) === "brick",
    p: u.p || def,
  };
}
const NP_ELEV_BOX = new Set([
  "ewin",
  "edoor",
  "efrench",
  "ebifold",
  "egarage",
  "eroofl",
  "eroof",
  "elean",
  "edp",
  "ebrick",
  "erender",
  "eclad",
  "etile",
  "einsul",
  "econc",
  "ehard",
  "elevel",
]);
const NP_SYM = new Set([
  "wc",
  "basin",
  "bath",
  "shower",
  "sink",
  "hob",
  "fridge",
  "wm",
  "boiler",
  "cyl",
  "socket",
  "switch",
  "light",
  "smoke",
  "cu",
  "mh",
  "gully",
  "svp",
  "tap",
  "tree",
  "north",
  "rad",
  "units",
  "stairs",
]);
const NP_LINE = new Set([
  "wall",
  "dline",
  "stud",
  "cavity",
  "door",
  "door2",
  "sdoor",
  "bifold",
  "opening",
  "beam",
  "pipe",
  "fence",
  "eground",
  "edpc",
  "egutter",
]);

function drawShape(ctx, o) {
  const x0 = Math.min(o.a[0], o.b[0]),
    y0 = Math.min(o.a[1], o.b[1]),
    x1 = Math.max(o.a[0], o.b[0]),
    y1 = Math.max(o.a[1], o.b[1]),
    w = x1 - x0,
    h = y1 - y0,
    cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2;
  if (NP_NICE.has(o.k) && !o.plain) {
    npNice(ctx, o, x0, y0, w, h, cx, cy);
    return;
  }
  if (NP_BATHNICE.has(o.k) && !o.plain) {
    npBath(ctx, o, x0, y0, w, h, cx, cy);
    return;
  }
  if (!(NP_LINE.has(o.k) || o.k === "door") && (w < 3 || h < 3)) {
    ctx.strokeRect(x0, y0, Math.max(w, 0.5), Math.max(h, 0.5));
    return;
  }
  const poly = (pts) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.stroke();
  };
  switch (o.k) {
    case "tri":
      poly([
        [cx, y0],
        [x1, y1],
        [x0, y1],
      ]);
      break;
    case "rtri":
      poly([
        [o.a[0], o.a[1]],
        [o.a[0], o.b[1]],
        [o.b[0], o.b[1]],
      ]);
      break;
    case "diamond":
      poly([
        [cx, y0],
        [x1, cy],
        [cx, y1],
        [x0, cy],
      ]);
      break;
    case "hex":
      poly(
        Array.from({ length: 6 }, (_, i) => [
          cx + (w / 2) * Math.cos((Math.PI / 3) * i),
          cy + (h / 2) * Math.sin((Math.PI / 3) * i),
        ]),
      );
      break;
    case "star":
      poly(
        Array.from({ length: 10 }, (_, i) => {
          const r = i % 2 ? 0.42 : 1,
            an = -Math.PI / 2 + (Math.PI / 5) * i;
          return [cx + (w / 2) * r * Math.cos(an), cy + (h / 2) * r * Math.sin(an)];
        }),
      );
      break;
    case "fillrect":
      ctx.globalAlpha = o.fill ? 0 : 0.35;
      ctx.fillRect(x0, y0, w, h);
      ctx.globalAlpha = 1;
      ctx.strokeRect(x0, y0, w, h);
      break;
    case "fillcirc":
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2 + 0.5, h / 2 + 0.5, 0, 0, 7);
      ctx.globalAlpha = o.fill ? 0 : 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      break;
    case "door": {
      const r = Math.hypot(o.b[0] - o.a[0], o.b[1] - o.a[1]);
      const an = Math.atan2(o.b[1] - o.a[1], o.b[0] - o.a[0]);
      ctx.beginPath();
      ctx.moveTo(o.a[0], o.a[1]);
      ctx.lineTo(o.b[0], o.b[1]);
      ctx.stroke();
      ctx.save();
      ctx.setLineDash([ctx.lineWidth * 2, ctx.lineWidth * 2]);
      ctx.beginPath();
      ctx.arc(o.a[0], o.a[1], r, an, an - Math.PI / 2, true);
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(o.a[0], o.a[1]);
      ctx.lineTo(o.a[0] + r * Math.cos(an - Math.PI / 2), o.a[1] + r * Math.sin(an - Math.PI / 2));
      ctx.stroke();
      break;
    }
    case "window": {
      ctx.strokeRect(x0, y0, w, h);
      const v = w >= h;
      ctx.beginPath();
      if (v) {
        ctx.moveTo(x0, cy);
        ctx.lineTo(x1, cy);
      } else {
        ctx.moveTo(cx, y0);
        ctx.lineTo(cx, y1);
      }
      ctx.stroke();
      break;
    }
    case "arc": {
      ctx.beginPath();
      ctx.ellipse(cx, y1, w / 2 + 0.5, h + 0.5, 0, Math.PI, 2 * Math.PI);
      ctx.stroke();
      break;
    }
    case "dline": {
      const dx = o.b[0] - o.a[0],
        dy = o.b[1] - o.a[1],
        L = Math.hypot(dx, dy) || 1,
        nx = -dy / L,
        ny = dx / L,
        g = o.th ? o.th / 2 : Math.max(10, ctx.lineWidth * 3);
      [1, -1].forEach((sg) => {
        ctx.beginPath();
        ctx.moveTo(o.a[0] + nx * g * sg, o.a[1] + ny * g * sg);
        ctx.lineTo(o.b[0] + nx * g * sg, o.b[1] + ny * g * sg);
        ctx.stroke();
      });
      break;
    }
    case "cross":
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.moveTo(x1, y0);
      ctx.lineTo(x0, y1);
      ctx.stroke();
      break;
    case "wall":
    case "stud":
    case "cavity":
    case "tstud":
    case "door2":
    case "sdoor":
    case "bifold":
    case "opening":
    case "beam":
    case "pipe":
    case "fence":
    case "eground":
    case "edpc":
    case "egutter":
      npLineSym(ctx, o);
      break;
    case "wc":
    case "basin":
    case "bath":
    case "shower":
    case "sink":
    case "hob":
    case "units":
    case "fridge":
    case "wm":
    case "rad":
    case "boiler":
    case "cyl":
    case "socket":
    case "switch":
    case "light":
    case "smoke":
    case "cu":
    case "mh":
    case "gully":
    case "svp":
    case "tap":
    case "tree":
    case "north":
    case "stairs":
      npBoxSym(ctx, o, x0, y0, w, h, cx, cy);
      break;
    case "legend":
      npLegend(ctx, o, ctx.__objs, x0, y0, w, h);
      break;
    case "eframe":
      npFrame(ctx, o, x0, y0, w, h);
      break;
    case "bblay":
    case "jlay":
    case "rlay":
    case "tlay":
    case "truss":
    case "cutroof":
      npTimberSym(ctx, o, x0, y0, w, h, cx, cy);
      break;
    default:
      if (NP_ELEV_BOX.has(o.k)) npElevSym(ctx, o, x0, y0, w, h, cx, cy);
      else if (NP_DES_BOX.has(o.k)) npDesignSym(ctx, o, x0, y0, w, h, cx, cy);
      else if (NP_ANNO_BOX.has(o.k)) npAnnoSym(ctx, o, x0, y0, w, h, cx, cy);
      else if (NP_BLD_BOX.has(o.k)) npBldSym(ctx, o, x0, y0, w, h, cx, cy);
      else if (NP_DET_BOX.has(o.k)) npDetailSym(ctx, o, x0, y0, w, h);
      else if (NP_LINE.has(o.k)) npLineSym(ctx, o);
      break;
    case "cloud": {
      const n = Math.max(6, Math.round((w + h) / 60));
      ctx.beginPath();
      const pts = [];
      for (let i = 0; i < n; i++) {
        const an = (2 * Math.PI * i) / n;
        pts.push([cx + (w / 2) * Math.cos(an), cy + (h / 2) * Math.sin(an)]);
      }
      pts.forEach((p, i) => {
        const q = pts[(i + 1) % n];
        const mx = (p[0] + q[0]) / 2,
          my = (p[1] + q[1]) / 2;
        const rr = Math.hypot(q[0] - p[0], q[1] - p[1]) / 2;
        const an = Math.atan2(q[1] - p[1], q[0] - p[0]);
        ctx.moveTo(p[0], p[1]);
        ctx.arc(mx, my, rr, an + Math.PI, an, false);
      });
      ctx.stroke();
      break;
    }
  }
}
function npLbl(ctx, t, x, y, sz) {
  ctx.save();
  ctx.setLineDash([]);
  {
    const m = ctx.getTransform();
    if (m.a * m.d - m.b * m.c < 0) {
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      x = 0;
      y = 0;
    }
  }
  ctx.font = `700 ${Math.max(8, sz)}px system-ui,-apple-system,sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(t, x, y);
  ctx.restore();
}
function npLineSym(ctx, o) {
  const [ax, ay] = o.a,
    [bx, by] = o.b,
    dx = bx - ax,
    dy = by - ay,
    L = Math.hypot(dx, dy) || 1,
    ux = dx / L,
    uy = dy / L,
    nx = -uy,
    ny = ux,
    lw = ctx.lineWidth,
    an = Math.atan2(dy, dx);
  const P = (t, off) => [ax + ux * t + nx * off, ay + uy * t + ny * off];
  const ln = (p, q) => {
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
    ctx.stroke();
  };
  const head = (p, a) => {
    const hh = Math.max(10, lw * 4);
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(p[0] - hh * Math.cos(a - 0.45), p[1] - hh * Math.sin(a - 0.45));
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(p[0] - hh * Math.cos(a + 0.45), p[1] - hh * Math.sin(a + 0.45));
    ctx.stroke();
  };
  if (
    npElevLine(ctx, o, P, ln, L, lw) ||
    npDesignLine(ctx, o, P, ln, L, lw) ||
    npAnnoLine(ctx, o, P, ln, L, lw) ||
    npBldLine(ctx, o, P, ln, L, lw)
  )
    return;
  if (o.k === "cavity" || o.k === "tstud") {
    npDrawWalls(ctx, npWallInfo([o]));
    return;
  }
  switch (o.k) {
    case "wall": {
      const T = (o.th || Math.max(12, lw * 5)) / 2;
      ctx.beginPath();
      [P(0, T), P(L, T), P(L, -T), P(0, -T)].forEach((p, i) =>
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]),
      );
      ctx.closePath();
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      break;
    }
    case "stud": {
      const g = o.th ? o.th / 2 : Math.max(8, lw * 3);
      ln(P(0, g), P(L, g));
      ln(P(0, -g), P(L, -g));
      const st = Math.max(18, g * 2.5);
      for (let t = st / 2; t < L; t += st) ln(P(t, -g), P(t + Math.min(st / 2, L - t), g));
      break;
    }
    case "door2": {
      const r = L / 2;
      ln(o.a, o.b);
      ctx.save();
      ctx.setLineDash([lw * 2, lw * 2]);
      ctx.beginPath();
      ctx.arc(ax, ay, r, an, an - Math.PI / 2, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx, by, r, an + Math.PI, an + Math.PI * 1.5, false);
      ctx.stroke();
      ctx.restore();
      ln(o.a, P(0, -r));
      ln(o.b, P(L, -r));
      break;
    }
    case "sdoor": {
      const g = Math.max(5, lw * 2);
      ln(o.a, o.b);
      ctx.save();
      ctx.lineWidth = lw * 1.6;
      ln(P(0, g), P(L * 0.6, g));
      ln(P(L * 0.4, -g), P(L, -g));
      ctx.restore();
      head(P(L * 0.6 + Math.max(12, lw * 4), g * 3), an);
      break;
    }
    case "bifold": {
      const n = 4,
        amp = Math.min(L / (n * 1.2), 40);
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const p = P((L * i) / n, i % 2 ? -amp : 0);
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
      ctx.save();
      ctx.setLineDash([lw * 2, lw * 2]);
      ln(o.a, o.b);
      ctx.restore();
      break;
    }
    case "opening": {
      const g = Math.max(10, lw * 4);
      ctx.save();
      ctx.setLineDash([lw * 3, lw * 3]);
      ln(o.a, o.b);
      ctx.restore();
      ln(P(0, -g), P(0, g));
      ln(P(L, -g), P(L, g));
      break;
    }
    case "beam": {
      ctx.save();
      ctx.lineWidth = lw * 1.6;
      ctx.setLineDash([lw * 8, lw * 3, lw * 1.5, lw * 3]);
      ln(o.a, o.b);
      ctx.restore();
      if (o.pad && o.pad !== "None") {
        ctx.save();
        ctx.setLineDash([]);
        const ps = Math.max(14, lw * 5);
        [o.a, o.b].forEach((p) => {
          ctx.strokeRect(p[0] - ps / 2, p[1] - ps / 2, ps, ps);
          ctx.beginPath();
          ctx.moveTo(p[0] - ps / 2, p[1] + ps / 2);
          ctx.lineTo(p[0] + ps / 2, p[1] - ps / 2);
          ctx.stroke();
        });
        ctx.restore();
      }
      const m = P(L / 2, -Math.max(16, lw * 5));
      ctx.save();
      ctx.translate(m[0], m[1]);
      let ra = an;
      if (ra > Math.PI / 2 || ra < -Math.PI / 2) ra += Math.PI;
      ctx.rotate(ra);
      npLbl(ctx, o.sec ? o.sec.replace(/ \(.*\)$/, "") : "RSJ", 0, 0, Math.max(18, lw * 5));
      ctx.restore();
      break;
    }
    case "pipe": {
      ctx.save();
      ctx.setLineDash([lw * 4, lw * 3]);
      ln(o.a, o.b);
      ctx.restore();
      head(o.b, an);
      head(P(L / 2, 0), an);
      break;
    }
    case "fence": {
      ln(o.a, o.b);
      const st = Math.max(24, lw * 8),
        k = Math.max(5, lw * 2);
      for (let t = st / 2; t < L; t += st) {
        const c = P(t, 0);
        ln([c[0] - k, c[1] - k], [c[0] + k, c[1] + k]);
        ln([c[0] + k, c[1] - k], [c[0] - k, c[1] + k]);
      }
      break;
    }
  }
}
/* stairs: o.n = number of risers (steps), o.down = arrow points down, o.rise = total rise in mm */
function npStairN(o, len, wid, mm) {
  if (o.n) return Math.max(2, Math.round(o.n));
  if (mm) return Math.max(2, Math.round((o.rise || 2600) / 200));
  return Math.max(3, Math.round(len / Math.max(12, wid * 0.28)));
}
function npStairs(ctx, o, x0, y0, w, h) {
  const lw = ctx.lineWidth,
    mm = ctx.__mm || 0,
    x1 = x0 + w,
    y1 = y0 + h;
  const ln = (a, b, c, d) => {
    ctx.beginPath();
    ctx.moveTo(a, b);
    ctx.lineTo(c, d);
    ctx.stroke();
  };
  const arrowTo = (pts) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    const a = pts[pts.length - 2],
      b = pts[pts.length - 1],
      an = Math.atan2(b[1] - a[1], b[0] - a[0]),
      hh = Math.max(8, lw * 4);
    ln(b[0], b[1], b[0] - hh * Math.cos(an - 0.5), b[1] - hh * Math.sin(an - 0.5));
    ln(b[0], b[1], b[0] - hh * Math.cos(an + 0.5), b[1] - hh * Math.sin(an + 0.5));
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], Math.max(lw * 1.2, Math.min(w, h) * 0.025), 0, 7);
    ctx.fill();
  };
  const label = (t, x, y, fs) => {
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x - fs * 1.1, y - fs * 0.6, fs * 2.2, fs * 1.2);
    ctx.restore();
    npLbl(ctx, t, x, y, fs * 0.8);
  };
  const UP = o.down ? "DN" : "UP";
  const rev = (p) => (o.down ? p.slice().reverse() : p);
  if (o.k === "stairs") {
    const v = w >= h,
      len = v ? w : h,
      wid = v ? h : w,
      n = npStairN(o, len, wid, mm);
    const tr = n - 1;
    ctx.strokeRect(x0, y0, w, h);
    ctx.save();
    ctx.lineWidth = Math.max(lw * 0.7, 0.6);
    for (let i = 1; i <= tr; i++) {
      const t = (len * i) / (tr + 1);
      if (v) ln(x0 + t, y0, x0 + t, y1);
      else ln(x0, y1 - t, x1, y1 - t);
    }
    ctx.restore();
    const p = v
      ? [
          [x0 + w * 0.04, y0 + h / 2],
          [x1 - w * 0.04, y0 + h / 2],
        ]
      : [
          [x0 + w / 2, y1 - h * 0.04],
          [x0 + w / 2, y0 + h * 0.04],
        ];
    arrowTo(rev(p));
    const fs = Math.min(wid * 0.28, 30);
    const lp = rev(p)[0];
    label(
      UP,
      v ? lp[0] + fs * 1.6 * (o.down ? -1 : 1) : lp[0],
      v ? lp[1] - wid * 0.25 : lp[1] - fs * 1.4 * (o.down ? -1 : 1),
      fs,
    );
    return;
  }
  const fw = Math.min(w, h) * (o.k === "stairsu" ? 0.48 : 0.38);
  if (o.k === "stairsl") {
    const L1 = w - fw,
      L2 = h - fw,
      tot = npStairN(o, L1 + L2, fw, mm);
    const n1 = Math.max(1, Math.round(((tot - 1) * L1) / (L1 + L2))),
      n2 = Math.max(1, tot - 1 - n1);
    ctx.strokeRect(x0, y1 - fw, L1, fw);
    ctx.strokeRect(x1 - fw, y0, fw, L2);
    ctx.strokeRect(x1 - fw, y1 - fw, fw, fw);
    ctx.save();
    ctx.lineWidth = Math.max(lw * 0.7, 0.6);
    for (let k = 1; k <= n1; k++) {
      const x = x0 + (L1 * k) / (n1 + 1);
      ln(x, y1 - fw, x, y1);
    }
    for (let k = 1; k <= n2; k++) {
      const y = y0 + (L2 * k) / (n2 + 1);
      ln(x1 - fw, y, x1, y);
    }
    ctx.restore();
    arrowTo(
      rev([
        [x0 + fw * 0.15, y1 - fw / 2],
        [x1 - fw / 2, y1 - fw / 2],
        [x1 - fw / 2, y0 + fw * 0.15],
      ]),
    );
    const fs = Math.min(fw * 0.28, 30);
    label(UP, o.down ? x1 - fw / 2 : x0 + fw * 0.6, o.down ? y0 + fw * 0.5 : y1 - fw * 0.85, fs);
    return;
  }
  if (o.k === "stairsu") {
    const lh = Math.min(fw, h * 0.3),
      L = h - lh,
      tot = npStairN(o, L * 2, fw, mm);
    const n1 = Math.max(1, Math.round((tot - 1) / 2)),
      n2 = Math.max(1, tot - 1 - n1);
    ctx.strokeRect(x0, y0 + lh, fw, L);
    ctx.strokeRect(x1 - fw, y0 + lh, fw, L);
    ctx.strokeRect(x0, y0, w, lh);
    ctx.save();
    ctx.lineWidth = Math.max(lw * 0.7, 0.6);
    for (let k = 1; k <= n1; k++) {
      const y = y1 - (L * k) / (n1 + 1);
      ln(x0, y, x0 + fw, y);
    }
    for (let k = 1; k <= n2; k++) {
      const y = y0 + lh + (L * k) / (n2 + 1);
      ln(x1 - fw, y, x1, y);
    }
    ctx.restore();
    if (w - 2 * fw > 1) {
      ctx.save();
      ctx.lineWidth = lw * 1.3;
      ln(x0 + fw, y0 + lh, x0 + fw, y1);
      ln(x1 - fw, y0 + lh, x1 - fw, y1);
      ctx.restore();
    }
    arrowTo(
      rev([
        [x0 + fw / 2, y1 - L * 0.04],
        [x0 + fw / 2, y0 + lh / 2],
        [x1 - fw / 2, y0 + lh / 2],
        [x1 - fw / 2, y1 - L * 0.04],
      ]),
    );
    const fs = Math.min(fw * 0.28, 30);
    label(UP, o.down ? x1 - fw / 2 : x0 + fw / 2, y1 - L * 0.18, fs);
    return;
  }
}
function npBoxSym(ctx, o, x0, y0, w, h, cx, cy) {
  const lw = ctx.lineWidth,
    m = Math.min(w, h),
    r = m / 2;
  const ell = (x, y, rx, ry, fill) => {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, 7);
    if (fill) {
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.stroke();
  };
  const rr = (x, y, ww, hh, rad) => {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, ww, hh, Math.min(rad, ww / 2, hh / 2));
    else ctx.rect(x, y, ww, hh);
    ctx.stroke();
  };
  const ln = (a, b, c, d) => {
    ctx.beginPath();
    ctx.moveTo(a, b);
    ctx.lineTo(c, d);
    ctx.stroke();
  };
  const tx = (t, f) => npLbl(ctx, t, cx, cy, Math.min(h * 0.45, w / (t.length * 0.68)) * (f || 1));
  switch (o.k) {
    case "wc": {
      const ch = h * 0.28;
      ctx.strokeRect(x0, y0, w, ch);
      ell(cx, y0 + ch + (h - ch) / 2, w * 0.38, ((h - ch) / 2) * 0.95);
      break;
    }
    case "basin": {
      ctx.strokeRect(x0, y0, w, h);
      ell(cx, cy + h * 0.06, w * 0.36, h * 0.32);
      ell(cx, y0 + h * 0.14, m * 0.05, m * 0.05, true);
      break;
    }
    case "bath": {
      rr(x0, y0, w, h, m * 0.12);
      const i = m * 0.1;
      rr(x0 + i, y0 + i, w - 2 * i, h - 2 * i, m * 0.25);
      const v = w >= h;
      ell(v ? x0 + i * 2.2 : cx, v ? cy : y0 + i * 2.2, m * 0.05, m * 0.05, true);
      break;
    }
    case "shower": {
      ctx.strokeRect(x0, y0, w, h);
      ln(x0, y0, x0 + w, y0 + h);
      ln(x0 + w, y0, x0, y0 + h);
      ell(cx, cy, m * 0.07, m * 0.07, true);
      break;
    }
    case "sink": {
      ctx.strokeRect(x0, y0, w, h);
      const v = w >= h;
      if (v) {
        const bw = w * 0.48;
        rr(x0 + w * 0.04, y0 + h * 0.12, bw, h * 0.76, m * 0.12);
        for (let i = 1; i <= 4; i++) {
          const x = x0 + w * 0.56 + (w * 0.4 * i) / 5;
          ln(x, y0 + h * 0.18, x, y0 + h * 0.82);
        }
      } else {
        const bh = h * 0.48;
        rr(x0 + w * 0.12, y0 + h * 0.04, w * 0.76, bh, m * 0.12);
        for (let i = 1; i <= 4; i++) {
          const y = y0 + h * 0.56 + (h * 0.4 * i) / 5;
          ln(x0 + w * 0.18, y, x0 + w * 0.82, y);
        }
      }
      break;
    }
    case "hob": {
      ctx.strokeRect(x0, y0, w, h);
      [
        [0.28, 0.28, 0.17],
        [0.72, 0.28, 0.13],
        [0.28, 0.72, 0.13],
        [0.72, 0.72, 0.17],
      ].forEach(([a, b, c]) => ell(x0 + w * a, y0 + h * b, m * c, m * c));
      break;
    }
    case "units": {
      ctx.strokeRect(x0, y0, w, h);
      const v = w >= h,
        n = Math.max(1, Math.round((v ? w : h) / (v ? h : w)));
      for (let i = 1; i < n; i++) {
        if (v) ln(x0 + (w * i) / n, y0, x0 + (w * i) / n, y0 + h);
        else ln(x0, y0 + (h * i) / n, x0 + w, y0 + (h * i) / n);
      }
      ctx.save();
      ctx.setLineDash([lw * 2, lw * 2]);
      if (v) ln(x0, y0 + h * 0.85, x0 + w, y0 + h * 0.85);
      else ln(x0 + w * 0.85, y0, x0 + w * 0.85, y0 + h);
      ctx.restore();
      break;
    }
    case "fridge": {
      ctx.strokeRect(x0, y0, w, h);
      tx("FR", 0.8);
      break;
    }
    case "wm": {
      ctx.strokeRect(x0, y0, w, h);
      ell(cx, cy, m * 0.32, m * 0.32);
      ell(cx, cy, m * 0.2, m * 0.2);
      break;
    }
    case "rad": {
      ctx.strokeRect(x0, y0, w, h);
      const v = w >= h,
        n = Math.max(3, Math.round((v ? w : h) / Math.max(10, (v ? h : w) * 0.8)));
      for (let i = 1; i < n; i++) {
        if (v) ln(x0 + (w * i) / n, y0 + h * 0.2, x0 + (w * i) / n, y0 + h * 0.8);
        else ln(x0 + w * 0.2, y0 + (h * i) / n, x0 + w * 0.8, y0 + (h * i) / n);
      }
      break;
    }
    case "boiler": {
      ctx.strokeRect(x0, y0, w, h);
      tx("B", 0.9);
      break;
    }
    case "cyl": {
      ell(cx, cy, r, r);
      tx("HW", 0.7);
      break;
    }
    case "socket": {
      ctx.strokeRect(x0, y0, w, h);
      const g = w * 0.25;
      [cx - g, cx + g].forEach((x) => {
        ln(x, y0 + h * 0.25, x, y0 + h * 0.55);
      });
      ln(cx - g * 0.4, y0 + h * 0.72, cx + g * 0.4, y0 + h * 0.72);
      break;
    }
    case "switch": {
      ell(cx, cy, r * 0.45, r * 0.45, true);
      ln(cx + r * 0.32, cy - r * 0.32, cx + r, cy - r);
      ln(cx + r, cy - r, cx + r * 0.7, cy - r * 1.0);
      break;
    }
    case "light": {
      ell(cx, cy, r, r);
      const k = r * 0.7071;
      ln(cx - k, cy - k, cx + k, cy + k);
      ln(cx + k, cy - k, cx - k, cy + k);
      break;
    }
    case "smoke": {
      ell(cx, cy, r, r);
      tx("S", 0.8);
      break;
    }
    case "cu": {
      ctx.strokeRect(x0, y0, w, h);
      tx("CU", 0.8);
      break;
    }
    case "mh": {
      ctx.strokeRect(x0, y0, w, h);
      ln(x0, y0, x0 + w, y0 + h);
      ln(x0 + w, y0, x0, y0 + h);
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = 0.85;
      ctx.fillRect(cx - m * 0.28, cy - m * 0.18, m * 0.56, m * 0.36);
      ctx.restore();
      npLbl(ctx, "MH", cx, cy, m * 0.26);
      break;
    }
    case "gully": {
      ell(cx, cy, r, r);
      tx("G", 0.8);
      break;
    }
    case "svp": {
      ell(cx, cy, r, r);
      tx("SVP", 0.75);
      break;
    }
    case "tap": {
      ell(cx, cy, r, r);
      tx("OT", 0.75);
      break;
    }
    case "tree": {
      const n = 9;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a1 = (2 * Math.PI * i) / n,
          a2 = (2 * Math.PI * (i + 1)) / n;
        const p = [cx + (w / 2) * 0.85 * Math.cos(a1), cy + (h / 2) * 0.85 * Math.sin(a1)],
          q = [cx + (w / 2) * 0.85 * Math.cos(a2), cy + (h / 2) * 0.85 * Math.sin(a2)];
        const mx = (p[0] + q[0]) / 2,
          my = (p[1] + q[1]) / 2,
          rad = Math.hypot(q[0] - p[0], q[1] - p[1]) / 2,
          an = Math.atan2(q[1] - p[1], q[0] - p[0]);
        ctx.moveTo(p[0], p[1]);
        ctx.arc(mx, my, rad, an + Math.PI, an, false);
      }
      ctx.stroke();
      ell(cx, cy, m * 0.05, m * 0.05, true);
      break;
    }
    case "north": {
      ln(cx, y0 + h, cx, y0);
      ctx.beginPath();
      ctx.moveTo(cx, y0);
      ctx.lineTo(cx - m * 0.22, y0 + h * 0.32);
      ctx.lineTo(cx + m * 0.22, y0 + h * 0.32);
      ctx.closePath();
      ctx.fill();
      npLbl(ctx, "N", cx, y0 + h * 0.62, m * 0.3);
      break;
    }
    case "stairs":
      npStairs(ctx, o, x0, y0, w, h);
      break;
  }
}
const NP_COLS = ["#111111", "#e11d2a", "#2f5fb3", "#1d8a4a", "#f2c230", "#ffffff"];
const NP_MORECOLS = [
  "#111111",
  "#4b5563",
  "#9ca3af",
  "#ffffff",
  "#e11d2a",
  "#e07b00",
  "#f2c230",
  "#1d8a4a",
  "#0e9aa7",
  "#2f5fb3",
  "#7a2fb3",
  "#d43f9b",
  "#8b5a2b",
  "#7F191D",
  "#fde2c4",
  "#dcebd3",
  "#dbeafe",
  "#fde68a",
  "#fecaca",
  "#e9d5ff",
];
const npSymLabel = (k) => (NP_SHAPES.find((x) => x[0] === k) || [, k])[1].replace(/^\S+\s/, "");
const NP_NOKEY = new Set([
  "tri",
  "rtri",
  "diamond",
  "hex",
  "star",
  "fillrect",
  "fillcirc",
  "arc",
  "cross",
  "cloud",
  "legend",
  "secmark",
  "tagbox",
  "tagcirc",
  "viewtitle",
  "scalebar",
  "north",
]);
/* entries for the automatic key: every kind of symbol on the page, plus each block colour used */
function npKeyEntries(objs, o) {
  const seen = new Map();
  objs.forEach((x) => {
    if (!x || x === o) return;
    if (x.t === "shape" && !NP_NOKEY.has(x.k)) {
      const id = "k:" + x.k;
      if (!seen.has(id))
        seen.set(id, {
          id,
          kind: x.k,
          c: x.c,
          fill: x.fill,
          fa: x.fa,
          th: x.th,
          label: npSymLabel(x.k),
        });
    }
    if (x.fill) {
      const id = "f:" + String(x.fill).toLowerCase() + ":" + (x.fa >= 0.99 ? "s" : "l");
      if (!seen.has(id))
        seen.set(id, { id, fillOnly: true, fill: x.fill, fa: x.fa, label: "Coloured area" });
    }
  });
  const out = [...seen.values()].map((e) =>
    Object.assign(e, { label: (o.names || {})[e.id] || e.label }),
  );
  (o.extra || []).forEach((x, i) =>
    out.push({
      id: "x:" + i,
      fillOnly: true,
      fill: x.c,
      fa: x.fa || 0.35,
      label: x.label || "",
      custom: true,
    }),
  );
  return out;
}
function npLegend(ctx, o, objs, x0, y0, w, h) {
  const lw = ctx.lineWidth;
  const ents = npKeyEntries(objs || [], o).filter((e) => !(o.hide || []).includes(e.id));
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.fillRect(x0, y0, w, h);
  ctx.restore();
  ctx.strokeRect(x0, y0, w, h);
  const pad = Math.min(w, h) * 0.04,
    th = Math.min(h * 0.12, w * 0.09);
  ctx.save();
  ctx.fillStyle = o.c || "#111";
  ctx.font = `700 ${th * 0.7}px system-ui,-apple-system,sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(o.s || "Key", x0 + pad, y0 + pad + th / 2);
  ctx.restore();
  ctx.save();
  ctx.lineWidth = Math.max(lw * 0.6, 0.5);
  ctx.beginPath();
  ctx.moveTo(x0 + pad, y0 + pad * 1.5 + th);
  ctx.lineTo(x0 + w - pad, y0 + pad * 1.5 + th);
  ctx.stroke();
  ctx.restore();
  if (!ents.length) {
    ctx.save();
    ctx.fillStyle = "#888";
    ctx.font = `500 ${th * 0.45}px system-ui`;
    ctx.textBaseline = "middle";
    ctx.fillText("Symbols you use will be listed here", x0 + pad, y0 + pad * 3 + th * 1.3);
    ctx.restore();
    return;
  }
  const top = y0 + pad * 2.5 + th,
    avail = y0 + h - pad - top,
    rh = Math.min(avail / ents.length, th * 1.25, w * 0.14),
    iw = rh * 1.8,
    ih = rh * 0.78;
  ents.forEach((e, i) => {
    const ry = top + i * rh,
      ix = x0 + pad,
      iy = ry + (rh - ih) / 2;
    ctx.save();
    if (e.fillOnly) {
      ctx.fillStyle = e.fill;
      ctx.globalAlpha = e.fa >= 0.99 ? 1 : Math.max(0.35, e.fa || 0.35);
      ctx.fillRect(ix, iy, iw, ih);
      ctx.globalAlpha = 1;
      ctx.lineWidth = Math.max(lw * 0.5, 0.5);
      ctx.strokeStyle = "#555";
      ctx.strokeRect(ix, iy, iw, ih);
    } else {
      ctx.strokeStyle = ctx.fillStyle = e.c || "#111";
      ctx.lineWidth = Math.max(Math.min(lw, ih * (NP_WALLK.has(e.kind) ? 0.03 : 0.08)), 0.4);
      const isL = NP_LINE.has(e.kind) || e.kind === "door";
      let so;
      if (isL)
        so = {
          t: "shape",
          k: e.kind,
          a: [ix + iw * 0.08, iy + ih * 0.55],
          b: [ix + iw * 0.92, iy + ih * 0.55],
          c: e.c,
          fill: e.fill,
          fa: e.fa,
          w: ctx.lineWidth,
          th: NP_WALLK.has(e.kind) ? ih * 0.55 : undefined,
        };
      else {
        const R = NP_REAL[e.kind];
        let bw = iw,
          bh = ih;
        if (R && R[1]) {
          const r = R[1] / R[0];
          if (r > bh / bw) bw = bh / r;
          else bh = bw * r;
        }
        so = {
          t: "shape",
          k: e.kind,
          a: [ix + (iw - bw) / 2, iy + (ih - bh) / 2],
          b: [ix + (iw + bw) / 2, iy + (ih + bh) / 2],
          c: e.c,
          fill: e.fill,
          fa: e.fa,
        };
      }
      ctx.beginPath();
      ctx.rect(ix, iy - ih * 0.1, iw, ih * 1.2);
      ctx.clip();
      const sv = ctx.__mm;
      ctx.__mm = 0;
      try {
        if (so.fill && !isL) {
          ctx.save();
          ctx.fillStyle = so.fill;
          ctx.globalAlpha = so.fa || 0.35;
          ctx.fillRect(so.a[0], so.a[1], so.b[0] - so.a[0], so.b[1] - so.a[1]);
          ctx.restore();
        }
        drawShape(ctx, so);
      } catch (x) {}
      ctx.__mm = sv;
    }
    ctx.restore();
    ctx.save();
    ctx.fillStyle = "#111";
    ctx.font = `500 ${rh * 0.42}px system-ui,-apple-system,sans-serif`;
    ctx.textBaseline = "middle";
    const tx = ix + iw + pad;
    let t = e.label;
    const maxW = x0 + w - pad - tx;
    while (t.length > 3 && ctx.measureText(t).width > maxW) t = t.slice(0, -2) + "…";
    ctx.fillText(t, tx, ry + rh / 2);
    ctx.restore();
  });
}
const NP_U = 5; /* drawing units per mm of paper */
const NP_SIZES = {
  A4: [297, 210],
  A3: [420, 297],
  A2: [594, 420],
  A1: [841, 594],
  A0: [1189, 841],
};
const NP_SCALES = [0, 1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1250];
/* Runs once when the app starts, called from core/boot.js. Nothing else in this file runs at load. */
function initConstructionDetails() {
  NP_ELEV_BOX.forEach((k) => NP_SYM.add(k));
  NP_DES_BOX.forEach((k) => NP_SYM.add(k));
  NP_ANNO_BOX.forEach((k) => NP_SYM.add(k));
  NP_BLD_BOX.forEach((k) => NP_SYM.add(k));
  NP_SYM.add("legend");
  NP_SYM.add("eframe");
  NP_TIMB_BOX.forEach((k) => NP_SYM.add(k));
  NP_DET_BOX.forEach((k) => NP_SYM.add(k));
  NP_BLD_LINE.forEach((k) => NP_LINE.add(k));
  Object.keys(NP_MEMBR).forEach((k) => NP_LINE.add(k));
  ["hedge", "path", "retwall", "gate"].forEach((k) => NP_LINE.add(k));
}
