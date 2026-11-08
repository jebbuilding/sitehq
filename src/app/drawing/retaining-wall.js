/* ================= RETAINING WALL: a retaining wall drawn from a few sizes – section, elevation, plan, materials ================= */
import { $, esc } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
export { rwDialog, rwElev, rwNotes, rwSection };
/* The drawing tool's 🧱 Retaining wall (Build). James gives the type, length, the height of ground held back at each
   end, how far the wall stands above the high ground and what's behind it; this works out guide sizes (footing,
   toe and heel, bars, drainage) by the usual rules of thumb, draws a section, an elevation and a plan on a new page
   and lists the materials. It is NOT a structural design: over about 1 m retained, or with a drive or a building
   behind, the page says to get an engineer's design. */
const RW_TYPES = [
  ["block", "Reinforced hollow blockwork"],
  ["brick", "Blockwork faced in brick"],
  ["rc", "Reinforced concrete (L-shaped)"],
  ["sleeper", "Timber sleepers with posts"],
  ["gabion", "Gabion baskets"],
];
const RW_BEHIND = [
  ["garden", "Garden or lawn"],
  ["path", "Path or patio"],
  ["drive", "Drive or parking"],
  ["building", "A building or wall close behind"],
];
const rw50 = (v) => Math.ceil(v / 50) * 50;
/* the sizes and the materials, all in mm (quantities in their own units) */
function rwPlan(sp) {
  const type = sp.type || "block",
    L = Math.max(500, +sp.L || 6000),
    H1 = Math.max(100, +sp.H || 900),
    H2 = Math.max(100, sp.H2 == null || sp.H2 === "" ? H1 : +sp.H2),
    up = Math.max(0, +sp.up || 0),
    h = Math.max(H1, H2),
    ha = (H1 + H2) / 2,
    masonry = type === "block" || type === "brick" || type === "rc";
  const P = { type, L, H1, H2, h, ha, up, masonry, warn: [], mat: [], notes: [] };
  const m3 = (v) => Math.round(v / 1e8) / 10,
    m2 = (v) => Math.round(v / 1e5) / 10,
    m = (v) => Math.round(v / 100) / 10;
  if (masonry) {
    P.t = type === "brick" ? 330 : type === "rc" ? (h > 1200 ? 250 : 200) : 215;
    P.F = h > 1000 ? 350 : 300; /* footing thickness */
    P.top = 150; /* top of the footing below the low ground */
    P.B = Math.max(600, rw50(0.65 * (h + P.top))); /* footing width */
    P.toe = Math.max(150, rw50(P.B * 0.25));
    P.heel = P.B - P.toe - P.t;
    if (P.heel < 150) {
      P.B += 150 - P.heel;
      P.heel = 150;
    }
    P.Hs = h + up + P.top; /* stem height, top of the footing to the top of the wall */
    P.Hsa = ha + up + P.top;
    P.bars = h > 900 ? "T16 at 300 centres" : "T12 at 400 centres";
    P.barGap = h > 900 ? 300 : 400;
    const foot = L * P.B * P.F;
    P.mat.push([`Dig out (footing trench, about)`, m3(L * (P.B + 300) * (P.top + P.F)) + " m³"]);
    P.mat.push([`Concrete for the footing (${P.B} wide × ${P.F} deep)`, m3(foot) + " m³"]);
    if (type === "rc") {
      P.mat.push([`Concrete for the wall (${P.t} thick)`, m3(L * P.t * P.Hsa) + " m³"]);
      P.mat.push(["Formwork, both faces", m2(2 * L * P.Hsa) + " m²"]);
      P.mat.push([
        "Reinforcement (about 100 kg per m³)",
        Math.round(((foot + L * P.t * P.Hsa) / 1e9) * 100) + " kg",
      ]);
    } else {
      const area = L * P.Hsa;
      P.mat.push([
        `215 hollow concrete blocks (440 × 215 × 215)`,
        Math.ceil((area / 1e6) * 10 * 1.05) + "",
      ]);
      P.mat.push(["Concrete to fill the block cores", m3(area * 215 * 0.5) + " m³"]);
      if (type === "brick") {
        const vis = L * (ha + up);
        P.mat.push(["Facing bricks (60 per m² + 5%)", Math.ceil((vis / 1e6) * 63) + ""]);
        P.mat.push(["Wall ties (2.5 per m²)", Math.ceil((vis / 1e6) * 2.5) + ""]);
      }
      const nv = Math.ceil(L / P.barGap) + 1;
      P.mat.push([
        `Starter bars, ${P.bars.split(" ")[0]} bent into the footing (${nv} at ${P.Hs + 600} long)`,
        m(nv * (P.Hs + 600)) + " m",
      ]);
    }
    const nf = Math.ceil(L / 200) + 1;
    P.mat.push([`Footing bars T12 at 200 across + 3 along`, m(nf * (P.B - 100) + 3 * L) + " m"]);
    P.mat.push(["Bitumen coating on the back (2 coats)", m2(L * ha) + " m²"]);
    if (sp.coping !== false && type !== "rc")
      P.mat.push(["Coping (600 long)", Math.ceil(L / 600) + ""]);
  } else if (type === "sleeper") {
    P.t = 100; /* the sleepers, 200 × 100, laid flat on their edge */
    P.rows = Math.ceil((h + up + 100) / 200);
    P.bury = Math.max(600, rw50(h)); /* posts go into the ground as deep as the wall stands */
    P.post = P.rows * 200 - 100 + P.bury;
    P.posts = Math.ceil(L / 1200) + 1;
    const rowsA = Math.ceil((ha + up + 100) / 200);
    const perRow = Math.ceil(L / 2400);
    const postsPer = Math.max(1, Math.floor(2400 / P.post));
    P.mat.push(["Sleepers 2400 × 200 × 100 for the face", rowsA * perRow + ""]);
    P.mat.push([
      `Sleepers for the posts (${P.posts} posts, ${P.post} long)`,
      Math.ceil(P.posts / postsPer) + "",
    ]);
    P.mat.push(["Post concrete (3 bags a post)", P.posts * 3 + " bags"]);
    P.mat.push(["Timber screws 150 mm (2 a sleeper at each post)", rowsA * P.posts * 2 + ""]);
    P.mat.push(["Membrane behind the sleepers", m2(L * (ha + up)) + " m²"]);
    if (h > 1000)
      P.warn.push(
        "Sleeper walls holding back more than about 1 m aren't recommended – use blockwork or gabions.",
      );
  } else {
    /* gabions: 500-high baskets, the base course widest, stepping back at the front; the back flat against the earth */
    P.base = 200; /* the bottom of the baskets below the low ground */
    P.n = Math.ceil((h + up + P.base) / 500);
    const w0 = Math.max(1000, Math.ceil((0.6 * (h + P.base)) / 500) * 500);
    P.ws = Array.from({ length: P.n }, (_, i) => Math.max(500, w0 - 500 * i));
    P.t = w0;
    let baskets = 0,
      vol = 0;
    P.ws.forEach((w) => {
      baskets += Math.ceil(L / 1000) * (w / 500);
      vol += L * w * 500;
    });
    P.mat.push(["Gabion baskets 1000 × 500 × 500", baskets + ""]);
    P.mat.push([
      "Gabion stone 100–200 mm (about 1.6 t per m³)",
      Math.round((vol / 1e9) * 1.6 * 10) / 10 + " t",
    ]);
    P.mat.push(["Compacted hardcore base, 150 deep", m3(L * (w0 + 300) * 150) + " m³"]);
    P.mat.push(["Geotextile behind and under", m2(L * (ha + up + w0 + 500)) + " m²"]);
  }
  if (sp.drain !== false) {
    if (masonry)
      P.mat.push(["Weep holes (every 1 m, 75 above the low ground)", Math.ceil(L / 1000) + ""]);
    P.mat.push(["100 mm perforated drain pipe at the bottom, to an outfall", m(L + 1000) + " m"]);
    P.mat.push([
      "Clean drainage stone 300 wide behind (about 1.7 t per m³)",
      Math.round((L * 300 * ha * 1.7) / 1e8) / 10 + " t",
    ]);
    if (masonry) P.mat.push(["Geotextile round the drainage stone", m2(L * (ha + 600)) + " m²"]);
  }
  if (sp.behind === "drive" || sp.behind === "building")
    P.warn.push(
      (sp.behind === "drive" ? "Cars behind the wall" : "A building close behind") +
        " push on it much harder – the wall must be designed by a structural engineer.",
    );
  if (h > 1000 && type !== "sleeper")
    P.warn.push(
      "Holding back more than about 1 m: get a structural engineer to design it before building.",
    );
  if (h + up > 1000)
    P.notes.push(
      "Next to a road or path, walls over 1 m high may need planning permission (2 m elsewhere).",
    );
  P.notes.push(
    "Guide sizes only, by the usual rules of thumb – not a structural design. Check the ground when you dig.",
  );
  return P;
}
/* the drawing, in three parts the drawing tool lays out on one page: the SECTION (big scale), the ELEVATION with
   the PLAN under it (smaller scale), and the notes and materials. Each part draws from (ox, oy) with its own U
   (mm → drawing units at its scale); api.dim makes a dimension with a fixed text size. */
function rwKit(api) {
  const { pwFor } = api;
  const objs = [];
  const col = "#111111",
    lw = pwFor(5),
    thin = pwFor(2);
  const box = (x0, y0, x1, y1, o) =>
    objs.push(
      Object.assign(
        {
          t: "rect",
          a: [Math.min(x0, x1), Math.min(y0, y1)],
          b: [Math.max(x0, x1), Math.max(y0, y1)],
          c: col,
          w: thin,
        },
        o || {},
      ),
    );
  const line = (x1, y1, x2, y2, o) =>
    objs.push(Object.assign({ t: "line", a: [x1, y1], b: [x2, y2], c: col, w: thin }, o || {}));
  const text = (x, y, s, k, c) =>
    objs.push({
      t: "text",
      x,
      y,
      s,
      c: c || "#333333",
      size: Math.round(18 * (k || 0.9)),
      ly: "notes",
    });
  const earth = { hatch: "earth", w: 0.5, c: "#8a6d4b" },
    stone = { hatch: "hardcore", w: 0.5, c: "#555555" };
  return { objs, col, lw, thin, box, line, text, earth, stone, Z: 18, DS: 14 };
}
function rwSection(sp, api, ox, oy) {
  const { U, dim, pwFor } = api;
  const P = rwPlan(sp);
  const K = rwKit(api),
    { objs, lw, thin, box, line, text, earth, stone, Z, DS } = K;
  const behind = (RW_BEHIND.find((b) => b[0] === sp.behind) || RW_BEHIND[0])[1];
  const h = U(P.h),
    up = U(P.up),
    secL = U(700),
    secR = U(900);
  const xs = ox + DS * 7 + secL; /* the front face of the wall */
  const gl = oy + Z * 2.5 + DS * 4 + h + up; /* the low ground */
  text(ox, oy + Z, "SECTION", 1.1);
  let back, fb;
  const drain = sp.drain !== false;
  if (P.masonry) {
    const t = U(P.t),
      F = U(P.F),
      tp = U(P.top),
      toe = U(P.toe),
      B = U(P.B);
    const ft = gl + tp;
    fb = ft + F;
    const he = xs - toe + B;
    back = xs + t;
    box(xs - secL, gl, xs - toe, fb + U(150), earth);
    box(xs - toe, gl, xs, ft, earth);
    const dr = drain ? U(300) : 0;
    if (dr) {
      box(back, gl - h + U(250), back + dr, ft, stone);
      box(back, gl - h, back + dr, gl - h + U(250), earth);
    }
    box(back + dr, gl - h, Math.max(he, back + dr) + secR, ft, earth);
    box(he, ft, Math.max(he, back + dr) + secR, fb + U(150), earth);
    box(xs - toe, fb, he, fb + U(150), earth);
    box(xs - toe, ft, he, fb, { hatch: "concrete", w: lw });
    const wt = gl - h - up;
    if (P.type === "brick") {
      box(xs, wt, xs + U(103), ft, { hatch: "brick", w: lw });
      box(xs + U(113), wt, back, ft, { hatch: "block", w: lw });
    } else box(xs, wt, back, ft, { hatch: P.type === "rc" ? "concrete" : "block", w: lw });
    if (sp.coping !== false && P.type !== "rc")
      box(xs - U(25), wt - U(60), back + U(25), wt, { fill: "#bbbbbb", fa: 0.99 });
    /* the bars: up the wall, bent into the footing; a mat in the bottom of the footing */
    const bx = P.type === "rc" ? back - U(50) : P.type === "brick" ? xs + U(220) : xs + t / 2;
    line(bx, wt + U(75), bx, fb - U(75), { c: "#c2410c", w: pwFor(4) });
    line(bx, fb - U(75), he - U(75), fb - U(75), { c: "#c2410c", w: pwFor(4) });
    line(xs - toe + U(75), fb - U(55), he - U(75), fb - U(55), { c: "#c2410c", w: thin, dash: 1 });
    if (drain) {
      line(xs - U(30), gl - U(75), back + U(20), gl - U(75), { w: pwFor(4) });
      objs.push({
        t: "circle",
        a: [back + U(90), ft - U(110)],
        b: [back + U(200), ft],
        c: K.col,
        w: thin,
        fill: "#ffffff",
        fa: 0.99,
      });
      text(back + U(320), ft - U(40), "100 drain pipe", 0.65);
      text(xs - secL, gl - U(75) + Z * 0.3, "Weep hole", 0.65);
    }
    objs.push(
      dim([xs - toe, fb + U(150)], [he, fb + U(150)], -DS * 2),
      dim([xs, wt - U(60)], [back, wt - U(60)], DS * 1.6),
      dim([xs - toe, fb + U(150)], [xs, fb + U(150)], -DS * 4.2),
      dim([he, ft], [he, fb], -DS * 1.8),
      dim([xs - secL, gl], [xs - secL, fb], DS * 1.8),
    );
    text(
      xs - secL,
      fb + U(150) + DS * 6 + Z,
      `Footing ${P.B} wide × ${P.F} deep, toe ${P.toe}, its top ${P.top} below the ground.`,
      0.7,
    );
    text(
      xs - secL,
      fb + U(150) + DS * 6 + Z * 2.1,
      P.type === "rc"
        ? "Bars to the engineer's design."
        : `Bars ${P.bars} up the wall, bent into the footing; T12 at 200 in the footing.`,
      0.7,
      "#c2410c",
    );
    fb += U(150);
  } else if (P.type === "sleeper") {
    const bury = U(P.bury),
      face = U(P.rows * 200);
    const wt = gl + U(100) - face; /* the bottom sleeper sits 100 below the low ground */
    back = xs + U(300);
    fb = gl + bury + U(150);
    const dr = drain ? U(300) : 0;
    box(xs - secL, gl, xs, fb, earth);
    if (dr) box(back, gl - h + U(250), back + dr, gl + U(100), stone);
    box(back + dr, gl - h, back + dr + secR, fb, earth);
    if (dr) {
      box(back, gl - h, back + dr, gl - h + U(250), earth);
      box(back + U(100), gl + U(100), back + dr, fb, earth);
    }
    box(xs, gl + bury, back + U(100), fb, { hatch: "concrete", w: thin });
    box(back, gl + U(50), back + U(100), gl + bury, { hatch: "concrete", w: thin });
    box(xs + U(100), wt, back, gl + bury, { hatch: "timber", w: lw });
    for (let i = 0; i < P.rows; i++)
      box(xs, wt + U(200 * i), xs + U(100), wt + U(200 * (i + 1)), { hatch: "timber", w: lw });
    if (drain)
      objs.push({
        t: "circle",
        a: [back + U(150), gl - U(20)],
        b: [back + U(260), gl + U(90)],
        c: K.col,
        w: thin,
        fill: "#ffffff",
        fa: 0.99,
      });
    objs.push(
      dim([back, wt], [back, gl + bury], -DS * 1.8),
      dim([xs, gl], [xs, gl + bury], DS * 1.8),
    );
    text(
      xs - secL,
      fb + DS * 2 + Z,
      `${P.rows} sleepers (200 × 100) high on posts every 1200, set ${P.bury} into concrete.`,
      0.7,
    );
  } else {
    const base = U(P.base),
      w0 = U(P.ws[0]);
    back = xs + w0;
    const bot = gl + base;
    fb = bot + U(150);
    box(xs - secL, gl, xs - U(150), fb + U(150), earth);
    box(xs - U(150), fb, back + U(150), fb + U(150), earth);
    box(xs - U(150), bot, back + U(150), fb, { hatch: "hardcore", w: thin });
    box(back + U(150), gl - h, back + U(150) + secR, fb + U(150), earth);
    box(back, gl - h, back + U(150), bot, stone);
    P.ws.forEach((w, i) => {
      const y1 = bot - U(500 * i);
      box(back - U(w), y1 - U(500), back, y1, { hatch: "hardcore", w: lw });
    });
    line(back + U(8), gl - h, back + U(8), fb, { dash: 1, c: "#2f5fb3" });
    if (drain)
      objs.push({
        t: "circle",
        a: [back + U(20), bot - U(110)],
        b: [back + U(130), bot],
        c: K.col,
        w: thin,
        fill: "#ffffff",
        fa: 0.99,
      });
    objs.push(dim([back - w0, fb + U(150)], [back, fb + U(150)], -DS * 2));
    text(
      xs - secL,
      fb + U(150) + DS * 4 + Z,
      `${P.n} courses of 500-high baskets (${P.ws.join(", ")} deep) on 150 hardcore; geotextile behind.`,
      0.7,
    );
    fb += U(150);
  }
  line(xs - secL - U(80), gl, xs, gl, { w: lw });
  const right = back + (P.masonry ? Math.max(U(P.heel) - U(P.t), 0) : 0) + secR + U(300);
  line(back, gl - h, right, gl - h, { w: lw });
  text(back + U(350), gl - h - Z * 0.5, behind, 0.75);
  text(xs - secL + Z * 0.3, gl + Z * 1.3, "Low ground", 0.75);
  objs.push(
    dim([right, gl - h], [right, gl], -DS * 1.8),
    dim([xs, gl - h - up], [xs, gl], DS * 4.2),
  );
  text(right + DS * 3.4, gl - h / 2, "held back", 0.65);
  return { objs, P };
}
function rwElev(sp, api, ox, oy) {
  const { U, dim, pwFor } = api;
  const P = rwPlan(sp);
  const K = rwKit(api),
    { objs, lw, thin, box, line, text, Z, DS } = K;
  const L = U(P.L),
    xe = ox + DS * 6;
  const hMax = Math.max(P.H1, P.H2) + P.up;
  const ye = oy + Z * 2.5 + DS * 3 + U(hMax + 100);
  text(ox, oy + Z, "ELEVATION (from the low side)", 1.1);
  const course =
    P.type === "sleeper" ? 200 : P.type === "gabion" ? 500 : P.type === "brick" ? 75 : 225;
  const stepC = Math.max(course, 225);
  const below = P.type === "gabion" ? P.base : P.type === "sleeper" ? 100 : 0;
  const hAt = (fr) => P.H1 + (P.H2 - P.H1) * fr;
  /* the top: level, or stepped down by whole courses where the ground behind drops */
  const steps = P.H1 === P.H2 ? 1 : Math.max(1, Math.ceil(Math.abs(P.H2 - P.H1) / stepC));
  let prevY = null;
  for (let i = 0; i < steps; i++) {
    const a = xe + (L * i) / steps,
      b2 = xe + (L * (i + 1)) / steps;
    const hh = Math.max(hAt(i / steps), hAt((i + 1) / steps)) + P.up + below;
    const yTop = ye + U(below) - U(Math.ceil(hh / stepC) * stepC);
    line(a, yTop, b2, yTop, { w: lw });
    line(a, prevY == null ? ye : prevY, a, yTop, { w: lw });
    if (P.type === "block" || P.type === "brick")
      for (let y = ye - U(course); y > yTop + U(course) * 0.5; y -= U(course))
        line(a, y, b2, y, { w: pwFor(1), c: "#888888" });
    else if (P.type === "sleeper")
      for (let y = ye + U(100) - U(200); y > yTop + U(50); y -= U(200))
        line(a, y, b2, y, { w: thin });
    else if (P.type === "gabion") {
      for (let y = ye + U(P.base) - U(500); y > yTop + U(50); y -= U(500))
        line(a, y, b2, y, { w: thin });
      for (let k = 1; k < P.L / 1000; k++) {
        const x = xe + U(1000 * k);
        if (x > a + 1 && x < b2 - 1) line(x, yTop, x, ye, { w: thin });
      }
    }
    prevY = yTop;
  }
  line(xe + L, prevY, xe + L, ye, { w: lw });
  line(xe, ye - U(P.H1), xe + L, ye - U(P.H2), { dash: 1, c: "#8a6d4b" });
  text(xe + L * 0.35, ye - U((P.H1 + P.H2) / 2) - Z * 0.4, "ground behind", 0.65, "#8a6d4b");
  line(xe - U(300), ye, xe + L + U(300), ye, { w: lw });
  let yb = ye;
  if (P.masonry) {
    box(xe - U(100), ye + U(P.top), xe + L + U(100), ye + U(P.top + P.F), { dash: 1 });
    yb = ye + U(P.top + P.F);
    if (sp.drain !== false)
      for (let k = 0; k < Math.ceil(P.L / 1000); k++) {
        const x = xe + U(500 + 1000 * k);
        if (x < xe + L)
          box(x - U(30), ye - U(105), x + U(30), ye - U(45), { fill: "#333333", fa: 0.99 });
      }
  }
  if (P.type === "sleeper") {
    for (let k = 0; k < P.posts; k++) {
      const x = xe + Math.min(L - U(100), U(1200 * k));
      box(x, ye - U(P.h + P.up), x + U(100), ye + U(P.bury), { dash: 1 });
    }
    yb = ye + U(P.bury);
  }
  objs.push(dim([xe, yb], [xe + L, yb], -DS * 2), dim([xe, ye - U(P.H1)], [xe, ye], DS * 1.8));
  if (P.H2 !== P.H1) objs.push(dim([xe + L, ye - U(P.H2)], [xe + L, ye], -DS * 1.8));
  /* PLAN */
  const yp = yb + DS * 5 + Z * 2.5 + (P.masonry ? U(P.toe) : 0);
  text(ox, yp - Z * 1.6 - (P.masonry ? U(P.toe) : 0), "PLAN", 1.1);
  const pt = U(P.t);
  box(xe, yp, xe + L, yp + pt, {
    hatch:
      { brick: "brick", rc: "concrete", sleeper: "timber", gabion: "hardcore" }[P.type] || "block",
    w: lw,
  });
  if (P.masonry)
    box(xe - U(100), yp - U(P.toe), xe + L + U(100), yp - U(P.toe) + U(P.B), { dash: 1 });
  if (P.type === "sleeper")
    for (let k = 0; k < P.posts; k++) {
      const x = xe + Math.min(L - U(100), U(1200 * k));
      box(x, yp + pt, x + U(100), yp + pt + U(200), { hatch: "timber" });
    }
  const dy = yp + pt + U(P.masonry ? Math.max(P.heel, 150) + 150 : 350);
  if (sp.drain !== false) {
    line(xe, dy, xe + L + U(500), dy, { dash: 1, c: "#2f5fb3", w: pwFor(4) });
    text(xe + L + U(550), dy + Z * 0.3, "drain to an outfall", 0.65, "#2f5fb3");
  }
  text(xe + L + U(550), yp + pt / 2 + Z * 0.3, "wall", 0.65);
  text(xe, dy + U(250) + Z, "High side – ground held back", 0.65);
  text(xe, yp - U(P.masonry ? P.toe : 0) - Z * 0.5, "Low side", 0.65);
  objs.push(dim([xe, dy + U(250) + Z * 1.6], [xe + L, dy + U(250) + Z * 1.6], -DS * 1.6));
  return { objs, P };
}
function rwNotes(sp, api, ox, oy, width) {
  const P = rwPlan(sp);
  const K = rwKit(api),
    { objs, text, Z } = K;
  const kind = (RW_TYPES.find((x) => x[0] === P.type) || RW_TYPES[0])[1];
  const behind = (RW_BEHIND.find((b) => b[0] === sp.behind) || RW_BEHIND[0])[1];
  let yy = oy + Z;
  text(
    ox,
    yy,
    `${sp.name || "Retaining wall"} – ${kind}: ${P.L} long, holding back ${P.H1}${P.H2 !== P.H1 ? ` to ${P.H2}` : ""}${P.up ? `, standing ${P.up} above the high ground` : ""}. Behind: ${behind.toLowerCase()}.`,
    1,
  );
  P.warn.forEach((w) => {
    yy += Z * 1.4;
    text(ox, yy, "⚠ " + w, 0.9, "#b42318");
  });
  P.notes.forEach((w) => {
    yy += Z * 1.25;
    text(ox, yy, w, 0.8);
  });
  yy += Z * 1.9;
  text(ox, yy, "MATERIALS (allow extra for waste)", 1);
  const half = Math.ceil(P.mat.length / 2);
  const y0m = yy;
  P.mat.forEach(([what, q], i) => {
    yy = y0m + ((i % half) + 1) * Z * 1.2;
    text(ox + (i >= half ? width / 2 : 0), yy, `${q}  ${what}`, 0.78);
  });
  yy = y0m + (half + 1) * Z * 1.2;
  return { objs, bottom: yy };
}
/* the form */
function rwDialog(api) {
  const last = api.last || {};
  const v = (k, d) => (last[k] != null ? last[k] : d);
  openSheet(
    `<h3 id="sheettitle">🧱 Retaining wall</h3>
    <label for="rw-name">Name<input id="rw-name" maxlength="60" value="${esc(v("name", "Retaining wall"))}" placeholder="e.g. Back garden wall"></label>
    <label for="rw-type">Type of wall<select id="rw-type">${RW_TYPES.map(([k, l]) => `<option value="${k}"${k === v("type", "block") ? " selected" : ""}>${l}</option>`).join("")}</select></label>
    <label for="rw-L">Length of the wall (mm)<input id="rw-L" type="number" inputmode="numeric" value="${v("L", 6000)}"></label>
    <div class="grid2"><label for="rw-H">Ground held back – at the start (mm)<input id="rw-H" type="number" inputmode="numeric" value="${v("H", 900)}"></label><label for="rw-H2">At the other end (mm)<input id="rw-H2" type="number" inputmode="numeric" value="${v("H2", v("H", 900))}"></label></div>
    <div class="who">The height from the low ground to the high ground behind. If it's the same all along, put the same at both ends.</div>
    <label for="rw-up">Wall above the high ground (mm, 0 = level with it)<input id="rw-up" type="number" inputmode="numeric" value="${v("up", 150)}"></label>
    <label for="rw-behind">What's behind it<select id="rw-behind">${RW_BEHIND.map(([k, l]) => `<option value="${k}"${k === v("behind", "garden") ? " selected" : ""}>${l}</option>`).join("")}</select></label>
    <label class="inl"><input type="checkbox" id="rw-drain"${v("drain", true) ? " checked" : ""}> Drainage: weep holes, drainage stone and a drain pipe behind</label>
    <label class="inl"><input type="checkbox" id="rw-coping"${v("coping", true) ? " checked" : ""}> Coping on top (block and brick walls)</label>
    <div class="who" id="rw-warn"></div>
    ${formFoot(false, "Draw it")}`,
    () => {
      const sp = rwRead();
      if (!(sp.L > 0) || !(sp.H > 0)) {
        showErr("Put in the length and the height of ground held back.");
        return;
      }
      closeForm();
      api.make(sp);
    },
    "rw-L",
  );
  const rwRead = () => ({
    name: $("rw-name").value.trim() || "Retaining wall",
    type: $("rw-type").value,
    L: +$("rw-L").value || 0,
    H: +$("rw-H").value || 0,
    H2: $("rw-H2").value === "" ? +$("rw-H").value || 0 : +$("rw-H2").value || 0,
    up: Math.max(0, +$("rw-up").value || 0),
    behind: $("rw-behind").value,
    drain: $("rw-drain").checked,
    coping: $("rw-coping").checked,
  });
  /* say straight away if it needs an engineer */
  const warn = () => {
    const P = rwPlan(rwRead());
    $("rw-warn").innerHTML = P.warn
      .map((w) => `<span style="color:var(--danger)">⚠ ${esc(w)}</span>`)
      .join("<br>");
  };
  ["rw-type", "rw-L", "rw-H", "rw-H2", "rw-up", "rw-behind"].forEach(
    (id) => ($(id).oninput = $(id).onchange = warn),
  );
  warn();
}
