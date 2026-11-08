/* ================= CUPBOARD PACK: the workshop pack – every panel drawn, edged and drilled, labelled; and a DXF ================= */
import { $, esc, toast } from "../core/helpers.js";
import { openSheet } from "../core/sheet.js";
import { S } from "../core/state.js";
import { cbaPlan } from "./cupboard-alcove.js";
import { cbPlan } from "./cupboard-maker.js";
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
/* every panel, one by one, with its holes */
function cbpPanels(sp) {
  const P = sp.kind && sp.kind !== "full" ? cbaPlan(sp) : cbPlan(sp);
  const shelvesInside =
    sp.kind === "shelves"
      ? false
      : (P.bays || []).some((b) => b.k === "shelves" || b.k === "drawers");
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
      if (/^side$|division/.test(p) && shelvesInside) {
        for (let x = 250; x <= L - 250; x += 32)
          [37, W - 37].forEach((y) => holes.push({ x, y, d: 5 }));
      }
      out.push({
        part: c.part,
        L,
        W,
        th: c.th,
        note: c.note || "",
        edges: cbpEdges(c.part, c.note),
        holes,
      });
    }
  });
  out.forEach((x, i) => (x.label = "P" + (i + 1)));
  return out;
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
  const bought = (sp.kind && sp.kind !== "full" ? cbaPlan(sp) : cbPlan(sp)).cut.filter(
    (c) => !c.th,
  );
  if (bought.length) {
    y += 6;
    doc.text("Also: " + bought.map((c) => `${c.qty} × ${c.part} ${c.l} long`).join("; "), 12, y, {
      maxWidth: 186,
    });
  }
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
    <div class="who">${panels.length} panels from the cutting list, labelled P1–P${panels.length}: each drawn to size with the edges to band and the holes (hinge cups on doors, shelf pins on sides).</div>
    <div class="actions"><button type="button" class="btn primary" id="cbp-pdf">📄 Workshop pack PDF</button><button type="button" class="btn" id="cbp-dxf">📐 Panels DXF (for a CNC or cutting service)</button></div>
    <div class="actions"><button type="button" class="btn" id="f-cancel">Close</button></div>`,
    () => {},
    null,
  );
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
