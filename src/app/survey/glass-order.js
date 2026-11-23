/* ================= GLASS ORDER: sealed units, toughened handrail panels, coloured glass, splashbacks, mirrors… → an order for the glass supplier ================= */
import { bossName } from "../core/company-names.js";
import { pickField, pickVal, wirePicks } from "../core/fields.js";
import { $, esc, iso, shortDay, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer } from "../core/viewer.js";
import { newId } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { BIN_DAYS } from "../owner/deleted-items.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { lhFinish, lhFrame } from "../sales/letterhead-setup.js";
import { siteFull, siteLabel } from "../sites/job-details.js";
export { GLO };
/* James (Nov 2026): "in door and windows a glass form for sealed units, toughened panels for handrails, coloured glass,
   splashbacks and any others". From Job sheets (beside 🪟 Door & window survey) or a client's job page: 🪟 Glass order.
   It lists each piece of glass – what it is, how many, width × height in mm, and what that kind needs (a sealed unit's
   panes, spacer bar and gas; a handrail panel's thickness, edges and holes; a splashback's colour and socket cut-outs…)
   – with who it's for, the glass supplier, where it goes and when it's needed. The total area is worked out. 📄 PDF
   makes the order on the letterhead; 📧 Send to supplier shares the PDF (or emails a summary), and marks it sent.
   Owner only; stored in todos/{id} (kind "glassorder"). */
const GLO = (() => {
  const T = (l) => [l, null];
  const TYPES = {
    unit: {
      l: "Sealed unit (double / triple glazed)",
      ic: "🪟",
      f: [
        ["glz", "Glazing", ["Double", "Triple"]],
        ["ovr", "Overall thickness", ["28mm", "24mm", "20mm", "32mm", "36mm", "44mm (triple)"]],
        [
          "out",
          "Outer pane",
          [
            "4mm clear",
            "4mm toughened",
            "6mm toughened",
            "6.4mm laminated",
            "4mm obscure",
            "4mm obscure toughened",
            "4mm self-cleaning",
          ],
        ],
        [
          "inn",
          "Inner pane",
          [
            "4mm Low-E (softcoat)",
            "4mm Low-E toughened",
            "4mm clear",
            "4mm toughened",
            "6.4mm laminated",
            "4mm obscure",
            "4mm obscure toughened",
          ],
        ],
        ["pat", ...T("Obscure pattern (if any)")],
        [
          "spc",
          "Spacer bar",
          ["Black warm edge", "Grey warm edge", "White", "Silver aluminium", "Brown"],
        ],
        ["gas", "Filled with", ["Argon", "Air", "Krypton"]],
        ["geo", ...T("Georgian bars (e.g. 2 across, 1 down, 18mm white)")],
      ],
    },
    rail: {
      l: "Toughened panel for a handrail / balustrade",
      ic: "🛡️",
      f: [
        [
          "thk",
          "Glass",
          [
            "10mm toughened",
            "12mm toughened",
            "15mm toughened",
            "13.5mm toughened laminated",
            "17.5mm toughened laminated",
            "21.5mm toughened laminated",
          ],
        ],
        ["fin", "Finish", ["Clear", "Low-iron (extra clear)", "Obscure / satin", "Tinted"]],
        ["edg", "Edges", ["Polished all round", "Polished, corners radiused", "Ground (arrissed)"]],
        [
          "fix",
          "Fixing",
          [
            "Bottom channel (no holes)",
            "Clamps (no holes)",
            "Holes for standoffs / bolts",
            "Top rail cap only",
          ],
        ],
        ["hol", ...T("Holes – how many, what size and where")],
      ],
    },
    colour: {
      l: "Coloured glass",
      ic: "🎨",
      f: [
        ["col", ...T("Colour (name or RAL number)")],
        ["thk", "Thickness", ["4mm", "6mm", "8mm", "10mm"]],
        ["tgh", "Toughened", ["Yes", "No"]],
        ["edg", "Edges", ["Polished", "Ground (arrissed)", "Not needed"]],
      ],
    },
    splash: {
      l: "Splashback",
      ic: "🍳",
      f: [
        ["col", ...T("Colour (name or RAL number)")],
        ["thk", "Glass", ["6mm toughened", "8mm toughened", "4mm toughened"]],
        ["fin", "Glass type", ["Low-iron (true colours)", "Standard float"]],
        ["cut", ...T("Cut-outs for sockets / switches – how many, size, where")],
        ["edg", "Edges", ["Polished all round", "Polished, corners radiused"]],
        ["fix", "Fixing", ["Silicone / adhesive", "Screw holes with caps"]],
      ],
    },
    mirror: {
      l: "Mirror",
      ic: "🪞",
      f: [
        ["thk", "Thickness", ["4mm", "6mm"]],
        ["saf", "Safety backing", ["Yes", "No"]],
        ["edg", "Edges", ["Polished", "Bevelled", "Ground (arrissed)"]],
        ["hol", ...T("Holes / cut-outs")],
      ],
    },
    pane: {
      l: "Single pane (replacement, greenhouse, cabinet…)",
      ic: "▭",
      f: [
        [
          "typ",
          "Glass",
          [
            "4mm float",
            "4mm toughened",
            "6mm toughened",
            "6.4mm laminated",
            "4mm obscure",
            "6mm Georgian wired",
            "3mm horticultural",
          ],
        ],
        ["pat", ...T("Obscure pattern (if any)")],
        ["edg", "Edges", ["Not needed", "Ground (arrissed)", "Polished"]],
      ],
    },
    shelf: {
      l: "Shelf, table top or worktop",
      ic: "🗄️",
      f: [
        ["thk", "Glass", ["6mm toughened", "8mm toughened", "10mm toughened", "12mm toughened"]],
        ["fin", "Finish", ["Clear", "Low-iron", "Frosted", "Coloured (say in the notes)"]],
        ["edg", "Edges", ["Polished", "Bevelled", "Corners radiused"]],
      ],
    },
    other: { l: "Something else", ic: "➕", f: [] },
  };
  const SHAPES = ["Rectangle", "Shaped – template / drawing to follow", "Raked (sloping top)"];
  const DELIVER = ["Deliver to site", "Deliver to our yard", "We'll collect"];
  const recs = () =>
    (S.glassOrders || []).slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const clientOf = (r) =>
    r && r.clientId ? (S.clients || []).find((c) => c.id === r.clientId) : null;
  const area = (it) => ((+it.qty || 0) * (+it.w || 0) * (+it.h || 0)) / 1e6;
  const tot = (r) => (r.items || []).reduce((a, it) => a + area(it), 0);
  const nPieces = (r) => (r.items || []).reduce((a, it) => a + (+it.qty || 0), 0);
  /* what one piece is, in words: "24mm double sealed unit: 4mm toughened / 4mm Low-E (softcoat), black warm edge, argon" */
  function specOf(it) {
    const t = TYPES[it.type] || TYPES.other;
    return t.f
      .map(([k, l, o]) =>
        it[k] ? (Array.isArray(o) ? "" : l.replace(/\s*[(–].*$/, "") + ": ") + it[k] : "",
      )
      .filter(Boolean)
      .join(" · ");
  }
  const nextRef = () => {
    const n = recs().reduce(
      (m, r) => Math.max(m, +(String(r.ref || "").match(/(\d+)$/) || [0, 0])[1]),
      0,
    );
    return "GO-" + String(n + 1).padStart(3, "0");
  };
  function blankItem(type) {
    const t = TYPES[type] || TYPES.other;
    const it = { type, qty: 1, w: "", h: "", shape: SHAPES[0], notes: "" };
    t.f.forEach(([k, , o]) => (it[k] = Array.isArray(o) ? o[0] : ""));
    if (type === "unit") it.pat = "";
    return it;
  }
  /* ---- one piece of glass in the form ---- */
  function itemHtml(it, i) {
    const t = TYPES[it.type] || TYPES.other;
    const sel = (k, l, o) =>
      `<label>${esc(l)}<select class="glo-f" data-k="${k}">${o.map((x) => `<option${x === it[k] ? " selected" : ""}>${esc(x)}</option>`).join("")}</select></label>`;
    const txt = (k, l) =>
      `<label>${esc(l)}<input class="glo-f" data-k="${k}" maxlength="200" value="${esc(it[k] || "")}"></label>`;
    const a = area(it);
    return `<div class="card glo-item" data-i="${i}"><div class="glo-ih"><b>${t.ic} ${i + 1}. ${esc(t.l)}</b><button type="button" class="linkdanger glo-x" aria-label="Remove piece ${i + 1}">✕ Remove</button></div>
      <div class="glo-g3"><label>How many<input class="glo-f" data-k="qty" type="number" inputmode="numeric" min="1" max="999" value="${esc(it.qty || 1)}"></label>
      <label>Width (mm)<input class="glo-f" data-k="w" type="number" inputmode="numeric" min="1" max="9999" value="${esc(it.w || "")}" placeholder="e.g. 900"></label>
      <label>Height (mm)<input class="glo-f" data-k="h" type="number" inputmode="numeric" min="1" max="9999" value="${esc(it.h || "")}" placeholder="e.g. 1100"></label></div>
      <div class="glo-g2">${sel("shape", "Shape", SHAPES)}${t.f.map(([k, l, o]) => (Array.isArray(o) ? sel(k, l, o) : txt(k, l))).join("")}</div>
      <label>${it.type === "other" ? "What it is – glass, thickness, edges, anything else" : "Notes"}<textarea class="glo-f" data-k="notes" maxlength="600" style="min-height:44px">${esc(it.notes || "")}</textarea></label>
      <div class="who glo-area">${a ? a.toFixed(2) + " m²" : "Put the sizes in to work out the area"}</div></div>`;
  }
  /* ---- the form ---- */
  function edit(rec, pre) {
    const ed = !!(rec && rec.id);
    const r = JSON.parse(
      JSON.stringify(
        rec || {
          ref: nextRef(),
          date: iso(new Date()),
          clientId: (pre && pre.clientId) || "",
          site: (pre && pre.site) || "",
          supName: "",
          supEmail: "",
          supId: "",
          needBy: "",
          deliver: DELIVER[0],
          notes: "",
          items: [],
          status: "draft",
        },
      ),
    );
    const read = () => {
      document.querySelectorAll(".glo-item").forEach((el) => {
        const it = r.items[+el.dataset.i];
        if (!it) return;
        el.querySelectorAll(".glo-f").forEach((f) => (it[f.dataset.k] = f.value.trim()));
      });
      r.clientId = $("glo-cl").value;
      r.site = pickVal("glo-site");
      r.supId = $("glo-sup").value;
      r.supName = $("glo-supn").value.trim();
      r.supEmail = $("glo-supe").value.trim();
      r.needBy = $("glo-need").value;
      r.deliver = $("glo-del").value;
      r.notes = $("glo-notes").value.trim();
    };
    const draw = () => {
      openSheet(
        `<h3 id="sheettitle">🪟 Glass order ${esc(r.ref)}</h3>
        <div class="who">Each piece of glass, its sizes and what it needs. 📄 PDF makes the order to send to the glass supplier.</div>
        <div class="glo-g2"><label>For (client)<select id="glo-cl"><option value="">– not for a client –</option>${(
          S.clients || []
        )
          .filter((c) => c.name)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(
            (c) =>
              `<option value="${esc(c.id)}"${c.id === r.clientId ? " selected" : ""}>${esc(c.name)}</option>`,
          )
          .join("")}</select></label>
        ${pickField("glo-site", "Site (where it goes)", siteNames(), r.site || "", "e.g. 12 High Street", false)}</div>
        <div class="glo-g2"><label>Glass supplier<select id="glo-sup"><option value="">– type one below, or pick –</option>${(
          S.suppliers || []
        )
          .map(
            (s) =>
              `<option value="${esc(s.id)}"${s.id === r.supId ? " selected" : ""}>${esc(s.name || "")}</option>`,
          )
          .join("")}</select></label>
        <label>Supplier name<input id="glo-supn" maxlength="100" value="${esc(r.supName || "")}" placeholder="e.g. Exeter Glass"></label>
        <label>Supplier email<input id="glo-supe" type="email" maxlength="120" value="${esc(r.supEmail || "")}" placeholder="orders@…"></label>
        <label>Needed by<input id="glo-need" type="date" value="${esc(r.needBy || "")}"></label>
        <label>Delivery<select id="glo-del">${DELIVER.map((d) => `<option${d === r.deliver ? " selected" : ""}>${d}</option>`).join("")}</select></label></div>
        <div class="flabel">The glass ${r.items.length ? `<span class="who">${nPieces(r)} piece${nPieces(r) === 1 ? "" : "s"} · ${tot(r).toFixed(2)} m²</span>` : ""}</div>
        <div id="glo-items">${r.items.map(itemHtml).join("") || '<div class="who">Nothing yet – add a piece below.</div>'}</div>
        <div class="flabel">＋ Add a piece of glass</div>
        <div class="glo-add">${Object.entries(TYPES)
          .map(
            ([k, t]) =>
              `<button type="button" class="btn glo-new" data-t="${k}">${t.ic} ${esc(t.l)}</button>`,
          )
          .join("")}</div>
        <label for="glo-notes">Notes for the supplier<textarea id="glo-notes" maxlength="1500" placeholder="e.g. All units kitemarked. Call before delivery.">${esc(r.notes || "")}</textarea></label>
        <div class="actions"><button type="button" class="btn" id="glo-pdf">📄 PDF</button><button type="button" class="btn" id="glo-send">📧 Send to supplier</button></div>
        ${formFoot(ed, "Save")}`,
        async () => {
          read();
          if (!r.items.length) {
            showErr("Add at least one piece of glass.");
            return;
          }
          const bad = r.items.findIndex((it) => !(+it.w > 0 && +it.h > 0 && +it.qty > 0));
          if (bad >= 0) {
            showErr(`Piece ${bad + 1} needs how many, the width and the height.`);
            return;
          }
          try {
            await save(r);
            closeForm();
            toast("Glass order " + r.ref + " saved");
            render();
          } catch (e) {
            showErr("Couldn't save. Check your connection.");
          }
        },
      );
      wirePicks($("sheet") || document);
      if ($("glo-sup"))
        $("glo-sup").onchange = () => {
          const s = (S.suppliers || []).find((x) => x.id === $("glo-sup").value);
          if (s) {
            $("glo-supn").value = s.name || "";
            $("glo-supe").value = s.email || "";
          }
        };
      if ($("glo-cl"))
        $("glo-cl").onchange = () => {
          const c = (S.clients || []).find((x) => x.id === $("glo-cl").value);
          const s = $("glo-site");
          if (
            c &&
            c.site &&
            s &&
            !pickVal("glo-site") &&
            [...(s.options || [])].some((o) => o.value === c.site)
          )
            s.value = c.site;
          else if (c && c.site && s && s.tagName === "INPUT" && !s.value) s.value = c.site;
        };
      document.querySelectorAll(".glo-new").forEach(
        (b) =>
          (b.onclick = () => {
            read();
            r.items.push(blankItem(b.dataset.t));
            draw();
            const last = document.querySelector(".glo-item:last-of-type");
            if (last) last.scrollIntoView({ block: "center" });
          }),
      );
      document.querySelectorAll(".glo-x").forEach(
        (b) =>
          (b.onclick = () => {
            read();
            r.items.splice(+b.closest(".glo-item").dataset.i, 1);
            draw();
          }),
      );
      document
        .querySelectorAll(".glo-item [data-k=qty], .glo-item [data-k=w], .glo-item [data-k=h]")
        .forEach(
          (f) =>
            (f.oninput = () => {
              const el = f.closest(".glo-item");
              const it = {
                qty: el.querySelector("[data-k=qty]").value,
                w: el.querySelector("[data-k=w]").value,
                h: el.querySelector("[data-k=h]").value,
              };
              const a = area(it);
              el.querySelector(".glo-area").textContent = a
                ? a.toFixed(2) + " m²"
                : "Put the sizes in to work out the area";
            }),
        );
      $("glo-pdf").onclick = async () => {
        read();
        if (!r.items.length) return toast("Add a piece of glass first");
        await pdf(r, true);
      };
      $("glo-send").onclick = async () => {
        read();
        if (!r.items.length) return toast("Add a piece of glass first");
        await send(r);
        draw();
      };
      if (ed)
        armDelete(async () => {
          /* an owner delete goes to Deleted items by itself */
          await S.db.doc("todos/" + r.id).delete();
          S.glassOrders = (S.glassOrders || []).filter((x) => x.id !== r.id);
          closeForm();
          toast("Glass order deleted · in Setup › Deleted items for " + BIN_DAYS + " days");
          render();
        });
    };
    draw();
  }
  async function save(r) {
    const id = r.id || newId();
    const d = Object.assign({}, r, { kind: "glassorder", updated: Date.now() });
    if (!d.created) d.created = Date.now();
    delete d.id;
    await S.db.doc("todos/" + id).set(d);
    r.id = id;
    S.glassOrders = (S.glassOrders || [])
      .filter((x) => x.id !== id)
      .concat([Object.assign({ id }, d)]);
    return r;
  }
  /* ---- the PDF ---- */
  async function pdf(r, show) {
    try {
      await loadJsPdf();
    } catch (e) {
      toast("Couldn't load the PDF maker. Check your connection.");
      return null;
    }
    toast("Making the PDF…");
    const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    const LH = await lhFrame();
    const W = 210,
      M = 15,
      CW = W - 2 * M;
    const RED = BRGB();
    const co = coData();
    const top = LH.top || 18,
      bot = LH.pics ? LH.bot : 282;
    let y = top;
    const clean = (t) =>
      String(t == null ? "" : t)
        .replace(/[–—]/g, "-")
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/×/g, "x")
        .replace(/²/g, "2")
        .replace(/[^\x09\x0A\x0D\x20-\x7E£·•°]/g, "");
    if (!LH.pics) {
      doc.setFillColor(...RED);
      doc.rect(0, 0, W, 5, "F");
      try {
        await pdfLogo(doc, W - M, 10, 46, 20);
      } catch (e) {}
    }
    const need = (h) => {
      if (y + h > bot) {
        doc.addPage();
        y = top;
      }
    };
    doc.setTextColor(17, 17, 17);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text("Glass order", M, y + 4);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(
      clean(
        [co.name, "Order " + r.ref, r.date ? shortDay(r.date) : ""].filter(Boolean).join(" · "),
      ),
      M,
      y,
    );
    y += 6;
    const c = clientOf(r);
    const rows = [
      ["To", [r.supName, r.supEmail].filter(Boolean).join(" · ") || "-"],
      ["From", [co.name, co.phone, co.email].filter(Boolean).join(" · ")],
      [
        "Job",
        [r.site ? siteLabel(r.site) : "", c ? c.name : ""].filter(Boolean).join(" · ") || "-",
      ],
      [
        "Delivery",
        r.deliver +
          (r.deliver === "Deliver to site" && r.site ? " – " + (siteFull(r.site) || r.site) : ""),
      ],
      ["Needed by", r.needBy ? shortDay(r.needBy) : "As soon as you can"],
    ];
    doc.setFontSize(10);
    rows.forEach(([l, v]) => {
      doc.setTextColor(90, 90, 90);
      doc.setFont("helvetica", "normal");
      doc.text(clean(l), M, y);
      doc.setTextColor(17, 17, 17);
      doc.setFont("helvetica", "bold");
      const ls = doc.splitTextToSize(clean(v), CW - 30);
      doc.text(ls, M + 30, y);
      y += 5 * ls.length + 0.5;
    });
    y += 2;
    /* the pieces */
    const X = { n: M, q: M + 9, s: M + 21, d: M + 62 };
    const headRow = () => {
      doc.setFillColor(...RED);
      doc.rect(M, y, CW, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("#", X.n + 1.5, y + 4.8);
      doc.text("Qty", X.q, y + 4.8);
      doc.text("Size W x H (mm)", X.s, y + 4.8);
      doc.text("What", X.d, y + 4.8);
      y += 9;
    };
    headRow();
    (r.items || []).forEach((it, i) => {
      const t = TYPES[it.type] || TYPES.other;
      /* measured in the font each is written in, so long lines wrap inside the page */
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const what = doc.splitTextToSize(clean(t.l), W - M - X.d);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const spec = doc.splitTextToSize(
        clean(
          [specOf(it), it.shape && it.shape !== SHAPES[0] ? it.shape : "", it.notes]
            .filter(Boolean)
            .join(" · "),
        ),
        W - M - X.d,
      );
      const h = 5 * what.length + 4.3 * spec.length + 4;
      if (y + h > bot) {
        doc.addPage();
        y = top;
        headRow();
      }
      doc.setTextColor(17, 17, 17);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(String(i + 1), X.n + 1.5, y + 3);
      doc.text(String(it.qty || 1), X.q, y + 3);
      doc.text(clean(`${it.w} x ${it.h}`), X.s, y + 3);
      doc.text(what, X.d, y + 3);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(spec, X.d, y + 3 + 5 * what.length);
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(clean(area(it).toFixed(2) + " m2"), X.s, y + 8);
      y += h;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(M, y - 1.5, W - M, y - 1.5);
    });
    need(12);
    doc.setTextColor(17, 17, 17);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(
      clean(`${nPieces(r)} piece${nPieces(r) === 1 ? "" : "s"} · ${tot(r).toFixed(2)} m2 in all`),
      M,
      y + 4,
    );
    y += 9;
    if (r.notes) {
      const ls = doc.splitTextToSize(clean(r.notes), CW);
      need(8 + ls.length * 4.6);
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 90);
      doc.text("Notes", M, y);
      doc.setTextColor(17, 17, 17);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(ls, M, y + 5);
      y += 6 + ls.length * 4.6;
    }
    need(10);
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(
      doc.splitTextToSize(
        clean(
          "Sizes are finished glass sizes in millimetres, width first. Please confirm the price and delivery date before making.",
        ),
        CW,
      ),
      M,
      y + 4,
    );
    lhFinish(doc, LH);
    const fn =
      `Glass order ${r.ref} ${clean(siteLabel(r.site) || (c && c.name) || "")}`
        .replace(/[^\w\s-]/g, "")
        .trim() + ".pdf";
    const blob = doc.output("blob");
    if (show)
      try {
        await S.dl.save({ filename: fn, data: blob });
      } catch (e) {
        if (!(e && e.code === "declined")) toast("Download didn't go through");
      }
    return { blob, fn };
  }
  /* ---- send it: share the PDF where the phone can, otherwise save it and open an email with the order written out ---- */
  async function send(r) {
    const out = await pdf(r, false);
    if (!out) return;
    const lines = (r.items || []).map(
      (it, i) =>
        `${i + 1}. ${it.qty} x ${(TYPES[it.type] || TYPES.other).l} – ${it.w} x ${it.h} mm${specOf(it) ? " – " + specOf(it) : ""}${it.notes ? " – " + it.notes : ""}`,
    );
    const body = `Hello${r.supName ? " " + r.supName : ""},\n\nPlease could you quote and supply the glass below (order ${r.ref}).\n\n${lines.join("\n")}\n\n${nPieces(r)} pieces, ${tot(r).toFixed(2)} m² in all.\nDelivery: ${r.deliver}${r.deliver === "Deliver to site" && r.site ? " – " + (siteFull(r.site) || r.site) : ""}\nNeeded by: ${r.needBy ? shortDay(r.needBy) : "as soon as you can"}${r.notes ? "\n\n" + r.notes : ""}\n\nThe order is attached as a PDF.\n\nThanks,\n${bossName()}\n${coData().name || ""}`;
    const subject = `Glass order ${r.ref}${r.site ? " – " + siteLabel(r.site) : ""}`;
    let how = "";
    try {
      const file = new File([out.blob], out.fn, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: subject, text: body });
        how = "shared";
      }
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
    if (!how) {
      try {
        await S.dl.save({ filename: out.fn, data: out.blob });
      } catch (e) {}
      const a = document.createElement("a");
      a.href = `mailto:${encodeURIComponent(r.supEmail || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      how = "email";
    }
    r.status = "sent";
    r.sent = (r.sent || []).concat([{ at: Date.now(), to: r.supEmail || r.supName || "", how }]);
    try {
      await save(r);
      toast("Marked as sent to " + (r.supName || r.supEmail || "the supplier"));
    } catch (e) {}
  }
  /* ---- lists: Job sheets, and a client's job page ---- */
  function rowHtml(r) {
    const c = clientOf(r);
    return `<button type="button" class="glo-row" data-id="${esc(r.id)}"><span>🪟 <b>${esc(r.ref || "Glass order")}</b> ${r.status === "sent" ? '<span class="tag">Sent</span>' : '<span class="tag">Draft</span>'}<br><span class="who">${esc([r.site ? siteLabel(r.site) : "", c ? c.name : "", r.supName, nPieces(r) + " piece" + (nPieces(r) === 1 ? "" : "s") + " · " + tot(r).toFixed(2) + " m²"].filter(Boolean).join(" · "))}</span></span><span class="who">${esc(r.date ? shortDay(r.date) : "")} ›</span></button>`;
  }
  function wireRows(root) {
    root.querySelectorAll(".glo-row").forEach(
      (b) =>
        (b.onclick = () => {
          const r = recs().find((x) => x.id === b.dataset.id);
          if (r) {
            closeViewer();
            edit(r);
          }
        }),
    );
  }
  function jobsHtml() {
    if (!ownerMode()) return "";
    const L = recs();
    if (!L.length) return "";
    return `<div class="day"><div class="dayh"><span>🪟 Glass orders</span><span class="sum">${L.length}</span></div><div class="glo-list" id="glo-jl">${L.slice(0, 30).map(rowHtml).join("")}</div></div>`;
  }
  function wireJobs() {
    if ($("glo-jl")) wireRows($("glo-jl"));
    if ($("glo-new")) $("glo-new").onclick = () => edit(null, {});
  }
  function clientHtml(c) {
    if (!ownerMode() || !c) return "";
    const L = recs().filter((r) => r.clientId === c.id);
    return `<div class="flabel" style="margin-top:12px">🪟 Glass orders${L.length ? " (" + L.length + ")" : ""}</div><div class="glo-list" id="glo-cl-list">${L.map(rowHtml).join("")}</div><div class="actions"><button type="button" class="btn" id="glo-cnew">🪟 Glass order</button></div>`;
  }
  function wireClient(c) {
    if ($("glo-cl-list")) wireRows($("glo-cl-list"));
    if ($("glo-cnew"))
      $("glo-cnew").onclick = () => {
        closeViewer();
        edit(null, { clientId: c.id, site: c.site || "" });
      };
  }
  return { edit, pdf, send, jobsHtml, wireJobs, clientHtml, wireClient, TYPES, specOf };
})();
