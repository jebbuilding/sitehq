/* ================= SALES SETTINGS: letterhead, logo, signature, VAT, wording, terms and bank – and bringing them in from Word ================= */
import { $, esc, gbp, iso, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { blobUrl, uploadFile } from "../files/files.js";
import { coData } from "../owner/company-details.js";
import { SD_VATC, sdCalc, sdNextNumber, sdSales, sdSaveRec, sdSet } from "./sales-calc.js";
import { sdParseEstimate, sdReadDocxAll } from "./sales-docx.js";
import { SD_MAILT } from "./sales-email.js";
export { sdImportWord, sdSettings, sdSetupCard, sdWireSetup };
/* One sheet for everything the estimates and invoices print: the letterhead lines and logo (brought in from James's
   Word letterhead, or typed), his signature, VAT registration, number and the usual rate, numbering, payment days,
   the standard wording (opening, cost note, closing, sign-off, list headings), the terms and the bank details.
   Saved to todos/salesset. A Word estimate can also be brought in: it becomes an estimate, and its wording, terms,
   letterhead and signature can be kept as the standard. */
async function sdUploadImg(blob, name) {
  const a = await uploadFile(blob, name);
  return a && a.id;
}
async function sdSaveSet(patch) {
  const rec = Object.assign({}, S.salesSet || {}, patch, { kind: "salesset" });
  delete rec.id;
  await S.db.doc("todos/salesset").set(rec);
  S.salesSet = Object.assign({ id: "salesset" }, rec);
}
function sdSettings() {
  const s = sdSet();
  const img = (id, what) =>
    id
      ? `<img src="${esc(blobUrl(id))}" alt="${what}" class="sd-img">`
      : `<span class="who">No ${what} yet</span>`;
  const pick = (cls, label) =>
    `<span class="btn sd-filebtn">${label}<input type="file" class="${cls}" accept="image/png,image/jpeg" aria-label="${label}"></span>`;
  openSheet(
    `<h3 id="sheettitle">⚙️ Letterhead, terms & bank</h3>
    <div class="flabel">Letterhead</div>
    <div class="sd-acts"><span class="btn sd-filebtn">📄 Bring in my Word letterhead<input type="file" class="ss-lhfile" accept=".docx" aria-label="Bring in my Word letterhead"></span></div>
    <div class="sd-imgrow"><div><b>Logo</b><div id="ss-logo">${img(s.logoId || ((S.settings || {}).company || {}).logoId, "logo")}</div>${pick("ss-logofile", "Change logo")}</div>
    <div><b>Your signature</b><div id="ss-sig">${img(s.sigId, "signature")}</div>${pick("ss-sigfile", "Add signature")}</div></div>
    <label for="ss-head">Top right of each page (one line each; a blank line leaves a gap)<textarea id="ss-head" rows="8" maxlength="600" placeholder="Leave empty to use Setup › My company details">${esc(s.head)}</textarea></label>
    <label for="ss-tag">Line at the foot of each page<input id="ss-tag" maxlength="160" value="${esc(s.tagline)}"></label>
    <div class="flabel">VAT</div>
    <div class="grid2"><label for="ss-vreg">VAT registered?<select id="ss-vreg"><option value="1">Yes</option><option value="0"${s.vatReg === false ? " selected" : ""}>No – don't add VAT</option></select></label>
    <label for="ss-vno">VAT number<input id="ss-vno" maxlength="20" value="${esc(s.vatNo || coData().vatNo || "")}" placeholder="e.g. 123456789"></label></div>
    <div class="grid2"><label for="ss-vc">Usual VAT on a new line<select id="ss-vc">${Object.entries(
      SD_VATC,
    )
      .map(([k, v]) => `<option value="${k}"${k === s.vc ? " selected" : ""}>${esc(v.l)}</option>`)
      .join("")}</select></label>
    <label for="ss-inc">Amounts I type are usually<select id="ss-inc"><option value="">Before VAT</option><option value="1"${s.inc ? " selected" : ""}>Including VAT</option></select></label></div>
    <div class="flabel">Numbers and dates</div>
    <div class="grid2"><label for="ss-ne">Next estimate number<input id="ss-ne" type="number" inputmode="numeric" value="${esc(sdNextNumber("estimate"))}"></label><label for="ss-ni">Next invoice number<input id="ss-ni" type="number" inputmode="numeric" value="${esc(sdNextNumber("invoice"))}"></label></div>
    <div class="grid2"><label for="ss-pd">Invoices due after (days)<input id="ss-pd" type="number" inputmode="numeric" value="${esc(s.payDays)}"></label><label for="ss-vd">Estimates valid for (days)<input id="ss-vd" type="number" inputmode="numeric" value="${esc(s.validDays)}"></label></div>
    <div class="flabel">Estimate wording</div>
    <label for="ss-intro">Opening words<textarea id="ss-intro" rows="5" maxlength="6000">${esc(s.intro)}</textarea></label>
    <label for="ss-cnote">Note under the total (in italics)<textarea id="ss-cnote" rows="2" maxlength="1000">${esc(s.costNote)}</textarea></label>
    <div class="grid2"><label for="ss-ih">Heading for works included<input id="ss-ih" maxlength="120" value="${esc(s.inclHead)}"></label><label for="ss-eh">Heading for works excluded<input id="ss-eh" maxlength="120" value="${esc(s.exclHead)}"></label></div>
    <label for="ss-close">Closing words<textarea id="ss-close" rows="5" maxlength="6000">${esc(s.closing)}</textarea></label>
    <label for="ss-so">Sign-off (one line each, then your signature and name)<textarea id="ss-so" rows="2" maxlength="200">${esc(s.signoff)}</textarea></label>
    <div class="flabel">Terms and conditions (printed after each estimate)</div>
    <div class="grid2"><label for="ss-tt">Title<input id="ss-tt" maxlength="120" value="${esc(s.termsTitle)}"></label><label for="ss-tv">Version line<input id="ss-tv" maxlength="80" value="${esc(s.termsVer)}" placeholder="e.g. Version date: 22 May 2026"></label></div>
    <label for="ss-terms">The terms<textarea id="ss-terms" rows="10" maxlength="80000">${esc(s.terms)}</textarea></label>
    <div class="who">A line starting <b>#</b> is a heading, <b>##</b> a smaller heading, <b>-</b> a bullet point. Bringing in a Word estimate fills this in for you.</div>
    <div class="flabel">Invoices</div>
    <label for="ss-bank">Bank details<textarea id="ss-bank" rows="3" maxlength="400" placeholder="Account name, sort code, account number">${esc(s.bank)}</textarea></label>
    <div class="flabel">Email wording</div>
    <div class="who">Leave a box empty to use the app's wording (shown faintly). Words in {brackets} are filled in for you: {name} {dear} {number} {job} {total} {due} {date} {valid} {ver} {part} {bank}. Your name and phone go at the end.</div>
    ${Object.entries(SD_MAILT)
      .map(
        ([k, [l, def]]) =>
          `<details class="ss-mt"><summary>${l}</summary><textarea id="ss-mt-${k}" rows="6" maxlength="3000" placeholder="${esc(def)}" aria-label="Email wording: ${l}">${esc((s.mailT || {})[k] || "")}</textarea></details>`,
      )
      .join("")}
    <label for="ss-ii">Opening line on invoices<input id="ss-ii" maxlength="300" value="${esc(s.invIntro)}"></label>
    <label for="ss-in">Thank-you line<input id="ss-in" maxlength="200" value="${esc(s.invNote)}"></label>
    ${formFoot(false, "Save")}`,
    async () => {
      $("f-save").disabled = true;
      try {
        await sdSaveSet({
          head: $("ss-head").value.replace(/\s+$/, ""),
          tagline: $("ss-tag").value.trim(),
          vatReg: $("ss-vreg").value === "1",
          vatNo: $("ss-vno").value.replace(/\s/g, ""),
          vc: $("ss-vc").value,
          inc: $("ss-inc").value === "1",
          nextEst: +$("ss-ne").value || 1,
          nextInv: +$("ss-ni").value || 1,
          payDays: +$("ss-pd").value || 14,
          validDays: +$("ss-vd").value || 30,
          intro: $("ss-intro").value,
          costNote: $("ss-cnote").value,
          inclHead: $("ss-ih").value.trim(),
          exclHead: $("ss-eh").value.trim(),
          closing: $("ss-close").value,
          signoff: $("ss-so").value,
          termsTitle: $("ss-tt").value.trim(),
          termsVer: $("ss-tv").value.trim(),
          terms: $("ss-terms").value,
          bank: $("ss-bank").value.trim(),
          invNote: $("ss-in").value.trim(),
          invIntro: $("ss-ii").value.trim(),
          mailT: Object.fromEntries(
            Object.keys(SD_MAILT).map((k) => [k, $("ss-mt-" + k).value.trim()]),
          ),
        });
        closeForm();
        toast("Saved");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
  );
  /* pictures save straight away */
  const upImg = (cls, key, box, what) => {
    const fi = document.querySelector("." + cls);
    fi.onchange = async () => {
      const f = fi.files[0];
      fi.value = "";
      if (!f) return;
      try {
        const id = await sdUploadImg(f, f.name);
        await sdSaveSet({ [key]: id });
        $(box).innerHTML = `<img src="${esc(blobUrl(id))}" alt="${what}" class="sd-img">`;
        toast(what === "logo" ? "Logo saved" : "Signature saved");
      } catch (e) {
        toast("Couldn't save the picture. Check your connection.");
      }
    };
  };
  upImg("ss-logofile", "logoId", "ss-logo", "logo");
  upImg("ss-sigfile", "sigId", "ss-sig", "signature");
  const lf = document.querySelector(".ss-lhfile");
  lf.onchange = async () => {
    const f = lf.files[0];
    lf.value = "";
    if (!f) return;
    try {
      const r = await sdReadDocxAll(f);
      const lh = r.letterhead;
      if (lh.head) $("ss-head").value = lh.head;
      if (lh.tagline) $("ss-tag").value = lh.tagline;
      if (lh.vat) $("ss-vno").value = lh.vat;
      if (r.logo) {
        const id = await sdUploadImg(r.logo, "logo." + (r.logo.type.split("/")[1] || "png"));
        await sdSaveSet({ logoId: id });
        $("ss-logo").innerHTML = `<img src="${esc(blobUrl(id))}" alt="logo" class="sd-img">`;
      }
      toast("Letterhead brought in – check it and Save");
    } catch (e) {
      toast("Couldn't read that file. Is it a Word (.docx) file?");
    }
  };
}

/* ---------- bring in a Word estimate ---------- */
async function sdImportWord(file) {
  toast("Reading " + file.name + "…");
  let r, p;
  try {
    r = await sdReadDocxAll(file);
    p = sdParseEstimate(r.paras);
  } catch (e) {
    return toast("Couldn't read that file. Is it a Word (.docx) file?");
  }
  const e = p.est,
    c = sdCalc(e),
    lh = r.letterhead;
  const sig = r.image(p.sigRel);
  const taken =
    e.number &&
    sdSales().some((x) => x.type === "estimate" && String(x.number) === String(e.number));
  const box = (id, on, label) =>
    `<label class="inl"><input type="checkbox" id="${id}"${on ? " checked" : ""}> ${label}</label>`;
  openSheet(
    `<h3 id="sheettitle">📄 ${esc(file.name)}</h3>
    <div class="sd-imp">
      <div class="drow"><span>Client</span><b>${esc(e.client || "–")}</b></div>
      <div class="drow"><span>Estimate number</span><b>${esc(e.number || "–")}</b></div>
      <div class="drow"><span>Re:</span><b>${esc(e.title || "–")}</b></div>
      <div class="drow"><span>Total</span><b>${gbp(c.net)}${c.vat ? " +VAT" : ""}</b></div>
      <div class="drow"><span>Works included / excluded</span><b>${e.incl.split("\n").filter(Boolean).length} / ${e.excl.split("\n").filter(Boolean).length} lines</b></div>
    </div>
    ${box("si-est", true, `Add it as an estimate${taken ? " (that number is already used, so it gets the next one)" : ""}`)}
    ${p.terms ? box("si-terms", true, `Use its terms and conditions (${p.terms.split("\n").length} paragraphs) as my standard terms`) : ""}
    ${p.intro || p.closing ? box("si-words", !(S.salesSet || {}).wordsFrom, "Use its wording (opening, note, closing, sign-off) as my standard wording") : ""}
    ${lh.head || r.logo ? box("si-lh", !(S.salesSet || {}).head && !(S.salesSet || {}).logoId, "Use its letterhead (logo, address lines, foot line) as my letterhead") : ""}
    ${sig ? box("si-sig", !(S.salesSet || {}).sigId, "Use the signature in it as my signature") : ""}
    ${lh.vat ? `<div class="who">Its VAT number is ${esc(lh.vat)}. Your VAT number is set in ⚙️ Letterhead, terms & bank.</div>` : ""}
    ${formFoot(false, "Bring it in")}`,
    async () => {
      $("f-save").disabled = true;
      const on = (id) => $(id) && $(id).checked;
      try {
        const patch = {};
        if (on("si-terms"))
          Object.assign(patch, {
            terms: p.terms,
            termsTitle: p.termsTitle || "Terms and Conditions of Contract",
            termsVer: p.termsVer,
          });
        if (on("si-words"))
          Object.assign(
            patch,
            p.intro ? { intro: p.intro } : {},
            p.costNote ? { costNote: p.costNote } : {},
            p.closing ? { closing: p.closing } : {},
            p.signoff ? { signoff: p.signoff } : {},
            e.inclHead ? { inclHead: e.inclHead } : {},
            { wordsFrom: file.name },
          );
        if (on("si-lh")) {
          Object.assign(
            patch,
            lh.head ? { head: lh.head } : {},
            lh.tagline ? { tagline: lh.tagline } : {},
          );
          if (r.logo)
            patch.logoId = await sdUploadImg(
              r.logo,
              "logo." + (r.logo.type.split("/")[1] || "png"),
            );
        }
        if (on("si-sig"))
          patch.sigId = await sdUploadImg(sig, "signature." + (sig.type.split("/")[1] || "png"));
        if (Object.keys(patch).length) await sdSaveSet(patch);
        let made = null;
        if (on("si-est")) {
          const o = Object.assign({}, e, {
            intro: p.intro || sdSet().intro,
            costNote: p.costNote || sdSet().costNote,
            closing: p.closing || sdSet().closing,
            signoff: p.signoff || sdSet().signoff,
            inclHead: e.inclHead || sdSet().inclHead,
            bd: "total",
            status: "sent",
            sentAt: Date.now(),
            from: file.name,
          });
          delete o.inclHead;
          if (taken || !o.number) delete o.number;
          if (!o.date) o.date = iso(new Date());
          made = await sdSaveRec(o);
        }
        closeForm();
        toast(made ? "Estimate " + made.number + " brought in" : "Saved");
        S.f.sv = "est";
        render();
      } catch (er) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
  );
}

/* ---------- the one-off set-up card at the top of Estimates & invoices ---------- */
function sdSetupCard() {
  const s = S.salesSet || {};
  const lh = !!(s.head || s.logoId),
    terms = !!s.terms;
  if (lh && terms) return "";
  const step = (done, n, label, cls, help) =>
    `<div class="sd-step${done ? " done" : ""}"><b>${done ? "✓" : n}</b><span>${label}<small>${help}</small></span>${done ? "" : `<span class="btn primary sd-filebtn">Choose the Word file<input type="file" class="${cls}" accept=".docx" aria-label="${label}"></span>`}</div>`;
  return `<section class="card sd-setup"><div class="cardbody"><b>Set up your letterhead and terms (once)</b>
    <div class="who">Then every estimate and invoice comes out on your letterhead, and your terms go on the end of every estimate by themselves.</div>
    ${step(lh, 1, "Bring in your Word letterhead", "sd-su-lh", "Your logo, address, phone, email, the line at the foot and your VAT number.")}
    ${step(terms, 2, "Bring in one of your Word estimates", "sd-su-est", "Your terms and conditions, your usual wording and your signature.")}
  </div></section>`;
}
function sdWireSetup() {
  const a = document.querySelector("#main .sd-su-lh"),
    b = document.querySelector("#main .sd-su-est");
  if (a)
    a.onchange = async () => {
      const f = a.files[0];
      a.value = "";
      if (f) await sdQuickLetterhead(f);
    };
  if (b)
    b.onchange = async () => {
      const f = b.files[0];
      b.value = "";
      if (f) sdImportWord(f);
    };
}
/* a Word letterhead straight in: header lines, logo, foot line and VAT number */
async function sdQuickLetterhead(file) {
  toast("Reading " + file.name + "…");
  try {
    const r = await sdReadDocxAll(file);
    const lh = r.letterhead;
    if (!lh.head && !r.logo)
      return toast("No letterhead found in that file (it should be in the page header)");
    const patch = {};
    if (lh.head) patch.head = lh.head;
    if (lh.tagline) patch.tagline = lh.tagline;
    if (lh.vat) patch.vatNo = lh.vat;
    if (r.logo)
      patch.logoId = await sdUploadImg(r.logo, "logo." + (r.logo.type.split("/")[1] || "png"));
    await sdSaveSet(patch);
    toast("Letterhead saved" + (lh.vat ? " · VAT number " + lh.vat : ""));
    render();
  } catch (e) {
    toast("Couldn't read that file. Is it a Word (.docx) file?");
  }
}
