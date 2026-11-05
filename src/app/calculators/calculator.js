/* ================= CALCULATOR (sums, m², m³) ================= */
import { calcFalls } from "./falls.js";
import { calcMat } from "./materials.js";
import { calcAgg, calcBoard, calcStairs, calcTimber } from "./more.js";
import { calcRoof } from "./roofing.js";
import { $, esc, store, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
export { calcSave, calcState, calcView, fmtN, mmM, mmMt, numv };
const DENS = [
  ["", "Just the volume", 0],
  ["concrete", "Concrete", 2.4],
  ["type1", "MOT Type 1 (compacted)", 2.1],
  ["ballast", "Ballast / gravel", 1.7],
  ["sand", "Sharp or building sand", 1.6],
  ["topsoil", "Topsoil", 1.4],
  ["spoil", "Dug spoil (bulked, approx.)", 1.8],
];
function calcState() {
  if (!S.calc)
    S.calc = store.get("jeb.calc", null) || {
      mode: "area",
      expr: "",
      area: [{ l: "", w: "", minus: false, label: "" }],
      vol: [{ l: "", w: "", d: "", label: "" }],
      waste: "0",
      dunit: "mm",
      mat: "",
      mmv: 1,
    };
  if (!S.calc.mmv) {
    const C = S.calc,
      x = (o, k) => {
        if (
          o &&
          o[k] !== "" &&
          o[k] != null &&
          isFinite(parseFloat(String(o[k]).replace(",", ".")))
        )
          o[k] = String(Math.round(parseFloat(String(o[k]).replace(",", ".")) * 1000 * 100) / 100);
      };
    (C.area || []).forEach((r) => {
      x(r, "l");
      x(r, "w");
    });
    (C.vol || []).forEach((r) => {
      x(r, "l");
      x(r, "w");
      if (C.dunit === "m") x(r, "d");
    });
    C.dunit = "mm";
    if (C.ms) {
      x(C.ms, "l");
      x(C.ms, "w");
    }
    if (C.roof) {
      ["L", "W", "rise", "eaves", "gable", "ridgeEff"].forEach((k) => x(C.roof, k));
    }
    if (C.falls) {
      x(C.falls, "L");
      x(C.falls, "mL");
    }
    if (C.pb) {
      ["L", "W", "H"].forEach((k) => x(C.pb, k));
    }
    if (C.tim) {
      ["span", "wl", "wh"].forEach((k) => x(C.tim, k));
    }
    if (C.agg) {
      x(C.agg, "L");
      x(C.agg, "W");
    }
    C.mmv = 1;
    try {
      store.set("jeb.calc", C);
    } catch (e) {}
  }
  return S.calc;
}
/* a length given in metres, shown as mm with metres alongside */
const mmM = (m, dp) =>
  `${fmtN(m * 1000, 0)} mm <small class="mmm">(${fmtN(m, dp == null ? 2 : dp)} m)</small>`;
const mmMt = (m, dp) => `${fmtN(m * 1000, 0)} mm (${fmtN(m, dp == null ? 2 : dp)} m)`;
const numv = (v) => {
  const n = parseFloat(String(v).replace(",", "."));
  return isFinite(n) ? n : 0;
};
const fmtN = (n, dp) =>
  (Math.round(n * Math.pow(10, dp)) / Math.pow(10, dp)).toLocaleString("en-GB", {
    maximumFractionDigits: dp,
  });
function safeEval(e) {
  const s = String(e)
    .replace(/×|x/gi, "*")
    .replace(/÷/g, "/")
    .replace(/,/g, ".")
    .replace(/\s+/g, "");
  if (!s) return null;
  if (!/^[\d.+\-*/()%]+$/.test(s)) return NaN;
  let i = 0;
  const peek = () => s[i];
  function num() {
    let st = i;
    while (i < s.length && /[\d.]/.test(s[i])) i++;
    if (st === i) throw 0;
    let v = parseFloat(s.slice(st, i));
    if (s[i] === "%") {
      i++;
      v = v / 100;
    }
    return v;
  }
  function fac() {
    if (peek() === "-") {
      i++;
      return -fac();
    }
    if (peek() === "+") {
      i++;
      return fac();
    }
    if (peek() === "(") {
      i++;
      const v = add();
      if (s[i] !== ")") throw 0;
      i++;
      return v;
    }
    return num();
  }
  function mul() {
    let v = fac();
    while (peek() === "*" || peek() === "/") {
      const o = s[i++];
      const r = fac();
      v = o === "*" ? v * r : v / r;
    }
    return v;
  }
  function add() {
    let v = mul();
    while (peek() === "+" || peek() === "-") {
      const o = s[i++];
      const r = mul();
      v = o === "+" ? v + r : v - r;
    }
    return v;
  }
  try {
    const v = add();
    if (i !== s.length) return NaN;
    return v;
  } catch (x) {
    return NaN;
  }
}
function calcSave() {
  store.set("jeb.calc", S.calc);
}
function calcView() {
  const C = calcState();
  const modes = [
    ["sum", "Calculator"],
    ["area", "Area m²"],
    ["vol", "Volume m³"],
    ["mat", "Materials"],
    ["roof", "Roofing"],
    ["falls", "Falls"],
    ["stairs", "Stairs"],
    ["board", "Plasterboard"],
    ["timber", "Timber"],
    ["agg", "Loose materials"],
    ["heat", "Heating BTU"],
  ];
  if (!C.v2) {
    C.v2 = 1;
    C.mode = "sum";
    calcSave();
  }
  $("main").innerHTML =
    `<div class="seg calcmodes" role="tablist">${modes.map(([k, l]) => `<button type="button" data-m="${k}" aria-pressed="${C.mode === k}">${l}</button>`).join("")}</div><div id="calcbody"></div>`;
  $("main")
    .querySelectorAll(".calcmodes button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          C.mode = b.dataset.m;
          calcSave();
          calcView();
        }),
    );
  (
    ({
      area: calcArea,
      vol: calcVol,
      mat: calcMat,
      roof: calcRoof,
      falls: calcFalls,
      stairs: calcStairs,
      board: calcBoard,
      timber: calcTimber,
      agg: calcAgg,
      heat: calcHeat,
      sum: calcSum,
    })[C.mode] || calcArea
  )();
}
function calcArea() {
  const C = calcState(),
    B = $("calcbody");
  B.innerHTML = `<div class="notice">Measure each area in <b>millimetres</b> (2400, not 2.4). Add as many as you like. Tick <b>Take away</b> for doors, windows or anything you're not covering.</div>
    <div class="day" id="ca-rows">${C.area
      .map(
        (r, i) => `<div class="calcrow" data-i="${i}">
      <input class="c-lab" value="${esc(r.label)}" placeholder="Name (optional), e.g. Kitchen wall" maxlength="40" aria-label="Name">
      <div class="cdims"><label>Length mm<input inputmode="decimal" class="c-l" value="${esc(r.l)}"></label><span class="cx">×</span><label>Width mm<input inputmode="decimal" class="c-w" value="${esc(r.w)}"></label>
      <span class="cres" aria-live="polite"></span></div>
      <div class="cfoot"><label class="inl"><input type="checkbox" class="c-minus" ${r.minus ? "checked" : ""}> Take away</label>${C.area.length > 1 ? `<button type="button" class="linkdanger c-rm">Remove</button>` : ""}</div></div>`,
      )
      .join("")}</div>
    <div class="actions"><button type="button" class="btn" id="ca-add">+ Add another area</button><button type="button" class="btn" id="ca-clear">Clear numbers</button></div>
    <label for="ca-waste" style="max-width:260px">Add extra for waste and cuts<select id="ca-waste">${["0", "5", "10", "15", "20"].map((v) => `<option value="${v}" ${C.waste === v ? "selected" : ""}>${v === "0" ? "None" : v + "%"}</option>`).join("")}</select></label>
    <div class="ctotal" id="ca-total" aria-live="polite"></div>`;
  const upd = () => {
    let t = 0;
    B.querySelectorAll(".calcrow").forEach((el) => {
      const r = C.area[+el.dataset.i];
      const a = ((numv(r.l) / 1000) * numv(r.w)) / 1000;
      el.querySelector(".cres").textContent = a ? (r.minus ? "− " : "") + fmtN(a, 2) + " m²" : "";
      t += r.minus ? -a : a;
    });
    const w = numv(C.waste),
      tw = t * (1 + w / 100);
    $("ca-total").innerHTML =
      `<div><span>Total area</span><b>${fmtN(t, 2)} m²</b></div>${w ? `<div><span>With ${w}% extra</span><b>${fmtN(tw, 2)} m²</b></div>` : ""}<div class="who">${fmtN(t * 10.7639, 1)} sq ft</div>`;
    calcSave();
  };
  B.querySelectorAll(".calcrow").forEach((el) => {
    const r = C.area[+el.dataset.i];
    el.querySelector(".c-lab").oninput = (e) => {
      r.label = e.target.value;
      calcSave();
    };
    el.querySelector(".c-l").oninput = (e) => {
      r.l = e.target.value;
      upd();
    };
    el.querySelector(".c-w").oninput = (e) => {
      r.w = e.target.value;
      upd();
    };
    el.querySelector(".c-minus").onchange = (e) => {
      r.minus = e.target.checked;
      upd();
    };
    const rm = el.querySelector(".c-rm");
    if (rm)
      rm.onclick = () => {
        C.area.splice(+el.dataset.i, 1);
        calcSave();
        calcArea();
      };
  });
  $("ca-add").onclick = () => {
    C.area.push({ l: "", w: "", minus: false, label: "" });
    calcSave();
    calcArea();
    const ls = B.querySelectorAll(".c-l");
    ls[ls.length - 1].focus();
  };
  $("ca-clear").onclick = () => {
    C.area = [{ l: "", w: "", minus: false, label: "" }];
    C.waste = "0";
    calcSave();
    calcArea();
  };
  $("ca-waste").onchange = (e) => {
    C.waste = e.target.value;
    upd();
  };
  upd();
}
function calcVol() {
  const C = calcState(),
    B = $("calcbody");
  const du = C.dunit || "mm";
  B.innerHTML = `<div class="notice">Length, width and depth all in <b>millimetres</b> (100 for a 100 mm slab). Add a row for each part, e.g. each trench run.</div>
    <div class="day">${C.vol
      .map(
        (r, i) => `<div class="calcrow" data-i="${i}">
      <input class="c-lab" value="${esc(r.label)}" placeholder="Name (optional), e.g. Footing run A" maxlength="40" aria-label="Name">
      <div class="cdims"><label>Length mm<input inputmode="decimal" class="c-l" value="${esc(r.l)}"></label><span class="cx">×</span><label>Width mm<input inputmode="decimal" class="c-w" value="${esc(r.w)}"></label><span class="cx">×</span><label>Depth mm<input inputmode="decimal" class="c-d" value="${esc(r.d)}"></label>
      <span class="cres" aria-live="polite"></span></div>
      ${C.vol.length > 1 ? `<div class="cfoot"><span></span><button type="button" class="linkdanger c-rm">Remove</button></div>` : ""}</div>`,
      )
      .join("")}</div>
    <div class="actions"><button type="button" class="btn" id="cv-add">+ Add another part</button><button type="button" class="btn" id="cv-clear">Clear numbers</button></div>
    <div class="grid2"><label for="cv-waste">Add extra for waste<select id="cv-waste">${["0", "5", "10", "15"].map((v) => `<option value="${v}" ${C.waste === v ? "selected" : ""}>${v === "0" ? "None" : v + "%"}</option>`).join("")}</select></label>
    <label for="cv-mat">Work out the weight for<select id="cv-mat">${DENS.map(([k, l, d]) => `<option value="${k}" ${C.mat === k ? "selected" : ""}>${esc(l)}${d ? " (~" + d + " t/m³)" : ""}</option>`).join("")}</select></label></div>
    <div class="ctotal" id="cv-total" aria-live="polite"></div>`;
  const upd = () => {
    let t = 0;
    const dd = (v) => numv(v) / 1000;
    B.querySelectorAll(".calcrow").forEach((el) => {
      const r = C.vol[+el.dataset.i];
      const v = dd(r.l) * dd(r.w) * dd(r.d);
      el.querySelector(".cres").textContent = v ? fmtN(v, 3) + " m³" : "";
      t += v;
    });
    const w = numv(C.waste),
      tw = t * (1 + w / 100);
    const m = DENS.find((x) => x[0] === C.mat);
    $("cv-total").innerHTML =
      `<div><span>Total volume</span><b>${fmtN(t, 3)} m³</b></div>${w ? `<div><span>With ${w}% extra</span><b>${fmtN(tw, 3)} m³</b></div>` : ""}
      ${m && m[2] ? `<div><span>${esc(m[1])}, approx.</span><b>${fmtN(tw * m[2], 2)} tonnes</b></div><div class="who">Weights are rough guides. Check with your supplier before ordering.</div>` : ""}
      <div class="who">${fmtN(tw * 1000, 0)} litres</div>`;
    calcSave();
  };
  B.querySelectorAll(".calcrow").forEach((el) => {
    const r = C.vol[+el.dataset.i];
    el.querySelector(".c-lab").oninput = (e) => {
      r.label = e.target.value;
      calcSave();
    };
    ["l", "w", "d"].forEach(
      (k) =>
        (el.querySelector(".c-" + k).oninput = (e) => {
          r[k] = e.target.value;
          upd();
        }),
    );
    const rm = el.querySelector(".c-rm");
    if (rm)
      rm.onclick = () => {
        C.vol.splice(+el.dataset.i, 1);
        calcSave();
        calcVol();
      };
  });
  $("cv-add").onclick = () => {
    C.vol.push({ l: "", w: "", d: "", label: "" });
    calcSave();
    calcVol();
    const ls = B.querySelectorAll(".c-l");
    ls[ls.length - 1].focus();
  };
  $("cv-clear").onclick = () => {
    C.vol = [{ l: "", w: "", d: "", label: "" }];
    C.waste = "0";
    calcSave();
    calcVol();
  };
  $("cv-waste").onchange = (e) => {
    C.waste = e.target.value;
    upd();
  };
  $("cv-mat").onchange = (e) => {
    C.mat = e.target.value;
    upd();
  };
  upd();
}
/* ---- Heating: rule-of-thumb room heat requirement (BTU/hr) and radiator size ---- */
const HT_ROOMS = [
  ["21", "Living / dining", 21],
  ["18b", "Bedroom", 18],
  ["18k", "Kitchen", 18],
  ["22", "Bathroom", 22],
  ["18h", "Hall / landing", 18],
];
const HT_INS = [
  ["60", "Poor", "Solid walls, single glazing"],
  ["40", "Average", "Cavity filled, double glazed"],
  ["25", "Good", "Modern build"],
];
const HT_SRC = [
  ["70", "Gas / oil boiler"],
  ["47.5", "Heat pump (50/45 °C)"],
];
const HT_RADS = [
  ["Single panel (K1)", 1150],
  ["Double panel (P+)", 1400],
  ["Double convector (K2)", 1850],
  ["Triple convector (K3)", 2600],
];
function htState() {
  const C = calcState();
  if (!C.heat) C.heat = { L: "4500", W: "3600", H: "2400", room: "21", ins: "40", src: "70" };
  return C.heat;
}
function calcHeat() {
  const H = htState(),
    B = $("calcbody");
  const chips = (list, key, lab) =>
    `<div class="flabel">${lab}</div><div class="flchips" role="group" aria-label="${lab}">${list.map((x) => `<button type="button" class="pillbtn chip ht-c" data-k="${key}" data-v="${x[0]}" aria-pressed="${H[key] === x[0]}">${esc(x[1])}${x[2] && key === "ins" ? `<br><small style="font-weight:500;color:inherit;opacity:.8">${esc(x[2])}</small>` : ""}</button>`).join("")}</div>`;
  B.innerHTML = `<div class="notice">Room size in <b>millimetres</b> (4500, not 4.5). Gives a rule-of-thumb heat requirement and radiator size for one room.</div>
    <div class="cdims" style="margin:12px 0"><label>Length mm<input inputmode="decimal" id="ht-L" value="${esc(H.L)}"></label><span class="cx">×</span><label>Width mm<input inputmode="decimal" id="ht-W" value="${esc(H.W)}"></label><span class="cx">×</span><label>Height mm<input inputmode="decimal" id="ht-H" value="${esc(H.H)}"></label></div>
    ${chips(HT_ROOMS, "room", "Room type")}
    ${chips(HT_INS, "ins", "Insulation")}
    ${chips(HT_SRC, "src", "Heat source")}
    <div class="ctotal" id="ht-total" aria-live="polite"></div>
    <div class="flabel" style="margin-top:14px">Radiator to fit (600 mm high)</div>
    <div class="tblwrap"><table class="fltbl"><thead><tr><th>Type</th><th style="text-align:right">≈ Length</th></tr></thead><tbody id="ht-tb"></tbody></table></div>
    <div class="actions" style="margin-top:10px"><button type="button" class="pillbtn" id="ht-clear">✕ Clear</button></div>
    <div class="who" style="margin-top:12px">Guide only. Uses 60, 40 or 25 watts per m³ (for 21 °C inside, −3 °C outside), scaled to the room temperature. Radiator outputs are bought at ΔT50; a heat pump runs cooler water so needs a bigger radiator. Includes a 10% margin. Check the maker's output tables before ordering.</div>`;
  const upd = () => {
    const L = numv(H.L) / 1000,
      W = numv(H.W) / 1000,
      Hh = numv(H.H) / 1000,
      vol = L * W * Hh;
    const rm = HT_ROOMS.find((x) => x[0] === H.room) || HT_ROOMS[0],
      tin = rm[2],
      watts = (vol * numv(H.ins) * (tin + 3)) / 24;
    const dt = numv(H.src) - tin,
      need = dt > 0 ? (watts * 1.1) / Math.pow(dt / 50, 1.3) : 0;
    $("ht-total").innerHTML =
      `<div><span>Heat needed</span><b>${fmtN(watts * 3.412, 0)} BTU/hr</b></div><div><span>In watts</span><b>${fmtN(watts, 0)} W</b></div><div><span>Radiator rated output (ΔT50)</span><b>${fmtN(need, 0)} W</b></div><div class="who">${fmtN(L * W, 1)} m² floor · ${fmtN(vol, 1)} m³ · ${tin} °C inside · ${fmtN(need * 3.412, 0)} BTU rated</div>`;
    $("ht-tb").innerHTML = vol
      ? HT_RADS.map(([n, wpm]) => {
          const len = (need / wpm) * 1000;
          return `<tr><td>${n}</td><td style="text-align:right">${len > 2400 ? fmtN(len / 1000, 1) + " m, split into 2" : fmtN(Math.ceil(len / 100) * 100, 0) + " mm"}</td></tr>`;
        }).join("")
      : `<tr><td colspan="2" class="nothing">Enter the room size.</td></tr>`;
    calcSave();
  };
  ["L", "W", "H"].forEach(
    (k) =>
      ($("ht-" + k).oninput = (e) => {
        H[k] = e.target.value;
        upd();
      }),
  );
  B.querySelectorAll(".ht-c").forEach(
    (b) =>
      (b.onclick = () => {
        H[b.dataset.k] = b.dataset.v;
        B.querySelectorAll(`.ht-c[data-k="${b.dataset.k}"]`).forEach((x) =>
          x.setAttribute("aria-pressed", x === b),
        );
        upd();
      }),
  );
  $("ht-clear").onclick = () => {
    H.L = "";
    H.W = "";
    H.H = "2400";
    calcSave();
    calcHeat();
  };
  upd();
}
function calcSum() {
  const C = calcState(),
    B = $("calcbody");
  const keys = [
    "C",
    "(",
    ")",
    "÷",
    "7",
    "8",
    "9",
    "×",
    "4",
    "5",
    "6",
    "−",
    "1",
    "2",
    "3",
    "+",
    "0",
    ".",
    "⌫",
    "=",
  ];
  B.innerHTML = `<div class="calcbox"><input id="cs-expr" class="cs-expr" inputmode="decimal" value="${esc(C.expr)}" aria-label="Sum" autocomplete="off"><div class="cs-res" id="cs-res" aria-live="polite"></div>
    <div class="keypad">${keys.map((k) => `<button type="button" class="key ${/[÷×−+=]/.test(k) ? "op" : ""} ${k === "=" ? "eq" : ""}" data-k="${k}">${k}</button>`).join("")}</div></div>
    <div class="cshist"><div class="flabel" style="display:flex;justify-content:space-between;align-items:center">Last 10 sums <button type="button" class="linkbtn" id="cs-hclear" ${(C.hist || []).length ? "" : "hidden"}>Clear</button></div><div id="cs-hlist"></div></div>`;
  const drawHist = () => {
    const h = C.hist || [];
    $("cs-hlist").innerHTML = h.length
      ? h
          .map(
            (x, i) =>
              `<button type="button" class="cshrow" data-i="${i}"><span class="csh-e">${esc(x.e)} =</span><b class="csh-r">${esc(x.r)}</b><span class="who">${esc(new Date(x.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))}</span></button>`,
          )
          .join("")
      : '<div class="nothing">Your sums appear here when you press =. Tap one to use it again.</div>';
    $("cs-hclear").hidden = !h.length;
    $("cs-hlist")
      .querySelectorAll(".cshrow")
      .forEach(
        (b) =>
          (b.onclick = () => {
            const x = h[+b.dataset.i];
            if (!x) return;
            inp.value = x.e;
            show();
            inp.focus();
            toast("Sum put back. Press = to work it out again, or carry on from it.");
          }),
      );
  };
  const inp = $("cs-expr");
  const show = () => {
    const v = safeEval(inp.value.replace(/−/g, "-"));
    $("cs-res").textContent = v == null ? "" : isFinite(v) ? "= " + fmtN(v, 6) : "…";
    C.expr = inp.value;
    calcSave();
  };
  inp.oninput = show;
  inp.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      B.querySelector('[data-k="="]').click();
    }
  };
  B.querySelectorAll(".key").forEach(
    (b) =>
      (b.onclick = () => {
        const k = b.dataset.k;
        if (k === "C") inp.value = "";
        else if (k === "⌫") inp.value = inp.value.slice(0, -1);
        else if (k === "=") {
          const e0 = inp.value.trim();
          const v = safeEval(e0.replace(/−/g, "-"));
          if (v != null && isFinite(v)) {
            const r = String(Math.round(v * 1e8) / 1e8);
            if (e0 && e0 !== r) {
              C.hist = [{ e: e0, r: fmtN(v, 6), at: Date.now() }]
                .concat((C.hist || []).filter((x) => !(x.e === e0)))
                .slice(0, 10);
              calcSave();
              drawHist();
            }
            inp.value = r;
          }
        } else inp.value += k;
        show();
      }),
  );
  $("cs-hclear").onclick = () => {
    C.hist = [];
    calcSave();
    drawHist();
  };
  show();
  drawHist();
}
