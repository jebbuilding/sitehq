/* ================= SALES EMAIL: send an estimate, invoice or statement as an email with its PDF attached ================= */
import { $, esc, gbp, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { getFileBlob } from "../files/in-app-files.js";
import { coData } from "../owner/company-details.js";
import { jfFolderName, jfFor } from "./job-file.js";
import { SD_IK, sdCalc, sdDueDate, sdIk, sdIsPf, sdNo, sdSet } from "./sales-calc.js";
import { sdLongDate, sdPdf } from "./sales-pdf.js";
export { SD_MAILT, sdEmail, sdShareMail };
/* The app has no mail server of its own, so it hands the email to James's own email app. On an iPad or phone the
   share sheet opens with the PDF (and any files ticked from the job file) attached and the message filled in (he
   picks Mail or Outlook, and the address is copied ready to paste). Where sharing files isn't possible (most
   computers) the files are saved and a new email opens with the address, subject and message filled in, for him
   to attach them. The message is ready-written for each kind (estimate, new version, pro forma, deposit,
   instalment, extra work, final, one-off), from his own wording in settings where he's set it. Each email sent is
   noted on the record. */
async function sdShareMail(o) {
  const files = [new File([o.blob], o.filename, { type: "application/pdf" })].concat(
    (o.more || []).map(
      (m) => new File([m.blob], m.filename, { type: m.blob.type || "application/octet-stream" }),
    ),
  );
  try {
    if (navigator.canShare && navigator.canShare({ files })) {
      if (o.to)
        try {
          await navigator.clipboard.writeText(o.to);
        } catch (e) {}
      await navigator.share({ files, title: o.subject, text: o.body });
      if (o.to) toast("Email address copied – paste it into To");
      return "shared";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "";
  }
  for (const f of files)
    try {
      await S.dl.save({ filename: f.name, data: f });
    } catch (e) {}
  const a = document.createElement("a");
  a.href = `mailto:${encodeURIComponent(o.to || "")}?subject=${encodeURIComponent(o.subject)}&body=${encodeURIComponent(o.body)}`;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast(
    files.length > 1
      ? `The ${files.length} files have saved – attach them to the email`
      : "The PDF has saved – attach it to the email",
  );
  return "mailto";
}
/* the standard wording for each kind; {words} are filled in */
const SD_MAILT = {
  est: [
    "Estimate",
    "Dear {dear},\n\nPlease find attached our estimate {number} for {job}, totalling {total}. It is valid for {valid} days.\n\nIf you have any questions or would like to go ahead, please get in touch.",
  ],
  estv: [
    "New version of an estimate",
    "Dear {dear},\n\nPlease find attached version {ver} of our estimate {number} for {job}, updated as discussed. The new total is {total}. It is valid for {valid} days.\n\nIf you have any questions or would like to go ahead, please get in touch.",
  ],
  proforma: [
    "Pro forma",
    "Dear {name},\n\nPlease find attached our pro forma invoice {number} for {job}. The amount to pay is {due}, by {date}. Once payment is received we'll send you a VAT invoice.{bank}",
  ],
  deposit: [
    "Deposit",
    "Dear {name},\n\nPlease find attached our deposit invoice {number} for {job}. The deposit of {due} is due by {date}, so we can confirm your start date.{bank}",
  ],
  stage: [
    "Instalment",
    "Dear {name},\n\nPlease find attached invoice {number} for the next stage of {job}{part}. The amount due is {due}, by {date}.{bank}",
  ],
  extra: [
    "Extra work",
    "Dear {name},\n\nPlease find attached invoice {number} for the extra work on {job}, as agreed. The amount due is {due}, by {date}.{bank}",
  ],
  final: [
    "Final payment",
    "Dear {name},\n\nPlease find attached our final invoice {number} for {job}. It shows the estimate, any extra work and what you've already paid. The balance due is {due}, by {date}.{bank}\n\nThank you for choosing us for your project.",
  ],
  oneoff: [
    "One-off invoice",
    "Dear {name},\n\nPlease find attached invoice {number} for {job}. The amount due is {due}, to be paid by {date}.{bank}\n\nThank you for your business.",
  ],
};
const sdMailKey = (d) => (d.type === "estimate" ? ((+d.ver || 1) > 1 ? "estv" : "est") : sdIk(d));
function sdEmailText(d) {
  const co = coData(),
    set = sdSet(),
    c = sdCalc(d),
    est = d.type === "estimate";
  const k = sdMailKey(d);
  const what = est
    ? "Estimate"
    : SD_IK[sdIk(d)] === "One-off invoice"
      ? "Invoice"
      : SD_IK[sdIk(d)] + " invoice";
  const subject = `${what} ${est ? d.number + ((+d.ver || 1) > 1 ? " v" + d.ver : "") : sdNo(d)}${d.title ? " – " + d.title : ""} – ${co.name}`;
  const sign = `Kind regards\n${co.owner}\n${co.name}${co.mobile || co.phone ? "\n" + (co.mobile || co.phone) : ""}`;
  const vals = {
    dear: d.dear || d.client || "",
    name: d.client || "",
    number: est ? d.number : sdNo(d),
    ver: String(+d.ver || 1),
    job: d.title || "the work",
    total: gbp(c.net) + (c.vat ? " + VAT (" + gbp(c.gross) + " including VAT)" : ""),
    valid: String(+d.validDays || +set.validDays || 30),
    due: gbp(c.balance),
    date: sdLongDate(sdDueDate(d)),
    part: d.part && sdIk(d) === "stage" ? " (" + d.part + ")" : "",
    bank: set.bank
      ? `\n\nPayment details:\n${set.bank}\nReference: ${est ? d.number : sdNo(d)}`
      : "",
    company: co.name,
  };
  const tpl = ((set.mailT || {})[k] || "").trim() || (SD_MAILT[k] || SD_MAILT.oneoff)[1];
  const body = tpl.replace(/\{(\w+)\}/g, (m, w) => (vals[w] != null ? vals[w] : m)) + "\n\n" + sign;
  return { subject, body };
}
/* the email form; the PDF (and any ticked files) are made ready while it's open so Send can attach them at once */
function sdEmail(d, onSent) {
  const t = sdEmailText(d);
  const pdfP = sdPdf(d).catch(() => null);
  const j = jfFor(d);
  const jitems = ((j && j.items) || [])
    .slice()
    .sort((a, b) => (a.folder || "").localeCompare(b.folder || ""));
  const ready = {};
  const extra = [];
  openSheet(
    `<h3 id="sheettitle">📧 Email ${d.type === "estimate" ? "estimate" : sdIsPf(d) ? "pro forma" : "invoice"} ${esc(d.type === "estimate" ? d.number : sdNo(d))}</h3>
    <label for="se-to">To<input id="se-to" type="email" maxlength="160" value="${esc(d.email || "")}" placeholder="their email address"></label>
    <label for="se-sub">Subject<input id="se-sub" maxlength="200" value="${esc(t.subject)}"></label>
    <label for="se-msg">Message<textarea id="se-msg" rows="10" maxlength="4000">${esc(t.body)}</textarea></label>
    <div class="flabel">Attach as well</div>
    ${
      jitems.length
        ? `<div class="se-att">${jitems.map((i) => `<label class="inl"><input type="checkbox" class="se-jf" value="${esc(i.id)}"> <span>${esc(i.name)} <small class="who">${esc(jfFolderName(i.folder).replace(/^\S+\s/, ""))}</small></span></label>`).join("")}</div>`
        : `<div class="who">Nothing in the job file yet.</div>`
    }
    <div class="se-extra" id="se-extra"></div>
    <span class="btn sd-filebtn">📎 Add a file from this device<input type="file" class="se-file" multiple aria-label="Add a file to the email"></span>
    <div class="who">This opens your own email (Mail or Outlook) with the PDF${jitems.length ? " and the ticked files" : ""} attached, for you to check and press Send. On a computer the files save and the email opens: attach them before sending.</div>
    ${(d.emails || []).length ? `<div class="who">Emailed before: ${d.emails.map((e) => esc(stamp(e.at)) + (e.to ? " to " + esc(e.to) : "")).join(", ")}</div>` : ""}
    ${formFoot(false, "Open in my email")}`,
    async () => {
      const to = $("se-to").value.trim();
      if (to && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to))
        return showErr("That email address doesn't look right.");
      const blob = await pdfP;
      if (!blob) return showErr("Couldn't make the PDF. Check your connection.");
      const ticked = [...document.querySelectorAll(".se-jf:checked")].map((x) => x.value);
      const more = [];
      for (const id of ticked) {
        const it = jitems.find((i) => i.id === id);
        const b = await ready[id];
        if (b) more.push({ blob: b, filename: it.name });
      }
      extra.forEach((f) => more.push({ blob: f, filename: f.name }));
      const fn =
        `${d.type === "estimate" ? "Estimate" : sdIsPf(d) ? "Pro forma" : "Invoice"} ${d.number}${d.type === "estimate" && (+d.ver || 1) > 1 ? " v" + d.ver : ""} ${d.client || ""}`
          .replace(/[\\/:*?"<>|]+/g, "")
          .trim() + ".pdf";
      const how = await sdShareMail({
        to,
        subject: $("se-sub").value,
        body: $("se-msg").value,
        blob,
        filename: fn,
        more,
      });
      if (!how) return;
      closeForm();
      if (onSent) onSent({ at: Date.now(), to, files: more.map((m) => m.filename) });
    },
    "se-to",
  );
  /* fetch a ticked file straight away, so it's ready when Send is pressed */
  document.querySelectorAll(".se-jf").forEach(
    (x) =>
      (x.onchange = () => {
        const it = jitems.find((i) => i.id === x.value);
        if (x.checked && !ready[x.value])
          ready[x.value] = getFileBlob(it.assetId).catch(() => null);
      }),
  );
  const fi = document.querySelector(".se-file");
  fi.onchange = () => {
    [...(fi.files || [])].forEach((f) => extra.push(f));
    fi.value = "";
    $("se-extra").innerHTML = extra.map((f) => `<div class="who">📎 ${esc(f.name)}</div>`).join("");
  };
}
