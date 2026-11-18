/* ================= SITE DOCUMENT FOLDERS: sub-folders for a site's plans, RAMS and specs – open them, make new ones, upload into them ================= */
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
import { same } from "./project-pages.js";
export { pjdKept, pjdWire };
/* James (Nov 2026): "in drawings and rams spec & docs in site do they have sub folder when needed. if not can you make
   away to do this". Documents already carry a folder path (docs/{id}.path, e.g. "Structural/Beams"); the site's Plans
   & drawings, RAMS and Specs & docs show them as folders to tap into, with a trail back up. + New folder makes one
   (inside the one you're in), kept even while it's empty in owner-only todos/dfold-{id} (kind "docfolders": site,
   cat, path) so James can set up "Structural", "Architect", "Building regs" before anything comes in. Moving a
   document is its 📁 Move button (doc-visibility.js). Which folder is open is kept per site and section in S.f.dpath. */
const pjdKept = (site, cat) =>
  (S.docFolds || []).filter((f) => same(f.site, site) && f.cat === cat).map((f) => f.path);
function pjdWire(site) {
  const go = (k, p) => {
    S.f.dpath = Object.assign({}, S.f.dpath || {}, { [site + "|" + k]: p });
    render();
  };
  document
    .querySelectorAll(".pjd-fold,.pjd-go")
    .forEach((b) => (b.onclick = () => go(b.dataset.k, b.dataset.p)));
  document.querySelectorAll(".pjd-new").forEach(
    (b) =>
      (b.onclick = () => {
        const k = b.dataset.k,
          at = b.dataset.p || "";
        openSheet(
          `<h3 id="sheettitle">📁 New folder</h3><div class="who">${at ? "Inside " + esc(at.split("/").join(" › ")) : "In " + esc(site)}</div>
          <label for="pjd-name">Folder name<input id="pjd-name" maxlength="60" placeholder="e.g. Structural"></label>${formFoot(false, "Make the folder")}`,
          async () => {
            const name = $("pjd-name")
              .value.trim()
              .replace(/[\/\\]+/g, "-");
            if (!name) return showErr("Give the folder a name");
            const path = (at ? at + "/" : "") + name;
            if (pjdKept(site, k).includes(path))
              return showErr("There's already a folder called that here");
            $("f-save").disabled = true;
            const id = "dfold-" + newId();
            const rec = { kind: "docfolders", site, cat: k, path, created: Date.now() };
            try {
              await S.db.doc("todos/" + id).set(rec);
              S.docFolds = (S.docFolds || []).concat([Object.assign({ id }, rec)]);
              closeForm();
              toast("Folder made – upload files into it");
              go(k, path);
            } catch (e) {
              $("f-save").disabled = false;
              showErr("Couldn't make it. Check your connection.");
            }
          },
          "pjd-name",
        );
      }),
  );
}
