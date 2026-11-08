/* ================= ACCOUNTS REVIEW: receipts and bills checked like Hubdoc – list, the document, the details ================= */
import { $, esc, gbp, iso, shortDay, toast } from "../core/helpers.js";
import { closeForm } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { blobUrl } from "../files/files.js";
import { AC_CATS, acAllTx, acCatKind, acUpdateTx } from "./acct-data.js";
import {
  acAddRcpts,
  acFileTradeRc,
  acLinkRcpt,
  acRcptMatch,
  acRcptParts,
  acReceipts,
  acSaveRcpt,
  acTradeRcptsHtml,
} from "./acct-receipts.js";
import { sdR2 } from "./sales-calc.js";
export { acRcptSheet, acRcptView };
/* Three panes on a wide screen (stacked on a phone): the receipts on the left (⚠ to check, ✓ done), the photo or PDF
   in the middle (zoom and rotate), and the details on the right – type (receipt, bill, credit note), supplier,
   reference, date, due date, total, tax rate (works out the VAT), paid with, and one category and site or several
   lines (Multiple) each with its own category and site, so one receipt can be split between jobs. Save & next moves
   to the next one to check. Unsaved typing survives the screen redrawing (the draft is kept until it's saved). */
const ACV = { zoom: 1, rot: 0, draft: null };
const ACV_TYPES = [
  ["receipt", "Receipt"],
  ["bill", "Bill / invoice"],
  ["credit", "Credit note"],
];
const ACV_RATES = [
  ["20", "20% VAT"],
  ["5", "5% VAT"],
  ["0", "0% (zero-rated)"],
  ["none", "No VAT"],
  ["mix", "Mixed / typed in"],
];
const ACV_PAID = {
  card: "Business card / bank",
  acct: "On account – pay later",
  cash: "Cash",
  own: "My own money",
};
const acvSites = () =>
  (S.sites || [])
    .filter((s) => !s.archived)
    .map((s) => s.name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
const acvCatOpts = (v) =>
  AC_CATS.filter((c) => c[2] === "out")
    .map(
      (c) =>
        `<option value="${c[0]}"${c[0] === (v || "mat") ? " selected" : ""}>${esc(c[1])}</option>`,
    )
    .join("");
const acvSiteOpts = (v) =>
  `<option value="">No site (office / yard / van)</option>` +
  [...new Set(acvSites().concat(v ? [v] : []))]
    .map((n) => `<option value="${esc(n)}"${n === v ? " selected" : ""}>${esc(n)}</option>`)
    .join("");
/* the VAT rate a receipt's figures look like */
function acvRateOf(r) {
  if (r.rate) return r.rate;
  const t = +r.total || 0,
    v = +r.vat || 0;
  if (!t) return "20";
  if (!v) return r.vatNo ? "0" : "none";
  if (Math.abs(v - sdR2((t * 20) / 120)) < 0.02) return "20";
  if (Math.abs(v - sdR2((t * 5) / 105)) < 0.02) return "5";
  return "mix";
}
const acvVatFor = (total, rate) =>
  /^(20|5)$/.test(rate) ? sdR2((total * +rate) / (100 + +rate)) : rate === "mix" ? null : 0;
/* filters for the list */
function acvShown() {
  const f = S.f.acrf || "all";
  return acReceipts().filter((r) =>
    f === "check"
      ? r.status !== "done"
      : f === "done"
        ? r.status === "done"
        : f === "nomatch"
          ? r.status === "done" && !r.tx && (r.paid === "card" || r.paid === "acct")
          : f === "nosite"
            ? r.status === "done" && !acRcptParts(r).some((p) => p.site)
            : true,
  );
}
/* the Receipts tab */
function acRcptView(tabs) {
  const list = acReceipts();
  const shown = acvShown();
  let sel = shown.find((r) => r.id === S.f.acsel) || list.find((r) => r.id === S.f.acsel);
  if (!sel) sel = shown.find((r) => r.status !== "done") || shown[0] || null;
  const outNoRcpt = acAllTx().filter(
    (t) =>
      t.amt < 0 &&
      acCatKind(t.cat) !== "move" &&
      !acReceipts().some((r) => r.tx === t.rec + "|" + t.id),
  );
  const f = S.f.acrf || "all";
  const icon = (r) =>
    r.status === "reading"
      ? `<span class="acv-st" title="Being read">⏳</span>`
      : r.status !== "done"
        ? `<span class="acv-st warn" title="To check">⚠</span>`
        : r.tx || r.paid === "cash" || r.paid === "own" || r.type === "credit"
          ? `<span class="acv-st ok" title="Done">✓</span>`
          : `<span class="acv-st" title="Waiting for the bank payment">•</span>`;
  $("main").innerHTML = `<div class="ac-page acv-page">${tabs}
    <div class="sd-acts"><span class="btn primary sd-filebtn">📷 Snap or add receipts<input type="file" class="ac-rfile" accept="image/*,application/pdf,.pdf" multiple aria-label="Snap or add receipts"></span></div>
    <div class="who">Take a photo of each receipt (or add the PDF of a bill). Claude reads the shop, date, total and VAT; you check it, book it to a site, and it's matched to the payment on your bank statement.</div>
    ${acTradeRcptsHtml()}
    <div class="sd-boxes">
      <button type="button" class="sd-box${list.some((r) => r.status !== "done") ? " warn" : ""}" data-f="check"><small>To check</small><b>${list.filter((r) => r.status !== "done").length}</b><span>receipts</span></button>
      <button type="button" class="sd-box" data-f="nomatch"><small>Not on a statement yet</small><b>${list.filter((r) => r.status === "done" && !r.tx && (r.paid === "card" || r.paid === "acct")).length}</b><span>card and account</span></button>
      <button type="button" class="sd-box" data-f="nosite"><small>Not booked to a site</small><b>${list.filter((r) => r.status === "done" && !acRcptParts(r).some((p) => p.site)).length}</b><span>receipts</span></button>
      <div class="sd-box"><small>Bank payments with no receipt</small><b>${outNoRcpt.length}</b><span>${gbp(outNoRcpt.reduce((a, t) => a - t.amt, 0))}</span></div>
    </div>
    <div class="acv-wrap">
      <aside class="acv-list" aria-label="Receipts">
        <div class="acv-tabs" id="ac-rf">${[
          ["all", "All"],
          ["check", "To check"],
          ["done", "Done"],
          ["nomatch", "Not matched"],
          ["nosite", "No site"],
        ]
          .map(
            ([k, l]) =>
              `<button type="button" data-v="${k}" aria-pressed="${f === k}">${l}</button>`,
          )
          .join("")}</div>
        ${
          shown.length
            ? shown
                .map(
                  (r) =>
                    `<button type="button" class="acv-item${sel && r.id === sel.id ? " on" : ""}" data-id="${esc(r.id)}">${r.assetId && !/pdf/.test(r.ctype || "") ? `<img src="${esc(blobUrl(r.assetId))}" alt="" loading="lazy">` : `<span class="acv-ph">${/pdf/.test(r.ctype || "") ? "📄" : "🧾"}</span>`}<span class="acv-it"><b>${esc(r.supplier || (r.status === "reading" ? "Reading…" : "Receipt"))}</b><small>${r.date ? "Date: " + esc(shortDay(r.date)) : ""}</small><small>${r.total ? (r.type === "credit" ? "-" : "") + gbp(r.total) : ""}${r.due && r.paid === "acct" ? " · due " + esc(shortDay(r.due)) : ""}</small></span>${icon(r)}</button>`,
                )
                .join("")
            : `<div class="empty"><strong>${list.length ? "Nothing here" : "No receipts yet"}</strong>${list.length ? "Try another filter." : "Snap your first receipt."}</div>`
        }
      </aside>
      ${sel ? acvDocHtml(sel) + acvFormHtml(sel, shown) : `<div class="acv-doc acv-none"><div class="empty"><strong>Pick a receipt</strong>It shows here with its details beside it.</div></div>`}
    </div>
  </div>`;
  document.querySelectorAll("#main .sd-box[data-f]").forEach(
    (b) =>
      (b.onclick = () => {
        S.f.acrf = S.f.acrf === b.dataset.f ? "all" : b.dataset.f;
        render();
      }),
  );
  $("ac-rf")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.acrf = b.dataset.v;
          render();
        }),
    );
  document.querySelectorAll("#main .acv-item").forEach(
    (b) =>
      (b.onclick = () => {
        S.f.acsel = b.dataset.id;
        ACV.zoom = 1;
        ACV.rot = 0;
        render();
        const d = document.querySelector("#main .acv-det");
        if (d && d.getBoundingClientRect().top > window.innerHeight * 0.6) d.scrollIntoView({ block: "start" });
      }),
  );
  document
    .querySelectorAll("#main .ac-trf")
    .forEach((x) => (x.onclick = () => acFileTradeRc(x.dataset.k)));
  const fi = document.querySelector("#main .ac-rfile");
  fi.onchange = async () => {
    const files = [...(fi.files || [])];
    fi.value = "";
    if (files.length) acAddRcpts(files);
  };
  if (sel) acvWire(sel, shown);
}
/* the document in the middle */
function acvDocHtml(r) {
  const pdf = /pdf/.test(r.ctype || "");
  const tf = `transform:rotate(${ACV.rot}deg) scale(${ACV.zoom})`;
  return `<section class="acv-doc" aria-label="The receipt">
    <div class="acv-tools">${pdf ? "" : `<button type="button" class="pillbtn" id="acv-zo" aria-label="Zoom out">➖ Zoom out</button><button type="button" class="pillbtn" id="acv-zi" aria-label="Zoom in">➕ Zoom in</button><button type="button" class="pillbtn" id="acv-rl" aria-label="Rotate left">↺ Rotate</button><button type="button" class="pillbtn" id="acv-rr" aria-label="Rotate right">↻ Rotate</button><button type="button" class="pillbtn" id="acv-rs">Reset</button>`}${r.assetId ? `<a class="pillbtn" href="${esc(blobUrl(r.assetId))}" target="_blank" rel="noopener">↗ Open</a>` : ""}</div>
    <div class="acv-view">${r.assetId ? (pdf ? `<iframe class="acv-pdf" src="${esc(blobUrl(r.assetId))}" title="The bill (PDF)"></iframe>` : `<img src="${esc(blobUrl(r.assetId))}" alt="The receipt" style="${tf}">`) : `<div class="empty"><strong>No picture</strong>This one was typed in.</div>`}</div>
  </section>`;
}
/* the details on the right */
function acvFormHtml(r0, shown) {
  const r = ACV.draft && ACV.draft.id === r0.id ? Object.assign({}, r0, ACV.draft.o) : r0;
  const idx = shown.findIndex((x) => x.id === r0.id);
  const rate = acvRateOf(r);
  const multi = !!r.multi;
  const lines =
    r.lines && r.lines.length
      ? r.lines
      : [{ desc: r.desc || "", amt: +r.total || 0, cat: r.cat || "mat", site: r.site || "" }];
  const sups = [
    ...new Set(
      acReceipts()
        .map((x) => x.supplier)
        .concat((S.suppliers || []).map((x) => x.name))
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const m = acRcptMatch(r);
  const linked = r.tx && acAllTx().find((t) => t.rec + "|" + t.id === r.tx);
  return `<section class="acv-det" aria-label="Details">
    <div class="acv-nav"><button type="button" class="btn" id="rr-prev"${idx > 0 ? "" : " disabled"}>‹ Prev</button><button type="button" class="btn primary" id="rr-save">${r0.status === "done" ? "Save" : "Save & next"}</button><button type="button" class="btn" id="rr-next"${idx >= 0 && idx < shown.length - 1 ? "" : " disabled"}>Next ›</button></div>
    ${r0.status === "check" && r0.supplier ? `<div class="notice">Claude read this – check it's right.</div>` : r0.status === "done" ? `<div class="who">Saved. Change anything and Save again.</div>` : ""}
    <div class="flabel">Details</div>
    <label for="rr-ty">Document type<select id="rr-ty">${ACV_TYPES.map(([k, l]) => `<option value="${k}"${k === (r.type || "receipt") ? " selected" : ""}>${l}</option>`).join("")}</select></label>
    <label for="rr-s">Supplier / shop<input id="rr-s" maxlength="80" list="rr-sl" value="${esc(r.supplier || "")}" autocomplete="off"></label><datalist id="rr-sl">${sups.map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
    <label for="rr-ref">Invoice / ref no.<input id="rr-ref" maxlength="40" value="${esc(r.ref || "")}"></label>
    <div class="grid2"><label for="rr-d">Date<input id="rr-d" type="date" value="${esc(r.date || iso(new Date()))}"></label><label for="rr-due">Due date<input id="rr-due" type="date" value="${esc(r.due || "")}"></label></div>
    <div class="grid2"><label for="rr-t">Total £<input id="rr-t" type="number" inputmode="decimal" step="0.01" value="${esc(r.total || "")}"></label><label for="rr-rate">Tax rate<select id="rr-rate">${ACV_RATES.map(([k, l]) => `<option value="${k}"${k === rate ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <label for="rr-v">VAT in it £<input id="rr-v" type="number" inputmode="decimal" step="0.01" value="${esc(r.vat || "")}"><span class="who" id="rr-vn">${r.vatNo ? "Their VAT number " + esc(r.vatNo) : ""}</span></label>
    <div class="acv-sum" id="rr-sum"></div>
    <label for="rr-p">Paid with<select id="rr-p">${Object.entries(ACV_PAID)
      .map(
        ([k, l]) =>
          `<option value="${k}"${k === (r.paid || "card") ? " selected" : ""}>${l}</option>`,
      )
      .join("")}</select></label>
    <div class="flabel">Booking</div>
    <div class="acv-tabs" id="rr-lm"><button type="button" data-v="1" aria-pressed="${!multi}">Single</button><button type="button" data-v="n" aria-pressed="${multi}">Multiple (split)</button></div>
    <div id="rr-one"${multi ? " hidden" : ""}>
      <label for="rr-c">Category<select id="rr-c">${acvCatOpts(r.cat)}</select></label>
      <label for="rr-site">Site<select id="rr-site">${acvSiteOpts(r.site || "")}</select></label>
    </div>
    <div id="rr-many"${multi ? "" : " hidden"}>
      <div id="rr-lines">${lines.map((l) => acvLineRow(l)).join("")}</div>
      <div class="actions"><button type="button" class="btn" id="rr-ladd">+ Add a line</button></div>
      <div class="who" id="rr-left"></div>
    </div>
    <label for="rr-x">What for<input id="rr-x" maxlength="120" value="${esc(r.desc || "")}" placeholder="e.g. Timber and screws"></label>
    <div class="who" id="rr-m">${r.type === "credit" ? "A credit note takes the money off your costs." : r.paid === "cash" || r.paid === "own" ? "Paid " + (r.paid === "cash" ? "in cash" : "with your own money") + " – counted as a cost by itself." : linked ? `✓ Matched to the bank payment on ${esc(shortDay(linked.date))}: ${esc(linked.desc)}` : m ? `Will be matched to the bank payment on ${esc(shortDay(m.date))}: ${esc(m.desc)} (${gbp(-m.amt)})` : "No bank payment for this amount yet – it'll be matched when the statement comes in."}</div>
    <div class="actions"><button type="button" class="linkdanger" id="rr-del">Delete this receipt</button></div>
  </section>`;
}
const acvLineRow = (l) =>
  `<div class="acv-line"><input class="rr-ld" maxlength="80" placeholder="What" aria-label="What" value="${esc(l.desc || "")}"><input class="rr-la" type="number" inputmode="decimal" step="0.01" placeholder="£ inc VAT" aria-label="Amount inc VAT £" value="${esc(l.amt || "")}"><select class="rr-lc" aria-label="Category">${acvCatOpts(l.cat)}</select><select class="rr-ls" aria-label="Site">${acvSiteOpts(l.site || "")}</select><button type="button" class="iconbtn rr-lx" aria-label="Remove line">✕</button></div>`;
/* read the form */
function acvRead() {
  const multi = $("rr-lm").querySelector('[aria-pressed="true"]').dataset.v === "n";
  const lines = [...document.querySelectorAll("#rr-lines .acv-line")].map((x) => ({
    desc: x.querySelector(".rr-ld").value.trim(),
    amt: sdR2(x.querySelector(".rr-la").value) || 0,
    cat: x.querySelector(".rr-lc").value,
    site: x.querySelector(".rr-ls").value,
  }));
  return {
    type: $("rr-ty").value,
    supplier: $("rr-s").value.trim(),
    ref: $("rr-ref").value.trim(),
    date: $("rr-d").value,
    due: $("rr-due").value,
    total: sdR2($("rr-t").value) || 0,
    rate: $("rr-rate").value,
    vat: sdR2($("rr-v").value) || 0,
    paid: $("rr-p").value,
    multi,
    lines: multi ? lines : [],
    cat: multi ? (lines[0] || {}).cat || "oexp" : $("rr-c").value,
    site: multi ? "" : $("rr-site").value,
    desc: $("rr-x").value.trim(),
  };
}
function acvWire(r, shown) {
  const im = document.querySelector("#main .acv-view img");
  const tf = () => im && (im.style.transform = `rotate(${ACV.rot}deg) scale(${ACV.zoom})`);
  const tool = (id, fn) => $(id) && ($(id).onclick = () => (fn(), tf()));
  tool("acv-zi", () => (ACV.zoom = Math.min(4, ACV.zoom * 1.25)));
  tool("acv-zo", () => (ACV.zoom = Math.max(0.4, ACV.zoom / 1.25)));
  tool("acv-rl", () => (ACV.rot -= 90));
  tool("acv-rr", () => (ACV.rot += 90));
  tool("acv-rs", () => ((ACV.zoom = 1), (ACV.rot = 0)));
  const sum = () => {
    const o = acvRead();
    const net = sdR2(o.total - o.vat);
    $("rr-sum").innerHTML =
      `<div class="drow"><span>Subtotal</span><span>${gbp(net)}</span></div><div class="drow"><span>VAT</span><span>${gbp(o.vat)}</span></div><div class="drow"><b>Total</b><b>${gbp(o.total)}</b></div>`;
    if (o.multi) {
      const left = sdR2(o.total - o.lines.reduce((a, l) => a + l.amt, 0));
      $("rr-left").innerHTML = left
        ? `<span class="acv-bad">${gbp(Math.abs(left))} ${left > 0 ? "still to split" : "too much"} – the lines must add up to the total</span>`
        : "✓ The lines add up to the total";
    }
  };
  const vatFromRate = () => {
    const v = acvVatFor(sdR2($("rr-t").value) || 0, $("rr-rate").value);
    if (v != null) $("rr-v").value = v || "";
  };
  $("rr-t").oninput = () => (vatFromRate(), sum());
  $("rr-rate").onchange = () => (vatFromRate(), sum());
  $("rr-v").oninput = () => {
    const t = sdR2($("rr-t").value) || 0,
      v = sdR2($("rr-v").value) || 0;
    const fit = ["20", "5"].find((k) => Math.abs(acvVatFor(t, k) - v) < 0.02);
    $("rr-rate").value = !v ? ($("rr-rate").value === "0" ? "0" : "none") : fit || "mix";
    sum();
  };
  const det = document.querySelector("#main .acv-det");
  /* keep what James has typed, so a redraw (new data arriving) does not lose it */
  const keep = () => (sum(), (ACV.draft = { id: r.id, o: acvRead() }));
  det.addEventListener("input", keep);
  det.addEventListener("change", keep);
  det.addEventListener(
    "click",
    (e) => e.target.closest("#rr-lm button, #rr-ladd, .rr-lx") && keep(),
  );
  $("rr-lm")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const n = b.dataset.v === "n";
          $("rr-lm")
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          $("rr-one").hidden = n;
          $("rr-many").hidden = !n;
          if (n) {
            /* start the split from the single booking */
            const first = document.querySelector("#rr-lines .acv-line");
            if (first && document.querySelectorAll("#rr-lines .acv-line").length === 1) {
              first.querySelector(".rr-lc").value = $("rr-c").value;
              first.querySelector(".rr-ls").value = $("rr-site").value;
              if (!+first.querySelector(".rr-la").value)
                first.querySelector(".rr-la").value = sdR2($("rr-t").value) || "";
            }
          }
          sum();
        }),
    );
  const wireLines = () =>
    document.querySelectorAll("#rr-lines .rr-lx").forEach(
      (x) =>
        (x.onclick = () => {
          if (document.querySelectorAll("#rr-lines .acv-line").length > 1)
            x.closest(".acv-line").remove();
          sum();
        }),
    );
  wireLines();
  $("rr-ladd").onclick = () => {
    const o = acvRead();
    const left = sdR2(o.total - o.lines.reduce((a, l) => a + l.amt, 0));
    $("rr-lines").insertAdjacentHTML(
      "beforeend",
      acvLineRow({
        amt: left > 0 ? left : "",
        cat: o.lines.length ? o.lines[o.lines.length - 1].cat : o.cat,
      }),
    );
    wireLines();
    sum();
  };
  const go = (d) => {
    const i = shown.findIndex((x) => x.id === r.id);
    const n = shown[i + d];
    if (n) {
      S.f.acsel = n.id;
      ACV.zoom = 1;
      ACV.rot = 0;
      render();
    }
  };
  $("rr-prev").onclick = () => go(-1);
  $("rr-next").onclick = () => go(1);
  $("rr-save").onclick = async () => {
    const o = acvRead();
    if (!(o.total > 0)) return toast("Put the total.");
    if (o.multi) {
      if (o.lines.some((l) => !(l.amt > 0)))
        return toast("Put an amount on each line (or remove it).");
      if (Math.abs(o.total - o.lines.reduce((a, l) => a + l.amt, 0)) > 0.005)
        return toast("The lines must add up to the total.");
    }
    if (o.vat > o.total) return toast("The VAT can't be more than the total.");
    const was = r.status;
    try {
      const saved = await acSaveRcpt(
        Object.assign({}, r, o, { date: o.date || iso(new Date()), status: "done" }),
      );
      const msg = await acLinkRcpt(saved);
      ACV.draft = null;
      toast(msg);
      if (was !== "done") {
        const nx = acvShown().find((x) => x.id !== r.id && x.status !== "done");
        if (nx) S.f.acsel = nx.id;
      }
      render();
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  };
  $("rr-del").onclick = async () => {
    const b = $("rr-del");
    if (!b.dataset.armed) {
      b.dataset.armed = "1";
      b.textContent = "Tap again to delete it";
      return;
    }
    {
      try {
        if (r.tx) await acUpdateTx({ [r.tx]: { rcpt: "" } });
        await S.db.doc("todos/" + r.id).delete();
        ACV.draft = null;
        S.f.acsel = "";
        toast("Receipt deleted (in Deleted items for 30 days)");
        render();
      } catch (e) {
        toast("Couldn't delete");
      }
    }
  };
  sum();
  if (!(ACV.draft && ACV.draft.id === r.id)) ACV.draft = null;
}
/* open a receipt (from a bank payment, a supplier file, or after filing one): the Receipts tab with it showing */
function acRcptSheet(r) {
  if (!r) return;
  S.otab = "accounts";
  S.f.act = "rcpt";
  S.f.acsel = r.id;
  if (!acvShown().some((x) => x.id === r.id)) S.f.acrf = "all";
  if (!$("sheet").hidden) closeForm();
  render();
  const d = document.querySelector("#main .acv-det");
  if (d && d.getBoundingClientRect().top > window.innerHeight * 0.6) d.scrollIntoView({ block: "start" });
}
