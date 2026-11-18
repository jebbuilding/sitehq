/* ================= PROPERTY INFO: a client's services and access – stop cock, meters, fuse boards, boiler, parking, skip ================= */
import { $, esc, toast } from "../core/helpers.js";
import { blobUrl, uploadErr, uploadFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { shrinkImage } from "../safety/training.js";
export { PROP };
/* James, Nov 2026: "in new client details i need to be able to fill in after key and alarm: water stop cock position,
   water meter position, gas shut off and meter, electric fuse board (allow for extra ones … single or 3 phase),
   electric meter, boiler type and location, water tank location, parking arrangements, skip/grab material location
   that client is happy with, hazards to be aware of, other notes". Kept on the client record as prop { …, boards:
   [{ where, phase, ph }], ph: { key: [photo ids] } }; like the keys and alarm, only the owner sees it.
   Each item has a small 📷 button for a photo or two (James: "a photo for each section with a small photo button"). */
const PROP = (() => {
  const FIELDS = [
    ["stopcock", "Water stop cock", "e.g. Under the kitchen sink"],
    ["waterMeter", "Water meter", "e.g. Pavement outside, front left"],
    ["gas", "Gas shut-off and meter", "e.g. Meter box on the side wall; tap beside it"],
    ["elecMeter", "Electric meter", "e.g. Cupboard under the stairs"],
    ["boiler", "Boiler – type and where", "e.g. Combi, Worcester, in the loft"],
    ["tank", "Water tank", "e.g. Loft above the bathroom / none (combi)"],
    ["parking", "Parking arrangements", "e.g. Drive for one van; no parking on the bend"],
    [
      "skip",
      "Skip, grab and materials – where the client is happy",
      "e.g. Front drive, left side; grab lorry from the road",
    ],
  ];
  const AREAS = [
    [
      "hazards",
      "Hazards to be aware of",
      "e.g. Low beam in the hall, dog in the garden, steep drive",
    ],
    ["notes", "Other notes", ""],
  ];
  const PHASES = ["Single phase", "Three phase"];
  /* the photos while the form is open: per item key, and per fuse board */
  let ph = {},
    boards = [];
  const thumbs = (ids, key, b) =>
    (ids || [])
      .map(
        (id) =>
          `<span class="pr-ph"><img src="${esc(blobUrl(id))}" alt="Photo" data-id="${esc(id)}"><button type="button" class="pr-phx" data-id="${esc(id)}" ${key ? `data-k="${key}"` : `data-b="${b}"`} aria-label="Remove this photo">✕</button></span>`,
      )
      .join("");
  /* the small photo button: a file picker that isn't hidden (the iPad won't open hidden ones) */
  const cam = (label, attr) =>
    `<label class="pr-cam" title="Add a photo">📷<input type="file" accept="image/*" class="pr-file" data-cam="1" ${attr} aria-label="Add a photo – ${esc(label)}"></label>`;
  const boardRow = (b, i) =>
    `<div class="pr-board" data-i="${i}"><label>Fuse board ${i + 1} – where<input class="pr-bwhere" maxlength="200" value="${esc((b && b.where) || "")}" placeholder="e.g. Garage, by the door"></label><label>Type<select class="pr-bphase">${PHASES.map((p) => `<option${b && b.phase === p ? " selected" : ""}>${p}</option>`).join("")}</select></label>${cam("Fuse board " + (i + 1), `data-b="${i}"`)}<button type="button" class="linkdanger pr-bdel" aria-label="Remove fuse board ${i + 1}">✕</button><div class="pr-phs" data-b="${i}">${thumbs(b && b.ph, "", i)}</div></div>`;
  const fieldHtml = ([k, l, phd], area) =>
    `<div class="pr-f"><div class="pr-frow"><label for="pr-${k}">${esc(l)}${area ? `<textarea id="pr-${k}" maxlength="2000" placeholder="${esc(phd)}"></textarea>` : `<input id="pr-${k}" maxlength="300" placeholder="${esc(phd)}">`}</label>${cam(l, `data-k="${k}"`)}</div><div class="pr-phs" data-k="${k}">${thumbs(ph[k], k)}</div></div>`;
  function formHtml(c) {
    const p = (c && c.prop) || {};
    ph = JSON.parse(JSON.stringify(p.ph || {}));
    boards = JSON.parse(
      JSON.stringify(
        p.boards && p.boards.length ? p.boards : [{ where: "", phase: "Single phase" }],
      ),
    );
    const fill = (html, k) =>
      html
        .replace(
          `id="pr-${k}" maxlength="300"`,
          `id="pr-${k}" maxlength="300" value="${esc(p[k] || "")}"`,
        )
        .replace(
          /(<textarea id="pr-\w+"[^>]*>)<\/textarea>/,
          (m, a) => a + esc(p[k] || "") + "</textarea>",
        );
    return `<div class="flabel" style="margin-top:6px">🏠 Property – services and access <span class="who">(only you see these · 📷 adds a photo)</span></div>
    <div class="grid2">${FIELDS.slice(0, 3)
      .map((f) => fill(fieldHtml(f), f[0]))
      .join("")}</div>
    <div id="pr-boards">${boards.map(boardRow).join("")}</div>
    <button type="button" class="btn" id="pr-badd" style="align-self:flex-start">+ Add another fuse board</button>
    <div class="grid2">${FIELDS.slice(3)
      .map((f) => fill(fieldHtml(f), f[0]))
      .join("")}</div>
    ${AREAS.map((f) => fill(fieldHtml(f, true), f[0])).join("")}`;
  }
  const readBoards = () =>
    [...document.querySelectorAll("#pr-boards .pr-board")].map((r, i) => ({
      where: r.querySelector(".pr-bwhere").value.trim(),
      phase: r.querySelector(".pr-bphase").value,
      ph: (boards[i] && boards[i].ph) || [],
    }));
  function wire() {
    const box = $("pr-boards");
    if (!box) return;
    const sheet = box.closest("#sheet") || document;
    const drawThumbs = () => {
      sheet
        .querySelectorAll(".pr-phs[data-k]")
        .forEach((d) => (d.innerHTML = thumbs(ph[d.dataset.k], d.dataset.k)));
      sheet
        .querySelectorAll(".pr-phs[data-b]")
        .forEach((d) => (d.innerHTML = thumbs((boards[+d.dataset.b] || {}).ph, "", +d.dataset.b)));
      wirePics();
    };
    const wirePics = () => {
      sheet
        .querySelectorAll(".pr-phs img")
        .forEach((im) => (im.onclick = () => openFile(im.dataset.id, "photo.jpg", "image/jpeg")));
      sheet.querySelectorAll(".pr-phx").forEach(
        (x) =>
          (x.onclick = () => {
            if (x.dataset.k)
              ph[x.dataset.k] = (ph[x.dataset.k] || []).filter((id) => id !== x.dataset.id);
            else {
              boards = readBoards();
              const b = boards[+x.dataset.b];
              if (b) b.ph = (b.ph || []).filter((id) => id !== x.dataset.id);
            }
            drawThumbs();
          }),
      );
      sheet.querySelectorAll(".pr-file").forEach(
        (inp) =>
          (inp.onchange = async () => {
            const f = inp.files && inp.files[0];
            inp.value = "";
            if (!f) return;
            const lab = inp.closest(".pr-cam");
            lab.classList.add("busy");
            try {
              const small = await shrinkImage(f, 1600);
              const id = (await uploadFile(small, f.name || "photo.jpg")).id;
              if (inp.dataset.k) (ph[inp.dataset.k] = ph[inp.dataset.k] || []).push(id);
              else {
                boards = readBoards();
                const b = boards[+inp.dataset.b];
                if (b) (b.ph = b.ph || []).push(id);
              }
              drawThumbs();
              toast("Photo added");
            } catch (e) {
              toast(uploadErr(e));
            }
            lab.classList.remove("busy");
          }),
      );
    };
    const redraw = (list) => {
      boards = list;
      box.innerHTML = list.map(boardRow).join("");
      box.querySelectorAll(".pr-bdel").forEach(
        (b) =>
          (b.onclick = () => {
            const l = readBoards();
            l.splice(+b.closest(".pr-board").dataset.i, 1);
            redraw(l.length ? l : [{ where: "", phase: "Single phase", ph: [] }]);
          }),
      );
      wirePics();
    };
    redraw(readBoards());
    $("pr-badd").onclick = () => {
      redraw(readBoards().concat([{ where: "", phase: "Single phase", ph: [] }]));
      const all = box.querySelectorAll(".pr-bwhere");
      all[all.length - 1].focus();
    };
  }
  function read() {
    if (!$("pr-boards")) return null;
    const p = {};
    FIELDS.concat(AREAS).forEach(([k]) => {
      const v = $("pr-" + k).value.trim();
      if (v) p[k] = v;
    });
    const bs = readBoards()
      .filter((b) => b.where || (b.ph || []).length)
      .map((b) => ((b.ph || []).length ? b : { where: b.where, phase: b.phase }));
    if (bs.length) p.boards = bs;
    const phs = {};
    Object.keys(ph).forEach((k) => {
      if ((ph[k] || []).length) phs[k] = ph[k];
    });
    if (Object.keys(phs).length) p.ph = phs;
    return p;
  }
  function viewHtml(c) {
    const p = (c && c.prop) || {};
    const php = p.ph || {};
    const rows = [];
    FIELDS.slice(0, 3).forEach(([k, l]) => (p[k] || php[k]) && rows.push([l, p[k] || "", php[k]]));
    (p.boards || []).forEach((b, i) =>
      rows.push([
        p.boards.length > 1 ? `Fuse board ${i + 1}` : "Fuse board",
        `${b.where || ""}${b.phase ? (b.where ? " · " : "") + b.phase : ""}`,
        b.ph,
      ]),
    );
    FIELDS.slice(3)
      .concat(AREAS)
      .forEach(([k, l]) => (p[k] || php[k]) && rows.push([l, p[k] || "", php[k]]));
    if (!rows.length) return "";
    return `<div class="card pr-card" style="margin-top:10px;padding:10px 12px"><b>🏠 Property – services and access</b> <span class="who">only you see this</span><div class="details" style="margin-top:6px">${rows.map(([l, v, ids]) => `<div class="drow"><span>${esc(l)}</span><span style="white-space:pre-wrap">${esc(v)}${(ids || []).length ? `<span class="pr-phs pr-view">${ids.map((id) => `<img src="${esc(blobUrl(id))}" alt="Photo – ${esc(l)}" class="pr-vimg" data-id="${esc(id)}">`).join("")}</span>` : ""}</span></div>`).join("")}</div></div>`;
  }
  /* the client's page: tap a photo to see it full size */
  function wireView() {
    document
      .querySelectorAll(".pr-card .pr-vimg")
      .forEach((im) => (im.onclick = () => openFile(im.dataset.id, "photo.jpg", "image/jpeg")));
  }
  return { formHtml, wire, read, viewHtml, wireView };
})();
