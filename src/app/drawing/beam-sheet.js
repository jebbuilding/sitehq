/* ================= BEAM SHEET: one steel beam from the drawing to fitted – size, lifting, props, padstones, fire, order, sign-off ================= */
export {
  NPB_ENDS,
  NPB_FINISH,
  NPB_TICKS,
  npbDims,
  npbFire,
  npbLift,
  npbOrderText,
  npbProps,
  npbStage,
};
/* James (Nov 2026): "the steel beam tab still needs a lot of work – have a look at other software and make it lots
   better". The engineering tools size the beam; the trade calculators do bearings, padstones and props one at a time;
   building control wants calcs approved, propping, padstones bedded, inspection before boxing in, fire protection.
   This file is the working out for one beam's sheet (drawing/paving.js shows it): nothing here designs a beam – the
   engineer's calcs always win, and every figure says it is a guide. All sizes in mm, weights in kg. */

/* the depth and flange width of a section from its size words: "203×133×25 UB" → {d:203, b:133}; timber and LVL are
   written width × depth ("47×200 C24" → d 200, b 47); "2 × 47×200" doubles the width */
function npbDims(sec, type) {
  const s = String(sec || "");
  const two = /^\s*2\s*×/.test(s) ? 2 : /^\s*3\s*×/.test(s) ? 3 : 1;
  const m = s.replace(/^\s*\d\s*×\s*/, "").match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const a = +m[1],
    c = +m[2];
  const timber = ["C24", "Glulam", "LVL", "Flitch"].includes(type);
  const d = timber ? Math.max(a, c) : a,
    b = (timber ? Math.min(a, c) : c) * two;
  return { d, b };
}
/* how it gets lifted: about 25 kg each for one person, less each in a team (two lift about two-thirds of their
   total, three or four about half) – the usual manual handling rule of thumb. Above what four can share safely,
   lifting kit */
function npbLift(kg) {
  if (!(kg > 0)) return { people: 0, kit: "", note: "Pick the size to work out its weight." };
  if (kg <= 25) return { people: 1, kit: "", note: "One person can carry it." };
  if (kg <= 33) return { people: 2, kit: "", note: "Two people." };
  if (kg <= 37) return { people: 3, kit: "", note: "Three people." };
  if (kg <= 50)
    return { people: 4, kit: "", note: "Four people, carried at waist height, short distance." };
  return {
    people: 4,
    kit: "Lifting kit",
    note:
      kg <= 150
        ? "Too heavy to carry safely by hand: use a material lift or gin wheel, and a Hiab off the lorry."
        : "Heavy: plan the lift – Hiab or crane off the lorry, material lift or block and tackle into place.",
  };
}
/* adjustable steel props: the size whose range covers the height (floor to the underside of the needle) */
const NPB_PROPS = [
  ["No. 0", 1070, 1830],
  ["No. 1", 1750, 3120],
  ["No. 2", 1980, 3350],
  ["No. 3", 2590, 3900],
  ["No. 4", 3200, 4880],
];
const npbPropSize = (h) => {
  const p = NPB_PROPS.find(([, lo, hi]) => h >= lo && h <= hi);
  return p ? p[0] : h > 4880 ? "taller than a No. 4 – scaffold / special" : "shorter than a No. 0";
};
/* temporary works: strongboys (or needles) at about 900 centres along the wall to come out, each on a prop; needles
   need a prop each side */
function npbProps(span, bear, height, kind) {
  const run = span + 2 * bear + 600;
  const n = Math.max(2, Math.ceil(run / 900) + 1);
  const props = kind === "needles" ? n * 2 : n;
  return { n, props, size: npbPropSize(height - (kind === "needles" ? 300 : 0)), kind };
}
/* fire protection: two layers of 12.5 mm fire board round three sides (the top is the floor), or intumescent paint
   on all four sides – the areas; the specification comes from the engineer or architect */
function npbFire(d, b, len, kind) {
  const L = len / 1000;
  if (kind === "board") {
    const per = (2 * d + b + 50) / 1000; /* three sides, with a little over for the corners */
    const m2 = per * L * 2;
    const sheets = Math.ceil((m2 * 1.1) / 2.88);
    return {
      m2: Math.round(m2 * 10) / 10,
      sheets,
      text: `2 layers of 12.5 mm fire board round 3 sides: about ${Math.round(m2 * 10) / 10} m², ${sheets} sheet${sheets === 1 ? "" : "s"} 2400 × 1200 (10% over), plus angles and fixings`,
    };
  }
  if (kind === "paint") {
    const m2 = ((2 * d + 4 * b) / 1000) * L;
    return {
      m2: Math.round(m2 * 10) / 10,
      sheets: 0,
      text: `Intumescent paint to all four sides: about ${Math.round(m2 * 10) / 10} m² – ask the paint maker for the coats and film thickness for the fire time`,
    };
  }
  return {
    m2: 0,
    sheets: 0,
    text:
      kind === "none"
        ? "No fire protection needed (as the calcs / building control say)"
        : "Not chosen yet",
  };
}
/* building control and site ticks, in order */
const NPB_TICKS = [
  ["calcs", "Engineer's calcs approved by building control"],
  ["ordered", "Steel ordered"],
  ["services", "Services in the wall found and made safe"],
  ["props", "Props / strongboys in, spreaders at the top"],
  ["delivered", "Steel delivered and checked against the order"],
  ["pads", "Padstones bedded and cured"],
  ["fitted", "Beam in, bearing as the calcs, packed and pinned"],
  ["inspected", "Building control inspected – before boxing in, grade marking showing"],
  ["fire", "Fire protection on"],
  ["signed", "Signed off"],
];
/* where the beam has got to: the last tick done */
const npbStage = (bc) => {
  const done = NPB_TICKS.filter(([k]) => bc && bc[k]);
  return done.length ? done[done.length - 1][1] : "Not started";
};
const NPB_ENDS = [
  ["plain", "Plain cut ends"],
  ["plates", "End plates (to the engineer's detail)"],
  ["holes", "Holes for bolting (to the engineer's detail)"],
  ["cleats", "Fin plates / cleats (to the engineer's detail)"],
];
const NPB_FINISH = [
  ["primer", "Red oxide primer"],
  ["galv", "Galvanised"],
  ["none", "Bare (painting on site)"],
];
/* the order for the steel supplier, as plain words */
function npbOrderText(list, job) {
  const lines = list.map((r) => {
    const o = r.o.ord || {};
    const ends = (NPB_ENDS.find((x) => x[0] === (o.ends || "plain")) || [])[1] || "";
    const fin = (NPB_FINISH.find((x) => x[0] === (o.finish || "primer")) || [])[1] || "";
    return `• ${r.mark ? r.mark + ": " : ""}${o.qty || 1} × ${r.sec || "SIZE TO CONFIRM"}, grade ${o.grade || "S275"}, cut length ${r.len} mm (${r.span} clear + ${r.bearA} + ${r.bearB} bearing). ${ends}. ${fin}.${r.kg ? ` About ${Math.round(r.kg)} kg.` : ""}`;
  });
  const o0 = (list[0] && list[0].o.ord) || {};
  return [
    `Steel order${job.site ? " – " + job.site : ""}`,
    "",
    ...lines,
    "",
    `Deliver to: ${job.site || "(address)"}`,
    `Needed by: ${o0.need ? new Date(o0.need + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : "(date)"}`,
    `Delivery: ${o0.hiab ? "Hiab / crane offload please" : "kerbside, we unload"}`,
    "",
    `Please confirm sizes, lengths, price and delivery date. ${job.who || ""}`.trim(),
  ].join("\n");
}
