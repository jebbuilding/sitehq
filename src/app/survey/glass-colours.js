/* ================= GLASS COLOURS: pick a glass colour from the RAL chart or from photos of real coloured glass ================= */
import { esc, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { blobUrl, uploadErr, uploadFile } from "../files/files.js";
import { getFileBlob } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { BIN_DAYS } from "../owner/deleted-items.js";
import { shrinkImage } from "../safety/training.js";
import { RAL_FAMILIES, RAL_LIST, ralFind } from "./ral-colours.js";
export { GLC, dlgEsc };
/* James (Nov 2026): "could we have all the RAL colours to see to choose from, and I upload photos of actual coloured
   glass also". 🎨 Choose colour on a coloured glass or splashback piece opens the picker: at the top My glass samples –
   photos James has taken of real glass (a supplier's sample, a fitted job), each with a name, added with 📷 Add a sample
   photo – then the RAL Classic chart in its colour families, with a search (number or name). Choosing one fills the
   piece's colour; a sample's photo goes with the piece onto the order PDF. Samples are owner records: todos/{id}
   (kind "glasscolour": name, assetId, note). */
const GLC = (() => {
  const recs = () =>
    (S.glassColours || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  /* the little square or photo shown beside a piece's colour */
  function chipHtml(it) {
    if (it.colPhoto) return `<img class="glc-chip" src="${blobUrl(it.colPhoto)}" alt="">`;
    const r = ralFind(it.col);
    const hex = it.colHex || (r && r.hex);
    return hex ? `<span class="glc-chip" style="background:${esc(hex)}"></span>` : "";
  }
  /* the colour box on a piece: typed, or chosen from the picker */
  function fieldHtml(it, label) {
    return `<label class="glc-field">${esc(label)}<span class="glc-row"><span class="glc-chipw">${chipHtml(it)}</span><input class="glo-f" data-k="col" maxlength="120" value="${esc(it.col || "")}" placeholder="e.g. RAL 9010, or a sample's name"></span></label>
      <input type="hidden" class="glo-f" data-k="colHex" value="${esc(it.colHex || "")}"><input type="hidden" class="glo-f" data-k="colPhoto" value="${esc(it.colPhoto || "")}">
      <button type="button" class="btn glc-open">🎨 Choose colour</button>`;
  }
  /* the picker; onPick({ col, colHex, colPhoto }) */
  /* browse = opened on its own from Forms (James, Nov 2026: "put the RAL colours somewhere to use for other things,
     maybe in forms") */
  function pick(onPick, browse) {
    const d = document.createElement("div");
    d.className = "dimask glc-mask";
    d.style.zIndex = "140";
    const draw = (q) => {
      q = String(q || "")
        .toLowerCase()
        .trim();
      const S2 = recs().filter(
        (x) => !q || (x.name + " " + (x.note || "")).toLowerCase().includes(q),
      );
      const L = RAL_LIST.filter(
        (r) => !q || r.code.includes(q) || r.name.toLowerCase().includes(q),
      );
      const tile = (r) =>
        `<button type="button" class="glc-sw" data-c="${r.code}" title="RAL ${r.code} ${esc(r.name)}"><span class="glc-swc" style="background:${r.hex}"></span><b>${r.code}</b><span>${esc(r.name)}</span></button>`;
      return `<div class="dimbox glc-box" role="dialog" aria-label="Choose a colour"><div class="glc-head"><b>🎨 ${browse ? "RAL colours" : "Choose a colour"}</b><button type="button" class="btn glc-x">Close</button></div>
        <input type="search" class="glc-q" placeholder="Search: a RAL number (e.g. 9010) or a name (e.g. blue)" value="${esc(q)}" aria-label="Search colours">
        <div class="flabel">📷 My glass samples <span class="who">photos of real coloured glass</span></div>
        <div class="glc-grid">${S2.map((x) => `<span class="glc-samp"><button type="button" class="glc-sp" data-id="${esc(x.id)}"><img src="${blobUrl(x.assetId)}" alt=""><b>${esc(x.name)}</b>${x.note ? `<span>${esc(x.note)}</span>` : ""}</button><button type="button" class="linkdanger glc-del" data-id="${esc(x.id)}" aria-label="Delete ${esc(x.name)}">✕</button></span>`).join("")}
          <label class="glc-add">📷 Add a sample photo<input type="file" accept="image/*" class="glc-file"></label></div>
        ${RAL_FAMILIES.map(([f, l]) => {
          const fl = L.filter((r) => r.code[0] === f);
          return fl.length
            ? `<div class="flabel">${esc(l)}</div><div class="glc-grid">${fl.map(tile).join("")}</div>`
            : "";
        }).join("")}
        ${!L.length && !S2.length ? '<div class="who">No colour matches that.</div>' : ""}
        <div class="who glc-note">Colours on a screen are only a guide – check against a real sample before ordering.</div></div>`;
    };
    const wire = () => {
      d.querySelector(".glc-x").onclick = () => d.remove();
      const qi = d.querySelector(".glc-q");
      qi.oninput = () => {
        const v = qi.value,
          pos = qi.selectionStart;
        d.innerHTML = draw(v);
        wire();
        const n = d.querySelector(".glc-q");
        n.focus();
        try {
          n.setSelectionRange(pos, pos);
        } catch (e) {}
      };
      d.querySelectorAll(".glc-sw").forEach(
        (b) =>
          (b.onclick = () => {
            const r = RAL_LIST.find((x) => x.code === b.dataset.c);
            d.remove();
            onPick({ col: "RAL " + r.code + " " + r.name, colHex: r.hex, colPhoto: "" });
          }),
      );
      d.querySelectorAll(".glc-sp").forEach(
        (b) =>
          (b.onclick = () => {
            const x = recs().find((y) => y.id === b.dataset.id);
            if (!x) return;
            d.remove();
            const r = ralFind(x.name);
            onPick({ col: x.name, colHex: r ? r.hex : "", colPhoto: x.assetId });
          }),
      );
      d.querySelectorAll(".glc-del").forEach(
        (b) =>
          (b.onclick = async () => {
            if (b.dataset.armed !== "1") {
              b.dataset.armed = "1";
              b.textContent = "Sure?";
              return;
            }
            try {
              await S.db.doc("todos/" + b.dataset.id).delete();
              S.glassColours = (S.glassColours || []).filter((x) => x.id !== b.dataset.id);
              toast("Sample deleted · in Setup › Deleted items for " + BIN_DAYS + " days");
              d.innerHTML = draw(d.querySelector(".glc-q").value);
              wire();
            } catch (e) {
              toast("Couldn't delete");
            }
          }),
      );
      const fi = d.querySelector(".glc-file");
      fi.onchange = () => {
        const f = fi.files && fi.files[0];
        fi.value = "";
        if (f)
          addSample(f, () => {
            d.innerHTML = draw(d.querySelector(".glc-q") ? d.querySelector(".glc-q").value : "");
            wire();
          });
      };
    };
    d.innerHTML = draw("");
    document.body.appendChild(d);
    dlgEsc(d);
    wire();
    d.onclick = (e) => {
      if (e.target === d) d.remove();
    };
  }
  /* 📷 a photo of real glass: its name (and a note), shrunk and kept */
  function addSample(file, after) {
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "150";
    d.innerHTML = `<form class="dimbox"><b>📷 New glass sample</b>
      <label for="glc-nm">Name<input id="glc-nm" maxlength="80" required placeholder="e.g. Smoked grey, or RAL 5024 Pastel blue"></label>
      <label for="glc-nt">Note (optional)<input id="glc-nt" maxlength="160" placeholder="e.g. Exeter Glass sample, back-painted 6mm"></label>
      <div class="who" id="glc-pr"></div>
      <div class="dimbtns"><button type="button" class="btn glc-c">Cancel</button><button type="submit" class="btn primary">Save</button></div></form>`;
    document.body.appendChild(d);
    dlgEsc(d);
    d.querySelector(".glc-c").onclick = () => d.remove();
    d.querySelector("#glc-nm").focus();
    d.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const name = d.querySelector("#glc-nm").value.trim();
      if (!name) return;
      if (!S.assets) return toast(uploadErr({ code: "not_granted" }));
      d.querySelector("#glc-pr").textContent = "Saving the photo…";
      try {
        let b = file;
        try {
          b = await shrinkImage(file, 1400);
        } catch (x) {}
        const a = await uploadFile(b, name.replace(/[^\w\s-]/g, "").trim() + ".jpg");
        const id = newId();
        const rec = {
          kind: "glasscolour",
          name,
          note: d.querySelector("#glc-nt").value.trim(),
          assetId: a.id,
          created: Date.now(),
          updated: Date.now(),
        };
        await S.db.doc("todos/" + id).set(rec);
        S.glassColours = (S.glassColours || []).concat([Object.assign({ id }, rec)]);
        d.remove();
        toast(name + " added to your glass samples");
        if (after) after();
      } catch (x) {
        d.querySelector("#glc-pr").textContent = uploadErr(x);
      }
    };
  }
  /* the colour for a piece on the PDF: { hex } or { img: dataURL } */
  async function forPdf(it) {
    if (it.colPhoto)
      try {
        const b = await getFileBlob(it.colPhoto);
        const u = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = rej;
          r.readAsDataURL(b);
        });
        return { img: u };
      } catch (e) {}
    const r = ralFind(it.col);
    const hex = it.colHex || (r && r.hex);
    return hex ? { hex } : null;
  }
  /* one colour, big: its number and name to copy, or the sample's photo */
  function show(v) {
    const r = ralFind(v.col);
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "145";
    d.innerHTML = `<div class="dimbox glc-big" role="dialog" aria-label="${esc(v.col)}">${v.colPhoto ? `<img class="glc-bigc" src="${blobUrl(v.colPhoto)}" alt="">` : `<span class="glc-bigc" style="background:${esc(v.colHex || (r && r.hex) || "#ccc")}"></span>`}
      <b class="glc-bign">${esc(v.col)}</b>${r ? `<div class="who">On screen ${r.hex} – a guide only, check a real sample</div>` : ""}
      <div class="dimbtns"><button type="button" class="btn glc-cp">📋 Copy</button><button type="button" class="btn glc-more">← More colours</button><button type="button" class="btn primary glc-ok">Done</button></div></div>`;
    document.body.appendChild(d);
    dlgEsc(d);
    d.querySelector(".glc-ok").onclick = () => d.remove();
    d.querySelector(".glc-more").onclick = () => {
      d.remove();
      pick(show, true);
    };
    d.querySelector(".glc-cp").onclick = async () => {
      try {
        await navigator.clipboard.writeText(v.col);
        toast("Copied: " + v.col);
      } catch (e) {
        toast(v.col);
      }
    };
    d.onclick = (e) => {
      if (e.target === d) d.remove();
    };
  }
  return { chipHtml, fieldHtml, pick, show, forPdf, recs };
})();
/* Escape closes a pop-up box (the top one only), as on the app's other boxes – the glass colours, woods, drawing
   quantities and survey progress boxes use it */
function dlgEsc(d) {
  const k = (e) => {
    if (!document.body.contains(d)) return document.removeEventListener("keydown", k, true);
    if (e.key !== "Escape") return;
    const all = [...document.querySelectorAll(".dimask")];
    if (all[all.length - 1] !== d) return;
    e.stopImmediatePropagation();
    d.remove();
    document.removeEventListener("keydown", k, true);
  };
  document.addEventListener("keydown", k, true);
}
