/* ================= CUPBOARD PACK: the workshop pack – every panel drawn, edged and drilled, labelled; and a DXF ================= */
import { $, esc, store, toast } from "../core/helpers.js";
import { openSheet } from "../core/sheet.js";
import { S } from "../core/state.js";
import { cbaPlan } from "./cupboard-alcove.js";
import { cbPlan } from "./cupboard-maker.js";
import { cbsIs, cbsPlan } from "./cupboard-shapes.js";
import { coData } from "../owner/company-details.js";
import { BRGB } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
export { cbpOpen };
/* From a cupboard page's cutting list: each board becomes its own panel P1, P2… with its size and thickness, the
   edges to band (the front edge of carcass parts, all round doors and drawer fronts, the front and ends of a top),
   hinge-cup holes on doors (35 mm, 22.5 mm in, 100 mm from the ends, more on tall doors) and shelf-pin rows on sides
   (37 mm in, every 32 mm). The PDF: a summary table, then each panel drawn to scale with its label, then a sheet of
   labels to stick on. The DXF: every panel at full size in mm, side by side, holes and labels included. */
/* what each part gets: edges to band [long front, long back, end 1, end 2] */
function cbpEdges(part, note) {
  const p = part.toLowerCase().replace(/^base – /, "");
  if (/door|drawer front/.test(p)) return [1, 1, 1, 1];
  /* a worktop on a base cupboard has its ends showing; a wardrobe top sits between the sides */
  if (/^top$/.test(p) && /overhang/.test(note || "")) return [1, 0, 1, 1];
  if (/back panel|batten|rail/.test(p)) return [0, 0, 0, 0];
  return [1, 0, 0, 0];
}
/* one cupboard's cutting list, or a whole job's (several walls): each board named by its wall, the bought things added
   up across the walls */
function cbpCut(sp) {
  const one = (x) =>
    (cbsIs(x) ? cbsPlan(x) : x.kind && x.kind !== "full" ? cbaPlan(x) : cbPlan(x)).cut;
  if (!sp.job) return one(sp);
  const out = [];
  sp.job.forEach((w, i) =>
    one(w).forEach((c) => {
      if (/^Boards to order/.test(c.part)) return;
      if (c.th) {
        out.push(
          Object.assign({}, c, {
            part: (w.name || "Wall " + (i + 1)) + " – " + c.part.toLowerCase(),
          }),
        );
        return;
      }
      const ex = out.find((o) => !o.th && o.part === c.part && o.l === c.l);
      if (ex) ex.qty += c.qty;
      else out.push(Object.assign({}, c, { note: "" }));
    }),
  );
  return out;
}
/* every panel, one by one, with its holes */
function cbpPanels(sp) {
  if (sp.job) {
    const all = [];
    sp.job.forEach((w, i) =>
      cbpPanels(w).forEach((x) =>
        all.push(
          Object.assign(x, { part: (w.name || "Wall " + (i + 1)) + " – " + x.part.toLowerCase() }),
        ),
      ),
    );
    all.forEach((x, i) => (x.label = "P" + (i + 1)));
    return all;
  }
  const P = cbsIs(sp) ? cbsPlan(sp) : sp.kind && sp.kind !== "full" ? cbaPlan(sp) : cbPlan(sp);
  const shelvesInside =
    sp.kind === "shelves"
      ? false
      : (sp.shelfSup || "pins") === "pins" &&
        (P.bays || []).some((b) => b.k === "shelves" || b.k === "drawers");
  const out = [];
  P.cut.forEach((c) => {
    if (!c.th) return; /* rails and battens are bought, not cut */
    for (let q = 0; q < c.qty; q++) {
      const L = c.l,
        W = c.w;
      const holes = [];
      const p = c.part.toLowerCase().replace(/^base – /, "");
      if (/door/.test(p)) {
        const n = L > 1600 ? 4 : L > 900 ? 3 : 2;
        for (let i = 0; i < n; i++)
          holes.push({ x: 100 + ((L - 200) * i) / (n - 1), y: 22.5, d: 35 });
      }
      if (/(^|– )side$|division/.test(p) && shelvesInside) {
        for (let x = 250; x <= L - 250; x += 32)
          [37, W - 37].forEach((y) => holes.push({ x, y, d: 5 }));
      }
      out.push({
        part: c.part,
        L,
        W,
        th: c.th,
        note: c.note || "",
        mat: c.mat || "",
        edges: cbpEdges(c.part, c.note),
        holes,
      });
    }
  });
  out.forEach((x, i) => (x.label = "P" + (i + 1)));
  return out;
}
/* --- materials and sheets: each material and thickness laid out on its sheets --- */
const CBP_SHEETS = [
  [2440, 1220],
  [2800, 2070],
  [2800, 1830],
  [3050, 1220],
  [2440, 610],
];
const cbpKey = (x) => x.th + " mm " + (x.mat || "board");
/* the settings: a sheet size and price for each material, the saw cut, the trim round each sheet, the edging roll */
/* kept in memory too, for when the device won't store it */
let cbpMem = null;
function cbpSettings() {
  if (cbpMem) return JSON.parse(JSON.stringify(cbpMem));
  return Object.assign(
    { sizes: {}, kerf: 4, trim: 10, roll: 50, edgeP: 0 },
    store.get("jeb.cbpSheets", {}) || {},
  );
}
/* lay the panels out on sheets: strips across the sheet (widest first), panels along each strip. Veneer and oak keep
   their grain along the length; other boards may be turned. Returns the sheets with every panel's place. */
function cbpNest(panels, SL, SW, kerf, trim, grain) {
  const L0 = SL - 2 * trim,
    W0 = SW - 2 * trim;
  const big = [];
  const items = panels
    .map((p) => {
      let l = p.L,
        w = p.W;
      if (!grain && w > l) [l, w] = [w, l];
      if (!grain && (l > L0 || w > W0) && w <= L0 && l <= W0) [l, w] = [w, l];
      return { p, l, w };
    })
    .filter((it) => {
      if (it.l > L0 || it.w > W0) {
        big.push(it.p);
        return false;
      }
      return true;
    })
    .sort((a, b) => b.w - a.w || b.l - a.l);
  const sheets = [];
  items.forEach((it) => {
    let done = false;
    for (const sh of sheets) {
      for (const st of sh.strips)
        if (it.w <= st.h && st.x + it.l <= L0) {
          sh.parts.push({ p: it.p, x: st.x, y: st.y, l: it.l, w: it.w });
          st.x += it.l + kerf;
          done = true;
          break;
        }
      if (done) break;
      if (sh.y + it.w <= W0) {
        const st = { y: sh.y, h: it.w, x: it.l + kerf };
        sh.strips.push(st);
        sh.parts.push({ p: it.p, x: 0, y: sh.y, l: it.l, w: it.w });
        sh.y += it.w + kerf;
        done = true;
        break;
      }
    }
    if (!done)
      sheets.push({
        strips: [{ y: 0, h: it.w, x: it.l + kerf }],
        parts: [{ p: it.p, x: 0, y: 0, l: it.l, w: it.w }],
        y: it.w + kerf,
      });
  });
  sheets.forEach((sh) => (sh.used = sh.parts.reduce((a, q) => a + q.l * q.w, 0) / (SL * SW)));
  return { sheets, big, SL, SW, trim };
}
/* every material: its panels, sheets, how much is used, edging and cost */
function cbpMaterials(panels, set) {
  const groups = {};
  panels.forEach((x) => (groups[cbpKey(x)] = groups[cbpKey(x)] || []).push(x));
  return Object.entries(groups).map(([k, list]) => {
    const z = set.sizes[k] || {};
    const SL = +z.L || 2440,
      SW = +z.W || 1220;
    const grain = /veneer|oak/i.test(k);
    const N = cbpNest(list, SL, SW, +set.kerf || 0, +set.trim || 0, grain);
    const area = list.reduce((a, x) => a + x.L * x.W, 0);
    return {
      key: k,
      list,
      SL,
      SW,
      price: +z.price || 0,
      grain,
      nest: N,
      n: N.sheets.length,
      use: N.sheets.length ? area / (N.sheets.length * SL * SW) : 0,
      band: list.reduce((a, x) => a + cbpBand(x), 0),
    };
  });
}
const cbpEdgeWords = (e) => {
  const w = [];
  if (e[0] && e[1] && e[2] && e[3]) return "all round";
  if (e[0]) w.push("front");
  if (e[1]) w.push("back");
  if (e[2] && e[3]) w.push("both ends");
  else if (e[2] || e[3]) w.push("one end");
  return w.join(", ") || "none";
};
const cbpBand = (x) => (x.edges[0] + x.edges[1]) * x.L + (x.edges[2] + x.edges[3]) * x.W;
/* the PDF workshop pack */
async function cbpPdf(sp, meta) {
  const panels = cbpPanels(sp);
  const set = cbpSettings();
  const mats = cbpMaterials(panels, set);
  await loadJsPdf();
  const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
  const [r, g, b] = BRGB();
  const co = coData();
  const head = (t) => {
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, 210, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(r, g, b);
    doc.text(t, 12, 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(
      [
        co.name,
        sp.name || "Cupboard",
        meta && meta.client ? "for " + meta.client : "",
        new Date().toLocaleDateString("en-GB"),
      ]
        .filter(Boolean)
        .join("  ·  "),
      12,
      19,
    );
    doc.setTextColor(0, 0, 0);
  };
  /* page 1: the summary */
  head("Workshop pack – " + (sp.name || "Cupboard"));
  doc.setFontSize(9);
  let y = 28;
  const cols = [12, 26, 82, 128, 146, 176];
  doc.setFont("helvetica", "bold");
  ["Label", "Part", "Length × width", "Thick", "Edging", "Holes"].forEach((h, i) =>
    doc.text(h, cols[i], y),
  );
  doc.setFont("helvetica", "normal");
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(12, y, 198, y);
  panels.forEach((x) => {
    y += 5.5;
    if (y > 280) {
      doc.addPage();
      head("Workshop pack – " + (sp.name || "Cupboard") + " (continued)");
      y = 30;
    }
    doc.text(x.label, cols[0], y);
    doc.text(doc.splitTextToSize(x.part, 54)[0], cols[1], y);
    doc.text(`${x.L} × ${x.W}`, cols[2], y);
    doc.text(String(x.th), cols[3], y);
    doc.text(cbpEdgeWords(x.edges), cols[4], y);
    doc.text(x.holes.length ? String(x.holes.length) : "–", cols[5], y);
  });
  const band = panels.reduce((a, x) => a + cbpBand(x), 0);
  y += 9;
  doc.setFont("helvetica", "bold");
  doc.text(
    `${panels.length} panels · edge banding about ${Math.ceil((band * 1.1) / 1000)} m (with 10% spare)`,
    12,
    y,
  );
  doc.setFont("helvetica", "normal");
  const bought = cbpCut(sp).filter((c) => !c.th && !/^Boards to order/.test(c.part));
  if (bought.length) {
    y += 6;
    doc.text(
      "Also: " +
        bought
          .map(
            (c) =>
              `${c.qty} × ${c.part}${c.l ? " " + c.l + " long" : ""}${c.note ? " (" + c.note + ")" : ""}`,
          )
          .join("; "),
      12,
      y,
      {
        maxWidth: 186,
      },
    );
  }
  /* materials to order */
  y += bought.length
    ? doc.splitTextToSize(
        "Also: " +
          bought
            .map(
              (c) =>
                `${c.qty} × ${c.part}${c.l ? " " + c.l + " long" : ""}${c.note ? " (" + c.note + ")" : ""}`,
            )
            .join("; "),
        186,
      ).length *
        3.8 +
      6
    : 8;
  if (y > 250) {
    doc.addPage();
    head("Materials to order – " + (sp.name || "Cupboard"));
    y = 30;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Materials to order", 12, y);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  let cost = 0;
  mats.forEach((m) => {
    y += 5.5;
    const c = m.price ? m.n * m.price : 0;
    cost += c;
    doc.text(
      `${m.n} × ${m.key} – sheets ${m.SL} × ${m.SW} · ${m.list.length} panel${m.list.length === 1 ? "" : "s"} · ${Math.round(m.use * 100)}% of the board used${m.grain ? " · grain kept along the length" : ""}${c ? " · £" + c.toFixed(2) : ""}`,
      12,
      y,
      { maxWidth: 186 },
    );
    if (m.nest.big.length) {
      y += 5;
      doc.setTextColor(180, 35, 24);
      doc.text(
        `  Too big for this sheet: ${m.nest.big.map((x) => x.label + " " + x.L + " × " + x.W).join(", ")} – order a bigger board or join it`,
        12,
        y,
        { maxWidth: 186 },
      );
      doc.setTextColor(0, 0, 0);
    }
  });
  const bandM = Math.ceil((band * 1.1) / 1000);
  const rolls = Math.ceil(bandM / (+set.roll || 50));
  y += 5.5;
  const ec = +set.edgeP ? bandM * +set.edgeP : 0;
  cost += ec;
  doc.text(
    `Edging: ${bandM} m with 10% spare – ${rolls} roll${rolls === 1 ? "" : "s"} of ${+set.roll || 50} m${ec ? " · £" + ec.toFixed(2) : ""}`,
    12,
    y,
  );
  if (cost) {
    y += 5.5;
    doc.setFont("helvetica", "bold");
    doc.text(`Boards and edging: about £${cost.toFixed(2)} (from your prices)`, 12, y);
    doc.setFont("helvetica", "normal");
  }
  y += 5;
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 110);
  doc.text(
    `Laid out with a ${+set.kerf || 0} mm saw cut and ${+set.trim || 0} mm trimmed off each sheet edge.`,
    12,
    y,
  );
  doc.setTextColor(0, 0, 0);
  /* a cutting layout for every sheet, two to a page */
  let slot = 0;
  mats.forEach((m) =>
    m.nest.sheets.forEach((sh, si) => {
      if (slot % 2 === 0) {
        doc.addPage();
        head("Cutting layout – " + (sp.name || "Cupboard"));
      }
      const oy = 28 + (slot % 2) * 132;
      slot++;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(
        `${m.key} – sheet ${si + 1} of ${m.n} (${m.SL} × ${m.SW}) · ${Math.round(sh.used * 100)}% used`,
        12,
        oy,
      );
      doc.setFont("helvetica", "normal");
      const k = Math.min(186 / m.SL, 112 / m.SW),
        ox = 12,
        y0 = oy + 4;
      doc.setDrawColor(150, 150, 150);
      doc.setFillColor(238, 238, 238);
      doc.rect(ox, y0, m.SL * k, m.SW * k, "FD");
      doc.setDrawColor(40, 40, 40);
      sh.parts.forEach((q) => {
        doc.setDrawColor(40, 40, 40);
        doc.setFillColor(255, 255, 255);
        const x = ox + (m.nest.trim + q.x) * k,
          yy = y0 + (m.nest.trim + q.y) * k,
          w = q.l * k,
          h = q.w * k;
        doc.rect(x, yy, w, h, "FD");
        doc.setFontSize(Math.max(5, Math.min(9, h * 0.45, w * 0.18)));
        doc.setTextColor(r, g, b);
        doc.text(q.p.label, x + 1.2, yy + Math.min(h - 1, 4));
        doc.setTextColor(0, 0, 0);
        if (h > 7 && w > 22) doc.text(`${q.l} × ${q.w}`, x + 1.2, yy + Math.min(h - 1, 8));
      });
    }),
  );
  /* each panel drawn to scale, six to a page */
  const bw = 90,
    bh = 78;
  panels.forEach((x, i) => {
    if (i % 6 === 0) {
      doc.addPage();
      head("Panels – " + (sp.name || "Cupboard"));
    }
    const k = i % 6,
      ox = 12 + (k % 2) * (bw + 6),
      oy = 26 + Math.floor(k / 2) * (bh + 6);
    doc.setDrawColor(210, 210, 210);
    doc.rect(ox, oy, bw, bh);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(r, g, b);
    doc.text(x.label, ox + 3, oy + 8);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(x.part, ox + 22, oy + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${x.L} × ${x.W} × ${x.th} mm · edging: ${cbpEdgeWords(x.edges)}`, ox + 22, oy + 10.5);
    /* the panel, longest side across */
    const s = Math.min((bw - 24) / x.L, (bh - 30) / x.W);
    const pw = x.L * s,
      ph = x.W * s,
      px = ox + (bw - pw) / 2,
      py = oy + 16 + (bh - 30 - ph) / 2;
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.3);
    doc.rect(px, py, pw, ph);
    /* banded edges, thick in the brand colour: front = bottom edge, back = top, ends = left and right */
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(1.1);
    if (x.edges[0]) doc.line(px, py + ph, px + pw, py + ph);
    if (x.edges[1]) doc.line(px, py, px + pw, py);
    if (x.edges[2]) doc.line(px, py, px, py + ph);
    if (x.edges[3]) doc.line(px + pw, py, px + pw, py + ph);
    doc.setLineWidth(0.2);
    doc.setDrawColor(40, 40, 40);
    x.holes.forEach((h) =>
      doc.circle(px + h.x * s, py + ph - h.y * s, Math.max(0.35, (h.d / 2) * s)),
    );
    /* sizes */
    doc.setFontSize(7.5);
    doc.text(`${x.L}`, px + pw / 2, py + ph + 4.5, { align: "center" });
    doc.text(`${x.W}`, px - 2, py + ph / 2, { align: "right" });
    if (x.holes.some((h) => h.d === 35))
      doc.text("Hinge cups Ø35, 22.5 in from the front, 100 from the ends", ox + 3, oy + bh - 3);
    else if (x.holes.length) doc.text("Shelf pins Ø5, 37 in, every 32", ox + 3, oy + bh - 3);
    else if (x.note) doc.text(doc.splitTextToSize(x.note, bw - 6)[0], ox + 3, oy + bh - 3);
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text("front", px + pw + 1, py + ph, { align: "left" });
    doc.setTextColor(0, 0, 0);
  });
  /* labels to stick on: 3 across, 7 down */
  for (let i = 0; i < panels.length; i++) {
    if (i % 21 === 0) {
      doc.addPage();
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text("Labels – print on 21-to-a-sheet labels (63.5 × 38.1 mm)", 105, 8, {
        align: "center",
      });
      doc.setTextColor(0, 0, 0);
    }
    const x = panels[i],
      k = i % 21,
      lx = 7.2 + (k % 3) * 66,
      ly = 15.1 + Math.floor(k / 3) * 38.1;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(r, g, b);
    doc.text(x.label, lx + 4, ly + 10);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(x.part, 40)[0], lx + 22, ly + 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${x.L} × ${x.W} × ${x.th}`, lx + 4, ly + 18);
    doc.text("Edging: " + cbpEdgeWords(x.edges), lx + 4, ly + 23);
    doc.text(doc.splitTextToSize(sp.name || "Cupboard", 56)[0], lx + 4, ly + 30);
  }
  return doc.output("blob");
}
/* the DXF: every panel at full size (mm), side by side, with its holes and label */
function cbpDxf(sp) {
  const panels = cbpPanels(sp);
  const L = [];
  const add = (...a) => L.push(...a.map(String));
  add(0, "SECTION", 2, "HEADER", 9, "$INSUNITS", 70, 4, 0, "ENDSEC");
  add(0, "SECTION", 2, "TABLES", 0, "TABLE", 2, "LAYER", 70, 3);
  [
    ["PANELS", 7],
    ["EDGING", 1],
    ["HOLES", 5],
    ["LABELS", 3],
  ].forEach(([n, c]) => add(0, "LAYER", 2, n, 70, 0, 62, c, 6, "CONTINUOUS"));
  add(0, "ENDTAB", 0, "ENDSEC", 0, "SECTION", 2, "ENTITIES");
  const line = (x1, y1, x2, y2, lay) =>
    add(0, "LINE", 8, lay, 10, x1, 20, y1, 30, 0, 11, x2, 21, y2, 31, 0);
  let ox = 0;
  panels.forEach((x) => {
    const e = x.edges;
    line(ox, 0, ox + x.L, 0, e[0] ? "EDGING" : "PANELS");
    line(ox, x.W, ox + x.L, x.W, e[1] ? "EDGING" : "PANELS");
    line(ox, 0, ox, x.W, e[2] ? "EDGING" : "PANELS");
    line(ox + x.L, 0, ox + x.L, x.W, e[3] ? "EDGING" : "PANELS");
    x.holes.forEach((h) =>
      add(
        0,
        "CIRCLE",
        8,
        "HOLES",
        10,
        (ox + h.x).toFixed(2),
        20,
        h.y.toFixed(2),
        30,
        0,
        40,
        h.d / 2,
      ),
    );
    add(
      0,
      "TEXT",
      8,
      "LABELS",
      10,
      ox + 10,
      20,
      x.W + 15,
      30,
      0,
      40,
      30,
      1,
      `${x.label} ${x.part} ${x.L}x${x.W}x${x.th}`,
    );
    ox += x.L + 100;
  });
  add(0, "ENDSEC", 0, "EOF");
  return L.join("\r\n") + "\r\n";
}
/* the choice: PDF or DXF */
function cbpOpen(sp, meta) {
  const panels = cbpPanels(sp);
  openSheet(
    `<h3 id="sheettitle">🪚 Workshop pack – ${esc(sp.name || "Cupboard")}</h3>
    ${
      meta && meta.walls && meta.walls.length > 1
        ? `<label for="cbp-which">Which cupboards<select id="cbp-which"><option value="one"${sp.job ? "" : " selected"}>${esc((meta.one || sp).name || "This cupboard")} only</option><option value="job"${sp.job ? " selected" : ""}>The whole job – all ${meta.walls.length} (${esc(meta.walls.map((w) => w.name || "Cupboard").join(", "))})</option></select></label>`
        : ""
    }
    <div class="who">${panels.length} panels from the cutting list${sp.job ? " of every cupboard in this drawing" : ""}, labelled P1–P${panels.length}: each drawn to size with the edges to band and the holes (hinge cups on doors, shelf pins on sides).</div>
    <details class="cbp-mats" open><summary>Materials and sheets</summary><div id="cbp-mrows"></div>
      <div class="cbp-mg"><label>Saw cut (kerf, mm)<input id="cbp-kerf" type="number" inputmode="decimal"></label><label>Trim off each sheet edge (mm)<input id="cbp-trim" type="number" inputmode="numeric"></label><label>Edging roll (m)<input id="cbp-roll" type="number" inputmode="numeric"></label><label>Edging £ a metre<input id="cbp-ep" type="number" inputmode="decimal" placeholder="optional"></label></div>
      <div class="cbp-out" id="cbp-out" aria-live="polite"></div></details>
    <div class="actions"><button type="button" class="btn primary" id="cbp-pdf">📄 Workshop pack PDF</button><button type="button" class="btn" id="cbp-dxf">📐 Panels DXF (for a CNC or cutting service)</button></div>
    <div class="actions"><button type="button" class="btn" id="f-cancel">Close</button></div>`,
    () => {},
    null,
  );
  /* this cupboard or the whole job: the pack again for the other */
  if ($("cbp-which"))
    $("cbp-which").onchange = (e) => {
      const one = (meta && meta.one) || sp;
      cbpOpen(
        e.target.value === "job" ? { name: "Whole job", job: meta.walls } : one,
        Object.assign({}, meta, { one }),
      );
    };
  /* materials: one row each – the sheet size (a common one or your own) and the price; the sheets worked out live */
  const set = cbpSettings();
  const keys = [...new Set(panels.map(cbpKey))];
  $("cbp-mrows").innerHTML = keys
    .map((k, i) => {
      const z = set.sizes[k] || {};
      const L = +z.L || 2440,
        W = +z.W || 1220;
      const std = CBP_SHEETS.some(([a, b]) => a === L && b === W);
      return `<div class="cbp-mrow" data-k="${esc(k)}"><b>${esc(k)}</b><label>Sheet size<select class="cbp-sz" aria-label="Sheet size for ${esc(k)}">${CBP_SHEETS.map(([a, b]) => `<option value="${a}x${b}"${a === L && b === W ? " selected" : ""}>${a} × ${b}</option>`).join("")}<option value="own"${std ? "" : " selected"}>My own size…</option></select></label><label>Length (mm)<input class="cbp-L" type="number" inputmode="numeric" value="${L}"></label><label>Width (mm)<input class="cbp-W" type="number" inputmode="numeric" value="${W}"></label><label>£ a sheet<input class="cbp-p" type="number" inputmode="decimal" value="${z.price || ""}" placeholder="optional" id="cbp-p${i}"></label></div>`;
    })
    .join("");
  $("cbp-kerf").value = set.kerf;
  $("cbp-trim").value = set.trim;
  $("cbp-roll").value = set.roll;
  $("cbp-ep").value = set.edgeP || "";
  const read = () => {
    const sizes = Object.assign({}, set.sizes);
    document.querySelectorAll(".cbp-mrow").forEach((r) => {
      sizes[r.dataset.k] = {
        L: +r.querySelector(".cbp-L").value || 2440,
        W: +r.querySelector(".cbp-W").value || 1220,
        price: +r.querySelector(".cbp-p").value || 0,
      };
    });
    const ns = {
      sizes,
      kerf: Math.max(0, +$("cbp-kerf").value || 0),
      trim: Math.max(0, +$("cbp-trim").value || 0),
      roll: Math.max(1, +$("cbp-roll").value || 50),
      edgeP: Math.max(0, +$("cbp-ep").value || 0),
    };
    cbpMem = ns;
    store.set("jeb.cbpSheets", ns);
    return ns;
  };
  const show = () => {
    const ns = read();
    const mats = cbpMaterials(panels, ns);
    const band = panels.reduce((a, x) => a + cbpBand(x), 0);
    const bandM = Math.ceil((band * 1.1) / 1000);
    let cost = bandM * ns.edgeP;
    const rows = mats.map((m) => {
      cost += m.n * m.price;
      return `<li><b>${m.n} sheet${m.n === 1 ? "" : "s"}</b> of ${esc(m.key)} (${m.SL} × ${m.SW}) – ${m.list.length} panel${m.list.length === 1 ? "" : "s"}, ${Math.round(m.use * 100)}% used${m.grain ? ", grain kept along the length" : ""}${m.price ? ` · £${(m.n * m.price).toFixed(2)}` : ""}${m.nest.big.length ? `<br><span class="cbp-big">Too big for this sheet: ${m.nest.big.map((x) => esc(x.label + " " + x.L + " × " + x.W)).join(", ")}</span>` : ""}</li>`;
    });
    $("cbp-out").innerHTML =
      `<ul>${rows.join("")}<li>Edging <b>${bandM} m</b> (10% spare) – ${Math.ceil(bandM / ns.roll)} roll${Math.ceil(bandM / ns.roll) === 1 ? "" : "s"} of ${ns.roll} m${ns.edgeP ? ` · £${(bandM * ns.edgeP).toFixed(2)}` : ""}</li></ul>${cost ? `<b>Boards and edging about £${cost.toFixed(2)}</b>` : ""}<div class="who">The PDF has a cutting layout for every sheet.</div>`;
  };
  document.querySelectorAll(".cbp-mrow").forEach((r) => {
    r.querySelector(".cbp-sz").onchange = (e) => {
      if (e.target.value !== "own") {
        const [a, b] = e.target.value.split("x");
        r.querySelector(".cbp-L").value = a;
        r.querySelector(".cbp-W").value = b;
      } else r.querySelector(".cbp-L").focus();
      show();
    };
    [".cbp-L", ".cbp-W"].forEach((c) =>
      r.querySelector(c).addEventListener("input", () => {
        const L = +r.querySelector(".cbp-L").value,
          W = +r.querySelector(".cbp-W").value;
        const m = CBP_SHEETS.find(([a, b]) => a === L && b === W);
        r.querySelector(".cbp-sz").value = m ? m[0] + "x" + m[1] : "own";
        show();
      }),
    );
    r.querySelector(".cbp-p").addEventListener("input", show);
  });
  ["cbp-kerf", "cbp-trim", "cbp-roll", "cbp-ep"].forEach((id) =>
    $(id).addEventListener("input", show),
  );
  show();
  $("cbp-pdf").onclick = async () => {
    try {
      const blob = await cbpPdf(sp, meta);
      await S.dl.save({ filename: (sp.name || "Cupboard") + " – workshop pack.pdf", data: blob });
    } catch (e) {
      toast("Couldn't make the PDF");
    }
  };
  $("cbp-dxf").onclick = async () => {
    try {
      await S.dl.save({
        filename: (sp.name || "Cupboard") + " – panels.dxf",
        data: new Blob([cbpDxf(sp)], { type: "application/dxf" }),
      });
    } catch (e) {
      toast("Couldn't make the file");
    }
  };
}
