/* ================= PERSONAL DOCUMENTS (driving licence etc.) ================= */
import { $, esc, shortDay, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, setEditing, setFormType, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { isImg, saveAsset, uploadErr, uploadFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId, submitJob } from "../files/outbox.js";
import { nameOf } from "../owner/owner.js";
import { myDetails } from "./personal-details.js";
import { daysTo, dueTagN } from "../safety/expiry-dates.js";
import { shrinkImage } from "../safety/training.js";
export { PDOC_TYPES, myPdocsBlock, openPdoc, pdocRow, pdocsOf, wireMyPdocs, wirePdocs };
const PDOC_TYPES = {
  contract: "Employment contract",
  subagree: "Subcontractor agreement",
  licence: "Driving licence (front and back)",
  passport: "Passport",
  photoid: "Other photo ID",
  rtw: "Right to work (share code or visa)",
  address: "Proof of address",
  ni: "National Insurance letter or card",
  medical: "Medical note or fit note",
  cis: "CIS payment and deduction statement",
  other: "Other personal document",
};
const pdocsOf = (list) =>
  (list || [])
    .filter((x) => x.type === "persdoc")
    .sort((a, b) => (b.created || 0) - (a.created || 0));
function pdocRow(x, owner) {
  const n = x.expires ? daysTo(x.expires) : null;
  return `<div class="entry pdoc" data-p="${esc(x.id)}"><div class="main"><div class="job">${esc(x.label || PDOC_TYPES[x.kind] || "Document")}</div>
    <div class="sub">${[x.number ? "No. " + x.number : "", x.expires ? (n < 0 ? "Expired " : "Expires ") + shortDay(x.expires) : "", (x.photos || []).length + " file" + ((x.photos || []).length === 1 ? "" : "s"), "added " + stamp(x.created) + (x.byOwner ? " by James" : "")].filter(Boolean).map(esc).join(" · ")}${x.expires && n <= 30 ? " " + dueTagN(n) : ""}</div>
    ${x.note ? `<div class="sub">${esc(x.note)}</div>` : ""}
    <div class="filerow">${(x.photos || []).map((id, i) => `<button type="button" class="pillbtn pd-open" data-i="${i}">Open${(x.photos || []).length > 1 ? " " + (i + 1) : ""}</button>`).join("")}${owner ? `<button type="button" class="pillbtn pd-save">Download</button>` : ""}<button type="button" class="linkdanger pd-del">Remove</button></div></div></div>`;
}
function wirePdocs(root, list, who, owner) {
  root.querySelectorAll(".pdoc").forEach((el) => {
    const x = list.find((y) => y.id === el.dataset.p);
    if (!x) return;
    el.querySelectorAll(".pd-open").forEach(
      (b) =>
        (b.onclick = () => {
          const i = +b.dataset.i;
          openFile(
            x.photos[i],
            (x.names || [])[i] || "document",
            (x.types || [])[i] || "image/jpeg",
          );
        }),
    );
    const sv = el.querySelector(".pd-save");
    if (sv)
      sv.onclick = async () => {
        for (let i = 0; i < (x.photos || []).length; i++) {
          const t = (x.types || [])[i] || "image/jpeg";
          await saveAsset(
            x.photos[i],
            `${nameOf(who)} - ${x.label || PDOC_TYPES[x.kind]}${x.photos.length > 1 ? " " + (i + 1) : ""}.${/pdf/.test(t) ? "pdf" : "jpg"}`,
          );
        }
      };
    const d = el.querySelector(".pd-del");
    d.onclick = async () => {
      if (d.dataset.armed !== "1") {
        d.dataset.armed = "1";
        d.textContent = "Tap again to remove";
        return;
      }
      try {
        await S.db.doc("sheets/" + who + "/signoffs/" + x.id).delete();
        (x.photos || []).forEach((id) => S.assets && S.assets.delete(id).catch(() => {}));
        toast("Removed");
        render();
      } catch (e) {
        toast("Couldn't remove");
      }
    };
  });
}
function openPdoc(kind, forWho) {
  const owner = !!forWho;
  setFormType("pdoc");
  setEditing(null);
  openSheet(
    `<h3 id="sheettitle">Add a personal document${owner ? " for " + esc(nameOf(forWho)) : ""}</h3>
    <label for="pd-kind">What is it?<select id="pd-kind">${Object.entries(PDOC_TYPES)
      .map(
        ([k, l]) =>
          `<option value="${k}" ${k === (kind || "licence") ? "selected" : ""}>${esc(l)}</option>`,
      )
      .join("")}</select></label>
    <label for="pd-label" id="pd-labell" hidden>Name of the document<input id="pd-label" maxlength="80" placeholder="e.g. Marriage certificate (name change)"></label>
    <label for="pd-file">Photos or PDF (add the front and back if it's a card)<input id="pd-file" type="file" accept="image/*,application/pdf,.doc,.docx,.rtf,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple required></label>
    <div class="grid2"><label for="pd-num">Number (optional)<input id="pd-num" maxlength="60"></label><label for="pd-exp">Expiry date (optional)<input id="pd-exp" type="date"></label></div>
    <label for="pd-note">Note (optional)<input id="pd-note" maxlength="200" placeholder="e.g. Licence categories B, BE, C1"></label>
    <div class="who">Personal documents only. Cards, tickets and qualifications go in Training. ${owner ? "Only you and " + esc(nameOf(forWho)) + " can see this." : "Only you and James can see this."}</div>
    ${formFoot(false, "Save")}`,
    async () => {
      const k = $("pd-kind").value,
        files = [...($("pd-file").files || [])];
      if (!files.length) {
        showErr("Add a photo or PDF.");
        return;
      }
      if (k === "other" && !$("pd-label").value.trim()) {
        showErr("Say what the document is.");
        return;
      }
      if (!S.assets) {
        showErr(uploadErr({ code: "not_granted" }));
        return;
      }
      $("f-save").disabled = true;
      $("f-save").textContent = "Uploading…";
      try {
        const up = [],
          types = [],
          names = [];
        for (const f of files) {
          const img = isImg(f.type) && !/svg/.test(f.type);
          up.push({ blob: img ? await shrinkImage(f) : f, name: f.name, field: "photos" });
          types.push(img ? "image/jpeg" : f.type || "application/pdf");
          names.push(f.name);
        }
        const data = {
          type: "persdoc",
          kind: k,
          label: k === "other" ? $("pd-label").value.trim() : "",
          number: $("pd-num").value.trim(),
          expires: $("pd-exp").value,
          note: $("pd-note").value.trim(),
          types,
          names,
          created: Date.now(),
        };
        let r;
        if (owner) {
          const ids = [];
          for (const u of up) {
            const a = await uploadFile(u.blob, u.name);
            ids.push(a.id);
          }
          await S.db
            .doc("sheets/" + forWho + "/signoffs/pd-" + newId())
            .set(Object.assign(data, { photos: ids, byOwner: true }));
        } else r = await submitJob({ coll: "signoffs", docId: "pd-" + newId(), data, files: up });
        closeForm();
        toast(r === "queued" ? "Kept on this phone. It will send when you have signal." : "Saved");
        render();
      } catch (e) {
        showErr(
          e && e.message === "decode"
            ? 'A photo couldn\'t be opened. Set the camera to JPG ("Most Compatible" on iPhone).'
            : uploadErr(e),
        );
        $("f-save").disabled = false;
        $("f-save").textContent = "Save";
      }
    },
    null,
  );
  const sync = () => {
    $("pd-labell").hidden = $("pd-kind").value !== "other";
  };
  $("pd-kind").onchange = sync;
  sync();
}
function myPdocsBlock() {
  const list = pdocsOf(S.mine.signoffs);
  const d = myDetails() || {};
  const needLic = d.driving === "Yes" && !list.some((x) => x.kind === "licence");
  return `<div class="day" id="pd-mine"><div class="dayh"><span>My personal documents</span><span class="sum">${list.length}</span></div>
    ${needLic ? `<div class="notice warn" style="margin:0">You said you hold a driving licence. Please add a photo of the front and back.</div>` : ""}
    <div class="actions">${needLic ? `<button class="btn primary" type="button" id="pd-lic">Add my driving licence</button>` : ""}<button class="btn ${needLic ? "" : "primary"}" type="button" id="pd-add">+ Add a document</button></div>
    ${list.map((x) => pdocRow(x, false)).join("") || '<div class="nothing">Nothing added yet. Add your driving licence, passport, proof of address or anything else personal James asks for.</div>'}</div>`;
}
function wireMyPdocs() {
  const box = $("pd-mine");
  if (!box) return;
  $("pd-add").onclick = () => openPdoc("licence");
  if ($("pd-lic")) $("pd-lic").onclick = () => openPdoc("licence");
  wirePdocs(box, pdocsOf(S.mine.signoffs), S.me, false);
}
