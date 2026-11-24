/* ================= WOOD SAMPLES: common timbers and sheet materials, and photos of real wood samples to choose from ================= */
import { esc, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { blobUrl, uploadErr, uploadFile } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { BIN_DAYS } from "../owner/deleted-items.js";
import { shrinkImage } from "../safety/training.js";
import { dlgEsc } from "./glass-colours.js";
export { WDS };
/* James (Nov 2026): "maybe do something similar for different woods that I could upload, like the coloured glass". On
   Forms, 🪵 Woods opens: 📷 My wood samples – photos James takes of real timber (a supplier's sample, a stained finish,
   offcuts from a job), each with a name and a note, added with 📷 Add a sample photo – then the usual timbers and sheet
   materials grouped (hardwoods, softwoods, modified and engineered, sheets), each with an on-screen colour guide and
   what it's usually used for; search by name. Tapping one shows it big with 📋 Copy. Samples are owner records:
   todos/{id} (kind "woodsample": name, note, assetId). The colours are a guide – timber varies board to board. */
const WOOD_TXT = `Hardwoods|European oak|#C49A6C|Light honey brown, strong grain; joinery, flooring, beams, frames
Hardwoods|American white oak|#C8A27A|Pale to mid brown, straight grain; furniture, stairs, flooring
Hardwoods|Red oak|#B57A5A|Pinkish brown, open grain; interior joinery, furniture
Hardwoods|Fumed / smoked oak|#6B4A2E|Oak darkened right through; flooring, furniture
Hardwoods|Ash|#D9C6A5|Pale cream, bold grain, bends well; furniture, handrails, tool handles
Hardwoods|Beech|#D8B48C|Pale pinkish brown, fine even grain; furniture, worktops, stairs
Hardwoods|Maple|#E6D3B3|Very pale and hard; worktops, flooring, furniture
Hardwoods|American black walnut|#5C4033|Dark chocolate brown; furniture, worktops, feature joinery
Hardwoods|European walnut|#7A5A40|Grey-brown with dark streaks; furniture, veneers
Hardwoods|Cherry|#A0522D|Pinkish brown that darkens with light; furniture, cabinets
Hardwoods|Sapele|#8B4A2B|Reddish brown, stripy grain; external doors, windows, joinery
Hardwoods|Iroko|#9C6B3C|Golden brown going darker; external joinery, worktops, cladding
Hardwoods|Utile|#8C4A2F|Reddish brown, stable; windows, doors, joinery
Hardwoods|Meranti (dark red)|#8B3A2A|Red-brown; windows, doors, mouldings
Hardwoods|Idigbo|#D2B48C|Pale yellow-brown; joinery, windows (stains iron)
Hardwoods|Teak|#A67B4F|Golden brown, oily, very durable; outdoor furniture, boats, worktops
Hardwoods|African mahogany (khaya)|#7B3F25|Red-brown; furniture, joinery, doors
Hardwoods|Tulipwood (American poplar)|#C9B98F|Cream to greenish; painted joinery, mouldings
Hardwoods|Bamboo|#D9C38E|Pale straw, very hard; flooring, worktops
Softwoods|Redwood (Scots pine)|#E3C48F|Pale yellow with knots; joinery, skirting, architrave, floorboards
Softwoods|Whitewood (spruce)|#E8D8B0|Pale and plain; studwork, carcassing, battens
Softwoods|Douglas fir|#C98B5A|Orange-brown, strong; beams, posts, cladding, flooring
Softwoods|Siberian larch|#C78F5B|Reddish brown, durable outside; cladding, decking, gates
Softwoods|Western red cedar|#A45A3C|Red to brown, silvers outside; cladding, fencing, shingles
Softwoods|Treated timber (green)|#B8B07A|Pressure treated; fencing, sole plates, garden work
Softwoods|Treated timber (brown)|#8B6B4A|Pressure treated, brown tint; decking, fencing, sheds
Softwoods|C24 carcassing|#E2CDA0|Strength graded; joists, rafters, stud walls
Modified & engineered|Accoya|#D8C29D|Acetylated pine, very stable and durable; windows, doors, cladding, decking
Modified & engineered|Thermowood|#8B5E3C|Heat treated, dark brown, stable; cladding, decking
Modified & engineered|Glulam|#D9B47F|Glued laminated timber; long beams, posts, roof structures
Modified & engineered|LVL / Kerto|#D4B07C|Laminated veneer lumber; beams and lintels
Modified & engineered|Engineered oak flooring|#C49A6C|Oak top layer on ply; flooring over underfloor heating
Sheet materials|Birch plywood|#E8D6B0|Pale, fine layers; furniture, cabinets, shelving, show edges
Sheet materials|Hardwood plywood|#B5835A|Red-brown face; general building, boxing in
Sheet materials|Marine plywood|#B07D55|Water-resistant glue; boats, wet areas, outdoors
Sheet materials|OSB3|#C9A46A|Wood strands; sheathing, flooring, roof decks, hoarding
Sheet materials|MDF|#B89F7E|Smooth, paints well; skirting, cabinets, panelling
Sheet materials|Moisture-resistant MDF|#9DA77F|Green core; bathrooms, kitchens
Sheet materials|Oak-veneered MDF|#C49A6C|Real oak face; cabinet doors, panelling
Sheet materials|Chipboard flooring (P5)|#C8AE82|Tongue and groove; floors
Sheet materials|Melamine-faced board (MFC)|#EDEBE6|Coloured faced chipboard; kitchen and wardrobe carcasses`;
const WOOD_LIST = WOOD_TXT.split("\n").map((l) => {
  const [group, name, hex, note] = l.split("|");
  return { group, name, hex, note };
});
const WOOD_GROUPS = ["Hardwoods", "Softwoods", "Modified & engineered", "Sheet materials"];
const WDS = (() => {
  /* James (Nov 2026, "I need to be able to edit them and load more than one picture with notes/traits of the wood"):
     a sample has any number of photos (each with its own caption – end grain, finished, wet…), what wood it is, the
     finish, the supplier and price, a few traits (hard / soft, outdoors, stability, how it takes stain) and notes.
     Tap ✎ Edit on one to change anything, add or take out photos. Older samples with one photo (assetId) still show. */
  const TRAITS = [
    ["hard", "Hardness", ["Soft", "Medium", "Hard", "Very hard"]],
    ["out", "Outdoors", ["Inside only", "Outdoors if treated", "Durable outdoors"]],
    ["stab", "Stability", ["Moves a lot", "Fairly stable", "Very stable"]],
    ["stain", "Takes stain / oil", ["Blotchy", "OK", "Well"]],
  ];
  const photosOf = (x) =>
    x.photos && x.photos.length ? x.photos : x.assetId ? [{ assetId: x.assetId, cap: "" }] : [];
  const recs = () =>
    (S.woodSamples || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const findRec = (id) => (S.woodSamples || []).find((y) => y.id === id);
  const sumOf = (x) =>
    [x.wood, x.finish, ...TRAITS.map(([k]) => (x.traits || {})[k])].filter(Boolean).join(" · ");
  function open() {
    const d = document.createElement("div");
    d.className = "dimask glc-mask";
    d.style.zIndex = "140";
    const draw = (q) => {
      q = String(q || "")
        .toLowerCase()
        .trim();
      const S2 = recs().filter(
        (x) =>
          !q ||
          [x.name, x.note, x.wood, x.finish, x.supplier, ...photosOf(x).map((p) => p.cap)]
            .join(" ")
            .toLowerCase()
            .includes(q),
      );
      const L = WOOD_LIST.filter(
        (w) => !q || (w.name + " " + w.note + " " + w.group).toLowerCase().includes(q),
      );
      return `<div class="dimbox glc-box" role="dialog" aria-label="Woods"><div class="glc-head"><b>🪵 Woods</b><button type="button" class="btn glc-x">Close</button></div>
        <input type="search" class="glc-q wds-q" placeholder="Search: e.g. oak, cladding, ply" value="${esc(q)}" aria-label="Search woods">
        <div class="flabel">📷 My wood samples <span class="who">photos of real timber</span></div>
        <div class="glc-grid">${S2.map((x) => {
          const ph = photosOf(x);
          return `<span class="glc-samp"><button type="button" class="glc-sp wds-sp" data-id="${esc(x.id)}">${ph.length ? `<img src="${blobUrl(ph[0].assetId)}" alt="">` : '<span class="wds-noph">🪵</span>'}<b>${esc(x.name)}</b>${sumOf(x) || x.note ? `<span>${esc(sumOf(x) || x.note)}</span>` : ""}${ph.length > 1 ? `<span class="wds-n">📷 ${ph.length}</span>` : ""}</button></span>`;
        }).join("")}
          <button type="button" class="glc-add wds-new">📷 Add a wood sample</button></div>
        ${WOOD_GROUPS.map((g) => {
          const gl = L.filter((w) => w.group === g);
          return gl.length
            ? `<div class="flabel">${esc(g)}</div><div class="glc-grid wds-grid">${gl.map((w) => `<button type="button" class="glc-sw wds-sw" data-n="${esc(w.name)}"><span class="glc-swc" style="background:${w.hex}"></span><b>${esc(w.name)}</b><span>${esc(w.note)}</span></button>`).join("")}</div>`
            : "";
        }).join("")}
        ${!L.length && !S2.length ? '<div class="who">Nothing matches that.</div>' : ""}
        <div class="who glc-note">The colours are only a guide – timber varies from board to board and changes with finish and light.</div></div>`;
    };
    const redraw = () => {
      d.innerHTML = draw(d.querySelector(".wds-q") ? d.querySelector(".wds-q").value : "");
      wire();
    };
    const wire = () => {
      d.querySelector(".glc-x").onclick = () => d.remove();
      const qi = d.querySelector(".wds-q");
      qi.oninput = () => {
        const v = qi.value,
          pos = qi.selectionStart;
        d.innerHTML = draw(v);
        wire();
        const n = d.querySelector(".wds-q");
        n.focus();
        try {
          n.setSelectionRange(pos, pos);
        } catch (e) {}
      };
      d.querySelectorAll(".wds-sw").forEach(
        (b) =>
          (b.onclick = () => {
            const w = WOOD_LIST.find((x) => x.name === b.dataset.n);
            d.remove();
            if (w) show({ name: w.name, note: w.group + " · " + w.note, hex: w.hex });
          }),
      );
      d.querySelectorAll(".wds-sp").forEach(
        (b) =>
          (b.onclick = () => {
            const x = findRec(b.dataset.id);
            d.remove();
            if (x) show(x);
          }),
      );
      d.querySelector(".wds-new").onclick = () => edit(null, redraw);
    };
    d.innerHTML = draw("");
    document.body.appendChild(d);
    dlgEsc(d);
    wire();
    d.onclick = (e) => {
      if (e.target === d) d.remove();
    };
  }
  /* one wood, big: a sample's photos (tap one to see it big), what it is and its traits; or a timber's colour guide */
  function show(v) {
    const isRec = !!v.id;
    const ph = isRec ? photosOf(v) : [];
    let at = 0;
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "145";
    const facts = isRec
      ? [
          ["Wood", v.wood],
          ["Finish", v.finish],
          ["Supplier", v.supplier],
          ["Price", v.price],
          ...TRAITS.map(([k, l]) => [l, (v.traits || {})[k]]),
        ].filter(([, x]) => x)
      : [];
    const draw = () => {
      d.innerHTML = `<div class="dimbox glc-big wds-big" role="dialog" aria-label="${esc(v.name)}">${ph.length ? `<img class="glc-bigc wds-bigimg" src="${blobUrl(ph[at].assetId)}" alt="">${ph[at].cap ? `<div class="who">${esc(ph[at].cap)}</div>` : ""}` : isRec ? "" : `<span class="glc-bigc" style="background:${esc(v.hex || "#ccc")}"></span>`}
      ${ph.length > 1 ? `<div class="wds-thumbs">${ph.map((p, i) => `<button type="button" class="wds-th" data-i="${i}" aria-pressed="${i === at}" aria-label="Photo ${i + 1}"><img src="${blobUrl(p.assetId)}" alt=""></button>`).join("")}</div>` : ""}
      <b class="glc-bign">${esc(v.name)}</b>
      ${facts.length ? `<div class="wds-facts">${facts.map(([l, x]) => `<span><span class="who">${esc(l)}</span> ${esc(x)}</span>`).join("")}</div>` : ""}
      ${v.note ? `<div class="wds-notes">${esc(v.note)}</div>` : ""}
      <div class="dimbtns"><button type="button" class="btn wds-cp">📋 Copy</button>${isRec ? '<button type="button" class="btn wds-ed">✎ Edit</button>' : ""}<button type="button" class="btn wds-more">← More woods</button><button type="button" class="btn primary wds-ok">Done</button></div></div>`;
      d.querySelector(".wds-ok").onclick = () => d.remove();
      d.querySelector(".wds-more").onclick = () => {
        d.remove();
        open();
      };
      if (d.querySelector(".wds-ed"))
        d.querySelector(".wds-ed").onclick = () => {
          d.remove();
          edit(v, () => {
            const x = findRec(v.id);
            if (x) show(x);
            else open();
          });
        };
      d.querySelectorAll(".wds-th").forEach(
        (b) =>
          (b.onclick = () => {
            at = +b.dataset.i;
            draw();
          }),
      );
      d.querySelector(".wds-cp").onclick = async () => {
        const txt = [v.name, ...(isRec ? facts.map(([l, x]) => l + ": " + x) : []), v.note]
          .filter(Boolean)
          .join("\n");
        try {
          await navigator.clipboard.writeText(isRec ? txt : v.name);
          toast("Copied: " + v.name);
        } catch (e) {
          toast(v.name);
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
  /* add or change a sample: its photos (as many as you like, each with a caption), what it is, traits and notes */
  function edit(rec, after) {
    const r = rec
      ? JSON.parse(JSON.stringify(rec))
      : { name: "", wood: "", finish: "", supplier: "", price: "", note: "", traits: {} };
    r.traits = r.traits || {};
    /* photos already saved keep their asset id; new ones wait as files until Save */
    let ph = photosOf(r).map((p) => ({ assetId: p.assetId, cap: p.cap || "" }));
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "150";
    const read = () => {
      const v = (id) => (d.querySelector("#" + id) ? d.querySelector("#" + id).value.trim() : "");
      r.name = v("wds-nm");
      r.wood = v("wds-wd");
      r.finish = v("wds-fi");
      r.supplier = v("wds-su");
      r.price = v("wds-pc");
      r.note = v("wds-nt");
      TRAITS.forEach(([k]) => (r.traits[k] = v("wds-t-" + k)));
      d.querySelectorAll(".wds-cap").forEach((el) => (ph[+el.dataset.i].cap = el.value.trim()));
    };
    const draw = () => {
      d.innerHTML = `<form class="dimbox wds-form"><b>${rec ? "✎ " + esc(rec.name) : "📷 New wood sample"}</b>
      <div class="wds-phs">${ph
        .map(
          (p, i) =>
            `<div class="wds-ph"><img src="${p.file ? p.url : blobUrl(p.assetId)}" alt=""><input class="wds-cap" data-i="${i}" maxlength="80" value="${esc(p.cap)}" placeholder="Caption, e.g. oiled" aria-label="Caption for photo ${i + 1}"><button type="button" class="linkdanger wds-phx" data-i="${i}" aria-label="Take out photo ${i + 1}">✕</button></div>`,
        )
        .join(
          "",
        )}<label class="glc-add wds-addph">📷 Add photos<input type="file" accept="image/*" multiple class="wds-file"></label></div>
      <label for="wds-nm">Name<input id="wds-nm" maxlength="80" required value="${esc(r.name)}" placeholder="e.g. Oak, light oak stain"></label>
      <div class="grid2"><label for="wds-wd">What wood<input id="wds-wd" maxlength="60" list="wds-woods" value="${esc(r.wood || "")}" placeholder="e.g. European oak"></label><label for="wds-fi">Finish<input id="wds-fi" maxlength="80" value="${esc(r.finish || "")}" placeholder="e.g. 2 coats hardwax oil"></label></div>
      <datalist id="wds-woods">${WOOD_LIST.map((w) => `<option value="${esc(w.name)}">`).join("")}</datalist>
      <div class="grid2"><label for="wds-su">Supplier<input id="wds-su" maxlength="80" value="${esc(r.supplier || "")}"></label><label for="wds-pc">Price<input id="wds-pc" maxlength="40" value="${esc(r.price || "")}" placeholder="e.g. £65 a m²"></label></div>
      <div class="grid2">${TRAITS.map(([k, l, opts]) => `<label for="wds-t-${k}">${esc(l)}<select id="wds-t-${k}"><option value="">–</option>${opts.map((o) => `<option${r.traits[k] === o ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></label>`).join("")}</div>
      <label for="wds-nt">Notes and traits<textarea id="wds-nt" maxlength="1500" placeholder="e.g. Tight straight grain, few knots. Goes darker in sunlight. Pre-drill near the ends.">${esc(r.note || "")}</textarea></label>
      <div class="who" id="wds-pr"></div>
      <div class="dimbtns">${rec ? '<button type="button" class="btn delbtn wds-del">🗑 Delete</button>' : ""}<button type="button" class="btn wds-c">Cancel</button><button type="submit" class="btn primary">Save</button></div></form>`;
      d.querySelector(".wds-c").onclick = () => d.remove();
      d.querySelectorAll(".wds-phx").forEach(
        (b) =>
          (b.onclick = () => {
            read();
            ph.splice(+b.dataset.i, 1);
            draw();
          }),
      );
      const fi = d.querySelector(".wds-file");
      fi.onchange = () => {
        read();
        [...(fi.files || [])].forEach((f) =>
          ph.push({ file: f, url: URL.createObjectURL(f), cap: "" }),
        );
        draw();
      };
      if (d.querySelector(".wds-del"))
        d.querySelector(".wds-del").onclick = async (e) => {
          const b = e.currentTarget;
          if (b.dataset.armed !== "1") {
            b.dataset.armed = "1";
            b.textContent = "Sure? Tap again";
            return;
          }
          try {
            await S.db.doc("todos/" + rec.id).delete();
            S.woodSamples = (S.woodSamples || []).filter((x) => x.id !== rec.id);
            toast("Sample deleted · in Setup › Deleted items for " + BIN_DAYS + " days");
            d.remove();
            open();
          } catch (x) {
            toast("Couldn't delete");
          }
        };
      d.querySelector("form").onsubmit = async (e) => {
        e.preventDefault();
        read();
        const pr = d.querySelector("#wds-pr");
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
              (r.name.replace(/[^\w\s-]/g, "").trim() || "Wood") + " " + (i + 1) + ".jpg",
            );
            out.push({ assetId: a.id, cap: p.cap });
          }
          const id = rec ? rec.id : newId();
          const data = {
            kind: "woodsample",
            name: r.name,
            wood: r.wood,
            finish: r.finish,
            supplier: r.supplier,
            price: r.price,
            traits: r.traits,
            note: r.note,
            photos: out,
            assetId: out[0].assetId,
            created: (rec && rec.created) || Date.now(),
            updated: Date.now(),
          };
          await S.db.doc("todos/" + id).set(data);
          S.woodSamples = (S.woodSamples || [])
            .filter((x) => x.id !== id)
            .concat([Object.assign({ id }, data)]);
          ph.forEach((p) => p.url && URL.revokeObjectURL(p.url));
          d.remove();
          toast(rec ? r.name + " saved" : r.name + " added to your wood samples");
          if (after) after();
        } catch (x) {
          pr.textContent = uploadErr(x);
        }
      };
    };
    draw();
    document.body.appendChild(d);
    dlgEsc(d);
    if (!rec) d.querySelector("#wds-nm").focus();
  }
  return { open, show, edit, recs };
})();
