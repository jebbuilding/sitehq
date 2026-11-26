/* ================= TOOLS REGISTER: every power tool and hand tool with its photos, receipt, serial number and value – who has it, which van – and a PDF for the insurance ================= */
import { bossFirst } from "../core/company-names.js";
import { $, esc, gbp, iso, parse, stamp, toast } from "../core/helpers.js";
import { S, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { openViewer } from "../core/viewer.js";
import { blobUrl, csvSave, uploadAnyFile, uploadErr, uploadFile } from "../files/files.js";
import { getFileBlob, loadPdfJs, openFile } from "../files/in-app-files.js";
import { newId, saveOrKeep, sentToast } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { BIN_DAYS } from "../owner/deleted-items.js";
import { crewIds, nameOf, teamIds } from "../owner/owner.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { shrinkImage } from "../safety/training.js";
import { lhFinish, lhFrame } from "../sales/letterhead-setup.js";
export { TLR, initToolSync };
/* James (Nov 2026): "a database of power tools and hand tools that has the receipt and photos and serial numbers to
   know what tools I have and for insurance purposes … print or PDF the tools that I need the information for. Group
   the tools by who has them to use and what van … link to the trade who has them and the van." 🗃 Tools register
   (Setup, 🚐 Vehicles & plant and 🧰 Tools & plant): every tool with its photos, receipts (photos or PDFs), make,
   model, serial number, security mark, what comes with it, when and where it was bought, what was paid, what it would
   cost to replace, the warranty, PAT test date for mains tools, condition, and if it's been lost, stolen, sold or
   scrapped (with the crime reference). Who has it (any of the team, James too), which van it lives on and the site.
   Group by 👷 who has it, 🚐 van, 🗂 type or 📍 site; tick the ones wanted (or a whole group) and 📄 PDF – a list
   with a photo of each, the serial numbers and values and the total, with the receipts after it if wanted – to save,
   print or send to the insurer; ⬇ CSV for a spreadsheet. The machines, ladders, diggers and trailers in 🧰 Tools &
   plant are in the register too (who has them comes from booking them out there); adding a receipt or value to one
   keeps it with them. Ties: a person's tools are listed when they're marked as left (to get back), a van's tools show
   in 📦 What's on each van, and Today warns of a PAT test due or a warranty running out. Owner-only: todos/{id} (kind
   "tool": name, cat, make, model, serial, mark, kit, bought, from, paid, value, warranty, pat, cond, status,
   crimeRef, goneOn, who, van, site, notes, photos [{assetId}], receipts [{assetId, name, type}], eq (the Tools &
   plant item it belongs to), log [{at, who, van, site}]). */
const TLR = (() => {
  const CATS = [
    ["battery", "🔋 Power tool – battery"],
    ["mains", "🔌 Power tool – 240V"],
    ["v110", "🟨 Power tool – 110V"],
    ["hand", "🔨 Hand tool"],
    ["measure", "📏 Measuring & lasers"],
    ["access", "🪜 Ladders, towers & access"],
    ["plant", "⚙️ Machines & plant"],
    ["safety", "🦺 Safety kit"],
    ["other", "📦 Other"],
  ];
  const EQ_CAT = { machine: "plant", ladder: "access", digger: "plant", trailer: "plant" };
  const STATUS = [
    ["", "In use"],
    ["repair", "In for repair"],
    ["lost", "Lost"],
    ["stolen", "Stolen"],
    ["sold", "Sold"],
    ["scrap", "Scrapped"],
  ];
  const GONE = ["sold", "scrap"];
  const catName = (k) => (CATS.find((c) => c[0] === k) || CATS[CATS.length - 1])[1];
  const stName = (k) => (STATUS.find((s) => s[0] === (k || "")) || STATUS[0])[1];
  const num = (v) => {
    const n = parseFloat(String(v == null ? "" : v).replace(/[£,\s]/g, ""));
    return isFinite(n) ? n : 0;
  };
  const worth = (t) => num(t.value) || num(t.paid);
  const ukD = (d) => {
    const [y, m, dd] = String(d || "").split("-");
    return dd && m && y ? `${dd}/${m}/${y}` : "";
  };
  const dTo = (d) => Math.round((parse(d) - parse(iso(new Date()))) / 864e5);
  const recs = () => S.toolRegs || [];
  const eqOf = (id) => (S.equipment || []).find((e) => e.id === id) || null;
  /* every tool: the register's own, plus each Tools & plant item that has no register record yet */
  function all() {
    const R = recs().map((r) => {
      const e = r.eq ? eqOf(r.eq) : null;
      return Object.assign({}, r, e ? holderOfEq(e) : {}, e ? { tag: e.tag, eqName: e.name } : {});
    });
    const linked = new Set(R.map((r) => r.eq).filter(Boolean));
    (S.equipment || [])
      .filter((e) => EQ_CAT[e.kind] && !linked.has(e.id))
      .forEach((e) =>
        R.push(
          Object.assign(
            {
              id: "",
              virt: true,
              eq: e.id,
              name: e.name || "",
              cat: EQ_CAT[e.kind],
              make: (e.info || {}).make || "",
              serial: (e.info || {}).serial || "",
              tag: e.tag,
            },
            holderOfEq(e),
          ),
        ),
      );
    return R.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }
  const holderOfEq = (e) => ({
    who: (e.out && e.out.who) || e.assignee || "",
    van: (e.out && e.out.van) || "",
    site: (e.out && e.out.site) || "",
  });
  const vans = () =>
    (S.equipment || [])
      .filter((e) => e.kind === "vehicle")
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const vanName = (v) => ((S.equipment || []).find((x) => x.id === v) || {}).name || "A van";
  const whereTxt = (t) =>
    [
      t.who ? "👷 " + nameOf(t.who) : "",
      t.van ? "🚐 " + vanName(t.van) : "",
      t.site ? "📍 " + t.site : "",
    ]
      .filter(Boolean)
      .join(" · ") || "🏠 In the yard / store";
  const GROUPS = [
    ["who", "👷 Who has it"],
    ["van", "🚐 Van"],
    ["cat", "🗂 Type"],
    ["site", "📍 Site"],
  ];
  const groupOf = (t, g) =>
    g === "who"
      ? t.who
        ? nameOf(t.who)
        : "Nobody – in the yard or on a van"
      : g === "van"
        ? t.van
          ? "🚐 " + vanName(t.van)
          : "Not on a van"
        : g === "site"
          ? t.site || "Not on a site"
          : catName(t.cat);
  const heldBy = (id) => all().filter((t) => t.who === id && !GONE.includes(t.status));
  const onVan = (v) => all().filter((t) => t.van === v && !GONE.includes(t.status));
  /* the list */
  let st = { g: "who", q: "", gone: false, sel: new Set() };
  function open(opt) {
    if (opt && opt.g) st.g = opt.g;
    draw();
    sync();
  }
  function shown() {
    const f = st.q.trim().toLowerCase();
    return all().filter(
      (t) =>
        (st.gone || !GONE.includes(t.status)) &&
        (!f ||
          [
            t.name,
            t.make,
            t.model,
            t.serial,
            t.mark,
            t.tag,
            t.from,
            t.who ? nameOf(t.who) : "",
            t.van ? vanName(t.van) : "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(f)),
    );
  }
  const key = (t) => t.id || "eq:" + t.eq;
  function draw() {
    const L = shown();
    const A = all().filter((t) => !GONE.includes(t.status));
    const groups = {};
    L.forEach((t) => (groups[groupOf(t, st.g)] = groups[groupOf(t, st.g)] || []).push(t));
    const order = Object.keys(groups).sort((a, b) => {
      const last = (k) => /^Nobody|^Not on/.test(k);
      return last(a) !== last(b) ? (last(a) ? 1 : -1) : a.localeCompare(b);
    });
    const selN = L.filter((t) => st.sel.has(key(t))).length;
    const total = A.reduce((s, t) => s + worth(t), 0);
    openViewer(`<div class="tlr"><div class="vhead"><b>🗃 Tools register</b></div>
      <div class="who">${A.length} tool${A.length === 1 ? "" : "s"} · worth ${esc(gbp(total))} to replace${A.filter((t) => !worth(t)).length ? ` · <span class="tlr-warn">${A.filter((t) => !worth(t)).length} with no value yet</span>` : ""}</div>
      <div class="actions"><button type="button" class="btn primary" id="tlr-add">＋ Add a tool</button><button type="button" class="btn" id="tlr-pdf">📄 PDF${selN ? " of " + selN + " ticked" : " of all shown"}</button><button type="button" class="btn" id="tlr-csv">⬇ CSV</button><button type="button" class="btn" id="tlr-tax">🧾 Bought this tax year</button></div>
      <input id="tlr-q" type="search" placeholder="Find: name, make, serial number, who…" value="${esc(st.q)}" aria-label="Find a tool">
      <div class="seg tlr-gs" role="group" aria-label="Group by">${GROUPS.map(([k, l]) => `<button type="button" class="tlr-g" data-g="${k}" aria-pressed="${st.g === k}">${l}</button>`).join("")}</div>
      <label class="inl"><input type="checkbox" id="tlr-gone"${st.gone ? " checked" : ""}> Show sold and scrapped ones</label>
      ${
        order
          .map(
            (k) =>
              `<div class="flabel tlr-gh"><span>${esc(k)} (${groups[k].length}) · ${esc(gbp(groups[k].reduce((s, t) => s + worth(t), 0)))}${st.g === "who" && groups[k][0].who && confirmTxt(groups[k][0].who) ? ` · <span class="tlr-ok">${esc(confirmTxt(groups[k][0].who))}</span>` : ""}</span><button type="button" class="pillbtn tlr-gsel" data-k="${esc(k)}">${groups[k].every((t) => st.sel.has(key(t))) ? "Untick these" : "Tick these"}</button></div>${groups[
                k
              ]
                .map((t) => {
                  const ph = (t.photos || [])[0];
                  const pat = t.pat && ["mains", "v110"].includes(t.cat) ? dTo(t.pat) : null;
                  return `<div class="tlr-row"><input type="checkbox" class="tlr-sel" data-k="${esc(key(t))}"${st.sel.has(key(t)) ? " checked" : ""} aria-label="Tick ${esc(t.name)}"><button type="button" class="tlr-open" data-k="${esc(key(t))}">${ph ? `<img src="${blobUrl(ph.assetId)}" alt="">` : `<span class="tlr-noph" aria-hidden="true">${esc(catName(t.cat).split(" ")[0])}</span>`}<span><b>${esc(t.name || "Tool")}</b>${t.tag ? ` <span class="tag">${esc(t.tag)}</span>` : ""}${t.status ? ` <span class="tag bad">${esc(stName(t.status))}</span>` : ""}${t.who && missingOf(t.who).includes(key(t)) ? ` <span class="tag bad">⚠ ${esc(nameOf(t.who))} hasn't got it</span>` : ""}<br><span class="who">${esc([[t.make, t.model].filter(Boolean).join(" "), t.serial ? "S/N " + t.serial : "", worth(t) ? gbp(worth(t)) : ""].filter(Boolean).join(" · "))}</span><br><span class="who">${esc(whereTxt(t))}${(t.receipts || []).length ? " · 🧾 receipt" : t.virt ? "" : ' · <span class="tlr-warn">no receipt</span>'}${pat != null && pat <= 30 ? ` · <span class="tlr-warn">PAT ${pat < 0 ? "overdue" : "due " + esc(ukD(t.pat))}</span>` : ""}</span></span></button></div>`;
                })
                .join("")}`,
          )
          .join("") ||
        `<div class="empty"><strong>${st.q ? "Nothing matches" : "No tools yet"}</strong>${st.q ? "" : "Tap ＋ Add a tool – a photo, the receipt and the serial number are what the insurer will ask for."}</div>`
      }</div>`);
    const find = (k) => all().find((t) => key(t) === k);
    $("tlr-add").onclick = () => edit(null);
    $("tlr-csv").onclick = () => csv(L);
    $("tlr-tax").onclick = () => taxYear();
    $("tlr-pdf").onclick = () => {
      const pick = L.filter((t) => st.sel.has(key(t)));
      pdfAsk(pick.length ? pick : L);
    };
    let tm = null;
    $("tlr-q").oninput = (e) => {
      clearTimeout(tm);
      tm = setTimeout(() => {
        st.q = e.target.value;
        draw();
        const el = $("tlr-q");
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }, 300);
    };
    $("tlr-gone").onchange = (e) => {
      st.gone = e.target.checked;
      draw();
    };
    document.querySelectorAll(".tlr-g").forEach(
      (b) =>
        (b.onclick = () => {
          st.g = b.dataset.g;
          draw();
        }),
    );
    document.querySelectorAll(".tlr-sel").forEach(
      (b) =>
        (b.onchange = () => {
          if (b.checked) st.sel.add(b.dataset.k);
          else st.sel.delete(b.dataset.k);
          draw();
        }),
    );
    document.querySelectorAll(".tlr-gsel").forEach(
      (b) =>
        (b.onclick = () => {
          const g = groups[b.dataset.k] || [];
          const allOn = g.every((t) => st.sel.has(key(t)));
          g.forEach((t) => (allOn ? st.sel.delete(key(t)) : st.sel.add(key(t))));
          draw();
        }),
    );
    document
      .querySelectorAll(".tlr-open")
      .forEach((b) => (b.onclick = () => edit(find(b.dataset.k))));
  }
  /* add or change one */
  function edit(rec) {
    const r = rec
      ? JSON.parse(JSON.stringify(rec))
      : { name: "", cat: "battery", who: "", van: "", site: "" };
    const e = r.eq ? eqOf(r.eq) : null;
    let ph = (r.photos || []).map((p) => ({ assetId: p.assetId }));
    let rc = (r.receipts || []).map((p) => Object.assign({}, p));
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "150";
    const v = (id) => (d.querySelector("#" + id) ? d.querySelector("#" + id).value.trim() : "");
    const FIELDS = [
      "name",
      "cat",
      "make",
      "model",
      "serial",
      "mark",
      "kit",
      "bought",
      "from",
      "paid",
      "value",
      "warranty",
      "pat",
      "cond",
      "status",
      "crimeRef",
      "goneOn",
      "who",
      "van",
      "site",
      "notes",
    ];
    const read = () =>
      FIELDS.forEach((k) => d.querySelector("#tlr-" + k) && (r[k] = v("tlr-" + k)));
    const sel = (id, opts, cur) =>
      `<select id="${id}">${opts.map(([k, l]) => `<option value="${esc(k)}"${(cur || "") === k ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
    const inp = (k, l, ph2, type) =>
      `<label for="tlr-${k}">${l}<input id="tlr-${k}"${type ? ` type="${type}"` : ""} maxlength="120" value="${esc(r[k] || "")}"${ph2 ? ` placeholder="${esc(ph2)}"` : ""}${type === "text" ? ' inputmode="decimal"' : ""}></label>`;
    const draw2 = () => {
      const mains = ["mains", "v110"].includes(r.cat);
      const lostish = ["lost", "stolen", "sold", "scrap"].includes(r.status);
      d.innerHTML = `<form class="dimbox tlr-form"><b>${rec && !rec.virt ? "✎ " + esc(rec.name) : rec && rec.virt ? "🗃 " + esc(rec.name) + " – add its details" : "＋ New tool"}</b>
        <div class="flabel">📷 Photos</div>
        <div class="tlr-phs">${ph.map((p, i) => `<div class="tlr-ph"><img src="${p.file ? p.url : blobUrl(p.assetId)}" alt="Photo ${i + 1}"><button type="button" class="linkdanger tlr-phx" data-i="${i}" aria-label="Take out photo ${i + 1}">✕</button></div>`).join("")}<label class="tlr-addf">📷 Add photos<input type="file" accept="image/*" multiple class="tlr-pfile"></label></div>
        <div class="who">The tool itself, its serial number plate and any security marking.</div>
        <div class="flabel">🧾 Receipts</div>
        <div class="tlr-rcs">${rc.map((p, i) => `<div class="tlr-rc"><button type="button" class="linkbtn tlr-rco" data-i="${i}">🧾 ${esc(p.name || "Receipt " + (i + 1))}</button><button type="button" class="linkdanger tlr-rcx" data-i="${i}" aria-label="Take out receipt ${i + 1}">✕</button></div>`).join("")}<label class="tlr-addf">🧾 Add a receipt<input type="file" accept="image/*,application/pdf,.pdf" multiple class="tlr-rfile"></label></div>
        <label for="tlr-name">Name<input id="tlr-name" maxlength="80" required value="${esc(r.name || "")}" placeholder="e.g. Makita 18V combi drill"></label>
        <label for="tlr-cat">Type${sel("tlr-cat", CATS, r.cat)}</label>
        <div class="grid2">${inp("make", "Make", "e.g. Makita")}${inp("model", "Model", "e.g. DHP486")}</div>
        <div class="grid2">${inp("serial", "Serial number", "On the plate")}${inp("mark", "Security mark", "e.g. JEB 07, SmartWater")}</div>
        ${inp("kit", "What comes with it", "e.g. case, 2 × 5Ah batteries, charger")}
        <div class="grid2">${inp("bought", "Bought", "", "date")}${inp("from", "Bought from", "e.g. Toolstation Exeter")}</div>
        <div class="grid2">${inp("paid", "Paid £", "e.g. 249.99", "text")}${inp("value", "To replace £", "if different", "text")}</div>
        <div class="grid2">${inp("warranty", "Warranty ends", "", "date")}${mains ? inp("pat", "Next PAT test", "", "date") : "<span></span>"}</div>
        <div class="flabel">Who has it</div>
        ${
          e
            ? `<div class="who">This is <b>${esc(e.name)}</b> from 🧰 Tools &amp; plant – book it out there to change who has it. Now: ${esc(whereTxt(r))}</div>`
            : `<div class="grid2"><label for="tlr-who">Who has it${sel("tlr-who", [["", "Nobody – in the yard / store"]].concat(crewIds().map((id) => [id, nameOf(id)])), r.who)}</label><label for="tlr-van">Which van${sel("tlr-van", [["", "Not on a van"]].concat(vans().map((x) => [x.id, x.name || "Van"])), r.van)}</label></div>
        <label for="tlr-site">On site${sel("tlr-site", [["", "Not on a site"]].concat(siteNames().map((s) => [s, s])), r.site)}</label>`
        }
        <div class="grid2"><label for="tlr-cond">Condition${sel(
          "tlr-cond",
          [
            ["", "Good"],
            ["worn", "Worn"],
            ["fix", "Needs repair"],
          ],
          r.cond,
        )}</label><label for="tlr-status">Now${sel("tlr-status", STATUS, r.status)}</label></div>
        ${lostish ? `<div class="grid2">${inp("goneOn", r.status === "stolen" ? "Stolen on" : r.status === "lost" ? "Lost on" : "When", "", "date")}${r.status === "stolen" ? inp("crimeRef", "Police crime ref.", "for the insurer") : "<span></span>"}</div>` : ""}
        <label for="tlr-notes">Notes<textarea id="tlr-notes" maxlength="1500" placeholder="e.g. Blade changed Oct 2026. Kept in the blue case.">${esc(r.notes || "")}</textarea></label>
        ${
          (r.log || []).length
            ? `<details class="tlr-log"><summary>🕘 Who's had it (${r.log.length})</summary>${r.log
                .slice()
                .reverse()
                .map((x) => `<div class="who">${esc(stamp(x.at))}: ${esc(whereTxt(x))}</div>`)
                .join("")}</details>`
            : ""
        }
        <div class="who" id="tlr-pr" role="status"></div>
        <div class="dimbtns">${rec && !rec.virt ? '<button type="button" class="btn delbtn tlr-del">🗑 Delete</button><button type="button" class="btn tlr-one">📄 PDF of this one</button>' : ""}<button type="button" class="btn tlr-c">Cancel</button><button type="submit" class="btn primary">Save</button></div></form>`;
      d.querySelector(".tlr-c").onclick = () => d.remove();
      ["tlr-cat", "tlr-status"].forEach((id) => {
        d.querySelector("#" + id).onchange = () => {
          read();
          draw2();
        };
      });
      d.querySelectorAll(".tlr-phx").forEach(
        (b) =>
          (b.onclick = () => {
            read();
            ph.splice(+b.dataset.i, 1);
            draw2();
          }),
      );
      d.querySelectorAll(".tlr-rcx").forEach(
        (b) =>
          (b.onclick = () => {
            read();
            rc.splice(+b.dataset.i, 1);
            draw2();
          }),
      );
      d.querySelectorAll(".tlr-rco").forEach(
        (b) =>
          (b.onclick = () => {
            const p = rc[+b.dataset.i];
            if (p.file) window.open(p.url, "_blank");
            else openFile(p.assetId, p.name, p.type);
          }),
      );
      const pf = d.querySelector(".tlr-pfile");
      pf.onchange = () => {
        read();
        [...(pf.files || [])].forEach((f) => ph.push({ file: f, url: URL.createObjectURL(f) }));
        draw2();
      };
      const rf = d.querySelector(".tlr-rfile");
      rf.onchange = () => {
        read();
        [...(rf.files || [])].forEach((f) =>
          rc.push({
            file: f,
            url: URL.createObjectURL(f),
            name: f.name || "Receipt",
            type: f.type || "",
          }),
        );
        draw2();
      };
      if (d.querySelector(".tlr-one")) d.querySelector(".tlr-one").onclick = () => pdfAsk([rec]);
      if (d.querySelector(".tlr-del"))
        d.querySelector(".tlr-del").onclick = async (ev) => {
          const b = ev.currentTarget;
          if (b.dataset.armed !== "1") {
            b.dataset.armed = "1";
            b.textContent = "Sure? Tap again";
            return;
          }
          try {
            await S.db.doc("todos/" + rec.id).delete();
            S.toolRegs = recs().filter((x) => x.id !== rec.id);
            sync();
            toast("Tool deleted · in Setup › Deleted items for " + BIN_DAYS + " days");
            d.remove();
            draw();
          } catch (x) {
            toast("Couldn't delete");
          }
        };
      d.querySelector("form").onsubmit = async (ev) => {
        ev.preventDefault();
        read();
        const pr = d.querySelector("#tlr-pr");
        if (!r.name) return (pr.textContent = "Give it a name.");
        if ((ph.some((p) => p.file) || rc.some((p) => p.file)) && !S.assets)
          return (pr.textContent = uploadErr({ code: "not_granted" }));
        pr.textContent = "Saving…";
        try {
          const base = r.name.replace(/[^\w\s-]/g, "").trim() || "Tool";
          const photos = [];
          for (let i = 0; i < ph.length; i++) {
            const p = ph[i];
            if (!p.file) {
              photos.push({ assetId: p.assetId });
              continue;
            }
            pr.textContent = `Saving photo ${i + 1} of ${ph.length}…`;
            let b = p.file;
            try {
              b = await shrinkImage(p.file, 1400);
            } catch (x) {}
            const a = await uploadFile(b, base + " " + (i + 1) + ".jpg");
            photos.push({ assetId: a.id });
          }
          const receipts = [];
          for (let i = 0; i < rc.length; i++) {
            const p = rc[i];
            if (!p.file) {
              receipts.push({ assetId: p.assetId, name: p.name || "", type: p.type || "" });
              continue;
            }
            pr.textContent = `Saving receipt ${i + 1} of ${rc.length}…`;
            let b = p.file;
            const img = /^image\//.test(p.file.type || "");
            if (img)
              try {
                b = await shrinkImage(p.file, 2000);
              } catch (x) {}
            const nm = img ? "Receipt " + base + " " + (i + 1) + ".jpg" : p.name;
            const a = await uploadAnyFile(b, nm);
            receipts.push({ assetId: a.id, name: nm, type: img ? "image/jpeg" : p.type || "" });
          }
          const id = rec && rec.id ? rec.id : "tl-" + newId();
          const data = { kind: "tool", updated: Date.now(), photos, receipts };
          FIELDS.forEach((k) => (data[k] = r[k] || ""));
          if (e) {
            data.eq = e.id;
            delete data.who;
            delete data.van;
            delete data.site;
          } else {
            const was = rec && !rec.virt ? rec : {};
            data.log = (r.log || []).slice();
            if (!rec || was.who !== data.who || was.van !== data.van || was.site !== data.site)
              data.log = data.log
                .concat([{ at: Date.now(), who: data.who, van: data.van, site: data.site }])
                .slice(-60);
          }
          await S.db.doc("todos/" + id).set(data);
          S.toolRegs = recs()
            .filter((x) => x.id !== id)
            .concat([Object.assign({ id }, data)]);
          sync();
          toast(r.name + " saved");
          d.remove();
          draw();
        } catch (x) {
          pr.textContent = x && x.code ? uploadErr(x) : "Couldn't save – check your connection";
        }
      };
    };
    draw2();
    document.body.appendChild(d);
    const f = d.querySelector("#tlr-name");
    if (f && !rec) f.focus();
  }
  /* ⬇ CSV */
  function csv(L, fn) {
    const H = [
      "Name",
      "Type",
      "Make",
      "Model",
      "Serial number",
      "Security mark",
      "Sticker",
      "What comes with it",
      "Bought",
      "Bought from",
      "Paid £",
      "To replace £",
      "Warranty ends",
      "Next PAT test",
      "Who has it",
      "Van",
      "Site",
      "Condition",
      "Now",
      "Crime ref.",
      "Receipts",
      "Notes",
    ];
    const rows = [H].concat(
      L.map((t) =>
        [
          t.name,
          catName(t.cat).replace(/^\S+\s/, ""),
          t.make,
          t.model,
          t.serial,
          t.mark,
          t.tag,
          t.kit,
          ukD(t.bought),
          t.from,
          num(t.paid) ? num(t.paid).toFixed(2) : "",
          worth(t) ? worth(t).toFixed(2) : "",
          ukD(t.warranty),
          ukD(t.pat),
          t.who ? nameOf(t.who) : "",
          t.van ? vanName(t.van) : "",
          t.site,
          { worn: "Worn", fix: "Needs repair" }[t.cond] || "Good",
          stName(t.status),
          t.crimeRef,
          (t.receipts || []).length,
          t.notes,
        ].map((x) => (x == null ? "" : String(x))),
      ),
    );
    csvSave(fn || "Tools register.csv", rows);
  }
  /* 📄 PDF: ask whether to put the receipts in */
  function pdfAsk(L, tax) {
    if (!L.length) return toast("No tools to put in it");
    const nR = L.reduce((s, t) => s + (t.receipts || []).length, 0);
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "160";
    d.innerHTML = `<div class="dimbox" role="dialog" aria-label="Tools PDF"><b>📄 ${tax ? esc(tax.title) : "PDF of " + L.length + " tool" + (L.length === 1 ? "" : "s")}</b>
      <div class="who">${tax ? "For your accountant: what you paid for each, when and where, with the total – for capital allowances. " : ""}A list with a photo of each, the make, model and serial number, where it was bought, what it's worth and who has it, with the total. Save it, print it or send it to the insurer.</div>
      <label class="inl"><input type="checkbox" id="tlr-wr"${nR ? " checked" : " disabled"}> Put the receipts after the list (${nR})</label>
      <div class="dimbtns"><button type="button" class="btn tlr-pc">Cancel</button><button type="button" class="btn primary" id="tlr-go">📄 Make the PDF</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector(".tlr-pc").onclick = () => d.remove();
    d.querySelector("#tlr-go").onclick = async () => {
      const wr = d.querySelector("#tlr-wr").checked;
      d.remove();
      toast("Making the PDF…");
      try {
        const out = await pdf(L, wr, tax);
        await S.dl.save({ filename: out.fn, data: out.blob });
      } catch (e) {
        toast("Couldn't make the PDF");
      }
    };
  }
  const toData = async (id) => {
    const b = await getFileBlob(id);
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(b);
    });
  };
  /* a PDF receipt's pages as pictures, so they can go in the same PDF */
  async function pdfPages(id, max) {
    await loadPdfJs();
    const b = await getFileBlob(id);
    const P = await window.pdfjsLib.getDocument({ data: new Uint8Array(await b.arrayBuffer()) })
      .promise;
    const out = [];
    for (let i = 1; i <= Math.min(P.numPages, max); i++) {
      const pg = await P.getPage(i);
      const vp0 = pg.getViewport({ scale: 1 });
      const vp = pg.getViewport({ scale: 1200 / vp0.width });
      const c = document.createElement("canvas");
      c.width = Math.round(vp.width);
      c.height = Math.round(vp.height);
      const g = c.getContext("2d");
      g.fillStyle = "#fff";
      g.fillRect(0, 0, c.width, c.height);
      await pg.render({ canvasContext: g, viewport: vp }).promise;
      out.push(c.toDataURL("image/jpeg", 0.8));
    }
    return out;
  }
  async function pdf(L, withReceipts, tax) {
    await loadJsPdf();
    const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    const LH = await lhFrame();
    const W = 210,
      M = 14,
      CW = W - 2 * M;
    const RED = BRGB();
    const clean = (t) =>
      String(t == null ? "" : t)
        .replace(/[–—]/g, "-")
        .replace(/[‘’]/g, "'")
        .replace(/×/g, "x")
        .replace(/[^\x20-\x7E£]/g, "")
        .trim();
    const top0 = LH.top || 22;
    const bot = LH.pics ? LH.bot : 284;
    if (!LH.pics) {
      doc.setFillColor(...RED);
      doc.rect(0, 0, W, 5, "F");
      try {
        await pdfLogo(doc, W - M, 10, 46, 20);
      } catch (e) {}
    }
    let y = LH.top || 34;
    const val = (t) => (tax ? num(t.paid) || worth(t) : worth(t));
    const total = L.reduce((s, t) => s + val(t), 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...RED);
    doc.text(tax ? clean(tax.title) : "Tools register", M, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(90, 90, 90);
    doc.text(
      clean(
        [
          coData().name,
          "as at " + ukD(iso(new Date())),
          L.length + " item" + (L.length === 1 ? "" : "s"),
          (tax ? "total paid " : "total to replace ") + gbp(total),
        ]
          .filter(Boolean)
          .join(" · "),
      ),
      M,
      y,
    );
    y += 7;
    /* columns: photo | item | serial & mark | bought | value | who has it */
    const C = [
      [M, 22, ""],
      [M + 24, 50, "Item"],
      [M + 76, 34, "Serial / mark"],
      [M + 112, 30, "Bought"],
      [M + 144, 18, tax ? "Paid" : "Value"],
      [M + 164, CW - 164, "Who / where"],
    ];
    const head = () => {
      doc.setFillColor(242, 242, 242);
      doc.rect(M, y - 4, CW, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      C.forEach(([x, , l]) => l && doc.text(l, x + 1, y));
      y += 4;
    };
    const groups = {};
    L.forEach((t) => (groups[groupOf(t, st.g)] = groups[groupOf(t, st.g)] || []).push(t));
    const keys = Object.keys(groups).sort();
    for (const g of keys) {
      if (y + 30 > bot) {
        doc.addPage();
        y = top0 + 6;
      }
      if (keys.length > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(17, 17, 17);
        doc.text(
          clean(g) +
            " (" +
            groups[g].length +
            ") - " +
            clean(gbp(groups[g].reduce((s, t) => s + worth(t), 0))),
          M,
          y + 2,
        );
        y += 8;
      }
      head();
      for (const t of groups[g]) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const cell = (i, lines) =>
          doc.splitTextToSize(lines.filter(Boolean).map(clean).join("\n"), C[i][1] - 2);
        const cs = [
          null,
          cell(1, [
            t.name,
            [t.make, t.model].join(" ").trim(),
            t.kit ? "With: " + t.kit : "",
            t.status
              ? stName(t.status) +
                (t.goneOn ? " " + ukD(t.goneOn) : "") +
                (t.crimeRef ? " - crime ref " + t.crimeRef : "")
              : "",
          ]),
          cell(2, [
            t.serial ? "S/N " + t.serial : "No serial no.",
            t.mark ? "Mark: " + t.mark : "",
            t.tag ? "Sticker " + t.tag : "",
          ]),
          cell(3, [
            ukD(t.bought),
            t.from,
            num(t.paid) ? "Paid " + gbp(num(t.paid)) : "",
            (t.receipts || []).length ? "Receipt kept" : "No receipt",
          ]),
          cell(4, [val(t) ? gbp(val(t)) : "-"]),
          cell(5, [
            t.who ? nameOf(t.who) : "",
            t.van ? vanName(t.van) : "",
            t.site || "",
            !t.who && !t.van && !t.site ? "In the yard / store" : "",
          ]),
        ];
        let img = null;
        if ((t.photos || [])[0])
          try {
            const u = await toData(t.photos[0].assetId);
            const pr = doc.getImageProperties(u);
            const w = 20,
              h = Math.min(20, (w * pr.height) / pr.width);
            img = { u, w: (h * pr.width) / pr.height, h };
          } catch (e) {}
        const rh = Math.max(img ? img.h + 2 : 6, ...cs.slice(1).map((c) => c.length * 3.4 + 2));
        if (y + rh > bot) {
          doc.addPage();
          y = top0 + 6;
          head();
        }
        if (img) doc.addImage(img.u, "JPEG", M + 1, y + 1, img.w, img.h);
        doc.setTextColor(17, 17, 17);
        cs.forEach((c, i) => {
          if (!c) return;
          doc.setFont("helvetica", i === 1 ? "bold" : "normal");
          doc.text(c[0] || "", C[i][0] + 1, y + 4);
          doc.setFont("helvetica", "normal");
          if (c.length > 1) doc.text(c.slice(1), C[i][0] + 1, y + 7.4);
        });
        y += rh;
        doc.setDrawColor(215, 215, 215);
        doc.line(M, y, M + CW, y);
        y += 1;
      }
      y += 5;
    }
    if (y + 10 > bot) {
      doc.addPage();
      y = top0 + 6;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(17, 17, 17);
    doc.text((tax ? "Total paid: " : "Total to replace: ") + clean(gbp(total)), M + CW, y + 2, {
      align: "right",
    });
    if (withReceipts) {
      for (const t of L)
        for (const r of t.receipts || []) {
          let pics = [];
          try {
            pics = /pdf/i.test(r.type || r.name || "")
              ? await pdfPages(r.assetId, 3)
              : [await toData(r.assetId)];
          } catch (e) {}
          for (const u of pics) {
            doc.addPage();
            let yy = top0 + 4;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(17, 17, 17);
            doc.text(
              clean("Receipt: " + t.name + (t.serial ? " (S/N " + t.serial + ")" : "")),
              M,
              yy,
            );
            yy += 4;
            try {
              const pr = doc.getImageProperties(u);
              let w = CW,
                h = (w * pr.height) / pr.width;
              const room = bot - yy - 2;
              if (h > room) {
                h = room;
                w = (h * pr.width) / pr.height;
              }
              doc.addImage(u, "JPEG", M, yy, w, h);
            } catch (e) {}
          }
          if (!pics.length) {
            doc.addPage();
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(
              clean(
                "Receipt for " +
                  t.name +
                  ": " +
                  (r.name || "") +
                  " is kept in the app (it couldn't be shown here).",
              ),
              M,
              top0 + 4,
            );
          }
        }
    }
    lhFinish(doc, LH);
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 140);
      doc.text("Page " + i + " of " + n, W - M, 293, { align: "right" });
    }
    return {
      blob: doc.output("blob"),
      fn:
        (tax
          ? clean(tax.title)
          : L.length === 1
            ? "Tool " + clean(L[0].name)
            : "Tools register " + iso(new Date())
        )
          .replace(/[^\w\s-]/g, "")
          .trim() + ".pdf",
    };
  }
  /* 🧾 Bought this tax year (idea 2): the tools bought between 6 April and 5 April – this tax year or last – with
     what was paid and the receipts, as a PDF or CSV for the accountant (capital allowances) */
  function taxStart(d) {
    const y =
      d.getMonth() > 3 || (d.getMonth() === 3 && d.getDate() >= 6)
        ? d.getFullYear()
        : d.getFullYear() - 1;
    return y;
  }
  function taxYear() {
    const y0 = taxStart(new Date());
    const yrs = [y0, y0 - 1];
    const list = (y) =>
      all().filter(
        (t) => !t.virt && t.bought && t.bought >= y + "-04-06" && t.bought <= y + 1 + "-04-05",
      );
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "160";
    d.innerHTML = `<div class="dimbox" role="dialog" aria-label="Tools bought this tax year"><b>🧾 Tools bought in a tax year</b>
      <div class="who">For your accountant: every tool bought between 6 April and 5 April, with what you paid and the receipts.</div>
      ${yrs
        .map((y) => {
          const L = list(y);
          const tot = L.reduce((s, t) => s + (num(t.paid) || worth(t)), 0);
          return `<div class="tlr-ty"><b>${y}/${String(y + 1).slice(2)}</b> <span class="who">${L.length} tool${L.length === 1 ? "" : "s"} · ${esc(gbp(tot))} paid${L.filter((t) => !num(t.paid)).length ? " · " + L.filter((t) => !num(t.paid)).length + " with no price" : ""}</span><span class="actions"><button type="button" class="btn tlr-typ" data-y="${y}"${L.length ? "" : " disabled"}>📄 PDF</button><button type="button" class="btn tlr-tyc" data-y="${y}"${L.length ? "" : " disabled"}>⬇ CSV</button></span></div>`;
        })
        .join("")}
      <div class="dimbtns"><button type="button" class="btn tlr-tyx">Close</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector(".tlr-tyx").onclick = () => d.remove();
    const title = (y) => "Tools bought " + y + "-" + String(y + 1).slice(2) + " tax year";
    d.querySelectorAll(".tlr-typ").forEach(
      (b) =>
        (b.onclick = () => {
          d.remove();
          pdfAsk(list(+b.dataset.y), { title: title(+b.dataset.y) });
        }),
    );
    d.querySelectorAll(".tlr-tyc").forEach(
      (b) => (b.onclick = () => csv(list(+b.dataset.y), title(+b.dataset.y) + ".csv")),
    );
  }
  /* ties to elsewhere */
  const listTxt = (L) =>
    L.map((t) => t.name + (t.serial ? " (S/N " + t.serial + ")" : "")).join(", ");
  function leaverHtml(id) {
    const L = heldBy(id);
    return L.length
      ? `<div class="notice warn tlr-lv" style="margin:0"><b>🗃 Tools to get back (${L.length}):</b> ${esc(listTxt(L))}</div>`
      : "";
  }
  function vanHtml(v) {
    const L = onVan(v).filter((t) => !t.eq);
    return L.length
      ? `<div class="flabel">🗃 From the tools register (${L.length})</div>${L.map((t) => `<div class="vns-row"><span><b>${esc(t.name)}</b> <span class="who">${esc([t.serial ? "S/N " + t.serial : "", t.who ? nameOf(t.who) : ""].filter(Boolean).join(" · "))}</span></span></div>`).join("")}`
      : "";
  }
  function due() {
    const out = [];
    all()
      .filter((t) => !t.status)
      .forEach((t) => {
        if (t.pat && ["mains", "v110"].includes(t.cat) && dTo(t.pat) <= 14)
          out.push({ t, why: dTo(t.pat) < 0 ? "PAT test overdue" : "PAT test due " + ukD(t.pat) });
        if (t.warranty && dTo(t.warranty) >= 0 && dTo(t.warranty) <= 30)
          out.push({ t, why: "warranty ends " + ukD(t.warranty) });
        if (t.who && missingOf(t.who).includes(key(t)))
          out.push({ t, why: nameOf(t.who) + " says they haven't got it" });
      });
    return out;
  }
  /* 🧰 My tools for the trades (James, Nov 2026: "do them all" – idea 1): each trade's tools are copied to their own
     sheet (sheets/{id}/signoffs/tools-held, type "toolsheld": items [{k, name, make, model, serial, tag, photo}],
     stamp); on their Today they tick ✓ Got it or ✗ Not got it and confirm, every two months or when the list changes
     (sheets/{id}/signoffs/tools-ok, type "toolsok": at, stamp, missing [k], names). James sees when each person last
     confirmed, and anything they say they haven't got is on his Today. */
  const OK_DAYS = 60;
  const sigOf = (id, type) =>
    ((S.data && S.data.signoffs && S.data.signoffs[id]) || []).find((x) => x.type === type) || null;
  const okOf = (id) => sigOf(id, "toolsok");
  const heldItems = (id) =>
    heldBy(id).map((t) => ({
      k: key(t),
      name: t.name || "",
      make: t.make || "",
      model: t.model || "",
      serial: t.serial || "",
      tag: t.tag || "",
      photo: ((t.photos || [])[0] || {}).assetId || "",
    }));
  const stampOf = (items) =>
    items
      .map((x) => x.k + ":" + x.name + ":" + x.serial)
      .sort()
      .join("|");
  const missingOf = (id) => {
    const ok = okOf(id),
      held = sigOf(id, "toolsheld");
    return ok && held && ok.stamp === held.stamp ? ok.missing || [] : [];
  };
  let syncT = null,
    syncing = false;
  function sync() {
    if (!S.owner || !S.db) return;
    clearTimeout(syncT);
    syncT = setTimeout(syncNow, 1500);
  }
  async function syncNow() {
    if (syncing || !S.owner) return;
    syncing = true;
    try {
      for (const id of teamIds()) {
        const items = heldItems(id);
        const stamp = stampOf(items);
        const have = sigOf(id, "toolsheld");
        if ((have ? have.stamp : "") === stamp) continue;
        await S.db
          .doc("sheets/" + id + "/signoffs/tools-held")
          .set({ type: "toolsheld", items, stamp, updated: Date.now() })
          .catch(() => {});
      }
    } finally {
      syncing = false;
    }
  }
  function confirmTxt(id) {
    const ok = okOf(id),
      held = sigOf(id, "toolsheld");
    if (!held || !(held.items || []).length) return "";
    if (!ok) return "not confirmed yet";
    const n = (ok.missing || []).length;
    return (
      (ok.stamp === held.stamp ? "✓ confirmed " : "confirmed (before the list changed) ") +
      ukD(iso(new Date(ok.at))) +
      (n && ok.stamp === held.stamp ? " · " + n + " not got" : "")
    );
  }
  /* the trade's side */
  let tlrPick = {};
  function tradeCardHtml() {
    if (S.owner) return "";
    const held = (S.mine.signoffs || []).find((x) => x.type === "toolsheld");
    const items = (held && held.items) || [];
    if (!items.length) return "";
    const ok = (S.mine.signoffs || []).find((x) => x.type === "toolsok");
    const fresh = ok && ok.stamp === held.stamp && Date.now() - (ok.at || 0) < OK_DAYS * 864e5;
    const miss = new Set(fresh ? ok.missing || [] : []);
    const rows = items
      .map((x) => {
        const gone = fresh ? miss.has(x.k) : tlrPick[x.k] === "no";
        return `<div class="tlr-mine">${x.photo ? `<img src="${blobUrl(x.photo)}" alt="">` : '<span class="tlr-noph" aria-hidden="true">🧰</span>'}<span><b>${esc(x.name)}</b>${x.tag ? ` <span class="tag">${esc(x.tag)}</span>` : ""}<br><span class="who">${esc([[x.make, x.model].filter(Boolean).join(" "), x.serial ? "S/N " + x.serial : ""].filter(Boolean).join(" · "))}</span></span>${fresh ? (gone ? '<span class="tag bad">Not got it</span>' : "") : `<span class="seg tlr-yn" role="group" aria-label="Have you got ${esc(x.name)}?"><button type="button" data-k="${esc(x.k)}" data-v="yes" aria-pressed="${!gone}">✓ Got it</button><button type="button" data-k="${esc(x.k)}" data-v="no" aria-pressed="${gone}">✗ Not got it</button></span>`}</div>`;
      })
      .join("");
    return fresh
      ? `<details class="tlr-tcard"><summary><b>🧰 Your tools (${items.length})</b> <span class="who">✓ checked ${esc(ukD(iso(new Date(ok.at))))}</span></summary>${rows}</details>`
      : `<div class="tlr-tcard" id="tlr-tcard"><b class="tlr-th">🧰 Your tools (${items.length})</b><div class="who">${esc(bossFirst())} has these down as with you. Check you've still got each one.</div>${rows}<button type="button" class="btn primary tlr-wide" id="tlr-tok">✓ That's right – send it</button></div>`;
  }
  function wireTrade() {
    const card = $("tlr-tcard");
    if (!card) return;
    card.querySelectorAll(".tlr-yn button").forEach(
      (b) =>
        (b.onclick = () => {
          tlrPick[b.dataset.k] = b.dataset.v;
          b.parentNode
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        }),
    );
    $("tlr-tok").onclick = async () => {
      const held = (S.mine.signoffs || []).find((x) => x.type === "toolsheld");
      if (!held) return;
      const missing = (held.items || []).filter((x) => tlrPick[x.k] === "no");
      const data = {
        type: "toolsok",
        at: Date.now(),
        stamp: held.stamp,
        missing: missing.map((x) => x.k),
        names: missing.map((x) => x.name),
      };
      try {
        const r = await saveOrKeep(
          "sheets/" + S.me + "/signoffs/tools-ok",
          "set",
          data,
          "Your tools checked",
        );
        S.mine.signoffs = (S.mine.signoffs || [])
          .filter((x) => x.type !== "toolsok")
          .concat([Object.assign({ id: "tools-ok" }, data)]);
        tlrPick = {};
        if (r === "queued") sentToast(r, "Your tools");
        else
          toast(
            missing.length
              ? "Sent – " + bossFirst() + " will see what you haven't got"
              : "Thanks – sent",
          );
        render();
      } catch (e) {
        toast("Couldn't send – try again");
      }
    };
  }
  function todayCard() {
    if (!S.owner) return "";
    const L = due();
    if (!L.length) return "";
    return `<div class="card tlr-today"><div class="cardbody"><b>🗃 Tools to see to</b>${L.map((x) => `<button type="button" class="incrow tlr-tgo"><span><b>${esc(x.t.name)}</b><br><span class="who">${esc(x.why)}</span></span><span>›</span></button>`).join("")}</div></div>`;
  }
  function wireToday() {
    document.querySelectorAll(".tlr-tgo").forEach((b) => (b.onclick = () => open()));
  }
  return {
    open,
    all,
    heldBy,
    onVan,
    leaverHtml,
    vanHtml,
    todayCard,
    wireToday,
    pdf,
    due,
    sync,
    syncNow,
    tradeCardHtml,
    wireTrade,
  };
})();
/* the trades' copies of their tools are brought up to date soon after James opens the app */
function initToolSync() {
  setTimeout(() => TLR.syncNow(), 10000);
}
