/* ================= VARIATIONS: extra work agreed on site – photo, price and the client's signature, then onto the next invoice ================= */
import { clAddr } from "../clients/stages-planner.js";
import { $, esc, gbp, iso, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { blobUrl, uploadFile } from "../files/files.js";
import { getFileBlob } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { BRGB } from "../photos/photos.js";
import { loadJsPdf, sigPad } from "../safety/site-inductions.js";
import { shrinkImage } from "../safety/training.js";
import { lhLogoId, lhPics, lhPutBot, lhPutTop } from "./letterhead-setup.js";
import { SD_VATC, sdNo, sdR2, sdSales, sdSaveRec, sdSet } from "./sales-calc.js";
import { sdEdit } from "./sales-edit.js";
import { sdImgData } from "./sales-pdf.js";
import { siteClient } from "../sites/summary.js";
export { vrNew, vrView };
/* Owner-private, todos/var-<id> (kind "variation"): { site, clientId, client, title, details, photos: [assetId],
   amt (before VAT), vc (VAT code), status "open" (waiting for the client to sign) | "signed" | "cancelled",
   sign: { name, at, sigId (picture of the signature), pdfId (the signed sheet) }, invId (the invoice it went onto),
   number (V1, V2… in the order made), created }. A signed variation is locked: it can't be changed, cancelled or
   deleted. "Put on an invoice" adds a job's signed, uninvoiced variations as lines on that job's draft invoice, or
   starts one (an "Extra work" invoice) if there isn't one. */
const VR_STATUS = {
  open: ["Waiting for signature", "warn"],
  signed: ["Signed", "ok"],
  cancelled: ["Cancelled", ""],
};
const vrAll = () =>
  (S.variations || []).slice().sort((a, b) => (b.created || 0) - (a.created || 0));
const vrNet = (v) => sdR2(+v.amt || 0);
const vrVat = (v) => {
  const c = SD_VATC[v.vc] || SD_VATC.S20;
  return c.rc ? 0 : sdR2((vrNet(v) * c.r) / 100);
};
const vrTot = (v) => sdR2(vrNet(v) + vrVat(v));
const vrSites = () => (S.sites || []).filter((s) => !s.archived && s.name).map((s) => s.name);
async function vrSave(v) {
  const rec = Object.assign({}, v, { kind: "variation", updated: Date.now() });
  const id = rec.id || "var-" + newId();
  delete rec.id;
  if (!rec.created) rec.created = Date.now();
  if (!rec.number)
    rec.number =
      "V" +
      (Math.max(0, ...vrAll().map((x) => +String(x.number || "").replace(/\D/g, "") || 0)) + 1);
  await S.db.doc("todos/" + id).set(rec);
  return Object.assign({ id }, rec);
}
/* ---------- the page (Estimates & invoices › Variations) ---------- */
function vrView(tabs) {
  const all = vrAll().filter((v) => v.status !== "cancelled" || S.f.vrc);
  /* signed, not on an invoice yet, by job */
  const toInv = {};
  all
    .filter((v) => v.status === "signed" && !v.invId)
    .forEach((v) => (toInv[v.site] = toInv[v.site] || []).push(v));
  $("main").innerHTML = `<div class="sd-page">${tabs}
    <div class="who">Extra work agreed on site: what it is, photos, the price, and the client's signature before you start. Signed ones go onto the job's next invoice with one tap.</div>
    <div class="sd-acts"><button type="button" class="btn primary" id="vr-new">📝 New variation</button></div>
    ${Object.entries(toInv)
      .map(
        ([site, vs]) =>
          `<div class="notice vr-due"><b>${esc(site)}</b>: ${vs.length} signed variation${vs.length === 1 ? "" : "s"} not invoiced yet, ${gbp(vs.reduce((a, v) => a + vrNet(v), 0))} + VAT <button type="button" class="btn primary vr-inv" data-s="${esc(site)}">🧾 Put on an invoice</button></div>`,
      )
      .join("")}
    ${
      all.length
        ? `<div class="vr-list">${all
            .map((v) => {
              const st = VR_STATUS[v.status] || VR_STATUS.open;
              const inv = v.invId ? sdSales().find((d) => d.id === v.invId) : null;
              return `<button type="button" class="vr-row" data-id="${esc(v.id)}"><span class="vr-main"><b>${esc(v.number || "")} · ${esc(v.title || "Variation")}</b><span class="who">${esc(v.site || "")}${v.client ? " · " + esc(v.client) : ""} · ${esc(shortDay(iso(new Date(v.created || Date.now()))))}</span></span><span class="vr-side"><b>${gbp(vrNet(v))}</b><span class="who">+ VAT</span><span class="tag ${st[1]}">${esc(st[0])}</span>${inv ? `<span class="tag ok">On ${esc(sdNo(inv))}</span>` : ""}</span></button>`;
            })
            .join("")}</div>`
        : `<div class="empty"><strong>No variations yet</strong>When a client asks for something extra on site, tap 📝 New variation: photo, price, and they sign there and then.</div>`
    }
    ${(S.variations || []).some((v) => v.status === "cancelled") ? `<label class="inl"><input type="checkbox" id="vr-showc"${S.f.vrc ? " checked" : ""}> Show cancelled ones</label>` : ""}
  </div>`;
  $("vr-new").onclick = () => vrNew();
  if ($("vr-showc"))
    $("vr-showc").onchange = (e) => {
      S.f.vrc = e.target.checked;
      render();
    };
  document
    .querySelectorAll("#main .vr-row")
    .forEach((b) => (b.onclick = () => vrOpen(vrAll().find((v) => v.id === b.dataset.id))));
  document
    .querySelectorAll("#main .vr-inv")
    .forEach((b) => (b.onclick = () => vrInvoice(b.dataset.s)));
}
/* ---------- a new variation: what, photos, price ---------- */
function vrNew(site0) {
  const sites = vrSites();
  const set = sdSet();
  const vc0 = set.vatReg === false ? "NV" : set.vc || "S20";
  let photos = [];
  openSheet(
    `<h3 id="sheettitle">📝 New variation</h3>
    <div class="who">Fill this in with the client, then hand them the iPad to sign before the extra work starts.</div>
    <label for="vr-site">Job<select id="vr-site"><option value="">Pick the job…</option>${sites.map((s) => `<option value="${esc(s)}"${s === site0 ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
    <label for="vr-client">Client's name<input id="vr-client" maxlength="80" placeholder="e.g. Mr Smith"></label>
    <label for="vr-title">What's the extra work?<input id="vr-title" maxlength="120" placeholder="e.g. Move the radiator to the other wall"></label>
    <label for="vr-det">Details (what's included)<textarea id="vr-det" maxlength="2000" rows="3" placeholder="e.g. Drain down, new pipework in 15 mm copper, refit and refill"></textarea></label>
    <div class="flabel">Photos</div>
    <div class="vr-photos" id="vr-ph"></div>
    <span class="btn sd-filebtn">📷 Add a photo<input type="file" class="vr-file" accept="image/*" multiple aria-label="Add a photo"></span>
    <div class="grid2"><label for="vr-amt">Price before VAT £<input id="vr-amt" type="number" inputmode="decimal" step="0.01" min="0"></label><label for="vr-vc">VAT<select id="vr-vc">${Object.entries(
      SD_VATC,
    )
      .map(
        ([k, c]) => `<option value="${k}"${k === vc0 ? " selected" : ""}>${esc(c.l || k)}</option>`,
      )
      .join("")}</select></label></div>
    <div class="who" id="vr-total"></div>
    ${formFoot(false, "Next: client signs")}`,
    async () => {
      const v = vrRead(photos);
      if (!v.site) return showErr("Pick the job.");
      if (!v.title) return showErr("Say what the extra work is.");
      if (!(v.amt > 0)) return showErr("Put in the price.");
      try {
        $("f-save").disabled = true;
        const saved = await vrSave(Object.assign(v, { status: "open" }));
        closeForm();
        vrSign(saved);
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    "vr-title",
  );
  const fillClient = () => {
    const c = siteClient($("vr-site").value);
    if (c && !$("vr-client").value) $("vr-client").value = c.name || "";
  };
  $("vr-site").onchange = fillClient;
  fillClient();
  const tot = () => {
    const v = vrRead(photos);
    $("vr-total").textContent =
      v.amt > 0 ? `${gbp(vrNet(v))} + VAT ${gbp(vrVat(v))} = ${gbp(vrTot(v))}` : "";
  };
  $("vr-amt").oninput = tot;
  $("vr-vc").onchange = tot;
  const drawPh = () =>
    ($("vr-ph").innerHTML = photos
      .map((id) => `<img src="${esc(blobUrl(id))}" alt="Photo" class="vr-thumb">`)
      .join(""));
  const fi = document.querySelector(".vr-file");
  fi.onchange = async () => {
    const files = [...fi.files];
    fi.value = "";
    for (const f of files) {
      try {
        toast("Adding the photo…");
        const a = await uploadFile(await shrinkImage(f, 1600), f.name || "photo.jpg");
        photos.push(a.id);
        drawPh();
      } catch (e) {
        toast("Couldn't add that photo. Check your connection.");
      }
    }
  };
}
function vrRead(photos) {
  const c = siteClient($("vr-site").value);
  return {
    site: $("vr-site").value,
    clientId: c ? c.id : "",
    client: $("vr-client").value.trim(),
    title: $("vr-title").value.trim(),
    details: $("vr-det").value.trim(),
    photos: photos.slice(),
    amt: sdR2($("vr-amt").value),
    vc: $("vr-vc").value,
  };
}
/* ---------- the client signs ---------- */
const VR_STMT = "I agree to this extra work at this price, on top of the price already agreed.";
function vrSign(v) {
  openSheet(
    `<h3 id="sheettitle">✍️ ${esc(v.number)} · ${esc(v.title)}</h3>
    <div class="vr-sum"><div>${esc(v.site)}</div>${v.details ? `<div class="vr-det">${esc(v.details)}</div>` : ""}${(v.photos || []).length ? `<div class="vr-photos">${v.photos.map((id) => `<img src="${esc(blobUrl(id))}" alt="Photo" class="vr-thumb">`).join("")}</div>` : ""}
      <div class="drow"><span>Price</span><b>${gbp(vrNet(v))} + VAT ${gbp(vrVat(v))} = ${gbp(vrTot(v))}</b></div></div>
    <div class="vr-stmt">${esc(VR_STMT)}</div>
    <label for="vr-name">Your name<input id="vr-name" maxlength="80" value="${esc(v.client || "")}" autocomplete="name"></label>
    <div><div class="checkhead"><span class="flabel" style="margin:0">Sign here</span><button type="button" class="pillbtn" id="vr-clear">Clear</button></div><canvas id="vr-pad" class="sigpad" aria-label="Signature box"></canvas></div>
    <div class="who">Not ready to sign? Tap Cancel: it's kept, waiting for a signature.</div>
    ${formFoot(false, "Sign and agree")}`,
    async () => {
      const name = $("vr-name").value.trim();
      if (!name) return showErr("Type your name.");
      if (!pad.drawn) return showErr("Sign in the box first.");
      $("f-save").disabled = true;
      try {
        const sigBlob = await (await fetch(pad.data())).blob();
        const sig = await uploadFile(sigBlob, "variation-signature.png");
        const signed = Object.assign({}, v, {
          status: "signed",
          sign: { name, at: Date.now(), sigId: sig.id },
        });
        const pdf = await vrPdf(signed);
        const a = await uploadFile(pdf, `Variation ${v.number} ${v.site}.pdf`);
        signed.sign.pdfId = a.id;
        await vrSave(signed);
        closeForm();
        toast(`Signed by ${name}: ${v.number} ready to go on the next invoice`);
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    "vr-name",
  );
  const pad = sigPad($("vr-pad"));
  $("vr-clear").onclick = () => pad.clear();
}
/* ---------- one variation ---------- */
function vrOpen(v) {
  if (!v) return;
  const st = VR_STATUS[v.status] || VR_STATUS.open;
  const inv = v.invId ? sdSales().find((d) => d.id === v.invId) : null;
  openViewer(`<span class="tag ${st[1]}">${esc(st[0])}</span><h3 class="vr-h">${esc(v.number)} · ${esc(v.title)}</h3>
    <div class="who">${esc(v.site)}${v.client ? " · " + esc(v.client) : ""}</div>
    ${v.details ? `<div class="vr-det">${esc(v.details)}</div>` : ""}
    ${(v.photos || []).length ? `<div class="vr-photos">${v.photos.map((id) => `<img src="${esc(blobUrl(id))}" alt="Photo" class="vr-thumb">`).join("")}</div>` : ""}
    <div class="drow"><span>Price</span><b>${gbp(vrNet(v))} + VAT ${gbp(vrVat(v))} = ${gbp(vrTot(v))}</b></div>
    ${v.sign ? `<div class="drow"><span>Signed</span><span>${esc(v.sign.name)} · ${esc(new Date(v.sign.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }))}</span></div>${v.sign.sigId ? `<img src="${esc(blobUrl(v.sign.sigId))}" alt="Signature" class="vr-sig">` : ""}` : ""}
    ${inv ? `<div class="drow"><span>Invoiced</span><span>${esc(sdNo(inv))}</span></div>` : ""}
    <div class="actions">${v.status === "open" ? `<button type="button" class="btn primary" id="vr-signnow">✍️ Client signs now</button><button type="button" class="btn danger" id="vr-cancel">Cancel this variation</button>` : ""}${v.sign && v.sign.pdfId ? `<button type="button" class="btn" id="vr-pdf">📄 Signed sheet (PDF)</button>` : ""}${v.status === "signed" && !v.invId ? `<button type="button" class="btn primary" id="vr-toinv">🧾 Put on an invoice</button>` : ""}</div>
    ${v.status === "signed" ? `<div class="who">🔒 Signed, so it can't be changed.</div>` : ""}`);
  if ($("vr-signnow"))
    $("vr-signnow").onclick = () => {
      closeViewer();
      vrSign(v);
    };
  if ($("vr-cancel"))
    $("vr-cancel").onclick = async () => {
      await vrSave(Object.assign({}, v, { status: "cancelled" }));
      closeViewer();
      toast("Variation cancelled");
      render();
    };
  if ($("vr-pdf"))
    $("vr-pdf").onclick = async () => {
      try {
        const b = await getFileBlob(v.sign.pdfId);
        await S.dl.save({ filename: `Variation ${v.number} ${v.site}.pdf`, data: b });
      } catch (e) {
        toast("Couldn't open it. Check your connection.");
      }
    };
  if ($("vr-toinv"))
    $("vr-toinv").onclick = () => {
      closeViewer();
      vrInvoice(v.site);
    };
}
/* ---------- the signed sheet, on the letterhead ---------- */
async function vrPdf(v) {
  await loadJsPdf();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const brand = BRGB(),
    co = coData();
  const pics = await lhPics();
  let y;
  if (pics) y = lhPutTop(doc, pics, 0) + 14;
  else {
    const logo = await sdImgData(lhLogoId());
    if (logo) {
      const k = Math.min(60 / logo.w, 28 / logo.h);
      doc.addImage(logo.u, logo.f, 16, 8, logo.w * k, logo.h * k, "vrlogo", "FAST");
    }
    doc.setDrawColor(...brand);
    doc.setLineWidth(0.7);
    doc.line(3, 42, 207, 42);
    y = 54;
  }
  const M = 25,
    R = 185,
    bot = pics && pics.bot ? pics.bot.y - 8 : 272;
  const need = (h) => {
    if (y + h > bot) {
      doc.addPage();
      y = pics ? lhPutTop(doc, pics, 0) + 10 : 20;
      if (pics && pics.bot) lhPutBot(doc, pics);
    }
  };
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...brand);
  doc.text("Variation – extra work agreed", M, y);
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  const line = (k, val) => {
    need(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110, 110, 110);
    doc.text(k, M, y);
    doc.setTextColor(20, 20, 20);
    doc.text(doc.splitTextToSize(String(val || ""), R - M - 45), M + 45, y);
    y += 6;
  };
  line("Variation", v.number);
  line("Job", v.site);
  if (v.client) line("Client", v.client);
  line("Company", co.name);
  y += 3;
  need(10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(doc.splitTextToSize(v.title, R - M), M, y);
  y += 7;
  if (v.details) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.splitTextToSize(v.details, R - M).forEach((t) => {
      need(5.2);
      doc.text(t, M, y);
      y += 5.2;
    });
    y += 2;
  }
  /* photos, two to a row */
  const ph = [];
  for (const id of v.photos || []) {
    const im = await sdImgData(id);
    if (im) ph.push(im);
  }
  for (let i = 0; i < ph.length; i += 2) {
    const h = 55;
    need(h + 4);
    [ph[i], ph[i + 1]].forEach((im, j) => {
      if (!im) return;
      const k = Math.min(75 / im.w, h / im.h);
      doc.addImage(im.u, im.f, M + j * 82, y, im.w * k, im.h * k, "vrph" + i + j, "FAST");
    });
    y += h + 4;
  }
  if (ph.length) y += 5;
  need(26);
  doc.setFontSize(11);
  line("Price before VAT", gbp(vrNet(v)));
  line("VAT", gbp(vrVat(v)));
  doc.setFont("helvetica", "bold");
  line("Total", gbp(vrTot(v)));
  y += 4;
  need(40);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10.5);
  doc.text(doc.splitTextToSize(VR_STMT, R - M), M, y);
  y += 8;
  if (v.sign) {
    const sig = await sdImgData(v.sign.sigId);
    if (sig) {
      const k = Math.min(60 / sig.w, 22 / sig.h);
      doc.addImage(sig.u, sig.f, M, y, sig.w * k, sig.h * k, "vrsig", "FAST");
      y += sig.h * k + 3;
    }
    doc.setFont("helvetica", "normal");
    doc.text(
      `Signed by ${v.sign.name}, ${new Date(v.sign.at).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}`,
      M,
      y,
    );
  }
  if (pics && pics.bot) {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      lhPutBot(doc, pics);
    }
  }
  return doc.output("blob");
}
/* ---------- onto the next invoice ---------- */
async function vrInvoice(site) {
  const vs = vrAll().filter((v) => v.site === site && v.status === "signed" && !v.invId);
  if (!vs.length) return toast("Nothing to invoice for " + site);
  const lines = vs.map((v) => ({
    d: `Variation ${v.number}: ${v.title}${v.sign ? ` (agreed ${shortDay(iso(new Date(v.sign.at)))})` : ""}`,
    a: vrNet(v),
    vc: v.vc || "S20",
    k: "lab",
  }));
  const draft = sdSales().find(
    (d) => d.type === "invoice" && (!d.status || d.status === "draft") && d.site === site,
  );
  try {
    let rec;
    if (draft) {
      const keep = (draft.lines || []).filter((l) => String(l.d || "").trim() || +l.a);
      rec = await sdSaveRec(Object.assign({}, draft, { lines: keep.concat(lines) }));
    } else {
      const c = siteClient(site);
      rec = await sdSaveRec({
        type: "invoice",
        ik: "extra",
        status: "draft",
        date: iso(new Date()),
        site,
        clientId: c ? c.id : "",
        client: (c && c.name) || vs[0].client || "",
        address: c ? clAddr(c) : "",
        title: "Extra work – " + site,
        lines,
        payments: [],
      });
    }
    for (const v of vs) await vrSave(Object.assign({}, v, { invId: rec.id }));
    toast(
      `${vs.length} variation${vs.length === 1 ? "" : "s"} added to ${draft ? "the draft" : "a new"} invoice ${sdNo(rec)} – check it and send`,
    );
    sdEdit(rec);
  } catch (e) {
    toast("Couldn't save. Check your connection.");
  }
}
