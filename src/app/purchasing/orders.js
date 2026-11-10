/* ================= ORDERS: purchase orders from the job, delivery ticked off, the merchant's invoice matched to the order ================= */
import { $, esc, gbp, iso, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { openViewer } from "../core/viewer.js";
import { openFile } from "../files/in-app-files.js";
import { sentToast } from "../files/outbox.js";
import { rfqListHtml, rfqWireList } from "./price-ask.js";
import { plSupName, poAll, poOrdersSheet, poPdf, poSave, poSaveOrKeep } from "./price-order.js";
import { supMaster } from "./suppliers.js";
import { ukDate } from "../safety/rams-maker.js";
import { shrinkImage } from "../safety/training.js";
import { acReceipts, acSaveRcpt } from "../sales/acct-receipts.js";
import { rcsNorm } from "../sales/receipt-smarts.js";
import { sdR2 } from "../sales/sales-calc.js";
export { pordView };
/* Merchants › 📦 Orders: every purchase order (the ones made from a drawing's quantities, and new ones made here for a
   job – lines picked from the merchant's price list or typed), newest first, with where it's got to: draft, sent,
   part delivered, delivered, invoiced. 📥 Delivery: tick off what came (all of it, or how many of each line), with a
   note for anything short or damaged and a photo of the delivery note. 🧾 Invoice: pick the merchant's bill from your
   receipts and see it against the order – what was ordered, what came, what's been charged, and the difference.
   Stored on the purchaseorder record: deliveries [{ date, got { lineIndex: qty }, note, photo }], rcpt (the receipt
   id), invoicedAt. */
const PORD_ST = {
  draft: "Draft",
  sent: "Sent",
  part: "Part delivered",
  got: "Delivered",
  inv: "Invoiced",
};
function pordGot(o) {
  const got = (o.lines || []).map(() => 0);
  (o.deliveries || []).forEach((d) =>
    Object.entries(d.got || {}).forEach(([i, q]) => (got[+i] = (got[+i] || 0) + (+q || 0))),
  );
  return got;
}
function pordStatus(o) {
  if (o.rcpt) return "inv";
  const got = pordGot(o);
  if ((o.deliveries || []).length)
    return got.every((q, i) => q >= (+o.lines[i].q || 0)) ? "got" : "part";
  return o.status === "sent" ? "sent" : "draft";
}
const pordGotValue = (o) => sdR2(pordGot(o).reduce((a, q, i) => a + q * (+o.lines[i].p || 0), 0));
function pordView(seg) {
  const L = poAll();
  $("main").innerHTML = `${seg}
    <div class="actions"><button type="button" class="btn primary" id="pord-new">+ New order for a job</button><button type="button" class="btn" id="rfq-new">💬 Ask merchants for prices</button></div>
    ${rfqListHtml()}
    ${
      L.map((o) => {
        const st = pordStatus(o);
        return `<div class="card pord-row"><div class="pord-h"><b>${esc(o.number || "")} · ${esc(o.supName || "")}</b><span class="tag ${st === "inv" || st === "got" ? "ok" : st === "part" ? "bad" : "day"}">${esc(PORD_ST[st])}</span></div>
        <div class="who">${esc(o.site || "No job")} · ${(o.lines || []).length} line${(o.lines || []).length === 1 ? "" : "s"} · ${gbp(o.net || 0)} + VAT${o.sentAt ? " · sent " + esc(shortDay(iso(new Date(o.sentAt)))) : ""}</div>
        <div class="actions"><button type="button" class="btn pord-open" data-id="${esc(o.id)}">Open</button>${st !== "inv" ? `<button type="button" class="btn${st === "sent" || st === "part" ? " primary" : ""} pord-del" data-id="${esc(o.id)}">📥 Delivery</button>` : ""}${st === "got" || st === "part" || st === "inv" ? `<button type="button" class="btn${st === "got" ? " primary" : ""} pord-inv" data-id="${esc(o.id)}">🧾 ${st === "inv" ? "The invoice" : "Match the invoice"}</button>` : ""}</div></div>`;
      }).join("") ||
      `<div class="empty"><strong>No orders yet</strong>Make one here for a job, or price a drawing's quantities and order from that.</div>`
    }`;
  const find = (b) => L.find((x) => x.id === b.dataset.id);
  $("pord-new").onclick = () => pordNew();
  rfqWireList();
  document.querySelectorAll(".pord-open").forEach((b) => (b.onclick = () => pordOpen(find(b))));
  document.querySelectorAll(".pord-del").forEach((b) => (b.onclick = () => pordDelivery(find(b))));
  document.querySelectorAll(".pord-inv").forEach((b) => (b.onclick = () => pordInvoice(find(b))));
}
function pordOpen(o) {
  if (!o) return;
  const got = pordGot(o);
  openViewer(`<div class="pord-v"><div class="vhead"><b>${esc(o.number)} · ${esc(o.supName)}</b></div><div class="who">${esc(o.site || "")} · ${esc(PORD_ST[pordStatus(o)])}</div>
    <table class="pord-tbl"><thead><tr><th>Item</th><th>Ordered</th><th>Came</th><th>Price</th></tr></thead><tbody>${(
      o.lines || []
    )
      .map(
        (l, i) =>
          `<tr${got[i] < l.q ? ' class="pord-short"' : ""}><td>${esc(l.d)}</td><td>${esc(l.q)} ${esc(l.u || "")}</td><td>${got[i]}</td><td>${gbp(l.p)}</td></tr>`,
      )
      .join("")}</tbody></table>
    ${(o.deliveries || []).map((d) => `<div class="drow"><span>📥 ${esc(ukDate(d.date))}${d.note ? " · " + esc(d.note) : ""}</span>${d.photo ? `<button type="button" class="linkbtn pord-ph" data-a="${esc(d.photo)}">Delivery note</button>` : ""}</div>`).join("")}
    <div class="actions"><button type="button" class="btn" id="pord-pdf">📄 Order PDF</button></div></div>`);
  document
    .querySelectorAll(".pord-ph")
    .forEach((b) => (b.onclick = () => openFile(b.dataset.a, "delivery-note.jpg", "image/jpeg")));
  $("pord-pdf").onclick = async () => {
    try {
      await S.dl.save({ filename: `Order ${o.number} ${o.supName}.pdf`, data: await poPdf(o) });
    } catch (e) {
      toast("Couldn't make the PDF");
    }
  };
}
function pordNew() {
  const sups = supMaster().filter((x) => x.name);
  const sites = siteNames();
  let lines = [{ d: "", q: 1, u: "", p: 0 }];
  openSheet(
    `<h3 id="sheettitle">📦 New order</h3>
    <div class="grid2"><label for="pord-site">For the job<select id="pord-site"><option value="">Pick the job…</option>${sites.map((s) => `<option>${esc(s)}</option>`).join("")}</select></label><label for="pord-sup">Merchant<select id="pord-sup"><option value="">Pick the merchant…</option>${sups.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("")}</select></label></div>
    <div class="flabel">What to order</div><div id="pord-lines"></div><datalist id="pord-pl"></datalist>
    <div class="actions"><button type="button" class="btn" id="pord-add">+ Another line</button></div>
    ${formFoot(false, "Make the order")}`,
    async () => {
      const site = $("pord-site").value,
        sup = $("pord-sup").value;
      if (!site) return showErr("Which job is it for?");
      if (!sup) return showErr("Which merchant?");
      const ls = lines
        .filter((l) => String(l.d).trim() && +l.q > 0)
        .map((l) => ({
          d: String(l.d).trim(),
          q: +l.q,
          u: l.u || "",
          p: sdR2(+l.p || 0),
          for: "",
        }));
      if (!ls.length) return showErr("Add at least one thing to order");
      try {
        const o = await poSave({ site, sup, supName: plSupName(sup), lines: ls, status: "draft" });
        closeForm();
        poOrdersSheet([o]);
      } catch (e) {
        showErr("Couldn't save – check your connection");
      }
    },
    "pord-site",
  );
  const items = () => {
    const pl = (S.priceLists || []).find((x) => x.sup === $("pord-sup").value);
    return (pl && pl.items) || [];
  };
  const draw = () => {
    $("pord-lines").innerHTML = lines
      .map(
        (l, i) =>
          `<div class="pord-line" data-i="${i}"><input class="pord-d" list="pord-pl" maxlength="120" placeholder="e.g. 7N dense block 100mm" value="${esc(l.d)}" aria-label="Item ${i + 1}"><input class="pord-q" type="number" inputmode="decimal" min="0" step="any" value="${esc(l.q)}" aria-label="How many"><input class="pord-u" maxlength="10" placeholder="each" value="${esc(l.u)}" aria-label="Unit"><input class="pord-p" type="number" inputmode="decimal" min="0" step="0.01" placeholder="£" value="${esc(l.p || "")}" aria-label="Price each"><button type="button" class="linkdanger pord-x" aria-label="Remove line ${i + 1}">✕</button></div>`,
      )
      .join("");
    $("pord-lines")
      .querySelectorAll(".pord-line")
      .forEach((r) => {
        const l = lines[+r.dataset.i];
        r.querySelector(".pord-d").oninput = (e) => {
          l.d = e.target.value;
          const it = items().find((x) => x.n === l.d);
          if (it) {
            l.p = +it.p || 0;
            l.u = it.u || l.u;
            r.querySelector(".pord-p").value = l.p || "";
            r.querySelector(".pord-u").value = l.u || "";
          }
        };
        r.querySelector(".pord-q").oninput = (e) => (l.q = e.target.value);
        r.querySelector(".pord-u").oninput = (e) => (l.u = e.target.value);
        r.querySelector(".pord-p").oninput = (e) => (l.p = e.target.value);
        r.querySelector(".pord-x").onclick = () => {
          lines.splice(+r.dataset.i, 1);
          if (!lines.length) lines.push({ d: "", q: 1, u: "", p: 0 });
          draw();
        };
      });
  };
  draw();
  $("pord-add").onclick = () => {
    lines.push({ d: "", q: 1, u: "", p: 0 });
    draw();
  };
  $("pord-sup").onchange = () => {
    $("pord-pl").innerHTML = items()
      .map((x) => `<option value="${esc(x.n || "")}">`)
      .join("");
  };
}
function pordDelivery(o) {
  if (!o) return;
  const got = pordGot(o);
  let photo = null;
  openSheet(
    `<h3 id="sheettitle">📥 Delivery: ${esc(o.number)} · ${esc(o.supName)}</h3>
    <label for="pord-dd">Delivered on<input id="pord-dd" type="date" value="${iso(new Date())}"></label>
    <div class="flabel">How many came (still to come shown)</div>
    ${(o.lines || [])
      .map((l, i) => {
        const left = Math.max(0, (+l.q || 0) - got[i]);
        return `<div class="pord-dl"><span>${esc(l.d)}<br><span class="who">${left} ${esc(l.u || "")} still to come of ${esc(l.q)}</span></span><input class="pord-g" data-i="${i}" type="number" inputmode="decimal" min="0" step="any" value="${left}" aria-label="How many ${esc(l.d)} came"></div>`;
      })
      .join("")}
    <label for="pord-note">Anything short or damaged? (optional)<input id="pord-note" maxlength="200" placeholder="e.g. 2 blocks broken, 1 bag short"></label>
    <span class="btn pl-filebtn">📷 Photo of the delivery note<input type="file" id="pord-photo" accept="image/*" capture="environment" aria-label="Photo of the delivery note"></span><div class="who" id="pord-phn"></div>
    ${formFoot(false, "Save the delivery")}`,
    async () => {
      const g = {};
      document.querySelectorAll(".pord-g").forEach((x) => {
        const q = +x.value || 0;
        if (q > 0) g[x.dataset.i] = q;
      });
      if (!Object.keys(g).length) return showErr("Nothing came? Put how many of each arrived");
      $("f-save").disabled = true;
      try {
        const small = photo ? await shrinkImage(photo, 1600) : null;
        const d = {
          date: $("pord-dd").value || iso(new Date()),
          got: g,
          note: $("pord-note").value.trim(),
          photo: "",
        };
        const dels = (o.deliveries || []).concat([d]);
        const { out: o2, sent } = await poSaveOrKeep(
          Object.assign({}, o, { deliveries: dels }),
          small
            ? [
                {
                  blob: small,
                  name: "delivery-note.jpg",
                  field: "deliveries." + (dels.length - 1) + ".photo",
                },
              ]
            : [],
        );
        closeForm();
        if (sent === "queued") sentToast(sent, "Delivery");
        else
          toast(pordStatus(o2) === "got" ? "Everything's arrived" : "Saved – some still to come");
        render();
      } catch (e) {
        $("f-save").disabled = false;
        showErr("Couldn't save – check your connection");
      }
    },
    "pord-dd",
  );
  $("pord-photo").onchange = (e) => {
    photo = (e.target.files || [])[0] || null;
    $("pord-phn").textContent = photo ? "✓ Photo added" : "";
  };
}
function pordInvoice(o) {
  if (!o) return;
  const k = rcsNorm(o.supName);
  const bills = acReceipts().filter(
    (r) =>
      r.status === "done" &&
      (r.id === o.rcpt || (rcsNorm(r.supplier) === k && !poAll().some((x) => x.rcpt === r.id))),
  );
  const cur = bills.find((r) => r.id === o.rcpt);
  const show = (r) => {
    const net = sdR2((+r.total || 0) - (+r.vat || 0));
    const came = pordGotValue(o);
    const diff = sdR2(net - came);
    return `<div class="pord-cmp"><div class="drow"><span>Ordered</span><b>${gbp(o.net || 0)}</b></div><div class="drow"><span>What came (at the order prices)</span><b>${gbp(came)}</b></div><div class="drow"><span>Their invoice${r.ref ? " " + esc(r.ref) : ""} (before VAT)</span><b>${gbp(net)}</b></div><div class="drow sd-due"><span><b>${Math.abs(diff) < 0.01 ? "✓ It matches" : diff > 0 ? "Charged more than what came" : "Charged less than what came"}</b></span><b>${Math.abs(diff) < 0.01 ? "" : gbp(Math.abs(diff))}</b></div></div>`;
  };
  openSheet(
    `<h3 id="sheettitle">🧾 ${esc(o.number)}: the invoice</h3>
    ${
      bills.length
        ? `<label for="pord-rc">${esc(o.supName)}'s bill<select id="pord-rc">${cur ? "" : `<option value="">Pick the bill…</option>`}${bills.map((r) => `<option value="${esc(r.id)}"${r.id === o.rcpt ? " selected" : ""}>${esc(ukDate(r.date))} · ${esc(r.ref || r.desc || "")} · ${gbp(+r.total || 0)}</option>`).join("")}</select></label><div id="pord-cmp">${cur ? show(cur) : ""}</div>`
        : `<div class="notice">No bills from ${esc(o.supName)} in your receipts yet. Add their invoice on Accounts › Receipts, then match it here.</div>`
    }
    ${formFoot(false, cur ? "Save" : "Match it to this order")}`,
    async () => {
      const id = $("pord-rc") ? $("pord-rc").value : "";
      if (!id) return closeForm();
      try {
        await poSave(Object.assign({}, o, { rcpt: id, invoicedAt: Date.now() }));
        const r = bills.find((x) => x.id === id);
        if (r && !r.site && o.site) await acSaveRcpt(Object.assign({}, r, { site: o.site }));
        closeForm();
        toast("Matched to the order");
        render();
      } catch (e) {
        showErr("Couldn't save");
      }
    },
    "pord-rc",
  );
  if ($("pord-rc"))
    $("pord-rc").onchange = () => {
      const r = bills.find((x) => x.id === $("pord-rc").value);
      $("pord-cmp").innerHTML = r ? show(r) : "";
    };
}
