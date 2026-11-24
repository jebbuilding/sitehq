/* ================= HANDOVER PACK: everything the client should have at the end of the job, in one PDF and their portal ================= */
import { ptOf, ptOnFor, ptSrc } from "./portal.js";
import { clAddPlan, clAddr } from "./stages-planner.js";
import { $, esc, iso, parse, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { uploadAnyFile, uploadErr } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { coData } from "../owner/company-details.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { ukDate } from "../safety/rams-maker.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { shrinkImage } from "../safety/training.js";
import { lhFinish, lhFrame } from "../sales/letterhead-setup.js";
import { same } from "../sites/project-pages.js";
export { HOV };
/* James (Nov 2026, "handover pack for the client"): on a client's page, 📦 Handover pack lists what a finished job
   usually needs – building control completion certificate, electrical certificate, gas / boiler, FENSA for windows,
   guarantees, manuals, the paint and finish colours used, drainage survey, party wall award, anything else – each
   marked ✓ Got it (with its file: a photo or PDF, or one already in their documents) or Not needed, and our own
   workmanship guarantee (how many years, the wording). 📄 Make the pack makes one PDF on the letterhead – a cover,
   what's in it and what's still to come, and the guarantee – and 📤 Put it in their portal puts the PDF and every file
   in their portal's "Certificates & warranties". Saving it puts the aftercare check-ins on the planner (below).
   Owner-only: todos/ho-{client id} (kind "handover"). */
const HOV = (() => {
  const ITEMS = [
    ["bc", "🏛 Building control completion certificate"],
    ["eic", "⚡ Electrical installation certificate (EIC)"],
    ["gas", "🔥 Gas Safe / boiler commissioning certificate"],
    ["fensa", "🪟 FENSA / CERTASS window certificate"],
    ["wg", "🛡 Window and door guarantees"],
    ["roof", "🏠 Roof guarantee"],
    ["manuals", "📘 Product manuals (boiler, appliances, fittings)"],
    ["colours", "🎨 Paint and finish colours used"],
    ["drain", "🚰 Drainage survey / CCTV"],
    ["pw", "🤝 Party wall award"],
    ["other", "📄 Other documents"],
  ];
  const recOf = (c) => (S.handovers || []).find((x) => x.clientId === c.id) || null;
  const blank = (c) => ({
    clientId: c.id,
    site: c.site || "",
    items: {},
    years: 10,
    gtext: "",
    done: "",
  });
  const GTXT = (years) =>
    `We guarantee the workmanship on this job for ${years} year${years === 1 ? "" : "s"} from the date it was finished. If anything we built or fitted fails because of how we did it, tell us and we'll put it right at no cost. This doesn't cover fair wear and tear, misuse, or work changed by others, and the products we fitted carry their makers' own guarantees, included in this pack where we have them.`;
  /* aftercare (James, Nov 2026, "aftercare reminders"): from the day the job finished, the 6-month check-in, the
     12-month check-in (a good time to ask for a review) and the day our guarantee ends go on James's own planner,
     with the client's name and address; moved if the finish date or the guarantee years change */
  const addMonths = (d, n) => {
    const x = parse(d);
    x.setMonth(x.getMonth() + n);
    return iso(x);
  };
  async function aftercare(c, r) {
    if (!r.done) return;
    const want = [
      [
        "m6",
        addMonths(r.done, 6),
        "🔧 6-month check-in: " + c.name,
        "Ring or call in: is everything working as it should? Anything to put right under the guarantee?",
      ],
      [
        "m12",
        addMonths(r.done, 12),
        "🔧 12-month check-in: " + c.name,
        "A year on: check it over, and ask for a review if they're happy.",
      ],
      [
        "gend",
        addMonths(r.done, 12 * (+r.years || 10)),
        "🛡 Guarantee ends: " + c.name,
        "Our " + (+r.years || 10) + "-year workmanship guarantee ends today.",
      ],
    ];
    const ac = Object.assign({}, r.after || {});
    for (const [k, date, title, note] of want) {
      const notes = [clAddr(c), c.phone, note].filter(Boolean).join("\n");
      if (ac[k] && ac[k].id) {
        if (ac[k].date === date) continue;
        try {
          await S.db
            .doc("planprivate/" + ac[k].id)
            .update({ from: date, to: date, title, notes, updated: Date.now() });
          ac[k] = { id: ac[k].id, date };
          continue;
        } catch (e) {}
      }
      try {
        const id = await clAddPlan(c, { title, type: "meeting", from: date, notes });
        ac[k] = { id, date };
      } catch (e) {}
    }
    r.after = ac;
  }
  async function save(c, r) {
    const id = r.id || "ho-" + c.id;
    try {
      await aftercare(c, r);
    } catch (e) {}
    const d = Object.assign({}, r, { kind: "handover", updated: Date.now() });
    delete d.id;
    await S.db.doc("todos/" + id).set(d);
    S.handovers = (S.handovers || []).filter((x) => x.id !== id).concat([Object.assign({ id }, d)]);
    return Object.assign({ id }, d);
  }
  /* documents already about for this client: their portal / client documents and the site's */
  function existing(c) {
    const out = [];
    (c.docs || []).forEach(
      (d) =>
        d.assetId &&
        out.push({ assetId: d.assetId, name: d.name || "Document", type: d.type || "" }),
    );
    (S.docs || [])
      .filter((d) => c.site && same(d.site, c.site) && d.assetId)
      .forEach((d) =>
        out.push({
          assetId: d.assetId,
          name: d.title || d.fileName || "Document",
          type: d.contentType || "",
        }),
      );
    try {
      ptSrc(c)
        .docs()
        .filter((d) => d.assetId)
        .forEach((d) =>
          out.push({
            assetId: d.assetId,
            name: d.title || d.fileName || "Document",
            type: d.contentType || "",
          }),
        );
    } catch (e) {}
    const seen = new Set();
    return out.filter((x) => !seen.has(x.assetId) && seen.add(x.assetId));
  }
  function open(c0) {
    const c = (S.clients || []).find((x) => x.id === c0.id) || c0;
    const r = JSON.parse(JSON.stringify(recOf(c) || blank(c)));
    const have = existing(c);
    const draw = () => {
      const st = (k) => (r.items[k] || {}).st || "";
      const got = ITEMS.filter(([k]) => st(k) === "have").length,
        na = ITEMS.filter(([k]) => st(k) === "na").length;
      openSheet(
        `<h3 id="sheettitle">📦 Handover pack – ${esc(c.name || "")}</h3>
        <div class="who">What they should have at the end of the job. Mark each as you get it (add the file) or not needed. ${got} got · ${na} not needed · ${ITEMS.length - got - na} still to come.</div>
        <div class="hov-list">${ITEMS.map(([k, l]) => {
          const it = r.items[k] || {};
          return `<div class="card hov-it" data-k="${k}"><div class="hov-h"><b>${esc(l)}</b><span class="seg hov-st"><button type="button" data-v="have" aria-pressed="${it.st === "have"}">✓ Got it</button><button type="button" data-v="na" aria-pressed="${it.st === "na"}">Not needed</button></span></div>
            ${(it.files || []).map((f, i) => `<div class="hov-f"><button type="button" class="linkbtn hov-o" data-i="${i}">📄 ${esc(f.name)}</button><button type="button" class="linkdanger hov-x" data-i="${i}" aria-label="Take ${esc(f.name)} out">✕</button></div>`).join("")}
            ${k === "colours" ? `<textarea class="hov-note" maxlength="1500" placeholder="e.g. Walls: Dulux Timeless matt. Woodwork: Dulux white satinwood. Front door: RAL 7016 anthracite.">${esc(it.note || "")}</textarea>` : ""}
            <div class="hov-add"><label class="btn hov-up">📎 Add the file<input type="file" class="hov-in" accept="image/*,application/pdf"></label>${have.length ? `<select class="hov-pick" aria-label="Or one they already have"><option value="">…or one already in their documents</option>${have.map((h, i) => `<option value="${i}">${esc(h.name)}</option>`).join("")}</select>` : ""}</div></div>`;
        }).join("")}</div>
        <div class="flabel">🛡 Our guarantee</div>
        <label for="hov-y">Workmanship guaranteed for<select id="hov-y">${[1, 2, 5, 10].map((y) => `<option value="${y}"${+r.years === y ? " selected" : ""}>${y} year${y === 1 ? "" : "s"}</option>`).join("")}</select></label>
        <label for="hov-g">The wording<textarea id="hov-g" maxlength="2000" style="min-height:90px">${esc(r.gtext || GTXT(+r.years || 10))}</textarea></label>
        <label for="hov-done">Job finished on<input id="hov-done" type="date" value="${esc(r.done || iso(new Date()))}"></label>
        <div class="actions"><button type="button" class="btn" id="hov-pdf">📄 Make the pack</button><button type="button" class="btn primary" id="hov-send">📤 Put it in their portal</button></div>
        ${r.sentAt ? `<div class="who">Put in their portal ${esc(stamp(r.sentAt))}.</div>` : ""}
        ${formFoot(false, "Save")}`,
        async () => {
          read();
          try {
            Object.assign(r, await save(c, r));
            closeForm();
            toast("Handover pack saved");
          } catch (e) {
            showErr("Couldn't save. Check your connection.");
          }
        },
      );
      wire();
    };
    const item = (k) => (r.items[k] = r.items[k] || { st: "", files: [] });
    const read = () => {
      document
        .querySelectorAll(".hov-note")
        .forEach((t) => (item(t.closest(".hov-it").dataset.k).note = t.value.trim()));
      r.years = +$("hov-y").value || 10;
      r.gtext = $("hov-g").value.trim();
      r.done = $("hov-done").value;
    };
    const wire = () => {
      document.querySelectorAll(".hov-st button").forEach(
        (b) =>
          (b.onclick = () => {
            read();
            const it = item(b.closest(".hov-it").dataset.k);
            it.st = it.st === b.dataset.v ? "" : b.dataset.v;
            draw();
          }),
      );
      document.querySelectorAll(".hov-in").forEach(
        (inp) =>
          (inp.onchange = async () => {
            const f = inp.files && inp.files[0];
            inp.value = "";
            if (!f) return;
            read();
            const k = inp.closest(".hov-it").dataset.k;
            toast("Adding the file…");
            try {
              const img = /^image\//.test(f.type);
              const a = await uploadAnyFile(img ? await shrinkImage(f, 2200) : f, f.name);
              const it = item(k);
              it.files = (it.files || []).concat([
                {
                  assetId: a.id,
                  name: f.name,
                  type: img ? "image/jpeg" : f.type || "application/pdf",
                },
              ]);
              it.st = "have";
              draw();
            } catch (e) {
              toast(uploadErr(e));
            }
          }),
      );
      document.querySelectorAll(".hov-pick").forEach(
        (s) =>
          (s.onchange = () => {
            if (s.value === "") return;
            read();
            const h = have[+s.value];
            const it = item(s.closest(".hov-it").dataset.k);
            if (!(it.files || []).some((x) => x.assetId === h.assetId))
              it.files = (it.files || []).concat([h]);
            it.st = "have";
            draw();
          }),
      );
      document.querySelectorAll(".hov-o").forEach(
        (b) =>
          (b.onclick = () => {
            const f = item(b.closest(".hov-it").dataset.k).files[+b.dataset.i];
            if (f) openFile(f.assetId, f.name, f.type);
          }),
      );
      document.querySelectorAll(".hov-x").forEach(
        (b) =>
          (b.onclick = () => {
            read();
            item(b.closest(".hov-it").dataset.k).files.splice(+b.dataset.i, 1);
            draw();
          }),
      );
      $("hov-y").onchange = () => {
        const g = $("hov-g").value.trim();
        if (!g || g === GTXT(+r.years || 10)) {
          r.years = +$("hov-y").value;
          $("hov-g").value = GTXT(r.years);
        }
      };
      $("hov-pdf").onclick = async () => {
        read();
        const out = await pdf(c, r);
        if (out)
          try {
            await S.dl.save({ filename: out.fn, data: out.blob });
          } catch (e) {}
      };
      $("hov-send").onclick = async () => {
        read();
        await send(c, r);
        draw();
      };
    };
    draw();
  }
  /* the pack as one PDF: the cover, what's in it, what's to come, and the guarantee */
  async function pdf(c, r) {
    try {
      await loadJsPdf();
    } catch (e) {
      toast("Couldn't load the PDF maker. Check your connection.");
      return null;
    }
    const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    const LH = await lhFrame();
    const W = 210,
      M = 18,
      CW = W - 2 * M;
    const RED = BRGB();
    const co = coData();
    const clean = (t) =>
      String(t == null ? "" : t)
        .replace(/[–—]/g, "-")
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/[^\x09\x0A\x0D\x20-\x7E£·•°]/g, "")
        .trim();
    let y = LH.top || 22;
    const bot = LH.pics ? LH.bot : 280;
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
        y = LH.top || 22;
      }
    };
    const para = (t, size, bold, col) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size || 10.5);
      doc.setTextColor(...(col || [17, 17, 17]));
      const ls = doc.splitTextToSize(clean(t), CW);
      ls.forEach((l) => {
        need(6);
        doc.text(l, M, y);
        y += (size || 10.5) * 0.48;
      });
    };
    para("Handover pack", 22, true, RED);
    y += 3;
    para([c.name, clAddr(c)].filter(Boolean).join(" · "), 12, true);
    para(
      "Finished " + (r.done ? ukDate(r.done) : "") + " · from " + (co.name || ""),
      10,
      false,
      [90, 90, 90],
    );
    y += 5;
    para("What's in this pack", 13, true);
    y += 1;
    ITEMS.forEach(([k, l]) => {
      const it = r.items[k] || {};
      if (it.st === "na") return;
      const what = l.replace(/^\S+\s/, "");
      const files = (it.files || []).map((f) => f.name).join(", ");
      para(
        (it.st === "have" ? "[x] " : "[ ] ") +
          what +
          (it.st === "have" ? (files ? " – " + files : "") : " – still to come"),
        10.5,
      );
      if (k === "colours" && it.note) para(it.note, 9.5, false, [70, 70, 70]);
      y += 1;
    });
    y += 4;
    para("Our guarantee", 13, true);
    y += 1;
    para(r.gtext || GTXT(+r.years || 10), 10.5);
    y += 4;
    para(
      "Keep this pack safe – you may need it if you sell the house. The certificates and guarantees are also in your portal under Certificates & warranties.",
      9.5,
      false,
      [90, 90, 90],
    );
    lhFinish(doc, LH);
    const fn = `Handover pack ${clean(c.name || "")}`.replace(/[^\w\s-]/g, "").trim() + ".pdf";
    return { blob: doc.output("blob"), fn };
  }
  /* 📤 the PDF and every file into their portal, under Certificates & warranties */
  async function send(c, r) {
    if (!ptOnFor(c) && !ptOf(c)) {
      toast("Turn their portal on first (on their page), then put the pack in it");
      return;
    }
    const out = await pdf(c, r);
    if (!out) return;
    try {
      toast("Putting it in their portal…");
      const src = ptSrc(c);
      const a = await uploadAnyFile(
        new File([out.blob], out.fn, { type: "application/pdf" }),
        out.fn,
      );
      const now = Date.now();
      await src.addDoc("ho-pack-" + c.id, {
        title: "Handover pack",
        fileName: out.fn,
        assetId: a.id,
        contentType: "application/pdf",
        folder: "certs",
        note: "Everything for your finished job",
        sharedAt: now,
      });
      for (const [k, l] of ITEMS) {
        const it = r.items[k] || {};
        if (it.st !== "have") continue;
        for (const f of it.files || [])
          await src.addDoc("ho-" + f.assetId, {
            title: l.replace(/^\S+\s/, "") + (it.files.length > 1 ? " – " + f.name : ""),
            fileName: f.name,
            assetId: f.assetId,
            contentType: f.type || "application/pdf",
            folder: "certs",
            sharedAt: now,
          });
      }
      try {
        await src.bump();
      } catch (e) {}
      r.sentAt = now;
      Object.assign(r, await save(c, r));
      toast("Handover pack is in " + (c.name || "their") + "'s portal");
    } catch (e) {
      toast(uploadErr(e));
    }
  }
  const statusTxt = (c) => {
    const r = recOf(c);
    if (!r) return "";
    const got = ITEMS.filter(([k]) => (r.items[k] || {}).st === "have").length;
    return r.sentAt ? "in their portal" : got + " of " + ITEMS.length + " ready";
  };
  return { open, pdf, send, statusTxt, ITEMS };
})();
