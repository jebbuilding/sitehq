/* ================= CUSTOM FORMS: fill in the forms made in Setup › Your forms, see them and make the PDF ================= */
import { lastOf, pickField, pickVal, wirePicks } from "../core/fields.js";
import { $, esc, iso, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { openViewer } from "../core/viewer.js";
import { blobUrl, uploadErr } from "../files/files.js";
import { newId, sentToast, submitJob } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { allIds, nameOf } from "../owner/owner.js";
import { BRGB } from "../photos/photos.js";
import { loadJsPdf, sigPad } from "./site-inductions.js";
import { shrinkImage } from "./training.js";
import { lhPics, lhPutBot, lhPutTop } from "../sales/letterhead-setup.js";
import { sdImgData } from "../sales/sales-pdf.js";
import { siteLabel } from "../sites/job-details.js";
import { same } from "../sites/project-pages.js";
export { cfmCardHtml, cfmSiteHtml, cfmWire };
/* The 📋 Forms tab starts with 📝 Your forms: one button for each form the person may fill in (safety/form-builder.js).
   Filling in: which job (if the form asks), then each question – typed, ticked, chosen, a photo, a signature on the
   screen. Saved like a trade's other forms (sheets/{uid}/signoffs/cf-…, type "cform", sent later with no signal),
   with the form's questions copied in so it always reads the same even if the form is changed later. James sees every
   filled-in form, newest first, on his Forms tab and on the job's page, and each makes a PDF on his letterhead. */
const cfmForms = (role) =>
  ((S.cforms || {}).forms || []).filter((f) => !f.del && !f.hidden && f.who && f.who[role]);
const cfmIsOwner = () => S.owner && !S.preview;
/* every filled-in form James can see (his own and everyone's), newest first */
function cfmAll() {
  const out = [];
  const add = (who, L) =>
    (L || []).forEach((x) => x.type === "cform" && out.push(Object.assign({ _who: who }, x)));
  if (cfmIsOwner()) allIds().forEach((id) => add(id, (S.data.signoffs || {})[id]));
  add(S.me, S.mine.signoffs);
  const seen = new Set();
  return out
    .filter((x) => (seen.has(x.id) ? false : seen.add(x.id)))
    .sort((a, b) => (b.created || 0) - (a.created || 0));
}
function cfmCardHtml() {
  const L = cfmForms(cfmIsOwner() ? "office" : "trade");
  const done = cfmAll().slice(0, cfmIsOwner() ? 12 : 6);
  if (!L.length && !done.length) return "";
  return `<div class="card cfm-card"><div class="cardbody" style="border:0"><div class="cfm-h">📝 Your forms</div>
    ${L.length ? `<div class="cfm-btns">${L.map((f) => `<button type="button" class="btn cfm-go" data-id="${esc(f.id)}">${esc(f.icon || "📝")} ${esc(f.name)}</button>`).join("")}</div>` : ""}
    ${done.length ? `<div class="flabel">${cfmIsOwner() ? "Filled in lately" : "Sent by you lately"}</div>${done.map((x) => cfmRow(x)).join("")}` : ""}
    ${cfmIsOwner() ? '<div class="who">Make or change these in Setup › 📝 Your forms.</div>' : ""}</div></div>`;
}
const cfmRow = (x) =>
  `<button type="button" class="cfm-row" data-id="${esc(x.id)}"><span><b>${esc(x.formIcon || "📝")} ${esc(x.formName || "Form")}</b><span class="who">${esc(shortDay(x.date || iso(new Date(x.created || Date.now()))))}${x.site ? " · " + esc(siteLabel(x.site)) : ""}${cfmIsOwner() && x._who !== S.me ? " · " + esc(nameOf(x._who)) : ""}</span></span><span>›</span></button>`;
function cfmWire() {
  document
    .querySelectorAll("#main .cfm-go")
    .forEach((b) => (b.onclick = () => cfmFill(b.dataset.id)));
  document.querySelectorAll("#main .cfm-row").forEach(
    (b) =>
      (b.onclick = () => {
        const x = cfmAll().find((y) => y.id === b.dataset.id);
        if (x) cfmView(x);
      }),
  );
}
/* filling one in */
function cfmFill(formId, site0) {
  const f = ((S.cforms || {}).forms || []).find((x) => x.id === formId);
  if (!f) return toast("That form has been taken away");
  const q = (x) =>
    x.type === "head"
      ? `<div class="cfm-sec">${esc(x.label)}</div>`
      : x.type === "long"
        ? `<label for="cq-${x.id}">${esc(x.label)}${x.req ? " *" : ""}<textarea id="cq-${x.id}" maxlength="3000" style="min-height:80px"></textarea></label>`
        : x.type === "tick"
          ? `<label class="tick cfm-tick"><input type="checkbox" id="cq-${x.id}"> <span>${esc(x.label)}${x.req ? " *" : ""}</span></label>`
          : x.type === "choice"
            ? `<div class="flabel">${esc(x.label)}${x.req ? " *" : ""}</div><div class="seg cfm-ch" id="cq-${x.id}" role="group">${(x.opts || []).map((o) => `<button type="button" data-v="${esc(o)}" aria-pressed="false">${esc(o)}</button>`).join("")}</div>`
            : x.type === "photo"
              ? `<div class="flabel">${esc(x.label)}${x.req ? " *" : ""}</div><label class="btn cfm-ph"><span id="cq-${x.id}-n">📷 Take or choose a photo</span><input type="file" id="cq-${x.id}" class="fpick" accept="image/*" data-cam="1"></label>`
              : x.type === "sig"
                ? `<div class="flabel">${esc(x.label)}${x.req ? " *" : ""}</div><canvas class="cfm-sig" id="cq-${x.id}"></canvas><button type="button" class="linkbtn cfm-sigc" data-id="${x.id}">Clear</button>`
                : `<label for="cq-${x.id}">${esc(x.label)}${x.req ? " *" : ""}<input id="cq-${x.id}" ${x.type === "num" ? 'inputmode="decimal"' : x.type === "date" ? 'type="date"' : ""} maxlength="300"${x.type === "date" ? ` value="${iso(new Date())}"` : ""}></label>`;
  openSheet(
    `<h3 id="sheettitle">${esc(f.icon || "📝")} ${esc(f.name)}</h3>
    ${f.site ? pickField("cq-site", "Which job", siteNames(), site0 || lastOf(S.mine.entries || [], () => true, "job") || "", "e.g. 12 High Street", true) : ""}
    ${(f.fields || []).map(q).join("")}
    ${formFoot(false, "Send")}`,
    async () => {
      const ans = {},
        files = [];
      for (const x of f.fields || []) {
        if (x.type === "head") continue;
        const el = $("cq-" + x.id);
        let v = "";
        if (x.type === "tick") v = el.checked ? "Yes" : "No";
        else if (x.type === "choice")
          v = (el.querySelector('[aria-pressed="true"]') || { dataset: {} }).dataset.v || "";
        else if (x.type === "photo") {
          const fl = el.files && el.files[0];
          if (fl) {
            files.push({
              blob: await shrinkImage(fl, 1800),
              name: fl.name || "photo.jpg",
              field: "ph_" + x.id,
            });
            v = "photo";
          }
        } else if (x.type === "sig") v = pads[x.id] && pads[x.id].drawn ? pads[x.id].data() : "";
        else v = el.value.trim();
        if (x.req && (!v || (x.type === "tick" && v === "No")))
          return showErr(`Answer “${x.label}”${x.type === "tick" ? " (tick it)" : ""}.`);
        if (x.type !== "photo") ans[x.id] = v;
      }
      const site = f.site ? pickVal("cq-site") : "";
      if (f.site && !site) return showErr("Choose which job it's for.");
      const data = {
        type: "cform",
        formId: f.id,
        formName: f.name,
        formIcon: f.icon || "📝",
        fields: (f.fields || []).map((x) => ({ id: x.id, type: x.type, label: x.label })),
        ans,
        site,
        date: iso(new Date()),
        byName: (S.myProfile && S.myProfile.name) || "",
        created: Date.now(),
      };
      $("f-save").disabled = true;
      try {
        const r = await submitJob({
          coll: "signoffs",
          docId: "cf-" + newId(),
          data,
          files,
          label: f.name,
        });
        closeForm();
        sentToast(r, f.name);
        render();
      } catch (e) {
        showErr(uploadErr(e));
        $("f-save").disabled = false;
      }
    },
    null,
  );
  wirePicks($("sheet"));
  const pads = {};
  (f.fields || []).forEach((x) => {
    if (x.type === "sig") pads[x.id] = sigPad($("cq-" + x.id));
    if (x.type === "choice")
      $("cq-" + x.id)
        .querySelectorAll("button")
        .forEach(
          (b) =>
            (b.onclick = () =>
              $("cq-" + x.id)
                .querySelectorAll("button")
                .forEach((y) => y.setAttribute("aria-pressed", String(y === b)))),
        );
    if (x.type === "photo")
      $("cq-" + x.id).onchange = (e) => {
        $("cq-" + x.id + "-n").textContent = e.target.files.length
          ? "✓ Photo added – tap to change"
          : "📷 Take or choose a photo";
      };
  });
  $("sheet")
    .querySelectorAll(".cfm-sigc")
    .forEach((b) => (b.onclick = () => pads[b.dataset.id] && pads[b.dataset.id].clear()));
}
/* one filled-in form */
function cfmView(x) {
  const ans = x.ans || {};
  openViewer(`<h2 class="cfm-vh">${esc(x.formIcon || "📝")} ${esc(x.formName || "Form")}</h2>
    <div class="who">${esc(x.byName || nameOf(x._who))} · ${esc(shortDay(x.date || iso(new Date(x.created))))}${x.site ? " · " + esc(siteLabel(x.site)) : ""}</div>
    <div class="cfm-ans">${(x.fields || [])
      .map((q) =>
        q.type === "head"
          ? `<div class="cfm-sec">${esc(q.label)}</div>`
          : `<div class="cfm-a"><div class="who">${esc(q.label)}</div>${
              q.type === "photo"
                ? x["ph_" + q.id]
                  ? `<img src="${esc(blobUrl(x["ph_" + q.id]))}" alt="${esc(q.label)}" class="cfm-img">`
                  : "<b>–</b>"
                : q.type === "sig"
                  ? ans[q.id]
                    ? `<img src="${esc(ans[q.id])}" alt="Signature" class="cfm-sigimg">`
                    : "<b>–</b>"
                  : `<b>${esc(ans[q.id] || "–")}</b>`
            }</div>`,
      )
      .join("")}</div>
    <div class="actions"><button type="button" class="btn primary" id="cfm-pdf">📄 PDF</button></div>`);
  $("cfm-pdf").onclick = () => cfmPdf(x);
}
async function cfmPdf(x) {
  try {
    await loadJsPdf();
    const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    const brand = BRGB(),
      co = coData();
    const M = 20,
      W = 170;
    const pics = await lhPics();
    const bottom = pics && pics.bot ? pics.bot.y - 8 : 282;
    let y = 0;
    const head = () => {
      if (pics) {
        y = Math.max(lhPutTop(doc, pics, 44), 30) + 10;
        lhPutBot(doc, pics);
        return;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...brand);
      doc.text(co.name || "", M, 20);
      doc.setDrawColor(...brand);
      doc.setLineWidth(0.7);
      doc.line(3, 30, 207, 30);
      y = 40;
    };
    const room = (h) => {
      if (y + h > bottom) {
        doc.addPage();
        head();
      }
    };
    const text = (t, bold, size, col) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size || 10);
      doc.setTextColor(...(col || [30, 30, 30]));
      doc.splitTextToSize(String(t), W).forEach((l) => {
        room(5.2);
        doc.text(l, M, y);
        y += (size || 10) * 0.45 + 1;
      });
    };
    head();
    text(x.formName || "Form", true, 16, brand);
    y += 1;
    text(
      [
        x.byName || nameOf(x._who),
        shortDay(x.date || iso(new Date(x.created))),
        x.site ? siteLabel(x.site) : "",
      ]
        .filter(Boolean)
        .join(" · "),
      false,
      10,
      [90, 90, 90],
    );
    y += 4;
    const ans = x.ans || {};
    for (const q of x.fields || []) {
      if (q.type === "head") {
        y += 3;
        room(9);
        text(q.label, true, 12, brand);
        y += 1;
        continue;
      }
      text(q.label, false, 9, [100, 100, 100]);
      if (q.type === "photo" || q.type === "sig") {
        const src = q.type === "sig" ? ans[q.id] : x["ph_" + q.id];
        let im = null;
        if (q.type === "sig" && src) im = { u: src, f: "PNG", w: 420, h: 160 };
        else if (src) im = await sdImgData(src);
        if (im) {
          const k = Math.min(
            (q.type === "sig" ? 60 : 90) / im.w,
            (q.type === "sig" ? 24 : 70) / im.h,
          );
          room(im.h * k + 4);
          doc.addImage(im.u, im.f, M, y, im.w * k, im.h * k);
          y += im.h * k + 4;
        } else text("–", true, 11);
      } else text(ans[q.id] || "–", true, 11);
      y += 2;
    }
    const blob = doc.output("blob");
    const fn =
      ((x.formName || "Form") + " " + (x.date || "")).replace(/[^\w\s&().-]/g, "").trim() + ".pdf";
    if (S.dl) await S.dl.save({ filename: fn, data: blob });
  } catch (e) {
    toast("Couldn't make the PDF");
  }
}
/* the job's own filled-in forms, on its site page */
function cfmSiteHtml(site) {
  if (!cfmIsOwner()) return "";
  const L = cfmAll().filter((x) => x.site && same(x.site, site));
  if (!L.length) return "";
  return `<div class="card cfm-card cfm-site"><div class="cardbody" style="border:0"><div class="cfm-h">📝 Forms filled in for this job (${L.length})</div>${L.map(cfmRow).join("")}</div></div>`;
}
