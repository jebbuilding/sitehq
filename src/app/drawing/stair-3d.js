/* ================= STAIR 3D: the designed stair as a 3D picture, and its cutting list ================= */
import { NPSB_RAIL, NPSB_TREADS } from "./stair-builder.js";
export { nps3Draw, nps3Model, npsbCutList };
/* James (Nov 2026): "in stairs I need to see the string, and do 3D and a cutting list like you do for cupboards –
   there are no newels either". From a stair builder design (stair-builder.js): every part – treads, risers, both
   strings, newel posts, handrail, base rail, spindles or glass or cables, landings, the spiral's column – as a solid
   in millimetres, drawn in perspective with light and shade on a canvas (no outside library, like the cupboards);
   and the cutting list for the joiner or fabricator. x runs up the first flight, y is up, z across it. A guide:
   the stair maker sets out the real stair. */
const NPS3_COL = {
  pine: "#e2c48f",
  oak: "#c19a6b",
  mdf: "#cbb89a",
  oakcap: "#c19a6b",
  grating: "#9aa1a8",
  chequer: "#a3aab1",
  concrete: "#b9b5ad",
  glass: "#bfe3f2",
};
/* a solid from its 8 corners: bottom 4 then top 4, going round the same way */
const nps3Box = (x0, y0, z0, x1, y1, z1) => [
  [x0, y0, z0],
  [x1, y0, z0],
  [x0, y1, z0],
  [x1, y1, z0],
  [x0, y0, z1],
  [x1, y0, z1],
  [x0, y1, z1],
  [x1, y1, z1],
];
/* a sloping solid (string, handrail, glass panel): along x from xa to xb, rising from ya to yb at its bottom edge,
   h deep (up), across z0–z1 */
const nps3Slope = (xa, ya, xb, yb, h, z0, z1) => [
  [xa, ya, z0],
  [xb, yb, z0],
  [xa, ya + h, z0],
  [xb, yb + h, z0],
  [xa, ya, z1],
  [xb, yb, z1],
  [xa, ya + h, z1],
  [xb, yb + h, z1],
];
/* the parts of a design, worked out by npsbCalc (k) */
function nps3Model(k) {
  const c = k.c,
    W = +c.width || 860,
    R = k.rise,
    G = k.spiral ? 0 : k.going;
  const steel = k.steel;
  const treadC = NPS3_COL[c.tread] || "#e2c48f";
  const railC =
    c.rail === "oak"
      ? "#a87b4f"
      : c.rail === "stainless"
        ? "#d6d9dc"
        : c.rail === "steel"
          ? "#3f4650"
          : "#d8b47c";
  const stringC = steel ? "#4b5563" : treadC;
  const out = [];
  const add = (pts, col, o) => out.push(Object.assign({ pts, c: col }, o || {}));
  const open1 = +c.open >= 1,
    open2 = +c.open >= 2;
  if (k.spiral) {
    /* the column, then a tread every step round it, a baluster and handrail at the outside */
    const Rr = (c.dia || 1600) / 2,
      n = k.treads,
      step = ((c.turn || 360) * Math.PI) / 180 / Math.max(1, n);
    add(nps3Box(-45, 0, -45, 45, +c.ftf + 900, 45), "#6b7280");
    for (let i = 0; i < n; i++) {
      const a0 = i * step,
        a1 = a0 + step * 1.08,
        y = (i + 1) * R;
      const P = (r, a, yy) => [Math.cos(a) * r, yy, Math.sin(a) * r];
      add(
        [
          P(60, a0, y - 40),
          P(Rr, a0, y - 40),
          P(60, a0, y),
          P(Rr, a0, y),
          P(60, a1, y - 40),
          P(Rr, a1, y - 40),
          P(60, a1, y),
          P(Rr, a1, y),
        ],
        treadC,
        { kind: "tread" },
      );
      const bx = P(Rr - 40, a0 + step / 2, 0);
      add(nps3Box(bx[0] - 10, y, bx[2] - 10, bx[0] + 10, y + 900, bx[2] + 10), railC);
      const ra = P(Rr - 40, a0, y + 900),
        rb = P(Rr - 40, a0 + step, y + 900 + R);
      add(
        [
          [ra[0], ra[1], ra[2] - 25],
          [rb[0], rb[1], rb[2] - 25],
          [ra[0], ra[1] + 50, ra[2] - 25],
          [rb[0], rb[1] + 50, rb[2] - 25],
          [ra[0], ra[1], ra[2] + 25],
          [rb[0], rb[1], rb[2] + 25],
          [ra[0], ra[1] + 50, ra[2] + 25],
          [rb[0], rb[1] + 50, rb[2] + 25],
        ],
        railC,
      );
    }
    return { parts: out, size: [c.dia, +c.ftf + 900, c.dia], centre: [0, +c.ftf / 2, 0] };
  }
  /* a flight of f treads, its first tread at step s0, laid out by place(x, y, z) */
  const flight = (f, s0, place, sides) => {
    const tread = (i) => {
      const y = (s0 + i + 1) * R,
        x0 = i * G;
      add(place(nps3Box(x0 - 16, y - (steel ? 30 : 25), 0, x0 + G, y, W)), treadC, {
        kind: "tread",
      });
      if (c.risers !== "open" && !steel && !k.spiral)
        add(place(nps3Box(x0, y - R, 6, x0 + 12, y - 25, W - 6)), treadC, { kind: "riser" });
    };
    for (let i = 0; i < f; i++) tread(i);
    /* the top riser of the flight */
    if (c.risers !== "open" && !steel)
      add(
        place(nps3Box(f * G, (s0 + f) * R, 6, f * G + 12, (s0 + f + 1) * R - 25, W - 6)),
        treadC,
        { kind: "riser" },
      );
    const L = f * G,
      ya = s0 * R,
      yb = (s0 + f) * R;
    /* the strings, both sides, sloping with the flight, 275 deep */
    [
      [-32, 0],
      [W, W + 32],
    ].forEach(([z0, z1]) =>
      add(
        place(
          nps3Slope(
            -150,
            ya - 120,
            L + 150,
            yb + R - 120 + (R * 150 * 2) / Math.max(1, G),
            275,
            z0,
            z1,
          ),
        ),
        stringC,
        { kind: "string" },
      ),
    );
    /* handrail, base rail and balustrade on each open side */
    sides.forEach((z) => {
      const zr0 = z === 0 ? -40 : W + 8,
        zr1 = zr0 + 32;
      if (c.rail !== "none")
        add(place(nps3Slope(0, ya + R + 900, L, yb + R + 900, 50, zr0, zr1)), railC, {
          kind: "rail",
        });
      if (c.bal === "glass") {
        const panels = Math.max(1, Math.ceil(Math.hypot(L, yb - ya) / 1000));
        for (let p = 0; p < panels; p++) {
          const xa = (L * p) / panels + 10,
            xb = (L * (p + 1)) / panels - 10;
          const yA = ya + R + (xa / Math.max(1, L)) * (yb - ya) + 60,
            yB = ya + R + (xb / Math.max(1, L)) * (yb - ya) + 60;
          add(place(nps3Slope(xa, yA, xb, yB, 800, zr0 + 10, zr0 + 22)), "#9fd6ee", {
            alpha: 0.45,
            kind: "glass",
          });
        }
      } else if (c.bal === "spindles" || c.bal === "metal") {
        add(place(nps3Slope(0, ya + R + 140, L, yb + R + 140, 40, zr0, zr1)), railC, {
          kind: "baserail",
        });
        for (let i = 0; i < f; i++)
          [0.25, 0.75].forEach((fr) => {
            const x = (i + fr) * G,
              yb2 = ya + R + 180 + (x / Math.max(1, L)) * (yb - ya),
              yt = ya + R + 900 + (x / Math.max(1, L)) * (yb - ya);
            add(
              place(
                nps3Box(
                  x - (c.bal === "metal" ? 7 : 20),
                  yb2,
                  zr0 + 0,
                  x + (c.bal === "metal" ? 7 : 20),
                  yt,
                  zr0 + (c.bal === "metal" ? 14 : 32),
                ),
              ),
              c.bal === "metal" ? "#3f4650" : railC,
              { kind: "spindle" },
            );
          });
      } else if (c.bal === "cable") {
        for (let h = 150; h < 900; h += 100)
          add(place(nps3Slope(0, ya + R + h, L, yb + R + h, 6, zr0 + 12, zr0 + 18)), "#9ca3af", {
            kind: "cable",
          });
      }
      /* newels at the bottom and top of the open side */
      if (!steel)
        [
          [-60, ya],
          [L - 30, yb + R],
        ].forEach(([nx, ny]) =>
          add(
            place(nps3Box(nx, Math.max(0, ny - 400), zr0 - 30, nx + 90, ny + 900 + 150, zr0 + 60)),
            railC,
            { kind: "newel" },
          ),
        );
    });
  };
  /* flights placed for the type: straight, an L turning left at a landing, a U coming back beside itself */
  const id = (pts) => pts;
  const rot = (ox, oz, ang, dy) => (pts) =>
    pts.map(([x, y, z]) => [
      ox + x * Math.cos(ang) - z * Math.sin(ang),
      y + (dy || 0),
      oz + x * Math.sin(ang) + z * Math.cos(ang),
    ]);
  const sides = open2 ? [0, W] : open1 ? [W] : [];
  const fl = k.flights;
  if (fl.length === 1) flight(fl[0], 0, id, sides);
  else {
    const a = fl[0],
      b = fl[1];
    const turn = c.type === "half" || c.type === "halfW" || c.type === "extDog";
    flight(a, 0, id, sides);
    const ly = (a + 1) * R;
    if (turn) {
      add(nps3Box(a * G, ly - 30, 0, a * G + W, ly, 2 * W + 100), treadC, { kind: "landing" });
      flight(
        b,
        a + 1,
        rot(a * G, 2 * W + 100, Math.PI, 0),
        sides.map(() => W),
      );
    } else {
      add(nps3Box(a * G, ly - 30, 0, a * G + W, ly, W), treadC, { kind: "landing" });
      flight(b, a + 1, rot(a * G, W, Math.PI / 2, 0), sides);
    }
    if (!steel)
      add(nps3Box(a * G + W - 90, 0, W - 90, a * G + W, ly + 1000, W), railC, { kind: "newel" });
  }
  const xs = out.flatMap((p) => p.pts.map((q) => q[0])),
    zs = out.flatMap((p) => p.pts.map((q) => q[2]));
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minZ = Math.min(...zs),
    maxZ = Math.max(...zs);
  return {
    parts: out,
    size: [maxX - minX, +c.ftf + 1000, maxZ - minZ],
    centre: [(minX + maxX) / 2, +c.ftf / 2, (minZ + maxZ) / 2],
  };
}
/* draw the parts in perspective, turned by yaw (radians) round the stair */
function nps3Draw(cv, M, yaw) {
  const g = cv.getContext("2d"),
    Wc = cv.width,
    Hc = cv.height;
  g.fillStyle = "#f4f1ee";
  g.fillRect(0, 0, Wc, Hc);
  const tgt = M.centre,
    S = Math.max(...M.size);
  const Rr = S * 1.9;
  const cam = [tgt[0] + Rr * Math.sin(yaw), tgt[1] + S * 0.55, tgt[2] + Rr * Math.cos(yaw)];
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
  /* projected first without scale; the whole stair is then fitted to the picture */
  const proj = (p) => {
    const v = sub(p, cam),
      z = dot(v, f);
    return [dot(v, r) / z, -dot(v, u) / z, z];
  };
  const FI = [
    [0, 1, 3, 2],
    [4, 6, 7, 5],
    [0, 4, 5, 1],
    [2, 3, 7, 6],
    [0, 2, 6, 4],
    [1, 5, 7, 3],
  ];
  const Lt = nrm([-0.4, 0.8, 0.45]);
  const faces = [];
  M.parts.forEach((o) => {
    const P = o.pts;
    const ctr = P.reduce((s, q) => [s[0] + q[0] / 8, s[1] + q[1] / 8, s[2] + q[2] / 8], [0, 0, 0]);
    FI.forEach((ix) => {
      const q = ix.map((i) => P[i]);
      let n = nrm(cross(sub(q[1], q[0]), sub(q[3], q[0])));
      const fc = q.reduce((s, v) => [s[0] + v[0] / 4, s[1] + v[1] / 4, s[2] + v[2] / 4], [0, 0, 0]);
      if (dot(n, sub(fc, ctr)) < 0) n = [-n[0], -n[1], -n[2]];
      if (dot(n, sub(cam, fc)) <= 0) return;
      const pr = q.map(proj);
      faces.push({
        pr,
        z: pr.reduce((s, v) => s + v[2], 0) / 4,
        c: o.c,
        a: o.alpha || 1,
        sh: 0.55 + 0.45 * Math.max(0, dot(n, Lt)),
      });
    });
  });
  {
    const xs = faces.flatMap((F) => F.pr.map((q) => q[0])),
      ys = faces.flatMap((F) => F.pr.map((q) => q[1]));
    const x0 = Math.min(...xs),
      x1 = Math.max(...xs),
      y0 = Math.min(...ys),
      y1 = Math.max(...ys);
    const k = 0.9 * Math.min(Wc / Math.max(1e-6, x1 - x0), Hc / Math.max(1e-6, y1 - y0));
    const ox = Wc / 2 - ((x0 + x1) / 2) * k,
      oy = Hc / 2 - ((y0 + y1) / 2) * k;
    faces.forEach((F) => (F.pr = F.pr.map((q) => [ox + q[0] * k, oy + q[1] * k, q[2]])));
  }
  faces.sort((a, b) => b.z - a.z);
  const shade = (hex, k) => {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex) || [0, "aa", "aa", "aa"];
    return `rgb(${[1, 2, 3].map((i) => Math.round(parseInt(m[i], 16) * k)).join(",")})`;
  };
  faces.forEach((F) => {
    g.beginPath();
    F.pr.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
    g.globalAlpha = F.a;
    g.fillStyle = shade(F.c, F.sh);
    g.fill();
    g.globalAlpha = Math.min(1, F.a + 0.3);
    g.strokeStyle = "rgba(0,0,0,0.25)";
    g.lineWidth = 1;
    g.stroke();
  });
  g.globalAlpha = 1;
}
/* the cutting list: [part, how many, size, note] */
function npsbCutList(k) {
  const c = k.c,
    W = +c.width || 860,
    R = k.rise,
    G = k.going;
  const rows = [];
  const add = (a, n, s2, note) => n && rows.push([a, n, s2, note || ""]);
  const T = { pine: 25, oak: 30, mdf: 25, oakcap: 15, concrete: 50, glass: 30 }[c.tread] || 25;
  if (k.spiral) {
    add("Centre column", 1, `${Math.round(+c.ftf + 150)} long`, "steel tube, to the maker's size");
    add(
      "Treads (wedge)",
      k.treads,
      `${Math.round((c.dia || 1600) / 2)} radius, ${Math.round((c.turn || 360) / Math.max(1, k.treads))}° each`,
      (NPSB_TREADS.find((x) => x[0] === c.tread) || [])[1],
    );
    add("Balusters", k.treads, "about 900 long", "");
    add("Handrail (curved)", 1, `about ${k.railLen} long`, "rolled to the diameter");
    return rows;
  }
  const flights = k.flights;
  if (k.steel) {
    flights.forEach((f, i) =>
      add(
        `Stringers, flight ${i + 1}`,
        2,
        `${Math.round(Math.hypot(f * G, f * R) + 300)} long`,
        "steel channel to the engineer's section",
      ),
    );
    add(
      "Treads",
      k.treads,
      `${W} × ${Math.round(G + 25)}`,
      (NPSB_TREADS.find((x) => x[0] === c.tread) || [])[1] + ", with nosings",
    );
    if (k.landing) add("Landing frame and floor", 1, `${k.landing} × ${W}`, "");
    add("Posts and rails", 1, `${Math.round(k.balLen)} run`, "guarding 1100 high on landings");
    add("Base plates / fixings", 2, "", "to the engineer's detail; galvanised");
    return rows;
  }
  /* the strings: one each side of each flight, 275 × 32, cut long */
  flights.forEach((f, i) =>
    add(
      `Strings, flight ${i + 1}`,
      2,
      `${Math.round(Math.hypot(f * G, f * R) + 400)} × 275 × 32`,
      i === 0 ? "wall string and outer string, housed for the treads and risers" : "",
    ),
  );
  add(
    "Treads",
    k.treads,
    `${W - 40} × ${Math.round(G + 16 + 12)} × ${T}`,
    `going ${Math.round(G)} + 16 nosing + 12 housing`,
  );
  if (c.risers !== "open")
    add("Risers", k.n, `${W - 40} × ${Math.round(R + 12)} × 9`, "plywood, housed");
  if (k.landing) add("Landing (joists and boards)", 1, `${k.landing} × ${W}`, "");
  add(
    "Newel posts",
    k.newels,
    "90 × 90 × 1400 (cut to fit)",
    "landing newels longer – to the ceiling or a drop end",
  );
  add("Newel caps", k.newels, "", "");
  if (c.rail !== "none")
    add(
      "Handrail",
      +c.open >= 2 ? 2 : 1,
      `${Math.round(k.railLen + 300)} long`,
      (NPSB_RAIL.find((x) => x[0] === c.rail) || [])[1],
    );
  if (c.bal === "spindles" || c.bal === "metal") {
    add("Base rail", +c.open >= 2 ? 2 : 1, `${Math.round(k.railLen + 300)} long`, "");
    const n = (k.q.find((x) => /^Spindles/.test(x[0])) || [0, 0])[1];
    add("Spindles", n, c.bal === "metal" ? "12 mm bar × 900" : "41 × 41 × 900", "gaps under 100");
    add("Fillets", 2, `${Math.round(k.railLen + 300)} long`, "to sit between the spindles");
  }
  if (c.bal === "glass") {
    const pq = k.q.find((x) => /^Glass panels/.test(x[0]));
    add(
      "Glass panels",
      pq ? pq[1] : 0,
      `about ${pq ? pq[0].replace(/\D+(\d+).*/, "$1") : "–"} × 850`,
      k.glassNote,
    );
  }
  add("Wedges", (k.treads + k.n) * 2, "", "two each end of every tread and riser");
  add("Glue blocks", k.treads * 3, "", "three under every tread");
  return rows;
}
