/* ================= CUPBOARD MAKER: fitted cupboards and wardrobes drawn to scale, with a cutting list ================= */
import { $, esc } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { CB3_COLS } from "./cupboard-3d.js";
import { CBA_KINDS, cbaHasBase } from "./cupboard-alcove.js";
import { CBP_DOOR, CBP_KIND, cbpPicker } from "./cupboard-pics.js";
import { CBS_KINDS } from "./cupboard-shapes.js";
export {
  CB_BAYS,
  CB_DOORS,
  cbBayDoor,
  cbDetails,
  cbDraw,
  cbHAt,
  cbMakeDialog,
  cbPlan,
  cbSlopeOn,
  cbSlopeW,
};
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
  ["gola", "Gola – handle-less finger channel"],
];
const CB_EDGES = [
  ["1 mm ABS edging", "1 mm ABS edging"],
  ["2 mm ABS on doors and fronts, 1 mm on the carcass", "2 mm ABS on fronts, 1 mm on the carcass"],
  ["0.4 mm ABS edging", "0.4 mm ABS edging"],
  ["Real wood veneer edging", "Real wood veneer edging"],
  ["No edging (painted MDF)", "None – painted MDF"],
];
const CB_MATS = [
  ["MFC", "Melamine-faced chipboard (MFC)"],
  ["MDF", "MDF, to paint"],
  ["MR MDF", "Moisture-resistant MDF"],
  ["birch ply", "Birch plywood"],
  ["oak veneer MDF", "Oak-veneered MDF"],
  ["solid oak", "Solid oak"],
];
const CB_BACKS = [
  ["MDF", "MDF"],
  ["hardboard", "Hardboard"],
  ["MFC", "MFC to match"],
  ["birch ply", "Birch plywood"],
];
const CB_SUPS = [
  ["pins", "Shelf pins in drilled rows (adjustable)"],
  ["track", "Twin-slot track and brackets (adjustable)"],
  ["fixed", "Fixed shelves (dowelled and screwed)"],
];
const CB_LIGHTS = [
  ["", "No lighting"],
  ["strip", "LED strip under the top"],
  ["rail", "LED hanging rails"],
  ["puck", "Puck spotlights under the top"],
  ["profile", "LED profiles down the sides"],
];
const CB_LIGHTON = [
  ["door", "On when the door opens (door sensor)"],
  ["pir", "Motion sensor"],
  ["switch", "Switch or touch dimmer"],
];
const CB_RUNNERS = [
  ["soft-close", "Soft-close, full extension"],
  ["push", "Push-to-open, full extension"],
  ["ball", "Ball-bearing, full extension"],
  ["roller", "Basic roller"],
];
const cbBayDoor = (sp, b) => (sp.doors === "sliding" ? "sliding" : (b && b.door) || sp.doors);
/* a sloping ceiling over a wardrobe (eaves, stairs): the carcass height x mm from its left. sp.slope "L" or "R" is the
   low end, sp.slopeLow its height, sp.slopeW how far in from that end the slope runs (blank = all the way) */
const cbSlopeOn = (sp) =>
  (sp.slope === "L" || sp.slope === "R") && +sp.slopeLow > 0 && +sp.slopeLow < sp.H;
const cbSlopeW = (sp) => Math.min(sp.W, +sp.slopeW || sp.W);
const cbHAt = (sp, x) => {
  if (!cbSlopeOn(sp)) return sp.H;
  const sw = cbSlopeW(sp),
    lo = +sp.slopeLow,
    d = sp.slope === "L" ? x : sp.W - x;
  return d >= sw ? sp.H : lo + ((sp.H - lo) * Math.max(0, d)) / sw;
};
const cbSlopeAng = (sp) =>
  Math.round((Math.atan2(sp.H - +sp.slopeLow, cbSlopeW(sp)) * 180) / Math.PI);
/* how much of a level board at height y (its top) fits under the slope between xa and xb: [from, to] in mm, or null */
function cbUnder(sp, xa, xb, y) {
  let a = null,
    z = null;
  for (let x = xa; x <= xb + 0.01; x += Math.max(1, (xb - xa) / 200))
    if (cbHAt(sp, x) - sp.t >= y) {
      if (a === null) a = x;
      z = x;
    }
  return a === null ? null : [a, Math.min(xb, z)];
}
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
  /* drawer front heights, bottom first: one for them all, or a list ("250, 200, 150"); the last one repeats */
  const dhs = cbNums(b.dh).map((x) => Math.max(80, x));
  const drawers = (n) => {
    for (let k = 0; k < n; k++) {
      const h = dhs[k] || dhs[dhs.length - 1] || P.drH;
      L.drawers.push({ y: lo, h });
      lo += h;
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
  /* where each bay starts, mm from the carcass's left */
  const bx0 = [];
  {
    let x = t;
    ws.forEach((w) => {
      bx0.push(x);
      x += w + t;
    });
  }
  P.bx0 = bx0;
  /* under a sloping ceiling: shelves, rails and fixed shelves high up are cut short to the slope, or left out */
  const slope = cbSlopeOn(sp);
  if (slope)
    bays.forEach((b, i) => {
      const L = b.L,
        xa = bx0[i],
        xb = xa + b.w;
      L.cw = {};
      const fit = (y, min) => {
        const u = cbUnder(sp, xa, xb, y);
        if (!u || u[1] - u[0] < min) return null;
        return u[1] - u[0] >= b.w - 1 ? true : u;
      };
      L.shelves = L.shelves.filter((y) => {
        const f = fit(y + P.sht / 2, 120);
        if (f && f !== true) L.cw[y] = f;
        return !!f;
      });
      L.fixed = L.fixed.filter((f) => {
        const r = fit(f.y + P.sht / 2, 120);
        if (r && r !== true) L.cw[f.y] = r;
        return !!r;
      });
      L.rails = L.rails.filter((y) => {
        const r = fit(y + 50, 300);
        if (r && r !== true) L.cw["r" + y] = r;
        return !!r;
      });
    });
  /* a face frame: stiles (sides), rails (top and bottom) and muntins (between bays) on the front; each bay's opening in
     it, and the doors overlay it by 12 mm or sit in it with a 2 mm gap */
  const ff = sp.ff
    ? {
        w: +sp.ffW || 45,
        r: +sp.ffR || 45,
        m: +sp.ffM || 45,
        t: +sp.ffT || 20,
        inset: sp.ff === "inset",
      }
    : null;
  if (ff) {
    ff.ov = ff.inset ? -2 : 12;
    ff.opX = (i) => [
      i === 0 ? ff.w : bx0[i] - t / 2 + ff.m / 2,
      i === n - 1 ? sp.W - ff.w : bx0[i] + ws[i] + t / 2 - ff.m / 2,
    ];
    ff.opY = (z) => [
      z.y0 <= (sp.plinth || 0) + 1 ? (sp.plinth || 0) + ff.r : z.y0 + ff.r / 2,
      z.y1 >= sp.H - 1 ? sp.H - ff.r : z.y1 - ff.r / 2,
    ];
  }
  P.ff = ff;
  const cut = [];
  /* what each board is made of (material and colour), from what it is */
  const cn = (c) => (c ? (CB3_COLS.find((x) => x[0] === c) || [c, c])[1].toLowerCase() : "");
  /* a natural finish (veneer, solid oak, birch ply) is its own colour, so the colour name isn't added */
  const jn = (c, m) =>
    /veneer|solid|ply/i.test(m || "") ? m : [cn(c), m || ""].filter(Boolean).join(" ");
  const matOf = (part) => {
    if (/glass/i.test(part)) return "";
    if (/face frame/i.test(part)) return sp.ffMat || "hardwood";
    if (/back panel/i.test(part)) return sp.matBack || "";
    if (/door|drawer front|filler|end panel|cornice|plinth/i.test(part))
      return jn(sp.colDoor || (sp.matDoor ? "" : sp.colCar), sp.matDoor || sp.matCar);
    if (/shelf|desk|top \/|worktop/i.test(part))
      return jn(sp.colTop || (sp.matShelf ? "" : sp.colCar), sp.matShelf || sp.matCar);
    return jn(sp.colCar, sp.matCar);
  };
  const add = (part, qty, l, w, th, note) => {
    const mat = th ? matOf(part) : "";
    const ex = cut.find(
      (c) =>
        c.part === part &&
        c.l === Math.round(l) &&
        c.w === Math.round(w) &&
        c.th === th &&
        c.note === (note || "") &&
        (c.mat || "") === mat,
    );
    if (ex) ex.qty += qty;
    else cut.push({ part, qty, l: Math.round(l), w: Math.round(w), th, note: note || "", mat });
  };
  if (slope) {
    const lo = +sp.slopeLow,
      sw = cbSlopeW(sp),
      ang = cbSlopeAng(sp);
    add("Side", 1, sp.H, sp.D, t, "high end");
    add("Side", 1, lo, sp.D, t, "low end, under the slope; top cut at " + ang + "°");
    add(
      "Top (raking)",
      1,
      Math.hypot(sw - t, ((sp.H - lo) * (sw - t)) / sw),
      sp.D,
      t,
      "under the slope; ends cut at " + ang + "°",
    );
    if (sp.W - sw - t > 50) add("Top", 1, sp.W - sw - t, sp.D, t, "the level part");
    add("Bottom", 1, sp.W - 2 * t, sp.D, t);
    for (let i = 1; i < n; i++) {
      const xd = bx0[i] - t / 2,
        hd = cbHAt(sp, xd);
      add(
        "Division",
        1,
        hd - (sp.plinth || 0) - 2 * t + (hd < sp.H ? t : 0),
        sp.D - bt,
        t,
        hd < sp.H ? "top cut at " + ang + "° to the raking top" : "",
      );
    }
  } else {
    add("Side", 2, sp.H, sp.D, t);
    add("Top", 1, sp.W - 2 * t, sp.D, t);
    add("Bottom", 1, sp.W - 2 * t, sp.D, t);
    if (n > 1) add("Division", n - 1, ih, sp.D - bt, t);
  }
  if (sp.plinth) add("Plinth / kickboard", 1, sp.W, sp.plinth, t);
  if (bt) {
    const bfix =
      sp.backFix === "pinned"
        ? "pinned and glued onto the back"
        : sp.backFix === "screwed"
          ? "screwed onto the back"
          : "fits into a groove";
    /* wider than a sheet: one piece a bay, joining behind the divisions (or two halves on a batten) */
    const bcut = slope ? "; cut to the slope, " + sp.slopeLow + " at the low end" : "";
    if (sp.W <= 1220) add("Back panel", 1, sp.H - sp.plinth, sp.W, bt, bfix + bcut);
    else if (n > 1)
      ws.forEach((w) =>
        add(
          "Back panel",
          1,
          sp.H - sp.plinth,
          w + t,
          bt,
          bfix + "; one a bay, joins behind the divisions" + bcut,
        ),
      );
    else
      add(
        "Back panel",
        2,
        sp.H - sp.plinth,
        sp.W / 2,
        bt,
        bfix + "; two halves, joined on a batten" + bcut,
      );
  }
  if (ff) {
    const fh = sp.H - (sp.plinth || 0);
    add(
      "Face frame stile",
      2,
      fh,
      ff.w,
      ff.t,
      "left and right; glued and pocket-screwed to the carcass front",
    );
    add(
      "Face frame rail",
      2,
      sp.W - 2 * ff.w,
      ff.r,
      ff.t,
      "top and bottom, between the stiles" + (slope ? "; the top one follows the slope" : ""),
    );
    if (n > 1)
      add(
        "Face frame muntin",
        n - 1,
        fh - 2 * ff.r,
        ff.m,
        ff.t,
        "between the bays, over the divisions",
      );
  }
  const gap = 3;
  let fronts = 0,
    doorsN = 0,
    hinges = 0;
  const hingeN = (h) => (h > 1600 ? 4 : h > 900 ? 3 : 2);
  bays.forEach((b, i) => {
    const bay = "bay " + (i + 1);
    const L = b.L;
    const cw = (k) => (L.cw && L.cw[k] ? L.cw[k][1] - L.cw[k][0] : 0);
    L.shelves.forEach((y) =>
      add(
        "Shelf",
        1,
        cw(y) || b.w - 2,
        sd - 20,
        sht,
        bay + (cw(y) ? "; end cut to the slope" : ""),
      ),
    );
    if (ff && L.split) {
      const [a, z] = ff.opX(i);
      add("Face frame rail", 1, z - a, ff.r, ff.t, bay + "; between the doors");
    }
    L.fixed.forEach((f) =>
      add(
        f.part,
        1,
        cw(f.y) || b.w,
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
        let h = z.y1 - z.y0 - gap,
          w1 = b.w + t - gap;
        let xa = bx0[i] - t / 2,
          xb = bx0[i] + b.w + t / 2;
        let note = bay;
        if (ff) {
          const [a, zx] = ff.opX(i),
            [y0, y1] = ff.opY(z);
          h = y1 - y0 + 2 * ff.ov;
          w1 = zx - a + 2 * ff.ov;
          xa = a - ff.ov;
          xb = zx + ff.ov;
          note += ff.inset
            ? "; inset in the face frame (inset hinges)"
            : "; overlays the face frame by 12";
        }
        /* a top door under the slope: as tall as its high side, the top cut to the slope */
        if (slope && z.y1 >= sp.H - 1) {
          const top = ff ? -ff.r + ff.ov : -gap / 2;
          const ha = cbHAt(sp, xa) + top,
            hb = cbHAt(sp, xb) + top;
          if (Math.abs(ha - hb) > 1 || Math.min(ha, hb) < sp.H + top - 1) {
            const base = z.y1 + top - h;
            h = Math.max(ha, hb) - base;
            note +=
              "; top cut to the slope: " +
              Math.round(ha - base) +
              " at the left, " +
              Math.round(hb - base) +
              " at the right";
          }
        }
        if (dtp === "pairs") {
          add("Door", 2, h, (w1 + gap) / 2 - gap, dt, note);
          doorsN += 2;
          hinges += 2 * hingeN(h);
        } else {
          if (dtp === "glass") {
            add("Glazed door frame", 1, h, w1, dt, note + "; rebate for the glass");
            add("Glass panel (toughened, to order)", 1, h - 140, w1 - 140, 4, bay);
          } else if (dtp === "mirror") {
            add("Mirror door (backing board)", 1, h, w1, dt, note + "; mirror glued on");
            add("Mirror glass (safety-backed, to order)", 1, h - 4, w1 - 4, 4, bay);
          } else add("Door", 1, h, w1, dt, note);
          doorsN++;
          hinges += hingeN(h);
        }
      });
    /* fittings */
    if (b.shoe) add("Shoe shelf (angled)", 3, b.w - 2, 300, sht, bay + "; on angled bearers");
    if (b.trouser) add("Trouser pull-out (to buy)", 1, b.w, 0, 0, bay);
  });
  /* shelf supports */
  const adj = bays.reduce((a, b) => a + b.L.shelves.length, 0);
  const sup = sp.shelfSup || "pins";
  if (adj && sup === "pins") add("Shelf pins (to buy)", adj * 4, 0, 0, 0, "5 mm, 4 a shelf");
  if (adj && sup === "track") {
    bays.forEach((b, i) => {
      if (b.L.shelves.length)
        add(
          "Twin-slot uprights (to buy)",
          2,
          ih - 40,
          0,
          0,
          "bay " + (i + 1) + "; screwed to the back",
        );
    });
    add(
      "Twin-slot shelf brackets (to buy)",
      adj * 2,
      Math.round((sd - 40) / 50) * 50,
      0,
      0,
      "2 a shelf",
    );
  }
  if (adj && sup === "fixed")
    add("Confirmat screws or dowels (to buy)", adj * 4, 0, 0, 0, "4 a fixed shelf");
  /* lighting inside: the bays ticked (or all), the fittings, the drivers and the switching */
  const lit = bays.map((b, i) => [b, i]).filter(([b]) => b.led || sp.lightAll);
  const lt = sp.lightType || (lit.length ? "strip" : "");
  if (lt && lit.length) {
    const temp = sp.lightK || "warm white (3000 K)";
    let watts = 0;
    lit.forEach(([b, i]) => {
      const bay = "bay " + (i + 1);
      if (lt === "strip") {
        add(
          "LED strip in an aluminium profile (to buy)",
          1,
          b.w - 20,
          0,
          0,
          bay + "; under the top, " + temp,
        );
        watts += ((b.w - 20) / 1000) * 10;
      } else if (lt === "puck") {
        const n2 = b.w > 700 ? 2 : 1;
        add("LED puck spotlight (to buy)", n2, 0, 0, 0, bay + "; " + temp);
        watts += n2 * 3;
      } else if (lt === "profile") {
        add(
          "LED profile down the side (to buy)",
          2,
          sp.H - (sp.plinth || 0) - 2 * t - 40,
          0,
          0,
          bay + "; " + temp,
        );
        watts += ((2 * (sp.H - (sp.plinth || 0))) / 1000) * 8;
      } else if (lt === "rail") {
        if (b.L.rails.length) {
          add(
            "LED hanging rail (to buy)",
            b.L.rails.length,
            b.w - 4,
            0,
            0,
            bay + "; instead of a plain rail, " + temp,
          );
          watts += ((b.w * b.L.rails.length) / 1000) * 8;
        } else {
          add(
            "LED strip in an aluminium profile (to buy)",
            1,
            b.w - 20,
            0,
            0,
            bay + "; no rail here, so under the top",
          );
          watts += ((b.w - 20) / 1000) * 10;
        }
      }
    });
    add(
      "LED driver 12 V 30 W (to buy)",
      Math.max(1, Math.ceil(watts / 24)),
      0,
      0,
      0,
      "about " + Math.round(watts) + " W of lights",
    );
    const on = sp.lightOn || "door";
    if (on === "door") add("Door sensor switch (to buy)", lit.length, 0, 0, 0, "one a lit bay");
    else if (on === "pir") add("Motion sensor (to buy)", lit.length, 0, 0, 0, "one a lit bay");
    else add("Switch or touch dimmer (to buy)", 1, 0, 0, 0, "");
    add(
      "Plug-in lead or fused spur for the drivers",
      1,
      0,
      0,
      0,
      "a new mains connection is for an electrician (Part P)",
    );
  }
  /* finishing: fillers to the walls, end panels, cornice */
  const fL = +sp.fillL || 0,
    fR = +sp.fillR || 0,
    fT = +sp.fillT || 0;
  const fH = sp.H + (+sp.cornice || 0) + fT;
  if (fL) add("Filler", 1, fH, fL + 20, t, "left; scribe to the wall");
  if (fR) add("Filler", 1, fH, fR + 20, t, "right; scribe to the wall");
  if (fT)
    add(
      "Filler",
      1,
      sp.W + fL + fR + (sp.endL ? t : 0) + (sp.endR ? t : 0),
      fT + 20,
      t,
      "top; scribe to the ceiling",
    );
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
  if (sp.handle === "gola" && doorsN + fronts)
    add(
      "Gola profile, aluminium (to buy)",
      doorsN + fronts,
      0,
      0,
      0,
      "one a door or drawer front, cut to suit; doors 20 mm short of it",
    );
  if (hn && sp.handle !== "gola")
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
  const drawersN = bays.reduce((a, b) => a + b.L.drawers.length, 0);
  if (drawersN) {
    const rl = Math.max(250, Math.min(550, Math.floor((sd - 20) / 50) * 50));
    const rn = (CB_RUNNERS.find((r) => r[0] === (sp.runner || "soft-close")) ||
      CB_RUNNERS[0])[1].toLowerCase();
    add(`Drawer runners, ${rn}, ${rl} mm (pairs, to buy)`, drawersN, 0, 0, 0, "");
    /* the boxes: 13 mm each side for the runners, 15 mm sides, a 6 mm base in a groove */
    bays.forEach((b, i) =>
      b.L.drawers.forEach((d) => {
        const bh = Math.max(60, Math.round(d.h - 50)),
          bw = Math.round(b.w - 26);
        add(
          "Drawer box side",
          2,
          rl,
          bh,
          15,
          "bay " + (i + 1) + "; front " + Math.round(d.h) + " high",
        );
        add(
          "Drawer box front and back",
          2,
          bw - 30,
          bh - 12,
          15,
          "bay " + (i + 1) + "; between the sides, on the base",
        );
        add("Drawer base", 1, bw - 14, rl - 15, 6, "bay " + (i + 1) + "; in a 6 mm groove");
      }),
    );
  }
  if (sp.H > 1000)
    add(
      "Wall fixing brackets (to buy)",
      Math.max(2, n),
      0,
      0,
      0,
      "fix it to the wall so it can't tip",
    );
  if (sp.plinth)
    add("Plinth legs, adjustable (to buy)", 4 + 2 * Math.max(0, n - 1), 0, 0, 0, "clip-on plinth");
  /* boards to order: each material and thickness in 2440 × 1220 sheets, with 15% for waste */
  const sheets = {};
  cut.forEach((c) => {
    if (!c.th || /glass/i.test(c.part)) return;
    const k = c.th + " mm " + (c.mat || "board");
    sheets[k] = (sheets[k] || 0) + (c.l * c.w * c.qty) / 1e6;
  });
  P.sheets = Object.entries(sheets).map(([k, a]) => [
    k,
    Math.max(1, Math.ceil((a * 1.15) / 2.977)),
  ]);
  P.sheets.forEach(([k, q]) =>
    add(`Boards to order: ${k}, 2440 × 1220`, q, 0, 0, 0, "about, with 15% for waste"),
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
  const scaleTxt = api.k ? "1:" + api.k : "";
  const vt = (n, name, x, y, sc) => {
    objs.push({
      t: "circle",
      a: [x, y - Z * 0.75],
      b: [x + Z * 1.5, y + Z * 0.75],
      c: col,
      w: pwFor(2),
    });
    objs.push({
      t: "text",
      x: x + Z * (n > 9 ? 0.25 : 0.42),
      y: y - Z * 0.42,
      s: String(n).padStart(2, "0"),
      c: col,
      size: Math.round(Z * 0.7),
      ly: "notes",
    });
    objs.push({
      t: "text",
      x: x + Z * 2,
      y: y - Z * 0.75,
      s: name.toUpperCase(),
      c: col,
      size: Math.round(Z * 1.0),
      ly: "notes",
    });
    if (sc !== false)
      objs.push({
        t: "text",
        x: x + Z * 2,
        y: y + Z * 0.35,
        s: sc || scaleTxt,
        c: "#666666",
        size: Math.round(Z * 0.7),
        ly: "notes",
      });
  };
  let vn = 0;
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
  /* a sloping ceiling: the outline follows it (ox, oyb = the carcass's bottom left on the page) */
  const slope = cbSlopeOn(sp);
  const slopeXs = (xa, xb) => {
    const xs = [xa];
    if (slope) {
      const sw = cbSlopeW(sp),
        xk = sp.slope === "L" ? sw : sp.W - sw;
      if (xk > xa + 0.5 && xk < xb - 0.5) xs.push(xk);
    }
    xs.push(xb);
    return xs;
  };
  const polyLines = (pts, o) => {
    for (let k = 0; k < pts.length; k++)
      objs.push(
        Object.assign(
          { t: "line", a: pts[k], b: pts[(k + 1) % pts.length], c: col, w: lw },
          o || {},
        ),
      );
  };
  const outline = (ox, oyb) =>
    polyLines(
      [[ox, oyb]].concat(
        slopeXs(0, sp.W).map((xm) => [ox + U(xm), oyb - U(cbHAt(sp, xm))]),
        [[ox + W, oyb]],
      ),
    );
  /* --- the front with the doors on --- */
  const x1 = Math.max(Z * 5, (doc.w - (2 * W + P.n * D + (P.n + 1) * gapX)) / 2),
    y1 = top;
  if (slope) outline(x1, y1 + H);
  else rect(x1, y1, W, H);
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
    if (slope) {
      const tops = slopeXs((dx - x1) / U(1), (dx + dw - x1) / U(1)).map((xm) => [
        x1 + U(xm),
        Math.max(dTop, fy(cbHAt(sp, xm)) + U(1.5)),
      ]);
      if (tops.some((p) => p[1] > dTop + 0.01)) {
        polyLines([[dx, dBot]].concat(tops, [[dx + dw, dBot]]), { w: thin });
        const topAt = (px) => (Math.abs(px - dx) < 0.01 ? tops[0][1] : tops[tops.length - 1][1]);
        if (hinge) {
          const hx = hinge === "L" ? dx : dx + dw,
            ox = hinge === "L" ? dx + dw : dx,
            mid = (topAt(hx) + dBot) / 2;
          line(ox, topAt(ox), hx, mid, { dash: 1 });
          line(ox, dBot, hx, mid, { dash: 1 });
          const hxx = hinge === "L" ? dx + dw - U(45) : dx + U(45);
          const lowTop = Math.max(tops[0][1], tops[tops.length - 1][1]);
          handleAt(hxx, Math.min(Math.max(fy(1050), lowTop + U(150)), dBot - U(120)));
        }
        return;
      }
    }
    rect(dx, dTop, dw, dBot - dTop, {
      w: thin,
      fill: kind === "mirror" ? "#e3edf1" : kind !== "glass" && sp.colDoor ? sp.colDoor : undefined,
      fa: kind === "mirror" ? 0.7 : 0.55,
    });
    if (hnd === "gola" && hinge) {
      const gx = hinge === "L" ? dx + dw - U(25) : dx;
      rect(gx, dTop, U(25), dBot - dTop, { w: pwFor(1), fill: "#9aa0a6", fa: 0.9 });
    }
    /* which side the hinges are: lines from the handle-side corners meeting at the middle of the hinge side (the point is the hinges) */
    if (hinge) {
      const hx = hinge === "L" ? dx : dx + dw,
        ox = hinge === "L" ? dx + dw : dx;
      line(ox, dTop, hx, (dTop + dBot) / 2, { dash: 1 });
      line(ox, dBot, hx, (dTop + dBot) / 2, { dash: 1 });
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
  /* a face frame: stiles, rails and muntins on the front, under the doors */
  const FF = P.ff;
  if (FF) {
    const fo = { w: thin, fill: sp.colDoor || "#e9e3d8", fa: 0.7 };
    const fb = fy(sp.plinth || 0);
    const hl = cbHAt(sp, 0),
      hr = cbHAt(sp, sp.W);
    rect(x1, fy(hl), U(FF.w), fb - fy(hl), fo);
    rect(x1 + W - U(FF.w), fy(hr), U(FF.w), fb - fy(hr), fo);
    rect(x1 + U(FF.w), fb - U(FF.r), W - 2 * U(FF.w), U(FF.r), fo);
    if (slope) {
      const xs = slopeXs(FF.w, sp.W - FF.w);
      xs.slice(0, -1).forEach((xa, k) => {
        const xb = xs[k + 1];
        line(x1 + U(xa), fy(cbHAt(sp, xa) - FF.r), x1 + U(xb), fy(cbHAt(sp, xb) - FF.r), {
          w: thin,
        });
      });
    } else rect(x1 + U(FF.w), y1, W - 2 * U(FF.w), U(FF.r), fo);
    for (let i = 1; i < P.n; i++) {
      const xc = P.bx0[i] - t / 2;
      const tp = fy(cbHAt(sp, xc) - FF.r);
      rect(x1 + U(xc - FF.m / 2), tp, U(FF.m), fb - U(FF.r) - tp, fo);
    }
    P.bays.forEach((b, i) => {
      if (!b.L.split) return;
      const [a, z] = FF.opX(i);
      rect(x1 + U(a), fy(b.L.split + FF.r / 2), U(z - a), U(FF.r), fo);
    });
  }
  if (sp.doors !== "sliding")
    bx.forEach(([bxx, bw], i) => {
      const b = P.bays[i],
        dt = cbBayDoor(sp, b);
      let dx = x1 + bxx - T / 2 + U(1.5),
        dw = bw + T - U(3);
      if (FF) {
        const [a, zx] = FF.opX(i);
        dx = x1 + U(a - FF.ov);
        dw = U(zx - a + 2 * FF.ov);
      }
      if (dt === "none") rect(x1 + bxx, y1 + T, bw, H - PL - 2 * T, { w: thin });
      else
        b.L.zones.forEach((z) => {
          let zt = fy(z.y1) + U(1.5),
            zb = fy(z.y0) - U(1.5);
          if (FF) {
            const [y0, yt] = FF.opY(z);
            zt = fy(yt + FF.ov);
            zb = fy(y0 - FF.ov);
          }
          if (dt === "pairs") {
            const hw = (dw - U(3)) / 2;
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
      cH = U(+sp.cornice || 0),
      fT = U(+sp.fillT || 0);
    if (eL) rect(x1 - eL, y1, eL, H, { w: thin, fill: "#eeeeee" });
    if (eR) rect(x1 + W, y1, eR, H, { w: thin, fill: "#eeeeee" });
    if (fL) rect(x1 - eL - fL, y1 - cH - fT, fL, H + cH + fT, { w: thin, fill: "#f4f4f4" });
    if (fR) rect(x1 + W + eR, y1 - cH - fT, fR, H + cH + fT, { w: thin, fill: "#f4f4f4" });
    if (fT) rect(x1 - eL - fL, y1 - fT, W + eL + eR + fL + fR, fT, { w: thin, fill: "#f4f4f4" });
    if (cH)
      rect(x1 - eL - fL, y1 - cH - fT, W + eL + eR + fL + fR, cH, { w: thin, fill: "#eeeeee" });
    if (fL || fR || eL || eR || cH || fT)
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
  if (slope) {
    const lx = sp.slope === "L" ? x1 : x1 + W;
    objs.push(
      mkDim(
        [lx, y1 + H - U(+sp.slopeLow)],
        [lx, y1 + H],
        (sp.slope === "L" ? 1 : -1) * dimSize() * 1.2,
      ),
    );
    const sw = cbSlopeW(sp);
    if (sw < sp.W - 1) {
      const a = sp.slope === "L" ? x1 : x1 + W - U(sw);
      objs.push(mkDim([a, y1], [a + U(sw), y1], -dimSize() * 1.2));
    }
    text(
      sp.slope === "L" ? x1 + U(80) : x1 + W - U(80) - Z * 6,
      y1 + H - U(+sp.slopeLow) - Z * 0.6,
      "slope " + cbSlopeAng(sp) + "°",
      0.65,
    );
  }
  vt(++vn, "Front – doors on", x1, y1 - Z * 1.6);
  /* --- the front with the doors off: the inside --- */
  const x2 = x1 + W + gapX,
    y2 = top;
  if (slope) {
    outline(x2, y2 + H);
    line(x2 + T, y2 + H - U(cbHAt(sp, t)), x2 + T, y2 + H - PL, { w: thin });
    line(x2 + W - T, y2 + H - U(cbHAt(sp, sp.W - t)), x2 + W - T, y2 + H - PL, { w: thin });
    const xs = slopeXs(t, sp.W - t);
    xs.slice(0, -1).forEach((xa, k) =>
      line(
        x2 + U(xa),
        y2 + H - U(cbHAt(sp, xa) - t),
        x2 + U(xs[k + 1]),
        y2 + H - U(cbHAt(sp, xs[k + 1]) - t),
        { w: thin },
      ),
    );
  } else {
    rect(x2, y2, W, H);
    line(x2 + T, y2, x2 + T, y2 + H - PL, { w: thin });
    line(x2 + W - T, y2, x2 + W - T, y2 + H - PL, { w: thin });
    line(x2 + T, y2 + T, x2 + W - T, y2 + T, { w: thin });
  }
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
    if (i < P.n - 1) {
      const dTop = slope ? iy(cbHAt(sp, P.bx0[i] + P.ws[i] + t / 2) - t) : iTop;
      rect(lx + bw, dTop, T, iBot - dTop, { w: thin });
    }
    /* a board cut short by the slope: where it is across the bay */
    const span = (k) =>
      L.cw && L.cw[k] ? [x2 + U(L.cw[k][0]), U(L.cw[k][1] - L.cw[k][0])] : [lx, bw];
    L.drawers.forEach((d) => {
      const dt = iy(d.y + d.h),
        db = iy(d.y);
      rect(lx + U(1.5), dt + U(1.5), bw - U(3), db - dt - U(3), { w: thin });
      if (String(b.dh || "").trim())
        text(lx + U(15), (dt + db) / 2 - U(15), String(Math.round(d.h)), 0.55);
      line(lx + bw / 2 - U(60), (dt + db) / 2, lx + bw / 2 + U(60), (dt + db) / 2, { w: pwFor(4) });
    });
    L.shelves.forEach((y) => {
      const [sx, sw2] = span(y);
      rect(sx, iy(y) - ST / 2, sw2, ST, { w: thin });
    });
    L.fixed.forEach((f) => {
      const [sx, sw2] = span(f.y);
      rect(sx, iy(f.y) - ST / 2, sw2, ST, { w: thin, fill: "#e6e6e6" });
    });
    L.rails.forEach((y) => {
      const [sx, sw2] = span("r" + y);
      line(sx + U(30), iy(y), sx + sw2 - U(30), iy(y), { w: pwFor(6) });
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
    /* shelf supports: rows of pin holes, or twin-slot uprights, where there are adjustable shelves */
    if (L.shelves.length && (sp.shelfSup || "pins") !== "fixed") {
      const tr = sp.shelfSup === "track";
      [lx + U(tr ? 60 : 37), lx + bw - U(tr ? 60 : 37)].forEach((xx) =>
        line(
          xx,
          iTop + U(tr ? 30 : 250),
          xx,
          floor - U(tr ? 30 : 250),
          tr ? { w: pwFor(4), c: "#888888" } : { w: pwFor(1), c: "#888888", dash: 1 },
        ),
      );
    }
    /* lights */
    const lt = sp.lightType || (b.led ? "strip" : "");
    if (lt && (b.led || sp.lightAll)) {
      const LC = { c: "#d4a017", w: pwFor(4), dash: 1 };
      if (lt === "puck")
        (bw > U(700) ? [0.3, 0.7] : [0.5]).forEach((f) =>
          objs.push({
            t: "circle",
            a: [lx + bw * f - U(30), iTop + U(10)],
            b: [lx + bw * f + U(30), iTop + U(70)],
            c: "#d4a017",
            w: thin,
            fill: "#ffe9a8",
            fa: 0.99,
          }),
        );
      else if (lt === "profile")
        [lx + U(15), lx + bw - U(15)].forEach((xx) => line(xx, iTop + U(20), xx, iBot - U(20), LC));
      else if (lt === "rail" && L.rails.length)
        L.rails.forEach((y) => line(lx + U(30), iy(y) + U(12), lx + bw - U(30), iy(y) + U(12), LC));
      else line(lx + U(20), iTop + U(20), lx + bw - U(20), iTop + U(20), LC);
    }
    objs.push(mkDim([lx, y2], [lx + bw, y2], -dimSize() * 1.6));
    text(lx + U(40), floor - U(60), String(i + 1), 0.8);
  });
  objs.push(
    mkDim([x2, y2 + H], [x2 + W, y2 + H], dimSize() * 2.4),
    mkDim([x2 + W, iTop], [x2 + W, iBot], -dimSize() * 2.4),
  );
  vt(++vn, "Front – inside", x2, y2 - Z * 1.6 - dimSize() * 2.4);
  /* --- a section through every bay: its shelves, rails, drawers and doors, side on (front on the left) --- */
  const x3 = x2 + W + gapX,
    y3 = top,
    ST3 = U(P.sht),
    DT3 = U(P.dt);
  const sy = (yy) => y3 + H - U(yy);
  P.bays.forEach((b, i) => {
    const xs = x3 + i * (D + gapX);
    const L = b.L;
    rect(xs, y3, D, H);
    if (sp.bt) rect(xs + D - U(sp.bt), y3 + T, U(sp.bt), H - PL - T, { w: thin, fill: "#cccccc" });
    line(xs, y3 + T, xs + D, y3 + T, { w: thin });
    line(xs, sy(P.iB), xs + D, sy(P.iB), { w: thin });
    if (PL) line(xs + U(60), y3 + H - PL, xs + D, y3 + H - PL, { w: thin });
    const back = xs + D - U(sp.bt || 0);
    L.shelves.forEach((y) =>
      rect(xs + U(20), sy(y) - ST3 / 2, back - xs - U(20), ST3, { w: thin }),
    );
    L.fixed.forEach((f) =>
      rect(
        xs + (/Desk/.test(f.part) ? 0 : U(20)),
        sy(f.y) - ST3 / 2,
        back - xs - (/Desk/.test(f.part) ? 0 : U(20)),
        ST3,
        { w: thin, fill: "#e6e6e6" },
      ),
    );
    L.drawers.forEach((d) =>
      rect(
        xs + U(b.k === "desk" ? 0 : 25),
        sy(d.y + d.h) + U(3),
        Math.min(back - xs - U(40), U(500)),
        U(d.h) - U(6),
        { w: thin },
      ),
    );
    L.rails.forEach((y) =>
      objs.push({
        t: "circle",
        a: [xs + D / 2 - U(15), sy(y) - U(15)],
        b: [xs + D / 2 + U(15), sy(y) + U(15)],
        c: col,
        w: thin,
      }),
    );
    /* the doors on the front */
    const dtp = cbBayDoor(sp, b);
    const FT = FF ? U(FF.t) : 0;
    if (FF) rect(xs - FT, y3, FT, H - PL, { w: thin, fill: sp.colDoor || "#e9e3d8", fa: 0.7 });
    const dxs = FF ? (FF.inset ? xs - FT : xs - FT - DT3) : xs - DT3;
    if (dtp !== "none" && dtp !== "sliding")
      L.zones.forEach((z) =>
        rect(dxs, sy(z.y1) + U(1.5), DT3, U(z.y1 - z.y0) - U(3), {
          w: thin,
          fill: sp.colDoor || undefined,
          fa: 0.55,
        }),
      );
    if (sp.doors === "sliding") rect(xs - U(70), y3 + U(20), U(40), H - PL - U(40), { w: thin });
    /* heights from the floor */
    L.shelves
      .concat(L.fixed.map((f) => f.y))
      .forEach((y) => text(xs + D + Z * 0.3, sy(y) + Z * 0.25, String(Math.round(y)), 0.55));
    L.rails.forEach((y) => text(xs + D + Z * 0.3, sy(y) + Z * 0.25, "rail " + Math.round(y), 0.55));
    objs.push(mkDim([xs, y3 + H], [xs + D, y3 + H], dimSize() * 2.4));
    vt(
      ++vn,
      "Section " + String(i + 1).padStart(2, "0") + " – bay " + (i + 1),
      xs - DT3,
      y3 - Z * 1.6,
    );
  });
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
  vt(++vn, "Plan", x2 - Z * 7, y4 + Z * 1.2);
  /* --- title and cutting list --- */
  /* below the door swings on the plan */
  const yt =
    y4 + D + (sp.doors === "hinged" || sp.doors === "pairs" ? U(Math.max(...P.ws) + t) : 0) + Z * 3;
  text(
    x1,
    yt,
    `${sp.name || "Cupboard"} – ${sp.W} wide × ${sp.H} high × ${sp.D} deep${slope ? `, sloping down to ${sp.slopeLow} at the ${sp.slope === "L" ? "left" : "right"} (${cbSlopeAng(sp)}°)` : ""}. Boards ${t} mm${sp.bt ? `, back ${sp.bt} mm` : ""}${sp.plinth ? `, plinth ${sp.plinth} mm` : ""}.`,
    1,
  );
  /* boards, edging, colours and handles */
  {
    const cn = (c) => (c ? (CB3_COLS.find((x) => x[0] === c) || [c, c])[1] : "");
    const bits = [
      `Doors and fronts ${P.dt} mm, shelves ${P.sht} mm`,
      FF
        ? `face frame ${FF.w} mm ${(sp.ffMat || "hardwood").toLowerCase()}, doors ${FF.inset ? "inset" : "over the frame"}`
        : "",
      sp.edge || "",
      sp.colCar ? "carcass " + cn(sp.colCar).toLowerCase() : "",
      sp.colDoor ? "doors " + cn(sp.colDoor).toLowerCase() : "",
      sp.colTop ? "shelves and top " + cn(sp.colTop).toLowerCase() : "",
      (CB_HANDLES.find((h) => h[0] === (sp.handle || "bar")) || ["", ""])[1].toLowerCase(),
      sp.slideMirror && sp.doors === "sliding" ? "mirror sliding doors" : "",
      sp.matCar ? "carcass " + sp.matCar : "",
      sp.matDoor ? "doors " + sp.matDoor : "",
      sp.matShelf ? "shelves " + sp.matShelf : "",
      (CB_SUPS.find((x) => x[0] === (sp.shelfSup || "pins")) || ["", ""])[1]
        .toLowerCase()
        .replace(/ \(.*\)/, ""),
      sp.lightType
        ? (CB_LIGHTS.find((x) => x[0] === sp.lightType) || ["", ""])[1].toLowerCase() +
          (sp.lightAll ? " in every bay" : "")
        : "",
    ].filter(Boolean);
    text(x1, yt + Z * 1.3, bits.join(" · ") + ".", 0.8);
  }
  /* finishes key: a round swatch of each colour chosen, with what it is */
  const ys = yt + Z * 3.2;
  const keyItems = [
    [sp.colCar, "Carcass", sp.matCar],
    [sp.colDoor, "Doors and fronts", sp.matDoor || sp.matCar],
    [sp.colTop, "Shelves and top", sp.matShelf || sp.matCar],
  ].filter((k) => k[0] || k[2]);
  let kx = x1;
  if (keyItems.length) {
    text(kx, ys, "FINISHES", 0.9);
    keyItems.forEach(([c, what, m], i) => {
      const cy = ys + Z * 1.6 + i * Z * 2.4;
      objs.push({
        t: "circle",
        a: [kx, cy - Z * 0.9],
        b: [kx + Z * 1.8, cy + Z * 0.9],
        c: col,
        w: thin,
        fill: c || "#ffffff",
        fa: 0.99,
      });
      text(kx + Z * 2.3, cy - Z * 0.55, what, 0.8);
      text(
        kx + Z * 2.3,
        cy + Z * 0.45,
        [c ? (CB3_COLS.find((x) => x[0] === c) || [c, c])[1] : "", m || ""]
          .filter(Boolean)
          .join(" · "),
        0.65,
      );
    });
    kx += Z * 14;
  }
  /* the cutting list: its own page, three columns */
  const cutObjs = [];
  const ctext = (x, y, str, k) =>
    cutObjs.push({
      t: "text",
      x,
      y,
      s: str,
      c: "#333333",
      size: Math.round(18 * (k || 0.9)),
      ly: "notes",
    });
  const cx0 = Z * 5;
  let cy0 = Z * 6;
  ctext(cx0, cy0, `${sp.name || "Cupboard"} – cutting list`, 1.3);
  cy0 += Z * 1.8;
  ctext(
    cx0,
    cy0,
    `${sp.W} wide × ${sp.H} high × ${sp.D} deep · boards ${t} mm${sp.bt ? `, back ${sp.bt} mm` : ""}${sp.plinth ? `, plinth ${sp.plinth} mm` : ""}`,
    0.9,
  );
  cy0 += Z * 2;
  ctext(cx0, cy0, "CUTTING LIST (length × width × thickness, mm)", 1);
  const cols = 3,
    per = Math.ceil(P.cut.length / cols),
    colW = (doc.w - cx0 * 2) / cols;
  P.cut.forEach((c, i) => {
    const yy = cy0 + ((i % per) + 1) * Z * 1.25;
    ctext(
      cx0 + Math.floor(i / per) * colW,
      yy,
      `${c.qty} × ${c.part}${c.th ? `: ${c.l} × ${c.w} × ${c.th}${c.mat ? " – " + c.mat : ""}` : c.l ? `: ${c.l} long` : ""}${c.note ? "  (" + c.note + ")" : ""}`,
      0.75,
    );
  });
  objs.forEach((o) => Object.keys(o).forEach((k) => o[k] === undefined && delete o[k]));
  cutObjs.forEach((o) => Object.keys(o).forEach((k) => o[k] === undefined && delete o[k]));
  return { objs, cut: P.cut, cutObjs, strip: { x: kx, y: ys }, vn };
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
    `<div class="cb2-bay" data-i="${i}"><b>Bay ${i + 1}</b><select class="cb2-k" aria-label="Bay ${i + 1}: what's in it">${CB_BAYS.map(([k, l]) => `<option value="${k}"${k === b.k ? " selected" : ""}>${l}</option>`).join("")}</select><label>Shelves<input class="cb2-s" type="number" inputmode="numeric" min="0" max="12" value="${b.s}"></label><label>Drawers<input class="cb2-d" type="number" inputmode="numeric" min="0" max="8" value="${b.d}"></label><select class="cb2-dr" aria-label="Bay ${i + 1}: doors">${CB_BAYDOORS.map(([k, l]) => `<option value="${k}"${k === (b.door || "") ? " selected" : ""}>${l}</option>`).join("")}</select><span class="cb2-fit"><label class="inl"><input type="checkbox" class="cb2-shoe"${b.shoe ? " checked" : ""}> Shoe rack</label><label class="inl"><input type="checkbox" class="cb2-tr"${b.trouser ? " checked" : ""}> Trouser pull-out</label><label class="inl"><input type="checkbox" class="cb2-led"${b.led ? " checked" : ""}> LED light</label></span><details class="cb2-adj"${b.w || b.sh || b.dh || b.rail || b.top ? " open" : ""}><summary>Adjust this bay</summary><div class="cb2-adjg"><label>Width inside (mm)<input class="cb2-w" type="number" inputmode="numeric" value="${b.w || ""}" placeholder="share"></label><label>Top box height (mm)<input class="cb2-tb" type="number" inputmode="numeric" value="${b.top || ""}" placeholder="none"></label><label>Drawer heights (mm, bottom first)<input class="cb2-dh" inputmode="numeric" maxlength="60" value="${esc(String(b.dh || ""))}" placeholder="180 – or e.g. 250, 200, 150"></label><label>Rail height from the floor (mm)<input class="cb2-rl" type="number" inputmode="numeric" value="${b.rail || ""}" placeholder="auto"></label><label class="cb2-shl">Shelf heights from the floor (mm)<input class="cb2-sh" maxlength="80" value="${esc(b.sh || "")}" placeholder="e.g. 400, 800, 1200 – or leave for even"></label></div><div class="who">A top box puts a fixed shelf and a separate door at the top. Leave a box empty to let the app work it out.</div></details></div>`;
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
    dh: r.querySelector(".cb2-dh").value.trim(),
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
      <div class="grid2"><label for="cb2-ftop">Filler at the top (mm, to the ceiling)<input id="cb2-ftop" type="number" inputmode="numeric" value="${v("fillT", 0)}"></label><span></span></div>
      <div class="grid2"><label for="cb2-co">Cornice height (mm, 0 = none)<input id="cb2-co" type="number" inputmode="numeric" value="${v("cornice", 0)}"></label><label for="cb2-wt">Width at the top, if not square (mm)<input id="cb2-wt" type="number" inputmode="numeric" value="${v("openTop", "")}" placeholder="same as the bottom"></label></div>
      <div class="who">Width and height above are the whole opening. The fillers (sides and top), end panels and cornice come off them, and the narrower end of an out-of-square opening is used, with the fillers scribed to fit.</div>
      <div class="grid2"><label for="cb2-sl">Sloping ceiling (eaves or stairs)<select id="cb2-sl"><option value="">No – a level top</option><option value="L"${v("slope", "") === "L" ? " selected" : ""}>Slopes down to the left</option><option value="R"${v("slope", "") === "R" ? " selected" : ""}>Slopes down to the right</option></select></label><label for="cb2-slh" class="cb2-sls">Height at the low end (mm)<input id="cb2-slh" type="number" inputmode="numeric" value="${v("slopeLow", 1200)}"></label></div>
      <label for="cb2-slw" class="cb2-sls">The slope runs in from that end (mm – blank = all the way across)<input id="cb2-slw" type="number" inputmode="numeric" value="${v("slopeW", "")}" placeholder="all the way"></label>
      <div class="grid2"><label for="cb2-ff">Front<select id="cb2-ff"><option value="">Frameless – doors on the carcass</option><option value="overlay"${v("ff", "") === "overlay" ? " selected" : ""}>Face frame – doors over the frame</option><option value="inset"${v("ff", "") === "inset" ? " selected" : ""}>Face frame – doors inset in the frame</option></select></label><label for="cb2-ffm" class="cb2-ffs">Frame timber<input id="cb2-ffm" maxlength="40" value="${esc(v("ffMat", "Tulipwood"))}"></label></div>
      <div class="grid2 cb2-ffs"><label for="cb2-ffw">Stiles – the sides (mm)<input id="cb2-ffw" type="number" inputmode="numeric" value="${v("ffW", 45)}"></label><label for="cb2-ffr">Rails – top and bottom (mm)<input id="cb2-ffr" type="number" inputmode="numeric" value="${v("ffR", 45)}"></label></div>
      <div class="grid2 cb2-ffs"><label for="cb2-ffj">Muntins – between bays (mm)<input id="cb2-ffj" type="number" inputmode="numeric" value="${v("ffM", 45)}"></label><label for="cb2-fft">Frame thickness (mm)<input id="cb2-fft" type="number" inputmode="numeric" value="${v("ffT", 20)}"></label></div>
    </fieldset>
    <div class="cb2-g" data-k="full alcove base corner stairs eaves bridge window seat bench tv">
    <details class="cb2-fin"${last.colDoor || last.edge || last.dt ? " open" : ""}><summary>Boards, edging, colours and handles</summary>
    <div class="grid2"><label for="cb2-t">Carcass board thickness (mm)<input id="cb2-t" type="number" inputmode="numeric" value="${v("t", 18)}"></label><label for="cb2-bt">Back panel thickness (0 = no back)<input id="cb2-bt" type="number" inputmode="numeric" value="${v("bt", 6)}"></label></div>
    <div class="grid2"><label for="cb2-dt">Doors and drawer fronts (mm)<input id="cb2-dt" type="number" inputmode="numeric" value="${v("dt", "")}" placeholder="same as the carcass"></label><label for="cb2-sht">Shelves (mm)<input id="cb2-sht" type="number" inputmode="numeric" value="${v("sht", "")}" placeholder="same as the carcass"></label></div>
    <div class="grid2"><label for="cb2-bf">Back panel fixed<select id="cb2-bf"><option value="groove"${v("backFix", "groove") === "groove" ? " selected" : ""}>Into a groove</option><option value="pinned"${v("backFix", "") === "pinned" ? " selected" : ""}>Pinned and glued on</option><option value="screwed"${v("backFix", "") === "screwed" ? " selected" : ""}>Screwed on</option></select></label><label for="cb2-edge">Edging<select id="cb2-edge">${CB_EDGES.map(([k, l]) => `<option value="${k}"${k === v("edge", CB_EDGES[0][0]) ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <div class="grid2"><label for="cb2-cc">Carcass colour<select id="cb2-cc"><option value="">Not chosen</option>${CB3_COLS.map(([k, l]) => `<option value="${k}"${k === v("colCar", "") ? " selected" : ""}>${l}</option>`).join("")}</select></label><label for="cb2-cd">Door colour<select id="cb2-cd"><option value="">Not chosen</option>${CB3_COLS.map(([k, l]) => `<option value="${k}"${k === v("colDoor", "") ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <div class="grid2"><label for="cb2-ct">Shelves and top colour<select id="cb2-ct"><option value="">Not chosen</option>${CB3_COLS.map(([k, l]) => `<option value="${k}"${k === v("colTop", "") ? " selected" : ""}>${l}</option>`).join("")}</select></label><label for="cb2-hd">Handles<select id="cb2-hd">${CB_HANDLES.map(([k, l]) => `<option value="${k}"${k === v("handle", "bar") ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <div class="grid2"><label for="cb2-mc">Carcass made of<select id="cb2-mc"><option value="">Not chosen</option>${CB_MATS.map(([k, l]) => `<option value="${k}"${k === v("matCar", "") ? " selected" : ""}>${l}</option>`).join("")}</select></label><label for="cb2-md">Doors and fronts made of<select id="cb2-md"><option value="">Not chosen</option>${CB_MATS.map(([k, l]) => `<option value="${k}"${k === v("matDoor", "") ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <div class="grid2"><label for="cb2-ms">Shelves made of<select id="cb2-ms"><option value="">Not chosen</option>${CB_MATS.map(([k, l]) => `<option value="${k}"${k === v("matShelf", "") ? " selected" : ""}>${l}</option>`).join("")}</select></label><label for="cb2-mb">Back made of<select id="cb2-mb">${CB_BACKS.map(([k, l]) => `<option value="${k}"${k === v("matBack", "MDF") ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <label class="inl"><input type="checkbox" id="cb2-sm"${v("slideMirror", false) ? " checked" : ""}> Mirror sliding doors</label>
    <div class="who">The materials and colours go on the drawing and the cutting list, with how many boards to order; the colours and handles are the starting choice in the 🎨 3D view.</div></details>
    <details class="cb2-fin"${last.lightType || last.shelfSup ? " open" : ""}><summary>Shelves, lighting and fittings</summary>
    <div class="grid2"><label for="cb2-sup">Adjustable shelves sit on<select id="cb2-sup">${CB_SUPS.map(([k, l]) => `<option value="${k}"${k === v("shelfSup", "pins") ? " selected" : ""}>${l}</option>`).join("")}</select></label><label for="cb2-run">Drawer runners<select id="cb2-run">${CB_RUNNERS.map(([k, l]) => `<option value="${k}"${k === v("runner", "soft-close") ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <div class="grid2"><label for="cb2-lt">Lighting inside<select id="cb2-lt">${CB_LIGHTS.map(([k, l]) => `<option value="${k}"${k === v("lightType", "") ? " selected" : ""}>${l}</option>`).join("")}</select></label><label for="cb2-lon">Lights come on by<select id="cb2-lon">${CB_LIGHTON.map(([k, l]) => `<option value="${k}"${k === v("lightOn", "door") ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <div class="grid2"><label for="cb2-lk">Light colour<select id="cb2-lk">${["warm white (3000 K)", "neutral white (4000 K)", "cool white (6000 K)"].map((k) => `<option${k === v("lightK", "warm white (3000 K)") ? " selected" : ""}>${k}</option>`).join("")}</select></label><label class="inl"><input type="checkbox" id="cb2-la"${v("lightAll", false) ? " checked" : ""}> Light every bay (or tick LED light on the bays you want)</label></div>
    <div class="who">Pins: rows of holes drilled in the sides (the workshop pack shows them). Track: slotted uprights on the back with brackets. Lights run off a 12 V driver – the mains connection is for an electrician.</div></details>
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
        matCar: $("cb2-mc").value,
        matDoor: $("cb2-md").value,
        matShelf: $("cb2-ms").value,
        matBack: $("cb2-mb").value,
        shelfSup: $("cb2-sup").value,
        runner: $("cb2-run").value,
        lightType: $("cb2-lt").value,
        lightOn: $("cb2-lon").value,
        lightK: $("cb2-lk").value,
        lightAll: $("cb2-la").checked,
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
          fillT: Math.max(0, num("cb2-ftop", 0)),
          slope: $("cb2-sl").value,
          slopeW: Math.max(0, num("cb2-slw", 0)) || "",
          ff: $("cb2-ff").value,
          ffMat: $("cb2-ffm").value.trim(),
          ffW: Math.max(20, num("cb2-ffw", 45)),
          ffR: Math.max(20, num("cb2-ffr", 45)),
          ffM: Math.max(20, num("cb2-ffj", 45)),
          ffT: Math.max(10, num("cb2-fft", 20)),
          openTop: num("cb2-wt", 0) || "",
          open: sp.W,
          Hopen: sp.H,
        });
        const narrow = Math.min(sp.W, sp.openTop || sp.W);
        sp.W = narrow - sp.fillL - sp.fillR - (sp.endL ? sp.t : 0) - (sp.endR ? sp.t : 0);
        sp.H = sp.H - sp.cornice - sp.fillT;
        if (sp.slope) {
          sp.slopeLow = Math.round(num("cb2-slh", 1200) - sp.cornice - sp.fillT);
          if (sp.slopeLow < 300 || sp.slopeLow >= sp.H)
            return showErr(
              "The height at the low end of the slope must be lower than the height, and at least 300.",
            );
        }
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
  /* the slope's and the frame's sizes only when they're picked */
  const extraSync = () => {
    document
      .querySelectorAll(".cb2-sls")
      .forEach((e) => (e.style.display = $("cb2-sl").value ? "" : "none"));
    document
      .querySelectorAll(".cb2-ffs")
      .forEach((e) => (e.style.display = $("cb2-ff").value ? "" : "none"));
  };
  $("cb2-sl").onchange = extraSync;
  $("cb2-ff").onchange = extraSync;
  extraSync();
  $("cb2-bh").oninput = () =>
    $("cb2-kind").value === "base" && ($("cb2-H").value = $("cb2-bh").value);
  kindSync();
  /* small pictures to tap for what's being made and the doors */
  cbpPicker("cb2-kind", CBP_KIND, "cb2-kpics");
  cbpPicker("cb2-doors", CBP_DOOR, "cb2-dpics");
}

/* four magnified details, each a circle at 1:5 with its number and name: the top (and cornice or top filler), the
   plinth, the handle or gola, and how the shelves are held. ox, oy: the top left of the row; U is at 1:5 */
function cbDetails(sp, api, ox, oy, n0) {
  const { U, pwFor } = api;
  const P = cbPlan(sp);
  const objs = [];
  const col = "#111111",
    thin = pwFor(2),
    lw = pwFor(4);
  const rect = (x, y, w, h, o) =>
    objs.push(Object.assign({ t: "rect", a: [x, y], b: [x + w, y + h], c: col, w: lw }, o || {}));
  const line = (x1, y1, x2, y2, o) =>
    objs.push(Object.assign({ t: "line", a: [x1, y1], b: [x2, y2], c: col, w: thin }, o || {}));
  const text = (x, y, s2, k, c) =>
    objs.push({
      t: "text",
      x,
      y,
      s: s2,
      c: c || "#333333",
      size: Math.round(18 * (k || 0.8)),
      ly: "notes",
    });
  const Z = 18,
    R = U(70),
    t = U(sp.t),
    dt = U(P.dt),
    st = U(P.sht);
  const car = sp.colCar || "#f1ece4",
    dc = sp.colDoor || "#e9e3d8";
  const titles = [];
  const ring = (i, name, draw) => {
    const cx = ox + R + i * (2 * R + Z * 3),
      cy = oy + R;
    objs.push({ t: "circle", a: [cx - R, cy - R], b: [cx + R, cy + R], c: col, w: thin, dash: 1 });
    draw(cx, cy);
    titles.push([cx - R, cy + R + Z * 1.6, name]);
  };
  /* 1: the top – side, top board, the door in front, and the cornice or top filler above */
  ring(0, "Top" + (+sp.cornice ? " and cornice" : +sp.fillT ? " and top filler" : ""), (cx, cy) => {
    const xs = cx - U(20),
      yt = cy - U(5);
    rect(xs, yt, t, U(70), { fill: car, fa: 0.9 });
    rect(xs + t, yt, U(60), t, { fill: car, fa: 0.9 });
    rect(xs - dt - U(2), yt + U(2), dt, U(65), { fill: dc, fa: 0.8 });
    if (+sp.cornice || +sp.fillT)
      rect(xs - dt - U(2), yt - U(35), dt + t + U(60), U(33), { w: thin, fill: dc, fa: 0.6 });
    line(cx - R * 0.9, yt - U(36), cx + R * 0.9, yt - U(36), { w: lw });
    text(cx - R * 0.85, yt - U(40), "ceiling", 0.55);
    text(xs + t + U(4), yt + t + U(14), sp.t + " top", 0.55);
  });
  /* 2: the plinth – the bottom on the plinth, set back, the floor */
  ring(1, "Plinth", (cx, cy) => {
    const xs = cx - U(20),
      fl = cy + U(58),
      pl = U(Math.min(+sp.plinth || 0, 90));
    rect(xs, fl - pl - t - U(15), t, U(15) + t + pl, { fill: car, fa: 0.9 });
    rect(xs + t, fl - pl - t, U(60), t, { fill: car, fa: 0.9 });
    if (pl) rect(xs + U(40), fl - pl, t, pl - U(2), { w: thin, fill: dc, fa: 0.6 });
    rect(xs - dt - U(2), fl - pl - t - U(15), dt, U(15) + t - U(3), { fill: dc, fa: 0.8 });
    line(cx - R * 0.9, fl, cx + R * 0.9, fl, { w: lw });
    text(cx - R * 0.85, fl + U(10), "floor", 0.55);
    if (pl) text(xs + U(40) + t + U(3), fl - pl / 2, "plinth " + sp.plinth + ", set back 40", 0.5);
  });
  /* 3: the handle – in plan at the door edge: a gola channel, a bar, a knob or push to open */
  const hnd = sp.handle || "bar";
  ring(
    2,
    hnd === "gola" ? "Gola profile" : hnd === "none" ? "Push to open" : "Handle",
    (cx, cy) => {
      const y0 = cy - U(10);
      rect(cx - U(60), y0, U(60), dt, { fill: dc, fa: 0.8 });
      rect(cx + U(3), y0, U(50), dt, { fill: dc, fa: 0.8 });
      rect(cx - U(60), y0 + dt + U(2), U(60), t, { w: thin, fill: car, fa: 0.7 });
      if (hnd === "gola") {
        objs.push({
          t: "line",
          a: [cx - U(25), y0 - U(1)],
          b: [cx - U(25), y0 + dt * 0.6],
          c: "#555555",
          w: lw,
        });
        rect(cx - U(25), y0 + dt * 0.4, U(25), U(3), { w: thin, fill: "#9aa0a6", fa: 0.9 });
        text(cx - R * 0.8, cy + R * 0.55, "channel 25 × 30", 0.55);
      } else if (hnd === "none") {
        rect(cx - U(20), y0 + dt + U(3), U(15), U(10), { w: thin, fill: "#9aa0a6", fa: 0.9 });
        text(cx - R * 0.8, cy + R * 0.55, "push catch", 0.55);
      } else {
        line(cx - U(45), y0 - U(30), cx - U(15), y0 - U(30), {
          w: lw,
          c: hnd === "black" ? "#111111" : "#777777",
        });
        line(cx - U(45), y0 - U(30), cx - U(45), y0, { w: thin });
        line(cx - U(15), y0 - U(30), cx - U(15), y0, { w: thin });
        text(cx - R * 0.8, cy + R * 0.55, hnd === "knob" ? "knob" : "bar handle", 0.55);
      }
    },
  );
  /* 4: how the shelves are held */
  const sup = sp.shelfSup || "pins";
  ring(
    3,
    sup === "track" ? "Shelf on track" : sup === "fixed" ? "Fixed shelf" : "Shelf pin",
    (cx, cy) => {
      const xs = cx - U(30);
      rect(xs, cy - U(60), t, U(120), { fill: car, fa: 0.9 });
      if (sup === "track") {
        rect(xs + t, cy - U(60), U(8), U(120), { w: thin, fill: "#9aa0a6", fa: 0.9 });
        rect(xs + t + U(8), cy - U(6), U(20), U(4), { w: thin, fill: "#9aa0a6", fa: 0.9 });
        rect(xs + t + U(10), cy - U(6) - st, U(80), st, { fill: car, fa: 0.6 });
      } else if (sup === "fixed") {
        rect(xs + t, cy - st / 2, U(80), st, { fill: car, fa: 0.6 });
        line(xs - U(10), cy, xs + t + U(30), cy, { dash: 1 });
        text(cx - R * 0.8, cy + R * 0.55, "dowelled / screwed", 0.55);
      } else {
        [-32, 0, 32].forEach((d) =>
          objs.push({
            t: "circle",
            a: [xs + t / 2 - U(2.5), cy + U(d) - U(2.5)],
            b: [xs + t / 2 + U(2.5), cy + U(d) + U(2.5)],
            c: col,
            w: thin,
          }),
        );
        rect(xs + t, cy + U(1), U(14), U(5), { w: thin, fill: "#9aa0a6", fa: 0.9 });
        rect(xs + t + U(1), cy - st + U(1), U(80), st, { fill: car, fa: 0.6 });
        text(cx - R * 0.8, cy + R * 0.55, "5 mm pins, holes every 32", 0.55);
      }
    },
  );
  return { objs, titles, R };
}
