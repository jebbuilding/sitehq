/* ================= CUPBOARD MAKER: fitted cupboards and wardrobes drawn to scale, with a cutting list ================= */
import { $, esc } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
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
  ["none", "Open – no door"],
];
const cbBayDoor = (sp, b) => (sp.doors === "sliding" ? "sliding" : (b && b.door) || sp.doors);
/* the boards to cut, and where everything goes, from the sizes */
function cbPlan(sp) {
  const t = sp.t,
    bt = sp.bt;
  const n = Math.max(1, Math.min(8, sp.n | 0));
  const inner = sp.W - 2 * t - (n - 1) * t;
  let ws = String(sp.widths || "")
    .split(/[ ,]+/)
    .map(Number)
    .filter((x) => x > 0);
  /* the bay widths are inside sizes; "equal" (or a list that doesn't add up) shares the room evenly */
  if (ws.length !== n || Math.abs(ws.reduce((a, b) => a + b, 0) - inner) > 2)
    ws = Array.from({ length: n }, () => Math.round((inner / n) * 10) / 10);
  const ih = sp.H - sp.plinth - 2 * t; /* inside height */
  const sd = sp.D - bt - (sp.back ? 0 : 0); /* shelf depth up to the back panel */
  const bays = ws.map((w, i) => Object.assign({ w }, sp.bays[i] || { k: "shelves", s: 3, d: 0 }));
  const cut = [];
  const add = (part, qty, l, w, th, note) => {
    const ex = cut.find((c) => c.part === part && c.l === l && c.w === w && c.th === th);
    if (ex) ex.qty += qty;
    else cut.push({ part, qty, l: Math.round(l), w: Math.round(w), th, note: note || "" });
  };
  add("Side", 2, sp.H, sp.D, t);
  add("Top", 1, sp.W - 2 * t, sp.D, t);
  add("Bottom", 1, sp.W - 2 * t, sp.D, t);
  if (n > 1) add("Division", n - 1, ih, sp.D - bt, t);
  if (sp.plinth) add("Plinth / kickboard", 1, sp.W, sp.plinth, t);
  if (bt) add("Back panel", 1, sp.H - sp.plinth, sp.W, bt, "fits into a groove or onto the back");
  const drH = 180,
    gap = 3;
  bays.forEach((b, i) => {
    const sh = b.k === "shelves" ? b.s : b.k === "drawers" ? b.s : 0;
    if (sh) add("Shelf", sh, b.w - 2, sd - 20, t, "bay " + (i + 1));
    if (b.k === "hang1" || b.k === "hang2" || b.k === "drhang") {
      add("Hat shelf", 1, b.w - 2, sd - 20, t, "bay " + (i + 1));
      add("Hanging rail", b.k === "hang2" ? 2 : 1, b.w - 4, 0, 0, "oval rail, bay " + (i + 1));
    }
    if (b.d) add("Drawer front", b.d, b.w - gap, drH - gap, t, "drawer boxes to suit the runners");
  });
  /* doors cover the front between the plinth and the top */
  const dh = sp.H - sp.plinth - gap;
  bays.forEach((b, i) => {
    const dt = cbBayDoor(sp, b);
    if (dt === "hinged") add("Door", 1, dh, b.w + t - gap, t, "bay " + (i + 1));
    if (dt === "pairs") add("Door", 2, dh, (b.w + t) / 2 - gap, t, "bay " + (i + 1));
    if (dt === "glass") {
      add(
        "Glazed door frame",
        1,
        dh,
        b.w + t - gap,
        t,
        "bay " + (i + 1) + "; rebate for the glass",
      );
      add(
        "Glass panel (toughened, to order)",
        1,
        dh - 140,
        b.w + t - gap - 140,
        4,
        "bay " + (i + 1),
      );
    }
    /* fittings */
    if (b.shoe)
      add("Shoe shelf (angled)", 3, b.w - 2, 300, t, "bay " + (i + 1) + "; on angled bearers");
    if (b.trouser) add("Trouser pull-out (to buy)", 1, b.w, 0, 0, "bay " + (i + 1));
    if (b.led)
      add("LED strip and driver (to buy)", 1, b.w, 0, 0, "bay " + (i + 1) + "; under the top");
  });
  /* finishing: fillers to the walls, end panels, cornice */
  const fL = +sp.fillL || 0,
    fR = +sp.fillR || 0;
  if (fL) add("Filler", 1, sp.H + (+sp.cornice || 0), fL + 20, t, "left; scribe to the wall");
  if (fR) add("Filler", 1, sp.H + (+sp.cornice || 0), fR + 20, t, "right; scribe to the wall");
  if (sp.endL) add("End panel", 1, sp.H, sp.D + t, t, "left; covers the side");
  if (sp.endR) add("End panel", 1, sp.H, sp.D + t, t, "right; covers the side");
  if (+sp.cornice)
    add(
      "Cornice",
      1,
      sp.W + fL + fR + (sp.endL ? t : 0) + (sp.endR ? t : 0),
      +sp.cornice,
      t,
      "scribe to the ceiling",
    );
  /* bought fittings: hinges and shelf pins */
  const doorsN = bays.reduce((a, b) => {
    const dt = cbBayDoor(sp, b);
    return a + (dt === "pairs" ? 2 : dt === "hinged" || dt === "glass" ? 1 : 0);
  }, 0);
  if (doorsN)
    add(
      "Soft-close hinges (to buy)",
      doorsN * (dh > 1600 ? 4 : dh > 900 ? 3 : 2),
      0,
      0,
      0,
      "35 mm cup",
    );
  if (sp.doors === "sliding") {
    const np = Math.max(2, Math.min(4, n));
    add(
      "Sliding door",
      np,
      dh - 40,
      (sp.W - 2 * t) / np + 40,
      t,
      "overlaps 40 mm; to suit the track",
    );
  }
  return { ws, bays, ih, sd, cut, drH, n };
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
  const dTop = y1 + U(1.5),
    dBot = y1 + H - PL - U(1.5);
  const door = (dx, dw, hinge) => {
    rect(dx, dTop, dw, dBot - dTop, { w: thin });
    /* the hinge side: lines from the hinge-side corners to the middle of the other side */
    if (hinge) {
      const hx = hinge === "L" ? dx : dx + dw,
        ox = hinge === "L" ? dx + dw : dx;
      line(hx, dTop, ox, (dTop + dBot) / 2, { dash: 1 });
      line(hx, dBot, ox, (dTop + dBot) / 2, { dash: 1 });
    }
  };
  if (sp.doors !== "sliding")
    bx.forEach(([bxx, bw], i) => {
      const dt = cbBayDoor(sp, P.bays[i]);
      if (dt === "hinged" || dt === "glass") {
        door(x1 + bxx - T / 2 + U(1.5), bw + T - U(3), i % 2 ? "R" : "L");
        if (dt === "glass") {
          /* the glass, with glazing bars */
          const gx = x1 + bxx - T / 2 + U(72),
            gw = bw + T - U(144),
            gt = dTop + U(70),
            gh = dBot - dTop - U(140);
          rect(gx, gt, gw, gh, { w: thin, fill: "#dcecf2" });
          line(gx + gw / 2, gt, gx + gw / 2, gt + gh, { w: thin });
          [1, 2].forEach((k) =>
            line(gx, gt + (gh * k) / 3, gx + gw, gt + (gh * k) / 3, { w: thin }),
          );
        }
      } else if (dt === "pairs") {
        const hw = (bw + T) / 2 - U(3);
        door(x1 + bxx - T / 2 + U(1.5), hw, "L");
        door(x1 + bxx - T / 2 + U(1.5) + hw + U(3), hw, "R");
      } else rect(x1 + bxx, y1 + T, bw, H - PL - 2 * T, { w: thin });
    });
  if (sp.doors === "sliding") {
    const np = Math.max(2, Math.min(4, P.n)),
      pw = (W - 2 * T) / np;
    for (let i = 0; i < np; i++) {
      rect(
        x1 + T + i * pw - (i ? U(20) : 0),
        dTop + U(20),
        pw + (i ? U(20) : 0),
        dBot - dTop - U(40),
        { w: thin },
      );
      line(
        x1 + T + i * pw + pw / 2 - U(150),
        (dTop + dBot) / 2,
        x1 + T + i * pw + pw / 2 + U(150),
        (dTop + dBot) / 2,
        { arrow: 1 },
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
  P.bays.forEach((b, i) => {
    const [bxx, bw] = bx[i];
    const lx = x2 + bxx;
    if (i < P.n - 1) rect(lx + bw, iTop, T, IH, { w: thin });
    let floor = iBot;
    /* drawers stack from the bottom */
    for (let k = 0; k < (b.d || 0); k++) {
      const dh = U(P.drH);
      rect(lx + U(1.5), floor - dh + U(1.5), bw - U(3), dh - U(3), { w: thin });
      line(lx + bw / 2 - U(60), floor - dh / 2, lx + bw / 2 + U(60), floor - dh / 2, {
        w: pwFor(4),
      });
      floor -= dh;
    }
    const space = floor - iTop;
    const shelves = (y0, y1, count) => {
      for (let k = 1; k <= count; k++) {
        const yy = y0 + ((y1 - y0) * k) / (count + 1);
        rect(lx, yy - T / 2, bw, T, { w: thin });
      }
    };
    const rail = (yy) => {
      line(lx + U(30), yy, lx + bw - U(30), yy, { w: pwFor(6) });
      text(lx + U(40), yy - U(40), "rail", 0.7);
    };
    if (b.k === "shelves" || b.k === "drawers") shelves(iTop, floor, b.s || 0);
    else {
      /* hanging: a hat shelf 300 down, one rail under it (or two, the second halfway) */
      const hat = iTop + U(300);
      rect(lx, hat - T / 2, bw, T, { w: thin });
      rail(hat + U(60));
      if (b.k === "hang2") {
        const mid = hat + (floor - hat) / 2;
        rect(lx, mid - T / 2, bw, T, { w: thin });
        rail(mid + U(60));
      }
    }
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
    text(lx + U(40), iBot - U(60) - (b.d || 0) * U(P.drH), String(i + 1), 0.8);
    void space;
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
  let yy = yt + Z * 2;
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
  if (last.open) {
    last.W = last.open;
    last.H = last.Hopen || last.H;
  }
  const bayRow = (i, b) =>
    `<div class="cb2-bay" data-i="${i}"><b>Bay ${i + 1}</b><select class="cb2-k" aria-label="Bay ${i + 1}: what's in it">${CB_BAYS.map(([k, l]) => `<option value="${k}"${k === b.k ? " selected" : ""}>${l}</option>`).join("")}</select><label>Shelves<input class="cb2-s" type="number" inputmode="numeric" min="0" max="12" value="${b.s}"></label><label>Drawers<input class="cb2-d" type="number" inputmode="numeric" min="0" max="8" value="${b.d}"></label><select class="cb2-dr" aria-label="Bay ${i + 1}: doors">${CB_BAYDOORS.map(([k, l]) => `<option value="${k}"${k === (b.door || "") ? " selected" : ""}>${l}</option>`).join("")}</select><span class="cb2-fit"><label class="inl"><input type="checkbox" class="cb2-shoe"${b.shoe ? " checked" : ""}> Shoe rack</label><label class="inl"><input type="checkbox" class="cb2-tr"${b.trouser ? " checked" : ""}> Trouser pull-out</label><label class="inl"><input type="checkbox" class="cb2-led"${b.led ? " checked" : ""}> LED light</label></span></div>`;
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
    <fieldset class="cb2-g od-who" data-k="corner stairs eaves bridge window seat bench tv"><legend>The shape</legend>
      <label for="cb2-wb" class="cb2-g" data-k="corner">Second run, round the corner (mm, from the corner)<input id="cb2-wb" type="number" inputmode="numeric" value="${v("wB", 1200)}"></label>
      <label for="cb2-hl" class="cb2-g" data-k="stairs eaves"><span class="cb2-hll">Height at the low end (mm)</span><input id="cb2-hl" type="number" inputmode="numeric" value="${v("hLow", 900)}"></label>
      <label for="cb2-tw" class="cb2-g" data-k="bridge window tv">Tower width (mm)<input id="cb2-tw" type="number" inputmode="numeric" value="${v("tw", 500)}"></label>
      <div class="grid2"><label for="cb2-th" class="cb2-g" data-k="bridge window tv bench"><span class="cb2-thl">Unit over the top – height (mm, 0 = none)</span><input id="cb2-th" type="number" inputmode="numeric" value="${v("topH", 500)}"></label><label for="cb2-lh" class="cb2-g" data-k="window tv bench"><span class="cb2-lhl">Unit underneath – height (mm, 0 = none)</span><input id="cb2-lh" type="number" inputmode="numeric" value="${v("lowH", 450)}"></label></div>
      <label class="inl cb2-g" data-k="window"><input type="checkbox" id="cb2-rad"${v("radiator", false) ? " checked" : ""}> It's round a radiator, not a window</label>
    </fieldset>
    <label for="cb2-sc" class="cb2-g" data-k="alcove base shelves">Scribe allowance each side (mm, for uneven walls)<input id="cb2-sc" type="number" inputmode="numeric" value="${v("scribe", 10)}"></label>
    <fieldset class="cb2-g od-who" data-k="alcove base"><legend>The cupboard at the bottom</legend>
      <div class="grid2"><label for="cb2-bh">Height to the top of the worktop (mm)<input id="cb2-bh" type="number" inputmode="numeric" value="${v("baseH", 800)}"></label><label for="cb2-tt">Top thickness (mm, 0 = no top)<input id="cb2-tt" type="number" inputmode="numeric" value="${v("topT", 30)}"></label></div>
      <label for="cb2-to">Top overhang at the front (mm)<input id="cb2-to" type="number" inputmode="numeric" value="${v("topOver", 20)}"></label>
    </fieldset>
    <fieldset class="cb2-g od-who" data-k="alcove shelves"><legend>The shelves</legend>
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
    <div class="grid2"><label for="cb2-t">Board thickness (mm)<input id="cb2-t" type="number" inputmode="numeric" value="${v("t", 18)}"></label><label for="cb2-bt">Back panel thickness (0 = no back)<input id="cb2-bt" type="number" inputmode="numeric" value="${v("bt", 6)}"></label></div>
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
        doors: $("cb2-doors").value,
        n: Math.max(1, Math.min(8, num("cb2-n", 1))),
        widths: $("cb2-ws").value.trim(),
        bays: [...document.querySelectorAll(".cb2-bay")].map((r) => ({
          k: r.querySelector(".cb2-k").value,
          s: +r.querySelector(".cb2-s").value || 0,
          d: +r.querySelector(".cb2-d").value || 0,
          door: r.querySelector(".cb2-dr").value,
          shoe: r.querySelector(".cb2-shoe").checked,
          trouser: r.querySelector(".cb2-tr").checked,
          led: r.querySelector(".cb2-led").checked,
        })),
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
    const cur = [...document.querySelectorAll(".cb2-bay")].map((r) => ({
      k: r.querySelector(".cb2-k").value,
      s: +r.querySelector(".cb2-s").value || 0,
      d: +r.querySelector(".cb2-d").value || 0,
      door: r.querySelector(".cb2-dr").value,
      shoe: r.querySelector(".cb2-shoe").checked,
      trouser: r.querySelector(".cb2-tr").checked,
      led: r.querySelector(".cb2-led").checked,
    }));
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
    }[k];
    $("cb2-D").value = d[0];
    $("cb2-H").value = d[1];
    if (
      !$("cb2-name").value ||
      /^(Wardrobe|Alcove unit|Base cupboard|Shelves|Corner wardrobe|Under-stairs cupboard|Eaves storage|Bedroom wall|Window surround|Window seat|Boot room bench|TV wall)$/.test(
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
