/* ================= PROPERTY INFO: a client's services and access – stop cock, meters, fuse boards, boiler, parking, skip ================= */
import { $, esc } from "../core/helpers.js";
export { PROP };
/* James, Nov 2026: "in new client details i need to be able to fill in after key and alarm: water stop cock position,
   water meter position, gas shut off and meter, electric fuse board (allow for extra ones … single or 3 phase),
   electric meter, boiler type and location, water tank location, parking arrangements, skip/grab material location
   that client is happy with, hazards to be aware of, other notes". Kept on the client record as prop { …, boards:
   [{ where, phase }] }; like the keys and alarm, only the owner sees it. */
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
  const boardRow = (b, i) =>
    `<div class="pr-board" data-i="${i}"><label>Fuse board ${i + 1} – where<input class="pr-bwhere" maxlength="200" value="${esc((b && b.where) || "")}" placeholder="e.g. Garage, by the door"></label><label>Type<select class="pr-bphase">${PHASES.map((p) => `<option${b && b.phase === p ? " selected" : ""}>${p}</option>`).join("")}</select></label><button type="button" class="linkdanger pr-bdel" aria-label="Remove fuse board ${i + 1}">✕</button></div>`;
  function formHtml(c) {
    const p = (c && c.prop) || {};
    const boards = p.boards && p.boards.length ? p.boards : [{ where: "", phase: "Single phase" }];
    return `<div class="flabel" style="margin-top:6px">🏠 Property – services and access <span class="who">(only you see these)</span></div>
    <div class="grid2">${FIELDS.slice(0, 3)
      .map(
        ([k, l, ph]) =>
          `<label for="pr-${k}">${esc(l)}<input id="pr-${k}" maxlength="300" value="${esc(p[k] || "")}" placeholder="${esc(ph)}"></label>`,
      )
      .join("")}</div>
    <div id="pr-boards">${boards.map(boardRow).join("")}</div>
    <button type="button" class="btn" id="pr-badd" style="align-self:flex-start">+ Add another fuse board</button>
    <div class="grid2">${FIELDS.slice(3)
      .map(
        ([k, l, ph]) =>
          `<label for="pr-${k}">${esc(l)}<input id="pr-${k}" maxlength="300" value="${esc(p[k] || "")}" placeholder="${esc(ph)}"></label>`,
      )
      .join("")}</div>
    ${AREAS.map(([k, l, ph]) => `<label for="pr-${k}">${esc(l)}<textarea id="pr-${k}" maxlength="2000" placeholder="${esc(ph)}">${esc(p[k] || "")}</textarea></label>`).join("")}`;
  }
  const readBoards = () =>
    [...document.querySelectorAll("#pr-boards .pr-board")].map((r) => ({
      where: r.querySelector(".pr-bwhere").value.trim(),
      phase: r.querySelector(".pr-bphase").value,
    }));
  function wire() {
    const box = $("pr-boards");
    if (!box) return;
    const redraw = (list) => {
      box.innerHTML = list.map(boardRow).join("");
      box.querySelectorAll(".pr-bdel").forEach(
        (b) =>
          (b.onclick = () => {
            const l = readBoards();
            l.splice(+b.closest(".pr-board").dataset.i, 1);
            redraw(l.length ? l : [{ where: "", phase: "Single phase" }]);
          }),
      );
    };
    redraw(readBoards());
    $("pr-badd").onclick = () => {
      redraw(readBoards().concat([{ where: "", phase: "Single phase" }]));
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
    const boards = readBoards().filter((b) => b.where);
    if (boards.length) p.boards = boards;
    return p;
  }
  function viewHtml(c) {
    const p = (c && c.prop) || {};
    const rows = [];
    FIELDS.slice(0, 3).forEach(([k, l]) => p[k] && rows.push([l, p[k]]));
    (p.boards || []).forEach((b, i) =>
      rows.push([
        p.boards.length > 1 ? `Fuse board ${i + 1}` : "Fuse board",
        `${b.where}${b.phase ? " · " + b.phase : ""}`,
      ]),
    );
    FIELDS.slice(3)
      .concat(AREAS)
      .forEach(([k, l]) => p[k] && rows.push([l, p[k]]));
    if (!rows.length) return "";
    return `<div class="card pr-card" style="margin-top:10px;padding:10px 12px"><b>🏠 Property – services and access</b> <span class="who">only you see this</span><div class="details" style="margin-top:6px">${rows.map(([l, v]) => `<div class="drow"><span>${esc(l)}</span><span style="white-space:pre-wrap">${esc(v)}</span></div>`).join("")}</div></div>`;
  }
  return { formHtml, wire, read, viewHtml };
})();
