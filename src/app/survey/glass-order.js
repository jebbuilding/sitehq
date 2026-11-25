/* ================= GLASS ORDER: sealed units, toughened handrail panels, coloured glass, splashbacks, mirrors… → an order for the glass supplier ================= */
import { ptAskSign } from "../clients/portal.js";
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
import { GLC } from "./glass-colours.js";
import { GLS, GLS_PATTERNS } from "./glass-shapes.js";
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
  /* edge finishes (James, Nov 2026: "arrised and rounded edges"): arrised = the sharp edge sanded off, safe to handle
     but not for show; flat polished = square and shiny; rounded = pencil polished; bevelled = a sloped polished band */
  const EDGES = {
    show: ["Flat polished", "Rounded (pencil polished)", "Arrised (sanded safe)", "Bevelled"],
    hidden: [
      "Arrised (sanded safe)",
      "Flat polished",
      "Rounded (pencil polished)",
      "Bevelled",
      "Not needed",
    ],
  };
  /* the layer that holds laminated glass together */
  const INTER = [
    "Not laminated",
    "Clear PVB",
    "Acoustic PVB",
    "White / opaque PVB",
    "SentryGlas (structural, for balustrades)",
  ];
  const TINT = [
    "Clear",
    "Low-iron (extra clear)",
    "Satin / acid etched",
    "Bronze tint",
    "Grey tint",
    "Blue tint",
    "Green tint",
  ];
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
            "6.8mm acoustic laminated",
            "4mm obscure",
            "4mm obscure toughened",
            "4mm self-cleaning",
            "4mm solar control",
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
            "6.4mm laminated Low-E",
            "6.8mm acoustic laminated",
            "4mm obscure",
            "4mm obscure toughened",
          ],
        ],
        ["pat", "Obscure / special glass", GLS_PATTERNS],
        [
          "spc",
          "Spacer bar",
          ["Black warm edge", "Grey warm edge", "White", "Silver aluminium", "Brown"],
        ],
        ["gas", "Filled with", ["Argon", "Air", "Krypton"]],
        ["geo", ...T("Georgian bars / leads (e.g. 2 across, 1 down, 18mm white)")],
        [
          "mrk",
          "Safety mark (kitemark) on toughened / laminated panes",
          ["Bottom corner", "Top corner", "Not needed"],
        ],
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
            "11.5mm toughened laminated",
            "13.5mm toughened laminated",
            "17.5mm toughened laminated",
            "21.5mm toughened laminated",
          ],
        ],
        ["int", "Interlayer (if laminated)", INTER],
        ["fin", "Finish", TINT],
        ["edg", "Edges", EDGES.show],
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
      ],
    },
    colour: {
      l: "Coloured glass",
      ic: "🎨",
      f: [
        ["col", ...T("Colour (name or RAL number)")],
        [
          "thk",
          "Thickness",
          ["4mm", "6mm", "8mm", "10mm", "6.4mm laminated", "8.8mm laminated", "10.8mm laminated"],
        ],
        ["tgh", "Toughened", ["Yes", "No"]],
        ["int", "Interlayer (if laminated)", INTER],
        ["edg", "Edges", EDGES.show],
      ],
    },
    splash: {
      l: "Splashback",
      ic: "🍳",
      f: [
        ["col", ...T("Colour (name or RAL number)")],
        [
          "thk",
          "Glass",
          ["6mm toughened", "8mm toughened", "4mm toughened", "6.4mm laminated", "8.8mm laminated"],
        ],
        ["fin", "Glass type", ["Low-iron (true colours)", "Standard float"]],
        ["edg", "Edges", EDGES.show],
        ["fix", "Fixing", ["Silicone / adhesive", "Screw holes with caps"]],
      ],
    },
    mirror: {
      l: "Mirror",
      ic: "🪞",
      f: [
        ["thk", "Thickness", ["4mm", "6mm", "6.4mm laminated (safety)"]],
        ["saf", "Safety backing", ["Yes", "No"]],
        ["edg", "Edges", EDGES.show],
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
            "8.8mm laminated",
            "10.8mm laminated",
            "6.8mm acoustic laminated",
            "4mm obscure",
            "6mm Georgian wired",
            "3mm horticultural",
          ],
        ],
        ["pat", "Obscure / special glass", GLS_PATTERNS],
        ["fin", "Finish", TINT],
        ["edg", "Edges", EDGES.hidden],
      ],
    },
    shelf: {
      l: "Shelf, table top or worktop",
      ic: "🗄️",
      f: [
        [
          "thk",
          "Glass",
          [
            "6mm toughened",
            "8mm toughened",
            "10mm toughened",
            "12mm toughened",
            "8.8mm laminated",
            "10.8mm laminated",
            "8.8mm toughened laminated",
          ],
        ],
        ["fin", "Finish", ["Clear", "Low-iron", "Frosted", "Coloured (say in the notes)"]],
        ["edg", "Edges", EDGES.show],
      ],
    },
    other: { l: "Something else", ic: "➕", f: [] },
  };
  /* ticks any piece can have (James, Nov 2026: "look to see what other options I might need") */
  const EXTRAS = [
    [
      "heat",
      "Heat soak tested",
      "toughened glass – cuts the risk of it breaking on its own; for balustrades and overhead",
    ],
    ["lowiron", "Low-iron (extra clear)", ""],
    ["mark", "Safety mark visible", "the kitemark in a corner"],
    ["clean", "Self-cleaning coating", ""],
    ["fire", "Fire-rated glass", ""],
    ["film", "Protective film / careful packing", ""],
  ];
  /* sizes are the glass, or the opening for the supplier to take the fitting gap off */
  const SIZEIS = ["Finished glass size", "Opening size – supplier to take off"];
  /* about 2.5 kg per m² for each mm of glass; a sealed unit is its panes */
  function kgOne(it) {
    const mm = (s) => {
      const m = String(s || "").match(/(\d+(?:\.\d+)?)\s*mm/);
      return m ? +m[1] : 0;
    };
    let t;
    if (it.type === "unit")
      t = (mm(it.out) || 4) + (mm(it.inn) || 4) * (it.glz === "Triple" ? 2 : 1);
    else t = mm(it.thk || it.typ) || 6;
    return GLS.areaOne(it) * t * 2.5;
  }
  const DELIVER = ["Deliver to site", "Deliver to our yard", "We'll collect"];
  const recs = () =>
    (S.glassOrders || []).slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const clientOf = (r) =>
    r && r.clientId ? (S.clients || []).find((c) => c.id === r.clientId) : null;
  /* the real shape's area (survey/glass-shapes.js), times how many */
  const area = (it) => (+it.qty || 0) * GLS.areaOne(it);
  const tot = (r) => (r.items || []).reduce((a, it) => a + area(it), 0);
  const nPieces = (r) => (r.items || []).reduce((a, it) => a + (+it.qty || 0), 0);
  /* what one piece is, in words: "24mm double sealed unit: 4mm toughened / 4mm Low-E (softcoat), black warm edge, argon" */
  /* choices that mean "nothing special" aren't written on the order */
  const QUIET = ["Clear", "Not laminated", "Finished glass size"];
  function specOf(it) {
    const t = TYPES[it.type] || TYPES.other;
    return t.f
      .map(([k, l, o]) => {
        if (!it[k] || QUIET.includes(it[k])) return "";
        if (k === "pat") return "Obscure: " + it[k];
        if (k === "int") return "Interlayer: " + it[k];
        if (k === "mrk")
          return it[k] === "Not needed" ? "No safety mark" : "Safety mark: " + it[k].toLowerCase();
        /* a choice is enough on its own ("12mm toughened"), but a bare Yes / No / Not needed needs its question */
        const yn = /^(Yes|No|Not needed)$/.test(it[k]);
        if (Array.isArray(o) && !yn) return it[k];
        return l.replace(/\s*[(–].*$/, "") + ": " + (yn ? it[k].toLowerCase() : it[k]);
      })
      .filter(Boolean)
      .concat(EXTRAS.filter(([k]) => it["ex_" + k]).map(([, l]) => l))
      .concat(
        it.sz && it.sz !== SIZEIS[0] ? ["Sizes are the opening – please take off for fitting"] : [],
      )
      .concat(GLS.words(it))
      .join(" · ");
  }
  const kgTxt = (it) => {
    const k = kgOne(it);
    return k
      ? `about ${k < 10 ? k.toFixed(1) : Math.round(k)} kg each${k > 50 ? " – a two-person lift" : ""}`
      : "";
  };
  const nextRef = () => {
    const n = recs().reduce(
      (m, r) => Math.max(m, +(String(r.ref || "").match(/(\d+)$/) || [0, 0])[1]),
      0,
    );
    return "GO-" + String(n + 1).padStart(3, "0");
  };
  function blankItem(type) {
    const t = TYPES[type] || TYPES.other;
    const it = {
      type,
      qty: 1,
      w: "",
      h: "",
      room: "",
      sz: SIZEIS[0],
      shape: "rect",
      holes: [],
      cuts: [],
      notes: "",
    };
    t.f.forEach(([k, , o]) => (it[k] = Array.isArray(o) ? o[0] : ""));
    return it;
  }
  /* ---- one piece of glass in the form ---- */
  function itemHtml(it, i) {
    const t = TYPES[it.type] || TYPES.other;
    const sel = (k, l, o) =>
      `<label>${esc(l)}<select class="glo-f" data-k="${k}">${(it[k] && !o.includes(it[k]) ? o.concat([it[k]]) : o).map((x) => `<option${x === it[k] ? " selected" : ""}>${esc(x)}</option>`).join("")}</select></label>`;
    /* the colour box has the RAL chart and the sample photos (survey/glass-colours.js) */
    const txt = (k, l) =>
      k === "col"
        ? GLC.fieldHtml(it, l)
        : `<label>${esc(l)}<input class="glo-f" data-k="${k}" maxlength="200" value="${esc(it[k] || "")}"></label>`;
    const a = area(it);
    return `<div class="card glo-item" data-i="${i}"><div class="glo-ih"><b>${t.ic} ${i + 1}. ${esc(t.l)}</b><button type="button" class="linkdanger glo-x" aria-label="Remove piece ${i + 1}">✕ Remove</button></div>
      <label>Room / position<input class="glo-f" data-k="room" maxlength="80" value="${esc(it.room || "")}" placeholder="e.g. Kitchen – behind the hob"></label>
      <div class="glo-g3"><label>How many<input class="glo-f" data-k="qty" type="number" inputmode="numeric" min="1" max="999" value="${esc(it.qty || 1)}"></label>
      <label>Width (mm)<input class="glo-f" data-k="w" type="number" inputmode="numeric" min="1" max="9999" value="${esc(it.w || "")}" placeholder="e.g. 900"></label>
      <label>Height (mm)<input class="glo-f" data-k="h" type="number" inputmode="numeric" min="1" max="9999" value="${esc(it.h || "")}" placeholder="e.g. 1100"></label></div>
      <div class="glo-g2">${sel("sz", "The sizes are", SIZEIS)}${t.f.map(([k, l, o]) => (Array.isArray(o) ? sel(k, l, o) : txt(k, l))).join("")}</div>
      <div class="glo-ext">${EXTRAS.map(([k, l, h]) => `<label title="${esc(h)}"><input type="checkbox" class="glo-f" data-k="ex_${k}"${it["ex_" + k] ? " checked" : ""}> ${esc(l)}</label>`).join("")}</div>
      ${GLS.formHtml(it)}
      <label>${it.type === "other" ? "What it is – glass, thickness, edges, anything else" : "Notes"}<textarea class="glo-f" data-k="notes" maxlength="600" style="min-height:44px">${esc(it.notes || "")}</textarea></label>
      <div class="who glo-area">${a ? a.toFixed(2) + " m² · " + kgTxt(it) : "Put the sizes in to work out the area"}</div></div>`;
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
        el.querySelectorAll(".glo-f").forEach(
          (f) =>
            (it[f.dataset.k] = f.type === "checkbox" ? (f.checked ? "yes" : "") : f.value.trim()),
        );
        GLS.readEl(el, it);
      });
      r.clientId = $("glo-cl").value;
      r.site = pickVal("glo-site");
      r.supId = $("glo-sup").value;
      r.supName = $("glo-supn").value.trim();
      r.supEmail = $("glo-supe").value.trim();
      r.supSave = !!($("glo-supsave") && $("glo-supsave").checked);
      r.needBy = $("glo-need").value;
      r.deliver = $("glo-del").value;
      r.notes = $("glo-notes").value.trim();
    };
    const draw = () => {
      openSheet(
        `<h3 id="sheettitle">🪟 Glass survey ${esc(r.ref)}</h3>
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
        <label class="inl glo-supsave"${r.supId ? " hidden" : ""}><input type="checkbox" id="glo-supsave"${r.supSave ? " checked" : ""}> Save this supplier to my supplier list</label>
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
        <div class="actions"><button type="button" class="btn" id="glo-pdf">📄 PDF</button><button type="button" class="btn" id="glo-send">📧 Send to supplier</button><button type="button" class="btn" id="glo-sign">✍ Client sign-off</button></div>
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
            await keepSupplier(r);
            await save(r);
            closeForm();
            toast("Glass survey " + r.ref + " saved");
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
          const sv = document.querySelector(".glo-supsave");
          if (sv) sv.hidden = !!s;
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
      /* a piece's drawing, warnings and area follow the typing; a new shape, hole or cut-out redraws the form there */
      const live = (el) => {
        const it = Object.assign({}, r.items[+el.dataset.i]);
        el.querySelectorAll(".glo-f").forEach(
          (f) =>
            (it[f.dataset.k] = f.type === "checkbox" ? (f.checked ? "yes" : "") : f.value.trim()),
        );
        GLS.readEl(el, it);
        GLS.refresh(el, it);
        const a = area(it);
        el.querySelector(".glo-area").textContent = a
          ? a.toFixed(2) + " m² · " + kgTxt(it)
          : "Put the sizes in to work out the area";
      };
      const again = (i, fn) => {
        read();
        fn(r.items[i]);
        draw();
        const el = document.querySelector(`.glo-item[data-i="${i}"]`);
        if (el) el.scrollIntoView({ block: "start" });
      };
      document.querySelectorAll(".glo-item").forEach((el) => {
        const i = +el.dataset.i;
        el.querySelectorAll("input, select, textarea").forEach((f) => (f.oninput = () => live(el)));
        const sh = el.querySelector(".glo-shsel");
        if (sh) sh.onchange = () => again(i, () => {});
        /* which corner, and centre or edge: the labels and the drawing change */
        el.querySelectorAll(".glo-redraw").forEach((x) => (x.onchange = () => again(i, () => {})));
        /* 🎨 Choose colour, and a typed colour updating its little square */
        const setCol = (v) => {
          el.querySelector("[data-k=col]").value = v.col;
          el.querySelector("[data-k=colHex]").value = v.colHex || "";
          el.querySelector("[data-k=colPhoto]").value = v.colPhoto || "";
          el.querySelector(".glc-chipw").innerHTML = GLC.chipHtml(v);
          live(el);
        };
        const co = el.querySelector(".glc-open");
        if (co) co.onclick = () => GLC.pick(setCol);
        const ct = el.querySelector("[data-k=col]");
        if (ct)
          ct.oninput = () => {
            el.querySelector("[data-k=colHex]").value = "";
            el.querySelector("[data-k=colPhoto]").value = "";
            el.querySelector(".glc-chipw").innerHTML = GLC.chipHtml({ col: ct.value });
            live(el);
          };
        el.querySelector(".glo-hadd").onclick = () =>
          again(i, (it) => (it.holes = (it.holes || []).concat([GLS.newHole()])));
        el.querySelector(".glo-cadd").onclick = () =>
          again(i, (it) => (it.cuts = (it.cuts || []).concat([GLS.newCut()])));
        el.querySelectorAll(".glo-hx").forEach(
          (b) =>
            (b.onclick = () =>
              again(i, (it) => it.holes.splice(+b.closest(".glo-hrow").dataset.j, 1))),
        );
        el.querySelectorAll(".glo-cx").forEach(
          (b) =>
            (b.onclick = () =>
              again(i, (it) => it.cuts.splice(+b.closest(".glo-crow").dataset.j, 1))),
        );
        /* a socket or switch fills its usual size */
        el.querySelectorAll(".glo-cv[data-v=k]").forEach(
          (s) =>
            (s.onchange = () => {
              const z = GLS.cutSize(s.value);
              const row = s.closest(".glo-crow");
              if (z.w !== "") {
                row.querySelector("[data-v=w]").value = z.w;
                row.querySelector("[data-v=h]").value = z.h;
              }
              live(el);
            }),
        );
      });
      $("glo-pdf").onclick = async () => {
        read();
        if (!r.items.length) return toast("Add a piece of glass first");
        await pdf(r, true);
      };
      $("glo-sign").onclick = async () => {
        read();
        if (!r.items.length) return toast("Add a piece of glass first");
        const c = clientOf(r);
        if (!c) return toast("Choose the client at the top first");
        try {
          await keepSupplier(r);
          await save(r);
        } catch (e) {}
        const out = await pdf(r, false);
        if (!out) return;
        closeForm();
        S.preAttach = [new File([out.blob], out.fn, { type: "application/pdf" })];
        ptAskSign(c, null, "design", () => render(), r.site || c.site);
        setTimeout(() => {
          const set = (id, v) => {
            const el = $(id);
            if (el && !el.value) el.value = v;
          };
          set("pa-title", "Glass " + r.ref + (r.site ? " – " + siteLabel(r.site) : ""));
          set(
            "pa-det",
            (r.items || [])
              .map(
                (it, i) =>
                  `${i + 1}. ${it.room ? it.room + ": " : ""}${it.qty} x ${(TYPES[it.type] || TYPES.other).l}, ${it.w} x ${it.h} mm`,
              )
              .join("\n"),
          );
          set(
            "pa-stmt",
            "The glass sizes, shapes, holes, cut-outs and colours on this order are right, and the glass can be ordered.",
          );
        }, 80);
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
          toast("Glass survey deleted · in Setup › Deleted items for " + BIN_DAYS + " days");
          render();
        });
    };
    draw();
  }
  /* a supplier typed in, kept in the supplier list when "Save this supplier" is ticked */
  async function keepSupplier(r) {
    const ok = r.supSave;
    delete r.supSave;
    if (!ok || r.supId || !r.supName) return;
    const dup = (S.suppliers || []).find(
      (x) => String(x.name || "").toLowerCase() === r.supName.toLowerCase(),
    );
    if (dup) {
      r.supId = dup.id;
      return;
    }
    const id = newId();
    const d = {
      kind: "supplier",
      name: r.supName,
      email: r.supEmail || "",
      cat: "Glass",
      created: Date.now(),
      updated: Date.now(),
    };
    await S.db.doc("todos/" + id).set(d);
    S.suppliers = (S.suppliers || []).concat([Object.assign({ id }, d)]);
    r.supId = id;
    toast(r.supName + " added to your suppliers");
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
    doc.text("Glass survey", M, y + 4);
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
    /* each piece's colour as a square, or the photo of the real glass */
    const COL = {};
    for (let i = 0; i < (r.items || []).length; i++)
      if ((r.items[i] || {}).col) COL[i] = await GLC.forPdf(r.items[i]);
    (r.items || []).forEach((it, i) => {
      const t = TYPES[it.type] || TYPES.other;
      /* measured in the font each is written in, so long lines wrap inside the page */
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const what = doc.splitTextToSize(clean(t.l + (it.room ? " – " + it.room : "")), W - M - X.d);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const spec = doc.splitTextToSize(
        clean([specOf(it), it.notes].filter(Boolean).join(" · ")),
        W - M - X.d,
      );
      /* a drawing to scale under the words when it has a shape, holes or cut-outs */
      const DH = GLS.hasDrawing(it) ? GLS.pdfHeight(it, Math.min(110, W - M - X.d), 46) + 2 : 0;
      const h = Math.max(5 * what.length + 4.3 * spec.length + 4 + DH, COL[i] ? 30 : 0);
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
      if (kgOne(it))
        doc.text(clean(kgTxt(it).replace(" – a two-person lift", " (2 people)")), X.s, y + 11.5);
      if (COL[i] && COL[i].img)
        try {
          doc.addImage(COL[i].img, "JPEG", X.s, y + 14, 18, 13);
        } catch (e) {}
      else if (COL[i] && COL[i].hex) {
        const hx = COL[i].hex.replace("#", "");
        doc.setFillColor(
          parseInt(hx.slice(0, 2), 16),
          parseInt(hx.slice(2, 4), 16),
          parseInt(hx.slice(4, 6), 16),
        );
        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.2);
        doc.rect(X.s, y + 14, 18, 11, "FD");
      }
      if (DH)
        GLS.pdfDraw(
          doc,
          it,
          X.d,
          y + 2 + 5 * what.length + 4.3 * spec.length,
          Math.min(110, W - M - X.d),
          DH - 2,
          RED,
        );
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
      clean(
        `${nPieces(r)} piece${nPieces(r) === 1 ? "" : "s"} · ${tot(r).toFixed(2)} m2 in all · about ${Math.round((r.items || []).reduce((a, it) => a + kgOne(it) * (+it.qty || 0), 0))} kg`,
      ),
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
    y += 12;
    /* signed on paper too: the client agreeing the glass, and who ordered it */
    need(30);
    [
      ["Approved by (client)", c ? c.name : ""],
      ["Ordered by", co.name || ""],
    ].forEach(([l, who]) => {
      doc.setTextColor(17, 17, 17);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(clean(l), M, y);
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.line(M + 40, y, M + 120, y);
      doc.line(M + 128, y, W - M, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(110, 110, 110);
      doc.text(clean("Signature" + (who ? " – " + who : "")), M + 40, y + 3.5);
      doc.text("Date", M + 128, y + 3.5);
      y += 13;
    });
    lhFinish(doc, LH);
    const fn =
      `Glass survey ${r.ref} ${clean(siteLabel(r.site) || (c && c.name) || "")}`
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
    try {
      await keepSupplier(r);
    } catch (e) {}
    const out = await pdf(r, false);
    if (!out) return;
    const lines = (r.items || []).map(
      (it, i) =>
        `${i + 1}. ${it.room ? it.room + ": " : ""}${it.qty} x ${(TYPES[it.type] || TYPES.other).l} – ${it.w} x ${it.h} mm${specOf(it) ? " – " + specOf(it) : ""}${it.notes ? " – " + it.notes : ""}`,
    );
    const body = `Hello${r.supName ? " " + r.supName : ""},\n\nPlease could you quote and supply the glass below (order ${r.ref}).\n\n${lines.join("\n")}\n\n${nPieces(r)} pieces, ${tot(r).toFixed(2)} m² in all.\nDelivery: ${r.deliver}${r.deliver === "Deliver to site" && r.site ? " – " + (siteFull(r.site) || r.site) : ""}\nNeeded by: ${r.needBy ? shortDay(r.needBy) : "as soon as you can"}${r.notes ? "\n\n" + r.notes : ""}\n\nThe order is attached as a PDF.\n\nThanks,\n${bossName()}\n${coData().name || ""}`;
    const subject = `Glass survey ${r.ref}${r.site ? " – " + siteLabel(r.site) : ""}`;
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
    return `<button type="button" class="glo-row" data-id="${esc(r.id)}"><span>🪟 <b>${esc(r.ref || "Glass survey")}</b> ${r.status === "sent" ? '<span class="tag">Sent</span>' : '<span class="tag">Draft</span>'}<br><span class="who">${esc([r.site ? siteLabel(r.site) : "", c ? c.name : "", r.supName, nPieces(r) + " piece" + (nPieces(r) === 1 ? "" : "s") + " · " + tot(r).toFixed(2) + " m²"].filter(Boolean).join(" · "))}</span></span><span class="who">${esc(r.date ? shortDay(r.date) : "")} ›</span></button>`;
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
    return `<div class="day"><div class="dayh"><span>🪟 Glass surveys</span><span class="sum">${L.length}</span></div><div class="glo-list" id="glo-jl">${L.slice(0, 30).map(rowHtml).join("")}</div></div>`;
  }
  function wireJobs() {
    if ($("glo-jl")) wireRows($("glo-jl"));
    if ($("glo-new")) $("glo-new").onclick = () => edit(null, {});
  }
  function clientHtml(c) {
    if (!ownerMode() || !c) return "";
    const L = recs().filter((r) => r.clientId === c.id);
    return `<div class="flabel" style="margin-top:12px">🪟 Glass surveys${L.length ? " (" + L.length + ")" : ""}</div><div class="glo-list" id="glo-cl-list">${L.map(rowHtml).join("")}</div><div class="actions"><button type="button" class="btn" id="glo-cnew">🪟 Glass order</button></div>`;
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
