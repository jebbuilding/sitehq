/* ================= ACCOUNTS RECEIPTS: snap a receipt, Claude reads it, it's matched to the bank payment ================= */
import { $, esc, gbp, iso, parse, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { blobUrl, uploadFile } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { shrinkImage } from "../safety/training.js";
import { AC_CATS, acAllTx, acCatKind, acUpdateTx } from "./acct-data.js";
import { sdR2 } from "./sales-calc.js";
export { acMatchWaiting, acRcptSheet, acRcptView, acReceipts };
/* Like Hubdoc: take a photo (or several), Claude reads the shop, date, total, VAT and VAT number and suggests a
   category; James checks it and saves. Each receipt is matched to the bank payment of the same amount within a
   week (the payment gets the receipt, its VAT and the category); receipts paid in cash or with his own money count
   as costs by themselves. Reading needs Claude (the live app); without it the receipt is typed in by hand.
   Owner-private records: todos/rc-{id} (kind "acrcpt"): { assetId, supplier, date, total, vat, vatNo, cat, paid
   ("card"|"cash"|"own"), desc, note, status ("reading"|"check"|"done"), tx ("rec|id" of the matched payment) }. */
const AC_PAID = { card: "Business card / bank", cash: "Cash", own: "My own money" };
const acReceipts = () =>
  (S.acRcpts || [])
    .slice()
    .sort(
      (a, b) => (b.date || "").localeCompare(a.date || "") || (b.created || 0) - (a.created || 0),
    );
async function acSaveRcpt(r) {
  const rec = Object.assign({}, r, { kind: "acrcpt", updated: Date.now() });
  const id = rec.id || "rc-" + newId();
  delete rec.id;
  if (!rec.created) rec.created = Date.now();
  await S.db.doc("todos/" + id).set(rec);
  return Object.assign({ id }, rec);
}
/* the bank payment this receipt is for: money out of the same amount, within 7 days, not already holding a receipt */
function acRcptMatch(r) {
  if (!(+r.total > 0) || !r.date) return null;
  const d0 = parse(r.date).getTime();
  const taken = new Set(
    acReceipts()
      .filter((x) => x.tx && x.id !== r.id)
      .map((x) => x.tx),
  );
  return (
    acAllTx()
      .filter(
        (t) =>
          t.amt < 0 &&
          Math.abs(Math.abs(t.amt) - +r.total) < 0.015 &&
          !taken.has(t.rec + "|" + t.id),
      )
      .map((t) => Object.assign({ gap: Math.abs(parse(t.date).getTime() - d0) / 864e5 }, t))
      .filter((t) => t.gap <= 7)
      .sort((a, b) => a.gap - b.gap)[0] || null
  );
}
/* ask Claude to read the photo; resolves the fields it found, or null */
async function acReadRcpt(blob) {
  let sample = null;
  try {
    sample = await window.claude.use("sample");
  } catch (e) {}
  if (!sample) return null;
  try {
    const lim = await sample.limits().catch(() => null);
    if (!lim || !lim.images) return null;
  } catch (e) {
    return null;
  }
  const cats = AC_CATS.filter((c) => c[2] === "out")
    .map((c) => `${c[0]} = ${c[1]}`)
    .join("; ");
  const prompt = `This photo is a receipt or bill for a UK building company. Read it and reply with JSON only, no other words:
{"supplier": shop or company name, "date": "YYYY-MM-DD", "total": total paid as a number, "vat": VAT amount as a number (0 if none shown), "vatNo": the seller's VAT number or "", "desc": a few words on what was bought, "cat": one of these codes: ${cats}, "paid": "card" or "cash" (as printed, else "card")}
If something can't be read, use "" (or 0 for numbers). UK dates are day/month/year.`;
  const j = await sample.json(prompt, { images: [blob], modelTier: "default" });
  if (!j || typeof j !== "object") return null;
  const num = (v) => {
    const n = +String(v == null ? "" : v).replace(/[£,\s]/g, "");
    return isNaN(n) ? 0 : sdR2(n);
  };
  return {
    supplier: String(j.supplier || "").slice(0, 80),
    date: /^\d{4}-\d{2}-\d{2}$/.test(j.date || "") ? j.date : "",
    total: num(j.total),
    vat: num(j.vat),
    vatNo: String(j.vatNo || "")
      .replace(/\s/g, "")
      .slice(0, 14),
    desc: String(j.desc || "").slice(0, 120),
    cat: AC_CATS.some((c) => c[0] === j.cat && c[2] === "out") ? j.cat : "oexp",
    paid: j.paid === "cash" ? "cash" : "card",
  };
}
/* the Receipts tab */
function acRcptView(tabs) {
  const list = acReceipts();
  const f = S.f.acrf || "all";
  const shown = list.filter(
    (r) =>
      f === "all" ||
      (f === "check"
        ? r.status !== "done"
        : f === "nomatch"
          ? r.status === "done" && !r.tx && r.paid === "card"
          : true),
  );
  const outNoRcpt = acAllTx().filter(
    (t) =>
      t.amt < 0 &&
      acCatKind(t.cat) !== "move" &&
      !acReceipts().some((r) => r.tx === t.rec + "|" + t.id),
  );
  $("main").innerHTML = `<div class="ac-page">${tabs}
    <div class="sd-acts"><span class="btn primary sd-filebtn">📷 Snap or add receipts<input type="file" class="ac-rfile" accept="image/*" multiple aria-label="Snap or add receipts"></span></div>
    <div class="who">Take a photo of each receipt. Claude reads the shop, date, total and VAT; you check it, and it's matched to the payment on your bank statement.</div>
    <div class="sd-boxes">
      <button type="button" class="sd-box${list.some((r) => r.status !== "done") ? " warn" : ""}" data-f="check"><small>To check</small><b>${list.filter((r) => r.status !== "done").length}</b><span>receipts</span></button>
      <button type="button" class="sd-box" data-f="nomatch"><small>Not on a statement yet</small><b>${list.filter((r) => r.status === "done" && !r.tx && r.paid === "card").length}</b><span>card receipts</span></button>
      <div class="sd-box"><small>Bank payments with no receipt</small><b>${outNoRcpt.length}</b><span>${gbp(outNoRcpt.reduce((a, t) => a - t.amt, 0))}</span></div>
    </div>
    <div class="seg" id="ac-rf">${[
      ["all", "All"],
      ["check", "To check"],
      ["nomatch", "Not matched"],
    ]
      .map(
        ([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${f === k}">${l}</button>`,
      )
      .join("")}</div>
    ${
      shown.length
        ? `<div class="ac-rgrid">${shown
            .map(
              (r) =>
                `<button type="button" class="ac-rc${r.status !== "done" ? " todo" : ""}" data-id="${esc(r.id)}">${r.assetId ? `<img src="${esc(blobUrl(r.assetId))}" alt="" loading="lazy">` : `<span class="ac-rcph">🧾</span>`}<span><b>${esc(r.supplier || (r.status === "reading" ? "Reading…" : "Receipt"))}</b><small>${r.date ? esc(shortDay(r.date)) : ""}${r.total ? " · " + gbp(r.total) : ""}${r.vat ? " · VAT " + gbp(r.vat) : ""}</small><small>${r.status === "done" ? (r.tx ? "✓ matched to the bank" : esc(AC_PAID[r.paid] || "")) : r.status === "reading" ? "Claude is reading it…" : "⚠ check and save"}</small></span></button>`,
            )
            .join("")}</div>`
        : `<div class="empty"><strong>${list.length ? "Nothing here" : "No receipts yet"}</strong>${list.length ? "Try another filter." : "Snap your first receipt."}</div>`
    }
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
  document
    .querySelectorAll("#main .ac-rc")
    .forEach(
      (b) => (b.onclick = () => acRcptSheet(acReceipts().find((r) => r.id === b.dataset.id))),
    );
  const fi = document.querySelector("#main .ac-rfile");
  fi.onchange = async () => {
    const files = [...(fi.files || [])];
    fi.value = "";
    if (files.length) acAddRcpts(files);
  };
}
/* new photos: save each straight away, then let Claude read them one by one */
async function acAddRcpts(files) {
  const made = [];
  for (const f of files) {
    try {
      const blob = /^image\//.test(f.type) ? await shrinkImage(f, 1800) : f;
      const a = await uploadFile(blob, f.name || "receipt.jpg");
      made.push([
        await acSaveRcpt({
          assetId: a.id,
          status: "reading",
          paid: "card",
          date: "",
          total: 0,
          vat: 0,
        }),
        blob,
      ]);
    } catch (e) {
      toast("Couldn't save a photo. Check your connection.");
    }
  }
  S.f.act = "rcpt";
  render();
  let read = 0,
    last = null;
  for (const [r, blob] of made) {
    let got = null;
    try {
      got = await acReadRcpt(blob);
    } catch (e) {
      got = null;
    }
    if (got) read++;
    last = await acSaveRcpt(Object.assign({}, r, got || {}, { status: "check" }));
  }
  toast(
    read
      ? `Claude read ${read} receipt${read === 1 ? "" : "s"} – check ${read === 1 ? "it" : "them"} and save`
      : made.length
        ? "Saved. Type in the details (Claude can read receipts in the live app)"
        : "",
  );
  render();
  if (made.length === 1 && last) acRcptSheet(last);
}
/* check and save one receipt */
function acRcptSheet(r) {
  if (!r) return;
  const m = acRcptMatch(r);
  const linked = r.tx && acAllTx().find((t) => t.rec + "|" + t.id === r.tx);
  openSheet(
    `<h3 id="sheettitle">🧾 Receipt</h3>
    ${r.assetId ? `<a href="${esc(blobUrl(r.assetId))}" target="_blank" rel="noopener" class="ac-rbig"><img src="${esc(blobUrl(r.assetId))}" alt="The receipt"></a>` : ""}
    ${r.status === "check" && r.supplier ? `<div class="notice">Claude read this – check it's right.</div>` : ""}
    <div class="grid2"><label for="rr-s">Shop / supplier<input id="rr-s" maxlength="80" value="${esc(r.supplier || "")}"></label><label for="rr-d">Date<input id="rr-d" type="date" value="${esc(r.date || iso(new Date()))}"></label></div>
    <div class="grid2"><label for="rr-t">Total paid £<input id="rr-t" type="number" inputmode="decimal" step="0.01" value="${esc(r.total || "")}"></label><label for="rr-v">VAT in it £<input id="rr-v" type="number" inputmode="decimal" step="0.01" value="${esc(r.vat || "")}"><span class="who" id="rr-vn">${r.vatNo ? "Their VAT number " + esc(r.vatNo) : ""}</span></label></div>
    <div class="grid2"><label for="rr-c">Category<select id="rr-c">${AC_CATS.filter(
      (c) => c[2] === "out",
    )
      .map(
        (c) =>
          `<option value="${c[0]}"${c[0] === (r.cat || "mat") ? " selected" : ""}>${esc(c[1])}</option>`,
      )
      .join("")}</select></label><label for="rr-p">Paid with<select id="rr-p">${Object.entries(
      AC_PAID,
    )
      .map(
        ([k, l]) =>
          `<option value="${k}"${k === (r.paid || "card") ? " selected" : ""}>${l}</option>`,
      )
      .join("")}</select></label></div>
    <label for="rr-x">What for<input id="rr-x" maxlength="120" value="${esc(r.desc || "")}" placeholder="e.g. Timber and screws, Marine Way"></label>
    <div class="who" id="rr-m">${linked ? `✓ Matched to the bank payment on ${esc(shortDay(linked.date))}: ${esc(linked.desc)}` : m ? `Will be matched to the bank payment on ${esc(shortDay(m.date))}: ${esc(m.desc)} (${gbp(-m.amt)})` : "No bank payment for this amount yet – it'll be matched when the statement comes in."}</div>
    ${formFoot(true, "Save")}`,
    async () => {
      const total = sdR2($("rr-t").value);
      if (!(total > 0)) return showErr("Put the total paid.");
      const o = Object.assign({}, r, {
        supplier: $("rr-s").value.trim(),
        date: $("rr-d").value || iso(new Date()),
        total,
        vat: sdR2($("rr-v").value) || 0,
        cat: $("rr-c").value,
        paid: $("rr-p").value,
        desc: $("rr-x").value.trim(),
        status: "done",
      });
      try {
        const saved = await acSaveRcpt(o);
        const msg = await acLinkRcpt(saved);
        closeForm();
        toast(msg);
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
  );
  if ($("f-del"))
    $("f-del").onclick = async () => {
      try {
        if (r.tx) await acUpdateTx({ [r.tx]: { rcpt: "" } });
        await S.db.doc("todos/" + r.id).delete();
        closeForm();
        toast("Receipt deleted (in Deleted items for 30 days)");
        render();
      } catch (e) {
        toast("Couldn't delete");
      }
    };
}
/* put the receipt on its bank payment: category, VAT and a link to the photo */
async function acLinkRcpt(r) {
  if (r.paid !== "card") {
    if (r.tx) await acUpdateTx({ [r.tx]: { rcpt: "" } });
    if (r.tx) await acSaveRcpt(Object.assign({}, r, { tx: "" }));
    return (
      "Receipt saved (counted as a cost paid " +
      (r.paid === "cash" ? "in cash" : "with your own money") +
      ")"
    );
  }
  const t = r.tx ? acAllTx().find((x) => x.rec + "|" + x.id === r.tx) : acRcptMatch(r);
  if (!t) return "Receipt saved – it'll be matched when the bank statement comes in";
  const k = t.rec + "|" + t.id;
  await acUpdateTx({
    [k]: { cat: r.cat, vat: r.vat || 0, rcpt: r.id, note: t.note || r.desc || "" },
  });
  if (r.tx !== k) await acSaveRcpt(Object.assign({}, r, { tx: k }));
  return "Receipt saved and matched to the bank payment on " + shortDay(t.date);
}
/* after a statement comes in: match receipts waiting for their payment */
async function acMatchWaiting() {
  let n = 0;
  for (const r of acReceipts().filter((x) => x.status === "done" && x.paid === "card" && !x.tx)) {
    const t = acRcptMatch(r);
    if (!t) continue;
    await acUpdateTx({ [t.rec + "|" + t.id]: { cat: r.cat, vat: r.vat || 0, rcpt: r.id } });
    await acSaveRcpt(Object.assign({}, r, { tx: t.rec + "|" + t.id }));
    n++;
  }
  return n;
}
