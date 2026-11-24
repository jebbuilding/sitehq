/* ================= GLASS SHAPES: a glass piece's shape, holes and socket / switch cut-outs – a drawing to scale and the checks ================= */
import { esc } from "../core/helpers.js";
export { GLS, GLS_PATTERNS };
/* James (Nov 2026): "with the glass I might need to shape it or add holes for sockets and things". Each piece on a 🪟
   Glass order (survey/glass-order.js) has a shape with the measurements that shape needs (sloping top, arched top,
   triangle, rounded or cut-off corners, circle, or an odd shape with a template to follow), holes (how wide, and where
   their centre is) and cut-outs (single / double socket, switch, or any size, and where their centre is) – measured,
   as glass suppliers ask, from the LEFT edge and the BOTTOM edge of the glass to the centre. A drawing to scale shows it
   as it is typed, and on the order PDF. The checks are the usual rules for toughened glass (BS EN 12150): a hole at
   least as wide as the glass is thick, at least 2 × the thickness from any edge (cut-outs too) and about 6 × from a
   corner – a warning to check with the supplier, never a block. Toughened glass can't be cut after it's made, so every
   hole and cut-out has to be on the order. */
/* the obscure / special glass list, the same on the door & window survey and the glass order (James, Nov 2026: "you
   have the obscure drop down in windows and doors, use the same for sealed units") */
const GLS_PATTERNS = [
  "Clear",
  "Pilkington Arctic",
  "Pilkington Autumn",
  "Pilkington Chantilly",
  "Pilkington Charcoal Sticks",
  "Pilkington Contora",
  "Pilkington Cotswold",
  "Pilkington Digital",
  "Pilkington Everglade",
  "Pilkington Flemish",
  "Pilkington Florielle",
  "Pilkington Mayflower",
  "Pilkington Minster",
  "Pilkington Oak",
  "Pilkington Pelerine",
  "Pilkington Reeded",
  "Pilkington Satin",
  "Pilkington Stippolyte",
  "Pilkington Sycamore",
  "Pilkington Taffeta",
  "Pilkington Warwick",
  "Satin / etched look",
  "Solar control",
  "Self-cleaning (Pilkington Activ)",
  "Acoustic",
];
const GLS = (() => {
  const SHAPES = {
    rect: { l: "Rectangle", f: [] },
    rake: {
      l: "Sloping top (raked)",
      f: [
        ["side", "Shorter side", ["Left", "Right"]],
        ["hs", "Height of the shorter side (mm)"],
      ],
    },
    arch: {
      l: "Arched / curved top",
      f: [["hs", "Height at the sides (mm) – the height above is at the top of the arch"]],
    },
    tri: { l: "Triangle", f: [["px", "Point – distance from the left edge (mm, blank = middle)"]] },
    radius: {
      l: "Rounded corners",
      f: [
        ["rad", "Corner radius (mm)"],
        ["corners", "Which corners", ["All four", "Top two", "Bottom two"]],
      ],
    },
    chamfer: {
      l: "Corner cut off",
      f: [
        ["cc", "Size of the cut along each edge (mm)"],
        ["corners", "Which corners", ["Top left", "Top right", "Top two", "All four"]],
      ],
    },
    circle: { l: "Circle / oval (width and height are the diameters)", f: [] },
    template: { l: "Odd shape – template or drawing to follow", f: [] },
  };
  /* older orders kept the shape as words */
  const OLD = {
    Rectangle: "rect",
    "Shaped – template / drawing to follow": "template",
    "Raked (sloping top)": "rake",
  };
  const shapeKey = (it) => (SHAPES[it.shape] ? it.shape : OLD[it.shape] || "rect");
  const CUTS = [
    ["s1", "Single socket", 75, 75],
    ["s2", "Double socket", 135, 75],
    ["sw", "Light switch", 75, 75],
    ["sp", "Cooker / spur switch", 75, 75],
    ["cu", "Other cut-out", "", ""],
    ["nt", "Notch in the edge", "", ""],
  ];
  const cutName = (k) => (CUTS.find((c) => c[0] === k) || CUTS[4])[1];
  const n = (v) => (v === "" || v == null || isNaN(+v) ? null : +v);
  /* the glass thickness, from whichever box that kind of glass has */
  function thick(it) {
    const s = String(it.thk || it.typ || it.out || "");
    const m = s.match(/(\d+(?:\.\d+)?)\s*mm/);
    return m ? +m[1] : 6;
  }
  /* the outline in mm, from the bottom-left corner (y up) */
  function outline(it) {
    const W = n(it.w) || 0,
      H = n(it.h) || 0;
    if (!W || !H) return [];
    const k = shapeKey(it);
    const arc = (cx, cy, rx, ry, a0, a1, steps) => {
      const out = [];
      for (let i = 0; i <= steps; i++) {
        const a = a0 + ((a1 - a0) * i) / steps;
        out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
      }
      return out;
    };
    if (k === "rake") {
      const hs = Math.min(H, Math.max(0, n(it.hs) == null ? H : n(it.hs)));
      return it.side === "Right"
        ? [
            [0, 0],
            [W, 0],
            [W, hs],
            [0, H],
          ]
        : [
            [0, 0],
            [W, 0],
            [W, H],
            [0, hs],
          ];
    }
    if (k === "arch") {
      const hs = Math.min(H, Math.max(0, n(it.hs) == null ? H : n(it.hs)));
      const s = H - hs;
      if (s <= 0)
        return [
          [0, 0],
          [W, 0],
          [W, H],
          [0, H],
        ];
      const R = (W * W) / 4 / (2 * s) + s / 2;
      const cy = H - R;
      const a = Math.asin(Math.min(1, W / 2 / R));
      return [
        [0, 0],
        [W, 0],
      ].concat(arc(W / 2, cy, R, R, Math.PI / 2 - a, Math.PI / 2 + a, 32));
    }
    if (k === "tri") {
      const px = n(it.px) == null ? W / 2 : Math.min(W, Math.max(0, n(it.px)));
      return [
        [0, 0],
        [W, 0],
        [px, H],
      ];
    }
    if (k === "circle") return arc(W / 2, H / 2, W / 2, H / 2, 0, 2 * Math.PI, 64).slice(0, -1);
    if (k === "radius" || k === "chamfer") {
      const c = it.corners || (k === "radius" ? "All four" : "Top left");
      const on = {
        tl: /All|Top two|Top left/.test(c),
        tr: /All|Top two|Top right/.test(c),
        bl: /All|Bottom two/.test(c),
        br: /All|Bottom two/.test(c),
      };
      const r = Math.min(W / 2, H / 2, Math.max(0, n(k === "radius" ? it.rad : it.cc) || 0));
      const P2 = Math.PI / 2;
      /* round the outline anticlockwise from the bottom left: each corner is its point, or the cut's two ends, or
         a quarter circle round its centre */
      const C = [
        [on.bl, [0, 0], [0, r], [r, 0], [r, r], Math.PI],
        [on.br, [W, 0], [W - r, 0], [W, r], [W - r, r], -P2],
        [on.tr, [W, H], [W, H - r], [W - r, H], [W - r, H - r], 0],
        [on.tl, [0, H], [r, H], [0, H - r], [r, H - r], P2],
      ];
      const pts = [];
      C.forEach(([use, pt, a, b, cen, a0]) => {
        if (!use || !r) pts.push(pt);
        else if (k === "chamfer") pts.push(a, b);
        else arc(cen[0], cen[1], r, r, a0, a0 + P2, 8).forEach((q) => pts.push(q));
      });
      return pts;
    }
    return [
      [0, 0],
      [W, 0],
      [W, H],
      [0, H],
    ];
  }
  /* the area of one piece in m² (the real shape, not the box round it) */
  function areaOne(it) {
    const p = outline(it);
    if (p.length < 3) return 0;
    let a = 0;
    p.forEach(([x, y], i) => {
      const [x2, y2] = p[(i + 1) % p.length];
      a += x * y2 - x2 * y;
    });
    return Math.abs(a) / 2 / 1e6;
  }
  const FROM = ["Bottom left corner", "Bottom right corner", "Top left corner", "Top right corner"];
  const fromR = (it) => /right/.test(it.from || "");
  const fromT = (it) => /^Top/.test(it.from || "");
  const sideLR = (it) => (fromR(it) ? "right" : "left");
  const sideTB = (it) => (fromT(it) ? "top" : "bottom");
  const TO = ["Centre of each cut-out", "Nearest edge of each cut-out"];
  const toEdge = (it) => /edge/.test(it.to || "");
  /* a cut-out's centre from the bottom left, whichever way it was measured */
  function cutAt(it, c) {
    const w = n(c.w) || 0,
      h = n(c.h) || 0;
    let x = n(c.x),
      y = n(c.y);
    if (toEdge(it)) {
      if (x != null) x += w / 2;
      if (y != null) y += h / 2;
    }
    return at(it, x, y);
  }
  /* the measurements to draw: from the 0 edges to each hole's centre and each cut-out's centre or nearest edge,
     with the number typed – as lines in bottom-left mm */
  function dims(it) {
    const W = n(it.w) || 0,
      H = n(it.h) || 0;
    const rx = fromR(it) ? W : 0,
      ry = fromT(it) ? H : 0;
    const out = [];
    holes(it).forEach((h) => {
      const [x, y] = at(it, n(h.x), n(h.y));
      if (x == null || y == null) return;
      out.push({ x1: rx, y1: y, x2: x, y2: y, t: h.x, v: false });
      out.push({ x1: x, y1: ry, x2: x, y2: y, t: h.y, v: true });
    });
    cuts(it).forEach((c) => {
      const w = n(c.w) || 0,
        h = n(c.h) || 0;
      const [x, y] = cutAt(it, c);
      if (x == null || y == null) return;
      const e = toEdge(it);
      const tx = e ? x + (fromR(it) ? w / 2 : -w / 2) : x,
        ty = e ? y + (fromT(it) ? h / 2 : -h / 2) : y;
      out.push({ x1: rx, y1: y, x2: tx, y2: y, t: c.x, v: false });
      out.push({ x1: x, y1: ry, x2: x, y2: ty, t: c.y, v: true });
    });
    return out.filter((d) => Math.hypot(d.x2 - d.x1, d.y2 - d.y1) > 0);
  }
  /* a position as typed (from the chosen corner) → from the bottom left, which the drawing and checks use */
  function at(it, x, y) {
    const W = n(it.w) || 0,
      H = n(it.h) || 0;
    return [x == null ? null : fromR(it) ? W - x : x, y == null ? null : fromT(it) ? H - y : y];
  }
  const holes = (it) => (Array.isArray(it.holes) ? it.holes : []);
  const cuts = (it) => (Array.isArray(it.cuts) ? it.cuts : []);
  /* is a point inside the outline? */
  function inside(p, x, y) {
    let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i],
        [xj, yj] = p[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  /* the shortest distance from a point to the outline */
  function edgeDist(p, x, y) {
    let m = Infinity;
    p.forEach(([x1, y1], i) => {
      const [x2, y2] = p[(i + 1) % p.length];
      const dx = x2 - x1,
        dy = y2 - y1;
      const L = dx * dx + dy * dy;
      const t = L ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L)) : 0;
      m = Math.min(m, Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)));
    });
    return m;
  }
  /* the warnings for one piece: the usual rules for toughened glass – check with the supplier */
  function checks(it) {
    const W = n(it.w),
      H = n(it.h);
    const out = [];
    if (!W || !H) return out;
    const p = outline(it);
    const t = thick(it);
    const corners = [
      [0, 0],
      [W, 0],
      [W, H],
      [0, H],
    ];
    holes(it).forEach((h, i) => {
      const d = n(h.d),
        [x, y] = at(it, n(h.x), n(h.y));
      const nm = "Hole " + (i + 1);
      if (d == null || x == null || y == null)
        return out.push(nm + ": put in how wide it is and where its centre is.");
      if (!inside(p, x, y)) return out.push(nm + " is outside the glass.");
      if (d < t)
        out.push(`${nm} is ${d}mm across – for ${t}mm glass it needs to be at least ${t}mm.`);
      const e = Math.round(edgeDist(p, x, y) - d / 2);
      if (e < 2 * t)
        out.push(
          `${nm} is ${Math.max(0, e)}mm from the edge – keep at least ${2 * t}mm (2 × the glass thickness).`,
        );
      const cd = Math.min(...corners.map(([cx, cy]) => Math.hypot(x - cx, y - cy)));
      if (shapeKey(it) === "rect" && cd < 6 * t && e >= 2 * t)
        out.push(`${nm} is close to a corner – about ${6 * t}mm away is safer.`);
      if (d > Math.min(W, H) / 3)
        out.push(`${nm} is more than a third of the glass width – check it can be made.`);
      holes(it).forEach((h2, j) => {
        if (j <= i) return;
        const [x2, y2] = at(it, n(h2.x), n(h2.y));
        const g = Math.hypot(x - x2, y - y2) - (d + (n(h2.d) || 0)) / 2;
        if (!isNaN(g) && g < 2 * t)
          out.push(
            `Holes ${i + 1} and ${j + 1} are only ${Math.max(0, Math.round(g))}mm apart – keep at least ${2 * t}mm.`,
          );
      });
    });
    cuts(it).forEach((c, i) => {
      const w = n(c.w),
        h = n(c.h),
        [x, y] = cutAt(it, c);
      const nm = "Cut-out " + (i + 1);
      if (w == null || h == null || x == null || y == null)
        return out.push(nm + ": put in its size and where its centre is.");
      if (c.k === "nt") return;
      const pts = [
        [x - w / 2, y - h / 2],
        [x + w / 2, y - h / 2],
        [x + w / 2, y + h / 2],
        [x - w / 2, y + h / 2],
      ];
      if (!pts.every(([a, b]) => inside(p, a, b)))
        return out.push(
          nm + " goes past the edge of the glass – if it should, choose Notch in the edge.",
        );
      const e = Math.round(
        Math.min(
          ...pts.map(([a, b]) => edgeDist(p, a, b)),
          x - w / 2,
          W - x - w / 2,
          y - h / 2,
          H - y - h / 2,
        ),
      );
      if (e < 2 * t)
        out.push(
          `${nm} is ${Math.max(0, e)}mm from the edge – keep at least ${2 * t}mm (2 × the glass thickness).`,
        );
    });
    return out;
  }
  /* in words, for the order and the email */
  function words(it) {
    const k = shapeKey(it);
    const out = [];
    if (k === "rake")
      out.push(
        `Sloping top: ${it.side === "Right" ? "right" : "left"} side ${it.hs || "?"}mm, other side ${it.h}mm`,
      );
    else if (k === "arch")
      out.push(`Arched top: ${it.hs || "?"}mm at the sides, ${it.h}mm at the top of the arch`);
    else if (k === "tri")
      out.push(
        `Triangle: point ${n(it.px) == null ? "in the middle" : it.px + "mm from the left edge"}`,
      );
    else if (k === "radius")
      out.push(
        `Rounded corners (${(it.corners || "All four").toLowerCase()}): ${it.rad || "?"}mm radius`,
      );
    else if (k === "chamfer")
      out.push(
        `Corner cut off (${(it.corners || "Top left").toLowerCase()}): ${it.cc || "?"}mm along each edge`,
      );
    else if (k === "circle")
      out.push(n(it.w) === n(it.h) ? `Circle, ${it.w}mm across` : `Oval, ${it.w} x ${it.h}mm`);
    else if (k === "template") out.push("Odd shape – template / drawing to follow");
    holes(it).forEach((h, i) =>
      out.push(
        `Hole ${i + 1}: ${h.d || "?"}mm across${h.cs === "Countersunk" ? ", countersunk" : ""}, centre ${h.x || "?"}mm from the ${sideLR(it)} edge, ${h.y || "?"}mm from the ${sideTB(it)} edge`,
      ),
    );
    cuts(it).forEach((c, i) =>
      out.push(
        `Cut-out ${i + 1}: ${cutName(c.k).toLowerCase()} ${c.w || "?"} x ${c.h || "?"}mm, ${toEdge(it) ? "its nearest edge" : "centre"} ${c.x || "?"}mm from the ${sideLR(it)} edge, ${c.y || "?"}mm from the ${sideTB(it)} edge`,
      ),
    );
    return out;
  }
  const hasDrawing = (it) => shapeKey(it) !== "rect" || holes(it).length || cuts(it).length;
  /* ---- the drawing in the form ---- */
  function svg(it) {
    const W = n(it.w),
      H = n(it.h);
    if (!W || !H) return '<div class="who">Put the width and height in to see the drawing.</div>';
    const BW = 300,
      BH = 190,
      P = 26;
    const s = Math.min((BW - 2 * P) / W, (BH - 2 * P) / H);
    const ox = (BW - W * s) / 2,
      oy = (BH + H * s) / 2;
    const X = (x) => (ox + x * s).toFixed(1),
      Y = (y) => (oy - y * s).toFixed(1);
    const p = outline(it);
    const tpl = shapeKey(it) === "template";
    let g = `<polygon points="${p.map(([x, y]) => X(x) + "," + Y(y)).join(" ")}" class="glo-glass"${tpl ? ' stroke-dasharray="5 4"' : ""}/>`;
    cuts(it).forEach((c, i) => {
      const w = n(c.w),
        h = n(c.h),
        [x, y] = cutAt(it, c);
      if ([w, h, x, y].some((v) => v == null)) return;
      g += `<rect x="${X(x - w / 2)}" y="${Y(y + h / 2)}" width="${(w * s).toFixed(1)}" height="${(h * s).toFixed(1)}" class="glo-hole"/><text x="${X(x)}" y="${(+Y(y) + 3.5).toFixed(1)}" class="glo-num">C${i + 1}</text>`;
    });
    holes(it).forEach((h, i) => {
      const d = n(h.d),
        [x, y] = at(it, n(h.x), n(h.y));
      if ([d, x, y].some((v) => v == null)) return;
      g += `<circle cx="${X(x)}" cy="${Y(y)}" r="${Math.max(2, (d / 2) * s).toFixed(1)}" class="glo-hole"/><text x="${X(x)}" y="${(+Y(y) - Math.max(2, (d / 2) * s) - 3).toFixed(1)}" class="glo-num">H${i + 1}</text>`;
    });
    dims(it).forEach((d) => {
      const mx = (+X(d.x1) + +X(d.x2)) / 2,
        my = (+Y(d.y1) + +Y(d.y2)) / 2;
      g +=
        `<line x1="${X(d.x1)}" y1="${Y(d.y1)}" x2="${X(d.x2)}" y2="${Y(d.y2)}" class="glo-dl"/>` +
        (d.v
          ? `<text x="${(mx - 3).toFixed(1)}" y="${my.toFixed(1)}" class="glo-dt" transform="rotate(-90 ${(mx - 3).toFixed(1)} ${my.toFixed(1)})">${esc(String(d.t))}</text>`
          : `<text x="${mx.toFixed(1)}" y="${(my - 3).toFixed(1)}" class="glo-dt">${esc(String(d.t))}</text>`);
    });
    if (holes(it).length || cuts(it).length) {
      const [zx, zy] = at(it, 0, 0);
      g += `<circle cx="${X(zx)}" cy="${Y(zy)}" r="4" class="glo-zero"/><text x="${X(zx)}" y="${(+Y(zy) + (fromT(it) ? -8 : 14)).toFixed(1)}" class="glo-num">0</text>`;
    }
    g += `<text x="${X(W / 2)}" y="${(oy + 16).toFixed(1)}" class="glo-dim">${W} mm</text><text x="${(ox - 8).toFixed(1)}" y="${Y(H / 2)}" class="glo-dim" transform="rotate(-90 ${(ox - 8).toFixed(1)} ${Y(H / 2)})">${H} mm</text>`;
    return `<svg viewBox="0 0 ${BW} ${BH}" class="glo-svg" role="img" aria-label="Drawing of the glass">${g}</svg>`;
  }
  /* ---- the shape, holes and cut-outs part of a piece in the form ---- */
  function formHtml(it) {
    const k = shapeKey(it);
    const f = SHAPES[k].f
      .map(([key, l, o]) =>
        Array.isArray(o)
          ? `<label>${esc(l)}<select class="glo-f" data-k="${key}">${o.map((x) => `<option${x === it[key] ? " selected" : ""}>${esc(x)}</option>`).join("")}</select></label>`
          : `<label>${esc(l)}<input class="glo-f" data-k="${key}" type="number" inputmode="numeric" min="0" max="9999" value="${esc(it[key] || "")}"></label>`,
      )
      .join("");
    const num = (cls, key, v, l, ph) =>
      `<label>${l}<input class="${cls}" data-v="${key}" type="number" inputmode="numeric" min="0" max="9999" value="${esc(v == null ? "" : v)}" placeholder="${ph || ""}"></label>`;
    const LR = "From " + sideLR(it) + " edge",
      TB = "From " + sideTB(it) + " edge";
    const hl = holes(it)
      .map(
        (h, i) =>
          `<div class="glo-hrow" data-j="${i}"><b>H${i + 1}</b>${num("glo-hv", "d", h.d, "Across (mm)", "e.g. 12")}${num("glo-hv", "x", h.x, LR, "to centre")}${num("glo-hv", "y", h.y, TB, "to centre")}<label>Hole<select class="glo-hv" data-v="cs">${["Plain", "Countersunk"].map((o) => `<option${o === (h.cs || "Plain") ? " selected" : ""}>${o}</option>`).join("")}</select></label><button type="button" class="linkdanger glo-hx" aria-label="Remove hole ${i + 1}">✕</button></div>`,
      )
      .join("");
    const cl = cuts(it)
      .map(
        (c, i) =>
          `<div class="glo-crow" data-j="${i}"><b>C${i + 1}</b><label>What<select class="glo-cv" data-v="k">${CUTS.map(([ck, cn]) => `<option value="${ck}"${ck === c.k ? " selected" : ""}>${esc(cn)}</option>`).join("")}</select></label>${num("glo-cv", "w", c.w, "Width (mm)")}${num("glo-cv", "h", c.h, "Height (mm)")}${num("glo-cv", "x", c.x, LR, toEdge(it) ? "to its edge" : "to centre")}${num("glo-cv", "y", c.y, TB, toEdge(it) ? "to its edge" : "to centre")}<button type="button" class="linkdanger glo-cx" aria-label="Remove cut-out ${i + 1}">✕</button></div>`,
      )
      .join("");
    const w = checks(it);
    return `<div class="glo-shape"><div class="glo-g2"><label>Shape<select class="glo-f glo-shsel" data-k="shape">${Object.entries(
      SHAPES,
    )
      .map(
        ([sk, sv]) => `<option value="${sk}"${sk === k ? " selected" : ""}>${esc(sv.l)}</option>`,
      )
      .join("")}</select></label>${f}</div>
      <div class="glo-sub">🔩 Holes ${hl ? "" : '<span class="who">none</span>'}</div>${hl}
      <div class="glo-sub">🔌 Cut-outs for sockets, switches… ${cl ? "" : '<span class="who">none</span>'}</div>${cl}
      <div class="glo-add2"><button type="button" class="btn glo-hadd">＋ Add a hole</button><button type="button" class="btn glo-cadd">＋ Add a socket / switch cut-out</button></div>
      ${holes(it).length || cuts(it).length ? `<label class="glo-from">Measure the holes and cut-outs from the<select class="glo-f glo-fromsel glo-redraw" data-k="from">${FROM.map((o) => `<option${o === (it.from || FROM[0]) ? " selected" : ""}>${o}</option>`).join("")}</select></label>${cuts(it).length ? `<label class="glo-from">Cut-outs are measured to the<select class="glo-f glo-redraw" data-k="to">${TO.map((o) => `<option${o === (it.to || TO[0]) ? " selected" : ""}>${o}</option>`).join("")}</select></label>` : ""}<div class="who">Measure from the <b>${sideLR(it)} edge</b> and the <b>${sideTB(it)} edge</b> of the glass (the 0 on the drawing) to the <b>centre</b> of each hole${cuts(it).length ? ` and the <b>${toEdge(it) ? "nearest edge" : "centre"}</b> of each cut-out` : ""}. The drawing shows each measurement. For a socket or switch, the cut-out is the size of the back box – take the faceplate off to measure.</div>` : ""}
      <div class="glo-draw">${svg(it)}</div>
      <div class="glo-warn"${w.length ? "" : " hidden"}>${w.map((x) => `<div>⚠️ ${esc(x)}</div>`).join("")}${w.length ? '<div class="who">The usual rules for toughened glass – check with your supplier.</div>' : ""}</div></div>`;
  }
  /* read the holes and cut-outs of one piece back from the form */
  function readEl(el, it) {
    it.holes = [...el.querySelectorAll(".glo-hrow")].map((r) => {
      const o = {};
      r.querySelectorAll(".glo-hv").forEach((f) => (o[f.dataset.v] = f.value.trim()));
      return o;
    });
    it.cuts = [...el.querySelectorAll(".glo-crow")].map((r) => {
      const o = {};
      r.querySelectorAll(".glo-cv").forEach((f) => (o[f.dataset.v] = f.value.trim()));
      return o;
    });
  }
  /* redraw just the drawing and the warnings while typing */
  function refresh(el, it) {
    const d = el.querySelector(".glo-draw");
    if (d) d.innerHTML = svg(it);
    const w = checks(it);
    const box = el.querySelector(".glo-warn");
    if (box) {
      box.hidden = !w.length;
      box.innerHTML =
        w.map((x) => `<div>⚠️ ${esc(x)}</div>`).join("") +
        (w.length
          ? '<div class="who">The usual rules for toughened glass – check with your supplier.</div>'
          : "");
    }
  }
  const newHole = () => ({ d: "", x: "", y: "", cs: "Plain" });
  const newCut = () => ({ k: "s1", w: 75, h: 75, x: "", y: "" });
  const cutSize = (k) => {
    const c = CUTS.find((x) => x[0] === k);
    return c ? { w: c[2], h: c[3] } : { w: "", h: "" };
  };
  /* ---- the drawing on the PDF: in a box at x, y (top-left), w × h mm ---- */
  function pdfDraw(doc, it, bx, by, bw, bh, RED) {
    const W = n(it.w),
      H = n(it.h);
    if (!W || !H) return;
    const P = 7;
    const s = Math.min((bw - 2 * P) / W, (bh - 2 * P) / H);
    const ox = bx + (bw - W * s) / 2,
      oy = by + 2 + H * s;
    const X = (x) => ox + x * s,
      Y = (y) => oy - y * s;
    const p = outline(it);
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.35);
    if (shapeKey(it) === "template") doc.setLineDashPattern([1.5, 1.2], 0);
    p.forEach(([x, y], i) => {
      const [x2, y2] = p[(i + 1) % p.length];
      doc.line(X(x), Y(y), X(x2), Y(y2));
    });
    doc.setLineDashPattern([], 0);
    doc.setDrawColor(...RED);
    doc.setTextColor(...RED);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    cuts(it).forEach((c, i) => {
      const w = n(c.w),
        h = n(c.h),
        [x, y] = cutAt(it, c);
      if ([w, h, x, y].some((v) => v == null)) return;
      doc.rect(X(x - w / 2), Y(y + h / 2), w * s, h * s);
      doc.text("C" + (i + 1), X(x), Y(y) + 1, { align: "center" });
    });
    holes(it).forEach((h, i) => {
      const d = n(h.d),
        [x, y] = at(it, n(h.x), n(h.y));
      if ([d, x, y].some((v) => v == null)) return;
      const r = Math.max(0.6, (d / 2) * s);
      doc.circle(X(x), Y(y), r);
      doc.text("H" + (i + 1), X(x), Y(y) - r - 0.8, { align: "center" });
    });
    doc.setLineWidth(0.15);
    doc.setLineDashPattern([0.8, 0.6], 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    dims(it).forEach((d) => {
      doc.line(X(d.x1), Y(d.y1), X(d.x2), Y(d.y2));
      const mx = (X(d.x1) + X(d.x2)) / 2,
        my = (Y(d.y1) + Y(d.y2)) / 2;
      if (d.v) doc.text(String(d.t), mx - 0.8, my, { angle: 90, align: "center" });
      else doc.text(String(d.t), mx, my - 0.8, { align: "center" });
    });
    doc.setLineDashPattern([], 0);
    doc.setLineWidth(0.35);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    if (holes(it).length || cuts(it).length) {
      const [zx, zy] = at(it, 0, 0);
      doc.setFillColor(...RED);
      doc.circle(X(zx), Y(zy), 0.9, "F");
      doc.text("0", X(zx) + (fromR(it) ? 1.6 : -1.6), Y(zy) + (fromT(it) ? -1.2 : 2.6), {
        align: "center",
      });
    }
    doc.setTextColor(90, 90, 90);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(W + " mm", X(W / 2), oy + 4, { align: "center" });
    doc.text(H + " mm", ox - 2, Y(H / 2), { angle: 90, align: "center" });
  }
  /* how tall the drawing comes out in a box bw wide and at most mh tall (drawn from the top of the box) */
  function pdfHeight(it, bw, mh) {
    const W = n(it.w),
      H = n(it.h);
    if (!W || !H) return 0;
    const s = Math.min((bw - 14) / W, (mh - 14) / H);
    return H * s + 9;
  }
  return {
    thick,
    pdfHeight,
    SHAPES,
    CUTS,
    shapeKey,
    areaOne,
    checks,
    words,
    hasDrawing,
    formHtml,
    readEl,
    refresh,
    newHole,
    newCut,
    cutSize,
    pdfDraw,
  };
})();
