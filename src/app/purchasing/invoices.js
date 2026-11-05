/* ================= INVOICES ================= */
import { pickField, pickVal } from "../core/fields.js";
import { $, addDays, esc, gbp, iso, monday, shortDay, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, setEditing, setFormType, showErr } from "../core/sheet.js";
import { S, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { blobUrl, isImg, uploadErr } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId, submitJob } from "../files/outbox.js";
import { nameOf } from "../owner/owner.js";
import { isInv } from "./materials-receipts.js";
import { shrinkImage } from "../safety/training.js";
export { empInvoices, invCard, invDetail, openInvoice, wireInvoices };
const INV_ST = {
  sent: ["Sent", "day"],
  received: ["Received", ""],
  approved: ["Approved", "warn"],
  query: ["Query", "bad"],
  paid: ["Paid", "ok"],
};
const INV_FLOW = [
  ["sent", "Sent", "Sent by the trade"],
  ["received", "Received", "You've got it"],
  ["approved", "Approved", "Checked and OK to pay"],
  ["paid", "Paid", "Money sent"],
];
function invCard(v, owner, who) {
  const st = INV_ST[v.status || "sent"] || INV_ST.sent;
  return `<div class="entry inv" data-i="${esc(v.id)}" data-w="${esc(who || "")}"><div class="main">
    <div class="job"><span class="tag ${st[1]}">${st[0]}</span>Invoice ${esc(v.number || "")}${owner ? ` <span class="who">· ${esc(nameOf(who))}</span>` : ""}</div>
    <div class="sub">Sent ${stamp(v.sentAt)}${v.deliveredAt && v.deliveredAt - v.sentAt > 600000 ? ` (arrived ${stamp(v.deliveredAt)}, no signal when sent)` : ""}${v.invDate ? ` · dated ${shortDay(v.invDate)}` : ""}${v.from && v.to ? ` · work ${shortDay(v.from)} – ${shortDay(v.to)}` : ""}${v.site ? ` · ${esc(v.site)}` : ""}</div>
    ${v.status === "paid" && v.paidAt ? `<div class="sub">Paid ${stamp(v.paidAt)}</div>` : ""}
    ${v.notes ? `<div class="sub">${esc(v.notes)}</div>` : ""}
    ${v.status === "query" && v.query ? `<div class="sub" style="color:var(--danger)">Query: ${esc(v.query)}</div>` : ""}
    <div class="filerow"><button type="button" class="pillbtn v-view">View details${owner ? " & stage" : ""} ›</button><button type="button" class="pillbtn v-open">Open ${esc(v.fileName || "file")}</button></div></div>
    ${v.amount ? `<div class="amt">${gbp(v.amount)}</div>` : ""}</div>`;
}
function wireInvoices(list, owner) {
  $("main")
    .querySelectorAll(".inv")
    .forEach((row) => {
      const v = list.find((x) => x.id === row.dataset.i && (!owner || x.who === row.dataset.w));
      if (!v) return;
      row.querySelector(".v-open").onclick = (e) => {
        e.stopPropagation();
        openFile(v.assetId, v.fileName || "invoice", v.contentType);
      };
      const open = () => invDetail(v, owner, owner ? row.dataset.w : S.me);
      row.querySelector(".v-view").onclick = (e) => {
        e.stopPropagation();
        open();
      };
      row.querySelector(".main").onclick = (e) => {
        if (e.target.closest("button,a,select,input")) return;
        open();
      };
      row.querySelector(".main").style.cursor = "pointer";
    });
}
function invDetail(v, owner, who) {
  const st = v.status || "sent",
    idx = st === "query" ? 1 : INV_FLOW.findIndex((x) => x[0] === st);
  const at = { sent: v.sentAt, received: v.receivedAt, approved: v.approvedAt, paid: v.paidAt };
  const row = (l, x) =>
    x ? `<div class="drow"><span>${esc(l)}</span><span>${x}</span></div>` : "";
  const img = isImg(v.contentType) && v.assetId;
  openSheet(
    `<h3 id="sheettitle">Invoice ${esc(v.number || "")}</h3>
    <div class="invhead"><div><b>${esc(owner ? nameOf(who) : "Your invoice")}</b><div class="who">${v.site ? esc(v.site) : "No site given"}</div></div>${v.amount ? `<div class="invamt">${gbp(v.amount)}</div>` : ""}</div>
    <div class="flabel">Stage</div>
    <ol class="invsteps">${INV_FLOW.map(([k, l, h], i) => `<li class="${i < idx || (st === "paid" && k === "paid") ? "done" : i === idx ? "cur" : ""}">${owner && k !== "sent" ? `<button type="button" class="invstep" data-s="${k}" aria-pressed="${k === st}">` : `<div class="invstep">`}<span class="dot">${i < idx || st === "paid" ? "✓" : i + 1}</span><b>${l}</b><small>${at[k] ? esc(stamp(at[k])) : esc(h)}</small>${owner && k !== "sent" ? "</button>" : "</div>"}</li>`).join("")}</ol>
    ${st === "query" ? `<div class="notice warn"><b>On query.</b> ${esc(v.query || "")}${v.queryAt ? ` <span class="who">(${esc(stamp(v.queryAt))})</span>` : ""}</div>` : ""}
    ${
      owner
        ? `<div class="actions">${st !== "paid" ? `<button type="button" class="btn primary" id="iv-next">${st === "sent" ? "✓ Mark received" : st === "received" || st === "query" ? "✓ Approve it" : "£ Mark as paid"}</button>` : ""}${st !== "query" && st !== "paid" ? `<button type="button" class="btn" id="iv-query">❓ Query it</button>` : ""}</div>
      <div id="iv-paybox" hidden class="cfinv"><div class="grid2"><label for="iv-paidon">Paid on<input id="iv-paidon" type="date" value="${iso(new Date())}"></label><label for="iv-ref">Payment reference (optional)<input id="iv-ref" maxlength="60" placeholder="e.g. BACS JEB-0042"></label></div><button type="button" class="btn primary" id="iv-paysave">Save as paid</button></div>
      <div id="iv-qbox" hidden class="cfinv"><label for="iv-q">What's the query? (the trade sees this)<textarea id="iv-q" maxlength="400" placeholder="e.g. Hours for Tuesday don't match the timesheet">${esc(v.query || "")}</textarea></label><button type="button" class="btn primary" id="iv-qsave">Send query</button></div>`
        : ""
    }
    <div class="flabel">Details</div>
    <div class="details">${row("Invoice number", esc(v.number || ""))}${row("Amount", v.amount ? gbp(v.amount) : "")}${row("Invoice date", v.invDate ? esc(shortDay(v.invDate)) : "")}${row("Work period", v.from && v.to ? esc(shortDay(v.from) + " – " + shortDay(v.to)) : "")}${row("Site", esc(v.site || ""))}
      ${row("Sent", esc(stamp(v.sentAt)))}${v.deliveredAt && v.deliveredAt - v.sentAt > 600000 ? row("Arrived", esc(stamp(v.deliveredAt)) + " (no signal when sent)") : ""}${row("Received", v.receivedAt ? esc(stamp(v.receivedAt)) : "")}${row("Approved", v.approvedAt ? esc(stamp(v.approvedAt)) : "")}
      ${row("Paid", v.paidAt ? esc(v.paidOn ? shortDay(v.paidOn) : stamp(v.paidAt)) : "")}${row("Payment ref", esc(v.paidRef || ""))}${row("Their notes", esc(v.notes || ""))}</div>
    <div class="flabel">The invoice</div>
    ${img ? `<button type="button" class="invimg" id="iv-img"><img src="${blobUrl(v.assetId)}" alt="Invoice ${esc(v.number || "")}"></button>` : ""}
    <div class="actions"><button type="button" class="btn" id="iv-file">📄 Open ${esc(v.fileName || "file")}</button></div>
    <div class="formactions"><span></span><span><button type="button" class="btn" id="f-cancel">Close</button></span></div>`,
    null,
  );
  $("iv-file").onclick = () => openFile(v.assetId, v.fileName || "invoice", v.contentType);
  if ($("iv-img"))
    $("iv-img").onclick = () => openFile(v.assetId, v.fileName || "invoice", v.contentType);
  if (!owner) return;
  const save = async (patch, msg) => {
    try {
      await S.db.doc("sheets/" + who + "/invoices/" + v.id).update(patch);
      Object.assign(v, patch);
      toast(msg);
      render();
      invDetail(v, owner, who);
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  };
  const go = (k) => {
    if (k === "paid") {
      $("iv-paybox").hidden = false;
      $("iv-qbox").hidden = true;
      $("iv-paidon").focus();
      return;
    }
    const p = { status: k };
    if (k === "received" && !v.receivedAt) p.receivedAt = Date.now();
    if (k === "approved" && !v.approvedAt) {
      p.approvedAt = Date.now();
      if (!v.receivedAt) p.receivedAt = Date.now();
    }
    if (k !== "paid" && st === "paid") {
      p.paidAt = null;
      p.paidOn = "";
      p.paidRef = "";
    }
    save(p, "Marked as " + INV_ST[k][0].toLowerCase());
  };
  document.querySelectorAll(".invstep[data-s]").forEach(
    (b) =>
      (b.onclick = () => {
        if (b.dataset.s === st && st !== "paid") return;
        go(b.dataset.s);
      }),
  );
  if ($("iv-next"))
    $("iv-next").onclick = () =>
      go(st === "sent" ? "received" : st === "received" || st === "query" ? "approved" : "paid");
  if ($("iv-query"))
    $("iv-query").onclick = () => {
      $("iv-qbox").hidden = false;
      $("iv-paybox").hidden = true;
      $("iv-q").focus();
    };
  $("iv-paysave").onclick = () => {
    const d = $("iv-paidon").value;
    const now = Date.now();
    save(
      {
        status: "paid",
        paidAt: now,
        paidOn: d || iso(new Date()),
        paidRef: $("iv-ref").value.trim(),
        receivedAt: v.receivedAt || now,
        approvedAt: v.approvedAt || now,
      },
      "Marked as paid",
    );
  };
  $("iv-qsave").onclick = () => {
    const q = $("iv-q").value.trim();
    if (!q) {
      $("iv-q").focus();
      return;
    }
    save(
      { status: "query", query: q, queryAt: Date.now(), receivedAt: v.receivedAt || Date.now() },
      "Query sent",
    );
  };
}
function empInvoices() {
  const list = S.mine.invoices.filter(isInv).sort((a, b) => b.sentAt - a.sentAt);
  $("main").innerHTML =
    `<div class="notice">For self-employed workers. Send your invoice here and the date and time you sent it is recorded. You'll see when James has received and paid it.</div>
    ${S.assets ? "" : `<div class="notice warn"><b>You can't attach files yet.</b> Ask James to change your access to this app to <b>Editor</b> in the app's Share menu, then close and reopen the app.</div>`}
    <div class="actions"><button class="btn primary" id="addI" type="button">+ Send an invoice</button></div>
    ${list.length ? `<div class="day">${list.map((v) => invCard(v, false)).join("")}</div>` : '<div class="empty"><strong>No invoices sent yet</strong>Attach your invoice as a PDF or a photo.</div>'}`;
  $("addI").onclick = openInvoice;
  wireInvoices(list, false);
}
function openInvoice() {
  if (!S.assets) {
    toast("You don't have permission to upload. Ask James to make you an Editor on this page.");
    return;
  }
  setFormType("invoice");
  setEditing(null);
  const mon = monday(new Date());
  openSheet(
    `<h3 id="sheettitle">Send an invoice</h3>
    <div class="grid2"><label for="i-num">Invoice number<input id="i-num" required maxlength="40" placeholder="e.g. 0042"></label>
    <label for="i-date">Invoice date<input id="i-date" type="date" required value="${iso(new Date())}"></label></div>
    <div class="grid2"><label for="i-from">Work from (optional)<input id="i-from" type="date" value="${iso(addDays(mon, -7))}"></label>
    <label for="i-to">Work to (optional)<input id="i-to" type="date" value="${iso(addDays(mon, -1))}"></label></div>
    ${pickField("i-site", "Site (optional)", siteNames(), "", "e.g. 12 Marine Way, Exmouth", false)}
    <label for="i-amt">Invoice total £ (optional)<input id="i-amt" type="number" inputmode="decimal" min="0" step="0.01" placeholder="e.g. 850.00"></label>
    <label for="i-file">Invoice file (PDF or photo)<input id="i-file" type="file" accept="application/pdf,image/*,.doc,.docx,.rtf,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required></label>
    <label for="i-notes">Notes (optional)<textarea id="i-notes" maxlength="300"></textarea></label>
    ${formFoot(false, "Send invoice")}`,
    saveInvoice,
    "i-num",
  );
}
async function saveInvoice() {
  let f = $("i-file").files[0];
  if (
    f &&
    (/^image\//.test(f.type) || /\.(heic|heif)$/i.test(f.name || "")) &&
    !/gif|svg/.test(f.type)
  ) {
    try {
      const j = await shrinkImage(f, 2600);
      f = new File([j], (f.name || "invoice").replace(/\.[^.]+$/, "") + ".jpg", {
        type: "image/jpeg",
      });
    } catch (e) {
      if (/heic|heif/i.test(f.type + f.name)) {
        showErr(
          "That photo is in iPhone HEIC format and couldn't be read. Take the photo with the Take photo button, or set the camera to Most Compatible.",
        );
        return;
      }
    }
  }
  const data = {
    number: $("i-num").value.trim(),
    invDate: $("i-date").value,
    from: $("i-from").value,
    to: $("i-to").value,
    site: pickVal("i-site"),
    amount: $("i-amt").value ? Math.round(+$("i-amt").value * 100) / 100 : null,
    notes: $("i-notes").value.trim(),
    status: "sent",
  };
  if (!data.number) {
    showErr("Add the invoice number.");
    return;
  }
  if (!f) {
    showErr("Attach the invoice file.");
    return;
  }
  if (f.size > 20 * 1048576) {
    showErr(uploadErr({ code: "too_large" }));
    return;
  }
  $("f-save").disabled = true;
  $("f-save").textContent = "Sending…";
  try {
    const now = Date.now();
    const r = await submitJob({
      coll: "invoices",
      docId: newId(),
      data: Object.assign(data, {
        fileName: f.name,
        contentType: f.type,
        size: f.size,
        sentAt: now,
        created: now,
      }),
      files: [{ blob: f, name: f.name, field: "assetId", meta: true }],
    });
    closeForm();
    toast(
      r === "queued"
        ? "Invoice kept on this phone. It will send when you have signal."
        : "Invoice sent " + stamp(now),
    );
    render();
  } catch (e) {
    showErr(uploadErr(e));
    $("f-save").disabled = false;
    $("f-save").textContent = "Send invoice";
  }
}
