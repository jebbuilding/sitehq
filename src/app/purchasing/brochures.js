/* ================= Setup › Brochures: save makers' brochures in one place (also used in the door & window survey) ================= */
import { $, esc, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { uploadErr, uploadFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { makersAll } from "./makers.js";
export { brochSetup };
function brochSetup() {
  const B = makersAll();
  const draw = () => {
    const L = (S.brochures || []).slice().sort((a, b) => (b.at || 0) - (a.at || 0));
    const keys = Object.keys(B).sort((a, b) =>
      a === "other" ? 1 : b === "other" ? -1 : B[a].m.localeCompare(B[b].m),
    );
    openViewer(`<span class="tag">📖 Setup</span><h3 style="font-family:var(--f-display);font-size:24px;margin:6px 0 8px;color:var(--accent)">Brochures</h3>
    <div class="who">Save the makers' brochures here (PDFs or photos). They show in the door &amp; window survey under <b>📖 Brochures</b> when you pick that maker, where you can open them or ✂️ cut a design onto an opening.</div>
    <div class="card" style="padding:10px;margin:8px 0"><label for="bs-mk">Maker<select id="bs-mk">${keys.map((k) => `<option value="${k}">${esc(B[k].m)}</option>`).join("")}</select></label>
      <label for="bs-title">Name (optional – uses the file name)<input id="bs-title" maxlength="80" placeholder="e.g. Distinction door styles 2025"></label>
      <label class="btn primary" style="position:relative;overflow:hidden;margin-top:6px;display:block;text-align:center">⬆ Choose brochure PDFs or photos<input type="file" id="bs-file" accept="application/pdf,image/*" multiple style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
      <div class="who" id="bs-prog"></div></div>
    ${
      keys
        .filter((k) => L.some((b) => b.maker === k))
        .map(
          (k) =>
            `<div class="flabel" style="margin-top:10px">${esc(B[k].m)}</div>${L.filter(
              (b) => b.maker === k,
            )
              .map(
                (b) =>
                  `<div class="dwsrow"><span>📄 ${esc(b.title)}</span><span style="display:flex;gap:6px"><button type="button" class="pillbtn bs-open" data-id="${esc(b.id)}">Open</button><button type="button" class="pillbtn bs-del" data-id="${esc(b.id)}" aria-label="Delete">✕</button></span></div>`,
              )
              .join("")}`,
        )
        .join("") || '<div class="nothing">No brochures saved yet.</div>'
    }
    <details class="pmdet" style="margin-top:12px"><summary>Where to download them (makers' own sites)</summary>${keys
      .filter((k) => B[k].l.length)
      .map(
        (k) =>
          `<div class="flabel">${esc(B[k].m)}</div>${B[k].l.map(([t, u]) => `<div class="dwsrow"><a href="${esc(u)}" target="_blank" rel="noopener">🌐 ${esc(t)}</a></div>`).join("")}`,
      )
      .join("")}</details>`);
    $("bs-file").onchange = async (e) => {
      const fs = [...e.target.files];
      e.target.value = "";
      if (!fs.length) return;
      if (!S.assets) {
        toast(uploadErr({ code: "not_granted" }));
        return;
      }
      const mk = $("bs-mk").value,
        tt = $("bs-title").value.trim();
      let n = 0;
      for (let i = 0; i < fs.length; i++) {
        const f = fs[i];
        $("bs-prog").textContent = `Saving ${i + 1} of ${fs.length}…`;
        try {
          const a = await uploadFile(f, f.name);
          const id = "br-" + newId();
          const rec = {
            kind: "brochure",
            maker: mk,
            title: (fs.length === 1 && tt ? tt : f.name.replace(/\.[^.]+$/, "")).slice(0, 80),
            assetId: a.id,
            contentType: f.type || "application/pdf",
            fileName: f.name,
            at: Date.now() + i,
          };
          await S.db.doc("todos/" + id).set(rec);
          S.brochures = (S.brochures || []).concat([Object.assign({ id }, rec)]);
          n++;
        } catch (err) {
          toast(uploadErr(err));
        }
      }
      toast(n + " brochure" + (n === 1 ? "" : "s") + " saved");
      draw();
      const m = $("bs-mk");
      if (m) m.value = mk;
    };
    document.querySelectorAll(".bs-open").forEach(
      (b) =>
        (b.onclick = () => {
          const x = (S.brochures || []).find((y) => y.id === b.dataset.id);
          if (x) openFile(x.assetId, x.fileName || x.title, x.contentType);
        }),
    );
    document.querySelectorAll(".bs-del").forEach(
      (b) =>
        (b.onclick = async () => {
          if (b.dataset.armed !== "1") {
            b.dataset.armed = "1";
            b.textContent = "Delete?";
            return;
          }
          try {
            await S.db.doc("todos/" + b.dataset.id).delete();
            S.brochures = (S.brochures || []).filter((x) => x.id !== b.dataset.id);
            draw();
          } catch (err) {
            toast("Couldn't delete");
          }
        }),
    );
  };
  draw();
}
