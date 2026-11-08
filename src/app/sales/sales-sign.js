/* ================= SALES SIGN-OFF AND RECEIPTS: the client accepts an estimate; a receipt for every payment ================= */
import { ptOwnerSign } from "../clients/portal-calendar.js";
import { ptOf, ptSrc } from "../clients/portal.js";
import { SO } from "../clients/sign-offs.js";
import { $, esc, gbp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer } from "../core/viewer.js";
import { uploadFile } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { BRGB } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { sdCalc, sdNo, sdSales, sdSaveRec, sdSet } from "./sales-calc.js";
import { sdShareMail } from "./sales-email.js";
import { sdHeadLines, sdImgData, sdLongDate, sdPdf } from "./sales-pdf.js";
export { sdAskSign, sdEstSign, sdReceipt, sdSyncSigns };
/* Estimate sign-off uses the client portal's sign-offs: the estimate PDF goes into the client's portal (Quotes &
   variations) with a request to accept it ("I accept this estimate and the terms…"). The client signs in their
   portal, or on James's device there and then. Once signed, the estimate is marked accepted with who and when.
   Receipts: a "payment received" PDF on the letterhead for a payment on an invoice – the amount, date, how it was
   paid, the invoice, paid so far and what's left – emailed (ready-written) and/or put in the client's portal. */
const sdClientOf = (d) => (d.clientId ? (S.clients || []).find((c) => c.id === d.clientId) : null);
/* the sign-off for an estimate (latest), if one has been asked for */
function sdEstSign(e) {
  const c = sdClientOf(e);
  if (!c) return null;
  const p = ptOf(c);
  const list = p ? SO.signs[p.id] || [] : c.ptSigns || [];
  return (
    list
      .filter((x) => x.kind === "estimate" && x.estId === e.id)
      .sort((a, b) => (b.created || 0) - (a.created || 0))[0] || null
  );
}
/* mark estimates accepted once their sign-off is signed */
const SD_SIGNSYNC = new Set();
async function sdSyncSigns() {
  for (const e of sdSales().filter(
    (x) => x.type === "estimate" && x.clientId && !["accepted", "invoiced"].includes(x.status),
  )) {
    const x = sdEstSign(e);
    if (!x || x.status !== "signed" || SD_SIGNSYNC.has(e.id)) continue;
    SD_SIGNSYNC.add(e.id);
    try {
      await sdSaveRec(
        Object.assign({}, e, {
          status: "accepted",
          acceptedAt: x.signedAt || Date.now(),
          acceptedBy: x.signedName || e.client,
        }),
      );
      toast(`✍️ ${x.signedName || e.client} accepted estimate ${e.number}`);
    } catch (er) {
      SD_SIGNSYNC.delete(e.id);
    }
  }
}
/* send the estimate for signing (in their portal), or sign it now on this device */
async function sdAskSign(e, here) {
  const c = sdClientOf(e);
  if (!c) return toast("Pick the client at the top of the estimate first (Client), then try again");
  toast("Making the estimate PDF…");
  try {
    const blob = await sdPdf(e);
    const fn =
      `Estimate ${e.number}${(+e.ver || 1) > 1 ? " v" + e.ver : ""} ${e.client || ""}`
        .replace(/[\\/:*?"<>|]+/g, "")
        .trim() + ".pdf";
    const a = await uploadFile(new File([blob], fn, { type: "application/pdf" }), fn);
    const src = ptSrc(c);
    const docId = newId(),
      signId = newId();
    await src.addDoc(docId, {
      title: fn.replace(/\.pdf$/, ""),
      fileName: fn,
      assetId: a.id,
      contentType: "application/pdf",
      folder: "quotes",
      note: "",
      sharedAt: Date.now(),
    });
    const cc = sdCalc(e);
    const x = {
      kind: "estimate",
      title: `Estimate ${e.number}${(+e.ver || 1) > 1 ? " (version " + e.ver + ")" : ""}${e.title ? " – " + e.title : ""}`,
      details: "Please read the estimate and the terms and conditions, then sign to accept it.",
      amount: cc.net,
      vat: cc.vat ? "plus VAT" : "",
      docIds: [docId],
      status: "open",
      created: Date.now(),
      estId: e.id,
      estVer: +e.ver || 1,
    };
    await src.addSign(signId, x);
    await src.bump();
    await sdSaveRec(
      Object.assign({}, e, {
        status: e.status === "draft" ? "sent" : e.status,
        sentAt: e.sentAt || Date.now(),
        signReq: { id: signId, at: Date.now() },
      }),
    );
    if (here) {
      const p = ptOf(c);
      ptOwnerSign(c, p, Object.assign({ id: signId }, x), [
        {
          id: docId,
          title: fn,
          fileName: fn,
          assetId: a.id,
          contentType: "application/pdf",
          folder: "quotes",
        },
      ]);
    } else {
      toast(
        src.linked
          ? `Sent to ${c.name}'s portal to sign`
          : `Saved for ${c.name}: they'll see it to sign when they join the portal`,
      );
      closeViewer();
      render();
    }
  } catch (er) {
    toast("Couldn't send it. Check your connection.");
  }
}
/* ---------- receipts ---------- */
async function sdReceiptPdf(d, i) {
  const pay = (d.payments || [])[i];
  await loadJsPdf();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const brand = BRGB(),
    co = coData(),
    set = sdSet();
  const logo = await sdImgData(set.logoId || ((S.settings || {}).company || {}).logoId);
  if (logo) {
    const k = Math.min(72 / logo.w, 40 / logo.h);
    doc.addImage(logo.u, logo.f, 16, 6, logo.w * k, logo.h * k, "rclogo", "FAST");
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...brand);
    doc.text(co.name, 19, 24);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...brand);
  let hy = 12.5;
  sdHeadLines().forEach((t) => {
    if (!t.trim()) {
      hy += 2.6;
      return;
    }
    doc.text(t, 186, hy, { align: "right" });
    hy += 4.6;
  });
  doc.setDrawColor(...brand);
  doc.setLineWidth(0.7);
  doc.line(2.5, 52, 207.5, 52);
  const M = 25;
  let y = 68;
  doc.setTextColor(20, 20, 20);
  [d.client]
    .concat(String(d.address || "").split(/\s*\n\s*/))
    .filter(Boolean)
    .forEach((t) => {
      doc.text(t, M, y);
      y += 4.9;
    });
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...brand);
  doc.text("PAYMENT RECEIPT", M, y);
  y += 10;
  const c = sdCalc(Object.assign({}, d, { payments: (d.payments || []).slice(0, i + 1) }));
  const rows = [
    ["Receipt number", `${d.number}-${i + 1}`],
    ["Date received", sdLongDate(pay.date)],
    ["Received from", d.client || ""],
    ["Amount received", gbp(pay.amt), 1],
    pay.note ? ["Paid by", pay.note] : null,
    ["For invoice", `${sdNo(d)}${d.title ? " – " + d.title : ""}`],
    ["Invoice total", gbp(c.due)],
    ["Paid so far", gbp(c.paid)],
    ["Left to pay", c.balance > 0.005 ? gbp(c.balance) : "Nothing – paid in full", 1],
  ].filter(Boolean);
  rows.forEach(([k, v, b]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(100, 100, 100);
    doc.text(k, M, y);
    doc.setFont("helvetica", b ? "bold" : "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(String(v), M + 60, y);
    y += 7.4;
  });
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text(
    doc.splitTextToSize(`Thank you – we have received your payment of ${gbp(pay.amt)}.`, 160),
    M,
    y,
  );
  y += 16;
  doc.text("Kind Regards", M, y);
  y += 4;
  const sig = await sdImgData(set.sigId);
  if (sig) {
    const k = Math.min(50 / sig.w, 15 / sig.h);
    doc.addImage(sig.u, sig.f, M - 6, y, sig.w * k, sig.h * k, "rcsig", "FAST");
    y += sig.h * k + 3;
  } else y += 2;
  doc.setFont("helvetica", "bold");
  doc.text(co.owner, M, y);
  doc.setDrawColor(...brand);
  doc.setLineWidth(0.7);
  doc.line(3.5, 270.5, 208.5, 270.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...brand);
  if (set.tagline) doc.text(set.tagline, 105, 279.8, { align: "center" });
  const vn = sdSet().vatNo || co.vatNo;
  if (vn && set.vatReg !== false) doc.text("VAT Number " + vn, 105, 284.4, { align: "center" });
  return doc.output("blob");
}
/* send a receipt for payment i: email (ready-written) and/or the client's portal */
function sdReceipt(d, i) {
  const pay = (d.payments || [])[i];
  if (!pay) return;
  const co = coData();
  const c = sdCalc(Object.assign({}, d, { payments: (d.payments || []).slice(0, i + 1) }));
  const cl = sdClientOf(d);
  const pdfP = sdReceiptPdf(d, i).catch(() => null);
  const body = `Dear ${d.client},\n\nThank you for your payment of ${gbp(pay.amt)} received on ${sdLongDate(pay.date)} for invoice ${sdNo(d)}${d.title ? " (" + d.title + ")" : ""}. ${c.balance > 0.005 ? `The amount left to pay is ${gbp(c.balance)}.` : "The invoice is now paid in full."}\n\nPlease find your receipt attached.\n\nKind regards\n${co.owner}\n${co.name}${co.mobile || co.phone ? "\n" + (co.mobile || co.phone) : ""}`;
  openSheet(
    `<h3 id="sheettitle">🧾 Receipt for ${gbp(pay.amt)}</h3>
    <div class="who">Received ${esc(sdLongDate(pay.date))} for ${esc(sdNo(d))}. ${c.balance > 0.005 ? "Left to pay: " + gbp(c.balance) : "Paid in full ✓"}</div>
    <label for="rc-to">Email to<input id="rc-to" type="email" maxlength="160" value="${esc(d.email || (cl && cl.email) || "")}"></label>
    <label for="rc-msg">Message<textarea id="rc-msg" rows="8" maxlength="3000">${esc(body)}</textarea></label>
    ${cl ? `<label class="inl"><input type="checkbox" id="rc-pt" checked> Also put it in ${esc(cl.name)}'s portal</label>` : ""}
    <div class="actions"><button type="button" class="btn" id="rc-pdf">📄 Just the PDF</button></div>
    ${formFoot(false, "📧 Email the receipt")}`,
    async () => {
      const blob = await pdfP;
      if (!blob) return showErr("Couldn't make the receipt. Check your connection.");
      const fn =
        `Receipt ${d.number}-${i + 1} ${d.client || ""}`.replace(/[\\/:*?"<>|]+/g, "").trim() +
        ".pdf";
      try {
        if ($("rc-pt") && $("rc-pt").checked) {
          const a = await uploadFile(new File([blob], fn, { type: "application/pdf" }), fn);
          const src = ptSrc(cl);
          await src.addDoc(newId(), {
            title: fn.replace(/\.pdf$/, ""),
            fileName: fn,
            assetId: a.id,
            contentType: "application/pdf",
            folder: "quotes",
            note: "",
            sharedAt: Date.now(),
          });
          await src.bump();
        }
      } catch (e) {}
      const how = await sdShareMail({
        to: $("rc-to").value.trim(),
        subject: `Receipt for your payment – ${sdNo(d)} – ${co.name}`,
        body: $("rc-msg").value,
        blob,
        filename: fn,
      });
      if (!how) return;
      const pays = (d.payments || []).slice();
      pays[i] = Object.assign({}, pays[i], { receiptAt: Date.now() });
      try {
        await sdSaveRec(Object.assign({}, d, { payments: pays }));
      } catch (e) {}
      closeForm();
      toast("Receipt sent");
    },
    "rc-to",
  );
  $("rc-pdf").onclick = async () => {
    const blob = await pdfP;
    if (blob)
      await S.dl.save({
        filename: `Receipt ${d.number}-${i + 1} ${d.client || ""}`.trim() + ".pdf",
        data: blob,
      });
  };
}
