/* ================= CUPBOARD MAKER: fitted cupboards and wardrobes drawn to scale, with a cutting list ================= */
import { $, esc } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { CB3_COLS } from "./cupboard-3d.js";
import { CBA_KINDS, cbaHasBase } from "./cupboard-alcove.js";
import { CBP_DOOR, CBP_KIND, cbpPicker } from "./cupboard-pics.js";
import { CBS_KINDS } from "./cupboard-shapes.js";
export { CB_BAYS, CB_DOORS, cbBayDoor, cbDraw, cbMakeDialog, cbPlan };
/* A form for the overall size, board thicknesses, plinth, bays (equal or given widths) and what's in each bay
   (shelves, hanging – single or double – drawers, or a mix), and the doors (none, hinged, pairs or sliding). It
   draws a new page in the drawing: the front with doors (hinge side shown), the front with the doors off (inside),
   the plan and a side section, all dimensioned, plus the cutting list (every board with its size and how many).
   Everything is ordinary drawing lines and text, so it can be changed with the other tools. Sizes in mm. */
const CB_BAYS = [
  ["shelves", "Shelves"],
  ["hang1", "Hanging (one rail)"],
  ["hang2", "Double hanging (two rails)"],
  ["drawers", "Drawers, shelves above"],
  ["drhang", "Drawers, hanging above"],
  ["desk", "Dressing table / desk gap"],
  ["basewall", "Cupboard below, open, cupboard above"],
];
const CB_DOORS = [
  ["hinged", "Hinged – one door per bay"],
  ["pairs", "Hinged – a pair of doors per bay"],
  ["sliding", "Sliding doors"],
  ["none", "No doors (open)"],
];
/* a bay's doors: its own choice, or the cupboard's (sliding doors go across the whole front) */
const CB_BAYDOORS = [
  ["", "Same as the rest"],
  ["hinged", "One door"],
  ["pairs", "A pair of doors"],
  ["glass", "Glazed door"],
  ["mirror", "Mirror door"],
  ["none", "Open – no door"],
];
const CB_HANDLES = [
  ["bar", "Bar handles – steel"],
  ["black", "Bar handles – black"],
  ["knob", "Knobs"],
  ["none", "Handle-less (push to open)"],
];
const CB_EDGES = [
  ["1 mm ABS edging", "1 mm ABS edging"],
  ["2 mm ABS on doors and fronts, 1 mm on the carcass", "2 mm ABS on fronts, 1 mm on the carcass"],
  ["0.4 mm ABS edging", "0.4 mm ABS edging"],
  ["Real wood veneer edging", "Real wood veneer edging"],
  ["No edging (painted MDF)", "None – painted MDF"],
];
const cbBayDoor = (sp, b) => (sp.doors === "sliding" ? "sliding" : (b && b.door) || sp.doors);
/* numbers typed with commas, e.g. "300, 700, 1100" */
const cbNums = (s) =>
  String(s || "")
    .split(/[ ,;]+/)
    .map(Number)
    .filter((x) => x > 0);
/* where everything goes in one bay, in mm up from the floor: drawers, shelves, fixed shelves (top box, desk top,
   worktop), rails, and the door zones (each door covers one zone; a top box splits the door) */
function cbBayLayout(sp, b, P) {
  const t = sp.t,
    st = P.sht,
    iB = P.iB,
    iT = P.iT,
    PL = sp.plinth || 0,
    H = sp.H;
  const L = { drawers: [], shelves: [], fixed: [], rails: [], zones: [], labels: [] };
  let lo = iB,
    hi = iT;
  const top = Math.max(0, +b.top || 0);
  let split = 0;
  if (top && iT - top - st > iB + 300) {
    split = iT - top - st / 2;
    L.fixed.push({ y: split, part: "Fixed shelf", why: "under the top box" });
    hi = split - st / 2;
  }
  const dh = Math.max(80, +b.dh || P.drH);
  const drawers = (n) => {
    for (let k = 0; k < n; k++) {
      L.drawers.push({ y: lo, h: dh });
      lo += dh;
    }
  };
  const shelves = (a, z, n) => {
    const hand = cbNums(b.sh).filter((y) => y > a + st && y < z - st);
    if (hand.length) hand.forEach((y) => L.shelves.push(y));
    else for (let k = 1; k <= n; k++) L.shelves.push(a + ((z - a) * k) / (n + 1));
  };
  const hang = (a, z, two) => {
    /* the rail hangs 60 under a hat shelf; with a top box the box's shelf is the hat shelf */
    let hat = split ? z + st / 2 : z - 300;
    if (+b.rail > a + 200 && +b.rail < z - 40) hat = +b.rail + 60;
    if (!split || hat < z - 1) L.fixed.push({ y: hat, part: "Hat shelf", why: "" });
    L.rails.push(hat - 60);
    if (two) {
      const mid = a + (hat - a) / 2;
      L.fixed.push({ y: mid, part: "Hat shelf", why: "lower rail" });
      L.rails.push(mid - 60);
    }
  };
  const door = (y0, y1) => L.zones.push({ y0, y1 });
  if (b.k === "desk") {
    /* a dressing table / desk: a top at 750, a shallow drawer under it, open knee space, shelves above */
    const dt = Math.min(hi - 200, 750);
    L.fixed.push({ y: dt - st / 2, part: "Desk / dressing table top", why: "" });
    L.drawers.push({ y: dt - st - 130, h: 130 });
    L.labels.push({ y: (iB + dt - st - 130) / 2, s: "knee space" });
    shelves(dt, hi, b.s == null ? 1 : b.s);
  } else if (b.k === "basewall") {
    /* a cupboard to 900, open, a cupboard from 1450 up */
    const lowTop = Math.min(900, lo + (hi - lo) * 0.4),
      upBot = Math.max(lowTop + 300, Math.min(1450, hi - 300));
    L.fixed.push({ y: lowTop, part: "Fixed shelf", why: "top of the cupboard below" });
    L.fixed.push({ y: upBot, part: "Fixed shelf", why: "bottom of the cupboard above" });
    drawers(b.d || 0);
    shelves(lo, lowTop - st / 2, 1);
    shelves(upBot + st / 2, hi, b.s == null ? 1 : b.s);
    L.labels.push({ y: (lowTop + upBot) / 2, s: "open" });
    door(PL, lowTop + st / 2);
    door(upBot - st / 2, split ? split : H);
  } else {
    drawers(b.d || 0);
    if (b.k === "shelves" || b.k === "drawers") shelves(lo, hi, b.s || 0);
    else if (b.k === "hang1" || b.k === "drhang") hang(lo, hi, false);
    else if (b.k === "hang2") hang(lo, hi, true);
    door(PL, split ? split : H);
  }
  if (split) door(split, H);
  L.split = split;
  return L;
}
/* the boards to cut, and where everything goes, from the sizes */
function cbPlan(sp) {
  const t = sp.t,
    bt = sp.bt,
    dt = Math.max(6, +sp.dt || t),
    sht = Math.max(6, +sp.sht || t);
  const n = Math.max(1, Math.min(8, sp.n | 0));
  const inner = sp.W - 2 * t - (n - 1) * t;
  const src = sp.bays || [];
  /* bay widths (inside sizes): typed on a bay, or in the list; the rest share what's left evenly */
  let ws = cbNums(sp.widths);
  const hand = Array.from({ length: n }, (_, i) => Math.max(0, +(src[i] && src[i].w) || 0));
  if (hand.some((x) => x > 0)) {
    const fixed = hand.reduce((a, x) => a + x, 0),
      free = hand.filter((x) => !x).length;
    if (free && inner - fixed > free * 100)
      ws = hand.map((x) => x || Math.round(((inner - fixed) / free) * 10) / 10);
    else if (!free && Math.abs(fixed - inner) <= 2) ws = hand;
    else ws = [];
  }
  if (ws.length !== n || Math.abs(ws.reduce((a, b) => a + b, 0) - inner) > 2)
    ws = Array.from({ length: n }, () => Math.round((inner / n) * 10) / 10);
  const ih = sp.H - sp.plinth - 2 * t; /* inside height */
  const sd = sp.D - bt; /* shelf depth up to the back panel */
  const P = { ws, ih, sd, n, drH: 180, dt, sht, iB: (sp.plinth || 0) + t, iT: sp.H - t };
  const bays = ws.map((w, i) =>
    Object.assign({ w }, src[i] || { k: "shelves", s: 3, d: 0 }, { w }),
  );
  bays.forEach((b) => (b.L = cbBayLayout(sp, b, P)));
  const cut = [];
  const add = (part, qty, l, w, th, note) => {
    const ex = cut.find(
      (c) =>
        c.part === part &&
        c.l === Math.round(l) &&
        c.w === Math.round(w) &&
        c.th === th &&
        c.note === (note || ""),
    );
    if (ex) ex.qty += qty;
    else cut.push({ part, qty, l: Math.round(l), w: Math.round(w), th, note: note || "" });
  };
  add("Side", 2, sp.H, sp.D, t);
  add("Top", 1, sp.W - 2 * t, sp.D, t);
  add("Bottom", 1, sp.W - 2 * t, sp.D, t);
  if (n > 1) add("Division", n - 1, ih, sp.D - bt, t);
  if (sp.plinth) add("Plinth / kickboard", 1, sp.W, sp.plinth, t);
  if (bt)
    add(
      "Back panel",
      1,
      sp.H - sp.plinth,
      sp.W,
      bt,
      sp.backFix === "pinned"
        ? "pinned and glued onto the back"
        : sp.backFix === "screwed"
          ? "screwed onto the back"
          : "fits into a groove",
    );
  const gap = 3;
  let fronts = 0,
    doorsN = 0,
    hinges = 0;
  const hingeN = (h) => (h > 1600 ? 4 : h > 900 ? 3 : 2);
  bays.forEach((b, i) => {
    const bay = "bay " + (i + 1);
    const L = b.L;
    if (L.shelves.length) add("Shelf", L.shelves.length, b.w - 2, sd - 20, sht, bay);
    L.fixed.forEach((f) =>
      add(
        f.part,
        1,
        b.w,
        sd - (f.part === "Desk / dressing table top" ? 0 : 20),
        sht,
        bay + (f.why ? "; " + f.why : ""),
      ),
    );
    if (L.rails.length) add("Hanging rail", L.rails.length, b.w - 4, 0, 0, "oval rail, " + bay);
    L.drawers.forEach((d) => {
      add("Drawer front", 1, b.w - gap, d.h - gap, dt, bay + "; drawer box to suit the runners");
      fronts++;
    });
    /* doors: one (or a pair) per zone */
    const dtp = cbBayDoor(sp, b);
    if (dtp !== "sliding" && dtp !== "none")
      L.zones.forEach((z) => {
        const h = z.y1 - z.y0 - gap,
          w1 = b.w + t - gap;
        if (dtp === "pairs") {
          add("Door", 2, h, (b.w + t) / 2 - gap, dt, bay);
          doorsN += 2;
          hinges += 2 * hingeN(h);
        } else {
          if (dtp === "glass") {
            add("Glazed door frame", 1, h, w1, dt, bay + "; rebate for the glass");
            add("Glass panel (toughened, to order)", 1, h - 140, w1 - 140, 4, bay);
          } else if (dtp === "mirror") {
            add("Mirror door (backing board)", 1, h, w1, dt, bay + "; mirror glued on");
            add("Mirror glass (safety-backed, to order)", 1, h - 4, w1 - 4, 4, bay);
          } else add("Door", 1, h, w1, dt, bay);
          doorsN++;
          hinges += hingeN(h);
        }
      });
    /* fittings */
    if (b.shoe) add("Shoe shelf (angled)", 3, b.w - 2, 300, sht, bay + "; on angled bearers");
    if (b.trouser) add("Trouser pull-out (to buy)", 1, b.w, 0, 0, bay);
    if (b.led) add("LED strip and driver (to buy)", 1, b.w, 0, 0, bay + "; under the top");
  });
  /* finishing: fillers to the walls, end panels, cornice */
  const fL = +sp.fillL || 0,
    fR = +sp.fillR || 0;
  if (fL) add("Filler", 1, sp.H + (+sp.cornice || 0), fL + 20, t, "left; scribe to the wall");
  if (fR) add("Filler", 1, sp.H + (+sp.cornice || 0), fR + 20, t, "right; scribe to the wall");
  if (sp.endL) add("End panel", 1, sp.H, sp.D + dt, t, "left; covers the side");
  if (sp.endR) add("End panel", 1, sp.H, sp.D + dt, t, "right; covers the side");
  if (+sp.cornice)
    add(
      "Cornice",
      1,
      sp.W + fL + fR + (sp.endL ? t : 0) + (sp.endR ? t : 0),
      +sp.cornice,
      t,
      "scribe to the ceiling",
    );
  /* bought fittings */
  if (hinges)
    add(
      sp.handle === "none"
        ? "Soft-close hinges, push-to-open (to buy)"
        : "Soft-close hinges (to buy)",
      hinges,
      0,
      0,
      0,
      "35 mm cup",
    );
  const dh = sp.H - sp.plinth - gap;
  let slides = 0;
  if (sp.doors === "sliding") {
    slides = Math.max(2, Math.min(4, n));
    add(
      sp.slideMirror ? "Sliding door (mirror)" : "Sliding door",
      slides,
      dh - 40,
      (sp.W - 2 * t) / slides + 40,
      dt,
      "overlaps 40 mm; to suit the track",
    );
  }
  const hn = doorsN + fronts + slides;
  if (hn)
    add(
      sp.handle === "none"
        ? "Push-to-open catches (to buy)"
        : sp.handle === "knob"
          ? "Knobs (to buy)"
          : sp.handle === "black"
            ? "Bar handles, black (to buy)"
            : "Bar handles, steel (to buy)",
      sp.handle === "none" ? doorsN + fronts : hn,
      0,
      0,
      0,
      slides ? "sliding doors take flush pulls" : "",
    );
  return Object.assign(P, { bays, cut });
}
/* the drawing: four views and the cutting list, as ordinary drawing objects */
function cbDraw(sp, api) {
  const { U, mkDim, dimSize, pwFor, doc } = api;
  const P = cbPlan(sp);
  const t = sp.t;
  const col = "#111111",
    lw = pwFor(5),
    thin = pwFor(2);
  const objs = [];
  const rect = (x, y, w, h, o) =>
    objs.push(Object.assign({ t: "rect", a: [x, y], b: [x + w, y + h], c: col, w: lw }, o || {}));
  const line = (x1, y1, x2, y2, o) =>
    objs.push(Object.assign({ t: "line", a: [x1, y1], b: [x2, y2], c: col, w: thin }, o || {}));
  const text = (x, y, s, k) =>
    objs.push({
      t: "text",
      x,
      y,
      s,
      c: "#333333",
      size: Math.round(18 * (k || 0.9)),
      ly: "notes",
    });
  /* writing is a set size on paper (about 3.5 mm), so spacing goes by it */
  const Z = 18;
  const gapX = Math.max(U(500), Z * 6 + dimSize() * 3),
    top = Math.max(U(300), Z * 4 + dimSize() * 2.6);
  const W = U(sp.W),
    H = U(sp.H),
    D = U(sp.D),
    T = U(t),
    PL = U(sp.plinth);
  /* where each bay sits, from the left */
  const bx = [];
  let x = T;
  P.ws.forEach((w) => {
    bx.push([x, U(w)]);
    x += U(w) + T;
  });
  /* --- the front with the doors on --- */
  const x1 = Math.max(Z * 5, (doc.w - (2 * W + D + 2 * gapX)) / 2),
    y1 = top;
  rect(x1, y1, W, H);
  if (PL) line(x1, y1 + H - PL, x1 + W, y1 + H - PL, { w: lw });
  /* mm up from the floor → the page, for the front with the doors on */
  const fy = (yy) => y1 + H - U(yy);
  const hnd = sp.handle || "bar";
  const handleAt = (hx, hy) => {
    if (hnd === "none") return;
    if (hnd === "knob")
      objs.push({
        t: "circle",
        a: [hx - U(15), hy - U(15)],
        b: [hx + U(15), hy + U(15)],
        c: col,
        w: thin,
      });
    else
      line(hx, hy - U(70), hx, hy + U(70), {
        w: pwFor(4),
        c: hnd === "black" ? "#111111" : "#777777",
      });
  };
  const door = (dx, dw, dTop, dBot, hinge, kind) => {
    rect(dx, dTop, dw, dBot - dTop, {
      w: thin,
      fill: kind === "mirror" ? "#e3edf1" : undefined,
      fa: 0.7,
    });
    /* the hinge side: lines from the hinge-side corners to the middle of the other side */
    if (hinge) {
      const hx = hinge === "L" ? dx : dx + dw,
        ox = hinge === "L" ? dx + dw : dx;
      line(hx, dTop, ox, (dTop + dBot) / 2, { dash: 1 });
      line(hx, dBot, ox, (dTop + dBot) / 2, { dash: 1 });
    }
    if (kind === "glass") {
      /* the glass, with glazing bars */
      const gx = dx + U(70),
        gw = dw - U(140),
        gt = dTop + U(70),
        gh = dBot - dTop - U(140);
      if (gw > 0 && gh > 0) {
        rect(gx, gt, gw, gh, { w: thin, fill: "#dcecf2" });
        line(gx + gw / 2, gt, gx + gw / 2, gt + gh, { w: thin });
        if (gh > U(900))
          [1, 2].forEach((k) =>
            line(gx, gt + (gh * k) / 3, gx + gw, gt + (gh * k) / 3, { w: thin }),
          );
      }
    }
    if (kind === "mirror")
      [0.2, 0.32].forEach((f) =>
        line(
          dx + dw * 0.15,
          dTop + (dBot - dTop) * (f + 0.12),
          dx + dw * 0.15 + (dBot - dTop) * 0.12,
          dTop + (dBot - dTop) * f,
          { w: thin, c: "#7fa6b5" },
        ),
      );
    /* the handle on the opening side: about 1050 up on a tall door, near the bottom of a high one, else the middle */
    if (hinge) {
      const hx = hinge === "L" ? dx + dw - U(45) : dx + U(45);
      const tall = dBot - dTop > U(1200);
      const high = dBot < fy(1500);
      handleAt(
        hx,
        tall
          ? Math.min(Math.max(fy(1050), dTop + U(120)), dBot - U(120))
          : high
            ? dBot - U(110)
            : (dTop + dBot) / 2,
      );
    }
  };
  if (sp.doors !== "sliding")
    bx.forEach(([bxx, bw], i) => {
      const b = P.bays[i],
        dt = cbBayDoor(sp, b);
      const dx = x1 + bxx - T / 2 + U(1.5),
        dw = bw + T - U(3);
      if (dt === "none") rect(x1 + bxx, y1 + T, bw, H - PL - 2 * T, { w: thin });
      else
        b.L.zones.forEach((z) => {
          const zt = fy(z.y1) + U(1.5),
            zb = fy(z.y0) - U(1.5);
          if (dt === "pairs") {
            const hw = (bw + T) / 2 - U(3);
            door(dx, hw, zt, zb, "L");
            door(dx + hw + U(3), hw, zt, zb, "R");
          } else door(dx, dw, zt, zb, i % 2 ? "R" : "L", dt);
        });
      /* the open parts of a dressing table or a cupboard-below-and-above show from the front */
      if (b.k === "desk" || b.k === "basewall") {
        b.L.fixed.forEach((f) =>
          rect(x1 + bxx, fy(f.y) - U(P.sht) / 2, bw, U(P.sht), { w: thin, fill: "#e6e6e6" }),
        );
        if (b.k === "desk")
          b.L.drawers.forEach((d) => {
            rect(x1 + bxx + U(1.5), fy(d.y + d.h) + U(1.5), bw - U(3), U(d.h) - U(3), { w: thin });
            handleAt(x1 + bxx + bw / 2, fy(d.y + d.h / 2));
          });
      }
    });
  if (sp.doors === "sliding") {
    const np = Math.max(2, Math.min(4, P.n)),
      pw = (W - 2 * T) / np;
    const dTop = y1 + U(1.5),
      dBot = y1 + H - PL - U(1.5);
    for (let i = 0; i < np; i++) {
      rect(
        x1 + T + i * pw - (i ? U(20) : 0),
        dTop + U(20),
        pw + (i ? U(20) : 0),
        dBot - dTop - U(40),
        {
          w: thin,
          fill: sp.slideMirror ? "#e3edf1" : undefined,
          fa: 0.7,
        },
      );
      line(
        x1 + T + i * pw + pw / 2 - U(150),
        (dTop + dBot) / 2,
        x1 + T + i * pw + pw / 2 + U(150),
        (dTop + dBot) / 2,
        {
          arrow: 1,
        },
      );
    }
  }
  /* fillers, end panels and cornice round the carcass */
  {
    const fL = U(+sp.fillL || 0),
      fR = U(+sp.fillR || 0),
      eL = sp.endL ? T : 0,
      eR = sp.endR ? T : 0,
      cH = U(+sp.cornice || 0);
    if (eL) rect(x1 - eL, y1, eL, H, { w: thin, fill: "#eeeeee" });
    if (eR) rect(x1 + W, y1, eR, H, { w: thin, fill: "#eeeeee" });
    if (fL) rect(x1 - eL - fL, y1 - cH, fL, H + cH, { w: thin, fill: "#f4f4f4" });
    if (fR) rect(x1 + W + eR, y1 - cH, fR, H + cH, { w: thin, fill: "#f4f4f4" });
    if (cH) rect(x1 - eL - fL, y1 - cH, W + eL + eR + fL + fR, cH, { w: thin, fill: "#eeeeee" });
    if (fL || fR || eL || eR || cH)
      text(
        x1 - eL - fL,
        y1 + H + dimSize() * 4.6,
        `Opening ${sp.open || sp.W} wide${sp.openTop && +sp.openTop !== +sp.open ? " (" + sp.openTop + " at the top)" : ""} × ${sp.Hopen || sp.H} high${fL || fR ? " – fillers scribed to the walls" : ""}`,
        0.8,
      );
  }
  objs.push(
    mkDim([x1, y1 + H], [x1 + W, y1 + H], dimSize() * 2.4),
    mkDim([x1, y1], [x1, y1 + H], dimSize() * 2.4),
  );
  text(x1, y1 - Z * 0.8, "FRONT – doors on", 1.1);
  /* --- the front with the doors off: the inside --- */
  const x2 = x1 + W + gapX,
    y2 = top;
  rect(x2, y2, W, H);
  line(x2 + T, y2, x2 + T, y2 + H - PL, { w: thin });
  line(x2 + W - T, y2, x2 + W - T, y2 + H - PL, { w: thin });
  line(x2 + T, y2 + T, x2 + W - T, y2 + T, { w: thin });
  if (PL) {
    line(x2, y2 + H - PL, x2 + W, y2 + H - PL, { w: lw });
    line(x2 + T, y2 + H - PL - T, x2 + W - T, y2 + H - PL - T, { w: thin });
  }
  const iTop = y2 + T,
    iBot = y2 + H - PL - T,
    IH = iBot - iTop;
  /* mm up from the floor → the page, for the inside view */
  const iy = (yy) => y2 + H - U(yy);
  const ST = U(P.sht);
  P.bays.forEach((b, i) => {
    const [bxx, bw] = bx[i];
    const lx = x2 + bxx;
    const L = b.L;
    if (i < P.n - 1) rect(lx + bw, iTop, T, IH, { w: thin });
    L.drawers.forEach((d) => {
      const dt = iy(d.y + d.h),
        db = iy(d.y);
      rect(lx + U(1.5), dt + U(1.5), bw - U(3), db - dt - U(3), { w: thin });
      line(lx + bw / 2 - U(60), (dt + db) / 2, lx + bw / 2 + U(60), (dt + db) / 2, { w: pwFor(4) });
    });
    L.shelves.forEach((y) => rect(lx, iy(y) - ST / 2, bw, ST, { w: thin }));
    L.fixed.forEach((f) => rect(lx, iy(f.y) - ST / 2, bw, ST, { w: thin, fill: "#e6e6e6" }));
    L.rails.forEach((y) => {
      line(lx + U(30), iy(y), lx + bw - U(30), iy(y), { w: pwFor(6) });
      text(lx + U(40), iy(y) - U(40), "rail " + Math.round(y), 0.7);
    });
    L.labels.forEach((l) => text(lx + U(40), iy(l.y), l.s, 0.7));
    /* hand-set shelves: their heights from the floor */
    if (String(b.sh || "").trim())
      L.shelves.forEach((y) =>
        text(lx + bw - U(40) - Z * 2.2, iy(y) - ST, String(Math.round(y)), 0.6),
      );
    const last = L.drawers[L.drawers.length - 1];
    const floor = iy(last ? last.y + last.h : P.iB);
    /* fittings */
    if (b.shoe)
      for (let k = 0; k < 3; k++)
        line(lx + U(10), floor - U(140 + k * 230), lx + bw - U(10), floor - U(60 + k * 230), {
          w: thin,
        });
    if (b.trouser) text(lx + U(40), floor - U(800), "trouser pull-out", 0.7);
    if (b.led)
      line(lx + U(20), iTop + U(20), lx + bw - U(20), iTop + U(20), {
        w: pwFor(4),
        c: "#d4a017",
        dash: 1,
      });
    objs.push(mkDim([lx, y2], [lx + bw, y2], -dimSize() * 1.6));
    text(lx + U(40), floor - U(60), String(i + 1), 0.8);
  });
  objs.push(
    mkDim([x2, y2 + H], [x2 + W, y2 + H], dimSize() * 2.4),
    mkDim([x2 + W, iTop], [x2 + W, iBot], -dimSize() * 2.4),
  );
  text(x2, y2 - Z * 0.8, "FRONT – doors off (inside)", 1.1);
  /* --- side section --- */
  const x3 = x2 + W + gapX,
    y3 = top;
  rect(x3, y3, D, H);
  if (sp.bt) rect(x3 + D - U(sp.bt), y3 + T, U(sp.bt), H - PL - T, { w: thin, fill: "#cccccc" });
  line(x3, y3 + T, x3 + D, y3 + T, { w: thin });
  if (PL) line(x3 + U(60), y3 + H - PL, x3 + D, y3 + H - PL, { w: thin });
  objs.push(mkDim([x3, y3 + H], [x3 + D, y3 + H], dimSize() * 2.4));
  text(x3, y3 - Z * 0.8, "SIDE SECTION", 1.1);
  /* --- plan --- */
  const y4 = top + H + Z * 3 + dimSize() * 4;
  rect(x2, y4, W, D);
  if (sp.bt) line(x2 + T, y4 + U(sp.bt), x2 + W - T, y4 + U(sp.bt), { w: thin });
  bx.forEach(([bxx, bw], i) => {
    if (i < P.n - 1) rect(x2 + bxx + bw, y4, T, D, { w: thin });
  });
  rect(x2, y4, T, D, { w: thin });
  rect(x2 + W - T, y4, T, D, { w: thin });
  if (sp.doors !== "sliding" && sp.doors !== "none")
    bx.forEach(([bxx, bw], i) => {
      const dtp = cbBayDoor(sp, P.bays[i]);
      if (dtp === "none") return;
      const leaves = dtp === "pairs" ? 2 : 1;
      const lw2 = (bw + T) / leaves;
      for (let k = 0; k < leaves; k++) {
        const left = dtp === "pairs" ? k === 0 : i % 2 === 0;
        const hx = x2 + bxx - T / 2 + k * lw2 + (left ? 0 : lw2);
        line(hx, y4 + D, hx, y4 + D + lw2 * 0.9, { w: thin });
        objs.push({
          t: "line",
          a: [hx, y4 + D + lw2 * 0.9],
          b: [hx + (left ? lw2 : -lw2), y4 + D],
          c: col,
          w: thin,
          bend: left ? -0.35 : 0.35,
          dash: 1,
        });
      }
    });
  else if (sp.doors === "sliding") {
    line(x2 + T, y4 + D + U(20), x2 + W - T, y4 + D + U(20), { w: thin });
    line(x2 + T, y4 + D + U(50), x2 + W - T, y4 + D + U(50), { w: thin });
  }
  objs.push(mkDim([x2 + W, y4], [x2 + W, y4 + D], -dimSize() * 2.4));
  text(x2 - Z * 4.5, y4 + Z, "PLAN", 1.1);
  /* --- title and cutting list --- */
  /* below the door swings on the plan */
  const yt =
    y4 + D + (sp.doors === "hinged" || sp.doors === "pairs" ? U(Math.max(...P.ws) + t) : 0) + Z * 3;
  text(
    x1,
    yt,
    `${sp.name || "Cupboard"} – ${sp.W} wide × ${sp.H} high × ${sp.D} deep. Boards ${t} mm${sp.bt ? `, back ${sp.bt} mm` : ""}${sp.plinth ? `, plinth ${sp.plinth} mm` : ""}.`,
    1,
  );
  /* boards, edging, colours and handles */
  {
    const cn = (c) => (c ? (CB3_COLS.find((x) => x[0] === c) || [c, c])[1] : "");
    const bits = [
      `Doors and fronts ${P.dt} mm, shelves ${P.sht} mm`,
      sp.edge || "",
      sp.colCar ? "carcass " + cn(sp.colCar).toLowerCase() : "",
      sp.colDoor ? "doors " + cn(sp.colDoor).toLowerCase() : "",
      sp.colTop ? "shelves and top " + cn(sp.colTop).toLowerCase() : "",
      (CB_HANDLES.find((h) => h[0] === (sp.handle || "bar")) || ["", ""])[1].toLowerCase(),
      sp.slideMirror && sp.doors === "sliding" ? "mirror sliding doors" : "",
    ].filter(Boolean);
    text(x1, yt + Z * 1.3, bits.join(" · ") + ".", 0.8);
  }
  let yy = yt + Z * 3.2;
  text(x1, yy, "CUTTING LIST (length × width × thickness, mm)", 1);
  const half = P.cut.length > 9 ? Math.ceil(P.cut.length / 2) : P.cut.length;
  const y0c = yy;
  P.cut.forEach((c, i) => {
    yy = y0c + ((i % half) + 1) * Z * 1.25;
    text(
      x1 + (i >= half ? Z * 34 : 0),
      yy,
      `${c.qty} × ${c.part}: ${c.th ? `${c.l} × ${c.w} × ${c.th}` : `${c.l} long`}${c.note ? "  (" + c.note + ")" : ""}`,
      0.85,
    );
  });
  objs.forEach((o) => Object.keys(o).forEach((k) => o[k] === undefined && delete o[k]));
  return { objs, cut: P.cut };
}
/* the form */
function cbMakeDialog(api) {
  const last = api.last || {};
  const v = (k, d) => (last[k] != null ? last[k] : d);
  if (last.kind === "chimney" && last.aL) {
    last.W = last.aL;
    last.wB = last.aR;
  }
  if (last.open) {
    last.W = last.open;
    last.H = last.Hopen || last.H;
  }
  const bayRow = (i, b) =>
    `<div class="cb2-bay" data-i="${i}"><b>Bay ${i + 1}</b><select class="cb2-k" aria-label="Bay ${i + 1}: what's in it">${CB_BAYS.map(([k, l]) => `<option value="${k}"${k === b.k ? " selected" : ""}>${l}</option>`).join("")}</select><label>Shelves<input class="cb2-s" type="number" inputmode="numeric" min="0" max="12" value="${b.s}"></label><label>Drawers<input class="cb2-d" type="number" inputmode="numeric" min="0" max="8" value="${b.d}"></label><select class="cb2-dr" aria-label="Bay ${i + 1}: doors">${CB_BAYDOORS.map(([k, l]) => `<option value="${k}"${k === (b.door || "") ? " selected" : ""}>${l}</option>`).join("")}</select><span class="cb2-fit"><label class="inl"><input type="checkbox" class="cb2-shoe"${b.shoe ? " checked" : ""}> Shoe rack</label><label class="inl"><input type="checkbox" class="cb2-tr"${b.trouser ? " checked" : ""}> Trouser pull-out</label><label class="inl"><input type="checkbox" class="cb2-led"${b.led ? " checked" : ""}> LED light</label></span><details class="cb2-adj"${b.w || b.sh || b.dh || b.rail || b.top ? " open" : ""}><summary>Adjust this bay</summary><div class="cb2-adjg"><label>Width inside (mm)<input class="cb2-w" type="number" inputmode="numeric" value="${b.w || ""}" placeholder="share"></label><label>Top box height (mm)<input class="cb2-tb" type="number" inputmode="numeric" value="${b.top || ""}" placeholder="none"></label><label>Drawer height (mm)<input class="cb2-dh" type="number" inputmode="numeric" value="${b.dh || ""}" placeholder="180"></label><label>Rail height from the floor (mm)<input class="cb2-rl" type="number" inputmode="numeric" value="${b.rail || ""}" placeholder="auto"></label><label class="cb2-shl">Shelf heights from the floor (mm)<input class="cb2-sh" maxlength="80" value="${esc(b.sh || "")}" placeholder="e.g. 400, 800, 1200 – or leave for even"></label></div><div class="who">A top box puts a fixed shelf and a separate door at the top. Leave a box empty to let the app work it out.</div></details></div>`;
  const bayRead = (r) => ({
    k: r.querySelector(".cb2-k").value,
    s: +r.querySelector(".cb2-s").value || 0,
    d: +r.querySelector(".cb2-d").value || 0,
    door: r.querySelector(".cb2-dr").value,
    shoe: r.querySelector(".cb2-shoe").checked,
    trouser: r.querySelector(".cb2-tr").checked,
    led: r.querySelector(".cb2-led").checked,
    w: +r.querySelector(".cb2-w").value || 0,
    top: +r.querySelector(".cb2-tb").value || 0,
    dh: +r.querySelector(".cb2-dh").value || 0,
    rail: +r.querySelector(".cb2-rl").value || 0,
    sh: r.querySelector(".cb2-sh").value.trim(),
  });
  const bays0 = v("bays", [
    { k: "hang1", s: 0, d: 0 },
    { k: "shelves", s: 4, d: 0 },
  ]);
  openSheet(
    `<h3 id="sheettitle">🗄️ Cupboards, wardrobes and shelves</h3>
    <label for="cb2-kind">What are you making?<select id="cb2-kind">${CBA_KINDS.concat(CBS_KINDS)
      .map(
        ([k, l]) =>
          `<option value="${k}"${k === v("kind", "full") ? " selected" : ""}>${l}</option>`,
      )
      .join("")}</select></label>
    <label for="cb2-name">Name<input id="cb2-name" maxlength="60" value="${esc(v("name", "Wardrobe"))}" placeholder="e.g. Wardrobe – bedroom 1, Alcove left of the chimney"></label>
    <div class="grid2"><label for="cb2-W"><span class="cb2-wl">Width (mm)</span><input id="cb2-W" type="number" inputmode="numeric" value="${v("W", 1800)}"></label><label for="cb2-H"><span class="cb2-hl">Height (mm)</span><input id="cb2-H" type="number" inputmode="numeric" value="${v("H", 2400)}"></label></div>
    <div class="grid2"><label for="cb2-D"><span class="cb2-dl">Depth (mm)</span><input id="cb2-D" type="number" inputmode="numeric" value="${v("D", 600)}"></label><label for="cb2-p" class="cb2-g" data-k="full alcove base corner stairs eaves bridge window seat bench tv">Plinth / kickboard height (0 = none)<input id="cb2-p" type="number" inputmode="numeric" value="${v("plinth", 100)}"></label></div>
    <fieldset class="cb2-g od-who" data-k="corner stairs eaves bridge window seat bench tv chimney"><legend>The shape</legend>
      <label for="cb2-cw" class="cb2-g" data-k="chimney">Chimney breast width (mm)<input id="cb2-cw" type="number" inputmode="numeric" value="${v("cw", 1200)}"></label>
      <label for="cb2-wb" class="cb2-g" data-k="corner chimney"><span class="cb2-wbl">Second run, round the corner (mm, from the corner)</span><input id="cb2-wb" type="number" inputmode="numeric" value="${v("wB", 1200)}"></label>
      <label for="cb2-hl" class="cb2-g" data-k="stairs eaves"><span class="cb2-hll">Height at the low end (mm)</span><input id="cb2-hl" type="number" inputmode="numeric" value="${v("hLow", 900)}"></label>
      <label for="cb2-tw" class="cb2-g" data-k="bridge window tv">Tower width (mm)<input id="cb2-tw" type="number" inputmode="numeric" value="${v("tw", 500)}"></label>
      <div class="grid2"><label for="cb2-th" class="cb2-g" data-k="bridge window tv bench"><span class="cb2-thl">Unit over the top – height (mm, 0 = none)</span><input id="cb2-th" type="number" inputmode="numeric" value="${v("topH", 500)}"></label><label for="cb2-lh" class="cb2-g" data-k="window tv bench"><span class="cb2-lhl">Unit underneath – height (mm, 0 = none)</span><input id="cb2-lh" type="number" inputmode="numeric" value="${v("lowH", 450)}"></label></div>
      <label class="inl cb2-g" data-k="window"><input type="checkbox" id="cb2-rad"${v("radiator", false) ? " checked" : ""}> It's round a radiator, not a window</label>
    </fieldset>
    <label for="cb2-sc" class="cb2-g" data-k="alcove base shelves">Scribe allowance each side (mm, for uneven walls)<input id="cb2-sc" type="number" inputmode="numeric" value="${v("scribe", 10)}"></label>
    <fieldset class="cb2-g od-who" data-k="alcove base chimney"><legend>The cupboard at the bottom</legend>
      <div class="grid2"><label for="cb2-bh">Height to the top of the worktop (mm)<input id="cb2-bh" type="number" inputmode="numeric" value="${v("baseH", 800)}"></label><label for="cb2-tt">Top thickness (mm, 0 = no top)<input id="cb2-tt" type="number" inputmode="numeric" value="${v("topT", 30)}"></label></div>
      <label for="cb2-to">Top overhang at the front (mm)<input id="cb2-to" type="number" inputmode="numeric" value="${v("topOver", 20)}"></label>
    </fieldset>
    <fieldset class="cb2-g od-who" data-k="alcove shelves chimney"><legend>The shelves</legend>
      <div class="grid2"><label for="cb2-sn">How many shelves<input id="cb2-sn" type="number" inputmode="numeric" min="0" max="12" value="${v("shelfN", 4)}"></label><label for="cb2-ss">Fixed<select id="cb2-ss"><option value="floating"${v("shelfStyle", "floating") === "floating" ? " selected" : ""}>Floating – on battens to the walls</option><option value="framed"${v("shelfStyle", "floating") === "framed" ? " selected" : ""}>In a frame (two sides and a top)</option></select></label></div>
      <div class="grid2"><label for="cb2-sd">Shelf depth (mm)<input id="cb2-sd" type="number" inputmode="numeric" value="${v("shelfD", 250)}"></label><label for="cb2-st">Shelf thickness (mm)<input id="cb2-st" type="number" inputmode="numeric" value="${v("shelfT", 30)}"></label></div>
      <label for="cb2-sg">Gaps between shelves (optional)<input id="cb2-sg" maxlength="60" value="${esc(v("shelfGaps", ""))}" placeholder="e.g. 400, 350, 300 – or leave for even spacing"></label>
      <label for="cb2-sf" class="cb2-g" data-k="shelves">First shelf height from the floor (mm)<input id="cb2-sf" type="number" inputmode="numeric" value="${v("shelfFrom", 300)}"></label>
    </fieldset>
    <fieldset class="cb2-g od-who" data-k="full"><legend>Finishing and the opening</legend>
      <div class="grid2"><label for="cb2-fl">Filler on the left (mm)<input id="cb2-fl" type="number" inputmode="numeric" value="${v("fillL", 0)}"></label><label for="cb2-fr">Filler on the right (mm)<input id="cb2-fr" type="number" inputmode="numeric" value="${v("fillR", 0)}"></label></div>
      <div class="grid2"><label class="inl"><input type="checkbox" id="cb2-el"${v("endL", false) ? " checked" : ""}> End panel on the left</label><label class="inl"><input type="checkbox" id="cb2-er"${v("endR", false) ? " checked" : ""}> End panel on the right</label></div>
      <div class="grid2"><label for="cb2-co">Cornice height (mm, 0 = none)<input id="cb2-co" type="number" inputmode="numeric" value="${v("cornice", 0)}"></label><label for="cb2-wt">Width at the top, if not square (mm)<input id="cb2-wt" type="number" inputmode="numeric" value="${v("openTop", "")}" placeholder="same as the bottom"></label></div>
      <div class="who">Width and height above are the whole opening. The fillers, end panels and cornice come off them, and the narrower end of an out-of-square opening is used, with the fillers scribed to fit.</div>
    </fieldset>
    <div class="cb2-g" data-k="full alcove base corner stairs eaves bridge window seat bench tv">
    <details class="cb2-fin"${last.colDoor || last.edge || last.dt ? " open" : ""}><summary>Boards, edging, colours and handles</summary>
    <div class="grid2"><label for="cb2-t">Carcass board thickness (mm)<input id="cb2-t" type="number" inputmode="numeric" value="${v("t", 18)}"></label><label for="cb2-bt">Back panel thickness (0 = no back)<input id="cb2-bt" type="number" inputmode="numeric" value="${v("bt", 6)}"></label></div>
    <div class="grid2"><label for="cb2-dt">Doors and drawer fronts (mm)<input id="cb2-dt" type="number" inputmode="numeric" value="${v("dt", "")}" placeholder="same as the carcass"></label><label for="cb2-sht">Shelves (mm)<input id="cb2-sht" type="number" inputmode="numeric" value="${v("sht", "")}" placeholder="same as the carcass"></label></div>
    <div class="grid2"><label for="cb2-bf">Back panel fixed<select id="cb2-bf"><option value="groove"${v("backFix", "groove") === "groove" ? " selected" : ""}>Into a groove</option><option value="pinned"${v("backFix", "") === "pinned" ? " selected" : ""}>Pinned and glued on</option><option value="screwed"${v("backFix", "") === "screwed" ? " selected" : ""}>Screwed on</option></select></label><label for="cb2-edge">Edging<select id="cb2-edge">${CB_EDGES.map(([k, l]) => `<option value="${k}"${k === v("edge", CB_EDGES[0][0]) ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <div class="grid2"><label for="cb2-cc">Carcass colour<select id="cb2-cc"><option value="">Not chosen</option>${CB3_COLS.map(([k, l]) => `<option value="${k}"${k === v("colCar", "") ? " selected" : ""}>${l}</option>`).join("")}</select></label><label for="cb2-cd">Door colour<select id="cb2-cd"><option value="">Not chosen</option>${CB3_COLS.map(([k, l]) => `<option value="${k}"${k === v("colDoor", "") ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <div class="grid2"><label for="cb2-ct">Shelves and top colour<select id="cb2-ct"><option value="">Not chosen</option>${CB3_COLS.map(([k, l]) => `<option value="${k}"${k === v("colTop", "") ? " selected" : ""}>${l}</option>`).join("")}</select></label><label for="cb2-hd">Handles<select id="cb2-hd">${CB_HANDLES.map(([k, l]) => `<option value="${k}"${k === v("handle", "bar") ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <label class="inl"><input type="checkbox" id="cb2-sm"${v("slideMirror", false) ? " checked" : ""}> Mirror sliding doors</label>
    <div class="who">The colours and handles go on the drawing and are the starting choice in the 🎨 3D view.</div></details>
    <label for="cb2-doors">Doors<select id="cb2-doors">${CB_DOORS.map(([k, l]) => `<option value="${k}"${k === v("doors", "hinged") ? " selected" : ""}>${l}</option>`).join("")}</select></label>
    <div class="grid2"><label for="cb2-n">How many bays (sections)<input id="cb2-n" type="number" inputmode="numeric" min="1" max="8" value="${bays0.length}"></label><label for="cb2-ws">Bay widths inside (optional)<input id="cb2-ws" maxlength="60" value="${esc(v("widths", ""))}" placeholder="e.g. 1000, 728 – or leave for equal"></label></div>
    <div id="cb2-bays">${bays0.map((b, i) => bayRow(i, b)).join("")}</div></div>
    <div class="who">It draws a new page: the front with the doors on and off, the plan, a side section, and the cutting list. Everything can be changed afterwards with the drawing tools.</div>
    ${formFoot(false, "Draw it")}`,
    () => {
      const num = (id, d) => (isFinite(+$(id).value) && $(id).value !== "" ? +$(id).value : d);
      const sp = {
        kind: $("cb2-kind").value,
        wB: num("cb2-wb", 1200),
        hLow: num("cb2-hl", 900),
        tw: num("cb2-tw", 500),
        topH: Math.max(0, num("cb2-th", 0)),
        lowH: Math.max(0, num("cb2-lh", 0)),
        radiator: $("cb2-rad").checked,
        scribe: Math.max(0, num("cb2-sc", 0)),
        baseH: num("cb2-bh", 800),
        topT: Math.max(0, num("cb2-tt", 0)),
        topOver: Math.max(0, num("cb2-to", 0)),
        shelfN: Math.max(0, Math.min(12, num("cb2-sn", 0))),
        shelfStyle: $("cb2-ss").value,
        shelfD: num("cb2-sd", 250),
        shelfT: Math.max(6, num("cb2-st", 25)),
        shelfGaps: $("cb2-sg").value.trim(),
        shelfFrom: num("cb2-sf", 300),
        name: $("cb2-name").value.trim(),
        W: num("cb2-W", 1800),
        H: num("cb2-H", 2400),
        D: num("cb2-D", 600),
        plinth: Math.max(0, num("cb2-p", 0)),
        t: Math.max(6, num("cb2-t", 18)),
        bt: Math.max(0, num("cb2-bt", 0)),
        dt: num("cb2-dt", 0) > 0 ? Math.max(6, num("cb2-dt", 0)) : "",
        sht: num("cb2-sht", 0) > 0 ? Math.max(6, num("cb2-sht", 0)) : "",
        backFix: $("cb2-bf").value,
        edge: $("cb2-edge").value,
        colCar: $("cb2-cc").value,
        colDoor: $("cb2-cd").value,
        colTop: $("cb2-ct").value,
        handle: $("cb2-hd").value,
        slideMirror: $("cb2-sm").checked,
        doors: $("cb2-doors").value,
        n: Math.max(1, Math.min(8, num("cb2-n", 1))),
        widths: $("cb2-ws").value.trim(),
        bays: [...document.querySelectorAll(".cb2-bay")].map(bayRead),
      };
      /* a wardrobe: the opening less the fillers, end panels and cornice is the carcass */
      if (sp.kind === "full") {
        Object.assign(sp, {
          fillL: Math.max(0, num("cb2-fl", 0)),
          fillR: Math.max(0, num("cb2-fr", 0)),
          endL: $("cb2-el").checked,
          endR: $("cb2-er").checked,
          cornice: Math.max(0, num("cb2-co", 0)),
          openTop: num("cb2-wt", 0) || "",
          open: sp.W,
          Hopen: sp.H,
        });
        const narrow = Math.min(sp.W, sp.openTop || sp.W);
        sp.W = narrow - sp.fillL - sp.fillR - (sp.endL ? sp.t : 0) - (sp.endR ? sp.t : 0);
        sp.H = sp.H - sp.cornice;
      }
      if (sp.kind === "chimney") {
        sp.aL = sp.W;
        sp.aR = sp.wB;
        sp.cw = Math.max(200, num("cb2-cw", 1200));
        sp.W = sp.aL + sp.cw + sp.aR;
      }
      if (sp.kind === "shelves") sp.plinth = 0;
      if (cbaHasBase(sp) && (sp.baseH < 300 || sp.baseH > sp.H))
        return showErr("The cupboard at the bottom must be lower than the whole height.");
      if (sp.W < 200 || sp.H < 200 || sp.D < 100)
        return showErr("Check the sizes – they're in millimetres.");
      if (sp.W > 8000 || sp.H > 4000)
        return showErr("That's very big – check the sizes are in millimetres.");
      closeForm();
      api.make(sp);
    },
    "cb2-W",
  );
  const sync = () => {
    const n = Math.max(1, Math.min(8, +$("cb2-n").value || 1));
    const cur = [...document.querySelectorAll(".cb2-bay")].map(bayRead);
    while (cur.length < n) cur.push({ k: "shelves", s: 4, d: 0 });
    $("cb2-bays").innerHTML = cur
      .slice(0, n)
      .map((b, i) => bayRow(i, b))
      .join("");
  };
  $("cb2-n").oninput = sync;
  /* only the questions for what's being made */
  const kindSync = () => {
    const k = $("cb2-kind").value;
    document
      .querySelectorAll(".cb2-g")
      .forEach((g) => (g.hidden = !g.dataset.k.split(" ").includes(k)));
    const al = k !== "full";
    document.querySelector(".cb2-wl").textContent = al ? "Width – wall to wall (mm)" : "Width (mm)";
    document.querySelector(".cb2-hl").textContent =
      k === "base"
        ? "Height (mm, same as the cupboard)"
        : al
          ? "Height to the top shelf / ceiling (mm)"
          : "Height (mm)";
    document.querySelector(".cb2-dl").textContent =
      k === "shelves" ? "Depth of the recess (mm)" : al ? "Cupboard depth (mm)" : "Depth (mm)";
    if (k === "base") $("cb2-H").value = $("cb2-bh").value;
    if (k === "stairs")
      document.querySelector(".cb2-hll").textContent = "Height at the low end (mm)";
    if (k === "eaves")
      document.querySelector(".cb2-hll").textContent = "Height at the back – the knee wall (mm)";
    if (k === "stairs")
      document.querySelector(".cb2-hl").textContent = "Height at the high end (mm)";
    if (k === "eaves") document.querySelector(".cb2-hl").textContent = "Height at the front (mm)";
    if (k === "bench") {
      document.querySelector(".cb2-thl").textContent = "Cubbies at the top – height (mm)";
      document.querySelector(".cb2-lhl").textContent = "Bench – seat height (mm)";
    } else if (k === "tv")
      document.querySelector(".cb2-lhl").textContent = "Media unit – height (mm)";
    if (k === "seat") document.querySelector(".cb2-hl").textContent = "Seat height (mm)";
    if (k === "chimney") document.querySelector(".cb2-wl").textContent = "Left alcove width (mm)";
    document.querySelector(".cb2-wbl").textContent =
      k === "chimney"
        ? "Right alcove width (mm)"
        : "Second run, round the corner (mm, from the corner)";
  };
  $("cb2-kind").onchange = () => {
    const k = $("cb2-kind").value;
    const d = {
      full: [600, 2400, "Wardrobe"],
      alcove: [400, 2400, "Alcove unit"],
      base: [400, 800, "Base cupboard"],
      shelves: [300, 2400, "Shelves"],
      corner: [600, 2400, "Corner wardrobe"],
      stairs: [700, 2200, "Under-stairs cupboard"],
      eaves: [800, 1400, "Eaves storage"],
      bridge: [600, 2400, "Bedroom wall"],
      window: [450, 2400, "Window surround"],
      seat: [450, 450, "Window seat"],
      bench: [400, 2100, "Boot room bench"],
      tv: [450, 2400, "TV wall"],
      chimney: [350, 2400, "Chimney alcoves"],
    }[k];
    $("cb2-D").value = d[0];
    $("cb2-H").value = d[1];
    if (
      !$("cb2-name").value ||
      /^(Wardrobe|Alcove unit|Base cupboard|Shelves|Corner wardrobe|Under-stairs cupboard|Eaves storage|Bedroom wall|Window surround|Window seat|Boot room bench|TV wall|Chimney alcoves)$/.test(
        $("cb2-name").value,
      )
    )
      $("cb2-name").value = d[2];
    if (k !== "full") $("cb2-n").value = 1;
    sync();
    /* a base cupboard holds shelves, not hanging */
    if (k !== "full")
      document.querySelectorAll(".cb2-bay").forEach((r) => {
        r.querySelector(".cb2-k").value = "shelves";
        r.querySelector(".cb2-s").value = 1;
      });
    kindSync();
  };
  $("cb2-bh").oninput = () =>
    $("cb2-kind").value === "base" && ($("cb2-H").value = $("cb2-bh").value);
  kindSync();
  /* small pictures to tap for what's being made and the doors */
  cbpPicker("cb2-kind", CBP_KIND, "cb2-kpics");
  cbpPicker("cb2-doors", CBP_DOOR, "cb2-dpics");
}
