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
   glass also". 🎨 Choose colour on a coloured glass or splashback piece opens the picker: at the top My glass samples,
   then the RAL Classic chart in its colour families, with a search (number or name). Choosing one fills the piece's
   colour; a sample's photo goes with the piece onto the order PDF.
   Later the same month ("do the same as the wood… but not in the RAL colour area"): the samples have their own page,
   🟦 Glass samples on Forms, and 🎨 RAL colours there shows only the chart. A sample has any number of photos (each
   with a caption), its RAL number if it matches one, the glass, the finish, the supplier and price, and notes; ✎ Edit
   changes any of it. Owner records: todos/{id} (kind "glasscolour": name, ral, glass, finish, supplier, price, note,
   photos [{ assetId, cap }], assetId = the first photo). Older samples with one photo still show. */
const GLC = (() => {
  const FINISH = [
    "Gloss (back-painted)",
    "Satin / acid-etched",
    "Metallic",
    "Mirror",
    "Frosted",
    "Tinted",
  ];
  const recs = () =>
    (S.glassColours || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const findRec = (id) => (S.glassColours || []).find((y) => y.id === id);
  const photosOf = (x) =>
    x.photos && x.photos.length ? x.photos : x.assetId ? [{ assetId: x.assetId, cap: "" }] : [];
  const sumOf = (x) => [x.ral ? "RAL " + x.ral : "", x.finish, x.glass].filter(Boolean).join(" · ");
  const hexOf = (x) => {
    const r = ralFind(x.ral ? "RAL " + x.ral : x.name);
    return r ? r.hex : "";
  };
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
  const sampleTile = (x, act) => {
    const ph = photosOf(x);
    return `<span class="glc-samp"><button type="button" class="glc-sp ${act}" data-id="${esc(x.id)}">${ph.length ? `<img src="${blobUrl(ph[0].assetId)}" alt="">` : ""}<b>${esc(x.name)}</b>${sumOf(x) || x.note ? `<span>${esc(sumOf(x) || x.note)}</span>` : ""}${ph.length > 1 ? `<span class="glc-n">📷 ${ph.length}</span>` : ""}</button><button type="button" class="pillbtn glc-edq" data-id="${esc(x.id)}" aria-label="Edit ${esc(x.name)}">✎ Edit</button></span>`;
  };
  const matches = (x, q) =>
    !q ||
    [x.name, x.note, x.ral, x.glass, x.finish, x.supplier, ...photosOf(x).map((p) => p.cap)]
      .join(" ")
      .toLowerCase()
      .includes(q);
  /* the picker; onPick({ col, colHex, colPhoto }). browse = 🎨 RAL colours on Forms (the chart only – James, Nov 2026:
     "put the RAL colours somewhere to use for other things, maybe in forms"; the glass samples have their own page) */
  function pick(onPick, browse) {
    const d = document.createElement("div");
    d.className = "dimask glc-mask";
    d.style.zIndex = "140";
    const draw = (q) => {
      q = String(q || "")
        .toLowerCase()
        .trim();
      const S2 = browse ? [] : recs().filter((x) => matches(x, q));
      const L = RAL_LIST.filter(
        (r) => !q || r.code.includes(q) || r.name.toLowerCase().includes(q),
      );
      const tile = (r) =>
        `<button type="button" class="glc-sw" data-c="${r.code}" title="RAL ${r.code} ${esc(r.name)}"><span class="glc-swc" style="background:${r.hex}"></span><b>${r.code}</b><span>${esc(r.name)}</span></button>`;
      return `<div class="dimbox glc-box" role="dialog" aria-label="Choose a colour"><div class="glc-head"><b>🎨 ${browse ? "RAL colours" : "Choose a colour"}</b><button type="button" class="btn glc-x">Close</button></div>
        <input type="search" class="glc-q" placeholder="Search: a RAL number (e.g. 9010) or a name (e.g. blue)" value="${esc(q)}" aria-label="Search colours">
        ${
          browse
            ? ""
            : `<div class="flabel">🟦 My glass samples <span class="who">photos of real coloured glass</span></div>
        <div class="glc-grid">${S2.map((x) => sampleTile(x, "glc-use")).join("")}
          <button type="button" class="glc-add glc-new">📷 Add a glass sample</button></div>`
        }
        ${RAL_FAMILIES.map(([f, l]) => {
          const fl = L.filter((r) => r.code[0] === f);
          return fl.length
            ? `<div class="flabel">${esc(l)}</div><div class="glc-grid">${fl.map(tile).join("")}</div>`
            : "";
        }).join("")}
        ${!L.length && !S2.length ? '<div class="who">No colour matches that.</div>' : ""}
        <div class="who glc-note">Colours on a screen are only a guide – check against a real sample before ordering.</div></div>`;
    };
    const redraw = () => {
      d.innerHTML = draw(d.querySelector(".glc-q") ? d.querySelector(".glc-q").value : "");
      wire();
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
      d.querySelectorAll(".glc-use").forEach(
        (b) =>
          (b.onclick = () => {
            const x = findRec(b.dataset.id);
            if (!x) return;
            d.remove();
            onPick({
              col: x.name,
              colHex: hexOf(x),
              colPhoto: (photosOf(x)[0] || {}).assetId || "",
            });
          }),
      );
      d.querySelectorAll(".glc-edq").forEach(
        (b) =>
          (b.onclick = () => {
            const x = findRec(b.dataset.id);
            if (x) edit(x, redraw);
          }),
      );
      if (d.querySelector(".glc-new"))
        d.querySelector(".glc-new").onclick = () => edit(null, redraw);
    };
    d.innerHTML = draw("");
    document.body.appendChild(d);
    dlgEsc(d);
    wire();
    d.onclick = (e) => {
      if (e.target === d) d.remove();
    };
  }
  /* 🟦 Glass samples on Forms: the samples on their own – tap one to see it, ✎ Edit, 📷 Add */
  function library() {
    const d = document.createElement("div");
    d.className = "dimask glc-mask";
    d.style.zIndex = "140";
    const draw = (q) => {
      q = String(q || "")
        .toLowerCase()
        .trim();
      const L = recs().filter((x) => matches(x, q));
      return `<div class="dimbox glc-box glc-lib" role="dialog" aria-label="Glass samples"><div class="glc-head"><b>🟦 Glass samples</b><button type="button" class="btn glc-x">Close</button></div>
        <input type="search" class="glc-q" placeholder="Search: e.g. grey, satin, 9005" value="${esc(q)}" aria-label="Search glass samples">
        <div class="who">Photos of real coloured glass – supplier samples, jobs you've fitted. They're offered first when you choose a colour on a glass survey.</div>
        <div class="glc-grid">${L.map((x) => sampleTile(x, "glc-see")).join("")}
          <button type="button" class="glc-add glc-new">📷 Add a glass sample</button></div>
        ${q && !L.length ? '<div class="who">Nothing matches that.</div>' : ""}</div>`;
    };
    const redraw = () => {
      d.innerHTML = draw(d.querySelector(".glc-q") ? d.querySelector(".glc-q").value : "");
      wire();
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
      d.querySelectorAll(".glc-see").forEach(
        (b) =>
          (b.onclick = () => {
            const x = findRec(b.dataset.id);
            if (x) showSample(x, redraw);
          }),
      );
      d.querySelectorAll(".glc-edq").forEach(
        (b) =>
          (b.onclick = () => {
            const x = findRec(b.dataset.id);
            if (x) edit(x, redraw);
          }),
      );
      d.querySelector(".glc-new").onclick = () => edit(null, redraw);
    };
    d.innerHTML = draw("");
    document.body.appendChild(d);
    dlgEsc(d);
    wire();
    d.onclick = (e) => {
      if (e.target === d) d.remove();
    };
  }
  /* one sample, big: its photos (tap one to see it), details and notes */
  function showSample(x, after) {
    const ph = photosOf(x);
    let at = 0;
    const facts = [
      ["RAL", x.ral],
      ["Glass", x.glass],
      ["Finish", x.finish],
      ["Supplier", x.supplier],
      ["Price", x.price],
    ].filter(([, v]) => v);
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "145";
    const draw = () => {
      d.innerHTML = `<div class="dimbox glc-big glc-sbig" role="dialog" aria-label="${esc(x.name)}">${ph.length ? `<img class="glc-bigc glc-bigimg" src="${blobUrl(ph[at].assetId)}" alt="">${ph[at].cap ? `<div class="who">${esc(ph[at].cap)}</div>` : ""}` : ""}
        ${ph.length > 1 ? `<div class="glc-thumbs">${ph.map((p, i) => `<button type="button" class="glc-th" data-i="${i}" aria-pressed="${i === at}" aria-label="Photo ${i + 1}"><img src="${blobUrl(p.assetId)}" alt=""></button>`).join("")}</div>` : ""}
        <b class="glc-bign">${esc(x.name)}</b>
        ${facts.length ? `<div class="glc-facts">${facts.map(([l, v]) => `<span><span class="who">${esc(l)}</span> ${esc(v)}</span>`).join("")}</div>` : ""}
        ${x.note ? `<div class="glc-notes">${esc(x.note)}</div>` : ""}
        <div class="dimbtns"><button type="button" class="btn glc-cp">📋 Copy</button><button type="button" class="btn glc-ed">✎ Edit</button><button type="button" class="btn primary glc-ok">Done</button></div></div>`;
      d.querySelector(".glc-ok").onclick = () => d.remove();
      d.querySelector(".glc-ed").onclick = () => {
        d.remove();
        edit(x, () => {
          if (after) after();
          const y = findRec(x.id);
          if (y) showSample(y, after);
        });
      };
      d.querySelectorAll(".glc-th").forEach(
        (b) =>
          (b.onclick = () => {
            at = +b.dataset.i;
            draw();
          }),
      );
      d.querySelector(".glc-cp").onclick = async () => {
        const txt = [x.name, ...facts.map(([l, v]) => l + ": " + v), x.note]
          .filter(Boolean)
          .join("\n");
        try {
          await navigator.clipboard.writeText(txt);
          toast("Copied: " + x.name);
        } catch (e) {
          toast(x.name);
        }
      };
    };
    draw();
    document.body.appendChild(d);
    dlgEsc(d);
    d.onclick = (e) => {
      if (e.target === d) d.remove();
    };
  }
  /* add or change a sample: photos (as many as you like, each with a caption), what it is, and notes */
  function edit(rec, after) {
    const r = rec
      ? JSON.parse(JSON.stringify(rec))
      : { name: "", ral: "", glass: "", finish: "", supplier: "", price: "", note: "" };
    const ph = photosOf(r).map((p) => ({ assetId: p.assetId, cap: p.cap || "" }));
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "150";
    const read = () => {
      const v = (id) => (d.querySelector("#" + id) ? d.querySelector("#" + id).value.trim() : "");
      r.name = v("glc-nm");
      r.ral = v("glc-ral").replace(/^ral\s*/i, "");
      r.glass = v("glc-gl");
      r.finish = v("glc-fi");
      r.supplier = v("glc-su");
      r.price = v("glc-pc");
      r.note = v("glc-nt");
      d.querySelectorAll(".glc-cap").forEach((el) => (ph[+el.dataset.i].cap = el.value.trim()));
    };
    const draw = () => {
      d.innerHTML = `<form class="dimbox glc-form"><b>${rec ? "✎ " + esc(rec.name) : "📷 New glass sample"}</b>
      <div class="glc-phs">${ph
        .map(
          (p, i) =>
            `<div class="glc-ph"><img src="${p.file ? p.url : blobUrl(p.assetId)}" alt=""><input class="glc-cap" data-i="${i}" maxlength="80" value="${esc(p.cap)}" placeholder="Caption, e.g. in daylight" aria-label="Caption for photo ${i + 1}"><button type="button" class="linkdanger glc-phx" data-i="${i}" aria-label="Take out photo ${i + 1}">✕</button></div>`,
        )
        .join(
          "",
        )}<label class="glc-add glc-addph">📷 Add photos<input type="file" accept="image/*" multiple class="glc-file"></label></div>
      <label for="glc-nm">Name<input id="glc-nm" maxlength="80" required value="${esc(r.name)}" placeholder="e.g. Smoked grey, or Pastel blue"></label>
      <div class="grid2"><label for="glc-ral">RAL number (if it matches one)<input id="glc-ral" maxlength="12" inputmode="numeric" value="${esc(r.ral || "")}" placeholder="e.g. 5024"></label><label for="glc-fi">Finish<select id="glc-fi"><option value="">–</option>${FINISH.map((f) => `<option${r.finish === f ? " selected" : ""}>${esc(f)}</option>`).join("")}</select></label></div>
      <label for="glc-gl">The glass<input id="glc-gl" maxlength="80" value="${esc(r.glass || "")}" placeholder="e.g. 6mm toughened, low-iron, back-painted"></label>
      <div class="grid2"><label for="glc-su">Supplier<input id="glc-su" maxlength="80" value="${esc(r.supplier || "")}"></label><label for="glc-pc">Price<input id="glc-pc" maxlength="40" value="${esc(r.price || "")}" placeholder="e.g. £180 a m²"></label></div>
      <label for="glc-nt">Notes<textarea id="glc-nt" maxlength="1500" placeholder="e.g. Looks darker fitted against a white wall. 10-day lead time.">${esc(r.note || "")}</textarea></label>
      <div class="who" id="glc-pr"></div>
      <div class="dimbtns">${rec ? '<button type="button" class="btn delbtn glc-delb">🗑 Delete</button>' : ""}<button type="button" class="btn glc-c">Cancel</button><button type="submit" class="btn primary">Save</button></div></form>`;
      d.querySelector(".glc-c").onclick = () => d.remove();
      d.querySelectorAll(".glc-phx").forEach(
        (b) =>
          (b.onclick = () => {
            read();
            ph.splice(+b.dataset.i, 1);
            draw();
          }),
      );
      const fi = d.querySelector(".glc-file");
      fi.onchange = () => {
        read();
        [...(fi.files || [])].forEach((f) =>
          ph.push({ file: f, url: URL.createObjectURL(f), cap: "" }),
        );
        draw();
      };
      if (d.querySelector(".glc-delb"))
        d.querySelector(".glc-delb").onclick = async (e) => {
          const b = e.currentTarget;
          if (b.dataset.armed !== "1") {
            b.dataset.armed = "1";
            b.textContent = "Sure? Tap again";
            return;
          }
          try {
            await S.db.doc("todos/" + rec.id).delete();
            S.glassColours = (S.glassColours || []).filter((x) => x.id !== rec.id);
            toast("Sample deleted · in Setup › Deleted items for " + BIN_DAYS + " days");
            d.remove();
            if (after) after();
          } catch (x) {
            toast("Couldn't delete");
          }
        };
      d.querySelector("form").onsubmit = async (e) => {
        e.preventDefault();
        read();
        const pr = d.querySelector("#glc-pr");
        if (!r.name) return (pr.textContent = "Give it a name.");
        if (!ph.length) return (pr.textContent = "Add at least one photo.");
        if (ph.some((p) => p.file) && !S.assets)
          return (pr.textContent = uploadErr({ code: "not_granted" }));
        pr.textContent = "Saving…";
        try {
          const out = [];
          for (let i = 0; i < ph.length; i++) {
            const p = ph[i];
            if (!p.file) {
              out.push({ assetId: p.assetId, cap: p.cap });
              continue;
            }
            pr.textContent = `Saving photo ${i + 1} of ${ph.length}…`;
            let b = p.file;
            try {
              b = await shrinkImage(p.file, 1400);
            } catch (x) {}
            const a = await uploadFile(
              b,
              (r.name.replace(/[^\w\s-]/g, "").trim() || "Glass") + " " + (i + 1) + ".jpg",
            );
            out.push({ assetId: a.id, cap: p.cap });
          }
          const id = rec ? rec.id : newId();
          const data = {
            kind: "glasscolour",
            name: r.name,
            ral: r.ral,
            glass: r.glass,
            finish: r.finish,
            supplier: r.supplier,
            price: r.price,
            note: r.note,
            photos: out,
            assetId: out[0].assetId,
            created: (rec && rec.created) || Date.now(),
            updated: Date.now(),
          };
          await S.db.doc("todos/" + id).set(data);
          S.glassColours = (S.glassColours || [])
            .filter((x) => x.id !== id)
            .concat([Object.assign({ id }, data)]);
          ph.forEach((p) => p.url && URL.revokeObjectURL(p.url));
          d.remove();
          toast(rec ? r.name + " saved" : r.name + " added to your glass samples");
          if (after) after();
        } catch (x) {
          pr.textContent = uploadErr(x);
        }
      };
    };
    draw();
    document.body.appendChild(d);
    dlgEsc(d);
    if (!rec) d.querySelector("#glc-nm").focus();
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
  return { chipHtml, fieldHtml, pick, show, forPdf, recs, library, edit, showSample };
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
