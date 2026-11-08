/* ================= SALES EMAIL: send an estimate, invoice or statement as an email with its PDF attached ================= */
import { $, esc, gbp, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { coData } from "../owner/company-details.js";
import { sdCalc, sdDueDate, sdSet } from "./sales-calc.js";
import { sdLongDate, sdPdf } from "./sales-pdf.js";
export { sdEmail, sdShareMail };
/* The app has no mail server of its own, so it hands the email to James's own email app. On an iPad or phone the
   share sheet opens with the PDF attached and the message filled in (he picks Mail or Outlook, and the address is
   copied ready to paste). Where sharing files isn't possible (most computers) the PDF is saved and a new email opens
   with the address, subject and message filled in, for him to attach the PDF. Each email sent is noted on the record. */
async function sdShareMail(o) {
  const file = new File([o.blob], o.filename, { type: "application/pdf" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      if (o.to)
        try {
          await navigator.clipboard.writeText(o.to);
        } catch (e) {}
      await navigator.share({ files: [file], title: o.subject, text: o.body });
      if (o.to) toast("Email address copied – paste it into To");
      return "shared";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "";
  }
  try {
    await S.dl.save({ filename: o.filename, data: o.blob });
  } catch (e) {}
  const a = document.createElement("a");
  a.href = `mailto:${encodeURIComponent(o.to || "")}?subject=${encodeURIComponent(o.subject)}&body=${encodeURIComponent(o.body)}`;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast("The PDF has saved – attach it to the email");
  return "mailto";
}
function sdEmailText(d) {
  const co = coData(),
    set = sdSet(),
    c = sdCalc(d),
    est = d.type === "estimate";
  const subject = `${est ? "Estimate" : "Invoice"} ${d.number}${d.title ? " – " + d.title : ""} – ${co.name}`;
  const sign = `Kind regards\n${co.owner}\n${co.name}${co.mobile || co.phone ? "\n" + (co.mobile || co.phone) : ""}`;
  const body = est
    ? `Dear ${d.dear || d.client},\n\nPlease find attached our estimate ${d.number}${d.title ? " for " + d.title : ""}, totalling ${gbp(c.net)}${c.vat ? " + VAT (" + gbp(c.gross) + " including VAT)" : ""}. It is valid for ${+d.validDays || +set.validDays || 30} days.\n\nIf you have any questions or would like to go ahead, please get in touch.\n\n${sign}`
    : `Dear ${d.client},\n\nPlease find attached invoice ${d.number}${d.title ? " for " + d.title : ""}${d.part ? " (" + d.part + ")" : ""}. The amount due is ${gbp(c.balance)}, to be paid by ${sdLongDate(sdDueDate(d))}.${set.bank ? `\n\nPayment details:\n${set.bank}\nReference: ${d.number}` : ""}\n\nThank you for your business.\n\n${sign}`;
  return { subject, body };
}
/* the email form for one estimate or invoice; the PDF is made while it's open so Send can attach it straight away */
function sdEmail(d, onSent) {
  const t = sdEmailText(d);
  const pdfP = sdPdf(d).catch(() => null);
  openSheet(
    `<h3 id="sheettitle">📧 Email ${d.type === "estimate" ? "estimate" : "invoice"} ${esc(d.number)}</h3>
    <label for="se-to">To<input id="se-to" type="email" maxlength="160" value="${esc(d.email || "")}" placeholder="their email address"></label>
    <label for="se-sub">Subject<input id="se-sub" maxlength="200" value="${esc(t.subject)}"></label>
    <label for="se-msg">Message<textarea id="se-msg" rows="10" maxlength="4000">${esc(t.body)}</textarea></label>
    <div class="who">This opens your own email (Mail or Outlook) with the PDF attached, for you to check and press Send. On a computer the PDF saves and the email opens: attach the PDF before sending.</div>
    ${(d.emails || []).length ? `<div class="who">Emailed before: ${d.emails.map((e) => esc(stamp(e.at)) + (e.to ? " to " + esc(e.to) : "")).join(", ")}</div>` : ""}
    ${formFoot(false, "Open in my email")}`,
    async () => {
      const to = $("se-to").value.trim();
      if (to && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to))
        return showErr("That email address doesn't look right.");
      const blob = await pdfP;
      if (!blob) return showErr("Couldn't make the PDF. Check your connection.");
      const fn =
        `${d.type === "estimate" ? "Estimate" : "Invoice"} ${d.number} ${d.client || ""}`
          .replace(/[\\/:*?"<>|]+/g, "")
          .trim() + ".pdf";
      const how = await sdShareMail({
        to,
        subject: $("se-sub").value,
        body: $("se-msg").value,
        blob,
        filename: fn,
      });
      if (!how) return;
      closeForm();
      if (onSent) onSent({ at: Date.now(), to });
    },
    "se-to",
  );
}
