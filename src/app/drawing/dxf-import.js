/* ================= DXF IMPORT: an architect's CAD plan (saved as DXF) as a base to draw over ================= */
export { npDxfImport };
/* Reads LINE, LWPOLYLINE, POLYLINE, CIRCLE, ARC, TEXT and MTEXT from the ENTITIES section (blocks are not exploded) and
   turns them into the drawing tool's own lines, circles and text: at real size at the drawing's scale (the file's
   units from $INSUNITS, millimetres if it doesn't say), centred on the page, grey, on the "Imports" layer. */
const DXF_UNIT_MM = { 1: 25.4, 2: 304.8, 4: 1, 5: 10, 6: 1000 };
const DXF_MAX = 20000;

/* the file as [code, value] pairs */
function dxfPairs(text) {
  const L = String(text || "")
    .replace(/\r/g, "")
    .split("\n");
  const out = [];
  for (let i = 0; i + 1 < L.length; i += 2) out.push([parseInt(L[i].trim(), 10), L[i + 1].trim()]);
  return out;
}
/* the drawing's entities in DXF units: { ents, units } */
function dxfRead(text) {
  const P = dxfPairs(text);
  let units = 4;
  for (let i = 0; i < P.length; i++)
    if (P[i][0] === 9 && P[i][1] === "$INSUNITS" && P[i + 1])
      units = parseInt(P[i + 1][1], 10) || 4;
  const ents = [];
  let i = P.findIndex(
    (p, k) => p[0] === 2 && p[1] === "ENTITIES" && P[k - 1] && P[k - 1][1] === "SECTION",
  );
  if (i < 0) return { ents, units };
  let poly = null;
  for (i++; i < P.length && ents.length < DXF_MAX;) {
    if (P[i][0] !== 0) {
      i++;
      continue;
    }
    const type = P[i][1];
    if (type === "ENDSEC") break;
    const g = {};
    const xs = [],
      ys = [];
    let j = i + 1;
    for (; j < P.length && P[j][0] !== 0; j++) {
      const [c, v] = P[j];
      if (c === 10) xs.push(+v);
      else if (c === 20) ys.push(+v);
      else if (!(c in g)) g[c] = v;
    }
    i = j;
    if (type === "LINE") ents.push({ t: "line", a: [xs[0], ys[0]], b: [+g[11], +g[21]] });
    else if (type === "LWPOLYLINE")
      ents.push({ t: "poly", p: xs.map((x, k) => [x, ys[k]]), closed: (+g[70] || 0) & 1 });
    else if (type === "POLYLINE") poly = { t: "poly", p: [], closed: (+g[70] || 0) & 1 };
    else if (type === "VERTEX" && poly) poly.p.push([xs[0], ys[0]]);
    else if (type === "SEQEND" && poly) {
      ents.push(poly);
      poly = null;
    } else if (type === "CIRCLE") ents.push({ t: "circle", c: [xs[0], ys[0]], r: +g[40] });
    else if (type === "ARC")
      ents.push({ t: "arc", c: [xs[0], ys[0]], r: +g[40], a0: +g[50] || 0, a1: +g[51] || 0 });
    else if (type === "TEXT" || type === "MTEXT") {
      const s = String(g[1] || "")
        .replace(/\\P/g, " ")
        .replace(/\\[A-Za-z][^;]*;/g, "")
        .replace(/[{}]/g, "")
        .trim();
      if (s) ents.push({ t: "text", p: [xs[0], ys[0]], h: +g[40] || 250, s });
    }
  }
  return {
    ents: ents.filter((e) =>
      [].concat(e.a || [], e.b || [], e.c || [], e.p ? e.p.flat() : []).every((v) => isFinite(v)),
    ),
    units,
  };
}
/* the drawing tool's objects for a DXF file on page doc: { objs, msg } */
function npDxfImport(text, doc, NPU) {
  const { ents, units } = dxfRead(text);
  if (!ents.length) return { objs: [], msg: "No lines, circles or text found in that DXF file." };
  const toMm = DXF_UNIT_MM[units] || 1;
  /* the extent of the drawing, in DXF units */
  const pts = [];
  ents.forEach((e) => {
    if (e.t === "line") pts.push(e.a, e.b);
    else if (e.t === "poly") pts.push(...e.p);
    else if (e.t === "circle") pts.push([e.c[0] - e.r, e.c[1] - e.r], [e.c[0] + e.r, e.c[1] + e.r]);
    else if (e.t === "arc") {
      /* only the part of the circle that is drawn */
      let a1 = e.a1;
      if (a1 <= e.a0) a1 += 360;
      for (let d = e.a0; d <= a1; d += Math.max(1, (a1 - e.a0) / 12))
        pts.push([
          e.c[0] + Math.cos((d * Math.PI) / 180) * e.r,
          e.c[1] + Math.sin((d * Math.PI) / 180) * e.r,
        ]);
    } else pts.push(e.p);
  });
  const bx0 = Math.min(...pts.map((p) => p[0])),
    bx1 = Math.max(...pts.map((p) => p[0])),
    by0 = Math.min(...pts.map((p) => p[1])),
    by1 = Math.max(...pts.map((p) => p[1]));
  /* page units per DXF unit: real size at the drawing's scale, or fitted to the page when it has none */
  let k =
    doc.scale > 0
      ? (toMm / doc.scale) * NPU
      : Math.min((doc.w * 0.8) / (bx1 - bx0 || 1), (doc.h * 0.8) / (by1 - by0 || 1));
  const cx = (bx0 + bx1) / 2,
    cy = (by0 + by1) / 2;
  /* DXF y goes up, the page's goes down */
  const T = (p) => [doc.w / 2 + (p[0] - cx) * k, doc.h / 2 - (p[1] - cy) * k];
  const base = { c: "#6b6b6b", w: 1, ly: "imports" };
  const objs = [];
  ents.forEach((e) => {
    if (e.t === "line") objs.push(Object.assign({ t: "line", a: T(e.a), b: T(e.b) }, base));
    else if (e.t === "poly") {
      const q = e.p.concat(e.closed && e.p.length > 2 ? [e.p[0]] : []);
      for (let n = 1; n < q.length; n++)
        objs.push(Object.assign({ t: "line", a: T(q[n - 1]), b: T(q[n]) }, base));
    } else if (e.t === "circle") {
      const a = T([e.c[0] - e.r, e.c[1] + e.r]),
        b = T([e.c[0] + e.r, e.c[1] - e.r]);
      objs.push(Object.assign({ t: "circle", a, b }, base));
    } else if (e.t === "arc") {
      let a0 = e.a0,
        a1 = e.a1;
      if (a1 <= a0) a1 += 360;
      const n = Math.max(4, Math.ceil((a1 - a0) / 10));
      for (let s = 0; s < n; s++) {
        const p0 = ((a0 + ((a1 - a0) * s) / n) * Math.PI) / 180,
          p1 = ((a0 + ((a1 - a0) * (s + 1)) / n) * Math.PI) / 180;
        objs.push(
          Object.assign(
            {
              t: "line",
              a: T([e.c[0] + Math.cos(p0) * e.r, e.c[1] + Math.sin(p0) * e.r]),
              b: T([e.c[0] + Math.cos(p1) * e.r, e.c[1] + Math.sin(p1) * e.r]),
            },
            base,
          ),
        );
      }
    } else if (e.t === "text") {
      const q = T(e.p),
        size = Math.max(6, Math.round(e.h * k));
      objs.push({
        t: "text",
        x: q[0],
        y: q[1] - size,
        s: e.s.slice(0, 200),
        c: "#6b6b6b",
        size,
        ly: "imports",
      });
    }
  });
  const wmm = (bx1 - bx0) * toMm,
    hmm = (by1 - by0) * toMm;
  const fits = (bx1 - bx0) * k <= doc.w && (by1 - by0) * k <= doc.h;
  return {
    objs,
    msg:
      `Imported ${objs.length} item${objs.length === 1 ? "" : "s"} (${Math.round(wmm / 10) / 100} × ${Math.round(hmm / 10) / 100} m)` +
      (doc.scale > 0 ? ` at 1:${doc.scale}` : ", fitted to the page (no scale set)") +
      (fits ? "." : ". It's bigger than the page: change the paper or scale in 📐 Paper.") +
      " It's on the Imports layer: lock or hide it in 🗂 Layers.",
  };
}
