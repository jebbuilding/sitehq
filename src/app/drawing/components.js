/* ===== building components: roof parts, claddings, render, walls, floors, foundations, drainage, electrics ===== */
import { npLbl } from "./construction-details.js";
import { npHexMix, npPattern } from "./walls.js";
export { NP_BLD_BOX, NP_BLD_LINE, NP_LIB, npBldLine, npBldSym };
const NP_BLD_BOX = new Set([
  "roofhip",
  "roofgable",
  "wplate",
  "ridgeb",
  "purlin",
  "eaves",
  "flatroof",
  "lintel",
  "weep",
  "wtie",
  "closer",
  "airbrick",
  "fdn",
  "trenchfill",
  "bblock",
  "gslab",
  "tfloor",
  "screed",
  "evclad",
  "epanel",
  "etilehang",
  "estone",
  "esoldier",
  "re",
  "ic",
  "soakaway",
  "rwp",
  "aav",
  "fan",
  "fspur",
  "ckr",
  "olight",
  "dlight",
  "heat",
  "coal",
  "tvp",
  "stat",
  "towel",
  /* energy and wildlife */
  "solarpv",
  "battery",
  "inverter",
  "evcharger",
  "beebrick",
  "batbox",
  "birdbox",
  "swiftbox",
]);
const NP_BLD_LINE = new Set([
  "ductsup",
  "ductext",
  "contour",
  "bndry",
  "redline",
  "hedgerem",
  "fencerem",
  "swale",
  "easement",
  "treefence",
  "walkway",
  "lintelp",
  "steelub",
  "movjoint",
  "firewall",
  "kerb",
  "kerbdrop",
  "kerbflush",
  "retweep",
  "gabion",
  "secline",
  "matchline",
  "lvlline",
  "embank",
  "ubt",
  "fibre",
  "ohl",
  "ohbt",
  "landdrain",
  "ch8",
  "heras",
  "herasgate",
  "uelec",
  "uwater",
  "ugas",
  "rafter",
  "joistl",
  "rooftile",
  "batfelt",
  "lead",
  "pboard",
  "renderl",
  "cladsec",
  "ctray",
  "foul",
  "storm",
  "fall",
  /* roof: plan lines and section timbers */
  "hipl",
  "valleyl",
  "ridgel",
  "collar",
  "strut",
  "cjoist",
]);
function npBldSym(ctx, o, x0, y0, w, h, cx, cy) {
  const lw = ctx.lineWidth,
    mm = ctx.__mm || 0,
    c = ctx.strokeStyle,
    m = Math.min(w, h),
    v = w >= h,
    x1 = x0 + w,
    y1 = y0 + h;
  const ln = (a, b, cc, d) => {
    ctx.beginPath();
    ctx.moveTo(a, b);
    ctx.lineTo(cc, d);
    ctx.stroke();
  };
  const thin = (f) => {
    ctx.lineWidth = Math.max(lw * (f || 0.5), 0.5);
  };
  const full = () => {
    ctx.lineWidth = lw;
  };
  const R = (a, fb) => (mm ? a * mm : fb);
  const clipR = (x, y, ww, hh, fn) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, ww, hh);
    ctx.clip();
    fn();
    ctx.restore();
  };
  const ell = (x, y, rx, ry, f) => {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, 7);
    if (f) ctx.fill();
    ctx.stroke();
  };
  const lbl = (t, f) => npLbl(ctx, t, cx, cy, Math.min(h * 0.42, w / (t.length * 0.68)) * (f || 1));
  const fillR = (x, y, ww, hh, col) => {
    ctx.save();
    ctx.fillStyle = col;
    ctx.fillRect(x, y, ww, hh);
    ctx.restore();
  };
  const stip = (x, y, ww, hh, st) =>
    clipR(x, y, ww, hh, () => {
      let k = 0;
      for (let yy = y + st / 2; yy < y + hh; yy += st, k++)
        for (let xx = x + (k % 2 ? st / 2 : st / 5); xx < x + ww; xx += st) {
          ctx.beginPath();
          ctx.arc(xx, yy, Math.max(lw * 0.3, 0.4), 0, 7);
          ctx.fill();
        }
    });
  const hatch = (x, y, ww, hh, st, dir) =>
    clipR(x, y, ww, hh, () => {
      thin(0.4);
      for (let t = -hh; t < ww + hh; t += st)
        dir ? ln(x + t, y, x + t + hh, y + hh) : ln(x + t, y + hh, x + t + hh, y);
      full();
    });
  const timber = (x, y, ww, hh) => {
    fillR(x, y, ww, hh, "#f3e2c4");
    ctx.strokeRect(x, y, ww, hh);
    thin(0.5);
    ln(x, y, x + ww, y + hh);
    ln(x + ww, y, x, y + hh);
    full();
  };
  const block = (x, y, ww, hh) => {
    fillR(x, y, ww, hh, npHexMix(c, 0.82));
    ctx.strokeRect(x, y, ww, hh);
    hatch(x, y, ww, hh, Math.max(Math.min(ww, hh) / 4, R(40, 4)), true);
  };
  const conc = (x, y, ww, hh) => {
    ctx.strokeRect(x, y, ww, hh);
    stip(x, y, ww, hh, Math.max(Math.min(ww, hh) / 6, R(40, 5)));
  };
  const circTxt = (t) => {
    ell(cx, cy, m / 2, m / 2);
    lbl(t, 0.7);
  };
  switch (o.k) {
    case "roofhip":
    case "roofgable": {
      ctx.strokeRect(x0, y0, w, h);
      const r = m / 2;
      const A = v ? [x0 + (o.k === "roofhip" ? r : 0), cy] : [cx, y0 + (o.k === "roofhip" ? r : 0)],
        B = v ? [x1 - (o.k === "roofhip" ? r : 0), cy] : [cx, y1 - (o.k === "roofhip" ? r : 0)];
      ln(A[0], A[1], B[0], B[1]);
      if (o.k === "roofhip") {
        ln(x0, y0, A[0], A[1]);
        ln(v ? x0 : x1, v ? y1 : y0, v ? A[0] : A[0], v ? A[1] : A[1]);
        ln(x1, y1, B[0], B[1]);
        ln(v ? x1 : x0, v ? y0 : y1, B[0], B[1]);
      }
      thin(0.35);
      clipR(x0, y0, w, h, () => {
        const st = R(150, Math.max(m / 14, 5));
        if (v) {
          for (let y = y0 + st; y < y1; y += st) ln(x0, y, x1, y);
        } else {
          for (let x = x0 + st; x < x1; x += st) ln(x, y0, x, y1);
        }
      });
      full();
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = 0.8;
      ctx.fillRect(A[0] - m * 0.05, A[1] - m * 0.05, B[0] - A[0] + m * 0.1, B[1] - A[1] + m * 0.1);
      ctx.restore();
      ln(A[0], A[1], B[0], B[1]);
      break;
    }
    case "wplate":
    case "ridgeb":
    case "purlin":
      timber(x0, y0, w, h);
      break;
    case "eaves": {
      const fb = w * 0.12;
      timber(x1 - fb * 2.5, y0, fb, h * 0.6);
      fillR(x0, y0 + h * 0.6, w - fb * 1.5, h * 0.08, "#fff");
      ctx.strokeRect(x0, y0 + h * 0.6, w - fb * 1.5, h * 0.08);
      ctx.beginPath();
      ctx.arc(x1 - fb * 0.75, y0 + h * 0.25, fb * 0.75, 0, Math.PI);
      ctx.stroke();
      ln(x1 - fb * 1.5, y0 + h * 0.25, x1, y0 + h * 0.25);
      break;
    }
    case "flatroof": {
      const L = [
        [0.06, "mem"],
        [0.1, "deck"],
        [0.34, "ins"],
        [0.1, "deck"],
        [0.4, "joist"],
      ];
      let y = y0;
      L.forEach(([f, t]) => {
        const hh = h * f;
        if (t === "mem") {
          ctx.lineWidth = lw * 1.4;
          ln(x0, y + hh / 2, x1, y + hh / 2);
          full();
        } else if (t === "deck") {
          fillR(x0, y, w, hh, "#f3e2c4");
          ctx.strokeRect(x0, y, w, hh);
        } else if (t === "ins") {
          fillR(x0, y, w, hh, "#fff1a8");
          ctx.strokeRect(x0, y, w, hh);
          clipR(x0, y, w, hh, () => npPattern(ctx, "insul", x0, x1, y, y + hh, lw, c));
        } else {
          const st = R(400, w / 5),
            jw = Math.min(R(50, st * 0.25), st * 0.4);
          for (let x = x0 + st / 2; x < x1; x += st) timber(x - jw / 2, y, jw, hh);
        }
        y += hh;
      });
      break;
    }
    case "lintel": {
      fillR(x0, y0, w, h, "#cfd5dd");
      ctx.strokeRect(x0, y0, w, h);
      thin(0.5);
      ln(x0, y1, x0 + w * 0.08, y0);
      ln(x1, y1, x1 - w * 0.08, y0);
      full();
      lbl("LINTEL", 0.5);
      break;
    }
    case "weep": {
      ctx.strokeRect(x0, y0, w, h);
      thin(0.5);
      const n = 3;
      for (let k = 1; k <= n; k++)
        ln(x0 + (w * k) / (n + 1), y0 + h * 0.15, x0 + (w * k) / (n + 1), y1 - h * 0.15);
      full();
      break;
    }
    case "wtie": {
      ln(x0, cy, x1, cy);
      const k = w * 0.12;
      ln(cx - k, cy, cx, cy + h * 0.4);
      ln(cx, cy + h * 0.4, cx + k, cy);
      break;
    }
    case "closer": {
      fillR(x0, y0, w, h, "#fff1a8");
      ctx.strokeRect(x0, y0, w, h);
      clipR(x0, y0, w, h, () => {
        if (v) npPattern(ctx, "insul", x0, x1, y0, y1, lw, c);
        else {
          ctx.save();
          ctx.translate(x0, y1);
          ctx.rotate(-Math.PI / 2);
          npPattern(ctx, "insul", 0, h, 0, w, lw, c);
          ctx.restore();
        }
      });
      break;
    }
    case "airbrick": {
      ctx.strokeRect(x0, y0, w, h);
      thin(0.5);
      const nx = Math.max(3, Math.round(w / (h / 3))),
        ny = 3;
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < ny; j++) {
          const ww = w / nx,
            hh = h / ny;
          ctx.strokeRect(x0 + i * ww + ww * 0.2, y0 + j * hh + hh * 0.2, ww * 0.6, hh * 0.6);
        }
      full();
      break;
    }
    case "fdn": {
      const fh = h * 0.35,
        ww = w * 0.42;
      conc(x0, y1 - fh, w, fh);
      block(cx - ww / 2, y0, ww, h - fh);
      break;
    }
    case "trenchfill": {
      conc(x0, y0, w, h);
      break;
    }
    case "bblock": {
      const st = R(560, Math.max(w / 6, 20)),
        bw = Math.min(st * 0.28, R(155, st * 0.28));
      for (let x = x0; x < x1 - 1; x += st) {
        const bx = x;
        ctx.beginPath();
        ctx.moveTo(bx, y1);
        ctx.lineTo(bx + bw, y1);
        ctx.lineTo(bx + bw * 0.7, y0 + h * 0.35);
        ctx.lineTo(bx + bw * 0.3, y0 + h * 0.35);
        ctx.closePath();
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
        const nx = Math.min(x + st, x1);
        if (nx - bx - bw > 2) block(bx + bw, y0 + h * 0.15, nx - bx - bw, h * 0.85);
      }
      ln(x0, y0 + h * 0.15, x1, y0 + h * 0.15);
      break;
    }
    case "gslab": {
      const L = [
        [0.15, "screed"],
        [0.25, "ins"],
        [0.04, "dpm"],
        [0.28, "conc"],
        [0.06, "sand"],
        [0.22, "hard"],
      ];
      let y = y0;
      L.forEach(([f, t]) => {
        const hh = h * f;
        if (t === "screed") {
          fillR(x0, y, w, hh, "#eeeeee");
          ctx.strokeRect(x0, y, w, hh);
        } else if (t === "ins") {
          fillR(x0, y, w, hh, "#fff1a8");
          ctx.strokeRect(x0, y, w, hh);
          clipR(x0, y, w, hh, () => npPattern(ctx, "insul", x0, x1, y, y + hh, lw, c));
        } else if (t === "dpm") {
          ctx.save();
          ctx.strokeStyle = "#7a2fb3";
          ctx.setLineDash([lw * 6, lw * 2, lw * 1.5, lw * 2]);
          ln(x0, y + hh / 2, x1, y + hh / 2);
          ctx.restore();
        } else if (t === "conc") conc(x0, y, w, hh);
        else if (t === "sand") {
          fillR(x0, y, w, hh, "#f6efd9");
          ctx.strokeRect(x0, y, w, hh);
        } else {
          ctx.strokeRect(x0, y, w, hh);
          hatch(x0, y, w, hh, Math.max(hh / 2, 4), false);
        }
        y += hh;
      });
      break;
    }
    case "tfloor": {
      const bh = h * 0.12;
      fillR(x0, y0, w, bh, "#f3e2c4");
      ctx.strokeRect(x0, y0, w, bh);
      const st = R(400, w / 5),
        jw = Math.min(R(50, st * 0.3), st * 0.4);
      for (let x = x0 + st / 2; x < x1; x += st) timber(x - jw / 2, y0 + bh, jw, h - bh * 2);
      ctx.strokeRect(x0, y1 - bh * 0.6, w, bh * 0.6);
      break;
    }
    case "screed": {
      fillR(x0, y0, w, h, "#eeeeee");
      ctx.strokeRect(x0, y0, w, h);
      stip(x0, y0, w, h, Math.max(m / 3, R(30, 3)));
      break;
    }
    case "evclad": {
      ctx.strokeRect(x0, y0, w, h);
      clipR(x0, y0, w, h, () => {
        thin(0.5);
        const st = R(150, Math.max(w / 14, 5));
        for (let x = x0 + st; x < x1; x += st) ln(x, y0, x, y1);
      });
      full();
      break;
    }
    case "epanel": {
      ctx.strokeRect(x0, y0, w, h);
      clipR(x0, y0, w, h, () => {
        thin(0.6);
        const pw = R(1200, Math.max(w / 4, 10)),
          ph = R(600, Math.max(h / 4, 8));
        for (let x = x0 + pw; x < x1; x += pw) ln(x, y0, x, y1);
        for (let y = y0 + ph; y < y1; y += ph) ln(x0, y, x1, y);
        ctx.fillStyle = c;
        for (let x = x0; x < x1; x += pw)
          for (let y = y0; y < y1; y += ph)
            [
              [0.08, 0.1],
              [0.92, 0.1],
              [0.08, 0.9],
              [0.92, 0.9],
            ].forEach(([a, b]) => {
              ctx.beginPath();
              ctx.arc(x + pw * a, y + ph * b, Math.max(lw * 0.3, 0.4), 0, 7);
              ctx.fill();
            });
      });
      full();
      break;
    }
    case "etilehang": {
      ctx.strokeRect(x0, y0, w, h);
      clipR(x0, y0, w, h, () => {
        thin(0.45);
        const ch = R(115, Math.max(h / 16, 5)),
          tw = R(165, ch * 1.45);
        let r = 0;
        for (let y = y0 + ch; y < y1 + ch; y += ch, r++) {
          for (let x = x0 + (r % 2 ? tw / 2 : 0) - tw; x < x1; x += tw) {
            ctx.beginPath();
            ctx.moveTo(x, y - ch * 0.2);
            ctx.lineTo(x, y);
            ctx.arc(x + tw / 2, y, tw / 2, Math.PI, 0, true);
            ctx.lineTo(x + tw, y - ch * 0.2);
            ctx.stroke();
          }
        }
      });
      full();
      break;
    }
    case "estone": {
      ctx.strokeRect(x0, y0, w, h);
      clipR(x0, y0, w, h, () => {
        thin(0.5);
        const ch = R(150, Math.max(h / 10, 6));
        let r = 0;
        for (let y = y0; y < y1; y += ch, r++) {
          ln(x0, y, x1, y);
          let x = x0 + (((r * 37) % 10) / 10) * ch;
          while (x < x1) {
            ln(x, y, x, y + ch);
            x += ch * (1.3 + ((r * 13 + Math.round(x)) % 7) / 5);
          }
        }
      });
      full();
      break;
    }
    case "esoldier": {
      ctx.strokeRect(x0, y0, w, h);
      clipR(x0, y0, w, h, () => {
        thin(0.45);
        const bw = R(75, Math.max(h / 3.2, 3));
        for (let x = x0 + bw; x < x1; x += bw) ln(x, y0, x, y1);
      });
      full();
      break;
    }
    case "re":
      circTxt("RE");
      break;
    case "rwp":
      circTxt("RWP");
      break;
    case "aav":
      circTxt("AAV");
      break;
    case "ic": {
      ctx.strokeRect(x0, y0, w, h);
      ln(x0, y0, x1, y1);
      ln(x1, y0, x0, y1);
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = 0.85;
      ctx.fillRect(cx - m * 0.25, cy - m * 0.16, m * 0.5, m * 0.32);
      ctx.restore();
      npLbl(ctx, "IC", cx, cy, m * 0.26);
      break;
    }
    case "soakaway": {
      ctx.strokeRect(x0, y0, w, h);
      hatch(x0, y0, w, h, Math.max(m / 6, R(150, 5)), true);
      hatch(x0, y0, w, h, Math.max(m / 6, R(150, 5)), false);
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = 0.9;
      ctx.fillRect(cx - m * 0.42, cy - m * 0.14, m * 0.84, m * 0.28);
      ctx.restore();
      npLbl(ctx, "SOAKAWAY", cx, cy, m * 0.13);
      break;
    }
    case "fan": {
      ell(cx, cy, m / 2, m / 2);
      thin(0.6);
      for (let k = 0; k < 3; k++) {
        const a = (k * 2 * Math.PI) / 3;
        ctx.beginPath();
        ctx.ellipse(
          cx + Math.cos(a) * m * 0.2,
          cy + Math.sin(a) * m * 0.2,
          m * 0.18,
          m * 0.08,
          a,
          0,
          7,
        );
        ctx.stroke();
      }
      full();
      break;
    }
    case "fspur": {
      ctx.strokeRect(x0, y0, w, h);
      lbl("FS", 0.7);
      break;
    }
    case "ckr": {
      ctx.strokeRect(x0, y0, w, h);
      lbl("CS", 0.7);
      break;
    }
    case "olight": {
      ell(cx, cy, m * 0.32, m * 0.32);
      const k = m * 0.22;
      ln(cx - k, cy - k, cx + k, cy + k);
      ln(cx + k, cy - k, cx - k, cy + k);
      thin(0.5);
      for (let a = 0; a < 8; a++) {
        const an = (a * Math.PI) / 4;
        ln(
          cx + Math.cos(an) * m * 0.38,
          cy + Math.sin(an) * m * 0.38,
          cx + Math.cos(an) * m * 0.5,
          cy + Math.sin(an) * m * 0.5,
        );
      }
      full();
      break;
    }
    case "dlight": {
      ell(cx, cy, m / 2, m / 2);
      ell(cx, cy, m * 0.2, m * 0.2, true);
      break;
    }
    case "heat":
      circTxt("H");
      break;
    case "coal":
      circTxt("CO");
      break;
    case "stat":
      circTxt("T");
      break;
    /* ===== energy and wildlife ===== */
    case "solarpv": {
      /* an array of portrait panels about 1,134 × 1,722 mm (at real size when there is a scale) */
      const pw = R(1134, Math.max(h * 0.62, 12)),
        ph = R(1722, Math.max(h, 18)),
        nc = Math.max(1, Math.round(w / pw)),
        nr = Math.max(1, Math.round(h / ph));
      fillR(x0, y0, w, h, "#dbeafe");
      ctx.strokeRect(x0, y0, w, h);
      thin(0.5);
      for (let i = 1; i < nc; i++) ln(x0 + (w * i) / nc, y0, x0 + (w * i) / nc, y1);
      for (let j = 1; j < nr; j++) ln(x0, y0 + (h * j) / nr, x1, y0 + (h * j) / nr);
      /* cell lines in each panel */
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < nc; i++)
        for (let j = 0; j < nr; j++) {
          const cx0 = x0 + (w * i) / nc,
            cy0 = y0 + (h * j) / nr,
            cw = w / nc,
            ch = h / nr;
          for (let k = 1; k < 3; k++) ln(cx0 + (cw * k) / 3, cy0, cx0 + (cw * k) / 3, cy0 + ch);
          for (let k = 1; k < 6; k++) ln(cx0, cy0 + (ch * k) / 6, cx0 + cw, cy0 + (ch * k) / 6);
        }
      ctx.globalAlpha = 1;
      full();
      lbl("PV", 0.5);
      break;
    }
    case "battery": {
      ctx.strokeRect(x0, y0, w, h);
      thin(0.7);
      const bw = w * 0.5,
        bh = h * 0.28,
        bx = cx - bw / 2,
        by = y0 + h * 0.18;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.strokeRect(bx + bw, by + bh * 0.3, bw * 0.08, bh * 0.4);
      fillR(bx + bw * 0.08, by + bh * 0.15, bw * 0.55, bh * 0.7, "#86efac");
      full();
      npLbl(ctx, "BATTERY", cx, y0 + h * 0.72, Math.min(h * 0.14, w / 5.2));
      break;
    }
    case "inverter": {
      ctx.strokeRect(x0, y0, w, h);
      thin(0.7);
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const t = i / 24,
          x = x0 + w * 0.2 + w * 0.6 * t,
          y = y0 + h * 0.35 - Math.sin(t * Math.PI * 2) * h * 0.1;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
      full();
      npLbl(ctx, "INV", cx, y0 + h * 0.7, Math.min(h * 0.22, w / 2.6));
      break;
    }
    case "evcharger": {
      ctx.strokeRect(x0, y0, w, h);
      thin(0.7);
      ell(cx, y0 + h * 0.38, m * 0.22, m * 0.22);
      ln(cx - m * 0.08, y0 + h * 0.3, cx - m * 0.08, y0 + h * 0.38);
      ln(cx + m * 0.08, y0 + h * 0.3, cx + m * 0.08, y0 + h * 0.38);
      full();
      npLbl(ctx, "EV", cx, y0 + h * 0.78, Math.min(h * 0.2, w / 2.2));
      break;
    }
    case "beebrick": {
      fillR(x0, y0, w, h, "#fde68a");
      ctx.strokeRect(x0, y0, w, h);
      thin(0.6);
      const nx = Math.max(4, Math.round(w / (h * 0.35))),
        ny = 2;
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < ny; j++)
          ell(
            x0 + (w * (i + 0.5)) / nx,
            y0 + (h * (j + 0.5)) / ny,
            Math.min(w / nx, h / ny) * 0.22,
            Math.min(w / nx, h / ny) * 0.22,
          );
      full();
      break;
    }
    case "batbox": {
      ctx.strokeRect(x0, y0, w, h);
      thin(0.7);
      ln(x0 + w * 0.15, y1 - h * 0.12, x1 - w * 0.15, y1 - h * 0.12);
      full();
      lbl("BAT", 0.6);
      break;
    }
    case "birdbox": {
      ctx.strokeRect(x0, y0, w, h);
      thin(0.7);
      ell(cx, y0 + h * 0.3, m * 0.14, m * 0.14);
      full();
      npLbl(ctx, "BIRD", cx, y0 + h * 0.7, Math.min(h * 0.16, w / 3.2));
      break;
    }
    case "swiftbox": {
      ctx.strokeRect(x0, y0, w, h);
      thin(0.7);
      ell(x0 + w * 0.2, y1 - h * 0.28, w * 0.09, h * 0.14);
      full();
      npLbl(ctx, "SWIFT", x0 + w * 0.62, cy, Math.min(h * 0.32, w / 4.6));
      break;
    }
    case "tvp": {
      ctx.strokeRect(x0, y0, w, h);
      lbl("TV", 0.7);
      break;
    }
    case "towel": {
      ctx.strokeRect(x0, y0, w, h);
      thin(0.6);
      const n = Math.max(3, Math.round((v ? w : h) / (m * 0.4)));
      for (let k = 1; k < n; k++) {
        if (v) ln(x0 + (w * k) / n, y0, x0 + (w * k) / n, y1);
        else ln(x0, y0 + (h * k) / n, x1, y0 + (h * k) / n);
      }
      full();
      break;
    }
  }
}
function npBldLine(ctx, o, P, ln, L, lw) {
  if (!NP_BLD_LINE.has(o.k)) return false;
  const mm = ctx.__mm || 0;
  const R = (a, fb) => (mm ? a * mm : fb);
  const c = ctx.strokeStyle;
  const band = (d, fill, x) => {
    ctx.beginPath();
    [P(0, 0), P(L, 0), P(L, -d), P(0, -d)].forEach((p, i) =>
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]),
    );
    ctx.closePath();
    if (fill) {
      ctx.save();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.restore();
    }
    ctx.stroke();
    if (x) x();
  };
  switch (o.k) {
    case "rafter":
    case "joistl": {
      const d = R(o.k === "rafter" ? 150 : 200, Math.max(lw * 6, 14));
      band(d, "#f3e2c4");
      return true;
    }
    /* roof plan lines: hip, valley, ridge */
    case "hipl":
    case "valleyl":
    case "ridgel": {
      ctx.save();
      ctx.setLineDash(
        o.k === "ridgel" ? [lw * 10, lw * 3] : [lw * 8, lw * 2.5, lw * 1.5, lw * 2.5],
      );
      ln(P(0, 0), P(L, 0));
      ctx.setLineDash([]);
      const m = P(L / 2, -Math.max(10, lw * 5));
      npLbl(
        ctx,
        { hipl: "HIP", valleyl: "VALLEY", ridgel: "RIDGE" }[o.k],
        m[0],
        m[1],
        Math.max(8, lw * 3.2),
      );
      ctx.restore();
      return true;
    }
    /* roof section timbers */
    case "collar":
    case "strut":
    case "cjoist": {
      const d = R(o.k === "cjoist" ? 150 : 100, Math.max(lw * 5, 12));
      band(d, "#f3e2c4");
      return true;
    }
    case "rooftile": {
      const t = R(265, Math.max(lw * 8, 18)),
        d = R(25, Math.max(lw * 1.5, 3));
      ctx.save();
      ctx.lineWidth = Math.max(lw * 0.8, 0.6);
      for (let x = 0; x < L; x += t * 0.4) {
        const a = P(x, -d),
          b = P(Math.min(L, x + t), -d * 2.2);
        ln(a, b);
      }
      ctx.restore();
      return true;
    }
    case "batfelt": {
      ctx.save();
      ctx.setLineDash([lw * 3, lw * 2]);
      ln(P(0, 0), P(L, 0));
      ctx.restore();
      const st = R(250, Math.max(lw * 8, 16)),
        bw = R(50, Math.max(lw * 2, 4)),
        bh = R(25, Math.max(lw * 1.4, 3));
      for (let x = st / 2; x < L - bw; x += st) {
        const a = P(x, 0),
          b = P(x + bw, 0),
          c2 = P(x + bw, -bh),
          d = P(x, -bh);
        ctx.beginPath();
        [a, b, c2, d].forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.save();
        ctx.fillStyle = "#f3e2c4";
        ctx.fill();
        ctx.restore();
        ctx.stroke();
      }
      return true;
    }
    case "lead": {
      ctx.save();
      ctx.strokeStyle = "#4b5563";
      ctx.lineWidth = lw * 1.8;
      ln(P(0, 0), P(L, 0));
      ctx.restore();
      return true;
    }
    case "pboard": {
      const d = R(12.5, Math.max(lw * 1.5, 3));
      band(d, "#ffffff");
      return true;
    }
    case "renderl": {
      const d = R(20, Math.max(lw * 2, 4));
      band(d, "#f1f1f1", () => {
        ctx.save();
        ctx.fillStyle = c;
        const st = Math.max(d * 0.8, 3);
        for (let x = st / 2; x < L; x += st) {
          const p = P(x, -d / 2);
          ctx.beginPath();
          ctx.arc(p[0], p[1], Math.max(lw * 0.25, 0.35), 0, 7);
          ctx.fill();
        }
        ctx.restore();
      });
      return true;
    }
    case "cladsec": {
      const bt = R(25, Math.max(lw * 2, 4)),
        ba = R(38, Math.max(lw * 2.5, 5)),
        st = R(150, Math.max(lw * 8, 16));
      ctx.save();
      ctx.lineWidth = Math.max(lw * 0.6, 0.5);
      const bs = R(400, Math.max(lw * 14, 30));
      for (let x = bs / 2; x < L; x += bs) {
        const a = P(x, 0),
          b = P(x, -ba);
        ln(a, b);
      }
      for (let x = 0; x < L; x += st) {
        ln(P(x, -ba), P(Math.min(L, x + st), -ba - bt));
      }
      ln(P(0, -ba), P(L, -ba));
      ctx.restore();
      return true;
    }
    case "ctray": {
      const s = Math.max(lw * 4, R(75, 8));
      ctx.beginPath();
      const pts = [P(0, 0), P(L * 0.35, 0), P(L * 0.5, -s), P(L, -s)];
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
      return true;
    }
    case "foul":
    case "storm": {
      ctx.save();
      ctx.strokeStyle = o.k === "foul" ? "#b45309" : "#2563eb";
      ctx.setLineDash(o.k === "foul" ? [lw * 6, lw * 2, lw * 1.5, lw * 2] : [lw * 5, lw * 3]);
      ln(P(0, 0), P(L, 0));
      ctx.setLineDash([]);
      const hh = Math.max(10, lw * 4),
        e = P(L, 0),
        an = Math.atan2(e[1] - P(0, 0)[1], e[0] - P(0, 0)[0]),
        m = P(L / 2, 0);
      ln(m, [m[0] - hh * Math.cos(an - 0.45), m[1] - hh * Math.sin(an - 0.45)]);
      ln(m, [m[0] - hh * Math.cos(an + 0.45), m[1] - hh * Math.sin(an + 0.45)]);
      {
        const tag = o.k === "foul" ? "FW" : "SW",
          r = Math.max(8, lw * 3.6),
          step = Math.max(R(3000, 160), lw * 36);
        for (let t = Math.min(step / 2, L * 0.25); t < L; t += step) {
          if (Math.abs(t - L / 2) < r * 2.5) continue;
          const q = P(t, 0);
          ctx.beginPath();
          ctx.arc(q[0], q[1], r, 0, 7);
          ctx.fillStyle = "#fff";
          ctx.fill();
          ctx.lineWidth = Math.max(lw * 0.8, 0.8);
          ctx.stroke();
          ctx.fillStyle = ctx.strokeStyle;
          ctx.font = `700 ${r * 0.95}px system-ui,sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(tag, q[0], q[1] + r * 0.05);
        }
      }
      ctx.restore();
      return true;
    }
    case "ch8": {
      const th = Math.max(R(150, 8), lw * 3),
        seg = Math.max(R(500, th * 3), th * 2);
      const quad = (t1, t2, f) => {
        ctx.beginPath();
        [P(t1, -th / 2), P(t2, -th / 2), P(t2, th / 2), P(t1, th / 2)].forEach((p, i) =>
          i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]),
        );
        ctx.closePath();
        ctx.save();
        ctx.fillStyle = f;
        ctx.fill();
        ctx.restore();
      };
      let k = 0;
      for (let t = 0; t < L; t += seg, k++)
        quad(t, Math.min(L, t + seg), k % 2 ? "#ffffff" : "#dc2626");
      ctx.save();
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = Math.max(lw * 0.6, 0.6);
      ctx.beginPath();
      [P(0, -th / 2), P(L, -th / 2), P(L, th / 2), P(0, th / 2)].forEach((p, i) =>
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]),
      );
      ctx.closePath();
      ctx.stroke();
      const pan = R(2000, seg * 4);
      for (let t = 0; t <= L + 1; t += pan) {
        const q = P(Math.min(t, L), 0),
          f = th * 0.9;
        ctx.fillStyle = "#1f1a1a";
        ctx.fillRect(q[0] - f / 2, q[1] - f / 2, f, f);
      }
      ctx.restore();
      return true;
    }
    case "heras":
    case "herasgate": {
      const pan = R(3500, Math.max(L / 4, 40));
      const fw = Math.max(R(200, 7), lw * 2.5),
        fd = Math.max(R(600, 14), lw * 5);
      ctx.save();
      ctx.lineWidth = Math.max(lw * 1.1, 0.9);
      if (o.k === "heras") {
        ln(P(0, 0), P(L, 0));
        ctx.lineWidth = Math.max(lw * 0.4, 0.4);
        const mh = Math.max(R(60, 3), lw);
        ln(P(0, -mh), P(L, -mh));
        ln(P(0, mh), P(L, mh));
        for (let t = 0; t <= L + 1; t += pan) {
          const tt = Math.min(t, L);
          ctx.lineWidth = Math.max(lw * 0.7, 0.6);
          ctx.beginPath();
          [
            P(tt - fw / 2, -fd / 2),
            P(tt + fw / 2, -fd / 2),
            P(tt + fw / 2, fd / 2),
            P(tt - fw / 2, fd / 2),
          ].forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          ctx.closePath();
          ctx.save();
          ctx.fillStyle = "#9ca3af";
          ctx.fill();
          ctx.restore();
          ctx.stroke();
        }
        const m = P(L / 2, -fd * 0.9);
        npLbl(ctx, "HERAS", m[0], m[1], Math.max(8, Math.min(fd * 0.8, L / 10)));
      } else {
        [0, L].forEach((tt) => {
          ctx.beginPath();
          [
            P(tt - fw / 2, -fd / 2),
            P(tt + fw / 2, -fd / 2),
            P(tt + fw / 2, fd / 2),
            P(tt - fw / 2, fd / 2),
          ].forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          ctx.closePath();
          ctx.save();
          ctx.fillStyle = "#9ca3af";
          ctx.fill();
          ctx.restore();
          ctx.stroke();
        });
        ctx.lineWidth = Math.max(lw * 1.4, 1);
        ln(P(fw / 2, 0), P(L - fw / 2, 0));
        ctx.setLineDash([lw * 3, lw * 2]);
        ctx.lineWidth = Math.max(lw * 0.6, 0.6);
        const n = 24;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const a = ((i / n) * Math.PI) / 2;
          const q = P(Math.cos(a) * (L - fw / 2), Math.sin(a) * (L - fw / 2));
          i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        const m = P(L / 2, -fd * 0.9);
        npLbl(ctx, "GATE", m[0], m[1], Math.max(8, Math.min(fd * 0.8, L / 6)));
      }
      ctx.restore();
      return true;
    }
    case "contour":
    case "bndry":
    case "redline":
    case "hedgerem":
    case "fencerem":
    case "swale":
    case "easement":
    case "treefence":
    case "walkway":
    case "lintelp":
    case "steelub":
    case "movjoint":
    case "firewall":
    case "kerb":
    case "kerbdrop":
    case "kerbflush":
    case "retweep":
    case "gabion":
    case "secline":
    case "matchline": {
      const k = o.k;
      const lab = (t, off, col, f) => {
        const q = P(L / 2, off);
        const a = P(0, 0),
          b = P(L, 0);
        let an = Math.atan2(b[1] - a[1], b[0] - a[0]);
        if (an > Math.PI / 2 || an < -Math.PI / 2) an += Math.PI;
        const fz = f || Math.max(9, R(200, lw * 4.5));
        ctx.save();
        ctx.translate(q[0], q[1]);
        ctx.rotate(an);
        ctx.font = `600 ${fz}px system-ui,sans-serif`;
        const tw = ctx.measureText(t).width;
        ctx.fillStyle = "#fff";
        ctx.fillRect(-tw / 2 - fz * 0.25, -fz * 0.6, tw + fz * 0.5, fz * 1.2);
        ctx.fillStyle = col || c;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(t, 0, 0);
        ctx.restore();
      };
      const dsh = (d, col, wd, off) => {
        ctx.save();
        if (col) ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(lw * (wd || 1), 0.6);
        ctx.setLineDash(d || []);
        ln(P(0, off || 0), P(L, off || 0));
        ctx.restore();
      };
      const ticks = (st, len, col, fn) => {
        ctx.save();
        if (col) ctx.strokeStyle = col;
        for (let t = st / 2; t < L; t += st) fn ? fn(t) : ln(P(t, -len), P(t, len));
        ctx.restore();
      };
      const T2 = Math.max(R(150, 6), lw * 3);
      if (k === "contour") {
        dsh([], "#8b5a2b", 0.6);
        lab(o.lab || "135.00", "", "#8b5a2b");
      } else if (k === "bndry") {
        dsh([lw * 12, lw * 3, lw * 2, lw * 3], null, 1.2);
      } else if (k === "redline") {
        dsh([], "#dc2626", 2.6);
      } else if (k === "hedgerem" || k === "fencerem") {
        dsh(k === "fencerem" ? [lw * 5, lw * 3] : [], "#9ca3af", 1);
        ticks(Math.max(R(1000, 40), lw * 14), T2, "#dc2626", (t) => {
          const a = P(t - T2, -T2),
            b = P(t + T2, T2),
            a2 = P(t - T2, T2),
            b2 = P(t + T2, -T2);
          ctx.lineWidth = Math.max(lw * 1.3, 1);
          ln(a, b);
          ln(a2, b2);
        });
        lab(k === "hedgerem" ? "HEDGE TO BE REMOVED" : "FENCE TO BE REMOVED", -T2 * 2.5, "#dc2626");
      } else if (k === "swale") {
        const W2 = Math.max(R(1000, 20), lw * 8);
        dsh([lw * 5, lw * 3], "#0e7490", 0.8, W2);
        dsh([lw * 5, lw * 3], "#0e7490", 0.8, -W2);
        dsh([], "#0e7490", 1.2);
        ticks(Math.max(R(1500, 50), lw * 16), 0, "#0e7490", (t) => {
          const a = P(t, 0),
            b = P(t + T2 * 1.5, 0);
          ln(a, b);
          ln(b, P(t + T2 * 0.8, T2 * 0.6));
          ln(b, P(t + T2 * 0.8, -T2 * 0.6));
        });
        lab("SWALE", W2 + T2 * 1.5, "#0e7490");
      } else if (k === "easement") {
        const W2 = Math.max(R(1500, 24), lw * 10);
        dsh([lw * 6, lw * 4], null, 0.8, W2);
        dsh([lw * 6, lw * 4], null, 0.8, -W2);
        dsh([lw * 2, lw * 3], null, 0.5);
        lab(o.lab || "EASEMENT", 0);
      } else if (k === "treefence") {
        dsh([], "#15803d", 1.4);
        ticks(Math.max(R(2000, 50), lw * 18), T2 * 1.2, "#15803d");
        lab("TREE PROTECTION FENCING", -T2 * 2.6, "#15803d");
      } else if (k === "walkway") {
        const W2 = Math.max(R(600, 12), lw * 5);
        dsh([lw * 6, lw * 3], "#16a34a", 1.2, W2);
        dsh([lw * 6, lw * 3], "#16a34a", 1.2, -W2);
        lab("PEDESTRIAN WALKWAY", 0, "#16a34a");
      } else if (k === "lintelp") {
        const W2 = Math.max(R(110, 4), lw * 2);
        dsh([lw * 4, lw * 2], null, 0.8, W2);
        dsh([lw * 4, lw * 2], null, 0.8, -W2);
        lab("LINTEL", W2 + T2 * 1.8);
      } else if (k === "steelub") {
        dsh([], null, 2.4);
        dsh([lw * 8, lw * 3, lw * 2, lw * 3], null, 0.6, Math.max(R(70, 4), lw * 2));
        lab(o.lab || "203×133 UB", -T2 * 2.2);
      } else if (k === "movjoint") {
        const W2 = Math.max(R(20, 2), lw);
        dsh([], null, 0.7, W2);
        dsh([], null, 0.7, -W2);
        lab("MJ", -T2 * 2);
      } else if (k === "firewall") {
        const W2 = Math.max(R(100, 6), lw * 3);
        dsh([], "#dc2626", 0.9, W2);
        dsh([], "#dc2626", 0.9, -W2);
        ticks(Math.max(R(150, 6), lw * 3), 0, "#dc2626", (t) => ln(P(t - W2, -W2), P(t + W2, W2)));
        lab("FIRE-RATED WALL", W2 + T2 * 1.8, "#dc2626");
      } else if (k === "kerb" || k === "kerbdrop" || k === "kerbflush") {
        const W2 = Math.max(R(62, 3), lw * 1.6);
        dsh([], null, 1, W2);
        dsh(k === "kerbflush" ? [lw * 3, lw * 2] : [], null, 1, -W2);
        ticks(Math.max(R(914, 20), lw * 9), W2, null);
        if (k !== "kerb") lab(k === "kerbdrop" ? "DROPPED KERB" : "FLUSH KERB", W2 + T2 * 1.8);
      } else if (k === "retweep") {
        const W2 = Math.max(R(150, 6), lw * 3);
        dsh([], null, 1.2, W2);
        dsh([], null, 1.2, -W2);
        ctx.save();
        ctx.fillStyle = c;
        for (
          let t = Math.max(R(1000, 20), lw * 10) / 2;
          t < L;
          t += Math.max(R(1000, 20), lw * 10)
        ) {
          const q = P(t, 0);
          ctx.beginPath();
          ctx.arc(q[0], q[1], W2 * 0.45, 0, 7);
          ctx.fill();
        }
        ctx.restore();
        lab("RETAINING WALL · WEEP HOLES", W2 + T2 * 1.8);
      } else if (k === "gabion") {
        const W2 = Math.max(R(250, 8), lw * 4);
        dsh([], null, 1.2, W2);
        dsh([], null, 1.2, -W2);
        ticks(W2 * 2, 0, null, (t) => {
          ln(P(t - W2, -W2), P(t + W2, W2));
          ln(P(t - W2, W2), P(t + W2, -W2));
        });
        lab("GABION", W2 + T2 * 1.8);
      } else if (k === "secline") {
        const tl = Math.min(L * 0.15, Math.max(R(800, 24), lw * 10));
        ctx.save();
        ctx.lineWidth = Math.max(lw * 2, 1);
        ln(P(0, 0), P(tl, 0));
        ln(P(L - tl, 0), P(L, 0));
        ctx.restore();
        dsh([lw * 8, lw * 3, lw * 2, lw * 3], null, 0.6);
        const ah = Math.max(R(500, 16), lw * 7);
        [0, L].forEach((t) => {
          const b = P(t, -ah),
            a = P(t, 0);
          ctx.save();
          ctx.lineWidth = Math.max(lw * 1.5, 1);
          ln(a, b);
          ln(b, P(t - ah * 0.3, -ah * 0.6));
          ln(b, P(t + ah * 0.3, -ah * 0.6));
          ctx.restore();
          const q = P(t, ah * 0.8);
          npLbl(ctx, o.lab || "A", q[0], q[1], ah * 0.8);
        });
      } else if (k === "matchline") {
        dsh([lw * 12, lw * 3, lw * 2, lw * 3], null, 2);
        lab("MATCH LINE", -T2 * 2.5);
      }
      return true;
    }
    case "ductsup":
    case "ductext": {
      const col = o.k === "ductsup" ? "#2563eb" : "#dc2626";
      const W2 = Math.max(R(75, 4), lw * 2);
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(lw * 0.9, 0.6);
      ln(P(0, W2), P(L, W2));
      ln(P(0, -W2), P(L, -W2));
      const st = Math.max(R(1200, 40), lw * 14);
      for (let t = st / 2; t < L; t += st) {
        const a = P(t - W2, 0),
          b = P(t + W2, 0);
        ln(a, b);
        ln(b, P(t, W2 * 0.7));
        ln(b, P(t, -W2 * 0.7));
      }
      ctx.restore();
      return true;
    }
    case "lvlline": {
      ctx.save();
      ctx.lineWidth = Math.max(lw * 0.7, 0.6);
      ln(P(0, 0), P(L, 0));
      const t = o.lab || "0.000";
      const f = Math.max(9, R(220, lw * 5));
      const q = P(Math.min(L * 0.5, L - f * 3), 0);
      const a = P(0, 0),
        b = P(L, 0);
      let an = Math.atan2(b[1] - a[1], b[0] - a[0]);
      if (an > Math.PI / 2 || an < -Math.PI / 2) an += Math.PI;
      ctx.translate(q[0], q[1]);
      ctx.rotate(an);
      ctx.font = `600 ${f}px system-ui,sans-serif`;
      const tw = ctx.measureText(t).width;
      ctx.fillStyle = "#fff";
      ctx.fillRect(-tw / 2 - f * 0.3, -f * 0.65, tw + f * 0.6, f * 1.3);
      ctx.fillStyle = c;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t, 0, 0);
      ctx.restore();
      return true;
    }
    case "embank": {
      ln(P(0, 0), P(L, 0));
      const st = Math.max(R(500, 16), lw * 7);
      let k = 0;
      for (let t = st / 2; t < L; t += st / 2, k++) {
        const len = k % 2 ? Math.max(R(600, 14), lw * 6) : Math.max(R(1500, 30), lw * 14);
        ln(P(t, 0), P(t, len));
      }
      return true;
    }
    case "landdrain": {
      ctx.save();
      ctx.strokeStyle = "#0e7490";
      ctx.lineWidth = Math.max(lw * 1.3, 1);
      ctx.setLineDash([lw * 6, lw * 2.5]);
      ln(P(0, 0), P(L, 0));
      ctx.setLineDash([]);
      const st = Math.max(R(400, 24), lw * 8);
      ctx.fillStyle = "#0e7490";
      for (let t = st / 2; t < L; t += st) {
        const q = P(t, Math.max(4, lw * 2.2)),
          q2 = P(t, -Math.max(4, lw * 2.2));
        [q, q2].forEach((z) => {
          ctx.beginPath();
          ctx.arc(z[0], z[1], Math.max(1.2, lw * 0.6), 0, 7);
          ctx.fill();
        });
      }
      const m = P(L / 2, Math.max(12, lw * 6));
      npLbl(ctx, "PERFORATED LAND DRAIN", m[0], m[1], Math.max(8, lw * 3.2));
      ctx.restore();
      return true;
    }
    case "uelec":
    case "uwater":
    case "ugas":
    case "ubt":
    case "fibre":
    case "ohl":
    case "ohbt": {
      const col = {
          uelec: "#dc2626",
          uwater: "#2563eb",
          ugas: "#d4a106",
          ubt: "#7c3aed",
          fibre: "#ea580c",
          ohl: "#dc2626",
          ohbt: "#7c3aed",
        }[o.k],
        let1 = { uelec: "E", uwater: "W", ugas: "G", ubt: "T", fibre: "F", ohl: "OH", ohbt: "OT" }[
          o.k
        ];
      const over = o.k === "ohl" || o.k === "ohbt";
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(lw * 1.4, 1);
      ctx.setLineDash(
        over
          ? [lw * 10, lw * 2.5, lw * 1.5, lw * 2.5]
          : o.k === "fibre"
            ? [lw * 3, lw * 2]
            : [lw * 7, lw * 3],
      );
      ln(P(0, 0), P(L, 0));
      ctx.setLineDash([]);
      if (over) {
        const m = P(L / 2, -Math.max(12, lw * 6));
        npLbl(
          ctx,
          o.k === "ohl" ? "OVERHEAD POWER LINE" : "OVERHEAD TELECOMS LINE",
          m[0],
          m[1],
          Math.max(8, lw * 3.2),
        );
      }
      const step = Math.max(R(2000, 120), lw * 30);
      const r = Math.max(7, lw * 3.2);
      for (let t = Math.min(step / 2, L / 2); t < L; t += step) {
        const q = P(t, 0);
        ctx.beginPath();
        ctx.arc(q[0], q[1], r, 0, 7);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.lineWidth = Math.max(lw * 0.8, 0.8);
        ctx.stroke();
        ctx.fillStyle = col;
        ctx.font = `700 ${r * 1.3}px system-ui,sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(let1, q[0], q[1] + r * 0.05);
      }
      ctx.restore();
      return true;
    }
    case "fall": {
      ln(P(0, 0), P(L, 0));
      const e = P(L, 0),
        s0 = P(0, 0),
        an = Math.atan2(e[1] - s0[1], e[0] - s0[0]),
        hh = Math.max(10, lw * 4);
      ln(e, [e[0] - hh * Math.cos(an - 0.45), e[1] - hh * Math.sin(an - 0.45)]);
      ln(e, [e[0] - hh * Math.cos(an + 0.45), e[1] - hh * Math.sin(an + 0.45)]);
      const m = P(L / 2, Math.max(10, lw * 4));
      npLbl(ctx, "FALL", m[0], m[1], Math.max(10, lw * 4));
      return true;
    }
  }
  return false;
}

/* the symbol library for the full design tool, sorted into small groups */
const NP_LIB = [
  [
    "plan",
    "Shapes",
    ["tri", "rtri", "diamond", "hex", "star", "fillrect", "fillcirc", "arc", "cross", "cloud"],
  ],
  [
    "plan",
    "Walls & structure",
    ["wall", "dline", "stud", "tstud", "cavity", "beam", "column", "chimney"],
  ],
  [
    "plan",
    "Doors & windows",
    ["door", "door2", "sdoor", "bifold", "opening", "window", "rooflight", "lantern"],
  ],
  ["plan", "Stairs", ["stairs", "stairsl", "stairsu", "spiral", "gsteps"]],
  [
    "plan",
    "Kitchen & bathroom",
    ["units", "sink", "hob", "fridge", "wm", "island", "wc", "basin", "bath", "shower", "towel"],
  ],
  ["plan", "Furniture", ["dbed", "sbed", "sofa", "table", "wardrobe", "desk"]],
  [
    "plan",
    "Electrics",
    [
      "socket",
      "switch",
      "light",
      "dlight",
      "olight",
      "fspur",
      "ckr",
      "tvp",
      "cu",
      "smoke",
      "heat",
      "coal",
    ],
  ],
  ["plan", "Heating & ventilation", ["rad", "boiler", "cyl", "stat", "fan"]],
  [
    "plan",
    "Drainage & water",
    [
      "mh",
      "ic",
      "gully",
      "re",
      "svp",
      "rwp",
      "aav",
      "soakaway",
      "pipe",
      "foul",
      "storm",
      "uwater",
      "stopcock",
      "tap",
    ],
  ],
  ["plan", "Floors", ["bblay", "jlay", "jtrim", "jstrap"]],
  ["plan", "Timber framing", ["tstud", "jlay", "rlay", "tlay", "jtrim", "jstrap"]],
  ["plan", "Stud wall connections", ["sdT3", "sdTlad", "sdTbk", "sdL3", "sdLcal", "sdLblk"]],
  [
    "plan",
    "Roof plan",
    [
      "roofhip",
      "roofgable",
      "ridgel",
      "hipl",
      "valleyl",
      "rlay",
      "tlay",
      "fall",
      "rooflight",
      "lantern",
      "solarpv",
    ],
  ],
  ["plan", "Energy", ["solarpv", "battery", "inverter", "evcharger"]],
  [
    "plan",
    "Site set-up",
    [
      "container",
      "siteoffice",
      "portaloo",
      "canteen",
      "dryroom",
      "elecpoint",
      "uelec",
      "stopcock",
      "uwater",
      "gaspoint",
      "ugas",
      "foul",
      "storm",
      "fireassembly",
      "firepoint",
      "fireext",
      "heras",
      "herasgate",
      "ch8",
      "fence",
      "gate",
      "bins",
      "parking",
      "car",
    ],
  ],
  ["plan", "Garden buildings", ["shed", "gardenroom", "gardenoffice", "studio", "sauna"]],
  [
    "plan",
    "Landscaping",
    [
      "patio",
      "blockpave",
      "decking",
      "lawn",
      "gravel",
      "planting",
      "shrub",
      "tree",
      "hedge",
      "path",
      "retwall",
      "fence",
      "gate",
      "pond",
      "shed",
      "car",
      "parking",
      "bins",
      "north",
    ],
  ],
  [
    "elev",
    "Walls side on",
    ["ewCav", "ewBrick", "ewSolid", "ewStud", "ewBlock", "ewBrk", "eframe", "wall", "cavity"],
  ],
  [
    "elev",
    "Windows & doors",
    ["ewin", "edoor", "efrench", "ebifold", "egarage", "eroofl", "elant"],
  ],
  ["elev", "Roofs", ["eroof", "elean", "etile", "echim", "edp", "egutter"]],
  [
    "elev",
    "Walls, cladding & render",
    [
      "ebrick",
      "erender",
      "eclad",
      "evclad",
      "epanel",
      "etilehang",
      "estone",
      "esoldier",
      "airbrick",
    ],
  ],
  [
    "elev",
    "Energy & wildlife",
    ["solarpv", "evcharger", "beebrick", "batbox", "birdbox", "swiftbox"],
  ],
  [
    "elev",
    "Section: roof",
    [
      "truss",
      "cutroof",
      "rafter",
      "joistl",
      "cjoist",
      "collar",
      "strut",
      "rooftile",
      "batfelt",
      "lead",
      "wplate",
      "ridgeb",
      "purlin",
      "eaves",
      "flatroof",
      "einsul",
      "pboard",
      "ibeam",
      "timber",
    ],
  ],
  [
    "elev",
    "Section: walls & floors",
    [
      "eframe",
      "renderl",
      "cladsec",
      "lintel",
      "padstone",
      "ctray",
      "weep",
      "wtie",
      "closer",
      "bblock",
      "gslab",
      "tfloor",
      "screed",
      "breather",
      "dpcl",
      "dpm",
      "vcl",
    ],
  ],
  [
    "elev",
    "Stud wall framing",
    [
      "eframe",
      "sfPlain",
      "sfDoor",
      "sfWin",
      "sfBrace",
      "sfBlock",
      "sfPlat",
      "shFull",
      "shIns",
      "shVert",
      "shSingle",
    ],
  ],
  [
    "elev",
    "Ground floor & floor details",
    ["gfSlab", "gfBB", "gfTimber", "jhanger", "gslab", "bblock", "tfloor"],
  ],
  [
    "elev",
    "Foundations & ground",
    [
      "fdnsec",
      "rwsBlock",
      "rwsSleeper",
      "rwsGabion",
      "ewBlock",
      "ewBrk",
      "fdn",
      "trenchfill",
      "econc",
      "ehard",
      "eground",
      "egroundfill",
      "edpc",
      "elevel",
    ],
  ],
  ["elev", "Stairs", ["estairs"]],
  ["elev", "Garden & scale", ["efence", "egate", "ehedge", "etree", "eperson"]],
  [
    "both",
    "Notes & details",
    [
      "legend",
      "secmark",
      "tagbox",
      "tagcirc",
      "viewtitle",
      "scalebar",
      "joists",
      "hidden",
      "centre",
    ],
  ],
];
