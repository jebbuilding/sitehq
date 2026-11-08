/* ================= CUPBOARD SHAPES: corner, under-stairs, eaves, over-bed, window or radiator, window seat, boot bench, TV wall ================= */
import { cb3Model, shadeHex } from "./cupboard-3d.js";
import { cbBayDoor, cbPlan } from "./cupboard-maker.js";
export { CBS_KINDS, cb3ExtFaces, cbs3Model, cbsDraw, cbsIs, cbsPlan };
/* Each shape is made of units the cupboard maker already knows (a cupboard of a size, with its bays, doors, shelves
   and plinth), placed on the wall: two towers with a bridge over a bed; towers round a window or radiator with a
   unit above and/or below; a TV wall (towers, a low media unit, a unit over the top); a window seat; a boot room
   bench (open cubbies, a back board with hooks, cubbies above); a corner (two runs meeting at a blank panel). The
   sloping ones are their own: under the stairs the top runs down along the front; under the eaves it runs down from
   front to back. Each gives the drawing (front, side section, plan), the cutting list and the 3D view. Sizes in mm. */
const CBS_KINDS = [
  ["corner", "Corner / L-shaped"],
  ["stairs", "Under the stairs"],
  ["eaves", "Eaves / loft (sloping ceiling)"],
  ["bridge", "Over the bed (bridging)"],
  ["window", "Round a window or radiator"],
  ["seat", "Window seat"],
  ["bench", "Boot room / utility bench"],
  ["tv", "TV / media wall"],
  ["chimney", "Both sides of a chimney breast"],
];
const cbsIs = (sp) => CBS_KINDS.some((k) => k[0] === sp.kind);
/* a unit: a small cupboard of its own, placed at x (from the left) and y (from the floor) */
function cbsUnit(sp, name, x, y, w, h, d, o) {
  o = o || {};
  const n = Math.max(1, o.n || 1);
  const bays =
    o.bays ||
    Array.from({ length: n }, () => ({ k: "shelves", s: o.s != null ? o.s : 2, d: o.dr || 0 }));
  return {
    name,
    x,
    y,
    w,
    h,
    d,
    plan: o.plan || "A",
    sp: Object.assign({}, sp, {
      kind: "full",
      W: w,
      H: h,
      D: d,
      n,
      bays,
      widths: "",
      doors: o.doors != null ? o.doors : sp.doors,
      openUnit: o.doors === "none",
      plinth: y === 0 && o.plinth !== false ? +sp.plinth || 0 : 0,
      bt: sp.bt,
      fillL: 0,
      fillR: 0,
      endL: false,
      endR: false,
      cornice: 0,
    }),
  };
}
function cbsUnits(sp) {
  const W = +sp.W,
    H = +sp.H,
    D = +sp.D;
  const tw = Math.min(W / 2 - 100, +sp.tw || 500);
  const mid = W - 2 * tw;
  const U = (...a) => cbsUnit(sp, ...a);
  const k = sp.kind;
  if (k === "bridge") {
    const bh = +sp.topH || 500;
    return [
      U("Left tower", 0, 0, tw, H, D, { bays: [{ k: "hang1", s: 0, d: 0 }] }),
      U("Bridge over the bed", tw, H - bh, mid, bh, D, { n: 2, s: 0, plinth: false }),
      U("Right tower", W - tw, 0, tw, H, D, { bays: [{ k: "hang1", s: 0, d: 0 }] }),
    ];
  }
  if (k === "window" || k === "tv") {
    const top = +sp.topH || 0,
      low = +sp.lowH || (k === "tv" ? 500 : 450);
    const out = [
      U(k === "tv" ? "Left tower (shelves)" : "Left tower", 0, 0, tw, H, D, {
        s: 4,
        doors: k === "tv" ? "none" : sp.doors,
      }),
      U(k === "tv" ? "Right tower (shelves)" : "Right tower", W - tw, 0, tw, H, D, {
        s: 4,
        doors: k === "tv" ? "none" : sp.doors,
      }),
    ];
    if (low)
      out.splice(
        1,
        0,
        U(
          k === "tv" ? "Media unit" : "Under the window",
          tw,
          0,
          mid,
          low,
          k === "tv" ? D : Math.min(D, 450),
          { n: Math.max(1, Math.round(mid / 600)), s: 1 },
        ),
      );
    if (top)
      out.push(
        U(k === "tv" ? "Over the TV" : "Over the window", tw, H - top, mid, top, Math.min(D, 400), {
          n: Math.max(1, Math.round(mid / 600)),
          s: 0,
          plinth: false,
        }),
      );
    return out;
  }
  if (k === "seat")
    return [U("Window seat", 0, 0, W, H, D, { n: +sp.n || 2, bays: sp.bays, doors: sp.doors })];
  if (k === "bench") {
    const bh = +sp.lowH || 450,
      topH = +sp.topH || 400,
      n = Math.max(2, Math.round(W / 400));
    return [
      U("Bench (shoe cubbies)", 0, 0, W, bh, D, { n, s: 1, doors: "none" }),
      U("Cubbies over the hooks", 0, H - topH, W, topH, Math.min(D, 320), {
        n,
        s: 0,
        doors: "none",
        plinth: false,
      }),
    ];
  }
  if (k === "chimney") {
    /* an alcove each side of the breast: a cupboard to the worktop, open shelves above */
    const aL = +sp.aL || 900,
      aR = +sp.aR || aL,
      cw = +sp.cw || 1200,
      bh = Math.max(300, (+sp.baseH || 800) - (+sp.topT || 0)),
      sd = Math.min(D, +sp.shelfD || 300);
    const side = (nm, x, w) => [
      U(nm + " cupboard", x, 0, w, bh, D, { n: w > 900 ? 2 : 1, s: 1 }),
      U(nm + " shelves", x, +sp.baseH || 800, w, H - (+sp.baseH || 800), sd, {
        s: Math.max(0, +sp.shelfN || 3),
        doors: "none",
        plinth: false,
      }),
    ];
    return side("Left alcove", 0, aL).concat(side("Right alcove", aL + cw, aR));
  }
  if (k === "corner") {
    const wB = +sp.wB || 1200;
    return [
      U("Run A", 0, 0, W, H, D, { n: +sp.n || 2, bays: sp.bays }),
      U("Run B (round the corner)", W + 300, 0, Math.max(300, wB - D), H, D, {
        n: Math.max(1, Math.round((wB - D) / 600)),
        plan: "B",
      }),
    ];
  }
  return [];
}
/* the cutting list */
function cbsPlan(sp) {
  const cut = [];
  const add = (part, qty, l, w, th, note) => {
    const ex = cut.find(
      (c) => c.part === part && c.l === Math.round(l) && c.w === Math.round(w) && c.th === th,
    );
    if (ex) ex.qty += qty;
    else cut.push({ part, qty, l: Math.round(l), w: Math.round(w), th, note: note || "" });
  };
  const t = +sp.t || 18;
  if (sp.kind === "stairs" || sp.kind === "eaves") {
    const n = Math.max(1, Math.min(6, +sp.n || 2));
    const W = +sp.W,
      D = +sp.D,
      H = +sp.H,
      lo = +sp.hLow || 900;
    if (sp.kind === "stairs") {
      /* the top runs down from H at the left to lo at the right, along the front */
      const hAt = (x) => H - ((H - lo) * x) / W;
      const ang = Math.round((Math.atan2(H - lo, W) * 180) / Math.PI);
      add("Side (high end)", 1, H, D, t, "");
      add("Side (low end)", 1, lo, D, t, "");
      for (let i = 1; i < n; i++)
        add("Division", 1, hAt((W * i) / n) - t, D, t, `top cut at ${ang}°`);
      add("Bottom", 1, W - 2 * t, D, t, "");
      add("Top (raking)", 1, Math.hypot(W, H - lo), D, t, `ends cut at ${ang}°`);
      for (let i = 0; i < n; i++)
        add(
          "Door (cut to the slope)",
          1,
          hAt((W * i) / n) - (+sp.plinth || 0),
          W / n - 3,
          t,
          `bay ${i + 1}: ${Math.round(hAt((W * i) / n))} at the high side, ${Math.round(hAt((W * (i + 1)) / n))} at the low side`,
        );
      if (+sp.plinth) add("Plinth / kickboard", 1, W, +sp.plinth, t);
      if (+sp.bt)
        add(
          "Back panel (cut to the slope)",
          1,
          W,
          H,
          +sp.bt,
          `${H} high at the high end, ${lo} at the low end`,
        );
    } else {
      /* eaves: H at the front, lo at the back (against the knee wall), the top following the roof */
      const ang = Math.round((Math.atan2(H - lo, D) * 180) / Math.PI);
      add("Side (cut to the roof slope)", n + 1, H, D, t, `${H} at the front, ${lo} at the back`);
      add("Bottom", 1, W - 2 * t, D, t, "");
      add(
        "Top (raking)",
        1,
        W - 2 * t,
        Math.hypot(D, H - lo),
        t,
        `front and back edges cut at ${ang}°`,
      );
      for (let i = 0; i < n; i++)
        add("Door", 1, H - (+sp.plinth || 0) - 3, W / n - 3, t, `bay ${i + 1}`);
      if (+sp.plinth) add("Plinth / kickboard", 1, W, +sp.plinth, t);
      if (+sp.bt) add("Back panel", 1, W, lo, +sp.bt);
    }
    add("Soft-close hinges (to buy)", n * 2, 0, 0, 0, "35 mm cup");
    return { cut, ws: [W / n], n, bays: [] };
  }
  const units = cbsUnits(sp);
  units.forEach((u) =>
    cbPlan(u.sp).cut.forEach((c) =>
      add(u.name + " – " + c.part.toLowerCase(), c.qty, c.l, c.w, c.th, c.note),
    ),
  );
  if (sp.kind === "corner")
    add("Corner blank panel", 1, +sp.H - (+sp.plinth || 0), +sp.D + 50, t, "where the runs meet");
  if (sp.kind === "bench") {
    const bh = +sp.lowH || 450,
      topH = +sp.topH || 400;
    add(
      "Back board (for the hooks)",
      1,
      +sp.W,
      +sp.H - bh - topH,
      t,
      "tongue and groove or a panel",
    );
    add("Coat hooks (to buy)", Math.max(3, Math.round(+sp.W / 250)), 0, 0, 0, "");
    add("Seat cushion (to order)", 1, +sp.W, 0, 0, "");
  }
  if (sp.kind === "seat") add("Seat cushion (to order)", 1, +sp.W, 0, 0, `${sp.D} deep`);
  if (sp.kind === "chimney" && +sp.topT)
    [
      ["Left", +sp.aL],
      ["Right", +sp.aR],
    ].forEach(([s, w]) =>
      add(
        `${s} alcove – worktop / top`,
        1,
        w,
        +sp.D + (+sp.topOver || 0),
        +sp.topT,
        `scribe to the walls; ${+sp.topOver || 0} overhang`,
      ),
    );
  return { cut, ws: units.map((u) => u.w), n: units.length, bays: [] };
}
/* the drawing: front (all the units), side section, plan, cutting list */
function cbsDraw(sp, api) {
  const { U, mkDim, dimSize, pwFor, doc } = api;
  const P = cbsPlan(sp);
  const col = "#111111",
    lw = pwFor(5),
    thin = pwFor(2);
  const objs = [];
  const rect = (x, y, w, h, o) =>
    objs.push(Object.assign({ t: "rect", a: [x, y], b: [x + w, y + h], c: col, w: lw }, o || {}));
  const line = (x1, y1, x2, y2, o) =>
    objs.push(Object.assign({ t: "line", a: [x1, y1], b: [x2, y2], c: col, w: thin }, o || {}));
  const text = (x, y, s, k) =>
    objs.push({ t: "text", x, y, s, c: "#333333", size: Math.round(18 * (k || 0.9)), ly: "notes" });
  const Z = 18;
  const gapX = Math.max(U(500), Z * 6 + dimSize() * 3);
  const W = U(+sp.W),
    H = U(+sp.H),
    D = U(+sp.D),
    T = U(+sp.t || 18),
    lo = U(+sp.hLow || 900);
  const wB = sp.kind === "corner" ? U(+sp.wB || 1200) : 0;
  const top = Math.max(U(300), Z * 4 + dimSize() * 2.6);
  const x1 = Math.max(Z * 6, (doc.w - (W + wB + (wB ? U(300) : 0) + D + gapX)) / 2),
    y1 = top,
    fl = y1 + H;
  text(x1, y1 - Z * 0.8, "FRONT" + (sp.kind === "corner" ? " (both runs, opened out)" : ""), 1.1);
  line(x1 - U(200), fl, x1 + W + wB + (wB ? U(300) : 0) + U(200), fl, { w: lw });
  /* doors on a unit's front, by bay */
  const doors = (ux, uy, uw, uh, u) => {
    const P2 = cbPlan(u.sp),
      t2 = U(u.sp.t);
    let xx = ux;
    P2.ws.forEach((w, i) => {
      const bw = U(w) + (i === 0 || i === P2.ws.length - 1 ? t2 * 1.5 : t2);
      const dt = cbBayDoor(u.sp, P2.bays[i]);
      const PLu = U(u.sp.plinth || 0);
      if (dt === "none") {
        const s = P2.bays[i].s || 0;
        for (let k = 1; k <= s; k++)
          line(
            xx + t2,
            uy + ((uh - PLu) * k) / (s + 1),
            xx + bw - t2,
            uy + ((uh - PLu) * k) / (s + 1),
            { w: thin },
          );
      } else {
        const leaves = dt === "pairs" ? 2 : 1;
        for (let k = 0; k < leaves; k++) {
          const lx = xx + (k * bw) / leaves,
            lw2 = bw / leaves;
          rect(lx + U(2), uy + U(2), lw2 - U(4), uh - PLu - U(4), { w: thin });
          const hl = leaves === 2 ? k === 0 : i % 2 === 0;
          line(hl ? lx : lx + lw2, uy, hl ? lx + lw2 : lx, uy + (uh - PLu) / 2, { dash: 1 });
          line(hl ? lx : lx + lw2, uy + uh - PLu, hl ? lx + lw2 : lx, uy + (uh - PLu) / 2, {
            dash: 1,
          });
        }
      }
      xx += bw;
    });
    if (u.sp.plinth)
      line(ux, uy + uh - U(u.sp.plinth), ux + uw, uy + uh - U(u.sp.plinth), { w: thin });
  };
  if (sp.kind === "stairs") {
    /* the outline: high at the left, down along the stair line */
    objs.push({ t: "line", a: [x1, fl - H], b: [x1 + W, fl - lo], c: col, w: lw });
    line(x1, fl - H, x1, fl, { w: lw });
    line(x1 + W, fl - lo, x1 + W, fl, { w: lw });
    /* the stairs above, for show */
    for (let k = 0; k < 6; k++) {
      const sx = x1 + (W * k) / 6;
      const sy = fl - H + ((H - lo) * k) / 6 - U(40);
      line(sx, sy, sx + W / 6, sy, { w: pwFor(1) });
      line(sx + W / 6, sy, sx + W / 6, sy + (H - lo) / 6, { w: pwFor(1) });
    }
    const n = Math.max(1, Math.min(6, +sp.n || 2));
    for (let i = 0; i < n; i++) {
      const a = x1 + (W * i) / n,
        b2 = x1 + (W * (i + 1)) / n;
      const ha = H - ((H - lo) * i) / n,
        hb = H - ((H - lo) * (i + 1)) / n;
      const PL = U(+sp.plinth || 0);
      objs.push({
        t: "line",
        a: [a + U(3), fl - ha + U(3)],
        b: [b2 - U(3), fl - hb + U(3)],
        c: col,
        w: thin,
      });
      line(a + U(3), fl - ha + U(3), a + U(3), fl - PL, { w: thin });
      line(b2 - U(3), fl - hb + U(3), b2 - U(3), fl - PL, { w: thin });
      line(a + U(3), fl - PL, b2 - U(3), fl - PL, { w: thin });
      line(a + U(30), fl - (ha + hb) / 2, a + U(30), fl - (ha + hb) / 2 + U(120), { w: pwFor(4) });
    }
    objs.push(
      mkDim([x1, fl - H], [x1, fl], dimSize() * 2.2),
      mkDim([x1 + W, fl - lo], [x1 + W, fl], -dimSize() * 2.2),
    );
  } else if (sp.kind === "eaves") {
    rect(x1, fl - H, W, H);
    const n = Math.max(1, Math.min(6, +sp.n || 2));
    const PL = U(+sp.plinth || 0);
    for (let i = 0; i < n; i++) {
      const a = x1 + (W * i) / n;
      rect(a + U(2), fl - H + U(2), W / n - U(4), H - PL - U(4), { w: thin });
      line(a + W / n - U(40), fl - H / 2 - U(60), a + W / n - U(40), fl - H / 2 + U(60), {
        w: pwFor(4),
      });
    }
    if (PL) line(x1, fl - PL, x1 + W, fl - PL, { w: thin });
    objs.push(mkDim([x1, fl - H], [x1, fl], dimSize() * 2.2));
  } else {
    cbsUnits(sp).forEach((u) => {
      const ux = x1 + U(u.x),
        uy = fl - U(u.y) - U(u.h),
        uw = U(u.w),
        uh = U(u.h);
      rect(ux, uy, uw, uh);
      doors(ux, uy, uw, uh, u);
      text(ux + U(20), uy + Z, u.name, 0.7);
    });
    if (sp.kind === "bench") {
      const bh = U(+sp.lowH || 450),
        topH = U(+sp.topH || 400);
      rect(x1, fl - H + topH, W, H - topH - bh, { w: thin, fill: "#f4f4f4" });
      const hy = fl - H + topH + U(250);
      const nh = Math.max(3, Math.round(+sp.W / 250));
      for (let k = 0; k < nh; k++)
        objs.push({
          t: "circle",
          a: [x1 + (W * (k + 0.5)) / nh - U(25), hy - U(25)],
          b: [x1 + (W * (k + 0.5)) / nh + U(25), hy + U(25)],
          c: col,
          w: thin,
        });
      rect(x1, fl - bh - U(80), W, U(80), { w: thin, fill: "#d9c7a6" });
    }
    if (sp.kind === "seat") rect(x1, fl - H - U(80), W, U(80), { w: thin, fill: "#d9c7a6" });
    if (sp.kind === "chimney") {
      const aL = U(+sp.aL),
        cw = U(+sp.cw),
        tt = U(+sp.topT || 0),
        bh = U(+sp.baseH || 800);
      rect(x1 + aL, fl - H, cw, H, { w: thin, fill: "#eeeeee" });
      text(x1 + aL + U(60), fl - H / 2, "Chimney breast", 0.8);
      if (tt)
        [
          [0, +sp.aL],
          [+sp.aL + +sp.cw, +sp.aR],
        ].forEach(([x, w]) => rect(x1 + U(x), fl - bh, U(w), tt, { w: thin, fill: "#d9c7a6" }));
      objs.push(mkDim([x1 + aL, fl - H], [x1 + aL + cw, fl - H], -dimSize() * 1.6));
    }
    if (sp.kind === "window") {
      const tw = U(Math.min(+sp.W / 2 - 100, +sp.tw || 500));
      const top = U(+sp.topH || 0),
        low = U(+sp.lowH || 450);
      rect(x1 + tw + U(80), fl - H + top + U(150), W - 2 * tw - U(160), H - top - low - U(300), {
        w: thin,
        dash: 1,
      });
      text(x1 + tw + U(100), fl - H + top + U(150) + Z, sp.radiator ? "Radiator" : "Window", 0.8);
    }
    if (sp.kind === "bridge") text(x1 + U(+sp.tw || 500) + U(100), fl - U(300), "Bed", 0.8);
    if (sp.kind === "tv") {
      const tw = U(Math.min(+sp.W / 2 - 100, +sp.tw || 500));
      const low = U(+sp.lowH || 500);
      rect(x1 + W / 2 - U(600), fl - low - U(800), U(1200), U(700), { w: thin, fill: "#333333" });
      text(x1 + W / 2 - U(100), fl - low - U(450), "TV", 0.8);
      void tw;
    }
    objs.push(mkDim([x1, fl - H], [x1, fl], dimSize() * 2.2));
  }
  objs.push(mkDim([x1, fl], [x1 + W, fl], dimSize() * 2.2));
  if (wB) objs.push(mkDim([x1 + W + U(300), fl], [x1 + W + U(300) + wB, fl], dimSize() * 2.2));
  /* side section */
  const x3 = x1 + W + wB + (wB ? U(300) : 0) + gapX;
  text(x3, y1 - Z * 0.8, "SIDE SECTION", 1.1);
  line(x3 - U(60), y1 - U(100), x3 - U(60), fl, { w: lw });
  line(x3 - U(60), fl, x3 + D + U(300), fl, { w: lw });
  if (sp.kind === "eaves") {
    /* the roof slope: high at the front, low at the back */
    objs.push({ t: "line", a: [x3, fl - lo], b: [x3 + D, fl - H], c: col, w: lw });
    line(x3, fl - lo, x3, fl, { w: lw });
    line(x3 + D, fl - H, x3 + D, fl, { w: lw });
    objs.push({
      t: "line",
      a: [x3 - U(300), fl - lo + U(200)],
      b: [x3 + D + U(300), fl - H - U(200)],
      c: "#999999",
      w: thin,
      dash: 1,
    });
    objs.push(
      mkDim([x3, fl], [x3 + D, fl], dimSize() * 2.2),
      mkDim([x3 + D, fl - H], [x3 + D, fl], -dimSize() * 2.2),
    );
    text(x3 - U(60), fl - lo - Z * 0.6, "Knee wall " + (+sp.hLow || 900), 0.8);
  } else {
    const deepest =
      sp.kind === "stairs" || sp.kind === "eaves" ? [{ y: 0, h: +sp.H, d: +sp.D }] : cbsUnits(sp);
    deepest.forEach((u) => rect(x3, fl - U(u.y) - U(u.h), U(u.d), U(u.h), { w: thin }));
    objs.push(mkDim([x3, fl], [x3 + D, fl], dimSize() * 2.2));
  }
  /* plan */
  const y4 = fl + Z * 4 + dimSize() * 3;
  text(x1 - Z * 4.5, y4 + Z, "PLAN", 1.1);
  line(x1 - U(200), y4, x1 + W + U(200), y4, { w: lw });
  if (sp.kind === "corner") {
    rect(x1, y4, W, D);
    line(x1 + W, y4, x1 + W, y4 + D + wB, { w: lw });
    rect(x1 + W - D, y4 + D, D, wB - D);
    rect(x1 + W - D, y4, D, D, { w: thin, fill: "#eeeeee" });
    text(x1 + W - D + U(20), y4 + D / 2, "blank", 0.7);
  } else if (sp.kind === "stairs" || sp.kind === "eaves") rect(x1, y4, W, D);
  else
    cbsUnits(sp).forEach((u) =>
      rect(x1 + U(u.x), y4, U(u.w), U(u.d), { w: u.y > 0 ? thin : lw, dash: u.y > 0 ? 1 : 0 }),
    );
  if (sp.kind === "chimney") rect(x1 + U(+sp.aL), y4, U(+sp.cw), D, { w: lw, fill: "#eeeeee" });
  /* title and cutting list */
  const yt = y4 + D + wB + Z * 3;
  const kind = (CBS_KINDS.find((k) => k[0] === sp.kind) || ["", ""])[1];
  text(
    x1,
    yt,
    `${sp.name || "Cupboard"} – ${kind}: ${sp.W} wide × ${sp.H} high × ${sp.D} deep${sp.kind === "corner" ? `, second run ${sp.wB}` : ""}${sp.kind === "stairs" ? `, ${sp.hLow} at the low end` : ""}${sp.kind === "eaves" ? `, ${sp.hLow} at the back` : ""}. Boards ${sp.t} mm.`,
    1,
  );
  let yy = yt + Z * 2;
  text(x1, yy, "CUTTING LIST (length × width × thickness, mm)", 1);
  const half = P.cut.length > 9 ? Math.ceil(P.cut.length / 2) : P.cut.length;
  const y0c = yy;
  P.cut.forEach((c, i) => {
    yy = y0c + ((i % half) + 1) * Z * 1.25;
    text(
      x1 + (i >= half ? Z * 40 : 0),
      yy,
      `${c.qty} × ${c.part}: ${c.th ? `${c.l} × ${c.w} × ${c.th}` : `${c.l} long`}${c.note ? "  (" + c.note + ")" : ""}`,
      0.8,
    );
  });
  objs.forEach((o) => Object.keys(o).forEach((k) => o[k] === undefined && delete o[k]));
  return { objs, cut: P.cut };
}
/* 3D: every unit (corner run B turned round the corner); the sloping ones as shaped carcasses */
function cbs3Model(sp, look, open) {
  const out = [];
  const t = +sp.t || 18;
  if (sp.kind === "stairs" || sp.kind === "eaves") {
    const n = Math.max(1, Math.min(6, +sp.n || 2));
    const W = +sp.W,
      D = +sp.D,
      H = +sp.H,
      lo = +sp.hLow || 900;
    /* bays as cupboards of their own height (stepped under the stairs; the eaves top slopes in 4 steps) */
    if (sp.kind === "stairs") {
      for (let i = 0; i < n; i++) {
        const h = Math.round(H - ((H - lo) * (i + 0.5)) / n);
        const u = cbsUnit(sp, "", 0, 0, W / n, h, D, { s: 1, doors: "hinged" });
        cb3Model(u.sp, look, open).forEach((o) => {
          const b = o.b.slice();
          b[0] += (W * i) / n;
          b[3] += (W * i) / n;
          out.push(
            Object.assign({}, o, {
              b,
              rot: o.rot ? Object.assign({}, o.rot, { px: o.rot.px + (W * i) / n }) : o.rot,
            }),
          );
        });
      }
      /* the stair line over the top */
      out.push({
        ext: {
          pts: [
            [0, H],
            [W, lo],
            [W, lo + 60],
            [0, H + 60],
          ],
          z0: -10,
          z1: D + 40,
        },
        c: shadeHex(look.wall || "#ece9e4", 0.85),
      });
    } else {
      const u = cbsUnit(sp, "", 0, 0, W, lo, D, { n, s: 0, doors: "hinged" });
      cb3Model(u.sp, look, open).forEach((o) => out.push(o));
      /* the part above the knee wall, sloping up to the front */
      out.push({
        extZ: {
          pts: [
            [0, lo],
            [D, lo],
            [D, H],
          ],
          x0: 0,
          x1: W,
        },
        c: look.door,
      });
      out.push({
        extZ: {
          pts: [
            [-10, lo + 30],
            [D + 300, H + 120],
            [D + 300, H + 170],
            [-10, lo + 80],
          ],
          x0: -200,
          x1: W + 200,
        },
        c: shadeHex(look.wall || "#ece9e4", 0.85),
      });
    }
    return out;
  }
  cbsUnits(sp).forEach((u) => {
    cb3Model(u.sp, look, open).forEach((o) => {
      let b = o.b.slice();
      if (u.plan === "B") {
        /* run B: along the side wall, coming forward from the corner */
        const W = +sp.W,
          D = +sp.D;
        b = [W - b[5], b[1], D + b[0], W - b[2], b[4], D + b[3]];
        out.push(Object.assign({}, o, { b, rot: null }));
        return;
      }
      b[0] += u.x;
      b[3] += u.x;
      b[1] += u.y;
      b[4] += u.y;
      out.push(
        Object.assign({}, o, {
          b,
          rot: o.rot ? Object.assign({}, o.rot, { px: o.rot.px + u.x }) : o.rot,
        }),
      );
    });
  });
  if (sp.kind === "bench") {
    const bh = +sp.lowH || 450,
      topH = +sp.topH || 400;
    out.push({ b: [0, bh, 0, +sp.W, +sp.H - topH, t], c: look.door });
    out.push({ b: [0, bh, 0, +sp.W, bh + 70, +sp.D], c: "#c9a477" });
    const nh = Math.max(3, Math.round(+sp.W / 250));
    for (let k = 0; k < nh; k++)
      out.push({
        b: [
          (+sp.W * (k + 0.5)) / nh - 12,
          bh + 600,
          t,
          (+sp.W * (k + 0.5)) / nh + 12,
          bh + 640,
          t + 70,
        ],
        c: "#222222",
        top: 1,
      });
  }
  if (sp.kind === "seat") out.push({ b: [0, +sp.H, 0, +sp.W, +sp.H + 80, +sp.D], c: "#c9a477" });
  if (sp.kind === "chimney") {
    const aL = +sp.aL || 900,
      cw = +sp.cw || 1200,
      bh = +sp.baseH || 800,
      tt = +sp.topT || 0;
    out.push({
      b: [aL, 0, 0, aL + cw, +sp.H + 200, +sp.D + 10],
      c: shadeHex(look.wall || "#ece9e4", 0.92),
    });
    if (tt)
      [
        [0, aL],
        [aL + cw, +sp.aR || aL],
      ].forEach(([x, w]) =>
        out.push({
          b: [x, bh - tt, 0, x + w, bh, +sp.D + (+sp.topOver || 0)],
          c: look.top || "#c9a477",
        }),
      );
  }
  if (sp.kind === "corner")
    out.push({ b: [+sp.W - +sp.D, 0, 0, +sp.W, +sp.H, +sp.D], c: look.door });
  return out;
}

/* the faces of a shape pushed out from an outline: ext = an outline in x/y pushed from z0 to z1; extZ = an outline
   in z/y pushed from x0 to x1 */
function cb3ExtFaces(o) {
  const e = o.ext || o.extZ;
  const A = e.pts.map(([a, y]) => (o.ext ? [a, y, e.z0] : [e.x0, y, a])),
    B = e.pts.map(([a, y]) => (o.ext ? [a, y, e.z1] : [e.x1, y, a]));
  return [A, B.slice().reverse()].concat(
    e.pts.map((_, i) => {
      const j = (i + 1) % e.pts.length;
      return [A[i], A[j], B[j], B[i]];
    }),
  );
}
