/* ================= QUICK SNAG: photo + voice → the snag written, pinned on the drawing and sent to the right trade ================= */
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { openViewer } from "../core/viewer.js";
import { isSketch } from "../drawing/trade-drawings.js";
import { blobUrl, uploadErr, uploadFile } from "../files/files.js";
import { getFileBlob, loadPdfJs } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { allTeam, nameOf, teamIds } from "../owner/owner.js";
import { EMP_TYPES } from "../people/employment-types.js";
import { shrinkImage } from "../safety/training.js";
import { empTypeOf } from "./job-details.js";
import { taskDone } from "./job-sheets.js";
import { same } from "./project-pages.js";
import { openJob } from "../survey/door-window-survey.js";
export { sqMap, sqOpen };
/* On a site James (or anyone running the job from the owner's app) taps 📸 Snag: takes a photo, says or types what's
   wrong (🎤 Speak under the box), and the app tidies it into a snag line and picks the trade from the words
   ("socket" → the electrician, "grout" → the tiler…) – he can change it. He can tap the spot on one of the site's
   drawings (plans uploaded as pictures or PDFs, or drawings made in the app). It goes on that trade's open snag list
   for the site (one is made if there isn't one), with the photo and where it is, so it shows straight away in their
   Jobs tab. 🗺 Snags on drawings shows every pinned snag as a numbered dot on its drawing. */
const SQ_TRADES = [
  [
    "electric",
    /\b(socket|switch|light|lamp|spot ?light|downlight|wiring|cable|fuse|consumer unit|electric|extractor|smoke alarm)/i,
  ],
  [
    "plumb",
    /\b(tap|leak|drip|pipe|radiator|toilet|wc|basin|sink|shower|bath|boiler|waste pipe|plumb|valve|cistern)/i,
  ],
  ["plaster", /\b(plaster|skim|crack|render|patch|bead|artex|coving)/i],
  ["decorat", /\b(paint|decorat|emulsion|gloss|touch ?up|wallpaper|caulk|mastic|filler)/i],
  ["tile", /\b(tile|tiling|grout|splashback)/i],
  [
    "carpent",
    /\b(door|skirting|architrave|handle|hinge|lock|joiner|carpent|worktop|cupboard|kitchen unit|shelf|stair|banister|floorboard|squeak)/i,
  ],
  ["brick", /\b(brick|block|pointing|mortar|lintel|wall tie)/i],
  ["roof", /\b(roof|slate|gutter|fascia|soffit|flashing|ridge|velux|skylight)/i],
  ["window", /\b(window|glazing|glass|seal|reveal|cill|sill)/i],
  ["floor", /\b(floor|carpet|laminate|vinyl|lvt|screed|threshold)/i],
];
const SQ = { pin: null, photo: null, who: "", dwg: "" };
/* the trade words in what they do (their details), or their type of work */
function sqTradeOf(id) {
  const d = (S.team[id] && S.team[id].details) || {};
  return [d.trade, d.company, EMP_TYPES[empTypeOf(id)]].filter(Boolean).join(" ").toLowerCase();
}
function sqGuess(text, ids) {
  for (const [k, re] of SQ_TRADES)
    if (re.test(text)) {
      const hit = ids.find((id) => sqTradeOf(id).includes(k));
      if (hit) return hit;
    }
  return "";
}
/* "socket in the kitchen not working" → "Socket in the kitchen not working" */
function sqTidy(t) {
  const s = String(t || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.\s]+$/, "");
  return (s.charAt(0).toUpperCase() + s.slice(1)).slice(0, 300);
}
/* the site's drawings: uploaded plans (pictures or PDFs) and drawings made in the app */
function sqDrawings(site) {
  const docs = (S.docs || [])
    .filter(
      (d) =>
        same(d.site, site) &&
        d.assetId &&
        (d.cat || "other") === "plans" &&
        /^image\/|pdf/i.test(d.contentType || d.fileName || ""),
    )
    .map((d) => ({
      k: "doc:" + d.id,
      title: d.title || d.fileName || "Drawing",
      assetId: d.assetId,
      pdf: /pdf/i.test(d.contentType || d.fileName || ""),
    }));
  const sk = allTeam("photos")
    .filter((p) => same(p.site, site) && isSketch(p) && p.assetId)
    .map((p) => ({ k: "sk:" + p.id, title: p.title || "Drawing", assetId: p.assetId, pdf: false }));
  return docs.concat(sk);
}
const SQ_IMG = {};
/* a drawing as a picture (a PDF's first page drawn once and kept) */
async function sqDrawingUrl(dw) {
  if (SQ_IMG[dw.k]) return SQ_IMG[dw.k];
  if (!dw.pdf) return (SQ_IMG[dw.k] = blobUrl(dw.assetId));
  await loadPdfJs();
  const blob = await getFileBlob(dw.assetId);
  const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) })
    .promise;
  const pg = await pdf.getPage(1);
  const v0 = pg.getViewport({ scale: 1 });
  const vp = pg.getViewport({ scale: Math.min(3, 1400 / v0.width) });
  const c = document.createElement("canvas");
  c.width = Math.round(vp.width);
  c.height = Math.round(vp.height);
  const x = c.getContext("2d");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, c.width, c.height);
  await pg.render({ canvasContext: x, viewport: vp }).promise;
  return (SQ_IMG[dw.k] = c.toDataURL("image/jpeg", 0.85));
}
function sqOpen(site) {
  if (!ownerMode() || !site) return;
  const ids = teamIds();
  const dws = sqDrawings(site);
  SQ.pin = null;
  SQ.photo = null;
  SQ.who = "";
  SQ.dwg = "";
  let picked = false;
  openSheet(
    `<h3 id="sheettitle">📸 Snag at ${esc(site)}</h3>
    <div class="sq-photo"><span class="btn" id="sq-phbtn">📷 Take or choose a photo<input type="file" id="sq-file" accept="image/*" capture="environment" class="sq-fileinp" aria-label="Snag photo"></span><img id="sq-prev" alt="Snag photo" hidden></div>
    <label for="sq-text">What's wrong? Say it or type it</label><textarea id="sq-text" rows="3" placeholder="e.g. Socket by the back door not working"></textarea>
    <div class="flabel">Who's it for</div><div class="sq-who" id="sq-who">${ids.map((id) => `<button type="button" class="pillbtn sq-p" data-v="${esc(id)}" aria-pressed="false">${esc(nameOf(id))}</button>`).join("")}<button type="button" class="pillbtn sq-p" data-v="" aria-pressed="true">Nobody yet</button></div>
    <div class="who" id="sq-guess"></div>
    ${
      dws.length
        ? `<label for="sq-dwg">Pin it on a drawing (optional)</label><select id="sq-dwg"><option value="">No drawing</option>${dws.map((d) => `<option value="${esc(d.k)}">${esc(d.title)}</option>`).join("")}</select><div class="sq-dwg" id="sq-dwgbox" hidden><div class="who">Tap where the snag is</div><div class="sq-dwgwrap" id="sq-dwgwrap"><img id="sq-dwgimg" alt="Drawing"><span class="sq-dot" id="sq-dot" hidden>📍</span></div></div>`
        : `<div class="who">Upload the drawings under the site's Plans & drawings to pin snags on them.</div>`
    }
    ${formFoot(false, "Send the snag")}`,
    async () => {
      const text = sqTidy($("sq-text").value);
      if (!text) return showErr("Say or type what's wrong");
      $("f-save").disabled = true;
      $("f-save").textContent = "Sending…";
      try {
        let refPhoto = null;
        if (SQ.photo) {
          const small = await shrinkImage(SQ.photo, 1600);
          refPhoto = (await uploadFile(small, "snag.jpg")).id;
        }
        const dw = dws.find((d) => d.k === SQ.dwg);
        const pin = dw && SQ.pin ? { dwg: dw.k, title: dw.title, x: SQ.pin.x, y: SQ.pin.y } : null;
        const task = {
          id: newId(),
          text,
          det: pin ? "On the drawing: " + dw.title : "",
          refPhoto,
          pin,
        };
        const who = SQ.who;
        const list = (S.jobs || []).find(
          (j) =>
            j.kind === "snag" &&
            j.status !== "closed" &&
            same(j.site, site) &&
            (who
              ? (j.assignees || []).length === 1 && j.assignees[0] === who
              : !(j.assignees || []).length),
        );
        if (list) {
          await S.db
            .doc("jobs/" + list.id)
            .update({ tasks: (list.tasks || []).concat([task]), updated: Date.now() });
        } else {
          const data = {
            kind: "snag",
            title: "Snags" + (who ? " – " + nameOf(who) : ""),
            site,
            assignees: who ? [who] : [],
            assigneeNames: who ? [nameOf(who)] : [],
            due: "",
            notes: "",
            files: [],
            tasks: [task],
            status: "open",
            created: Date.now(),
            updated: Date.now(),
          };
          await S.db.doc("jobs/" + newId()).set(data);
        }
        closeForm();
        toast(who ? "Snag sent to " + nameOf(who) : "Snag saved – not sent to anyone yet");
        render();
      } catch (e) {
        $("f-save").disabled = false;
        $("f-save").textContent = "Send the snag";
        showErr(uploadErr(e));
      }
    },
    null,
  );
  const setWho = (v, auto) => {
    SQ.who = v;
    document
      .querySelectorAll(".sq-p")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
    $("sq-guess").textContent =
      auto && v
        ? "Picked " + nameOf(v) + " from what you said – tap someone else to change it"
        : "";
  };
  document.querySelectorAll(".sq-p").forEach(
    (b) =>
      (b.onclick = () => {
        picked = true;
        setWho(b.dataset.v, false);
      }),
  );
  $("sq-text").addEventListener("input", () => {
    if (picked) return;
    const g = sqGuess($("sq-text").value, ids);
    if (g !== SQ.who) setWho(g, true);
  });
  $("sq-file").onchange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    SQ.photo = f;
    const im = $("sq-prev");
    im.src = URL.createObjectURL(f);
    im.hidden = false;
  };
  if ($("sq-dwg"))
    $("sq-dwg").onchange = async (e) => {
      SQ.dwg = e.target.value;
      SQ.pin = null;
      $("sq-dot").hidden = true;
      const dw = dws.find((d) => d.k === SQ.dwg);
      $("sq-dwgbox").hidden = !dw;
      if (!dw) return;
      try {
        $("sq-dwgimg").src = await sqDrawingUrl(dw);
      } catch (er) {
        toast("Couldn't open that drawing");
      }
    };
  if ($("sq-dwgwrap"))
    $("sq-dwgwrap").onclick = (e) => {
      const r = $("sq-dwgimg").getBoundingClientRect();
      if (!r.width || !r.height) return;
      SQ.pin = {
        x: Math.round(((e.clientX - r.left) / r.width) * 1000) / 1000,
        y: Math.round(((e.clientY - r.top) / r.height) * 1000) / 1000,
      };
      const d = $("sq-dot");
      d.style.left = SQ.pin.x * 100 + "%";
      d.style.top = SQ.pin.y * 100 + "%";
      d.hidden = false;
    };
}
/* every pinned snag on the site, by drawing */
function sqPinned(site) {
  const out = {};
  (S.jobs || [])
    .filter((j) => j.kind === "snag" && same(j.site, site))
    .forEach((j) =>
      (j.tasks || []).forEach((t) => {
        if (!t.pin || !t.pin.dwg) return;
        const x = taskDone(j, t);
        (out[t.pin.dwg] = out[t.pin.dwg] || []).push({ j, t, done: !!(x && x.done) });
      }),
    );
  return out;
}
async function sqMap(site) {
  const dws = sqDrawings(site);
  const by = sqPinned(site);
  const list = dws.filter((d) => by[d.k]);
  openViewer(
    `<div class="vhead"><b>🗺 Snags on drawings – ${esc(site)}</b></div>${
      list.length
        ? list
            .map(
              (d) =>
                `<div class="sq-map"><div class="flabel">${esc(d.title)} · ${by[d.k].length} snag${by[d.k].length === 1 ? "" : "s"}</div><div class="sq-dwgwrap"><img class="sq-mapimg" data-k="${esc(d.k)}" alt="${esc(d.title)}">${by[
                  d.k
                ]
                  .map(
                    (s, i) =>
                      `<button type="button" class="sq-num${s.done ? " done" : ""}" style="left:${s.t.pin.x * 100}%;top:${s.t.pin.y * 100}%" data-j="${esc(s.j.id)}" aria-label="Snag ${i + 1}: ${esc(s.t.text)}">${i + 1}</button>`,
                  )
                  .join("")}</div><ol class="sq-key">${by[d.k]
                  .map(
                    (s) =>
                      `<li class="${s.done ? "sq-done" : ""}">${esc(s.t.text)} <span class="who">${esc((s.j.assigneeNames || []).join(", ") || "Nobody yet")}${s.done ? " · done" : ""}</span></li>`,
                  )
                  .join("")}</ol></div>`,
            )
            .join("")
        : `<div class="empty"><strong>No snags pinned on drawings yet</strong>Tap 📸 Snag on the site, then pick a drawing and tap where it is.</div>`
    }`,
  );
  for (const d of list) {
    const im = document.querySelector(`.sq-mapimg[data-k="${CSS.escape(d.k)}"]`);
    if (im)
      try {
        im.src = await sqDrawingUrl(d);
      } catch (e) {}
  }
  document.querySelectorAll(".sq-num").forEach(
    (b) =>
      (b.onclick = () => {
        const j = (S.jobs || []).find((x) => x.id === b.dataset.j);
        if (j) openJob(j.id);
      }),
  );
}
