/* ================= JOB PRICING: one page to price a job – what it is, every price from suppliers and trades, then the estimate ================= */
import { clAddr } from "../clients/stages-planner.js";
import { $, esc, gbp, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { uploadAnyFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { shrinkImage } from "../safety/training.js";
import { edcHtml, edcWire } from "./est-docs.js";
import { EST_LINK } from "./estimating.js";
import { jfOpenClient, jfSave } from "./job-file.js";
import { sdR2, sdSet } from "./sales-calc.js";
import { sdEdit } from "./sales-edit.js";
export { jprCosts, jprCounts, jprOpen };
/* James (Nov 2026): "jobs to cost and estimates should link to creating an estimate and the estimating software if
   needed. It should have all the information about the job that is easy to read and be able to store the different
   costings from suppliers and company/trades for the jobs neatly and easy to access to be able to create the estimate
   for the client". From the client card (💷 Price this job) and the job file: the job at a glance and its documents
   (sales/est-docs.js), then the costings in groups – 🧱 Suppliers and materials, 👷 Trades and subcontractors,
   🏗 Our own labour, 🚜 Plant and hire, 📦 Other – each with who it's from, what, the price and the quote itself if
   there is one; the totals, your overhead and profit %, and the price that gives. 📝 Make the estimate fills the
   estimate's costs from them (one line per group, with the % added – the client never sees who quoted what);
   📐 Estimating opens the estimating software. Costings are kept in the client's job file (todos/jf-…, items with
   cost: true), so they show there too under "Prices you've got". */
const JPR_KINDS = [
  ["sup", "🧱 Suppliers and materials", "supq", "mat", "Materials"],
  ["trade", "👷 Trades and subcontractors", "subq", "lab", "Specialist trades"],
  ["lab", "🏗 Our own labour", "other", "lab", "Labour"],
  ["plant", "🚜 Plant and hire", "other", "oth", "Plant and hire"],
  ["other", "📦 Other costs", "other", "oth", "Other costs"],
];
/* units for the quantity × rate lines (James, Nov 2026: "better controllability … for the costing process") */
const JPR_UNITS = [
  "item",
  "no.",
  "m",
  "m²",
  "m³",
  "kg",
  "tonne",
  "bag",
  "pack",
  "pallet",
  "length",
  "sheet",
  "litre",
  "hour",
  "day",
  "week",
  "load",
  "visit",
];
const jprKind = (k) => JPR_KINDS.find((x) => x[0] === k) || JPR_KINDS[4];
function jprFileOf(c) {
  return (
    (S.jobFiles || []).find((x) => x.clientId === c.id) || {
      clientId: c.id,
      estId: "",
      client: c.name || "",
      title: c.work || "",
      site: c.site || clAddr(c) || "",
      items: [],
    }
  );
}
/* every priced item in the job file: costings added here, and quotes added to the file with a price */
const jprCosts = (j) =>
  (j.items || [])
    .filter((i) => i.cost || +i.price > 0)
    .map((i) =>
      Object.assign({}, i, {
        ck: i.ck || (i.folder === "supq" ? "sup" : i.folder === "subq" ? "trade" : "other"),
      }),
    );
/* quotes for the same thing (James, Nov 2026: compare quotes): prices sharing a grp are compared; the one ticked
   "use" counts – the cheapest until one is ticked – and the others are kept but not added in */
const jprGroup = (L, i) => (i.grp ? L.filter((x) => x.grp === i.grp) : [i]);
function jprChosen(L, i) {
  const G = jprGroup(L, i);
  return G.find((x) => x.use) || G.slice().sort((a, b) => (+a.price || 0) - (+b.price || 0))[0];
}
const jprCounts = (L, i) => !i.grp || jprChosen(L, i).id === i.id;
function jprRow(i, L) {
  const inG = !!i.grp && jprGroup(L, i).length > 1;
  const on = jprCounts(L, i);
  const G = inG ? jprGroup(L, i) : [];
  const cheapest =
    inG && G.slice().sort((a, b) => (+a.price || 0) - (+b.price || 0))[0].id === i.id;
  return `<div class="jpr-row${inG ? (on ? " jpr-on" : " jpr-off") : ""}">${inG ? `<button type="button" class="jpr-use" data-id="${esc(i.id)}" aria-pressed="${on}" aria-label="Use ${esc(i.from || "this quote")}">${on ? "✓" : ""}</button>` : ""}<span><b>${esc(i.from || "–")}</b>${cheapest ? ' <span class="tag ok">Cheapest</span>' : ""}${inG && on ? ' <span class="tag">Using</span>' : ""}<span class="who">${esc(i.note || i.name || "")}</span>${(i.lines || []).length ? `<span class="jpr-ls">${i.lines.map((l) => `<span>${esc(l.d || "")} ${esc(String(l.q))}${l.u ? " " + esc(l.u) : ""} × ${gbp(l.r)} = ${gbp(sdR2(l.q * l.r))}</span>`).join("")}</span>` : ""}</span><b>${gbp(+i.price || 0)}</b>${i.assetId ? `<button type="button" class="pillbtn jpr-open" data-id="${esc(i.id)}">📄 Quote</button>` : ""}<button type="button" class="pillbtn jpr-cmp" data-id="${esc(i.id)}" title="Another quote for the same thing">⇄ Compare</button><button type="button" class="iconbtn jpr-ed" data-id="${esc(i.id)}" aria-label="Change">✎</button></div>`;
}
function jprOpen(c0) {
  const c = (S.clients || []).find((x) => x.id === c0.id) || c0;
  const j = jprFileOf(c);
  const L = jprCosts(j);
  const mk = j.markup != null ? +j.markup : 20;
  const tot = (k) =>
    L.filter((i) => (!k || i.ck === k) && jprCounts(L, i)).reduce((a, i) => a + (+i.price || 0), 0);
  const all = tot();
  const price = sdR2(all * (1 + mk / 100));
  openViewer(`<div class="jpr-page"><h2 class="jpr-h">💷 Price this job</h2><div class="who">${esc([c.name, c.work, clAddr(c)].filter(Boolean).join(" · "))}</div>
    ${edcHtml({ clientId: c.id, site: c.site || "", id: "x" }).replace('<details class="card edc-card"', '<details class="card edc-card" open')}
    ${JPR_KINDS.map(([k, l]) => {
      const g = L.filter((i) => i.ck === k);
      return `<section class="card jpr-g"><div class="cardbody"><div class="jpr-gh"><b>${l}</b><span>${g.length ? gbp(tot(k)) : ""}</span></div>
        ${(() => {
          /* single prices, then each set of quotes for the same thing in its own box */
          const seen = new Set();
          return g
            .map((i) => {
              if (!i.grp || jprGroup(L, i).length < 2) return jprRow(i, L);
              if (seen.has(i.grp)) return "";
              seen.add(i.grp);
              const G = jprGroup(L, i).sort((a, b) => (+a.price || 0) - (+b.price || 0));
              const hi = +G[G.length - 1].price || 0,
                lo = +G[0].price || 0;
              return `<div class="jpr-cbox"><div class="jpr-ch">⇄ ${G.length} quotes for <b>${esc(G[0].note || "the same thing")}</b><span class="who"> · ${gbp(hi - lo)} between them · tap ✓ to use one</span></div>${G.map((x) => jprRow(x, L)).join("")}</div>`;
            })
            .join("");
        })()}
        <button type="button" class="pillbtn jpr-add" data-k="${k}">+ Add a price</button></div></section>`;
    }).join("")}
    <section class="card jpr-sum"><div class="cardbody">
      <div class="drow"><span>Total of your costs</span><b>${gbp(all)}</b></div>
      <div class="drow"><span><label for="jpr-mk">Overhead and profit %</label></span><input id="jpr-mk" inputmode="decimal" value="${esc(String(mk))}" style="width:90px;text-align:right"></div>
      <div class="drow sd-due"><span><b>Price to the client (before VAT)</b></span><b>${gbp(price)}</b></div>
    </div></section>
    <div class="actions"><button type="button" class="btn primary" id="jpr-est"${all ? "" : " disabled"}>📝 Make the estimate from these</button><a class="btn" href="${EST_LINK}" target="_blank" rel="noopener">📐 Open the estimating software</a><button type="button" class="btn" id="jpr-jf">📁 Job file</button></div>
  </div>`);
  edcWire({ clientId: c.id, site: c.site || "" });
  const again = (j2) => {
    S.jobFiles = (S.jobFiles || []).filter((x) => x.id !== j2.id).concat([j2]);
    jprOpen(c);
  };
  document
    .querySelectorAll("#viewer-body .jpr-add")
    .forEach((b) => (b.onclick = () => jprEdit(c, j, null, b.dataset.k, again)));
  document.querySelectorAll("#viewer-body .jpr-ed").forEach(
    (b) =>
      (b.onclick = () => {
        const it = (j.items || []).find((i) => i.id === b.dataset.id);
        if (it) jprEdit(c, j, it, jprCosts({ items: [it] })[0].ck, again);
      }),
  );
  /* ⇄ Compare: a new price for the same thing; ✓ uses one of the quotes */
  document.querySelectorAll("#viewer-body .jpr-cmp").forEach(
    (b) =>
      (b.onclick = () => {
        const it = (j.items || []).find((i) => i.id === b.dataset.id);
        if (it) jprEdit(c, j, null, jprCosts({ items: [it] })[0].ck, again, it);
      }),
  );
  document.querySelectorAll("#viewer-body .jpr-use").forEach(
    (b) =>
      (b.onclick = async () => {
        const it = L.find((i) => i.id === b.dataset.id);
        if (!it) return;
        const items = (j.items || []).map((x) =>
          x.grp && x.grp === it.grp ? Object.assign({}, x, { use: x.id === it.id }) : x,
        );
        try {
          again(await jfSave(Object.assign({}, j, { items })));
          toast("Using " + (it.from || "that quote"));
        } catch (e) {
          toast("Couldn't save. Check your connection.");
        }
      }),
  );
  document.querySelectorAll("#viewer-body .jpr-open").forEach(
    (b) =>
      (b.onclick = () => {
        const it = (j.items || []).find((i) => i.id === b.dataset.id);
        if (it) openFile(it.assetId, it.name, it.type);
      }),
  );
  $("jpr-mk").onchange = async () => {
    const v = Math.max(0, Math.min(500, +$("jpr-mk").value || 0));
    try {
      again(await jfSave(Object.assign({}, j, { markup: v })));
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  };
  $("jpr-jf").onclick = () => jfOpenClient(c);
  $("jpr-est").onclick = () => {
    const set = sdSet();
    const vc = set.vatReg === false ? "NV" : set.vc || "S20";
    const lines = JPR_KINDS.filter(([k]) => tot(k) > 0).map(([k, , , kind, lab]) => ({
      d: lab,
      a: sdR2(tot(k) * (1 + mk / 100)),
      vc,
      k: kind,
    }));
    sdEdit({
      type: "estimate",
      clientId: c.id,
      client: c.name || "",
      email: c.email || "",
      address: [String(c.address || "").replace(/\s*,\s*/g, "\n"), c.postcode]
        .filter(Boolean)
        .join("\n"),
      dear: c.name || "",
      title: j.title || c.work || "",
      site: j.site || c.site || "",
      lines,
    });
  };
}
/* add or change one costing: who it's from, what, the price, the quote */
/* cmp: the price this one is another quote for – same thing, same lines and quantities, rates to fill in */
function jprEdit(c, j, it, k, after, cmp) {
  const names = [
    ...new Set(
      (S.suppliers || [])
        .map((x) => x.name)
        .concat((S.firms || []).map((x) => x.name))
        .filter(Boolean),
    ),
  ];
  openSheet(
    `<h3 id="sheettitle">${it ? "✎ Change the price" : cmp ? "⇄ Another quote for the same thing" : "+ Add a price"}</h3>${cmp ? `<div class="who">To compare with <b>${esc(cmp.from || "")}</b> at ${gbp(+cmp.price || 0)}. The lines and quantities are filled in – put in this one's rates.</div>` : ""}
    <label for="jp-k">What kind<select id="jp-k">${JPR_KINDS.map(([v, l]) => `<option value="${v}"${v === k ? " selected" : ""}>${l}</option>`).join("")}</select></label>
    <label for="jp-from">Who it's from<input id="jp-from" maxlength="80" list="jp-names" value="${esc((it && it.from) || "")}" placeholder="e.g. Travis Perkins, Dave the plasterer, us"></label><datalist id="jp-names">${names.map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
    <label for="jp-what">What it's for<input id="jp-what" maxlength="160" value="${esc((it && (it.note || "")) || (cmp && cmp.note) || "")}" placeholder="e.g. Blocks, sand and cement for the walls"></label>
    <div class="flabel">The prices (before VAT): how many × the rate, a line for each thing</div>
    <div class="jp-lines" id="jp-lines"></div>
    <div class="jp-ltot"><button type="button" class="pillbtn" id="jp-addl">+ Add a line</button><span>Total <b id="jp-tot">£0.00</b></span></div>
    <datalist id="jp-units">${JPR_UNITS.map((u) => `<option value="${u}">`).join("")}</datalist>
    <div class="flabel">The quote (optional)</div><label class="btn jp-fb">📄 ${it && it.assetId ? "Change the quote" : "Add the quote (PDF or photo)"}<input type="file" id="jp-file" class="fpick" accept="application/pdf,image/*" data-cam="1"></label><span class="who" id="jp-fn"></span>
    ${formFoot(!!it, it ? "Save" : "Add")}`,
    async () => {
      const lines = jpLines().filter((l) => l.d || l.r);
      const p = sdR2(lines.reduce((a, l) => a + l.q * l.r, 0));
      if (!(p > 0)) return showErr("Put in at least one price (how many and the rate).");
      $("f-save").disabled = true;
      try {
        const kk = $("jp-k").value;
        const row = Object.assign({}, it || { id: newId(), added: Date.now(), name: "" }, {
          cost: true,
          ck: kk,
          folder: jprKind(kk)[2],
          from: $("jp-from").value.trim(),
          note: $("jp-what").value.trim(),
          price: sdR2(p),
          lines,
        });
        const f = $("jp-file").files && $("jp-file").files[0];
        if (f) {
          const img = /^image\//.test(f.type);
          const a = await uploadAnyFile(img ? await shrinkImage(f, 2200) : f, f.name);
          Object.assign(row, {
            assetId: a.id,
            type: img ? "image/jpeg" : a.contentType || f.type || "",
            name: f.name,
          });
        }
        if (!row.name) row.name = (row.from || "Price") + (row.note ? " – " + row.note : "");
        /* another quote for the same thing: both share a group, and nothing is ticked so the cheaper counts */
        let base = j.items || [];
        if (cmp) {
          const g = cmp.grp || "g" + newId();
          row.grp = g;
          base = base.map((x) => (x.id === cmp.id ? Object.assign({}, x, { grp: g }) : x));
        }
        const items = base.filter((x) => x.id !== row.id).concat([row]);
        const saved = await jfSave(Object.assign({}, j, { items }));
        closeForm();
        toast(it ? "Saved" : "Price added");
        after(saved);
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    "jp-from",
  );
  $("jp-file").onchange = (e) =>
    ($("jp-fn").textContent = e.target.files.length ? "✓ " + e.target.files[0].name : "");
  /* the lines: an older price with none becomes one line, 1 × its price */
  let rows =
    it && (it.lines || []).length
      ? it.lines.map((l) => Object.assign({}, l))
      : it && it.price
        ? [{ d: it.note || "", q: 1, u: "item", r: +it.price }]
        : cmp
          ? (cmp.lines || []).length
            ? cmp.lines.map((l) => Object.assign({}, l, { r: "" }))
            : [{ d: cmp.note || "", q: 1, u: "item", r: "" }]
          : [{ d: "", q: 1, u: "", r: "" }];
  const jpLines = () =>
    [...document.querySelectorAll("#jp-lines .jp-l")].map((row) => ({
      d: row.querySelector(".jp-ld").value.trim(),
      q: +String(row.querySelector(".jp-lq").value).replace(/[,\s]/g, "") || 0,
      u: row.querySelector(".jp-lu").value.trim(),
      r: +String(row.querySelector(".jp-lr").value).replace(/[£,\s]/g, "") || 0,
    }));
  const sum = () => {
    let t = 0;
    document.querySelectorAll("#jp-lines .jp-l").forEach((row) => {
      const q = +String(row.querySelector(".jp-lq").value).replace(/[,\s]/g, "") || 0,
        r = +String(row.querySelector(".jp-lr").value).replace(/[£,\s]/g, "") || 0;
      row.querySelector(".jp-lt").textContent = gbp(sdR2(q * r));
      t += q * r;
    });
    $("jp-tot").textContent = gbp(sdR2(t));
  };
  const draw = () => {
    $("jp-lines").innerHTML = rows
      .map(
        (l, i) =>
          `<div class="jp-l" data-i="${i}"><input class="jp-ld" maxlength="120" value="${esc(l.d || "")}" placeholder="e.g. Concrete blocks 440×215" aria-label="What, line ${i + 1}"><input class="jp-lq" inputmode="decimal" value="${l.q === "" || l.q == null ? "" : esc(String(l.q))}" aria-label="How many, line ${i + 1}"><input class="jp-lu" list="jp-units" maxlength="16" value="${esc(l.u || "")}" placeholder="unit" aria-label="Unit, line ${i + 1}"><span class="jp-x">×</span><input class="jp-lr" inputmode="decimal" value="${l.r === "" || l.r == null ? "" : esc(String(l.r))}" placeholder="£ rate" aria-label="Rate in pounds, line ${i + 1}"><b class="jp-lt"></b><button type="button" class="iconbtn jp-lx" aria-label="Take out line ${i + 1}">✕</button></div>`,
      )
      .join("");
    $("jp-lines")
      .querySelectorAll("input")
      .forEach((x) => (x.oninput = sum));
    $("jp-lines")
      .querySelectorAll(".jp-lx")
      .forEach(
        (b) =>
          (b.onclick = () => {
            rows = jpLines();
            rows.splice(+b.closest(".jp-l").dataset.i, 1);
            if (!rows.length) rows = [{ d: "", q: 1, u: "", r: "" }];
            draw();
          }),
      );
    sum();
  };
  $("jp-addl").onclick = () => {
    rows = jpLines().concat([{ d: "", q: 1, u: "", r: "" }]);
    draw();
    const ds = document.querySelectorAll("#jp-lines .jp-ld");
    ds[ds.length - 1].focus();
  };
  draw();
  if (it)
    armDelete(async () => {
      const saved = await jfSave(
        Object.assign({}, j, { items: (j.items || []).filter((x) => x.id !== it.id) }),
      );
      setTimeout(() => after(saved), 50);
    });
}
