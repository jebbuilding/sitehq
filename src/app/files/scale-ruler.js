/* ================= SCALE RULER for drawings in the file viewer ================= */
import { $, esc, store, toast } from "../core/helpers.js";
import { FV, fvHostAt } from "./in-app-files.js";
export {
  FVM,
  fvmClick,
  fvmDetectScale,
  fvmDraw,
  fvmHover,
  fvmLoad,
  fvmToggle,
  fvmVec,
  initScaleRuler,
};
const FVM = { on: false, a: null, list: [], cal: null, calMode: false, pend: null };
const FVM_SCALES = [1, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 1250, 2500];
function fvmKey() {
  return "jeb.fvm." + (FV.id || "");
}
function fvmLoad() {
  FVM.hist = [];
  FVM.fut = [];
  FVM.sel = null;
  FVM.snap = store.get("jeb.fvmsnap", true);
  FVM.vsnap = store.get("jeb.fvmvsnap", true);
  FVM.detected = null;
  const st = store.get(fvmKey(), null) || {};
  FVM.cal = st.cal || null;
  FVM.den = st.den || 50;
  FVM.pk = st.pk || 1;
  FVM.pkNote = st.pkNote || "";
  FVM.chosen = !!st.chosen;
  FVM.list = [];
  FVM.a = null;
  FVM.calMode = false;
}
function fvmSave() {
  store.set(fvmKey(), {
    cal: FVM.cal,
    den: FVM.den,
    pk: FVM.pk,
    pkNote: FVM.pkNote,
    chosen: FVM.chosen,
  });
}
function fvmTarget(el) {
  const pg = el.closest(".fvpage");
  if (pg) return { el: pg, kind: "pdf", page: +pg.dataset.p };
  const ib = el.closest(".fvimgbox");
  if (ib) return { el: ib, kind: "img", page: 0 };
  return null;
}
function fvmUnits(t, fa, fb) {
  // distance in base units (PDF points, or image natural px)
  if (t.kind === "pdf") {
    const p = FV.pages[t.page - 1];
    const W = p.ptsW || 595,
      H = W * p.ratio;
    return Math.hypot((fb[0] - fa[0]) * W, (fb[1] - fa[1]) * H);
  }
  const im = $("fv-img");
  return Math.hypot((fb[0] - fa[0]) * im.naturalWidth, (fb[1] - fa[1]) * im.naturalHeight);
}
function fvmReal(t, units) {
  // returns mm or null
  if (FVM.cal && FVM.cal.kind === t.kind) return units * FVM.cal.mmPerUnit;
  if (t.kind === "pdf") return ((units * 25.4) / 72) * FVM.den * (FVM.pk || 1);
  return null;
}
const fvmFmt = (mm) => Math.round(mm).toLocaleString("en-GB") + " mm";
/* ---- Vector snapping: read the drawing's own lines so measurements land exactly on corners, ends and edges ---- */
function fvmMul(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}
function fvmVec(i) {
  const p = FV.pages[i - 1];
  if (!p || !p.page) return Promise.resolve(null);
  if (p.vecP) return p.vecP;
  p.vecP = (async () => {
    try {
      const ol = await p.page.getOperatorList();
      const O = window.pdfjsLib.OPS;
      const segs = [],
        ends = [];
      let ctm = [1, 0, 0, 1, 0, 0];
      const st = [];
      const base = p.vt;
      const MAX = 400000;
      const tp = (x, y) => {
        const m = fvmMul(base, ctm);
        return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
      };
      for (let k = 0; k < ol.fnArray.length && segs.length < MAX * 4; k++) {
        const fn = ol.fnArray[k],
          a = ol.argsArray[k];
        if (fn === O.save) st.push(ctm);
        else if (fn === O.restore) ctm = st.pop() || ctm;
        else if (fn === O.transform) ctm = fvmMul(ctm, a);
        else if (fn === O.paintFormXObjectBegin) {
          st.push(ctm);
          if (a && a[0]) ctm = fvmMul(ctm, a[0]);
        } else if (fn === O.paintFormXObjectEnd) ctm = st.pop() || ctm;
        else if (fn === O.constructPath) {
          const ops = a[0],
            c = a[1];
          let j = 0,
            cur = null,
            start = null;
          for (const op of ops) {
            if (op === O.moveTo) {
              cur = tp(c[j], c[j + 1]);
              start = cur;
              j += 2;
              ends.push(cur);
            } else if (op === O.lineTo) {
              const q = tp(c[j], c[j + 1]);
              j += 2;
              if (cur) {
                segs.push(cur[0], cur[1], q[0], q[1]);
              }
              ends.push(q);
              cur = q;
            } else if (op === O.curveTo) {
              const q = tp(c[j + 4], c[j + 5]);
              j += 6;
              ends.push(q);
              cur = q;
            } else if (op === O.curveTo2 || op === O.curveTo3) {
              const q = tp(c[j + 2], c[j + 3]);
              j += 4;
              ends.push(q);
              cur = q;
            } else if (op === O.closePath) {
              if (cur && start && (cur[0] !== start[0] || cur[1] !== start[1]))
                segs.push(cur[0], cur[1], start[0], start[1]);
              cur = start;
            } else if (op === O.rectangle) {
              const x = c[j],
                y = c[j + 1],
                w = c[j + 2],
                h = c[j + 3];
              j += 4;
              const P = [tp(x, y), tp(x + w, y), tp(x + w, y + h), tp(x, y + h)];
              for (let q = 0; q < 4; q++) {
                const A = P[q],
                  B = P[(q + 1) % 4];
                segs.push(A[0], A[1], B[0], B[1]);
                ends.push(A);
              }
              cur = start = P[0];
            }
          }
        }
      }
      const S = new Float32Array(segs),
        C = 12,
        grid = new Map();
      const add = (cx, cy, v) => {
        const key = cx * 65536 + cy;
        let l = grid.get(key);
        if (!l) {
          l = [];
          grid.set(key, l);
        }
        l.push(v);
      };
      for (let s = 0; s < S.length / 4; s++) {
        const x1 = S[s * 4],
          y1 = S[s * 4 + 1],
          x2 = S[s * 4 + 2],
          y2 = S[s * 4 + 3];
        const L = Math.hypot(x2 - x1, y2 - y1);
        if (L < 0.05) continue;
        const n = Math.ceil(L / (C / 2)) + 1;
        let last = -1;
        for (let q = 0; q <= n; q++) {
          const t = q / n;
          const cx = Math.floor((x1 + (x2 - x1) * t) / C),
            cy = Math.floor((y1 + (y2 - y1) * t) / C);
          const key = cx * 65536 + cy;
          if (key !== last) {
            add(cx, cy, s);
            last = key;
          }
        }
      }
      const eg = new Map();
      ends.forEach((e) => {
        const key = Math.floor(e[0] / C) * 65536 + Math.floor(e[1] / C);
        let l = eg.get(key);
        if (!l) {
          l = [];
          eg.set(key, l);
        }
        l.push(e);
      });
      p.vec = { S, C, grid, eg, n: S.length / 4 };
      return p.vec;
    } catch (e) {
      return null;
    }
  })();
  return p.vecP;
}
function fvmVSnap(key, f, pxR) {
  // f = page fraction; returns {f,kind} or null
  if (FVM.vsnap === false || key === "img") return null;
  const p = FV.pages[+key - 1];
  if (!p || !p.vec) {
    if (p && p.page) fvmVec(+key);
    return null;
  }
  const V = p.vec,
    W = p.ptsW,
    H = p.ptsH;
  const host = fvmHost(key);
  if (!host) return null;
  const cssPerPt = host.clientWidth / W;
  const R = (pxR || 14) / cssPerPt;
  const x = f[0] * W,
    y = f[1] * H,
    C = V.C;
  const cx0 = Math.floor((x - R) / C),
    cx1 = Math.floor((x + R) / C),
    cy0 = Math.floor((y - R) / C),
    cy1 = Math.floor((y + R) / C);
  const segIds = new Set(),
    cand = [];
  for (let cx = cx0; cx <= cx1; cx++)
    for (let cy = cy0; cy <= cy1; cy++) {
      const key2 = cx * 65536 + cy;
      (V.grid.get(key2) || []).forEach((s) => segIds.add(s));
      (V.eg.get(key2) || []).forEach((e) => {
        const d = Math.hypot(e[0] - x, e[1] - y);
        if (d <= R) cand.push({ x: e[0], y: e[1], d, kind: "end" });
      });
    }
  const ids = [...segIds].slice(0, 250),
    S = V.S;
  ids.forEach((s) => {
    [
      [S[s * 4], S[s * 4 + 1]],
      [S[s * 4 + 2], S[s * 4 + 3]],
    ].forEach((e) => {
      const d = Math.hypot(e[0] - x, e[1] - y);
      if (d <= R) cand.push({ x: e[0], y: e[1], d, kind: "end" });
    });
  });
  for (let a = 0; a < ids.length; a++)
    for (let b = a + 1; b < ids.length; b++) {
      const i = ids[a] * 4,
        j = ids[b] * 4;
      const x1 = S[i],
        y1 = S[i + 1],
        x2 = S[i + 2],
        y2 = S[i + 3],
        x3 = S[j],
        y3 = S[j + 1],
        x4 = S[j + 2],
        y4 = S[j + 3];
      const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(den) < 1e-9) continue;
      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den,
        u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
      if (t < -0.001 || t > 1.001 || u < -0.001 || u > 1.001) continue;
      const ix = x1 + t * (x2 - x1),
        iy = y1 + t * (y2 - y1),
        d = Math.hypot(ix - x, iy - y);
      if (d <= R) cand.push({ x: ix, y: iy, d, kind: "int" });
    }
  if (cand.length) {
    cand.sort((a, b) => a.d - b.d);
    const c = cand[0];
    return { f: [c.x / W, c.y / H], kind: c.kind };
  }
  let best = null;
  const R2 = R * 0.8;
  ids.forEach((s) => {
    const x1 = S[s * 4],
      y1 = S[s * 4 + 1],
      x2 = S[s * 4 + 2],
      y2 = S[s * 4 + 3];
    const dx = x2 - x1,
      dy = y2 - y1,
      l = dx * dx + dy * dy;
    if (!l) return;
    let t = ((x - x1) * dx + (y - y1) * dy) / l;
    t = Math.max(0, Math.min(1, t));
    const px = x1 + t * dx,
      py = y1 + t * dy,
      d = Math.hypot(px - x, py - y);
    if (d <= R2 && (!best || d < best.d)) best = { x: px, y: py, d };
  });
  return best ? { f: [best.x / W, best.y / H], kind: "line" } : null;
}
const FVM_PAPER = {
  A0: [1189, 841],
  A1: [841, 594],
  A2: [594, 420],
  A3: [420, 297],
  A4: [297, 210],
};
const fvmPaperOf = (wMm, hMm) => {
  const L = Math.max(wMm, hMm);
  for (const [k, v] of Object.entries(FVM_PAPER)) if (Math.abs(L - v[0]) / v[0] < 0.025) return k;
  return "";
};
async function fvmDetectScale() {
  if (!FV.pdf || FVM.detected) return;
  FVM.detected = { found: [] };
  const p = FV.pages[0];
  if (!p || !p.page) return;
  try {
    let txt = "";
    for (let i = 1; i <= Math.min(FV.pdf.numPages, 2); i++) {
      const pg = i === 1 ? p.page : await FV.pdf.getPage(i);
      const tc = await pg.getTextContent();
      txt += " " + tc.items.map((t) => t.str).join(" ");
    }
    const ok = [
      1, 2, 5, 10, 20, 25, 50, 75, 100, 125, 200, 250, 500, 1000, 1250, 1500, 2000, 2500, 5000,
    ];
    const seen = new Map();
    const re = /\b1\s*:\s*(\d{1,4})\b(?:\s*(?:@|at)\s*(A[0-4]))?/gi;
    let m;
    while ((m = re.exec(txt))) {
      const d = +m[1];
      if (!ok.includes(d)) continue;
      const k = d + "|" + (m[2] || "").toUpperCase();
      if (!seen.has(k)) seen.set(k, { den: d, paper: (m[2] || "").toUpperCase() });
    }
    const found = [...seen.values()].slice(0, 6);
    const wMm = (p.ptsW * 25.4) / 72,
      hMm = (p.ptsH * 25.4) / 72;
    const actual = fvmPaperOf(wMm, hMm);
    FVM.detected = { found, actual, longMm: Math.max(wMm, hMm) };
    const stored = store.get(fvmKey(), null);
    if (found.length && !(stored && stored.chosen) && !FVM.cal) {
      fvmUseScale(found.find((f) => f.paper) || found[0], true);
    }
    if (FVM.on) fvmBar();
  } catch (e) {}
}
function fvmUseScale(s, auto) {
  FVM.den = s.den;
  FVM.cal = null;
  FVM.pk = 1;
  FVM.pkNote = "";
  const D = FVM.detected || {};
  if (s.paper && D.longMm) {
    const want = FVM_PAPER[s.paper][0];
    if (Math.abs(D.longMm - want) / want > 0.025) {
      FVM.pk = want / D.longMm;
      FVM.pkNote = `Drawn for ${s.paper} but this PDF is ${D.actual || Math.round(D.longMm) + " mm"} size, so the app has allowed for that.`;
    }
  }
  if (!auto) FVM.chosen = true;
  fvmSave();
  fvmRelabel();
  if (FVM.on) {
    fvmBar();
    fvmDraw();
  }
}
function fvmHost(key) {
  return key === "img"
    ? document.querySelector(".fvimgbox")
    : document.querySelector(`.fvpage[data-p="${key}"]`);
}
function fvmTFor(key) {
  return key === "img"
    ? { kind: "img", page: 0, el: fvmHost(key) }
    : { kind: "pdf", page: +key, el: fvmHost(key) };
}
function fvmSnap(key, a, b) {
  // straighten to horizontal/vertical when within 4°
  if (FVM.snap === false) return b;
  const h = fvmHost(key);
  if (!h) return b;
  const r = h.getBoundingClientRect();
  const dx = (b[0] - a[0]) * r.width,
    dy = (b[1] - a[1]) * r.height;
  const ang = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
  if (ang < 4 || ang > 176) return [b[0], a[1]];
  if (Math.abs(ang - 90) < 4) return [a[0], b[1]];
  return b;
}
function fvmLabelOf(m) {
  if (m.ruler) {
    const mm = fvmReal(m.t || fvmTFor(m.key), m.units || 0);
    return mm == null ? "Ruler" : "Ruler " + fvmFmt(mm);
  }
  if (m.cal) return "Scale: " + (m.mm ? fvmFmt(m.mm) : "?");
  const mm = fvmReal(m.t, m.units);
  return mm == null ? "?" : fvmFmt(mm);
}
function fvmGeom(m, W, H) {
  const ax = m.a[0] * W,
    ay = m.a[1] * H,
    bx = m.b[0] * W,
    by = m.b[1] * H;
  const L = Math.hypot(bx - ax, by - ay) || 1;
  const nx = (-(by - ay) / L) * 7,
    ny = ((bx - ax) / L) * 7;
  return {
    ax,
    ay,
    bx,
    by,
    nx,
    ny,
    mx: (ax + bx) / 2,
    my: (ay + by) / 2,
    ang: (Math.atan2(by - ay, bx - ax) * 180) / Math.PI,
  };
}
function fvmRulerShape(m, W, H) {
  const g = fvmGeom(m, W, H);
  const L = Math.hypot(g.bx - g.ax, g.by - g.ay);
  const t = m.t || fvmTFor(m.key);
  const mmPx = fvmReal(t, fvmUnits(t, [0, 0], [1 / W, 0]));
  let ticks = "";
  if (mmPx) {
    const raw = mmPx * 7;
    const p10 = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 5, 10].map((k) => k * p10).find((v) => v >= raw);
    const major = step * ([1, 2].includes(step / p10) ? 5 : 2) * (step / p10 === 5 ? 1 : 1);
    const mj = step / p10 === 2 ? step * 5 : step / p10 === 5 ? step * 2 : step * 10;
    const n = Math.floor(L / (step / mmPx) + 1e-6);
    for (let k = 0; k <= n && k < 2000; k++) {
      const v = k * step,
        x = v / mmPx;
      const isMj = Math.abs(v / mj - Math.round(v / mj)) < 1e-6,
        isMid = !isMj && Math.abs(v / (mj / 2) - Math.round(v / (mj / 2))) < 1e-6;
      ticks += `<line x1="${x}" y1="0" x2="${x}" y2="${isMj ? -14 : isMid ? -10 : -6}" class="fvm-rt"/>`;
      if (isMj && k > 0)
        ticks += `<text x="${x}" y="-16" class="fvm-rtx">${v >= 1000 && mj >= 1000 ? v / 1000 + " m" : Math.round(v)}</text>`;
    }
  } else
    ticks = `<text x="6" y="-12" class="fvm-rtx" text-anchor="start">Set the scale first</text>`;
  return `<g transform="translate(${g.ax},${g.ay}) rotate(${g.ang})"><rect x="0" y="-30" width="${L}" height="30" class="fvm-rband"/>${ticks}<line x1="0" y1="0" x2="${L}" y2="0" class="fvm-rbase"/></g>`;
}
function fvmShape(m, W, H) {
  if (m.ruler) return fvmRulerShape(m, W, H);
  const g = fvmGeom(m, W, H);
  return `<line x1="${g.ax}" y1="${g.ay}" x2="${g.bx}" y2="${g.by}" class="fvm-halo"/><line x1="${g.ax}" y1="${g.ay}" x2="${g.bx}" y2="${g.by}" class="fvm-line ${m.cal ? "cal" : ""}"/>
    <line x1="${g.ax - g.nx}" y1="${g.ay - g.ny}" x2="${g.ax + g.nx}" y2="${g.ay + g.ny}" class="fvm-tick ${m.cal ? "cal" : ""}"/><line x1="${g.bx - g.nx}" y1="${g.by - g.ny}" x2="${g.bx + g.nx}" y2="${g.by + g.ny}" class="fvm-tick ${m.cal ? "cal" : ""}"/>`;
}
function fvmLabStyle(m, W, H) {
  const g = fvmGeom(m, W, H);
  let a = g.ang;
  if (m.ruler) {
    let a2 = g.ang;
    if (a2 > 90) a2 -= 180;
    if (a2 < -90) a2 += 180;
    return `left:${g.bx}px;top:${g.by}px;transform:translate(-50%,-50%) rotate(${a2}deg) translateY(16px)`;
  }
  if (a > 90) a -= 180;
  if (a < -90) a += 180;
  return `left:${g.mx}px;top:${g.my}px;transform:translate(-50%,-50%) rotate(${a}deg) translateY(-11px)`;
}
function fvmDraw() {
  document.querySelectorAll(".fvm-ov").forEach((o) => o.remove());
  if (!FVM.on) return;
  const groups = {};
  FVM.list.forEach((m, i) => {
    (groups[m.key] = groups[m.key] || []).push(i);
  });
  if (FVM.a && !groups[FVM.a.key]) groups[FVM.a.key] = [];
  Object.entries(groups).forEach(([key, idx]) => {
    const host = fvmHost(key);
    if (!host) return;
    const W = host.clientWidth,
      H = host.clientHeight;
    const ov = document.createElement("div");
    ov.className = "fvm-ov";
    ov.dataset.key = key;
    const pend = FVM.a && FVM.a.key === key ? FVM.a.f : null;
    ov.innerHTML = `<svg width="${W}" height="${H}">${idx.map((i) => `<g class="fvm-g ${FVM.sel === i ? "sel" : ""} ${FVM.list[i].ruler ? "rul" : ""}" data-i="${i}">${fvmShape(FVM.list[i], W, H)}</g>`).join("")}
      ${idx
        .map((i) => {
          const m = FVM.list[i];
          const y = m.ruler ? -14 : 0;
          const g = fvmGeom(m, W, H);
          const ox = m.ruler ? -Math.sin((g.ang * Math.PI) / 180) * y : 0,
            oy = m.ruler ? Math.cos((g.ang * Math.PI) / 180) * y : 0;
          return `<line class="fvm-hit" data-i="${i}" x1="${g.ax + ox}" y1="${g.ay + oy}" x2="${g.bx + ox}" y2="${g.by + oy}" style="stroke-width:${m.ruler ? 30 : 18}px"><title>Tap to select, drag to move</title></line>`;
        })
        .join("")}
      ${pend ? `<g class="fvm-pend"><line class="fvm-rb" x1="${pend[0] * W}" y1="${pend[1] * H}" x2="${pend[0] * W}" y2="${pend[1] * H}"/><circle cx="${pend[0] * W}" cy="${pend[1] * H}" r="9" class="fvm-ring"/><line x1="${pend[0] * W - 14}" y1="${pend[1] * H}" x2="${pend[0] * W + 14}" y2="${pend[1] * H}" class="fvm-cross"/><line x1="${pend[0] * W}" y1="${pend[1] * H - 14}" x2="${pend[0] * W}" y2="${pend[1] * H + 14}" class="fvm-cross"/></g>` : ""}
      ${idx
        .map((i) => {
          const m = FVM.list[i];
          return ["a", "b"]
            .map(
              (e) =>
                `<circle cx="${m[e][0] * W}" cy="${m[e][1] * H}" r="5" class="fvm-hv ${m.cal ? "cal" : ""}" data-i="${i}" data-e="${e}"/><circle cx="${m[e][0] * W}" cy="${m[e][1] * H}" r="18" class="fvm-h" data-i="${i}" data-e="${e}"><title>Drag to adjust</title></circle>`,
            )
            .join("");
        })
        .join("")}</svg>
      ${idx.map((i) => `<span class="fvm-lab ${FVM.list[i].cal ? "cal" : ""}" data-i="${i}" style="${fvmLabStyle(FVM.list[i], W, H)}">${esc(FVM.list[i].label || "")}</span>`).join("")}`;
    host.appendChild(ov);
    ov.querySelectorAll(".fvm-h").forEach((hd) =>
      hd.addEventListener("pointerdown", (e) => fvmDragStart(e, hd, host, ov)),
    );
    ov.querySelectorAll(".fvm-hit").forEach((hl) =>
      hl.addEventListener("pointerdown", (e) => fvmMoveStart(e, hl, host, ov)),
    );
  });
}
function fvmRefreshOne(ov, i, W, H) {
  const m = FVM.list[i];
  const g = ov.querySelector(`.fvm-g[data-i="${i}"]`);
  if (g) g.innerHTML = fvmShape(m, W, H);
  const hl = ov.querySelector(`.fvm-hit[data-i="${i}"]`);
  if (hl) {
    const G = fvmGeom(m, W, H);
    const y = m.ruler ? -14 : 0;
    const ox = m.ruler ? -Math.sin((G.ang * Math.PI) / 180) * y : 0,
      oy = m.ruler ? Math.cos((G.ang * Math.PI) / 180) * y : 0;
    hl.setAttribute("x1", G.ax + ox);
    hl.setAttribute("y1", G.ay + oy);
    hl.setAttribute("x2", G.bx + ox);
    hl.setAttribute("y2", G.by + oy);
  }
  ov.querySelectorAll(`circle[data-i="${i}"]`).forEach((c) => {
    const p = m[c.dataset.e];
    c.setAttribute("cx", p[0] * W);
    c.setAttribute("cy", p[1] * H);
  });
  const l = ov.querySelector(`.fvm-lab[data-i="${i}"]`);
  if (l) {
    l.textContent = m.label;
    l.setAttribute("style", fvmLabStyle(m, W, H));
  }
}
function fvmLoupe(host, f, cx, cy, snapK) {
  let lp = $("fvm-loupe");
  if (!lp) {
    lp = document.createElement("canvas");
    lp.id = "fvm-loupe";
    lp.width = lp.height = Math.round(140 * Math.max(1, window.devicePixelRatio || 1));
    document.body.appendChild(lp);
  }
  if (f == null) {
    lp.hidden = true;
    return;
  }
  lp.hidden = false;
  const D = 140,
    Z = 3;
  let top = cy - D - 40;
  if (top < 4) top = cy + 40;
  lp.style.left = Math.max(4, Math.min(window.innerWidth - D - 4, cx - D / 2)) + "px";
  lp.style.top = top + "px";
  const g = lp.getContext("2d"),
    k = lp.width / D;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, lp.width, lp.height);
  const W = host.clientWidth,
    H = host.clientHeight,
    half = D / 2 / Z;
  const det = host.querySelector("canvas.fvdet");
  const px = f[0] * W,
    py = f[1] * H;
  if (det && !det.hidden && det.width) {
    const lx = parseFloat(det.style.left),
      ly = parseFloat(det.style.top),
      lw = parseFloat(det.style.width),
      lh = parseFloat(det.style.height);
    if (px - half >= lx && py - half >= ly && px + half <= lx + lw && py + half <= ly + lh) {
      const k2 = det.width / lw;
      try {
        g.drawImage(
          det,
          (px - half - lx) * k2,
          (py - half - ly) * k2,
          2 * half * k2,
          2 * half * k2,
          0,
          0,
          lp.width,
          lp.height,
        );
      } catch (e) {}
    } else drawBase();
  } else drawBase();
  function drawBase() {
    const src = host.querySelector("canvas.fvbase") || host.querySelector("img");
    if (!src) return;
    const sw = src.naturalWidth || src.width,
      sh = src.naturalHeight || src.height,
      sx = sw / W,
      sy = sh / H;
    try {
      g.imageSmoothingEnabled = true;
      g.drawImage(
        src,
        (px - half) * sx,
        (py - half) * sy,
        2 * half * sx,
        2 * half * sy,
        0,
        0,
        lp.width,
        lp.height,
      );
    } catch (e) {}
  }
  // existing lines in the loupe
  g.save();
  g.scale(k * Z, k * Z);
  g.translate(-(f[0] * W - D / 2 / Z), -(f[1] * H - D / 2 / Z));
  g.lineWidth = (1 / Z) * 1.2;
  FVM.list.forEach((m) => {
    if (m.key !== (host.classList.contains("fvimgbox") ? "img" : host.dataset.p)) return;
    g.strokeStyle = m.cal ? "#2f5fb3" : "#e11d2a";
    g.beginPath();
    g.moveTo(m.a[0] * W, m.a[1] * H);
    g.lineTo(m.b[0] * W, m.b[1] * H);
    g.stroke();
  });
  g.restore();
  g.strokeStyle = "#e11d2a";
  g.lineWidth = 1 * k;
  g.beginPath();
  g.moveTo(lp.width / 2, 0);
  g.lineTo(lp.width / 2, lp.height * 0.42);
  g.moveTo(lp.width / 2, lp.height * 0.58);
  g.lineTo(lp.width / 2, lp.height);
  g.moveTo(0, lp.height / 2);
  g.lineTo(lp.width * 0.42, lp.height / 2);
  g.moveTo(lp.width * 0.58, lp.height / 2);
  g.lineTo(lp.width, lp.height / 2);
  g.stroke();
  g.beginPath();
  g.arc(lp.width / 2, lp.height / 2, 1.5 * k, 0, 7);
  g.fillStyle = "#e11d2a";
  g.fill();
  if (snapK) {
    g.strokeStyle = "#1d8a4a";
    g.lineWidth = 2 * k;
    const c = lp.width / 2,
      q = 9 * k;
    if (snapK === "end") g.strokeRect(c - q, c - q, 2 * q, 2 * q);
    else if (snapK === "int") {
      g.beginPath();
      g.moveTo(c - q, c - q);
      g.lineTo(c + q, c + q);
      g.moveTo(c + q, c - q);
      g.lineTo(c - q, c + q);
      g.stroke();
    } else {
      g.beginPath();
      g.arc(c, c, q, 0, 7);
      g.stroke();
    }
    g.fillStyle = "#1d8a4a";
    g.font = `700 ${11 * k}px system-ui`;
    g.textAlign = "center";
    g.fillText(
      snapK === "end" ? "CORNER / END" : snapK === "int" ? "CROSSING" : "ON LINE",
      c,
      lp.height - 10 * k,
    );
  }
}
function fvmDragStart(e, hd, host, ov) {
  e.preventDefault();
  e.stopPropagation();
  const i = +hd.dataset.i,
    end = hd.dataset.e,
    m = FVM.list[i];
  if (!m) return;
  hd.setPointerCapture(e.pointerId);
  const W = host.clientWidth,
    H = host.clientHeight;
  const r0 = host.getBoundingClientRect();
  const off = [m[end][0] * W - (e.clientX - r0.left), m[end][1] * H - (e.clientY - r0.top)];
  const sx = e.clientX,
    sy = e.clientY;
  let moved = false;
  const move = (ev) => {
    if (!moved) {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 3) return;
      moved = true;
      FVM.dragging = true;
      fvmPush();
    }
    const r = host.getBoundingClientRect();
    let f = [
      Math.max(0, Math.min(1, (ev.clientX - r.left + off[0]) / r.width)),
      Math.max(0, Math.min(1, (ev.clientY - r.top + off[1]) / r.height)),
    ];
    const other = m[end === "a" ? "b" : "a"];
    const vs = fvmVSnap(m.key, f, 16);
    f = vs ? vs.f : fvmSnap(m.key, other, f);
    m[end] = f;
    const t = fvmTFor(m.key);
    m.units = fvmUnits(t, m.a, m.b);
    m.t = t;
    if (m.cal && m.mm) {
      FVM.cal = { kind: t.kind, mmPerUnit: m.mm / m.units };
      fvmSave();
      FVM.list.forEach((x) => {
        x.label = fvmLabelOf(x);
      });
      FVM.list.forEach((x, j) => {
        if (x.key === m.key && j !== i) fvmRefreshOne(ov, j, W, H);
      });
    }
    if (m.cal && FVM.pend && FVM.pend.idx === i) {
      FVM.pend.a = m.a;
      FVM.pend.b = m.b;
      FVM.pend.units = m.units;
    }
    m.label = fvmLabelOf(m);
    fvmRefreshOne(ov, i, W, H);
    fvmLoupe(host, f, ev.clientX, ev.clientY, vs && vs.kind);
    fvmOut();
  };
  const up = (ev) => {
    hd.removeEventListener("pointermove", move);
    hd.removeEventListener("pointerup", up);
    hd.removeEventListener("pointercancel", up);
    fvmLoupe(null, null);
    if (moved) {
      FVM.skipAt = Date.now();
      setTimeout(() => {
        FVM.dragging = false;
      }, 60);
      fvmBar();
    }
  };
  hd.addEventListener("pointermove", move);
  hd.addEventListener("pointerup", up);
  hd.addEventListener("pointercancel", up);
  fvmLoupe(host, m[end], e.clientX, e.clientY);
}
function fvmOut() {
  const o = $("fvm-out");
  if (!o || FVM.calMode || FVM.pend) return;
  const ms = FVM.list.filter((m) => !m.cal && !m.ruler);
  if (!ms.length) return;
  const last = ms[ms.length - 1];
  const mmL = fvmReal(last.t, last.units);
  if (mmL == null) return;
  const tot = ms.reduce((s, m) => s + (fvmReal(m.t, m.units) || 0), 0);
  o.innerHTML = `Last: <b class="fvm-big">${esc(fvmFmt(mmL))}</b>${ms.length > 1 ? ` <span class="fvm-tot">Total of ${ms.length} lines: <b>${esc(fvmFmt(tot))}</b></span>` : ""} <span class="who">Drag an end to fine-tune.</span>`;
}
function fvmHover(e) {
  if (!FVM.on || FVM.dragging || FVM.pend || e.pointerType === "touch") {
    return;
  }
  const t = fvmTarget(e.target);
  if (!t) {
    fvmMark(null);
    return;
  }
  const key = t.kind === "img" ? "img" : String(t.page);
  const pk = fvmPick(t, e.clientX, e.clientY, FVM.a && FVM.a.key === key ? FVM.a : null);
  fvmMark(t, pk);
  if (!FVM.a || key !== FVM.a.key) return;
  const ov = t.el.querySelector(".fvm-ov");
  const rb = ov && ov.querySelector(".fvm-rb");
  if (!rb) return;
  const r = t.el.getBoundingClientRect();
  rb.setAttribute("x2", pk.f[0] * r.width);
  rb.setAttribute("y2", pk.f[1] * r.height);
  const units = fvmUnits(t, FVM.a.f, pk.f),
    mm = fvmReal(t, units);
  const o = $("fvm-out");
  if (o && mm != null && !FVM.calMode)
    o.innerHTML = `Measuring: <b class="fvm-big">${esc(fvmFmt(mm))}</b> <span class="who">Click to finish.</span>`;
}

function fvmSnapList() {
  return FVM.list.map((m) => ({
    key: m.key,
    a: m.a.slice(),
    b: m.b.slice(),
    units: m.units,
    cal: m.cal,
    mm: m.mm,
    ruler: m.ruler,
    label: m.label,
  }));
}
function fvmRestore(l) {
  FVM.list = l.map((m) =>
    Object.assign({}, m, { a: m.a.slice(), b: m.b.slice(), t: fvmTFor(m.key) }),
  );
  FVM.sel = null;
  const c = FVM.list.find((m) => m.cal && m.mm);
  if (c && c.units) {
    FVM.cal = { kind: c.key === "img" ? "img" : "pdf", mmPerUnit: c.mm / c.units };
    fvmSave();
  }
  fvmRelabel();
}
function fvmPush() {
  (FVM.hist = FVM.hist || []).push(fvmSnapList());
  if (FVM.hist.length > 100) FVM.hist.shift();
  FVM.fut = [];
}
function fvmUndo() {
  if (FVM.a) {
    FVM.a = null;
    fvmDraw();
    fvmBar();
    return;
  }
  if (FVM.pend) {
    FVM.list.splice(FVM.pend.idx, 1);
    FVM.pend = null;
    FVM.calMode = false;
    fvmDraw();
    fvmBar();
    return;
  }
  const h = FVM.hist || [];
  if (!h.length) {
    toast("Nothing to undo");
    return;
  }
  (FVM.fut = FVM.fut || []).push(fvmSnapList());
  fvmRestore(h.pop());
  fvmDraw();
  fvmBar();
  fvmOut();
}
function fvmRedo() {
  const f = FVM.fut || [];
  if (!f.length) return;
  FVM.hist.push(fvmSnapList());
  fvmRestore(f.pop());
  fvmDraw();
  fvmBar();
  fvmOut();
}
function fvmAddRuler() {
  const body = $("fv-body"),
    br = body.getBoundingClientRect();
  const host = fvHostAt(br.left + br.width / 2, br.top + br.height / 2);
  if (!host) {
    toast("Open a drawing first");
    return;
  }
  const t = fvmTarget(host);
  if (t.kind === "img" && !(FVM.cal && FVM.cal.kind === "img")) {
    toast("Set the scale from a known length first");
    return;
  }
  const r = host.getBoundingClientRect();
  const cx =
      Math.max(r.left, br.left) + (Math.min(r.right, br.right) - Math.max(r.left, br.left)) / 2,
    cy = Math.max(r.top, br.top) + (Math.min(r.bottom, br.bottom) - Math.max(r.top, br.top)) / 2;
  const len = Math.min(
    br.width * 0.7,
    Math.min(r.right, br.right) - Math.max(r.left, br.left) - 20,
  );
  const a = [(cx - len / 2 - r.left) / r.width, (cy - r.top) / r.height],
    b = [(cx + len / 2 - r.left) / r.width, (cy - r.top) / r.height];
  const key = t.kind === "img" ? "img" : String(t.page);
  fvmPush();
  const m = { key, a, b, t, ruler: true };
  m.units = fvmUnits(t, a, b);
  m.label = fvmLabelOf(m);
  FVM.list.push(m);
  FVM.sel = FVM.list.length - 1;
  fvmDraw();
  fvmBar();
}
function fvmMoveStart(e, hl, host, ov) {
  e.preventDefault();
  e.stopPropagation();
  const i = +hl.dataset.i,
    m = FVM.list[i];
  if (!m) return;
  hl.setPointerCapture(e.pointerId);
  const W = host.clientWidth,
    H = host.clientHeight,
    sx = e.clientX,
    sy = e.clientY,
    a0 = m.a.slice(),
    b0 = m.b.slice();
  let moved = false;
  const move = (ev) => {
    const dx = (ev.clientX - sx) / W,
      dy = (ev.clientY - sy) / H;
    if (!moved) {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
      moved = true;
      FVM.dragging = true;
      fvmPush();
      if (FVM.sel !== i) {
        FVM.sel = i;
        ov.querySelectorAll(".fvm-g").forEach((g) => g.classList.toggle("sel", +g.dataset.i === i));
      }
    }
    m.a = [a0[0] + dx, a0[1] + dy];
    m.b = [b0[0] + dx, b0[1] + dy];
    fvmRefreshOne(ov, i, W, H);
  };
  const up = () => {
    hl.removeEventListener("pointermove", move);
    hl.removeEventListener("pointerup", up);
    hl.removeEventListener("pointercancel", up);
    FVM.skipAt = Date.now();
    if (moved) {
      setTimeout(() => {
        FVM.dragging = false;
      }, 60);
      fvmBar();
    } else {
      FVM.sel = FVM.sel === i ? null : i;
      fvmDraw();
      fvmBar();
    }
  };
  hl.addEventListener("pointermove", move);
  hl.addEventListener("pointerup", up);
  hl.addEventListener("pointercancel", up);
}
function fvmBar() {
  const pdf = FV.pages.length > 0,
    img = !!$("fv-img");
  const D = FVM.detected || {};
  const scaleSel = pdf
    ? `<label class="fvm-l"><span class="sr">Scale</span><select id="fvm-den" aria-label="Scale">${FVM_SCALES.map((d) => `<option value="${d}" ${d === FVM.den && !FVM.cal ? "selected" : ""}>1:${d}</option>`).join("")}${FVM.cal ? `<option value="cal" selected>Set from a length</option>` : ""}</select></label>`
    : "";
  const found = (D.found || []).length
    ? `<div class="fvm-row fvm-found"><span class="who">On the drawing:</span>${D.found.map((f, i) => `<button type="button" class="pillbtn fvm-fs" data-i="${i}" aria-pressed="${!FVM.cal && f.den === FVM.den && (!f.paper || (FVM.pk !== 1) === (D.longMm && Math.abs(D.longMm - FVM_PAPER[f.paper][0]) / FVM_PAPER[f.paper][0] > 0.025))}">1:${f.den}${f.paper ? " @ " + f.paper : ""}</button>`).join("")}${D.actual ? `<span class="who">PDF is ${D.actual}</span>` : ""}</div>`
    : "";
  const fpills = (D.found || [])
    .map(
      (f, i) =>
        `<button type="button" class="pillbtn fvm-fs" data-i="${i}" title="Scale written on the drawing" aria-pressed="${!FVM.cal && f.den === FVM.den && (!f.paper || (FVM.pk !== 1) === (D.longMm && Math.abs(D.longMm - FVM_PAPER[f.paper][0]) / FVM_PAPER[f.paper][0] > 0.025))}">1:${f.den}${f.paper ? " @ " + f.paper : ""}</button>`,
    )
    .join("");
  $("fv-meas").innerHTML =
    `<div class="fvm-strip">${scaleSel}${fpills}${pdf ? `<button type="button" class="pillbtn fvm-tg" id="fvm-vsnap" aria-pressed="${FVM.vsnap !== false}" title="Lock onto the drawing's corners, line ends and edges">🧲 Snap</button>` : ""}<button type="button" class="pillbtn fvm-tg" id="fvm-snap" aria-pressed="${FVM.snap !== false}" title="Straighten nearly level or upright lines">⟂ Straight</button><button type="button" class="pillbtn" id="fvm-cal">📐 ${FVM.cal ? "Re-set scale" : "Set scale"}</button><button type="button" class="pillbtn fvm-tg" id="fvm-ruler" aria-pressed="false" title="Add a scale ruler you can move and turn">📏 Ruler</button><button type="button" class="pillbtn" id="fvm-undo" ${(FVM.hist || []).length || FVM.a ? "" : "disabled"}>↶ Undo</button><button type="button" class="pillbtn" id="fvm-redo" ${(FVM.fut || []).length ? "" : "disabled"}>↷ Redo</button><button type="button" class="pillbtn" id="fvm-clear" ${FVM.list.length ? "" : "disabled"}>Clear all</button></div>
    <div class="fvm-out" id="fvm-out">${FVM.calMode ? "<b>Setting the scale:</b> tap both ends of the longest dimension you know (e.g. a wall marked 4500)." : !pdf && !FVM.cal && img ? "Photos have no scale. Tap <b>📐 Set scale</b> and tap a length you know." : "Tap two points. Pinch to zoom in close." + (FVM.pkNote && !FVM.cal ? ` <span class="fvm-pk">⚠ ${esc(D.actual ? "A" + (D.found.find((f) => f.paper) || {}).paper?.slice(1) + " drawing printed on " + D.actual + ": allowed for." : FVM.pkNote)}</span>` : pdf && !FVM.cal ? ` <span class="who">Check one known dimension first.</span>` : FVM.cal ? ` <span class="who">Scale set from a known length.</span>` : "")}</div>
    <form class="fvm-calf" id="fvm-calf" ${FVM.pend ? "" : "hidden"}><span>That line is really</span><input id="fvm-len" inputmode="decimal" placeholder="4500" style="width:90px"><select id="fvm-unit"><option value="mm">mm</option><option value="m">m</option></select><button class="btn primary" type="submit">Set scale</button><button class="btn" type="button" id="fvm-calx">Cancel</button></form>`;
  if ($("fvm-den"))
    $("fvm-den").onchange = (e) => {
      if (e.target.value === "cal") return;
      fvmUseScale({ den: +e.target.value, paper: "" }, false);
    };
  $("fv-meas")
    .querySelectorAll(".fvm-fs")
    .forEach((b) => (b.onclick = () => fvmUseScale(D.found[+b.dataset.i], false)));
  $("fvm-cal").onclick = () => {
    FVM.calMode = true;
    FVM.a = null;
    FVM.pend = null;
    fvmBar();
    fvmDraw();
  };
  $("fvm-clear").onclick = () => {
    fvmPush();
    FVM.list = FVM.list.filter((m) => m.cal && !FVM.pend);
    FVM.a = null;
    FVM.sel = null;
    fvmDraw();
    fvmBar();
    toast("Cleared. Tap Undo to bring them back.");
  };
  $("fvm-undo").onclick = fvmUndo;
  $("fvm-redo").onclick = fvmRedo;
  $("fvm-ruler").onclick = fvmAddRuler;
  let sb = $("fvm-selbar");
  if (!sb) {
    sb = document.createElement("div");
    sb.id = "fvm-selbar";
    sb.className = "fvm-selbar";
    $("fileview").appendChild(sb);
  }
  const selM = FVM.on && FVM.sel != null ? FVM.list[FVM.sel] : null;
  sb.hidden = !selM;
  sb.innerHTML = selM
    ? `<span><b>${esc(selM.label || "")}</b> selected. Drag ${selM.ruler ? "the ruler" : "the line"} to move it, or drag an end to ${selM.ruler ? "turn it" : "change it"}.</span><button type="button" class="pillbtn" id="fvm-del">🗑 Delete</button><button type="button" class="pillbtn" id="fvm-desel">Done</button>`
    : "";
  if ($("fvm-del"))
    $("fvm-del").onclick = () => {
      fvmPush();
      FVM.list.splice(FVM.sel, 1);
      FVM.sel = null;
      fvmRelabel();
      fvmDraw();
      fvmBar();
      fvmOut();
    };
  if ($("fvm-desel"))
    $("fvm-desel").onclick = () => {
      FVM.sel = null;
      fvmDraw();
      fvmBar();
    };
  $("fvm-snap").onclick = () => {
    FVM.snap = FVM.snap === false;
    store.set("jeb.fvmsnap", FVM.snap);
    fvmBar();
  };
  if ($("fvm-vsnap"))
    $("fvm-vsnap").onclick = () => {
      FVM.vsnap = FVM.vsnap === false;
      store.set("jeb.fvmvsnap", FVM.vsnap);
      fvmBar();
    };
  if (FVM.pend) {
    $("fvm-len").focus();
    $("fvm-calf").onsubmit = (e) => {
      e.preventDefault();
      const v = parseFloat(String($("fvm-len").value).replace(",", "."));
      if (!(v > 0)) {
        toast("Type the real length");
        return;
      }
      const mm = $("fvm-unit").value === "m" ? v * 1000 : v;
      const pd = FVM.pend;
      FVM.cal = { kind: pd.t.kind, mmPerUnit: mm / pd.units };
      FVM.chosen = true;
      fvmSave();
      FVM.list = FVM.list.filter((m) => !m.cal);
      FVM.list.push({
        key: pd.key,
        a: pd.a,
        b: pd.b,
        t: pd.t,
        units: pd.units,
        mm,
        cal: true,
        label: "Scale: " + fvmFmt(mm),
      });
      FVM.pend = null;
      FVM.calMode = false;
      fvmRelabel();
      fvmBar();
      fvmDraw();
      toast("Scale set. Now tap two points to measure.");
    };
    $("fvm-calx").onclick = () => {
      FVM.list = FVM.list.filter((m, i) => i !== FVM.pend.idx);
      FVM.pend = null;
      FVM.calMode = false;
      fvmBar();
      fvmDraw();
    };
  }
}
function fvmRelabel() {
  FVM.list.forEach((m) => {
    m.label = fvmLabelOf(m);
  });
}
function fvmToggle() {
  FVM.on = !FVM.on;
  if (!FVM.on) {
    FVM.sel = null;
    const sb = $("fvm-selbar");
    if (sb) sb.hidden = true;
  }
  $("fv-ruler").setAttribute("aria-pressed", String(FVM.on));
  $("fv-meas").hidden = !FVM.on;
  $("fv-body").classList.toggle("measuring", FVM.on);
  if (FVM.on) {
    FV.pages.forEach((p, i) => {
      if (p.page) fvmVec(i + 1);
    });
    fvmDetectScale();
    fvmBar();
    fvmDraw();
  } else {
    FVM.a = null;
    fvmDraw();
    fvmMark(null);
  }
}
function fvmPick(t, cx, cy, anchor) {
  // point under the finger, snapped
  const r = t.el.getBoundingClientRect();
  const key = t.kind === "img" ? "img" : String(t.page);
  let f = [(cx - r.left) / r.width, (cy - r.top) / r.height];
  const v = fvmVSnap(key, f, window.matchMedia && matchMedia("(pointer:coarse)").matches ? 22 : 12);
  if (v) return { f: v.f, kind: v.kind, key };
  if (anchor && anchor.key === key) f = fvmSnap(key, anchor.f, f);
  return { f, kind: "", key };
}
function fvmMark(t, pk) {
  let mk = $("fvm-mark");
  if (!t || !pk || !pk.kind) {
    if (mk) mk.hidden = true;
    return;
  }
  if (!mk) {
    mk = document.createElement("div");
    mk.id = "fvm-mark";
    document.body.appendChild(mk);
  }
  const r = t.el.getBoundingClientRect();
  mk.hidden = false;
  mk.className = "k-" + pk.kind;
  mk.style.left = r.left + pk.f[0] * r.width + "px";
  mk.style.top = r.top + pk.f[1] * r.height + "px";
  mk.title =
    pk.kind === "end" ? "Line end / corner" : pk.kind === "int" ? "Where lines cross" : "On a line";
}
function fvmClick(e) {
  if (
    !FVM.on ||
    FVM.pend ||
    FVM.dragging ||
    (FVM.pinchAt && Date.now() - FVM.pinchAt < 350) ||
    (FVM.skipAt && Date.now() - FVM.skipAt < 350)
  )
    return;
  const t = fvmTarget(e.target);
  if (!t) return;
  if (FVM.sel != null && !FVM.a) {
    FVM.sel = null;
    fvmDraw();
    fvmBar();
    return;
  }
  const key = t.kind === "img" ? "img" : String(t.page);
  const pk = fvmPick(t, e.clientX, e.clientY, FVM.a && FVM.a.key === key ? FVM.a : null);
  fvmMark(null);
  if (!FVM.a || FVM.a.key !== key) {
    FVM.a = { key, f: pk.f, t };
    fvmDraw();
    fvmBar();
    const o = $("fvm-out");
    if (o && !FVM.calMode)
      o.innerHTML = `First point placed${pk.kind ? ` <b>(snapped to ${pk.kind === "end" ? "a corner / line end" : pk.kind === "int" ? "where lines cross" : "a line"})</b>` : ""}. Tap the second point.`;
    return;
  }
  const a = FVM.a.f,
    b = pk.f;
  FVM.a = null;
  const units = fvmUnits(t, a, b);
  if (units < 0.05) {
    fvmDraw();
    return;
  }
  if (FVM.calMode) {
    fvmPush();
    FVM.list.push({ key, a, b, t, units, cal: true, label: "Scale: ?" });
    FVM.pend = { t, key, a, b, units, idx: FVM.list.length - 1 };
    fvmBar();
    fvmDraw();
    return;
  }
  const mm = fvmReal(t, units);
  if (mm == null) {
    toast("Set the scale from a known length first");
    fvmDraw();
    return;
  }
  fvmPush();
  FVM.list.push({ key, a, b, t, units, label: fvmFmt(mm) });
  fvmBar();
  fvmDraw();
  fvmOut();
}

/* Runs once when the app starts, called from core/boot.js. Nothing else in this file runs at load. */
function initScaleRuler() {
  document.addEventListener("keydown", (e) => {
    if (
      !FVM.on ||
      $("fileview").hidden ||
      /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || "")
    )
      return;
    if ((e.key === "Delete" || e.key === "Backspace") && FVM.sel != null) {
      e.preventDefault();
      fvmPush();
      FVM.list.splice(FVM.sel, 1);
      FVM.sel = null;
      fvmDraw();
      fvmBar();
      fvmOut();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      e.shiftKey ? fvmRedo() : fvmUndo();
    }
  });
}
