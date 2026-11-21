/* ================= TERMS SETUP: the firm's terms and conditions in Setup, beside the letterhead ================= */
import { $, esc, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { uploadFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { BRGB } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { lhbTermsOpen } from "./lh-builder.js";
import { sdSet } from "./sales-calc.js";
import { sdSaveSet } from "./sales-settings.js";
export { tmsCardHtml, tmsPick, tmsSets, tmsWire };
/* James (Nov 2026): "my letterhead should be from setup and need to add terms and conditions there so that it pulls
   from … invoices dont need the terms … in polices it terms should appear in there also. I also might have more than
   one type of term and conditions". Setup › 📜 My terms and conditions, right under 📄 My letterhead: any number of sets
   of terms (e.g. Standard, Small works, Commercial), each a PDF kept exactly as uploaded or typed; one is ⭐ the
   standard. A new estimate starts with the standard set and can pick another (sales/sales-edit.js); invoices take only
   the payment terms. Each set is also in Policies › Terms and conditions (docs/terms-<id>; a typed set is made into a
   PDF for it). Kept in todos/salesset.termSets / termsDefault; the standard set is also kept in the older single
   fields (terms, termsTitle, termsPdfId, termsPdfName), which the rest of the app and ✨ Make my terms still use. */
const TMS_FOLDER = "Terms and conditions";
/* the sets, the standard one's content from the single fields */
function tmsSets() {
  const s = sdSet();
  let L = (s.termSets || []).map((x) => Object.assign({}, x));
  if (!L.length && (s.terms || s.termsPdfId))
    L = [{ id: "std", name: s.termsTitle || "Standard terms" }];
  const def = L.find((x) => x.id === s.termsDefault) || L[0];
  if (def)
    Object.assign(def, {
      pdfId: s.termsPdfId || "",
      pdfName: s.termsPdfName || "",
      title: s.termsTitle || "",
      text: s.terms || "",
    });
  return { sets: L, def: def ? def.id : "" };
}
/* the set an estimate uses: its own choice, else the standard */
function tmsPick(id) {
  const { sets, def } = tmsSets();
  return sets.find((x) => x.id === id) || sets.find((x) => x.id === def) || null;
}
async function tmsSave(sets, defId) {
  const d = sets.find((x) => x.id === defId) || sets[0] || null;
  await sdSaveSet({
    termSets: sets,
    termsDefault: d ? d.id : "",
    terms: d ? d.text || "" : "",
    termsTitle: d ? d.title || "" : "",
    termsPdfId: d ? d.pdfId || "" : "",
    termsPdfName: d ? d.pdfName || "" : "",
  });
}
/* the set in Policies › Terms and conditions, as a PDF */
async function tmsPolicy(t) {
  const ref = S.db.doc("docs/terms-" + t.id);
  try {
    let assetId = t.pdfId,
      fileName = t.pdfName || t.name + ".pdf",
      size = 0;
    if (!assetId && (t.text || "").trim()) {
      await loadJsPdf();
      const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
      const M = 20,
        W = 170;
      let y = 25;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(...BRGB());
      doc.text(t.title || t.name || "Terms and conditions", M, y);
      y += 10;
      doc.setTextColor(30, 30, 30);
      String(t.text)
        .split("\n")
        .forEach((ln) => {
          const h = /^#{1,3}\s/.test(ln);
          doc.setFont("helvetica", h ? "bold" : "normal");
          doc.setFontSize(h ? 12 : 10);
          const parts = doc.splitTextToSize(
            ln.replace(/^#{1,3}\s/, "").replace(/^- /, "• ") || " ",
            W,
          );
          parts.forEach((p) => {
            if (y > 280) {
              doc.addPage();
              y = 20;
            }
            doc.text(p, M, y);
            y += h ? 6 : 4.8;
          });
          if (h) y += 1;
        });
      const blob = doc.output("blob");
      fileName = (t.name || "Terms") + ".pdf";
      const up = await uploadFile(blob, fileName);
      assetId = up.id;
      size = up.sizeBytes || blob.size;
    }
    if (!assetId) return ref.delete().catch(() => {});
    await ref.set({
      cat: "folder",
      folder: TMS_FOLDER,
      title: t.name || "Terms and conditions",
      fileName,
      assetId,
      contentType: "application/pdf",
      size,
      uploaded: Date.now(),
      termsSet: t.id,
    });
  } catch (e) {
    toast("Saved, but couldn't put it in Policies – check your connection");
  }
}
function tmsCardHtml() {
  const s = sdSet();
  const { sets, def } = tmsSets();
  return `<div class="card tms-card"><div class="cardbody" style="border:0"><b>📜 My terms and conditions</b>
    <div class="who">Every new estimate starts with your ⭐ standard terms and can use another set instead. Each set is also in Policies › ${TMS_FOLDER}.</div>
    ${
      sets.length
        ? sets
            .map(
              (t) =>
                `<div class="tms-row" data-id="${esc(t.id)}"><div class="tms-nm"><b>${esc(t.name || "Terms")}</b>${t.id === def ? ' <span class="tag ok">⭐ Standard</span>' : ""}<div class="who">${t.pdfId ? "📄 " + esc(t.pdfName || "PDF") + " – exactly as uploaded" : (t.text || "").trim() ? "✏️ Typed terms" : "Empty"}</div></div><button type="button" class="pillbtn tms-ed">Change</button>${t.id === def ? "" : '<button type="button" class="pillbtn tms-def">Make standard</button>'}</div>`,
            )
            .join("")
        : '<div class="notice warn">No terms yet: estimates go out without them. Upload your terms as a PDF, type them, or let the app write some.</div>'
    }
    <div class="actions"><button type="button" class="btn ${sets.length ? "" : "primary "}" id="tms-add">+ ${sets.length ? "Add another set of terms" : "Add my terms"}</button><button type="button" class="btn" id="tms-make">✨ ${sets.length ? "Write new terms for me" : "No terms? Make them"}</button></div>
    <div class="flabel">On invoices</div>
    <div class="who">Invoices don't carry your terms and conditions – just these payment terms.</div>
    <label for="tms-iterms">Payment terms<textarea id="tms-iterms" rows="3" maxlength="20000">${esc(s.invTerms || "")}</textarea></label>
    <div class="actions"><button type="button" class="btn" id="tms-isave">Save payment terms</button></div>
  </div></div>`;
}
function tmsEdit(id) {
  const { sets, def } = tmsSets();
  const t = sets.find((x) => x.id === id) || { id: "t" + Date.now().toString(36), name: "" };
  const isNew = !sets.some((x) => x.id === t.id);
  let pdf = t.pdfId ? { id: t.pdfId, name: t.pdfName } : null;
  let file = null;
  const pdfNow = () =>
    file
      ? `✓ <b>${esc(file.name)}</b> – uploads when you save`
      : pdf
        ? `✓ <b>${esc(pdf.name || "Terms PDF")}</b> – kept exactly as uploaded <button type="button" class="linkbtn" id="tme-open">Open</button> · <button type="button" class="linkbtn" id="tme-x">Don't use a PDF</button>`
        : '<span class="who">No PDF – the typed terms below are used.</span>';
  openSheet(
    `<h3 id="sheettitle">📜 ${isNew ? "New set of terms" : "Change these terms"}</h3>
    <label for="tme-nm">Name (e.g. Standard terms, Small works, Commercial)<input id="tme-nm" maxlength="80" value="${esc(t.name || "")}"></label>
    <div class="flabel">Your terms as a PDF</div><div id="tme-now">${pdfNow()}</div>
    <div class="actions"><label class="btn tms-up">📄 ${pdf ? "Upload a different PDF" : "Upload a PDF"}<input type="file" id="tme-pdf" class="fpick" accept="application/pdf,.pdf" data-cam="1"></label></div>
    <details class="tms-typed"${!pdf ? " open" : ""}><summary>✏️ Or type them</summary>
      <label for="tme-tt">Title<input id="tme-tt" maxlength="120" value="${esc(t.title || "")}" placeholder="Terms and Conditions of Contract"></label>
      <label for="tme-tx">The terms<textarea id="tme-tx" rows="12" maxlength="80000">${esc(t.text || "")}</textarea></label>
      <div class="who">A line starting <b>#</b> is a heading, <b>##</b> a smaller heading, <b>-</b> a bullet point.</div></details>
    ${formFoot(!isNew, "Save these terms")}`,
    async () => {
      const name = $("tme-nm").value.trim();
      if (!name) return showErr("Give these terms a name");
      $("f-save").disabled = true;
      try {
        if (file) {
          const up = await uploadFile(file, file.name || "Terms.pdf");
          pdf = { id: up.id, name: file.name || "Terms.pdf" };
        }
        const nt = Object.assign({}, t, {
          name,
          title: $("tme-tt").value.trim(),
          text: $("tme-tx").value,
          pdfId: pdf ? pdf.id : "",
          pdfName: pdf ? pdf.name : "",
        });
        const L = isNew ? sets.concat([nt]) : sets.map((x) => (x.id === t.id ? nt : x));
        await tmsSave(L, def || nt.id);
        closeForm();
        toast("Terms saved");
        render();
        tmsPolicy(nt);
      } catch (e) {
        $("f-save").disabled = false;
        showErr("Couldn't save. Check your connection.");
      }
    },
    "tme-nm",
  );
  const wire = () => {
    if ($("tme-open")) $("tme-open").onclick = () => openFile(pdf.id, "Terms", "application/pdf");
    if ($("tme-x"))
      $("tme-x").onclick = () => {
        pdf = null;
        $("tme-now").innerHTML = pdfNow();
        wire();
      };
  };
  wire();
  $("tme-pdf").onchange = (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (!/pdf/i.test(f.type || "") && !/\.pdf$/i.test(f.name || "")) return toast("Choose a PDF");
    file = f;
    $("tme-now").innerHTML = pdfNow();
  };
  if (!isNew)
    armDelete(async () => {
      const L = sets.filter((x) => x.id !== t.id);
      await tmsSave(L, def === t.id ? (L[0] || {}).id || "" : def);
      await S.db
        .doc("docs/terms-" + t.id)
        .delete()
        .catch(() => {});
      closeForm();
      toast("Terms removed");
      render();
    });
}
function tmsWire() {
  if (!$("tms-add")) return;
  $("tms-add").onclick = () => tmsEdit("");
  $("tms-make").onclick = () => lhbTermsOpen();
  document.querySelectorAll("#main .tms-row").forEach((r) => {
    r.querySelector(".tms-ed").onclick = () => tmsEdit(r.dataset.id);
    const d = r.querySelector(".tms-def");
    if (d)
      d.onclick = async () => {
        try {
          await tmsSave(tmsSets().sets, r.dataset.id);
          toast("That's your standard terms now");
          render();
        } catch (e) {
          toast("Couldn't save. Check your connection.");
        }
      };
  });
  $("tms-isave").onclick = async () => {
    try {
      await sdSaveSet({ invTerms: $("tms-iterms").value });
      toast("Payment terms saved – new invoices start with them");
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  };
}
