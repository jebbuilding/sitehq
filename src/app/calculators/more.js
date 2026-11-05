/* ================= MORE CALCULATORS: stairs, plasterboard, timber, aggregates ================= */
import { calcSave, calcState, fmtN, mmM, mmMt, numv } from "./calculator.js";
import { looseSave } from "./materials.js";
import { $, esc, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
export { calcAgg, calcBoard, calcStairs, calcTimber };
const cCard = (n, l, hi) =>
  `<div class="tot ${hi ? "hi" : ""}"><div class="n">${n}</div><div class="l">${l}</div></div>`;
function cBind(B, O, again, out) {
  B.querySelectorAll("[data-k]").forEach((el) => {
    const k = el.dataset.k;
    const sel = el.tagName === "SELECT" || el.type === "checkbox";
    el.addEventListener(sel ? "change" : "input", () => {
      O[k] = el.type === "checkbox" ? el.checked : el.value;
      calcSave();
      if (sel) again();
      else out();
    });
  });
}
function cIn(id, k, O, label, ph) {
  return `<label for="${id}">${label}<input id="${id}" data-k="${k}" inputmode="decimal" value="${esc(O[k] == null ? "" : O[k])}" placeholder="${esc(ph || "")}"></label>`;
}
function cSel(id, k, O, label, opts) {
  return `<label for="${id}">${label}<select id="${id}" data-k="${k}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(O[k]) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
}
function cClear(B, O, keys, again, first) {
  const b = document.createElement("div");
  b.className = "actions";
  b.innerHTML = '<button type="button" class="pillbtn">✕ Clear</button>';
  b.firstChild.onclick = () => {
    keys.forEach((k) => (O[k] = ""));
    calcSave();
    again();
    const f = $(first);
    if (f) f.focus();
  };
  return b;
}
function cCopy(id, txt) {
  const b = $(id);
  if (b)
    b.onclick = async () => {
      try {
        await navigator.clipboard.writeText(txt());
        toast("Copied");
      } catch (e) {
        toast("Couldn't copy here");
      }
    };
}

/* ---- Stairs (Approved Document K, private stair) ---- */
function calcStairs() {
  const C = calcState();
  if (!C.stair) C.stair = { rise: "", width: "860", pitch: "", going: "" };
  const O = C.stair,
    B = $("calcbody");
  if (O.pitch == null) O.pitch = "";
  if (O.going == null) O.going = "";
  B.innerHTML = `<div class="notice">Measure from <b>finished floor to finished floor</b> in mm. Checked against Approved Document K for a <b>private stair</b> in a house: rise 150–220 mm, going at least 220 mm, pitch no more than 42°, and 2 × rise + going between 550 and 700 mm.</div>
    <div class="rfgrid"><div class="grid2">${cIn("st-rise", "rise", O, "Total rise, floor to floor (mm)", "e.g. 2630")}${cIn("st-w", "width", O, "Stair width (mm)", "e.g. 860")}</div>
    <div class="flabel" style="margin-bottom:0">Pitch</div>
    <div class="flchips" role="group" aria-label="Pitch">${["", "35", "37", "40", "42"].map((v) => `<button type="button" class="chip stp" data-v="${v}" aria-pressed="${String(O.pitch) === v}">${v ? v + "°" : "Auto"}</button>`).join("")}</div>
    <div class="grid2">${cIn("st-pitch", "pitch", O, "Or type a pitch (°)", "Auto")}${cIn("st-going", "going", O, "Specific going (mm, optional)", "e.g. 250")}</div></div>
    <div id="st-clr"></div><div id="st-out" aria-live="polite"></div>`;
  $("st-clr").appendChild(cClear(B, O, ["rise", "pitch", "going"], calcStairs, "st-rise"));
  B.querySelectorAll(".stp").forEach(
    (b) =>
      (b.onclick = () => {
        O.pitch = b.dataset.v;
        calcSave();
        calcStairs();
      }),
  );
  const out = () => {
    const T = numv(O.rise),
      PG = numv(O.going),
      PT = numv(O.pitch),
      el = $("st-out");
    B.querySelectorAll(".stp").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.v === String(O.pitch))),
    );
    if (!(T > 300 && T < 6000)) {
      el.innerHTML = '<div class="nothing">Enter the total rise to see the options.</div>';
      return;
    }
    if (PT && !(PT >= 15 && PT <= 60)) {
      el.innerHTML = '<div class="nothing">Enter a pitch between 15° and 60°, or tap Auto.</div>';
      return;
    }
    const rows = [];
    const n0 = Math.max(2, Math.ceil(T / 220 - 1e-9));
    for (let n = n0; n <= n0 + 7; n++) {
      const R = T / n,
        tr = n - 1;
      let G;
      if (PG > 0) G = PG;
      else if (PT > 0) G = Math.round(R / Math.tan((PT * Math.PI) / 180));
      else G = Math.ceil(Math.max(225, 600 - 2 * R, R / Math.tan((40 * Math.PI) / 180)));
      const p = (Math.atan(R / G) * 180) / Math.PI,
        rg = 2 * R + G;
      const fails = [];
      if (R > 220.01) fails.push("rise >220");
      if (R < 150) fails.push("rise <150");
      if (G < 220) fails.push("going <220");
      if (p > 42.01) fails.push("over 42°");
      if (rg < 550) fails.push("2R+G <550");
      if (rg > 700) fails.push("2R+G >700");
      rows.push({
        n,
        tr,
        R,
        G,
        p,
        rg,
        fails,
        len: G * tr,
        str: Math.sqrt(Math.pow(G * tr, 2) + Math.pow(T, 2)),
      });
    }
    const ok = rows.filter((r) => !r.fails.length);
    const best =
      PG > 0 && PT > 0
        ? ok.slice().sort((a, b) => Math.abs(a.p - PT) - Math.abs(b.p - PT))[0]
        : ok.find((r) => r.R <= 205) || ok[0];
    const why =
      PG > 0 && PT > 0
        ? "closest to " + PT + "° with a " + PG + " mm going"
        : PG > 0
          ? "with a " + PG + " mm going, about 200 mm rises"
          : PT > 0
            ? "at " + PT + "°, about 200 mm rises"
            : "a typical house stair, about 200 mm rises";
    el.innerHTML =
      (PT > 42
        ? `<div class="notice warn">⚠ ${PT}° is steeper than the 42° limit for a house stair.</div>`
        : "") +
      (best
        ? `<div class="flabel">Best fit <span class="who" style="font-weight:400">(${esc(why)}; others below)</span></div><div class="totals rftots">${cCard(best.n, "Risers (" + best.tr + " treads + top floor)", 1)}${cCard(fmtN(best.R, 1) + " mm", "Each rise")}${cCard(fmtN(best.G, 0) + " mm", "Each going")}${cCard(fmtN(best.p, 1) + "°", "Pitch")}
        ${cCard(fmtN(best.rg, 0) + " mm", "2R + G")}${cCard(mmM(best.len / 1000), "Total going (floor space)")}${cCard(mmM(best.str / 1000), "Stringer length (approx, before cuts)")}${numv(O.width) ? cCard(fmtN(numv(O.width), 0) + " mm", "Stair width") : ""}</div>`
        : `<div class="notice warn">⚠ None of these pass. ${PT > 42 ? "The pitch is over the 42° limit. " : ""}${PG && PG < 220 ? "The going is under the 220 mm minimum. " : ""}${PG > 0 && !PT ? "Try a different going. " : ""}${PT > 0 ? "Try a different pitch. " : ""}</div>`) +
      `<div class="flabel">Options</div><div class="tblwrap"><table class="fltbl"><thead><tr><th>Risers</th><th>Rise</th><th>Going</th><th>Pitch</th><th>2R+G</th><th></th></tr></thead><tbody>
      ${rows.map((r) => `<tr${r === best ? ' class="on"' : ""}><td><b>${r.n}</b></td><td>${fmtN(r.R, 1)}</td><td>${fmtN(r.G, 0)}</td><td>${fmtN(r.p, 1)}°</td><td>${fmtN(r.rg, 0)}</td><td>${r.fails.length ? `<span class="tag bad" title="${esc(r.fails.join(", "))}">✕ ${esc(r.fails[0])}</span>` : '<span class="tag ok">✓ OK</span>'}</td></tr>`).join("")}</tbody></table></div>
      <div class="who">Also check: 2.0 m headroom over the pitch line (1.9 m in the middle of a loft conversion stair), a handrail 900–1000 mm high ${numv(O.width) >= 1000 ? "on <b>both sides</b> (your stair is 1 m wide or more)" : "on at least one side (both sides if the stair is 1 m wide or more)"}, and no gap over 100 mm in balustrades or open risers. Every rise and going must be the same.</div>
      ${best ? `<div class="actions"><button type="button" class="pillbtn" id="st-copy">📋 Copy the figures</button></div>` : ""}`;
    if (best)
      cCopy(
        "st-copy",
        () =>
          `Stair: total rise ${fmtN(T, 0)} mm${numv(O.width) ? ", width " + fmtN(numv(O.width), 0) + " mm" : ""}\n${best.n} risers @ ${fmtN(best.R, 1)} mm, ${best.tr} goings @ ${fmtN(best.G, 0)} mm\nPitch ${fmtN(best.p, 1)}°, 2R+G ${fmtN(best.rg, 0)} mm\nTotal going ${mmMt(best.len / 1000)}, stringer approx ${mmMt(best.str / 1000)}`,
      );
  };
  cBind(B, O, calcStairs, out);
  out();
}

/* ---- Plasterboard & skim ---- */
const PB_SIZES = [
  ["2400x1200", "2400 × 1200 mm", 2.88],
  ["2400x900", "2400 × 900 mm", 2.16],
  ["1800x900", "1800 × 900 mm", 1.62],
  ["1200x900", "1200 × 900 mm (handy board)", 1.08],
];
function calcBoard() {
  const C = calcState();
  if (!C.pb)
    C.pb = {
      L: "",
      W: "",
      H: "2400",
      walls: true,
      ceil: true,
      doors: "1",
      wins: "",
      winA: "1.2",
      size: "2400x1200",
      waste: "10",
      skim: true,
    };
  const O = C.pb,
    B = $("calcbody");
  B.innerHTML = `<div class="notice">Room sizes in <b>millimetres</b>. Take off doors and windows. A guide for ordering, so round up and allow for cuts.</div>
    <div class="rfgrid"><div class="grid2">${cIn("pb-L", "L", O, "Room length (mm)", "e.g. 4200")}${cIn("pb-W", "W", O, "Room width (mm)", "e.g. 3600")}</div>
    <div class="grid2">${cIn("pb-H", "H", O, "Ceiling height (mm)", "e.g. 2400")}${cSel(
      "pb-size",
      "size",
      O,
      "Board size",
      PB_SIZES.map((s) => [s[0], s[1]]),
    )}</div>
    <div class="flchips"><label class="inl"><input type="checkbox" data-k="walls" ${O.walls ? "checked" : ""}> Walls</label><label class="inl"><input type="checkbox" data-k="ceil" ${O.ceil ? "checked" : ""}> Ceiling</label><label class="inl"><input type="checkbox" data-k="skim" ${O.skim ? "checked" : ""}> Skim finish</label></div>
    <div class="grid2">${cIn("pb-doors", "doors", O, "Doors (how many)", "0")}${cIn("pb-wins", "wins", O, "Windows (how many)", "0")}</div>
    <div class="grid2">${cIn("pb-winA", "winA", O, "Average window size (m²)", "e.g. 1.2")}${cIn("pb-waste", "waste", O, "Waste / cuts %", "10")}</div></div>
    <div id="pb-clr"></div><div id="pb-out" aria-live="polite"></div>`;
  $("pb-clr").appendChild(cClear(B, O, ["L", "W", "doors", "wins"], calcBoard, "pb-L"));
  const out = () => {
    const L = numv(O.L) / 1000,
      W = numv(O.W) / 1000,
      H = numv(O.H) / 1000,
      el = $("pb-out");
    if (!(L > 0 && W > 0 && (!O.walls || H > 0))) {
      el.innerHTML = '<div class="nothing">Enter the room length and width.</div>';
      return;
    }
    const open = numv(O.doors) * 1.9 + numv(O.wins) * numv(O.winA);
    const wa = O.walls ? Math.max(0, 2 * (L + W) * H - open) : 0,
      ca = O.ceil ? L * W : 0,
      A = wa + ca;
    if (!A) {
      el.innerHTML = '<div class="nothing">Tick walls or ceiling.</div>';
      return;
    }
    const sz = PB_SIZES.find((s) => s[0] === O.size) || PB_SIZES[0],
      w = 1 + numv(O.waste) / 100;
    const wb = wa ? Math.ceil((wa * w) / sz[2]) : 0,
      cb = ca ? Math.ceil((ca * w) / sz[2]) : 0;
    const screws = Math.ceil((wa * 9 + ca * 12) * w),
      tape = Math.ceil(A * 1.3),
      rolls = Math.ceil(tape / 90),
      skimB = O.skim ? Math.ceil((A * w) / 10) : 0,
      beads = O.walls ? numv(O.wins) * 4 : 0;
    el.innerHTML = `<div class="flabel">The room</div><div class="totals rftots">${cCard(fmtN(A, 1) + " m²", "Area to board", 1)}${wa ? cCard(fmtN(wa, 1) + " m²", "Walls (less openings)") : ""}${ca ? cCard(fmtN(ca, 1) + " m²", "Ceiling") : ""}</div>
      <div class="flabel">To order</div><div class="totals rftots">${cCard(wb + cb, "Boards " + sz[1].split(" (")[0] + " (incl. " + fmtN(numv(O.waste), 0) + "%)", 1)}${wb && cb ? cCard(wb + " + " + cb, "Walls + ceiling boards") : ""}
        ${cCard(screws.toLocaleString("en-GB"), "Drywall screws (≈ " + Math.ceil(screws / 1000) + " box" + (Math.ceil(screws / 1000) === 1 ? "" : "es") + " of 1,000)")}${cCard(rolls, "Scrim tape rolls (90 m), ≈ " + tape + " m")}
        ${skimB ? cCard(skimB, "Bags of Multi-Finish 25 kg (2 coats, 2 mm)") : ""}${beads ? cCard(Math.ceil((beads / 2.4) * 1.1), "Angle bead 2.4 m (window reveals, approx)") : ""}</div>
      <div class="who">Doors counted at 1.9 m² each. Screws: about 9 per m² on walls (300 mm centres) and 12 per m² on ceilings (230 mm centres). Use 12.5 mm board on studs at 600 centres, and 15 mm or fire-rated where needed. Multi-Finish covers about 10 m² a bag at 2 mm.</div>
      <div class="actions"><button type="button" class="pillbtn" id="pb-copy">📋 Copy the figures</button></div>`;
    cCopy(
      "pb-copy",
      () =>
        `Room ${fmtN(L * 1000, 0)} x ${fmtN(W * 1000, 0)} mm, ${fmtN(H * 1000, 0)} mm high${O.walls ? "" : " (ceiling only)"}${O.ceil ? "" : " (walls only)"}\nArea ${fmtN(A, 1)} m²\n${wb + cb} boards ${sz[1]}\n${screws} drywall screws\n${rolls} rolls scrim tape${skimB ? "\n" + skimB + " bags Multi-Finish" : ""}`,
    );
  };
  cBind(B, O, calcBoard, out);
  out();
}

/* ---- Timber: joists and stud walls ---- */
const JST_SPANS = {
  400: [
    ["47×150", 2.45],
    ["47×175", 2.92],
    ["47×200", 3.38],
    ["47×225", 3.83],
    ["75×200", 3.93],
    ["75×225", 4.44],
  ],
  600: [
    ["47×150", 1.95],
    ["47×175", 2.36],
    ["47×200", 2.77],
    ["47×225", 3.19],
    ["75×200", 3.43],
    ["75×225", 3.87],
  ],
};
function calcTimber() {
  const C = calcState();
  if (!C.tim)
    C.tim = {
      m: "joist",
      span: "",
      run: "",
      cc: "400",
      bear: "100",
      wl: "",
      wh: "2400",
      wcc: "400",
      wdoors: "0",
      stock: "4.8",
    };
  const O = C.tim,
    B = $("calcbody");
  B.innerHTML = `<div class="seg" role="tablist" style="margin-bottom:10px"><button type="button" class="tm" data-m="joist" aria-pressed="${O.m === "joist"}">Floor joists</button><button type="button" class="tm" data-m="stud" aria-pressed="${O.m === "stud"}">Stud wall</button></div>
    ${
      O.m === "joist"
        ? `<div class="rfgrid"><div class="grid2">${cIn("tm-span", "span", O, "Clear span, wall to wall (mm)", "e.g. 3600")}${cSel(
            "tm-cc",
            "cc",
            O,
            "Centres (mm)",
            [
              ["400", "400"],
              ["600", "600"],
            ],
          )}</div>
      <div class="grid2">${cIn("tm-bear", "bear", O, "Bearing each end (mm)", "100")}<div></div></div></div>`
        : `<div class="rfgrid"><div class="grid2">${cIn("tm-wl", "wl", O, "Wall length (mm)", "e.g. 3600")}${cIn("tm-wh", "wh", O, "Wall height (mm)", "e.g. 2400")}</div>
      <div class="grid2">${cSel("tm-wcc", "wcc", O, "Stud centres (mm)", [
        ["400", "400"],
        ["600", "600"],
      ])}${cIn("tm-wd", "wdoors", O, "Door openings (how many)", "0")}</div>
      <div class="grid2">${cSel("tm-stock", "stock", O, "Buying lengths", [
        ["2.4", "2400 mm (2.4 m)"],
        ["3.0", "3000 mm (3 m)"],
        ["3.6", "3600 mm (3.6 m)"],
        ["4.8", "4800 mm (4.8 m)"],
      ])}<div></div></div></div>`
    }
    <div id="tm-clr"></div><div id="tm-out" aria-live="polite"></div>`;
  B.querySelectorAll(".tm").forEach(
    (b) =>
      (b.onclick = () => {
        O.m = b.dataset.m;
        calcSave();
        calcTimber();
      }),
  );
  $("tm-clr").appendChild(
    cClear(
      B,
      O,
      O.m === "joist" ? ["span"] : ["wl", "wdoors"],
      calcTimber,
      O.m === "joist" ? "tm-span" : "tm-wl",
    ),
  );
  const out = () => {
    const el = $("tm-out");
    if (O.m === "joist") {
      const sp = numv(O.span) / 1000;
      if (!(sp > 0)) {
        el.innerHTML = '<div class="nothing">Enter the span.</div>';
        return;
      }
      const len = sp + (2 * numv(O.bear)) / 1000,
        rows = sp > 4.5 ? 2 : sp > 2.5 ? 1 : 0;
      const tbl = JST_SPANS[O.cc] || JST_SPANS[400];
      const pick = tbl.find((t) => t[1] >= sp);
      el.innerHTML = `<div class="totals rftots">${cCard(mmM(len), "Each joist length (incl. bearings)", 1)}${cCard(rows ? rows + " row" + (rows > 1 ? "s" : "") : "None", "Strutting / noggin rows")}</div>
        <div class="flabel">Rough joist size (C24, normal house floor)</div>
        <div class="totals rftots">${cCard(pick ? pick[0] + " mm" : "Over " + mmM(tbl[tbl.length - 1][1]), "Smallest that spans " + mmMt(sp), 1)}</div>
        <div class="tblwrap"><table class="fltbl"><thead><tr><th>C24 joist</th><th>Max clear span at ${O.cc} centres</th></tr></thead><tbody>${tbl.map((t) => `<tr${pick && t[0] === pick[0] ? ' class="on"' : ""}><td><b>${t[0]}</b></td><td>${mmM(t[1])}</td></tr>`).join("")}</tbody></table></div>
        <div class="notice warn" style="margin-top:8px">Rough guide only, for an ordinary domestic floor with no extra loads such as a bath, partition walls, or a water tank. Always check against the TRADA span tables, your engineer's calcs or Building Control.</div>`;
    } else {
      const L = numv(O.wl) / 1000,
        H = numv(O.wh) / 1000,
        cc = numv(O.wcc) / 1000,
        d = numv(O.wdoors),
        st = numv(O.stock) || 4.8;
      if (!(L > 0 && H > 0)) {
        el.innerHTML = '<div class="nothing">Enter the wall length and height.</div>';
        return;
      }
      const studs = Math.ceil(L / cc - 1e-9) + 1 + d * 2,
        plates = 2 * L,
        nog = (H > 2.4 ? 2 : 1) * L,
        total = studs * H + plates + nog;
      const perLen = Math.floor(st / H) || 0;
      const studLens = perLen ? Math.ceil(studs / perLen) : Math.ceil((studs * H) / st),
        otherLens = Math.ceil(((plates + nog + d * 1.0) * 1.1) / st);
      el.innerHTML = `<div class="totals rftots">${cCard(studs, "Studs (incl. " + d * 2 + " for door openings)", 1)}${cCard(mmM(plates, 1), "Head + sole plate")}${cCard(mmM(nog, 1), "Noggins (" + (H > 2.4 ? "2 rows" : "1 row") + ")")}${cCard(mmM(total, 1), "Total timber")}
        ${cCard(studLens + otherLens, "Lengths to buy at " + fmtN(st * 1000, 0) + " mm (approx, incl. 10% on plates and noggins)", 1)}${d ? cCard(d, "Door heads to make") : ""}</div>
        <div class="who">Usually 47×75 or 47×100 C16 or C24 for a partition. ${H > st ? "⚠ The wall is taller than your buying length." : ""}</div>`;
    }
  };
  cBind(B, O, calcTimber, out);
  out();
}

/* ---- Aggregates by the tonne ---- */
const AGG = [
  ["type1", "MOT Type 1 sub-base (compacted)", 2.2],
  ["sharp", "Sharp sand", 1.6],
  ["build", "Building / soft sand", 1.6],
  ["ballast", "All-in ballast", 1.8],
  ["gravel", "10 / 20 mm gravel", 1.5],
  ["shingle", "Pea shingle", 1.6],
  ["hardcore", "Crushed hardcore", 1.9],
  ["topsoil", "Topsoil", 1.4],
  ["custom", "Other: enter density", 0],
];
function looseList() {
  return AGG.filter((a) => a[0] !== "custom").concat(
    ((S.matcalc || {}).loose || [])
      .filter((x) => x && x.name && x.dens > 0)
      .map((x) => [x.id, x.name, +x.dens, true]),
    [AGG.find((a) => a[0] === "custom")],
  );
}
function looseEdit(x) {
  const ed = !!x;
  x = x || {};
  openSheet(
    `<h3 id="sheettitle">${ed ? "Edit" : "Add a"} loose material</h3><div class="who">Everyone on the app can pick it in Calculator → Loose materials.</div>
    <label for="lm-name">Material name<input id="lm-name" required maxlength="60" value="${esc(x.name || "")}" placeholder="e.g. 6F2 recycled, Scalpings, Cotswold chippings"></label>
    <label for="lm-dens">Weight per m³ (tonnes)<input id="lm-dens" required inputmode="decimal" value="${esc(x.dens || "")}" placeholder="e.g. 1.8"></label>
    <div class="who">Ask the merchant if you're not sure. Most stone and sand weigh 1.5 to 2.2 tonnes per m³.</div>
    ${formFoot(ed, ed ? "Save" : "Add material")}`,
    async () => {
      const name = $("lm-name").value.trim(),
        dens = numv($("lm-dens").value);
      if (!name) return showErr("Give the material a name.");
      if (!(dens > 0.1 && dens < 10))
        return showErr("Enter the weight per m³ in tonnes, e.g. 1.8.");
      const cur = ((S.matcalc || {}).loose || []).slice();
      const id = x.id || "lm_" + newId();
      const i = cur.findIndex((y) => y.id === id);
      const row = { id, name, dens };
      if (i >= 0) cur[i] = row;
      else cur.push(row);
      try {
        await looseSave(cur);
        calcState().agg.mat = id;
        calcSave();
        closeForm();
        toast(ed ? "Saved" : "Material added");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    "lm-name",
  );
  if (ed)
    armDelete(async () => {
      await looseSave(((S.matcalc || {}).loose || []).filter((y) => y.id !== x.id));
      const O = calcState().agg;
      if (O.mat === x.id) O.mat = "type1";
      calcSave();
      render();
    });
}
function calcAgg() {
  const C = calcState();
  if (!C.agg)
    C.agg = {
      m: "agg",
      L: "",
      W: "",
      area: "",
      D: "",
      mat: "type1",
      dens: "",
      waste: "10",
      bag: "850",
    };
  const O = C.agg,
    B = $("calcbody");
  const LL = looseList();
  if (!LL.some((a) => a[0] === O.mat)) O.mat = "type1";
  const A = LL.find((a) => a[0] === O.mat) || LL[0];
  const own = ownerMode();
  B.innerHTML = `<div class="notice">All sizes in <b>millimetres</b>. Fill in length and width, or just the area if you know it.</div>
    <div class="rfgrid">${cSel(
      "ag-mat",
      "mat",
      O,
      "Material",
      LL.map((a) => [a[0], (a[3] ? "★ " : "") + a[1] + (a[2] ? " (" + a[2] + " t/m³)" : "")]),
    )}
    ${own ? `<div class="actions" style="margin-top:-4px"><button type="button" class="pillbtn" id="ag-add">+ Add a material</button>${A[3] ? `<button type="button" class="pillbtn" id="ag-edit">✎ Edit ${esc(A[1])}</button>` : ""}</div>` : ""}
    ${O.mat === "custom" ? `<div class="grid2">${cIn("ag-dens", "dens", O, "Density (tonnes per m³)", "e.g. 1.7")}<div></div></div>` : ""}
    <div class="grid2">${cIn("ag-L", "L", O, "Length (mm)", "e.g. 6000")}${cIn("ag-W", "W", O, "Width (mm)", "e.g. 4000")}</div>
    <div class="grid2">${cIn("ag-area", "area", O, "Or area (m²)", "e.g. 24")}${cIn("ag-D", "D", O, "Depth (mm)", "e.g. 150")}</div>
    <div class="grid2">${cIn("ag-waste", "waste", O, "Extra / waste %", "10")}${cSel(
      "ag-bag",
      "bag",
      O,
      "Bulk bag size",
      [
        ["850", "850 kg (most merchants)"],
        ["1000", "1 tonne"],
        ["800", "800 kg"],
      ],
    )}</div></div>
    <div id="ag-clr"></div><div id="ag-out" aria-live="polite"></div>`;
  $("ag-clr").appendChild(cClear(B, O, ["L", "W", "area", "D"], calcAgg, "ag-L"));
  if ($("ag-add")) $("ag-add").onclick = () => looseEdit();
  if ($("ag-edit"))
    $("ag-edit").onclick = () =>
      looseEdit(((S.matcalc || {}).loose || []).find((y) => y.id === O.mat));
  const out = () => {
    const el = $("ag-out");
    const byLW = numv(O.L) > 0 && numv(O.W) > 0;
    const area = byLW ? ((numv(O.L) / 1000) * numv(O.W)) / 1000 : numv(O.area),
      D = numv(O.D) / 1000,
      den = O.mat === "custom" ? numv(O.dens) : A[2];
    if ($("ag-area"))
      $("ag-area").placeholder = byLW ? fmtN(area, 2) + " (from length × width)" : "e.g. 24";
    if (!(area > 0 && D > 0)) {
      el.innerHTML = '<div class="nothing">Enter the size and depth.</div>';
      return;
    }
    if (!(den > 0)) {
      el.innerHTML = '<div class="nothing">Enter the density.</div>';
      return;
    }
    const V0 = area * D,
      wp = numv(O.waste),
      V = V0 * (1 + wp / 100),
      t = V * den,
      bags = Math.ceil((t * 1000) / numv(O.bag)),
      small = Math.ceil((t * 1000) / 25);
    const work = `${byLW ? fmtN(numv(O.L), 0) + " mm × " + fmtN(numv(O.W), 0) + " mm = " : ""}${fmtN(area, 2)} m² × ${fmtN(D * 1000, 0)} mm deep (${fmtN(D, 3)} m) = ${fmtN(V0, 3)} m³${wp ? " + " + fmtN(wp, 0) + "% = " + fmtN(V, 3) + " m³" : ""} × ${fmtN(den, 2)} t/m³ = <b>${fmtN(t, 2)} tonnes</b> ÷ ${O.bag} kg = ${fmtN((t * 1000) / numv(O.bag), 2)} → <b>${bags} bags</b>`;
    el.innerHTML = `<div class="totals rftots">${cCard(fmtN(t, 2) + " t", "Tonnes to order (incl. " + fmtN(numv(O.waste), 0) + "%)", 1)}${cCard(fmtN(V, 2) + " m³", "Volume")}${cCard(fmtN(area, 1) + " m²", "Area")}
      ${cCard(bags, "Bulk bags (" + O.bag + " kg)", 1)}${small <= 80 ? cCard(small, "Or 25 kg bags") : ""}</div>
      <div class="flabel">How it's worked out</div><div class="calcwork">${work}</div>
      <div class="who">${O.mat === "type1" ? "Type 1 is figured compacted. Lay it in layers of no more than 150 mm and compact each one. " : ""}Weights vary with moisture and supplier, so check the merchant's figures for big orders. Loose loads are often cheaper than bags above about 5 tonnes.</div>
      <div class="actions"><button type="button" class="pillbtn" id="ag-copy">📋 Copy the figures</button></div>`;
    cCopy(
      "ag-copy",
      () =>
        `${O.mat === "custom" ? "Material" : A[1]}: ${fmtN(area, 1)} m² at ${O.D} mm deep\n${fmtN(V, 2)} m³ = ${fmtN(t, 2)} tonnes (incl. ${O.waste}% extra)\n${bags} bulk bags (${O.bag} kg)`,
    );
  };
  cBind(B, O, calcAgg, out);
  out();
}
