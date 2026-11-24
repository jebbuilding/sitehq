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
  const recs = () =>
    (S.woodSamples || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  function open() {
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
      const L = WOOD_LIST.filter(
        (w) => !q || (w.name + " " + w.note + " " + w.group).toLowerCase().includes(q),
      );
      return `<div class="dimbox glc-box" role="dialog" aria-label="Woods"><div class="glc-head"><b>🪵 Woods</b><button type="button" class="btn glc-x">Close</button></div>
        <input type="search" class="glc-q wds-q" placeholder="Search: e.g. oak, cladding, ply" value="${esc(q)}" aria-label="Search woods">
        <div class="flabel">📷 My wood samples <span class="who">photos of real timber</span></div>
        <div class="glc-grid">${S2.map((x) => `<span class="glc-samp"><button type="button" class="glc-sp wds-sp" data-id="${esc(x.id)}"><img src="${blobUrl(x.assetId)}" alt=""><b>${esc(x.name)}</b>${x.note ? `<span>${esc(x.note)}</span>` : ""}</button><button type="button" class="linkdanger glc-del wds-del" data-id="${esc(x.id)}" aria-label="Delete ${esc(x.name)}">✕</button></span>`).join("")}
          <label class="glc-add">📷 Add a sample photo<input type="file" accept="image/*" class="wds-file"></label></div>
        ${WOOD_GROUPS.map((g) => {
          const gl = L.filter((w) => w.group === g);
          return gl.length
            ? `<div class="flabel">${esc(g)}</div><div class="glc-grid wds-grid">${gl.map((w) => `<button type="button" class="glc-sw wds-sw" data-n="${esc(w.name)}"><span class="glc-swc" style="background:${w.hex}"></span><b>${esc(w.name)}</b><span>${esc(w.note)}</span></button>`).join("")}</div>`
            : "";
        }).join("")}
        ${!L.length && !S2.length ? '<div class="who">Nothing matches that.</div>' : ""}
        <div class="who glc-note">The colours are only a guide – timber varies from board to board and changes with finish and light.</div></div>`;
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
            const x = recs().find((y) => y.id === b.dataset.id);
            d.remove();
            if (x) show({ name: x.name, note: x.note, photo: x.assetId });
          }),
      );
      d.querySelectorAll(".wds-del").forEach(
        (b) =>
          (b.onclick = async () => {
            if (b.dataset.armed !== "1") {
              b.dataset.armed = "1";
              b.textContent = "Sure?";
              return;
            }
            try {
              await S.db.doc("todos/" + b.dataset.id).delete();
              S.woodSamples = (S.woodSamples || []).filter((x) => x.id !== b.dataset.id);
              toast("Sample deleted · in Setup › Deleted items for " + BIN_DAYS + " days");
              d.innerHTML = draw(d.querySelector(".wds-q").value);
              wire();
            } catch (e) {
              toast("Couldn't delete");
            }
          }),
      );
      const fi = d.querySelector(".wds-file");
      fi.onchange = () => {
        const f = fi.files && fi.files[0];
        fi.value = "";
        if (f)
          addSample(f, () => {
            d.innerHTML = draw(d.querySelector(".wds-q") ? d.querySelector(".wds-q").value : "");
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
  /* one wood, big: the photo or colour guide, its name and note, to copy */
  function show(v) {
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "145";
    const txt = v.name + (v.note ? " – " + v.note : "");
    d.innerHTML = `<div class="dimbox glc-big" role="dialog" aria-label="${esc(v.name)}">${v.photo ? `<img class="glc-bigc" src="${blobUrl(v.photo)}" alt="">` : `<span class="glc-bigc" style="background:${esc(v.hex || "#ccc")}"></span>`}
      <b class="glc-bign">${esc(v.name)}</b>${v.note ? `<div class="who">${esc(v.note)}</div>` : ""}
      <div class="dimbtns"><button type="button" class="btn wds-cp">📋 Copy</button><button type="button" class="btn wds-more">← More woods</button><button type="button" class="btn primary wds-ok">Done</button></div></div>`;
    document.body.appendChild(d);
    dlgEsc(d);
    d.querySelector(".wds-ok").onclick = () => d.remove();
    d.querySelector(".wds-more").onclick = () => {
      d.remove();
      open();
    };
    d.querySelector(".wds-cp").onclick = async () => {
      try {
        await navigator.clipboard.writeText(v.name);
        toast("Copied: " + v.name);
      } catch (e) {
        toast(txt);
      }
    };
    d.onclick = (e) => {
      if (e.target === d) d.remove();
    };
  }
  /* 📷 a photo of real wood: its name and a note, shrunk and kept */
  function addSample(file, after) {
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "150";
    d.innerHTML = `<form class="dimbox"><b>📷 New wood sample</b>
      <label for="wds-nm">Name<input id="wds-nm" maxlength="80" required placeholder="e.g. Oak, light oak stain"></label>
      <label for="wds-nt">Note (optional)<input id="wds-nt" maxlength="160" placeholder="e.g. Supplier sample, 2 coats hardwax oil"></label>
      <div class="who" id="wds-pr"></div>
      <div class="dimbtns"><button type="button" class="btn wds-c">Cancel</button><button type="submit" class="btn primary">Save</button></div></form>`;
    document.body.appendChild(d);
    dlgEsc(d);
    d.querySelector(".wds-c").onclick = () => d.remove();
    d.querySelector("#wds-nm").focus();
    d.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const name = d.querySelector("#wds-nm").value.trim();
      if (!name) return;
      if (!S.assets) return toast(uploadErr({ code: "not_granted" }));
      d.querySelector("#wds-pr").textContent = "Saving the photo…";
      try {
        let b = file;
        try {
          b = await shrinkImage(file, 1400);
        } catch (x) {}
        const a = await uploadFile(b, name.replace(/[^\w\s-]/g, "").trim() + ".jpg");
        const id = newId();
        const rec = {
          kind: "woodsample",
          name,
          note: d.querySelector("#wds-nt").value.trim(),
          assetId: a.id,
          created: Date.now(),
          updated: Date.now(),
        };
        await S.db.doc("todos/" + id).set(rec);
        S.woodSamples = (S.woodSamples || []).concat([Object.assign({ id }, rec)]);
        d.remove();
        toast(name + " added to your wood samples");
        if (after) after();
      } catch (x) {
        d.querySelector("#wds-pr").textContent = uploadErr(x);
      }
    };
  }
  return { open, show, recs };
})();
